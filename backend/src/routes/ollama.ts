import { Router } from 'express';
import { ollamaConfigManager } from '../config/ollamaConfigManager';

const router = Router();

// Get current Ollama configuration
router.get('/config', async (req, res) => {
  try {
    await ollamaConfigManager.loadConfig();
    const config = ollamaConfigManager.getConfig();
    return res.json({
      success: true,
      config,
      activeServer: ollamaConfigManager.getActiveServer(),
      activeModel: ollamaConfigManager.getActiveModel()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load Ollama configuration'
    });
  }
});

// Test connection to a server
router.post('/test-connection', async (req, res) => {
  try {
    const { serverUrl } = req.body;
    
    if (!serverUrl) {
      return res.status(400).json({
        success: false,
        error: 'Server URL is required'
      });
    }

    const isConnected = await ollamaConfigManager.testServerConnection(serverUrl);
    const models = isConnected ? await ollamaConfigManager.getAvailableModels(serverUrl) : [];

    return res.json({
      success: true,
      connected: isConnected,
      models,
      serverUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test server connection'
    });
  }
});

// Configure external server
router.post('/configure-external', async (req, res) => {
  try {
    const { serverUrl, modelName } = req.body;
    
    if (!serverUrl || !modelName) {
      return res.status(400).json({
        success: false,
        error: 'Server URL and model name are required'
      });
    }

    // Test connection first
    const isConnected = await ollamaConfigManager.testServerConnection(serverUrl);
    if (!isConnected) {
      return res.status(400).json({
        success: false,
        error: 'Cannot connect to external server'
      });
    }

    // Configure external server
    await ollamaConfigManager.setExternalServer(serverUrl, modelName);
    
    return res.json({
      success: true,
      message: 'External server configured successfully',
      serverUrl,
      modelName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to configure external server'
    });
  }
});

// Switch to external server
router.post('/switch-external', async (req, res) => {
  try {
    await ollamaConfigManager.switchToExternalServer();
    const activeServer = ollamaConfigManager.getActiveServer();
    
    return res.json({
      success: true,
      message: 'Switched to external Ollama server',
      activeServer,
      activeModel: ollamaConfigManager.getActiveModel()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to switch to external server'
    });
  }
});

// Switch to local server
router.post('/switch-local', async (req, res) => {
  try {
    await ollamaConfigManager.switchToLocalServer();
    const activeServer = ollamaConfigManager.getActiveServer();
    
    return res.json({
      success: true,
      message: 'Switched to local Ollama server',
      activeServer,
      activeModel: ollamaConfigManager.getActiveModel()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to switch to local server'
    });
  }
});

// Get available models from active server
router.get('/models', async (req, res) => {
  try {
    const activeServer = ollamaConfigManager.getActiveServer();
    const models = await ollamaConfigManager.getAvailableModels(activeServer.url);
    
    return res.json({
      success: true,
      models,
      activeServer: activeServer.url
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get available models'
    });
  }
});

export default router;
