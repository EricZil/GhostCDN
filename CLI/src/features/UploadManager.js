const fs = require('fs');
const path = require('path');
const readline = require('readline');
// Simple color functions to replace chalk
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};
// Add chainable methods for compatibility
colors.cyan.bold = (text) => `\x1b[1m\x1b[36m${text}\x1b[0m`;
const chalk = colors;
// Simple spinner implementation to replace ora
const createSpinner = (text) => {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let interval;
  
  return {
    start: function() {
       process.stdout.write(`${frames[0]} ${text}`);
       interval = setInterval(() => {
         process.stdout.write(`\r${frames[i]} ${text}`);
         i = (i + 1) % frames.length;
       }, 80);
       return this;
     },
    succeed: (message) => {
      clearInterval(interval);
      process.stdout.write(`\r✅ ${message || text}\n`);
    },
    fail: (message) => {
      clearInterval(interval);
      process.stdout.write(`\r❌ ${message || text}\n`);
    },
    stop: () => {
      clearInterval(interval);
      process.stdout.write('\r');
    }
  };
};
const ora = createSpinner;
const axios = require('axios');
const FormData = require('form-data');
const mimeTypes = require('mime-types');
const { openFileDialogWithFallback, isNativeFileDialogSupported } = require('../utils/nativeFileDialog');

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

const { openUrl } = require('../utils/openUrl');

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
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      await new Promise((resolve) => {
        rl.question('', () => {
          rl.close();
          resolve();
        });
      });
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
        description: isNativeFileDialogSupported() ? 'Open native file explorer to select a file' : 'Open file browser to select a file'
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

    console.log(chalk.cyan('How would you like to select your file?\n'));
    methods.forEach((method, index) => {
      console.log(`${index + 1}. ${method.name}`);
      console.log(`   ${chalk.dim(method.description)}`);
    });
    console.log();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const methodAnswer = await new Promise((resolve) => {
      rl.question('Enter your choice (1-3): ', (answer) => {
        rl.close();
        const choice = parseInt(answer.trim());
        if (choice >= 1 && choice <= 3) {
          resolve({ method: methods[choice - 1].value });
        } else {
          resolve({ method: 'back' });
        }
      });
    });

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
   * Browse for file using native file dialog with fallback
   */
  async browseForFile() {
    try {
      if (isNativeFileDialogSupported()) {
         const filePath = await openFileDialogWithFallback();
         if (filePath) {
           return filePath;
         } else {
           showWarning('No file selected');
           return null;
         }
       } else {
        showInfo('Starting file browser...');
        return await this.browseDirectory(process.cwd());
      }
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
        // Separator
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

      // Simplified directory browsing - just show manual input option
      console.log(chalk.cyan('Directory browsing not available in this mode.'));
      console.log('Please enter the file path manually.');
      return await this.getFilePathManually();

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
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Enter the full path to your file: ', (input) => {
        rl.close();
        resolve({ filePath: input });
      });
    });

    const filePath = answer.filePath.trim();
    
    if (!filePath || filePath.length === 0) {
      showError('File path is required');
      return null;
    }
    
    if (!fs.existsSync(filePath)) {
      showError('File does not exist. Please check the path and try again.');
      return null;
    }
    
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      showError('Path must point to a file, not a directory.');
      return null;
    }

    return this.sanitizeFilePath(filePath);
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

      // All file types are supported - no validation needed

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
    // Check if file is an image
    const isImage = fileInfo.mimeType.startsWith('image/');
    
    // Only show upload options for image files
    if (isImage) {
      console.log(chalk.cyan('\n⚙️  Upload Options:'));
      
      // Load saved settings as defaults
      const savedOptions = this.settings.getUploadOptions();
      console.log(chalk.dim('Using saved preferences. Change them in Settings if needed.\n'));

      // Build prompts array for images
      const prompts = [
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
          default: savedOptions.optimize
        },
        {
          type: 'confirm',
          name: 'generateThumbnails',
          message: 'Generate thumbnails?',
          default: savedOptions.generateThumbnails
        },
        {
          type: 'input',
          name: 'customName',
          message: 'Custom display name (optional):',
          default: savedOptions.customName || ''
        }
      ];

      // Use saved options directly for simplicity
      const options = {
        preserveFilename: savedOptions.preserveFilename,
        optimize: savedOptions.optimize,
        generateThumbnails: savedOptions.generateThumbnails,
        customName: savedOptions.customName || ''
      };
      
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
    } else {
      // For non-image files, use default options without showing upload options menu
      const savedOptions = this.settings.getUploadOptions();
      
      const options = {
        preserveFilename: savedOptions.preserveFilename,
        optimize: false,
        generateThumbnails: false,
        customName: savedOptions.customName || '',
        isPublic: true
      };

      // Confirm upload directly
      console.log(chalk.cyan('\n📤 Ready to Upload:'));
      console.log(`File: ${chalk.white(fileInfo.name)}`);
      console.log(`Size: ${chalk.white(formatBytes(fileInfo.size))}`);
      console.log(`Public: ${chalk.green('Yes')} ${chalk.dim('(all files are public)')}`);

      const confirmed = await showConfirmation('Proceed with upload?', true);
      
      if (!confirmed) {
        return null;
      }

      return options;
    }
  }

  /**
   * Upload file to GhostCDN
   */
  async uploadFile(filePath, fileInfo, options) {
    let spinner = ora('Preparing upload...').start();

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

      // Store file size for success display
      this.lastFileSize = fileInfo.size;

      // For large files, use streaming upload with progress
      if (fileInfo.size > 100 * 1024 * 1024) { // Files larger than 100MB
        spinner.stop();
        console.log(chalk.cyan('\n📤 Uploading large file with progress tracking...\n'));
        
        await this.uploadLargeFile(uploadUrl, filePath, fileInfo);
        
        spinner = ora('Finalizing upload...').start();
      } else {
        // For smaller files, use the existing method
        const fileData = fs.readFileSync(filePath);
        
        await axios.put(uploadUrl, fileData, {
          headers: {
            'Content-Type': fileInfo.mimeType,
            'Content-Length': fileData.length
          },
          timeout: UPLOAD_TIMEOUT,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
      }

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

    console.log(chalk.cyan('\nWhat would you like to do next?\n'));
    actions.forEach((action, index) => {
      console.log(`${index + 1}. ${action.name}`);
    });
    console.log();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const action = await new Promise((resolve) => {
      rl.question('Enter your choice (1-4): ', (answer) => {
        rl.close();
        const choice = parseInt(answer.trim());
        if (choice >= 1 && choice <= 4) {
          resolve({ action: actions[choice - 1].value });
        } else {
          resolve({ action: 'back' });
        }
      });
    });

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
    const opened = await openUrl(url, 'file');
    if (opened) {
      showSuccess('Opened in browser!');
    }
  }

  /**
   * Upload large file with progress tracking
   */
  async uploadLargeFile(uploadUrl, filePath, fileInfo) {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath);
      const progressBar = createProgressBar();
      
      let uploadedBytes = 0;
      const totalBytes = fileInfo.size;
      
      // Track upload progress
      fileStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const progress = Math.round((uploadedBytes / totalBytes) * 100);
        const speed = this.calculateUploadSpeed(uploadedBytes);
        const eta = this.calculateETA(uploadedBytes, totalBytes, speed);
        
        progressBar.update(progress / 100, {
          filename: fileInfo.name,
          uploaded: formatBytes(uploadedBytes),
          total: formatBytes(totalBytes),
          speed: formatBytes(speed) + '/s',
          eta: eta
        });
      });

      // Create the HTTP request
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = url.parse(uploadUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        method: 'PUT',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        headers: {
          'Content-Type': fileInfo.mimeType,
          'Content-Length': fileInfo.size
        }
      };

      const req = httpModule.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          progressBar.stop();
          console.log(chalk.green('✅ Large file upload completed successfully!'));
          resolve();
        } else {
          progressBar.stop();
          reject(new Error(`Upload failed with status ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        progressBar.stop();
        reject(error);
      });

      // Start the upload
      this.uploadStartTime = Date.now();
      fileStream.pipe(req);
    });
  }

  /**
   * Calculate upload speed in bytes per second
   */
  calculateUploadSpeed(uploadedBytes) {
    if (!this.uploadStartTime) return 0;
    
    const elapsedTime = (Date.now() - this.uploadStartTime) / 1000; // seconds
    return elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
  }

  /**
   * Calculate estimated time remaining
   */
  calculateETA(uploadedBytes, totalBytes, speed) {
    if (speed === 0) return 'Calculating...';
    
    const remainingBytes = totalBytes - uploadedBytes;
    const remainingSeconds = remainingBytes / speed;
    
    if (remainingSeconds < 60) {
      return `${Math.round(remainingSeconds)}s`;
    } else if (remainingSeconds < 3600) {
      return `${Math.round(remainingSeconds / 60)}m`;
    } else {
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.round((remainingSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}

module.exports = UploadManager;