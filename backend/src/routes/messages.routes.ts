import { Router } from 'express';
import messagingController from '@/controllers/messaging.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  addReactionSchema,
  removeReactionSchema,
  searchMessagesSchema,
  markAsDeliveredSchema,
} from '@/validations/messaging.validation';
import { authenticate } from '@/middleware/auth.middleware';
import { uploadMessageAttachment } from '@/utils/fileUpload';

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
 * @route   PUT /api/v1/messages/:messageId
 * @desc    Edit a message
 * @access  Private (Authenticated)
 */
router.put(
  '/:messageId',
  authenticate,
  validate(editMessageSchema),
  messagingController.editMessage.bind(messagingController)
);

/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Delete a message
 * @access  Private (Authenticated)
 */
router.delete(
  '/:messageId',
  authenticate,
  validate(deleteMessageSchema),
  messagingController.deleteMessage.bind(messagingController)
);

/**
 * @route   POST /api/v1/messages/:messageId/reactions
 * @desc    Add reaction to a message
 * @access  Private (Authenticated)
 */
router.post(
  '/:messageId/reactions',
  authenticate,
  validate(addReactionSchema),
  messagingController.addReaction.bind(messagingController)
);

/**
 * @route   DELETE /api/v1/messages/:messageId/reactions
 * @desc    Remove reaction from a message
 * @access  Private (Authenticated)
 */
router.delete(
  '/:messageId/reactions',
  authenticate,
  validate(removeReactionSchema),
  messagingController.removeReaction.bind(messagingController)
);

/**
 * @route   GET /api/v1/messages/search
 * @desc    Search messages
 * @access  Private (Authenticated)
 */
router.get(
  '/search',
  authenticate,
  validate(searchMessagesSchema),
  messagingController.searchMessages.bind(messagingController)
);

/**
 * @route   POST /api/v1/messages/:messageId/delivered
 * @desc    Mark message as delivered
 * @access  Private (Authenticated)
 */
router.post(
  '/:messageId/delivered',
  authenticate,
  validate(markAsDeliveredSchema),
  messagingController.markAsDelivered.bind(messagingController)
);

/**
 * @route   POST /api/v1/messages/attachments
 * @desc    Upload message attachment
 * @access  Private (Authenticated)
 */
router.post(
  '/attachments',
  authenticate,
  uploadMessageAttachment,
  messagingController.uploadAttachment.bind(messagingController)
);

/**
 * @route   GET /api/v1/messages/unread-count
 * @desc    Get unread message count
 * @access  Private (Authenticated)
 */
router.get(
  '/unread-count',
  authenticate,
  messagingController.getUnreadCount.bind(messagingController)
);

export default router;

