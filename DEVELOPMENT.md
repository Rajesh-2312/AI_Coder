# AI-Coder Development Workflow

## Quick Start Commands

### Development
```bash
# Start all development servers
npm run dev

# Or use platform-specific scripts
./start-dev.sh      # Linux/macOS
start-dev.bat        # Windows
```

### Production Build
```bash
# Build for production
npm run build

# Or use platform-specific scripts
./build.sh           # Linux/macOS
build.bat            # Windows
```

## Development Workflow

### 1. Initial Setup
1. Clone the repository
2. Run `npm install` to install dependencies
3. Copy `env.example` to `.env` and configure
4. Install Ollama for AI features (optional)
5. Run `npm run dev` to start development

### 2. Development Process
1. **Frontend Development**: Edit files in `frontend/src/`
2. **Backend Development**: Edit files in `backend/src/`
3. **Electron Development**: Edit `main.js` and `preload.js`
4. **Hot Reload**: All changes are automatically reflected

### 3. Testing
- Frontend: Access at `http://localhost:5173`
- Backend API: Access at `http://localhost:3000`
- WebSocket: Connects automatically
- Electron: Opens automatically after frontend loads

### 4. Building
- Development builds: Automatic with `npm run dev`
- Production builds: Run `npm run build`
- Distribution packages: Run `npm run dist`

## File Structure Overview

```
ai-coder/
├── frontend/              # React + Tailwind + Monaco
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.tsx       # Main app component
│   │   └── main.tsx      # Entry point
│   ├── package.json      # Frontend dependencies
│   └── vite.config.ts   # Vite configuration
├── backend/               # Express + WebSocket + AI
│   ├── src/
│   │   ├── agents/       # AI agent classes
│   │   ├── sandbox/      # Secure execution
│   │   └── index.ts      # Server entry point
│   └── package.json      # Backend dependencies
├── model/                # AI model configuration
├── sandbox/              # Secure command execution
├── main.js               # Electron main process
├── preload.js            # Electron preload script
└── package.json          # Root configuration
```

## Port Configuration

- **Frontend**: 5173 (Vite dev server)
- **Backend**: 3000 (Express + WebSocket)
- **Ollama**: 11434 (AI model server)

## Environment Variables

Key environment variables (see `env.example`):
- `NODE_ENV`: development/production
- `PORT`: Backend server port
- `FRONTEND_URL`: Frontend URL for CORS
- `OLLAMA_BASE_URL`: Ollama server URL

## Troubleshooting

### Common Issues
1. **Port conflicts**: Change ports in package.json
2. **Permission errors**: Run with appropriate permissions
3. **Build failures**: Clear node_modules and reinstall
4. **Electron issues**: Check Electron version compatibility

### Debug Commands
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check if ports are available
netstat -an | grep :5173
netstat -an | grep :3000

# Check Ollama status
curl http://localhost:11434/api/tags
```

### Log Locations
- Application logs: `logs/`
- Sandbox logs: `sandbox/logs/`
- Build logs: Console output

## Performance Tips

1. **Development**: Use `npm run dev` for hot reload
2. **Production**: Use `npm run build` for optimized builds
3. **AI Models**: Install only needed Ollama models
4. **Memory**: Close unused applications during development
5. **Storage**: Clean up `sandbox/temp/` regularly

