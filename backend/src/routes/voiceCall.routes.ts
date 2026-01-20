import { Router } from 'express';
import voiceCallController from '@/controllers/voiceCall.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  initiateCallSchema,
  updateCallStatusSchema,
  endCallSchema,
  getCallSchema,
  getCallHistorySchema,
  generateTokenSchema,
} from '@/validations/voiceCall.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

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
 * @route   POST /api/v1/calls/token
 * @desc    Generate Twilio access token
 * @access  Private (Authenticated)
 */
router.post(
  '/token',
  authenticate,
  validate(generateTokenSchema),
  voiceCallController.generateToken.bind(voiceCallController)
);

export default router;

