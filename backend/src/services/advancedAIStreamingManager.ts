import { EventEmitter } from 'events'
import { Readable, Transform } from 'stream'
import { performance } from 'perf_hooks'
import { createHash } from 'crypto'

interface StreamingConfig {
  chunkSize: number
  maxConcurrentStreams: number
  enableParallelProcessing: boolean
  enableResponseCaching: boolean
  enableCompression: boolean
  enableRateLimiting: boolean
  maxTokensPerSecond: number
  bufferSize: number
  timeout: number
}

interface StreamChunk {
  id: string
  content: string
  index: number
  total: number
  timestamp: number
  metadata?: Record<string, any>
}

interface StreamSession {
  id: string
  startTime: number
  endTime?: number
  totalChunks: number
  completedChunks: number
  totalTokens: number
  averageLatency: number
  status: 'active' | 'completed' | 'error' | 'cancelled'
  metadata: Record<string, any>
}

interface ParallelTask {
  id: string
  prompt: string
  priority: number
  timestamp: number
  callback: (result: any) => void
  errorCallback: (error: Error) => void
}

class AdvancedAIStreamingManager extends EventEmitter {
  private config: StreamingConfig
  private activeStreams: Map<string, StreamSession> = new Map()
  private parallelTasks: Map<string, ParallelTask> = new Map()
  private responseCache: Map<string, any> = new Map()
  private rateLimiter: Map<string, number[]> = new Map()
  private compressionEnabled: boolean = false
  private parallelProcessingEnabled: boolean = false

  constructor(config: Partial<StreamingConfig> = {}) {
    super()
    this.config = {
      chunkSize: 50,
      maxConcurrentStreams: 10,
      enableParallelProcessing: true,
      enableResponseCaching: true,
      enableCompression: true,
      enableRateLimiting: true,
      maxTokensPerSecond: 100,
      bufferSize: 1024,
      timeout: 30000,
      ...config
    }

    this.compressionEnabled = this.config.enableCompression
    this.parallelProcessingEnabled = this.config.enableParallelProcessing

    this.startCleanup()
    this.startRateLimitCleanup()
  }

  // Main streaming method
  async streamResponse(
    prompt: string,
    systemPrompt?: string,
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
      streamId?: string
      priority?: number
      metadata?: Record<string, any>
    } = {}
  ): Promise<Readable> {
    const streamId = options.streamId || this.generateStreamId()
    const startTime = performance.now()

    // Check rate limiting
    if (this.config.enableRateLimiting && !this.checkRateLimit(streamId)) {
      throw new Error('Rate limit exceeded')
    }

    // Check concurrent stream limit
    if (this.activeStreams.size >= this.config.maxConcurrentStreams) {
      throw new Error('Maximum concurrent streams reached')
    }

    // Check cache first
    if (this.config.enableResponseCaching) {
      const cachedResponse = this.getCachedResponse(prompt, systemPrompt)
      if (cachedResponse) {
        return this.createCachedStream(cachedResponse, streamId)
      }
    }

    // Create stream session
    const session: StreamSession = {
      id: streamId,
      startTime,
      totalChunks: 0,
      completedChunks: 0,
      totalTokens: 0,
      averageLatency: 0,
      status: 'active',
      metadata: options.metadata || {}
    }

    this.activeStreams.set(streamId, session)

    // Create readable stream
    const stream = new Readable({
      objectMode: true,
      read() {
        // Stream will be controlled by the AI generation process
      }
    })

    // Start AI generation in parallel if enabled
    if (this.parallelProcessingEnabled) {
      this.processParallelGeneration(streamId, prompt, systemPrompt, options, stream)
    } else {
      this.processSequentialGeneration(streamId, prompt, systemPrompt, options, stream)
    }

    return stream
  }

  private async processParallelGeneration(
    streamId: string,
    prompt: string,
    systemPrompt: string | undefined,
    options: any,
    stream: Readable
  ): Promise<void> {
    try {
      // Split prompt into chunks for parallel processing
      const promptChunks = this.splitPromptIntoChunks(prompt, this.config.chunkSize)
      const session = this.activeStreams.get(streamId)
      
      if (!session) return

      session.totalChunks = promptChunks.length

      // Process chunks in parallel
      const chunkPromises = promptChunks.map((chunk, index) => 
        this.processChunkParallel(streamId, chunk, systemPrompt, options, index)
      )

      // Use Promise.allSettled to handle partial failures
      const results = await Promise.allSettled(chunkPromises)
      
      // Combine results and stream them
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .sort((a, b) => a.index - b.index)

      for (const result of successfulResults) {
        this.emitChunk(streamId, result, stream)
      }

      // Complete the stream
      this.completeStream(streamId, stream)

    } catch (error) {
      this.handleStreamError(streamId, error, stream)
    }
  }

  private async processSequentialGeneration(
    streamId: string,
    prompt: string,
    systemPrompt: string | undefined,
    options: any,
    stream: Readable
  ): Promise<void> {
    try {
      // Simulate AI generation with chunked responses
      const response = await this.generateAIResponse(prompt, systemPrompt, options)
      const chunks = this.splitResponseIntoChunks(response, this.config.chunkSize)
      
      const session = this.activeStreams.get(streamId)
      if (!session) return

      session.totalChunks = chunks.length

      // Stream chunks with controlled timing
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const chunkData: StreamChunk = {
          id: this.generateChunkId(),
          content: chunk,
          index: i,
          total: chunks.length,
          timestamp: performance.now(),
          metadata: {
            streamId,
            model: options.model || 'default',
            temperature: options.temperature || 0.7
          }
        }

        this.emitChunk(streamId, chunkData, stream)
        
        // Add small delay to simulate real streaming
        await this.delay(50)
      }

      this.completeStream(streamId, stream)

    } catch (error) {
      this.handleStreamError(streamId, error, stream)
    }
  }

  private async processChunkParallel(
    streamId: string,
    chunk: string,
    systemPrompt: string | undefined,
    options: any,
    index: number
  ): Promise<StreamChunk> {
    const startTime = performance.now()
    
    try {
      // Generate response for this chunk
      const response = await this.generateAIResponse(chunk, systemPrompt, options)
      
      const chunkData: StreamChunk = {
        id: this.generateChunkId(),
        content: response,
        index,
        total: 0, // Will be set by the caller
        timestamp: performance.now(),
        metadata: {
          streamId,
          model: options.model || 'default',
          temperature: options.temperature || 0.7,
          processingTime: performance.now() - startTime
        }
      }

      return chunkData
    } catch (error) {
      throw new Error(`Chunk ${index} processing failed: ${error}`)
    }
  }

  private emitChunk(streamId: string, chunk: StreamChunk, stream: Readable): void {
    const session = this.activeStreams.get(streamId)
    if (!session) return

    // Update session
    session.completedChunks++
    session.totalTokens += chunk.content.length
    session.averageLatency = (session.averageLatency + (performance.now() - chunk.timestamp)) / 2

    // Emit chunk to stream
    stream.push(chunk)

    // Emit event for monitoring
    this.emit('chunk', { streamId, chunk, session })

    // Check if this completes the stream
    if (session.completedChunks >= session.totalChunks) {
      this.completeStream(streamId, stream)
    }
  }

  private completeStream(streamId: string, stream: Readable): void {
    const session = this.activeStreams.get(streamId)
    if (!session) return

    session.status = 'completed'
    session.endTime = performance.now()

    // Push end marker
    stream.push(null)

    // Cache response if enabled
    if (this.config.enableResponseCaching) {
      this.cacheResponse(session)
    }

    // Clean up
    this.activeStreams.delete(streamId)

    this.emit('streamComplete', { streamId, session })
  }

  private handleStreamError(streamId: string, error: Error, stream: Readable): void {
    const session = this.activeStreams.get(streamId)
    if (session) {
      session.status = 'error'
      session.endTime = performance.now()
    }

    // Push error to stream
    stream.emit('error', error)
    stream.push(null)

    // Clean up
    this.activeStreams.delete(streamId)

    this.emit('streamError', { streamId, error, session })
  }

  private createCachedStream(cachedResponse: any, streamId: string): Readable {
    const stream = new Readable({
      objectMode: true,
      read() {}
    })

    // Stream cached response
    const chunks = this.splitResponseIntoChunks(cachedResponse, this.config.chunkSize)
    
    chunks.forEach((chunk, index) => {
      const chunkData: StreamChunk = {
        id: this.generateChunkId(),
        content: chunk,
        index,
        total: chunks.length,
        timestamp: performance.now(),
        metadata: {
          streamId,
          cached: true
        }
      }
      stream.push(chunkData)
    })

    stream.push(null)
    return stream
  }

  // Parallel processing methods
  addParallelTask(
    prompt: string,
    callback: (result: any) => void,
    errorCallback: (error: Error) => void,
    priority: number = 0
  ): string {
    const taskId = this.generateTaskId()
    const task: ParallelTask = {
      id: taskId,
      prompt,
      priority,
      timestamp: Date.now(),
      callback,
      errorCallback
    }

    this.parallelTasks.set(taskId, task)
    this.processParallelTask(task)

    return taskId
  }

  private async processParallelTask(task: ParallelTask): Promise<void> {
    try {
      const result = await this.generateAIResponse(task.prompt)
      task.callback(result)
      this.parallelTasks.delete(task.id)
    } catch (error) {
      task.errorCallback(error as Error)
      this.parallelTasks.delete(task.id)
    }
  }

  // Utility methods
  private splitPromptIntoChunks(prompt: string, chunkSize: number): string[] {
    const words = prompt.split(' ')
    const chunks: string[] = []
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '))
    }
    
    return chunks
  }

  private splitResponseIntoChunks(response: string, chunkSize: number): string[] {
    const words = response.split(' ')
    const chunks: string[] = []
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '))
    }
    
    return chunks
  }

  private async generateAIResponse(
    prompt: string,
    systemPrompt?: string,
    options: any = {}
  ): Promise<string> {
    // This would integrate with the actual AI service
    // For now, return a simulated response
    return `AI Response for: ${prompt.substring(0, 50)}...`
  }

  private checkRateLimit(streamId: string): boolean {
    if (!this.config.enableRateLimiting) return true

    const now = Date.now()
    const window = 60000 // 1 minute
    const limit = this.config.maxTokensPerSecond * 60 // tokens per minute

    const timestamps = this.rateLimiter.get(streamId) || []
    const recentTimestamps = timestamps.filter(ts => now - ts < window)
    
    if (recentTimestamps.length >= limit) {
      return false
    }

    recentTimestamps.push(now)
    this.rateLimiter.set(streamId, recentTimestamps)
    return true
  }

  private getCachedResponse(prompt: string, systemPrompt?: string): any {
    const key = this.generateCacheKey(prompt, systemPrompt)
    return this.responseCache.get(key)
  }

  private cacheResponse(session: StreamSession): void {
    const key = this.generateCacheKey(session.metadata.prompt, session.metadata.systemPrompt)
    this.responseCache.set(key, session)
  }

  private generateCacheKey(prompt: string, systemPrompt?: string): string {
    const content = `${prompt}${systemPrompt || ''}`
    return createHash('md5').update(content).digest('hex')
  }

  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private startCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredStreams()
      this.cleanupExpiredCache()
    }, 60000) // Cleanup every minute
  }

  private startRateLimitCleanup(): void {
    setInterval(() => {
      this.cleanupRateLimit()
    }, 300000) // Cleanup every 5 minutes
  }

  private cleanupExpiredStreams(): void {
    const now = Date.now()
    const timeout = this.config.timeout

    for (const [streamId, session] of this.activeStreams.entries()) {
      if (now - session.startTime > timeout) {
        this.activeStreams.delete(streamId)
        this.emit('streamTimeout', { streamId, session })
      }
    }
  }

  private cleanupExpiredCache(): void {
    // Simple cache cleanup - in production, you'd want more sophisticated logic
    if (this.responseCache.size > 1000) {
      const entries = Array.from(this.responseCache.entries())
      const toDelete = entries.slice(0, 100) // Remove oldest 100 entries
      toDelete.forEach(([key]) => this.responseCache.delete(key))
    }
  }

  private cleanupRateLimit(): void {
    const now = Date.now()
    const window = 60000 // 1 minute

    for (const [streamId, timestamps] of this.rateLimiter.entries()) {
      const recentTimestamps = timestamps.filter(ts => now - ts < window)
      if (recentTimestamps.length === 0) {
        this.rateLimiter.delete(streamId)
      } else {
        this.rateLimiter.set(streamId, recentTimestamps)
      }
    }
  }

  // Public API methods
  getActiveStreams(): StreamSession[] {
    return Array.from(this.activeStreams.values())
  }

  getStreamStats(): {
    activeStreams: number
    totalSessions: number
    averageLatency: number
    cacheSize: number
    parallelTasks: number
  } {
    const sessions = Array.from(this.activeStreams.values())
    const averageLatency = sessions.reduce((sum, s) => sum + s.averageLatency, 0) / sessions.length

    return {
      activeStreams: this.activeStreams.size,
      totalSessions: sessions.length,
      averageLatency: averageLatency || 0,
      cacheSize: this.responseCache.size,
      parallelTasks: this.parallelTasks.size
    }
  }

  cancelStream(streamId: string): boolean {
    const session = this.activeStreams.get(streamId)
    if (!session) return false

    session.status = 'cancelled'
    session.endTime = performance.now()
    this.activeStreams.delete(streamId)

    this.emit('streamCancelled', { streamId, session })
    return true
  }

  updateConfig(newConfig: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.compressionEnabled = this.config.enableCompression
    this.parallelProcessingEnabled = this.config.enableParallelProcessing
    
    this.emit('configUpdated', this.config)
  }

  clearCache(): void {
    this.responseCache.clear()
    this.emit('cacheCleared')
  }
}

export { AdvancedAIStreamingManager, StreamingConfig, StreamChunk, StreamSession, ParallelTask }
export default AdvancedAIStreamingManager
