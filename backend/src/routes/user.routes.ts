import { Router } from 'express';
import groupController from '@/controllers/group.controller';
import eventController from '@/controllers/event.controller';
import { validate } from '@/middleware/validation.middleware';
import { getUserGroupsSchema } from '@/validations/group.validation';
import { getUserEventsSchema } from '@/validations/event.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /users/{userId}/groups:
 *   get:
 *     summary: Get user's groups
 *     description: Retrieve all groups that a user is a member of (own groups only)
 *     tags: [Groups]
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
 *         description: User groups retrieved successfully
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
 *                     groups:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (can only view own groups)
 */
/**
 * @route   GET /api/v1/users/:userId/groups
 * @desc    Get user's groups
 * @access  Private (Authenticated, own groups only)
 */
router.get(
  '/:userId/groups',
  authenticate,
  validate(getUserGroupsSchema),
  groupController.getUserGroups.bind(groupController)
);

/**
 * @swagger
 * /users/{userId}/events:
 *   get:
 *     summary: Get user's events
 *     description: Retrieve all events created by or RSVP'd to by a user (own events only)
 *     tags: [Events]
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
 *           enum: [upcoming, ongoing, past]
 *     responses:
 *       200:
 *         description: User events retrieved successfully
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
 *                     events:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (can only view own events)
 */
/**
 * @route   GET /api/v1/users/:userId/events
 * @desc    Get user's events
 * @access  Private (Authenticated, own events only)
 */
router.get(
  '/:userId/events',
  authenticate,
  validate(getUserEventsSchema),
  eventController.getUserEvents.bind(eventController)
);

export default router;
