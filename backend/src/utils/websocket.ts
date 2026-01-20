import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '@/utils/jwt';
import { logger } from '@/utils/logger';
import prisma from '@/config/database';
import messagingService from '@/services/messaging.service';
import voiceCallService from '@/services/voiceCall.service';
import { MessageType, CallStatus } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Store active connections
const activeConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds

export function initializeWebSocket(server: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token);

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { user_id: decoded.userId },
        select: {
          user_id: true,
          is_active: true,
        },
      });

      if (!user || !user.is_active) {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.userId = decoded.userId;
      next();
    } catch (error) {
      logger.error('WebSocket authentication error', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    // Track connection
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId)!.add(socket.id);

    logger.info(`User ${userId} connected via WebSocket (socket: ${socket.id})`);

    // Join user's room for direct messaging
    socket.join(`user:${userId}`);

    // Update user's last_active
    prisma.user.update({
      where: { user_id: userId },
      data: { last_active: new Date() },
    }).catch((error) => {
      logger.error('Error updating last_active', error);
    });

    // Handle sending message
    socket.on('message:send', async (data: { recipientId: string; content: string; messageType?: MessageType }) => {
      try {
        const { recipientId, content, messageType } = data;

        if (!recipientId || !content) {
          socket.emit('message:error', { error: 'Recipient ID and content are required' });
          return;
        }

        // Send message via service
        const message = await messagingService.sendMessage(userId, {
          recipientId,
          content,
          messageType: messageType || 'TEXT',
        });

        // Emit to sender (confirmation)
        socket.emit('message:sent', {
          message_id: message.message_id,
          conversation_id: message.conversation_id,
          content: message.content,
          created_at: message.created_at,
        });

        // Mark as delivered if recipient is online
        const recipientConnections = activeConnections.get(recipientId);
        if (recipientConnections && recipientConnections.size > 0) {
          // Mark as delivered
          await messagingService.markAsDelivered(message.message_id, recipientId);

          // Emit to recipient
          io.to(`user:${recipientId}`).emit('message:received', {
            message_id: message.message_id,
            conversation_id: message.conversation_id,
            sender_id: userId,
            content: message.content,
            message_type: message.message_type,
            delivered_at: new Date().toISOString(),
            created_at: message.created_at,
            attachments: message.attachments || [],
          });
        }

        logger.info(`Message sent via WebSocket from ${userId} to ${recipientId}`);
      } catch (error: any) {
        logger.error('Error sending message via WebSocket', error);
        socket.emit('message:error', { error: error.message || 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing:start', async (data: { conversationId: string; recipientId: string }) => {
      try {
        const { conversationId, recipientId } = data;

        // Emit typing indicator to recipient
        const recipientConnections = activeConnections.get(recipientId);
        if (recipientConnections && recipientConnections.size > 0) {
          io.to(`user:${recipientId}`).emit('typing:indicator', {
            conversation_id: conversationId,
            user_id: userId,
            is_typing: true,
          });
        }
      } catch (error) {
        logger.error('Error handling typing indicator', error);
      }
    });

    socket.on('typing:stop', async (data: { conversationId: string; recipientId: string }) => {
      try {
        const { conversationId, recipientId } = data;

        // Emit typing stop to recipient
        const recipientConnections = activeConnections.get(recipientId);
        if (recipientConnections && recipientConnections.size > 0) {
          io.to(`user:${recipientId}`).emit('typing:indicator', {
            conversation_id: conversationId,
            user_id: userId,
            is_typing: false,
          });
        }
      } catch (error) {
        logger.error('Error handling typing stop', error);
      }
    });

    // Handle mark as read
    socket.on('message:read', async (data: { conversationId: string; messageIds?: string[] }) => {
      try {
        const { conversationId, messageIds } = data;

        await messagingService.markAsRead(conversationId, userId, messageIds);

        // Notify other user that messages were read
        const conversation = await prisma.conversation.findUnique({
          where: { conversation_id: conversationId },
        });

        if (conversation) {
          const otherUserId = conversation.user_a_id === userId ? conversation.user_b_id : conversation.user_a_id;
          const otherUserConnections = activeConnections.get(otherUserId);
          if (otherUserConnections && otherUserConnections.size > 0) {
            io.to(`user:${otherUserId}`).emit('message:read_receipt', {
              conversation_id: conversationId,
              read_by: userId,
            });
          }
        }

        socket.emit('message:read:confirmed', { conversation_id: conversationId });
      } catch (error: any) {
        logger.error('Error marking messages as read', error);
        socket.emit('message:error', { error: error.message || 'Failed to mark as read' });
      }
    });

    // Handle message edit
    socket.on('message:edit', async (data: { messageId: string; content: string }) => {
      try {
        const { messageId, content } = data;

        const message = await messagingService.editMessage(messageId, userId, { content });

        // Get conversation to find other user
        const conversation = await prisma.conversation.findUnique({
          where: { conversation_id: message.conversation_id },
        });

        if (conversation) {
          const otherUserId = conversation.user_a_id === userId ? conversation.user_b_id : conversation.user_a_id;

          // Emit to sender (confirmation)
          socket.emit('message:edited', {
            message_id: message.message_id,
            content: message.content,
            edited_at: message.edited_at,
          });

          // Emit to recipient (if online)
          const recipientConnections = activeConnections.get(otherUserId);
          if (recipientConnections && recipientConnections.size > 0) {
            io.to(`user:${otherUserId}`).emit('message:edited', {
              message_id: message.message_id,
              conversation_id: message.conversation_id,
              content: message.content,
              edited_at: message.edited_at,
            });
          }
        }
      } catch (error: any) {
        logger.error('Error editing message via WebSocket', error);
        socket.emit('message:error', { error: error.message || 'Failed to edit message' });
      }
    });

    // Handle message delete
    socket.on('message:delete', async (data: { messageId: string }) => {
      try {
        const { messageId } = data;

        const message = await messagingService.deleteMessage(messageId, userId);

        // Get conversation to find other user
        const conversation = await prisma.conversation.findUnique({
          where: { conversation_id: message.conversation_id },
        });

        if (conversation) {
          const otherUserId = conversation.user_a_id === userId ? conversation.user_b_id : conversation.user_a_id;

          // Emit to sender (confirmation)
          socket.emit('message:deleted', {
            message_id: message.message_id,
            conversation_id: message.conversation_id,
          });

          // Emit to recipient (if online)
          const recipientConnections = activeConnections.get(otherUserId);
          if (recipientConnections && recipientConnections.size > 0) {
            io.to(`user:${otherUserId}`).emit('message:deleted', {
              message_id: message.message_id,
              conversation_id: message.conversation_id,
            });
          }
        }
      } catch (error: any) {
        logger.error('Error deleting message via WebSocket', error);
        socket.emit('message:error', { error: error.message || 'Failed to delete message' });
      }
    });

    // Handle add reaction
    socket.on('reaction:add', async (data: { messageId: string; emoji: string }) => {
      try {
        const { messageId, emoji } = data;

        const reaction = await messagingService.addReaction(messageId, userId, emoji);

        // Get message to find conversation
        const message = await prisma.message.findUnique({
          where: { message_id: messageId },
          include: { conversation: true },
        });

        if (message) {
          const otherUserId =
            message.conversation.user_a_id === userId
              ? message.conversation.user_b_id
              : message.conversation.user_a_id;

          // Emit to sender (confirmation)
          socket.emit('reaction:added', {
            reaction_id: reaction.reaction_id,
            message_id: messageId,
            emoji: reaction.emoji,
            user: reaction.user,
          });

          // Emit to recipient (if online)
          const recipientConnections = activeConnections.get(otherUserId);
          if (recipientConnections && recipientConnections.size > 0) {
            io.to(`user:${otherUserId}`).emit('reaction:added', {
              reaction_id: reaction.reaction_id,
              message_id: messageId,
              emoji: reaction.emoji,
              user: reaction.user,
            });
          }
        }
      } catch (error: any) {
        logger.error('Error adding reaction via WebSocket', error);
        socket.emit('message:error', { error: error.message || 'Failed to add reaction' });
      }
    });

    // Handle remove reaction
    socket.on('reaction:remove', async (data: { messageId: string }) => {
      try {
        const { messageId } = data;

        await messagingService.removeReaction(messageId, userId);

        // Get message to find conversation
        const message = await prisma.message.findUnique({
          where: { message_id: messageId },
          include: { conversation: true },
        });

        if (message) {
          const otherUserId =
            message.conversation.user_a_id === userId
              ? message.conversation.user_b_id
              : message.conversation.user_a_id;

          // Emit to sender (confirmation)
          socket.emit('reaction:removed', {
            message_id: messageId,
            user_id: userId,
          });

          // Emit to recipient (if online)
          const recipientConnections = activeConnections.get(otherUserId);
          if (recipientConnections && recipientConnections.size > 0) {
            io.to(`user:${otherUserId}`).emit('reaction:removed', {
              message_id: messageId,
              user_id: userId,
            });
          }
        }
      } catch (error: any) {
        logger.error('Error removing reaction via WebSocket', error);
        socket.emit('message:error', { error: error.message || 'Failed to remove reaction' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected (socket: ${socket.id})`);

      // Remove connection
      const connections = activeConnections.get(userId);
      if (connections) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          activeConnections.delete(userId);
        }
      }

      // Update last_active
      prisma.user.update({
        where: { user_id: userId },
        data: { last_active: new Date() },
      }).catch((error) => {
        logger.error('Error updating last_active on disconnect', error);
      });
    });

    // Handle voice call initiation
    socket.on('call:initiate', async (data: { receiverId: string }) => {
      try {
        const { receiverId } = data;

        if (!receiverId) {
          socket.emit('call:error', { error: 'Receiver ID is required' });
          return;
        }

        // Initiate call via service
        const call = await voiceCallService.initiateCall(userId, { receiverId });

        // Emit to caller (confirmation)
        socket.emit('call:initiated', {
          call_id: call.call_id,
          receiver_id: receiverId,
          status: call.status,
          created_at: call.created_at,
        });

        // Emit to receiver (if online)
        const receiverConnections = activeConnections.get(receiverId);
        if (receiverConnections && receiverConnections.size > 0) {
          io.to(`user:${receiverId}`).emit('call:incoming', {
            call_id: call.call_id,
            caller_id: userId,
            caller: call.caller,
            created_at: call.created_at,
          });
        }

        logger.info(`Call initiated via WebSocket from ${userId} to ${receiverId}`);
      } catch (error: any) {
        logger.error('Error initiating call via WebSocket', error);
        socket.emit('call:error', { error: error.message || 'Failed to initiate call' });
      }
    });

    // Handle call answer
    socket.on('call:answer', async (data: { callId: string }) => {
      try {
        const { callId } = data;

        const call = await voiceCallService.updateCallStatus(callId, 'ANSWERED', userId);

        // Notify caller
        const callerConnections = activeConnections.get(call.caller_id);
        if (callerConnections && callerConnections.size > 0) {
          io.to(`user:${call.caller_id}`).emit('call:answered', {
            call_id: callId,
            receiver_id: userId,
          });
        }

        socket.emit('call:answered:confirmed', { call_id: callId });
      } catch (error: any) {
        logger.error('Error answering call via WebSocket', error);
        socket.emit('call:error', { error: error.message || 'Failed to answer call' });
      }
    });

    // Handle call reject
    socket.on('call:reject', async (data: { callId: string }) => {
      try {
        const { callId } = data;

        const call = await voiceCallService.updateCallStatus(callId, 'REJECTED', userId);

        // Notify caller
        const callerConnections = activeConnections.get(call.caller_id);
        if (callerConnections && callerConnections.size > 0) {
          io.to(`user:${call.caller_id}`).emit('call:rejected', {
            call_id: callId,
            receiver_id: userId,
          });
        }

        socket.emit('call:rejected:confirmed', { call_id: callId });
      } catch (error: any) {
        logger.error('Error rejecting call via WebSocket', error);
        socket.emit('call:error', { error: error.message || 'Failed to reject call' });
      }
    });

    // Handle call end
    socket.on('call:end', async (data: { callId: string }) => {
      try {
        const { callId } = data;

        const call = await voiceCallService.endCall(callId, userId);

        // Notify other party
        const otherUserId = call.caller_id === userId ? call.receiver_id : call.caller_id;
        const otherUserConnections = activeConnections.get(otherUserId);
        if (otherUserConnections && otherUserConnections.size > 0) {
          io.to(`user:${otherUserId}`).emit('call:ended', {
            call_id: callId,
            ended_by: userId,
            duration: call.duration,
          });
        }

        socket.emit('call:ended:confirmed', { call_id: callId });
      } catch (error: any) {
        logger.error('Error ending call via WebSocket', error);
        socket.emit('call:error', { error: error.message || 'Failed to end call' });
      }
    });

    // Handle call status update
    socket.on('call:status', async (data: { callId: string; status: CallStatus }) => {
      try {
        const { callId, status } = data;

        const call = await voiceCallService.updateCallStatus(callId, status, userId);

        // Notify other party
        const otherUserId = call.caller_id === userId ? call.receiver_id : call.caller_id;
        const otherUserConnections = activeConnections.get(otherUserId);
        if (otherUserConnections && otherUserConnections.size > 0) {
          io.to(`user:${otherUserId}`).emit('call:status:updated', {
            call_id: callId,
            status: call.status,
          });
        }

        socket.emit('call:status:confirmed', { call_id: callId, status: call.status });
      } catch (error: any) {
        logger.error('Error updating call status via WebSocket', error);
        socket.emit('call:error', { error: error.message || 'Failed to update call status' });
      }
    });

    // WebRTC Signaling Handlers
    // Handle WebRTC offer (caller sends offer to receiver)
    socket.on('webrtc:offer', async (data: { callId: string; offer: { type: string; sdp: string } }) => {
      try {
        const { callId, offer } = data;

        const call = await voiceCallService.getCall(callId, userId);
        const otherUserId = call.caller_id === userId ? call.receiver_id : call.caller_id;

        // Forward offer to receiver
        const receiverConnections = activeConnections.get(otherUserId);
        if (receiverConnections && receiverConnections.size > 0) {
          io.to(`user:${otherUserId}`).emit('webrtc:offer', {
            call_id: callId,
            offer,
            caller_id: userId,
          });
        }

        logger.info(`WebRTC offer forwarded for call ${callId} from ${userId} to ${otherUserId}`);
      } catch (error: any) {
        logger.error('Error handling WebRTC offer', error);
        socket.emit('call:error', { error: error.message || 'Failed to send offer' });
      }
    });

    // Handle WebRTC answer (receiver sends answer to caller)
    socket.on('webrtc:answer', async (data: { callId: string; answer: { type: string; sdp: string } }) => {
      try {
        const { callId, answer } = data;

        const call = await voiceCallService.getCall(callId, userId);
        const otherUserId = call.caller_id === userId ? call.receiver_id : call.caller_id;

        // Forward answer to caller
        const callerConnections = activeConnections.get(otherUserId);
        if (callerConnections && callerConnections.size > 0) {
          io.to(`user:${otherUserId}`).emit('webrtc:answer', {
            call_id: callId,
            answer,
            receiver_id: userId,
          });
        }

        logger.info(`WebRTC answer forwarded for call ${callId} from ${userId} to ${otherUserId}`);
      } catch (error: any) {
        logger.error('Error handling WebRTC answer', error);
        socket.emit('call:error', { error: error.message || 'Failed to send answer' });
      }
    });

    // Handle ICE candidate exchange (both parties exchange ICE candidates)
    socket.on('webrtc:ice-candidate', async (data: { callId: string; candidate: { candidate: string; sdpMLineIndex: number | null; sdpMid: string | null } }) => {
      try {
        const { callId, candidate } = data;

        const call = await voiceCallService.getCall(callId, userId);
        const otherUserId = call.caller_id === userId ? call.receiver_id : call.caller_id;

        // Forward ICE candidate to other party
        const otherUserConnections = activeConnections.get(otherUserId);
        if (otherUserConnections && otherUserConnections.size > 0) {
          io.to(`user:${otherUserId}`).emit('webrtc:ice-candidate', {
            call_id: callId,
            candidate,
            from_user_id: userId,
          });
        }

        logger.debug(`WebRTC ICE candidate forwarded for call ${callId}`);
      } catch (error: any) {
        logger.error('Error handling WebRTC ICE candidate', error);
        socket.emit('call:error', { error: error.message || 'Failed to send ICE candidate' });
      }
    });
  });

  logger.info('WebSocket server initialized');

  return io;
}

// Helper to emit to specific user
export function emitToUser(io: SocketIOServer, userId: string, event: string, data: any) {
  const connections = activeConnections.get(userId);
  if (connections && connections.size > 0) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

// Helper to check if user is online
export function isUserOnline(userId: string): boolean {
  const connections = activeConnections.get(userId);
  return connections ? connections.size > 0 : false;
}

