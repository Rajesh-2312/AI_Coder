const axios = require('axios');

console.log('🚀 AI-Coder External Ollama Configuration Tool');
console.log('===============================================\n');

async function testExternalOllama(serverUrl, modelName) {
  try {
    console.log(`🔍 Testing connection to: ${serverUrl}`);
    
    // Test basic connection
    const response = await axios.get(`${serverUrl}/api/tags`, {
      timeout: 10000
    });
    
    console.log('✅ Connection successful!');
    console.log(`📊 Available models: ${response.data.models.length}`);
    
    response.data.models.forEach(model => {
      console.log(`  - ${model.name} (${(model.size / 1024 / 1024).toFixed(1)} MB)`);
    });
    
    // Test specific model
    if (modelName) {
      console.log(`\n🧪 Testing model: ${modelName}`);
      
      const testResponse = await axios.post(`${serverUrl}/api/generate`, {
        model: modelName,
        prompt: 'Hello, test response',
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 50
        }
      }, {
        timeout: 30000
      });
      
      console.log('✅ Model test successful!');
      console.log(`📝 Response: ${testResponse.data.response}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function configureAI() {
  const serverUrl = process.argv[2];
  const modelName = process.argv[3];
  
  if (!serverUrl) {
    console.log('Usage: node configure-external-ollama.js <server-url> [model-name]');
    console.log('Example: node configure-external-ollama.js http://192.168.1.100:11434 qwen2.5-coder-lite');
    process.exit(1);
  }
  
  console.log(`🎯 Configuring external Ollama server...`);
  console.log(`📍 Server: ${serverUrl}`);
  console.log(`🤖 Model: ${modelName || 'auto-detect'}\n`);
  
  // Test the external server
  const isWorking = await testExternalOllama(serverUrl, modelName);
  
  if (!isWorking) {
    console.log('\n❌ External server test failed. Please check:');
    console.log('  1. Server URL is correct');
    console.log('  2. Ollama is running on the external server');
    console.log('  3. Network connectivity');
    console.log('  4. Firewall settings');
    process.exit(1);
  }
  
  console.log('\n🔧 Configuring AI-Coder...');
  
  try {
    // Configure external server
    const configResponse = await axios.post('http://localhost:3000/api/ollama/configure-external', {
      serverUrl: serverUrl,
      modelName: modelName || 'qwen2.5-coder-lite'
    });
    
    if (configResponse.data.success) {
      console.log('✅ External server configured successfully!');
      
      // Switch to external server
      const switchResponse = await axios.post('http://localhost:3000/api/ollama/switch-external');
      
      if (switchResponse.data.success) {
        console.log('✅ Switched to external Ollama server!');
        console.log('\n🎉 Configuration complete!');
        console.log('Your AI-Coder is now using the external Ollama server.');
        console.log('You can test it by sending a message in the AI Assistant panel.');
      } else {
        console.log('❌ Failed to switch to external server:', switchResponse.data.error);
      }
    } else {
      console.log('❌ Configuration failed:', configResponse.data.error);
    }
  } catch (error) {
    console.error('❌ Configuration error:', error.message);
    console.log('\nMake sure your AI-Coder backend is running on localhost:3000');
  }
}

configureAI();
