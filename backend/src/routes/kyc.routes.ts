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
 * @swagger
 * /kyc/initiate:
 *   post:
 *     summary: Initiate KYC verification process
 *     description: Start the KYC verification process for the authenticated user
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document_type
 *             properties:
 *               document_type:
 *                 type: string
 *                 enum: [passport, id_card, driver_license]
 *                 example: "passport"
 *               country:
 *                 type: string
 *                 example: "US"
 *     responses:
 *       201:
 *         description: Verification process initiated successfully
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
 * @swagger
 * /kyc/upload-document:
 *   post:
 *     summary: Upload verification document
 *     description: Upload a document for KYC verification
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Document file (image or PDF)
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error or invalid file
 *       401:
 *         description: Unauthorized
 */
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
 * @swagger
 * /kyc/schedule-call:
 *   post:
 *     summary: Schedule video call verification
 *     description: Schedule a video call for KYC verification
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduled_at
 *             properties:
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:00:00Z"
 *               timezone:
 *                 type: string
 *                 example: "America/New_York"
 *     responses:
 *       200:
 *         description: Call scheduled successfully
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
 * @swagger
 * /kyc/status:
 *   get:
 *     summary: Get verification status
 *     description: Get the current KYC verification status for the authenticated user
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
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
 *                     status:
 *                       type: string
 *                       enum: [pending, in_review, approved, rejected]
 *                       example: "pending"
 *                     verification_id:
 *                       type: string
 *                       format: uuid
 *       401:
 *         description: Unauthorized
 */
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
 * @swagger
 * /kyc/history:
 *   get:
 *     summary: Get verification history
 *     description: Retrieve all verification attempts for the authenticated user
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History retrieved successfully
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
 *                     verifications:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
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
 * @swagger
 * /kyc/pending:
 *   get:
 *     summary: Get pending verifications
 *     description: Get list of pending KYC verifications (Admin/Moderator only)
 *     tags: [KYC]
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
 *           enum: [pending, in_review]
 *     responses:
 *       200:
 *         description: Pending verifications retrieved successfully
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
 *                     verifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (verification required)
 */
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
 * @swagger
 * /kyc/{verificationId}/approve:
 *   post:
 *     summary: Approve verification
 *     description: Approve a KYC verification (Admin/Moderator only)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Verification ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "Verification approved"
 *     responses:
 *       200:
 *         description: Verification approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (verification required)
 *       404:
 *         description: Verification not found
 */
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
 * @swagger
 * /kyc/{verificationId}/reject:
 *   post:
 *     summary: Reject verification
 *     description: Reject a KYC verification (Admin/Moderator only)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Verification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Document unclear"
 *               notes:
 *                 type: string
 *                 example: "Please resubmit with clearer image"
 *     responses:
 *       200:
 *         description: Verification rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (verification required)
 *       404:
 *         description: Verification not found
 */
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

