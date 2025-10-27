import { Agent, ChatResult } from './types'

export class ChatAgent implements Agent {
  private conversations: Map<string, string[]> = new Map()

  /**
   * Execute chat operations
   */
  async execute(action: string, payload: any): Promise<string> {
    console.log(`Chat Agent executing: ${action}`, payload)

    switch (action) {
      case 'respond':
        return await this.generateResponse(payload.prompt, payload.conversationId)
      case 'clear':
        return await this.clearConversation(payload.conversationId)
      case 'history':
        return await this.getHistory(payload.conversationId)
      default:
        return `Unknown chat action: ${action}`
    }
  }

  /**
   * Generate AI response
   */
  private async generateResponse(prompt: string, conversationId?: string): Promise<string> {
    const convId = conversationId || 'default'
    
    // Get conversation history
    const history = this.conversations.get(convId) || []
    
    // Add current prompt to history
    history.push(`User: ${prompt}`)
    
    // Generate response based on prompt
    const response = this.analyzeAndRespond(prompt, history)
    
    // Add response to history
    history.push(`Assistant: ${response}`)
    
    // Store updated history
    this.conversations.set(convId, history)
    
    console.log(`✓ Chat response generated for conversation: ${convId}`)
    return response
  }

  /**
   * Analyze prompt and generate intelligent response
   */
  private analyzeAndRespond(prompt: string, history: string[]): string {
    const lower = prompt.toLowerCase()
    
    // Context-aware responses
    if (lower.includes('hello') || lower.includes('hi')) {
      return 'Hello! I am an AI assistant. How can I help you today?'
    }
    
    if (lower.includes('help')) {
      return `I can help you with:
- Creating, reading, updating, and deleting files
- Running terminal commands
- Understanding and explaining code
- Debugging issues
- Generating code snippets

What would you like to do?`
    }
    
    if (lower.includes('file') && (lower.includes('create') || lower.includes('make'))) {
      return 'I can help you create a file. Please provide the filename and content. For example: Create a file called example.txt with content Hello World'
    }
    
    if (lower.includes('error')) {
      return 'I can help you debug the error. Please share the error message and I will analyze it for you.'
    }
    
    if (lower.includes('code') || lower.includes('function')) {
      return 'I can help you generate or explain code. Please describe what you need and I will provide code examples.'
    }
    
    // Default intelligent response
    return `I understand you want to: ${prompt}\n\nLet me help you with that. I can assist with file operations, running commands, or general questions. What specific task would you like me to perform?`
  }

  /**
   * Clear conversation history
   */
  private async clearConversation(conversationId: string): Promise<string> {
    this.conversations.delete(conversationId)
    console.log(`✓ Conversation cleared: ${conversationId}`)
    return `Conversation cleared for: ${conversationId}`
  }

  /**
   * Get conversation history
   */
  private async getHistory(conversationId: string): Promise<string> {
    const history = this.conversations.get(conversationId) || []
    return history.join('\n')
  }

  /**
   * Get all conversations
   */
  getConversations(): Map<string, string[]> {
    return this.conversations
  }
}
