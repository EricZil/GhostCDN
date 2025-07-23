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
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Safely open URL in browser using native OS commands
 */
async function openUrl(url, description = 'URL') {
  try {
    let command;
    
    // Determine the appropriate command based on the platform
    switch (process.platform) {
      case 'win32':
        command = `start "" "${url}"`;
        break;
      case 'darwin':
        command = `open "${url}"`;
        break;
      case 'linux':
        command = `xdg-open "${url}"`;
        break;
      default:
        throw new Error('Unsupported platform');
    }
    
    await execAsync(command);
    return true;
  } catch (error) {
    // If opening fails, show the URL instead
    console.log(chalk.yellow(`Could not open ${description} automatically.`));
    console.log(chalk.blue(`Please visit: ${url}`));
    return false;
  }
}

module.exports = { openUrl };