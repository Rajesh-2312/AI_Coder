@echo off
REM AI-Coder Production Build Script for Windows
REM This script builds the application for production deployment

echo 🏗️  Building AI-Coder for Production...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18.0.0 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Clean previous builds
echo 🧹 Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
if exist "frontend\dist" rmdir /s /q "frontend\dist"
if exist "backend\dist" rmdir /s /q "backend\dist"
if exist "electron\dist" rmdir /s /q "electron\dist"

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Build frontend
echo 🎨 Building frontend...
cd frontend
npm install
npm run build
cd ..

REM Build backend
echo ⚙️  Building backend...
cd backend
npm install
npm run build
cd ..

REM Build Electron app
echo 📱 Building Electron app...
npm run build:electron

echo ✅ Build completed successfully!
echo 📁 Output directory: dist/
echo.
echo To create installers:
echo   npm run dist
echo.
echo To package without installer:
echo   npm run pack

pause

