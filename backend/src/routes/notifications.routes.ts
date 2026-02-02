import { Router } from 'express';
import notificationsController from '@/controllers/notifications.controller';
import { authenticate } from '@/middleware/auth.middleware';

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

export default router;
