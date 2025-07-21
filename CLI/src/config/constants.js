const path = require('path');
const os = require('os');

// API Configuration - Use environment variable or default to production
const API_BASE_URL = process.env.GHOSTCDN_API_URL || 'https://q1.api.ghostcdn.xyz/api/v1';
const WEB_DASHBOARD_URL = process.env.GHOSTCDN_WEB_URL || 'https://ghostcdn.xyz';
const DOCS_URL = process.env.GHOSTCDN_DOCS_URL || 'https://ghostcdn.xyz/docs';

// Application Configuration
const SERVICE_NAME = 'GhostCDN CLI';
const APP_NAME = 'ghostcdn-cli';

// File Configuration
const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB for CLI uploads
const SUPPORTED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'text/plain', 'application/json', 'text/csv',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  // Media
  'video/mp4', 'video/avi', 'video/mov', 'audio/mp3', 'audio/wav', 'audio/ogg',
  // Code
  'text/javascript', 'text/css', 'text/html', 'application/javascript'
];

// UI Configuration
const COLORS = {
  primary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  muted: '#6B7280'
};

// Paths
const CONFIG_DIR = path.join(os.homedir(), '.ghostcdn');
const CACHE_DIR = path.join(CONFIG_DIR, 'cache');
const LOG_DIR = path.join(CONFIG_DIR, 'logs');

// Simplified Menu Options (Upload-focused)
const MAIN_MENU_OPTIONS = [
  {
    name: '📤 Upload File',
    value: 'upload',
    description: 'Select and upload a file to GhostCDN'
  },
  {
    name: '🌐 Web Dashboard',
    value: 'dashboard',
    description: 'Open web dashboard for file management'
  },
  {
    name: '📚 Documentation',
    value: 'docs',
    description: 'View API documentation and guides'
  },
  {
    name: '🚪 Exit',
    value: 'exit',
    description: 'Exit the application'
  }
];

// Upload Options
const UPLOAD_OPTIONS = {
  preserveFilename: true,
  optimize: true,
  generateThumbnails: true,
  isPublic: false
};

// Pagination
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Timeouts
const API_TIMEOUT = 60000; // 60 seconds for API calls
const UPLOAD_TIMEOUT = 3600000; // 60 minutes for large file uploads

// Error Messages
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please check your internet connection.',
  AUTH_FAILED: 'Authentication failed. Please check your API key.',
  FILE_NOT_FOUND: 'The specified file could not be found.',
  FILE_TOO_LARGE: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB.`,
  UNSUPPORTED_FILE_TYPE: 'This file type is not supported.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  DELETE_FAILED: 'File deletion failed. Please try again.',
  INVALID_API_KEY: 'Invalid API key format or expired key.',
  CONNECTION_REFUSED: 'Cannot connect to GhostCDN server. Please ensure the server is running.'
};

// Success Messages
const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: 'File uploaded successfully!',
  DELETE_SUCCESS: 'File deleted successfully!',
  AUTH_SUCCESS: 'Authentication successful!',
  LOGOUT_SUCCESS: 'Logged out successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!'
};

// CLI Help Text
const HELP_TEXT = {
  DESCRIPTION: 'Simple CLI tool for uploading files to GhostCDN - Use web dashboard for file management',
  USAGE: 'ghostcdn [options]',
  OPTIONS: [
    { flag: '-h, --help', description: 'Show help information' },
    { flag: '-v, --version', description: 'Show version number' },
    { flag: '--logout', description: 'Logout and clear stored credentials' },
    { flag: '--config', description: 'Show configuration information' },
    { flag: '--debug', description: 'Enable debug mode' }
  ]
};

module.exports = {
  API_BASE_URL,
  WEB_DASHBOARD_URL,
  DOCS_URL,
  SERVICE_NAME,
  APP_NAME,
  MAX_FILE_SIZE,
  SUPPORTED_FILE_TYPES,
  COLORS,
  CONFIG_DIR,
  CACHE_DIR,
  LOG_DIR,
  MAIN_MENU_OPTIONS,
  UPLOAD_OPTIONS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  API_TIMEOUT,
  UPLOAD_TIMEOUT,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HELP_TEXT
};