#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
const platformArg = args.find(arg => arg.startsWith('--platform='));
const targetPlatform = platformArg ? platformArg.split('=')[1] : os.platform();

// Configuration
const config = {
  entryPoint: 'src/index.js',
  outputDir: 'dist',
  appName: 'ghostcdn-cli'
};

// Platform-specific settings
const platformConfig = {
  win32: { ext: '.exe', nodeUrl: 'https://nodejs.org/dist/v21.6.2/node-v21.6.2-win-x64.exe' },
  darwin: { ext: '', nodeUrl: 'https://nodejs.org/dist/v21.6.2/node-v21.6.2-darwin-x64.tar.gz' },
  linux: { ext: '', nodeUrl: 'https://nodejs.org/dist/v21.6.2/node-v21.6.2-linux-x64.tar.xz' }
};

function log(message) {
  console.log(`[BUILD] ${message}`);
}

function createSeaConfig() {
  const seaConfig = {
    main: config.entryPoint,
    output: path.join(config.outputDir, 'sea-prep.blob'),
    disableExperimentalSEAWarning: true
  };
  
  fs.writeFileSync('sea-config.json', JSON.stringify(seaConfig, null, 2));
  log('Created sea-config.json');
}

function buildExecutable() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    log(`Building for platform: ${targetPlatform}`);
    
    // Create SEA configuration
    createSeaConfig();
    
    // Generate the blob to be injected
    log('Generating application blob...');
    execSync('node --experimental-sea-config sea-config.json', { stdio: 'inherit' });
    
    // Get platform config
    const platform = platformConfig[targetPlatform];
    if (!platform) {
      throw new Error(`Unsupported platform: ${targetPlatform}`);
    }
    
    // Copy node executable
    const nodeExecutable = process.execPath;
    const outputName = `${config.appName}${platform.ext}`;
    const outputPath = path.join(config.outputDir, outputName);
    
    log(`Copying Node.js executable to ${outputPath}...`);
    fs.copyFileSync(nodeExecutable, outputPath);
    
    // Inject the blob
    log('Injecting application blob...');
    const blobPath = path.join(config.outputDir, 'sea-prep.blob');
    
    if (targetPlatform === 'win32') {
      // Windows: Use postject
      try {
        execSync(`npx postject ${outputPath} NODE_SEA_BLOB ${blobPath} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, { stdio: 'inherit' });
      } catch (error) {
        log('Installing postject and retrying...');
        execSync('npm install -g postject', { stdio: 'inherit' });
        execSync(`npx postject ${outputPath} NODE_SEA_BLOB ${blobPath} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, { stdio: 'inherit' });
      }
    } else {
      // Unix-like systems: Use postject
      try {
        execSync(`npx postject ${outputPath} NODE_SEA_BLOB ${blobPath} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`, { stdio: 'inherit' });
      } catch (error) {
        log('Installing postject and retrying...');
        execSync('npm install -g postject', { stdio: 'inherit' });
        execSync(`npx postject ${outputPath} NODE_SEA_BLOB ${blobPath} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`, { stdio: 'inherit' });
      }
    }
    
    // Make executable on Unix-like systems
    if (targetPlatform !== 'win32') {
      fs.chmodSync(outputPath, '755');
    }
    
    // Clean up temporary files
    fs.unlinkSync('sea-config.json');
    fs.unlinkSync(blobPath);
    
    log(`✅ Successfully built: ${outputPath}`);
    
    // Generate checksum
    const crypto = require('crypto');
    const fileBuffer = fs.readFileSync(outputPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    
    const checksumPath = `${outputPath}.sha256`;
    fs.writeFileSync(checksumPath, `${hex}  ${outputName}\n`);
    log(`✅ Generated checksum: ${checksumPath}`);
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 21) {
  console.error('❌ Node.js 21 or higher is required for Single Executable Applications');
  console.error(`   Current version: ${nodeVersion}`);
  console.error('   Please upgrade Node.js to continue.');
  process.exit(1);
}

log('Starting Single Executable Application build...');
buildExecutable();