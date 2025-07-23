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
  magenta: (text) => `\x1b[35m${text}\x1b[0m`
};
const chalk = colors;

const { showError, showSuccess, showInfo, showWarning } = require('../utils/display');
const { openUrl } = require('../utils/openUrl');
const { WEB_DASHBOARD_URL, DOCS_URL } = require('../config/constants');

// Import managers
const UploadManager = require('../features/UploadManager');
const SettingsManager = require('../features/SettingsManager');

class MainMenu {
  constructor(authManager) {
    this.authManager = authManager;
    this.uploadManager = new UploadManager(authManager);
    this.settingsManager = new SettingsManager();
  }

  /**
   * Display the main menu and handle user selection
   */
  async show() {
    try {
      // Clear screen and show header
      console.clear();
      await this.showHeader();
      
      // Show user info
      await this.showUserInfo();
      
      // Show main menu options
      const choice = await this.showMenuOptions();
      
      // Handle user choice
      await this.handleMenuChoice(choice);
      
    } catch (error) {
      showError('An error occurred while displaying the menu. Please try again.');
      
      // Return to menu after error
      setTimeout(() => this.show(), 2000);
    }
  }

  /**
   * Show application header with ASCII art
   */
  async showHeader() {
    // Simple text banner without figlet dependency
    const banner = `
 ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗ ██████╗██████╗ ███╗   ██╗
██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗  ██║
██║  ███╗███████║██║   ██║███████╗   ██║   ██║     ██║  ██║██╔██╗ ██║
██║   ██║██╔══██║██║   ██║╚════██║   ██║   ██║     ██║  ██║██║╚██╗██║
╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ╚██████╗██████╔╝██║ ╚████║
 ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝    ╚═════╝╚═════╝ ╚═╝  ╚═══╝
    `;
    
    console.log(chalk.cyan(banner));
    console.log(chalk.dim('Simple file upload tool for GhostCDN - Manage everything else in the web dashboard\n'));
  }

  /**
   * Show current user information
   */
  async showUserInfo() {
    try {
      const userInfo = await this.authManager.getUserInfo();
      
      if (userInfo && userInfo.user) {
        console.log(chalk.green(`👤 Logged in as: ${userInfo.user.name || userInfo.user.email}`));
        
        if (userInfo.user.email && userInfo.user.name) {
          console.log(chalk.dim(`   Email: ${userInfo.user.email}`));
        }
        
        console.log(chalk.dim(`   Role: ${userInfo.user.role || 'User'}`));
        console.log(); // Empty line for spacing
      }
      
    } catch (error) {
      showWarning('Could not load user information');
      console.log(chalk.dim('You are authenticated but user details are unavailable\n'));
    }
  }

  /**
   * Show simplified menu options focused on upload
   */
  async showMenuOptions() {
    console.log(chalk.cyan('What would you like to do?\n'));
    console.log('1. 📤 Upload Files');
    console.log('2. ⚙️  Settings');
    console.log('3. 🌐 Open Web Dashboard');
    console.log('4. 📚 View Documentation');
    console.log('5. 🚪 Logout');
    console.log('6. ❌ Exit');
    console.log();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('Enter your choice (1-6): ', (answer) => {
        rl.close();
        const choice = parseInt(answer.trim());
        switch (choice) {
          case 1: resolve('upload'); break;
          case 2: resolve('settings'); break;
          case 3: resolve('dashboard'); break;
          case 4: resolve('docs'); break;
          case 5: resolve('logout'); break;
          case 6: resolve('exit'); break;
          default: resolve('invalid'); break;
        }
      });
    });
  }

  /**
   * Handle user menu choice
   */
  async handleMenuChoice(choice) {
    switch (choice) {
      case 'upload':
        await this.uploadManager.handleUpload();
        break;
        
      case 'settings':
        await this.settingsManager.showSettingsMenu();
        break;
        
      case 'dashboard':
        await this.openWebDashboard();
        break;
        
      case 'docs':
        await this.openDocumentation();
        break;
        
      case 'logout':
        await this.handleLogout();
        return; // Don't return to menu after logout
        
      case 'exit':
        await this.handleExit();
        return; // Don't return to menu after exit
        
      case 'invalid':
      default:
        showWarning('Invalid option selected. Please enter a number between 1-6.');
    }
    
    // Return to main menu after completing action
    setTimeout(() => this.show(), 1000);
  }

  /**
   * Open web dashboard in browser
   */
  async openWebDashboard() {
    showInfo('Opening web dashboard...');
    const opened = await openUrl(WEB_DASHBOARD_URL, 'web dashboard');
    
    if (opened) {
      showSuccess('Web dashboard opened in your browser');
      showInfo('Use the dashboard to manage files, view analytics, and configure settings');
    }
  }

  /**
   * Open documentation in browser
   */
  async openDocumentation() {
    showInfo('Opening documentation...');
    const opened = await openUrl(DOCS_URL, 'documentation');
    
    if (opened) {
      showSuccess('Documentation opened in your browser');
    }
  }

  /**
   * Handle user logout
   */
  async handleLogout() {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const confirmed = await new Promise((resolve) => {
        rl.question('Are you sure you want to logout? (y/N): ', (answer) => {
          rl.close();
          resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
        });
      });

      if (confirmed) {
        await this.authManager.logout();
        showSuccess('Logged out successfully');
        
        console.log(chalk.dim('\nThank you for using GhostCDN CLI!'));
        process.exit(0);
      }
    } catch (error) {
      showError(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Handle application exit
   */
  async handleExit() {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const confirmed = await new Promise((resolve) => {
        rl.question('Are you sure you want to exit? (Y/n): ', (answer) => {
          rl.close();
          const response = answer.toLowerCase().trim();
          resolve(response === '' || response === 'y' || response === 'yes');
        });
      });

      if (confirmed) {
        console.log(chalk.cyan('\n👋 Thank you for using GhostCDN CLI!'));
        console.log(chalk.dim('Visit the web dashboard for file management and analytics'));
        console.log(chalk.dim('https://ghostcdn.xyz\n'));
        process.exit(0);
      }
    } catch (error) {
      showError(`Exit failed: ${error.message}`);
      process.exit(1);
    }
  }
}

module.exports = MainMenu;