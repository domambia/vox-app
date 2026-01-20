import { Router } from 'express';
import authController from '@/controllers/auth.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  passwordResetCompleteSchema,
  changePasswordSchema,
} from '@/validations/auth.validation';
import { authenticate } from '@/middleware/auth.middleware';
import { authLimiter } from '@/middleware/rateLimit.middleware';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register.bind(authController)
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and get tokens
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login.bind(authController)
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (but requires valid refresh token)
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refresh.bind(authController)
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  validate(logoutSchema),
  authController.logout.bind(authController)
);

/**
 * @route   GET /api/v1/auth/allowed-countries
 * @desc    Get allowed countries for registration
 * @access  Public
 */
router.get(
  '/allowed-countries',
  authController.getAllowedCountriesForRegistration.bind(authController)
);

/**
 * @route   POST /api/v1/auth/password-reset/request
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/password-reset/request',
  authLimiter,
  validate(passwordResetRequestSchema),
  authController.requestPasswordReset.bind(authController)
);

/**
 * @route   POST /api/v1/auth/password-reset/verify
 * @desc    Verify password reset token
 * @access  Public
 */
router.post(
  '/password-reset/verify',
  validate(passwordResetVerifySchema),
  authController.verifyPasswordResetToken.bind(authController)
);

/**
 * @route   POST /api/v1/auth/password-reset/complete
 * @desc    Complete password reset with new password
 * @access  Public
 */
router.post(
  '/password-reset/complete',
  authLimiter,
  validate(passwordResetCompleteSchema),
  authController.completePasswordReset.bind(authController)
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password when authenticated
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword.bind(authController)
);

export default router;

