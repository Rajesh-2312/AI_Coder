import { Agent, TerminalResult } from './types'
import { spawn } from 'child_process'
import { promisify } from 'util'

export class TerminalAgent implements Agent {
  private allowedCommands = [
    'npm', 'yarn', 'node', 'python', 'git',
    'ls', 'dir', 'cd', 'mkdir', 'rm', 'rmdir',
    'cat', 'type', 'echo', 'pwd'
  ]

  /**
   * Execute terminal operations
   */
  async execute(action: string, payload: any): Promise<string> {
    console.log(`Terminal Agent executing: ${action}`, payload)

    switch (action) {
      case 'execute':
        return await this.executeCommand(payload.command, payload.cwd)
      case 'validate':
        return await this.validateCommand(payload.command)
      default:
        return `Unknown terminal action: ${action}`
    }
  }

  /**
   * Execute shell command
   */
  private async executeCommand(command: string, cwd?: string): Promise<string> {
    // Validate command
    const validation = this.validateCommand(command)
    if (!validation.startsWith('✓')) {
      return validation
    }

    return new Promise((resolve, reject) => {
      console.log(`Executing: ${command}`)

      const [cmd, ...args] = this.parseCommand(command)
      const process = spawn(cmd, args, {
        shell: true,
        cwd: cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      process.stdout?.on('data', (data) => {
        const output = data.toString()
        stdout += output
        console.log('STDOUT:', output)
      })

      process.stderr?.on('data', (data) => {
        const output = data.toString()
        stderr += output
        console.error('STDERR:', output)
      })

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✓ Command executed successfully: ${command}`)
          resolve(`Command executed successfully:\n\nOutput:\n${stdout}${stderr}`)
        } else {
          console.log(`✗ Command failed with exit code ${code}: ${command}`)
          resolve(`Command failed with exit code ${code}:\n\nError:\n${stderr}${stdout}`)
        }
      })

      process.on('error', (error) => {
        console.error(`✗ Command error: ${error}`)
        resolve(`Command error: ${error.message}`)
      })
    })
  }

  /**
   * Parse command string
   */
  private parseCommand(command: string): [string, ...string[]] {
    const parts = command.trim().split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)
    return [cmd, ...args]
  }

  /**
   * Validate if command is allowed
   */
  private validateCommand(command: string): string {
    const [cmd] = this.parseCommand(command)

    // Check if command is in allowed list
    if (this.allowedCommands.includes(cmd.toLowerCase())) {
      return `✓ Command validated: ${command}`
    }

    // Allow commands that start with allowed prefixes
    for (const allowed of this.allowedCommands) {
      if (command.toLowerCase().startsWith(allowed)) {
        return `✓ Command validated: ${command}`
      }
    }

    return `✗ Command not allowed: ${command}\n\nAllowed commands: ${this.allowedCommands.join(', ')}`
  }

  /**
   * Get command output as structured result
   */
  async executeCommandStructured(command: string, cwd?: string): Promise<TerminalResult> {
    const validation = this.validateCommand(command)
    
    if (!validation.startsWith('✓')) {
      return {
        success: false,
        stderr: validation
      }
    }

    return new Promise((resolve) => {
      const [cmd, ...args] = this.parseCommand(command)
      const process = spawn(cmd, args, {
        shell: true,
        cwd: cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      process.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || undefined
        })
      })

      process.on('error', (error) => {
        resolve({
          success: false,
          stderr: error.message
        })
      })
    })
  }
}

