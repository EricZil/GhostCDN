const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const Table = require('cli-table3');
const open = require('open');

const { 
  API_BASE_URL, 
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
  formatDate,
  truncateText
} = require('../utils/display');

class FileManager {
  constructor(authManager) {
    this.authManager = authManager;
    this.currentFiles = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.pageSize = 10;
  }

  /**
   * Handle file management operations
   */
  async handleFileManagement() {
    try {
      console.log(chalk.cyan.bold('📁 File Management\n'));

      while (true) {
        const action = await this.showFileManagementMenu();
        
        if (action === 'back') {
          break;
        }

        await this.handleFileAction(action);
      }

    } catch (error) {
      showError(`File management failed: ${error.message}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.error(chalk.dim(error.stack));
      }
    }
  }

  /**
   * Show file management menu
   */
  async showFileManagementMenu() {
    const options = [
      {
        name: '📋 List all files',
        value: 'list',
        description: 'View all your uploaded files'
      },
      {
        name: '🔍 Search files',
        value: 'search',
        description: 'Search files by name or type'
      },
      {
        name: '🗑️  Delete files',
        value: 'delete',
        description: 'Delete one or more files'
      },
      {
        name: '📊 File details',
        value: 'details',
        description: 'View detailed information about a file'
      },
      {
        name: '🔗 Get file URLs',
        value: 'urls',
        description: 'Copy or view file URLs'
      },
      {
        name: '🔙 Back to main menu',
        value: 'back',
        description: 'Return to the main menu'
      }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: options.map(option => ({
          name: `${option.name}\n  ${chalk.dim(option.description)}`,
          value: option.value,
          short: option.name
        })),
        pageSize: 8
      }
    ]);

    return answer.action;
  }

  /**
   * Handle file action
   */
  async handleFileAction(action) {
    switch (action) {
      case 'list':
        await this.listFiles();
        break;
      case 'search':
        await this.searchFiles();
        break;
      case 'delete':
        await this.deleteFiles();
        break;
      case 'details':
        await this.showFileDetails();
        break;
      case 'urls':
        await this.getFileUrls();
        break;
    }
  }

  /**
   * List all files with pagination
   */
  async listFiles(searchQuery = null) {
    const spinner = ora('Loading files...').start();

    try {
      const params = {
        page: this.currentPage,
        limit: this.pageSize
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await axios.get(`${API_BASE_URL}/files`, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getApiKey()}`
        },
        params,
        timeout: 30000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load files');
      }

      const { files, pagination } = response.data.data;
      this.currentFiles = files;
      this.totalPages = pagination.totalPages;

      spinner.succeed(`Found ${pagination.total} files`);

      if (files.length === 0) {
        if (searchQuery) {
          showWarning(`No files found matching "${searchQuery}"`);
        } else {
          showInfo('No files uploaded yet. Use the upload option to add files.');
        }
        return;
      }

      this.displayFilesTable(files, pagination, searchQuery);
      await this.handleFileListActions();

    } catch (error) {
      spinner.fail('Failed to load files');
      
      if (error.response?.status === 401) {
        throw new Error(ERROR_MESSAGES.AUTH_FAILED);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(ERROR_MESSAGES.CONNECTION_REFUSED);
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Failed to load files');
      }
    }
  }

  /**
   * Display files in a table format
   */
  displayFilesTable(files, pagination, searchQuery = null) {
    console.log(chalk.cyan('\n📋 Your Files:'));
    
    if (searchQuery) {
      console.log(chalk.dim(`Search results for: "${searchQuery}"`));
    }

    const table = new Table({
      head: ['#', 'Name', 'Type', 'Size', 'Uploaded', 'Public'],
      colWidths: [4, 30, 15, 12, 12, 8],
      style: {
        head: ['cyan'],
        border: ['dim']
      }
    });

    files.forEach((file, index) => {
      const rowIndex = (this.currentPage - 1) * this.pageSize + index + 1;
      table.push([
        rowIndex.toString(),
        `${getFileTypeIcon(file.fileType)} ${truncateText(file.originalName, 25)}`,
        file.fileType.split('/')[1] || 'unknown',
        formatBytes(file.fileSize),
        formatDate(file.createdAt),
        file.isPublic ? chalk.green('Yes') : chalk.red('No')
      ]);
    });

    console.log(table.toString());

    // Show pagination info
    if (pagination.totalPages > 1) {
      console.log(chalk.dim(
        `\nPage ${pagination.currentPage} of ${pagination.totalPages} ` +
        `(${pagination.total} total files)`
      ));
    }
  }

  /**
   * Handle actions after displaying file list
   */
  async handleFileListActions() {
    const actions = [
      {
        name: '🔍 View file details',
        value: 'details'
      },
      {
        name: '🗑️  Delete file(s)',
        value: 'delete'
      },
      {
        name: '🔗 Copy file URL',
        value: 'copy'
      },
      {
        name: '🌐 Open in browser',
        value: 'open'
      }
    ];

    // Add pagination options if needed
    if (this.totalPages > 1) {
      if (this.currentPage > 1) {
        actions.push({
          name: '⬅️  Previous page',
          value: 'prev'
        });
      }
      
      if (this.currentPage < this.totalPages) {
        actions.push({
          name: '➡️  Next page',
          value: 'next'
        });
      }
    }

    actions.push({
      name: '🔙 Back',
      value: 'back'
    });

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: actions,
        pageSize: 10
      }
    ]);

    switch (answer.action) {
      case 'details':
        await this.showFileDetails();
        break;
      case 'delete':
        await this.deleteFiles();
        break;
      case 'copy':
        await this.copyFileUrl();
        break;
      case 'open':
        await this.openFileInBrowser();
        break;
      case 'prev':
        this.currentPage--;
        await this.listFiles();
        break;
      case 'next':
        this.currentPage++;
        await this.listFiles();
        break;
      case 'back':
        break;
    }
  }

  /**
   * Search files by name or type
   */
  async searchFiles() {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Enter search query (filename or file type):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Search query is required';
          }
          return true;
        }
      }
    ]);

    this.currentPage = 1; // Reset to first page for search
    await this.listFiles(answer.query.trim());
  }

  /**
   * Show detailed information about a file
   */
  async showFileDetails() {
    if (this.currentFiles.length === 0) {
      showWarning('No files to show details for. Load files first.');
      return;
    }

    const fileChoices = this.currentFiles.map((file, index) => ({
      name: `${getFileTypeIcon(file.fileType)} ${file.originalName} (${formatBytes(file.fileSize)})`,
      value: index,
      short: file.originalName
    }));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'fileIndex',
        message: 'Select a file to view details:',
        choices: fileChoices,
        pageSize: 10
      }
    ]);

    const file = this.currentFiles[answer.fileIndex];
    
    console.log(chalk.cyan('\n📋 File Details:\n'));
    
    const detailsTable = new Table({
      style: {
        head: ['cyan'],
        border: ['dim']
      }
    });

    detailsTable.push(
      ['Name', file.originalName],
      ['ID', file.id],
      ['Type', file.fileType],
      ['Size', formatBytes(file.fileSize)],
      ['Public', file.isPublic ? chalk.green('Yes') : chalk.red('No')],
      ['Uploaded', formatDate(file.createdAt)],
      ['URL', file.url]
    );

    if (file.thumbnailUrl) {
      detailsTable.push(['Thumbnail', file.thumbnailUrl]);
    }

    if (file.metadata) {
      Object.entries(file.metadata).forEach(([key, value]) => {
        detailsTable.push([`Meta: ${key}`, value]);
      });
    }

    console.log(detailsTable.toString());
  }

  /**
   * Delete one or more files
   */
  async deleteFiles() {
    if (this.currentFiles.length === 0) {
      showWarning('No files to delete. Load files first.');
      return;
    }

    const fileChoices = this.currentFiles.map((file, index) => ({
      name: `${getFileTypeIcon(file.fileType)} ${file.originalName} (${formatBytes(file.fileSize)})`,
      value: index,
      short: file.originalName
    }));

    const answer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'fileIndexes',
        message: 'Select files to delete:',
        choices: fileChoices,
        pageSize: 10,
        validate: (input) => {
          if (input.length === 0) {
            return 'Please select at least one file to delete';
          }
          return true;
        }
      }
    ]);

    const filesToDelete = answer.fileIndexes.map(index => this.currentFiles[index]);
    
    console.log(chalk.red('\n⚠️  Files to be deleted:'));
    filesToDelete.forEach(file => {
      console.log(`  ${getFileTypeIcon(file.fileType)} ${file.originalName}`);
    });

    const confirmed = await showConfirmation(
      `Are you sure you want to delete ${filesToDelete.length} file(s)? This action cannot be undone.`,
      false
    );

    if (!confirmed) {
      showWarning('Deletion cancelled');
      return;
    }

    const spinner = ora('Deleting files...').start();

    try {
      const deletePromises = filesToDelete.map(file => 
        axios.delete(`${API_BASE_URL}/files/${file.id}`, {
          headers: {
            'Authorization': `Bearer ${this.authManager.getApiKey()}`
          },
          timeout: 30000
        })
      );

      await Promise.all(deletePromises);
      
      spinner.succeed(`Successfully deleted ${filesToDelete.length} file(s)`);
      
      // Refresh the file list
      await this.listFiles();

    } catch (error) {
      spinner.fail('Failed to delete files');
      
      if (error.response?.status === 401) {
        throw new Error(ERROR_MESSAGES.AUTH_FAILED);
      } else if (error.response?.status === 404) {
        showWarning('Some files may have already been deleted');
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Failed to delete files');
      }
    }
  }

  /**
   * Copy file URL to clipboard
   */
  async copyFileUrl() {
    if (this.currentFiles.length === 0) {
      showWarning('No files available. Load files first.');
      return;
    }

    const fileChoices = this.currentFiles.map((file, index) => ({
      name: `${getFileTypeIcon(file.fileType)} ${file.originalName}`,
      value: index,
      short: file.originalName
    }));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'fileIndex',
        message: 'Select a file to copy URL:',
        choices: fileChoices,
        pageSize: 10
      }
    ]);

    const file = this.currentFiles[answer.fileIndex];

    try {
      const clipboardy = require('clipboardy');
      await clipboardy.write(file.url);
      showSuccess(`URL copied to clipboard: ${file.originalName}`);
    } catch (error) {
      showError('Could not copy to clipboard');
      console.log(chalk.blue(`URL: ${file.url}`));
    }
  }

  /**
   * Open file in browser
   */
  async openFileInBrowser() {
    if (this.currentFiles.length === 0) {
      showWarning('No files available. Load files first.');
      return;
    }

    const fileChoices = this.currentFiles.map((file, index) => ({
      name: `${getFileTypeIcon(file.fileType)} ${file.originalName}`,
      value: index,
      short: file.originalName
    }));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'fileIndex',
        message: 'Select a file to open in browser:',
        choices: fileChoices,
        pageSize: 10
      }
    ]);

    const file = this.currentFiles[answer.fileIndex];

    try {
      await open(file.url);
      showSuccess(`Opened ${file.originalName} in browser`);
    } catch (error) {
      showError('Could not open browser');
      console.log(chalk.blue(`URL: ${file.url}`));
    }
  }

  /**
   * Get file URLs for sharing
   */
  async getFileUrls() {
    if (this.currentFiles.length === 0) {
      await this.listFiles();
      if (this.currentFiles.length === 0) {
        return;
      }
    }

    const actions = [
      {
        name: '📋 Copy single file URL',
        value: 'single'
      },
      {
        name: '📋 Copy all URLs',
        value: 'all'
      },
      {
        name: '📄 Export URLs to file',
        value: 'export'
      },
      {
        name: '🔙 Back',
        value: 'back'
      }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'How would you like to get the URLs?',
        choices: actions
      }
    ]);

    switch (answer.action) {
      case 'single':
        await this.copyFileUrl();
        break;
      case 'all':
        await this.copyAllUrls();
        break;
      case 'export':
        await this.exportUrls();
        break;
      case 'back':
        break;
    }
  }

  /**
   * Copy all file URLs to clipboard
   */
  async copyAllUrls() {
    const urls = this.currentFiles.map(file => `${file.originalName}: ${file.url}`).join('\n');

    try {
      const clipboardy = require('clipboardy');
      await clipboardy.write(urls);
      showSuccess(`Copied ${this.currentFiles.length} URLs to clipboard`);
    } catch (error) {
      showError('Could not copy to clipboard');
      console.log(chalk.blue('URLs:'));
      this.currentFiles.forEach(file => {
        console.log(`${file.originalName}: ${file.url}`);
      });
    }
  }

  /**
   * Export URLs to a text file
   */
  async exportUrls() {
    const fs = require('fs');
    const path = require('path');

    const filename = `ghostcdn-urls-${new Date().toISOString().split('T')[0]}.txt`;
    const content = this.currentFiles.map(file => 
      `${file.originalName}\n${file.url}\nUploaded: ${formatDate(file.createdAt)}\nSize: ${formatBytes(file.fileSize)}\n---\n`
    ).join('\n');

    try {
      fs.writeFileSync(filename, content);
      showSuccess(`URLs exported to ${filename}`);
    } catch (error) {
      showError(`Could not export URLs: ${error.message}`);
    }
  }
}

module.exports = FileManager;