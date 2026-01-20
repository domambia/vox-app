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
 * @swagger
 * /messages:
 *   post:
 *     summary: Send a message
 *     description: Send a message to another user (duplicate endpoint for messaging)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient_id
 *               - content
 *             properties:
 *               recipient_id:
 *                 type: string
 *                 format: uuid
 *               content:
 *                 type: string
 *               message_type:
 *                 type: string
 *                 enum: [TEXT, IMAGE, VIDEO, AUDIO, FILE]
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
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
 * @swagger
 * /messages/{messageId}:
 *   put:
 *     summary: Edit a message
 *     description: Edit a message that you sent (message sender only)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Updated message content"
 *     responses:
 *       200:
 *         description: Message edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not the message sender)
 *       404:
 *         description: Message not found
 */
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
 * @swagger
 * /messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     description: Delete a message that you sent (message sender only)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not the message sender)
 *       404:
 *         description: Message not found
 */
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
 * @swagger
 * /messages/{messageId}/reactions:
 *   post:
 *     summary: Add reaction to a message
 *     description: Add an emoji reaction to a message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error or reaction already exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 */
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
 * @swagger
 * /messages/{messageId}/reactions:
 *   delete:
 *     summary: Remove reaction from a message
 *     description: Remove your reaction from a message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reaction removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: No reaction found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 */
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
 * @swagger
 * /messages/search:
 *   get:
 *     summary: Search messages
 *     description: Search for messages across conversations
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: conversation_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Limit search to specific conversation
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
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
 * @swagger
 * /messages/{messageId}/delivered:
 *   post:
 *     summary: Mark message as delivered
 *     description: Mark a message as delivered (typically called automatically)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message marked as delivered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 */
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
 * @swagger
 * /messages/attachments:
 *   post:
 *     summary: Upload message attachment
 *     description: Upload a file attachment for a message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *     responses:
 *       200:
 *         description: Attachment uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     file_url:
 *                       type: string
 *                       example: "/api/v1/files/messages/filename.jpg"
 *       400:
 *         description: Validation error or invalid file
 *       401:
 *         description: Unauthorized
 */
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
 * @swagger
 * /messages/unread-count:
 *   get:
 *     summary: Get unread message count
 *     description: Get the total count of unread messages for the authenticated user
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     unread_count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized
 */
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
