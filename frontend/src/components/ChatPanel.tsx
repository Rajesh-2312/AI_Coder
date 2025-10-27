import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: number
  isStreaming?: boolean
  metadata?: {
    tokens?: number
    model?: string
    latency?: number
  }
}

interface ChatPanelProps {
  className?: string
  maxHeight?: number
  maxMessages?: number
  enableVirtualization?: boolean
}

interface VirtualizedChatProps {
  messages: ChatMessage[]
  maxHeight: number
  itemHeight: number
  overscan: number
  renderMessage: (message: ChatMessage, index: number) => React.ReactNode
}

// Virtualized chat component for performance
const VirtualizedChat = memo<VirtualizedChatProps>(({ 
  messages, 
  maxHeight, 
  itemHeight, 
  overscan, 
  renderMessage 
}) => {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)
  
  const visibleMessages = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(maxHeight / itemHeight) + overscan,
      messages.length - 1
    )
    
    return messages.slice(startIndex, endIndex + 1).map((message, index) => ({
      message,
      index: startIndex + index
    }))
  }, [messages, scrollTop, itemHeight, maxHeight, overscan])
  
  const totalHeight = messages.length * itemHeight
  const offsetY = Math.floor(scrollTop / itemHeight) * itemHeight
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    setScrollTop(target.scrollTop)
    
    // Check if user is at bottom
    const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 10
    shouldAutoScroll.current = isAtBottom
  }, [])
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages.length])
  
      return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: maxHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleMessages.map(({ message, index }) => (
            <div key={message.id} style={{ height: itemHeight }}>
              {renderMessage(message, index)}
          </div>
          ))}
        </div>
      </div>
    </div>
  )
})

VirtualizedChat.displayName = 'VirtualizedChat'

// Memoized message component
const ChatMessageComponent = memo<{
  message: ChatMessage
  isLast: boolean
}>(({ message }) => {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    // Lazy load message content for performance
    const timer = setTimeout(() => setIsVisible(true), 0)
    return () => clearTimeout(timer)
  }, [])
  
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }, [])
  
  const formatContent = useCallback((content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>')
  }, [])
  
  if (!isVisible) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      )
    }
    
    return (
    <div className={`p-4 ${message.role === 'user' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {message.role === 'user' ? (
            <User className="w-6 h-6 text-blue-600" />
          ) : (
            <Bot className="w-6 h-6 text-green-600" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {message.role === 'user' ? 'You' : 'AI Assistant'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(message.timestamp)}
            </span>
            {message.isStreaming && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            )}
          </div>
          
          <div 
            className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: formatContent(message.content) 
            }}
          />
          
          {message.metadata && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {message.metadata.tokens && (
                <span className="mr-2">{message.metadata.tokens} tokens</span>
              )}
              {message.metadata.latency && (
                <span className="mr-2">{message.metadata.latency}ms</span>
              )}
              {message.metadata.model && (
                <span>{message.metadata.model}</span>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    )
})

ChatMessageComponent.displayName = 'ChatMessageComponent'

// Main ChatPanel component
export const ChatPanel = memo<ChatPanelProps>(({
  className = '',
  maxHeight = 500,
  maxMessages = 1000,
  enableVirtualization = true
}) => {
  const { state, setCachedValue, getCachedValue } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  
  // Load cached messages
  useEffect(() => {
    const cachedMessages = getCachedValue<ChatMessage[]>('chat_messages')
    if (cachedMessages) {
      setMessages(cachedMessages)
    }
  }, [getCachedValue])
  
  // Cache messages when they change
  useEffect(() => {
    setCachedValue('chat_messages', messages)
  }, [messages, setCachedValue])
  
  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:3000/ai')
      
      ws.onopen = () => {
        console.log('WebSocket connected')
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'ai_response') {
            setMessages(prev => {
              const newMessages = [...prev]
              const lastMessage = newMessages[newMessages.length - 1]
              
              if (lastMessage && lastMessage.isStreaming) {
                lastMessage.content += data.content
                lastMessage.isStreaming = !data.done
                
                if (data.done) {
                  lastMessage.metadata = {
                    tokens: data.tokens,
                    model: data.model,
                    latency: data.latency
                  }
                }
              }
              
              return newMessages
            })
            
            if (data.done) {
              setIsLoading(false)
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...')
        setTimeout(connectWebSocket, 1000)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      wsRef.current = ws
    }
    
    connectWebSocket()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])
  
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return
    
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: inputValue.trim(),
      role: 'user',
      timestamp: Date.now()
    }
    
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: '',
      role: 'assistant',
      timestamp: Date.now(),
      isStreaming: true
    }
    
    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInputValue('')
    setIsLoading(true)
    
    // Send message via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        content: userMessage.content,
        model: state.settings.aiModel,
        temperature: state.settings.temperature,
        maxTokens: state.settings.maxTokens
      }))
    }
  }, [inputValue, isLoading, state.settings])
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }, [])
  
  const clearMessages = useCallback(() => {
    setMessages([])
    setCachedValue('chat_messages', [])
  }, [setCachedValue])
  
  // Limit messages for performance
  const displayMessages = useMemo(() => {
    if (messages.length <= maxMessages) return messages
    
    // Keep the most recent messages
    return messages.slice(-maxMessages)
  }, [messages, maxMessages])
  
  const renderMessage = useCallback((message: ChatMessage, index: number) => (
    <ChatMessageComponent
      message={message}
      isLast={index === displayMessages.length - 1}
    />
  ), [displayMessages.length])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">AI Chat</h3>
          <button
            onClick={clearMessages}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1">
        {displayMessages.length > 0 ? (
          enableVirtualization ? (
            <VirtualizedChat
              messages={displayMessages}
              maxHeight={maxHeight}
              itemHeight={120} // Approximate height per message
              overscan={5}
              renderMessage={renderMessage}
            />
          ) : (
            <div className="overflow-auto" style={{ height: maxHeight }}>
              {displayMessages.map((message, index) => (
                <div key={message.id}>
                  {renderMessage(message, index)}
                </div>
              ))}
              </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>Start a conversation with AI</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
})

ChatPanel.displayName = 'ChatPanel'

export default ChatPanel