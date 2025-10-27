import React, { useState, useRef, useEffect, useMemo, useCallback, memo, Suspense } from 'react'
import { useFileOperations } from '../context/AppContext'

interface CodeEditorProps {
  className?: string
  onContentChange?: (content: string) => void
  onSave?: (content: string) => void
  enableAutoSave?: boolean
  autoSaveDelay?: number
  enableSyntaxHighlighting?: boolean
  enableIntelliSense?: boolean
  enableMinimap?: boolean
  enableWordWrap?: boolean
  fontSize?: number
  tabSize?: number
}

// Lazy load Monaco Editor for better performance
const MonacoEditor = React.lazy(() => import('@monaco-editor/react'))

// Memoized editor configuration
const getEditorOptions = (fontSize: number, tabSize: number, enableMinimap: boolean, enableWordWrap: boolean) => ({
  fontSize,
  tabSize,
  minimap: { enabled: enableMinimap },
  wordWrap: enableWordWrap ? 'on' : 'off',
  automaticLayout: true,
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  renderControlCharacters: true,
  fontLigatures: true,
  cursorBlinking: 'blink',
  cursorSmoothCaretAnimation: true,
  smoothScrolling: true,
  mouseWheelZoom: true,
  contextmenu: true,
  selectOnLineNumbers: true,
  roundedSelection: false,
  readOnly: false,
  cursorStyle: 'line',
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: true,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    useShadows: false,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    verticalScrollbarSize: 12,
    horizontalScrollbarSize: 12,
    arrowSize: 11
  },
  folding: true,
  foldingStrategy: 'indentation',
  showFoldingControls: 'always',
  unfoldOnClickAfterEnd: false,
  bracketPairColorization: {
    enabled: true
  },
  guides: {
    bracketPairs: true,
    indentation: true
  },
  suggest: {
    showKeywords: true,
    showSnippets: true,
    showFunctions: true,
    showConstructors: true,
    showFields: true,
    showVariables: true,
    showClasses: true,
    showStructs: true,
    showInterfaces: true,
    showModules: true,
    showProperties: true,
    showEvents: true,
    showOperators: true,
    showUnits: true,
    showValues: true,
    showConstants: true,
    showEnums: true,
    showEnumMembers: true,
    showColors: true,
    showFiles: true,
    showReferences: true,
    showFolders: true,
    showTypeParameters: true,
    showIssues: true,
    showUsers: true,
    showWords: true
  }
})

// Language detection utility
const detectLanguage = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase()
  
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
      'html': 'html',
    'htm': 'html',
      'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
      'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile'
  }
  
  return languageMap[extension || ''] || 'plaintext'
}

// Memoized editor component
const EditorComponent = memo<{
  value: string
  language: string
  options: any
  onChange: (value: string | undefined) => void
  onMount: (editor: any, monaco: any) => void
}>(({ value, language, options, onChange, onMount }) => {
  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={value}
      options={options}
      onChange={onChange}
      onMount={onMount}
      loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
    />
  )
})

EditorComponent.displayName = 'EditorComponent'

// Main CodeEditor component
export const CodeEditor = memo<CodeEditorProps>(({
  className = '',
  onContentChange,
  onSave,
  enableAutoSave = true,
  autoSaveDelay = 2000,
  enableSyntaxHighlighting = true,
  enableIntelliSense = true,
  enableMinimap = false,
  enableWordWrap = true,
  fontSize = 14,
  tabSize = 2
}) => {
  const { activeFile, getFileById, updateFile } = useFileOperations()
  const [content, setContent] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveTimeRef = useRef<number>(0)
  
  // Get current file
  const currentFile = useMemo(() => {
    if (!activeFile) return null
    return getFileById(activeFile)
  }, [activeFile, getFileById])
  
  // Detect language
  const language = useMemo(() => {
    if (!currentFile) return 'plaintext'
    return detectLanguage(currentFile.name)
  }, [currentFile])
  
  // Editor options
  const editorOptions = useMemo(() => 
    getEditorOptions(fontSize, tabSize, enableMinimap, enableWordWrap),
    [fontSize, tabSize, enableMinimap, enableWordWrap]
  )
  
  // Load file content
  useEffect(() => {
    if (currentFile) {
      setContent(currentFile.content)
      setHasUnsavedChanges(false)
    } else {
      setContent('')
      setHasUnsavedChanges(false)
    }
  }, [currentFile])
  
  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    if (hasUnsavedChanges && enableAutoSave && currentFile) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave()
      }, autoSaveDelay)
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [hasUnsavedChanges, enableAutoSave, autoSaveDelay, currentFile])
  
  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || ''
    setContent(newContent)
    setHasUnsavedChanges(true)
    onContentChange?.(newContent)
  }, [onContentChange])
  
  const handleSave = useCallback(() => {
    if (!currentFile || !hasUnsavedChanges) return
    
    updateFile(currentFile.id, content)
    setHasUnsavedChanges(false)
    lastSaveTimeRef.current = Date.now()
    onSave?.(content)
  }, [currentFile, content, hasUnsavedChanges, updateFile, onSave])
  
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco
    
    // Configure Monaco
    if (enableSyntaxHighlighting) {
      // Enable syntax highlighting
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types']
      })
    }
    
    if (enableIntelliSense) {
      // Configure IntelliSense
      monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)
    }
    
    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave()
    })
    
    // Add custom themes
    monaco.editor.defineTheme('ai-coder-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editorLineNumber.foreground': '#999999',
        'editor.selectionBackground': '#add6ff',
        'editor.inactiveSelectionBackground': '#e5ebf1'
      }
    })
    
    monaco.editor.defineTheme('ai-coder-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41'
      }
    })
    
    // Set theme based on system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    monaco.editor.setTheme(isDark ? 'ai-coder-dark' : 'ai-coder-light')
    
    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      monaco.editor.setTheme(e.matches ? 'ai-coder-dark' : 'ai-coder-light')
    })
  }, [enableSyntaxHighlighting, enableIntelliSense, handleSave])
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            handleSave()
            break
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])
  
  if (!currentFile) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-4">📝</div>
          <p>Select a file to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Editor header */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-card">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground">{currentFile.name}</span>
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-500">●</span>
          )}
            </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{language}</span>
          <span>•</span>
          <span>{content.length} chars</span>
          {lastSaveTimeRef.current > 0 && (
            <>
              <span>•</span>
              <span>Saved {new Date(lastSaveTimeRef.current).toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading editor...</p>
            </div>
          </div>
        }>
          <EditorComponent
            value={content}
            language={language}
            options={editorOptions}
            onChange={handleContentChange}
            onMount={handleEditorMount}
          />
        </Suspense>
      </div>
      
      {/* Status bar */}
      <div className="flex items-center justify-between p-2 border-t border-border bg-card text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Ln 1, Col 1</span>
          <span>UTF-8</span>
          <span>{language}</span>
        </div>
        <div className="flex items-center space-x-2">
          {enableAutoSave && (
            <span className="text-green-600">Auto-save</span>
          )}
          {hasUnsavedChanges && (
            <span className="text-orange-600">Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  )
})

CodeEditor.displayName = 'CodeEditor'

export default CodeEditor