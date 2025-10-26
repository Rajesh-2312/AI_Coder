import { aiService } from './aiService'

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
      const response = await aiService.executeProject(taskDescription)
      
      if (response.success && response.content) {
        // Try to parse JSON response
        try {
          const plan = JSON.parse(response.content)
          if (plan.files && Array.isArray(plan.files)) {
            return plan
          }
        } catch (parseError) {
          console.log('Failed to parse AI response as JSON, using fallback plan')
        }
      }
      
      // Fallback plan for common requests
      return this.createFallbackPlan(taskDescription)
    } catch (error) {
      console.error('Failed to create project plan:', error)
      return this.createFallbackPlan(taskDescription)
    }
  }

  private createFallbackPlan(taskDescription: string): ProjectPlan {
    const lowerDescription = taskDescription.toLowerCase()
    
    if (lowerDescription.includes('tic-tac-toe') || lowerDescription.includes('tictactoe')) {
      return {
        projectType: 'React Game',
        technologies: ['React', 'TypeScript', 'CSS'],
        files: [
          {
            type: 'create',
            path: 'src/components/TicTacToe.tsx',
            content: `import React, { useState } from 'react'

interface TicTacToeProps {}

const TicTacToe: React.FC<TicTacToeProps> = () => {
  const [board, setBoard] = useState<string[]>(Array(9).fill(''))
  const [isXNext, setIsXNext] = useState(true)
  const [winner, setWinner] = useState<string | null>(null)

  const calculateWinner = (squares: string[]): string | null => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i]
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    return null
  }

  const handleClick = (index: number) => {
    if (board[index] || winner) return

    const newBoard = [...board]
    newBoard[index] = isXNext ? 'X' : 'O'
    setBoard(newBoard)
    setIsXNext(!isXNext)

    const gameWinner = calculateWinner(newBoard)
    if (gameWinner) {
      setWinner(gameWinner)
    }
  }

  const resetGame = () => {
    setBoard(Array(9).fill(''))
    setIsXNext(true)
    setWinner(null)
  }

  const renderSquare = (index: number) => (
    <button
      key={index}
      className="w-16 h-16 border border-gray-300 text-2xl font-bold hover:bg-gray-100"
      onClick={() => handleClick(index)}
    >
      {board[index]}
    </button>
  )

  return (
    <div className="flex flex-col items-center space-y-4">
      <h1 className="text-3xl font-bold">Tic Tac Toe</h1>
      
      <div className="grid grid-cols-3 gap-1">
        {Array(9).fill(null).map((_, index) => renderSquare(index))}
      </div>
      
      <div className="text-center">
        {winner ? (
          <div>
            <p className="text-xl font-semibold text-green-600">
              Winner: {winner}!
            </p>
            <button
              onClick={resetGame}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Play Again
            </button>
          </div>
        ) : (
          <p className="text-lg">
            Next player: {isXNext ? 'X' : 'O'}
          </p>
        )}
      </div>
    </div>
  )
}

export default TicTacToe`,
            reason: 'Create main game component'
          },
          {
            type: 'create',
            path: 'src/components/TicTacToe.css',
            content: `.tic-tac-toe {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.game-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.square {
  width: 64px;
  height: 64px;
  border: 2px solid #d1d5db;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.square:hover {
  background-color: #f3f4f6;
}

.square:disabled {
  cursor: not-allowed;
}

.game-info {
  text-align: center;
}

.winner {
  color: #059669;
  font-size: 1.25rem;
  font-weight: 600;
}

.reset-button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reset-button:hover {
  background-color: #2563eb;
}`,
            reason: 'Add game styling'
          },
          {
            type: 'update',
            path: 'src/App.tsx',
            content: `import React from 'react'
import TicTacToe from './components/TicTacToe'
import './App.css'

function App() {
  return (
    <div className="App">
      <TicTacToe />
    </div>
  )
}

export default App`,
            reason: 'Update App to use TicTacToe component'
          }
        ],
        dependencies: ['react', 'typescript'],
        instructions: [
          'Create a complete tic-tac-toe game',
          'Implement game logic with win detection',
          'Add interactive UI with hover effects',
          'Include reset functionality'
        ],
        commands: [
          {
            command: 'npm install',
            workingDirectory: 'frontend',
            timeout: 30000,
            description: 'Install frontend dependencies'
          },
          {
            command: 'npm run build',
            workingDirectory: 'frontend',
            timeout: 60000,
            description: 'Build the frontend project'
          }
        ]
      }
    }

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
        } else {
          results += `❌ Failed to ${operation.type}: ${operation.path}\n\n`
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
      }
    }

    return results
  }

  private async executeTerminalCommands(commands: TerminalCommand[], task: AIAgentTask): Promise<string> {
    let results = ''
    let completedCommands = 0

    for (const cmd of commands) {
      try {
        console.log(`🤖 Executing terminal command: ${cmd.command}`)

        const response = await aiService.executeCommand(cmd.command, cmd.workingDirectory, cmd.timeout, cmd.description)

        if (response.success) {
          results += `✅ ${cmd.description}: ${cmd.command}\n`
          results += `Output: ${response.stdout}\n\n`
        } else {
          results += `❌ ${cmd.description}: ${cmd.command}\n`
          results += `Error: ${response.stderr || response.error}\n\n`
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
  }

  getActiveTasks(): AIAgentTask[] {
    return Array.from(this.activeTasks.values())
  }

  getTask(taskId: string): AIAgentTask | undefined {
    return this.activeTasks.get(taskId)
  }
}

export const aiAgent = new AIAgent()
export default aiAgent