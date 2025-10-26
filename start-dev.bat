@echo off
REM AI-Coder Development Startup Script for Windows
REM This script sets up and starts the development environment

echo 🚀 Starting AI-Coder Development Environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18.0.0 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed.
    pause
    exit /b 1
)

echo ✅ npm version:
npm --version

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing root dependencies...
    npm install
)

REM Install frontend dependencies
if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

REM Install backend dependencies
if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend
    npm install
    cd ..
)

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist "sandbox\temp" mkdir "sandbox\temp"
if not exist "sandbox\logs" mkdir "sandbox\logs"
if not exist "logs" mkdir "logs"

REM Check if Ollama is running (optional)
ollama --version >nul 2>&1
if %errorlevel% equ 0 (
    curl -s http://localhost:11434/api/tags >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Ollama is running and accessible
    ) else (
        echo ⚠️  Ollama is not running. AI features will use fallback mode.
        echo    To start Ollama: ollama serve
    )
) else (
    echo ⚠️  Ollama is not installed. AI features will use fallback mode.
    echo    Install Ollama from: https://ollama.ai/
)

REM Start development servers
echo 🎯 Starting development servers...
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:3000
echo    Electron: Will start after frontend is ready
echo.

REM Start all services concurrently
npm run dev

pause

