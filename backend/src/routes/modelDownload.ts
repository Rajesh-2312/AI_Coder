import express from 'express'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const router = express.Router()

// Model file path
const MODEL_PATH = path.join(__dirname, '../../model/qwen2.5-coder-lite.gguf')

// GET /api/model/check - Check if model exists
router.get('/check', async (req, res) => {
  try {
    const exists = await fs.access(MODEL_PATH).then(() => true).catch(() => false)
    return res.json({ exists })
  } catch (error: any) {
    console.error('Error checking model:', error)
    return res.status(500).json({ exists: false, error: error.message })
  }
})

// GET /api/model/info - Get model file info
router.get('/info', async (req, res) => {
  try {
    const exists = await fs.access(MODEL_PATH).then(() => true).catch(() => false)
    
    if (!exists) {
      return res.status(404).json({ error: 'Model file not found' })
    }

    const stats = await fs.stat(MODEL_PATH)
    
    return res.json({
      size: stats.size,
      path: 'qwen2.5-coder-lite.gguf',
      name: 'Qwen 2.5 Coder Lite',
      downloaded: exists
    })
  } catch (error: any) {
    console.error('Error getting model info:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/model/download - Download model file
router.post('/download', async (req, res) => {
  try {
    const exists = await fs.access(MODEL_PATH).then(() => true).catch(() => false)
    
    if (!exists) {
      return res.status(404).json({ error: 'Model file not found' })
    }

    // Get file stats
    const stats = await fs.stat(MODEL_PATH)
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', 'attachment; filename="qwen2.5-coder-lite.gguf"')
    res.setHeader('Content-Length', stats.size.toString())

    // Stream the file
    const fileStream = await fs.readFile(MODEL_PATH)
    return res.send(fileStream)
  } catch (error: any) {
    console.error('Error downloading model:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router

