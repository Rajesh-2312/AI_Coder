import express from 'express'
import { MasterAgent } from '../agents/MasterAgent'

const router = express.Router()
const masterAgent = new MasterAgent()

// POST /api/agents/process - Process user prompt through Master Agent
router.post('/process', async (req, res) => {
  try {
    const { prompt, userId } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' })
    }

    const result = await masterAgent.processPrompt(prompt, userId)
    
    return res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Agent processing error:', error)
    return res.status(500).json({ error: 'Failed to process prompt' })
  }
})

// GET /api/agents/memory - Get agent memory
router.get('/memory', async (req, res) => {
  try {
    const memory = masterAgent.getMemory()
    
    return res.json({
      success: true,
      memory,
      count: memory.length
    })
  } catch (error) {
    console.error('Memory retrieval error:', error)
    return res.status(500).json({ error: 'Failed to retrieve memory' })
  }
})

// DELETE /api/agents/memory - Clear agent memory
router.delete('/memory', async (req, res) => {
  try {
    masterAgent.clearMemory()
    
    return res.json({
      success: true,
      message: 'Memory cleared'
    })
  } catch (error) {
    console.error('Memory clearing error:', error)
    return res.status(500).json({ error: 'Failed to clear memory' })
  }
})

export default router

