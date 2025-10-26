# AI-Coder Backend

A comprehensive Express.js backend for the AI-Coder IDE with WebSocket support, AI integration, file management, and secure command execution.

## Features

### 🤖 AI Integration
- **Ollama Integration**: Stream AI responses from local models
- **Code Analysis**: Analyze code quality, security, and performance
- **Real-time Streaming**: WebSocket-based live AI responses
- **Multiple Models**: Support for CodeLlama, Llama 2, Mistral, Gemma

### 📁 File Management
- **CRUD Operations**: Create, read, update, delete files and directories
- **File Watching**: Real-time file change notifications
- **Path Security**: Prevent directory traversal attacks
- **File Validation**: Type and size validation

### 🔒 Secure Command Execution
- **Sandbox Environment**: Isolated command execution
- **Command Whitelisting**: Only approved commands allowed
- **Resource Limits**: CPU, memory, and time limits
- **Process Management**: Kill and monitor running processes

### ⚙️ Configuration Management
- **Settings Persistence**: Save and load configuration
- **Import/Export**: Backup and restore settings
- **Validation**: Comprehensive config validation
- **Multiple Sections**: Appearance, editor, AI, general settings

### 🌐 WebSocket Support
- **Real-time Communication**: Live updates and streaming
- **Room Management**: Join/leave rooms for collaboration
- **Connection Management**: Health checks and reconnection
- **Event Broadcasting**: Targeted and global messaging

## API Routes

### AI Generation (`/api/generate`)
- `POST /` - Generate AI response (streaming or non-streaming)
- `POST /analyze` - Analyze code for quality, security, performance
- `GET /models` - Get available Ollama models
- `GET /status` - Check AI service status

### File Management (`/api/files`)
- `GET /*` - Read file content
- `POST /` - Write file content
- `PUT /` - Create new file
- `DELETE /*` - Delete file or directory
- `POST /directory` - Create directory
- `POST /rename` - Rename file or directory
- `POST /copy` - Copy file or directory
- `GET /list/*` - List directory contents
- `GET /info/*` - Get file information

### Command Execution (`/api/execute`)
- `POST /` - Execute shell command
- `POST /code` - Execute code in specific language
- `GET /status` - Get sandbox status
- `POST /kill` - Kill specific process
- `POST /kill-all` - Kill all active processes

### Configuration (`/api/config`)
- `GET /` - Get current configuration
- `POST /` - Update configuration
- `POST /reset` - Reset configuration
- `GET /export` - Export configuration
- `POST /import` - Import configuration
- `GET /validate` - Validate configuration
- `GET /backup` - Create configuration backup
- `GET /backups` - List configuration backups
- `GET /path` - Get configuration file path

## WebSocket Events

### Connection Events
- `connection:established` - Client connected
- `auth:authenticate` - Authenticate client
- `auth:success` - Authentication successful
- `auth:error` - Authentication failed

### Room Events
- `room:join` - Join a room
- `room:leave` - Leave a room
- `room:joined` - Successfully joined room
- `room:left` - Successfully left room
- `room:user-joined` - User joined room
- `room:user-left` - User left room

### AI Events
- `ai:generate` - Generate AI response
- `ai:stream` - Stream AI response chunk
- `ai:complete` - AI response complete
- `ai:end` - AI stream ended
- `ai:error` - AI generation error

### File Events
- `file:watch` - Watch file for changes
- `file:watching` - File watch started
- `file:changed` - File changed notification
- `file:error` - File operation error

### Terminal Events
- `terminal:execute` - Execute terminal command
- `terminal:start` - Command execution started
- `terminal:output` - Command output line
- `terminal:complete` - Command execution complete
- `terminal:error` - Command execution error

### Code Events
- `code:analyze` - Analyze code
- `code:analysis:start` - Analysis started
- `code:analysis:complete` - Analysis complete
- `code:error` - Code analysis error

## Security Features

### Input Validation
- **Joi Schemas**: Comprehensive request validation
- **File Path Validation**: Prevent directory traversal
- **Command Validation**: Whitelist allowed commands
- **Size Limits**: Prevent large file uploads

### Rate Limiting
- **Per-endpoint Limits**: Different limits for different operations
- **IP-based Tracking**: Track requests per IP address
- **Sliding Window**: 15-minute sliding window

### Sandbox Security
- **Command Whitelisting**: Only approved commands allowed
- **Process Isolation**: Commands run in isolated environment
- **Resource Limits**: CPU, memory, and time limits
- **Dangerous Pattern Detection**: Block harmful commands

### File Security
- **Path Validation**: Ensure files stay within workspace
- **Type Validation**: Only allowed file types
- **Size Limits**: Prevent oversized files
- **Permission Checks**: Proper file permissions

## Middleware

### Error Handling
- **Centralized Error Handler**: Consistent error responses
- **Custom Error Classes**: Structured error handling
- **Development Mode**: Detailed error information
- **Logging**: Comprehensive error logging

### Request Logging
- **Morgan Integration**: HTTP request logging
- **Custom Logger**: Detailed request/response logging
- **Performance Tracking**: Request duration tracking
- **Error Tracking**: Error occurrence logging

### Security Headers
- **Helmet Integration**: Security headers
- **CORS Configuration**: Cross-origin resource sharing
- **Content Security Policy**: XSS protection
- **Rate Limiting**: Request rate limiting

## Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Frontend Configuration
FRONTEND_URL=http://localhost:5173

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=codellama

# File System Configuration
WORKSPACE_DIR=./workspace
SANDBOX_DIR=./sandbox/temp
CONFIG_DIR=./config

# Security Configuration
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:5173

# Sandbox Configuration
SANDBOX_MAX_EXECUTION_TIME=30000
SANDBOX_MAX_CONCURRENT_PROCESSES=5
SANDBOX_MAX_OUTPUT_LENGTH=10000

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Development

### Prerequisites
- Node.js 18.0.0+
- npm or yarn
- Ollama (for AI features)

### Installation
```bash
cd backend
npm install
```

### Development Server
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Production Start
```bash
npm start
```

## Project Structure

```
backend/src/
├── routes/              # API route handlers
│   ├── ai.ts           # AI generation routes
│   ├── files.ts        # File management routes
│   ├── execute.ts      # Command execution routes
│   └── config.ts       # Configuration routes
├── middleware/          # Express middleware
│   └── errorHandler.ts # Error handling and validation
├── websocket/           # WebSocket handlers
│   └── handlers.ts     # WebSocket connection management
├── agents/              # AI agent classes (legacy)
├── sandbox/             # Sandbox management (legacy)
└── index.ts            # Main server file
```

## Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### API Status
```bash
curl http://localhost:3000/api/status
```

### AI Service Status
```bash
curl http://localhost:3000/api/generate/status
```

### WebSocket Test
```javascript
const io = require('socket.io-client')
const socket = io('http://localhost:3000')

socket.on('connection:established', (data) => {
  console.log('Connected:', data)
})

socket.emit('ping')
socket.on('pong', (data) => {
  console.log('Pong:', data)
})
```

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment Setup
1. Set environment variables
2. Create necessary directories
3. Install Ollama for AI features
4. Configure firewall rules
5. Set up reverse proxy (nginx)

### Production Considerations
- Use PM2 for process management
- Set up log rotation
- Configure monitoring (Prometheus/Grafana)
- Implement proper backup strategy
- Use HTTPS in production
- Set up rate limiting at proxy level

## Troubleshooting

### Common Issues
1. **Ollama Connection Failed**: Check if Ollama is running
2. **File Permission Errors**: Check workspace directory permissions
3. **WebSocket Connection Issues**: Verify CORS configuration
4. **Command Execution Failed**: Check sandbox directory permissions

### Debug Mode
```bash
DEBUG=* npm run dev
```

### Log Files
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Access logs: Console output

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include input validation
4. Write comprehensive tests
5. Update documentation

## License

MIT License - see LICENSE file for details

