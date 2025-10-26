#!/bin/bash

# AI-Coder Development Startup Script
# This script sets up and starts the development environment

echo "🚀 Starting AI-Coder Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18.0.0 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18.0.0 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

# Install frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Install backend dependencies
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p sandbox/temp
mkdir -p sandbox/logs
mkdir -p logs

# Check if Ollama is running (optional)
if command -v ollama &> /dev/null; then
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama is running and accessible"
    else
        echo "⚠️  Ollama is not running. AI features will use fallback mode."
        echo "   To start Ollama: ollama serve"
    fi
else
    echo "⚠️  Ollama is not installed. AI features will use fallback mode."
    echo "   Install Ollama from: https://ollama.ai/"
fi

# Start development servers
echo "🎯 Starting development servers..."
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo "   Electron: Will start after frontend is ready"
echo ""

# Start all services concurrently
npm run dev

