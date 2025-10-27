import express from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const filePathSchema = Joi.object({
  filePath: Joi.string().required().min(1).max(1000)
});

const fileContentSchema = Joi.object({
  filePath: Joi.string().required().min(1).max(1000),
  content: Joi.string().required().max(1000000) // 1MB max
});

const searchSchema = Joi.object({
  query: Joi.string().required().min(1).max(100),
  directory: Joi.string().optional().default('.'),
  extensions: Joi.array().items(Joi.string()).optional()
});

// Security: Validate file path
function validateFilePath(filePath: string): string {
    // Normalize path and resolve relative paths
    const normalizedPath = path.normalize(filePath);
    
  // Prevent directory traversal
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
    throw new Error('Invalid file path');
  }
  
  return normalizedPath;
}

// GET /api/files/list - List files and directories
router.get('/list', async (req, res) => {
  try {
    const { directory = '.' } = req.query;
    const normalizedDir = validateFilePath(directory as string);
    
    // Resolve absolute path from project root
    const absoluteDir = path.join(process.cwd(), normalizedDir);
    const files = await listFiles(absoluteDir);
    return res.json({ files });
  } catch (error: any) {
    console.error('List files error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/files/read - Read file content
router.get('/read', async (req, res) => {
  try {
    const { error, value } = filePathSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { filePath } = value;
    const normalizedPath = validateFilePath(filePath);
    
    // Resolve absolute path from project root
    const absolutePath = path.join(process.cwd(), normalizedPath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    return res.json({ content, filePath: normalizedPath });
  } catch (error: any) {
    console.error('Read file error:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// POST /api/files/write - Write file content
router.post('/write', async (req, res) => {
  try {
    const { error, value } = fileContentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { filePath, content } = value;
    console.log(`📝 Writing file: ${filePath} (${content?.length || 0} bytes)`);
    
    // Determine final path BEFORE normalizing
    // Convert backslashes to forward slashes for consistent handling
    let cleanPath = filePath.replace(/\\/g, '/');
    let finalPath = cleanPath;
    
    // ALWAYS ensure path is under frontend/ for project files
    // If path starts with 'src/' or 'components/' or is just a filename
    // prepend 'frontend/src/' if not already under frontend
    if (!cleanPath.startsWith('frontend/')) {
      if (cleanPath.startsWith('src/')) {
        finalPath = 'frontend/' + cleanPath;
      } else if (cleanPath.startsWith('components/')) {
        finalPath = 'frontend/src/' + cleanPath;
      } else if (!cleanPath.includes('frontend') && !cleanPath.includes('backend')) {
        // Generic filename - assume it's for frontend/src/
        finalPath = 'frontend/src/' + cleanPath;
      }
    }
    
    // Now normalize the path
    const normalizedPath = path.normalize(finalPath);
    
    // Ensure directory exists
    const dir = path.dirname(finalPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write to file (absolute path based on project root)
    const absolutePath = path.join(process.cwd(), finalPath);
    await fs.writeFile(absolutePath, content, 'utf-8');
    console.log(`✅ File written successfully: ${absolutePath}`);
    return res.json({ success: true, filePath: finalPath });
    } catch (error: any) {
    console.error('❌ Write file error:', error);
    return res.status(500).json({ error: 'Failed to write file' });
  }
});

// POST /api/files/create - Create file (alias for write)
router.post('/create', async (req, res) => {
  try {
    const { error, value } = fileContentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { filePath, content } = value;
    const normalizedPath = validateFilePath(filePath);
    
    // Ensure directory exists
    const dir = path.dirname(normalizedPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(normalizedPath, content, 'utf-8');
    return res.json({ success: true, filePath: normalizedPath });
    } catch (error: any) {
    console.error('Create file error:', error);
    return res.status(500).json({ error: 'Failed to create file' });
  }
});

// DELETE /api/files/delete - Delete file
router.delete('/delete', async (req, res) => {
  try {
    const { error, value } = filePathSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { filePath } = value;
    const normalizedPath = validateFilePath(filePath);
    
    await fs.unlink(normalizedPath);
    return res.json({ success: true, filePath: normalizedPath });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return res.status(404).json({ error: 'File not found' });
  }
});

// POST /api/files/search - Search files
router.post('/search', async (req, res) => {
  try {
    const { error, value } = searchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { query, directory, extensions } = value;
    const normalizedDir = validateFilePath(directory);
    
    const results = await searchFiles(normalizedDir, query, extensions);
    return res.json({ results });
  } catch (error: any) {
    console.error('Search files error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Helper function to list files recursively
async function listFiles(directory: string): Promise<any[]> {
  try {
    const items = await fs.readdir(directory, { withFileTypes: true });
    const files: any[] = [];

    // Directories to exclude
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.nyc_output'];
    
    for (const item of items) {
      // Skip excluded directories
      if (item.isDirectory() && excludeDirs.includes(item.name)) {
        continue;
      }
      
      // Skip hidden files and directories
      if (item.name.startsWith('.')) {
        continue;
      }
      
      // Skip backup files
      if (item.name.includes('.backup.') || item.name.endsWith('.backup')) {
        continue;
      }

      const fullPath = path.join(directory, item.name);
      const relativePath = path.relative('.', fullPath);

      if (item.isDirectory()) {
        files.push({
          name: item.name,
          path: relativePath,
          type: 'folder',
          children: await listFiles(fullPath)
        });
      } else {
        files.push({
          name: item.name,
          path: relativePath,
          type: 'file',
          extension: path.extname(item.name)
        });
      }
    }

    return files;
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

// Helper function to search files
async function searchFiles(directory: string, query: string, extensions?: string[]): Promise<any[]> {
  try {
    const items = await fs.readdir(directory, { withFileTypes: true });
    const results: any[] = [];

    for (const item of items) {
      const fullPath = path.join(directory, item.name);
      
      if (item.isDirectory()) {
        // Recursively search subdirectories
        const subResults = await searchFiles(fullPath, query, extensions);
        results.push(...subResults);
      } else {
        // Check if file matches search criteria
        const matchesName = item.name.toLowerCase().includes(query.toLowerCase());
        const matchesExtension = !extensions || extensions.includes(path.extname(item.name));
        
        if (matchesName && matchesExtension) {
            results.push({
            name: item.name,
            path: path.relative('.', fullPath),
            type: 'file'
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error searching files:', error);
    return [];
  }
}

export default router;