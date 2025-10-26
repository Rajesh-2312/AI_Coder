# Ollama Connector

A comprehensive Node.js module for connecting to and interacting with the local Ollama API. Provides streaming and non-streaming AI response generation with robust error handling and fallback mechanisms.

## Features

- **Streaming Responses**: Token-by-token streaming from Ollama API
- **Non-streaming Responses**: Simple request/response for basic use cases
- **Model Management**: Load, pull, and delete models
- **Status Monitoring**: Check Ollama service status and available models
- **Error Handling**: Comprehensive error handling with fallback responses
- **Timeout Management**: Configurable timeouts for all operations
- **Retry Logic**: Built-in retry mechanisms for failed requests
- **TypeScript Support**: Full TypeScript definitions included

## Installation

The module is included in the AI-Coder backend. No additional installation required.

## Quick Start

```javascript
const { ollamaConnector } = require('./ollamaConnector');

// Basic streaming example
ollamaConnector.generateResponse(
  "Create Express server",
  null,
  token => console.log(token)
);
```

## API Reference

### generateResponse(prompt, systemPrompt, streamCallback, options)

Generate a streaming response from Ollama.

**Parameters:**
- `prompt` (string): The user prompt
- `systemPrompt` (string|null): Optional system prompt
- `streamCallback` (function): Callback for each token: `(token, done, metadata) => void`
- `options` (object): Generation options

**Options:**
- `model` (string): Model name (default: 'codellama')
- `temperature` (number): Temperature 0-2 (default: 0.7)
- `top_p` (number): Top-p sampling (default: 0.9)
- `top_k` (number): Top-k sampling (default: 40)
- `repeat_penalty` (number): Repeat penalty (default: 1.1)
- `maxTokens` (number): Maximum tokens to generate (default: 2048)
- `stop` (array): Stop sequences (default: ['```', '---', '###'])

**Returns:** Promise resolving to:
```javascript
{
  success: boolean,
  fullResponse: string,
  metadata?: {
    model: string,
    totalDuration: number,
    loadDuration: number,
    promptEvalCount: number,
    promptEvalDuration: number,
    evalCount: number,
    evalDuration: number,
    context: number[]
  },
  error?: string
}
```

### generateSimpleResponse(prompt, systemPrompt, options)

Generate a non-streaming response from Ollama.

**Parameters:**
- `prompt` (string): The user prompt
- `systemPrompt` (string|null): Optional system prompt
- `options` (object): Generation options

**Returns:** Promise resolving to:
```javascript
{
  success: boolean,
  response: string,
  metadata?: object,
  error?: string
}
```

### checkOllamaStatus()

Check Ollama service status and get available models.

**Returns:** Promise resolving to:
```javascript
{
  connected: boolean,
  models: Array<{
    name: string,
    modified_at: string,
    size: number,
    digest: string,
    details?: object
  }>,
  defaultModel: string,
  baseUrl: string
}
```

### loadModel(modelName)

Load a model into Ollama.

**Parameters:**
- `modelName` (string): Name of the model to load

**Returns:** Promise resolving to:
```javascript
{
  success: boolean,
  message: string,
  error?: string
}
```

### getAvailableModels()

Get list of available models.

**Returns:** Promise resolving to array of model objects.

### pullModel(modelName)

Pull a model from Ollama registry.

**Parameters:**
- `modelName` (string): Name of the model to pull

**Returns:** Promise resolving to success/error object.

### deleteModel(modelName)

Delete a model from Ollama.

**Parameters:**
- `modelName` (string): Name of the model to delete

**Returns:** Promise resolving to success/error object.

## Usage Examples

### Basic Streaming

```javascript
const { ollamaConnector } = require('./ollamaConnector');

ollamaConnector.generateResponse(
  "Create Express server",
  null,
  (token, done, metadata) => {
    process.stdout.write(token);
    if (done) {
      console.log('\n\nGeneration completed!');
      console.log('Metadata:', metadata);
    }
  }
);
```

### With System Prompt

```javascript
ollamaConnector.generateResponse(
  "Write a React component for a todo list",
  "You are a React expert. Write clean, modern React code with hooks.",
  (token, done) => {
    console.log(token);
    if (done) console.log("Done!");
  }
);
```

### With Custom Options

```javascript
ollamaConnector.generateResponse(
  "Explain JavaScript closures",
  null,
  token => console.log(token),
  {
    temperature: 0.5,
    maxTokens: 1000,
    stop: ['\n\n', '---']
  }
);
```

### Simple Non-streaming

```javascript
const response = await ollamaConnector.generateSimpleResponse(
  "Write a hello world function",
  "You are a helpful coding assistant."
);

console.log('Response:', response.response);
console.log('Success:', response.success);
```

### Check Status

```javascript
const status = await ollamaConnector.checkOllamaStatus();

if (status.connected) {
  console.log('Ollama is running');
  console.log('Available models:', status.models.map(m => m.name));
} else {
  console.log('Ollama is not running');
}
```

### Model Management

```javascript
// Load a model
const loadResult = await ollamaConnector.loadModel('codellama');
console.log('Load result:', loadResult);

// Pull a new model
const pullResult = await ollamaConnector.pullModel('mistral');
console.log('Pull result:', pullResult);

// Delete a model
const deleteResult = await ollamaConnector.deleteModel('old-model');
console.log('Delete result:', deleteResult);
```

## Configuration

### Constructor Options

```javascript
const connector = new OllamaConnector({
  baseUrl: 'http://localhost:11434',
  defaultModel: 'codellama',
  timeout: 120000,
  retryAttempts: 3,
  retryDelay: 1000
});
```

### Update Configuration

```javascript
ollamaConnector.updateConfig({
  baseUrl: 'http://localhost:11434',
  defaultModel: 'mistral',
  timeout: 60000
});
```

### Get Current Configuration

```javascript
const config = ollamaConnector.getConfig();
console.log('Current config:', config);
```

## Error Handling

The connector includes comprehensive error handling:

### Connection Errors
- Automatically detects when Ollama is not running
- Provides helpful error messages
- Falls back to predefined responses

### Timeout Handling
- Configurable timeouts for all operations
- Graceful timeout handling with proper cleanup

### Fallback Responses
- Provides meaningful fallback responses when Ollama is unavailable
- Context-aware fallback based on prompt content

### Example Error Handling

```javascript
try {
  const result = await ollamaConnector.generateResponse(
    "Write some code",
    null,
    token => console.log(token)
  );
  
  if (!result.success) {
    console.error('Generation failed:', result.error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Testing

Run the test suite to verify functionality:

```bash
# TypeScript
npx tsx src/utils/testOllamaConnector.ts

# JavaScript
node src/utils/testOllamaConnector.js
```

## Prerequisites

1. **Ollama Installation**: Install Ollama from https://ollama.ai/
2. **Ollama Service**: Start Ollama service:
   ```bash
   ollama serve
   ```
3. **Models**: Pull required models:
   ```bash
   ollama pull codellama
   ollama pull mistral
   ollama pull llama2
   ```

## Environment Variables

Set these environment variables for custom configuration:

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=codellama
OLLAMA_TIMEOUT=120000
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Ollama is running: `ollama serve`
   - Check if port 11434 is available
   - Verify Ollama installation

2. **Model Not Found**
   - Pull the model: `ollama pull codellama`
   - Check available models: `ollama list`
   - Verify model name spelling

3. **Timeout Errors**
   - Increase timeout in configuration
   - Check system resources (RAM, CPU)
   - Try with smaller models

4. **Streaming Issues**
   - Check network connectivity
   - Verify response parsing
   - Monitor console for errors

### Debug Mode

Enable debug logging:

```javascript
// Set debug environment variable
process.env.DEBUG = 'ollama:*';

// Or enable in code
ollamaConnector.updateConfig({
  debug: true
});
```

## Performance Tips

1. **Model Selection**: Use smaller models for faster responses
2. **Temperature**: Lower temperature (0.1-0.3) for more focused responses
3. **Max Tokens**: Limit max tokens for faster generation
4. **Streaming**: Use streaming for better user experience
5. **Caching**: Implement response caching for repeated queries

## Security Considerations

1. **Local Only**: This connector is designed for local Ollama instances
2. **No Authentication**: Assumes trusted local environment
3. **Input Validation**: Validate prompts before sending to Ollama
4. **Resource Limits**: Monitor system resources during generation

## Contributing

1. Follow TypeScript best practices
2. Add comprehensive error handling
3. Include unit tests for new features
4. Update documentation
5. Test with multiple Ollama models

## License

MIT License - see LICENSE file for details

