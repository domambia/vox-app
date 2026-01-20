import prisma from '@/config/database';
import { logger } from '@/utils/logger';
import { Prisma, MessageType } from '@prisma/client';
import {
  normalizePagination,
  createPaginatedResponse,
  getPaginationMetadata,
} from '@/utils/pagination';

export interface SendMessageInput {
  recipientId: string;
  content: string;
  messageType?: MessageType;
  attachmentIds?: string[];
}

export interface EditMessageInput {
  content: string;
}

export interface SearchMessagesParams {
  query: string;
  conversationId?: string;
  limit?: number;
  offset?: number;
}

export interface ListConversationsParams {
  limit?: number;
  offset?: number;
}

export interface GetMessagesParams {
  limit?: number;
  offset?: number;
  before?: Date;
}

export class MessagingService {
  /**
   * Get or create conversation between two users
   */
  async getOrCreateConversation(userId1: string, userId2: string) {
    try {
      // Ensure consistent ordering
      const [userAId, userBId] = [userId1, userId2].sort();

      // Check if conversation exists
      let conversation = await prisma.conversation.findUnique({
        where: {
          user_a_id_user_b_id: {
            user_a_id: userAId,
            user_b_id: userBId,
          },
        },
        include: {
          user_a: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
              profile: {
                select: {
                  profile_id: true,
                  bio: true,
                },
              },
            },
          },
          user_b: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
              profile: {
                select: {
                  profile_id: true,
                  bio: true,
                },
              },
            },
          },
        },
      });

      // Create if doesn't exist
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            user_a_id: userAId,
            user_b_id: userBId,
          },
          include: {
            user_a: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                phone_number: true,
                verified: true,
                profile: {
                  select: {
                    profile_id: true,
                    bio: true,
                  },
                },
              },
            },
            user_b: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                phone_number: true,
                verified: true,
                profile: {
                  select: {
                    profile_id: true,
                    bio: true,
                  },
                },
              },
            },
          },
        });

        logger.info(`Conversation created between ${userAId} and ${userBId}`);
      }

      // Return with other user info
      const otherUser = conversation.user_a_id === userId1 ? conversation.user_b : conversation.user_a;

      return {
        conversation_id: conversation.conversation_id,
        other_user: otherUser,
        last_message_at: conversation.last_message_at,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
      };
    } catch (error) {
      logger.error('Error getting or creating conversation', error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(senderId: string, data: SendMessageInput) {
    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(senderId, data.recipientId);

      // Create message
      const message = await prisma.message.create({
        data: {
          conversation_id: conversation.conversation_id,
          sender_id: senderId,
          content: data.content,
          message_type: data.messageType || 'TEXT',
        },
        include: {
          sender: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          attachments: true,
        },
      });

      // Link attachments if provided (attachments should be pre-created via upload endpoint)
      if (data.attachmentIds && data.attachmentIds.length > 0) {
        await prisma.messageAttachment.updateMany({
          where: {
            attachment_id: { in: data.attachmentIds },
          },
          data: {
            message_id: message.message_id,
          },
        });
      }

      // Update conversation last_message_at
      await prisma.conversation.update({
        where: { conversation_id: conversation.conversation_id },
        data: { last_message_at: new Date() },
      });

      logger.info(`Message sent: ${message.message_id} from ${senderId} to ${data.recipientId}`);

      return {
        ...message,
        conversation_id: conversation.conversation_id,
        recipient_id: data.recipientId,
      };
    } catch (error) {
      logger.error('Error sending message', error);
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string, userId: string) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { conversation_id: conversationId },
        include: {
          user_a: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
              profile: {
                select: {
                  profile_id: true,
                  bio: true,
                },
              },
            },
          },
          user_b: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
              profile: {
                select: {
                  profile_id: true,
                  bio: true,
                },
              },
            },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Verify user is part of conversation
      if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
        throw new Error('Unauthorized access to conversation');
      }

      // Get other user
      const otherUser = conversation.user_a_id === userId ? conversation.user_b : conversation.user_a;

      // Get unread count
      const unreadCount = await prisma.message.count({
        where: {
          conversation_id: conversationId,
          sender_id: { not: userId },
          read_at: null,
        },
      });

      return {
        conversation_id: conversation.conversation_id,
        other_user: otherUser,
        last_message_at: conversation.last_message_at,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        unread_count: unreadCount,
      };
    } catch (error) {
      logger.error('Error getting conversation', error);
      throw error;
    }
  }

  /**
   * List user's conversations
   */
  async listConversations(userId: string, params: ListConversationsParams) {
    try {
      const { limit, offset } = normalizePagination(params.limit, params.offset);

      // Get conversations where user is participant
      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [
            { user_a_id: userId },
            { user_b_id: userId },
          ],
        },
        orderBy: {
          last_message_at: { sort: 'desc', nulls: 'last' },
        },
        take: limit,
        skip: offset,
        include: {
          user_a: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
              profile: {
                select: {
                  profile_id: true,
                  bio: true,
                },
              },
            },
          },
          user_b: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
              profile: {
                select: {
                  profile_id: true,
                  bio: true,
                },
              },
            },
          },
          messages: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              message_id: true,
              content: true,
              message_type: true,
              created_at: true,
            },
          },
        },
      });

      // Get total count
      const total = await prisma.conversation.count({
        where: {
          OR: [
            { user_a_id: userId },
            { user_b_id: userId },
          ],
        },
      });

      // Transform conversations
      const transformedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const otherUser = conv.user_a_id === userId ? conv.user_b : conv.user_a;
          const lastMessage = conv.messages[0] || null;

          // Get unread count
          const unreadCount = await prisma.message.count({
            where: {
              conversation_id: conv.conversation_id,
              sender_id: { not: userId },
              read_at: null,
            },
          });

          return {
            conversation_id: conv.conversation_id,
            other_user: otherUser,
            last_message: lastMessage,
            last_message_at: conv.last_message_at,
            unread_count: unreadCount,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
          };
        })
      );

      const pagination = getPaginationMetadata(total, limit, offset);

      return {
        ...createPaginatedResponse(transformedConversations, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error listing conversations', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, userId: string, params: GetMessagesParams) {
    try {
      // Verify user is part of conversation
      const conversation = await prisma.conversation.findUnique({
        where: { conversation_id: conversationId },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
        throw new Error('Unauthorized access to conversation');
      }

      const { limit, offset } = normalizePagination(params.limit, params.offset);
      const { before } = params;

      // Build where clause
      const where: Prisma.MessageWhereInput = {
        conversation_id: conversationId,
      };

      if (before) {
        where.created_at = { lt: before };
      }

      // Get total count
      const total = await prisma.message.count({ where });

      // Get messages
      const messages = await prisma.message.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          sender: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          attachments: true,
          reactions: {
            include: {
              user: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      });

      // Reverse to get chronological order
      messages.reverse();

      const pagination = getPaginationMetadata(total, limit, offset);

      return {
        ...createPaginatedResponse(messages, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error getting messages', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string, messageIds?: string[]) {
    try {
      // Verify user is part of conversation
      const conversation = await prisma.conversation.findUnique({
        where: { conversation_id: conversationId },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
        throw new Error('Unauthorized access to conversation');
      }

      // Build where clause
      const where: Prisma.MessageWhereInput = {
        conversation_id: conversationId,
        sender_id: { not: userId }, // Only mark messages from other user as read
        read_at: null,
      };

      if (messageIds && messageIds.length > 0) {
        where.message_id = { in: messageIds };
      }

      // Update messages
      const result = await prisma.message.updateMany({
        where,
        data: {
          read_at: new Date(),
        },
      });

      logger.info(`Marked ${result.count} messages as read in conversation ${conversationId}`);

      return { count: result.count };
    } catch (error) {
      logger.error('Error marking messages as read', error);
      throw error;
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string) {
    try {
      const count = await prisma.message.count({
        where: {
          conversation: {
            OR: [
              { user_a_id: userId },
              { user_b_id: userId },
            ],
          },
          sender_id: { not: userId },
          read_at: null,
        },
      });

      return { unread_count: count };
    } catch (error) {
      logger.error('Error getting unread count', error);
      throw error;
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string, userId: string) {
    try {
      // Verify user is part of conversation
      const conversation = await prisma.conversation.findUnique({
        where: { conversation_id: conversationId },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
        throw new Error('Unauthorized access to conversation');
      }

      // Delete conversation (cascade will delete messages)
      await prisma.conversation.delete({
        where: { conversation_id: conversationId },
      });

      logger.info(`Conversation ${conversationId} deleted by user ${userId}`);

      return { message: 'Conversation deleted successfully' };
    } catch (error) {
      logger.error('Error deleting conversation', error);
      throw error;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, userId: string, data: EditMessageInput) {
    try {
      // Get message
      const message = await prisma.message.findUnique({
        where: { message_id: messageId },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Verify user is the sender
      if (message.sender_id !== userId) {
        throw new Error('Unauthorized: Only the sender can edit this message');
      }

      // Check if message is deleted
      if (message.is_deleted) {
        throw new Error('Cannot edit deleted message');
      }

      // Update message
      const updatedMessage = await prisma.message.update({
        where: { message_id: messageId },
        data: {
          content: data.content,
          edited_at: new Date(),
        },
        include: {
          sender: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          attachments: true,
          reactions: {
            include: {
              user: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Message ${messageId} edited by user ${userId}`);

      return updatedMessage;
    } catch (error) {
      logger.error('Error editing message', error);
      throw error;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string) {
    try {
      // Get message
      const message = await prisma.message.findUnique({
        where: { message_id: messageId },
        include: {
          conversation: true,
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Verify user is the sender or part of conversation
      if (message.sender_id !== userId) {
        const conversation = message.conversation;
        if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
          throw new Error('Unauthorized access to message');
        }
      }

      // Soft delete message
      const deletedMessage = await prisma.message.update({
        where: { message_id: messageId },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          content: '[Message deleted]', // Optionally clear content
        },
      });

      logger.info(`Message ${messageId} deleted by user ${userId}`);

      return deletedMessage;
    } catch (error) {
      logger.error('Error deleting message', error);
      throw error;
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(messageId: string, userId: string, emoji: string) {
    try {
      // Verify message exists and user has access
      const message = await prisma.message.findUnique({
        where: { message_id: messageId },
        include: {
          conversation: true,
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Verify user is part of conversation
      const conversation = message.conversation;
      if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
        throw new Error('Unauthorized access to message');
      }

      // Add or update reaction (upsert)
      const reaction = await prisma.messageReaction.upsert({
        where: {
          message_id_user_id: {
            message_id: messageId,
            user_id: userId,
          },
        },
        create: {
          message_id: messageId,
          user_id: userId,
          emoji,
        },
        update: {
          emoji,
        },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      logger.info(`Reaction added to message ${messageId} by user ${userId}`);

      return reaction;
    } catch (error) {
      logger.error('Error adding reaction', error);
      throw error;
    }
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(messageId: string, userId: string) {
    try {
      // Verify reaction exists
      const reaction = await prisma.messageReaction.findUnique({
        where: {
          message_id_user_id: {
            message_id: messageId,
            user_id: userId,
          },
        },
      });

      if (!reaction) {
        throw new Error('Reaction not found');
      }

      // Delete reaction
      await prisma.messageReaction.delete({
        where: {
          message_id_user_id: {
            message_id: messageId,
            user_id: userId,
          },
        },
      });

      logger.info(`Reaction removed from message ${messageId} by user ${userId}`);

      return { message: 'Reaction removed successfully' };
    } catch (error) {
      logger.error('Error removing reaction', error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(userId: string, params: SearchMessagesParams) {
    try {
      const { limit, offset } = normalizePagination(params.limit, params.offset);

      // Build where clause
      const where: Prisma.MessageWhereInput = {
        is_deleted: false,
        OR: [
          // Messages in conversations where user is participant
          {
            conversation: {
              OR: [
                { user_a_id: userId },
                { user_b_id: userId },
              ],
            },
          },
        ],
        // Text search (using contains for now, can be enhanced with PostgreSQL full-text search)
        content: {
          contains: params.query,
          mode: 'insensitive',
        },
      };

      // Filter by conversation if provided
      if (params.conversationId) {
        // Verify user has access to conversation
        const conversation = await prisma.conversation.findUnique({
          where: { conversation_id: params.conversationId },
        });

        if (!conversation) {
          throw new Error('Conversation not found');
        }

        if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
          throw new Error('Unauthorized access to conversation');
        }

        where.conversation_id = params.conversationId;
      }

      // Get total count
      const total = await prisma.message.count({ where });

      // Get messages
      const messages = await prisma.message.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          sender: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
          conversation: {
            select: {
              conversation_id: true,
              user_a_id: true,
              user_b_id: true,
            },
          },
          attachments: true,
          reactions: {
            include: {
              user: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      });

      const pagination = getPaginationMetadata(total, limit, offset);

      return {
        ...createPaginatedResponse(messages, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error searching messages', error);
      throw error;
    }
  }

  /**
   * Mark message as delivered
   */
  async markAsDelivered(messageId: string, userId: string) {
    try {
      // Get message
      const message = await prisma.message.findUnique({
        where: { message_id: messageId },
        include: {
          conversation: true,
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Verify user is the recipient (not the sender)
      if (message.sender_id === userId) {
        throw new Error('Cannot mark own message as delivered');
      }

      // Verify user is part of conversation
      const conversation = message.conversation;
      if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
        throw new Error('Unauthorized access to message');
      }

      // Update delivered_at if not already set
      if (!message.delivered_at) {
        await prisma.message.update({
          where: { message_id: messageId },
          data: { delivered_at: new Date() },
        });
      }

      return { message: 'Message marked as delivered' };
    } catch (error) {
      logger.error('Error marking message as delivered', error);
      throw error;
    }
  }

  /**
   * Create message attachment
   */
  async createAttachment(
    messageId: string,
    fileUrl: string,
    fileType: string,
    fileName: string,
    fileSize: number
  ) {
    try {
      const attachment = await prisma.messageAttachment.create({
        data: {
          message_id: messageId,
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName,
          file_size: fileSize,
        },
      });

      return attachment;
    } catch (error) {
      logger.error('Error creating attachment', error);
      throw error;
    }
  }
}

// Export singleton instance
const messagingService = new MessagingService();
export default messagingService;

