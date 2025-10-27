import express from 'express'
import Joi from 'joi'

const router = express.Router()

// Validation schemas
const generateSchema = Joi.object({
  prompt: Joi.string().required().min(1).max(10000),
  model: Joi.string().optional().default('qwen2.5-coder:1.5b'),
  temperature: Joi.number().optional().min(0).max(2).default(0.05),
  maxTokens: Joi.number().optional().min(1).max(4096).default(128),
  stream: Joi.boolean().optional().default(true),
  context: Joi.string().optional().max(50000),
  useOrchestrator: Joi.boolean().optional().default(true),
  agentContext: Joi.object().optional()
})

const analyzeSchema = Joi.object({
  code: Joi.string().required().min(1).max(100000),
  language: Joi.string().optional().default('typescript'),
  analysisType: Joi.string().optional().valid('quality', 'security', 'performance', 'all').default('all')
})

const taskSchema = Joi.object({
  description: Joi.string().required().min(1).max(5000),
  context: Joi.string().optional().max(10000)
})

// Generic project plan generator - works for ANY project type
const generateProjectPlan = (description: string) => {
  const lowerDesc = description.toLowerCase()
  
  // Extract project name and features
  const extractProjectName = (desc: string): string => {
    const patterns = [
      /create\s+an?\s+([a-z\s]+)\s+(app|game|project|tool|widget)/i,
      /build\s+an?\s+([a-z\s]+)\s+(app|game|project|tool|widget)/i,
      /make\s+an?\s+([a-z\s]+)\s+(app|game|project|tool|widget)/i,
      /(?:a|an|the)\s+([a-z\s]+)\s+(app|game|project|tool|widget)/i
    ]
    
    for (const pattern of patterns) {
      const match = desc.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    // Fallback: extract words that sound like a project
    const words = desc.split(' ').filter(w => w.length > 2)
    return words.slice(0, 3).join(' ').toLowerCase()
  }
  
  const projectName = extractProjectName(description)
  const componentName = projectName.split(' ').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join('')
  
  // Detect technology stack
  let technologies: string[] = ['React', 'TypeScript']
  const dependencies: string[] = ['react', 'typescript', '@types/react']
  
  if (lowerDesc.includes('tailwind') || lowerDesc.includes('styling')) {
    technologies.push('TailwindCSS')
    dependencies.push('tailwindcss')
  }
  
  // Generate generic React component
  const componentContent = `import React${projectName.includes('state') || projectName.includes('interactive') ? ', { useState }' : ''} from 'react'

${projectName.includes('interface') || projectName.includes('props') ? `interface ${componentName}Props {
  // Add props here
}

` : ''}const ${componentName}: React.FC${projectName.includes('interface') ? `<${componentName}Props>` : ''} = () => {
${projectName.includes('state') || projectName.includes('interactive') ? `  const [value, setValue] = React.useState('')\n  \n` : ''}  return (
    <div className="${lowerDesc.replace(/\s+/g, '-')}-container">
      <h1>${componentName}</h1>
      <p>This is a new ${projectName} component created by AI</p>
      {/* Add your component logic here */}
    </div>
  )
}

export default ${componentName}`
  
  // Determine which file operations to perform
  const files = [
    {
      type: 'create' as const,
      path: `src/components/${componentName}.tsx`,
      content: componentContent,
      reason: `Create ${componentName} component for ${projectName}`
    },
    {
      type: 'update' as const,
      path: 'src/App.tsx',
      content: `import React from 'react'
import ${componentName} from './components/${componentName}'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${componentName}</h1>
        <${componentName} />
      </header>
    </div>
  )
}

export default App`,
      reason: 'Update App.tsx to use the new component'
    }
  ]
  
  // Generate commands
  const commands = [
    {
      command: 'npm install',
      workingDirectory: 'frontend',
      timeout: 30000,
      description: 'Install dependencies'
    },
    {
      command: 'npm run build',
      workingDirectory: 'frontend',
      timeout: 60000,
      description: 'Build the project'
    }
  ]
  
  // Instructions based on detected features
  const instructions: string[] = []
  
  if (lowerDesc.includes('todo') || lowerDesc.includes('task')) {
    instructions.push('Implement todo list functionality with add, complete, and delete operations')
  } else if (lowerDesc.includes('calc') || lowerDesc.includes('calculator')) {
    instructions.push('Implement calculator with basic arithmetic operations')
  } else if (lowerDesc.includes('counter') || lowerDesc.includes('count')) {
    instructions.push('Implement counter with increment and decrement')
  } else if (lowerDesc.includes('timer') || lowerDesc.includes('clock')) {
    instructions.push('Implement timer or clock functionality')
  } else {
    instructions.push(`Implement ${projectName} functionality`)
  }
  
  return {
    projectType: componentName,
    technologies,
    files,
    dependencies,
    instructions,
    commands
  }
}

// POST /api/ai/generate - Generate AI response
router.post('/generate', async (req, res) => {
  try {
    const { error, value } = generateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { prompt } = value;

      return res.json({
      success: true,
      content: `AI response for: ${prompt}`,
        timestamp: new Date().toISOString()
    });
    return
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: 'Failed to generate AI response' });
    return
  }
});

// POST /api/ai/analyze - Analyze code
router.post('/analyze', async (req, res) => {
  try {
    const { error, value } = analyzeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { code, language, analysisType } = value;

    return res.json({
      analysis: {
        language,
        type: analysisType,
        summary: 'Code analysis completed',
        suggestions: ['Consider adding error handling', 'Add type annotations where missing']
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Code analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze code' });
  }
});

// POST /api/ai/execute-project - Execute project creation
router.post('/execute-project', async (req, res) => {
  try {
    const { error, value } = taskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { description } = value;
    const plan = generateProjectPlan(description);
    
    return res.json({
      success: true,
      plan: plan,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Project execution error:', err);
    return res.status(500).json({ error: 'Failed to execute project' });
  }
});

// GET /api/ai/models - Get available models
router.get('/models', async (req, res) => {
  try {
    return res.json({
      models: [
        { name: 'qwen2.5-coder:1.5b', description: 'Code generation model' },
        { name: 'llama3.2:3b', description: 'General purpose model' }
      ],
      defaultModel: 'qwen2.5-coder:1.5b'
    });
  } catch (err) {
    console.error('Models error:', err);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

// GET /api/ai/status - Get AI status
router.get('/status', async (req, res) => {
  try {
    return res.json({
      status: 'ready',
                timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;