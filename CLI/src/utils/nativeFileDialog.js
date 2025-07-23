const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { showError, showInfo } = require('./display');

const execAsync = promisify(exec);

/**
 * Open native file dialog using PowerShell on Windows
 * @param {string} initialDirectory - Initial directory to open
 * @returns {Promise<string|null>} - Selected file path or null if cancelled
 */
async function openNativeFileDialog(initialDirectory = process.cwd()) {
  try {
    showInfo('Opening file explorer...');
    
    // Create a temporary PowerShell script file
    const tempScriptPath = path.join(require('os').tmpdir(), 'ghostcdn-file-dialog.ps1');
    
    const powershellScript = `Add-Type -AssemblyName System.Windows.Forms
$openFileDialog = New-Object System.Windows.Forms.OpenFileDialog
$openFileDialog.InitialDirectory = "${initialDirectory.replace(/\\/g, '\\')}"
$openFileDialog.Filter = "All Files (*.*)|*.*"
$openFileDialog.Title = "Select a file to upload to GhostCDN"
$openFileDialog.Multiselect = $false

$result = $openFileDialog.ShowDialog()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $openFileDialog.FileName
} else {
    Write-Output "CANCELLED"
}`;
    
    // Write script to temp file
    fs.writeFileSync(tempScriptPath, powershellScript, 'utf8');
    
    try {
      // Execute PowerShell script
      const { stdout, stderr } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`, {
        timeout: 120000, // 2 minute timeout
        windowsHide: false // Show the dialog
      });
      
      // Clean up temp file
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
      
      if (stderr && stderr.trim()) {
        console.error('PowerShell stderr:', stderr);
        // Don't throw on stderr as some warnings are normal
      }
      
      const result = stdout.trim();
      
      if (result === 'CANCELLED' || !result) {
        return null;
      }
      
      // Validate the selected file exists
      if (!fs.existsSync(result)) {
        throw new Error('Selected file does not exist');
      }
      
      // Validate it's actually a file
      const stats = fs.statSync(result);
      if (!stats.isFile()) {
        throw new Error('Selected path is not a file');
      }
      
      return result;
      
    } catch (execError) {
      // Clean up temp file on error
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
      throw execError;
    }
    
  } catch (error) {
    showError(`Failed to open native file dialog: ${error.message}`);
    return null;
  }
}

/**
 * Check if native file dialog is supported on current platform
 * @returns {boolean} - True if supported
 */
function isNativeFileDialogSupported() {
  return process.platform === 'win32';
}

/**
 * Open native file dialog with fallback to manual input
 * @param {string} initialDirectory - Initial directory to open
 * @returns {Promise<string|null>} - Selected file path or null if cancelled
 */
async function openFileDialogWithFallback(initialDirectory = process.cwd()) {
  if (isNativeFileDialogSupported()) {
    const result = await openNativeFileDialog(initialDirectory);
    if (result) {
      return result;
    }
    // If native dialog failed or was cancelled, return null
    return null;
  } else {
    showError('Native file dialog not supported on this platform');
    return null;
  }
}

module.exports = {
  openNativeFileDialog,
  isNativeFileDialogSupported,
  openFileDialogWithFallback
};