#!/usr/bin/env node

/**
 * Simple test script to verify CLI functionality
 * This script tests the basic components without requiring full authentication
 */

const chalk = require('chalk');
const path = require('path');

console.log(chalk.cyan.bold('🧪 Testing GhostCDN CLI Components\n'));

// Test 1: Check if all required modules can be loaded
console.log(chalk.yellow('1. Testing module imports...'));

try {
  const constants = require('./src/config/constants');
  const display = require('./src/utils/display');
  const AuthManager = require('./src/auth/AuthManager');
  const UploadManager = require('./src/features/UploadManager');
  const MainMenu = require('./src/ui/MainMenu');
  
  console.log(chalk.green('   ✓ All modules loaded successfully'));
} catch (error) {
  console.log(chalk.red('   ✗ Module loading failed:'), error.message);
  process.exit(1);
}

// Test 2: Check constants configuration
console.log(chalk.yellow('2. Testing configuration...'));

try {
  const { API_BASE_URL, MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } = require('./src/config/constants');
  
  if (!API_BASE_URL) throw new Error('API_BASE_URL not configured');
  if (!MAX_FILE_SIZE) throw new Error('MAX_FILE_SIZE not configured');
  if (!Array.isArray(SUPPORTED_FILE_TYPES)) throw new Error('SUPPORTED_FILE_TYPES not configured');
  
  console.log(chalk.green('   ✓ Configuration valid'));
  console.log(chalk.dim(`   API URL: ${API_BASE_URL}`));
  console.log(chalk.dim(`   Max file size: ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)}MB`));
  console.log(chalk.dim(`   Supported types: ${SUPPORTED_FILE_TYPES.length} types`));
} catch (error) {
  console.log(chalk.red('   ✗ Configuration test failed:'), error.message);
  process.exit(1);
}

// Test 3: Test display utilities
console.log(chalk.yellow('3. Testing display utilities...'));

try {
  const { showSuccess, showError, showInfo, formatBytes } = require('./src/utils/display');
  
  // Test formatting functions
  const testSize = formatBytes(1024 * 1024 * 5.5); // 5.5MB
  if (!testSize.includes('MB')) throw new Error('formatBytes not working correctly');
  
  console.log(chalk.green('   ✓ Display utilities working'));
  console.log(chalk.dim(`   Test format: ${testSize}`));
} catch (error) {
  console.log(chalk.red('   ✗ Display utilities test failed:'), error.message);
  process.exit(1);
}

// Test 4: Test AuthManager initialization
console.log(chalk.yellow('4. Testing AuthManager initialization...'));

try {
  const AuthManager = require('./src/auth/AuthManager');
  const authManager = new AuthManager();
  
  if (typeof authManager.checkAuthentication !== 'function') {
    throw new Error('AuthManager missing required methods');
  }
  
  console.log(chalk.green('   ✓ AuthManager initialized successfully'));
} catch (error) {
  console.log(chalk.red('   ✗ AuthManager test failed:'), error.message);
  process.exit(1);
}

// Test 5: Test UploadManager initialization
console.log(chalk.yellow('5. Testing UploadManager initialization...'));

try {
  const AuthManager = require('./src/auth/AuthManager');
  const UploadManager = require('./src/features/UploadManager');
  
  const authManager = new AuthManager();
  const uploadManager = new UploadManager(authManager);
  
  if (typeof uploadManager.handleUpload !== 'function') {
    throw new Error('UploadManager missing required methods');
  }
  
  console.log(chalk.green('   ✓ UploadManager initialized successfully'));
} catch (error) {
  console.log(chalk.red('   ✗ UploadManager test failed:'), error.message);
  process.exit(1);
}

// Test 6: Test MainMenu initialization
console.log(chalk.yellow('6. Testing MainMenu initialization...'));

try {
  const AuthManager = require('./src/auth/AuthManager');
  const MainMenu = require('./src/ui/MainMenu');
  
  const authManager = new AuthManager();
  const mainMenu = new MainMenu(authManager);
  
  if (typeof mainMenu.show !== 'function') {
    throw new Error('MainMenu missing required methods');
  }
  
  console.log(chalk.green('   ✓ MainMenu initialized successfully'));
} catch (error) {
  console.log(chalk.red('   ✗ MainMenu test failed:'), error.message);
  process.exit(1);
}

// Test 7: Check package.json
console.log(chalk.yellow('7. Testing package configuration...'));

try {
  const packageJson = require('./package.json');
  
  if (!packageJson.name) throw new Error('Package name missing');
  if (!packageJson.version) throw new Error('Package version missing');
  if (!packageJson.bin) throw new Error('Binary configuration missing');
  if (!packageJson.dependencies) throw new Error('Dependencies missing');
  
  console.log(chalk.green('   ✓ Package configuration valid'));
  console.log(chalk.dim(`   Name: ${packageJson.name}`));
  console.log(chalk.dim(`   Version: ${packageJson.version}`));
  console.log(chalk.dim(`   Dependencies: ${Object.keys(packageJson.dependencies).length}`));
} catch (error) {
  console.log(chalk.red('   ✗ Package configuration test failed:'), error.message);
  process.exit(1);
}

// All tests passed
console.log(chalk.green.bold('\n🎉 All tests passed! CLI is ready to use.\n'));

console.log(chalk.cyan('Next steps:'));
console.log(chalk.dim('1. Install dependencies: npm install'));
console.log(chalk.dim('2. Start the CLI: npm start'));
console.log(chalk.dim('3. Or build executables: npm run build:all'));

console.log(chalk.yellow('\nNote: Full functionality requires:'));
console.log(chalk.dim('- GhostCDN backend server running'));
console.log(chalk.dim('- Valid API key for authentication'));
console.log(chalk.dim('- Internet connection for uploads'));

console.log();