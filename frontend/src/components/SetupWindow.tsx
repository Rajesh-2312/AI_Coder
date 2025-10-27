import React, { useState, useEffect } from 'react';
import { CheckCircle, Download, AlertCircle, Loader2 } from 'lucide-react';

interface SetupProgress {
  stage: 'checking' | 'downloading' | 'verifying' | 'complete' | 'error';
  message: string;
  progress?: number;
  error?: string;
}

interface SetupWindowProps {
  onSetupComplete: () => void;
}

export const SetupWindow: React.FC<SetupWindowProps> = ({ onSetupComplete }) => {
  const [progress, setProgress] = useState<SetupProgress>({
    stage: 'checking',
    message: 'Initializing setup...'
  });

  useEffect(() => {
    // Start setup process
    if (window.electronAPI && typeof (window.electronAPI as any).startSetup === 'function') {
      (window.electronAPI as any).startSetup((setupProgress: SetupProgress) => {
        setProgress(setupProgress);
        
        if (setupProgress.stage === 'complete') {
          setTimeout(() => {
            onSetupComplete();
          }, 2000); // Show completion message for 2 seconds
        }
      });
    } else {
      // Fallback: simulate setup for web
      const simulateSetup = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProgress({ stage: 'complete', message: 'Setup complete!' });
        setTimeout(() => {
          onSetupComplete();
        }, 2000);
      };
      simulateSetup();
    }
  }, [onSetupComplete]);

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'checking':
        return <Loader2 className="w-8 h-8 animate-spin text-blue-500" />;
      case 'downloading':
        return <Download className="w-8 h-8 text-blue-500" />;
      case 'verifying':
        return <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />;
      case 'complete':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Loader2 className="w-8 h-8 animate-spin text-blue-500" />;
    }
  };

  const getStageColor = () => {
    switch (progress.stage) {
      case 'checking':
        return 'text-blue-600';
      case 'downloading':
        return 'text-blue-600';
      case 'verifying':
        return 'text-yellow-600';
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const formatProgress = () => {
    if (progress.progress !== undefined) {
      return `${progress.progress}%`;
    }
    return '';
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">AI</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI-Coder Setup
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Setting up your AI-powered code editor
            </p>
          </div>

          {/* Progress Section */}
          <div className="mb-6">
            <div className="flex items-center justify-center mb-4">
              {getStageIcon()}
            </div>
            
            <h2 className={`text-lg font-semibold mb-2 ${getStageColor()}`}>
              {progress.message}
            </h2>

            {/* Progress Bar */}
            {progress.progress !== undefined && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            )}

            {/* Progress Text */}
            {progress.progress !== undefined && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatProgress()}
              </p>
            )}

            {/* Error Message */}
            {progress.stage === 'error' && progress.error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {progress.error}
                </p>
                <button
                  onClick={() => {
                    if (window.electronAPI && typeof (window.electronAPI as any).retrySetup === 'function') {
                      (window.electronAPI as any).retrySetup();
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                >
                  Retry Setup
                </button>
              </div>
            )}

            {/* Download Info */}
            {progress.stage === 'downloading' && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Downloading AI Model (~800MB)</strong>
                  <br />
                  This is a one-time setup. The model will be cached locally for faster startup.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {progress.stage === 'complete' ? (
              <p>Setup complete! Launching AI-Coder...</p>
            ) : progress.stage === 'error' ? (
              <p>Setup failed. Please check your internet connection and try again.</p>
            ) : (
              <p>Please wait while we set up your AI development environment.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
