import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface ModelDownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number;
  eta: number;
}

export interface ModelDownloadOptions {
  modelUrl: string;
  modelPath: string;
  modelName: string;
  onProgress?: (progress: ModelDownloadProgress) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class ModelDownloader extends EventEmitter {
  private downloadSpeed: number = 0;
  private startTime: number = 0;
  private lastDownloaded: number = 0;

  async downloadModel(options: ModelDownloadOptions): Promise<void> {
    const { modelUrl, modelPath, modelName, onProgress, onComplete, onError } = options;

    try {
      // Ensure model directory exists
      const modelDir = path.dirname(modelPath);
      if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
      }

      // Check if model already exists
      if (fs.existsSync(modelPath)) {
        const stats = fs.statSync(modelPath);
        if (stats.size > 0) {
          console.log(`Model ${modelName} already exists at ${modelPath}`);
          this.emit('complete', { modelPath, modelName });
          onComplete?.();
          return;
        }
      }

      console.log(`Starting download of ${modelName} from ${modelUrl}`);
      
      // Get file size first
      const headResponse = await axios.head(modelUrl);
      const totalSize = parseInt(headResponse.headers['content-length'] || '0', 10);
      
      if (totalSize === 0) {
        throw new Error('Unable to determine file size');
      }

      console.log(`Model size: ${this.formatBytes(totalSize)}`);

      // Start download
      const response = await axios({
        method: 'GET',
        url: modelUrl,
        responseType: 'stream',
        timeout: 300000 // 5 minutes timeout
      });

      const writer = fs.createWriteStream(modelPath);
      let downloadedSize = 0;

      this.startTime = Date.now();
      this.lastDownloaded = 0;

      response.data.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
        writer.write(chunk);

        // Calculate progress
        const percentage = Math.round((downloadedSize / totalSize) * 100);
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.startTime) / 1000;
        
        // Calculate speed (bytes per second)
        this.downloadSpeed = downloadedSize / elapsedTime;
        
        // Calculate ETA
        const remainingBytes = totalSize - downloadedSize;
        const eta = remainingBytes / this.downloadSpeed;

        const progress: ModelDownloadProgress = {
          downloaded: downloadedSize,
          total: totalSize,
          percentage,
          speed: this.downloadSpeed,
          eta
        };

        this.emit('progress', progress);
        onProgress?.(progress);
      });

      response.data.on('end', () => {
        writer.end();
        console.log(`Download completed: ${modelName}`);
        this.emit('complete', { modelPath, modelName });
        onComplete?.();
      });

      response.data.on('error', (error: Error) => {
        writer.destroy();
        fs.unlinkSync(modelPath); // Clean up partial file
        console.error(`Download error: ${error.message}`);
        this.emit('error', error);
        onError?.(error);
      });

    } catch (error: any) {
      console.error(`Model download failed: ${error.message}`);
      this.emit('error', error);
      onError?.(error);
      throw error;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async checkModelExists(modelPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(modelPath)) {
        return false;
      }
      
      const stats = fs.statSync(modelPath);
      return stats.size > 0;
    } catch (error) {
      return false;
    }
  }

  async getModelInfo(modelPath: string): Promise<{ exists: boolean; size: number; sizeFormatted: string }> {
    try {
      if (!fs.existsSync(modelPath)) {
        return { exists: false, size: 0, sizeFormatted: '0 Bytes' };
      }
      
      const stats = fs.statSync(modelPath);
      return {
        exists: stats.size > 0,
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size)
      };
    } catch (error) {
      return { exists: false, size: 0, sizeFormatted: '0 Bytes' };
    }
  }
}

// Model configuration
export const MODEL_CONFIG = {
  name: 'qwen2.5-coder-lite',
  filename: 'qwen2.5-coder-lite.gguf',
  size: 800 * 1024 * 1024, // ~800MB
  urls: {
    // Primary source - GitHub releases
    github: 'https://github.com/QwenLM/Qwen2.5/releases/download/v1.0.0/qwen2.5-coder-lite.gguf',
    // Alternative sources
    huggingface: 'https://huggingface.co/Qwen/Qwen2.5-Coder-Lite/resolve/main/qwen2.5-coder-lite.gguf',
    // Local fallback
    local: 'file:///path/to/local/model/qwen2.5-coder-lite.gguf'
  },
  checksum: {
    algorithm: 'sha256',
    value: 'your-checksum-here' // Add actual checksum when available
  }
};

export const modelDownloader = new ModelDownloader();
