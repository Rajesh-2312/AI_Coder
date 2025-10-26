const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Centralized Security Middleware
 * 
 * Responsibilities:
 * - Validate API input and reject malformed JSON
 * - Escape shell commands
 * - Limit payload size (1 MB)
 * - Block external network access for sandbox
 * - Hash-check model files on load
 * - Log all API access to ./logs/access.log
 */

class SecurityManager {
  constructor() {
    this.maxPayloadSize = 1024 * 1024; // 1 MB
    this.blockedDomains = new Set([
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      'google.com', 'github.com', 'stackoverflow.com',
      'api.openai.com', 'api.anthropic.com'
    ]);
    this.blockedCommands = new Set([
      'curl', 'wget', 'nc', 'netcat', 'telnet', 'ssh', 'scp',
      'ping', 'traceroute', 'nslookup', 'dig', 'host',
      'ftp', 'sftp', 'rsync', 'git', 'npm', 'yarn', 'pip'
    ]);
    this.allowedFileExtensions = new Set([
      '.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css',
      '.json', '.md', '.txt', '.xml', '.yaml', '.yml',
      '.sql', '.sh', '.bat', '.ps1'
    ]);
    this.modelHashes = new Map();
    this.accessLogPath = path.join(process.cwd(), 'logs', 'access.log');
    this.securityLogPath = path.join(process.cwd(), 'logs', 'security.log');
    
    this.initializeLogs();
    this.loadModelHashes();
  }

  /**
   * Initialize log directories and files
   */
  async initializeLogs() {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logsDir, { recursive: true });
      
      // Create log files if they don't exist
      await fs.writeFile(this.accessLogPath, '', { flag: 'a' });
      await fs.writeFile(this.securityLogPath, '', { flag: 'a' });
      
      console.log('✅ Security logs initialized');
    } catch (error) {
      console.error('❌ Failed to initialize security logs:', error);
    }
  }

  /**
   * Load model file hashes for verification
   */
  async loadModelHashes() {
    try {
      const modelsDir = path.join(process.cwd(), '..', 'model');
      const files = await fs.readdir(modelsDir);
      
      for (const file of files) {
        if (file.endsWith('.bin') || file.endsWith('.safetensors')) {
          const filePath = path.join(modelsDir, file);
          const hash = await this.calculateFileHash(filePath);
          this.modelHashes.set(file, hash);
        }
      }
      
      console.log(`✅ Loaded ${this.modelHashes.size} model hashes`);
    } catch (error) {
      console.error('❌ Failed to load model hashes:', error);
    }
  }

  /**
   * Calculate SHA-256 hash of a file
   */
  async calculateFileHash(filePath) {
    try {
      const data = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      console.error(`❌ Failed to calculate hash for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Log API access
   */
  async logAccess(req, res, next) {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const method = req.method;
    const url = req.originalUrl;
    const contentLength = req.get('Content-Length') || '0';
    
    const logEntry = `${timestamp} ${ip} ${method} ${url} ${contentLength} "${userAgent}"\n`;
    
    try {
      await fs.appendFile(this.accessLogPath, logEntry);
    } catch (error) {
      console.error('❌ Failed to write access log:', error);
    }
    
    next();
  }

  /**
   * Log security events
   */
  async logSecurity(event, details) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [SECURITY] ${event}: ${JSON.stringify(details)}\n`;
    
    try {
      await fs.appendFile(this.securityLogPath, logEntry);
    } catch (error) {
      console.error('❌ Failed to write security log:', error);
    }
  }

  /**
   * Validate JSON payload
   */
  validateJSON(req, res, next) {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      this.logSecurity('INVALID_CONTENT_TYPE', {
        ip: req.ip,
        contentType,
        url: req.originalUrl
      });
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json'
      });
    }

    try {
      // Check if body is already parsed
      if (typeof req.body === 'string') {
        req.body = JSON.parse(req.body);
      }
      
      // Validate JSON structure
      if (typeof req.body !== 'object' || req.body === null) {
        throw new Error('Invalid JSON structure');
      }
      
      next();
    } catch (error) {
      this.logSecurity('MALFORMED_JSON', {
        ip: req.ip,
        error: error.message,
        url: req.originalUrl,
        body: req.body
      });
      
      return res.status(400).json({
        success: false,
        error: 'Malformed JSON payload'
      });
    }
  }

  /**
   * Limit payload size
   */
  limitPayloadSize(req, res, next) {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > this.maxPayloadSize) {
      this.logSecurity('PAYLOAD_TOO_LARGE', {
        ip: req.ip,
        size: contentLength,
        maxSize: this.maxPayloadSize,
        url: req.originalUrl
      });
      
      return res.status(413).json({
        success: false,
        error: `Payload too large. Maximum size: ${this.maxPayloadSize} bytes`
      });
    }
    
    next();
  }

  /**
   * Escape shell commands
   */
  escapeShellCommand(command, args = []) {
    // Escape command
    const escapedCommand = command.replace(/[;&|`$(){}[\]\\]/g, '\\$&');
    
    // Escape arguments
    const escapedArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return arg.replace(/[;&|`$(){}[\]\\]/g, '\\$&');
      }
      return String(arg);
    });
    
    return { command: escapedCommand, args: escapedArgs };
  }

  /**
   * Validate shell command
   */
  validateShellCommand(req, res, next) {
    if (req.method !== 'POST' || !req.body.command) {
      return next();
    }

    const { command, args = [] } = req.body;
    
    // Check if command is blocked
    if (this.blockedCommands.has(command.toLowerCase())) {
      this.logSecurity('BLOCKED_COMMAND', {
        ip: req.ip,
        command,
        args,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: `Command '${command}' is not allowed`
      });
    }

    // Check for network access attempts
    const commandStr = `${command} ${args.join(' ')}`.toLowerCase();
    if (this.blockedDomains.some(domain => commandStr.includes(domain))) {
      this.logSecurity('NETWORK_ACCESS_BLOCKED', {
        ip: req.ip,
        command: commandStr,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: 'Network access is not allowed'
      });
    }

    // Escape the command
    const escaped = this.escapeShellCommand(command, args);
    req.body.command = escaped.command;
    req.body.args = escaped.args;
    
    next();
  }

  /**
   * Validate file paths
   */
  validateFilePath(req, res, next) {
    const filePath = req.body.filePath || req.query.filePath;
    
    if (!filePath) {
      return next();
    }

    // Check for path traversal
    if (filePath.includes('..') || filePath.includes('~') || path.isAbsolute(filePath)) {
      this.logSecurity('PATH_TRAVERSAL_ATTEMPT', {
        ip: req.ip,
        filePath,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: 'Invalid file path'
      });
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext && !this.allowedFileExtensions.has(ext)) {
      this.logSecurity('BLOCKED_FILE_EXTENSION', {
        ip: req.ip,
        filePath,
        extension: ext,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: `File extension '${ext}' is not allowed`
      });
    }

    next();
  }

  /**
   * Validate model file
   */
  async validateModelFile(modelName) {
    try {
      const modelsDir = path.join(process.cwd(), '..', 'model');
      const modelPath = path.join(modelsDir, `${modelName}.bin`);
      
      // Check if file exists
      await fs.access(modelPath);
      
      // Verify hash
      const currentHash = await this.calculateFileHash(modelPath);
      const storedHash = this.modelHashes.get(`${modelName}.bin`);
      
      if (storedHash && currentHash !== storedHash) {
        this.logSecurity('MODEL_HASH_MISMATCH', {
          modelName,
          currentHash,
          storedHash
        });
        return false;
      }
      
      return true;
    } catch (error) {
      this.logSecurity('MODEL_VALIDATION_FAILED', {
        modelName,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Rate limiting middleware
   */
  createRateLimit(windowMs = 60000, maxRequests = 100) {
    const requests = new Map();
    
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean old entries
      if (requests.has(ip)) {
        const ipRequests = requests.get(ip).filter(time => time > windowStart);
        requests.set(ip, ipRequests);
      } else {
        requests.set(ip, []);
      }
      
      const ipRequests = requests.get(ip);
      
      if (ipRequests.length >= maxRequests) {
        this.logSecurity('RATE_LIMIT_EXCEEDED', {
          ip,
          requests: ipRequests.length,
          maxRequests,
          url: req.originalUrl
        });
        
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.'
        });
      }
      
      ipRequests.push(now);
      next();
    };
  }

  /**
   * CORS security middleware
   */
  secureCORS(req, res, next) {
    const origin = req.get('Origin');
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    
    if (origin && !allowedOrigins.includes(origin)) {
      this.logSecurity('CORS_VIOLATION', {
        ip: req.ip,
        origin,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: 'Origin not allowed'
      });
    }
    
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  }

  /**
   * Security headers middleware
   */
  securityHeaders(req, res, next) {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Content-Security-Policy', "default-src 'self'");
    
    next();
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return {
      maxPayloadSize: this.maxPayloadSize,
      blockedCommands: Array.from(this.blockedCommands),
      allowedFileExtensions: Array.from(this.allowedFileExtensions),
      modelHashesLoaded: this.modelHashes.size,
      accessLogPath: this.accessLogPath,
      securityLogPath: this.securityLogPath
    };
  }
}

// Create singleton instance
const securityManager = new SecurityManager();

// Export middleware functions
module.exports = {
  // Core security middleware
  logAccess: (req, res, next) => securityManager.logAccess(req, res, next),
  validateJSON: (req, res, next) => securityManager.validateJSON(req, res, next),
  limitPayloadSize: (req, res, next) => securityManager.limitPayloadSize(req, res, next),
  validateShellCommand: (req, res, next) => securityManager.validateShellCommand(req, res, next),
  validateFilePath: (req, res, next) => securityManager.validateFilePath(req, res, next),
  secureCORS: (req, res, next) => securityManager.secureCORS(req, res, next),
  securityHeaders: (req, res, next) => securityManager.securityHeaders(req, res, next),
  
  // Rate limiting
  createRateLimit: (windowMs, maxRequests) => securityManager.createRateLimit(windowMs, maxRequests),
  
  // Utility functions
  escapeShellCommand: (command, args) => securityManager.escapeShellCommand(command, args),
  validateModelFile: (modelName) => securityManager.validateModelFile(modelName),
  logSecurity: (event, details) => securityManager.logSecurity(event, details),
  getSecurityStats: () => securityManager.getSecurityStats(),
  
  // Security manager instance
  securityManager
};

