import { aiService } from './aiService'
import { errorDetector, type DetectedError } from './errorDetector'

export interface FileOperation {
  type: 'create' | 'update' | 'delete' | 'read'
  path: string
  content?: string
  reason: string
}

export interface TerminalCommand {
  command: string
  workingDirectory?: string
  timeout?: number
  description: string
}

export interface ProjectPlan {
  projectType: string
  technologies: string[]
  files: FileOperation[]
  dependencies: string[]
  instructions: string[]
  commands?: TerminalCommand[]
}

export interface AIAgentTask {
  id: string
  description: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
  progress: number
  files?: FileOperation[]
  result?: string
  error?: string
}

class AIAgent {
  private activeTasks: Map<string, AIAgentTask> = new Map()

  async executeTask(taskDescription: string): Promise<AIAgentTask> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const task: AIAgentTask = {
      id: taskId,
      description: taskDescription,
      status: 'executing',
      progress: 0,
      files: []
    }

    this.activeTasks.set(taskId, task)
    this.updateTask(task)

    try {
      // Step 1: Analyze the task
      task.progress = 10
      this.updateTask(task)

      const plan = await this.createProjectPlan(taskDescription)
      
      // Step 2: Execute file operations
      task.progress = 20
      this.updateTask(task)

      let result = await this.executeFileOperations(plan.files, task)
      
      // Step 3: Execute terminal commands if any
      if (plan.commands && plan.commands.length > 0) {
        task.progress = 80
        this.updateTask(task)
        
        const commandResults = await this.executeTerminalCommands(plan.commands, task)
        result += '\n\n' + commandResults
      }

      // Step 4: Complete the task
      task.status = 'completed'
      task.progress = 100
      task.result = result
      this.updateTask(task)

      return task
    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : 'Unknown error'
      this.updateTask(task)
      throw error
    }
  }

  private async createProjectPlan(taskDescription: string): Promise<ProjectPlan> {
    try {
      const response = await fetch('http://localhost:3000/api/ai/execute-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description: taskDescription })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.plan) {
          console.log('✅ Got project plan from backend:', data.plan)
          return data.plan
        }
      }
      
      console.log('Failed to get project plan, using fallback')
      // Fallback plan for common requests
      return this.createFallbackPlan(taskDescription)
    } catch (error) {
      console.error('Failed to create project plan:', error)
      return this.createFallbackPlan(taskDescription)
    }
  }

  private createFallbackPlan(taskDescription: string): ProjectPlan {
    // Generic fallback
    return {
      projectType: 'Web Application',
      technologies: ['React', 'TypeScript'],
      files: [
        {
          type: 'create',
          path: 'src/components/NewComponent.tsx',
          content: `import React from 'react'

const NewComponent: React.FC = () => {
  return (
    <div>
      <h1>New Component</h1>
      <p>Created by AI Agent</p>
    </div>
  )
}

export default NewComponent`,
          reason: 'Create new component'
        }
      ],
      dependencies: ['react'],
      instructions: ['Create a basic React component'],
      commands: []
    }
  }

  private async executeFileOperations(operations: FileOperation[], task: AIAgentTask): Promise<string> {
    let results = ''
    let completedOperations = 0

    for (const operation of operations) {
      try {
        console.log(`🤖 Executing file operation: ${operation.type} ${operation.path}`)
        
        // Dispatch terminal output
        window.dispatchEvent(new CustomEvent('terminalOutput', {
          detail: { output: `📄 ${operation.type.toUpperCase()}: ${operation.path}` }
        }))

        let success = false
        switch (operation.type) {
          case 'create':
            success = await aiService.createFile(operation.path, operation.content || '')
            break
          case 'update':
            success = await aiService.updateFile(operation.path, operation.content || '')
            break
          case 'delete':
            success = await aiService.deleteFile(operation.path)
            break
          case 'read':
            const content = await aiService.getFileContent(operation.path)
            results += `📖 Read ${operation.path}: ${content.length} characters\n`
            success = true
            break
        }

        if (success) {
          results += `✅ ${operation.type.toUpperCase()}: ${operation.path}\n`
          results += `   Reason: ${operation.reason}\n\n`
          
          // Dispatch success to terminal
          window.dispatchEvent(new CustomEvent('terminalOutput', {
            detail: { output: `✓ ${operation.path} - ${operation.reason}` }
          }))
        } else {
          results += `❌ Failed to ${operation.type}: ${operation.path}\n\n`
          
          // Dispatch error to terminal
          window.dispatchEvent(new CustomEvent('terminalOutput', {
            detail: { output: `✗ Failed: ${operation.path}` }
          }))
        }

        completedOperations++
        task.progress = 20 + (completedOperations / operations.length) * 60
        this.updateTask(task)

        // Add a small delay between operations
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Failed to execute file operation ${operation.type} ${operation.path}:`, error)
        results += `❌ Error ${operation.type}: ${operation.path}\n`
        results += `   Error: ${error}\n\n`
        
        // Dispatch error to terminal
        window.dispatchEvent(new CustomEvent('terminalOutput', {
          detail: { output: `✗ Error: ${operation.path} - ${error}` }
        }))
      }
    }

    return results
  }

  private async executeTerminalCommands(commands: TerminalCommand[], task: AIAgentTask): Promise<string> {
    let results = ''
    let completedCommands = 0
    let errorOutput: string[] = []

    for (const cmd of commands) {
      try {
        console.log(`🤖 Executing terminal command: ${cmd.command}`)

        // Dispatch command start to terminal
        window.dispatchEvent(new CustomEvent('terminalOutput', {
          detail: { output: `$ ${cmd.command}` }
        }))

        const response = await aiService.executeCommand(cmd.command, cmd.workingDirectory, cmd.timeout, cmd.description)

        if (response.success) {
          results += `✅ ${cmd.description}: ${cmd.command}\n`
          results += `Output: ${response.stdout}\n\n`
          
          // Dispatch success to terminal
          if (response.stdout) {
            window.dispatchEvent(new CustomEvent('terminalOutput', {
              detail: { output: response.stdout }
            }))
          }
          window.dispatchEvent(new CustomEvent('terminalOutput', {
            detail: { output: `✓ ${cmd.description} completed` }
          }))
        } else {
          results += `❌ ${cmd.description}: ${cmd.command}\n`
          results += `Error: ${response.stderr || response.error}\n\n`
          
          // Collect error output for auto-fixing
          if (response.stderr) {
            errorOutput.push(...response.stderr.split('\n'))
          }
          
          // Dispatch error to terminal
          if (response.stderr) {
            window.dispatchEvent(new CustomEvent('terminalOutput', {
              detail: { output: `✗ ${cmd.description} failed` }
            }))
            window.dispatchEvent(new CustomEvent('terminalOutput', {
              detail: { output: response.stderr }
            }))
            
            // Auto-fix errors if build fails
            if (cmd.description.includes('build') || cmd.description.includes('Build')) {
              window.dispatchEvent(new CustomEvent('terminalOutput', {
                detail: { output: 'Analyzing errors and generating fixes...' }
              }))
              
              const errors = errorDetector.detectErrors(errorOutput)
              if (errors.length > 0) {
                window.dispatchEvent(new CustomEvent('terminalOutput', {
                  detail: { output: `Detected ${errors.length} error(s) - Attempting auto-fix...` }
                }))
                
                // Try to fix the errors
                const fixResults = await this.autoFixErrors(errorOutput)
                for (const result of fixResults) {
                  window.dispatchEvent(new CustomEvent('terminalOutput', {
                    detail: { output: result }
                  }))
                }
              }
            }
          }
        }

        completedCommands++
        task.progress = 80 + (completedCommands / commands.length) * 15
        this.updateTask(task)

        // Add a small delay between commands
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Failed to execute command ${cmd.command}:`, error)
        results += `❌ ${cmd.description}: ${cmd.command}\n`
        results += `Error: ${error}\n\n`
        
        // Collect error output
        errorOutput.push(error?.toString() || 'Unknown error')
        
        // Dispatch error to terminal
        window.dispatchEvent(new CustomEvent('terminalOutput', {
          detail: { output: `✗ Command failed: ${cmd.command} - ${error}` }
        }))
      }
    }

    return results
  }

  private updateTask(task: AIAgentTask) {
    this.activeTasks.set(task.id, { ...task })
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('aiTaskUpdate', {
      detail: task
    }))
    
    // Dispatch terminal output for real-time updates
    if (task.result) {
      window.dispatchEvent(new CustomEvent('terminalOutput', {
        detail: { output: task.result }
      }))
    }
  }

  getActiveTasks(): AIAgentTask[] {
    return Array.from(this.activeTasks.values())
  }

  getTask(taskId: string): AIAgentTask | undefined {
    return this.activeTasks.get(taskId)
  }

  async autoFixErrors(errorOutput: string[]): Promise<string[]> {
    const errors = errorDetector.detectErrors(errorOutput)
    
    if (errors.length === 0) {
      return []
    }

    const fixSteps: string[] = []
    const fixes = new Map<string, string[]>()

    // Generate fix suggestions
    for (const error of errors) {
      const suggestions: string[] = []

      switch (error.type) {
        case 'dependency':
          const moduleName = error.message.match(/module ['"](.+?)['"]/)?.[1]
          if (moduleName) {
            fixSteps.push(`npm install ${moduleName}`)
            suggestions.push(`Install missing dependency: ${moduleName}`)
          }
          break
        case 'typescript':
          if (error.suggestion) {
            fixSteps.push(error.suggestion)
            suggestions.push(`Fix TypeScript: ${error.suggestion}`)
          }
          break
        case 'syntax':
          fixSteps.push('Add React import')
          suggestions.push('Ensure React import is present')
          suggestions.push('Ensure file has .tsx extension')
          break
        case 'build':
          fixSteps.push('Review build errors')
          suggestions.push('Fix all TypeScript compilation errors')
          break
      }

      if (error.file) {
        fixes.set(error.file, suggestions)
      }
    }

    // Execute fixes
    const fixResults: string[] = []
    for (const step of fixSteps) {
      if (step.startsWith('npm install')) {
        window.dispatchEvent(new CustomEvent('terminalOutput', {
          detail: { output: `Auto-fixing: ${step}` }
        }))
        
        const module = step.replace('npm install ', '').trim()
        const response = await aiService.executeCommand(
          `npm install ${module}`,
          'frontend',
          30000,
          `Installing ${module}`
        )
        
        if (response.success) {
          fixResults.push(`✅ Fixed: Installed ${module}`)
        } else {
          fixResults.push(`❌ Failed: ${response.error}`)
        }
      }
    }

    return fixResults
  }
}

export const aiAgent = new AIAgent()
export default aiAgent