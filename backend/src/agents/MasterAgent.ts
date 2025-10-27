import { Agent, Memory } from './types'
import { FileAgent } from './FileAgent'
import { ChatAgent } from './ChatAgent'
import { TerminalAgent } from './TerminalAgent'

export class MasterAgent {
  private fileAgent: FileAgent
  private chatAgent: ChatAgent
  private terminalAgent: TerminalAgent
  private memory: Memory[]

  constructor() {
    this.fileAgent = new FileAgent()
    this.chatAgent = new ChatAgent()
    this.terminalAgent = new TerminalAgent()
    this.memory = []
  }

  /**
   * Process user prompt and route to appropriate agents
   */
  async processPrompt(prompt: string, userId?: string): Promise<string> {
    console.log('Master Agent received prompt:', prompt)

    // Store in memory
    this.addToMemory('user', prompt, userId)

    // Analyze and optimize the prompt
    const optimizedPrompt = await this.optimizePrompt(prompt)
    this.addToMemory('system', `Optimized: ${optimizedPrompt}`, userId)

    // Route to appropriate agent(s)
    const tasks = await this.routeTasks(optimizedPrompt)

    // Execute tasks in parallel where possible
    const results = await this.executeTasks(tasks)

    // Combine results
    const finalResult = this.combineResults(results)

    // Store result in memory
    this.addToMemory('assistant', finalResult, userId)

    return finalResult
  }

  /**
   * Optimize user prompt before processing
   */
  private async optimizePrompt(prompt: string): Promise<string> {
    // Extract intent
    const lowerPrompt = prompt.toLowerCase()

    // Detect keywords and context
    const keywords = this.extractKeywords(prompt)
    
    // Add context from memory
    const recentContext = this.getRecentContext(3)
    
    // Optimize prompt structure
    let optimized = `User wants to: ${this.detectIntent(prompt)}\n\n`
    
    if (keywords.length > 0) {
      optimized += `Keywords: ${keywords.join(', ')}\n\n`
    }

    if (recentContext.length > 0) {
      optimized += `Recent context:\n${recentContext.map(c => `- ${c.type}: ${c.content.substring(0, 50)}...`).join('\n')}\n\n`
    }

    optimized += `Original prompt: ${prompt}`

    return optimized
  }

  /**
   * Extract keywords from prompt
   */
  private extractKeywords(prompt: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'])
    const words = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    return [...new Set(words.filter(w => !stopWords.has(w)))]
  }

  /**
   * Detect intent from prompt
   */
  private detectIntent(prompt: string): string {
    const lower = prompt.toLowerCase()
    
    if (lower.includes('create') || lower.includes('make') || lower.includes('build')) {
      return 'Create something new'
    } else if (lower.includes('read') || lower.includes('show') || lower.includes('display') || lower.includes('view')) {
      return 'Read or view content'
    } else if (lower.includes('update') || lower.includes('modify') || lower.includes('edit') || lower.includes('change')) {
      return 'Update existing content'
    } else if (lower.includes('delete') || lower.includes('remove')) {
      return 'Delete content'
    } else if (lower.includes('run') || lower.includes('execute') || lower.includes('command')) {
      return 'Execute command'
    } else if (lower.includes('install') || lower.includes('npm')) {
      return 'Install dependencies'
    } else if (lower.includes('chat') || lower.includes('ask') || lower.includes('help')) {
      return 'Chat or ask question'
    }
    
    return 'Perform general operation'
  }

  /**
   * Route tasks to appropriate agents
   */
  private async routeTasks(prompt: string): Promise<Array<{agent: string, action: string, payload: any}>> {
    const lower = prompt.toLowerCase()
    const tasks: Array<{agent: string, action: string, payload: any}> = []

    // File operations
    if (lower.includes('create file') || lower.includes('make file') || lower.includes('new file')) {
      const filename = this.extractFilename(prompt)
      const content = this.extractFileContent(prompt)
      tasks.push({
        agent: 'file',
        action: 'create',
        payload: { path: filename, content: content }
      })
    }

    if (lower.includes('read file') || lower.includes('open file') || lower.includes('view file')) {
      const filename = this.extractFilename(prompt)
      tasks.push({
        agent: 'file',
        action: 'read',
        payload: { path: filename }
      })
    }

    if (lower.includes('update file') || lower.includes('edit file') || lower.includes('modify file')) {
      const filename = this.extractFilename(prompt)
      const content = this.extractFileContent(prompt)
      tasks.push({
        agent: 'file',
        action: 'update',
        payload: { path: filename, content: content }
      })
    }

    if (lower.includes('delete file') || lower.includes('remove file')) {
      const filename = this.extractFilename(prompt)
      tasks.push({
        agent: 'file',
        action: 'delete',
        payload: { path: filename }
      })
    }

    // Terminal operations
    if (lower.includes('run') || lower.includes('execute') || lower.includes('npm') || lower.includes('install') || lower.includes('build')) {
      const command = this.extractCommand(prompt)
      if (command) {
        tasks.push({
          agent: 'terminal',
          action: 'execute',
          payload: { command: command }
        })
      }
    }

    // Chat operations (always add as fallback)
    tasks.push({
      agent: 'chat',
      action: 'respond',
      payload: { prompt: prompt }
    })

    return tasks
  }

  /**
   * Extract filename from prompt
   */
  private extractFilename(prompt: string): string {
    const match = prompt.match(/['"]?([\w\/\.\-]+\.\w+)['"]?/i)
    return match ? match[1] : 'new-file.txt'
  }

  /**
   * Extract file content from prompt
   */
  private extractFileContent(prompt: string): string {
    const lines = prompt.split('\n')
    const codeBlockMatch = prompt.match(/```[\w]*\n([\s\S]*?)\n```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1]
    }
    
    // Try to find content after 'with content:' or similar
    const contentMatch = prompt.match(/(?:with|containing|content).*?:\s*(.+)/i)
    return contentMatch ? contentMatch[1] : '// New file content'
  }

  /**
   * Extract command from prompt
   */
  private extractCommand(prompt: string): string | null {
    const matches = [
      prompt.match(/run\s+['"]?(.+?)['"]?$/i),
      prompt.match(/execute\s+['"]?(.+?)['"]?$/i),
      prompt.match(/command\s+['"]?(.+?)['"]?$/i),
      prompt.match(/['"]?([\w\s]+\s+npm\s+[\w\s]+)['"]?/i),
      prompt.match(/['"]?(npm\s+[\w\s]+)['"]?/i)
    ]

    for (const match of matches) {
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }

  /**
   * Execute tasks with appropriate agents
   */
  private async executeTasks(tasks: Array<{agent: string, action: string, payload: any}>): Promise<string[]> {
    const results: string[] = []

    for (const task of tasks) {
      try {
        let result: string

        switch (task.agent) {
          case 'file':
            result = await this.fileAgent.execute(task.action, task.payload)
            break
          case 'chat':
            result = await this.chatAgent.execute(task.action, task.payload)
            break
          case 'terminal':
            result = await this.terminalAgent.execute(task.action, task.payload)
            break
          default:
            result = `Unknown agent: ${task.agent}`
        }

        results.push(result)
      } catch (error) {
        results.push(`Error in ${task.agent} agent: ${error}`)
      }
    }

    return results
  }

  /**
   * Combine results from multiple agents
   */
  private combineResults(results: string[]): string {
    if (results.length === 0) {
      return 'No results to combine'
    }

    if (results.length === 1) {
      return results[0]
    }

    return `Task completed successfully.\n\nResults:\n${results.map((r, i) => `${i + 1}. ${r}`).join('\n\n')}`
  }

  /**
   * Add to memory
   */
  private addToMemory(role: 'user' | 'assistant' | 'system', content: string, userId?: string): void {
    this.memory.push({
      role,
      content,
      userId: userId || 'system',
      timestamp: Date.now()
    })

    // Keep only last 50 memories
    if (this.memory.length > 50) {
      this.memory.shift()
    }
  }

  /**
   * Get recent context from memory
   */
  private getRecentContext(count: number): Memory[] {
    return this.memory.slice(-count)
  }

  /**
   * Get all memory
   */
  getMemory(): Memory[] {
    return [...this.memory]
  }

  /**
   * Clear memory
   */
  clearMemory(): void {
    this.memory = []
  }
}

