import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

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

export interface TrainingStats {
  totalExamples: number
  totalSessions: number
  averageSuccessRate: number
  topTechnologies: Array<{ technology: string; count: number }>
  recentExamples: TrainingExample[]
}

class TrainingService {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Create a new training session
  async createTrainingSession(name: string, description: string): Promise<{
    success: boolean
    session?: TrainingSession
    error?: string
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/training/sessions`, {
        name,
        description
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create training session'
      }
    }
  }

  // Add a training example to a session
  async addTrainingExample(
    sessionId: string,
    userInput: string,
    projectType: string,
    technologies: string[],
    agentTasks: AgentTask[]
  ): Promise<{
    success: boolean
    example?: TrainingExample
    error?: string
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/training/sessions/${sessionId}/examples`, {
        userInput,
        projectType,
        technologies,
        agentTasks
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add training example'
      }
    }
  }

  // Update example success rate
  async updateExampleSuccessRate(exampleId: string, successRate: number): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const response = await axios.put(`${this.baseURL}/training/examples/${exampleId}/success-rate`, {
        successRate
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update success rate'
      }
    }
  }

  // Get training examples with optional pattern matching
  async getTrainingExamples(pattern?: string): Promise<{
    success: boolean
    examples?: TrainingExample[]
    error?: string
  }> {
    try {
      const url = pattern 
        ? `${this.baseURL}/training/examples?pattern=${encodeURIComponent(pattern)}`
        : `${this.baseURL}/training/examples`
      
      const response = await axios.get(url)
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get training examples'
      }
    }
  }

  // Generate agent plan based on user input
  async generateAgentPlan(userInput: string): Promise<{
    success: boolean
    example?: TrainingExample
    plan?: any
    confidence?: number
    error?: string
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/training/generate-plan`, {
        userInput
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to generate agent plan'
      }
    }
  }

  // Get training statistics
  async getTrainingStats(): Promise<{
    success: boolean
    stats?: TrainingStats
    error?: string
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/training/stats`)
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get training stats'
      }
    }
  }

  // Train the model with a specific example
  async trainModel(
    userInput: string,
    projectType: string,
    technologies: string[],
    agentTasks: AgentTask[],
    successRate?: number
  ): Promise<{
    success: boolean
    session?: TrainingSession
    example?: TrainingExample
    error?: string
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/training/train`, {
        userInput,
        projectType,
        technologies,
        agentTasks,
        successRate
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to train model'
      }
    }
  }

  // Get best matching example for user input
  async getBestMatchingExample(userInput: string): Promise<{
    success: boolean
    example?: TrainingExample
    error?: string
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/training/match`, {
        userInput
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to find matching example'
      }
    }
  }

  // Quick train method for common patterns
  async quickTrain(userInput: string, successRate: number = 1.0): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    try {
      // First, try to find a matching example
      const matchResult = await this.getBestMatchingExample(userInput)
      
      if (matchResult.success && matchResult.example) {
        // Update the success rate of the existing example
        const updateResult = await this.updateExampleSuccessRate(
          matchResult.example.id,
          successRate
        )
        
        if (updateResult.success) {
          return {
            success: true,
            message: `Updated success rate for existing example: "${matchResult.example.userInput}"`
          }
        }
      }

      // If no match found, create a new training example
      const sessionResult = await this.createTrainingSession(
        `Quick Training ${Date.now()}`,
        `Quick training for: ${userInput}`
      )

      if (!sessionResult.success || !sessionResult.session) {
        return {
          success: false,
          error: 'Failed to create training session'
        }
      }

      // Create a basic training example
      const basicTasks: AgentTask[] = [
        {
          id: 'create-main-component',
          type: 'file_operation',
          description: `Create main component for ${userInput}`,
          parameters: {
            path: 'src/components/MainComponent.tsx',
            content: 'React component implementation'
          },
          expectedOutcome: 'Main component created successfully',
          dependencies: []
        },
        {
          id: 'install-dependencies',
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
          description: 'Build the project',
          parameters: {
            command: 'npm run build',
            workingDirectory: 'frontend'
          },
          expectedOutcome: 'Project builds successfully',
          dependencies: ['create-main-component', 'install-dependencies']
        }
      ]

      const exampleResult = await this.addTrainingExample(
        sessionResult.session.id,
        userInput,
        'React App',
        ['React', 'TypeScript'],
        basicTasks
      )

      if (exampleResult.success && exampleResult.example) {
        await this.updateExampleSuccessRate(exampleResult.example.id, successRate)
        
        return {
          success: true,
          message: `Created new training example for: "${userInput}"`
        }
      }

      return {
        success: false,
        error: 'Failed to create training example'
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to perform quick training'
      }
    }
  }
}

export const trainingService = new TrainingService()
