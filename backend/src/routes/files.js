const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { AppError, validateRequest, rateLimit } = require('../middleware/errorHandler');
const Joi = require('joi');
const crypto = require('crypto');

const router = express.Router();

// File system security and validation utilities
class FileSystemSecurity {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    this.allowedExtensions = process.env.ALLOWED_EXTENSIONS?.split(',') || [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css', '.scss', '.sass',
      '.json', '.md', '.txt', '.xml', '.yaml', '.yml', '.sql', '.sh', '.bat',
      '.php', '.rb', '.go', '.rs', '.cpp', '.c', '.h', '.hpp', '.java', '.kt',
      '.swift', '.dart', '.r', '.m', '.pl', '.lua', '.vim', '.vimrc', '.gitignore',
      '.env', '.env.example', '.dockerfile', '.dockerignore', '.gitattributes'
    ];
    this.blockedExtensions = [
      '.exe', '.dll', '.so', '.dylib', '.bin', '.app', '.pkg', '.deb', '.rpm',
      '.msi', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso',
      '.img', '.dmg', '.vdi', '.vmdk', '.qcow2', '.ova', '.ovf'
    ];
    this.maxDirectoryDepth = 20;
    this.maxPathLength = 4096;
  }

  // Validate and sanitize file path
  validatePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new AppError('Invalid file path', 400);
    }

    // Normalize path and resolve relative paths
    const normalizedPath = path.normalize(filePath);
    
    // Check for path traversal attempts
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
      throw new AppError('Path traversal detected', 403);
    }

    // Check path length
    if (normalizedPath.length > this.maxPathLength) {
      throw new AppError('Path too long', 400);
    }

    // Resolve to absolute path within project root
    const absolutePath = path.resolve(this.projectRoot, normalizedPath);
    
    // Ensure the resolved path is within project root
    if (!absolutePath.startsWith(path.resolve(this.projectRoot))) {
      throw new AppError('Access denied: path outside project root', 403);
    }

    return {
      normalized: normalizedPath,
      absolute: absolutePath,
      relative: path.relative(this.projectRoot, absolutePath)
    };
  }

  // Validate file extension
  validateExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (this.blockedExtensions.includes(ext)) {
      throw new AppError(`File type '${ext}' is not allowed`, 403);
    }

    if (this.allowedExtensions.length > 0 && !this.allowedExtensions.includes(ext)) {
      throw new AppError(`File type '${ext}' is not in allowed list`, 403);
    }

    return ext;
  }

  // Validate file size
  validateFileSize(content) {
    if (typeof content === 'string') {
      const size = Buffer.byteLength(content, 'utf8');
      if (size > this.maxFileSize) {
        throw new AppError(`File size ${size} bytes exceeds maximum ${this.maxFileSize} bytes`, 413);
      }
    }
  }

  // Check directory depth
  validateDirectoryDepth(filePath) {
    const parts = filePath.split(path.sep).filter(part => part !== '');
    if (parts.length > this.maxDirectoryDepth) {
      throw new AppError('Directory depth exceeds maximum allowed', 400);
    }
  }

  // Generate file hash for integrity checking
  generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Check if path is a directory
  async isDirectory(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  // Check if path exists
  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get file stats safely
  async getStats(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new AppError('File or directory not found', 404);
      }
      throw new AppError(`Failed to get file stats: ${error.message}`, 500);
    }
  }
}

// File operations class
class FileOperations {
  constructor() {
    this.security = new FileSystemSecurity();
  }

  // List files recursively
  async listFiles(dir = '.') {
    try {
      const pathInfo = this.security.validatePath(dir);
      const absolutePath = pathInfo.absolute;

      // Check if directory exists
      if (!(await this.security.exists(absolutePath))) {
        throw new AppError('Directory not found', 404);
      }

      // Check if it's actually a directory
      if (!(await this.security.isDirectory(absolutePath))) {
        throw new AppError('Path is not a directory', 400);
      }

      const fileTree = await this.buildFileTree(absolutePath, pathInfo.relative);
      return {
        success: true,
        path: pathInfo.relative,
        files: fileTree,
        count: this.countFiles(fileTree),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to list files: ${error.message}`, 500);
    }
  }

  // Build file tree recursively
  async buildFileTree(dirPath, relativePath, depth = 0) {
    if (depth > this.security.maxDirectoryDepth) {
      return { name: path.basename(dirPath), type: 'directory', error: 'Max depth reached' };
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const tree = [];

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          // Skip hidden directories and node_modules
          if (entry.name.startsWith('.') && entry.name !== '.git') {
            continue;
          }
          if (entry.name === 'node_modules') {
            tree.push({
              name: entry.name,
              type: 'directory',
              path: entryRelativePath,
              children: [],
              note: 'Skipped for performance'
            });
            continue;
          }

          const children = await this.buildFileTree(entryPath, entryRelativePath, depth + 1);
          tree.push({
            name: entry.name,
            type: 'directory',
            path: entryRelativePath,
            children: Array.isArray(children) ? children : [children]
          });
        } else {
          // Validate file extension
          try {
            this.security.validateExtension(entry.name);
            
            const stats = await fs.stat(entryPath);
            tree.push({
              name: entry.name,
              type: 'file',
              path: entryRelativePath,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              extension: path.extname(entry.name)
            });
          } catch (extError) {
            // Skip files with blocked extensions
            continue;
          }
        }
      }

      return tree.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      return { name: path.basename(dirPath), type: 'directory', error: error.message };
    }
  }

  // Count files in tree
  countFiles(tree) {
    let count = 0;
    for (const item of tree) {
      if (item.type === 'file') {
        count++;
      } else if (item.type === 'directory' && item.children) {
        count += this.countFiles(item.children);
      }
    }
    return count;
  }

  // Read file content
  async readFile(filePath) {
    try {
      const pathInfo = this.security.validatePath(filePath);
      const absolutePath = pathInfo.absolute;

      // Check if file exists
      if (!(await this.security.exists(absolutePath))) {
        throw new AppError('File not found', 404);
      }

      // Check if it's actually a file
      if (await this.security.isDirectory(absolutePath)) {
        throw new AppError('Path is a directory, not a file', 400);
      }

      // Validate file extension
      this.security.validateExtension(filePath);

      const stats = await this.security.getStats(absolutePath);
      
      // Check file size before reading
      if (stats.size > this.security.maxFileSize) {
        throw new AppError(`File size ${stats.size} bytes exceeds maximum ${this.security.maxFileSize} bytes`, 413);
      }

      const content = await fs.readFile(absolutePath, 'utf8');
      const hash = this.security.generateHash(content);

      return {
        success: true,
        path: pathInfo.relative,
        content,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        hash,
        encoding: 'utf8',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to read file: ${error.message}`, 500);
    }
  }

  // Write file content
  async writeFile(filePath, content) {
    try {
      const pathInfo = this.security.validatePath(filePath);
      const absolutePath = pathInfo.absolute;

      // Validate file extension
      this.security.validateExtension(filePath);

      // Validate content
      if (typeof content !== 'string') {
        throw new AppError('Content must be a string', 400);
      }

      // Validate file size
      this.security.validateFileSize(content);

      // Check directory depth
      this.security.validateDirectoryDepth(filePath);

      // Ensure parent directory exists
      const parentDir = path.dirname(absolutePath);
      if (!(await this.security.exists(parentDir))) {
        await fs.mkdir(parentDir, { recursive: true });
      }

      // Check if target is a directory
      if (await this.security.isDirectory(absolutePath)) {
        throw new AppError('Cannot write to directory', 400);
      }

      // Create backup if file exists
      let backupPath = null;
      if (await this.security.exists(absolutePath)) {
        backupPath = `${absolutePath}.backup.${Date.now()}`;
        await fs.copyFile(absolutePath, backupPath);
      }

      // Write file
      await fs.writeFile(absolutePath, content, 'utf8');
      
      const stats = await this.security.getStats(absolutePath);
      const hash = this.security.generateHash(content);

      return {
        success: true,
        path: pathInfo.relative,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        hash,
        backup: backupPath ? path.relative(this.security.projectRoot, backupPath) : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to write file: ${error.message}`, 500);
    }
  }

  // Delete file or directory
  async deleteFile(filePath) {
    try {
      const pathInfo = this.security.validatePath(filePath);
      const absolutePath = pathInfo.absolute;

      // Check if path exists
      if (!(await this.security.exists(absolutePath))) {
        throw new AppError('File or directory not found', 404);
      }

      const stats = await this.security.getStats(absolutePath);
      
      // Additional safety checks
      if (stats.isDirectory()) {
        // Check if directory is empty
        const entries = await fs.readdir(absolutePath);
        if (entries.length > 0) {
          throw new AppError('Directory is not empty. Use recursive delete with caution.', 400);
        }
      }

      // Create backup before deletion
      const backupPath = `${absolutePath}.deleted.${Date.now()}`;
      if (stats.isDirectory()) {
        await fs.cp(absolutePath, backupPath, { recursive: true });
      } else {
        await fs.copyFile(absolutePath, backupPath);
      }

      // Delete the file/directory
      await fs.rm(absolutePath, { recursive: true, force: true });

      return {
        success: true,
        path: pathInfo.relative,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        backup: path.relative(this.security.projectRoot, backupPath),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to delete file: ${error.message}`, 500);
    }
  }

  // Rename file or directory
  async renameFile(oldPath, newPath) {
    try {
      const oldPathInfo = this.security.validatePath(oldPath);
      const newPathInfo = this.security.validatePath(newPath);
      
      const oldAbsolutePath = oldPathInfo.absolute;
      const newAbsolutePath = newPathInfo.absolute;

      // Check if source exists
      if (!(await this.security.exists(oldAbsolutePath))) {
        throw new AppError('Source file or directory not found', 404);
      }

      // Check if destination already exists
      if (await this.security.exists(newAbsolutePath)) {
        throw new AppError('Destination already exists', 409);
      }

      // Validate extensions for files
      const stats = await this.security.getStats(oldAbsolutePath);
      if (stats.isFile()) {
        this.security.validateExtension(newPath);
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(newAbsolutePath);
      if (!(await this.security.exists(parentDir))) {
        await fs.mkdir(parentDir, { recursive: true });
      }

      // Create backup
      const backupPath = `${oldAbsolutePath}.renamed.${Date.now()}`;
      if (stats.isDirectory()) {
        await fs.cp(oldAbsolutePath, backupPath, { recursive: true });
      } else {
        await fs.copyFile(oldAbsolutePath, backupPath);
      }

      // Rename
      await fs.rename(oldAbsolutePath, newAbsolutePath);

      return {
        success: true,
        oldPath: oldPathInfo.relative,
        newPath: newPathInfo.relative,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        backup: path.relative(this.security.projectRoot, backupPath),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to rename file: ${error.message}`, 500);
    }
  }

  // Preview diff between current and new content
  async previewDiff(filePath, newContent) {
    try {
      const pathInfo = this.security.validatePath(filePath);
      const absolutePath = pathInfo.absolute;

      // Validate new content
      if (typeof newContent !== 'string') {
        throw new AppError('New content must be a string', 400);
      }

      this.security.validateFileSize(newContent);

      let currentContent = '';
      let fileExists = false;

      // Read current content if file exists
      if (await this.security.exists(absolutePath)) {
        if (await this.security.isDirectory(absolutePath)) {
          throw new AppError('Cannot diff directory', 400);
        }
        
        this.security.validateExtension(filePath);
        const stats = await this.security.getStats(absolutePath);
        
        if (stats.size <= this.security.maxFileSize) {
          currentContent = await fs.readFile(absolutePath, 'utf8');
          fileExists = true;
        }
      }

      // Generate unified diff
      const diff = this.generateUnifiedDiff(
        filePath,
        currentContent,
        newContent,
        fileExists
      );

      const currentHash = fileExists ? this.security.generateHash(currentContent) : null;
      const newHash = this.security.generateHash(newContent);

      return {
        success: true,
        path: pathInfo.relative,
        fileExists,
        hasChanges: currentHash !== newHash,
        currentSize: currentContent.length,
        newSize: newContent.length,
        currentHash,
        newHash,
        diff,
        linesAdded: this.countDiffLines(diff, '+'),
        linesRemoved: this.countDiffLines(diff, '-'),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to generate diff: ${error.message}`, 500);
    }
  }

  // Generate unified diff
  generateUnifiedDiff(filePath, oldContent, newContent, fileExists) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const diff = [];
    diff.push(`--- ${fileExists ? filePath : '/dev/null'}`);
    diff.push(`+++ ${filePath}`);
    
    // Simple line-by-line diff
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine === newLine) {
        diff.push(` ${oldLine}`);
      } else {
        if (oldLine) {
          diff.push(`-${oldLine}`);
        }
        if (newLine) {
          diff.push(`+${newLine}`);
        }
      }
    }
    
    return diff.join('\n');
  }

  // Count diff lines
  countDiffLines(diff, prefix) {
    return diff.split('\n').filter(line => line.startsWith(prefix)).length;
  }
}

// Initialize file operations
const fileOps = new FileOperations();

// Validation schemas
const listFilesSchema = Joi.object({
  dir: Joi.string().optional().default('.')
});

const readFileSchema = Joi.object({
  filePath: Joi.string().required().min(1)
});

const writeFileSchema = Joi.object({
  filePath: Joi.string().required().min(1),
  content: Joi.string().required()
});

const deleteFileSchema = Joi.object({
  filePath: Joi.string().required().min(1)
});

const renameFileSchema = Joi.object({
  oldPath: Joi.string().required().min(1),
  newPath: Joi.string().required().min(1)
});

const previewDiffSchema = Joi.object({
  filePath: Joi.string().required().min(1),
  newContent: Joi.string().required()
});

// Routes

// GET /api/files/list - List files in directory
router.get('/list',
  rateLimit(30, 15 * 60 * 1000), // 30 requests per 15 minutes
  validateRequest(listFilesSchema),
  async (req, res, next) => {
    try {
      const { dir } = req.query;
      const result = await fileOps.listFiles(dir);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/files/read - Read file content
router.get('/read',
  rateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  validateRequest(readFileSchema),
  async (req, res, next) => {
    try {
      const { filePath } = req.query;
      const result = await fileOps.readFile(filePath);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/files/write - Write file content
router.post('/write',
  rateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  validateRequest(writeFileSchema),
  async (req, res, next) => {
    try {
      const { filePath, content } = req.body;
      const result = await fileOps.writeFile(filePath, content);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/files/delete - Delete file or directory
router.delete('/delete',
  rateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  validateRequest(deleteFileSchema),
  async (req, res, next) => {
    try {
      const { filePath } = req.body;
      const result = await fileOps.deleteFile(filePath);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/files/rename - Rename file or directory
router.put('/rename',
  rateLimit(15, 15 * 60 * 1000), // 15 requests per 15 minutes
  validateRequest(renameFileSchema),
  async (req, res, next) => {
    try {
      const { oldPath, newPath } = req.body;
      const result = await fileOps.renameFile(oldPath, newPath);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/files/diff - Preview diff before applying changes
router.post('/diff',
  rateLimit(25, 15 * 60 * 1000), // 25 requests per 15 minutes
  validateRequest(previewDiffSchema),
  async (req, res, next) => {
    try {
      const { filePath, newContent } = req.body;
      const result = await fileOps.previewDiff(filePath, newContent);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/files/info - Get file information
router.get('/info',
  rateLimit(40, 15 * 60 * 1000), // 40 requests per 15 minutes
  validateRequest(readFileSchema),
  async (req, res, next) => {
    try {
      const { filePath } = req.query;
      const pathInfo = fileOps.security.validatePath(filePath);
      const absolutePath = pathInfo.absolute;

      if (!(await fileOps.security.exists(absolutePath))) {
        throw new AppError('File or directory not found', 404);
      }

      const stats = await fileOps.security.getStats(absolutePath);
      
      res.json({
        success: true,
        path: pathInfo.relative,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
        permissions: stats.mode.toString(8),
        extension: stats.isFile() ? path.extname(filePath) : null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/files/search - Search files by name or content
router.get('/search',
  rateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  async (req, res, next) => {
    try {
      const { query, type = 'name', dir = '.' } = req.query;
      
      if (!query || query.length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400);
      }

      const pathInfo = fileOps.security.validatePath(dir);
      const absolutePath = pathInfo.absolute;

      if (!(await fileOps.security.exists(absolutePath))) {
        throw new AppError('Search directory not found', 404);
      }

      const results = await fileOps.searchFiles(absolutePath, query, type);
      
      res.json({
        success: true,
        query,
        type,
        directory: pathInfo.relative,
        results,
        count: results.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add search method to FileOperations
FileOperations.prototype.searchFiles = async function(dirPath, query, type) {
  const results = [];
  const searchRegex = new RegExp(query, 'i');
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      // Skip hidden files and directories
      if (entry.name.startsWith('.') && entry.name !== '.git') {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subResults = await this.searchFiles(entryPath, query, type);
        results.push(...subResults);
      } else if (entry.isFile()) {
        // Validate file extension
        try {
          this.security.validateExtension(entry.name);
        } catch {
          continue; // Skip blocked files
        }
        
        let matches = false;
        
        if (type === 'name') {
          matches = searchRegex.test(entry.name);
        } else if (type === 'content') {
          try {
            const stats = await fs.stat(entryPath);
            if (stats.size <= this.security.maxFileSize) {
              const content = await fs.readFile(entryPath, 'utf8');
              matches = searchRegex.test(content);
            }
          } catch {
            // Skip files that can't be read
            continue;
          }
        }
        
        if (matches) {
          const relativePath = path.relative(this.security.projectRoot, entryPath);
          results.push({
            name: entry.name,
            path: relativePath,
            size: (await fs.stat(entryPath)).size,
            modified: (await fs.stat(entryPath)).mtime.toISOString()
          });
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be accessed
  }
  
  return results;
};

module.exports = router;

