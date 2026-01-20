import { Router } from 'express';
import eventController from '@/controllers/event.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  createEventSchema,
  updateEventSchema,
  getEventSchema,
  listEventsSchema,
  rsvpSchema,
  getEventRSVPsSchema,
} from '@/validations/event.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     description: Create a new event that can be associated with a group
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - start_time
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Tech Meetup"
 *               description:
 *                 type: string
 *                 example: "Monthly tech meetup"
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:00:00Z"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T12:00:00Z"
 *               location:
 *                 type: string
 *                 example: "Conference Room A"
 *               group_id:
 *                 type: string
 *                 format: uuid
 *                 description: Optional group ID to associate event with
 *               max_attendees:
 *                 type: integer
 *                 example: 50
 *     responses:
 *       201:
 *         description: Event created successfully
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
 * @route   POST /api/v1/events
 * @desc    Create a new event
 * @access  Private (Authenticated)
 */
router.post(
  '/',
  authenticate,
  validate(createEventSchema),
  eventController.createEvent.bind(eventController)
);

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List events with filters
 *     description: Get a paginated list of events with optional filters
 *     tags: [Events]
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
 *           enum: [upcoming, ongoing, past]
 *       - in: query
 *         name: group_id
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Events retrieved successfully
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
 */
/**
 * @route   GET /api/v1/events
 * @desc    List events with filters
 * @access  Private (Authenticated)
 */
router.get(
  '/',
  authenticate,
  validate(listEventsSchema),
  eventController.listEvents.bind(eventController)
);

/**
 * @swagger
 * /events/{eventId}:
 *   get:
 *     summary: Get event by ID
 *     description: Retrieve detailed information about a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
/**
 * @route   GET /api/v1/events/:eventId
 * @desc    Get event by ID
 * @access  Private (Authenticated)
 */
router.get(
  '/:eventId',
  authenticate,
  validate(getEventSchema),
  eventController.getEvent.bind(eventController)
);

/**
 * @swagger
 * /events/{eventId}:
 *   put:
 *     summary: Update event
 *     description: Update event information (event creator/admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               max_attendees:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (creator/admin access required)
 *       404:
 *         description: Event not found
 */
/**
 * @route   PUT /api/v1/events/:eventId
 * @desc    Update event (creator/admin only)
 * @access  Private (Authenticated)
 */
router.put(
  '/:eventId',
  authenticate,
  validate(getEventSchema),
  validate(updateEventSchema),
  eventController.updateEvent.bind(eventController)
);

/**
 * @swagger
 * /events/{eventId}:
 *   delete:
 *     summary: Delete event
 *     description: Delete an event (event creator/admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (creator/admin access required)
 *       404:
 *         description: Event not found
 */
/**
 * @route   DELETE /api/v1/events/:eventId
 * @desc    Delete event (creator/admin only)
 * @access  Private (Authenticated)
 */
router.delete(
  '/:eventId',
  authenticate,
  validate(getEventSchema),
  eventController.deleteEvent.bind(eventController)
);

/**
 * @swagger
 * /events/{eventId}/rsvp:
 *   post:
 *     summary: RSVP to an event
 *     description: RSVP (going, maybe, or not going) to an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [going, maybe, not_going]
 *                 example: "going"
 *     responses:
 *       200:
 *         description: RSVP updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
/**
 * @route   POST /api/v1/events/:eventId/rsvp
 * @desc    RSVP to an event
 * @access  Private (Authenticated)
 */
router.post(
  '/:eventId/rsvp',
  authenticate,
  validate(rsvpSchema),
  eventController.rsvpToEvent.bind(eventController)
);

/**
 * @swagger
 * /events/{eventId}/rsvps:
 *   get:
 *     summary: Get event RSVPs
 *     description: Retrieve all RSVPs for an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [going, maybe, not_going]
 *     responses:
 *       200:
 *         description: RSVPs retrieved successfully
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
 *                     rsvps:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
/**
 * @route   GET /api/v1/events/:eventId/rsvps
 * @desc    Get event RSVPs
 * @access  Private (Authenticated)
 */
router.get(
  '/:eventId/rsvps',
  authenticate,
  validate(getEventRSVPsSchema),
  eventController.getEventRSVPs.bind(eventController)
);

export default router;
