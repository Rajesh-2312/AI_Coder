import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

interface AgentResponse {
  success: boolean
  result: string
  timestamp: string
}

interface MemoryResponse {
  success: boolean
  memory: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    userId?: string
    timestamp: number
  }>
  count: number
}

class AgentService {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  /**
   * Process prompt through Master Agent
   */
  async processPrompt(prompt: string, userId?: string): Promise<AgentResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/agents/process`, {
        prompt,
        userId
      })
      return response.data
    } catch (error) {
      console.error('Agent processing error:', error)
      throw error
    }
  }

  /**
   * Get agent memory
   */
  async getMemory(): Promise<MemoryResponse> {
    try {
      const response = await axios.get(`${this.baseURL}/agents/memory`)
      return response.data
    } catch (error) {
      console.error('Memory retrieval error:', error)
      throw error
    }
  }

  /**
   * Clear agent memory
   */
  async clearMemory(): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/agents/memory`)
    } catch (error) {
      console.error('Memory clearing error:', error)
      throw error
    }
  }
}

export const agentService = new AgentService()
export default agentService

