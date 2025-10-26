const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// Import the file operations (assuming they're in the same directory)
const { FileOperations, FileSystemSecurity } = require('./files');

/**
 * Test file demonstrating secure file system CRUD operations
 */

async function testFileOperations() {
  console.log('🧪 Testing Secure File System Operations...\n');

  const fileOps = new FileOperations();

  // Test 1: List files
  console.log('1️⃣ Testing List Files...');
  try {
    const result = await fileOps.listFiles('.');
    console.log('Success:', result.success);
    console.log('Path:', result.path);
    console.log('File count:', result.count);
    console.log('Files:', result.files.slice(0, 3).map(f => f.name)); // Show first 3 files
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 2: Write file
  console.log('2️⃣ Testing Write File...');
  try {
    const testContent = `// Test file created by AI-Coder
console.log('Hello, World!');

function testFunction() {
  return 'This is a test function';
}

module.exports = { testFunction };`;

    const result = await fileOps.writeFile('test-file.js', testContent);
    console.log('Success:', result.success);
    console.log('Path:', result.path);
    console.log('Size:', result.size, 'bytes');
    console.log('Hash:', result.hash.substring(0, 16) + '...');
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 3: Read file
  console.log('3️⃣ Testing Read File...');
  try {
    const result = await fileOps.readFile('test-file.js');
    console.log('Success:', result.success);
    console.log('Path:', result.path);
    console.log('Size:', result.size, 'bytes');
    console.log('Content preview:', result.content.substring(0, 100) + '...');
    console.log('Hash:', result.hash.substring(0, 16) + '...');
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 4: Preview diff
  console.log('4️⃣ Testing Preview Diff...');
  try {
    const newContent = `// Test file created by AI-Coder - UPDATED
console.log('Hello, Updated World!');

function testFunction() {
  return 'This is an updated test function';
}

function newFunction() {
  return 'This is a new function';
}

module.exports = { testFunction, newFunction };`;

    const result = await fileOps.previewDiff('test-file.js', newContent);
    console.log('Success:', result.success);
    console.log('File exists:', result.fileExists);
    console.log('Has changes:', result.hasChanges);
    console.log('Lines added:', result.linesAdded);
    console.log('Lines removed:', result.linesRemoved);
    console.log('Diff preview:');
    console.log(result.diff.split('\n').slice(0, 10).join('\n')); // Show first 10 lines
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 5: Rename file
  console.log('5️⃣ Testing Rename File...');
  try {
    const result = await fileOps.renameFile('test-file.js', 'renamed-test-file.js');
    console.log('Success:', result.success);
    console.log('Old path:', result.oldPath);
    console.log('New path:', result.newPath);
    console.log('Type:', result.type);
    console.log('Backup:', result.backup);
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 6: Create directory
  console.log('6️⃣ Testing Create Directory...');
  try {
    const result = await fileOps.writeFile('test-directory/test-file.txt', 'Test content');
    console.log('Success:', result.success);
    console.log('Path:', result.path);
    console.log('Directory created automatically');
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 7: List files in directory
  console.log('7️⃣ Testing List Files in Directory...');
  try {
    const result = await fileOps.listFiles('test-directory');
    console.log('Success:', result.success);
    console.log('Path:', result.path);
    console.log('Files:', result.files.map(f => f.name));
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 8: Search files
  console.log('8️⃣ Testing Search Files...');
  try {
    const result = await fileOps.searchFiles('.', 'test', 'name');
    console.log('Search results:', result.length);
    result.slice(0, 3).forEach(file => {
      console.log(`- ${file.name} (${file.path})`);
    });
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 9: Security tests
  console.log('9️⃣ Testing Security Features...');
  
  // Test path traversal
  try {
    await fileOps.readFile('../../../etc/passwd');
    console.log('❌ Path traversal not blocked!');
  } catch (error) {
    console.log('✅ Path traversal blocked:', error.message);
  }

  // Test blocked file extension
  try {
    await fileOps.writeFile('test.exe', 'malicious content');
    console.log('❌ Blocked extension not prevented!');
  } catch (error) {
    console.log('✅ Blocked extension prevented:', error.message);
  }

  // Test file size limit
  try {
    const largeContent = 'x'.repeat(20 * 1024 * 1024); // 20MB
    await fileOps.writeFile('large-file.txt', largeContent);
    console.log('❌ File size limit not enforced!');
  } catch (error) {
    console.log('✅ File size limit enforced:', error.message);
  }

  console.log('');

  // Test 10: Cleanup
  console.log('10️⃣ Testing Cleanup...');
  try {
    // Delete test files
    await fileOps.deleteFile('renamed-test-file.js');
    await fileOps.deleteFile('test-directory/test-file.txt');
    await fileOps.deleteFile('test-directory');
    console.log('✅ Test files cleaned up successfully');
    console.log('');
  } catch (error) {
    console.error('Cleanup error:', error.message);
    console.log('');
  }

  console.log('✅ All tests completed!');
}

// Example usage functions
function exampleUsage() {
  console.log('📚 Secure File System Usage Examples:\n');

  // Example 1: List files
  console.log('Example 1: List Files');
  console.log(`
const fileOps = new FileOperations();

// List files in current directory
const result = await fileOps.listFiles('.');
console.log('Files:', result.files);

// List files in specific directory
const subdirResult = await fileOps.listFiles('src/components');
console.log('Components:', subdirResult.files);
`);

  // Example 2: Read file
  console.log('Example 2: Read File');
  console.log(`
// Read file content
const fileContent = await fileOps.readFile('src/App.js');
console.log('Content:', fileContent.content);
console.log('Size:', fileContent.size);
console.log('Hash:', fileContent.hash);
`);

  // Example 3: Write file
  console.log('Example 3: Write File');
  console.log(`
// Write new file
const newContent = \`import React from 'react';

function NewComponent() {
  return <div>Hello World</div>;
}

export default NewComponent;\`;

const result = await fileOps.writeFile('src/NewComponent.jsx', newContent);
console.log('File created:', result.path);
console.log('Backup:', result.backup);
`);

  // Example 4: Preview diff
  console.log('Example 4: Preview Diff');
  console.log(`
// Preview changes before applying
const diffResult = await fileOps.previewDiff('src/App.js', newContent);
console.log('Has changes:', diffResult.hasChanges);
console.log('Lines added:', diffResult.linesAdded);
console.log('Lines removed:', diffResult.linesRemoved);
console.log('Diff:', diffResult.diff);
`);

  // Example 5: Rename file
  console.log('Example 5: Rename File');
  console.log(`
// Rename file
const renameResult = await fileOps.renameFile('old-name.js', 'new-name.js');
console.log('Renamed from:', renameResult.oldPath);
console.log('Renamed to:', renameResult.newPath);
console.log('Backup created:', renameResult.backup);
`);

  // Example 6: Delete file
  console.log('Example 6: Delete File');
  console.log(`
// Delete file (with backup)
const deleteResult = await fileOps.deleteFile('unwanted-file.js');
console.log('Deleted:', deleteResult.path);
console.log('Backup:', deleteResult.backup);
`);

  // Example 7: Search files
  console.log('Example 7: Search Files');
  console.log(`
// Search by name
const nameResults = await fileOps.searchFiles('.', 'component', 'name');
console.log('Files with "component" in name:', nameResults);

// Search by content
const contentResults = await fileOps.searchFiles('.', 'useState', 'content');
console.log('Files containing "useState":', contentResults);
`);

  // Example 8: Security features
  console.log('Example 8: Security Features');
  console.log(`
// Path traversal protection
try {
  await fileOps.readFile('../../../etc/passwd');
} catch (error) {
  console.log('Blocked:', error.message); // "Path traversal detected"
}

// File type validation
try {
  await fileOps.writeFile('malware.exe', 'malicious content');
} catch (error) {
  console.log('Blocked:', error.message); // "File type '.exe' is not allowed"
}

// File size limits
try {
  const hugeContent = 'x'.repeat(100 * 1024 * 1024); // 100MB
  await fileOps.writeFile('huge.txt', hugeContent);
} catch (error) {
  console.log('Blocked:', error.message); // "File size exceeds maximum"
}
`);

  console.log('');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testFileOperations().catch(console.error);
}

module.exports = {
  testFileOperations,
  exampleUsage
};

