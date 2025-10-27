import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { 
  Activity, 
  Cpu, 
  MemoryStick, 
  Network, 
  Database, 
  Zap, 
  Clock, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'

interface PerformanceMetrics {
  timestamp: number
  cpu: {
    usage: number
    loadAverage: number[]
    cores: number
  }
  memory: {
    used: number
    total: number
    free: number
    percentage: number
  }
  network: {
    requestsPerSecond: number
    averageResponseTime: number
    activeConnections: number
    bytesPerSecond: number
  }
  cache: {
    hitRate: number
    missRate: number
    size: number
    maxSize: number
  }
  processes: {
    active: number
    maxConcurrent: number
    averageExecutionTime: number
  }
  websocket: {
    totalConnections: number
    activeConnections: number
    messagesPerSecond: number
    averageLatency: number
  }
  aiStreaming: {
    activeStreams: number
    totalSessions: number
    averageLatency: number
    cacheSize: number
  }
}

interface PerformanceDashboardProps {
  className?: string
  refreshInterval?: number
  maxDataPoints?: number
}

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  status?: 'healthy' | 'warning' | 'critical'
  icon: React.ReactNode
  description?: string
}

const MetricCard = memo<MetricCardProps>(({ 
  title, 
  value, 
  unit, 
  trend, 
  status = 'healthy', 
  icon, 
  description 
}) => {
  const statusColors = {
    healthy: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    warning: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
    critical: 'text-red-600 bg-red-100 dark:bg-red-900/20'
  }

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-green-600" />,
    down: <TrendingDown className="w-4 h-4 text-red-600" />,
    stable: <div className="w-4 h-4" />
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${statusColors[status]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {value}
              {unit && <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">{unit}</span>}
            </p>
          </div>
        </div>
        {trend && trendIcons[trend]}
      </div>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{description}</p>
      )}
    </div>
  )
})

MetricCard.displayName = 'MetricCard'

interface ChartProps {
  data: number[]
  label: string
  color?: string
  height?: number
}

const SimpleChart = memo<ChartProps>(({ data, label, color = '#3B82F6', height = 100 }) => {
  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - minValue) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="w-full">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      <div className="relative" style={{ height }}>
        <svg width="100%" height="100%" className="overflow-visible">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            className="drop-shadow-sm"
          />
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            fill={`url(#gradient-${label})`}
            points={`0,100 ${points} 100,100`}
          />
        </svg>
      </div>
    </div>
  )
})

SimpleChart.displayName = 'SimpleChart'

export const PerformanceDashboard = memo<PerformanceDashboardProps>(({
  className = '',
  refreshInterval = 5000,
  maxDataPoints = 60
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [historicalData, setHistoricalData] = useState<PerformanceMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/performance')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      const newMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        ...data.performance,
        websocket: data.websocket,
        aiStreaming: data.aiStreaming
      }
      
      setMetrics(newMetrics)
      setHistoricalData(prev => {
        const updated = [...prev, newMetrics]
        return updated.slice(-maxDataPoints)
      })
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      console.error('Error fetching performance metrics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [maxDataPoints])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchMetrics, refreshInterval])

  const handleRefresh = useCallback(() => {
    setIsLoading(true)
    fetchMetrics()
  }, [fetchMetrics])

  // Calculate trends
  const trends = useMemo((): { cpu?: 'up' | 'down' | 'stable'; memory?: 'up' | 'down' | 'stable'; network?: 'up' | 'down' | 'stable'; cache?: 'up' | 'down' | 'stable' } => {
    if (historicalData.length < 2) return {}

    const current = historicalData[historicalData.length - 1]
    const previous = historicalData[historicalData.length - 2]

    return {
      cpu: (current.cpu.usage > previous.cpu.usage ? 'up' : 
           current.cpu.usage < previous.cpu.usage ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      memory: (current.memory.percentage > previous.memory.percentage ? 'up' : 
              current.memory.percentage < previous.memory.percentage ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      network: (current.network.requestsPerSecond > previous.network.requestsPerSecond ? 'up' : 
               current.network.requestsPerSecond < previous.network.requestsPerSecond ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      cache: (current.cache.hitRate > previous.cache.hitRate ? 'up' : 
             current.cache.hitRate < previous.cache.hitRate ? 'down' : 'stable') as 'up' | 'down' | 'stable'
    }
  }, [historicalData])

  // Determine status
  const getStatus = useCallback((value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'critical'
    if (value >= thresholds.warning) return 'warning'
    return 'healthy'
  }, [])

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading metrics</h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading performance metrics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Performance Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* System Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">System Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="CPU Usage"
            value={metrics.cpu.usage.toFixed(1)}
            unit="%"
            trend={trends.cpu}
            status={getStatus(metrics.cpu.usage, { warning: 70, critical: 90 })}
            icon={<Cpu className="w-5 h-5" />}
            description={`${metrics.cpu.cores} cores, Load: ${metrics.cpu.loadAverage[0].toFixed(2)}`}
          />
          <MetricCard
            title="Memory Usage"
            value={metrics.memory.percentage.toFixed(1)}
            unit="%"
            trend={trends.memory}
            status={getStatus(metrics.memory.percentage * 100, { warning: 70, critical: 90 })}
            icon={<MemoryStick className="w-5 h-5" />}
            description={`${(metrics.memory.used / 1024 / 1024).toFixed(0)}MB / ${(metrics.memory.total / 1024 / 1024).toFixed(0)}MB`}
          />
          <MetricCard
            title="Network Requests"
            value={metrics.network.requestsPerSecond.toFixed(1)}
            unit="req/s"
            trend={trends.network}
            status={getStatus(metrics.network.requestsPerSecond, { warning: 100, critical: 200 })}
            icon={<Network className="w-5 h-5" />}
            description={`${metrics.network.activeConnections} active connections`}
          />
          <MetricCard
            title="Cache Hit Rate"
            value={metrics.cache.hitRate.toFixed(1)}
            unit="%"
            trend={trends.cache}
            status={getStatus(100 - metrics.cache.hitRate, { warning: 20, critical: 40 })}
            icon={<Database className="w-5 h-5" />}
            description={`${metrics.cache.size} / ${metrics.cache.maxSize} entries`}
          />
        </div>
      </div>

      {/* Application Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Application Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Active Processes"
            value={metrics.processes.active}
            unit={`/ ${metrics.processes.maxConcurrent}`}
            status={getStatus(metrics.processes.active, { warning: 8, critical: 10 })}
            icon={<Activity className="w-5 h-5" />}
            description={`Avg execution: ${metrics.processes.averageExecutionTime.toFixed(0)}ms`}
          />
          <MetricCard
            title="WebSocket Connections"
            value={metrics.websocket.activeConnections}
            unit={`/ ${metrics.websocket.totalConnections}`}
            status={getStatus(metrics.websocket.activeConnections, { warning: 800, critical: 1000 })}
            icon={<Zap className="w-5 h-5" />}
            description={`${metrics.websocket.messagesPerSecond.toFixed(1)} msg/s, ${metrics.websocket.averageLatency.toFixed(0)}ms latency`}
          />
          <MetricCard
            title="AI Streaming"
            value={metrics.aiStreaming.activeStreams}
            unit={`/ ${metrics.aiStreaming.totalSessions}`}
            status={getStatus(metrics.aiStreaming.activeStreams, { warning: 8, critical: 10 })}
            icon={<Clock className="w-5 h-5" />}
            description={`${metrics.aiStreaming.averageLatency.toFixed(0)}ms latency, ${metrics.aiStreaming.cacheSize} cached`}
          />
        </div>
      </div>

      {/* Charts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Performance Trends</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <SimpleChart
              data={historicalData.map(m => m.cpu.usage)}
              label="CPU Usage (%)"
              color="#EF4444"
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <SimpleChart
              data={historicalData.map(m => m.memory.percentage * 100)}
              label="Memory Usage (%)"
              color="#F59E0B"
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <SimpleChart
              data={historicalData.map(m => m.network.requestsPerSecond)}
              label="Requests per Second"
              color="#3B82F6"
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <SimpleChart
              data={historicalData.map(m => m.cache.hitRate)}
              label="Cache Hit Rate (%)"
              color="#10B981"
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">System Status</h3>
        <div className="space-y-3">
          {metrics.cpu.usage > 90 && (
            <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">High CPU Usage</p>
                <p className="text-sm text-red-700 dark:text-red-300">CPU usage is at {metrics.cpu.usage.toFixed(1)}%</p>
              </div>
            </div>
          )}
          {metrics.memory.percentage > 0.9 && (
            <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">High Memory Usage</p>
                <p className="text-sm text-red-700 dark:text-red-300">Memory usage is at {(metrics.memory.percentage * 100).toFixed(1)}%</p>
              </div>
            </div>
          )}
          {metrics.cache.hitRate < 0.7 && (
            <div className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Low Cache Hit Rate</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Cache hit rate is at {(metrics.cache.hitRate * 100).toFixed(1)}%</p>
              </div>
            </div>
          )}
          {metrics.cpu.usage <= 70 && metrics.memory.percentage <= 0.7 && metrics.cache.hitRate >= 0.8 && (
            <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">System Healthy</p>
                <p className="text-sm text-green-700 dark:text-green-300">All systems operating within normal parameters</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

PerformanceDashboard.displayName = 'PerformanceDashboard'

export default PerformanceDashboard
