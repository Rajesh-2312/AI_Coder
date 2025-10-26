import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle, X } from 'lucide-react';

interface ModelDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number;
  eta: number;
}

export const ModelDownloadModal: React.FC<ModelDownloadModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      checkModelStatus();
      setupWebSocketListeners();
    }
    
    return () => {
      // Cleanup WebSocket listeners
    };
  }, [isOpen]);

  const checkModelStatus = async () => {
    try {
      const response = await fetch('/api/model/status');
      const data = await response.json();
      
      if (data.success) {
        setModelStatus(data.model);
        
        if (data.model.exists && data.model.downloadProgress === 100) {
          setDownloadStatus('completed');
        }
      }
    } catch (error) {
      console.error('Failed to check model status:', error);
      setError('Failed to check model status');
    }
  };

  const setupWebSocketListeners = () => {
    // Listen for download progress events
    const socket = (window as any).socket;
    if (socket) {
      socket.on('model:download:progress', (data: DownloadProgress) => {
        setDownloadProgress(data);
        setDownloadStatus('downloading');
      });

      socket.on('model:download:complete', () => {
        setDownloadStatus('completed');
        setDownloadProgress(null);
        onComplete();
      });

      socket.on('model:download:error', (data: { error: string }) => {
        setError(data.error);
        setDownloadStatus('error');
      });
    }
  };

  const startDownload = async () => {
    try {
      setError(null);
      setDownloadStatus('downloading');
      
      const response = await fetch('/api/model/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start download');
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      setError(error instanceof Error ? error.message : 'Download failed');
      setDownloadStatus('error');
    }
  };

  const setupLocalModel = async () => {
    try {
      const response = await fetch('/api/model/setup-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        onComplete();
      } else {
        throw new Error(data.error || 'Failed to setup local model');
      }
      
    } catch (error) {
      console.error('Setup failed:', error);
      setError(error instanceof Error ? error.message : 'Setup failed');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Download className="h-5 w-5" />
            AI Model Setup
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Model Status */}
          {modelStatus && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm">
                <div><strong>Model:</strong> {modelStatus.name}</div>
                <div><strong>Size:</strong> {modelStatus.sizeFormatted} / {modelStatus.expectedSizeFormatted}</div>
                <div><strong>Status:</strong> {modelStatus.exists ? 'Downloaded' : 'Not Downloaded'}</div>
              </div>
            </div>
          )}

          {/* Download Progress */}
          {downloadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Downloading...</span>
                <span>{downloadProgress.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatBytes(downloadProgress.downloaded)} / {formatBytes(downloadProgress.total)}</span>
                <span>{formatSpeed(downloadProgress.speed)} • ETA: {formatETA(downloadProgress.eta)}</span>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {downloadStatus === 'downloading' && !downloadProgress && (
            <div className="flex items-center gap-2 text-blue-500">
              <Download className="h-4 w-4 animate-spin" />
              <span>Starting download...</span>
            </div>
          )}

          {downloadStatus === 'completed' && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-4 w-4" />
              <span>Download completed!</span>
            </div>
          )}

          {downloadStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span>Download failed: {error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {downloadStatus === 'idle' && !modelStatus?.exists && (
              <button
                onClick={startDownload}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Model (800MB)
              </button>
            )}

            {downloadStatus === 'completed' && (
              <button
                onClick={setupLocalModel}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Setup Local Model
              </button>
            )}

            {downloadStatus === 'error' && (
              <button
                onClick={startDownload}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Retry Download
              </button>
            )}

            {modelStatus?.exists && downloadStatus === 'idle' && (
              <button
                onClick={setupLocalModel}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Use Local Model
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            The 800MB AI model will be downloaded and stored locally for faster responses.
          </div>
        </div>
      </div>
    </div>
  );
};

