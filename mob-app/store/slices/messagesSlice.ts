import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'VOICE' | 'IMAGE' | 'FILE' | 'SYSTEM';
  readAt?: string;
  deliveredAt?: string;
  editedAt?: string;
  deletedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
}

export interface MessageAttachment {
  attachmentId: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface MessageReaction {
  reactionId: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Conversation {
  conversationId: string;
  userAId: string;
  userBId: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagesState {
  conversations: Conversation[];
  messages: Record<string, Message[]>; // conversationId -> messages
  unreadCounts: Record<string, number>; // conversationId -> count
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  isLoading: boolean;
  error: string | null;
}

const initialState: MessagesState = {
  conversations: [],
  messages: {},
  unreadCounts: {},
  typingUsers: {},
  isLoading: false,
  error: null,
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const existingIndex = state.conversations.findIndex(
        c => c.conversationId === action.payload.conversationId
      );
      if (existingIndex >= 0) {
        state.conversations[existingIndex] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      const conversationId = action.payload.conversationId;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(action.payload);
    },
    setTypingUsers: (state, action: PayloadAction<{ conversationId: string; userIds: string[] }>) => {
      state.typingUsers[action.payload.conversationId] = action.payload.userIds;
    },
    setUnreadCount: (state, action: PayloadAction<{ conversationId: string; count: number }>) => {
      state.unreadCounts[action.payload.conversationId] = action.payload.count;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setConversations,
  addConversation,
  setMessages,
  addMessage,
  setTypingUsers,
  setUnreadCount,
  setError,
  setLoading,
} = messagesSlice.actions;
export default messagesSlice.reducer;
