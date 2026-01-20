import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { sendError } from '@/utils/response';
import prisma from '@/config/database';

/**
 * Middleware to require admin role
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { user_id: req.user.userId },
      select: { role: true, is_active: true },
    });

    if (!user || !user.is_active) {
      sendError(res, 'FORBIDDEN', 'User not found or inactive', 403);
      return;
    }

    if (user.role !== 'ADMIN') {
      sendError(res, 'FORBIDDEN', 'Admin access required', 403);
      return;
    }

    next();
  } catch (error) {
    sendError(res, 'AUTH_ERROR', 'Error checking admin status', 500);
  }
};

/**
 * Middleware to require moderator or admin role
 */
export const requireModerator = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { user_id: req.user.userId },
      select: { role: true, is_active: true },
    });

    if (!user || !user.is_active) {
      sendError(res, 'FORBIDDEN', 'User not found or inactive', 403);
      return;
    }

    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      sendError(res, 'FORBIDDEN', 'Moderator or admin access required', 403);
      return;
    }

    next();
  } catch (error) {
    sendError(res, 'AUTH_ERROR', 'Error checking moderator status', 500);
  }
};

/**
 * Helper to check if user has admin role
 */
export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { role: true },
    });

    return user?.role === 'ADMIN';
  } catch (error) {
    return false;
  }
};

/**
 * Helper to check if user has moderator or admin role
 */
export const isModerator = async (userId: string): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { role: true },
    });

    return user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  } catch (error) {
    return false;
  }
};

