import { Router } from 'express';
import voiceCallController from '@/controllers/voiceCall.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  initiateCallSchema,
  updateCallStatusSchema,
  endCallSchema,
  getCallSchema,
  getCallHistorySchema,
} from '@/validations/voiceCall.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /calls/initiate:
 *   post:
 *     summary: Initiate a voice call
 *     description: Start a new voice call with another user
 *     tags: [Voice Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiver_id
 *             properties:
 *               receiver_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: Call initiated successfully
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
 *                     call_id:
 *                       type: string
 *                       format: uuid
 *                     receiver_id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [PENDING, ANSWERED, REJECTED, ENDED, MISSED]
 *                       example: "PENDING"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   POST /api/v1/calls/initiate
 * @desc    Initiate a voice call
 * @access  Private (Authenticated)
 */
router.post(
  '/initiate',
  authenticate,
  validate(initiateCallSchema),
  voiceCallController.initiateCall.bind(voiceCallController)
);

/**
 * @swagger
 * /calls/{callId}/status:
 *   put:
 *     summary: Update call status
 *     description: Update the status of an active call
 *     tags: [Voice Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Call ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, ANSWERED, REJECTED, ENDED, MISSED]
 *                 example: "ANSWERED"
 *     responses:
 *       200:
 *         description: Call status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error or invalid status transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a participant)
 *       404:
 *         description: Call not found
 */
/**
 * @route   PUT /api/v1/calls/:callId/status
 * @desc    Update call status
 * @access  Private (Authenticated)
 */
router.put(
  '/:callId/status',
  authenticate,
  validate(updateCallStatusSchema),
  voiceCallController.updateCallStatus.bind(voiceCallController)
);

/**
 * @swagger
 * /calls/{callId}/end:
 *   post:
 *     summary: End a call
 *     description: End an active call
 *     tags: [Voice Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Call ended successfully
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
 *                     call_id:
 *                       type: string
 *                       format: uuid
 *                     duration:
 *                       type: integer
 *                       description: Call duration in seconds
 *                     ended_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a participant)
 *       404:
 *         description: Call not found
 */
/**
 * @route   POST /api/v1/calls/:callId/end
 * @desc    End a call
 * @access  Private (Authenticated)
 */
router.post(
  '/:callId/end',
  authenticate,
  validate(endCallSchema),
  voiceCallController.endCall.bind(voiceCallController)
);

/**
 * @swagger
 * /calls/history:
 *   get:
 *     summary: Get call history
 *     description: Retrieve call history for the authenticated user
 *     tags: [Voice Calls]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ANSWERED, REJECTED, ENDED, MISSED]
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Call history retrieved successfully
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
 *                     calls:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   GET /api/v1/calls/history
 * @desc    Get call history
 * @access  Private (Authenticated)
 */
router.get(
  '/history',
  authenticate,
  validate(getCallHistorySchema),
  voiceCallController.getCallHistory.bind(voiceCallController)
);

/**
 * @swagger
 * /calls/{callId}:
 *   get:
 *     summary: Get call by ID
 *     description: Retrieve detailed information about a specific call
 *     tags: [Voice Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Call ID
 *     responses:
 *       200:
 *         description: Call retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a participant)
 *       404:
 *         description: Call not found
 */
/**
 * @route   GET /api/v1/calls/:callId
 * @desc    Get call by ID
 * @access  Private (Authenticated)
 */
router.get(
  '/:callId',
  authenticate,
  validate(getCallSchema),
  voiceCallController.getCall.bind(voiceCallController)
);

/**
 * @swagger
 * /calls/webrtc-config:
 *   get:
 *     summary: Get WebRTC configuration
 *     description: Get STUN/TURN server configuration for WebRTC calls
 *     tags: [Voice Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WebRTC configuration retrieved successfully
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
 *                     stun_servers:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["stun:stun.l.google.com:19302"]
 *                     turn_server:
 *                       type: string
 *                       example: "turn:turn.example.com:3478"
 *                     turn_username:
 *                       type: string
 *                     turn_credential:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   GET /api/v1/calls/webrtc-config
 * @desc    Get WebRTC configuration (STUN/TURN servers)
 * @access  Private (Authenticated)
 */
router.get(
  '/webrtc-config',
  authenticate,
  voiceCallController.getWebRTCConfig.bind(voiceCallController)
);

/**
 * @swagger
 * /calls/{callId}/room:
 *   get:
 *     summary: Get call room name
 *     description: Get the WebRTC signaling room name for a call
 *     tags: [Voice Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Call ID
 *     responses:
 *       200:
 *         description: Room name retrieved successfully
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
 *                     room_name:
 *                       type: string
 *                       example: "call_123e4567-e89b-12d3-a456-426614174000"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a participant)
 *       404:
 *         description: Call not found
 */
/**
 * @route   GET /api/v1/calls/:callId/room
 * @desc    Get call room name for WebRTC signaling
 * @access  Private (Authenticated)
 */
router.get(
  '/:callId/room',
  authenticate,
  validate(getCallSchema),
  voiceCallController.getCallRoom.bind(voiceCallController)
);

export default router;
