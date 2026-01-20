import { z } from 'zod';

// Send message schema
export const sendMessageSchema = z.object({
  body: z.object({
    recipientId: z.string().uuid('Invalid recipient ID format'),
    content: z
      .string()
      .min(1, 'Message content is required')
      .max(5000, 'Message content must be less than 5000 characters'),
    messageType: z.enum(['TEXT', 'VOICE', 'SYSTEM', 'IMAGE', 'FILE']).optional().default('TEXT'),
    attachmentIds: z.array(z.string().uuid()).optional(),
  }),
});

// Get conversation schema
export const getConversationSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid('Invalid conversation ID format'),
  }),
});

// List conversations schema
export const listConversationsSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

// Get messages schema
export const getMessagesSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid('Invalid conversation ID format'),
  }),
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    before: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .optional(),
  }),
});

// Mark as read schema
export const markAsReadSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid('Invalid conversation ID format'),
  }),
  body: z.object({
    messageIds: z.array(z.string().uuid()).optional(),
  }),
});

// Delete conversation schema
export const deleteConversationSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid('Invalid conversation ID format'),
  }),
});

// Edit message schema
export const editMessageSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID format'),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, 'Message content is required')
      .max(5000, 'Message content must be less than 5000 characters'),
  }),
});

// Delete message schema
export const deleteMessageSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID format'),
  }),
});

// Add reaction schema
export const addReactionSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID format'),
  }),
  body: z.object({
    emoji: z.string().min(1, 'Emoji is required').max(10, 'Emoji must be a single emoji'),
  }),
});

// Remove reaction schema
export const removeReactionSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID format'),
  }),
});

// Search messages schema
export const searchMessagesSchema = z.object({
  query: z.object({
    query: z.string().min(1, 'Search query is required'),
    conversationId: z.string().uuid('Invalid conversation ID format').optional(),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

// Mark as delivered schema
export const markAsDeliveredSchema = z.object({
  params: z.object({
    messageId: z.string().uuid('Invalid message ID format'),
  }),
});

