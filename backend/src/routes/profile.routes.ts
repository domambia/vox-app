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
 * @swagger
 * /profile/{userId}:
 *   get:
 *     summary: Get profile by user ID
 *     description: Retrieve profile information for a specific user
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
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
 * @swagger
 * /profile/{userId}:
 *   put:
 *     summary: Update profile
 *     description: Update profile information (own profile only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (must be the authenticated user's ID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *               bio:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other, prefer_not_to_say]
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (can only update own profile)
 *       404:
 *         description: Profile not found
 */
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
 * @swagger
 * /profile/{userId}:
 *   delete:
 *     summary: Delete profile
 *     description: Delete a profile (own profile only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (must be the authenticated user's ID)
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (can only delete own profile)
 *       404:
 *         description: Profile not found
 */
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
 * @swagger
 * /profile/voice-bio:
 *   post:
 *     summary: Upload voice bio
 *     description: Upload a voice recording as a bio
 *     tags: [Profile]
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
 *                 description: Audio file (MP3, WAV, etc.)
 *     responses:
 *       200:
 *         description: Voice bio uploaded successfully
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
 *                     voice_bio_url:
 *                       type: string
 *                       example: "/api/v1/files/voice-bios/filename.mp3"
 *       400:
 *         description: Validation error or invalid file
 *       401:
 *         description: Unauthorized
 */
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
 * @swagger
 * /profile/voice-bio:
 *   delete:
 *     summary: Delete voice bio
 *     description: Delete the current user's voice bio
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Voice bio deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Voice bio not found
 */
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
 * @swagger
 * /profile/{userId}/like:
 *   post:
 *     summary: Like a profile
 *     description: Like another user's profile
 *     tags: [Profile, Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to like
 *     responses:
 *       200:
 *         description: Profile liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Cannot like own profile or already liked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
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
 * @swagger
 * /profile/{userId}/like:
 *   delete:
 *     summary: Unlike a profile
 *     description: Remove a like from a profile
 *     tags: [Profile, Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to unlike
 *     responses:
 *       200:
 *         description: Profile unliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Profile not liked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
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

