import React, { useState, useEffect } from 'react'
import { X, FolderOpen, Download, Upload, Palette, Bot, Terminal, Code, AlertCircle, Loader2 } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useSettings } from '../hooks/useSettings'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'appearance' | 'editor' | 'ai' | 'general'>('appearance')
  
  // Use Settings hook
  const {
    settings,
    isLoading,
    isSaving,
    error,
    lastSaved,
    updateSetting,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    clearError,
    validateSettings
  } = useSettings()

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    updateSetting('general', 'theme', newTheme)
  }

  const handleSettingChange = (category: keyof typeof settings, key: string, value: any) => {
    updateSetting(category, key as any, value)
  }

  const handleOllamaTest = async () => {
    try {
      const response = await fetch(`${settings.ai.defaultModel}/api/tags`)
      if (response.ok) {
        alert('Ollama connection successful!')
      } else {
        alert('Ollama connection failed. Please check the URL.')
      }
    } catch (error) {
      alert('Ollama connection failed. Please check if Ollama is running.')
    }
  }

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        await importSettings(file)
        alert('Settings imported successfully!')
      } catch (error) {
        alert(`Failed to import settings: ${error}`)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-border bg-muted/50">
            <div className="p-2 space-y-1">
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'appearance' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
                }`}
              >
                <Palette className="h-4 w-4" />
                <span>Appearance</span>
              </button>
              <button
                onClick={() => setActiveTab('editor')}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'editor' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
                }`}
              >
                <Code className="h-4 w-4" />
                <span>Editor</span>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'ai' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
                }`}
              >
                <Bot className="h-4 w-4" />
                <span>AI</span>
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  activeTab === 'general' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
                }`}
              >
                <Terminal className="h-4 w-4" />
                <span>General</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <div className="flex items-center space-x-2 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span className="flex-1">{error}</span>
                  <button 
                    onClick={clearError}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="mb-4 flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading settings...</span>
              </div>
            )}
            
            {/* Last Saved Info */}
            {lastSaved && (
              <div className="mb-4 text-xs text-muted-foreground text-center">
                Last saved: {lastSaved.toLocaleString()}
              </div>
            )}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Theme</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="theme"
                        value="light"
                        checked={settings.theme === 'light'}
                        onChange={() => handleThemeChange('light')}
                        className="w-4 h-4"
                      />
                      <span>Light</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="theme"
                        value="dark"
                        checked={settings.theme === 'dark'}
                        onChange={() => handleThemeChange('dark')}
                        className="w-4 h-4"
                      />
                      <span>Dark</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="theme"
                        value="system"
                        checked={settings.theme === 'system'}
                        onChange={() => handleThemeChange('system')}
                        className="w-4 h-4"
                      />
                      <span>System</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Editor Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Font Size</label>
                      <input
                        type="range"
                        min="8"
                        max="32"
                        value={settings.editor.fontSize}
                        onChange={(e) => handleSettingChange('editor', 'fontSize', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">{settings.editor.fontSize}px</span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Tab Size</label>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={settings.editor.tabSize}
                        onChange={(e) => handleSettingChange('editor', 'tabSize', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">{settings.editor.tabSize} spaces</span>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.editor.wordWrap}
                          onChange={(e) => handleSettingChange('editor', 'wordWrap', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>Word Wrap</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.editor.minimap}
                          onChange={(e) => handleSettingChange('editor', 'minimap', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>Minimap</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.editor.lineNumbers}
                          onChange={(e) => handleSettingChange('editor', 'lineNumbers', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>Line Numbers</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.editor.autoSave}
                          onChange={(e) => handleSettingChange('editor', 'autoSave', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>Auto Save</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">AI Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Default Model</label>
                      <select
                        value={settings.ai.defaultModel}
                        onChange={(e) => handleSettingChange('ai', 'defaultModel', e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="codellama">CodeLlama</option>
                        <option value="llama2">Llama 2</option>
                        <option value="mistral">Mistral</option>
                        <option value="gemma">Gemma</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Temperature</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={settings.ai.temperature}
                        onChange={(e) => handleSettingChange('ai', 'temperature', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">{settings.ai.temperature}</span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Tokens</label>
                      <input
                        type="range"
                        min="100"
                        max="8000"
                        step="100"
                        value={settings.ai.maxTokens}
                        onChange={(e) => handleSettingChange('ai', 'maxTokens', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">{settings.ai.maxTokens}</span>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.ai.useOrchestrator}
                          onChange={(e) => handleSettingChange('ai', 'useOrchestrator', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>Use AI Orchestrator</span>
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">System Prompt</label>
                      <textarea
                        value={settings.ai.systemPrompt}
                        onChange={(e) => handleSettingChange('ai', 'systemPrompt', e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        rows={3}
                        placeholder="Enter system prompt..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.general.notifications}
                          onChange={(e) => handleSettingChange('general', 'notifications', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>Enable Notifications</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.general.autoConnect}
                          onChange={(e) => handleSettingChange('general', 'autoConnect', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>Auto-connect to Services</span>
                      </label>
                    </div>
                    
                    <div className="border-t border-border pt-4">
                      <h4 className="text-md font-medium mb-3">Settings Management</h4>
                      <div className="flex space-x-3">
                        <button
                          onClick={exportSettings}
                          className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Export</span>
                        </button>
                        
                        <label className="flex items-center space-x-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors cursor-pointer">
                          <Upload className="h-4 w-4" />
                          <span>Import</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportSettings}
                            className="hidden"
                          />
                        </label>
                        
                        <button
                          onClick={resetSettings}
                          className="flex items-center space-x-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              <span>Settings auto-saved</span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
