@echo off
REM Sandbox cleanup script for Windows
REM This script cleans up temporary files and processes

echo Starting sandbox cleanup...

REM Clean up temporary files older than 1 hour
forfiles /p ".\sandbox\temp" /s /m *.* /d -1 /c "cmd /c del @path" 2>nul

REM Clean up empty directories
for /f "delims=" %%i in ('dir ".\sandbox\temp" /ad /b /s ^| sort /r') do rd "%%i" 2>nul

REM Clean up log files older than 7 days
forfiles /p ".\sandbox\logs" /s /m *.* /d -7 /c "cmd /c del @path" 2>nul

echo Sandbox cleanup completed

