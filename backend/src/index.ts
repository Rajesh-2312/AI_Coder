import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'
import path from 'path'

// Import routes
import aiRoutes from './routes/ai'
import filesRoutes from './routes/files'
import executeRoutes from './routes/execute'
import modelDownloadRoutes from './routes/modelDownload'
import trainingRoutes from './routes/training'
import agentsRoutes from './routes/agents'
import autoFixRoutes from './routes/autoFix'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
})

const PORT = process.env.PORT || 3000

// Trust proxy for proper IP handling
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173"
  ],
  credentials: true
}))

// Compression and logging
app.use(compression())
app.use(morgan('combined'))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static file serving
app.use('/static', express.static(path.join(__dirname, '../public')))

// API Routes
app.use('/api/ai', aiRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/execute', executeRoutes)
app.use('/api/model', modelDownloadRoutes)
app.use('/api/training', trainingRoutes)
app.use('/api/agents', agentsRoutes)
app.use('/api/ai', autoFixRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// WebSocket handlers
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`)
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 AI-Coder Backend Server running on port ${PORT}`)
  console.log(`🌐 API available at http://localhost:${PORT}`)
  console.log(`🔌 WebSocket server ready`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})