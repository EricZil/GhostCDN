const inquirer = require('inquirer');
const chalk = require('chalk');

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
                                CLI
    `;
    
    console.log(chalk.cyan(banner));
    console.log(chalk.dim('Simple file upload tool - Manage everything else in the web dashboard\n'));
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
    const menuChoices = [
      {
        name: `📤 Upload Files`,
        value: 'upload',
        short: 'Upload Files'
      },
      new inquirer.Separator(),
      {
        name: `⚙️  Settings`,
        value: 'settings',
        short: 'Settings'
      },
      {
        name: `🌐 Open Web Dashboard`,
        value: 'dashboard',
        short: 'Web Dashboard'
      },
      {
        name: `📚 View Documentation`,
        value: 'docs',
        short: 'Documentation'
      },
      new inquirer.Separator(),
      {
        name: `🚪 Logout`,
        value: 'logout',
        short: 'Logout'
      },
      {
        name: `❌ Exit`,
        value: 'exit',
        short: 'Exit'
      }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to do?',
        choices: menuChoices,
        pageSize: 8,
        loop: false
      }
    ]);

    return answer.choice;
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
        
      default:
        showWarning('Invalid option selected');
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
      const confirmed = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'logout',
          message: 'Are you sure you want to logout?',
          default: false
        }
      ]);

      if (confirmed.logout) {
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
      const confirmed = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'exit',
          message: 'Are you sure you want to exit?',
          default: true
        }
      ]);

      if (confirmed.exit) {
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