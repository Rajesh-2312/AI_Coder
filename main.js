const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
const { spawn } = require('child_process')

// Import setup service (will be available after backend build)
// const { setupService } = require('./backend/dist/services/setupService')

// Keep a global reference of the window object
let mainWindow
let backendProcess
let setupInProgress = false

// Enable live reload for development
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  })
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Create application menu
  createMenu()
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:new-file')
          }
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'All Files', extensions: ['*'] },
                { name: 'JavaScript', extensions: ['js', 'jsx'] },
                { name: 'TypeScript', extensions: ['ts', 'tsx'] },
                { name: 'Python', extensions: ['py'] },
                { name: 'Text', extensions: ['txt', 'md'] }
              ]
            })
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu:open-file', result.filePaths[0])
            }
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:save-file')
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'AI',
      submenu: [
        {
          label: 'Analyze Code',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            mainWindow.webContents.send('ai:analyze-code')
          }
        },
        {
          label: 'Generate Code',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => {
            mainWindow.webContents.send('ai:generate-code')
          }
        },
        {
          label: 'Chat Assistant',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow.webContents.send('ai:open-chat')
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About AI-Coder',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About AI-Coder',
              message: 'AI-Coder v1.0.0',
              detail: 'An AI-powered code editor built with Electron, React, and Node.js'
            })
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/ai-coder/docs')
          }
        }
      ]
    }
  ]

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function startBackend() {
  if (isDev) {
    // In development, assume backend is already running
    console.log('Development mode: Backend should be running separately')
    return
  }

  // In production, start the backend
  const backendPath = path.join(__dirname, 'backend', 'dist', 'index.js')
  backendProcess = spawn('node', [backendPath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, 'backend')
  })

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err)
  })

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`)
  })
}

// App event handlers
app.whenReady().then(() => {
  createWindow()
  startBackend()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
})

// IPC handlers
ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})

ipcMain.handle('app:get-platform', () => {
  return process.platform
})

ipcMain.handle('file:save', async (event, filePath, content) => {
  try {
    const fs = require('fs').promises
    await fs.writeFile(filePath, content, 'utf8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('file:read', async (event, filePath) => {
  try {
    const fs = require('fs').promises
    const content = await fs.readFile(filePath, 'utf8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Setup IPC handlers (commented out for development - will be enabled after backend build)
/*
ipcMain.handle('setup:check-status', async () => {
  try {
    return await setupService.checkSetupStatus()
  } catch (error) {
    console.error('Setup check failed:', error)
    return { isFirstLaunch: true, modelExists: false, setupComplete: false, error: error.message }
  }
})

ipcMain.handle('setup:start', async () => {
  if (setupInProgress) {
    return { success: false, message: 'Setup already in progress' }
  }
  
  setupInProgress = true
  
  try {
    await setupService.performSetup((progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('setup:progress', progress)
      }
    })
    
    setupInProgress = false
    if (mainWindow) {
      mainWindow.webContents.send('setup:complete')
    }
    
    return { success: true }
  } catch (error) {
    setupInProgress = false
    if (mainWindow) {
      mainWindow.webContents.send('setup:error', error.message)
    }
    return { success: false, error: error.message }
  }
})

ipcMain.handle('setup:retry', async () => {
  setupInProgress = false
  return await setupService.performSetup((progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('setup:progress', progress)
    }
  })
})
*/

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})

