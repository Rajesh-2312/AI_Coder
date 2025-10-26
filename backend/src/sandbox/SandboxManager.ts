import { spawn, ChildProcess } from 'child_process'
import { AgentStatus } from '../agents/WebSocketAgent'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface ExecutionResult {
  success: boolean
  output: string
  error: string
  exitCode: number
  executionTime: number
  command: string
  timestamp: Date
}

export interface ExecutionOptions {
  timeout?: number
  workingDirectory?: string
  environment?: Record<string, string>
  allowedCommands?: string[]
  maxOutputLength?: number
}

export class SandboxManager {
  private status: AgentStatus
  private activeProcesses: Map<string, ChildProcess> = new Map()
  private sandboxDir: string
  private maxConcurrentProcesses: number = 5

  constructor() {
    this.status = {
      name: 'SandboxManager',
      status: 'active',
      lastActivity: new Date(),
      connections: 0
    }
    
    // Create sandbox directory
    this.sandboxDir = path.join(process.cwd(), 'sandbox', 'temp')
    this.ensureSandboxDirectory()
  }

  private ensureSandboxDirectory(): void {
    if (!fs.existsSync(this.sandboxDir)) {
      fs.mkdirSync(this.sandboxDir, { recursive: true })
    }
  }

  async executeCommand(command: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    this.status.lastActivity = new Date()
    
    const startTime = Date.now()
    const executionId = uuidv4()
    
    try {
      // Validate command
      if (!this.isCommandAllowed(command, options.allowedCommands)) {
        throw new Error('Command not allowed in sandbox environment')
      }

      // Check concurrent process limit
      if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
        throw new Error('Maximum concurrent processes reached')
      }

      // Parse command and arguments
      const [cmd, ...args] = command.split(' ')
      
      // Set up execution options
      const execOptions = {
        cwd: options.workingDirectory || this.sandboxDir,
        env: { ...process.env, ...options.environment },
        timeout: options.timeout || 30000 // 30 seconds default
      }

      // Execute command
      const process = spawn(cmd, args, execOptions)
      this.activeProcesses.set(executionId, process)

      let output = ''
      let error = ''

      // Capture stdout
      process.stdout?.on('data', (data) => {
        output += data.toString()
      })

      // Capture stderr
      process.stderr?.on('data', (data) => {
        error += data.toString()
      })

      // Wait for process completion
      const exitCode = await new Promise<number>((resolve, reject) => {
        process.on('close', (code) => {
          this.activeProcesses.delete(executionId)
          resolve(code || 0)
        })

        process.on('error', (err) => {
          this.activeProcesses.delete(executionId)
          reject(err)
        })

        // Handle timeout
        if (options.timeout) {
          setTimeout(() => {
            if (this.activeProcesses.has(executionId)) {
              process.kill('SIGTERM')
              this.activeProcesses.delete(executionId)
              reject(new Error('Command execution timeout'))
            }
          }, options.timeout)
        }
      })

      const executionTime = Date.now() - startTime

      // Limit output length
      if (options.maxOutputLength) {
        output = this.truncateString(output, options.maxOutputLength)
        error = this.truncateString(error, options.maxOutputLength)
      }

      return {
        success: exitCode === 0,
        output,
        error,
        exitCode,
        executionTime,
        command,
        timestamp: new Date()
      }

    } catch (err) {
      this.activeProcesses.delete(executionId)
      const executionTime = Date.now() - startTime
      
      return {
        success: false,
        output: '',
        error: err instanceof Error ? err.message : 'Unknown error',
        exitCode: -1,
        executionTime,
        command,
        timestamp: new Date()
      }
    }
  }

  private isCommandAllowed(command: string, allowedCommands?: string[]): boolean {
    if (!allowedCommands) {
      // Default allowed commands for development
      const defaultAllowed = [
        'node', 'npm', 'npx', 'yarn',
        'git', 'dir', 'pwd', 'cat', 'echo',
        'mkdir', 'rmdir', 'touch', 'cp', 'mv',
        'grep', 'find', 'which', 'type'
      ]
      allowedCommands = defaultAllowed
    }

    const cmd = command.split(' ')[0]
    return allowedCommands.includes(cmd)
  }

  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.substring(0, maxLength) + '... (truncated)'
  }

  async executeCode(code: string, language: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const tempFile = path.join(this.sandboxDir, `temp_${uuidv4()}.${this.getFileExtension(language)}`)
    
    try {
      // Write code to temporary file
      fs.writeFileSync(tempFile, code)
      
      // Execute based on language
      let command: string
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          command = `node ${tempFile}`
          break
        case 'typescript':
        case 'ts':
          command = `npx tsx ${tempFile}`
          break
        case 'python':
        case 'py':
          command = `python ${tempFile}`
          break
        case 'bash':
        case 'sh':
          command = `bash ${tempFile}`
          break
        default:
          throw new Error(`Unsupported language: ${language}`)
      }

      const result = await this.executeCommand(command, options)
      
      // Clean up temporary file
      this.cleanupFile(tempFile)
      
      return result
    } catch (error) {
      // Clean up temporary file on error
      this.cleanupFile(tempFile)
      throw error
    }
  }

  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      'javascript': 'js',
      'js': 'js',
      'typescript': 'ts',
      'ts': 'ts',
      'python': 'py',
      'py': 'py',
      'bash': 'sh',
      'sh': 'sh'
    }
    return extensions[language.toLowerCase()] || 'txt'
  }

  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error)
    }
  }

  getActiveProcesses(): string[] {
    return Array.from(this.activeProcesses.keys())
  }

  killProcess(executionId: string): boolean {
    const process = this.activeProcesses.get(executionId)
    if (process) {
      process.kill('SIGTERM')
      this.activeProcesses.delete(executionId)
      return true
    }
    return false
  }

  killAllProcesses(): void {
    this.activeProcesses.forEach((process) => {
      process.kill('SIGTERM')
    })
    this.activeProcesses.clear()
  }

  getStatus(): AgentStatus {
    return {
      ...this.status,
      connections: this.activeProcesses.size
    }
  }

  cleanup(): void {
    this.killAllProcesses()
    
    // Clean up sandbox directory
    try {
      if (fs.existsSync(this.sandboxDir)) {
        fs.rmSync(this.sandboxDir, { recursive: true, force: true })
      }
    } catch (error) {
      console.warn('Failed to cleanup sandbox directory:', error)
    }
  }
}

