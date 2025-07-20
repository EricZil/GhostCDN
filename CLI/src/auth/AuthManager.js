const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { API_BASE_URL, SERVICE_NAME } = require('../config/constants');

class AuthManager {
  constructor() {
    this.serviceName = SERVICE_NAME;
    this.accountName = 'ghostcdn-api-key';
    this.apiKey = null;
    this.userInfo = null;
    this.configDir = path.join(os.homedir(), '.ghostcdn');
    this.credentialsFile = path.join(this.configDir, 'credentials.json');
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
   * Encrypt credentials using Node.js crypto module
   */
  encryptCredentials(data) {
    try {
      const crypto = require('crypto');
      const algorithm = 'aes-256-cbc';
      
      // Generate a random key from machine-specific data
      const machineId = require('os').hostname() + require('os').platform() + require('os').arch();
      const key = crypto.scryptSync(machineId, 'ghostcdn-salt', 32);
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      const jsonString = JSON.stringify(data);
      let encrypted = cipher.update(jsonString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted,
        iv: iv.toString('hex')
      };
    } catch (error) {
      // Fallback to base64 encoding if crypto fails
      const jsonString = JSON.stringify(data);
      return { encrypted: Buffer.from(jsonString).toString('base64'), fallback: true };
    }
  }

  /**
   * Decrypt stored credentials
   */
  decryptCredentials(encryptedData) {
    try {
      // Handle fallback base64 encoding
      if (encryptedData.fallback) {
        const jsonString = Buffer.from(encryptedData.encrypted, 'base64').toString();
        return JSON.parse(jsonString);
      }
      
      // Handle legacy simple obfuscation (for backward compatibility)
      if (typeof encryptedData === 'string') {
        const encoded = encryptedData.split('').reverse().join('');
        const jsonString = Buffer.from(encoded, 'base64').toString();
        return JSON.parse(jsonString);
      }
      
      // Handle proper encryption
      const crypto = require('crypto');
      const algorithm = 'aes-256-cbc';
      
      const machineId = require('os').hostname() + require('os').platform() + require('os').arch();
      const key = crypto.scryptSync(machineId, 'ghostcdn-salt', 32);
      
      const decipher = crypto.createDecipher(algorithm, key);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is already authenticated
   */
  async checkAuthentication() {
    try {
      // Try to get stored API key
      const storedApiKey = await this.getStoredApiKey();
      
      if (!storedApiKey) {
        return false;
      }

      // Validate the API key with the server
      const spinner = ora('Validating stored credentials...').start();
      
      try {
        const response = await axios.get(`${API_BASE_URL}/account/info`, {
          headers: {
            'Authorization': `Bearer ${storedApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.data.success) {
          this.apiKey = storedApiKey;
          this.userInfo = response.data.data;
          
          spinner.succeed(chalk.green(`Welcome back, ${this.userInfo.user.name || this.userInfo.user.email}!`));
          return true;
        } else {
          spinner.fail('Stored credentials are invalid');
          await this.clearStoredCredentials();
          return false;
        }
      } catch (error) {
        spinner.fail('Failed to validate credentials');
        
        if (error.response?.status === 401) {
          console.log(chalk.yellow('Stored API key is no longer valid. Please login again.'));
          await this.clearStoredCredentials();
        } else if (error.code === 'ECONNREFUSED') {
          console.log(chalk.red('Cannot connect to GhostCDN server. Please ensure the server is running.'));
          console.log(chalk.dim(`Trying to connect to: ${API_BASE_URL}`));
        } else {
          console.log(chalk.red(`Authentication error: ${error.message}`));
        }
        
        return false;
      }
    } catch (error) {
      console.error(chalk.red('Error checking authentication:'), error.message);
      return false;
    }
  }

  /**
   * Get stored API key from file
   */
  async getStoredApiKey() {
    try {
      if (!fs.existsSync(this.credentialsFile)) {
        return null;
      }

      const encryptedData = fs.readFileSync(this.credentialsFile, 'utf8');
      const credentials = this.decryptCredentials(encryptedData);
      
      if (credentials && credentials.apiKey) {
        return credentials.apiKey;
      }
      return null;
    } catch (error) {
      console.error('Error reading stored credentials:', error.message);
      return null;
    }
  }

  /**
   * Prompt user for login credentials and authenticate
   */
  async login() {
    try {
      console.log(chalk.cyan('🔐 GhostCDN Authentication'));
      console.log(chalk.dim('Enter your API key to continue. You can generate one from the web dashboard.\n'));

      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'API Key:',
          mask: '*',
          validate: (input) => {
            if (!input || input.trim().length === 0) {
              return 'API key is required';
            }
            if (!input.startsWith('gcdn_')) {
              return 'Invalid API key format. API keys should start with "gcdn_"';
            }
            if (input.length < 20) {
              return 'API key appears to be too short';
            }
            return true;
          }
        },
        {
          type: 'confirm',
          name: 'saveCredentials',
          message: 'Save credentials securely for future use?',
          default: true
        }
      ]);

      // Validate API key with server
      const spinner = ora('Authenticating with GhostCDN...').start();

      try {
        const response = await axios.get(`${API_BASE_URL}/account/info`, {
          headers: {
            'Authorization': `Bearer ${answers.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        if (response.data.success) {
          this.apiKey = answers.apiKey;
          this.userInfo = response.data.data;

          spinner.succeed(chalk.green('Authentication successful!'));
          
          console.log(chalk.cyan('\n📊 Account Information:'));
          console.log(chalk.white(`Name: ${this.userInfo.user.name || 'Not set'}`));
          console.log(chalk.white(`Email: ${this.userInfo.user.email}`));
          console.log(chalk.white(`Role: ${this.userInfo.user.role}`));
          console.log(chalk.white(`Total Files: ${this.userInfo.usage.totalFiles.toLocaleString()}`));
          console.log(chalk.white(`Storage Used: ${this.formatBytes(this.userInfo.usage.totalSize)}`));

          // Save credentials if requested
          if (answers.saveCredentials) {
            await this.saveCredentials(answers.apiKey);
          }

          return true;
        } else {
          spinner.fail('Authentication failed');
          console.log(chalk.red('Invalid API key or server error'));
          return false;
        }
      } catch (error) {
        spinner.fail('Authentication failed');
        
        if (error.response?.status === 401) {
          console.log(chalk.red('Invalid API key. Please check your credentials.'));
        } else if (error.code === 'ECONNREFUSED') {
          console.log(chalk.red('Cannot connect to GhostCDN server.'));
          console.log(chalk.dim(`Server URL: ${API_BASE_URL}`));
          console.log(chalk.yellow('Please ensure the server is running and accessible.'));
        } else if (error.code === 'ENOTFOUND') {
          console.log(chalk.red('DNS resolution failed. Please check your internet connection.'));
        } else if (error.code === 'ETIMEDOUT') {
          console.log(chalk.red('Connection timeout. Please try again.'));
        } else {
          console.log(chalk.red(`Network error: ${error.message}`));
        }
        
        return false;
      }
    } catch (error) {
      if (error.isTtyError) {
        console.error(chalk.red('Prompt could not be rendered in the current environment'));
      } else {
        console.error(chalk.red('Login error:'), error.message);
      }
      return false;
    }
  }

  /**
   * Save credentials securely to file
   */
  async saveCredentials(apiKey) {
    try {
      this.ensureConfigDir();
      const credentials = {
        apiKey: apiKey,
        timestamp: Date.now(),
        service: this.serviceName
      };
      const encrypted = this.encryptCredentials(credentials);
      fs.writeFileSync(this.credentialsFile, encrypted, { mode: 0o600 });
      console.log(chalk.green('✅ Credentials saved securely to local storage'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not save credentials:'), error.message);
      console.log(chalk.dim('You will need to login again next time'));
    }
  }

  /**
   * Clear stored credentials
   */
  async clearStoredCredentials() {
    try {
      if (fs.existsSync(this.credentialsFile)) {
        fs.unlinkSync(this.credentialsFile);
      }
    } catch (error) {
      // Ignore errors when clearing credentials
    }
  }

  /**
   * Logout and clear stored credentials
   */
  async logout() {
    await this.clearStoredCredentials();
    this.apiKey = null;
    this.userInfo = null;
    console.log(chalk.green('✅ Logged out successfully'));
  }

  /**
   * Get current API key
   */
  getApiKey() {
    return this.apiKey;
  }

  /**
   * Get current user info
   */
  getUserInfo() {
    return this.userInfo;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.apiKey;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = AuthManager;