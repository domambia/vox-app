import { Router } from 'express';
import messagingController from '@/controllers/messaging.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  sendMessageSchema,
  getConversationSchema,
  listConversationsSchema,
  getMessagesSchema,
  markAsReadSchema,
  deleteConversationSchema,
} from '@/validations/messaging.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/messages
 * @desc    Send a message
 * @access  Private (Authenticated)
 */
router.post(
  '/',
  authenticate,
  validate(sendMessageSchema),
  messagingController.sendMessage.bind(messagingController)
);

/**
 * @route   GET /api/v1/conversations
 * @desc    List user's conversations
 * @access  Private (Authenticated)
 */
router.get(
  '/',
  authenticate,
  validate(listConversationsSchema),
  messagingController.listConversations.bind(messagingController)
);

/**
 * @route   GET /api/v1/conversations/:conversationId
 * @desc    Get conversation details
 * @access  Private (Authenticated)
 */
router.get(
  '/:conversationId',
  authenticate,
  validate(getConversationSchema),
  messagingController.getConversation.bind(messagingController)
);

/**
 * @route   GET /api/v1/conversations/:conversationId/messages
 * @desc    Get messages for a conversation
 * @access  Private (Authenticated)
 */
router.get(
  '/:conversationId/messages',
  authenticate,
  validate(getMessagesSchema),
  messagingController.getMessages.bind(messagingController)
);

/**
 * @route   POST /api/v1/conversations/:conversationId/read
 * @desc    Mark messages as read
 * @access  Private (Authenticated)
 */
router.post(
  '/:conversationId/read',
  authenticate,
  validate(markAsReadSchema),
  messagingController.markAsRead.bind(messagingController)
);

/**
 * @route   DELETE /api/v1/conversations/:conversationId
 * @desc    Delete conversation
 * @access  Private (Authenticated)
 */
router.delete(
  '/:conversationId',
  authenticate,
  validate(deleteConversationSchema),
  messagingController.deleteConversation.bind(messagingController)
);

export default router;

