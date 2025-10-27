export interface Agent {
  execute(action: string, payload: any): Promise<string>
}

export interface Memory {
  role: 'user' | 'assistant' | 'system'
  content: string
  userId?: string
  timestamp: number
}

export interface FileOperationResult {
  success: boolean
  message: string
  data?: any
}

export interface ChatResult {
  response: string
  tokens?: number
  latency?: number
}

export interface TerminalResult {
  success: boolean
  stdout?: string
  stderr?: string
  exitCode?: number
}

