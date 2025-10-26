import { Router } from 'express'
import { aiModelTrainer } from '../services/aiModelTrainer'
import Joi from 'joi'

const router = Router()

// Validation schemas
const createSessionSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required()
})

const addExampleSchema = Joi.object({
  userInput: Joi.string().required(),
  projectType: Joi.string().required(),
  technologies: Joi.array().items(Joi.string()).required(),
  agentTasks: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('file_operation', 'command_execution', 'dependency_management', 'testing').required(),
    description: Joi.string().required(),
    parameters: Joi.object().required(),
    expectedOutcome: Joi.string().required(),
    dependencies: Joi.array().items(Joi.string()).optional()
  })).required()
})

const updateSuccessRateSchema = Joi.object({
  successRate: Joi.number().min(0).max(1).required()
})

// Create a new training session
router.post('/sessions', async (req, res) => {
  try {
    const { error, value } = createSessionSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      })
    }

    const session = await aiModelTrainer.createTrainingSession(value.name, value.description)
    
    res.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Failed to create training session:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create training session'
    })
  }
})

// Add a training example to a session
router.post('/sessions/:sessionId/examples', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { error, value } = addExampleSchema.validate(req.body)
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      })
    }

    const example = await aiModelTrainer.addTrainingExample(
      sessionId,
      value.userInput,
      value.projectType,
      value.technologies,
      value.agentTasks
    )
    
    res.json({
      success: true,
      example
    })
  } catch (error) {
    console.error('Failed to add training example:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add training example'
    })
  }
})

// Update example success rate
router.put('/examples/:exampleId/success-rate', async (req, res) => {
  try {
    const { exampleId } = req.params
    const { error, value } = updateSuccessRateSchema.validate(req.body)
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      })
    }

    await aiModelTrainer.updateExampleSuccessRate(exampleId, value.successRate)
    
    res.json({
      success: true,
      message: 'Success rate updated'
    })
  } catch (error) {
    console.error('Failed to update success rate:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update success rate'
    })
  }
})

// Get training examples with optional pattern matching
router.get('/examples', async (req, res) => {
  try {
    const { pattern } = req.query
    const examples = await aiModelTrainer.getTrainingExamples(pattern as string)
    
    res.json({
      success: true,
      examples
    })
  } catch (error) {
    console.error('Failed to get training examples:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get training examples'
    })
  }
})

// Generate agent plan based on user input
router.post('/generate-plan', async (req, res) => {
  try {
    const { userInput } = req.body
    
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'userInput is required and must be a string'
      })
    }

    const result = await aiModelTrainer.generateAgentPlan(userInput)
    
    res.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Failed to generate agent plan:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate agent plan'
    })
  }
})

// Get training statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await aiModelTrainer.getTrainingStats()
    
    res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Failed to get training stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get training stats'
    })
  }
})

// Train the model with a specific example
router.post('/train', async (req, res) => {
  try {
    const { userInput, projectType, technologies, agentTasks, successRate } = req.body
    
    if (!userInput || !projectType || !technologies || !agentTasks) {
      return res.status(400).json({
        success: false,
        error: 'userInput, projectType, technologies, and agentTasks are required'
      })
    }

    // Create a temporary session for this training
    const session = await aiModelTrainer.createTrainingSession(
      `Training_${Date.now()}`,
      `Training session for: ${userInput}`
    )

    const example = await aiModelTrainer.addTrainingExample(
      session.id,
      userInput,
      projectType,
      technologies,
      agentTasks
    )

    if (successRate !== undefined) {
      await aiModelTrainer.updateExampleSuccessRate(example.id, successRate)
    }
    
    res.json({
      success: true,
      message: 'Model trained successfully',
      session,
      example
    })
  } catch (error) {
    console.error('Failed to train model:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to train model'
    })
  }
})

// Get best matching example for user input
router.post('/match', async (req, res) => {
  try {
    const { userInput } = req.body
    
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'userInput is required and must be a string'
      })
    }

    const example = await aiModelTrainer.getBestMatchingExample(userInput)
    
    res.json({
      success: true,
      example
    })
  } catch (error) {
    console.error('Failed to find matching example:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to find matching example'
    })
  }
})

export default router
