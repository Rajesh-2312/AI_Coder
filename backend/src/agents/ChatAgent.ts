import { AgentStatus } from './WebSocketAgent'

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  context?: any
}

export interface ChatResponse {
  content: string
  suggestions?: string[]
  codeExamples?: string[]
  relatedTopics?: string[]
}

export class ChatAgent {
  private status: AgentStatus
  private conversationHistory: ChatMessage[] = []

  constructor() {
    this.status = {
      name: 'ChatAgent',
      status: 'active',
      lastActivity: new Date(),
      connections: 0
    }
  }

  async processMessage(message: string, context?: any): Promise<ChatResponse> {
    this.status.lastActivity = new Date()
    
    try {
      // Add user message to history
      const userMessage: ChatMessage = {
        id: this.generateId(),
        content: message,
        sender: 'user',
        timestamp: new Date(),
        context
      }
      this.conversationHistory.push(userMessage)

      // Process the message and generate response
      const response = await this.generateResponse(message, context)
      
      // Add AI response to history
      const aiMessage: ChatMessage = {
        id: this.generateId(),
        content: response.content,
        sender: 'ai',
        timestamp: new Date()
      }
      this.conversationHistory.push(aiMessage)

      return response
    } catch (error) {
      console.error('Chat processing error:', error)
      throw new Error('Failed to process chat message')
    }
  }

  private async generateResponse(message: string, context?: any): Promise<ChatResponse> {
    const lowerMessage = message.toLowerCase()
    
    // Simple rule-based responses (in production, this would integrate with AI models)
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return {
        content: 'Hello! I\'m your AI coding assistant. I can help you with code analysis, debugging, suggestions, and more. What would you like to work on?',
        suggestions: [
          'Analyze my code for issues',
          'Help me debug an error',
          'Suggest code improvements',
          'Explain how this code works'
        ]
      }
    }
    
    if (lowerMessage.includes('error') || lowerMessage.includes('bug')) {
      return {
        content: 'I can help you debug issues! Please share the error message or describe the problem you\'re experiencing. I can analyze your code and suggest solutions.',
        suggestions: [
          'Share the error message',
          'Show me the problematic code',
          'Explain what you expected vs what happened'
        ]
      }
    }
    
    if (lowerMessage.includes('optimize') || lowerMessage.includes('improve')) {
      return {
        content: 'I can help optimize your code! Share the code you\'d like to improve, and I\'ll analyze it for performance, readability, and best practices.',
        suggestions: [
          'Share the code to optimize',
          'Focus on performance improvements',
          'Improve code readability',
          'Apply best practices'
        ]
      }
    }
    
    if (lowerMessage.includes('explain') || lowerMessage.includes('how')) {
      return {
        content: 'I\'d be happy to explain! Please share the code you\'d like me to explain, and I\'ll break it down step by step.',
        suggestions: [
          'Share the code to explain',
          'Ask about specific functions',
          'Understand the overall flow',
          'Learn about design patterns'
        ]
      }
    }
    
    if (lowerMessage.includes('typescript') || lowerMessage.includes('javascript')) {
      return {
        content: 'I can help with TypeScript and JavaScript! I can assist with type definitions, modern syntax, best practices, and more.',
        codeExamples: [
          '// TypeScript interface example\ninterface User {\n  id: number;\n  name: string;\n  email: string;\n}',
          '// Modern JavaScript with async/await\nasync function fetchUser(id) {\n  const response = await fetch(`/api/users/${id}`);\n  return response.json();\n}'
        ],
        suggestions: [
          'Add type definitions',
          'Convert to TypeScript',
          'Use modern syntax',
          'Apply best practices'
        ]
      }
    }
    
    if (lowerMessage.includes('react') || lowerMessage.includes('component')) {
      return {
        content: 'I can help with React development! I can assist with components, hooks, state management, performance optimization, and more.',
        codeExamples: [
          '// React functional component with hooks\nfunction UserProfile({ userId }) {\n  const [user, setUser] = useState(null);\n  \n  useEffect(() => {\n    fetchUser(userId).then(setUser);\n  }, [userId]);\n  \n  return <div>{user?.name}</div>;\n}',
          '// Custom hook example\nfunction useApi(url) {\n  const [data, setData] = useState(null);\n  const [loading, setLoading] = useState(true);\n  \n  useEffect(() => {\n    fetch(url)\n      .then(res => res.json())\n      .then(setData)\n      .finally(() => setLoading(false));\n  }, [url]);\n  \n  return { data, loading };\n}'
        ],
        suggestions: [
          'Create a new component',
          'Optimize performance',
          'Manage state properly',
          'Use custom hooks'
        ]
      }
    }
    
    // Default response
    return {
      content: 'I understand you\'re looking for help with your code. I can assist with analysis, debugging, optimization, explanations, and more. Please share your code or describe what you\'d like to work on!',
      suggestions: [
        'Share your code for analysis',
        'Ask about specific programming concepts',
        'Get help with debugging',
        'Learn about best practices'
      ]
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory]
  }

  clearHistory(): void {
    this.conversationHistory = []
  }

  getStatus(): AgentStatus {
    return { ...this.status }
  }
}

