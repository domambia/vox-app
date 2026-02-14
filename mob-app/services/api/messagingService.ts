import { apiClient } from "./apiClient";
import { AxiosResponse } from "axios";

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId?: string;
  content: string;
  messageType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
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
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
  participant?: {
    userId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export interface SendMessageData {
  recipientId: string;
  content: string;
  messageType?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
}

export interface GetMessagesParams {
  conversationId: string;
  page?: number;
  limit?: number;
}

export interface ListConversationsParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class MessagingService {
  /**
   * Send a message
   */
  async sendMessage(data: SendMessageData): Promise<Message> {
    const response: AxiosResponse = await apiClient.post("/messages", data);
    return response.data.data;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const response: AxiosResponse = await apiClient.get(
      `/conversations/${conversationId}`,
    );
    return response.data.data;
  }

  /**
   * List conversations
   * GET /api/v1/conversations
   */
  async listConversations(
    params?: ListConversationsParams,
  ): Promise<PaginatedResponse<Conversation>> {
    const queryParams = new URLSearchParams();
    const limit = params?.limit;
    const page = params?.page;
    if (limit) queryParams.append("limit", limit.toString());
    if (page && limit)
      queryParams.append("offset", ((page - 1) * limit).toString());

    const url = `/conversations${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    // Backend returns { items, pagination }
    const items = data?.items ?? data?.conversations ?? data?.data ?? [];
    const pagination = data?.pagination ?? {
      page: 1,
      limit: 20,
      total: items.length,
      totalPages: 1,
    };
    return { data: items, pagination };
  }

  /**
   * Get messages for a conversation
   * GET /api/v1/conversations/:conversationId/messages
   */
  async getMessages(
    params: GetMessagesParams,
  ): Promise<PaginatedResponse<Message>> {
    const queryParams = new URLSearchParams();
    const limit = params.limit;
    const page = params.page;
    if (limit) queryParams.append("limit", limit.toString());
    if (page && limit)
      queryParams.append("offset", ((page - 1) * limit).toString());

    const url = `/conversations/${params.conversationId}/messages${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    // Backend returns { items, pagination }
    const items = data?.items ?? data?.messages ?? data?.data ?? [];
    const pagination = data?.pagination ?? {
      page: 1,
      limit: 20,
      total: items.length,
      totalPages: 1,
    };
    return { data: items, pagination };
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/read`);
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, content: string): Promise<Message> {
    const response: AxiosResponse = await apiClient.put(
      `/messages/${messageId}`,
      { content },
    );
    return response.data.data;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/messages/${messageId}`);
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    messageId: string,
    emoji: string,
  ): Promise<MessageReaction> {
    const response: AxiosResponse = await apiClient.post(
      `/messages/${messageId}/reactions`,
      { emoji },
    );
    return response.data.data;
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(messageId: string, reactionId: string): Promise<void> {
    await apiClient.delete(`/messages/${messageId}/reactions`);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/conversations/${conversationId}`);
  }
}

export const messagingService = new MessagingService();
