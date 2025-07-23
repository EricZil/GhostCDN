// Simple color functions to replace chalk
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`
};
const chalk = colors;

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
  // Simple text banner without figlet
  const banner = `
 ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗ ██████╗██████╗ ███╗   ██╗
██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗  ██║
██║  ███╗███████║██║   ██║███████╗   ██║   ██║     ██║  ██║██╔██╗ ██║
██║   ██║██╔══██║██║   ██║╚════██║   ██║   ██║     ██║  ██║██║╚██╗██║
╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ╚██████╗██████╔╝██║ ╚████║
 ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝    ╚═════╝╚═════╝ ╚═╝  ╚═══╝
  `;

  // Simple banner without boxen
  console.log('');
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.cyan(banner));
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
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let interval;
  
  return {
    start: () => {
      process.stdout.write(`${frames[0]} ${chalk.cyan(text)}`);
      interval = setInterval(() => {
        process.stdout.write(`\r${frames[i]} ${chalk.cyan(text)}`);
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
  // Enhanced progress implementation for large file uploads
  let current = 0;
  let isFirstUpdate = true;
  
  return {
    start: (total, value) => {
      current = value || 0;
      isFirstUpdate = true;
    },
    update: (progress, data = {}) => {
      // Support both old format (value) and new format (progress, data)
      if (typeof progress === 'number' && progress <= 1) {
        // New format: progress is 0-1, data contains additional info
        const percentage = Math.round(progress * 100);
        const barLength = 40;
        const filledLength = Math.round(progress * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        let statusLine = `${chalk.cyan(bar)} ${percentage}%`;
        
        if (data.filename) {
          statusLine += ` | ${chalk.white(data.filename)}`;
        }
        if (data.uploaded && data.total) {
          statusLine += ` | ${chalk.green(data.uploaded)}/${chalk.blue(data.total)}`;
        }
        if (data.speed) {
          statusLine += ` | ${chalk.yellow(data.speed)}`;
        }
        if (data.eta) {
          statusLine += ` | ETA: ${chalk.magenta(data.eta)}`;
        }
        
        // Use Node.js built-in methods for reliable cursor control
        if (!isFirstUpdate) {
          process.stdout.clearLine(0); // Clear the current line
          process.stdout.cursorTo(0);  // Move cursor to beginning of line
        }
        process.stdout.write(statusLine);
        isFirstUpdate = false;
      } else {
        // Old format: progress is current value
        current = progress;
        const percentage = Math.round((current / total) * 100);
        const barLength = 30;
        const filledLength = Math.round((percentage / 100) * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        const statusLine = `${chalk.cyan(bar)} ${percentage}% (${current}/${total})`;
        
        // Use Node.js built-in methods for reliable cursor control
        if (!isFirstUpdate) {
          process.stdout.clearLine(0); // Clear the current line
          process.stdout.cursorTo(0);  // Move cursor to beginning of line
        }
        process.stdout.write(statusLine);
        isFirstUpdate = false;
      }
    },
    stop: () => {
      // Clear the progress line and move to next line
      if (!isFirstUpdate) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }
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
  const readline = require('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    const defaultText = defaultValue ? ' (Y/n)' : ' (y/N)';
    rl.question(message + defaultText + ': ', (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      if (normalized === '') {
        resolve(defaultValue);
      } else {
        resolve(normalized === 'y' || normalized === 'yes');
      }
    });
  });
}

/**
 * Show input prompt
 */
async function showInput(message, options = {}) {
  const readline = require('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    const promptText = options.default ? `${message} (${options.default}): ` : `${message}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || options.default || '');
    });
  });
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