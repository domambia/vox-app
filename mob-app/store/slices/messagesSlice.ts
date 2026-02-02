import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  messagingService,
  Message,
  Conversation,
  SendMessageData,
  GetMessagesParams,
  ListConversationsParams,
} from "../../services/api/messagingService";

// Message and Conversation types are imported from messagingService
// MessageAttachment and MessageReaction are also available from messagingService

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

// Async thunks
export const listConversations = createAsyncThunk(
  "messages/listConversations",
  async (params: ListConversationsParams = {}, { rejectWithValue }) => {
    try {
      const response = await messagingService.listConversations(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch conversations",
      );
    }
  },
);

export const getConversation = createAsyncThunk(
  "messages/getConversation",
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const conversation =
        await messagingService.getConversation(conversationId);
      return conversation;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch conversation",
      );
    }
  },
);

export const getMessages = createAsyncThunk(
  "messages/getMessages",
  async (params: GetMessagesParams, { rejectWithValue }) => {
    try {
      const response = await messagingService.getMessages(params);
      return { conversationId: params.conversationId, ...response };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch messages",
      );
    }
  },
);

export const sendMessage = createAsyncThunk(
  "messages/sendMessage",
  async (data: SendMessageData, { rejectWithValue }) => {
    try {
      const message = await messagingService.sendMessage(data);
      return message;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to send message",
      );
    }
  },
);

export const markAsRead = createAsyncThunk(
  "messages/markAsRead",
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await messagingService.markAsRead(conversationId);
      return conversationId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to mark as read",
      );
    }
  },
);

export const editMessage = createAsyncThunk(
  "messages/editMessage",
  async (
    { messageId, content }: { messageId: string; content: string },
    { rejectWithValue },
  ) => {
    try {
      const message = await messagingService.editMessage(messageId, content);
      return message;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to edit message",
      );
    }
  },
);

export const deleteMessage = createAsyncThunk(
  "messages/deleteMessage",
  async (messageId: string, { rejectWithValue }) => {
    try {
      await messagingService.deleteMessage(messageId);
      return messageId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to delete message",
      );
    }
  },
);

export const deleteConversation = createAsyncThunk(
  "messages/deleteConversation",
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await messagingService.deleteConversation(conversationId);
      return conversationId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to delete conversation",
      );
    }
  },
);

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const existingIndex = state.conversations.findIndex(
        (c) => c.conversationId === action.payload.conversationId,
      );
      if (existingIndex >= 0) {
        state.conversations[existingIndex] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    setMessages: (
      state,
      action: PayloadAction<{ conversationId: string; messages: Message[] }>,
    ) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      const conversationId = action.payload.conversationId;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(action.payload);
    },
    setTypingUsers: (
      state,
      action: PayloadAction<{ conversationId: string; userIds: string[] }>,
    ) => {
      state.typingUsers[action.payload.conversationId] = action.payload.userIds;
    },
    setUnreadCount: (
      state,
      action: PayloadAction<{ conversationId: string; count: number }>,
    ) => {
      state.unreadCounts[action.payload.conversationId] = action.payload.count;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // listConversations
      .addCase(listConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        const list = action.payload?.data ?? action.payload?.items ?? action.payload?.conversations ?? [];
        state.conversations = Array.isArray(list) ? list : [];
        list.forEach((conv: any) => {
          const id = conv.conversationId ?? conv.conversation_id;
          const count = conv.unreadCount ?? conv.unread_count;
          if (id != null && count !== undefined) state.unreadCounts[id] = count;
        });
      })
      .addCase(listConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // getConversation
      .addCase(getConversation.fulfilled, (state, action) => {
        const existingIndex = state.conversations.findIndex(
          (c) => c.conversationId === action.payload.conversationId,
        );
        if (existingIndex >= 0) {
          state.conversations[existingIndex] = action.payload;
        } else {
          state.conversations.unshift(action.payload);
        }
        if (action.payload.unreadCount !== undefined) {
          state.unreadCounts[action.payload.conversationId] =
            action.payload.unreadCount;
        }
      })
      // getMessages
      .addCase(getMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        const list = action.payload?.data ?? action.payload?.items ?? action.payload?.messages ?? [];
        state.messages[action.payload.conversationId] = Array.isArray(list) ? list : [];
      })
      .addCase(getMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // sendMessage
      .addCase(sendMessage.fulfilled, (state, action) => {
        const payload = action.payload as any;
        const conversationId = payload.conversationId ?? payload.conversation_id;
        if (conversationId) {
          if (!state.messages[conversationId]) state.messages[conversationId] = [];
          state.messages[conversationId].push(payload);
        }
      })
      // markAsRead
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.unreadCounts[action.payload] = 0;
      })
      // editMessage
      .addCase(editMessage.fulfilled, (state, action) => {
        const conversationId = action.payload.conversationId;
        if (state.messages[conversationId]) {
          const index = state.messages[conversationId].findIndex(
            (m) => m.messageId === action.payload.messageId,
          );
          if (index >= 0) {
            state.messages[conversationId][index] = action.payload;
          }
        }
      })
      // deleteMessage
      .addCase(deleteMessage.fulfilled, (state, action) => {
        // Remove message from all conversations
        Object.keys(state.messages).forEach((conversationId) => {
          state.messages[conversationId] = state.messages[
            conversationId
          ].filter((m) => m.messageId !== action.payload);
        });
      })
      // deleteConversation
      .addCase(deleteConversation.fulfilled, (state, action) => {
        state.conversations = state.conversations.filter(
          (c) => c.conversationId !== action.payload,
        );
        delete state.messages[action.payload];
        delete state.unreadCounts[action.payload];
        delete state.typingUsers[action.payload];
      });
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
