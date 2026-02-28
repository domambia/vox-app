import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import authService from '@/services/auth.service';
import { AuthRequest } from '@/types';

export class AuthController {
  /**
   * Send OTP for phone verification
   * POST /auth/send-otp
   */
  async sendOTP(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const result = await authService.sendOTP(data);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Invalid phone number format') {
        sendError(res, 'INVALID_PHONE', error.message, 400);
        return;
      }
      sendError(res, 'SEND_OTP_ERROR', error.message || 'Failed to send OTP', 400);
    }
  }

  /**
   * Verify OTP and complete authentication
   * POST /auth/verify-otp
   */
  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const result = await authService.verifyOTP(data);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Invalid or expired OTP') {
        sendError(res, 'INVALID_OTP', error.message, 400);
        return;
      }
      if (error.message === 'Account not found or inactive') {
        sendError(res, 'ACCOUNT_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'VERIFY_OTP_ERROR', error.message || 'Failed to verify OTP', 400);
    }
  }

  /**
   * Register a new user
   * POST /auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const result = await authService.register(data);
      sendSuccess(res, result, 201);
    } catch (error: any) {
      if (
        error.message === 'User with this phone number already exists' ||
        error.message === 'User with this email already exists' ||
        error.message === 'User with this information already exists'
      ) {
        sendError(res, 'DUPLICATE_USER', error.message, 409);
        return;
      }
      if (
        error.message.includes('Invalid country code') ||
        error.message.includes('Registration is not currently allowed')
      ) {
        sendError(res, 'COUNTRY_NOT_ALLOWED', error.message, 403);
        return;
      }
      sendError(res, 'REGISTRATION_ERROR', error.message || 'Registration failed', 400);
    }
  }

  /**
   * Login user
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const result = await authService.login(data);
      sendSuccess(res, result);
    } catch (error: any) {
      if (
        error.message === 'Invalid phone number, email or password' ||
        error.message === 'Account is inactive'
      ) {
        sendError(res, 'INVALID_CREDENTIALS', error.message, 401);
        return;
      }
      sendError(res, 'LOGIN_ERROR', error.message || 'Login failed', 400);
    }
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendError(res, 'UNAUTHORIZED', 'Refresh token required', 401);
        return;
      }

      const refreshToken = authHeader.substring(7);
      const result = await authService.refreshToken(refreshToken);
      sendSuccess(res, result);
    } catch (error: any) {
      if (
        error.message === 'User not found or inactive' ||
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        sendError(res, 'UNAUTHORIZED', 'Invalid or expired refresh token', 401);
        return;
      }
      sendError(res, 'REFRESH_ERROR', error.message || 'Token refresh failed', 400);
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const result = await authService.logout(req.user.userId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'LOGOUT_ERROR', error.message || 'Logout failed', 400);
    }
  }

  /**
   * Get allowed countries for registration
   * GET /auth/allowed-countries
   */
  async getAllowedCountriesForRegistration(_req: Request, res: Response): Promise<void> {
    try {
      const countries = await authService.getAllowedCountriesForRegistration();
      sendSuccess(res, { countries });
    } catch (error: any) {
      sendError(
        res,
        'GET_ALLOWED_COUNTRIES_ERROR',
        error.message || 'Failed to get allowed countries',
        400
      );
    }
  }

  /**
   * Request password reset
   * POST /auth/password-reset/request
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const result = await authService.requestPasswordReset(data);
      sendSuccess(res, result);
    } catch (error: any) {
      if (
        error.message === 'Account is inactive' ||
        error.message === 'Email does not match account'
      ) {
        sendError(res, 'ACCOUNT_ERROR', error.message, 400);
        return;
      }
      sendError(
        res,
        'PASSWORD_RESET_REQUEST_ERROR',
        error.message || 'Failed to request password reset',
        400
      );
    }
  }

  /**
   * Verify password reset token
   * POST /auth/password-reset/verify
   */
  async verifyPasswordResetToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      const result = await authService.verifyPasswordResetToken(token);
      sendSuccess(res, result);
    } catch (error: any) {
      if (
        error.message === 'Invalid reset token' ||
        error.message === 'Reset token has already been used' ||
        error.message === 'Reset token has expired' ||
        error.message === 'Account is inactive'
      ) {
        sendError(res, 'INVALID_RESET_TOKEN', error.message, 400);
        return;
      }
      sendError(
        res,
        'VERIFY_RESET_TOKEN_ERROR',
        error.message || 'Failed to verify reset token',
        400
      );
    }
  }

  /**
   * Complete password reset
   * POST /auth/password-reset/complete
   */
  async completePasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const result = await authService.completePasswordReset(data);
      sendSuccess(res, result);
    } catch (error: any) {
      if (
        error.message === 'Invalid reset token' ||
        error.message === 'Reset token has already been used' ||
        error.message === 'Reset token has expired'
      ) {
        sendError(res, 'INVALID_RESET_TOKEN', error.message, 400);
        return;
      }
      sendError(
        res,
        'PASSWORD_RESET_COMPLETE_ERROR',
        error.message || 'Failed to reset password',
        400
      );
    }
  }

  /**
   * Change password (authenticated)
   * POST /auth/change-password
   */
  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const data = req.body;
      const result = await authService.changePassword(req.user.userId, data);
      sendSuccess(res, result);
    } catch (error: any) {
      if (
        error.message === 'Current password is incorrect' ||
        error.message === 'User not found or inactive'
      ) {
        sendError(res, 'PASSWORD_ERROR', error.message, 400);
        return;
      }
      sendError(
        res,
        'CHANGE_PASSWORD_ERROR',
        error.message || 'Failed to change password',
        400
      );
    }
  }
}

export default new AuthController();

