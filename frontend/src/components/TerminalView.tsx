import React, { useState, useEffect, useRef } from 'react'
import { Terminal, Play, Square, Trash2, Maximize2, Minimize2, AlertCircle, Loader2 } from 'lucide-react'
import { useTerminal } from '../hooks/useTerminal'

export const TerminalView: React.FC = () => {
  const [currentCommand, setCurrentCommand] = useState('')
  const [isMaximized, setIsMaximized] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Use Terminal hook
  const {
    outputs,
    currentExecution,
    isExecuting,
    error,
    stats,
    sandboxStatus,
    executeCommand,
    killProcess,
    killAllProcesses,
    clearOutput,
    clearError,
    shortcuts
  } = useTerminal()

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [outputs])

  // Focus input when terminal is clicked
  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleExecuteCommand = async (command: string) => {
    if (!command.trim() || isExecuting) return

    try {
      // Parse command and arguments
      const parts = command.trim().split(' ')
      const cmd = parts[0]
      const args = parts.slice(1)
      
      await executeCommand(cmd, args)
      setCurrentCommand('')
    } catch (error) {
      console.error('Failed to execute command:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExecuteCommand(currentCommand)
    }
  }

  const stopExecution = () => {
    if (currentExecution) {
      killProcess(currentExecution.id)
    }
  }

  const getOutputColor = (type: string) => {
    switch (type) {
      case 'command':
        return 'text-blue-400'
      case 'stderr':
        return 'text-red-400'
      case 'stdout':
        return 'text-green-400'
      case 'system':
        return 'text-yellow-400'
      default:
        return 'text-foreground'
    }
  }

  const getPromptSymbol = () => {
    return isExecuting ? '⏳' : '❯'
  }

  return (
    <div className={`bg-card border-t border-border flex flex-col ${isMaximized ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Header */}
      <div className="h-8 bg-muted border-b border-border flex items-center justify-between px-3">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4" />
          <span className="text-xs font-medium">Terminal</span>
          {sandboxStatus.activeProcesses > 0 && (
            <div className="flex items-center space-x-1">
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              <span className="text-xs text-muted-foreground">
                {sandboxStatus.activeProcesses} active
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:bg-accent rounded transition-colors"
            title={isMaximized ? 'Minimize' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </button>
          
          <button
            onClick={clearOutput}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Clear Terminal"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          
          {isExecuting && (
            <button
              onClick={stopExecution}
              className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
              title="Stop Execution"
            >
              <Square className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-2 bg-red-100 border-b border-red-300">
          <div className="flex items-center space-x-2 text-red-700 text-xs">
            <AlertCircle className="h-3 w-3" />
            <span className="flex-1">{error}</span>
            <button 
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm bg-black text-green-400"
        onClick={handleTerminalClick}
      >
        {outputs.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            AI-Coder Terminal Ready
            <div className="text-xs mt-2">
              {stats.totalCommands} commands executed | {stats.successfulCommands} successful
            </div>
          </div>
        )}
        
        {outputs.map((output) => (
          <div key={output.id} className="mb-1">
            {output.type === 'command' && (
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">❯</span>
                <span className="text-blue-400">{output.content}</span>
              </div>
            )}
            {output.type === 'stdout' && (
              <div className="text-green-400 ml-4">{output.content}</div>
            )}
            {output.type === 'stderr' && (
              <div className="text-red-400 ml-4">{output.content}</div>
            )}
            {output.type === 'system' && (
              <div className="text-yellow-400 ml-4">{output.content}</div>
            )}
          </div>
        ))}
        
        {/* Current Command Input */}
        <div className="flex items-center space-x-2">
          <span className="text-blue-400">{getPromptSymbol()}</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter command..."
            className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder-gray-500"
            disabled={isExecuting}
          />
        </div>
      </div>
    </div>
  )
}
