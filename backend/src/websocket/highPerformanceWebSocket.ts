import { Server as SocketIOServer, Socket } from 'socket.io'
import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'
import { createHash } from 'crypto'

interface MessageBatch {
  id: string
  messages: any[]
  timestamp: number
  priority: 'low' | 'normal' | 'high' | 'critical'
  compression?: boolean
  encryption?: boolean
}

interface ConnectionMetrics {
  socketId: string
  connectedAt: number
  messagesSent: number
  messagesReceived: number
  bytesSent: number
  bytesReceived: number
  averageLatency: number
  lastActivity: number
  isActive: boolean
}

interface WebSocketConfig {
  maxConnections: number
  messageBatchSize: number
  batchTimeout: number
  compressionThreshold: number
  enableBinaryProtocol: boolean
  enableMessageBatching: boolean
  enableCompression: boolean
  enableEncryption: boolean
  heartbeatInterval: number
  connectionTimeout: number
}

class HighPerformanceWebSocketManager extends EventEmitter {
  private io: SocketIOServer
  private config: WebSocketConfig
  private connections: Map<string, ConnectionMetrics> = new Map()
  private messageBatches: Map<string, MessageBatch> = new Map()
  private batchTimers: Map<string, NodeJS.Timeout> = new Map()
  private compressionEnabled: boolean = false
  private encryptionEnabled: boolean = false
  private binaryProtocolEnabled: boolean = false

  constructor(io: SocketIOServer, config: Partial<WebSocketConfig> = {}) {
    super()
    this.io = io
    this.config = {
      maxConnections: 1000,
      messageBatchSize: 10,
      batchTimeout: 100, // 100ms
      compressionThreshold: 1024, // 1KB
      enableBinaryProtocol: true,
      enableMessageBatching: true,
      enableCompression: true,
      enableEncryption: false,
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 60000, // 60 seconds
      ...config
    }

    this.compressionEnabled = this.config.enableCompression
    this.encryptionEnabled = this.config.enableEncryption
    this.binaryProtocolEnabled = this.config.enableBinaryProtocol

    this.setupEventHandlers()
    this.startHeartbeat()
    this.startCleanup()
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket)
    })

    this.io.engine.on('connection_error', (err: Error) => {
      this.emit('connectionError', err)
    })
  }

  private handleConnection(socket: Socket): void {
    const socketId = socket.id
    const now = Date.now()

    // Check connection limit
    if (this.connections.size >= this.config.maxConnections) {
      socket.emit('error', { message: 'Server at capacity', code: 'CAPACITY_EXCEEDED' })
      socket.disconnect(true)
      return
    }

    // Initialize connection metrics
    const metrics: ConnectionMetrics = {
      socketId,
      connectedAt: now,
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      averageLatency: 0,
      lastActivity: now,
      isActive: true
    }

    this.connections.set(socketId, metrics)

    // Setup socket event handlers
    this.setupSocketHandlers(socket)

    // Send welcome message with capabilities
    socket.emit('welcome', {
      capabilities: {
        binaryProtocol: this.binaryProtocolEnabled,
        messageBatching: this.config.enableMessageBatching,
        compression: this.compressionEnabled,
        encryption: this.encryptionEnabled
      },
      config: {
        batchSize: this.config.messageBatchSize,
        batchTimeout: this.config.batchTimeout,
        heartbeatInterval: this.config.heartbeatInterval
      }
    })

    this.emit('connection', { socketId, metrics })
  }

  private setupSocketHandlers(socket: Socket): void {
    const socketId = socket.id

    // Handle incoming messages
    socket.on('message', (data: any) => {
      this.handleMessage(socket, data)
    })

    // Handle batched messages
    socket.on('batch', (batch: MessageBatch) => {
      this.handleBatch(socket, batch)
    })

    // Handle binary messages
    socket.on('binary', (data: Buffer) => {
      this.handleBinaryMessage(socket, data)
    })

    // Handle ping/pong for latency measurement
    socket.on('ping', (timestamp: number) => {
      socket.emit('pong', timestamp)
      this.updateLatency(socketId, Date.now() - timestamp)
    })

    // Handle heartbeat
    socket.on('heartbeat', () => {
      this.updateActivity(socketId)
    })

    // Handle disconnect
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(socketId, reason)
    })

    // Handle errors
    socket.on('error', (error: Error) => {
      this.emit('socketError', { socketId, error })
    })
  }

  private handleMessage(socket: Socket, data: any): void {
    const socketId = socket.id
    const metrics = this.connections.get(socketId)
    
    if (!metrics) return

    const messageSize = JSON.stringify(data).length
    metrics.messagesReceived++
    metrics.bytesReceived += messageSize
    metrics.lastActivity = Date.now()

    // Process message based on configuration
    if (this.config.enableMessageBatching) {
      this.addToBatch(socketId, data)
    } else {
      this.processMessage(socket, data)
    }

    this.emit('message', { socketId, data, size: messageSize })
  }

  private handleBatch(socket: Socket, batch: MessageBatch): void {
    const socketId = socket.id
    const metrics = this.connections.get(socketId)
    
    if (!metrics) return

    // Process each message in the batch
    batch.messages.forEach(message => {
      this.processMessage(socket, message)
    })

    const batchSize = JSON.stringify(batch).length
    metrics.messagesReceived += batch.messages.length
    metrics.bytesReceived += batchSize
    metrics.lastActivity = Date.now()

    this.emit('batch', { socketId, batch })
  }

  private handleBinaryMessage(socket: Socket, data: Buffer): void {
    const socketId = socket.id
    const metrics = this.connections.get(socketId)
    
    if (!metrics) return

    try {
      // Decode binary message
      const message = this.decodeBinaryMessage(data)
      this.processMessage(socket, message)
      
      metrics.messagesReceived++
      metrics.bytesReceived += data.length
      metrics.lastActivity = Date.now()

      this.emit('binaryMessage', { socketId, message, size: data.length })
    } catch (error) {
      this.emit('binaryError', { socketId, error })
    }
  }

  private addToBatch(socketId: string, message: any): void {
    let batch = this.messageBatches.get(socketId)
    
    if (!batch) {
      batch = {
        id: this.generateBatchId(),
        messages: [],
        timestamp: Date.now(),
        priority: 'normal'
      }
      this.messageBatches.set(socketId, batch)
    }

    batch.messages.push(message)

    // Send batch if it reaches the size limit
    if (batch.messages.length >= this.config.messageBatchSize) {
      this.sendBatch(socketId)
    } else {
      // Set timeout to send batch
      this.scheduleBatchSend(socketId)
    }
  }

  private scheduleBatchSend(socketId: string): void {
    // Clear existing timer
    const existingTimer = this.batchTimers.get(socketId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.sendBatch(socketId)
    }, this.config.batchTimeout)

    this.batchTimers.set(socketId, timer)
  }

  private sendBatch(socketId: string): void {
    const batch = this.messageBatches.get(socketId)
    if (!batch || batch.messages.length === 0) return

    const socket = this.io.sockets.sockets.get(socketId)
    if (!socket) return

    // Clear timer
    const timer = this.batchTimers.get(socketId)
    if (timer) {
      clearTimeout(timer)
      this.batchTimers.delete(socketId)
    }

    // Send batch
    if (this.binaryProtocolEnabled && this.shouldUseBinary(batch)) {
      const binaryData = this.encodeBinaryMessage(batch)
      socket.emit('binary', binaryData)
    } else {
      socket.emit('batch', batch)
    }

    // Update metrics
    const metrics = this.connections.get(socketId)
    if (metrics) {
      metrics.messagesSent += batch.messages.length
      metrics.bytesSent += JSON.stringify(batch).length
    }

    // Clear batch
    this.messageBatches.delete(socketId)

    this.emit('batchSent', { socketId, batch })
  }

  private processMessage(socket: Socket, message: any): void {
    // This is where you would process the actual message
    // For now, just emit it for other handlers to process
    this.emit('processMessage', { socket, message })
  }

  private shouldUseBinary(batch: MessageBatch): boolean {
    const size = JSON.stringify(batch).length
    return size > this.config.compressionThreshold
  }

  private encodeBinaryMessage(data: any): Buffer {
    const json = JSON.stringify(data)
    const buffer = Buffer.from(json, 'utf8')
    
    if (this.compressionEnabled) {
      // Add compression logic here
      return buffer
    }
    
    return buffer
  }

  private decodeBinaryMessage(buffer: Buffer): any {
    const json = buffer.toString('utf8')
    return JSON.parse(json)
  }

  private updateLatency(socketId: string, latency: number): void {
    const metrics = this.connections.get(socketId)
    if (!metrics) return

    // Calculate rolling average
    metrics.averageLatency = (metrics.averageLatency + latency) / 2
  }

  private updateActivity(socketId: string): void {
    const metrics = this.connections.get(socketId)
    if (metrics) {
      metrics.lastActivity = Date.now()
      metrics.isActive = true
    }
  }

  private handleDisconnection(socketId: string, reason: string): void {
    const metrics = this.connections.get(socketId)
    
    if (metrics) {
      metrics.isActive = false
      
      // Clean up batch if exists
      const batch = this.messageBatches.get(socketId)
      if (batch) {
        this.sendBatch(socketId) // Send any pending batch
      }
      
      // Clear timer
      const timer = this.batchTimers.get(socketId)
      if (timer) {
        clearTimeout(timer)
        this.batchTimers.delete(socketId)
      }
    }

    this.connections.delete(socketId)
    this.messageBatches.delete(socketId)

    this.emit('disconnection', { socketId, reason, metrics })
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.io.emit('heartbeat', Date.now())
    }, this.config.heartbeatInterval)
  }

  private startCleanup(): void {
    setInterval(() => {
      this.cleanupInactiveConnections()
    }, 60000) // Cleanup every minute
  }

  private cleanupInactiveConnections(): void {
    const now = Date.now()
    const timeout = this.config.connectionTimeout

    for (const [socketId, metrics] of this.connections.entries()) {
      if (now - metrics.lastActivity > timeout) {
        const socket = this.io.sockets.sockets.get(socketId)
        if (socket) {
          socket.disconnect(true)
        }
        this.connections.delete(socketId)
        this.emit('cleanup', { socketId, reason: 'inactive' })
      }
    }
  }

  private generateBatchId(): string {
    return createHash('md5').update(Date.now().toString()).digest('hex')
  }

  // Public API Methods
  sendToSocket(socketId: string, event: string, data: any): boolean {
    const socket = this.io.sockets.sockets.get(socketId)
    if (!socket) return false

    const metrics = this.connections.get(socketId)
    if (metrics) {
      metrics.messagesSent++
      metrics.bytesSent += JSON.stringify(data).length
    }

    socket.emit(event, data)
    return true
  }

  sendToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data)
  }

  broadcast(event: string, data: any): void {
    this.io.emit(event, data)
  }

  joinRoom(socketId: string, room: string): boolean {
    const socket = this.io.sockets.sockets.get(socketId)
    if (!socket) return false

    socket.join(room)
    return true
  }

  leaveRoom(socketId: string, room: string): boolean {
    const socket = this.io.sockets.sockets.get(socketId)
    if (!socket) return false

    socket.leave(room)
    return true
  }

  getConnectionMetrics(socketId: string): ConnectionMetrics | null {
    return this.connections.get(socketId) || null
  }

  getAllConnectionMetrics(): ConnectionMetrics[] {
    return Array.from(this.connections.values())
  }

  getStats(): {
    totalConnections: number
    activeConnections: number
    totalMessages: number
    totalBytes: number
    averageLatency: number
    uptime: number
  } {
    const connections = Array.from(this.connections.values())
    const activeConnections = connections.filter(c => c.isActive).length
    const totalMessages = connections.reduce((sum, c) => sum + c.messagesSent + c.messagesReceived, 0)
    const totalBytes = connections.reduce((sum, c) => sum + c.bytesSent + c.bytesReceived, 0)
    const averageLatency = connections.reduce((sum, c) => sum + c.averageLatency, 0) / connections.length

    return {
      totalConnections: connections.length,
      activeConnections,
      totalMessages,
      totalBytes,
      averageLatency: averageLatency || 0,
      uptime: process.uptime()
    }
  }

  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.compressionEnabled = this.config.enableCompression
    this.encryptionEnabled = this.config.enableEncryption
    this.binaryProtocolEnabled = this.config.enableBinaryProtocol
    
    this.emit('configUpdated', this.config)
  }

  async shutdown(): Promise<void> {
    // Send shutdown message to all clients
    this.broadcast('shutdown', { message: 'Server shutting down' })
    
    // Close all connections
    this.io.close()
    
    this.emit('shutdown')
  }
}

export { HighPerformanceWebSocketManager, WebSocketConfig, ConnectionMetrics, MessageBatch }
export default HighPerformanceWebSocketManager
