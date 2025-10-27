import React, { useState, useEffect, useRef } from 'react'
import { aiService } from './services/aiService'
import { trainingService } from './services/trainingService'
import TrainingPanel from './components/TrainingPanel'
import { useAuth } from './context/AuthContext'
import { AuthModal } from './components/Auth/AuthModal'
import { UserProfileDropdown } from './components/UserProfileDropdown'
import { ModelDownloadModal } from './components/ModelDownloadModal'
import { modelDownloadService } from './services/modelDownloadService'
import { FileExplorer } from './components/FileExplorer'
import { aiProjectManager } from './services/aiProjectManager'
import SimpleCodeEditor from './components/SimpleCodeEditor'

function App() {
  const [activeFile, setActiveFile] = useState('App.tsx')
  const [codeContent, setCodeContent] = useState(`// Welcome to AI-Coder!
// Start coding with AI assistance

function hello() {
  console.log("Hello, AI-Coder!");
}

export default hello;`)
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'ai', content: "Hello! I'm your AI coding assistant. I can help you create complete projects like web applications, tools, and more! Try asking me to 'Create a todo app' or 'Build a calculator'." },
    { id: 2, type: 'user', content: "Can you help me create a project?" },
    { id: 3, type: 'ai', content: "Absolutely! I can create complete projects with React components, styling, and functionality. Just tell me what you want to build and I'll create all the necessary files for you!" }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [terminalOutput, setTerminalOutput] = useState([
    '$ npm run dev',
    '✓ Development server running on port 5174',
    '✓ AI-Coder ready for development',
    '$ Ready for commands...'
  ])
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentCommand, setCurrentCommand] = useState('')
  const [isTypingCommand, setIsTypingCommand] = useState(false)
  const [isAIActive, setIsAIActive] = useState(false)
  const [showTrainingPanel, setShowTrainingPanel] = useState(false)
  const [runningProjectUrl, setRunningProjectUrl] = useState<string | null>(null)
  const [runningProjectName, setRunningProjectName] = useState<string | null>(null)
  const [showModelDownload, setShowModelDownload] = useState(false)
  const [modelDownloaded, setModelDownloaded] = useState(false)

  // Refs for auto-scrolling
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Panel sizes state
  const [panelSizes, setPanelSizes] = useState({
    fileExplorer: 20, // percentage
    editor: 60,      // percentage
    chat: 20         // percentage
  })
  const [terminalHeight, setTerminalHeight] = useState(25) // percentage

  // Drag state
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const addAIMessage = (content: string, messageType: 'ai' | 'system' | 'agent' = 'ai') => {
    const message = { id: Date.now(), type: messageType, content }
    setChatMessages(prev => [...prev, message])
  }

  const addSystemMessage = (content: string) => {
    addAIMessage(`SYSTEM: ${content}`, 'system')
  }

  const addAgentMessage = (agentName: string, action: string, details?: string) => {
    const message = `AGENT [${agentName}]: ${action}${details ? ` - ${details}` : ''}`
    addAIMessage(message, 'agent')
  }

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

  // Auto-scroll terminal to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput, currentCommand])

  // Check if model is downloaded when component mounts
  useEffect(() => {
    const checkModel = async () => {
      const exists = await modelDownloadService.checkModelExists()
      if (exists) {
        setModelDownloaded(true)
        setShowModelDownload(false)
      } else {
        setShowModelDownload(true)
      }
    }
    checkModel()
  }, [])

  // Listen for terminal output from AI agent
  useEffect(() => {
    const handleTerminalOutput = (event: CustomEvent) => {
      const output = event.detail.output
      if (output) {
        setTerminalOutput(prev => [...prev, output])
        
        // Auto-detect and fix errors
        if (output.includes('error') || output.includes('Error') || output.includes('failed')) {
          autoFixErrors()
        }
      }
    }

    window.addEventListener('terminalOutput', handleTerminalOutput as EventListener)
    return () => window.removeEventListener('terminalOutput', handleTerminalOutput as EventListener)
  }, [])

  const autoFixErrors = async () => {
    // Wait a bit to collect all errors
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const { aiErrorFixer } = await import('./services/aiErrorFixer')
    
    addSystemMessage(`AI Agent: Analyzing terminal output for errors...`)
    addAIMessage(`Detecting errors and querying AI model for solutions...`)
    
    try {
      // Get AI-powered fixes
      const fixes = await aiErrorFixer.detectAndFix(terminalOutput)
      
      if (fixes.length > 0) {
        addSystemMessage(`AI Agent: Found ${fixes.length} fix(es) - Executing...`)
        
        let fixedCount = 0
        for (const fix of fixes) {
          addAIMessage(`Applying fix: ${fix.description} (confidence: ${Math.round(fix.confidence * 100)}%)`)
          
          const result = await aiErrorFixer.executeFix(fix)
          
          if (result.success) {
            fixedCount++
            addSystemMessage(`Success: ${fix.description}`)
          } else {
            addSystemMessage(`Failed: ${fix.description} - ${result.output}`)
          }
          
          // Dispatch to terminal
          window.dispatchEvent(new CustomEvent('terminalOutput', {
            detail: { output: result.success ? `✓ Fixed: ${fix.description}` : `✗ Failed: ${fix.description}` }
          }))
        }
        
        if (fixedCount > 0) {
          addAIMessage(`✅ Successfully applied ${fixedCount} fix(es)! Retrying build...`)
        } else {
          addAIMessage(`❌ Unable to auto-fix errors. Please review terminal output.`)
        }
      } else {
        addAIMessage(`No automatic fixes available. Review the errors above.`)
      }
    } catch (error) {
      addSystemMessage(`Auto-fix error: ${error}`)
      addAIMessage(`Failed to generate fixes. ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const addTerminalOutput = (content: string) => {
    setTerminalOutput(prev => [...prev, content])
  }

  const handleClearChat = () => {
    setChatMessages([
      { id: 1, type: 'ai', content: "Hello! I'm your AI coding assistant. I can help you create complete projects like web applications, tools, and more! Try asking me to 'Create a todo app' or 'Build a calculator'." }
    ])
  }

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      const userMessage = { id: Date.now(), type: 'user', content: newMessage }
      setChatMessages(prev => [...prev, userMessage])
      
      const message = newMessage.trim()
      setNewMessage('')
      
      // Check if this is a training request
      if (message.toLowerCase().includes('train') || message.toLowerCase().includes('teach')) {
        addAgentMessage('Training Agent', 'Initializing training session', 'Model learning mode')
        addSystemMessage('Model: AI-Coder Training System v1.0')
        addAIMessage(`🎓 Training mode activated! I'll learn from this interaction.`)
        
        // Try to generate a plan first to see if we have a matching example
        try {
          const planResult = await trainingService.generateAgentPlan(message)
          
          if (planResult.success && planResult.example) {
            addAIMessage(`📚 Found existing training example: "${planResult.example.userInput}"`)
            addAIMessage(`🎯 Confidence: ${Math.round((planResult.confidence || 0) * 100)}%`)
            addAIMessage(`💡 This will help me improve my responses for similar requests!`)
          } else {
            addAIMessage(`🆕 This is a new pattern! I'll create a training example for future reference.`)
          }
          
          // Quick train the model with this interaction
          const trainResult = await trainingService.quickTrain(message, 1.0)
          if (trainResult.success) {
            addAIMessage(`✅ ${trainResult.message}`)
          }
        } catch (error) {
          addAIMessage(`❌ Training failed: ${error}`)
        }
        return
      }
      
      // Check if this is a project creation request
      if (message.toLowerCase().includes('create') || message.toLowerCase().includes('build') || message.toLowerCase().includes('make')) {
        setIsAIActive(true)
        
        // Show AI model and agent activity
        addSystemMessage('AI Model: Project Generator v1.0')
        addAgentMessage('Project Agent', 'Initializing agent system', 'Loading AI capabilities')
        addAIMessage(`🤖 Starting AI Agent to execute: "${message}"`)
        
        // Dispatch AI task start event
        window.dispatchEvent(new CustomEvent('aiTaskUpdate', {
          detail: { status: 'executing', task: message }
        }))
        
        try {
          // First, try to get a trained plan for this request
          const planResult = await trainingService.generateAgentPlan(message)
          
          if (planResult.success && planResult.plan && planResult.confidence && planResult.confidence > 0.7) {
            addAIMessage(`🎯 Using trained model (${Math.round(planResult.confidence * 100)}% confidence)`)
            addAIMessage(`📚 Found matching pattern: "${planResult.example?.userInput}"`)
            
            // Use the trained plan to execute the project
            await executeTrainedPlan(planResult.plan, message)
          } else {
            // Try AI agent for any project
            try {
              const aiAgent = await import('./services/aiAgent')
              await aiAgent.aiAgent.executeTask(message)
            } catch (agentError) {
              console.error('AI Agent error:', agentError)
              // Fallback to generic AI response
              const response = await aiService.generateCode(message)
              if (response.success) {
                addAIMessage(response.content)
              } else {
                addAIMessage(`❌ AI Error: ${response.error}`)
              }
            }
          }
        } catch (error) {
          addAIMessage(`❌ Failed to execute task: ${error}`)
        } finally {
          setIsAIActive(false)
          
          // Dispatch AI task completion event
          window.dispatchEvent(new CustomEvent('aiTaskUpdate', {
            detail: { status: 'completed', task: message }
          }))
          
          // Refresh file explorer after AI task completion
          window.dispatchEvent(new CustomEvent('fileExplorerRefresh'))
        }
      } else {
        // Regular AI chat
        try {
          const response = await aiService.generateCode(message)
          if (response.success) {
            addAIMessage(response.content)
        } else {
            addAIMessage(`❌ AI Error: ${response.error}`)
        }
      } catch (error) {
          addAIMessage(`❌ Failed to get AI response: ${error}`)
        }
      }
    }
  }

  const executeTrainedPlan = async (plan: any, userInput: string) => {
    try {
      addAIMessage(`🎯 Executing trained plan for: "${userInput}"`)
      addAIMessage(`📋 Project Type: ${plan.projectType}`)
      addAIMessage(`🛠️ Technologies: ${plan.technologies.join(', ')}`)
      
      // Execute file operations
      for (const fileOp of plan.files || []) {
        addAIMessage(`📄 ${fileOp.reason}`)
        
        const success = await aiService.createFile(fileOp.path, fileOp.content)
        
        if (success) {
          addAIMessage(`✅ Created: ${fileOp.path}`)
          
          // Dispatch file creation event for real-time file explorer updates
          window.dispatchEvent(new CustomEvent('fileCreated', {
            detail: { filePath: fileOp.path }
          }))
        } else {
          addAIMessage(`❌ Failed to create: ${fileOp.path}`)
        }
      }
      
      // Execute commands
      for (const command of plan.commands || []) {
        addTerminalOutput(`$ ${command.command}`)
        addAIMessage(`🔧 ${command.description}`)
        
        const result = await aiService.executeCommand(
          command.command,
          command.workingDirectory || 'frontend',
          command.timeout || 30000,
          command.description
        )
        
        if (result.success) {
          addTerminalOutput(`✓ ${command.description} completed`)
          addAIMessage(`✅ ${command.description} - Success!`)
        } else {
          addTerminalOutput(`❌ ${command.description} failed`)
          addAIMessage(`⚠️ ${command.description} - Check terminal for details`)
        }
      }
      
      addAIMessage(`🎉 Project "${userInput}" completed using trained model!`)
      
      // Refresh file explorer
      window.dispatchEvent(new CustomEvent('fileExplorerRefresh'))
      
    } catch (error) {
      addAIMessage(`❌ Error executing trained plan: ${error}`)
    }
  }


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  const handleFileSelect = async (file: any) => {
    console.log('File selected:', file)
    // Normalize path (convert backslashes to forward slashes)
    const normalizedPath = file.path.replace(/\\/g, '/')
    setActiveFile(normalizedPath)
    try {
      // Load file content from backend
      const content = await aiService.getFileContent(normalizedPath)
      console.log('File content loaded, length:', content.length)
      console.log('First 200 chars:', content.substring(0, 200))
      setCodeContent(content)
    } catch (error) {
      console.error('Failed to load file content:', error)
      setCodeContent('// File not found or failed to load')
    }
  }

  const handleFileClick = (fileName: string) => {
    setActiveFile(fileName)
    if (fileName === 'App.tsx') {
      setCodeContent(`// Welcome to AI-Coder!
// Start coding with AI assistance

function hello() {
  console.log("Hello, AI-Coder!");
}

export default hello;`)
    } else if (fileName === 'index.css') {
      setCodeContent(`@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`)
    }
  }

  const runCommand = (command: string) => {
    if (!command.trim()) return // Don't run empty commands
    
    // Add command to history
    setCommandHistory(prev => [...prev, command])
    setHistoryIndex(-1)
    
    const newOutput = [...terminalOutput, `$ ${command}`]
    
    // Handle different commands
    switch (command.trim().toLowerCase()) {
      case 'ls':
      case 'dir':
        newOutput.push('src/  components/  App.tsx  index.css  package.json')
        break
      case 'pwd':
        newOutput.push('/home/user/ai-coder-project')
        break
      case 'npm run build':
        newOutput.push('🔨 Building frontend project...')
        newOutput.push('⚠️ Note: Build may fail due to TypeScript errors in AI-created files')
        newOutput.push('💡 Try "npm run dev" for development mode with error tolerance')
        break
      case 'npm run dev':
        newOutput.push('🚀 Starting frontend development server...')
        newOutput.push('✓ Frontend development server running')
        newOutput.push('🌐 Check your browser for the current URL')
        break
      case 'npm install':
        newOutput.push('✓ Dependencies installed successfully')
        break
      case 'help':
        newOutput.push('Available commands:')
        newOutput.push('  ls, dir - List files')
        newOutput.push('  pwd - Show current directory')
        newOutput.push('  npm run build - Build project')
        newOutput.push('  npm run dev - Start dev server')
        newOutput.push('  npm install - Install dependencies')
        newOutput.push('  build-status - Check build issues')
        newOutput.push('  clear - Clear terminal')
        newOutput.push('  help - Show this help')
        break
      case 'build-status':
        newOutput.push('🔍 Build Status Check:')
        newOutput.push('  Common issues with AI-created projects:')
        newOutput.push('  • TypeScript JSX errors - Files need proper TSX extension')
        newOutput.push('  • Missing imports - Check import statements')
        newOutput.push('  • Syntax errors - Verify React component syntax')
        newOutput.push('  • Port conflicts - Development server already running')
        newOutput.push('  💡 Solution: Use "npm run dev" for development mode')
        newOutput.push('  💡 Or fix TypeScript errors manually')
        newOutput.push('  📁 Commands run in frontend/ directory')
        break
      case 'clear':
        setTerminalOutput(['$ Terminal cleared'])
        return
      case 'whoami':
        newOutput.push('ai-coder-user')
        break
      case 'date':
        newOutput.push(new Date().toLocaleString())
        break
      case 'echo':
        const echoText = command.substring(5).trim()
        newOutput.push(echoText || '')
        break
      default:
        newOutput.push(`Command not found: ${command}`)
        newOutput.push('Type "help" for available commands')
    }
    
    setTerminalOutput(newOutput)
    setCurrentCommand('')
    setIsTypingCommand(false)
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, type: string) => {
    setIsDragging(type)
    setDragStart({ x: e.clientX, y: e.clientY })
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    if (isDragging === 'vertical') {
      // Terminal height adjustment - invert deltaY for correct direction
      const newHeight = Math.max(15, Math.min(50, terminalHeight - (deltaY / containerRect.height) * 100))
      setTerminalHeight(newHeight)
    } else if (isDragging === 'horizontal-left') {
      // File explorer width adjustment
      const newFileExplorerWidth = Math.max(15, Math.min(40, panelSizes.fileExplorer + (deltaX / containerRect.width) * 100))
      const newEditorWidth = Math.max(30, Math.min(70, panelSizes.editor - (deltaX / containerRect.width) * 100))
      
      setPanelSizes({
        fileExplorer: newFileExplorerWidth,
        editor: newEditorWidth,
        chat: panelSizes.chat
      })
    } else if (isDragging === 'horizontal-right') {
      // Chat panel width adjustment
      const newChatWidth = Math.max(15, Math.min(40, panelSizes.chat - (deltaX / containerRect.width) * 100))
      const newEditorWidth = Math.max(30, Math.min(70, panelSizes.editor + (deltaX / containerRect.width) * 100))
      
      setPanelSizes({
        fileExplorer: panelSizes.fileExplorer,
        editor: newEditorWidth,
        chat: newChatWidth
      })
    }

    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(null)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = isDragging === 'vertical' ? 'ns-resize' : 'ew-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }
  }, [isDragging, dragStart])

  // Show model download modal if model is not downloaded
  if (showModelDownload && !modelDownloaded) {
    return (
      <ModelDownloadModal
        onDownloadComplete={() => {
          setShowModelDownload(false)
          setModelDownloaded(true)
        }}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-[#cccccc]" ref={containerRef}>
                    {/* Top Menu Bar */}
      <div className="h-10 border-b border-[#3e3e42] bg-[#2d2d30] flex items-center px-4">
        <h1 className="text-sm font-medium text-[#cccccc] tracking-wide">AI-CODER</h1>
        {isAIActive && (
          <div className="ml-4 flex items-center gap-2 text-xs text-[#858585]">
            <span className="status-indicator status-active"></span>
            <span>AI Agent Working...</span>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button 
            onClick={() => setShowTrainingPanel(!showTrainingPanel)}
            className="btn btn-primary text-xs"
          >
            {showTrainingPanel ? 'Hide Training' : 'Training'}
          </button>
          <button 
            onClick={() => runCommand('npm run build')}
            className="btn btn-primary text-xs"
          >
            Build
          </button>
          <button className="btn text-xs">
            Settings
          </button>
          <button className="btn text-xs">
            Help
          </button>
          <UserProfileDropdown />
        </div>
      </div>
                    
                    {/* Main Layout */}
                    <div className="flex flex-1 overflow-hidden">
        {/* Training Panel Overlay */}
        {showTrainingPanel && (
          <div className="absolute inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="w-4/5 h-4/5 bg-white rounded-lg shadow-xl">
              <TrainingPanel onClose={() => setShowTrainingPanel(false)} />
            </div>
          </div>
        )}
        
        {/* Left: FileExplorer */}
        <div 
          className="panel flex flex-col"
          style={{ width: `${panelSizes.fileExplorer}%` }}
        >
          <FileExplorer 
            onFileSelect={handleFileSelect}
            selectedFile={activeFile}
          />
                      </div>
                      
        {/* Vertical Resizer */}
        <div
          className="w-1 resizer cursor-ew-resize"
          onMouseDown={(e) => handleMouseDown(e, 'horizontal-left')}
        />

        {/* Center: EditorPanel */}
        <div className="flex flex-col" style={{ width: `${panelSizes.editor}%` }}>
          <div className="flex-1 p-4" style={{ height: `${100 - terminalHeight}%` }}>
            <div className="h-full border border-[#3e3e42] rounded bg-[#1e1e1e]">
              <div className="h-8 border-b border-[#3e3e42] bg-[#2d2d30] flex items-center px-4 rounded-t">
                <span className="text-xs font-medium text-[#cccccc]">{activeFile}</span>
              </div>
              <div className="h-full">
                <SimpleCodeEditor
                  value={codeContent}
                  language="typescript"
                  onChange={(value) => setCodeContent(value || '')}
                />
              </div>
            </div>
                      </div>
                      
          {/* Horizontal Resizer */}
          <div
            className="h-1 resizer cursor-ns-resize"
            onMouseDown={(e) => handleMouseDown(e, 'vertical')}
          />
          
          {/* Bottom: TerminalView */}
          <div className="bg-[#1e1e1e] border-t border-[#3e3e42] p-4" style={{ height: `${terminalHeight}%` }}>
            <h2 className="text-xs font-semibold mb-2 text-[#cccccc] uppercase tracking-wider">Terminal</h2>
            <div 
              ref={terminalRef}
              className="h-full bg-[#1e1e1e] text-[#4ec9b0] font-mono text-xs p-2 rounded overflow-y-auto cursor-text focus:outline-none"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (currentCommand.trim()) {
                    runCommand(currentCommand)
                  } else {
                    setTerminalOutput(prev => [...prev, '$ '])
                    setIsTypingCommand(true)
                  }
                } else if (e.key === 'Backspace') {
                  if (currentCommand.length > 0) {
                    setCurrentCommand(prev => prev.slice(0, -1))
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  if (commandHistory.length > 0) {
                    const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
                    setHistoryIndex(newIndex)
                    setCurrentCommand(commandHistory[newIndex] || '')
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  if (historyIndex !== -1) {
                    const newIndex = historyIndex + 1
                    if (newIndex >= commandHistory.length) {
                      setHistoryIndex(-1)
                      setCurrentCommand('')
                    } else {
                      setHistoryIndex(newIndex)
                      setCurrentCommand(commandHistory[newIndex] || '')
                    }
                  }
                } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                  // Only add printable characters
                  setCurrentCommand(prev => prev + e.key)
                  setIsTypingCommand(true)
                }
              }}
            >
              {terminalOutput.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
              {isTypingCommand && (
                <div className="inline">
                  <span>$ {currentCommand}</span>
                  <span className="animate-pulse">█</span>
                </div>
              )}
            </div>
                      </div>
                    </div>
                    
        {/* Vertical Resizer */}
        <div
          className="w-1 resizer cursor-ew-resize"
          onMouseDown={(e) => handleMouseDown(e, 'horizontal-right')}
        />

        {/* Right: ChatPanel */}
        <div 
          className="border-l border-[#3e3e42] panel p-4 flex flex-col"
          style={{ width: `${panelSizes.chat}%` }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-[#cccccc] uppercase tracking-wider">AI Chat</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearChat}
                className="text-xs px-2 py-1 text-[#858585] hover:text-[#cccccc] hover:bg-[rgba(255,255,255,0.08)] rounded transition-colors"
                title="Clear Chat"
              >
                Clear
              </button>
              {runningProjectUrl && (
                <div className="flex items-center gap-2 text-xs text-[#4ec9b0] bg-[#264f49] px-2 py-1 rounded border border-[#4ec9b0]">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">{runningProjectName || 'Project'}</span>
                </div>
              )}
            </div>
          </div>
          {runningProjectUrl && (
            <div className="mb-2 text-xs text-[#569cd6] bg-[#1a3a5c] px-2 py-1 rounded border border-[#007acc]">
              <span className="font-medium">Running at: </span>
              <a 
                href={runningProjectUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#007acc] hover:underline"
              >
                {runningProjectUrl}
              </a>
            </div>
          )}
          <div className="flex-1 flex flex-col h-full">
            <div 
              ref={chatMessagesRef}
              className="flex-1 bg-[#252526] rounded p-3 mb-3 overflow-y-auto scroll-smooth"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="space-y-2">
                {chatMessages.map((message) => {
                  let messageClass = ''
                  
                  if (message.type === 'ai') {
                    messageClass = 'message message-ai'
                  } else if (message.type === 'system') {
                    messageClass = 'message message-system'
                  } else if (message.type === 'agent') {
                    messageClass = 'message message-agent'
                  } else {
                    messageClass = 'message message-user'
                  }
                  
                  return (
                    <div 
                      key={message.id}
                      className={messageClass}
                    >
                      {message.content}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="mt-auto flex gap-2">
              <input 
                type="text" 
                placeholder={isAIActive ? "AI Agent is working..." : "Ask AI to create projects..."} 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isAIActive}
                className="flex-1 px-3 py-2 text-xs border border-[#3e3e42] rounded bg-[#252526] text-[#cccccc] disabled:opacity-50"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isAIActive || !newMessage.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                {isAIActive ? "Working..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap App with authentication check
const AppWithAuth = () => {
  const { user, loading } = useAuth()
  const [showAuth, setShowAuth] = useState(!user && !loading)

  // Note: This useEffect is commented out as it references variables from App
  // which are not accessible in AppWithAuth wrapper

  useEffect(() => {
    if (user) {
      setShowAuth(false)
    } else if (!loading) {
      setShowAuth(true)
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-lg text-[#cccccc]">Loading...</div>
      </div>
    )
  }

  if (showAuth || !user) {
    return <AuthModal onAuthSuccess={() => setShowAuth(false)} />
  }

  return <App />
}

export default AppWithAuth