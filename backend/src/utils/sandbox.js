const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

/**
 * Secure Sandbox Executor for AI-Coder Backend
 * Safely executes terminal commands with comprehensive security measures
 */
class SecureSandbox extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.activeProcesses = new Map();
    this.processTimeouts = new Map();
    this.logsDir = options.logsDir || path.join(process.cwd(), 'logs');
    this.maxConcurrentProcesses = options.maxConcurrentProcesses || 10;
    this.defaultTimeout = options.defaultTimeout || 60000; // 60 seconds
    this.maxOutputLength = options.maxOutputLength || 100000; // 100KB

    // Unsafe commands that should be blocked
    this.unsafeCommands = new Set([
      'sudo', 'su', 'rm', 'del', 'format', 'fdisk', 'mkfs', 'shutdown',
      'reboot', 'halt', 'poweroff', 'init', 'systemctl', 'service',
      'chmod', 'chown', 'chgrp', 'umount', 'mount', 'dd', 'mkfs.ext',
      'mkfs.ntfs', 'mkfs.fat', 'parted', 'gparted', 'cfdisk', 'sfdisk',
      'wipefs', 'blkdiscard', 'hdparm', 'smartctl', 'badblocks',
      'fsck', 'e2fsck', 'xfs_repair', 'ntfsfix', 'chroot', 'killall',
      'pkill', 'kill', 'killall5', 'nohup', 'disown', 'bg', 'fg',
      'jobs', 'wait', 'exec', 'eval', 'source', 'export', 'unset',
      'alias', 'unalias', 'history', 'fc', 'bind', 'set', 'shopt',
      'ulimit', 'umask', 'trap', 'exit', 'logout', 'suspend',
      'wget', 'curl', 'nc', 'netcat', 'telnet', 'ftp', 'sftp',
      'scp', 'rsync', 'ssh', 'ssh-keygen', 'ssh-add', 'ssh-agent',
      'crontab', 'at', 'batch', 'anacron', 'systemd-timer',
      'iptables', 'ufw', 'firewall-cmd', 'nft', 'ip', 'route',
      'arp', 'netstat', 'ss', 'lsof', 'fuser', 'lsof', 'fuser',
      'strace', 'ltrace', 'gdb', 'lldb', 'valgrind', 'perf',
      'tcpdump', 'wireshark', 'nmap', 'masscan', 'zmap',
      'hydra', 'john', 'hashcat', 'aircrack-ng', 'reaver',
      'sqlmap', 'nikto', 'dirb', 'gobuster', 'wfuzz',
      'metasploit', 'msfconsole', 'msfvenom', 'armitage',
      'beef', 'setoolkit', 'social-engineer-toolkit',
      'maltego', 'shodan', 'censys', 'zoomeye',
      'theharvester', 'recon-ng', 'spiderfoot', 'osint',
      'burpsuite', 'owasp-zap', 'w3af', 'skipfish',
      'wapiti', 'webscarab', 'paros', 'proxystrike',
      'vega', 'websecurify', 'acunetix', 'nessus',
      'openvas', 'qualys', 'rapid7', 'tenable',
      'crowdstrike', 'carbon-black', 'sentinelone',
      'cylance', 'symantec', 'mcafee', 'trend-micro',
      'kaspersky', 'bitdefender', 'avast', 'avg',
      'malwarebytes', 'windows-defender', 'clamav',
      'sophos', 'f-secure', 'eset', 'webroot',
      'panda', 'comodo', 'avira', 'norton',
      'bullguard', 'g-data', 'emsisoft', 'vipre',
      'webroot', 'panda', 'comodo', 'avira', 'norton'
    ]);

    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  isCommandSafe(command, args) {
    const lowerCommand = command.toLowerCase();
    
    // Check if command is in unsafe list
    if (this.unsafeCommands.has(lowerCommand)) {
      return { safe: false, reason: `Command '${command}' is not allowed for security reasons` };
    }

    // Check for dangerous argument patterns
    const dangerousPatterns = [
      /rm\s+-rf/i,
      /del\s+\/s/i,
      /format\s+/i,
      /fdisk\s+/i,
      /mkfs/i,
      /shutdown/i,
      /reboot/i,
      /halt/i,
      /poweroff/i,
      /init\s+[0-6]/i,
      /systemctl\s+(stop|restart|reload)/i,
      /service\s+(stop|restart|reload)/i,
      /chmod\s+777/i,
      /chown\s+root/i,
      /umount\s+\//i,
      /mount\s+\//i,
      /dd\s+if=/i,
      /parted\s+/i,
      /gparted/i,
      /cfdisk/i,
      /sfdisk/i,
      /wipefs/i,
      /blkdiscard/i,
      /hdparm/i,
      /smartctl/i,
      /badblocks/i,
      /fsck/i,
      /e2fsck/i,
      /xfs_repair/i,
      /ntfsfix/i,
      /chroot/i,
      /killall/i,
      /pkill/i,
      /kill\s+-9/i,
      /killall5/i,
      /nohup/i,
      /disown/i,
      /bg/i,
      /fg/i,
      /jobs/i,
      /wait/i,
      /exec/i,
      /eval/i,
      /source/i,
      /export/i,
      /unset/i,
      /alias/i,
      /unalias/i,
      /history/i,
      /fc/i,
      /bind/i,
      /set/i,
      /shopt/i,
      /ulimit/i,
      /umask/i,
      /trap/i,
      /exit/i,
      /logout/i,
      /suspend/i
    ];

    const fullCommand = `${command} ${args.join(' ')}`;
    for (const pattern of dangerousPatterns) {
      if (pattern.test(fullCommand)) {
        return { safe: false, reason: `Command pattern '${pattern}' is not allowed for security reasons` };
      }
    }

    // Check for path traversal attempts
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /\.\.%2f/g,
      /\.\.%5c/g,
      /\.\.%252f/g,
      /\.\.%255c/g
    ];

    for (const pattern of pathTraversalPatterns) {
      if (pattern.test(fullCommand)) {
        return { safe: false, reason: 'Path traversal attempts are not allowed' };
      }
    }

    return { safe: true };
  }

  generateProcessId() {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  logExecution(log) {
    const logFile = path.join(this.logsDir, 'execution.log');
    const logLine = JSON.stringify(log) + '\n';
    
    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write execution log:', error);
    }
  }

  truncateOutput(output, maxLength) {
    if (output.length <= maxLength) return output;
    return output.substring(0, maxLength) + '\n... (output truncated)';
  }

  /**
   * Run a command safely in the sandbox
   * @param {string} command - The command to execute
   * @param {string[]} args - Command arguments
   * @param {Function} onDataCallback - Callback for stdout/stderr data
   * @param {Object} options - Execution options
   */
  async runCommand(command, args = [], onDataCallback, options = {}) {
    const processId = this.generateProcessId();
    const startTime = Date.now();
    
    const {
      timeout = this.defaultTimeout,
      workingDirectory = process.cwd(),
      environment = {},
      maxOutputLength = this.maxOutputLength,
      allowUnsafe = false
    } = options;

    // Security check
    if (!allowUnsafe) {
      const safetyCheck = this.isCommandSafe(command, args);
      if (!safetyCheck.safe) {
        const error = new Error(safetyCheck.reason);
        this.emit('error', { processId, error, command, args });
        throw error;
      }
    }

    // Check concurrent process limit
    if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
      const error = new Error('Maximum concurrent processes reached');
      this.emit('error', { processId, error, command, args });
      throw error;
    }

    let stdout = '';
    let stderr = '';
    let killed = false;
    let timeoutOccurred = false;

    return new Promise((resolve, reject) => {
      try {
        // Spawn the process
        const childProcess = spawn(command, args, {
          cwd: workingDirectory,
          env: { 
            ...process.env, 
            ...environment,
            SANDBOX_MODE: 'true',
            SANDBOX_PROCESS_ID: processId
          },
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false
        });

        this.activeProcesses.set(processId, childProcess);

        // Set up timeout
        const timeoutId = setTimeout(() => {
          timeoutOccurred = true;
          this.killProcess(processId);
          childProcess.emit('timeout');
        }, timeout);

        this.processTimeouts.set(processId, timeoutId);

        // Handle stdout
        childProcess.stdout?.on('data', (data) => {
          const content = data.toString();
          stdout += content;
          
          // Truncate if too long
          if (stdout.length > maxOutputLength) {
            stdout = this.truncateOutput(stdout, maxOutputLength);
          }

          // Call callback if provided
          if (onDataCallback) {
            onDataCallback({
              type: 'stdout',
              content,
              processId
            });
          }

          this.emit('stdout', { processId, content, command, args });
        });

        // Handle stderr
        childProcess.stderr?.on('data', (data) => {
          const content = data.toString();
          stderr += content;
          
          // Truncate if too long
          if (stderr.length > maxOutputLength) {
            stderr = this.truncateOutput(stderr, maxOutputLength);
          }

          // Call callback if provided
          if (onDataCallback) {
            onDataCallback({
              type: 'stderr',
              content,
              processId
            });
          }

          this.emit('stderr', { processId, content, command, args });
        });

        // Handle process exit
        childProcess.on('close', (code, signal) => {
          const executionTime = Date.now() - startTime;
          const exitCode = code || (signal ? -1 : 0);
          
          // Clear timeout
          const timeoutId = this.processTimeouts.get(processId);
          if (timeoutId) {
            clearTimeout(timeoutId);
            this.processTimeouts.delete(processId);
          }

          // Remove from active processes
          this.activeProcesses.delete(processId);

          const result = {
            success: exitCode === 0,
            exitCode,
            stdout,
            stderr,
            executionTime,
            command,
            args,
            timestamp: new Date(),
            killed: killed || signal !== null,
            timeout: timeoutOccurred
          };

          // Log execution
          const log = {
            timestamp: new Date().toISOString(),
            command,
            args,
            workingDirectory,
            exitCode,
            executionTime,
            success: result.success,
            killed: result.killed,
            timeout: result.timeout,
            outputLength: stdout.length,
            errorLength: stderr.length
          };

          this.logExecution(log);

          this.emit('complete', { processId, result, command, args });

          resolve(result);
        });

        // Handle process errors
        childProcess.on('error', (error) => {
          const executionTime = Date.now() - startTime;
          
          // Clear timeout
          const timeoutId = this.processTimeouts.get(processId);
          if (timeoutId) {
            clearTimeout(timeoutId);
            this.processTimeouts.delete(processId);
          }

          // Remove from active processes
          this.activeProcesses.delete(processId);

          this.emit('error', { processId, error, command, args });

          const result = {
            success: false,
            exitCode: -1,
            stdout,
            stderr: stderr + error.message,
            executionTime,
            command,
            args,
            timestamp: new Date(),
            killed: true,
            timeout: timeoutOccurred
          };

          // Log execution
          const log = {
            timestamp: new Date().toISOString(),
            command,
            args,
            workingDirectory,
            exitCode: -1,
            executionTime,
            success: false,
            killed: true,
            timeout: timeoutOccurred,
            outputLength: stdout.length,
            errorLength: stderr.length + error.message.length
          };

          this.logExecution(log);

          reject(error);
        });

        // Handle timeout
        childProcess.on('timeout', () => {
          killed = true;
          this.emit('timeout', { processId, command, args });
        });

      } catch (error) {
        // Clean up on spawn error
        this.activeProcesses.delete(processId);
        const timeoutId = this.processTimeouts.get(processId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.processTimeouts.delete(processId);
        }

        this.emit('error', { processId, error, command, args });
        reject(error);
      }
    });
  }

  /**
   * Kill a specific process
   * @param {string} processId - The process ID to kill
   */
  killProcess(processId) {
    const process = this.activeProcesses.get(processId);
    if (process) {
      process.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.activeProcesses.has(processId)) {
          process.kill('SIGKILL');
        }
      }, 5000);
      
      return true;
    }
    return false;
  }

  /**
   * Kill all active processes
   */
  killAllProcesses() {
    for (const [processId, process] of this.activeProcesses) {
      process.kill('SIGTERM');
    }
    
    // Force kill all after 5 seconds
    setTimeout(() => {
      for (const [processId, process] of this.activeProcesses) {
        process.kill('SIGKILL');
      }
    }, 5000);
  }

  /**
   * Get status of the sandbox
   */
  getStatus() {
    return {
      activeProcesses: this.activeProcesses.size,
      maxConcurrentProcesses: this.maxConcurrentProcesses,
      defaultTimeout: this.defaultTimeout,
      maxOutputLength: this.maxOutputLength,
      logsDir: this.logsDir,
      processIds: Array.from(this.activeProcesses.keys())
    };
  }

  /**
   * Get execution logs
   * @param {number} limit - Maximum number of logs to return
   */
  getExecutionLogs(limit = 100) {
    const logFile = path.join(this.logsDir, 'execution.log');
    
    try {
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const logs = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return logs;
    } catch (error) {
      console.error('Failed to read execution logs:', error);
      return [];
    }
  }

  /**
   * Clear execution logs
   */
  clearExecutionLogs() {
    const logFile = path.join(this.logsDir, 'execution.log');
    
    try {
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
    } catch (error) {
      console.error('Failed to clear execution logs:', error);
    }
  }

  /**
   * Update sandbox configuration
   */
  updateConfig(config) {
    if (config.maxConcurrentProcesses !== undefined) {
      this.maxConcurrentProcesses = config.maxConcurrentProcesses;
    }
    if (config.defaultTimeout !== undefined) {
      this.defaultTimeout = config.defaultTimeout;
    }
    if (config.maxOutputLength !== undefined) {
      this.maxOutputLength = config.maxOutputLength;
    }
    if (config.logsDir !== undefined) {
      this.logsDir = config.logsDir;
      this.ensureLogsDirectory();
    }
  }
}

// Create singleton instance
const sandbox = new SecureSandbox();

// Export both the class and singleton instance
module.exports = {
  SecureSandbox,
  sandbox,
  default: sandbox
};

