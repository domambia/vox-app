import prisma from '@/config/database';
import { hashPassword, comparePassword } from '@/utils/password';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { logger } from '@/utils/logger';
import {
  RegisterInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetCompleteInput,
  ChangePasswordInput,
} from '@/validations/auth.validation';
import { Prisma } from '@prisma/client';
import { generateSecureToken, hashToken } from '@/utils/token';

export class AuthService {
  /**
   * Get allowed countries for registration
   * This can be used by frontend to show available countries
   */
  async getAllowedCountriesForRegistration() {
    try {
      const countries = await prisma.country.findMany({
        where: { is_allowed: true },
        orderBy: { name: 'asc' },
        select: {
          code: true,
          name: true,
        },
      });

      return countries;
    } catch (error) {
      logger.error('Error getting allowed countries for registration', error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterInput) {
    try {
      // Normalize country code to uppercase
      const normalizedCountryCode = data.countryCode.toUpperCase();

      // Validate country code exists and is allowed
      const country = await prisma.country.findUnique({
        where: { code: normalizedCountryCode },
      });

      if (!country) {
        throw new Error(`Invalid country code: ${normalizedCountryCode}. Please use a valid ISO 3166-1 alpha-2 code (e.g., MT, US, GB)`);
      }

      if (!country.is_allowed) {
        throw new Error(
          `Registration is not currently allowed for ${country.name} (${normalizedCountryCode}). Please contact support for more information.`
        );
      }

      // Check if user already exists by phone number
      const existingUserByPhone = await prisma.user.findUnique({
        where: { phone_number: data.phoneNumber },
      });

      if (existingUserByPhone) {
        throw new Error('User with this phone number already exists');
      }

      // Check if email is provided and if user exists by email
      if (data.email && data.email.trim() !== '') {
        const existingUserByEmail = await prisma.user.findUnique({
          where: { email: data.email },
        });

        if (existingUserByEmail) {
          throw new Error('User with this email already exists');
        }
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          phone_number: data.phoneNumber,
          password_hash: passwordHash,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email && data.email.trim() !== '' ? data.email : null,
          country_code: normalizedCountryCode,
          verified: false,
          is_active: true,
        },
        select: {
          user_id: true,
          phone_number: true,
          first_name: true,
          last_name: true,
          email: true,
          country_code: true,
          verified: true,
          created_at: true,
        },
      });

      logger.info('User registered successfully', { userId: user.user_id, countryCode: user.country_code });

      return {
        userId: user.user_id,
        phoneNumber: user.phone_number,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        countryCode: user.country_code,
        requiresVerification: !user.verified,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Check which unique constraint was violated
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('phone_number')) {
            throw new Error('User with this phone number already exists');
          }
          if (target.includes('email')) {
            throw new Error('User with this email already exists');
          }
          throw new Error('User with this information already exists');
        }
        if (error.code === 'P2003') {
          throw new Error('Invalid country code');
        }
      }
      logger.error('Registration error', error);
      throw error;
    }
  }

  /**
   * Login user and generate tokens
   */
  async login(data: LoginInput) {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { phone_number: data.phoneNumber },
        select: {
          user_id: true,
          phone_number: true,
          password_hash: true,
          verified: true,
          is_active: true,
        },
      });

      if (!user) {
        throw new Error('Invalid phone number or password');
      }

      if (!user.is_active) {
        throw new Error('Account is inactive');
      }

      // Verify password
      const isPasswordValid = await comparePassword(data.password, user.password_hash);

      if (!isPasswordValid) {
        throw new Error('Invalid phone number or password');
      }

      // Update last active
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: { last_active: new Date() },
      });

      // Generate tokens
      const tokenPayload = {
        userId: user.user_id,
        phoneNumber: user.phone_number,
        verified: user.verified || false,
      };

      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      logger.info('User logged in successfully', { userId: user.user_id });

      return {
        token,
        refreshToken,
        expiresIn: 3600, // 1 hour in seconds
        user: {
          userId: user.user_id,
          verified: user.verified || false,
        },
      };
    } catch (error) {
      logger.error('Login error', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { user_id: decoded.userId },
        select: {
          user_id: true,
          phone_number: true,
          verified: true,
          is_active: true,
        },
      });

      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const tokenPayload = {
        userId: user.user_id,
        phoneNumber: user.phone_number,
        verified: user.verified || false,
      };

      const token = generateToken(tokenPayload);

      logger.info('Token refreshed successfully', { userId: user.user_id });

      return {
        token,
        expiresIn: 3600,
      };
    } catch (error) {
      logger.error('Token refresh error', error);
      throw error;
    }
  }

  /**
   * Logout user (for now, just return success - token blacklisting can be added later with Redis)
   */
  async logout(userId: string) {
    try {
      // Update last active
      await prisma.user.update({
        where: { user_id: userId },
        data: { last_active: new Date() },
      });

      logger.info('User logged out', { userId });

      return { message: 'Logged out successfully' };
    } catch (error) {
      logger.error('Logout error', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetRequestInput) {
    try {
      // Find user by phone number
      const user = await prisma.user.findUnique({
        where: { phone_number: data.phoneNumber },
        select: {
          user_id: true,
          phone_number: true,
          email: true,
          is_active: true,
        },
      });

      if (!user) {
        // Don't reveal if user exists - security best practice
        logger.warn('Password reset requested for non-existent phone number', {
          phoneNumber: data.phoneNumber,
        });
        // Return success even if user doesn't exist (security)
        return {
          message: 'If an account exists with this phone number, a password reset link has been sent.',
        };
      }

      if (!user.is_active) {
        throw new Error('Account is inactive');
      }

      // If email provided, verify it matches
      if (data.email && user.email && user.email !== data.email) {
        throw new Error('Email does not match account');
      }

      // Generate reset token
      const resetToken = generateSecureToken(32);
      const hashedToken = hashToken(resetToken);

      // Set expiration (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Invalidate any existing reset tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: {
          user_id: user.user_id,
          used: false,
          expires_at: { gt: new Date() },
        },
        data: {
          used: true,
          used_at: new Date(),
        },
      });

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          user_id: user.user_id,
          token: hashedToken,
          expires_at: expiresAt,
        },
      });

      logger.info('Password reset token created', { userId: user.user_id });

      // In production, send token via SMS or email
      // For now, return token (in production, this should be sent via SMS/email)
      return {
        message: 'Password reset token generated',
        // TODO: Remove this in production - send via SMS/email instead
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
        expiresIn: 3600, // 1 hour in seconds
      };
    } catch (error) {
      logger.error('Password reset request error', error);
      throw error;
    }
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string) {
    try {
      const hashedToken = hashToken(token);

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: hashedToken },
        include: {
          user: {
            select: {
              user_id: true,
              is_active: true,
            },
          },
        },
      });

      if (!resetToken) {
        throw new Error('Invalid reset token');
      }

      if (resetToken.used) {
        throw new Error('Reset token has already been used');
      }

      if (resetToken.expires_at < new Date()) {
        throw new Error('Reset token has expired');
      }

      if (!resetToken.user.is_active) {
        throw new Error('Account is inactive');
      }

      return {
        valid: true,
        userId: resetToken.user_id,
      };
    } catch (error) {
      logger.error('Password reset token verification error', error);
      throw error;
    }
  }

  /**
   * Complete password reset
   */
  async completePasswordReset(data: PasswordResetCompleteInput) {
    try {
      // Verify token
      const verification = await this.verifyPasswordResetToken(data.token);

      if (!verification.valid) {
        throw new Error('Invalid reset token');
      }

      const hashedToken = hashToken(data.token);

      // Mark token as used
      await prisma.passwordResetToken.update({
        where: { token: hashedToken },
        data: {
          used: true,
          used_at: new Date(),
        },
      });

      // Hash new password
      const newPasswordHash = await hashPassword(data.newPassword);

      // Update user password
      await prisma.user.update({
        where: { user_id: verification.userId },
        data: {
          password_hash: newPasswordHash,
          last_active: new Date(),
        },
      });

      logger.info('Password reset completed', { userId: verification.userId });

      return {
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      logger.error('Password reset completion error', error);
      throw error;
    }
  }

  /**
   * Change password (when authenticated)
   */
  async changePassword(userId: string, data: ChangePasswordInput) {
    try {
      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          password_hash: true,
          is_active: true,
        },
      });

      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(
        data.currentPassword,
        user.password_hash
      );

      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(data.newPassword);

      // Update password
      await prisma.user.update({
        where: { user_id: userId },
        data: {
          password_hash: newPasswordHash,
          last_active: new Date(),
        },
      });

      logger.info('Password changed successfully', { userId });

      return {
        message: 'Password has been changed successfully',
      };
    } catch (error) {
      logger.error('Change password error', error);
      throw error;
    }
  }
}

export default new AuthService();
