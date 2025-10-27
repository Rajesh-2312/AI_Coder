import React, { useState, useEffect } from 'react';

interface OllamaConfig {
  ollama: {
    servers: {
      local: {
        url: string;
        name: string;
        enabled: boolean;
      };
      external: {
        url: string;
        name: string;
        enabled: boolean;
        models?: {
          primary: string;
          fallback: string;
        };
      };
    };
    activeServer: string;
  };
  ai: {
    defaultModel: string;
    externalModel: string;
  };
}

export const OllamaConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<OllamaConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalModel, setExternalModel] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/ollama/config');
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        setExternalUrl(data.config.ollama.servers.external.url);
        setExternalModel(data.config.ai.externalModel);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const testConnection = async () => {
    if (!externalUrl) {
      setMessage('Please enter a server URL');
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const response = await fetch('/api/ollama/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: externalUrl })
      });

      const data = await response.json();
      setConnectionResult(data);
      
      if (data.success && data.connected) {
        setMessage(`✅ Connected! Found ${data.models.length} models`);
      } else {
        setMessage('❌ Connection failed');
      }
    } catch (error) {
      setMessage('❌ Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const configureExternal = async () => {
    if (!externalUrl || !externalModel) {
      setMessage('Please enter both server URL and model name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ollama/configure-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          serverUrl: externalUrl, 
          modelName: externalModel 
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ External server configured successfully!');
        loadConfig(); // Reload config
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Configuration failed');
    } finally {
      setLoading(false);
    }
  };

  const switchToExternal = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ollama/switch-external', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Switched to external Ollama server!');
        loadConfig();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Switch failed');
    } finally {
      setLoading(false);
    }
  };

  const switchToLocal = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ollama/switch-local', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Switched to local Ollama server!');
        loadConfig();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Switch failed');
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return <div className="p-4">Loading Ollama configuration...</div>;
  }

  return (
    <div className="p-6 bg-card rounded-lg border">
      <h2 className="text-xl font-bold mb-4">🤖 Ollama Server Configuration</h2>
      
      {/* Current Status */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Current Status</h3>
        {config && (
          <>
            <p><strong>Active Server:</strong> {config.ollama.activeServer}</p>
            <p><strong>Server URL:</strong> {config.ollama.servers[config.ollama.activeServer as keyof typeof config.ollama.servers]?.url}</p>
            <p><strong>Active Model:</strong> {config.ollama.activeServer === 'external' ? config.ai.externalModel : config.ai.defaultModel}</p>
          </>
        )}
      </div>

      {/* External Server Configuration */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Configure External Ollama Server</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Server URL</label>
            <input
              type="text"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="http://192.168.1.100:11434"
              className="w-full p-2 border rounded-md bg-background"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Model Name</label>
            <input
              type="text"
              value={externalModel}
              onChange={(e) => setExternalModel(e.target.value)}
              placeholder="qwen2.5-coder-lite"
              className="w-full p-2 border rounded-md bg-background"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={testConnection}
              disabled={testingConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              onClick={configureExternal}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Configure External
            </button>
          </div>
        </div>

        {connectionResult && (
          <div className="mt-3 p-3 bg-muted rounded-md">
            <p><strong>Connection:</strong> {connectionResult.connected ? '✅ Success' : '❌ Failed'}</p>
            {connectionResult.models && (
              <p><strong>Available Models:</strong> {connectionResult.models.join(', ')}</p>
            )}
          </div>
        )}
      </div>

      {/* Server Switching */}
      <div className="mb-4">
        <h3 className="font-semibold mb-3">Switch Server</h3>
        <div className="flex gap-2">
          <button
            onClick={switchToLocal}
            disabled={loading || config.ollama.activeServer === 'local'}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            Use Local Server
          </button>
          
          <button
            onClick={switchToExternal}
            disabled={loading || config.ollama.activeServer === 'external' || !config.ollama.servers.external.enabled}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            Use External Server
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          {message}
        </div>
      )}
    </div>
  );
};
