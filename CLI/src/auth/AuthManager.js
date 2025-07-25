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
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      const jsonString = JSON.stringify(data);
      let encrypted = cipher.update(jsonString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        algorithm
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
      
      // Handle proper encryption with IV
      if (encryptedData.iv && encryptedData.encrypted) {
        const crypto = require('crypto');
        const algorithm = encryptedData.algorithm || 'aes-256-cbc';
        
        const machineId = require('os').hostname() + require('os').platform() + require('os').arch();
        const key = crypto.scryptSync(machineId, 'ghostcdn-salt', 32);
        const iv = Buffer.from(encryptedData.iv, 'hex');
        
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
      }
      
      // Handle legacy encryption without IV (for backward compatibility)
      const crypto = require('crypto');
      const algorithm = 'aes-256-cbc';
      
      const machineId = require('os').hostname() + require('os').platform() + require('os').arch();
      const key = crypto.scryptSync(machineId, 'ghostcdn-salt', 32);
      
      const decipher = crypto.createDecipher(algorithm, key);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      // Log decryption errors for debugging
      if (process.env.DEBUG || process.argv.includes('--debug')) {
        console.error(chalk.dim(`Decryption error: ${error.message}`));
      }
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

      const fileContent = fs.readFileSync(this.credentialsFile, 'utf8');
      
      // Parse JSON string to get encrypted data object
      let encryptedData;
      try {
        encryptedData = JSON.parse(fileContent);
      } catch (parseError) {
        // Handle legacy format (direct string)
        encryptedData = fileContent;
      }
      
      const credentials = this.decryptCredentials(encryptedData);
      
      if (credentials && credentials.apiKey) {
        return credentials.apiKey;
      }
      return null;
    } catch (error) {
      console.error('Error reading stored credentials:', error.message);
      
      // Log more details for debugging
      if (process.env.DEBUG || process.argv.includes('--debug')) {
        console.error(chalk.dim(`Credentials file: ${this.credentialsFile}`));
        console.error(chalk.dim(`Error stack: ${error.stack}`));
      }
      
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

      // Simple readline implementation to replace inquirer
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const askQuestion = (question) => {
        return new Promise((resolve) => {
          rl.question(question, (answer) => {
            resolve(answer);
          });
        });
      };
      
      const askPassword = (question) => {
        return new Promise((resolve, reject) => {
          let userInput = '';
          let dataHandler = null;
          
          try {
            process.stdout.write(question);
            
            // Store original stdin state
            const originalRawMode = process.stdin.isRaw;
            const originalResumed = process.stdin.readableFlowing !== null;
            
            process.stdin.setRawMode(true);
            process.stdin.resume();
            
            dataHandler = function(char) {
              try {
                char = char.toString();
                
                switch (char) {
                  case '\n':
                  case '\r':
                  case '\u0004': // Ctrl+D
                    cleanup();
                    resolve(userInput);
                    break;
                  case '\u0003': // Ctrl+C
                    cleanup();
                    process.exit(0);
                    break;
                  case '\u001b': // ESC
                    cleanup();
                    reject(new Error('Input cancelled'));
                    break;
                  default:
                    if (char.charCodeAt(0) === 8 || char.charCodeAt(0) === 127) {
                      // Backspace or Delete
                      if (userInput.length > 0) {
                        userInput = userInput.slice(0, -1);
                        process.stdout.write('\b \b');
                      }
                    } else if (char.charCodeAt(0) >= 32) {
                      // Printable characters only
                      userInput += char;
                      process.stdout.write('*');
                    }
                    break;
                }
              } catch (error) {
                cleanup();
                reject(error);
              }
            };
            
            const cleanup = () => {
              try {
                if (dataHandler) {
                  process.stdin.removeListener('data', dataHandler);
                  dataHandler = null;
                }
                
                // Restore original stdin state
                if (originalRawMode !== undefined) {
                  process.stdin.setRawMode(originalRawMode);
                }
                
                if (!originalResumed) {
                  process.stdin.pause();
                }
                
                process.stdout.write('\n');
              } catch (error) {
                // Ignore cleanup errors
              }
            };
            
            process.stdin.on('data', dataHandler);
            
            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
              cleanup();
              reject(new Error('Input timeout'));
            }, 300000); // 5 minutes
            
            // Clear timeout when resolved
            const originalResolve = resolve;
            const originalReject = reject;
            
            resolve = (value) => {
              clearTimeout(timeout);
              originalResolve(value);
            };
            
            reject = (error) => {
              clearTimeout(timeout);
              originalReject(error);
            };
            
          } catch (error) {
            if (dataHandler) {
              process.stdin.removeListener('data', dataHandler);
            }
            reject(error);
          }
        });
      };
      
      let apiKey;
      while (true) {
        try {
          apiKey = await askPassword('API Key: ');
          
          if (!apiKey || apiKey.trim().length === 0) {
            console.log(chalk.red('API key is required'));
            continue;
          }
          if (!apiKey.startsWith('gcdn_')) {
            console.log(chalk.red('Invalid API key format. API keys should start with "gcdn_"'));
            continue;
          }
          if (apiKey.length < 20) {
            console.log(chalk.red('API key appears to be too short'));
            continue;
          }
          break;
        } catch (error) {
          if (error.message === 'Input cancelled') {
            console.log(chalk.yellow('\nLogin cancelled by user'));
            return false;
          } else if (error.message === 'Input timeout') {
            console.log(chalk.red('\nInput timeout. Please try again.'));
            return false;
          } else {
            console.log(chalk.red(`\nInput error: ${error.message}`));
            return false;
          }
        }
      }
      
      const saveResponse = await askQuestion('Save credentials securely for future use? (Y/n): ');
      const saveCredentials = saveResponse.toLowerCase().trim() === '' || saveResponse.toLowerCase().trim() === 'y' || saveResponse.toLowerCase().trim() === 'yes';
      
      rl.close();
      
      const answers = {
        apiKey: apiKey,
        saveCredentials: saveCredentials
      };

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
      
      // Convert encrypted object to JSON string for file storage
      const dataToWrite = JSON.stringify(encrypted);
      
      fs.writeFileSync(this.credentialsFile, dataToWrite, { 
        mode: 0o600,
        encoding: 'utf8'
      });
      
      console.log(chalk.green('✅ Credentials saved securely to local storage'));
      console.log(chalk.dim(`Saved to: ${this.credentialsFile}`));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not save credentials:'), error.message);
      console.log(chalk.dim('You will need to login again next time'));
      
      // Log more details for debugging
      if (process.env.DEBUG || process.argv.includes('--debug')) {
        console.log(chalk.dim(`Config dir: ${this.configDir}`));
        console.log(chalk.dim(`Credentials file: ${this.credentialsFile}`));
        console.log(chalk.dim(`Error stack: ${error.stack}`));
      }
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