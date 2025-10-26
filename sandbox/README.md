# AI-Coder Sandbox

This directory contains secure command execution environment and related files.

## Purpose

The sandbox provides a secure environment for:
- Code execution
- Command line operations
- File system operations
- Testing and validation

## Security Features

- **Isolated Environment**: Commands run in a controlled environment
- **Command Whitelisting**: Only approved commands can be executed
- **Resource Limits**: CPU, memory, and execution time limits
- **File System Isolation**: Restricted access to system files
- **Process Management**: Automatic cleanup of spawned processes

## Directory Structure

```
sandbox/
├── temp/           # Temporary files and execution workspace
├── logs/           # Execution logs and audit trail
├── config/         # Sandbox configuration files
└── scripts/        # Utility scripts for sandbox management
```

## Configuration

### Security Settings
- Maximum execution time: 30 seconds
- Maximum concurrent processes: 5
- Allowed commands: node, npm, npx, git, ls, pwd, etc.
- Working directory: `./sandbox/temp`

### File Permissions
- Read-only access to system directories
- Write access limited to temp directory
- Automatic cleanup of temporary files

## Usage

The sandbox is automatically managed by the backend `SandboxManager` class. No manual intervention required.

## Monitoring

- All executions are logged with timestamps
- Process monitoring and automatic cleanup
- Resource usage tracking
- Security event logging

## Troubleshooting

- Check logs in `sandbox/logs/` for execution issues
- Verify file permissions for temp directory
- Ensure sufficient disk space for temporary files
- Monitor system resources during heavy usage

