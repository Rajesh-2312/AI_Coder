import React, { useState, useEffect } from 'react'
import { aiService } from '../services/aiService'

interface FileItem {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileItem[]
}

interface AgentActivity {
  agent: string
  action: 'creating' | 'reading' | 'updating' | 'deleting'
  filePath: string
  status: 'active' | 'completed'
}

interface FileExplorerProps {
  onFileSelect?: (file: FileItem) => void
  selectedFile?: string
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, selectedFile }) => {
  const [files, setFiles] = useState<FileItem[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/components']))
  const [loading, setLoading] = useState(true)
  const [isAICreating, setIsAICreating] = useState(false)
  const [newlyCreatedFiles, setNewlyCreatedFiles] = useState<Set<string>>(new Set())
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([])

  // Load files from backend
  const loadFiles = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading files from backend...')
      // Load files from src directory (where AI agent creates files)
      const response = await aiService.listFiles('src')
      if (response.success) {
        console.log('✅ Files loaded successfully:', response.files?.length || 0, 'items')
        setFiles(response.files || [])
      } else {
        console.error('❌ Failed to load files:', response.error)
        // Fallback to static files if API fails
        setFiles([
          { name: 'src', type: 'folder', path: 'src', children: [
            { name: 'components', type: 'folder', path: 'src/components', children: [] },
            { name: 'App.tsx', type: 'file', path: 'src/App.tsx' },
            { name: 'main.tsx', type: 'file', path: 'src/main.tsx' },
            { name: 'index.css', type: 'file', path: 'src/index.css' }
          ]},
          { name: 'public', type: 'folder', path: 'public', children: [
            { name: 'index.html', type: 'file', path: 'public/index.html' }
          ]},
          { name: 'package.json', type: 'file', path: 'package.json' },
          { name: 'vite.config.ts', type: 'file', path: 'vite.config.ts' }
        ])
      }
      } catch (error) {
      console.error('❌ Error loading files:', error)
      // Fallback to static files on error
      setFiles([
        { name: 'src', type: 'folder', path: 'src', children: [
          { name: 'components', type: 'folder', path: 'src/components', children: [] },
          { name: 'App.tsx', type: 'file', path: 'src/App.tsx' },
          { name: 'main.tsx', type: 'file', path: 'src/main.tsx' },
          { name: 'index.css', type: 'file', path: 'src/index.css' }
        ]},
        { name: 'public', type: 'folder', path: 'public', children: [
          { name: 'index.html', type: 'file', path: 'public/index.html' }
        ]},
        { name: 'package.json', type: 'file', path: 'package.json' },
        { name: 'vite.config.ts', type: 'file', path: 'vite.config.ts' }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Load files on mount and listen for refresh events
  useEffect(() => {
    loadFiles()

    // Set up periodic refresh every 30 seconds to catch any external changes
    const refreshInterval = setInterval(() => {
      if (!isAICreating) {
        console.log('🔄 Periodic file explorer refresh')
        loadFiles()
      }
    }, 30000)

    // Listen for file explorer refresh events
    const handleRefresh = () => {
      console.log('🔄 File explorer refresh triggered')
      loadFiles()
    }

    window.addEventListener('fileExplorerRefresh', handleRefresh)
    
    // Listen for AI task updates to refresh when files are created
    const handleAITaskUpdate = (event: CustomEvent) => {
      const task = event.detail
      if (task.status === 'completed' || task.status === 'failed') {
        console.log('🤖 AI task completed, refreshing file explorer')
        setIsAICreating(false)
        setTimeout(loadFiles, 1000) // Small delay to ensure files are written
      } else if (task.status === 'executing') {
        setIsAICreating(true)
      }
    }

    // Listen for agent file operations
    const handleAgentFileOperation = (event: CustomEvent) => {
      const { agent, action, filePath, status } = event.detail
      if (!agent || !action || !filePath) return
      
      console.log(`🤖 Agent ${agent} ${action} file: ${filePath}`)
      
      setAgentActivity(prev => {
        const updated = prev.filter(activity => 
          !(activity.filePath === filePath && activity.status === 'active')
        )
        updated.push({ agent, action, filePath, status })
        return updated
      })
      
      // Auto-expand parent folders for all operations
      const pathParts = filePath.split('/')
      for (let i = 1; i < pathParts.length; i++) {
        const folderPath = pathParts.slice(0, i).join('/')
        setExpandedFolders(prev => new Set([...prev, folderPath]))
      }
      
      // Refresh files after file operation
      if (status === 'completed') {
        setTimeout(() => {
          setAgentActivity(prev => prev.filter(a => a.filePath !== filePath || a.status === 'completed'))
          setTimeout(() => setAgentActivity(prev => prev.filter(a => a.filePath !== filePath)), 2000)
        }, 1000)
      }
    }

    // Listen for file creation events
    const handleFileCreated = (event: CustomEvent) => {
      const filePath = event.detail?.filePath
      if (!filePath) return
      
      console.log('📄 File created:', filePath)
      setNewlyCreatedFiles(prev => new Set([...prev, filePath]))
      
      // Auto-expand parent folders
      const pathParts = filePath.split('/')
      for (let i = 1; i < pathParts.length; i++) {
        const folderPath = pathParts.slice(0, i).join('/')
        setExpandedFolders(prev => new Set([...prev, folderPath]))
      }
      
      // Refresh files after a short delay to ensure file is written
      setTimeout(() => {
        console.log('🔄 Refreshing file explorer after file creation')
        loadFiles()
      }, 1000)
      
      // Remove highlight after 5 seconds
      setTimeout(() => {
        setNewlyCreatedFiles(prev => {
          const newSet = new Set(prev)
          newSet.delete(filePath)
          return newSet
        })
      }, 5000)
    }

    window.addEventListener('aiTaskUpdate', handleAITaskUpdate as EventListener)
    window.addEventListener('fileCreated', handleFileCreated as EventListener)
    window.addEventListener('agentFileOperation', handleAgentFileOperation as EventListener)

    return () => {
      clearInterval(refreshInterval)
      window.removeEventListener('fileExplorerRefresh', handleRefresh)
      window.removeEventListener('aiTaskUpdate', handleAITaskUpdate as EventListener)
      window.removeEventListener('fileCreated', handleFileCreated as EventListener)
      window.removeEventListener('agentFileOperation', handleAgentFileOperation as EventListener)
    }
  }, [])

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') {
      return expandedFolders.has(file.path) ? '📂' : '📁'
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'tsx':
      case 'ts':
        return '🔷'
      case 'jsx':
      case 'js':
        return '🟨'
      case 'css':
        return '🎨'
      case 'html':
        return '🌐'
      case 'json':
        return '📋'
      case 'md':
        return '📝'
      default:
        return '📄'
    }
  }

  const renderFileItem = (file: FileItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(file.path)
    const isSelected = selectedFile === file.path
    const isNewlyCreated = newlyCreatedFiles.has(file.path)
    const indentStyle = { paddingLeft: `${depth * 16}px` }
    
    // Check if agent is working on this file
    const agentWorking = agentActivity.find(a => a.filePath === file.path && a.status === 'active')
    const agentAction = agentWorking?.action || ''
    const agentName = agentWorking?.agent || ''
    
    return (
      <div key={file.path}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-accent/50 transition-all duration-300 ${
            isSelected ? 'bg-accent border-r-2 border-primary' : ''
          } ${
            isNewlyCreated ? 'bg-green-100 border-l-2 border-green-500 animate-pulse' : ''
          } ${
            agentWorking ? 'bg-yellow-100 border-l-2 border-yellow-500 animate-pulse' : ''
          }`}
          style={indentStyle}
          onClick={() => {
            if (file.type === 'folder') {
              toggleFolder(file.path)
                } else {
              onFileSelect?.(file)
            }
          }}
        >
          <span className="mr-2 text-sm flex-shrink-0">
            {getFileIcon(file)}
          </span>
          <span className={`text-sm text-foreground truncate flex-1 select-none ${
            isNewlyCreated ? 'font-semibold text-green-700' : ''
          } ${
            agentWorking ? 'font-semibold text-yellow-700' : ''
          }`}>
            {file.name}
            {isNewlyCreated && <span className="ml-1 text-xs text-green-600">✨</span>}
            {agentWorking && (
              <span className="ml-1 text-xs text-yellow-600 animate-pulse">
                {agentAction === 'creating' && '⚡ Creating...'}
                {agentAction === 'updating' && '📝 Updating...'}
                {agentAction === 'deleting' && '🗑️ Deleting...'}
                {agentAction === 'reading' && '👁️ Reading...'}
              </span>
            )}
          </span>
          {file.type === 'folder' && (
            <span className="text-xs text-muted-foreground ml-1 flex-shrink-0">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
        </div>
        
        {file.type === 'folder' && isExpanded && file.children && (
          <div className="overflow-hidden">
            {file.children
              .sort((a, b) => {
                if (a.type !== b.type) {
                  return a.type === 'folder' ? -1 : 1
                }
                return a.name.localeCompare(b.name)
              })
              .map(child => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="text-xs">📁</span>
          Explorer
          {isAICreating && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="animate-spin">🤖</span>
              AI Creating...
            </span>
          )}
          {agentActivity.length > 0 && agentActivity.some(a => a.status === 'active') && (
            <span className="text-xs text-yellow-600 flex items-center gap-1 animate-pulse">
              <span className="animate-spin">⚡</span>
              Agent Working...
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
            <button 
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh Files"
            onClick={loadFiles}
            disabled={loading}
          >
            <span className={`text-xs ${loading ? 'animate-spin' : ''}`}>🔄</span>
            </button>
            <button 
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse All"
            onClick={() => setExpandedFolders(new Set())}
          >
            <span className="text-xs">📁</span>
            </button>
        </div>
      </div>
      
      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="animate-spin text-sm">🔄</span>
              <span className="text-sm">Loading files...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map(file => renderFileItem(file))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-3 py-2 border-t border-border bg-muted/10">
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>{files.length} items</span>
          <span className="text-xs opacity-60">AI-Coder</span>
        </div>
      </div>
    </div>
  )
}

export default FileExplorer