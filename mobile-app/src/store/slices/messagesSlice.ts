import { createSlice } from '@reduxjs/toolkit';
import { Conversation, Message } from '../../types/models.types';

interface MessagesState {
  conversations: Conversation[];
  messages: Record<string, Message[]>; // conversationId -> messages
  typingIndicators: Record<string, string[]>; // conversationId -> userIds typing
  unreadCounts: Record<string, number>; // conversationId -> count
  isLoading: boolean;
  error: string | null;
  offlineQueue: Message[]; // Messages to send when online
}

const initialState: MessagesState = {
  conversations: [],
  messages: {},
  typingIndicators: {},
  unreadCounts: {},
  isLoading: false,
  error: null,
  offlineQueue: [],
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action) => {
      const existingIndex = state.conversations.findIndex(
        (c) => c.conversationId === action.payload.conversationId
      );
      if (existingIndex >= 0) {
        state.conversations[existingIndex] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    setMessages: (state, action: { payload: { conversationId: string; messages: Message[] } }) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (state, action: { payload: { conversationId: string; message: Message } }) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    },
    updateMessage: (state, action: { payload: { conversationId: string; messageId: string; updates: Partial<Message> } }) => {
      const { conversationId, messageId, updates } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const index = messages.findIndex((m) => m.messageId === messageId);
        if (index >= 0) {
          messages[index] = { ...messages[index], ...updates };
        }
      }
    },
    setTypingIndicator: (state, action: { payload: { conversationId: string; userId: string; isTyping: boolean } }) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typingIndicators[conversationId]) {
        state.typingIndicators[conversationId] = [];
      }
      if (isTyping) {
        if (!state.typingIndicators[conversationId].includes(userId)) {
          state.typingIndicators[conversationId].push(userId);
        }
      } else {
        state.typingIndicators[conversationId] = state.typingIndicators[conversationId].filter((id) => id !== userId);
      }
    },
    setUnreadCount: (state, action: { payload: { conversationId: string; count: number } }) => {
      state.unreadCounts[action.payload.conversationId] = action.payload.count;
    },
    addToOfflineQueue: (state, action) => {
      state.offlineQueue.push(action.payload);
    },
    clearOfflineQueue: (state) => {
      state.offlineQueue = [];
    },
    clearMessages: (state) => {
      state.conversations = [];
      state.messages = {};
      state.typingIndicators = {};
      state.unreadCounts = {};
      state.offlineQueue = [];
    },
  },
});

export const {
  setConversations,
  addConversation,
  setMessages,
  addMessage,
  updateMessage,
  setTypingIndicator,
  setUnreadCount,
  addToOfflineQueue,
  clearOfflineQueue,
  clearMessages,
} = messagesSlice.actions;
export default messagesSlice.reducer;

