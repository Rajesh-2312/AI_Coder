import fs from 'fs/promises'
import path from 'path'

export interface TrainingExample {
  id: string
  userInput: string
  projectType: string
  technologies: string[]
  agentTasks: AgentTask[]
  successRate: number
  createdAt: Date
  updatedAt: Date
}

export interface AgentTask {
  id: string
  type: 'file_operation' | 'command_execution' | 'dependency_management' | 'testing'
  description: string
  parameters: Record<string, any>
  expectedOutcome: string
  dependencies?: string[]
}

export interface TrainingSession {
  id: string
  name: string
  description: string
  examples: TrainingExample[]
  modelVersion: string
  createdAt: Date
  status: 'active' | 'completed' | 'failed'
}

class AIModelTrainer {
  private trainingDataPath: string
  private sessions: Map<string, TrainingSession> = new Map()
  private examples: Map<string, TrainingExample> = new Map()

  constructor() {
    this.trainingDataPath = path.join(process.cwd(), 'training-data')
    this.initializeTrainingData()
  }

  private async initializeTrainingData() {
    try {
      await fs.mkdir(this.trainingDataPath, { recursive: true })
      await this.loadTrainingData()
    } catch (error) {
      console.error('Failed to initialize training data:', error)
    }
  }

  private async loadTrainingData() {
    try {
      const sessionsFile = path.join(this.trainingDataPath, 'sessions.json')
      const examplesFile = path.join(this.trainingDataPath, 'examples.json')

      // Load sessions
      try {
        const sessionsData = await fs.readFile(sessionsFile, 'utf-8')
        const sessions = JSON.parse(sessionsData)
        sessions.forEach((session: TrainingSession) => {
          this.sessions.set(session.id, {
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt)
          })
        })
      } catch (error) {
        console.log('No existing sessions found, starting fresh')
      }

      // Load examples
      try {
        const examplesData = await fs.readFile(examplesFile, 'utf-8')
        const examples = JSON.parse(examplesData)
        examples.forEach((example: TrainingExample) => {
          this.examples.set(example.id, {
            ...example,
            createdAt: new Date(example.createdAt),
            updatedAt: new Date(example.updatedAt)
          })
        })
      } catch (error) {
        console.log('No existing examples found, starting fresh')
      }

      // Initialize with default training examples
      await this.initializeDefaultExamples()
    } catch (error) {
      console.error('Failed to load training data:', error)
    }
  }

  private async initializeDefaultExamples() {
    const defaultExamples: TrainingExample[] = [
      {
        id: 'tic-tac-toe-example',
        userInput: 'create a tic-tac-toe game',
        projectType: 'React Game',
        technologies: ['React', 'TypeScript', 'CSS'],
        agentTasks: [
          {
            id: 'create-component',
            type: 'file_operation',
            description: 'Create TicTacToe component with game logic',
            parameters: {
              path: 'src/components/TicTacToe.tsx',
              content: 'React component with useState for board state'
            },
            expectedOutcome: 'Functional tic-tac-toe component created',
            dependencies: []
          },
          {
            id: 'create-styles',
            type: 'file_operation',
            description: 'Create CSS styles for game board',
            parameters: {
              path: 'src/components/TicTacToe.css',
              content: 'Grid layout and hover effects'
            },
            expectedOutcome: 'Styled game board with visual feedback',
            dependencies: ['create-component']
          },
          {
            id: 'update-app',
            type: 'file_operation',
            description: 'Update App.tsx to use TicTacToe component',
            parameters: {
              path: 'src/App.tsx',
              content: 'Import and render TicTacToe component'
            },
            expectedOutcome: 'App displays the tic-tac-toe game',
            dependencies: ['create-component', 'create-styles']
          },
          {
            id: 'install-deps',
            type: 'dependency_management',
            description: 'Install required dependencies',
            parameters: {
              command: 'npm install',
              workingDirectory: 'frontend'
            },
            expectedOutcome: 'Dependencies installed successfully',
            dependencies: []
          },
          {
            id: 'build-project',
            type: 'command_execution',
            description: 'Build the project to verify everything works',
            parameters: {
              command: 'npm run build',
              workingDirectory: 'frontend'
            },
            expectedOutcome: 'Project builds without errors',
            dependencies: ['create-component', 'create-styles', 'update-app', 'install-deps']
          }
        ],
        successRate: 0.95,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'todo-app-example',
        userInput: 'create a todo application',
        projectType: 'React App',
        technologies: ['React', 'TypeScript', 'CSS', 'Local Storage'],
        agentTasks: [
          {
            id: 'create-todo-component',
            type: 'file_operation',
            description: 'Create TodoApp component with state management',
            parameters: {
              path: 'src/components/TodoApp.tsx',
              content: 'React component with todo list state and CRUD operations'
            },
            expectedOutcome: 'Functional todo app component created',
            dependencies: []
          },
          {
            id: 'create-todo-item',
            type: 'file_operation',
            description: 'Create TodoItem component for individual todos',
            parameters: {
              path: 'src/components/TodoItem.tsx',
              content: 'Component for displaying and editing individual todos'
            },
            expectedOutcome: 'Reusable todo item component created',
            dependencies: []
          },
          {
            id: 'add-local-storage',
            type: 'file_operation',
            description: 'Add local storage persistence',
            parameters: {
              path: 'src/hooks/useLocalStorage.ts',
              content: 'Custom hook for local storage management'
            },
            expectedOutcome: 'Todos persist between browser sessions',
            dependencies: ['create-todo-component']
          },
          {
            id: 'style-todo-app',
            type: 'file_operation',
            description: 'Create styles for todo application',
            parameters: {
              path: 'src/components/TodoApp.css',
              content: 'Modern CSS with animations and responsive design'
            },
            expectedOutcome: 'Beautiful and responsive todo app interface',
            dependencies: ['create-todo-component', 'create-todo-item']
          },
          {
            id: 'update-main-app',
            type: 'file_operation',
            description: 'Update App.tsx to use TodoApp',
            parameters: {
              path: 'src/App.tsx',
              content: 'Import and render TodoApp component'
            },
            expectedOutcome: 'App displays the todo application',
            dependencies: ['create-todo-component', 'create-todo-item', 'add-local-storage']
          }
        ],
        successRate: 0.90,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'calculator-example',
        userInput: 'create a calculator app',
        projectType: 'React App',
        technologies: ['React', 'TypeScript', 'CSS'],
        agentTasks: [
          {
            id: 'create-calculator',
            type: 'file_operation',
            description: 'Create Calculator component with math operations',
            parameters: {
              path: 'src/components/Calculator.tsx',
              content: 'Calculator with basic arithmetic operations and display'
            },
            expectedOutcome: 'Functional calculator component created',
            dependencies: []
          },
          {
            id: 'add-keyboard-support',
            type: 'file_operation',
            description: 'Add keyboard input support',
            parameters: {
              path: 'src/hooks/useKeyboard.ts',
              content: 'Custom hook for keyboard event handling'
            },
            expectedOutcome: 'Calculator responds to keyboard input',
            dependencies: ['create-calculator']
          },
          {
            id: 'style-calculator',
            type: 'file_operation',
            description: 'Create calculator styles',
            parameters: {
              path: 'src/components/Calculator.css',
              content: 'Calculator button grid and display styling'
            },
            expectedOutcome: 'Professional calculator appearance',
            dependencies: ['create-calculator']
          },
          {
            id: 'add-history',
            type: 'file_operation',
            description: 'Add calculation history feature',
            parameters: {
              path: 'src/components/HistoryPanel.tsx',
              content: 'Component to display calculation history'
            },
            expectedOutcome: 'Users can view calculation history',
            dependencies: ['create-calculator']
          }
        ],
        successRate: 0.88,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    for (const example of defaultExamples) {
      if (!this.examples.has(example.id)) {
        this.examples.set(example.id, example)
      }
    }

    await this.saveTrainingData()
  }

  async createTrainingSession(name: string, description: string): Promise<TrainingSession> {
    const session: TrainingSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      examples: [],
      modelVersion: '1.0.0',
      createdAt: new Date(),
      status: 'active'
    }

    this.sessions.set(session.id, session)
    await this.saveTrainingData()
    return session
  }

  async addTrainingExample(
    sessionId: string,
    userInput: string,
    projectType: string,
    technologies: string[],
    agentTasks: AgentTask[]
  ): Promise<TrainingExample> {
    const example: TrainingExample = {
      id: `example_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userInput,
      projectType,
      technologies,
      agentTasks,
      successRate: 0.0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.examples.set(example.id, example)

    const session = this.sessions.get(sessionId)
    if (session) {
      session.examples.push(example)
      session.updatedAt = new Date()
    }

    await this.saveTrainingData()
    return example
  }

  async updateExampleSuccessRate(exampleId: string, successRate: number) {
    const example = this.examples.get(exampleId)
    if (example) {
      example.successRate = successRate
      example.updatedAt = new Date()
      await this.saveTrainingData()
    }
  }

  async getTrainingExamples(pattern?: string): Promise<TrainingExample[]> {
    let examples = Array.from(this.examples.values())

    if (pattern) {
      const lowerPattern = pattern.toLowerCase()
      examples = examples.filter(example =>
        example.userInput.toLowerCase().includes(lowerPattern) ||
        example.projectType.toLowerCase().includes(lowerPattern) ||
        example.technologies.some(tech => tech.toLowerCase().includes(lowerPattern))
      )
    }

    return examples.sort((a, b) => b.successRate - a.successRate)
  }

  async getBestMatchingExample(userInput: string): Promise<TrainingExample | null> {
    const examples = await this.getTrainingExamples()
    const lowerInput = userInput.toLowerCase()

    // Find exact matches first
    let bestMatch = examples.find(example =>
      example.userInput.toLowerCase() === lowerInput
    )

    if (bestMatch) return bestMatch

    // Find partial matches
    const keywords = lowerInput.split(' ').filter(word => word.length > 2)
    let bestScore = 0
    let bestExample: TrainingExample | null = null

    for (const example of examples) {
      let score = 0
      const exampleText = `${example.userInput} ${example.projectType} ${example.technologies.join(' ')}`.toLowerCase()

      for (const keyword of keywords) {
        if (exampleText.includes(keyword)) {
          score += 1
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestExample = example
      }
    }

    return bestExample
  }

  async generateAgentPlan(userInput: string): Promise<{
    example: TrainingExample | null
    plan: any
    confidence: number
  }> {
    const matchingExample = await this.getBestMatchingExample(userInput)
    
    if (matchingExample) {
      const confidence = this.calculateConfidence(userInput, matchingExample)
      
      return {
        example: matchingExample,
        plan: {
          projectType: matchingExample.projectType,
          technologies: matchingExample.technologies,
          files: matchingExample.agentTasks
            .filter(task => task.type === 'file_operation')
            .map(task => ({
              type: 'create',
              path: task.parameters.path,
              content: task.parameters.content,
              reason: task.description
            })),
          commands: matchingExample.agentTasks
            .filter(task => task.type === 'command_execution' || task.type === 'dependency_management')
            .map(task => ({
              command: task.parameters.command,
              workingDirectory: task.parameters.workingDirectory || 'frontend',
              timeout: 30000,
              description: task.description
            })),
          instructions: matchingExample.agentTasks.map(task => task.description)
        },
        confidence
      }
    }

    return {
      example: null,
      plan: null,
      confidence: 0
    }
  }

  private calculateConfidence(userInput: string, example: TrainingExample): number {
    const inputWords = userInput.toLowerCase().split(' ')
    const exampleWords = example.userInput.toLowerCase().split(' ')
    
    let matches = 0
    for (const inputWord of inputWords) {
      if (exampleWords.includes(inputWord)) {
        matches++
      }
    }
    
    return matches / Math.max(inputWords.length, exampleWords.length)
  }

  async getTrainingStats(): Promise<{
    totalExamples: number
    totalSessions: number
    averageSuccessRate: number
    topTechnologies: Array<{ technology: string; count: number }>
    recentExamples: TrainingExample[]
  }> {
    const examples = Array.from(this.examples.values())
    const sessions = Array.from(this.sessions.values())
    
    const technologyCounts = new Map<string, number>()
    examples.forEach(example => {
      example.technologies.forEach(tech => {
        technologyCounts.set(tech, (technologyCounts.get(tech) || 0) + 1)
      })
    })

    const topTechnologies = Array.from(technologyCounts.entries())
      .map(([technology, count]) => ({ technology, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const averageSuccessRate = examples.length > 0
      ? examples.reduce((sum, example) => sum + example.successRate, 0) / examples.length
      : 0

    const recentExamples = examples
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)

    return {
      totalExamples: examples.length,
      totalSessions: sessions.length,
      averageSuccessRate,
      topTechnologies,
      recentExamples
    }
  }

  private async saveTrainingData() {
    try {
      const sessionsFile = path.join(this.trainingDataPath, 'sessions.json')
      const examplesFile = path.join(this.trainingDataPath, 'examples.json')

      const sessionsData = Array.from(this.sessions.values())
      const examplesData = Array.from(this.examples.values())

      await fs.writeFile(sessionsFile, JSON.stringify(sessionsData, null, 2))
      await fs.writeFile(examplesFile, JSON.stringify(examplesData, null, 2))
    } catch (error) {
      console.error('Failed to save training data:', error)
    }
  }
}

export const aiModelTrainer = new AIModelTrainer()
