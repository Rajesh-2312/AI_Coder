# Secure File System CRUD Operations

A comprehensive and secure file system operations module for the AI-Coder backend, providing safe CRUD operations with advanced security measures and structured error handling.

## Features

### 🔒 Security Features
- **Path Traversal Protection**: Prevents directory traversal attacks
- **File Type Validation**: Whitelist/blacklist file extensions
- **File Size Limits**: Configurable maximum file sizes
- **Directory Depth Limits**: Prevents deep directory structures
- **Project Root Restriction**: All operations restricted to project root
- **Backup Creation**: Automatic backups before destructive operations

### 📁 File Operations
- **List Files**: Recursive directory listing with file tree
- **Read Files**: Safe file content reading with validation
- **Write Files**: Secure file writing with backup creation
- **Delete Files**: Safe deletion with backup preservation
- **Rename Files**: File/directory renaming with validation
- **Preview Diff**: Unified diff generation before changes
- **Search Files**: Name and content-based file search
- **File Info**: Comprehensive file metadata retrieval

### 🛡️ Advanced Security
- **Input Validation**: Comprehensive input sanitization
- **Error Handling**: Structured JSON error responses
- **Rate Limiting**: Per-endpoint rate limiting
- **Hash Generation**: SHA-256 integrity checking
- **Permission Validation**: File system permission checks
- **Resource Limits**: Memory and CPU usage protection

## API Reference

### File Operations

#### listFiles(dir)
List files and directories recursively.

**Parameters:**
- `dir` (string): Directory path (default: '.')

**Returns:**
```javascript
{
  success: boolean,
  path: string,
  files: Array<{
    name: string,
    type: 'file' | 'directory',
    path: string,
    size?: number,
    modified?: string,
    extension?: string,
    children?: Array<FileNode>
  }>,
  count: number,
  timestamp: string
}
```

#### readFile(filePath)
Read file content safely.

**Parameters:**
- `filePath` (string): Path to the file

**Returns:**
```javascript
{
  success: boolean,
  path: string,
  content: string,
  size: number,
  modified: string,
  hash: string,
  encoding: string,
  timestamp: string
}
```

#### writeFile(filePath, content)
Write file content with backup.

**Parameters:**
- `filePath` (string): Path to the file
- `content` (string): File content

**Returns:**
```javascript
{
  success: boolean,
  path: string,
  size: number,
  modified: string,
  hash: string,
  backup: string | null,
  timestamp: string
}
```

#### deleteFile(filePath)
Delete file or directory safely.

**Parameters:**
- `filePath` (string): Path to delete

**Returns:**
```javascript
{
  success: boolean,
  path: string,
  type: 'file' | 'directory',
  size: number,
  backup: string,
  timestamp: string
}
```

#### renameFile(oldPath, newPath)
Rename file or directory.

**Parameters:**
- `oldPath` (string): Current path
- `newPath` (string): New path

**Returns:**
```javascript
{
  success: boolean,
  oldPath: string,
  newPath: string,
  type: 'file' | 'directory',
  size: number,
  backup: string,
  timestamp: string
}
```

#### previewDiff(filePath, newContent)
Generate unified diff before applying changes.

**Parameters:**
- `filePath` (string): Path to the file
- `newContent` (string): New content to compare

**Returns:**
```javascript
{
  success: boolean,
  path: string,
  fileExists: boolean,
  hasChanges: boolean,
  currentSize: number,
  newSize: number,
  currentHash: string | null,
  newHash: string,
  diff: string,
  linesAdded: number,
  linesRemoved: number,
  timestamp: string
}
```

## REST API Endpoints

### GET /api/files/list
List files in directory.

**Query Parameters:**
- `dir` (optional): Directory path (default: '.')

**Response:**
```json
{
  "success": true,
  "path": "src/components",
  "files": [
    {
      "name": "Header.jsx",
      "type": "file",
      "path": "src/components/Header.jsx",
      "size": 1024,
      "modified": "2024-01-01T00:00:00.000Z",
      "extension": ".jsx"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/files/read
Read file content.

**Query Parameters:**
- `filePath`: Path to the file

**Response:**
```json
{
  "success": true,
  "path": "src/App.js",
  "content": "import React from 'react';\n\nfunction App() {\n  return <div>Hello World</div>;\n}\n\nexport default App;",
  "size": 1024,
  "modified": "2024-01-01T00:00:00.000Z",
  "hash": "a1b2c3d4e5f6...",
  "encoding": "utf8",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/files/write
Write file content.

**Request Body:**
```json
{
  "filePath": "src/NewComponent.jsx",
  "content": "import React from 'react';\n\nfunction NewComponent() {\n  return <div>New Component</div>;\n}\n\nexport default NewComponent;"
}
```

**Response:**
```json
{
  "success": true,
  "path": "src/NewComponent.jsx",
  "size": 1024,
  "modified": "2024-01-01T00:00:00.000Z",
  "hash": "a1b2c3d4e5f6...",
  "backup": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### DELETE /api/files/delete
Delete file or directory.

**Request Body:**
```json
{
  "filePath": "src/OldComponent.jsx"
}
```

**Response:**
```json
{
  "success": true,
  "path": "src/OldComponent.jsx",
  "type": "file",
  "size": 1024,
  "backup": "src/OldComponent.jsx.deleted.1704067200000",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### PUT /api/files/rename
Rename file or directory.

**Request Body:**
```json
{
  "oldPath": "src/OldName.jsx",
  "newPath": "src/NewName.jsx"
}
```

**Response:**
```json
{
  "success": true,
  "oldPath": "src/OldName.jsx",
  "newPath": "src/NewName.jsx",
  "type": "file",
  "size": 1024,
  "backup": "src/OldName.jsx.renamed.1704067200000",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/files/diff
Preview diff before applying changes.

**Request Body:**
```json
{
  "filePath": "src/App.js",
  "newContent": "import React from 'react';\n\nfunction App() {\n  return <div>Updated App</div>;\n}\n\nexport default App;"
}
```

**Response:**
```json
{
  "success": true,
  "path": "src/App.js",
  "fileExists": true,
  "hasChanges": true,
  "currentSize": 100,
  "newSize": 120,
  "currentHash": "old-hash...",
  "newHash": "new-hash...",
  "diff": "--- src/App.js\n+++ src/App.js\n@@ -1,3 +1,3 @@\n import React from 'react';\n \n-function App() {\n-  return <div>Hello World</div>;\n+function App() {\n+  return <div>Updated App</div>;\n }\n \n export default App;",
  "linesAdded": 1,
  "linesRemoved": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/files/info
Get file information.

**Query Parameters:**
- `filePath`: Path to the file

**Response:**
```json
{
  "success": true,
  "path": "src/App.js",
  "type": "file",
  "size": 1024,
  "created": "2024-01-01T00:00:00.000Z",
  "modified": "2024-01-01T00:00:00.000Z",
  "accessed": "2024-01-01T00:00:00.000Z",
  "permissions": "644",
  "extension": ".js",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/files/search
Search files by name or content.

**Query Parameters:**
- `query`: Search query (minimum 2 characters)
- `type`: Search type ('name' or 'content', default: 'name')
- `dir`: Directory to search in (default: '.')

**Response:**
```json
{
  "success": true,
  "query": "component",
  "type": "name",
  "directory": "src",
  "results": [
    {
      "name": "Component.jsx",
      "path": "src/Component.jsx",
      "size": 1024,
      "modified": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Configuration

### Environment Variables

```bash
# Project root directory
PROJECT_ROOT=/path/to/project

# Maximum file size (bytes)
MAX_FILE_SIZE=10485760  # 10MB

# Allowed file extensions (comma-separated)
ALLOWED_EXTENSIONS=.js,.ts,.jsx,.tsx,.py,.html,.css,.json,.md,.txt

# Maximum directory depth
MAX_DIRECTORY_DEPTH=20

# Maximum path length
MAX_PATH_LENGTH=4096
```

### File Type Restrictions

#### Allowed Extensions (Default)
- **Web**: `.js`, `.ts`, `.jsx`, `.tsx`, `.html`, `.css`, `.scss`, `.sass`
- **Data**: `.json`, `.xml`, `.yaml`, `.yml`, `.sql`
- **Scripts**: `.sh`, `.bat`, `.py`, `.php`, `.rb`
- **Config**: `.env`, `.gitignore`, `.dockerfile`, `.dockerignore`
- **Documentation**: `.md`, `.txt`

#### Blocked Extensions
- **Executables**: `.exe`, `.dll`, `.so`, `.dylib`, `.bin`, `.app`
- **Archives**: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2`, `.xz`
- **Images**: `.iso`, `.img`, `.dmg`, `.vdi`, `.vmdk`
- **Packages**: `.pkg`, `.deb`, `.rpm`, `.msi`

## Usage Examples

### Basic File Operations

```javascript
const fileOps = new FileOperations();

// List files
const files = await fileOps.listFiles('src/components');
console.log('Files:', files.files);

// Read file
const content = await fileOps.readFile('src/App.js');
console.log('Content:', content.content);

// Write file
const result = await fileOps.writeFile('src/NewComponent.jsx', `
import React from 'react';

function NewComponent() {
  return <div>Hello World</div>;
}

export default NewComponent;
`);
console.log('File created:', result.path);
```

### Advanced Operations

```javascript
// Preview changes
const diff = await fileOps.previewDiff('src/App.js', newContent);
if (diff.hasChanges) {
  console.log('Changes:', diff.linesAdded, 'added,', diff.linesRemoved, 'removed');
  console.log('Diff:', diff.diff);
}

// Rename file
const renameResult = await fileOps.renameFile('old-name.js', 'new-name.js');
console.log('Renamed:', renameResult.oldPath, '->', renameResult.newPath);

// Search files
const searchResults = await fileOps.searchFiles('.', 'component', 'name');
console.log('Found files:', searchResults);
```

### Error Handling

```javascript
try {
  await fileOps.readFile('../../../etc/passwd');
} catch (error) {
  if (error instanceof AppError) {
    console.log('Error:', error.message);
    console.log('Status:', error.statusCode);
  }
}
```

## Error Responses

All errors are returned in structured JSON format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/files/read"
}
```

### Common Error Types

- **400 Bad Request**: Invalid input parameters
- **403 Forbidden**: Security violation (path traversal, blocked file type)
- **404 Not Found**: File or directory not found
- **409 Conflict**: Destination already exists
- **413 Payload Too Large**: File size exceeds limit
- **500 Internal Server Error**: Unexpected server error

## Testing

Run the test suite to verify functionality:

```bash
# JavaScript
node src/routes/testFiles.js

# TypeScript
npx tsx src/routes/testFiles.ts
```

## Performance Considerations

### Optimization Tips

1. **File Size Limits**: Set appropriate limits for your use case
2. **Directory Depth**: Limit recursion depth for large projects
3. **Extension Filtering**: Use allowed extensions to skip unnecessary files
4. **Caching**: Consider caching file metadata for frequently accessed files
5. **Batch Operations**: Group multiple operations when possible

### Resource Management

- **Memory Usage**: Large files are loaded into memory
- **Disk I/O**: File operations are synchronous
- **Backup Storage**: Backups consume additional disk space
- **Rate Limiting**: Prevents resource exhaustion

## Security Best Practices

### Input Validation
- Always validate file paths
- Sanitize user input
- Check file extensions
- Validate file sizes

### Access Control
- Restrict operations to project root
- Implement proper authentication
- Use rate limiting
- Monitor suspicious activity

### Data Protection
- Create backups before destructive operations
- Use secure file permissions
- Implement audit logging
- Regular security reviews

## Troubleshooting

### Common Issues

1. **Path Traversal Errors**
   - Ensure paths are relative to project root
   - Check for `..` sequences in paths
   - Validate path normalization

2. **File Size Errors**
   - Check `MAX_FILE_SIZE` configuration
   - Verify file content size
   - Consider streaming for large files

3. **Permission Errors**
   - Check file system permissions
   - Ensure project root is accessible
   - Verify backup directory permissions

4. **Extension Errors**
   - Update `ALLOWED_EXTENSIONS` configuration
   - Check file extension validation
   - Review blocked extensions list

### Debug Mode

Enable debug logging:

```bash
DEBUG=files:* node server.js
```

## Contributing

1. Follow security best practices
2. Add comprehensive tests
3. Update documentation
4. Consider performance implications
5. Test with various file types and sizes

## License

MIT License - see LICENSE file for details

