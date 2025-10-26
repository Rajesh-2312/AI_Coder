import { useState, useEffect, useCallback } from 'react';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  modified?: string;
  extension?: string;
  children?: FileNode[];
  error?: string;
  note?: string;
}

interface FileContent {
  success: boolean;
  path: string;
  content: string;
  size: number;
  modified: string;
  hash: string;
  encoding: string;
  timestamp: string;
}

interface FileOperationResult {
  success: boolean;
  path: string;
  size?: number;
  modified?: string;
  hash?: string;
  backup?: string;
  timestamp: string;
}

interface FileSearchResult {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface FileSystemStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  lastModified: string;
}

export const useFileSystem = (backendUrl: string = 'http://localhost:3000') => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState<string>('.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FileSystemStats>({
    totalFiles: 0,
    totalDirectories: 0,
    totalSize: 0,
    lastModified: ''
  });

  // API base URL
  const apiUrl = `${backendUrl}/api/files`;

  // Generic API call function
  const apiCall = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      throw error;
    }
  }, [apiUrl]);

  // List files in directory
  const listFiles = useCallback(async (dir: string = '.') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall<{
        success: boolean;
        path: string;
        files: FileNode[];
        count: number;
        timestamp: string;
      }>(`/list?dir=${encodeURIComponent(dir)}`);
      
      setFileTree(result.files);
      setCurrentDirectory(result.path);
      
      // Update stats
      const fileCount = result.files.filter(f => f.type === 'file').length;
      const dirCount = result.files.filter(f => f.type === 'directory').length;
      const totalSize = result.files.reduce((sum, f) => sum + (f.size || 0), 0);
      
      setStats({
        totalFiles: fileCount,
        totalDirectories: dirCount,
        totalSize,
        lastModified: result.timestamp
      });
      
      return result;
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Read file content
  const readFile = useCallback(async (filePath: string): Promise<FileContent> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall<FileContent>(`/read?filePath=${encodeURIComponent(filePath)}`);
      return result;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Write file content
  const writeFile = useCallback(async (filePath: string, content: string): Promise<FileOperationResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall<FileOperationResult>('/write', {
        method: 'POST',
        body: JSON.stringify({ filePath, content })
      });
      
      // Refresh file tree after write
      await listFiles(currentDirectory);
      
      return result;
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, listFiles, currentDirectory]);

  // Delete file or directory
  const deleteFile = useCallback(async (filePath: string): Promise<FileOperationResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall<FileOperationResult>('/delete', {
        method: 'DELETE',
        body: JSON.stringify({ filePath })
      });
      
      // Refresh file tree after deletion
      await listFiles(currentDirectory);
      
      return result;
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, listFiles, currentDirectory]);

  // Rename file or directory
  const renameFile = useCallback(async (oldPath: string, newPath: string): Promise<FileOperationResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall<FileOperationResult>('/rename', {
        method: 'PUT',
        body: JSON.stringify({ oldPath, newPath })
      });
      
      // Refresh file tree after rename
      await listFiles(currentDirectory);
      
      return result;
    } catch (error) {
      console.error('Failed to rename file:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, listFiles, currentDirectory]);

  // Preview diff before applying changes
  const previewDiff = useCallback(async (filePath: string, newContent: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall<{
        success: boolean;
        path: string;
        fileExists: boolean;
        hasChanges: boolean;
        currentSize: number;
        newSize: number;
        currentHash: string | null;
        newHash: string;
        diff: string;
        linesAdded: number;
        linesRemoved: number;
        timestamp: string;
      }>('/diff', {
        method: 'POST',
        body: JSON.stringify({ filePath, newContent })
      });
      
      return result;
    } catch (error) {
      console.error('Failed to preview diff:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Get file information
  const getFileInfo = useCallback(async (filePath: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall<{
        success: boolean;
        path: string;
        type: 'file' | 'directory';
        size: number;
        created: string;
        modified: string;
        accessed: string;
        permissions: string;
        extension: string | null;
        timestamp: string;
      }>(`/info?filePath=${encodeURIComponent(filePath)}`);
      
      return result;
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Search files
  const searchFiles = useCallback(async (
    query: string,
    type: 'name' | 'content' = 'name',
    dir: string = '.'
  ): Promise<FileSearchResult[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall<{
        success: boolean;
        query: string;
        type: string;
        directory: string;
        results: FileSearchResult[];
        count: number;
        timestamp: string;
      }>(`/search?query=${encodeURIComponent(query)}&type=${type}&dir=${encodeURIComponent(dir)}`);
      
      return result.results;
    } catch (error) {
      console.error('Failed to search files:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Create new file
  const createFile = useCallback(async (filePath: string, content: string = '') => {
    return await writeFile(filePath, content);
  }, [writeFile]);

  // Create new directory (by creating a placeholder file)
  const createDirectory = useCallback(async (dirPath: string) => {
    const placeholderPath = `${dirPath}/.gitkeep`;
    return await writeFile(placeholderPath, '# Directory placeholder');
  }, [writeFile]);

  // Navigate to directory
  const navigateToDirectory = useCallback(async (dirPath: string) => {
    await listFiles(dirPath);
  }, [listFiles]);

  // Refresh current directory
  const refresh = useCallback(async () => {
    await listFiles(currentDirectory);
  }, [listFiles, currentDirectory]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load files on mount - disabled for new user experience
  // useEffect(() => {
  //   listFiles('.');
  // }, [listFiles]);

  return {
    // State
    fileTree,
    currentDirectory,
    isLoading,
    error,
    stats,
    
    // File operations
    listFiles,
    readFile,
    writeFile,
    deleteFile,
    renameFile,
    createFile,
    createDirectory,
    
    // Navigation
    navigateToDirectory,
    refresh,
    
    // Utilities
    previewDiff,
    getFileInfo,
    searchFiles,
    clearError,
    
    // Helpers
    getFileByPath: (path: string) => {
      const findFile = (nodes: FileNode[], targetPath: string): FileNode | null => {
        for (const node of nodes) {
          if (node.path === targetPath) return node;
          if (node.children) {
            const found = findFile(node.children, targetPath);
            if (found) return found;
          }
        }
        return null;
      };
      return findFile(fileTree, path);
    },
    
    getDirectoryContents: (dirPath: string) => {
      const dir = fileTree.find(node => node.path === dirPath);
      return dir?.children || [];
    }
  };
};

