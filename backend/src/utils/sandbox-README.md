# Secure Sandbox Executor

A comprehensive Node.js module for safely executing terminal commands with advanced security measures, process management, and comprehensive logging.

## Features

### 🔒 Security Features
- **Command Blocking**: Blocks unsafe commands (sudo, rm, shutdown, etc.)
- **Pattern Detection**: Detects dangerous command patterns
- **Path Traversal Protection**: Prevents directory traversal attacks
- **Process Isolation**: Commands run in isolated environment
- **Resource Limits**: Configurable timeouts and output limits

### ⚡ Process Management
- **Concurrent Process Control**: Limits maximum concurrent processes
- **Process Cancellation**: Kill specific processes or all processes
- **Timeout Handling**: Auto-kill processes after inactivity
- **Process Monitoring**: Track active processes and their status

### 📊 Streaming & Logging
- **Real-time Streaming**: Stream stdout/stderr as it happens
- **Comprehensive Logging**: Log every executed command
- **Execution History**: Retrieve and manage execution logs
- **Performance Tracking**: Monitor execution times and resource usage

### 🛠️ Advanced Features
- **Event-driven Architecture**: Listen to process events
- **Configurable Options**: Customize timeouts, limits, and behavior
- **Error Handling**: Robust error handling with fallback mechanisms
- **Cross-platform Support**: Works on Windows, Linux, and macOS

## Installation

The module is included in the AI-Coder backend. No additional installation required.

## Quick Start

```javascript
const { sandbox } = require('./sandbox');

// Basic command execution
const result = await sandbox.runCommand('echo', ['Hello, World!']);
console.log('Output:', result.stdout);
```

## API Reference

### runCommand(command, args, onDataCallback, options)

Execute a command safely in the sandbox.

**Parameters:**
- `command` (string): The command to execute
- `args` (string[]): Command arguments (default: [])
- `onDataCallback` (function): Callback for stdout/stderr data: `(data) => void`
- `options` (object): Execution options

**Options:**
- `timeout` (number): Timeout in milliseconds (default: 60000)
- `workingDirectory` (string): Working directory (default: process.cwd())
- `environment` (object): Environment variables
- `maxOutputLength` (number): Maximum output length (default: 100000)
- `allowUnsafe` (boolean): Allow unsafe commands (default: false)

**Returns:** Promise resolving to:
```javascript
{
  success: boolean,
  exitCode: number,
  stdout: string,
  stderr: string,
  executionTime: number,
  command: string,
  args: string[],
  timestamp: Date,
  killed: boolean,
  timeout: boolean
}
```

### killProcess(processId)

Kill a specific process.

**Parameters:**
- `processId` (string): The process ID to kill

**Returns:** boolean - true if process was killed

### killAllProcesses()

Kill all active processes.

### getStatus()

Get sandbox status.

**Returns:**
```javascript
{
  activeProcesses: number,
  maxConcurrentProcesses: number,
  defaultTimeout: number,
  maxOutputLength: number,
  logsDir: string,
  processIds: string[]
}
```

### getExecutionLogs(limit)

Get execution logs.

**Parameters:**
- `limit` (number): Maximum number of logs to return (default: 100)

**Returns:** Array of execution log objects

### clearExecutionLogs()

Clear all execution logs.

### updateConfig(config)

Update sandbox configuration.

**Parameters:**
- `config` (object): Configuration updates

## Usage Examples

### Basic Command Execution

```javascript
const { sandbox } = require('./sandbox');

// Execute a simple command
const result = await sandbox.runCommand('ls', ['-la']);
console.log('Success:', result.success);
console.log('Output:', result.stdout);
console.log('Error:', result.stderr);
console.log('Execution time:', result.executionTime, 'ms');
```

### Streaming Output

```javascript
// Execute command with streaming output
await sandbox.runCommand('npm', ['install'], (data) => {
  console.log(`[${data.type}] ${data.content}`);
});
```

### With Options

```javascript
// Execute with custom options
const result = await sandbox.runCommand('node', ['script.js'], undefined, {
  timeout: 30000,
  workingDirectory: '/path/to/project',
  environment: { NODE_ENV: 'development' },
  maxOutputLength: 50000
});
```

### Process Management

```javascript
// Start a long-running process
const processPromise = sandbox.runCommand('npm', ['run', 'build']);

// Cancel after 30 seconds
setTimeout(() => {
  const status = sandbox.getStatus();
  status.processIds.forEach(processId => {
    sandbox.killProcess(processId);
  });
}, 30000);

// Or kill all processes
sandbox.killAllProcesses();
```

### Security Features

```javascript
// These commands will be blocked:
try {
  await sandbox.runCommand('sudo', ['rm', '-rf', '/']);  // Blocked
} catch (error) {
  console.log('Blocked:', error.message);
}

try {
  await sandbox.runCommand('shutdown', ['-h', 'now']);   // Blocked
} catch (error) {
  console.log('Blocked:', error.message);
}

// Allow unsafe commands (use with caution)
await sandbox.runCommand('sudo', ['ls'], undefined, { allowUnsafe: true });
```

### Event Handling

```javascript
// Listen to sandbox events
sandbox.on('stdout', (data) => {
  console.log('STDOUT:', data.content);
});

sandbox.on('stderr', (data) => {
  console.log('STDERR:', data.content);
});

sandbox.on('complete', (data) => {
  console.log('Process completed:', data.result.success);
});

sandbox.on('error', (data) => {
  console.error('Process error:', data.error);
});

sandbox.on('timeout', (data) => {
  console.log('Process timed out:', data.processId);
});
```

### Execution Logs

```javascript
// Get recent execution logs
const logs = sandbox.getExecutionLogs(50);
logs.forEach((log, index) => {
  console.log(`${index + 1}. ${log.command} ${log.args.join(' ')} - ${log.success ? 'SUCCESS' : 'FAILED'} (${log.executionTime}ms)`);
});

// Clear execution logs
sandbox.clearExecutionLogs();
```

## Blocked Commands

The sandbox blocks the following categories of commands:

### System Commands
- `sudo`, `su`, `rm`, `del`, `format`, `fdisk`, `mkfs`
- `shutdown`, `reboot`, `halt`, `poweroff`, `init`
- `systemctl`, `service`, `chmod`, `chown`, `chgrp`
- `umount`, `mount`, `dd`, `parted`, `gparted`

### Network Commands
- `wget`, `curl`, `nc`, `netcat`, `telnet`, `ftp`, `sftp`
- `scp`, `rsync`, `ssh`, `ssh-keygen`, `ssh-add`
- `iptables`, `ufw`, `firewall-cmd`, `nft`

### Process Management
- `killall`, `pkill`, `kill`, `killall5`, `nohup`
- `disown`, `bg`, `fg`, `jobs`, `wait`

### Shell Built-ins
- `exec`, `eval`, `source`, `export`, `unset`
- `alias`, `unalias`, `history`, `fc`, `bind`
- `set`, `shopt`, `ulimit`, `umask`, `trap`
- `exit`, `logout`, `suspend`

### Development Tools
- `crontab`, `at`, `batch`, `anacron`
- `strace`, `ltrace`, `gdb`, `lldb`, `valgrind`
- `tcpdump`, `wireshark`, `nmap`, `masscan`

### Security Tools
- `hydra`, `john`, `hashcat`, `aircrack-ng`
- `sqlmap`, `nikto`, `dirb`, `gobuster`
- `metasploit`, `msfconsole`, `msfvenom`
- `burpsuite`, `owasp-zap`, `w3af`

### Antivirus Software
- `clamav`, `sophos`, `f-secure`, `eset`
- `webroot`, `panda`, `comodo`, `avira`
- `norton`, `bullguard`, `g-data`, `emsisoft`

## Configuration

### Constructor Options

```javascript
const sandbox = new SecureSandbox({
  logsDir: './logs',
  maxConcurrentProcesses: 10,
  defaultTimeout: 60000,
  maxOutputLength: 100000
});
```

### Environment Variables

```bash
SANDBOX_DIR=./sandbox/temp
SANDBOX_MAX_CONCURRENT_PROCESSES=10
SANDBOX_DEFAULT_TIMEOUT=60000
SANDBOX_MAX_OUTPUT_LENGTH=100000
```

## Testing

Run the test suite to verify functionality:

```bash
# TypeScript
npx tsx src/utils/testSandbox.ts

# JavaScript
node src/utils/testSandbox.js
```

## Security Considerations

### Command Validation
- Commands are validated against a whitelist
- Dangerous patterns are detected and blocked
- Path traversal attempts are prevented
- Resource limits are enforced

### Process Isolation
- Commands run in isolated environment
- Environment variables are sanitized
- Working directory is restricted
- Process limits are enforced

### Logging and Monitoring
- All commands are logged with metadata
- Execution times are tracked
- Resource usage is monitored
- Security violations are recorded

## Performance Tips

1. **Process Limits**: Set appropriate concurrent process limits
2. **Timeout Management**: Use reasonable timeouts for different command types
3. **Output Limits**: Limit output length to prevent memory issues
4. **Log Rotation**: Regularly clear old execution logs
5. **Resource Monitoring**: Monitor system resources during execution

## Troubleshooting

### Common Issues

1. **Command Blocked**
   - Check if command is in blocked list
   - Use `allowUnsafe: true` for trusted commands
   - Verify command syntax and arguments

2. **Process Timeout**
   - Increase timeout value
   - Check if command is hanging
   - Monitor system resources

3. **Permission Errors**
   - Check working directory permissions
   - Verify command exists and is executable
   - Check environment variables

4. **Memory Issues**
   - Reduce maxOutputLength
   - Limit concurrent processes
   - Clear execution logs regularly

### Debug Mode

Enable debug logging:

```javascript
// Set debug environment variable
process.env.DEBUG = 'sandbox:*';

// Or enable in code
sandbox.updateConfig({
  debug: true
});
```

## Contributing

1. Follow security best practices
2. Add comprehensive tests
3. Update documentation
4. Test with multiple operating systems
5. Consider security implications

## License

MIT License - see LICENSE file for details

