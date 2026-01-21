import { socketClient } from './socketClient';
import { store } from '../../store';
import {
  addMessage,
  updateMessage,
  setTypingIndicator,
  setUnreadCount,
} from '../../store/slices/messagesSlice';
import {
  setIncomingCall,
  setActiveCall,
  updateCallStatus,
} from '../../store/slices/callsSlice';
import { Message, VoiceCall } from '../../types/models.types';
import { announceToScreenReader } from '../accessibility/accessibilityUtils';

/**
 * Setup all WebSocket event handlers
 */
export const setupSocketEvents = (): void => {
  // Message Events
  socketClient.on('message:sent', (data: { message: Message }) => {
    // Message sent confirmation - update local state if needed
    console.log('Message sent:', data.message);
  });

  socketClient.on('message:received', (data: { message: Message; conversationId: string }) => {
    store.dispatch(addMessage({ conversationId: data.conversationId, message: data.message }));
    announceToScreenReader('New message received');
  });

  socketClient.on('typing:indicator', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
    store.dispatch(setTypingIndicator({
      conversationId: data.conversationId,
      userId: data.userId,
      isTyping: data.isTyping,
    }));
  });

  socketClient.on('message:read_receipt', (data: { conversationId: string; messageIds: string[] }) => {
    data.messageIds.forEach((messageId) => {
      store.dispatch(updateMessage({
        conversationId: data.conversationId,
        messageId,
        updates: { readAt: new Date().toISOString() },
      }));
    });
  });

  socketClient.on('message:edited', (data: { message: Message }) => {
    // Update message in store
    // Note: We need conversationId, which should be in the message or we need to find it
    announceToScreenReader('Message edited');
  });

  socketClient.on('message:deleted', (data: { messageId: string; conversationId: string }) => {
    store.dispatch(updateMessage({
      conversationId: data.conversationId,
      messageId: data.messageId,
      updates: { isDeleted: true, deletedAt: new Date().toISOString() },
    }));
  });

  socketClient.on('reaction:added', (data: { messageId: string; reaction: any }) => {
    // Update message reactions
    announceToScreenReader(`Reaction ${data.reaction.emoji} added`);
  });

  socketClient.on('reaction:removed', (data: { messageId: string }) => {
    // Update message reactions
    announceToScreenReader('Reaction removed');
  });

  socketClient.on('message:error', (data: { error: string }) => {
    announceToScreenReader(`Message error: ${data.error}`, true);
  });

  // Voice Call Events
  socketClient.on('call:initiated', (data: { call: VoiceCall }) => {
    store.dispatch(setActiveCall(data.call));
    announceToScreenReader('Call initiated');
  });

  socketClient.on('call:incoming', (data: { call: VoiceCall }) => {
    store.dispatch(setIncomingCall(data.call));
    announceToScreenReader('Incoming call');
  });

  socketClient.on('call:answered', (data: { callId: string }) => {
    store.dispatch(updateCallStatus({ callId: data.callId, status: 'ANSWERED' }));
    announceToScreenReader('Call answered');
  });

  socketClient.on('call:rejected', (data: { callId: string }) => {
    store.dispatch(updateCallStatus({ callId: data.callId, status: 'REJECTED' }));
    announceToScreenReader('Call rejected');
  });

  socketClient.on('call:ended', (data: { callId: string }) => {
    store.dispatch(updateCallStatus({ callId: data.callId, status: 'ENDED' }));
    announceToScreenReader('Call ended');
  });

  socketClient.on('call:status:updated', (data: { callId: string; status: string }) => {
    store.dispatch(updateCallStatus({ callId: data.callId, status: data.status as any }));
  });

  socketClient.on('webrtc:offer', (data: { callId: string; offer: any }) => {
    // Handle WebRTC offer
    console.log('WebRTC offer received:', data);
  });

  socketClient.on('webrtc:answer', (data: { callId: string; answer: any }) => {
    // Handle WebRTC answer
    console.log('WebRTC answer received:', data);
  });

  socketClient.on('webrtc:ice-candidate', (data: { callId: string; candidate: any }) => {
    // Handle ICE candidate
    console.log('ICE candidate received:', data);
  });

  socketClient.on('call:error', (data: { error: string }) => {
    announceToScreenReader(`Call error: ${data.error}`, true);
  });
};

/**
 * Cleanup socket event handlers
 */
export const cleanupSocketEvents = (): void => {
  // Remove all event listeners
  const events = [
    'message:sent',
    'message:received',
    'typing:indicator',
    'message:read_receipt',
    'message:edited',
    'message:deleted',
    'reaction:added',
    'reaction:removed',
    'message:error',
    'call:initiated',
    'call:incoming',
    'call:answered',
    'call:rejected',
    'call:ended',
    'call:status:updated',
    'webrtc:offer',
    'webrtc:answer',
    'webrtc:ice-candidate',
    'call:error',
  ];

  events.forEach((event) => {
    socketClient.off(event);
  });
};

