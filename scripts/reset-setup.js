#!/usr/bin/env node

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Reset setup script for AI-Coder
 * This script removes setup flags and model files to force a fresh setup
 */

function getUserDataPath() {
  // In development, use a test directory
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'test-user-data');
  }
  
  // In production, use the actual user data path
  const os = require('os');
  const platform = process.platform;
  
  switch (platform) {
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'AI-Coder');
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'AI-Coder');
    case 'linux':
      return path.join(os.homedir(), '.config', 'AI-Coder');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function resetSetup() {
  try {
    const userDataPath = getUserDataPath();
    const setupFlagPath = path.join(userDataPath, 'setup-complete.flag');
    const modelDir = path.join(userDataPath, 'model');
    const modelPath = path.join(modelDir, 'qwen2.5-coder-lite.gguf');
    
    console.log('Resetting AI-Coder setup...');
    console.log(`User data path: ${userDataPath}`);
    
    // Remove setup flag
    if (fs.existsSync(setupFlagPath)) {
      fs.unlinkSync(setupFlagPath);
      console.log('✓ Removed setup flag');
    } else {
      console.log('- Setup flag not found');
    }
    
    // Remove model file
    if (fs.existsSync(modelPath)) {
      fs.unlinkSync(modelPath);
      console.log('✓ Removed model file');
    } else {
      console.log('- Model file not found');
    }
    
    // Remove model directory if empty
    if (fs.existsSync(modelDir)) {
      try {
        fs.rmdirSync(modelDir);
        console.log('✓ Removed model directory');
      } catch (error) {
        console.log('- Model directory not empty, keeping it');
      }
    }
    
    console.log('\nSetup reset completed successfully!');
    console.log('Next time you launch AI-Coder, it will perform the setup process again.');
    
  } catch (error) {
    console.error('Error resetting setup:', error.message);
    process.exit(1);
  }
}

// Run the reset if this script is executed directly
if (require.main === module) {
  resetSetup();
}

module.exports = { resetSetup, getUserDataPath };
