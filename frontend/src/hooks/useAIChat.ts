import { useState, useCallback, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import io from 'socket.io-client';

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  agent?: string;
  streamId?: string;
}

export interface AIStreamingOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useOrchestrator?: boolean;
  agentContext?: any;
}

export interface AIStats {
  totalTokens: number;
  activeStreams: number;
  currentAgent: string;
}

const backendUrl = 'http://localhost:3000';

// Global connection state to prevent multiple instances
let globalSocket: any = null;
let isConnecting = false;

export const useAIChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [stats, setStats] = useState<AIStats>({
    totalTokens: 0,
    activeStreams: 0,
    currentAgent: 'Unknown'
  });
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🔌 WebSocket already connected:', socketRef.current.id);
      return;
    }

    if (isConnecting) {
      console.log('🔌 Connection already in progress...');
      return;
    }

    // Use global socket if available
    if (globalSocket?.connected) {
      console.log('🔌 Using existing global socket:', globalSocket.id);
      socketRef.current = globalSocket;
      setIsConnected(true);
      return;
    }

    // Disconnect any existing connection first
    if (socketRef.current) {
      console.log('🔌 Disconnecting existing connection...');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    isConnecting = true;
    try {
      console.log('🔌 Creating new AI WebSocket connection...');
      socketRef.current = io(`${backendUrl}/ai`, {
        transports: ['websocket'],
        timeout: 60000,
        reconnection: true,
        reconnectionAttempts: 3, // Further reduced attempts
        reconnectionDelay: 5000, // Longer initial delay
        reconnectionDelayMax: 20000, // Max delay
        maxReconnectionAttempts: 3,
        forceNew: true, // Force new connection
        autoConnect: true // Ensure auto-connect is enabled
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('✅ AI WebSocket connected:', socketRef.current?.id);
        setIsConnected(true);
        setError(null);
        isConnecting = false;
        
        // Set global socket
        globalSocket = socketRef.current;
        
        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('ai:heartbeat');
          } else {
            clearInterval(heartbeatInterval);
          }
        }, 30000);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ AI WebSocket disconnected:', reason);
        setIsConnected(false);
        isConnecting = false;
        
        // Clear global socket if it's the same one
        if (globalSocket === socketRef.current) {
          globalSocket = null;
        }
        
        // Only retry if it's not a manual disconnect and not due to server shutdown
        if (reason !== 'io client disconnect' && reason !== 'transport close') {
          console.log('🔄 Will retry connection automatically via Socket.IO reconnection...');
          // Let Socket.IO handle reconnection automatically
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        setError(`Connection failed: ${error.message}`);
        setIsConnected(false);
        isConnecting = false;
        
        // Let Socket.IO handle reconnection automatically
        console.log('🔄 Socket.IO will handle reconnection automatically...');
      });

      // AI Service events
      socketRef.current.on('ai:connected', (data) => {
        console.log('🤖 AI Service connected:', data);
        setIsConnected(true);
        setError(null);
        addSystemMessage(`Connected to AI service (${data.clientId})`);
      });

      // Streaming events
      socketRef.current.on('ai:stream:start', (data) => {
        console.log('📡 Stream started:', data.streamId);
        setIsStreaming(true);
        setCurrentStreamId(data.streamId);
        setStats(prev => ({ ...prev, activeStreams: prev.activeStreams + 1 }));
        addSystemMessage(`Stream started: ${data.streamId}`);
      });

      socketRef.current.on('ai:token', (data) => {
        console.log('📝 Token received:', data.token || data.data, 'from agent:', data.agent);
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage?.type === 'ai' && lastMessage.isStreaming) {
            const newToken = data.token || data.data || '';
            const updatedMessage = {
              ...lastMessage,
              content: lastMessage.content + newToken,
              streamId: data.streamId,
              agent: data.agent
            };
            
            newMessages[newMessages.length - 1] = updatedMessage;
            console.log('✅ Message updated:', updatedMessage.content.length, 'chars, content preview:', updatedMessage.content.substring(0, 50));
          } else {
            console.log('⚠️ Cannot update message - lastMessage:', {
              type: lastMessage?.type,
              isStreaming: lastMessage?.isStreaming,
              content: lastMessage?.content?.substring(0, 20)
            });
          }
          
          return newMessages;
        });

        setStats(prev => ({
          ...prev,
          totalTokens: prev.totalTokens + 1,
          currentAgent: data.agent || 'Unknown'
        }));
      });

      socketRef.current.on('ai:stream:complete', (data) => {
        console.log('✅ Stream completed:', data);
        setIsStreaming(false);
        setCurrentStreamId(null);
        setStats(prev => ({ ...prev, activeStreams: Math.max(0, prev.activeStreams - 1) }));
        addSystemMessage(`Stream completed: ${data.agent} (${data.intent})`);
      });

      socketRef.current.on('ai:done', (data) => {
        console.log('🏁 Stream done:', data);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage?.type === 'ai' && lastMessage.isStreaming) {
            const updatedMessage = {
              ...lastMessage,
              isStreaming: false,
              agent: data.agent
            };
            newMessages[newMessages.length - 1] = updatedMessage;
          }
          
          return newMessages;
        });
      });

      socketRef.current.on('ai:error', (data) => {
        console.error('❌ AI Error:', data);
        setError(data.error || 'AI service error');
        setIsStreaming(false);
        setCurrentStreamId(null);
      });

    } catch (error: any) {
      console.error('Failed to connect to AI service:', error);
      setError(`Connection failed: ${error.message}`);
      setIsConnected(false);
    }
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Add system message
  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      type: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  // Send prompt
  const sendPrompt = useCallback((prompt: string, options: AIStreamingOptions = {}) => {
    if (!socketRef.current?.connected) {
      console.log('⚠️ Not connected to AI service, attempting to connect...');
      connect();
      setError('Not connected to AI service - attempting to reconnect...');
      return;
    }

    if (!prompt.trim()) {
      setError('Prompt cannot be empty');
      return;
    }

    console.log('📤 Sending prompt:', prompt.substring(0, 50));

    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: prompt,
      timestamp: new Date()
    };

    // Add AI message placeholder
    const aiMessage: ChatMessage = {
      id: `ai_${Date.now()}`,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);
    setError(null);

    // Send streaming request
    const streamId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    socketRef.current.emit('ai:stream', {
      prompt,
      streamId,
      model: options.model || 'qwen2.5-coder-lite',
      temperature: options.temperature || 0.05,
      maxTokens: options.maxTokens || 128,
      useOrchestrator: options.useOrchestrator !== false,
      agentContext: options.agentContext || {}
    });

    setCurrentStreamId(streamId);
  }, []);

  // Cancel current stream
  const cancelStream = useCallback(() => {
    if (currentStreamId && socketRef.current) {
      socketRef.current.emit('ai:cancel', { streamId: currentStreamId });
      setIsStreaming(false);
      setCurrentStreamId(null);
      addSystemMessage('Stream cancelled');
    }
  }, [currentStreamId, addSystemMessage]);

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsStreaming(false);
    setCurrentStreamId(null);
  }, []);

  // Auto-connect on mount - only once
  useEffect(() => {
    // Only connect if not already connected
    if (!socketRef.current?.connected) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []); // Remove dependencies to prevent re-connections

  return {
    // State
    messages,
    isConnected,
    isStreaming,
    currentStreamId,
    stats,
    error,
    
    // Actions
    sendPrompt,
    cancelStream,
    clearChat,
    connect,
    disconnect,
    addSystemMessage,
    
    // Utilities
    getLastMessage: () => messages[messages.length - 1],
    getMessageCount: () => messages.length,
    getTokenCount: () => stats.totalTokens
  };
};