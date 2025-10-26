# Real-time AI Streaming via WebSocket

A comprehensive WebSocket implementation for real-time AI streaming between the backend and frontend, featuring token-by-token streaming, reconnect support, and backpressure handling.

## Features

### 🚀 Core Streaming Features
- **Token-by-Token Streaming**: Real-time token delivery from AI models
- **Orchestrator Integration**: Intelligent agent routing for AI queries
- **Direct Ollama Streaming**: Direct connection to Ollama API
- **Stream Management**: Unique stream IDs and session tracking
- **Concurrent Streams**: Support for multiple simultaneous streams per client

### 🔄 Reliability Features
- **Auto-Reconnection**: Automatic reconnection with session transfer
- **Heartbeat Monitoring**: Keep-alive mechanism for connection health
- **Stream Cancellation**: Ability to cancel active streams
- **Error Recovery**: Comprehensive error handling and recovery
- **Session Persistence**: Maintain client state across reconnections

### ⚡ Performance Features
- **Backpressure Handling**: Prevents event loop blocking
- **Rate Limiting**: Configurable stream rate limiting
- **Memory Management**: Efficient memory usage for large streams
- **Cleanup Automation**: Automatic cleanup of inactive streams
- **Statistics Tracking**: Real-time streaming statistics

### 🛡️ Security Features
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Per-client rate limiting
- **Session Management**: Secure session handling
- **Error Sanitization**: Safe error message handling

## WebSocket API Reference

### Connection

**Endpoint**: `ws://localhost:3000/ai`

**Connection Events**:
```javascript
// Client connects
const socket = io('ws://localhost:3000/ai');

// Server responds with connection confirmation
socket.on('ai:connected', (data) => {
  console.log('Connected:', data.clientId);
  console.log('Max concurrent streams:', data.maxConcurrentStreams);
  console.log('Backpressure threshold:', data.backpressureThreshold);
});
```

### Streaming Requests

**Event**: `ai:stream`

**Request Format**:
```javascript
socket.emit('ai:stream', {
  prompt: "Explain this code",
  model: "codellama",           // Optional
  temperature: 0.7,            // Optional
  maxTokens: 2048,            // Optional
  useOrchestrator: true,      // Optional, default: true
  agentContext: {             // Optional
    activeFile: "App.js",
    projectType: "React"
  },
  streamId: "custom_id"       // Optional, auto-generated if not provided
});
```

**Response Events**:

1. **Stream Start**:
```javascript
socket.on('ai:stream:start', (data) => {
  console.log('Stream started:', data.streamId);
});
```

2. **Token Delivery**:
```javascript
socket.on('ai:token', (data) => {
  console.log('Token:', data.data);
  console.log('Agent:', data.agent);
  console.log('Token count:', data.tokenCount);
  console.log('Metadata:', data.metadata);
});
```

3. **Stream Complete**:
```javascript
socket.on('ai:stream:complete', (data) => {
  console.log('Stream completed:', data.agent);
  console.log('Intent:', data.intent);
  console.log('Confidence:', data.confidence);
});
```

4. **Stream Done**:
```javascript
socket.on('ai:done', (data) => {
  console.log('Total tokens:', data.totalTokens);
  console.log('Duration:', data.duration, 'ms');
});
```

### Stream Management

**Cancel Stream**:
```javascript
socket.emit('ai:cancel', { streamId: "stream_123" });

socket.on('ai:stream:cancelled', (data) => {
  console.log('Stream cancelled:', data.streamId);
});
```

**Heartbeat**:
```javascript
socket.emit('ai:heartbeat', {});

socket.on('ai:heartbeat:ack', (data) => {
  console.log('Heartbeat acknowledged');
  console.log('Active streams:', data.activeStreams);
  console.log('Queue size:', data.queueSize);
});
```

### Reconnection

**Handle Disconnection**:
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Auto-reconnection handled by client
});

socket.on('connect', () => {
  // Reconnect with previous session
  socket.emit('ai:reconnect', { 
    previousClientId: "old_client_id" 
  });
});

socket.on('ai:reconnect:success', (data) => {
  console.log('Reconnection successful');
  console.log('Previous client:', data.previousClientId);
  console.log('New client:', data.newClientId);
});
```

### Error Handling

**Error Events**:
```javascript
socket.on('ai:error', (data) => {
  console.error('Error:', data.error);
  console.error('Details:', data.details);
});

socket.on('ai:stream:error', (data) => {
  console.error('Stream error:', data.error);
  console.error('Stream ID:', data.streamId);
});

socket.on('ai:backpressure', (data) => {
  console.warn('Backpressure detected:', data.message);
  console.warn('Queue size:', data.queueSize);
});
```

## Frontend Integration

### Basic Client Implementation

```javascript
class AIStreamingClient {
  constructor(url = 'ws://localhost:3000/ai') {
    this.url = url;
    this.socket = null;
    this.isConnected = false;
    this.activeStreams = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    this.socket = io(this.url);
    
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Connected to AI WebSocket');
    });

    this.socket.on('ai:connected', (data) => {
      console.log('AI WebSocket ready:', data);
    });

    this.socket.on('ai:token', (data) => {
      this.handleToken(data);
    });

    this.socket.on('ai:done', (data) => {
      this.handleStreamComplete(data);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.scheduleReconnect();
    });
  }

  streamAI(prompt, options = {}) {
    const streamId = `client_${Date.now()}`;
    
    this.socket.emit('ai:stream', {
      prompt,
      streamId,
      ...options
    });
    
    return streamId;
  }

  handleToken(data) {
    // Process incoming token
    console.log('Token:', data.data);
  }

  handleStreamComplete(data) {
    console.log('Stream completed:', data.totalTokens, 'tokens');
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = 1000 * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }
}
```

### React Integration Example

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const AIStreamingComponent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to WebSocket
    socketRef.current = io('ws://localhost:3000/ai');

    socketRef.current.on('connect', () => {
      setIsConnected(true);
    });

    socketRef.current.on('ai:connected', (data) => {
      console.log('AI WebSocket ready:', data);
    });

    socketRef.current.on('ai:token', (data) => {
      setResponse(prev => prev + data.data);
    });

    socketRef.current.on('ai:stream:start', (data) => {
      setIsStreaming(true);
      setResponse('');
    });

    socketRef.current.on('ai:done', (data) => {
      setIsStreaming(false);
      console.log('Stream completed:', data.totalTokens, 'tokens');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const sendPrompt = (prompt) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('ai:stream', {
        prompt,
        useOrchestrator: true,
        agentContext: {
          activeFile: 'App.js',
          projectType: 'React'
        }
      });
    }
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Streaming: {isStreaming ? 'Yes' : 'No'}</div>
      <textarea 
        value={response} 
        readOnly 
        placeholder="AI response will appear here..."
        style={{ width: '100%', height: '200px' }}
      />
      <button 
        onClick={() => sendPrompt('Write a React component')}
        disabled={!isConnected || isStreaming}
      >
        Send Prompt
      </button>
    </div>
  );
};
```

## Backend Configuration

### Environment Variables

```bash
# WebSocket Configuration
WS_PORT=3000
WS_CORS_ORIGIN=http://localhost:5173

# AI Streaming Configuration
MAX_CONCURRENT_STREAMS=10
STREAM_TIMEOUT=300000
RECONNECT_TIMEOUT=30000
BACKPRESSURE_THRESHOLD=100

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=codellama
```

### Server Setup

```javascript
const { createServer } = require('http');
const { Server as SocketIOServer } = require('socket.io');
const { setupAIStreamingHandlers } = require('./websocket/aiStreaming');

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.WS_CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Setup AI streaming handlers
const aiStreamingHandler = setupAIStreamingHandlers(io);

server.listen(process.env.WS_PORT || 3000, () => {
  console.log(`AI Streaming WebSocket: ws://localhost:${process.env.WS_PORT || 3000}/ai`);
});
```

## Performance Optimization

### Backpressure Handling

The system automatically handles backpressure by:

1. **Queue Monitoring**: Tracks message queue size per client
2. **Rate Limiting**: Reduces stream rate when queue is full
3. **Token Skipping**: Skips tokens during high backpressure
4. **Event Loop Protection**: Uses `setImmediate` to prevent blocking

### Memory Management

- **Stream Cleanup**: Automatic cleanup of inactive streams
- **Session Management**: Efficient session storage and cleanup
- **Token Buffering**: Configurable token buffering limits
- **Statistics Tracking**: Memory-efficient statistics collection

### Connection Management

- **Heartbeat Monitoring**: 30-second heartbeat intervals
- **Reconnection Logic**: Exponential backoff reconnection
- **Session Transfer**: Seamless session transfer on reconnection
- **Graceful Shutdown**: Proper cleanup on server shutdown

## Testing

### Manual Testing

```bash
# Start the backend server
npm run dev

# Test WebSocket connection
node src/websocket/testStreaming.js
```

### Automated Testing

```javascript
// Test basic connection
const client = io('ws://localhost:3000/ai');
client.on('ai:connected', () => {
  console.log('✅ Connection successful');
});

// Test streaming
client.emit('ai:stream', {
  prompt: 'Write a hello world function',
  useOrchestrator: false
});

client.on('ai:token', (data) => {
  console.log('✅ Token received:', data.data);
});

client.on('ai:done', (data) => {
  console.log('✅ Stream completed:', data.totalTokens, 'tokens');
});
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if backend server is running
   - Verify WebSocket port is correct
   - Check CORS configuration

2. **No Tokens Received**
   - Verify Ollama is running
   - Check model availability
   - Review orchestrator configuration

3. **High Memory Usage**
   - Check for memory leaks in streams
   - Verify cleanup is working
   - Monitor backpressure events

4. **Reconnection Issues**
   - Check network stability
   - Verify reconnection timeout settings
   - Review client reconnection logic

### Debug Mode

Enable debug logging:

```bash
DEBUG=websocket:* node server.js
```

### Monitoring

Check streaming statistics:

```javascript
const stats = aiStreamingHandler.getStats();
console.log('Streaming Stats:', stats);
```

## Security Considerations

### Input Validation
- All inputs are validated and sanitized
- Prompt length limits enforced
- Model names validated against whitelist

### Rate Limiting
- Per-client concurrent stream limits
- Message rate limiting
- Backpressure protection

### Session Security
- Secure session management
- Session transfer validation
- Automatic session cleanup

## Contributing

1. Follow WebSocket best practices
2. Add comprehensive tests
3. Update documentation
4. Consider performance implications
5. Test with various client scenarios

## License

MIT License - see LICENSE file for details

