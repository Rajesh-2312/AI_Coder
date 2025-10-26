import { useState, useEffect, useCallback } from 'react';

interface UserSettings {
  // Theme settings
  theme: 'light' | 'dark' | 'system';
  
  // Editor settings
  editor: {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
    autoSave: boolean;
    autoSaveDelay: number;
  };
  
  // AI settings
  ai: {
    defaultModel: string;
    temperature: number;
    maxTokens: number;
    useOrchestrator: boolean;
    systemPrompt: string;
  };
  
  // File system settings
  files: {
    autoRefresh: boolean;
    showHiddenFiles: boolean;
    maxFileSize: number;
    allowedExtensions: string[];
  };
  
  // Terminal settings
  terminal: {
    fontSize: number;
    fontFamily: string;
    theme: 'dark' | 'light';
    autoScroll: boolean;
    maxOutputLines: number;
  };
  
  // General settings
  general: {
    language: string;
    timezone: string;
    dateFormat: string;
    notifications: boolean;
    autoConnect: boolean;
  };
}

interface SettingsValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

const defaultSettings: UserSettings = {
  theme: 'system',
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: true,
    lineNumbers: true,
    autoSave: true,
    autoSaveDelay: 1000
  },
  ai: {
    defaultModel: 'codellama',
    temperature: 0.7,
    maxTokens: 2048,
    useOrchestrator: true,
    systemPrompt: 'You are a helpful AI coding assistant.'
  },
  files: {
    autoRefresh: true,
    showHiddenFiles: false,
    maxFileSize: 10485760, // 10MB
    allowedExtensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css', '.json', '.md', '.txt']
  },
  terminal: {
    fontSize: 12,
    fontFamily: 'Consolas, "Courier New", monospace',
    theme: 'dark',
    autoScroll: true,
    maxOutputLines: 1000
  },
  general: {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    notifications: true,
    autoConnect: true
  }
};

export const useSettings = (backendUrl: string = 'http://localhost:3000') => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const apiUrl = `${backendUrl}/api/config`;
  const storageKey = 'ai-coder-settings';

  // Load settings from localStorage
  const loadFromStorage = useCallback((): UserSettings => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
    return defaultSettings;
  }, []);

  // Save settings to localStorage
  const saveToStorage = useCallback((newSettings: UserSettings) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newSettings));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
      setError('Failed to save settings locally');
    }
  }, []);

  // Generic API call function
  const apiCall = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      throw error;
    }
  }, [apiUrl]);

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall<{
        success: boolean;
        settings: UserSettings;
        timestamp: string;
      }>('/load');
      
      setSettings(result.settings);
      saveToStorage(result.settings);
      
      return result.settings;
    } catch (error) {
      console.error('Failed to load settings from backend:', error);
      // Fallback to localStorage
      const localSettings = loadFromStorage();
      setSettings(localSettings);
      return localSettings;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, saveToStorage, loadFromStorage]);

  // Save settings to backend
  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    setIsSaving(true);
    setError(null);
    
    try {
      const result = await apiCall<{
        success: boolean;
        settings: UserSettings;
        timestamp: string;
      }>('/save', {
        method: 'POST',
        body: JSON.stringify({ settings: newSettings })
      });
      
      setSettings(result.settings);
      saveToStorage(result.settings);
      
      return result.settings;
    } catch (error) {
      console.error('Failed to save settings to backend:', error);
      // Save locally as fallback
      setSettings(newSettings);
      saveToStorage(newSettings);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [apiCall, saveToStorage]);

  // Update specific setting
  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    category: K,
    key: keyof UserSettings[K],
    value: UserSettings[K][keyof UserSettings[K]]
  ) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    };
    
    setSettings(newSettings);
    saveToStorage(newSettings);
    
    // Save to backend in background
    try {
      await saveSettings(newSettings);
    } catch (error) {
      console.error('Failed to sync settings to backend:', error);
    }
  }, [settings, saveToStorage, saveSettings]);

  // Update multiple settings at once
  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    
    setSettings(newSettings);
    saveToStorage(newSettings);
    
    // Save to backend in background
    try {
      await saveSettings(newSettings);
    } catch (error) {
      console.error('Failed to sync settings to backend:', error);
    }
  }, [settings, saveToStorage, saveSettings]);

  // Reset settings to defaults
  const resetSettings = useCallback(async () => {
    await saveSettings(defaultSettings);
  }, [saveSettings]);

  // Validate settings
  const validateSettings = useCallback((settingsToValidate: UserSettings): SettingsValidation => {
    const errors: Record<string, string> = {};
    
    // Theme validation
    if (!['light', 'dark', 'system'].includes(settingsToValidate.theme)) {
      errors.theme = 'Theme must be light, dark, or system';
    }
    
    // Editor validation
    if (settingsToValidate.editor.fontSize < 8 || settingsToValidate.editor.fontSize > 32) {
      errors.editorFontSize = 'Font size must be between 8 and 32';
    }
    
    if (settingsToValidate.editor.tabSize < 1 || settingsToValidate.editor.tabSize > 8) {
      errors.editorTabSize = 'Tab size must be between 1 and 8';
    }
    
    if (settingsToValidate.editor.autoSaveDelay < 100 || settingsToValidate.editor.autoSaveDelay > 10000) {
      errors.editorAutoSaveDelay = 'Auto-save delay must be between 100ms and 10s';
    }
    
    // AI validation
    if (settingsToValidate.ai.temperature < 0 || settingsToValidate.ai.temperature > 2) {
      errors.aiTemperature = 'Temperature must be between 0 and 2';
    }
    
    if (settingsToValidate.ai.maxTokens < 1 || settingsToValidate.ai.maxTokens > 8000) {
      errors.aiMaxTokens = 'Max tokens must be between 1 and 8000';
    }
    
    // File validation
    if (settingsToValidate.files.maxFileSize < 1024 || settingsToValidate.files.maxFileSize > 100 * 1024 * 1024) {
      errors.filesMaxFileSize = 'Max file size must be between 1KB and 100MB';
    }
    
    // Terminal validation
    if (settingsToValidate.terminal.fontSize < 8 || settingsToValidate.terminal.fontSize > 24) {
      errors.terminalFontSize = 'Terminal font size must be between 8 and 24';
    }
    
    if (settingsToValidate.terminal.maxOutputLines < 100 || settingsToValidate.terminal.maxOutputLines > 10000) {
      errors.terminalMaxOutputLines = 'Max output lines must be between 100 and 10000';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, []);

  // Export settings
  const exportSettings = useCallback(() => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-coder-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [settings]);

  // Import settings
  const importSettings = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      
      // Validate imported settings
      const validation = validateSettings(importedSettings);
      if (!validation.isValid) {
        throw new Error(`Invalid settings: ${Object.values(validation.errors).join(', ')}`);
      }
      
      await saveSettings(importedSettings);
      return importedSettings;
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }, [validateSettings, saveSettings]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get setting value
  const getSetting = useCallback(<K extends keyof UserSettings>(
    category: K,
    key: keyof UserSettings[K]
  ) => {
    return settings[category][key];
  }, [settings]);

  // Check if setting exists
  const hasSetting = useCallback(<K extends keyof UserSettings>(
    category: K,
    key: keyof UserSettings[K]
  ) => {
    return category in settings && key in settings[category];
  }, [settings]);

  // Auto-load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Auto-save settings when they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (settings !== defaultSettings) {
        saveToStorage(settings);
      }
    }, 1000); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [settings, saveToStorage]);

  return {
    // State
    settings,
    isLoading,
    isSaving,
    error,
    lastSaved,
    
    // Actions
    loadSettings,
    saveSettings,
    updateSetting,
    updateSettings,
    resetSettings,
    
    // Utilities
    validateSettings,
    exportSettings,
    importSettings,
    clearError,
    getSetting,
    hasSetting,
    
    // Helpers
    isDefaultSettings: () => JSON.stringify(settings) === JSON.stringify(defaultSettings),
    getSettingsSize: () => JSON.stringify(settings).length,
    getLastSavedTime: () => lastSaved?.toLocaleString() || 'Never'
  };
};

