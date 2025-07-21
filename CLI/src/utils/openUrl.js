const chalk = require('chalk');
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