const axios = require('axios');

/**
 * Ollama Connector for AI-Coder Backend
 * Handles streaming prompts to local Ollama API
 */
class OllamaConnector {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.defaultModel = options.defaultModel || 'codellama';
    this.timeout = options.timeout || 120000; // 2 minutes
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Generate a streaming response from Ollama
   * @param {string} prompt - The user prompt
   * @param {string|null} systemPrompt - Optional system prompt
   * @param {Function} streamCallback - Callback function for each token
   * @param {Object} options - Additional generation options
   */
  async generateResponse(
    prompt,
    systemPrompt = null,
    streamCallback,
    options = {}
  ) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      top_p = 0.9,
      top_k = 40,
      repeat_penalty = 1.1,
      maxTokens = 2048,
      stop = ['```', '---', '###']
    } = options;

    let fullResponse = '';
    let metadata = {};
    let isDone = false;

    try {
      const requestData = {
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
      };

      if (systemPrompt) {
        requestData.system = systemPrompt;
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
      );

      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk) => {
          buffer += chunk.toString();
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                
                if (data.response) {
                  fullResponse += data.response;
                  streamCallback(data.response, data.done, data);
                }

                if (data.done) {
                  isDone = true;
                  metadata = {
                    model: data.model,
                    totalDuration: data.total_duration,
                    loadDuration: data.load_duration,
                    promptEvalCount: data.prompt_eval_count,
                    promptEvalDuration: data.prompt_eval_duration,
                    evalCount: data.eval_count,
                    evalDuration: data.eval_duration,
                    context: data.context
                  };
                }
              } catch (parseError) {
                console.error('Error parsing Ollama response:', parseError);
                console.error('Raw line:', line);
              }
            }
          }
        });

        response.data.on('end', () => {
          if (!isDone) {
            reject(new Error('Stream ended without completion'));
          } else {
            resolve({
              success: true,
              fullResponse,
              metadata
            });
          }
        });

        response.data.on('error', (error) => {
          reject(new Error(`Stream error: ${error.message}`));
        });

        // Handle timeout
        const timeoutId = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, this.timeout);
      });

    } catch (error) {
      console.error('Ollama generation error:', error);
      
      // Provide fallback response
      const fallbackResponse = this.getFallbackResponse(prompt);
      streamCallback(fallbackResponse, true);
      
      return {
        success: false,
        fullResponse: fallbackResponse,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Load a model into Ollama
   * @param {string} modelName - Name of the model to load
   */
  async loadModel(modelName) {
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
      );

      return {
        success: true,
        message: `Model ${modelName} loaded successfully`
      };
    } catch (error) {
      console.error(`Error loading model ${modelName}:`, error);
      
      return {
        success: false,
        message: `Failed to load model ${modelName}`,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Check Ollama service status and available models
   */
  async checkOllamaStatus() {
    try {
      // Check if Ollama is running
      const healthResponse = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });

      const models = healthResponse.data.models || [];
      
      return {
        connected: true,
        models,
        defaultModel: this.defaultModel,
        baseUrl: this.baseUrl
      };
    } catch (error) {
      console.error('Ollama status check failed:', error);
      
      return {
        connected: false,
        models: [],
        defaultModel: this.defaultModel,
        baseUrl: this.baseUrl
      };
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 10000
      });

      return response.data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  /**
   * Pull a model from Ollama registry
   * @param {string} modelName - Name of the model to pull
   */
  async pullModel(modelName) {
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
      );

      return {
        success: true,
        message: `Model ${modelName} pulled successfully`
      };
    } catch (error) {
      console.error(`Error pulling model ${modelName}:`, error);
      
      return {
        success: false,
        message: `Failed to pull model ${modelName}`,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Delete a model from Ollama
   * @param {string} modelName - Name of the model to delete
   */
  async deleteModel(modelName) {
    try {
      const response = await axios.delete(`${this.baseUrl}/api/delete`, {
        data: { name: modelName },
        timeout: 30000
      });

      return {
        success: true,
        message: `Model ${modelName} deleted successfully`
      };
    } catch (error) {
      console.error(`Error deleting model ${modelName}:`, error);
      
      return {
        success: false,
        message: `Failed to delete model ${modelName}`,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Generate a non-streaming response (for simple use cases)
   * @param {string} prompt - The user prompt
   * @param {string|null} systemPrompt - Optional system prompt
   * @param {Object} options - Generation options
   */
  async generateSimpleResponse(
    prompt,
    systemPrompt = null,
    options = {}
  ) {
    const { model = this.defaultModel, temperature = 0.7, maxTokens = 2048 } = options;

    try {
      const requestData = {
        model,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens
        }
      };

      if (systemPrompt) {
        requestData.system = systemPrompt;
      }

      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        requestData,
        {
          timeout: this.timeout
        }
      );

      return {
        success: true,
        response: response.data.response || '',
        metadata: {
          model: response.data.model,
          totalDuration: response.data.total_duration,
          evalCount: response.data.eval_count
        }
      };
    } catch (error) {
      console.error('Simple generation error:', error);
      
      return {
        success: false,
        response: this.getFallbackResponse(prompt),
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Provide fallback response when Ollama is unavailable
   * @param {string} prompt - Original prompt
   */
  getFallbackResponse(prompt) {
    const fallbackResponses = [
      "I'm currently unable to connect to the AI service. Please check if Ollama is running and try again.",
      "The AI service is temporarily unavailable. Please ensure Ollama is running on localhost:11434.",
      "I apologize, but I cannot process your request right now. Please verify your Ollama installation and connection.",
      "The AI model is not responding. Please check your Ollama service status and try again later."
    ];

    // Simple keyword-based fallback responses
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('code') || lowerPrompt.includes('program')) {
      return "I'd be happy to help with coding, but I'm currently unable to connect to the AI service. Please check if Ollama is running and try again.";
    }
    
    if (lowerPrompt.includes('explain') || lowerPrompt.includes('what')) {
      return "I'd like to explain that, but I'm currently unable to connect to the AI service. Please check if Ollama is running and try again.";
    }
    
    if (lowerPrompt.includes('create') || lowerPrompt.includes('make')) {
      return "I'd be happy to help create that, but I'm currently unable to connect to the AI service. Please check if Ollama is running and try again.";
    }

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.defaultModel) this.defaultModel = config.defaultModel;
    if (config.timeout) this.timeout = config.timeout;
    if (config.retryAttempts) this.retryAttempts = config.retryAttempts;
    if (config.retryDelay) this.retryDelay = config.retryDelay;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay
    };
  }
}

// Create singleton instance
const ollamaConnector = new OllamaConnector();

// Export both the class and singleton instance
module.exports = {
  OllamaConnector,
  ollamaConnector,
  default: ollamaConnector
};

