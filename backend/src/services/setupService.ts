import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { modelDownloader, MODEL_CONFIG } from './modelDownloader';

export interface SetupStatus {
  isFirstLaunch: boolean;
  modelExists: boolean;
  modelPath: string;
  setupComplete: boolean;
  error?: string;
}

export interface SetupProgress {
  stage: 'checking' | 'downloading' | 'verifying' | 'complete' | 'error';
  message: string;
  progress?: number;
  error?: string;
}

export class SetupService {
  private setupCompleteFlag = 'setup-complete.flag';
  private modelPath: string;

  constructor() {
    // Determine model path based on platform
    this.modelPath = this.getModelPath();
  }

  private getModelPath(): string {
    const userDataPath = app.getPath('userData');
    const modelDir = path.join(userDataPath, 'model');
    return path.join(modelDir, MODEL_CONFIG.filename);
  }

  async checkSetupStatus(): Promise<SetupStatus> {
    try {
      const userDataPath = app.getPath('userData');
      const setupFlagPath = path.join(userDataPath, this.setupCompleteFlag);
      
      const isFirstLaunch = !fs.existsSync(setupFlagPath);
      const modelExists = await modelDownloader.checkModelExists(this.modelPath);
      
      return {
        isFirstLaunch,
        modelExists,
        modelPath: this.modelPath,
        setupComplete: !isFirstLaunch && modelExists
      };
    } catch (error: any) {
      return {
        isFirstLaunch: true,
        modelExists: false,
        modelPath: this.modelPath,
        setupComplete: false,
        error: error.message
      };
    }
  }

  async performSetup(onProgress?: (progress: SetupProgress) => void): Promise<void> {
    try {
      onProgress?.({
        stage: 'checking',
        message: 'Checking system requirements...'
      });

      // Check if model already exists
      const modelExists = await modelDownloader.checkModelExists(this.modelPath);
      if (modelExists) {
        onProgress?.({
          stage: 'complete',
          message: 'Setup complete - model already exists',
          progress: 100
        });
        await this.markSetupComplete();
        return;
      }

      onProgress?.({
        stage: 'downloading',
        message: 'Downloading AI model (this may take a few minutes)...',
        progress: 0
      });

      // Download model with progress tracking
      await modelDownloader.downloadModel({
        modelUrl: MODEL_CONFIG.urls.github,
        modelPath: this.modelPath,
        modelName: MODEL_CONFIG.name,
        onProgress: (downloadProgress) => {
          onProgress?.({
            stage: 'downloading',
            message: `Downloading ${MODEL_CONFIG.name}... ${downloadProgress.percentage}%`,
            progress: downloadProgress.percentage
          });
        },
        onComplete: () => {
          onProgress?.({
            stage: 'verifying',
            message: 'Verifying model integrity...',
            progress: 95
          });
        },
        onError: (error) => {
          onProgress?.({
            stage: 'error',
            message: `Download failed: ${error.message}`,
            error: error.message
          });
        }
      });

      // Verify model was downloaded successfully
      const modelInfo = await modelDownloader.getModelInfo(this.modelPath);
      if (!modelInfo.exists || modelInfo.size === 0) {
        throw new Error('Model download verification failed');
      }

      // Mark setup as complete
      await this.markSetupComplete();

      onProgress?.({
        stage: 'complete',
        message: 'Setup complete! Starting AI-Coder...',
        progress: 100
      });

    } catch (error: any) {
      onProgress?.({
        stage: 'error',
        message: `Setup failed: ${error.message}`,
        error: error.message
      });
      throw error;
    }
  }

  private async markSetupComplete(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      const setupFlagPath = path.join(userDataPath, this.setupCompleteFlag);
      
      // Ensure userData directory exists
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      
      // Create setup complete flag file
      fs.writeFileSync(setupFlagPath, JSON.stringify({
        completed: true,
        timestamp: new Date().toISOString(),
        modelPath: this.modelPath,
        version: app.getVersion()
      }));
    } catch (error) {
      console.error('Failed to mark setup as complete:', error);
    }
  }

  async resetSetup(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      const setupFlagPath = path.join(userDataPath, this.setupCompleteFlag);
      
      // Remove setup flag
      if (fs.existsSync(setupFlagPath)) {
        fs.unlinkSync(setupFlagPath);
      }
      
      // Remove model file
      if (fs.existsSync(this.modelPath)) {
        fs.unlinkSync(this.modelPath);
      }
      
      console.log('Setup reset completed');
    } catch (error) {
      console.error('Failed to reset setup:', error);
    }
  }

  getModelPath(): string {
    return this.modelPath;
  }

  async getModelInfo() {
    return await modelDownloader.getModelInfo(this.modelPath);
  }
}

export const setupService = new SetupService();
