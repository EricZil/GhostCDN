#!/usr/bin/env node

const chalk = require('chalk');
const figlet = require('figlet');

const AuthManager = require('./auth/AuthManager');
const MainMenu = require('./ui/MainMenu');
const { clearScreen, showWelcome } = require('./utils/display');

class GhostCDNCLI {
  constructor() {
    this.authManager = new AuthManager();
    this.mainMenu = new MainMenu(this.authManager);
  }

  async start() {
    try {
      // Clear screen and show welcome
      clearScreen();
      showWelcome();

      // Check authentication
      const isAuthenticated = await this.authManager.checkAuthentication();
      
      if (!isAuthenticated) {
        console.log(chalk.yellow('\n🔐 Authentication required to continue...\n'));
        const loginSuccess = await this.authManager.login();
        
        if (!loginSuccess) {
          console.log(chalk.red('\n❌ Authentication failed. Exiting...\n'));
          process.exit(1);
        }
      }

      // Show main menu
      await this.mainMenu.show();

    } catch (error) {
      console.error(chalk.red('\n❌ An unexpected error occurred:'));
      console.error(chalk.red('Please try again or contact support if the issue persists.'));
      process.exit(1);
    }
  }

  async shutdown() {
    console.log(chalk.cyan('\n👋 Thank you for using GhostCDN CLI!'));
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  const cli = new GhostCDNCLI();
  await cli.shutdown();
});

process.on('SIGTERM', async () => {
  const cli = new GhostCDNCLI();
  await cli.shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 An unexpected error occurred'));
  console.error(chalk.red('Please restart the application and try again.'));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 An unexpected error occurred'));
  console.error(chalk.red('Please restart the application and try again.'));
  process.exit(1);
});

// Start the CLI
if (require.main === module) {
  const cli = new GhostCDNCLI();
  cli.start();
}

module.exports = GhostCDNCLI;