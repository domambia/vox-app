import { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import messagingService from '@/services/messaging.service';
import { AuthRequest } from '@/types';
import { extractPaginationFromQuery } from '@/utils/pagination';

export class MessagingController {
  /**
   * Send a message
   * POST /api/v1/messages
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const senderId = req.user!.userId;
      const data = req.body;

      const message = await messagingService.sendMessage(senderId, data);
      sendSuccess(res, message, 201);
    } catch (error: any) {
      if (error.message === 'User not found') {
        sendError(res, 'USER_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'MESSAGE_SEND_ERROR', error.message || 'Failed to send message', 400);
    }
  }

  /**
   * Get conversation
   * GET /api/v1/conversations/:conversationId
   */
  async getConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;

      const conversation = await messagingService.getConversation(conversationId, userId);
      sendSuccess(res, conversation);
    } catch (error: any) {
      if (error.message === 'Conversation not found') {
        sendError(res, 'CONVERSATION_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Unauthorized access to conversation') {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'CONVERSATION_FETCH_ERROR', error.message || 'Failed to fetch conversation', 400);
    }
  }

  /**
   * List conversations
   * GET /api/v1/conversations
   */
  async listConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { limit, offset } = extractPaginationFromQuery(req.query);

      const result = await messagingService.listConversations(userId, { limit, offset });
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'CONVERSATIONS_LIST_ERROR', error.message || 'Failed to list conversations', 400);
    }
  }

  /**
   * Get messages for a conversation
   * GET /api/v1/conversations/:conversationId/messages
   */
  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;
      const { limit, offset } = extractPaginationFromQuery(req.query);
      const before = req.query.before ? new Date(req.query.before as string) : undefined;

      const result = await messagingService.getMessages(conversationId, userId, {
        limit,
        offset,
        before,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Conversation not found') {
        sendError(res, 'CONVERSATION_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Unauthorized access to conversation') {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'MESSAGES_FETCH_ERROR', error.message || 'Failed to fetch messages', 400);
    }
  }

  /**
   * Mark messages as read
   * POST /api/v1/conversations/:conversationId/read
   */
  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;
      const { messageIds } = req.body;

      const result = await messagingService.markAsRead(conversationId, userId, messageIds);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Conversation not found') {
        sendError(res, 'CONVERSATION_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Unauthorized access to conversation') {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'MARK_READ_ERROR', error.message || 'Failed to mark messages as read', 400);
    }
  }

  /**
   * Get unread message count
   * GET /api/v1/messages/unread-count
   */
  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const result = await messagingService.getUnreadCount(userId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'UNREAD_COUNT_ERROR', error.message || 'Failed to get unread count', 400);
    }
  }

  /**
   * Delete conversation
   * DELETE /api/v1/conversations/:conversationId
   */
  async deleteConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;

      const result = await messagingService.deleteConversation(conversationId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Conversation not found') {
        sendError(res, 'CONVERSATION_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Unauthorized access to conversation') {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'CONVERSATION_DELETE_ERROR', error.message || 'Failed to delete conversation', 400);
    }
  }

  /**
   * Edit a message
   * PUT /api/v1/messages/:messageId
   */
  async editMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;
      const { content } = req.body;

      const message = await messagingService.editMessage(messageId, userId, { content });
      sendSuccess(res, message);
    } catch (error: any) {
      if (error.message === 'Message not found') {
        sendError(res, 'MESSAGE_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('Unauthorized')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'MESSAGE_EDIT_ERROR', error.message || 'Failed to edit message', 400);
    }
  }

  /**
   * Delete a message
   * DELETE /api/v1/messages/:messageId
   */
  async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;

      const result = await messagingService.deleteMessage(messageId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Message not found') {
        sendError(res, 'MESSAGE_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('Unauthorized')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'MESSAGE_DELETE_ERROR', error.message || 'Failed to delete message', 400);
    }
  }

  /**
   * Add reaction to a message
   * POST /api/v1/messages/:messageId/reactions
   */
  async addReaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;
      const { emoji } = req.body;

      const reaction = await messagingService.addReaction(messageId, userId, emoji);
      sendSuccess(res, reaction, 201);
    } catch (error: any) {
      if (error.message === 'Message not found') {
        sendError(res, 'MESSAGE_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('Unauthorized')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'REACTION_ADD_ERROR', error.message || 'Failed to add reaction', 400);
    }
  }

  /**
   * Remove reaction from a message
   * DELETE /api/v1/messages/:messageId/reactions
   */
  async removeReaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;

      const result = await messagingService.removeReaction(messageId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Reaction not found') {
        sendError(res, 'REACTION_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'REACTION_REMOVE_ERROR', error.message || 'Failed to remove reaction', 400);
    }
  }

  /**
   * Search messages
   * GET /api/v1/messages/search
   */
  async searchMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { query, conversationId, limit, offset } = req.query;

      if (!query || typeof query !== 'string') {
        sendError(res, 'INVALID_QUERY', 'Search query is required', 400);
        return;
      }

      const result = await messagingService.searchMessages(userId, {
        query,
        conversationId: conversationId as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Conversation not found') {
        sendError(res, 'CONVERSATION_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('Unauthorized')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'MESSAGE_SEARCH_ERROR', error.message || 'Failed to search messages', 400);
    }
  }

  /**
   * Mark message as delivered
   * POST /api/v1/messages/:messageId/delivered
   */
  async markAsDelivered(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user!.userId;

      const result = await messagingService.markAsDelivered(messageId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Message not found') {
        sendError(res, 'MESSAGE_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message.includes('Unauthorized') || error.message.includes('Cannot mark')) {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'MARK_DELIVERED_ERROR', error.message || 'Failed to mark as delivered', 400);
    }
  }

  /**
   * Upload message attachment
   * POST /api/v1/messages/attachments
   */
  async uploadAttachment(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 'NO_FILE', 'No file uploaded', 400);
        return;
      }

      const fileUrl = `/api/${process.env.API_VERSION || 'v1'}/files/messages/${req.file.filename}`;

      sendSuccess(res, {
        attachment_id: req.file.filename, // Temporary ID, will be replaced when message is created
        file_url: fileUrl,
        file_type: req.file.mimetype,
        file_name: req.file.originalname,
        file_size: req.file.size,
      }, 201);
    } catch (error: any) {
      sendError(res, 'ATTACHMENT_UPLOAD_ERROR', error.message || 'Failed to upload attachment', 400);
    }
  }
}

// Export singleton instance
const messagingController = new MessagingController();
export default messagingController;

