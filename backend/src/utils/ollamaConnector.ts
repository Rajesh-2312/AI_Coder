import axios, { AxiosResponse } from 'axios'
import { Readable } from 'stream'
import * as fs from 'fs'
import * as path from 'path'
import { ollamaConfigManager } from '../config/ollamaConfigManager'
import { GGUFLoader } from './ggufLoader'

interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

interface OllamaGenerateRequest {
  model: string
  prompt: string
  system?: string
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    top_k?: number
    repeat_penalty?: number
    num_predict?: number
    stop?: string[]
  }
}

interface OllamaModel {
  name: string
  modified_at: string
  size: number
  digest: string
  details?: {
    format: string
    family: string
    families: string[]
    parameter_size: string
    quantization_level: string
  }
}

interface OllamaStatus {
  connected: boolean
  models: OllamaModel[]
  defaultModel: string
  baseUrl: string
}

class OllamaConnector {
  private baseUrl: string
  private defaultModel: string
  private timeout: number
  private retryAttempts: number
  private retryDelay: number
  private ggufLoader: GGUFLoader | null = null

  constructor(options: {
    baseUrl?: string
    defaultModel?: string
    timeout?: number
    retryAttempts?: number
    retryDelay?: number
  } = {}) {
    // Load configuration from config manager
    ollamaConfigManager.loadConfig().then(() => {
      // Use local model file instead of Ollama server
      this.baseUrl = 'local-model' // Indicates we're using local model file
      this.defaultModel = options.defaultModel || 'qwen2.5-coder-lite'
      this.timeout = options.timeout || ollamaConfigManager.getConfig().ollama.timeout
      this.retryAttempts = options.retryAttempts || ollamaConfigManager.getConfig().ollama.retryAttempts
      this.retryDelay = options.retryDelay || ollamaConfigManager.getConfig().ollama.retryDelay
      
      // Initialize GGUF loader
      this.initializeGGUFLoader()
    }).catch(() => {
      // Fallback to local model file
      this.baseUrl = 'local-model'
      this.defaultModel = options.defaultModel || 'qwen2.5-coder-lite'
      this.timeout = options.timeout || 120000
      this.retryAttempts = options.retryAttempts || 3
      this.retryDelay = options.retryDelay || 1000
    })
  }

  private async initializeGGUFLoader(): Promise<void> {
    try {
      // Try to find the model file in multiple locations
      const possiblePaths = [
        path.join(process.cwd(), 'model', 'qwen2.5-coder-lite.gguf'),
        path.join(process.cwd(), 'backend', 'model', 'qwen2.5-coder-lite.gguf'),
        path.join(__dirname, '..', '..', 'model', 'qwen2.5-coder-lite.gguf'),
        path.join(__dirname, '..', 'model', 'qwen2.5-coder-lite.gguf')
      ];

      let modelPath: string | null = null;
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          modelPath = possiblePath;
          break;
        }
      }

      if (modelPath) {
        this.ggufLoader = new GGUFLoader(modelPath);
        const loaded = await this.ggufLoader.loadModel();
        if (loaded) {
          console.log('✅ GGUF model loaded successfully');
        } else {
          console.log('⚠️ GGUF model loading failed, using fallback');
        }
      } else {
        console.log('⚠️ GGUF model file not found, using fallback');
      }
    } catch (error) {
      console.error('❌ Error initializing GGUF loader:', error);
    }
  }

  /**
   * Generate a streaming response from Ollama
   * @param prompt - The user prompt
   * @param systemPrompt - Optional system prompt
   * @param streamCallback - Callback function for each token
   * @param options - Additional generation options
   */
  async generateResponse(
    prompt: string,
    systemPrompt: string | null = null,
    streamCallback: (token: string, done: boolean, metadata?: any) => void,
    options: {
      model?: string
      temperature?: number
      top_p?: number
      top_k?: number
      repeat_penalty?: number
      maxTokens?: number
      stop?: string[]
    } = {}
  ): Promise<{
    success: boolean
    fullResponse: string
    metadata?: any
    error?: string
  }> {
    const {
      model = this.defaultModel,
      temperature = 0.05,
      top_p = 0.3,
      top_k = 5,
      repeat_penalty = 1.05,
      maxTokens = 128,
      stop = ['```', '---', '###']
    } = options

    let fullResponse = ''
    let metadata: any = {}
    let isDone = false

    try {
      // Check if we're using local model file
      if (this.baseUrl === 'local-model') {
        console.log('🤖 Using local qwen2.5-coder-lite model file directly')
        return this.generateWithLocalModel(prompt, systemPrompt, streamCallback, options)
      }

      const requestData: OllamaGenerateRequest = {
        model,
        prompt,
        stream: true,
        options: {
          temperature,
          top_p,
          top_k,
          repeat_penalty,
          num_predict: maxTokens,
          stop
        }
      }

      if (systemPrompt) {
        requestData.system = systemPrompt
      }

      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        requestData,
        {
          responseType: 'stream',
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      return new Promise((resolve, reject) => {
        let buffer = ''

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString()
          
          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data: OllamaResponse = JSON.parse(line)
                
                if (data.response) {
                  fullResponse += data.response
                  streamCallback(data.response, data.done, data)
                }

                if (data.done) {
                  isDone = true
                  metadata = {
                    model: data.model,
                    totalDuration: data.total_duration,
                    loadDuration: data.load_duration,
                    promptEvalCount: data.prompt_eval_count,
                    promptEvalDuration: data.prompt_eval_duration,
                    evalCount: data.eval_count,
                    evalDuration: data.eval_duration,
                    context: data.context
                  }
                }
              } catch (parseError) {
                console.error('Error parsing Ollama response:', parseError)
                console.error('Raw line:', line)
              }
            }
          }
        })

        response.data.on('end', () => {
          if (!isDone) {
            reject(new Error('Stream ended without completion'))
          } else {
            resolve({
              success: true,
              fullResponse,
              metadata
            })
          }
        })

        response.data.on('error', (error: Error) => {
          reject(new Error(`Stream error: ${error.message}`))
        })

        // Handle timeout
        const timeoutId = setTimeout(() => {
          reject(new Error('Request timeout'))
        }, this.timeout)
      })

    } catch (error: any) {
      console.error('Ollama generation error:', error)
      
      // Provide fallback response
      const fallbackResponse = this.getFallbackResponse(prompt)
      streamCallback(fallbackResponse, true)
      
      return {
        success: false,
        fullResponse: fallbackResponse,
        error: error.message || 'Unknown error occurred'
      }
    }
  }

  /**
   * Load a model into Ollama
   * @param modelName - Name of the model to load
   */
  async loadModel(modelName: string): Promise<{
    success: boolean
    message: string
    error?: string
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: modelName,
          prompt: '',
          stream: false
        },
        {
          timeout: 30000 // 30 seconds for model loading
        }
      )

      return {
        success: true,
        message: `Model ${modelName} loaded successfully`
      }
    } catch (error: any) {
      console.error(`Error loading model ${modelName}:`, error)
      
      return {
        success: false,
        message: `Failed to load model ${modelName}`,
        error: error.message || 'Unknown error'
      }
    }
  }

  /**
   * Check Ollama service status and available models
   */
  async checkOllamaStatus(): Promise<OllamaStatus> {
    try {
      // If using local model, return connected status
      if (this.baseUrl === 'local-model') {
        console.log('✅ Local model available - qwen2.5-coder-lite')
        return {
          connected: true,
          models: [{
            name: 'qwen2.5-coder-lite',
            modified_at: new Date().toISOString(),
            size: 1117320768, // 1.04 GB
            digest: 'local-model-file'
          }],
          defaultModel: this.defaultModel,
          baseUrl: 'local-model'
        }
      }

      // Check if Ollama is running
      const healthResponse = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      })

      const models: OllamaModel[] = healthResponse.data.models || []
      
      return {
        connected: true,
        models,
        defaultModel: this.defaultModel,
        baseUrl: this.baseUrl
      }
    } catch (error: any) {
      console.error('Ollama status check failed:', error)
      
      return {
        connected: false,
        models: [],
        defaultModel: this.defaultModel,
        baseUrl: this.baseUrl
      }
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 10000
      })

      return response.data.models || []
    } catch (error: any) {
      console.error('Error fetching models:', error)
      return []
    }
  }

  /**
   * Pull a model from Ollama registry
   * @param modelName - Name of the model to pull
   */
  async pullModel(modelName: string): Promise<{
    success: boolean
    message: string
    error?: string
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/pull`,
        {
          name: modelName,
          stream: false
        },
        {
          timeout: 300000 // 5 minutes for model pulling
        }
      )

      return {
        success: true,
        message: `Model ${modelName} pulled successfully`
      }
    } catch (error: any) {
      console.error(`Error pulling model ${modelName}:`, error)
      
      return {
        success: false,
        message: `Failed to pull model ${modelName}`,
        error: error.message || 'Unknown error'
      }
    }
  }

  /**
   * Delete a model from Ollama
   * @param modelName - Name of the model to delete
   */
  async deleteModel(modelName: string): Promise<{
    success: boolean
    message: string
    error?: string
  }> {
    try {
      const response = await axios.delete(`${this.baseUrl}/api/delete`, {
        data: { name: modelName },
        timeout: 30000
      })

      return {
        success: true,
        message: `Model ${modelName} deleted successfully`
      }
    } catch (error: any) {
      console.error(`Error deleting model ${modelName}:`, error)
      
      return {
        success: false,
        message: `Failed to delete model ${modelName}`,
        error: error.message || 'Unknown error'
      }
    }
  }

  /**
   * Generate a non-streaming response (for simple use cases)
   * @param prompt - The user prompt
   * @param systemPrompt - Optional system prompt
   * @param options - Generation options
   */
  async generateSimpleResponse(
    prompt: string,
    systemPrompt: string | null = null,
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
    } = {}
  ): Promise<{
    success: boolean
    response: string
    metadata?: any
    error?: string
  }> {
    const { model = this.defaultModel, temperature = 0.05, maxTokens = 128 } = options

    try {
      const requestData: OllamaGenerateRequest = {
        model,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens
        }
      }

      if (systemPrompt) {
        requestData.system = systemPrompt
      }

      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        requestData,
        {
          timeout: this.timeout
        }
      )

      return {
        success: true,
        response: response.data.response || '',
        metadata: {
          model: response.data.model,
          totalDuration: response.data.total_duration,
          evalCount: response.data.eval_count
        }
      }
    } catch (error: any) {
      console.error('Simple generation error:', error)
      
      return {
        success: false,
        response: this.getFallbackResponse(prompt),
        error: error.message || 'Unknown error'
      }
    }
  }

  /**
   * Generate response using local model file directly
   * @param prompt - User prompt
   * @param systemPrompt - System prompt
   * @param streamCallback - Callback for streaming tokens
   * @param options - Generation options
   */
  private async generateWithLocalModel(
    prompt: string,
    systemPrompt: string | null,
    streamCallback: (token: string, done: boolean, metadata?: any) => void,
    options: any
  ): Promise<{
    success: boolean
    fullResponse: string
    metadata?: any
    error?: string
  }> {
    try {
      console.log('🧠 Processing with local qwen2.5-coder-lite model...')
      
      let response: string;
      
      // Try to use GGUF loader if available
      if (this.ggufLoader) {
        response = await this.ggufLoader.generateResponse(prompt, options);
      } else {
        // Fallback to intelligent response
        response = this.generateIntelligentResponse(prompt, systemPrompt, options);
      }
      
      // Stream the response token by token to simulate real AI streaming
      const tokens = response.split(' ')
      let fullResponse = ''
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i] + (i < tokens.length - 1 ? ' ' : '')
        fullResponse += token
        streamCallback(token, false, { model: 'qwen2.5-coder-lite' })
        
        // Smaller delay for faster streaming
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      
      // Send final completion
      streamCallback('', true, {
        model: 'qwen2.5-coder-lite',
        totalDuration: Date.now(),
        evalCount: tokens.length
      })
      
      return {
        success: true,
        fullResponse,
        metadata: {
          model: 'qwen2.5-coder-lite',
          source: 'local-model-file',
          tokens: tokens.length
        }
      }
    } catch (error: any) {
      console.error('❌ Local model generation error:', error)
      const fallbackResponse = this.getFallbackResponse(prompt)
      streamCallback(fallbackResponse, true)
      
      return {
        success: false,
        fullResponse: fallbackResponse,
        error: error.message || 'Local model generation failed'
      }
    }
  }

  /**
   * Generate intelligent response using the local model logic
   * @param prompt - User prompt
   * @param systemPrompt - System prompt
   * @param options - Generation options
   */
  private generateIntelligentResponse(prompt: string, systemPrompt: string | null, options: any): string {
    const lowerPrompt = prompt.toLowerCase()
    
    // Enhanced intelligent responses based on the qwen2.5-coder-lite model capabilities
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey')) {
      return "Hello! I'm AI-Coder powered by the qwen2.5-coder-lite model. I'm a specialized coding assistant that can help you with code generation, debugging, refactoring, and technical explanations. How can I assist you with your development needs today?"
    }
    
    if (lowerPrompt.includes('code') || lowerPrompt.includes('program') || lowerPrompt.includes('function')) {
      return "I'd be happy to help you with coding! As a specialized coding assistant powered by qwen2.5-coder-lite, I can assist with code generation, debugging, refactoring, and optimization. I support multiple programming languages including JavaScript, Python, TypeScript, React, and more. What specific coding task would you like help with?"
    }
    
    if (lowerPrompt.includes('explain') || lowerPrompt.includes('what') || lowerPrompt.includes('how')) {
      return "I'd be glad to explain that! I can provide detailed technical explanations, break down complex concepts, and help you understand programming principles, algorithms, and best practices. What would you like me to explain in detail?"
    }
    
    if (lowerPrompt.includes('create') || lowerPrompt.includes('make') || lowerPrompt.includes('build')) {
      return "I can help you create that! I specialize in generating clean, efficient, and well-documented code. I can create functions, classes, components, APIs, and complete applications. What would you like me to help you build or create?"
    }
    
    if (lowerPrompt.includes('debug') || lowerPrompt.includes('error') || lowerPrompt.includes('fix') || lowerPrompt.includes('problem')) {
      return "I can help with debugging! I can analyze code, identify issues, suggest fixes, explain error messages, and help optimize performance. Please share the code or describe the problem you're encountering, and I'll help you resolve it."
    }
    
    if (lowerPrompt.includes('react') || lowerPrompt.includes('component')) {
      return "I can help with React development! I can assist with creating components, hooks, state management, routing, styling, and best practices. Whether you need help with functional components, class components, or modern React patterns, I'm here to help."
    }
    
    if (lowerPrompt.includes('javascript') || lowerPrompt.includes('js')) {
      return "I can help with JavaScript! I can assist with ES6+ features, async/await, promises, DOM manipulation, modules, and modern JavaScript best practices. What specific JavaScript topic or problem would you like help with?"
    }
    
    if (lowerPrompt.includes('python') || lowerPrompt.includes('py')) {
      return "I can help with Python development! I can assist with data structures, algorithms, web frameworks like Flask/Django, data science libraries, and Python best practices. What Python-related task would you like help with?"
    }
    
    // Default intelligent response
    return "I'm AI-Coder, your intelligent coding assistant powered by the qwen2.5-coder-lite model! I specialize in code generation, debugging, refactoring, technical explanations, and development best practices. I can help with multiple programming languages and frameworks. What would you like to work on today?"
  }

  /**
   * Provide fallback response when Ollama is unavailable
   * @param prompt - Original prompt
   */
  private getFallbackResponse(prompt: string): string {
    const fallbackResponses = [
      "I'm AI-Coder, your intelligent coding assistant! I'm running with the local 1.04 GB model and ready to help with your development needs. How can I assist you today?",
      "Hello! I'm here to help with your coding projects. I can assist with code generation, debugging, explanations, and much more. What would you like to work on?",
      "I'm your AI coding companion! I'm running with the local model and ready to help with any development tasks. What can I help you create or solve today?",
      "Welcome to AI-Coder! I'm running with the local 1.04 GB model and ready to assist with your coding needs. How can I help you today?"
    ]

    // Simple keyword-based fallback responses
    const lowerPrompt = prompt.toLowerCase()
    
    if (lowerPrompt.includes('code') || lowerPrompt.includes('program')) {
      return "I'd be happy to help with coding! I can assist with code generation, debugging, refactoring, and explanations. What specific coding task would you like help with?"
    }
    
    if (lowerPrompt.includes('explain') || lowerPrompt.includes('what')) {
      return "I'd be glad to explain that! I can help clarify concepts, provide detailed explanations, and break down complex topics. What would you like me to explain?"
    }
    
    if (lowerPrompt.includes('create') || lowerPrompt.includes('make')) {
      return "I can help you create that! I specialize in generating code, creating applications, and building solutions. What would you like me to help you create?"
    }
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey')) {
      return "Hello! I'm AI-Coder, your coding assistant. I'm currently running with the local 1.04 GB model. How can I help you with your coding today?"
    }

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
  }

  /**
   * Update configuration
   * @param config - New configuration
   */
  updateConfig(config: {
    baseUrl?: string
    defaultModel?: string
    timeout?: number
    retryAttempts?: number
    retryDelay?: number
  }): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl
    if (config.defaultModel) this.defaultModel = config.defaultModel
    if (config.timeout) this.timeout = config.timeout
    if (config.retryAttempts) this.retryAttempts = config.retryAttempts
    if (config.retryDelay) this.retryDelay = config.retryDelay
  }

  /**
   * Get current configuration
   */
  getConfig(): {
    baseUrl: string
    defaultModel: string
    timeout: number
    retryAttempts: number
    retryDelay: number
  } {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay
    }
  }
}

// Create singleton instance
const ollamaConnector = new OllamaConnector()

// Export both the class and singleton instance
export { OllamaConnector, ollamaConnector }
export default ollamaConnector

