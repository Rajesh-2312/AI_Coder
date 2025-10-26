const { orchestrator } = require('./orchestrator');

/**
 * Test file demonstrating AI Agent Orchestrator usage
 */

async function testOrchestrator() {
  console.log('🧪 Testing AI Agent Orchestrator...\n');

  // Test 1: Code Agent Detection
  console.log('1️⃣ Testing Code Agent Detection...');
  try {
    const result = await orchestrator.processQuery(
      'Write a React component for a todo list with add and delete functionality',
      {
        activeFile: 'TodoList.jsx',
        projectType: 'React',
        language: 'javascript'
      }
    );
    console.log('Agent:', result.agent);
    console.log('Intent:', result.intent);
    console.log('Confidence:', result.confidence);
    console.log('Success:', result.success);
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 2: File Agent Detection
  console.log('2️⃣ Testing File Agent Detection...');
  try {
    const result = await orchestrator.processQuery(
      'Create a new folder structure for my React project with components, pages, and utils directories',
      {
        projectRoot: '/path/to/project',
        currentDirectory: '/path/to/project',
        hasFileAccess: true
      }
    );
    console.log('Agent:', result.agent);
    console.log('Intent:', result.intent);
    console.log('Confidence:', result.confidence);
    console.log('Success:', result.success);
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 3: Explain Agent Detection
  console.log('3️⃣ Testing Explain Agent Detection...');
  try {
    const result = await orchestrator.processQuery(
      'Explain how React hooks work and when to use useState vs useEffect',
      {
        code: 'const [count, setCount] = useState(0);',
        language: 'javascript',
        userLevel: 'beginner'
      }
    );
    console.log('Agent:', result.agent);
    console.log('Intent:', result.intent);
    console.log('Confidence:', result.confidence);
    console.log('Success:', result.success);
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 4: Shell Agent Detection
  console.log('4️⃣ Testing Shell Agent Detection...');
  try {
    const result = await orchestrator.processQuery(
      'How do I install npm packages and run a development server?',
      {
        os: 'Windows',
        shell: 'PowerShell',
        workingDirectory: '/path/to/project',
        sandboxAvailable: true
      }
    );
    console.log('Agent:', result.agent);
    console.log('Intent:', result.intent);
    console.log('Confidence:', result.confidence);
    console.log('Success:', result.success);
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 5: Intent Detection with Context
  console.log('5️⃣ Testing Intent Detection with Context...');
  try {
    const result = await orchestrator.processQuery(
      'What does this do?',
      {
        activeFile: 'app.js',
        hasCodeSelection: true,
        code: 'function calculateTotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }'
      }
    );
    console.log('Agent:', result.agent);
    console.log('Intent:', result.intent);
    console.log('Confidence:', result.confidence);
    console.log('Context adjustments:', result.result?.contextAdjustments);
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 6: Streaming Response
  console.log('6️⃣ Testing Streaming Response...');
  try {
    const result = await orchestrator.processQuery(
      'Create a simple Express.js server with a health check endpoint',
      {
        projectType: 'Node.js',
        language: 'javascript'
      },
      {
        streamCallback: (data) => {
          process.stdout.write(data.token);
          if (data.done) {
            console.log('\n\nStream completed!');
          }
        }
      }
    );
    console.log('Streaming Result:', result.success);
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  // Test 7: Orchestrator Status
  console.log('7️⃣ Testing Orchestrator Status...');
  const status = orchestrator.getStatus();
  console.log('Available Agents:', status.availableAgents.map(a => a.name));
  console.log('Conversation History Length:', status.conversationHistoryLength);
  console.log('Intent Patterns:', status.intentPatterns);
  console.log('');

  // Test 8: Agent Management
  console.log('8️⃣ Testing Agent Management...');
  const agents = orchestrator.listAgents();
  console.log('Current Agents:', agents.map(a => a.name));
  
  // Test getting specific agent
  const codeAgent = orchestrator.getAgent('code');
  console.log('Code Agent Description:', codeAgent?.description);
  console.log('');

  // Test 9: Intent Pattern Updates
  console.log('9️⃣ Testing Intent Pattern Updates...');
  orchestrator.updateIntentPatterns('code', [
    'write', 'create', 'generate', 'code', 'function', 'class', 'method',
    'implement', 'refactor', 'optimize', 'fix', 'bug', 'error', 'debug',
    'custom_pattern', 'new_keyword'
  ]);
  console.log('Updated code patterns with custom keywords');
  console.log('');

  // Test 10: Error Handling
  console.log('10️⃣ Testing Error Handling...');
  try {
    const result = await orchestrator.processQuery(
      'This is a completely ambiguous query with no clear intent',
      {}
    );
    console.log('Fallback Agent:', result.agent);
    console.log('Fallback Intent:', result.intent);
    console.log('Success:', result.success);
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    console.log('');
  }

  console.log('✅ All tests completed!');
}

// Example usage functions
function exampleUsage() {
  console.log('📚 AI Agent Orchestrator Usage Examples:\n');

  // Example 1: Basic query processing
  console.log('Example 1: Basic Query Processing');
  console.log(`
const result = await orchestrator.processQuery(
  'Write a function to calculate fibonacci numbers',
  {
    activeFile: 'math.js',
    language: 'javascript'
  }
);

console.log('Agent:', result.agent);
console.log('Intent:', result.intent);
console.log('Confidence:', result.confidence);
`);

  // Example 2: Streaming responses
  console.log('Example 2: Streaming Responses');
  console.log(`
await orchestrator.processQuery(
  'Create a REST API with Express.js',
  {
    projectType: 'Node.js',
    language: 'javascript'
  },
  {
    streamCallback: (data) => {
      console.log(\`[\${data.agent}] \${data.token}\`);
    }
  }
);
`);

  // Example 3: Context-aware processing
  console.log('Example 3: Context-Aware Processing');
  console.log(`
const result = await orchestrator.processQuery(
  'How do I optimize this?',
  {
    activeFile: 'performance.js',
    code: 'function slowFunction() { /* slow code */ }',
    hasCodeSelection: true,
    projectType: 'Node.js'
  }
);
`);

  // Example 4: Agent management
  console.log('Example 4: Agent Management');
  console.log(`
// List all agents
const agents = orchestrator.listAgents();

// Get specific agent
const codeAgent = orchestrator.getAgent('code');

// Add custom agent
class CustomAgent extends BaseAgent {
  constructor() {
    super('CustomAgent', 'A custom agent for specific tasks');
  }
  
  async execute(query, context) {
    // Custom implementation
  }
}

orchestrator.addAgent('custom', new CustomAgent());
`);

  // Example 5: Intent pattern customization
  console.log('Example 5: Intent Pattern Customization');
  console.log(`
// Update intent patterns
orchestrator.updateIntentPatterns('code', [
  'write', 'create', 'generate', 'code', 'function',
  'custom_keyword', 'specialized_term'
]);

// Clear conversation history
orchestrator.clearHistory();
`);

  console.log('');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testOrchestrator().catch(console.error);
}

module.exports = {
  testOrchestrator,
  exampleUsage
};

