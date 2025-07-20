const chalk = require('chalk');
const figlet = require('figlet');

/**
 * Clear the terminal screen
 */
function clearScreen() {
  process.stdout.write('\x1Bc');
}

/**
 * Show welcome banner
 */
function showWelcome() {
  const title = figlet.textSync('GhostCDN', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  });

  // Simple banner without boxen
  console.log('');
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.cyan(title));
  console.log('');
  console.log(chalk.white('           Professional File Upload CLI'));
  console.log(chalk.dim('           Secure • Fast • Reliable'));
  console.log('');
  console.log(chalk.yellow('           Version 1.0.0') + ' | ' + chalk.blue('https://ghostcdn.xyz'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log('');
}

/**
 * Show loading spinner with custom text
 */
function showSpinner(text = 'Loading...') {
  const ora = require('ora');
  return ora({
    text: chalk.cyan(text),
    spinner: 'dots',
    color: 'cyan'
  });
}

/**
 * Format file size to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date to readable format
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  console.log(chalk.green('✅ ' + message));
}

/**
 * Show error message
 */
function showError(message) {
  console.log(chalk.red('❌ ' + message));
}

/**
 * Show warning message
 */
function showWarning(message) {
  console.log(chalk.yellow('⚠️  ' + message));
}

/**
 * Show info message
 */
function showInfo(message) {
  console.log(chalk.blue('ℹ️  ' + message));
}

/**
 * Create a separator line
 */
function showSeparator(char = '─', length = 50) {
  console.log(chalk.dim(char.repeat(length)));
}

/**
 * Show a simple boxed message (without boxen)
 */
function showBox(message, options = {}) {
  const lines = message.split('\n');
  const maxLength = Math.max(...lines.map(line => line.length));
  const width = maxLength + 4;
  
  console.log('');
  console.log(chalk.cyan('┌' + '─'.repeat(width - 2) + '┐'));
  
  lines.forEach(line => {
    const padding = ' '.repeat(maxLength - line.length);
    console.log(chalk.cyan('│ ') + line + padding + chalk.cyan(' │'));
  });
  
  console.log(chalk.cyan('└' + '─'.repeat(width - 2) + '┘'));
  console.log('');
}

/**
 * Show progress bar
 */
function createProgressBar(total, options = {}) {
  // Simple progress implementation without cli-progress
  let current = 0;
  
  return {
    start: (total, value) => {
      current = value || 0;
    },
    update: (value) => {
      current = value;
      const percentage = Math.round((current / total) * 100);
      const barLength = 30;
      const filledLength = Math.round((percentage / 100) * barLength);
      const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      
      process.stdout.write(`\r${chalk.cyan(bar)} ${percentage}% (${current}/${total})`);
    },
    stop: () => {
      console.log('');
    }
  };
}

/**
 * Show file type icon
 */
function getFileTypeIcon(mimeType) {
  const iconMap = {
    // Images
    'image/jpeg': '🖼️',
    'image/jpg': '🖼️',
    'image/png': '🖼️',
    'image/gif': '🎞️',
    'image/webp': '🖼️',
    'image/svg+xml': '🎨',
    
    // Documents
    'application/pdf': '📄',
    'text/plain': '📝',
    'application/json': '📋',
    'text/csv': '📊',
    
    // Archives
    'application/zip': '📦',
    'application/x-rar-compressed': '📦',
    'application/x-7z-compressed': '📦',
    
    // Media
    'video/mp4': '🎬',
    'video/avi': '🎬',
    'video/mov': '🎬',
    'audio/mp3': '🎵',
    'audio/wav': '🎵',
    'audio/ogg': '🎵',
    
    // Code
    'text/javascript': '📜',
    'text/css': '🎨',
    'text/html': '🌐',
    'application/javascript': '📜'
  };

  return iconMap[mimeType] || '📄';
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength = 50) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Center text in terminal
 */
function centerText(text, width = process.stdout.columns) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Show simple table with data (without cli-table3)
 */
function showTable(headers, rows, options = {}) {
  // Simple table implementation
  const colWidths = headers.map((header, i) => {
    const maxContentWidth = Math.max(...rows.map(row => String(row[i] || '').length));
    return Math.max(header.length, maxContentWidth) + 2;
  });
  
  // Header
  const headerRow = headers.map((header, i) => 
    chalk.cyan(header.padEnd(colWidths[i]))
  ).join('│');
  
  console.log('┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐');
  console.log('│' + headerRow + '│');
  console.log('├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤');
  
  // Rows
  rows.forEach(row => {
    const rowStr = row.map((cell, i) => 
      String(cell || '').padEnd(colWidths[i])
    ).join('│');
    console.log('│' + rowStr + '│');
  });
  
  console.log('└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘');
}

/**
 * Show key-value pairs in a formatted way
 */
function showKeyValue(data, options = {}) {
  const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));
  
  Object.entries(data).forEach(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyLength);
    console.log(chalk.dim(paddedKey + ':'), chalk.white(value));
  });
}

/**
 * Show confirmation prompt
 */
async function showConfirmation(message, defaultValue = false) {
  const inquirer = require('inquirer');
  
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: message,
      default: defaultValue
    }
  ]);

  return answer.confirmed;
}

/**
 * Show input prompt
 */
async function showInput(message, options = {}) {
  const inquirer = require('inquirer');
  
  const defaultOptions = {
    type: 'input',
    name: 'value',
    message: message
  };

  const promptOptions = { ...defaultOptions, ...options };
  const answer = await inquirer.prompt([promptOptions]);

  return answer.value;
}

module.exports = {
  clearScreen,
  showWelcome,
  showSpinner,
  formatBytes,
  formatDate,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showSeparator,
  showBox,
  createProgressBar,
  getFileTypeIcon,
  truncateText,
  centerText,
  showTable,
  showKeyValue,
  showConfirmation,
  showInput
};