const inquirer = require('inquirer');
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
const chalk = colors;
const fs = require('fs');
const path = require('path');
const os = require('os');

const { showError, showSuccess, showInfo, showWarning } = require('../utils/display');

class SettingsManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.ghostcdn');
    this.settingsFile = path.join(this.configDir, 'settings.json');
    this.defaultSettings = {
      uploadOptions: {
        preserveFilename: true,
        optimize: true,
        generateThumbnails: true,
        customName: ''
      }
    };
  }

  /**
   * Ensure config directory exists
   */
  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Load settings from file
   */
  loadSettings() {
    try {
      if (!fs.existsSync(this.settingsFile)) {
        return this.defaultSettings;
      }

      const settingsData = fs.readFileSync(this.settingsFile, 'utf8');
      const settings = JSON.parse(settingsData);
      
      // Merge with defaults to ensure all properties exist
      return {
        ...this.defaultSettings,
        ...settings,
        uploadOptions: {
          ...this.defaultSettings.uploadOptions,
          ...settings.uploadOptions
        }
      };
    } catch (error) {
      showWarning('Could not load settings, using defaults');
      return this.defaultSettings;
    }
  }

  /**
   * Save settings to file
   */
  saveSettings(settings) {
    try {
      this.ensureConfigDir();
      fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2), { mode: 0o600 });
      return true;
    } catch (error) {
      showError(`Could not save settings: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current upload options
   */
  getUploadOptions() {
    const settings = this.loadSettings();
    return settings.uploadOptions;
  }

  /**
   * Show settings menu
   */
  async showSettingsMenu() {
    try {
      console.clear();
      console.log(chalk.cyan.bold('⚙️  GhostCDN CLI Settings\n'));

      const choices = [
        {
          name: '📤 Upload Preferences',
          value: 'upload',
          short: 'Upload Preferences'
        },
        {
          name: '📋 View Current Settings',
          value: 'view',
          short: 'View Settings'
        },
        {
          name: '🔄 Reset to Defaults',
          value: 'reset',
          short: 'Reset Settings'
        },
        new inquirer.Separator(),
        {
          name: '🔙 Back to Main Menu',
          value: 'back',
          short: 'Back'
        }
      ];

      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'What would you like to configure?',
          choices,
          pageSize: 8
        }
      ]);

      switch (answer.choice) {
        case 'upload':
          await this.configureUploadSettings();
          break;
        case 'view':
          await this.viewCurrentSettings();
          break;
        case 'reset':
          await this.resetSettings();
          break;
        case 'back':
          return;
      }

      // Ask if user wants to continue in settings
      const continueAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Continue in settings?',
          default: false
        }
      ]);

      if (continueAnswer.continue) {
        await this.showSettingsMenu();
      }

    } catch (error) {
      showError('An error occurred while managing settings. Please try again.');
    }
  }

  /**
   * Configure upload settings
   */
  async configureUploadSettings() {
    try {
      const currentSettings = this.loadSettings();
      const currentUpload = currentSettings.uploadOptions;

      console.log(chalk.cyan('\n📤 Upload Preferences Configuration\n'));
      console.log(chalk.dim('These settings will be used as defaults for all uploads.\n'));

      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'preserveFilename',
          message: 'Preserve original filename?',
          default: currentUpload.preserveFilename,
          suffix: chalk.dim(' (Keep the original file name instead of generating a random one)')
        },
        {
          type: 'confirm',
          name: 'optimize',
          message: 'Optimize files (recommended for images)?',
          default: currentUpload.optimize,
          suffix: chalk.dim(' (Compress images to reduce file size)')
        },
        {
          type: 'confirm',
          name: 'generateThumbnails',
          message: 'Generate thumbnails (for images)?',
          default: currentUpload.generateThumbnails,
          suffix: chalk.dim(' (Create smaller preview versions of images)')
        },
        {
          type: 'input',
          name: 'customName',
          message: 'Default custom display name (optional):',
          default: currentUpload.customName,
          suffix: chalk.dim(' (Leave empty to use filename)')
        }
      ]);

      // Update settings
      const newSettings = {
        ...currentSettings,
        uploadOptions: {
          preserveFilename: answers.preserveFilename,
          optimize: answers.optimize,
          generateThumbnails: answers.generateThumbnails,
          customName: answers.customName.trim()
        }
      };

      if (this.saveSettings(newSettings)) {
        showSuccess('Upload preferences saved successfully!');
        
        console.log(chalk.cyan('\n📋 New Upload Defaults:'));
        console.log(`Preserve filename: ${answers.preserveFilename ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`Optimize files: ${answers.optimize ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`Generate thumbnails: ${answers.generateThumbnails ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`Default custom name: ${answers.customName || chalk.dim('(none)')}`);
        console.log();
      }

    } catch (error) {
      showError(`Could not configure upload settings: ${error.message}`);
    }
  }

  /**
   * View current settings
   */
  async viewCurrentSettings() {
    try {
      const settings = this.loadSettings();
      
      console.log(chalk.cyan('\n📋 Current Settings\n'));
      
      console.log(chalk.white.bold('Upload Preferences:'));
      console.log(`  Preserve filename: ${settings.uploadOptions.preserveFilename ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`  Optimize files: ${settings.uploadOptions.optimize ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`  Generate thumbnails: ${settings.uploadOptions.generateThumbnails ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`  Default custom name: ${settings.uploadOptions.customName || chalk.dim('(none)')}`);
      
      console.log(chalk.dim(`\nSettings file: ${this.settingsFile}`));
      console.log();

      await inquirer.prompt([
        {
          type: 'input',
          name: 'continue',
          message: 'Press Enter to continue...'
        }
      ]);

    } catch (error) {
      showError(`Could not view settings: ${error.message}`);
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings() {
    try {
      const confirmed = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'reset',
          message: 'Are you sure you want to reset all settings to defaults?',
          default: false
        }
      ]);

      if (confirmed.reset) {
        if (this.saveSettings(this.defaultSettings)) {
          showSuccess('Settings reset to defaults successfully!');
        }
      } else {
        showInfo('Reset cancelled');
      }

    } catch (error) {
      showError(`Could not reset settings: ${error.message}`);
    }
  }
}

module.exports = SettingsManager;
