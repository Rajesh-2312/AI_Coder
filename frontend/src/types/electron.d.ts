// Type declarations for Electron API
declare global {
  interface Window {
    electronAPI: {
      // App info
      getVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      
      // File operations
      saveFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
      readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
      
      // Menu events
      onMenuAction: (callback: (event: any, data: any) => void) => void
      
      // AI events
      onAIAction: (callback: (event: any, data: any) => void) => void
      
      // Remove listeners
      removeAllListeners: (channel: string) => void
    }
  }
}

export {}

