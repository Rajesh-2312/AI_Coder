# AI Agent Orchestrator

A sophisticated AI Agent Orchestrator that intelligently routes user queries to specialized agents based on intent detection and context analysis. Built with a modular architecture for easy extensibility.

## Features

### 🤖 Specialized Agents
- **CodeAgent**: Generate, refactor, and improve code
- **FileAgent**: Create, update, delete, and organize files
- **ExplainAgent**: Explain code, concepts, and technical topics
- **ShellAgent**: Suggest and execute shell commands safely

### 🧠 Intelligent Intent Detection
- **Keyword-based Detection**: Analyzes query content for intent signals
- **Context-aware Processing**: Considers file types, project context, and history
- **Confidence Scoring**: Provides confidence levels for intent detection
- **Fallback Mechanisms**: Graceful handling of ambiguous queries

### 🔄 Streaming & Real-time
- **Unified Streaming**: Consistent streaming interface across all agents
- **Real-time Responses**: Token-by-token streaming via Ollama connector
- **Context Preservation**: Maintains conversation history and context
- **Event-driven Architecture**: Listen to agent events and responses

### 🏗️ Modular Architecture
- **Extensible Design**: Easy to add new agents and capabilities
- **Base Agent Class**: Standardized interface for all agents
- **Plugin System**: Add custom agents without modifying core code
- **Configuration Management**: Customize intent patterns and behavior

## Architecture

### Core Components

```
AgentOrchestrator
├── IntentDetector
│   ├── Keyword Patterns
│   ├── Context Analysis
│   └── Confidence Scoring
├── Specialized Agents
│   ├── CodeAgent
│   ├── FileAgent
│   ├── ExplainAgent
│   └── ShellAgent
├── Conversation History
│   ├── Query Tracking
│   ├── Context Preservation
│   └── Relevance Filtering
└── Ollama Integration
    ├── Streaming Responses
    ├── Context-aware Prompts
    └── Error Handling
```

### Agent Types

#### CodeAgent
- **Purpose**: Generate, refactor, and improve code
- **Keywords**: write, create, generate, function, class, method, implement, refactor
- **Context**: Active file, project type, language, code selection
- **Output**: Clean, documented, runnable code examples

#### FileAgent
- **Purpose**: File operations and organization
- **Keywords**: file, folder, directory, create, delete, move, copy, organize
- **Context**: Project root, current directory, file system access
- **Output**: Safe file operations with step-by-step instructions

#### ExplainAgent
- **Purpose**: Explain code and technical concepts
- **Keywords**: explain, what, how, why, understand, learn, teach, tutorial
- **Context**: Code to explain, language, user level
- **Output**: Clear explanations with examples and analogies

#### ShellAgent
- **Purpose**: Shell commands and system operations
- **Keywords**: command, terminal, shell, execute, run, install, build
- **Context**: Operating system, shell type, working directory
- **Output**: Safe command recommendations with explanations

## API Reference

### processQuery(query, context, options)

Main orchestration method that routes queries to appropriate agents.

**Parameters:**
- `query` (string): User query to process
- `context` (object): Context information for the query
- `options` (object): Additional options including stream callback

**Context Properties:**
- `activeFile` (string): Currently active file
- `projectType` (string): Type of project (React, Node.js, etc.)
- `language` (string): Programming language
- `projectRoot` (string): Project root directory
- `currentDirectory` (string): Current working directory
- `hasFileAccess` (boolean): Whether file system access is available
- `code` (string): Code to analyze or explain
- `userLevel` (string): User's skill level
- `os` (string): Operating system
- `shell` (string): Shell type
- `workingDirectory` (string): Working directory for commands
- `sandboxAvailable` (boolean): Whether sandbox is available

**Returns:** Promise resolving to:
```javascript
{
  success: boolean,
  agent: string,
  intent: string,
  confidence: number,
  result: any,
  error?: string,
  timestamp: string
}
```

### getStatus()

Get orchestrator status and configuration.

**Returns:**
```javascript
{
  availableAgents: Array<{
    name: string,
    description: string
  }>,
  conversationHistoryLength: number,
  intentPatterns: string[],
  timestamp: string
}
```

### Agent Management

#### addAgent(name, agent)
Add a new agent to the orchestrator.

#### removeAgent(name)
Remove an agent from the orchestrator.

#### getAgent(name)
Get a specific agent by name.

#### listAgents()
List all available agents.

### Intent Management

#### updateIntentPatterns(intent, patterns)
Update keyword patterns for intent detection.

#### clearHistory()
Clear conversation history.

## Usage Examples

### Basic Query Processing

```javascript
const { orchestrator } = require('./orchestrator');

// Process a code generation query
const result = await orchestrator.processQuery(
  'Write a React component for a todo list',
  {
    activeFile: 'TodoList.jsx',
    projectType: 'React',
    language: 'javascript'
  }
);

console.log('Agent:', result.agent);        // CodeAgent
console.log('Intent:', result.intent);      // code
console.log('Confidence:', result.confidence); // 0.85
```

### Streaming Responses

```javascript
// Process query with streaming callback
await orchestrator.processQuery(
  'Create a REST API with Express.js',
  {
    projectType: 'Node.js',
    language: 'javascript'
  },
  {
    streamCallback: (data) => {
      console.log(`[${data.agent}] ${data.token}`);
      if (data.done) {
        console.log('Generation complete!');
      }
    }
  }
);
```

### Context-aware Processing

```javascript
// Process query with rich context
const result = await orchestrator.processQuery(
  'How do I optimize this function?',
  {
    activeFile: 'performance.js',
    code: 'function slowFunction() { /* slow code */ }',
    hasCodeSelection: true,
    projectType: 'Node.js',
    userLevel: 'intermediate'
  }
);
```

### File Operations

```javascript
// Process file-related query
const result = await orchestrator.processQuery(
  'Create a folder structure for my React project',
  {
    projectRoot: '/path/to/project',
    currentDirectory: '/path/to/project',
    hasFileAccess: true
  }
);
```

### Shell Commands

```javascript
// Process shell-related query
const result = await orchestrator.processQuery(
  'How do I install dependencies and start the dev server?',
  {
    os: 'Windows',
    shell: 'PowerShell',
    workingDirectory: '/path/to/project',
    sandboxAvailable: true
  }
);
```

### Agent Management

```javascript
// List all agents
const agents = orchestrator.listAgents();
console.log('Available agents:', agents.map(a => a.name));

// Get specific agent
const codeAgent = orchestrator.getAgent('code');
console.log('Code agent description:', codeAgent.description);

// Add custom agent
class CustomAgent extends BaseAgent {
  constructor() {
    super('CustomAgent', 'A custom agent for specific tasks');
  }
  
  async execute(query, context) {
    // Custom implementation
    return await ollamaConnector.generateResponse(query, this.getSystemPrompt());
  }
}

orchestrator.addAgent('custom', new CustomAgent());
```

### Intent Pattern Customization

```javascript
// Update intent patterns
orchestrator.updateIntentPatterns('code', [
  'write', 'create', 'generate', 'code', 'function',
  'custom_keyword', 'specialized_term'
]);

// Clear conversation history
orchestrator.clearHistory();
```

## Intent Detection

### Keyword Patterns

The orchestrator uses keyword-based pattern matching to detect user intent:

#### Code Intent
- **Keywords**: write, create, generate, code, function, class, method, implement, refactor, optimize, fix, bug, error, debug
- **Languages**: javascript, typescript, python, java, c++, c#, go, rust, react, vue, angular, node, express
- **Concepts**: algorithm, data structure, api, endpoint, component, module, database, query, migration

#### File Intent
- **Keywords**: file, folder, directory, create, delete, move, copy, rename, organize, structure, layout, tree, path
- **Operations**: mkdir, rmdir, touch, cp, mv, ls, find, grep, backup, restore, archive, extract
- **Permissions**: chmod, chown, access, read, write

#### Explain Intent
- **Keywords**: explain, what, how, why, understand, learn, teach, tutorial, guide, documentation
- **Concepts**: concept, theory, principle, pattern, best practice, example, demo, walkthrough
- **Analysis**: breakdown, analysis, comparison, difference, similarity, pros, cons

#### Shell Intent
- **Keywords**: command, terminal, shell, bash, cmd, powershell, execute, run, install, uninstall
- **Operations**: build, compile, deploy, start, stop, restart, service, daemon, process
- **Tools**: git, npm, yarn, pip, apt, yum, brew, docker, environment, variable, path

### Context Enhancement

The orchestrator enhances intent detection with context:

- **File Extensions**: `.js`, `.ts`, `.py` files boost code intent
- **Recent Commands**: Recent shell commands boost shell intent
- **Code Selection**: Selected code boosts explain intent
- **Project Type**: Project type influences agent selection

## Error Handling

### Fallback Mechanisms

1. **Primary Error**: If the selected agent fails, falls back to ExplainAgent
2. **Fallback Error**: If ExplainAgent fails, returns error with details
3. **Intent Detection**: If no clear intent, defaults to ExplainAgent
4. **Agent Missing**: If agent not found, throws descriptive error

### Error Response Format

```javascript
{
  success: false,
  agent: 'ExplainAgent',
  intent: 'explain',
  confidence: 0.5,
  result: fallbackResult,
  error: 'Primary error message',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## Performance Considerations

### Optimization Tips

1. **Context Caching**: Cache frequently used context data
2. **Pattern Preprocessing**: Preprocess keyword patterns for faster matching
3. **History Limits**: Limit conversation history to prevent memory bloat
4. **Streaming**: Use streaming for better user experience
5. **Agent Pooling**: Reuse agent instances for better performance

### Memory Management

- **History Limits**: Automatically trim conversation history
- **Context Cleanup**: Clear unused context data
- **Pattern Optimization**: Optimize keyword patterns for memory efficiency

## Testing

Run the test suite to verify functionality:

```bash
# JavaScript
node src/agents/testOrchestrator.js

# TypeScript
npx tsx src/agents/testOrchestrator.ts
```

## Extending the Orchestrator

### Adding New Agents

1. **Extend BaseAgent**:
```javascript
class CustomAgent extends BaseAgent {
  constructor() {
    super('CustomAgent', 'Description of what this agent does');
  }
  
  async execute(query, context) {
    // Implement agent logic
    return await ollamaConnector.generateResponse(query, this.getSystemPrompt());
  }
}
```

2. **Register Agent**:
```javascript
orchestrator.addAgent('custom', new CustomAgent());
```

3. **Update Intent Patterns**:
```javascript
orchestrator.updateIntentPatterns('custom', ['keyword1', 'keyword2']);
```

### Custom Intent Detection

Override the `detectIntent` method for custom logic:

```javascript
class CustomIntentDetector extends IntentDetector {
  detectIntent(query) {
    // Custom intent detection logic
    return super.detectIntent(query);
  }
}
```

## Security Considerations

### Input Validation
- Validate all input parameters
- Sanitize user queries
- Limit query length and complexity

### Context Security
- Validate context data
- Prevent context injection attacks
- Limit context size and scope

### Agent Isolation
- Isolate agent execution
- Prevent cross-agent data leakage
- Validate agent permissions

## Contributing

1. Follow the modular architecture
2. Add comprehensive tests
3. Update documentation
4. Consider security implications
5. Maintain backward compatibility

## License

MIT License - see LICENSE file for details

