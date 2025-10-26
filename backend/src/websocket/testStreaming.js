const { setupAIStreamingHandlers } = require('./aiStreaming');
const { Server as SocketIOServer } = require('socket.io');
const http = require('http');

/**
 * Test file for AI WebSocket Streaming
 */

async function testAIStreaming() {
  console.log('🧪 Testing AI WebSocket Streaming...\n');

  // Create test server
  const server = http.createServer();
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Setup AI streaming handlers
  const streamingHandler = setupAIStreamingHandlers(io);

  // Start server
  const PORT = 3001; // Use different port for testing
  server.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  // Test 1: Basic connection
  console.log('1️⃣ Testing Basic Connection...');
  try {
    const client = await createTestClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve) => {
      client.on('ai:connected', (data) => {
        console.log('✅ Client connected:', data.clientId);
        resolve();
      });
    });
    
    client.disconnect();
    console.log('');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('');
  }

  // Test 2: Direct streaming
  console.log('2️⃣ Testing Direct Streaming...');
  try {
    const client = await createTestClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve) => {
      client.on('ai:connected', () => {
        client.emit('ai:stream', {
          prompt: 'Write a simple hello world function in JavaScript',
          useOrchestrator: false,
          model: 'codellama'
        });
      });
      
      let tokenCount = 0;
      client.on('ai:token', (data) => {
        tokenCount++;
        process.stdout.write(data.data);
        
        if (tokenCount >= 10) { // Limit output for testing
          console.log('\n✅ Received 10 tokens');
          resolve();
        }
      });
      
      client.on('ai:done', (data) => {
        console.log('\n✅ Stream completed:', data.totalTokens, 'tokens');
        resolve();
      });
    });
    
    client.disconnect();
    console.log('');
  } catch (error) {
    console.error('❌ Direct streaming test failed:', error.message);
    console.log('');
  }

  // Test 3: Orchestrator streaming
  console.log('3️⃣ Testing Orchestrator Streaming...');
  try {
    const client = await createTestClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve) => {
      client.on('ai:connected', () => {
        client.emit('ai:stream', {
          prompt: 'Create a React component for a todo list',
          useOrchestrator: true,
          agentContext: {
            activeFile: 'TodoList.jsx',
            projectType: 'React'
          }
        });
      });
      
      let tokenCount = 0;
      client.on('ai:token', (data) => {
        tokenCount++;
        process.stdout.write(data.data);
        
        if (tokenCount >= 10) {
          console.log('\n✅ Received 10 tokens from orchestrator');
          resolve();
        }
      });
      
      client.on('ai:stream:complete', (data) => {
        console.log('\n✅ Orchestrator stream completed:', data.agent, data.intent);
        resolve();
      });
    });
    
    client.disconnect();
    console.log('');
  } catch (error) {
    console.error('❌ Orchestrator streaming test failed:', error.message);
    console.log('');
  }

  // Test 4: Stream cancellation
  console.log('4️⃣ Testing Stream Cancellation...');
  try {
    const client = await createTestClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve) => {
      client.on('ai:connected', () => {
        client.emit('ai:stream', {
          prompt: 'Write a very long explanation about programming',
          useOrchestrator: false
        });
        
        // Cancel after 2 seconds
        setTimeout(() => {
          client.emit('ai:cancel', { streamId: 'test_stream' });
        }, 2000);
      });
      
      client.on('ai:stream:cancelled', (data) => {
        console.log('✅ Stream cancelled:', data.streamId);
        resolve();
      });
    });
    
    client.disconnect();
    console.log('');
  } catch (error) {
    console.error('❌ Stream cancellation test failed:', error.message);
    console.log('');
  }

  // Test 5: Heartbeat
  console.log('5️⃣ Testing Heartbeat...');
  try {
    const client = await createTestClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve) => {
      client.on('ai:connected', () => {
        client.emit('ai:heartbeat', {});
      });
      
      client.on('ai:heartbeat:ack', (data) => {
        console.log('✅ Heartbeat acknowledged:', data);
        resolve();
      });
    });
    
    client.disconnect();
    console.log('');
  } catch (error) {
    console.error('❌ Heartbeat test failed:', error.message);
    console.log('');
  }

  // Test 6: Error handling
  console.log('6️⃣ Testing Error Handling...');
  try {
    const client = await createTestClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve) => {
      client.on('ai:connected', () => {
        // Send invalid request
        client.emit('ai:stream', {
          // Missing required prompt
          useOrchestrator: false
        });
      });
      
      client.on('ai:error', (data) => {
        console.log('✅ Error handled:', data.error);
        resolve();
      });
    });
    
    client.disconnect();
    console.log('');
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    console.log('');
  }

  // Test 7: Multiple concurrent streams
  console.log('7️⃣ Testing Multiple Concurrent Streams...');
  try {
    const client = await createTestClient(`http://localhost:${PORT}`);
    
    await new Promise((resolve) => {
      let completedStreams = 0;
      
      client.on('ai:connected', () => {
        // Start multiple streams
        for (let i = 0; i < 3; i++) {
          client.emit('ai:stream', {
            prompt: `Stream ${i + 1}: Write a simple function`,
            useOrchestrator: false,
            streamId: `test_stream_${i}`
          });
        }
      });
      
      client.on('ai:done', (data) => {
        completedStreams++;
        console.log(`✅ Stream ${data.streamId} completed`);
        
        if (completedStreams >= 3) {
          resolve();
        }
      });
    });
    
    client.disconnect();
    console.log('');
  } catch (error) {
    console.error('❌ Multiple streams test failed:', error.message);
    console.log('');
  }

  // Test 8: Statistics
  console.log('8️⃣ Testing Statistics...');
  try {
    const stats = streamingHandler.getStats();
    console.log('✅ Streaming statistics:', stats);
    console.log('');
  } catch (error) {
    console.error('❌ Statistics test failed:', error.message);
    console.log('');
  }

  // Cleanup
  server.close(() => {
    console.log('✅ Test server closed');
  });

  console.log('✅ All streaming tests completed!');
}

// Helper function to create test client
function createTestClient(url) {
  return new Promise((resolve, reject) => {
    const { io } = require('socket.io-client');
    const client = io(url);
    
    client.on('connect', () => {
      resolve(client);
    });
    
    client.on('connect_error', (error) => {
      reject(error);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 5000);
  });
}

// Example usage functions
function exampleUsage() {
  console.log('📚 AI WebSocket Streaming Usage Examples:\n');

  // Example 1: Basic connection
  console.log('Example 1: Basic Connection');
  console.log(`
const { io } = require('socket.io-client');
const client = io('ws://localhost:3000/ai');

client.on('ai:connected', (data) => {
  console.log('Connected:', data.clientId);
});

client.on('ai:token', (data) => {
  process.stdout.write(data.data);
});

client.on('ai:done', (data) => {
  console.log('Stream completed:', data.totalTokens, 'tokens');
});
`);

  // Example 2: Start streaming
  console.log('Example 2: Start Streaming');
  console.log(`
// Start AI stream
client.emit('ai:stream', {
  prompt: 'Write a React component',
  useOrchestrator: true,
  agentContext: {
    activeFile: 'Component.jsx',
    projectType: 'React'
  }
});
`);

  // Example 3: Cancel stream
  console.log('Example 3: Cancel Stream');
  console.log(`
// Cancel active stream
client.emit('ai:cancel', { streamId: 'stream_123' });
`);

  // Example 4: Heartbeat
  console.log('Example 4: Heartbeat');
  console.log(`
// Send heartbeat
client.emit('ai:heartbeat', {});

client.on('ai:heartbeat:ack', (data) => {
  console.log('Heartbeat acknowledged:', data);
});
`);

  // Example 5: Reconnection
  console.log('Example 5: Reconnection');
  console.log(`
// Handle reconnection
client.on('disconnect', () => {
  console.log('Disconnected, attempting reconnect...');
});

client.on('connect', () => {
  // Reconnect with previous session
  client.emit('ai:reconnect', { previousClientId: 'old_client_id' });
});
`);

  console.log('');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAIStreaming().catch(console.error);
}

module.exports = {
  testAIStreaming,
  exampleUsage
};

