import express from 'express'
import Joi from 'joi'

const router = express.Router()

// Validation schema
const autoFixSchema = Joi.object({
  errors: Joi.array().items(Joi.object({
    type: Joi.string().required(),
    file: Joi.string().optional(),
    message: Joi.string().required(),
    suggestion: Joi.string().optional()
  })).required(),
  context: Joi.array().items(Joi.string()).required()
})

/**
 * POST /api/ai/auto-fix
 * AI-powered automatic error fixing
 */
router.post('/auto-fix', async (req, res) => {
  try {
    const { error, value } = autoFixSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const { errors, context } = value

    console.log(`🤖 AI Auto-fix analyzing ${errors.length} error(s)...`)

    // Generate intelligent fixes based on error patterns
    const fixes = generateAutoFixes(errors, context)

    return res.json({
      success: true,
      fixes,
      message: `Generated ${fixes.length} fix(es)`,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('Auto-fix error:', err)
    return res.status(500).json({ error: 'Failed to generate fixes', details: err.message })
  }
})

/**
 * Generate intelligent fixes for detected errors
 */
function generateAutoFixes(errors: any[], context: string[]): any[] {
  const fixes: any[] = []

  for (const err of errors) {
    // Dependency errors - suggest installing missing packages
    if (err.type === 'dependency' && err.message) {
      const moduleMatch = err.message.match(/Missing module: (.+)/)
      if (moduleMatch) {
        fixes.push({
          action: 'install',
          command: `npm install ${moduleMatch[1]}`,
          description: `Install missing dependency: ${moduleMatch[1]}`,
          confidence: 0.95,
          priority: 'high'
        })
      } else {
        fixes.push({
          action: 'install',
          command: 'npm install',
          description: 'Install all missing dependencies',
          confidence: 0.8,
          priority: 'high'
        })
      }
    }

    // TypeScript errors - suggest code fixes
    else if (err.type === 'typescript') {
      if (err.message.includes('Cannot find name')) {
        fixes.push({
          action: 'code',
          description: 'Add missing import or variable declaration',
          confidence: 0.75,
          priority: 'medium'
        })
      } else if (err.message.includes('already exists')) {
        fixes.push({
          action: 'code',
          description: 'Remove duplicate declaration',
          confidence: 0.85,
          priority: 'medium'
        })
      } else if (err.message.includes('TS7030') || err.message.includes('not all code paths return')) {
        fixes.push({
          action: 'code',
          description: 'Add return statements to all code paths',
          confidence: 0.9,
          priority: 'high'
        })
      }
    }

    // Build errors - suggest rebuilding
    else if (err.type === 'build') {
      fixes.push({
        action: 'build',
        command: 'npm run build',
        description: 'Rebuild project after applying fixes',
        confidence: 0.6,
        priority: 'low'
      })
    }

    // Syntax errors - suggest file fixes
    else if (err.type === 'syntax' && err.file) {
      fixes.push({
        action: 'file',
        file: err.file,
        description: `Fix syntax error in ${err.file}`,
        confidence: 0.7,
        priority: 'high'
      })
    }

    // Runtime errors - suggest commands
    else if (err.type === 'runtime') {
      if (err.message.includes('Port already in use')) {
        fixes.push({
          action: 'command',
          command: 'Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force',
          description: 'Kill process using the port',
          confidence: 0.8,
          priority: 'high'
        })
      }
    }

    // Module not found - suggest installing
    else if (err.message && err.message.includes('Cannot find module')) {
      const modMatch = err.message.match(/Cannot find module ['"](.+?)['"]/)
      if (modMatch) {
        fixes.push({
          action: 'install',
          command: `npm install ${modMatch[1]}`,
          description: `Install missing module: ${modMatch[1]}`,
          confidence: 0.9,
          priority: 'high'
        })
      }
    }
  }

  // Sort by priority and confidence
  fixes.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
    
    return (b.confidence || 0) - (a.confidence || 0)
  })

  return fixes
}

export default router

