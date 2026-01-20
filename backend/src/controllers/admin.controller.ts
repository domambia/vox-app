import { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import adminService from '@/services/admin.service';
import { AuthRequest } from '@/types';
import { extractPaginationFromQuery } from '@/utils/pagination';

export class AdminController {
  /**
   * List all users
   * GET /api/v1/admin/users
   */
  async listUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit, offset } = extractPaginationFromQuery(req.query);
      const role = req.query.role as string | undefined;
      const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
      const verified = req.query.verified ? req.query.verified === 'true' : undefined;
      const search = req.query.search as string | undefined;

      const result = await adminService.listUsers({
        limit,
        offset,
        role: role as any,
        isActive,
        verified,
        search,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'USERS_LIST_ERROR', error.message || 'Failed to list users', 400);
    }
  }

  /**
   * Get user details
   * GET /api/v1/admin/users/:userId
   */
  async getUserDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await adminService.getUserDetails(userId);
      sendSuccess(res, user);
    } catch (error: any) {
      if (error.message === 'User not found') {
        sendError(res, 'USER_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'USER_FETCH_ERROR', error.message || 'Failed to get user details', 400);
    }
  }

  /**
   * Update user status
   * PUT /api/v1/admin/users/:userId/status
   */
  async updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const data = req.body;

      const user = await adminService.updateUserStatus(userId, data);
      sendSuccess(res, user);
    } catch (error: any) {
      if (error.message === 'User not found') {
        sendError(res, 'USER_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'USER_UPDATE_ERROR', error.message || 'Failed to update user status', 400);
    }
  }

  /**
   * List KYC verifications
   * GET /api/v1/admin/kyc/queue
   */
  async listKYCVerifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit, offset } = extractPaginationFromQuery(req.query);
      const status = req.query.status as string | undefined;
      const method = req.query.method as string | undefined;

      const result = await adminService.listKYCVerifications({
        limit,
        offset,
        status: status as any,
        method,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'KYC_LIST_ERROR', error.message || 'Failed to list KYC verifications', 400);
    }
  }

  /**
   * Get platform statistics
   * GET /api/v1/admin/stats
   */
  async getPlatformStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await adminService.getPlatformStats();
      sendSuccess(res, stats);
    } catch (error: any) {
      sendError(res, 'STATS_ERROR', error.message || 'Failed to get platform stats', 400);
    }
  }

  /**
   * Get moderation queue
   * GET /api/v1/admin/moderation/queue
   */
  async getModerationQueue(req: AuthRequest, res: Response): Promise<void> {
    try {
      const queue = await adminService.getModerationQueue();
      sendSuccess(res, queue);
    } catch (error: any) {
      sendError(res, 'MODERATION_QUEUE_ERROR', error.message || 'Failed to get moderation queue', 400);
    }
  }
}

// Export singleton instance
const adminController = new AdminController();
export default adminController;

