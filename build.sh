#!/bin/bash

# AI-Coder Production Build Script
# This script builds the application for production deployment

echo "🏗️  Building AI-Coder for Production..."

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

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf frontend/dist/
rm -rf backend/dist/
rm -rf electron/dist/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build backend
echo "⚙️  Building backend..."
cd backend
npm install
npm run build
cd ..

# Build Electron app
echo "📱 Building Electron app..."
npm run build:electron

echo "✅ Build completed successfully!"
echo "📁 Output directory: dist/"
echo ""
echo "To create installers:"
echo "  npm run dist"
echo ""
echo "To package without installer:"
echo "  npm run pack"

