# AI-Coder Development Environment

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Git
- Ollama (for AI features)

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd ai-coder
   npm install
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Development Commands

- `npm run dev` - Start all development servers (frontend, backend, electron)
- `npm run dev:frontend` - Start only frontend (React + Vite)
- `npm run dev:backend` - Start only backend (Express + WebSocket)
- `npm run dev:electron` - Start only Electron app
- `npm run build` - Build all components for production
- `npm run start` - Start production Electron app

## Project Structure

```
ai-coder/
├── frontend/          # React + Tailwind + Monaco editor
├── backend/           # Express + WebSocket + AI agents
├── electron/          # Electron main process
├── model/             # AI model configuration
├── sandbox/           # Secure command execution
├── main.js            # Electron entry point
├── preload.js         # Electron preload script
└── package.json       # Root package configuration
```

## Features

- **Code Editor**: Monaco Editor with syntax highlighting
- **AI Assistant**: Chat-based AI help with code analysis
- **File Explorer**: Project file management
- **WebSocket**: Real-time communication
- **Sandbox**: Secure code execution
- **Cross-platform**: Windows, macOS, Linux support

## Configuration

### Environment Variables

Create `.env` file in root directory:
```
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### Ollama Setup

1. Install Ollama: https://ollama.ai/
2. Pull models:
   ```bash
   ollama pull codellama
   ollama pull mistral
   ```
3. Start Ollama service:
   ```bash
   ollama serve
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in package.json scripts
2. **Permission errors**: Run with appropriate permissions
3. **Build failures**: Clear node_modules and reinstall
4. **Electron issues**: Check Electron version compatibility

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - see LICENSE file for details

