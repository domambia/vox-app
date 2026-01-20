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

