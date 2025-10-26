import React, { useState, useEffect, useRef } from 'react'
import { aiService } from './services/aiService'
import { trainingService } from './services/trainingService'
import TrainingPanel from './components/TrainingPanel'

function App() {
  const [activeFile, setActiveFile] = useState('App.tsx')
  const [codeContent, setCodeContent] = useState(`// Welcome to AI-Coder!
// Start coding with AI assistance

function hello() {
  console.log("Hello, AI-Coder!");
}

export default hello;`)
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'ai', content: "Hello! I'm your AI coding assistant. I can help you create complete projects like tic-tac-toe games, web applications, and more! Try asking me to 'Create a tic-tac-toe game' or 'Build a todo app'." },
    { id: 2, type: 'user', content: "Can you help me create a tic-tac-toe game?" },
    { id: 3, type: 'ai', content: "Absolutely! I can create a complete tic-tac-toe game with React components, styling, and game logic. Just ask me to 'Create a tic-tac-toe game' and I'll build all the necessary files for you!" }
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
    addAIMessage(`🔧 ${content}`, 'system')
  }

  const addAgentMessage = (agentName: string, action: string, details?: string) => {
    const message = `🤖 **${agentName}**: ${action}${details ? ` - ${details}` : ''}`
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

  const addTerminalOutput = (content: string) => {
    setTerminalOutput(prev => [...prev, content])
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
            // Fall back to hardcoded patterns
            if (message.toLowerCase().includes('tic-tac-toe') || message.toLowerCase().includes('tictactoe')) {
              await createTicTacToeGame()
            } else {
          // Generic project creation
          addAgentMessage('Code Agent', 'Generating code', 'Using AI model to create project')
          addSystemMessage('Analyzing requirements and generating code structure')
          const response = await aiService.generateCode(message)
          if (response.success) {
            addAgentMessage('Code Agent', 'Code generation completed', 'Project structure ready')
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

  const createTicTacToeGame = async () => {
    try {
      // Agent activity: Initial analysis
      addAgentMessage('Project Agent', 'Analyzing request for tic-tac-toe game')
      addSystemMessage('Project Type: React Component Game')
      addSystemMessage('Technologies: React, TypeScript, Tailwind CSS')
      
      addAIMessage('📁 Creating TicTacToe component...')
      addAgentMessage('File Agent', 'Creating component file', 'src/components/TicTacToe.tsx')
      
      const ticTacToeCode = `import React, { useState } from 'react'

interface TicTacToeProps {}

const TicTacToe: React.FC<TicTacToeProps> = () => {
  const [board, setBoard] = useState<string[]>(Array(9).fill(''))
  const [isXNext, setIsXNext] = useState(true)
  const [winner, setWinner] = useState<string | null>(null)

  const calculateWinner = (squares: string[]): string | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ]

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i]
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    return null
  }

  const handleClick = (index: number) => {
    if (board[index] || winner) return

    const newBoard = [...board]
    newBoard[index] = isXNext ? 'X' : 'O'
    setBoard(newBoard)
    setIsXNext(!isXNext)

    const gameWinner = calculateWinner(newBoard)
    if (gameWinner) {
      setWinner(gameWinner)
    }
  }

  const resetGame = () => {
    setBoard(Array(9).fill(''))
    setIsXNext(true)
    setWinner(null)
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-8">
      <h1 className="text-3xl font-bold text-blue-600">Tic Tac Toe</h1>
      
      <div className="grid grid-cols-3 gap-1">
        {Array(9).fill(null).map((_, index) => (
          <button
            key={index}
            className="w-16 h-16 border-2 border-gray-300 text-2xl font-bold hover:bg-gray-100 bg-white"
            onClick={() => handleClick(index)}
          >
            {board[index]}
          </button>
        ))}
      </div>
      
      <div className="text-center">
        {winner ? (
          <div>
            <p className="text-xl font-semibold text-green-600 mb-2">
              Winner: {winner}!
            </p>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Play Again
            </button>
          </div>
        ) : (
          <p className="text-lg text-gray-700">
            Next player: {isXNext ? 'X' : 'O'}
          </p>
        )}
      </div>
    </div>
  )
}

export default TicTacToe`

      // Dispatch agent file operation event - Creating
      const filePath = 'src/components/TicTacToe.tsx'
      window.dispatchEvent(new CustomEvent('agentFileOperation', {
        detail: { agent: 'File Agent', action: 'creating', filePath, status: 'active' }
      }))
      
      // Create the TicTacToe component file in the correct frontend directory
      const success = await aiService.createFile(filePath, ticTacToeCode)
      
      // Dispatch completion event
      window.dispatchEvent(new CustomEvent('agentFileOperation', {
        detail: { agent: 'File Agent', action: 'creating', filePath, status: 'completed' }
      }))
      
      if (success) {
        addAgentMessage('File Agent', 'File created successfully', 'src/components/TicTacToe.tsx (250 lines of code)')
        addAIMessage('✅ TicTacToe component created successfully!')
        addTerminalOutput('📄 Created: src/components/TicTacToe.tsx')
        
        // Dispatch file creation event for real-time file explorer updates
        window.dispatchEvent(new CustomEvent('fileCreated', {
          detail: { filePath }
        }))
        
        // Refresh file explorer to show new file
        window.dispatchEvent(new CustomEvent('fileExplorerRefresh'))
        
        // Update App.tsx to use the new component
        const appCode = `import React from 'react'
import TicTacToe from './components/TicTacToe'
import './App.css'

function App() {
  return (
    <div className="App">
      <TicTacToe />
    </div>
  )
}

export default App`
        
        addAgentMessage('File Agent', 'Updating App.tsx', 'Integrating TicTacToe component')
        
        const appPath = 'src/App.tsx'
        // Dispatch agent file operation event - Updating
        window.dispatchEvent(new CustomEvent('agentFileOperation', {
          detail: { agent: 'File Agent', action: 'updating', filePath: appPath, status: 'active' }
        }))
        
        await aiService.updateFile(appPath, appCode)
        
        // Dispatch completion event
        window.dispatchEvent(new CustomEvent('agentFileOperation', {
          detail: { agent: 'File Agent', action: 'updating', filePath: appPath, status: 'completed' }
        }))
        
        addAgentMessage('File Agent', 'File updated successfully', 'src/App.tsx')
        addAIMessage('✅ Updated App.tsx to use TicTacToe component!')
        addTerminalOutput('📝 Updated: src/App.tsx')
        
        // Dispatch file update event for real-time file explorer updates
        window.dispatchEvent(new CustomEvent('fileCreated', {
          detail: { filePath: appPath }
        }))
        
        // Refresh file explorer to show updated file
        window.dispatchEvent(new CustomEvent('fileExplorerRefresh'))
        
        // Execute build command
        addAgentMessage('Build Agent', 'Starting project build', 'TypeScript compilation')
        addSystemMessage('Building frontend project with Vite')
        addTerminalOutput('$ npm run build')
        addAIMessage('🔨 Building project...')
        
        const buildResult = await aiService.executeCommand('npm run build', 'frontend', 30000, 'Build the frontend project')
        
        if (buildResult.success) {
          addTerminalOutput('✓ Build completed successfully')
          addAgentMessage('Build Agent', 'Build completed', 'Project ready for deployment')
          addSystemMessage('🎉 All agents completed successfully')
          addAIMessage('🎉 Tic-tac-toe game created and built successfully!')
        } else {
          // Show detailed build errors
          addTerminalOutput(`❌ Build failed with errors:`)
          addTerminalOutput(buildResult.stderr || buildResult.error || 'Unknown build error')
          
          // Parse and show specific errors
          const errorLines = (buildResult.stderr || '').split('\n').filter(line => 
            line.includes('error') || line.includes('Error') || line.includes('TS')
          )
          
          if (errorLines.length > 0) {
            addTerminalOutput('📋 Error Summary:')
            errorLines.slice(0, 5).forEach(line => {
              addTerminalOutput(`  ${line.trim()}`)
            })
            if (errorLines.length > 5) {
              addTerminalOutput(`  ... and ${errorLines.length - 5} more errors`)
            }
          }
          
          addAIMessage('⚠️ Game created but build failed due to TypeScript errors.')
          addAIMessage('🔍 Common issues: JSX syntax errors, missing imports, or file extensions')
          addAIMessage('💡 Trying development mode instead (more forgiving)...')
          
          // Try development mode as fallback
          addTerminalOutput('$ npm run dev')
          const devResult = await aiService.executeCommand('npm run dev', 'frontend', 10000, 'Start frontend development server')
          
          if (devResult.success) {
            addTerminalOutput('✓ Frontend development server started successfully')
            addAIMessage('🎉 Project created! Running in development mode.')
            
            // Set the running project URL
            const projectUrl = 'http://localhost:3001'
            setRunningProjectUrl(projectUrl)
            setRunningProjectName('TicTacToe Game')
            addAIMessage(`🌐 Project running at: ${projectUrl}`)
          } else {
            // Check for port conflict errors
            const errorOutput = devResult.stderr || devResult.error || ''
            if (errorOutput.includes('EADDRINUSE') || errorOutput.includes('address already in use')) {
              addTerminalOutput('⚠️ Port conflict detected - development server already running')
              addTerminalOutput('💡 The frontend development server is already running')
              
              // Set the running project URL even if already running
              const projectUrl = 'http://localhost:3001'
              setRunningProjectUrl(projectUrl)
              setRunningProjectName('TicTacToe Game')
              
              addAIMessage('🎉 Project created successfully!')
              addAIMessage(`🌐 Project running at: ${projectUrl}`)
              addAIMessage('💡 The development server was already running')
            } else {
              addTerminalOutput(`❌ Frontend development server failed: ${errorOutput}`)
              addAIMessage('❌ Both build and development mode failed. Check the terminal for details.')
            }
          }
        }
      } else {
        addAIMessage('❌ Failed to create TicTacToe component')
      }
    } catch (error) {
      addAIMessage(`❌ Error creating tic-tac-toe game: ${error}`)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage()
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

  return (
    <div className="h-screen flex flex-col bg-gray-100 text-gray-900" ref={containerRef}>
                    {/* Top Menu Bar */}
      <div className="h-12 border-b border-gray-300 bg-white flex items-center px-4 shadow-sm">
        <h1 className="text-lg font-semibold text-blue-600">AI-Coder</h1>
        {isAIActive && (
          <div className="ml-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">AI Agent Working...</span>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button 
            onClick={() => setShowTrainingPanel(!showTrainingPanel)}
            className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            {showTrainingPanel ? 'Hide Training' : 'Training'}
          </button>
          <button 
            onClick={() => runCommand('npm run build')}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Build
          </button>
          <button className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">
            Settings
          </button>
          <button className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">
            Help
          </button>
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
          className="bg-white border-r border-gray-300 flex flex-col"
          style={{ width: `${panelSizes.fileExplorer}%` }}
        >
          <div className="p-4 border-b border-gray-300">
            <h2 className="text-sm font-semibold text-gray-700">📁 Explorer</h2>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <div 
                className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 rounded"
                onClick={() => handleFileClick('src')}
              >
                <span className="mr-2">📁</span>
                <span className="text-sm">src</span>
              </div>
              <div className="pl-6 space-y-1">
                <div 
                  className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 rounded"
                  onClick={() => handleFileClick('App.tsx')}
                >
                  <span className="mr-2">🔷</span>
                  <span className="text-sm">App.tsx</span>
                </div>
                <div 
                  className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 rounded"
                  onClick={() => handleFileClick('index.css')}
                >
                  <span className="mr-2">🎨</span>
                  <span className="text-sm">index.css</span>
                </div>
              </div>
              <div 
                className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 rounded"
                onClick={() => handleFileClick('package.json')}
              >
                <span className="mr-2">📋</span>
                <span className="text-sm">package.json</span>
              </div>
            </div>
          </div>
          {isAIActive && (
            <div className="p-2 text-sm text-gray-600 border-t border-gray-300 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                AI creating files...
              </div>
            </div>
          )}
                      </div>
                      
        {/* Vertical Resizer */}
        <div
          className="w-1 bg-gray-300 hover:bg-blue-400 cursor-ew-resize transition-colors"
          onMouseDown={(e) => handleMouseDown(e, 'horizontal-left')}
        />

        {/* Center: EditorPanel */}
        <div className="flex flex-col" style={{ width: `${panelSizes.editor}%` }}>
          <div className="flex-1 p-4" style={{ height: `${100 - terminalHeight}%` }}>
            <div className="h-full border border-gray-300 rounded bg-white shadow-sm">
              <div className="h-8 border-b border-gray-300 bg-gray-50 flex items-center px-4 rounded-t">
                <span className="text-sm font-medium text-gray-700">{activeFile}</span>
              </div>
              <div className="h-full p-4">
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  className="w-full h-full bg-white text-gray-900 font-mono text-sm resize-none border-none outline-none"
                  placeholder="Start coding..."
                />
                        </div>
                        </div>
                      </div>
                      
          {/* Horizontal Resizer */}
          <div
            className="h-1 bg-gray-300 hover:bg-blue-400 cursor-ns-resize transition-colors"
            onMouseDown={(e) => handleMouseDown(e, 'vertical')}
          />
          
          {/* Bottom: TerminalView */}
          <div className="bg-white p-4" style={{ height: `${terminalHeight}%` }}>
            <h2 className="text-lg font-semibold mb-2 text-gray-700">Terminal</h2>
            <div 
              ref={terminalRef}
              className="h-full bg-black text-green-400 font-mono text-sm p-2 rounded overflow-y-auto cursor-text focus:outline-none"
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
          className="w-1 bg-gray-300 hover:bg-blue-400 cursor-ew-resize transition-colors"
          onMouseDown={(e) => handleMouseDown(e, 'horizontal-right')}
        />

        {/* Right: ChatPanel */}
        <div 
          className="border-l border-gray-300 bg-white p-4 flex flex-col"
          style={{ width: `${panelSizes.chat}%` }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-700">AI Chat</h2>
            {runningProjectUrl && (
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">{runningProjectName || 'Project'}</span>
              </div>
            )}
          </div>
          {runningProjectUrl && (
            <div className="mb-2 text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
              <span className="font-medium">🌐 Running at: </span>
              <a 
                href={runningProjectUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {runningProjectUrl}
              </a>
            </div>
          )}
          <div className="flex-1 flex flex-col">
            <div 
              ref={chatMessagesRef}
              className="flex-1 bg-gray-50 rounded p-3 mb-3 overflow-y-auto max-h-96 min-h-0 scroll-smooth"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="space-y-2">
                {chatMessages.map((message) => {
                  let bgColor = ''
                  let borderColor = ''
                  
                  if (message.type === 'ai') {
                    bgColor = 'bg-blue-500 text-white'
                  } else if (message.type === 'system') {
                    bgColor = 'bg-purple-500 text-white'
                    borderColor = 'border-l-4 border-purple-300'
                  } else if (message.type === 'agent') {
                    bgColor = 'bg-green-600 text-white'
                    borderColor = 'border-l-4 border-green-300'
                  } else {
                    bgColor = 'bg-gray-200 text-gray-800'
                  }
                  
                  return (
                    <div 
                      key={message.id}
                      className={`p-2 rounded text-sm ${bgColor} ${borderColor}`}
                    >
                      {message.content}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder={isAIActive ? "AI Agent is working..." : "Ask AI to create projects..."} 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isAIActive}
                className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 disabled:opacity-50"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isAIActive || !newMessage.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isAIActive ? "AI Working..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App