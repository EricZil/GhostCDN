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
const chalk = colors;
const fs = require('fs');
const path = require('path');
const os = require('os');

const { showError, showSuccess, showInfo, showWarning } = require('../utils/display');
const {
  UPLOAD_OPTIONS,
  UPLOAD_PERFORMANCE,
  CONFIG_DIR
} = require('../config/constants');


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
      console.log(chalk.cyan('⚙️  GhostCDN CLI Settings\n'));

      console.log('What would you like to configure?\n');
      console.log('1. 📤 Upload Preferences');
      console.log('2. 🚀 Upload Performance');
      console.log('3. 📋 View Current Settings');
      console.log('4. 🔄 Reset to Defaults');
      console.log('5. 🔙 Back to Main Menu');
      console.log();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const choice = await new Promise((resolve) => {
        rl.question('Enter your choice (1-5): ', (answer) => {
          rl.close();
          const choiceNum = parseInt(answer.trim());
          switch (choiceNum) {
            case 1: resolve('upload'); break;
            case 2: resolve('performance'); break;
            case 3: resolve('view'); break;
            case 4: resolve('reset'); break;
            case 5: resolve('back'); break;
            default: resolve('invalid'); break;
          }
        });
      });

      switch (choice) {
        case 'upload':
          await this.configureUploadSettings();
          break;
        case 'performance':
          await this.configureUploadPerformance();
          break;
        case 'view':
          await this.viewCurrentSettings();
          break;
        case 'reset':
          await this.resetSettings();
          break;
        case 'back':
          return;
        case 'invalid':
        default:
          showWarning('Invalid option selected. Please enter a number between 1-5.');
      }

      // Ask if user wants to continue in settings
      if (choice !== 'back' && choice !== 'invalid') {
        const rl2 = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const continueChoice = await new Promise((resolve) => {
          rl2.question('\nContinue in settings? (y/N): ', (answer) => {
            rl2.close();
            resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
          });
        });

        if (continueChoice) {
          await this.showSettingsMenu();
        }
      }

    } catch (error) {
      if (process.argv.includes('--debug')) {
        console.error('Settings error details:', error);
        console.error('Stack trace:', error.stack);
      }
      showError(`An error occurred while managing settings: ${error.message}`);
    }
  }

  /**
   * Configure upload performance settings
   */
  async configureUploadPerformance() {
    try {
      const currentSettings = this.loadSettings();
      const currentProfile = currentSettings.uploadPerformance?.profile || 'FAST';

      console.log(chalk.cyan('\n🚀 Upload Performance Configuration\n'));
      console.log(chalk.dim('Choose the upload profile that best matches your internet connection.\n'));
      
      // Display profile information
      console.log(chalk.white('Available Profiles:\n'));
      
      Object.entries(UPLOAD_PERFORMANCE.PROFILES).forEach(([name, config]) => {
        const partSizeMB = Math.round(config.PART_SIZE / (1024 * 1024));
        const timeoutMin = Math.round(config.PART_TIMEOUT / 60000);
        
        console.log(chalk.cyan(`${name}:`));
        console.log(`  • Part Size: ${partSizeMB}MB`);
        console.log(`  • Concurrent Uploads: ${config.MAX_CONCURRENT_UPLOADS}`);
        console.log(`  • Timeout: ${timeoutMin} minutes`);
        
        if (name === 'SLOW') {
          console.log(chalk.dim('  • Best for: Slower connections (< 10 Mbps)'));
        } else if (name === 'MEDIUM') {
          console.log(chalk.dim('  • Best for: Average connections (10-50 Mbps)'));
        } else if (name === 'FAST') {
          console.log(chalk.dim('  • Best for: Fast connections (50+ Mbps) - Recommended'));
        } else if (name === 'ULTRA') {
          console.log(chalk.dim('  • Best for: Ultra-fast connections (100+ Mbps)'));
        }
        console.log();
      });

      console.log('Select your upload performance profile:\n');
      console.log('1. SLOW - Conservative (< 10 Mbps)');
      console.log('2. MEDIUM - Balanced (10-50 Mbps)');
      console.log('3. FAST - Optimized (50+ Mbps) - Recommended');
      console.log('4. ULTRA - Maximum Performance (100+ Mbps)');
      console.log();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const profileChoice = await new Promise((resolve) => {
        rl.question('Enter your choice (1-4): ', (answer) => {
          rl.close();
          const choiceNum = parseInt(answer.trim());
          switch (choiceNum) {
            case 1: resolve('SLOW'); break;
            case 2: resolve('MEDIUM'); break;
            case 3: resolve('FAST'); break;
            case 4: resolve('ULTRA'); break;
            default: resolve(currentProfile); break;
          }
        });
      });

      const answer = { profile: profileChoice };

      // Update settings
      const newSettings = {
        ...currentSettings,
        uploadPerformance: {
          profile: answer.profile
        }
      };

      if (this.saveSettings(newSettings)) {
        const selectedConfig = UPLOAD_PERFORMANCE.PROFILES[answer.profile];
        const partSizeMB = Math.round(selectedConfig.PART_SIZE / (1024 * 1024));
        const timeoutMin = Math.round(selectedConfig.PART_TIMEOUT / 60000);
        
        showSuccess('Upload performance settings saved successfully!');
        
        console.log(chalk.cyan('\n📊 New Performance Settings:'));
        console.log(`Profile: ${chalk.green(answer.profile)}`);
        console.log(`Part Size: ${chalk.white(partSizeMB)}MB`);
        console.log(`Concurrent Uploads: ${chalk.white(selectedConfig.MAX_CONCURRENT_UPLOADS)}`);
        console.log(`Timeout: ${chalk.white(timeoutMin)} minutes`);
        console.log(chalk.dim('\nThese settings will be used for large file uploads (>1GB).'));
        console.log();
      }

    } catch (error) {
      showError(`Could not configure upload performance: ${error.message}`);
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

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const preserveFilename = await new Promise((resolve) => {
        rl.question(`Preserve original filename? (${currentUpload.preserveFilename ? 'Y/n' : 'y/N'}): `, (answer) => {
          const response = answer.toLowerCase().trim();
          if (response === '') {
            resolve(currentUpload.preserveFilename);
          } else {
            resolve(response === 'y' || response === 'yes');
          }
        });
      });

      const optimize = await new Promise((resolve) => {
        rl.question(`Optimize files (recommended for images)? (${currentUpload.optimize ? 'Y/n' : 'y/N'}): `, (answer) => {
          const response = answer.toLowerCase().trim();
          if (response === '') {
            resolve(currentUpload.optimize);
          } else {
            resolve(response === 'y' || response === 'yes');
          }
        });
      });

      const generateThumbnails = await new Promise((resolve) => {
        rl.question(`Generate thumbnails (for images)? (${currentUpload.generateThumbnails ? 'Y/n' : 'y/N'}): `, (answer) => {
          const response = answer.toLowerCase().trim();
          if (response === '') {
            resolve(currentUpload.generateThumbnails);
          } else {
            resolve(response === 'y' || response === 'yes');
          }
        });
      });

      const customName = await new Promise((resolve) => {
        rl.question(`Default custom display name (optional) [${currentUpload.customName || 'none'}]: `, (answer) => {
          rl.close();
          resolve(answer.trim() || currentUpload.customName);
        });
      });

      const answers = {
        preserveFilename,
        optimize,
        generateThumbnails,
        customName
      };

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
      
      console.log(chalk.white('Upload Preferences:'));
      console.log(`  Preserve filename: ${settings.uploadOptions.preserveFilename ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`  Optimize files: ${settings.uploadOptions.optimize ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`  Generate thumbnails: ${settings.uploadOptions.generateThumbnails ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`  Default custom name: ${settings.uploadOptions.customName || chalk.dim('(none)')}`);
      
      console.log(chalk.white('\nUpload Performance:'));
      const performanceProfile = settings.uploadPerformance?.profile || 'FAST';
      const profileConfig = UPLOAD_PERFORMANCE.PROFILES[performanceProfile];
      const partSizeMB = Math.round(profileConfig.PART_SIZE / (1024 * 1024));
      const timeoutMin = Math.round(profileConfig.PART_TIMEOUT / 60000);
      
      console.log(`  Profile: ${chalk.green(performanceProfile)}`);
      console.log(`  Part Size: ${chalk.white(partSizeMB)}MB`);
      console.log(`  Concurrent Uploads: ${chalk.white(profileConfig.MAX_CONCURRENT_UPLOADS)}`);
      console.log(`  Timeout: ${chalk.white(timeoutMin)} minutes`);
      
      console.log(chalk.dim(`\nSettings file: ${this.settingsFile}`));
      console.log();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      await new Promise((resolve) => {
        rl.question('Press Enter to continue...', () => {
          rl.close();
          resolve();
        });
      });

    } catch (error) {
      showError(`Could not view settings: ${error.message}`);
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings() {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const confirmed = await new Promise((resolve) => {
        rl.question('Are you sure you want to reset all settings to defaults? (y/N): ', (answer) => {
          rl.close();
          resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
        });
      });

      if (confirmed) {
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
