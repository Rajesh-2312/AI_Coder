import { EventEmitter } from 'events'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createHash } from 'crypto'

interface CacheConfig {
  type: 'memory' | 'redis' | 'file' | 'hybrid'
  redis?: {
    host: string
    port: number
    password?: string
    db?: number
  }
  file?: {
    directory: string
    maxSize: number
  }
  memory?: {
    maxSize: number
    ttl: number
  }
  compression?: boolean
  encryption?: boolean
}

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
  compressed?: boolean
  encrypted?: boolean
  metadata?: Record<string, any>
}

interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  size: number
  hitRate: number
  averageAccessTime: number
}

class AdvancedCacheManager extends EventEmitter {
  private config: CacheConfig
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  private stats: CacheStats
  private accessTimes: number[] = []
  private redisClient: any = null
  private compressionEnabled: boolean = false
  private encryptionEnabled: boolean = false

  constructor(config: CacheConfig) {
    super()
    this.config = config
    this.stats = this.initializeStats()
    this.compressionEnabled = config.compression || false
    this.encryptionEnabled = config.encryption || false
    
    this.initializeCache()
  }

  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0,
      averageAccessTime: 0
    }
  }

  private async initializeCache(): Promise<void> {
    try {
      switch (this.config.type) {
        case 'redis':
          await this.initializeRedis()
          break
        case 'file':
          await this.initializeFileCache()
          break
        case 'hybrid':
          await this.initializeHybridCache()
          break
        case 'memory':
        default:
          this.initializeMemoryCache()
          break
      }
      
      this.emit('initialized', { type: this.config.type })
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      // For now, fall back to memory cache since Redis is not available
      console.warn('Redis not available, using memory cache only')
      this.config.type = 'memory'
      this.initializeMemoryCache()
    } catch (error) {
      console.warn('Redis initialization failed, falling back to memory cache:', error)
      this.config.type = 'memory'
      this.initializeMemoryCache()
    }
  }

  private async initializeFileCache(): Promise<void> {
    const cacheDir = this.config.file?.directory || path.join(process.cwd(), 'cache')
    
    try {
      await fs.mkdir(cacheDir, { recursive: true })
      this.emit('fileCacheInitialized', { directory: cacheDir })
    } catch (error) {
      throw new Error(`Failed to initialize file cache: ${error}`)
    }
  }

  private async initializeHybridCache(): Promise<void> {
    // Initialize both memory and Redis/file cache
    this.initializeMemoryCache()
    
    if (this.config.redis) {
      await this.initializeRedis()
    } else if (this.config.file) {
      await this.initializeFileCache()
    }
  }

  private initializeMemoryCache(): void {
    this.memoryCache = new Map()
    this.emit('memoryCacheInitialized')
  }

  // Core Cache Operations
  async set<T>(key: string, value: T, ttl: number = 300000, metadata?: Record<string, any>): Promise<void> {
    const startTime = performance.now()
    
    try {
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl,
        metadata
      }

      // Apply compression if enabled
      if (this.compressionEnabled && this.shouldCompress(value)) {
        entry.value = await this.compress(value) as T
        entry.compressed = true
      }

      // Apply encryption if enabled
      if (this.encryptionEnabled) {
        entry.value = await this.encrypt(entry.value) as T
        entry.encrypted = true
      }

      switch (this.config.type) {
        case 'redis':
          await this.setRedis(key, entry)
          break
        case 'file':
          await this.setFile(key, entry)
          break
        case 'hybrid':
          await this.setHybrid(key, entry)
          break
        case 'memory':
        default:
          this.setMemory(key, entry)
          break
      }

      this.stats.sets++
      this.stats.size = await this.getCacheSize()
      
      const accessTime = performance.now() - startTime
      this.recordAccessTime(accessTime)
      
      this.emit('set', { key, ttl, accessTime })
    } catch (error) {
      this.emit('error', { operation: 'set', key, error })
      throw error
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now()
    
    try {
      let entry: CacheEntry<T> | null = null

      switch (this.config.type) {
        case 'redis':
          entry = await this.getRedis<T>(key)
          break
        case 'file':
          entry = await this.getFile<T>(key)
          break
        case 'hybrid':
          entry = await this.getHybrid<T>(key)
          break
        case 'memory':
        default:
          entry = this.getMemory<T>(key)
          break
      }

      if (!entry) {
        this.stats.misses++
        const accessTime = performance.now() - startTime
        this.recordAccessTime(accessTime)
        return null
      }

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        await this.delete(key)
        this.stats.misses++
        const accessTime = performance.now() - startTime
        this.recordAccessTime(accessTime)
        return null
      }

      let value = entry.value

      // Decrypt if needed
      if (entry.encrypted) {
        value = await this.decrypt(value) as T
      }

      // Decompress if needed
      if (entry.compressed) {
        value = await this.decompress(value) as T
      }

      this.stats.hits++
      this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses)
      
      const accessTime = performance.now() - startTime
      this.recordAccessTime(accessTime)
      
      this.emit('get', { key, hit: true, accessTime })
      return value
    } catch (error) {
      this.emit('error', { operation: 'get', key, error })
      throw error
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false

      switch (this.config.type) {
        case 'redis':
          deleted = await this.deleteRedis(key)
          break
        case 'file':
          deleted = await this.deleteFile(key)
          break
        case 'hybrid':
          deleted = await this.deleteHybrid(key)
          break
        case 'memory':
        default:
          deleted = this.deleteMemory(key)
          break
      }

      if (deleted) {
        this.stats.deletes++
        this.stats.size = await this.getCacheSize()
        this.emit('delete', { key })
      }

      return deleted
    } catch (error) {
      this.emit('error', { operation: 'delete', key, error })
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      switch (this.config.type) {
        case 'redis':
          await this.clearRedis()
          break
        case 'file':
          await this.clearFile()
          break
        case 'hybrid':
          await this.clearHybrid()
          break
        case 'memory':
        default:
          this.clearMemory()
          break
      }

      this.stats = this.initializeStats()
      this.emit('clear')
    } catch (error) {
      this.emit('error', { operation: 'clear', error })
      throw error
    }
  }

  // Memory Cache Operations
  private setMemory<T>(key: string, entry: CacheEntry<T>): void {
    this.memoryCache.set(key, entry)
  }

  private getMemory<T>(key: string): CacheEntry<T> | null {
    return this.memoryCache.get(key) || null
  }

  private deleteMemory(key: string): boolean {
    return this.memoryCache.delete(key)
  }

  private clearMemory(): void {
    this.memoryCache.clear()
  }

  // Redis Cache Operations
  private async setRedis<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.redisClient) throw new Error('Redis client not initialized')
    
    const serialized = JSON.stringify(entry)
    await this.redisClient.setEx(key, Math.ceil(entry.ttl / 1000), serialized)
  }

  private async getRedis<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.redisClient) throw new Error('Redis client not initialized')
    
    const serialized = await this.redisClient.get(key)
    if (!serialized) return null
    
    return JSON.parse(serialized)
  }

  private async deleteRedis(key: string): Promise<boolean> {
    if (!this.redisClient) throw new Error('Redis client not initialized')
    
    const result = await this.redisClient.del(key)
    return result > 0
  }

  private async clearRedis(): Promise<void> {
    if (!this.redisClient) throw new Error('Redis client not initialized')
    
    await this.redisClient.flushDb()
  }

  // File Cache Operations
  private async setFile<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const cacheDir = this.config.file?.directory || path.join(process.cwd(), 'cache')
    const filePath = path.join(cacheDir, this.hashKey(key))
    
    const serialized = JSON.stringify(entry)
    await fs.writeFile(filePath, serialized)
  }

  private async getFile<T>(key: string): Promise<CacheEntry<T> | null> {
    const cacheDir = this.config.file?.directory || path.join(process.cwd(), 'cache')
    const filePath = path.join(cacheDir, this.hashKey(key))
    
    try {
      const serialized = await fs.readFile(filePath, 'utf8')
      return JSON.parse(serialized)
    } catch (error) {
      return null
    }
  }

  private async deleteFile(key: string): Promise<boolean> {
    const cacheDir = this.config.file?.directory || path.join(process.cwd(), 'cache')
    const filePath = path.join(cacheDir, this.hashKey(key))
    
    try {
      await fs.unlink(filePath)
      return true
    } catch (error) {
      return false
    }
  }

  private async clearFile(): Promise<void> {
    const cacheDir = this.config.file?.directory || path.join(process.cwd(), 'cache')
    
    try {
      const files = await fs.readdir(cacheDir)
      await Promise.all(files.map(file => fs.unlink(path.join(cacheDir, file))))
    } catch (error) {
      // Directory might not exist or be empty
    }
  }

  // Hybrid Cache Operations
  private async setHybrid<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Always set in memory first for speed
    this.setMemory(key, entry)
    
    // Then set in persistent storage
    if (this.redisClient) {
      await this.setRedis(key, entry)
    } else if (this.config.file) {
      await this.setFile(key, entry)
    }
  }

  private async getHybrid<T>(key: string): Promise<CacheEntry<T> | null> {
    // Try memory first
    let entry = this.getMemory<T>(key)
    if (entry) return entry
    
    // Try persistent storage
    if (this.redisClient) {
      entry = await this.getRedis<T>(key)
    } else if (this.config.file) {
      entry = await this.getFile<T>(key)
    }
    
    // If found in persistent storage, cache in memory
    if (entry) {
      this.setMemory(key, entry)
    }
    
    return entry
  }

  private async deleteHybrid(key: string): Promise<boolean> {
    let deleted = false
    
    // Delete from memory
    if (this.deleteMemory(key)) deleted = true
    
    // Delete from persistent storage
    if (this.redisClient) {
      if (await this.deleteRedis(key)) deleted = true
    } else if (this.config.file) {
      if (await this.deleteFile(key)) deleted = true
    }
    
    return deleted
  }

  private async clearHybrid(): Promise<void> {
    this.clearMemory()
    
    if (this.redisClient) {
      await this.clearRedis()
    } else if (this.config.file) {
      await this.clearFile()
    }
  }

  // Utility Methods
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex')
  }

  private shouldCompress(value: any): boolean {
    const serialized = JSON.stringify(value)
    return serialized.length > 1024 // Compress if larger than 1KB
  }

  private async compress(value: any): Promise<any> {
    // Simple compression using gzip
    const { gzip } = await import('zlib')
    const { promisify } = await import('util')
    const gzipAsync = promisify(gzip)
    
    const serialized = JSON.stringify(value)
    const compressed = await gzipAsync(Buffer.from(serialized))
    return compressed.toString('base64')
  }

  private async decompress(value: any): Promise<any> {
    // Simple decompression using gunzip
    const { gunzip } = await import('zlib')
    const { promisify } = await import('util')
    const gunzipAsync = promisify(gunzip)
    
    const compressed = Buffer.from(value, 'base64')
    const decompressed = await gunzipAsync(compressed)
    return JSON.parse(decompressed.toString())
  }

  private async encrypt(value: any): Promise<any> {
    // Simple encryption using AES
    const crypto = await import('crypto')
    const algorithm = 'aes-256-gcm'
    const key = crypto.randomBytes(32)
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipher(algorithm, key)
    cipher.setAAD(Buffer.from('ai-coder-cache'))
    
    let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return {
      encrypted,
      key: key.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    }
  }

  private async decrypt(value: any): Promise<any> {
    // Simple decryption using AES
    const crypto = await import('crypto')
    const algorithm = 'aes-256-gcm'
    
    const decipher = crypto.createDecipher(algorithm, Buffer.from(value.key, 'hex'))
    decipher.setAAD(Buffer.from('ai-coder-cache'))
    decipher.setAuthTag(Buffer.from(value.authTag, 'hex'))
    
    let decrypted = decipher.update(value.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  }

  private recordAccessTime(time: number): void {
    this.accessTimes.push(time)
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-1000)
    }
    
    this.stats.averageAccessTime = this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length
  }

  private async getCacheSize(): Promise<number> {
    switch (this.config.type) {
      case 'redis':
        return this.redisClient ? await this.redisClient.dbSize() : 0
      case 'file':
        try {
          const cacheDir = this.config.file?.directory || path.join(process.cwd(), 'cache')
          const files = await fs.readdir(cacheDir)
          return files.length
        } catch {
          return 0
        }
      case 'hybrid':
        return this.memoryCache.size
      case 'memory':
      default:
        return this.memoryCache.size
    }
  }

  // Public API
  getStats(): CacheStats {
    return { ...this.stats }
  }

  getConfig(): CacheConfig {
    return { ...this.config }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testKey = 'health-check'
      const testValue = { timestamp: Date.now() }
      
      await this.set(testKey, testValue, 1000)
      const retrieved = await this.get(testKey)
      await this.delete(testKey)
      
      return retrieved !== null && retrieved.timestamp === testValue.timestamp
    } catch (error) {
      return false
    }
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit()
    }
    this.emit('closed')
  }
}

export { AdvancedCacheManager, CacheConfig, CacheEntry, CacheStats }
export default AdvancedCacheManager
