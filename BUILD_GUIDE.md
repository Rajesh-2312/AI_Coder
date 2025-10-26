# AI-Coder Build Guide

This guide explains how to build and package AI-Coder into cross-platform desktop applications.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Git (for cloning the repository)

### Platform-specific requirements:

- **Windows**: Windows 10/11, Visual Studio Build Tools (for native modules)
- **macOS**: macOS 10.15 or higher, Xcode Command Line Tools
- **Linux**: Ubuntu 18.04+ or equivalent, build-essential package

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/ai-coder.git
   cd ai-coder
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install build resources**:
   - Place icon files in the `build/` directory:
     - `icon.ico` (Windows, 256x256)
     - `icon.icns` (macOS, 512x512)
     - `icon.png` (Linux, 512x512)
   - Add `dmg-background.png` for macOS DMG (540x380)

## Development

### Start development servers:
```bash
npm run dev
```

This will start:
- Frontend development server (Vite) on port 5173
- Backend development server on port 3000
- Electron application

### Individual services:
```bash
npm run dev:frontend  # Frontend only
npm run dev:backend   # Backend only
npm run dev:electron  # Electron only
```

## Building

### Build all components:
```bash
npm run build
```

This builds:
- Frontend React app (TypeScript → JavaScript bundle)
- Backend Node.js server (TypeScript → JavaScript)
- Electron main process

### Individual builds:
```bash
npm run build:frontend  # Build React app
npm run build:backend   # Build Node.js backend
npm run build:electron  # Package with Electron Builder
```

## Packaging

### Package for all platforms:
```bash
npm run dist:all
```

### Platform-specific packaging:
```bash
npm run dist:win    # Windows (NSIS installer + portable)
npm run dist:mac    # macOS (DMG + ZIP)
npm run dist:linux  # Linux (AppImage + DEB + RPM)
```

### Create unpacked directories:
```bash
npm run pack
```

## Output Files

After building, you'll find the packaged applications in the `dist/` directory:

### Windows
- `AI-Coder Setup 1.0.0.exe` - NSIS installer
- `AI-Coder 1.0.0.exe` - Portable executable

### macOS
- `AI-Coder-1.0.0.dmg` - Disk image installer
- `AI-Coder-1.0.0-mac.zip` - ZIP archive

### Linux
- `AI-Coder-1.0.0.AppImage` - AppImage executable
- `ai-coder_1.0.0_amd64.deb` - Debian package
- `ai-coder-1.0.0.x86_64.rpm` - RPM package

## Model Download System

The application includes an automatic model download system:

### First Launch Flow
1. App checks if AI model exists in user data directory
2. If missing, shows setup window with progress bar
3. Downloads Qwen2.5-Coder-Lite model (~800MB)
4. Verifies download integrity
5. Marks setup as complete
6. Launches main application

### Model Configuration
- **Model**: Qwen2.5-Coder-Lite
- **Size**: ~800MB
- **Format**: GGUF
- **Location**: `{userData}/model/qwen2.5-coder-lite.gguf`

### Reset Setup
To force re-download of the model:
```bash
npm run setup:reset
```

## Build Configuration

### Electron Builder Configuration (`electron-builder.json`)

Key settings:
- **App ID**: `com.aicoder.app`
- **Product Name**: `AI-Coder`
- **Output Directory**: `dist/`
- **Build Resources**: `build/`

### Platform Targets
- **Windows**: NSIS installer, portable executable
- **macOS**: DMG disk image, ZIP archive
- **Linux**: AppImage, DEB package, RPM package

### File Inclusion
The build excludes the model files from the package:
- Model files are downloaded on first launch
- Reduces package size from ~800MB to ~50MB
- Enables automatic updates without re-downloading models

## Troubleshooting

### Common Issues

1. **Build fails with "Module not found"**:
   ```bash
   npm run clean
   npm install
   npm run build
   ```

2. **Electron Builder fails on macOS**:
   - Ensure Xcode Command Line Tools are installed
   - Check code signing certificates

3. **Model download fails**:
   - Check internet connection
   - Verify GitHub/HuggingFace access
   - Run `npm run setup:reset` to retry

4. **Permission errors on Linux**:
   ```bash
   sudo chmod +x dist/AI-Coder-*.AppImage
   ```

### Debug Mode
Run with debug logging:
```bash
DEBUG=* npm run dist
```

### Clean Build
Remove all build artifacts:
```bash
npm run clean
npm run build
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build and Package
on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build application
        run: npm run build
      
      - name: Package application
        run: npm run dist
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ai-coder-${{ matrix.os }}
          path: dist/
```

## Security Considerations

### Code Signing
For production releases:
1. Obtain code signing certificates
2. Configure in `electron-builder.json`
3. Add certificate environment variables

### Model Verification
- Model files are verified after download
- Checksum validation (when available)
- Secure download from trusted sources

### Sandbox Security
- Command execution is sandboxed
- Process isolation and resource limits
- Input validation and sanitization

## Performance Optimization

### Build Optimization
- Tree shaking for unused code
- Code splitting for faster loading
- Asset optimization and compression

### Runtime Optimization
- Lazy loading of components
- Efficient state management
- Memory usage monitoring

## Release Process

1. **Update version** in `package.json`
2. **Build and test** all platforms
3. **Create GitHub release** with artifacts
4. **Update documentation** and changelog
5. **Distribute** through appropriate channels

## Support

For build issues:
- Check the troubleshooting section
- Review build logs for errors
- Open an issue on GitHub
- Check platform-specific documentation
