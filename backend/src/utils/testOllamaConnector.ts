import ollamaConnector from './ollamaConnector'

/**
 * Test file demonstrating Ollama Connector usage
 */

async function testOllamaConnector() {
  console.log('🧪 Testing Ollama Connector...\n')

  // Test 1: Check Ollama Status
  console.log('1️⃣ Checking Ollama Status...')
  const status = await ollamaConnector.checkOllamaStatus()
  console.log('Status:', status)
  console.log('')

  if (!status.connected) {
    console.log('❌ Ollama is not running. Please start Ollama and try again.')
    console.log('   Run: ollama serve')
    return
  }

  // Test 2: Get Available Models
  console.log('2️⃣ Getting Available Models...')
  const models = await ollamaConnector.getAvailableModels()
  console.log('Available Models:', models.map(m => m.name))
  console.log('')

  // Test 3: Simple Response Generation
  console.log('3️⃣ Testing Simple Response Generation...')
  const simpleResponse = await ollamaConnector.generateSimpleResponse(
    'Write a simple hello world function in JavaScript',
    'You are a helpful coding assistant.'
  )
  console.log('Simple Response:', simpleResponse)
  console.log('')

  // Test 4: Streaming Response Generation
  console.log('4️⃣ Testing Streaming Response Generation...')
  console.log('Streaming response:')
  
  const streamResult = await ollamaConnector.generateResponse(
    'Create an Express server with basic routes',
    'You are a helpful Node.js developer.',
    (token, done, metadata) => {
      process.stdout.write(token)
      if (done) {
        console.log('\n\nStream completed!')
        console.log('Metadata:', metadata)
      }
    },
    {
      temperature: 0.7,
      maxTokens: 500
    }
  )
  
  console.log('Stream Result:', streamResult)
  console.log('')

  // Test 5: Code Analysis
  console.log('5️⃣ Testing Code Analysis...')
  const analysisResult = await ollamaConnector.generateResponse(
    'Analyze this code for potential issues:\n\nfunction add(a, b) {\n  return a + b;\n}',
    'You are a code reviewer. Analyze the code and provide suggestions for improvement.',
    (token, done) => {
      process.stdout.write(token)
      if (done) {
        console.log('\n\nAnalysis completed!')
      }
    }
  )
  console.log('')

  // Test 6: Error Handling (with invalid model)
  console.log('6️⃣ Testing Error Handling...')
  const errorResult = await ollamaConnector.generateSimpleResponse(
    'Test error handling',
    null,
    { model: 'nonexistent-model' }
  )
  console.log('Error Result:', errorResult)
  console.log('')

  console.log('✅ All tests completed!')
}

// Example usage functions
export function exampleUsage() {
  console.log('📚 Ollama Connector Usage Examples:\n')

  // Example 1: Basic streaming
  console.log('Example 1: Basic Streaming')
  console.log(`
ollamaConnector.generateResponse(
  "Create Express server",
  null,
  token => console.log(token)
)
`)

  // Example 2: With system prompt
  console.log('Example 2: With System Prompt')
  console.log(`
ollamaConnector.generateResponse(
  "Write a React component",
  "You are a React expert. Write clean, modern React code.",
  (token, done) => {
    console.log(token)
    if (done) console.log("Done!")
  }
)
`)

  // Example 3: With options
  console.log('Example 3: With Options')
  console.log(`
ollamaConnector.generateResponse(
  "Explain JavaScript closures",
  null,
  token => console.log(token),
  {
    temperature: 0.5,
    maxTokens: 1000,
    stop: ['\\n\\n', '---']
  }
)
`)

  // Example 4: Check status
  console.log('Example 4: Check Status')
  console.log(`
const status = await ollamaConnector.checkOllamaStatus()
console.log('Connected:', status.connected)
console.log('Models:', status.models)
`)

  // Example 5: Load model
  console.log('Example 5: Load Model')
  console.log(`
const result = await ollamaConnector.loadModel('codellama')
console.log('Success:', result.success)
`)

  console.log('')
}

// Run tests if this file is executed directly
if (require.main === module) {
  testOllamaConnector().catch(console.error)
}

export { testOllamaConnector }

