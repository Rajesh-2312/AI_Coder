# Frontend-Backend Integration

This document describes the integration between the AI-Coder frontend and backend APIs via WebSocket and REST.

## Overview

The frontend now uses custom React hooks to communicate with the backend services:

- **useAIChat**: WebSocket connection for real-time AI streaming
- **useFileSystem**: REST API for file CRUD operations
- **useTerminal**: REST API for command execution with streaming output
- **useSettings**: REST API for user preferences management

## Hooks Implementation

### useAIChat Hook

**Location**: `frontend/src/hooks/useAIChat.ts`

**Purpose**: Manages real-time AI chat via WebSocket connection to `ws://localhost:3000/ai`

**Key Features**:
- WebSocket connection with auto-reconnect
- Token-by-token streaming from Ollama
- Agent context passing (active file, project type, language)
- Stream cancellation and backpressure handling
- Connection status and statistics

**Usage**:
```typescript
const {
  messages,
  isConnected,
  isStreaming,
  stats,
  error,
  sendPrompt,
  cancelStream,
  clearChat
} = useAIChat()

// Send prompt with context
sendPrompt("Explain this code", {
  useOrchestrator: true,
  agentContext: {
    activeFile: "App.tsx",
    projectType: "React",
    language: "typescript",
    code: fileContent,
    hasCodeSelection: false
  }
})
```

**WebSocket Events**:
- `ai:connected` - Connection established
- `ai:stream:start` - Stream started
- `ai:token` - Token received
- `ai:stream:complete` - Stream completed
- `ai:done` - Final completion
- `ai:error` - Error occurred
- `ai:stream:cancelled` - Stream cancelled

### useFileSystem Hook

**Location**: `frontend/src/hooks/useFileSystem.ts`

**Purpose**: Handles file system CRUD operations via REST API `/api/files/*`

**Key Features**:
- Secure file operations with path validation
- Recursive file tree listing
- File content reading/writing
- File/folder creation and deletion
- File search and preview diff
- Error handling and loading states

**Usage**:
```typescript
const {
  fileTree,
  currentDirectory,
  isLoading,
  error,
  stats,
  listFiles,
  readFile,
  writeFile,
  createFile,
  deleteFile,
  refresh
} = useFileSystem()

// Read file content
const content = await readFile("src/App.tsx")

// Write file content
await writeFile("src/NewFile.tsx", "export const NewFile = () => {}")

// Create new file
await createFile("src/NewFile.tsx", "// New file content")
```

**API Endpoints**:
- `GET /api/files/list?dir=.` - List files in directory
- `GET /api/files/read?filePath=...` - Read file content
- `POST /api/files/write` - Write file content
- `DELETE /api/files/delete` - Delete file/folder
- `PUT /api/files/rename` - Rename file/folder
- `POST /api/files/diff` - Preview diff
- `GET /api/files/info?filePath=...` - Get file info
- `GET /api/files/search?query=...` - Search files

### useTerminal Hook

**Location**: `frontend/src/hooks/useTerminal.ts`

**Purpose**: Executes shell commands via REST API `/api/execute` with streaming output

**Key Features**:
- Secure command execution via sandbox
- Real-time stdout/stderr streaming
- Process management (kill, cancel)
- Command history and statistics
- Sandbox status monitoring
- Error handling and timeout management

**Usage**:
```typescript
const {
  outputs,
  currentExecution,
  isExecuting,
  error,
  stats,
  sandboxStatus,
  executeCommand,
  killProcess,
  clearOutput,
  shortcuts
} = useTerminal()

// Execute command
await executeCommand("npm", ["install", "react"])

// Use shortcuts
await shortcuts.npm(["run", "dev"])
await shortcuts.git(["status"])
await shortcuts.ls(["./src"])
```

**API Endpoints**:
- `POST /api/execute` - Execute command
- `POST /api/execute/kill` - Kill process
- `POST /api/execute/kill-all` - Kill all processes
- `GET /api/execute/status` - Get sandbox status

### useSettings Hook

**Location**: `frontend/src/hooks/useSettings.ts`

**Purpose**: Manages user preferences via REST API `/api/config`

**Key Features**:
- Comprehensive settings management
- LocalStorage fallback
- Settings validation
- Import/export functionality
- Auto-save with debouncing
- Error handling and loading states

**Usage**:
```typescript
const {
  settings,
  isLoading,
  isSaving,
  error,
  lastSaved,
  updateSetting,
  updateSettings,
  resetSettings,
  exportSettings,
  importSettings
} = useSettings()

// Update specific setting
updateSetting('editor', 'fontSize', 16)

// Update multiple settings
updateSettings({
  theme: 'dark',
  editor: { fontSize: 16, tabSize: 4 }
})

// Export settings
exportSettings()
```

**Settings Structure**:
```typescript
interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  editor: {
    fontSize: number
    tabSize: number
    wordWrap: boolean
    minimap: boolean
    lineNumbers: boolean
    autoSave: boolean
    autoSaveDelay: number
  }
  ai: {
    defaultModel: string
    temperature: number
    maxTokens: number
    useOrchestrator: boolean
    systemPrompt: string
  }
  files: {
    autoRefresh: boolean
    showHiddenFiles: boolean
    maxFileSize: number
    allowedExtensions: string[]
  }
  terminal: {
    fontSize: number
    fontFamily: string
    theme: 'dark' | 'light'
    autoScroll: boolean
    maxOutputLines: number
  }
  general: {
    language: string
    timezone: string
    dateFormat: string
    notifications: boolean
    autoConnect: boolean
  }
}
```

## Component Integration

### ChatPanel Integration

**File**: `frontend/src/components/ChatPanel.tsx`

**Changes**:
- Replaced mock AI responses with real WebSocket streaming
- Added connection status indicators
- Integrated agent context passing
- Added stream cancellation controls
- Real-time token display with agent information

**Features**:
- WebSocket connection status (connected/disconnected)
- Streaming indicator with agent name
- Cancel stream button during active streaming
- Error display with retry options
- Token count and statistics

### FileExplorer Integration

**File**: `frontend/src/components/FileExplorer.tsx`

**Changes**:
- Replaced static file tree with dynamic API calls
- Added real file operations (create, delete, rename)
- Integrated file content reading
- Added loading states and error handling
- File statistics display

**Features**:
- Real-time file tree from backend
- File/folder creation and deletion
- File content loading for editor
- Error handling with user feedback
- File statistics (count, size)
- Refresh functionality

### TerminalView Integration

**File**: `frontend/src/components/TerminalView.tsx`

**Changes**:
- Replaced mock command execution with real sandbox execution
- Added real-time output streaming
- Integrated process management
- Added sandbox status monitoring
- Command statistics and history

**Features**:
- Real command execution via sandbox
- Live stdout/stderr streaming
- Process kill/cancel functionality
- Sandbox status monitoring
- Command statistics and success rates
- Error handling and recovery

### SettingsModal Integration

**File**: `frontend/src/components/SettingsModal.tsx`

**Changes**:
- Replaced localStorage-only with backend sync
- Added comprehensive settings structure
- Integrated settings validation
- Added import/export functionality
- Real-time save status indicators

**Features**:
- Backend settings synchronization
- Settings validation and error handling
- Import/export settings functionality
- Auto-save with status indicators
- Reset to defaults option
- Loading and saving states

## Error Handling

All hooks implement comprehensive error handling:

1. **Network Errors**: Connection failures, timeouts
2. **API Errors**: HTTP status codes, validation errors
3. **Data Errors**: Invalid responses, parsing errors
4. **User Errors**: Invalid inputs, permission denied

Error states are exposed to components and displayed with:
- Error messages with context
- Retry mechanisms where appropriate
- Fallback to local storage (settings)
- User-friendly error descriptions

## Loading States

All hooks provide loading states for:
- Initial data loading
- API operations in progress
- Background synchronization
- User-initiated actions

Loading indicators are shown in:
- Component headers
- Action buttons
- Progress bars
- Spinner animations

## Real-time Updates

The integration supports real-time updates through:

1. **WebSocket Streaming**: AI responses, terminal output
2. **Polling**: File system changes, sandbox status
3. **Event-driven**: Settings changes, connection status
4. **Auto-refresh**: File tree updates, statistics

## Security Considerations

- **Path Validation**: All file operations validate paths to prevent traversal attacks
- **Command Whitelisting**: Terminal commands are restricted to safe operations
- **Input Sanitization**: All user inputs are validated and sanitized
- **CORS Protection**: Backend implements proper CORS policies
- **Rate Limiting**: API endpoints have rate limiting protection

## Performance Optimizations

- **Debounced Saves**: Settings auto-save with 1-second debounce
- **Lazy Loading**: File tree loads on demand
- **Caching**: Settings cached in localStorage
- **Streaming**: Large responses streamed to prevent blocking
- **Background Sync**: Non-critical operations run in background

## Development Workflow

1. **Start Backend**: `npm run dev` in `/backend`
2. **Start Frontend**: `npm run dev` in `/frontend`
3. **Test Integration**: Use the UI components to test all features
4. **Monitor Logs**: Check browser console and backend logs
5. **Debug Issues**: Use browser dev tools and network tab

## Testing

Each hook can be tested independently:

```typescript
// Test AI Chat
const { sendPrompt, isConnected } = useAIChat()
expect(isConnected).toBe(true)

// Test File System
const { readFile, fileTree } = useFileSystem()
const content = await readFile("test.txt")

// Test Terminal
const { executeCommand, outputs } = useTerminal()
await executeCommand("echo", ["hello"])

// Test Settings
const { updateSetting, settings } = useSettings()
updateSetting('editor', 'fontSize', 16)
```

## Troubleshooting

**Common Issues**:

1. **WebSocket Connection Failed**
   - Check if backend is running on port 3000
   - Verify WebSocket endpoint is accessible
   - Check browser console for connection errors

2. **File Operations Failed**
   - Verify backend file API is working
   - Check file permissions
   - Ensure valid file paths

3. **Command Execution Failed**
   - Check sandbox status
   - Verify command is whitelisted
   - Check process limits

4. **Settings Not Saving**
   - Check backend config API
   - Verify localStorage permissions
   - Check for validation errors

**Debug Commands**:
```bash
# Check backend status
curl http://localhost:3000/health

# Test WebSocket connection
wscat -c ws://localhost:3000/ai

# Check file API
curl http://localhost:3000/api/files/list?dir=.

# Test execute API
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "echo", "args": ["hello"]}'
```

This integration provides a robust, real-time connection between the frontend and backend, enabling seamless AI assistance, file management, terminal operations, and settings management.

