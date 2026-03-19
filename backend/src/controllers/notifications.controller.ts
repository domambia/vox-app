import { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import notificationsService from '@/services/notifications.service';
import { AuthRequest } from '@/types';

export class NotificationsController {
  /**
   * List aggregated notifications for the current user
   * GET /api/v1/notifications
   */
  async listNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 100);

      const notifications = await notificationsService.listNotifications(userId, limit);
      sendSuccess(res, { items: notifications });
    } catch (error: any) {
      sendError(res, 'NOTIFICATIONS_FETCH_ERROR', error.message || 'Failed to fetch notifications', 400);
    }
  }

  /**
   * Mark notifications as read
   * POST /api/v1/notifications/read
   */
  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { notificationIds } = req.body ?? {};
      const result = await notificationsService.markAsRead(userId, notificationIds);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'NOTIFICATIONS_READ_ERROR', error.message || 'Failed to mark notifications as read', 400);
    }
  }

  /**
   * Get unread notifications count
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const unread_count = await notificationsService.getUnreadCount(userId);
      sendSuccess(res, { unread_count });
    } catch (error: any) {
      sendError(res, 'NOTIFICATIONS_UNREAD_COUNT_ERROR', error.message || 'Failed to fetch unread count', 400);
    }
  }
}

const notificationsController = new NotificationsController();
export default notificationsController;
