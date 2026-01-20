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
 * @swagger
 * /messages:
 *   post:
 *     summary: Send a message
 *     description: Send a message to another user (creates or uses existing conversation)
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
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               content:
 *                 type: string
 *                 example: "Hello, how are you?"
 *               message_type:
 *                 type: string
 *                 enum: [TEXT, IMAGE, VIDEO, AUDIO, FILE]
 *                 default: TEXT
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
 * /conversations:
 *   get:
 *     summary: List user's conversations
 *     description: Get a paginated list of all conversations for the authenticated user
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Conversations retrieved successfully
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
 *                     conversations:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
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
 * @swagger
 * /conversations/{conversationId}:
 *   get:
 *     summary: Get conversation details
 *     description: Retrieve detailed information about a specific conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a participant)
 *       404:
 *         description: Conversation not found
 */
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
 * @swagger
 * /conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     description: Retrieve messages from a specific conversation with pagination
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a participant)
 *       404:
 *         description: Conversation not found
 */
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
 * @swagger
 * /conversations/{conversationId}/read:
 *   post:
 *     summary: Mark messages as read
 *     description: Mark messages in a conversation as read
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Specific message IDs to mark as read (optional, marks all if not provided)
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a participant)
 *       404:
 *         description: Conversation not found
 */
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
 * @swagger
 * /conversations/{conversationId}:
 *   delete:
 *     summary: Delete conversation
 *     description: Delete a conversation (soft delete, removes it from user's view)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a participant)
 *       404:
 *         description: Conversation not found
 */
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
