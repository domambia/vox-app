import { io, Socket } from 'socket.io-client';
import { announceToScreenReader } from '../accessibility/accessibilityUtils';

export interface MessageEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'voice' | 'image';
  timestamp: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ReadReceiptEvent {
  conversationId: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface OnlineStatusEvent {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

/**
 * WebSocket Service
 * Handles real-time messaging via Socket.IO
 */
class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  // Event handlers
  private onMessageHandlers: Set<(event: MessageEvent) => void> = new Set();
  private onTypingHandlers: Set<(event: TypingEvent) => void> = new Set();
  private onReadReceiptHandlers: Set<(event: ReadReceiptEvent) => void> = new Set();
  private onOnlineStatusHandlers: Set<(event: OnlineStatusEvent) => void> = new Set();
  private onConnectionChangeHandlers: Set<(isConnected: boolean) => void> = new Set();

  /**
   * Connect to WebSocket server
   */
  connect(serverUrl: string, token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(serverUrl, {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnectionChangeHandlers.forEach((handler) => handler(true));
      announceToScreenReader('Connected to messaging service');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.onConnectionChangeHandlers.forEach((handler) => handler(false));
      
      if (reason === 'io server disconnect') {
        // Server disconnected, don't reconnect automatically
        announceToScreenReader('Disconnected from server', { isAlert: true });
      } else {
        // Client disconnected, will attempt to reconnect
        announceToScreenReader('Connection lost. Reconnecting...', { isAlert: true });
      }
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        announceToScreenReader('Failed to connect. Please check your connection.', { isAlert: true });
      }
    });

    // Message events
    this.socket.on('message:new', (event: MessageEvent) => {
      this.onMessageHandlers.forEach((handler) => handler(event));
      announceToScreenReader(`New message from ${event.senderId}`);
    });

    // Typing events
    this.socket.on('typing:start', (event: TypingEvent) => {
      this.onTypingHandlers.forEach((handler) => handler(event));
    });

    this.socket.on('typing:stop', (event: TypingEvent) => {
      this.onTypingHandlers.forEach((handler) => handler({ ...event, isTyping: false }));
    });

    // Read receipt events
    this.socket.on('message:read', (event: ReadReceiptEvent) => {
      this.onReadReceiptHandlers.forEach((handler) => handler(event));
    });

    // Online status events
    this.socket.on('user:online', (event: OnlineStatusEvent) => {
      this.onOnlineStatusHandlers.forEach((handler) => handler(event));
    });

    this.socket.on('user:offline', (event: OnlineStatusEvent) => {
      this.onOnlineStatusHandlers.forEach((handler) => handler({ ...event, isOnline: false }));
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.onConnectionChangeHandlers.forEach((handler) => handler(false));
    }
  }

  /**
   * Send a message
   */
  sendMessage(conversationId: string, content: string, messageType: 'text' | 'voice' | 'image' = 'text'): void {
    if (!this.socket || !this.isConnected) {
      announceToScreenReader('Not connected. Message will be sent when connection is restored.', { isAlert: true });
      return;
    }

    this.socket.emit('message:send', {
      conversationId,
      content,
      messageType,
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('typing', {
      conversationId,
      isTyping,
    });
  }

  /**
   * Mark message as read
   */
  markAsRead(conversationId: string, messageId: string): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('message:read', {
      conversationId,
      messageId,
    });
  }

  /**
   * Subscribe to new messages
   */
  onMessage(handler: (event: MessageEvent) => void): () => void {
    this.onMessageHandlers.add(handler);
    return () => {
      this.onMessageHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to typing events
   */
  onTyping(handler: (event: TypingEvent) => void): () => void {
    this.onTypingHandlers.add(handler);
    return () => {
      this.onTypingHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to read receipt events
   */
  onReadReceipt(handler: (event: ReadReceiptEvent) => void): () => void {
    this.onReadReceiptHandlers.add(handler);
    return () => {
      this.onReadReceiptHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to online status events
   */
  onOnlineStatus(handler: (event: OnlineStatusEvent) => void): () => void {
    this.onOnlineStatusHandlers.add(handler);
    return () => {
      this.onOnlineStatusHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to connection changes
   */
  onConnectionChange(handler: (isConnected: boolean) => void): () => void {
    this.onConnectionChangeHandlers.add(handler);
    // Immediately call with current state
    handler(this.isConnected);
    return () => {
      this.onConnectionChangeHandlers.delete(handler);
    };
  }

  /**
   * Get connection status
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const websocketService = new WebSocketService();

