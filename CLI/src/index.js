#!/usr/bin/env node

// Simple color functions to replace chalk
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`
};
const chalk = colors;

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
  try {
    // Clean up stdin if in raw mode
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
    
    console.error(chalk.red('\n💥 An unexpected error occurred:'));
    console.error(chalk.red(error.message));
    
    // Only show stack trace in debug mode
    if (process.env.DEBUG || process.argv.includes('--debug')) {
      console.error(chalk.dim(error.stack));
    }
    
    console.error(chalk.red('Please restart the application and try again.'));
    
    // Graceful exit without waiting for input in executable mode
    setTimeout(() => {
      process.exit(1);
    }, 2000);
    
  } catch (cleanupError) {
    // If cleanup fails, force exit
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  try {
    // Clean up stdin if in raw mode
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
    
    console.error(chalk.red('\n💥 An unexpected error occurred:'));
    console.error(chalk.red(reason));
    console.error(chalk.red('Please restart the application and try again.'));
    
    // Graceful exit without waiting for input in executable mode
    setTimeout(() => {
      process.exit(1);
    }, 2000);
    
  } catch (cleanupError) {
    // If cleanup fails, force exit
    process.exit(1);
  }
});

// Start the CLI
if (require.main === module) {
  console.log('🚀 Starting GhostCDN CLI...');
  console.log('📍 Working directory:', process.cwd());
  console.log('🔧 Node.js version:', process.version);
  console.log('💻 Platform:', process.platform);
  
  const cli = new GhostCDNCLI();
  cli.start().catch(error => {
    console.error('❌ Failed to start CLI:', error.message);
    console.error('Stack trace:', error.stack);
    console.log('\nPress any key to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => process.exit(1));
  });
}

module.exports = GhostCDNCLI;