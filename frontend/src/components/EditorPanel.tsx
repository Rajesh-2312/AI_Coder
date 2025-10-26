import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { X, FileText } from 'lucide-react'

export const EditorPanel: React.FC = () => {
  const { 
    currentFile, 
    openFiles, 
    activeTab, 
    setActiveTab, 
    closeFile, 
    fileContents, 
    updateFileContent 
  } = useApp()
  const { isDark } = useTheme()
  
  const [editorValue, setEditorValue] = useState('')

  // Get file extension for language detection
  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'yaml': 'yaml',
      'yml': 'yaml'
    }
    return languageMap[ext || ''] || 'plaintext'
  }

  // Update editor value when active tab changes
  useEffect(() => {
    if (activeTab) {
      const content = fileContents[activeTab] || getDefaultContent(activeTab)
      setEditorValue(content)
    }
  }, [activeTab, fileContents])

  const getDefaultContent = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    
    switch (ext) {
      case 'ts':
      case 'tsx':
        return `// TypeScript file
interface User {
  id: number;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}

export { User, greetUser };`
      
      case 'js':
      case 'jsx':
        return `// JavaScript file
function greetUser(user) {
  return \`Hello, \${user.name}!\`;
}

export { greetUser };`
      
      case 'py':
        return `# Python file
def greet_user(user):
    return f"Hello, {user['name']}!"

if __name__ == "__main__":
    user = {"name": "Developer"}
    print(greet_user(user))`
      
      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello World!</h1>
</body>
</html>`
      
      case 'css':
        return `/* CSS file */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}`
      
      case 'json':
        return `{
  "name": "ai-coder-project",
  "version": "1.0.0",
  "description": "AI-powered code editor",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}`
      
      default:
        return `// Welcome to AI-Coder!
// This is a powerful code editor with AI assistance

// Try asking the AI to help you with your code!`
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeTab) {
      setEditorValue(value)
      updateFileContent(activeTab, value)
    }
  }

  const handleTabClick = (filename: string) => {
    setActiveTab(filename)
  }

  const handleCloseTab = (filename: string, e: React.MouseEvent) => {
    e.stopPropagation()
    closeFile(filename)
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Tab Bar */}
      {openFiles.length > 0 && (
        <div className="h-10 bg-muted border-b border-border flex items-center overflow-x-auto">
          {openFiles.map((filename) => (
            <div
              key={filename}
              onClick={() => handleTabClick(filename)}
              className={`flex items-center space-x-2 px-3 py-2 cursor-pointer border-r border-border hover:bg-accent transition-colors ${
                activeTab === filename ? 'bg-background text-foreground' : 'text-muted-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm whitespace-nowrap">{filename}</span>
              <button
                onClick={(e) => handleCloseTab(filename, e)}
                className="hover:bg-destructive hover:text-destructive-foreground rounded-sm p-1 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1">
        {activeTab ? (
          <Editor
            height="100%"
            language={getLanguage(activeTab)}
            value={editorValue}
            onChange={handleEditorChange}
            theme={isDark ? 'vs-dark' : 'vs-light'}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              wordWrap: 'on',
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true
              },
              suggest: {
                showKeywords: true,
                showSnippets: true
              },
              quickSuggestions: {
                other: true,
                comments: true,
                strings: true
              },
              parameterHints: {
                enabled: true
              },
              hover: {
                enabled: true
              }
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No file open</h3>
              <p className="text-sm">Open a file from the explorer to start coding</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
