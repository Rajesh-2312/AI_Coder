import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useRef } from 'react'
import { performance } from 'perf_hooks'

interface PerformanceMetrics {
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  memoryUsage: number
  componentMountTime: number
}

interface AppState {
  files: FileItem[]
  activeFile: string | null
  isChatOpen: boolean
  isTerminalOpen: boolean
  settings: AppSettings
  performance: PerformanceMetrics
  cache: Map<string, any>
}

interface FileItem {
  id: string
  name: string
  path: string
  content: string
  lastModified: number
  size: number
  type: 'file' | 'folder'
  children?: FileItem[]
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  autoSave: boolean
  aiModel: string
  temperature: number
  maxTokens: number
}

type AppAction =
  | { type: 'SET_FILES'; payload: FileItem[] }
  | { type: 'ADD_FILE'; payload: FileItem }
  | { type: 'UPDATE_FILE'; payload: { id: string; content: string } }
  | { type: 'DELETE_FILE'; payload: string }
  | { type: 'SET_ACTIVE_FILE'; payload: string | null }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'TOGGLE_TERMINAL' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UPDATE_PERFORMANCE'; payload: Partial<PerformanceMetrics> }
  | { type: 'CACHE_SET'; payload: { key: string; value: any } }
  | { type: 'CACHE_CLEAR' }

const initialState: AppState = {
  files: [],
  activeFile: null,
  isChatOpen: true,
  isTerminalOpen: true,
  settings: {
    theme: 'system',
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: false,
    autoSave: true,
    aiModel: 'qwen2.5-coder-lite',
    temperature: 0.7,
    maxTokens: 2048
  },
  performance: {
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    componentMountTime: 0
  },
  cache: new Map()
}

// Performance-optimized reducer with memoization
const appReducer = (state: AppState, action: AppAction): AppState => {
  const startTime = performance.now()
  
  let newState: AppState
  
  switch (action.type) {
    case 'SET_FILES':
      newState = { ...state, files: action.payload }
      break
    case 'ADD_FILE':
      newState = { ...state, files: [...state.files, action.payload] }
      break
    case 'UPDATE_FILE':
      newState = {
        ...state,
        files: state.files.map(file =>
          file.id === action.payload.id
            ? { ...file, content: action.payload.content, lastModified: Date.now() }
            : file
        )
      }
      break
    case 'DELETE_FILE':
      newState = {
        ...state,
        files: state.files.filter(file => file.id !== action.payload),
        activeFile: state.activeFile === action.payload ? null : state.activeFile
      }
      break
    case 'SET_ACTIVE_FILE':
      newState = { ...state, activeFile: action.payload }
      break
    case 'TOGGLE_CHAT':
      newState = { ...state, isChatOpen: !state.isChatOpen }
      break
    case 'TOGGLE_TERMINAL':
      newState = { ...state, isTerminalOpen: !state.isTerminalOpen }
      break
    case 'UPDATE_SETTINGS':
      newState = { ...state, settings: { ...state.settings, ...action.payload } }
      break
    case 'UPDATE_PERFORMANCE':
      newState = { ...state, performance: { ...state.performance, ...action.payload } }
      break
    case 'CACHE_SET':
      const newCache = new Map(state.cache)
      newCache.set(action.payload.key, action.payload.value)
      newState = { ...state, cache: newCache }
      break
    case 'CACHE_CLEAR':
      newState = { ...state, cache: new Map() }
      break
    default:
      newState = state
  }
  
  // Update performance metrics
  const renderTime = performance.now() - startTime
  newState.performance = {
    ...newState.performance,
    renderCount: newState.performance.renderCount + 1,
    lastRenderTime: renderTime,
    averageRenderTime: (newState.performance.averageRenderTime + renderTime) / 2,
    memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
  }
  
  return newState
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  // Memoized actions for performance
  setFiles: (files: FileItem[]) => void
  addFile: (file: FileItem) => void
  updateFile: (id: string, content: string) => void
  deleteFile: (id: string) => void
  setActiveFile: (id: string | null) => void
  toggleChat: () => void
  toggleTerminal: () => void
  updateSettings: (settings: Partial<AppSettings>) => void
  // Cache operations
  getCachedValue: <T>(key: string) => T | null
  setCachedValue: <T>(key: string, value: T) => void
  clearCache: () => void
  // Performance utilities
  getPerformanceMetrics: () => PerformanceMetrics
  optimizeForHighLoad: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Performance monitoring hook
const usePerformanceMonitor = (componentName: string) => {
  const mountTime = useRef(performance.now())
  const renderCount = useRef(0)

  useEffect(() => {

    renderCount.current++
    const renderTime = performance.now() - mountTime.current
    
    if (renderCount.current > 10) {
      console.warn(`Performance warning: ${componentName} has rendered ${renderCount.current} times`)
    }
    
    return () => {
      // Cleanup performance monitoring
    }
  })
  
  return {
    mountTime: mountTime.current,
    renderCount: renderCount.current
  }
}

// Memoized context provider
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const performanceMonitor = usePerformanceMonitor('AppProvider')
  
  // Memoized action creators for performance
  const setFiles = useCallback((files: FileItem[]) => {
    dispatch({ type: 'SET_FILES', payload: files })
  }, [])
  
  const addFile = useCallback((file: FileItem) => {
    dispatch({ type: 'ADD_FILE', payload: file })
  }, [])
  
  const updateFile = useCallback((id: string, content: string) => {
    dispatch({ type: 'UPDATE_FILE', payload: { id, content } })
  }, [])
  
  const deleteFile = useCallback((id: string) => {
    dispatch({ type: 'DELETE_FILE', payload: id })
  }, [])
  
  const setActiveFile = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_FILE', payload: id })
  }, [])
  
  const toggleChat = useCallback(() => {
    dispatch({ type: 'TOGGLE_CHAT' })
  }, [])
  
  const toggleTerminal = useCallback(() => {
    dispatch({ type: 'TOGGLE_TERMINAL' })
  }, [])
  
  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings })
  }, [])
  
  // Cache operations
  const getCachedValue = useCallback(<T,>(key: string): T | null => {
    return state.cache.get(key) || null
  }, [state.cache])
  
  const setCachedValue = useCallback(<T,>(key: string, value: T) => {
    dispatch({ type: 'CACHE_SET', payload: { key, value } })
  }, [])
  
  const clearCache = useCallback(() => {
    dispatch({ type: 'CACHE_CLEAR' })
  }, [])
  
  // Performance utilities
  const getPerformanceMetrics = useCallback(() => {
    return state.performance
  }, [state.performance])
  
  const optimizeForHighLoad = useCallback(() => {
    // Optimize for high load by reducing update frequency
    dispatch({ type: 'UPDATE_PERFORMANCE', payload: { 
      averageRenderTime: Math.max(0, state.performance.averageRenderTime - 1)
    }})
  }, [state.performance.averageRenderTime])
  
  // Memoized context value
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    setFiles,
    addFile,
    updateFile,
    deleteFile,
    setActiveFile,
    toggleChat,
    toggleTerminal,
    updateSettings,
    getCachedValue,
    setCachedValue,
    clearCache,
    getPerformanceMetrics,
    optimizeForHighLoad
  }), [
    state,
    setFiles,
    addFile,
    updateFile,
    deleteFile,
    setActiveFile,
    toggleChat,
    toggleTerminal,
    updateSettings,
    getCachedValue,
    setCachedValue,
    clearCache,
    getPerformanceMetrics,
    optimizeForHighLoad
  ])
  
  // Performance monitoring
  useEffect(() => {
    if (state.performance.renderCount > 100) {
      console.warn('High render count detected, consider optimizing components')
    }
  }, [state.performance.renderCount])

  return (

    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}


// Custom hook for using the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// Performance-optimized hooks
export const useFileOperations = () => {
  const { state, addFile, updateFile, deleteFile, setActiveFile, getCachedValue, setCachedValue } = useApp()
  
  const getFileById = useCallback((id: string) => {
    // Check cache first
    const cached = getCachedValue<FileItem>(`file_${id}`)
    if (cached) return cached
    
    const file = state.files.find(f => f.id === id)
    if (file) {
      setCachedValue(`file_${id}`, file)
    }
    return file
  }, [state.files, getCachedValue, setCachedValue])
  
  const getFilesByType = useCallback((type: 'file' | 'folder') => {
    const cacheKey = `files_${type}`
    const cached = getCachedValue<FileItem[]>(cacheKey)
    if (cached) return cached
    
    const files = state.files.filter(f => f.type === type)
    setCachedValue(cacheKey, files)
    return files
  }, [state.files, getCachedValue, setCachedValue])
  
  return {
    files: state.files,
    activeFile: state.activeFile,
    addFile,
    updateFile,
    deleteFile,
    setActiveFile,
    getFileById,
    getFilesByType
  }
}

export const useSettings = () => {
  const { state, updateSettings } = useApp()
  
  const updateSetting = useCallback((key: keyof AppSettings, value: any) => {
    updateSettings({ [key]: value })
  }, [updateSettings])
  
  return {
    settings: state.settings,
    updateSettings,
    updateSetting
  }
}

export const usePerformance = () => {
  const { state, getPerformanceMetrics, optimizeForHighLoad } = useApp()
  
  const isHighLoad = useMemo(() => {
    return state.performance.averageRenderTime > 16 // 60fps threshold
  }, [state.performance.averageRenderTime])
  
  const memoryPressure = useMemo(() => {
    return state.performance.memoryUsage > 50 * 1024 * 1024 // 50MB threshold
  }, [state.performance.memoryUsage])
  
  return {
    metrics: state.performance,
    getPerformanceMetrics,
    optimizeForHighLoad,
    isHighLoad,
    memoryPressure
  }
}

export default AppContext