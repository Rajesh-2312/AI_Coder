import { Server as SocketIOServer, Socket } from 'socket.io'

export interface AgentStatus {
  name: string
  status: 'active' | 'inactive' | 'error'
  lastActivity: Date
  connections: number
}

export class WebSocketAgent {
  private io: SocketIOServer
  private connections: Map<string, Socket> = new Map()
  private status: AgentStatus

  constructor(io: SocketIOServer) {
    this.io = io
    this.status = {
      name: 'WebSocketAgent',
      status: 'active',
      lastActivity: new Date(),
      connections: 0
    }
  }

  handleConnection(socket: Socket): void {
    this.connections.set(socket.id, socket)
    this.status.connections = this.connections.size
    this.status.lastActivity = new Date()
    
    console.log(`WebSocket connection established: ${socket.id}`)
    
    // Send welcome message
    socket.emit('agent:welcome', {
      message: 'Connected to AI-Coder backend',
      timestamp: new Date().toISOString(),
      agent: 'WebSocketAgent'
    })
  }

  handleDisconnection(socket: Socket): void {
    this.connections.delete(socket.id)
    this.status.connections = this.connections.size
    this.status.lastActivity = new Date()
    
    console.log(`WebSocket connection closed: ${socket.id}`)
  }

  broadcast(event: string, data: any): void {
    this.io.emit(event, data)
    this.status.lastActivity = new Date()
  }

  sendToClient(socketId: string, event: string, data: any): boolean {
    const socket = this.connections.get(socketId)
    if (socket) {
      socket.emit(event, data)
      this.status.lastActivity = new Date()
      return true
    }
    return false
  }

  getStatus(): AgentStatus {
    return { ...this.status }
  }

  getConnectionCount(): number {
    return this.connections.size
  }

  getAllConnections(): string[] {
    return Array.from(this.connections.keys())
  }
}

