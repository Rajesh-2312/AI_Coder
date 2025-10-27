import { Agent, FileOperationResult } from './types'
import * as fs from 'fs/promises'
import * as path from 'path'

export class FileAgent implements Agent {
  private workspaceRoot: string

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot
  }

  /**
   * Execute file operations
   */
  async execute(action: string, payload: any): Promise<string> {
    console.log(`File Agent executing: ${action}`, payload)

    switch (action) {
      case 'create':
        return await this.createFile(payload.path, payload.content)
      case 'read':
        return await this.readFile(payload.path)
      case 'update':
        return await this.updateFile(payload.path, payload.content)
      case 'delete':
        return await this.deleteFile(payload.path)
      case 'list':
        return await this.listFiles(payload.path || '.')
      default:
        return `Unknown file action: ${action}`
    }
  }

  /**
   * Create a new file
   */
  private async createFile(filePath: string, content: string): Promise<string> {
    try {
      const fullPath = this.getFullPath(filePath)
      const dir = path.dirname(fullPath)

      // Create directory if it doesn't exist
      await fs.mkdir(dir, { recursive: true })

      // Create file
      await fs.writeFile(fullPath, content, 'utf8')

      console.log(`✓ File created: ${filePath}`)
      return `File created successfully: ${filePath}`
    } catch (error) {
      console.error(`✗ Failed to create file: ${error}`)
      return `Failed to create file: ${error}`
    }
  }

  /**
   * Read file content
   */
  private async readFile(filePath: string): Promise<string> {
    try {
      const fullPath = this.getFullPath(filePath)
      const content = await fs.readFile(fullPath, 'utf8')
      
      console.log(`✓ File read: ${filePath}`)
      return `File content (${filePath}):\n\n${content}`
    } catch (error) {
      console.error(`✗ Failed to read file: ${error}`)
      return `Failed to read file: ${error}`
    }
  }

  /**
   * Update existing file
   */
  private async updateFile(filePath: string, content: string): Promise<string> {
    try {
      const fullPath = this.getFullPath(filePath)
      
      // Check if file exists
      try {
        await fs.access(fullPath)
      } catch {
        return `File does not exist: ${filePath}. Use create action instead.`
      }

      await fs.writeFile(fullPath, content, 'utf8')
      
      console.log(`✓ File updated: ${filePath}`)
      return `File updated successfully: ${filePath}`
    } catch (error) {
      console.error(`✗ Failed to update file: ${error}`)
      return `Failed to update file: ${error}`
    }
  }

  /**
   * Delete file
   */
  private async deleteFile(filePath: string): Promise<string> {
    try {
      const fullPath = this.getFullPath(filePath)
      await fs.unlink(fullPath)
      
      console.log(`✓ File deleted: ${filePath}`)
      return `File deleted successfully: ${filePath}`
    } catch (error) {
      console.error(`✗ Failed to delete file: ${error}`)
      return `Failed to delete file: ${error}`
    }
  }

  /**
   * List files in directory
   */
  private async listFiles(dirPath: string): Promise<string> {
    try {
      const fullPath = this.getFullPath(dirPath)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      
      const files = entries
        .filter(e => e.isFile())
        .map(e => e.name)
      
      const directories = entries
        .filter(e => e.isDirectory())
        .map(e => e.name)
      
      console.log(`✓ Listed files in: ${dirPath}`)
      return `Files in ${dirPath}:\n\nDirectories:\n${directories.join('\n')}\n\nFiles:\n${files.join('\n')}`
    } catch (error) {
      console.error(`✗ Failed to list files: ${error}`)
      return `Failed to list files: ${error}`
    }
  }

  /**
   * Get full path from relative path
   */
  private getFullPath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath
    }
    return path.join(this.workspaceRoot, relativePath)
  }
}

