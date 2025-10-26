# AI-Coder Frontend

A modern React-based code editor interface built with TypeScript, Tailwind CSS, and Monaco Editor, designed for Electron applications.

## Features

### 🎨 Modern UI Components
- **EditorPanel**: Monaco Editor with syntax highlighting and IntelliSense
- **ChatPanel**: AI-powered conversational interface
- **FileExplorer**: Hierarchical file tree with expand/collapse
- **TerminalView**: Integrated terminal for command execution
- **SettingsModal**: Comprehensive settings management
- **TopMenu**: Application menu with keyboard shortcuts

### 🎯 Layout Structure
- **Left Panel (20%)**: FileExplorer for project navigation
- **Center Panel (60%)**: EditorPanel with tabbed interface
- **Right Panel (20%)**: ChatPanel for AI assistance
- **Bottom Panel (20%)**: TerminalView for command execution
- **Top Bar**: Menu with File, Edit, AI, and Settings options

### 🔧 Key Features
- **Multi-tab Editor**: Open and manage multiple files simultaneously
- **Theme Support**: Light, Dark, and System theme modes
- **LocalStorage Persistence**: Settings and state persist across sessions
- **Responsive Design**: Adapts to different screen sizes
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Context Awareness**: AI chat has access to current file content

## Component Architecture

### Context Providers
- **AppContext**: Manages file state, open tabs, and project data
- **ThemeContext**: Handles theme switching and persistence

### Core Components
- **EditorPanel**: Monaco Editor with language detection and syntax highlighting
- **ChatPanel**: AI chat interface with code analysis and generation
- **FileExplorer**: File tree with drag-and-drop support
- **TerminalView**: Command execution with output display
- **SettingsModal**: Comprehensive settings with import/export

### Utilities
- **Type Declarations**: Electron API type definitions
- **Helper Functions**: File operations, formatting, and common utilities

## Technology Stack

- **React 18**: Modern React with hooks and context
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Monaco Editor**: VS Code editor component
- **Lucide React**: Modern icon library
- **React Router**: Client-side routing
- **Socket.io**: Real-time communication

## Development

### Prerequisites
- Node.js 18.0.0+
- npm or yarn

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Usage

### Opening Files
1. Click files in the FileExplorer to open them
2. Use Ctrl+O to open file dialog
3. Drag and drop files onto the editor

### AI Assistance
1. Open the ChatPanel on the right
2. Ask questions about your code
3. Request code analysis or generation
4. Get debugging help and suggestions

### Terminal
1. Use the TerminalView at the bottom
2. Execute commands like npm, git, node
3. View command output in real-time
4. Clear terminal or stop execution as needed

### Settings
1. Click the Settings button in the top menu
2. Configure appearance, editor, AI, and general settings
3. Export/import settings for backup or sharing
4. Test Ollama connection for AI features

## Customization

### Themes
The application supports three theme modes:
- **Light**: Clean, bright interface
- **Dark**: Easy on the eyes for coding
- **System**: Follows OS theme preference

### Editor Settings
- Font size (10-24px)
- Tab size (2-8 spaces)
- Word wrap toggle
- Minimap toggle
- Line numbers toggle
- Bracket pair colorization

### AI Configuration
- Ollama URL configuration
- Model selection (CodeLlama, Llama 2, Mistral, Gemma)
- Connection testing
- Fallback mode when AI unavailable

## File Structure

```
frontend/src/
├── components/          # React components
│   ├── EditorPanel.tsx  # Monaco editor with tabs
│   ├── ChatPanel.tsx    # AI chat interface
│   ├── FileExplorer.tsx # File tree navigation
│   ├── TerminalView.tsx # Command execution
│   ├── SettingsModal.tsx # Settings management
│   └── TopMenu.tsx      # Application menu
├── context/             # React context providers
│   ├── AppContext.tsx   # App state management
│   └── ThemeContext.tsx # Theme management
├── types/               # TypeScript declarations
│   └── electron.d.ts    # Electron API types
├── utils/               # Utility functions
│   └── index.ts         # Helper functions
├── App.tsx              # Main app component
├── main.tsx             # App entry point
└── index.css            # Global styles
```

## Integration

### Electron Integration
The frontend integrates with Electron through:
- Preload script for secure IPC
- Menu actions and keyboard shortcuts
- File system operations
- Native dialog support

### Backend Integration
Communicates with the backend via:
- WebSocket for real-time updates
- REST API for file operations
- AI agent integration
- Sandbox command execution

## Performance

### Optimizations
- Lazy loading of components
- Debounced input handling
- Efficient state management
- Minimal re-renders with React.memo
- Optimized Monaco Editor configuration

### Memory Management
- Automatic cleanup of event listeners
- Efficient file content caching
- Proper component unmounting
- Garbage collection friendly

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow TypeScript best practices
2. Use Tailwind CSS for styling
3. Maintain component documentation
4. Test with different themes
5. Ensure accessibility compliance

## License

MIT License - see LICENSE file for details

