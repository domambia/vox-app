import { Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { sendError } from '@/utils/response';
import { AuthRequest } from '@/types';
import prisma from '@/config/database';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'UNAUTHORIZED', 'No token provided', 401);
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = verifyToken(token);

      // Verify user still exists and is active
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
        sendError(res, 'UNAUTHORIZED', 'User not found or inactive', 401);
        return;
      }

      // Attach user to request
      req.user = {
        userId: user.user_id,
        phoneNumber: user.phone_number,
        verified: user.verified || false,
      };

      next();
    } catch (error) {
      sendError(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
      return;
    }
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', 'Authentication error', 500);
    return;
  }
};

export const requireVerification = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  if (!req.user.verified) {
    sendError(res, 'FORBIDDEN', 'User verification required', 403);
    return;
  }

  next();
};

