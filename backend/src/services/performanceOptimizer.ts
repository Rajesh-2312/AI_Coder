import { EventEmitter } from 'events'
import * as cluster from 'cluster'
import * as os from 'os'
import { performance } from 'perf_hooks'

interface PerformanceMetrics {
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
}

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

interface ConnectionPool {
  active: number
  idle: number
  total: number
  maxSize: number
}

class PerformanceOptimizer extends EventEmitter {
  private metrics: PerformanceMetrics
  private cache: Map<string, CacheEntry<any>> = new Map()
  private connectionPools: Map<string, ConnectionPool> = new Map()
  private requestTimings: number[] = []
  private maxCacheSize: number = 1000
  private maxRequestTimings: number = 1000
  private gcThreshold: number = 0.8 // Trigger GC when memory usage exceeds 80%
  private lastGcTime: number = 0
  private gcInterval: number = 30000 // 30 seconds

  constructor() {
    super()
    this.metrics = this.initializeMetrics()
    this.startMonitoring()
    this.setupGarbageCollection()
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      cpu: {
        usage: 0,
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        used: 0,
        total: 0,
        free: 0,
        percentage: 0
      },
      network: {
        requestsPerSecond: 0,
        averageResponseTime: 0,
        activeConnections: 0
      },
      cache: {
        hitRate: 0,
        missRate: 0,
        size: 0,
        maxSize: this.maxCacheSize
      },
      processes: {
        active: 0,
        maxConcurrent: 10,
        averageExecutionTime: 0
      }
    }
  }

  private startMonitoring(): void {
    // Update metrics every 5 seconds
    setInterval(() => {
      this.updateMetrics()
      this.emit('metricsUpdate', this.metrics)
    }, 5000)

    // Clean cache every 60 seconds
    setInterval(() => {
      this.cleanExpiredCache()
    }, 60000)

    // Optimize memory every 30 seconds
    setInterval(() => {
      this.optimizeMemory()
    }, 30000)
  }

  private updateMetrics(): void {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    this.metrics.cpu = {
      usage: this.calculateCpuUsage(cpuUsage),
      loadAverage: os.loadavg(),
      cores: os.cpus().length
    }

    this.metrics.memory = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      free: memUsage.heapTotal - memUsage.heapUsed,
      percentage: memUsage.heapUsed / memUsage.heapTotal
    }

    this.metrics.network = {
      requestsPerSecond: this.calculateRequestsPerSecond(),
      averageResponseTime: this.calculateAverageResponseTime(),
      activeConnections: this.calculateActiveConnections()
    }

    this.metrics.cache = {
      hitRate: this.calculateCacheHitRate(),
      missRate: this.calculateCacheMissRate(),
      size: this.cache.size,
      maxSize: this.maxCacheSize
    }

    this.metrics.processes = {
      active: this.calculateActiveProcesses(),
      maxConcurrent: this.metrics.processes.maxConcurrent,
      averageExecutionTime: this.calculateAverageExecutionTime()
    }
  }

  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU usage calculation
    return Math.min(cpuUsage.user + cpuUsage.system, 100)
  }

  private calculateRequestsPerSecond(): number {
    const now = Date.now()
    const oneSecondAgo = now - 1000
    return this.requestTimings.filter(time => time > oneSecondAgo).length
  }

  private calculateAverageResponseTime(): number {
    if (this.requestTimings.length === 0) return 0
    return this.requestTimings.reduce((sum, time) => sum + time, 0) / this.requestTimings.length
  }

  private calculateActiveConnections(): number {
    let total = 0
    this.connectionPools.forEach(pool => {
      total += pool.active
    })
    return total
  }

  private calculateCacheHitRate(): number {
    const totalAccesses = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.accessCount, 0)
    if (totalAccesses === 0) return 0
    return totalAccesses / (totalAccesses + this.metrics.cache.missRate)
  }

  private calculateCacheMissRate(): number {
    // This would be tracked separately in a real implementation
    return 0
  }

  private calculateActiveProcesses(): number {
    // This would be tracked from the sandbox manager
    return 0
  }

  private calculateAverageExecutionTime(): number {
    // This would be tracked from process execution logs
    return 0
  }

  // Cache Management
  setCache<T>(key: string, value: T, ttl: number = 300000): void { // 5 minutes default
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed()
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    })
  }

  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      this.metrics.cache.missRate++
      return null
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.metrics.cache.missRate++
      return null
    }

    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.metrics.cache.hitRate++
    return entry.value
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private cleanExpiredCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Connection Pool Management
  createConnectionPool(name: string, maxSize: number = 10): void {
    this.connectionPools.set(name, {
      active: 0,
      idle: 0,
      total: 0,
      maxSize
    })
  }

  acquireConnection(poolName: string): boolean {
    const pool = this.connectionPools.get(poolName)
    if (!pool) return false

    if (pool.total < pool.maxSize) {
      pool.total++
      pool.active++
      return true
    }

    if (pool.idle > 0) {
      pool.idle--
      pool.active++
      return true
    }

    return false
  }

  releaseConnection(poolName: string): void {
    const pool = this.connectionPools.get(poolName)
    if (!pool) return

    if (pool.active > 0) {
      pool.active--
      pool.idle++
    }
  }

  // Request Timing
  startRequestTiming(): number {
    return performance.now()
  }

  endRequestTiming(startTime: number): number {
    const duration = performance.now() - startTime
    this.requestTimings.push(duration)
    
    if (this.requestTimings.length > this.maxRequestTimings) {
      this.requestTimings = this.requestTimings.slice(-this.maxRequestTimings)
    }

    return duration
  }

  // Memory Management
  private setupGarbageCollection(): void {
    if (global.gc) {
      setInterval(() => {
        if (this.shouldTriggerGC()) {
          this.triggerGarbageCollection()
        }
      }, this.gcInterval)
    }
  }

  private shouldTriggerGC(): boolean {
    const memUsage = process.memoryUsage()
    const memoryPressure = memUsage.heapUsed / memUsage.heapTotal
    const timeSinceLastGc = Date.now() - this.lastGcTime

    return memoryPressure > this.gcThreshold && timeSinceLastGc > this.gcInterval
  }

  private triggerGarbageCollection(): void {
    if (global.gc) {
      const beforeGc = process.memoryUsage()
      global.gc()
      const afterGc = process.memoryUsage()
      
      this.lastGcTime = Date.now()
      
      this.emit('garbageCollection', {
        before: beforeGc,
        after: afterGc,
        freed: beforeGc.heapUsed - afterGc.heapUsed
      })
    }
  }

  private optimizeMemory(): void {
    // Clean up old request timings
    const cutoff = Date.now() - 300000 // 5 minutes
    this.requestTimings = this.requestTimings.filter(time => time > cutoff)

    // Clean up expired cache entries
    this.cleanExpiredCache()

    // Emit memory optimization event
    this.emit('memoryOptimization', {
      cacheSize: this.cache.size,
      requestTimingsCount: this.requestTimings.length,
      memoryUsage: process.memoryUsage()
    })
  }

  // Performance Optimization Methods
  optimizeForHighLoad(): void {
    // Increase cache size
    this.maxCacheSize = Math.min(this.maxCacheSize * 2, 5000)
    
    // Increase connection pool sizes
    this.connectionPools.forEach(pool => {
      pool.maxSize = Math.min(pool.maxSize * 2, 50)
    })

    // Adjust GC threshold
    this.gcThreshold = 0.9

    this.emit('highLoadOptimization', {
      newCacheSize: this.maxCacheSize,
      newGcThreshold: this.gcThreshold
    })
  }

  optimizeForLowLatency(): void {
    // Reduce cache TTL for faster updates
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      entry.ttl = Math.min(entry.ttl, 60000) // Max 1 minute
    }

    // Increase GC frequency
    this.gcInterval = 15000 // 15 seconds

    this.emit('lowLatencyOptimization', {
      reducedGcInterval: this.gcInterval
    })
  }

  // Monitoring and Metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getDetailedMetrics(): {
    metrics: PerformanceMetrics
    cacheEntries: number
    connectionPools: Map<string, ConnectionPool>
    uptime: number
  } {
    return {
      metrics: this.getMetrics(),
      cacheEntries: this.cache.size,
      connectionPools: new Map(this.connectionPools),
      uptime: process.uptime()
    }
  }

  // Health Check
  isHealthy(): boolean {
    const memUsage = process.memoryUsage()
    const memoryPressure = memUsage.heapUsed / memUsage.heapTotal
    
    return (
      memoryPressure < 0.95 &&
      this.metrics.cpu.usage < 90 &&
      this.metrics.processes.active < this.metrics.processes.maxConcurrent
    )
  }

  // Configuration
  updateConfig(config: {
    maxCacheSize?: number
    gcThreshold?: number
    gcInterval?: number
    maxRequestTimings?: number
  }): void {
    if (config.maxCacheSize !== undefined) {
      this.maxCacheSize = config.maxCacheSize
    }
    if (config.gcThreshold !== undefined) {
      this.gcThreshold = config.gcThreshold
    }
    if (config.gcInterval !== undefined) {
      this.gcInterval = config.gcInterval
    }
    if (config.maxRequestTimings !== undefined) {
      this.maxRequestTimings = config.maxRequestTimings
    }
  }
}

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer()

export { PerformanceOptimizer, performanceOptimizer }
export default performanceOptimizer
