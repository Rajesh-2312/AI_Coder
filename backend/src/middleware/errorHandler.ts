import { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import path from 'path'

// Custom error class
export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

// Error handling middleware
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = 'Internal Server Error'

  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
  } else if (error.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
  } else if (error.name === 'CastError') {
    statusCode = 400
    message = 'Invalid ID format'
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = 409
    message = 'Duplicate field value'
  }

  // Log error
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  })
}

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  // Log request
  console.log(`📥 ${req.method} ${req.path} - ${req.ip} - ${req.get('User-Agent')}`)
  
  // Override res.end to log response
  const originalEnd = res.end
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢'
    
    console.log(`${statusColor} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`)
    
    originalEnd.call(this, chunk, encoding)
  }
  
  next()
}

// Input validation middleware
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.body)
      
      if (error) {
        throw new AppError(`Validation Error: ${error.details[0].message}`, 400)
      }
      
      req.body = value
      next()
    } catch (error) {
      next(error)
    }
  }
}

// File validation middleware
export const validateFile = (allowedTypes: string[], maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400))
    }

    const { mimetype, size } = req.file

    if (!allowedTypes.includes(mimetype)) {
      return next(new AppError(`File type ${mimetype} not allowed`, 400))
    }

    if (size > maxSize) {
      return next(new AppError(`File size exceeds ${maxSize / 1024 / 1024}MB limit`, 400))
    }

    next()
  }
}

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    for (const [ip, data] of rateLimitMap.entries()) {
      if (data.resetTime < windowStart) {
        rateLimitMap.delete(ip)
      }
    }

    const current = rateLimitMap.get(key)

    if (!current) {
      rateLimitMap.set(key, { count: 1, resetTime: now })
      return next()
    }

    if (current.resetTime < windowStart) {
      rateLimitMap.set(key, { count: 1, resetTime: now })
      return next()
    }

    if (current.count >= maxRequests) {
      return next(new AppError('Too many requests', 429))
    }

    current.count++
    next()
  }
}

// Security middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By')
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  next()
}

// File path validation
export const validateFilePath = (req: Request, res: Response, next: NextFunction) => {
  const filePath = req.params[0] || req.body.path || req.query.path
  
  if (!filePath) {
    return next(new AppError('File path is required', 400))
  }

  // Prevent directory traversal attacks
  if (filePath.includes('..') || filePath.includes('~') || filePath.startsWith('/')) {
    return next(new AppError('Invalid file path', 400))
  }

  // Ensure path is within allowed directory
  const allowedDir = process.env.WORKSPACE_DIR || path.join(__dirname, '../workspace')
  const fullPath = path.resolve(allowedDir, filePath)
  
  if (!fullPath.startsWith(path.resolve(allowedDir))) {
    return next(new AppError('Access denied: Path outside workspace', 403))
  }

  req.filePath = fullPath
  next()
}

// Command validation for sandbox
export const validateCommand = (req: Request, res: Response, next: NextFunction) => {
  const { command } = req.body

  if (!command || typeof command !== 'string') {
    return next(new AppError('Command is required', 400))
  }

  // List of allowed commands (Windows compatible)
  const allowedCommands = [
    'npm', 'yarn', 'node', 'npx',
    'git', 'dir', 'pwd', 'cat', 'echo',
    'mkdir', 'rmdir', 'touch', 'cp', 'mv',
    'grep', 'find', 'which', 'type',
    'python', 'python3', 'pip',
    'gcc', 'g++', 'make',
    'docker', 'docker-compose'
  ]

  const commandParts = command.trim().split(' ')
  const baseCommand = commandParts[0]

  if (!allowedCommands.includes(baseCommand)) {
    return next(new AppError(`Command '${baseCommand}' is not allowed`, 403))
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    'rm -rf', 'del /s', 'format', 'fdisk',
    'sudo', 'su', 'chmod 777', 'chown',
    'wget', 'curl', 'nc', 'netcat'
  ]

  for (const pattern of dangerousPatterns) {
    if (command.toLowerCase().includes(pattern)) {
      return next(new AppError(`Command contains dangerous pattern: ${pattern}`, 403))
    }
  }

  next()
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      filePath?: string
      rawBody?: Buffer
    }
  }
}

