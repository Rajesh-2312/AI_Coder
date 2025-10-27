import axios from 'axios'

export interface AIResponse {
  success: boolean
  content: string
  error?: string
}

class AIService {
  private baseURL = 'http://localhost:3000'

  async generateCode(task: string, context?: string): Promise<AIResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/api/ai/generate`, {
        prompt: task,
        context,
        stream: false
      })
      return {
        success: response.data.success || true,
        content: response.data.response || response.data.content || 'No response generated',
        error: response.data.error
      }
    } catch (error) {
      console.error('AI Service Error:', error)
      return {
        success: false,
        content: 'Failed to connect to AI service',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async createFile(path: string, content: string): Promise<boolean> {
    try {
      console.log(`📝 Creating file: ${path} (${content.length} bytes)`)
      const response = await axios.post(`${this.baseURL}/api/files/write`, {
        filePath: path,
        content
      })
      console.log(`✅ File created successfully: ${path}`, response.data)
      return true
    } catch (error) {
      console.error('❌ File Create Error:', error)
      return false
    }
  }

  async updateFile(path: string, content: string): Promise<boolean> {
    try {
      await axios.post(`${this.baseURL}/api/files/write`, {
        filePath: path,
        content
      })
      return true
    } catch (error) {
      console.error('File Update Error:', error)
      return false
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      await axios.delete(`${this.baseURL}/api/files/delete`, {
        params: { filePath: path }
      })
      return true
    } catch (error) {
      console.error('File Delete Error:', error)
      return false
    }
  }

  async getFileContent(path: string): Promise<string> {
    try {
      console.log('Loading file content:', path)
      const response = await axios.get(`${this.baseURL}/api/files/read`, {
        params: { filePath: path }
      })
      console.log('File content response:', response.data)
      // Response has structure: { content: string, filePath: string }
      return response.data.content || ''
    } catch (error) {
      console.error('File Read Error:', error)
      return ''
    }
  }

  async listFiles(directory: string = '.'): Promise<{ success: boolean; files?: any[]; error?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}/api/files/list`, {
        params: { directory }
      })
      return {
        success: true,
        files: response.data.files || []
      }
    } catch (error) {
      console.error('File List Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files'
      }
    }
  }

  async executeCommand(command: string, workingDirectory?: string, timeout?: number, description?: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/api/execute/ai-command`, {
        command,
        workingDirectory,
        timeout,
        description
      })
      return response.data
    } catch (error) {
      console.error('Command Execution Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stdout: '',
        stderr: 'Failed to execute command'
      }
    }
  }

  async executeProject(description: string): Promise<AIResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/api/ai/execute-project`, {
        description
      })
      return {
        success: response.data.success || true,
        content: response.data.plan || response.data.response || 'No plan generated',
        error: response.data.error
      }
    } catch (error) {
      console.error('Execute Project Error:', error)
      return {
        success: false,
        content: 'Failed to generate project plan',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const aiService = new AIService()
export default aiService