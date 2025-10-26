const { ollamaConnector } = require('../utils/ollamaConnector');
const { sandbox } = require('../utils/sandbox');
const fs = require('fs').promises;
const path = require('path');

/**
 * AI Agent Orchestrator for AI-Coder Backend
 * Routes user queries to appropriate specialized agents
 */

// Base Agent Class
class BaseAgent {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  async execute(query, context = {}) {
    throw new Error(`Execute method must be implemented by ${this.name}`);
  }

  getSystemPrompt() {
    return `You are ${this.name}. ${this.description}`;
  }
}

// Code Agent - Generate or refactor code
class CodeAgent extends BaseAgent {
  constructor() {
    super('CodeAgent', 'A specialized AI agent for generating, refactoring, and improving code. You provide clean, efficient, and well-documented code solutions.');
  }

  async execute(query, context = {}) {
    const systemPrompt = `${this.getSystemPrompt()}

Current context:
- Active file: ${context.activeFile || 'None'}
- Project type: ${context.projectType || 'Unknown'}
- Language: ${context.language || 'Auto-detect'}

Guidelines:
- Write clean, readable, and maintainable code
- Include proper error handling
- Add meaningful comments
- Follow best practices for the language
- Consider performance and security
- Provide complete, runnable code examples`;

    return await ollamaConnector.generateResponse(
      query,
      systemPrompt,
      (token, done, metadata) => {
        if (context.streamCallback) {
          context.streamCallback({
            type: 'code',
            agent: this.name,
            token,
            done,
            metadata
          });
        }
      }
    );
  }
}

// File Agent - Create/update/delete files
class FileAgent extends BaseAgent {
  constructor() {
    super('FileAgent', 'A specialized AI agent for file operations including creating, updating, deleting, and organizing files and directories.');
  }

  async execute(query, context = {}) {
    const systemPrompt = `${this.getSystemPrompt()}

Current context:
- Project root: ${context.projectRoot || 'Unknown'}
- Current directory: ${context.currentDirectory || 'Unknown'}
- File system access: ${context.hasFileAccess ? 'Available' : 'Limited'}

Guidelines:
- Provide safe file operations
- Suggest proper file organization
- Consider cross-platform compatibility
- Include backup recommendations
- Validate file paths and permissions
- Provide step-by-step instructions`;

    return await ollamaConnector.generateResponse(
      query,
      systemPrompt,
      (token, done, metadata) => {
        if (context.streamCallback) {
          context.streamCallback({
            type: 'file',
            agent: this.name,
            token,
            done,
            metadata
          });
        }
      }
    );
  }
}

// Explain Agent - Explain code
class ExplainAgent extends BaseAgent {
  constructor() {
    super('ExplainAgent', 'A specialized AI agent for explaining code, concepts, algorithms, and technical topics in a clear and understandable way.');
  }

  async execute(query, context = {}) {
    const systemPrompt = `${this.getSystemPrompt()}

Current context:
- Code to explain: ${context.code ? 'Provided' : 'Not provided'}
- Language: ${context.language || 'Auto-detect'}
- User level: ${context.userLevel || 'Intermediate'}

Guidelines:
- Explain concepts clearly and simply
- Use analogies when helpful
- Break down complex topics
- Provide examples and use cases
- Include potential pitfalls or gotchas
- Suggest further learning resources`;

    return await ollamaConnector.generateResponse(
      query,
      systemPrompt,
      (token, done, metadata) => {
        if (context.streamCallback) {
          context.streamCallback({
            type: 'explain',
            agent: this.name,
            token,
            done,
            metadata
          });
        }
      }
    );
  }
}

// Shell Agent - Suggest or execute shell commands
class ShellAgent extends BaseAgent {
  constructor() {
    super('ShellAgent', 'A specialized AI agent for suggesting and executing shell commands safely. You provide secure command recommendations and can execute them in a sandboxed environment.');
  }

  async execute(query, context = {}) {
    const systemPrompt = `${this.getSystemPrompt()}

Current context:
- Operating system: ${context.os || 'Unknown'}
- Shell: ${context.shell || 'Unknown'}
- Working directory: ${context.workingDirectory || 'Unknown'}
- Sandbox available: ${context.sandboxAvailable ? 'Yes' : 'No'}

Guidelines:
- Only suggest safe, non-destructive commands
- Explain what each command does
- Provide alternatives for different operating systems
- Warn about potentially dangerous operations
- Suggest testing commands in safe environments first
- Include proper error handling`;

    return await ollamaConnector.generateResponse(
      query,
      systemPrompt,
      (token, done, metadata) => {
        if (context.streamCallback) {
          context.streamCallback({
            type: 'shell',
            agent: this.name,
            token,
            done,
            metadata
          });
        }
      }
    );
  }

  // Execute shell commands safely
  async executeCommand(command, args = [], context = {}) {
    if (!context.sandboxAvailable) {
      throw new Error('Sandbox not available for command execution');
    }

    try {
      const result = await sandbox.runCommand(
        command,
        args,
        (data) => {
          if (context.streamCallback) {
            context.streamCallback({
              type: 'shell_output',
              agent: this.name,
              content: data.content,
              streamType: data.type,
              processId: data.processId
            });
          }
        },
        {
          timeout: context.timeout || 30000,
          workingDirectory: context.workingDirectory,
          allowUnsafe: false
        }
      );

      return {
        success: result.success,
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode,
        executionTime: result.executionTime
      };
    } catch (error) {
      throw new Error(`Command execution failed: ${error.message}`);
    }
  }
}

// Intent Detection Engine
class IntentDetector {
  constructor() {
    this.patterns = {
      code: [
        'write', 'create', 'generate', 'code', 'function', 'class', 'method',
        'implement', 'refactor', 'optimize', 'fix', 'bug', 'error', 'debug',
        'algorithm', 'data structure', 'api', 'endpoint', 'component', 'module',
        'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
        'react', 'vue', 'angular', 'node', 'express', 'django', 'flask',
        'html', 'css', 'scss', 'sass', 'json', 'xml', 'yaml', 'sql',
        'database', 'query', 'migration', 'schema', 'model', 'controller',
        'service', 'repository', 'middleware', 'plugin', 'library', 'package'
      ],
      file: [
        'file', 'folder', 'directory', 'create', 'delete', 'move', 'copy',
        'rename', 'organize', 'structure', 'layout', 'tree', 'path',
        'mkdir', 'rmdir', 'touch', 'cp', 'mv', 'ls', 'find', 'grep',
        'backup', 'restore', 'archive', 'extract', 'compress', 'decompress',
        'permission', 'chmod', 'chown', 'access', 'read', 'write'
      ],
      explain: [
        'explain', 'what', 'how', 'why', 'understand', 'learn', 'teach',
        'tutorial', 'guide', 'documentation', 'concept', 'theory',
        'principle', 'pattern', 'best practice', 'example', 'demo',
        'walkthrough', 'step by step', 'breakdown', 'analysis',
        'comparison', 'difference', 'similarity', 'pros', 'cons',
        'advantage', 'disadvantage', 'when to use', 'use case'
      ],
      shell: [
        'command', 'terminal', 'shell', 'bash', 'cmd', 'powershell',
        'execute', 'run', 'install', 'uninstall', 'update', 'upgrade',
        'build', 'compile', 'deploy', 'start', 'stop', 'restart',
        'service', 'daemon', 'process', 'kill', 'ps', 'top', 'htop',
        'git', 'clone', 'pull', 'push', 'commit', 'merge', 'branch',
        'npm', 'yarn', 'pip', 'apt', 'yum', 'brew', 'docker',
        'environment', 'variable', 'path', 'export', 'alias'
      ]
    };
  }

  detectIntent(query) {
    const lowerQuery = query.toLowerCase();
    const scores = {};

    // Calculate scores for each intent
    for (const [intent, keywords] of Object.entries(this.patterns)) {
      scores[intent] = 0;
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword)) {
          scores[intent]++;
        }
      }
    }

    // Find the intent with the highest score
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return 'explain'; // Default to explain if no clear intent
    }

    const detectedIntent = Object.keys(scores).find(
      intent => scores[intent] === maxScore
    );

    return {
      intent: detectedIntent,
      confidence: maxScore / Math.max(...Object.values(this.patterns).map(p => p.length)),
      scores
    };
  }

  // Enhanced intent detection with context
  detectIntentWithContext(query, context = {}) {
    const basicIntent = this.detectIntent(query);
    
    // Adjust based on context
    if (context.activeFile && context.activeFile.includes('.')) {
      const extension = path.extname(context.activeFile).toLowerCase();
      if (['.js', '.ts', '.py', '.java', '.cpp', '.cs'].includes(extension)) {
        basicIntent.scores.code = (basicIntent.scores.code || 0) + 2;
      }
    }

    if (context.recentCommands && context.recentCommands.length > 0) {
      basicIntent.scores.shell = (basicIntent.scores.shell || 0) + 1;
    }

    if (context.hasCodeSelection) {
      basicIntent.scores.explain = (basicIntent.scores.explain || 0) + 1;
    }

    // Recalculate with context adjustments
    const maxScore = Math.max(...Object.values(basicIntent.scores));
    const detectedIntent = Object.keys(basicIntent.scores).find(
      intent => basicIntent.scores[intent] === maxScore
    );

    return {
      intent: detectedIntent,
      confidence: maxScore / Math.max(...Object.values(this.patterns).map(p => p.length)),
      scores: basicIntent.scores,
      contextAdjustments: true
    };
  }
}

// Main Orchestrator Class
class AgentOrchestrator {
  constructor() {
    this.agents = {
      code: new CodeAgent(),
      file: new FileAgent(),
      explain: new ExplainAgent(),
      shell: new ShellAgent()
    };
    
    this.intentDetector = new IntentDetector();
    this.conversationHistory = [];
    this.maxHistoryLength = 10;
  }

  // Main orchestration method
  async processQuery(query, context = {}, options = {}) {
    try {
      // Detect intent
      const intentResult = this.intentDetector.detectIntentWithContext(query, context);
      
      // Get the appropriate agent
      const agent = this.agents[intentResult.intent];
      if (!agent) {
        throw new Error(`No agent found for intent: ${intentResult.intent}`);
      }

      // Prepare enhanced context
      const enhancedContext = {
        ...context,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        streamCallback: options.streamCallback,
        sandboxAvailable: !!sandbox,
        conversationHistory: this.getRelevantHistory(query)
      };

      // Execute with the selected agent
      const result = await agent.execute(query, enhancedContext);

      // Update conversation history
      this.updateHistory({
        query,
        intent: intentResult.intent,
        agent: agent.name,
        timestamp: new Date(),
        context: enhancedContext
      });

      return {
        success: true,
        agent: agent.name,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Orchestrator error:', error);
      
      // Fallback to explain agent
      try {
        const fallbackResult = await this.agents.explain.execute(
          `I encountered an error while processing your request: "${query}". Please help explain what might have gone wrong and suggest alternatives.`,
          { ...context, streamCallback: options.streamCallback }
        );

        return {
          success: false,
          agent: 'ExplainAgent',
          intent: 'explain',
          confidence: 0.5,
          result: fallbackResult,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      } catch (fallbackError) {
        return {
          success: false,
          agent: 'None',
          intent: 'unknown',
          confidence: 0,
          result: null,
          error: `Primary error: ${error.message}. Fallback error: ${fallbackError.message}`,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Get relevant conversation history
  getRelevantHistory(query, limit = 3) {
    const relevantHistory = this.conversationHistory
      .filter(entry => {
        const queryWords = query.toLowerCase().split(' ');
        const historyWords = entry.query.toLowerCase().split(' ');
        return queryWords.some(word => historyWords.includes(word));
      })
      .slice(-limit);

    return relevantHistory.map(entry => ({
      query: entry.query,
      intent: entry.intent,
      agent: entry.agent,
      timestamp: entry.timestamp
    }));
  }

  // Update conversation history
  updateHistory(entry) {
    this.conversationHistory.push(entry);
    
    // Keep only recent history
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  // Get orchestrator status
  getStatus() {
    return {
      availableAgents: Object.keys(this.agents).map(name => ({
        name,
        description: this.agents[name].description
      })),
      conversationHistoryLength: this.conversationHistory.length,
      intentPatterns: Object.keys(this.intentDetector.patterns),
      timestamp: new Date().toISOString()
    };
  }

  // Add new agent
  addAgent(name, agent) {
    if (!(agent instanceof BaseAgent)) {
      throw new Error('Agent must extend BaseAgent');
    }
    this.agents[name] = agent;
  }

  // Remove agent
  removeAgent(name) {
    if (this.agents[name]) {
      delete this.agents[name];
    }
  }

  // Update intent patterns
  updateIntentPatterns(intent, patterns) {
    this.intentDetector.patterns[intent] = patterns;
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory = [];
  }

  // Get agent by name
  getAgent(name) {
    return this.agents[name];
  }

  // List all agents
  listAgents() {
    return Object.keys(this.agents).map(name => ({
      name,
      description: this.agents[name].description
    }));
  }
}

// Create singleton instance
const orchestrator = new AgentOrchestrator();

// Export classes and singleton
module.exports = {
  AgentOrchestrator,
  BaseAgent,
  CodeAgent,
  FileAgent,
  ExplainAgent,
  ShellAgent,
  IntentDetector,
  orchestrator,
  default: orchestrator
};

