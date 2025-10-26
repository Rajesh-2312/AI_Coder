const { Server as SocketIOServer } = require('socket.io');
const { ollamaConnector } = require('../utils/ollamaConnector');
const { orchestrator } = require('../agents/orchestrator');
const EventEmitter = require('events');

/**
 * Real-time AI Streaming WebSocket Handler
 * Handles streaming communication between AI models and frontend clients
 */

class AIStreamingHandler extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.activeStreams = new Map(); // Track active streaming sessions
    this.clientSessions = new Map(); // Track client sessions
    this.maxConcurrentStreams = 10; // Limit concurrent streams
    this.streamTimeout = 300000; // 5 minutes timeout
    this.reconnectTimeout = 30000; // 30 seconds reconnect window
    this.backpressureThreshold = 100; // Max queued messages per client
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`AI WebSocket client connected: ${socket.id}`);
      
      // Initialize client session
      this.clientSessions.set(socket.id, {
        id: socket.id,
        connectedAt: new Date(),
        lastActivity: new Date(),
        activeStreams: new Set(),
        messageQueue: [],
        isReconnecting: false,
        backpressureCount: 0
      });

      // Handle AI streaming requests
      socket.on('ai:stream', async (data) => {
        try {
          await this.handleStreamRequest(socket, data);
        } catch (error) {
          console.error('Stream request error:', error);
          socket.emit('ai:error', {
            type: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle stream cancellation
      socket.on('ai:cancel', (data) => {
        this.handleStreamCancellation(socket, data);
      });

      // Handle client heartbeat
      socket.on('ai:heartbeat', () => {
        this.handleHeartbeat(socket);
      });

      // Handle client ready for reconnection
      socket.on('ai:reconnect', (data) => {
        this.handleReconnection(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`WebSocket error for ${socket.id}:`, error);
        this.handleError(socket, error);
      });

      // Send connection confirmation
      socket.emit('ai:connected', {
        type: 'connected',
        clientId: socket.id,
        timestamp: new Date().toISOString(),
        maxConcurrentStreams: this.maxConcurrentStreams,
        backpressureThreshold: this.backpressureThreshold
      });
    });
  }

  async handleStreamRequest(socket, data) {
    const { prompt, model, temperature, maxTokens, useOrchestrator, agentContext, streamId } = data;
    
    if (!prompt) {
      socket.emit('ai:error', {
        type: 'error',
        error: 'Prompt is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const session = this.clientSessions.get(socket.id);
    if (!session) {
      socket.emit('ai:error', {
        type: 'error',
        error: 'Client session not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check concurrent stream limit
    if (session.activeStreams.size >= this.maxConcurrentStreams) {
      socket.emit('ai:error', {
        type: 'error',
        error: 'Maximum concurrent streams reached',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Generate unique stream ID if not provided
    const uniqueStreamId = streamId || `stream_${socket.id}_${Date.now()}`;
    
    // Add to active streams
    session.activeStreams.add(uniqueStreamId);
    this.activeStreams.set(uniqueStreamId, {
      id: uniqueStreamId,
      clientId: socket.id,
      startedAt: new Date(),
      lastTokenAt: new Date(),
      tokenCount: 0,
      isActive: true
    });

    // Update session activity
    session.lastActivity = new Date();

    try {
      // Emit stream start
      socket.emit('ai:stream:start', {
        type: 'stream_start',
        streamId: uniqueStreamId,
        timestamp: new Date().toISOString()
      });

      // Check for backpressure
      if (session.messageQueue.length > this.backpressureThreshold) {
        socket.emit('ai:backpressure', {
          type: 'backpressure',
          message: 'High message queue detected, reducing stream rate',
          queueSize: session.messageQueue.length,
          timestamp: new Date().toISOString()
        });
      }

      // Process stream based on orchestrator preference
      if (useOrchestrator !== false) {
        await this.handleOrchestratorStream(socket, uniqueStreamId, prompt, {
          model,
          temperature,
          maxTokens,
          agentContext
        });
      } else {
        await this.handleDirectStream(socket, uniqueStreamId, prompt, {
          model,
          temperature,
          maxTokens
        });
      }

    } catch (error) {
      console.error('Stream processing error:', error);
      
      // Emit error and cleanup
      socket.emit('ai:stream:error', {
        type: 'stream_error',
        streamId: uniqueStreamId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.cleanupStream(uniqueStreamId);
    }
  }

  async handleOrchestratorStream(socket, streamId, prompt, options) {
    const session = this.clientSessions.get(socket.id);
    
    try {
      const result = await orchestrator.processQuery(
        prompt,
        {
          ...options.agentContext,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens
        },
        {
          streamCallback: (data) => {
            this.handleTokenStream(socket, streamId, data);
          }
        }
      );

      // Emit completion with orchestrator metadata
      socket.emit('ai:stream:complete', {
        type: 'stream_complete',
        streamId,
        agent: result.agent,
        intent: result.intent,
        confidence: result.confidence,
        success: result.success,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Orchestrator stream failed: ${error.message}`);
    } finally {
      this.cleanupStream(streamId);
    }
  }

  async handleDirectStream(socket, streamId, prompt, options) {
    const session = this.clientSessions.get(socket.id);
    
    try {
      const result = await ollamaConnector.generateResponse(
        prompt,
        null, // No system prompt for direct streaming
        (token, done, metadata) => {
          this.handleTokenStream(socket, streamId, {
            token,
            done,
            metadata,
            agent: 'DirectOllama',
            type: 'direct'
          });
        },
        {
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens
        }
      );

      // Emit completion
      socket.emit('ai:stream:complete', {
        type: 'stream_complete',
        streamId,
        agent: 'DirectOllama',
        intent: 'direct',
        confidence: 1.0,
        success: result.success,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Direct stream failed: ${error.message}`);
    } finally {
      this.cleanupStream(streamId);
    }
  }

  handleTokenStream(socket, streamId, data) {
    const session = this.clientSessions.get(socket.id);
    const streamInfo = this.activeStreams.get(streamId);
    
    if (!session || !streamInfo || !streamInfo.isActive) {
      return; // Stream was cancelled or client disconnected
    }

    // Update stream info
    streamInfo.lastTokenAt = new Date();
    streamInfo.tokenCount++;

    // Check for backpressure
    if (session.messageQueue.length > this.backpressureThreshold) {
      // Reduce stream rate by skipping some tokens
      if (streamInfo.tokenCount % 3 !== 0) {
        return;
      }
    }

    // Emit token with backpressure handling
    const tokenMessage = {
      type: 'token',
      streamId,
      data: data.token,
      agent: data.agent,
      metadata: data.metadata,
      tokenCount: streamInfo.tokenCount,
      timestamp: new Date().toISOString()
    };

    // Use setImmediate to prevent blocking the event loop
    setImmediate(() => {
      if (socket.connected && streamInfo.isActive) {
        socket.emit('ai:token', tokenMessage);
        session.lastActivity = new Date();
      }
    });

    // Handle stream completion
    if (data.done) {
      setImmediate(() => {
        if (socket.connected) {
          socket.emit('ai:done', {
            type: 'done',
            streamId,
            totalTokens: streamInfo.tokenCount,
            duration: Date.now() - streamInfo.startedAt.getTime(),
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  }

  handleStreamCancellation(socket, data) {
    const { streamId } = data;
    const session = this.clientSessions.get(socket.id);
    
    if (session && session.activeStreams.has(streamId)) {
      session.activeStreams.delete(streamId);
      
      const streamInfo = this.activeStreams.get(streamId);
      if (streamInfo) {
        streamInfo.isActive = false;
      }
      
      this.cleanupStream(streamId);
      
      socket.emit('ai:stream:cancelled', {
        type: 'stream_cancelled',
        streamId,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleHeartbeat(socket) {
    const session = this.clientSessions.get(socket.id);
    if (session) {
      session.lastActivity = new Date();
      
      socket.emit('ai:heartbeat:ack', {
        type: 'heartbeat_ack',
        timestamp: new Date().toISOString(),
        activeStreams: session.activeStreams.size,
        queueSize: session.messageQueue.length
      });
    }
  }

  handleReconnection(socket, data) {
    const { previousClientId } = data;
    const session = this.clientSessions.get(socket.id);
    
    if (session && previousClientId) {
      // Transfer active streams from previous session
      const previousSession = this.clientSessions.get(previousClientId);
      if (previousSession) {
        // Cancel previous streams
        for (const streamId of previousSession.activeStreams) {
          this.cleanupStream(streamId);
        }
        
        // Clean up previous session
        this.clientSessions.delete(previousClientId);
      }
      
      socket.emit('ai:reconnect:success', {
        type: 'reconnect_success',
        previousClientId,
        newClientId: socket.id,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleDisconnect(socket, reason) {
    console.log(`AI WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
    
    const session = this.clientSessions.get(socket.id);
    if (session) {
      // Mark session as disconnecting
      session.isReconnecting = reason === 'client namespace disconnect';
      
      // Clean up active streams
      for (const streamId of session.activeStreams) {
        this.cleanupStream(streamId);
      }
      
      // Set up reconnection window
      if (session.isReconnecting) {
        setTimeout(() => {
          if (this.clientSessions.has(socket.id)) {
            this.clientSessions.delete(socket.id);
            console.log(`Cleaned up session for ${socket.id} after reconnect timeout`);
          }
        }, this.reconnectTimeout);
      } else {
        // Immediate cleanup for non-reconnection disconnects
        this.clientSessions.delete(socket.id);
      }
    }
  }

  handleError(socket, error) {
    console.error(`WebSocket error for ${socket.id}:`, error);
    
    socket.emit('ai:error', {
      type: 'error',
      error: 'WebSocket connection error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }

  cleanupStream(streamId) {
    const streamInfo = this.activeStreams.get(streamId);
    if (streamInfo) {
      streamInfo.isActive = false;
      this.activeStreams.delete(streamId);
      
      // Remove from client session
      const session = this.clientSessions.get(streamInfo.clientId);
      if (session) {
        session.activeStreams.delete(streamId);
      }
    }
  }

  // Get streaming statistics
  getStats() {
    const activeStreams = Array.from(this.activeStreams.values());
    const sessions = Array.from(this.clientSessions.values());
    
    return {
      totalActiveStreams: activeStreams.length,
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.activeStreams.size > 0).length,
      totalTokensStreamed: activeStreams.reduce((sum, stream) => sum + stream.tokenCount, 0),
      averageStreamDuration: activeStreams.length > 0 
        ? activeStreams.reduce((sum, stream) => sum + (Date.now() - stream.startedAt.getTime()), 0) / activeStreams.length
        : 0,
      backpressureEvents: sessions.reduce((sum, session) => sum + session.backpressureCount, 0),
      timestamp: new Date().toISOString()
    };
  }

  // Force cleanup of inactive streams
  cleanupInactiveStreams() {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [streamId, streamInfo] of this.activeStreams) {
      if (now - streamInfo.lastTokenAt.getTime() > inactiveThreshold) {
        console.log(`Cleaning up inactive stream: ${streamId}`);
        this.cleanupStream(streamId);
      }
    }
  }

  // Broadcast to all connected clients
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Send to specific client
  sendToClient(clientId, event, data) {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }
}

// Setup WebSocket handlers
function setupAIStreamingHandlers(io) {
  const handler = new AIStreamingHandler(io);
  
  // Periodic cleanup of inactive streams
  setInterval(() => {
    handler.cleanupInactiveStreams();
  }, 60000); // Every minute
  
  // Periodic stats logging
  setInterval(() => {
    const stats = handler.getStats();
    if (stats.totalActiveStreams > 0) {
      console.log('AI Streaming Stats:', stats);
    }
  }, 300000); // Every 5 minutes
  
  return handler;
}

module.exports = {
  AIStreamingHandler,
  setupAIStreamingHandlers
};

