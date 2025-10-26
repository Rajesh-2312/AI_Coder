import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

interface OllamaServerConfig {
  url: string;
  name: string;
  description: string;
  enabled: boolean;
  models?: {
    primary: string;
    fallback: string;
  };
}

interface OllamaConfig {
  ollama: {
    servers: Record<string, OllamaServerConfig>;
    activeServer: string;
    fallbackEnabled: boolean;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  ai: {
    defaultModel: string;
    externalModel: string;
    parameters: {
      temperature: number;
      maxTokens: number;
      top_p: number;
      top_k: number;
      repeat_penalty: number;
    };
  };
}

class OllamaConfigManager {
  private configPath: string;
  private config: OllamaConfig;

  constructor() {
    this.configPath = path.join(process.cwd(), 'backend', 'config', 'ollama-config.json');
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): OllamaConfig {
    return {
      ollama: {
        servers: {
          local: {
            url: 'http://localhost:11434',
            name: 'Local Ollama Server',
            description: 'Local Ollama installation',
            enabled: true
          },
          external: {
            url: 'http://YOUR_EXTERNAL_SERVER:11434',
            name: 'External Ollama Server',
            description: 'Remote Ollama server with 800MB model',
            enabled: false,
            models: {
              primary: 'qwen2.5-coder-lite',
              fallback: 'qwen2.5-coder:1.5b'
            }
          }
        },
        activeServer: 'local',
        fallbackEnabled: true,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      ai: {
        defaultModel: 'qwen2.5-coder:1.5b',
        externalModel: 'qwen2.5-coder-lite',
        parameters: {
          temperature: 0.1,
          maxTokens: 256,
          top_p: 0.5,
          top_k: 10,
          repeat_penalty: 1.1
        }
      }
    };
  }

  async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
    } catch (error) {
      console.log('📝 Creating default Ollama configuration...');
      await this.saveConfig();
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('❌ Failed to save Ollama configuration:', error);
    }
  }

  async updateConfig(updates: Partial<OllamaConfig>): Promise<void> {
    try {
      // Merge updates with existing config
      this.config = {
        ...this.config,
        ...updates,
        ollama: {
          ...this.config.ollama,
          ...updates.ollama,
          servers: {
            ...this.config.ollama.servers,
            ...updates.ollama?.servers,
            local: {
              ...this.config.ollama.servers.local,
              ...updates.ollama?.servers?.local
            },
            external: {
              ...this.config.ollama.servers.external,
              ...updates.ollama?.servers?.external
            }
          }
        },
        ai: {
          ...this.config.ai,
          ...updates.ai
        }
      };

      await this.saveConfig();
      console.log('✅ Ollama configuration updated successfully');
    } catch (error) {
      console.error('❌ Failed to update Ollama configuration:', error);
      throw error;
    }
  }

  getActiveServer(): OllamaServerConfig {
    return this.config.ollama.servers[this.config.ollama.activeServer];
  }

  getActiveServerUrl(): string {
    return this.getActiveServer().url;
  }

  getActiveModel(): string {
    const server = this.getActiveServer();
    if (server.models && this.config.ollama.activeServer === 'external') {
      return server.models.primary;
    }
    return this.config.ai.defaultModel;
  }

  getFallbackModel(): string {
    const server = this.getActiveServer();
    if (server.models && this.config.ollama.activeServer === 'external') {
      return server.models.fallback || this.config.ai.defaultModel;
    }
    return this.config.ai.defaultModel;
  }

  async setExternalServer(url: string, modelName: string): Promise<void> {
    this.config.ollama.servers.external.url = url;
    this.config.ollama.servers.external.enabled = true;
    this.config.ollama.servers.external.models = {
      primary: modelName,
      fallback: this.config.ai.defaultModel
    };
    this.config.ai.externalModel = modelName;
    await this.saveConfig();
  }

  async switchToExternalServer(): Promise<void> {
    this.config.ollama.activeServer = 'external';
    await this.saveConfig();
  }

  async switchToLocalServer(): Promise<void> {
    this.config.ollama.activeServer = 'local';
    await this.saveConfig();
  }

  async testServerConnection(serverUrl: string): Promise<boolean> {
    try {
      const response = await axios.get(`${serverUrl}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getAvailableModels(serverUrl: string): Promise<string[]> {
    try {
      const response = await axios.get(`${serverUrl}/api/tags`, {
        timeout: 5000
      });
      return response.data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      return [];
    }
  }

  getConfig(): OllamaConfig {
    return this.config;
  }

  getAIParameters() {
    return this.config.ai.parameters;
  }
}

export const ollamaConfigManager = new OllamaConfigManager();
