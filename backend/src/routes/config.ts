import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { AppError, validateRequest, rateLimit } from '../middleware/errorHandler'
import Joi from 'joi'

const router = express.Router()

// Validation schemas
const configUpdateSchema = Joi.object({
  theme: Joi.string().optional().valid('light', 'dark', 'system'),
  fontSize: Joi.number().optional().min(10).max(24),
  tabSize: Joi.number().optional().min(2).max(8),
  wordWrap: Joi.boolean().optional(),
  minimap: Joi.boolean().optional(),
  showLineNumbers: Joi.boolean().optional(),
  bracketPairColorization: Joi.boolean().optional(),
  autoSave: Joi.boolean().optional(),
  ollamaUrl: Joi.string().optional().uri(),
  ollamaModel: Joi.string().optional(),
  workspaceDir: Joi.string().optional(),
  sandboxDir: Joi.string().optional(),
  maxFileSize: Joi.number().optional().min(1024).max(100 * 1024 * 1024), // 1KB to 100MB
  allowedFileTypes: Joi.array().optional().items(Joi.string()),
  maxConcurrentProcesses: Joi.number().optional().min(1).max(20)
})

const configResetSchema = Joi.object({
  section: Joi.string().optional().valid('appearance', 'editor', 'ai', 'general', 'all')
})

// Configuration service class
class ConfigService {
  private configDir: string
  private configFile: string
  private defaultConfig: any

  constructor() {
    this.configDir = process.env.CONFIG_DIR || path.join(__dirname, '../../config')
    this.configFile = path.join(this.configDir, 'settings.json')
    this.defaultConfig = this.getDefaultConfig()
    this.ensureConfigDirectory()
  }

  private async ensureConfigDirectory() {
    try {
      await fs.access(this.configDir)
    } catch {
      await fs.mkdir(this.configDir, { recursive: true })
      console.log(`Created config directory: ${this.configDir}`)
    }
  }

  private getDefaultConfig() {
    return {
      appearance: {
        theme: 'system',
        fontSize: 14,
        tabSize: 2,
        wordWrap: true,
        minimap: false,
        showLineNumbers: true,
        bracketPairColorization: true
      },
      editor: {
        autoSave: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css', '.json', '.md', '.txt'],
        maxConcurrentProcesses: 5
      },
      ai: {
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'codellama',
        temperature: 0.7,
        maxTokens: 2048,
        timeout: 30000
      },
      general: {
        workspaceDir: process.env.WORKSPACE_DIR || path.join(__dirname, '../../workspace'),
        sandboxDir: process.env.SANDBOX_DIR || path.join(__dirname, '../../sandbox/temp'),
        logLevel: 'info',
        enableLogging: true,
        enableAudit: true
      },
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    }
  }

  async loadConfig(): Promise<any> {
    try {
      const configData = await fs.readFile(this.configFile, 'utf8')
      const config = JSON.parse(configData)
      
      // Merge with default config to ensure all properties exist
      return this.mergeWithDefaults(config)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist, create with defaults
        await this.saveConfig(this.defaultConfig)
        return this.defaultConfig
      }
      throw new AppError(`Failed to load configuration: ${error.message}`, 500)
    }
  }

  async saveConfig(config: any): Promise<void> {
    try {
      // Add metadata
      const configWithMetadata = {
        ...config,
        lastUpdated: new Date().toISOString(),
        version: config.version || '1.0.0'
      }

      await fs.writeFile(this.configFile, JSON.stringify(configWithMetadata, null, 2))
    } catch (error: any) {
      throw new AppError(`Failed to save configuration: ${error.message}`, 500)
    }
  }

  async updateConfig(updates: any): Promise<any> {
    try {
      const currentConfig = await this.loadConfig()
      const updatedConfig = this.deepMerge(currentConfig, updates)
      
      await this.saveConfig(updatedConfig)
      return updatedConfig
    } catch (error) {
      throw error
    }
  }

  async resetConfig(section?: string): Promise<any> {
    try {
      if (!section || section === 'all') {
        await this.saveConfig(this.defaultConfig)
        return this.defaultConfig
      }

      const currentConfig = await this.loadConfig()
      const defaultSection = this.defaultConfig[section]
      
      if (!defaultSection) {
        throw new AppError(`Invalid configuration section: ${section}`, 400)
      }

      currentConfig[section] = defaultSection
      await this.saveConfig(currentConfig)
      return currentConfig
    } catch (error) {
      throw error
    }
  }

  async exportConfig(): Promise<string> {
    try {
      const config = await this.loadConfig()
      return JSON.stringify(config, null, 2)
    } catch (error) {
      throw error
    }
  }

  async importConfig(configData: string): Promise<any> {
    try {
      const importedConfig = JSON.parse(configData)
      
      // Validate imported config structure
      const validatedConfig = this.mergeWithDefaults(importedConfig)
      
      await this.saveConfig(validatedConfig)
      return validatedConfig
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new AppError('Invalid JSON format in imported configuration', 400)
      }
      throw error
    }
  }

  async validateConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Validate appearance settings
    if (config.appearance) {
      if (config.appearance.fontSize && (config.appearance.fontSize < 10 || config.appearance.fontSize > 24)) {
        errors.push('Font size must be between 10 and 24')
      }
      if (config.appearance.tabSize && (config.appearance.tabSize < 2 || config.appearance.tabSize > 8)) {
        errors.push('Tab size must be between 2 and 8')
      }
    }

    // Validate AI settings
    if (config.ai) {
      if (config.ai.ollamaUrl && !this.isValidUrl(config.ai.ollamaUrl)) {
        errors.push('Invalid Ollama URL format')
      }
      if (config.ai.temperature && (config.ai.temperature < 0 || config.ai.temperature > 2)) {
        errors.push('Temperature must be between 0 and 2')
      }
    }

    // Validate general settings
    if (config.general) {
      if (config.general.maxFileSize && config.general.maxFileSize > 100 * 1024 * 1024) {
        errors.push('Maximum file size cannot exceed 100MB')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  private mergeWithDefaults(config: any): any {
    return this.deepMerge(this.defaultConfig, config)
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target }
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    
    return result
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  async getConfigPath(): Promise<string> {
    return this.configFile
  }

  async backupConfig(): Promise<string> {
    try {
      const config = await this.loadConfig()
      const backupFile = path.join(this.configDir, `backup_${Date.now()}.json`)
      
      await fs.writeFile(backupFile, JSON.stringify(config, null, 2))
      return backupFile
    } catch (error) {
      throw error
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.configDir)
      return files
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .sort()
        .reverse() // Most recent first
    } catch (error) {
      return []
    }
  }
}

const configService = new ConfigService()

// Routes

// GET /api/config - Get current configuration
router.get('/',
  rateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  async (req, res, next) => {
    try {
      const config = await configService.loadConfig()
      
      return res.json({
        config,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/config/load - Load configuration (alias for GET /)
router.get('/load',
  rateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  async (req, res, next) => {
    try {
      const config = await configService.loadConfig()
      
      return res.json({
        success: true,
        settings: config,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/config - Update configuration
router.post('/',
  rateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  validateRequest(configUpdateSchema),
  async (req, res, next) => {
    try {
      const updates = req.body
      
      // Validate configuration
      const validation = await configService.validateConfig(updates)
      if (!validation.valid) {
        throw new AppError(`Configuration validation failed: ${validation.errors.join(', ')}`, 400)
      }

      const updatedConfig = await configService.updateConfig(updates)
      
      return res.json({
        message: 'Configuration updated successfully',
        config: updatedConfig,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/config/reset - Reset configuration
router.post('/reset',
  rateLimit(5, 15 * 60 * 1000), // 5 requests per 15 minutes
  validateRequest(configResetSchema),
  async (req, res, next) => {
    try {
      const { section } = req.body
      const config = await configService.resetConfig(section)
      
      return res.json({
        message: section ? `Configuration section '${section}' reset successfully` : 'Configuration reset successfully',
        config,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/config/export - Export configuration
router.get('/export',
  rateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  async (req, res, next) => {
    try {
      const configData = await configService.exportConfig()
      
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename="ai-coder-config.json"')
      res.send(configData)
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/config/import - Import configuration
router.post('/import',
  rateLimit(5, 15 * 60 * 1000), // 5 requests per 15 minutes
  async (req, res, next) => {
    try {
      const { configData } = req.body
      
      if (!configData) {
        throw new AppError('Configuration data is required', 400)
      }

      const config = await configService.importConfig(configData)
      
      return res.json({
        message: 'Configuration imported successfully',
        config,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/config/validate - Validate configuration
router.get('/validate',
  rateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  async (req, res, next) => {
    try {
      const config = await configService.loadConfig()
      const validation = await configService.validateConfig(config)
      
      return res.json({
        ...validation,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/config/backup - Create configuration backup
router.get('/backup',
  rateLimit(5, 15 * 60 * 1000), // 5 requests per 15 minutes
  async (req, res, next) => {
    try {
      const backupFile = await configService.backupConfig()
      
      return res.json({
        message: 'Configuration backup created successfully',
        backupFile,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/config/backups - List configuration backups
router.get('/backups',
  rateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  async (req, res, next) => {
    try {
      const backups = await configService.listBackups()
      
      return res.json({
        backups,
        count: backups.length,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/config/path - Get configuration file path
router.get('/path',
  rateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  async (req, res, next) => {
    try {
      const configPath = await configService.getConfigPath()
      
      return res.json({
        path: configPath,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router

