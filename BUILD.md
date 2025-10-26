# AI-Coder Build Configuration

This file contains build scripts and configuration for cross-platform deployment.

## Build Commands

### Development
```bash
npm run dev              # Start all development servers
npm run dev:frontend     # Frontend only (React + Vite)
npm run dev:backend      # Backend only (Express + WebSocket)
npm run dev:electron     # Electron only
```

### Production
```bash
npm run build            # Build all components
npm run build:frontend   # Build React frontend
npm run build:backend    # Build Node.js backend
npm run build:electron   # Build Electron app
```

### Distribution
```bash
npm run pack             # Package without installer
npm run dist             # Create installers for all platforms
npm run dist:win         # Windows installer only
npm run dist:mac         # macOS installer only
npm run dist:linux       # Linux installer only
```

## Platform Support

- **Windows**: NSIS installer, portable executable
- **macOS**: DMG package, App Store compatible
- **Linux**: AppImage, DEB, RPM packages

## Build Requirements

- Node.js 18.0.0+
- npm or yarn
- Platform-specific build tools:
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: build-essential

## Output Directories

- `frontend/dist/` - Built React application
- `backend/dist/` - Compiled Node.js backend
- `dist/` - Final Electron application
- `release/` - Platform-specific installers

## Configuration Files

- `package.json` - Build scripts and dependencies
- `electron-builder.json` - Electron packaging configuration
- `vite.config.ts` - Frontend build configuration
- `tsconfig.json` - TypeScript compilation settings

