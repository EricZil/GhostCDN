const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const FormData = require('form-data');
const mimeTypes = require('mime-types');
const open = require('open');

const { 
  API_BASE_URL, 
  MAX_FILE_SIZE, 
  SUPPORTED_FILE_TYPES, 
  UPLOAD_OPTIONS,
  UPLOAD_TIMEOUT,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} = require('../config/constants');

const { 
  showError, 
  showSuccess, 
  showWarning, 
  showInfo,
  formatBytes,
  getFileTypeIcon,
  showConfirmation,
  createProgressBar
} = require('../utils/display');

class UploadManager {
  constructor(authManager) {
    this.authManager = authManager;
    this.settingsManager = require('./SettingsManager');
    this.settings = new this.settingsManager();
  }

  /**
   * Handle file upload process
   */
  async handleUpload() {
    try {
      console.log(chalk.cyan.bold('📤 File Upload\n'));

      // Get file path from user
      const filePath = await this.getFilePath();
      
      if (!filePath) {
        showWarning('Upload cancelled');
        return;
      }

      // Validate file
      const fileInfo = await this.validateFile(filePath);
      
      if (!fileInfo) {
        return;
      }

      // Show file information and get upload options
      const uploadOptions = await this.getUploadOptions(fileInfo);
      
      if (!uploadOptions) {
        showWarning('Upload cancelled');
        return;
      }

      // Upload the file
      const result = await this.uploadFile(filePath, fileInfo, uploadOptions);
      
      if (result) {
        await this.showUploadSuccess(result);
      }

    } catch (error) {
      showError(`Upload failed: ${error.message}`);
      
      // Don't return to main menu on error - let user read the error
      console.log(chalk.yellow('\nPress Enter to continue...'));
      await require('inquirer').prompt([
        {
          type: 'input',
          name: 'continue',
          message: ''
        }
      ]);
    }
  }

  /**
   * Get file path from user input
   */
  async getFilePath() {
    const methods = [
      {
        name: '📁 Browse and select file',
        value: 'browse',
        description: 'Open file browser to select a file'
      },
      {
        name: '⌨️  Enter file path manually',
        value: 'manual',
        description: 'Type the full path to your file'
      },
      {
        name: '🔙 Back to main menu',
        value: 'back',
        description: 'Return to the main menu'
      }
    ];

    const methodAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'How would you like to select your file?',
        choices: methods.map(method => ({
          name: `${method.name}\n  ${chalk.dim(method.description)}`,
          value: method.value,
          short: method.name
        })),
        pageSize: 5
      }
    ]);

    if (methodAnswer.method === 'back') {
      return null;
    }

    if (methodAnswer.method === 'browse') {
      return await this.browseForFile();
    } else {
      return await this.getFilePathManually();
    }
  }

  /**
   * Browse for file using simple directory listing
   */
  async browseForFile() {
    try {
      showInfo('Starting file browser...');
      return await this.browseDirectory(process.cwd());
    } catch (error) {
      showError('Could not open file browser');
      return await this.getFilePathManually();
    }
  }

  /**
   * Browse directory and select file
   */
  async browseDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      
      // Filter and sort items
      const directories = items
        .filter(item => item.isDirectory() && !item.name.startsWith('.'))
        .map(item => ({
          name: `📁 ${item.name}/`,
          value: path.join(currentDir, item.name),
          type: 'directory'
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const files = items
        .filter(item => item.isFile() && !item.name.startsWith('.'))
        .map(item => {
          const filePath = path.join(currentDir, item.name);
          const stats = fs.statSync(filePath);
          const mimeType = require('mime-types').lookup(filePath) || 'application/octet-stream';
          return {
            name: `${getFileTypeIcon(mimeType)} ${item.name} ${chalk.dim(`(${formatBytes(stats.size)})`)}`,
            value: filePath,
            type: 'file'
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      const choices = [
        {
          name: `📍 Current: ${chalk.cyan(currentDir)}`,
          value: 'current',
          disabled: true
        },
        new inquirer.Separator(),
        {
          name: '⬆️  Go up one level',
          value: 'up',
          type: 'navigation'
        },
        {
          name: '⌨️  Enter path manually',
          value: 'manual',
          type: 'navigation'
        },
        new inquirer.Separator(),
        ...directories,
        ...files
      ];

      if (files.length === 0 && directories.length === 0) {
        choices.push({
          name: chalk.dim('(No files or directories found)'),
          value: 'empty',
          disabled: true
        });
      }

      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'selection',
          message: 'Select a file or navigate:',
          choices,
          pageSize: 15
        }
      ]);

      if (answer.selection === 'up') {
        const parentDir = path.dirname(currentDir);
        if (parentDir !== currentDir) {
          return await this.browseDirectory(parentDir);
        } else {
          showWarning('Already at root directory');
          return await this.browseDirectory(currentDir);
        }
      } else if (answer.selection === 'manual') {
        return await this.getFilePathManually();
      } else if (answer.selection === 'current' || answer.selection === 'empty') {
        return await this.browseDirectory(currentDir);
      } else {
        const selectedPath = answer.selection;
        const stats = fs.statSync(selectedPath);
        
        if (stats.isDirectory()) {
          return await this.browseDirectory(selectedPath);
        } else {
          return selectedPath;
        }
      }
    } catch (error) {
      showError(`Error browsing directory: ${error.message}`);
      return await this.getFilePathManually();
    }
  }

  /**
   * Get file path manually from user input
   */
  async getFilePathManually() {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Enter the full path to your file:',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'File path is required';
          }
          
          const filePath = input.trim();
          
          if (!fs.existsSync(filePath)) {
            return 'File does not exist. Please check the path and try again.';
          }
          
          const stats = fs.statSync(filePath);
          if (!stats.isFile()) {
            return 'Path must point to a file, not a directory.';
          }
          
          return true;
        }
      }
    ]);

    return this.sanitizeFilePath(answer.filePath.trim());
  }

  /**
   * Sanitize file path to prevent directory traversal attacks
   */
  sanitizeFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided');
    }

    // Normalize the path to resolve any relative path components
    const normalizedPath = path.resolve(filePath);
    
    // Check for suspicious patterns that could indicate directory traversal
    const suspiciousPatterns = [
      /\.\./,  // Parent directory references
      /~\//,   // Home directory shortcuts
      /\/\//,  // Double slashes
      /\0/     // Null bytes
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(filePath)) {
        throw new Error('Invalid file path: contains suspicious characters');
      }
    }
    
    // Ensure the path exists and is accessible
    if (!fs.existsSync(normalizedPath)) {
      throw new Error('File does not exist or is not accessible');
    }
    
    return normalizedPath;
  }

  /**
   * Validate file before upload
   */
  async validateFile(filePath) {
    try {
      // Sanitize the file path first
      const sanitizedPath = this.sanitizeFilePath(filePath);
      const stats = fs.statSync(sanitizedPath);
      const fileName = path.basename(sanitizedPath);
      const fileExtension = path.extname(sanitizedPath).toLowerCase();
      const mimeType = mimeTypes.lookup(sanitizedPath) || 'application/octet-stream';

      const fileInfo = {
        path: sanitizedPath,
        name: fileName,
        size: stats.size,
        mimeType: mimeType,
        extension: fileExtension,
        modified: stats.mtime
      };

      // Check file size
      if (fileInfo.size > MAX_FILE_SIZE) {
        showError(ERROR_MESSAGES.FILE_TOO_LARGE);
        showInfo(`Your file: ${formatBytes(fileInfo.size)}`);
        showInfo(`Maximum allowed: ${formatBytes(MAX_FILE_SIZE)}`);
        return null;
      }

      // Check file type (optional warning)
      if (!SUPPORTED_FILE_TYPES.includes(mimeType)) {
        const shouldContinue = await showConfirmation(
          `File type "${mimeType}" may not be optimally supported. Continue anyway?`,
          false
        );
        
        if (!shouldContinue) {
          return null;
        }
      }

      // Show file information
      console.log(chalk.cyan('\n📋 File Information:'));
      console.log(`${getFileTypeIcon(mimeType)} Name: ${chalk.white(fileName)}`);
      console.log(`📏 Size: ${chalk.white(formatBytes(fileInfo.size))}`);
      console.log(`🏷️  Type: ${chalk.white(mimeType)}`);
      console.log(`📅 Modified: ${chalk.white(fileInfo.modified.toLocaleString())}`);

      return fileInfo;

    } catch (error) {
      showError(`Could not read file: ${error.message}`);
      return null;
    }
  }

  /**
   * Get upload options from user
   */
  async getUploadOptions(fileInfo) {
    console.log(chalk.cyan('\n⚙️  Upload Options:'));
    
    // Load saved settings as defaults
    const savedOptions = this.settings.getUploadOptions();
    console.log(chalk.dim('Using saved preferences. Change them in Settings if needed.\n'));

    const options = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'preserveFilename',
        message: 'Preserve original filename?',
        default: savedOptions.preserveFilename
      },
      {
        type: 'confirm',
        name: 'optimize',
        message: 'Optimize file (recommended for images)?',
        default: savedOptions.optimize && fileInfo.mimeType.startsWith('image/')
      },
      {
        type: 'confirm',
        name: 'generateThumbnails',
        message: 'Generate thumbnails (for images)?',
        default: savedOptions.generateThumbnails && fileInfo.mimeType.startsWith('image/')
      },
      {
        type: 'input',
        name: 'customName',
        message: 'Custom display name (optional):',
        default: savedOptions.customName || ''
      }
    ]);

    // All files are public by default
    options.isPublic = true;

    // Confirm upload
    console.log(chalk.cyan('\n📤 Ready to Upload:'));
    console.log(`File: ${chalk.white(fileInfo.name)}`);
    console.log(`Size: ${chalk.white(formatBytes(fileInfo.size))}`);
    console.log(`Public: ${chalk.green('Yes')} ${chalk.dim('(all files are public)')}`);
    console.log(`Optimize: ${options.optimize ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`Thumbnails: ${options.generateThumbnails ? chalk.green('Yes') : chalk.red('No')}`);

    const confirmed = await showConfirmation('Proceed with upload?', true);
    
    if (!confirmed) {
      return null;
    }

    return options;
  }

  /**
   * Upload file to GhostCDN
   */
  async uploadFile(filePath, fileInfo, options) {
    const spinner = ora('Preparing upload...').start();

    try {
      // Step 1: Get presigned URL
      spinner.text = 'Getting upload URL...';

      const presignedResponse = await axios.post(
        `${API_BASE_URL}/files/presigned-url`,
        {
          filename: fileInfo.name,
          contentType: fileInfo.mimeType,
          fileSize: fileInfo.size,
          preserveFilename: options.preserveFilename,
          optimize: options.optimize,
          generateThumbnails: options.generateThumbnails
        },
        {
          headers: {
            'Authorization': `Bearer ${this.authManager.getApiKey()}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!presignedResponse.data.success) {
        throw new Error(presignedResponse.data.error || 'Failed to get upload URL');
      }

      const responseData = presignedResponse.data.data;
      if (!responseData) {
        throw new Error('Invalid response from server - missing data');
      }

      // Handle the actual response format from the backend
      const uploadUrl = responseData.presignedUrl || responseData.uploadUrl;
      const fileKey = responseData.fileKey;
      
      if (!uploadUrl || !fileKey) {
        throw new Error('Invalid response from server - missing upload URL or file key');
      }

      // Step 2: Upload file to storage using presigned URL
      spinner.text = 'Uploading file...';

      // Read file data
      const fileData = fs.readFileSync(filePath);
      
      // Store file size for success display
      this.lastFileSize = fileData.length;

      await axios.put(uploadUrl, fileData, {
        headers: {
          'Content-Type': fileInfo.mimeType,
          'Content-Length': fileData.length
        },
        timeout: UPLOAD_TIMEOUT,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      // Step 3: Complete upload
      spinner.text = 'Finalizing upload...';

      const completeResponse = await axios.post(
        `${API_BASE_URL}/files/complete-upload/${encodeURIComponent(fileKey)}`,
        {
          generateThumbnails: options.generateThumbnails,
          isPublic: options.isPublic,
          customName: options.customName || null
        },
        {
          headers: {
            'Authorization': `Bearer ${this.authManager.getApiKey()}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!completeResponse.data.success) {
        throw new Error(completeResponse.data.error || 'Failed to complete upload');
      }

      spinner.succeed(SUCCESS_MESSAGES.UPLOAD_SUCCESS);
      return completeResponse.data.data;

    } catch (error) {
      spinner.fail('Upload failed');
      
      if (error.response?.status === 401) {
        throw new Error(ERROR_MESSAGES.AUTH_FAILED);
      } else if (error.response?.status === 413) {
        throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(ERROR_MESSAGES.CONNECTION_REFUSED);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Upload timeout. Please try again with a smaller file.');
      } else {
        throw new Error(error.response?.data?.error || error.message || ERROR_MESSAGES.UPLOAD_FAILED);
      }
    }
  }

  /**
   * Show upload success information
   */
  async showUploadSuccess(result) {
    console.log(chalk.green('\n🎉 Upload Successful!\n'));
    
    console.log(chalk.cyan('📋 File Details:'));
    
    // Handle the actual response format from backend
    const fileName = result.originalFilename || result.originalName || 'Unknown';
    const fileSize = result.fileSize || this.lastFileSize || 0;
    const fileType = result.contentType || result.fileType || 'application/octet-stream';
    const fileId = result.id || result.key || 'Unknown';
    
    console.log(`${getFileTypeIcon(fileType)} Name: ${chalk.white(fileName)}`);
    console.log(`🔗 URL: ${chalk.blue(result.url)}`);
    console.log(`📏 Size: ${chalk.white(formatBytes(fileSize))}`);
    console.log(`🆔 Key: ${chalk.dim(fileId)}`);
    
    if (result.thumbnailUrl || result.thumbnails) {
      const thumbnailUrl = result.thumbnailUrl || (result.thumbnails && result.thumbnails.small);
      if (thumbnailUrl) {
        console.log(`🖼️  Thumbnail: ${chalk.blue(thumbnailUrl)}`);
      }
    }

    // Ask what to do next
    const actions = [
      {
        name: '📋 Copy URL to clipboard',
        value: 'copy'
      },
      {
        name: '🌐 Open in browser',
        value: 'open'
      },
      {
        name: '📤 Upload another file',
        value: 'upload'
      },
      {
        name: '🔙 Back to main menu',
        value: 'back'
      }
    ];

    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do next?',
        choices: actions,
        pageSize: 5
      }
    ]);

    switch (action.action) {
      case 'copy':
        await this.copyToClipboard(result.url);
        break;
      case 'open':
        await this.openInBrowser(result.url);
        break;
      case 'upload':
        await this.handleUpload();
        break;
      case 'back':
        break;
    }
  }

  /**
   * Copy URL to clipboard
   */
  async copyToClipboard(url) {
    try {
      const clipboardy = require('clipboardy');
      await clipboardy.write(url);
      showSuccess('URL copied to clipboard!');
    } catch (error) {
      showError('Could not copy to clipboard');
      console.log(chalk.blue(`URL: ${url}`));
    }
  }

  /**
   * Open URL in browser
   */
  async openInBrowser(url) {
    try {
      await open(url);
      showSuccess('Opened in browser!');
    } catch (error) {
      showError('Could not open browser');
      console.log(chalk.blue(`URL: ${url}`));
    }
  }
}

module.exports = UploadManager;