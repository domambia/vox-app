import { Router } from 'express';
import notificationsController from '@/controllers/notifications.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { markNotificationsReadSchema } from '@/validations/notifications.validation';

const router = Router();

/**
 * @route   GET /api/v1/notifications
 * @desc    List aggregated notifications (matches, likes, conversations, upcoming events)
 * @access  Private (Authenticated)
 */
router.get(
  '/',
  authenticate,
  notificationsController.listNotifications.bind(notificationsController)
);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Private (Authenticated)
 */
router.get(
  '/unread-count',
  authenticate,
  notificationsController.getUnreadCount.bind(notificationsController)
);

/**
 * @route   POST /api/v1/notifications/read
 * @desc    Mark notifications as read (optionally by IDs)
 * @access  Private (Authenticated)
 */
router.post(
  '/read',
  authenticate,
  validate(markNotificationsReadSchema),
  notificationsController.markAsRead.bind(notificationsController)
);

export default router;
