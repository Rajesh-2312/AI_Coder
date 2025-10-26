import React from 'react'
import { 
  FileText, 
  FolderOpen, 
  Settings, 
  Bot, 
  Terminal, 
  Code, 
  Save,
  Download,
  Upload,
  Play,
  Square
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useCodeExecution } from '../hooks/useCodeExecution'

interface TopMenuProps {
  onSettingsOpen: () => void
}

export const TopMenu: React.FC<TopMenuProps> = ({ onSettingsOpen }) => {
  const { activeTab, fileContents } = useApp()
  const { executeCode, executeFile, isExecuting, getLanguageFromFilename } = useCodeExecution()

  const handleMenuAction = async (action: string) => {
    console.log('Menu action:', action)
    
    switch (action) {
      case 'run-code':
        await handleRunCode()
        break
      case 'stop-execution':
        handleStopExecution()
        break
      default:
        // Send to Electron main process if available
        if (window.electronAPI) {
          window.electronAPI.onMenuAction((event: any, data: any) => {
            console.log('Electron menu action:', data)
          })
        }
    }
  }

  const handleRunCode = async () => {
    if (!activeTab) {
      alert('Please open a file first')
      return
    }

    const code = fileContents[activeTab] || ''
    if (!code.trim()) {
      alert('File is empty')
      return
    }

    const language = getLanguageFromFilename(activeTab)
    
    try {
      console.log(`Running ${language} code from ${activeTab}`)
      const result = await executeCode(code, { language })
      
      if (result.success) {
        console.log('Code executed successfully:', result.output)
      } else {
        console.error('Code execution failed:', result.error)
      }
    } catch (error) {
      console.error('Error running code:', error)
    }
  }

  const handleStopExecution = () => {
    // TODO: Implement stop execution functionality
    console.log('Stop execution requested')
  }

  return (
    <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
      {/* Left side - App title and File menu */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Code className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">AI-Coder</h1>
        </div>
        
        {/* File Menu */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleMenuAction('new-file')}
            className="flex items-center space-x-1 px-3 py-1 hover:bg-accent rounded-md transition-colors text-sm"
            title="New File (Ctrl+N)"
          >
            <FileText className="h-4 w-4" />
            <span>File</span>
          </button>
          
          <button
            onClick={() => handleMenuAction('open-folder')}
            className="flex items-center space-x-1 px-3 py-1 hover:bg-accent rounded-md transition-colors text-sm"
            title="Open Folder (Ctrl+O)"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Open</span>
          </button>
          
          <button
            onClick={() => handleMenuAction('save')}
            className="flex items-center space-x-1 px-3 py-1 hover:bg-accent rounded-md transition-colors text-sm"
            title="Save (Ctrl+S)"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Center - AI and Edit tools */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => handleMenuAction('ai-chat')}
          className="flex items-center space-x-1 px-3 py-1 hover:bg-accent rounded-md transition-colors text-sm"
          title="AI Chat Assistant"
        >
          <Bot className="h-4 w-4" />
          <span>AI</span>
        </button>
        
        <button
          onClick={() => handleMenuAction('run-code')}
          disabled={isExecuting}
          className={`flex items-center space-x-1 px-3 py-1 hover:bg-accent rounded-md transition-colors text-sm ${
            isExecuting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title={isExecuting ? "Executing..." : "Run Code (F5)"}
        >
          <Play className="h-4 w-4" />
          <span>{isExecuting ? 'Running...' : 'Run'}</span>
        </button>
        
        <button
          onClick={() => handleMenuAction('stop-execution')}
          className="flex items-center space-x-1 px-3 py-1 hover:bg-accent rounded-md transition-colors text-sm"
          title="Stop Execution"
        >
          <Square className="h-4 w-4" />
          <span>Stop</span>
        </button>
      </div>

      {/* Right side - Settings and tools */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleMenuAction('terminal')}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Toggle Terminal"
        >
          <Terminal className="h-4 w-4" />
        </button>
        
        <button
          onClick={onSettingsOpen}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

