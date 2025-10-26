import express from 'express';
import { ModelDownloader } from '../services/modelDownloader';
import { ollamaConfigManager } from '../config/ollamaConfigManager';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const modelDownloader = new ModelDownloader();

// Model configuration
const MODEL_CONFIG = {
  name: 'qwen2.5-coder-lite',
  filename: 'qwen2.5-coder-lite.gguf',
  size: 800 * 1024 * 1024, // 800MB
  urls: {
    github: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    local: 'http://localhost:8000/models/qwen2.5-coder-lite.gguf'
  }
};

// GET /api/model/status - Check model download status
router.get('/status', async (req, res) => {
  try {
    const modelPath = path.join(process.cwd(), '..', 'model', MODEL_CONFIG.filename);
    const exists = fs.existsSync(modelPath);
    
    let size = 0;
    let sizeFormatted = '0 Bytes';
    
    if (exists) {
      const stats = fs.statSync(modelPath);
      size = stats.size;
      sizeFormatted = formatBytes(size);
    }
    
    res.json({
      success: true,
      model: {
        name: MODEL_CONFIG.name,
        filename: MODEL_CONFIG.filename,
        exists,
        size,
        sizeFormatted,
        expectedSize: MODEL_CONFIG.size,
        expectedSizeFormatted: formatBytes(MODEL_CONFIG.size),
        downloadProgress: exists ? 100 : 0
      }
    });
  } catch (error) {
    console.error('Error checking model status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check model status'
    });
  }
});

// POST /api/model/download - Start model download
router.post('/download', async (req, res) => {
  try {
    const modelPath = path.join(process.cwd(), '..', 'model', MODEL_CONFIG.filename);
    
    // Check if model already exists
    if (fs.existsSync(modelPath)) {
      const stats = fs.statSync(modelPath);
      if (stats.size >= MODEL_CONFIG.size * 0.9) { // 90% of expected size
        return res.json({
          success: true,
          message: 'Model already exists and is complete',
          modelPath: MODEL_CONFIG.filename
        });
      }
    }
    
    // Start download
    console.log('Starting model download...');
    
    const downloadOptions = {
      modelUrl: MODEL_CONFIG.urls.github,
      modelPath,
      modelName: MODEL_CONFIG.name,
      onProgress: (progress: any) => {
        // Emit progress to connected clients
        req.app.get('io')?.emit('model:download:progress', {
          downloaded: progress.downloaded,
          total: progress.total,
          percentage: progress.percentage,
          speed: progress.speed,
          eta: progress.eta
        });
      },
      onComplete: () => {
        console.log('Model download completed');
        req.app.get('io')?.emit('model:download:complete', {
          modelPath: MODEL_CONFIG.filename,
          modelName: MODEL_CONFIG.name
        });
      },
      onError: (error: Error) => {
        console.error('Model download error:', error);
        req.app.get('io')?.emit('model:download:error', {
          error: error.message
        });
      }
    };
    
    // Start download in background
    modelDownloader.downloadModel(downloadOptions).catch(error => {
      console.error('Download failed:', error);
      req.app.get('io')?.emit('model:download:error', {
        error: error.message
      });
    });
    
    res.json({
      success: true,
      message: 'Model download started',
      modelName: MODEL_CONFIG.name
    });
    
  } catch (error) {
    console.error('Error starting model download:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start model download'
    });
  }
});

// POST /api/model/setup-local - Setup local model after download
router.post('/setup-local', async (req, res) => {
  try {
    const modelPath = path.join(process.cwd(), '..', 'model', MODEL_CONFIG.filename);
    
    if (!fs.existsSync(modelPath)) {
      return res.status(404).json({
        success: false,
        error: 'Model file not found. Please download the model first.'
      });
    }
    
    // Update Ollama configuration to use local model
    await ollamaConfigManager.updateConfig({
      ollama: {
        activeServer: 'local',
        servers: {
          local: {
            models: {
              primary: MODEL_CONFIG.name,
              fallback: 'qwen2.5-coder:1.5b'
            }
          }
        }
      },
      ai: {
        defaultModel: MODEL_CONFIG.name
      }
    });
    
    console.log('Local model setup completed');
    
    res.json({
      success: true,
      message: 'Local model setup completed',
      modelName: MODEL_CONFIG.name,
      modelPath: MODEL_CONFIG.filename
    });
    
  } catch (error) {
    console.error('Error setting up local model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup local model'
    });
  }
});

// Utility function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
