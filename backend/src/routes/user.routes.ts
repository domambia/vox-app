import { Router } from 'express';
import groupController from '@/controllers/group.controller';
import eventController from '@/controllers/event.controller';
import { validate } from '@/middleware/validation.middleware';
import { getUserGroupsSchema } from '@/validations/group.validation';
import { getUserEventsSchema } from '@/validations/event.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

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

