import { Server as SocketIOServer, Socket } from 'socket.io'
import { setupAISocketHandlers } from '../routes/ai'
import { AppError } from '../middleware/errorHandler'

interface AuthenticatedSocket extends Socket {
  userId?: string
  sessionId?: string
}

// WebSocket connection manager
class WebSocketManager {
  private io: SocketIOServer
  private connections: Map<string, AuthenticatedSocket> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  constructor(io: SocketIOServer) {
    this.io = io
  }

  handleConnection(socket: AuthenticatedSocket) {
    console.log(`WebSocket client connected: ${socket.id}`)
    
    // Store connection
    this.connections.set(socket.id, socket)
    
    // Send welcome message
    socket.emit('connection:established', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      message: 'Connected to AI-Coder backend'
    })

    // Handle authentication
    socket.on('auth:authenticate', (data) => {
      try {
        // Simple authentication (in production, use proper JWT validation)
        if (data.token || data.sessionId) {
          socket.userId = data.userId || 'anonymous'
          socket.sessionId = data.sessionId || socket.id
          
          socket.emit('auth:success', {
            userId: socket.userId,
            sessionId: socket.sessionId,
            timestamp: new Date().toISOString()
          })
        } else {
          socket.emit('auth:error', {
            error: 'Authentication required',
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        socket.emit('auth:error', {
          error: 'Authentication failed',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Handle room joining
    socket.on('room:join', (data) => {
      try {
        const { roomId } = data
        
        if (!roomId) {
          socket.emit('room:error', {
            error: 'Room ID is required',
            timestamp: new Date().toISOString()
          })
          return
        }

        socket.join(roomId)
        
        // Track room membership
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set())
        }
        this.rooms.get(roomId)!.add(socket.id)

        socket.emit('room:joined', {
          roomId,
          timestamp: new Date().toISOString()
        })

        // Notify others in the room
        socket.to(roomId).emit('room:user-joined', {
          socketId: socket.id,
          userId: socket.userId,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        socket.emit('room:error', {
          error: 'Failed to join room',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Handle room leaving
    socket.on('room:leave', (data) => {
      try {
        const { roomId } = data
        
        if (roomId) {
          socket.leave(roomId)
          
          // Update room tracking
          const roomMembers = this.rooms.get(roomId)
          if (roomMembers) {
            roomMembers.delete(socket.id)
            if (roomMembers.size === 0) {
              this.rooms.delete(roomId)
            }
          }

          socket.emit('room:left', {
            roomId,
            timestamp: new Date().toISOString()
          })

          // Notify others in the room
          socket.to(roomId).emit('room:user-left', {
            socketId: socket.id,
            userId: socket.userId,
            timestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        socket.emit('room:error', {
          error: 'Failed to leave room',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Handle file operations
    socket.on('file:watch', (data) => {
      try {
        const { filePath } = data
        
        if (!filePath) {
          socket.emit('file:error', {
            error: 'File path is required',
            timestamp: new Date().toISOString()
          })
          return
        }

        // Join file-specific room for real-time updates
        const fileRoom = `file:${filePath}`
        socket.join(fileRoom)
        
        socket.emit('file:watching', {
          filePath,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        socket.emit('file:error', {
          error: 'Failed to watch file',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Handle terminal operations
    socket.on('terminal:execute', async (data) => {
      try {
        const { command, options } = data
        
        if (!command) {
          socket.emit('terminal:error', {
            error: 'Command is required',
            timestamp: new Date().toISOString()
          })
          return
        }

        // Emit command start
        socket.emit('terminal:start', {
          command,
          timestamp: new Date().toISOString()
        })

        // Simulate command execution (in production, use actual sandbox)
        const startTime = Date.now()
        
        // Simulate command output
        const outputLines = [
          `$ ${command}`,
          'Executing command...',
          'Command completed successfully'
        ]

        for (const line of outputLines) {
          await new Promise(resolve => setTimeout(resolve, 500))
          socket.emit('terminal:output', {
            line,
            timestamp: new Date().toISOString()
          })
        }

        const executionTime = Date.now() - startTime
        
        socket.emit('terminal:complete', {
          command,
          executionTime,
          exitCode: 0,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        socket.emit('terminal:error', {
          error: 'Command execution failed',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Handle code analysis requests
    socket.on('code:analyze', async (data) => {
      try {
        const { code, language, analysisType } = data
        
        if (!code) {
          socket.emit('code:error', {
            error: 'Code is required for analysis',
            timestamp: new Date().toISOString()
          })
          return
        }

        // Emit analysis start
        socket.emit('code:analysis:start', {
          language,
          analysisType,
          timestamp: new Date().toISOString()
        })

        // Simulate analysis (in production, use actual AI service)
        await new Promise(resolve => setTimeout(resolve, 2000))

        const analysis = {
          quality: {
            score: 85,
            issues: ['Consider adding error handling', 'Extract complex logic into functions'],
            suggestions: ['Add type annotations', 'Use const instead of let where possible']
          },
          security: {
            score: 90,
            vulnerabilities: [],
            recommendations: ['Validate user inputs', 'Use parameterized queries']
          },
          performance: {
            score: 80,
            bottlenecks: ['Nested loops detected'],
            optimizations: ['Consider using map/filter instead of loops']
          }
        }

        socket.emit('code:analysis:complete', {
          analysis,
          language,
          analysisType,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        socket.emit('code:error', {
          error: 'Code analysis failed',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString()
      })
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`)
      
      // Clean up connections
      this.connections.delete(socket.id)
      
      // Clean up room memberships
      for (const [roomId, members] of this.rooms.entries()) {
        members.delete(socket.id)
        if (members.size === 0) {
          this.rooms.delete(roomId)
        } else {
          // Notify remaining members
          socket.to(roomId).emit('room:user-left', {
            socketId: socket.id,
            userId: socket.userId,
            timestamp: new Date().toISOString()
          })
        }
      }
    })

    // Handle errors
    socket.on('error', (error) => {
      console.error(`WebSocket error for ${socket.id}:`, error)
      socket.emit('error', {
        error: 'WebSocket error occurred',
        timestamp: new Date().toISOString()
      })
    })
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.io.emit(event, data)
  }

  // Broadcast to specific room
  broadcastToRoom(roomId: string, event: string, data: any) {
    this.io.to(roomId).emit(event, data)
  }

  // Send to specific client
  sendToClient(socketId: string, event: string, data: any): boolean {
    const socket = this.connections.get(socketId)
    if (socket) {
      socket.emit(event, data)
      return true
    }
    return false
  }

  // Get connection statistics
  getStats() {
    return {
      totalConnections: this.connections.size,
      totalRooms: this.rooms.size,
      roomStats: Array.from(this.rooms.entries()).map(([roomId, members]) => ({
        roomId,
        memberCount: members.size
      }))
    }
  }

  // Get all connections
  getConnections(): string[] {
    return Array.from(this.connections.keys())
  }

  // Disconnect specific client
  disconnectClient(socketId: string): boolean {
    const socket = this.connections.get(socketId)
    if (socket) {
      socket.disconnect(true)
      this.connections.delete(socketId)
      return true
    }
    return false
  }
}

// Setup WebSocket handlers
export const setupWebSocketHandlers = (io: SocketIOServer) => {
  const wsManager = new WebSocketManager(io)

  // Handle new connections
  io.on('connection', (socket: Socket) => {
    wsManager.handleConnection(socket as AuthenticatedSocket)
  })

  // Setup AI-specific WebSocket handlers
  setupAISocketHandlers(io)

  // Periodic health check
  setInterval(() => {
    const stats = wsManager.getStats()
    console.log(`WebSocket Stats: ${stats.totalConnections} connections, ${stats.totalRooms} rooms`)
  }, 60000) // Every minute

  // Handle server shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down WebSocket server...')
    wsManager.broadcast('server:shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    })
  })

  process.on('SIGINT', () => {
    console.log('Shutting down WebSocket server...')
    wsManager.broadcast('server:shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    })
  })

  return wsManager
}

