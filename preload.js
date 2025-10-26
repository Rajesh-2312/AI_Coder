const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  
  // File operations
  saveFile: (filePath, content) => ipcRenderer.invoke('file:save', filePath, content),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  
  // Menu events
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:new-file', callback)
    ipcRenderer.on('menu:open-file', callback)
    ipcRenderer.on('menu:save-file', callback)
  },
  
  // AI events
  onAIAction: (callback) => {
    ipcRenderer.on('ai:analyze-code', callback)
    ipcRenderer.on('ai:generate-code', callback)
    ipcRenderer.on('ai:open-chat', callback)
  },
  
  // Setup functionality
  checkSetupStatus: () => ipcRenderer.invoke('setup:check-status'),
  startSetup: (callback) => {
    ipcRenderer.invoke('setup:start').catch(console.error)
    ipcRenderer.on('setup:progress', (event, progress) => callback(progress))
    ipcRenderer.on('setup:complete', () => callback({ stage: 'complete', message: 'Setup complete!' }))
    ipcRenderer.on('setup:error', (event, error) => callback({ stage: 'error', message: error }))
  },
  retrySetup: () => ipcRenderer.invoke('setup:retry'),
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

