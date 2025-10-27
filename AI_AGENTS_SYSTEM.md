# AI Agents System Documentation

## Overview

The AI-Coder project now includes a comprehensive AI Agents System with a Master Agent that orchestrates three specialized agents:
1. **File Agent** - Handles file operations (create, read, update, delete)
2. **Chat Agent** - Manages AI conversations
3. **Terminal Agent** - Executes terminal commands

## Architecture

### Master Agent (`backend/src/agents/MasterAgent.ts`)
- **Role**: Central orchestrator that takes user prompts and routes them to appropriate agents
- **Features**:
  - Prompt optimization and intent detection
  - Task routing to specialized agents
  - Memory management
  - Result combination

### File Agent (`backend/src/agents/FileAgent.ts`)
- **Actions**: create, read, update, delete, list
- **Features**:
  - Safe file operations with error handling
  - Directory creation
  - Path validation

### Chat Agent (`backend/src/agents/ChatAgent.ts`)
- **Actions**: respond, clear, history
- **Features**:
  - Context-aware responses
  - Conversation history management
  - Intelligent prompt analysis

### Terminal Agent (`backend/src/agents/TerminalAgent.ts`)
- **Actions**: execute, validate
- **Features**:
  - Command validation (whitelist-based security)
  - Safe command execution
  - Structured output

## API Endpoints

### POST `/api/agents/process`
Process a user prompt through the Master Agent.

**Request:**
```json
{
  "prompt": "Create a file called test.txt with content Hello World",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "result": "Task completed successfully...",
  "timestamp": "2025-10-27T..."
}
```

### GET `/api/agents/memory`
Get the agent's memory (recent conversations and context).

**Response:**
```json
{
  "success": true,
  "memory": [...],
  "count": 10
}
```

### DELETE `/api/agents/memory`
Clear the agent's memory.

**Response:**
```json
{
  "success": true,
  "message": "Memory cleared"
}
```

## Usage Examples

### Example 1: Create a File
**Prompt:** "Create a file called example.txt with content Hello World"

**What happens:**
1. Master Agent analyzes prompt
2. Detects file creation intent
3. Routes to File Agent
4. File Agent creates the file
5. Result returned to user

### Example 2: Run a Command
**Prompt:** "Run npm install"

**What happens:**
1. Master Agent analyzes prompt
2. Detects command execution intent
3. Routes to Terminal Agent
4. Terminal Agent validates and executes command
5. Output returned to user

### Example 3: Chat
**Prompt:** "Hello, how can you help me?"

**What happens:**
1. Master Agent analyzes prompt
2. Routes to Chat Agent
3. Chat Agent generates contextual response
4. Response returned to user

## Integration

The agents are integrated into the main application through:
- **Backend**: `backend/src/routes/agents.ts`
- **Frontend Service**: `frontend/src/services/agentService.ts`
- **Main Backend**: `backend/src/index.ts` (agents route registered)

## Testing

Test the agents with curl commands:

```bash
# Test prompt processing
curl -X POST http://localhost:3000/api/agents/process \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}'

# Get memory
curl http://localhost:3000/api/agents/memory

# Clear memory
curl -X DELETE http://localhost:3000/api/agents/memory
```

## Security Features

1. **Command Whitelisting**: Terminal Agent only executes allowed commands
2. **Path Validation**: File Agent validates paths to prevent directory traversal
3. **Error Handling**: All agents include comprehensive error handling
4. **Memory Limits**: Master Agent keeps only last 50 memories

## Future Enhancements

1. Direct AI model integration for more intelligent responses
2. Real-time agent status monitoring
3. Agent-specific configuration per user
4. Parallel task execution optimization
5. Agent performance metrics

