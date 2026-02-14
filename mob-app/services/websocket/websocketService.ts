import { io, Socket } from "socket.io-client";
import { announceToScreenReader } from "../accessibility/accessibilityUtils";

export interface MessageEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  messageType: "text" | "voice" | "image" | "file" | "system";
  timestamp: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ReadReceiptEvent {
  conversationId: string;
  readBy: string;
}

export interface OnlineStatusEvent {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface IncomingCallEvent {
  callId: string;
  callerId: string;
  callerName?: string;
  createdAt?: string;
}

export interface CallStatusEvent {
  callId: string;
  status: string;
  fromUserId?: string;
}

export interface WebRTCOfferEvent {
  callId: string;
  offer: { type: string; sdp: string };
  fromUserId?: string;
}

export interface WebRTCAnswerEvent {
  callId: string;
  answer: { type: string; sdp: string };
  fromUserId?: string;
}

export interface WebRTCIceCandidateEvent {
  callId: string;
  candidate: {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
  };
  fromUserId?: string;
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
  private onReadReceiptHandlers: Set<(event: ReadReceiptEvent) => void> =
    new Set();
  private onOnlineStatusHandlers: Set<(event: OnlineStatusEvent) => void> =
    new Set();
  private onConnectionChangeHandlers: Set<(isConnected: boolean) => void> =
    new Set();
  private onIncomingCallHandlers: Set<(event: IncomingCallEvent) => void> =
    new Set();
  private onCallStatusHandlers: Set<(event: CallStatusEvent) => void> =
    new Set();
  private onWebRTCOfferHandlers: Set<(event: WebRTCOfferEvent) => void> =
    new Set();
  private onWebRTCAnswerHandlers: Set<(event: WebRTCAnswerEvent) => void> =
    new Set();
  private onWebRTCIceCandidateHandlers: Set<
    (event: WebRTCIceCandidateEvent) => void
  > = new Set();

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
      transports: ["websocket"],
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

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnectionChangeHandlers.forEach((handler) => handler(true));
      announceToScreenReader("Connected to messaging service");
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      this.onConnectionChangeHandlers.forEach((handler) => handler(false));

      if (reason === "io server disconnect") {
        // Server disconnected, don't reconnect automatically
        announceToScreenReader("Disconnected from server", { isAlert: true });
      } else {
        // Client disconnected, will attempt to reconnect
        announceToScreenReader("Connection lost. Reconnecting...", {
          isAlert: true,
        });
      }
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        announceToScreenReader(
          "Failed to connect. Please check your connection.",
          { isAlert: true },
        );
      }
    });

    // Message events (backend emits message:received to recipient)
    this.socket.on("message:received", (raw: any) => {
      const event: MessageEvent = {
        conversationId: raw?.conversation_id ?? raw?.conversationId ?? "",
        messageId: raw?.message_id ?? raw?.messageId ?? "",
        senderId: raw?.sender_id ?? raw?.senderId ?? "",
        content: raw?.content ?? "",
        messageType:
          String(
            raw?.message_type ?? raw?.messageType ?? "TEXT",
          ).toUpperCase() === "VOICE"
            ? "voice"
            : String(
                  raw?.message_type ?? raw?.messageType ?? "TEXT",
                ).toUpperCase() === "IMAGE"
              ? "image"
              : String(
                    raw?.message_type ?? raw?.messageType ?? "TEXT",
                  ).toUpperCase() === "FILE"
                ? "file"
                : String(
                      raw?.message_type ?? raw?.messageType ?? "TEXT",
                    ).toUpperCase() === "SYSTEM"
                  ? "system"
                  : "text",
        timestamp:
          raw?.created_at ?? raw?.createdAt ?? new Date().toISOString(),
      };
      this.onMessageHandlers.forEach((handler) => handler(event));
      if (event.senderId)
        announceToScreenReader(`New message from ${event.senderId}`);
    });

    // Typing events (backend emits typing:indicator)
    this.socket.on("typing:indicator", (raw: any) => {
      const event: TypingEvent = {
        conversationId: raw?.conversation_id ?? raw?.conversationId ?? "",
        userId: raw?.user_id ?? raw?.userId ?? "",
        isTyping: raw?.is_typing === true,
      };
      this.onTypingHandlers.forEach((handler) => handler(event));
    });

    // Read receipt events (backend emits message:read_receipt)
    this.socket.on("message:read_receipt", (raw: any) => {
      const event: ReadReceiptEvent = {
        conversationId: raw?.conversation_id ?? raw?.conversationId ?? "",
        readBy: raw?.read_by ?? raw?.readBy ?? "",
      };
      this.onReadReceiptHandlers.forEach((handler) => handler(event));
    });

    // Online status events
    this.socket.on("user:online", (event: OnlineStatusEvent) => {
      this.onOnlineStatusHandlers.forEach((handler) => handler(event));
    });

    this.socket.on("user:offline", (event: OnlineStatusEvent) => {
      this.onOnlineStatusHandlers.forEach((handler) =>
        handler({ ...event, isOnline: false }),
      );
    });

    // Voice call events
    this.socket.on("call:incoming", (raw: any) => {
      const caller = raw?.caller ?? {};
      const first = caller.first_name ?? caller.firstName ?? "";
      const last = caller.last_name ?? caller.lastName ?? "";
      const callerName = [first, last].filter(Boolean).join(" ") || undefined;
      const event: IncomingCallEvent = {
        callId: raw?.call_id ?? raw?.callId ?? "",
        callerId: raw?.caller_id ?? raw?.callerId ?? "",
        callerName,
        createdAt: raw?.created_at ?? raw?.createdAt,
      };
      this.onIncomingCallHandlers.forEach((handler) => handler(event));
    });

    this.socket.on("call:answered", (raw: any) => {
      const event: CallStatusEvent = {
        callId: raw?.call_id ?? raw?.callId ?? "",
        status: "ANSWERED",
        fromUserId: raw?.receiver_id ?? raw?.receiverId,
      };
      this.onCallStatusHandlers.forEach((handler) => handler(event));
    });

    this.socket.on("call:rejected", (raw: any) => {
      const event: CallStatusEvent = {
        callId: raw?.call_id ?? raw?.callId ?? "",
        status: "REJECTED",
        fromUserId: raw?.receiver_id ?? raw?.receiverId,
      };
      this.onCallStatusHandlers.forEach((handler) => handler(event));
    });

    this.socket.on("call:ended", (raw: any) => {
      const event: CallStatusEvent = {
        callId: raw?.call_id ?? raw?.callId ?? "",
        status: "ENDED",
        fromUserId: raw?.ended_by ?? raw?.endedBy,
      };
      this.onCallStatusHandlers.forEach((handler) => handler(event));
    });

    // WebRTC signaling
    this.socket.on("webrtc:offer", (raw: any) => {
      const event: WebRTCOfferEvent = {
        callId: raw?.call_id ?? raw?.callId ?? "",
        offer: raw?.offer,
        fromUserId: raw?.caller_id ?? raw?.callerId,
      };
      this.onWebRTCOfferHandlers.forEach((handler) => handler(event));
    });

    this.socket.on("webrtc:answer", (raw: any) => {
      const event: WebRTCAnswerEvent = {
        callId: raw?.call_id ?? raw?.callId ?? "",
        answer: raw?.answer,
        fromUserId: raw?.receiver_id ?? raw?.receiverId,
      };
      this.onWebRTCAnswerHandlers.forEach((handler) => handler(event));
    });

    this.socket.on("webrtc:ice-candidate", (raw: any) => {
      const event: WebRTCIceCandidateEvent = {
        callId: raw?.call_id ?? raw?.callId ?? "",
        candidate: raw?.candidate,
        fromUserId: raw?.from_user_id ?? raw?.fromUserId,
      };
      this.onWebRTCIceCandidateHandlers.forEach((handler) => handler(event));
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
  sendMessage(
    recipientId: string,
    content: string,
    messageType: "text" | "voice" | "image" | "file" = "text",
  ): void {
    if (!this.socket || !this.isConnected) {
      announceToScreenReader(
        "Not connected. Message will be sent when connection is restored.",
        { isAlert: true },
      );
      return;
    }

    const backendType =
      messageType === "voice"
        ? "VOICE"
        : messageType === "image"
          ? "IMAGE"
          : messageType === "file"
            ? "FILE"
            : "TEXT";

    this.socket.emit("message:send", {
      recipientId,
      content,
      messageType: backendType,
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(
    conversationId: string,
    recipientId: string,
    isTyping: boolean,
  ): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    if (isTyping) {
      this.socket.emit("typing:start", { conversationId, recipientId });
    } else {
      this.socket.emit("typing:stop", { conversationId, recipientId });
    }
  }

  /**
   * Mark message as read
   */
  markAsRead(conversationId: string, messageIds?: string[]): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit("message:read", {
      conversationId,
      messageIds,
    });
  }

  initiateCall(
    receiverId: string,
  ): Promise<{
    callId: string;
    receiverId: string;
    status: string;
    createdAt?: string;
  }> {
    if (!this.socket || !this.isConnected) {
      return Promise.reject(new Error("Not connected"));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.socket?.off("call:initiated", onInitiated);
        reject(new Error("Call initiation timed out"));
      }, 10000);

      const onInitiated = (raw: any) => {
        clearTimeout(timeout);
        resolve({
          callId: raw?.call_id ?? raw?.callId ?? "",
          receiverId: raw?.receiver_id ?? raw?.receiverId ?? receiverId,
          status: raw?.status ?? "INITIATED",
          createdAt: raw?.created_at ?? raw?.createdAt,
        });
      };

      this.socket.on("call:initiated", onInitiated);
      this.socket.emit("call:initiate", { receiverId });
    });
  }

  answerCall(callId: string): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("call:answer", { callId });
  }

  rejectCall(callId: string): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("call:reject", { callId });
  }

  endCall(callId: string): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("call:end", { callId });
  }

  sendWebRTCOffer(callId: string, offer: { type: string; sdp: string }): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("webrtc:offer", { callId, offer });
  }

  sendWebRTCAnswer(
    callId: string,
    answer: { type: string; sdp: string },
  ): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("webrtc:answer", { callId, answer });
  }

  sendWebRTCIceCandidate(
    callId: string,
    candidate: {
      candidate: string;
      sdpMLineIndex: number | null;
      sdpMid: string | null;
    },
  ): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("webrtc:ice-candidate", { callId, candidate });
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

  onIncomingCall(handler: (event: IncomingCallEvent) => void): () => void {
    this.onIncomingCallHandlers.add(handler);
    return () => {
      this.onIncomingCallHandlers.delete(handler);
    };
  }

  onCallStatus(handler: (event: CallStatusEvent) => void): () => void {
    this.onCallStatusHandlers.add(handler);
    return () => {
      this.onCallStatusHandlers.delete(handler);
    };
  }

  onWebRTCOffer(handler: (event: WebRTCOfferEvent) => void): () => void {
    this.onWebRTCOfferHandlers.add(handler);
    return () => {
      this.onWebRTCOfferHandlers.delete(handler);
    };
  }

  onWebRTCAnswer(handler: (event: WebRTCAnswerEvent) => void): () => void {
    this.onWebRTCAnswerHandlers.add(handler);
    return () => {
      this.onWebRTCAnswerHandlers.delete(handler);
    };
  }

  onWebRTCIceCandidate(
    handler: (event: WebRTCIceCandidateEvent) => void,
  ): () => void {
    this.onWebRTCIceCandidateHandlers.add(handler);
    return () => {
      this.onWebRTCIceCandidateHandlers.delete(handler);
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
