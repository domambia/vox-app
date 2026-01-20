import { Router } from 'express';
import adminController from '@/controllers/admin.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  listUsersSchema,
  getUserDetailsSchema,
  updateUserStatusSchema,
  listKYCVerificationsSchema,
} from '@/validations/admin.validation';
import { authenticate } from '@/middleware/auth.middleware';
import { requireAdmin, requireModerator } from '@/middleware/admin.middleware';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/admin/users
 * @desc    List all users (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/users',
  requireAdmin,
  validate(listUsersSchema),
  adminController.listUsers.bind(adminController)
);

/**
 * @route   GET /api/v1/admin/users/:userId
 * @desc    Get user details (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/users/:userId',
  requireAdmin,
  validate(getUserDetailsSchema),
  adminController.getUserDetails.bind(adminController)
);

/**
 * @route   PUT /api/v1/admin/users/:userId/status
 * @desc    Update user status (admin only)
 * @access  Private (Admin)
 */
router.put(
  '/users/:userId/status',
  requireAdmin,
  validate(updateUserStatusSchema),
  adminController.updateUserStatus.bind(adminController)
);

/**
 * @route   GET /api/v1/admin/kyc/queue
 * @desc    Get KYC verification queue (moderator/admin)
 * @access  Private (Moderator/Admin)
 */
router.get(
  '/kyc/queue',
  requireModerator,
  validate(listKYCVerificationsSchema),
  adminController.listKYCVerifications.bind(adminController)
);

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get platform statistics (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  requireAdmin,
  adminController.getPlatformStats.bind(adminController)
);

/**
 * @route   GET /api/v1/admin/moderation/queue
 * @desc    Get moderation queue (moderator/admin)
 * @access  Private (Moderator/Admin)
 */
router.get(
  '/moderation/queue',
  requireModerator,
  adminController.getModerationQueue.bind(adminController)
);

export default router;

