import React, { useState, useEffect } from 'react'
import { modelDownloadService, DownloadProgress } from '../services/modelDownloadService'

interface ModelDownloadModalProps {
  onDownloadComplete: () => void
}

export const ModelDownloadModal: React.FC<ModelDownloadModalProps> = ({ onDownloadComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modelInfo, setModelInfo] = useState<{ size: number; path: string } | null>(null)

  useEffect(() => {
    // Get model info
    modelDownloadService.getModelInfo().then((info) => {
      setModelInfo(info)
    })
  }, [])

  const handleDownload = async () => {
    setIsDownloading(true)
    setError(null)

    try {
      const success = await modelDownloadService.downloadModel((progressData) => {
        setProgress(progressData)
      })

      if (success) {
        onDownloadComplete()
      } else {
        setError('Failed to download model. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download model')
    } finally {
      setIsDownloading(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Download AI Model</h2>
          <p className="text-gray-600 mt-2">
            Download the AI model to use AI-Coder features
          </p>
        </div>

        {modelInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">Model Size:</span>
              <span className="text-sm font-bold text-blue-900">{formatBytes(modelInfo.size)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium text-blue-800">File:</span>
              <span className="text-sm text-blue-700">{modelInfo.path}</span>
            </div>
          </div>
        )}

        {progress && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-bold text-gray-900">{Math.round(progress.percentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
              <span>{formatBytes(progress.downloaded)} / {formatBytes(progress.total)}</span>
              <span>Speed: {formatBytes(progress.speed)}/s</span>
              {progress.timeRemaining > 0 && (
                <span>Time remaining: {formatTime(progress.timeRemaining)}</span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!isDownloading && !progress && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                The AI model (approximately 800MB) is required to use all AI-Coder features including:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-yellow-800 ml-4">
                <li>AI code generation</li>
                <li>Project creation</li>
                <li>Code analysis and suggestions</li>
                <li>AI-powered chat assistance</li>
              </ul>
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              Start Download
            </button>
          </div>
        )}

        {isDownloading && progress && progress.percentage >= 100 && (
          <button
            onClick={onDownloadComplete}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Continue to AI-Coder
          </button>
        )}
      </div>
    </div>
  )
}
