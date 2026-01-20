import { Router } from 'express';
import profileController from '@/controllers/profile.controller';
import discoveryController from '@/controllers/discovery.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  createProfileSchema,
  updateProfileSchema,
  getProfileSchema,
  deleteProfileSchema,
  uploadVoiceBioSchema,
} from '@/validations/profile.validation';
import {
  likeProfileSchema,
  unlikeProfileSchema,
} from '@/validations/discovery.validation';
import { authenticate } from '@/middleware/auth.middleware';
import { uploadVoiceBio } from '@/utils/fileUpload';

const router = Router();

/**
 * @swagger
 * /profile:
 *   post:
 *     summary: Create a new profile
 *     description: Create a user profile with personal information
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - display_name
 *             properties:
 *               display_name:
 *                 type: string
 *                 example: "John Doe"
 *               bio:
 *                 type: string
 *                 example: "A brief bio about me"
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other, prefer_not_to_say]
 *               location:
 *                 type: string
 *                 example: "New York, NY"
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   POST /api/v1/profile
 * @desc    Create a new profile
 * @access  Private (Authenticated)
 */
router.post(
  '/',
  authenticate,
  validate(createProfileSchema),
  profileController.createProfile.bind(profileController)
);

/**
 * @swagger
 * /profile/me:
 *   get:
 *     summary: Get current user's profile
 *     description: Retrieve the authenticated user's own profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   GET /api/v1/profile/me
 * @desc    Get current user's profile
 * @access  Private (Authenticated)
 */
router.get(
  '/me',
  authenticate,
  profileController.getMyProfile.bind(profileController)
);

/**
 * @route   GET /api/v1/profile/:userId
 * @desc    Get profile by user ID
 * @access  Private (Authenticated)
 */
router.get(
  '/:userId',
  authenticate,
  validate(getProfileSchema),
  profileController.getProfile.bind(profileController)
);

/**
 * @route   PUT /api/v1/profile/:userId
 * @desc    Update profile
 * @access  Private (Authenticated, own profile only)
 */
router.put(
  '/:userId',
  authenticate,
  validate(getProfileSchema),
  validate(updateProfileSchema),
  profileController.updateProfile.bind(profileController)
);

/**
 * @route   DELETE /api/v1/profile/:userId
 * @desc    Delete profile
 * @access  Private (Authenticated, own profile only)
 */
router.delete(
  '/:userId',
  authenticate,
  validate(deleteProfileSchema),
  profileController.deleteProfile.bind(profileController)
);

/**
 * @route   POST /api/v1/profile/voice-bio
 * @desc    Upload voice bio
 * @access  Private (Authenticated)
 */
router.post(
  '/voice-bio',
  authenticate,
  uploadVoiceBio,
  validate(uploadVoiceBioSchema),
  profileController.uploadVoiceBio.bind(profileController)
);

/**
 * @route   DELETE /api/v1/profile/voice-bio
 * @desc    Delete voice bio
 * @access  Private (Authenticated)
 */
router.delete(
  '/voice-bio',
  authenticate,
  profileController.deleteVoiceBio.bind(profileController)
);

/**
 * @route   POST /api/v1/profile/:userId/like
 * @desc    Like a profile
 * @access  Private (Authenticated)
 */
router.post(
  '/:userId/like',
  authenticate,
  validate(likeProfileSchema),
  discoveryController.likeProfile.bind(discoveryController)
);

/**
 * @route   DELETE /api/v1/profile/:userId/like
 * @desc    Unlike a profile
 * @access  Private (Authenticated)
 */
router.delete(
  '/:userId/like',
  authenticate,
  validate(unlikeProfileSchema),
  discoveryController.unlikeProfile.bind(discoveryController)
);

export default router;

