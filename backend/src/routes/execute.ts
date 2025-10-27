import express, { Request, Response } from 'express'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const router = express.Router()

interface ExecuteRequest {
  code: string
  language: string
  timeout?: number
  workingDirectory?: string
}

interface AICommandRequest {
  command: string
  workingDirectory?: string
  timeout?: number
}

// Store active processes for cancellation
const activeProcesses = new Map<string, any>()

// Allowed commands for security
const allowedCommands = [
  'npm', 'yarn', 'node', 'git', 'ls', 'dir', 'pwd', 'cd', 'mkdir', 'rmdir',
  'echo', 'cat', 'type', 'npm install', 'npm run dev', 'npm run build',
  'npm run test', 'npm --version', 'npm list', 'yarn --version',
  'git status', 'git log', 'node --version', 'node'
];

/**
 * Execute code directly
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { code, language, timeout = 30000, workingDirectory = '/tmp' }: ExecuteRequest = req.body

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Code and language are required'
      })
    }

    const result = await executeCode(code, language, timeout, workingDirectory)
    return res.json(result)
  } catch (error: any) {
    console.error('Code execution error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Code execution failed'
    })
  }
})

/**
 * Execute AI Agent commands
 */
router.post('/ai-command', async (req: Request, res: Response) => {
  try {
    const { command, workingDirectory = '.', timeout = 30000 }: AICommandRequest = req.body

    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      })
    }

    // Security: Check if command is allowed
    const commandParts = command.trim().split(' ')
    const baseCommand = commandParts[0]
    
    if (!allowedCommands.includes(baseCommand)) {
      return res.status(400).json({
        success: false,
        error: `Command not allowed: ${baseCommand}`
      })
    }

    console.log(`🚀 Starting AI command: ${command}`)
    
    const result = await executeAICommand(command, workingDirectory, timeout)
    
    console.log(`✅ AI Command completed with exit code: ${result.exitCode}`)
    
    return res.json(result)
  } catch (error: any) {
    console.error('AI command execution error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Command execution failed'
    })
  }
})

/**
 * Execute AI command with proper error handling
 */
async function executeAICommand(command: string, workingDirectory: string, timeout: number): Promise<any> {
  return new Promise((resolve) => {
    const processId = Date.now().toString()
    
    // Ensure working directory exists
    if (!fs.existsSync(workingDirectory)) {
      console.log(`📁 Creating working directory: ${workingDirectory}`)
      fs.mkdirSync(workingDirectory, { recursive: true })
    }

    console.log(`📁 Working directory: ${workingDirectory}`)
    console.log(`🖥️ Platform: ${process.platform}`)

    const childProcess = spawn(command, [], {
      cwd: workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, PATH: process.env.PATH }
    })

    activeProcesses.set(processId, childProcess)

    let stdout = ''
    let stderr = ''
    let isTimedOut = false

    // Set timeout
    const timeoutId = setTimeout(() => {
      isTimedOut = true
      childProcess.kill('SIGTERM')
      console.log(`⚠️ AI Command error: Command timed out after ${timeout}ms`)
      activeProcesses.delete(processId)
      resolve({
        success: false,
        exitCode: 1,
        stdout: stdout,
        stderr: stderr,
        error: `Command timed out after ${timeout}ms`
      })
    }, timeout)

    childProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      stdout += output
      console.log(`📤 AI Command output: ${output.trim()}`)
    })

    childProcess.stderr?.on('data', (data) => {
      const output = data.toString()
      stderr += output
      console.log(`⚠️ AI Command error: ${output.trim()}`)
    })

    childProcess.on('close', (code) => {
      clearTimeout(timeoutId)
      activeProcesses.delete(processId)
      
      if (isTimedOut) return

      resolve({
        success: code === 0,
        exitCode: code || 0,
        stdout: stdout,
        stderr: stderr
      })
    })

    childProcess.on('error', (error) => {
      clearTimeout(timeoutId)
      activeProcesses.delete(processId)
      
      if (isTimedOut) return

      console.log(`AI Command execution error: ${error.message}`)
      resolve({
        success: false,
        exitCode: 1,
        stdout: stdout,
        stderr: stderr,
        error: error.message
      })
    })
  })
}

/**
 * Execute code with timeout and proper cleanup
 */
async function executeCode(code: string, language: string, timeout: number, workingDirectory: string): Promise<any> {
  return new Promise((resolve) => {
    const processId = Date.now().toString()
    
    // Create temporary file
    const tempFile = path.join(workingDirectory, `temp_${processId}.${getFileExtension(language)}`)
    
    try {
      fs.writeFileSync(tempFile, code)
    } catch (error) {
      return resolve({
        success: false,
        error: 'Failed to create temporary file'
      })
    }

    const command = getExecutionCommand(language, tempFile)
    const childProcess = spawn(command, [], {
      cwd: workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    })

    activeProcesses.set(processId, childProcess)

    let stdout = ''
    let stderr = ''
    let isTimedOut = false

    // Set timeout
    const timeoutId = setTimeout(() => {
      isTimedOut = true
      childProcess.kill('SIGTERM')
      cleanup()
      resolve({
        success: false,
        error: `Execution timed out after ${timeout}ms`
      })
    }, timeout)

    const cleanup = () => {
      clearTimeout(timeoutId)
      activeProcesses.delete(processId)
      try {
        fs.unlinkSync(tempFile)
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    childProcess.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    childProcess.on('close', (code) => {
      cleanup()
      if (isTimedOut) return

      resolve({
        success: code === 0,
        stdout: stdout,
        stderr: stderr,
        exitCode: code || 0
      })
    })

    childProcess.on('error', (error) => {
      cleanup()
      if (isTimedOut) return

      resolve({
        success: false,
        error: error.message
      })
    })
  })
}

function getFileExtension(language: string): string {
  const extensions: { [key: string]: string } = {
    'javascript': 'js',
    'typescript': 'ts',
    'python': 'py',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c'
  }
  return extensions[language.toLowerCase()] || 'txt'
}

function getExecutionCommand(language: string, filePath: string): string {
  const commands: { [key: string]: string } = {
    'javascript': `node "${filePath}"`,
    'typescript': `ts-node "${filePath}"`,
    'python': `python "${filePath}"`,
    'java': `javac "${filePath}" && java "${filePath.replace('.java', '')}"`,
    'cpp': `g++ "${filePath}" -o "${filePath.replace('.cpp', '')}" && "${filePath.replace('.cpp', '')}"`,
    'c': `gcc "${filePath}" -o "${filePath.replace('.c', '')}" && "${filePath.replace('.c', '')}"`
  }
  return commands[language.toLowerCase()] || `cat "${filePath}"`
}

export default router;