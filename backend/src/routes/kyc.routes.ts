import { Router } from 'express';
import kycController from '@/controllers/kyc.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  initiateVerificationSchema,
  uploadDocumentSchema,
  scheduleCallSchema,
  getVerificationStatusSchema,
  approveVerificationSchema,
  rejectVerificationSchema,
  getPendingVerificationsSchema,
} from '@/validations/kyc.validation';
import { authenticate, requireVerification } from '@/middleware/auth.middleware';
import { uploadKYCDocument } from '@/utils/fileUpload';

const router = Router();

/**
 * @route   POST /api/v1/kyc/initiate
 * @desc    Initiate KYC verification process
 * @access  Private (Authenticated)
 */
router.post(
  '/initiate',
  authenticate,
  validate(initiateVerificationSchema),
  kycController.initiateVerification.bind(kycController)
);

/**
 * @route   POST /api/v1/kyc/upload-document
 * @desc    Upload verification document
 * @access  Private (Authenticated)
 */
router.post(
  '/upload-document',
  authenticate,
  uploadKYCDocument,
  validate(uploadDocumentSchema),
  kycController.uploadDocument.bind(kycController)
);

/**
 * @route   POST /api/v1/kyc/schedule-call
 * @desc    Schedule video call verification
 * @access  Private (Authenticated)
 */
router.post(
  '/schedule-call',
  authenticate,
  validate(scheduleCallSchema),
  kycController.scheduleCall.bind(kycController)
);

/**
 * @route   GET /api/v1/kyc/status
 * @desc    Get verification status
 * @access  Private (Authenticated)
 */
router.get(
  '/status',
  authenticate,
  validate(getVerificationStatusSchema),
  kycController.getVerificationStatus.bind(kycController)
);

/**
 * @route   GET /api/v1/kyc/history
 * @desc    Get verification history
 * @access  Private (Authenticated)
 */
router.get(
  '/history',
  authenticate,
  kycController.getVerificationHistory.bind(kycController)
);

/**
 * @route   GET /api/v1/kyc/pending
 * @desc    Get pending verifications (admin/moderator only)
 * @access  Private (Authenticated, Verified)
 */
router.get(
  '/pending',
  authenticate,
  requireVerification,
  validate(getPendingVerificationsSchema),
  kycController.getPendingVerifications.bind(kycController)
);

/**
 * @route   POST /api/v1/kyc/:verificationId/approve
 * @desc    Approve verification (admin/moderator only)
 * @access  Private (Authenticated, Verified)
 */
router.post(
  '/:verificationId/approve',
  authenticate,
  requireVerification,
  validate(approveVerificationSchema),
  kycController.approveVerification.bind(kycController)
);

/**
 * @route   POST /api/v1/kyc/:verificationId/reject
 * @desc    Reject verification (admin/moderator only)
 * @access  Private (Authenticated, Verified)
 */
router.post(
  '/:verificationId/reject',
  authenticate,
  requireVerification,
  validate(rejectVerificationSchema),
  kycController.rejectVerification.bind(kycController)
);

export default router;

