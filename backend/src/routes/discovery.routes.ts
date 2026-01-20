import { Router } from 'express';
import discoveryController from '@/controllers/discovery.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  discoverProfilesSchema,
  getMatchesSchema,
  getLikesSchema,
} from '@/validations/discovery.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /profiles/discover:
 *   get:
 *     summary: Discover profile suggestions
 *     description: Get profile suggestions based on preferences and filters
 *     tags: [Discovery]
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
 *         name: min_age
 *         schema:
 *           type: integer
 *       - in: query
 *         name: max_age
 *         schema:
 *           type: integer
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profiles retrieved successfully
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
 *                     profiles:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   GET /api/v1/profiles/discover
 * @desc    Discover profile suggestions
 * @access  Private (Authenticated)
 */
router.get(
  '/discover',
  authenticate,
  validate(discoverProfilesSchema),
  discoveryController.discoverProfiles.bind(discoveryController)
);

/**
 * @swagger
 * /profiles/matches:
 *   get:
 *     summary: Get all matches
 *     description: Retrieve all mutual matches (profiles that liked each other)
 *     tags: [Discovery]
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
 *         description: Matches retrieved successfully
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
 *                     matches:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   GET /api/v1/profiles/matches
 * @desc    Get all matches
 * @access  Private (Authenticated)
 */
router.get(
  '/matches',
  authenticate,
  validate(getMatchesSchema),
  discoveryController.getMatches.bind(discoveryController)
);

/**
 * @swagger
 * /profiles/likes:
 *   get:
 *     summary: Get likes (given or received)
 *     description: Retrieve likes given by the user or received from others
 *     tags: [Discovery]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [given, received]
 *           description: Type of likes to retrieve
 *     responses:
 *       200:
 *         description: Likes retrieved successfully
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
 *                     likes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   GET /api/v1/profiles/likes
 * @desc    Get likes (given or received)
 * @access  Private (Authenticated)
 */
router.get(
  '/likes',
  authenticate,
  validate(getLikesSchema),
  discoveryController.getLikes.bind(discoveryController)
);

export default router;

