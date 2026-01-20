import { Request, Response, NextFunction } from 'express';
import { sendError } from '@/utils/response';
import { logger } from '@/utils/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    sendError(
      res,
      'VALIDATION_ERROR',
      'Invalid input data',
      400,
      err.errors
    );
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'UNAUTHORIZED', 'Invalid token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, 'UNAUTHORIZED', 'Token expired', 401);
    return;
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      sendError(res, 'FILE_TOO_LARGE', 'File size exceeds limit', 400);
      return;
    }
    sendError(res, 'FILE_UPLOAD_ERROR', 'File upload failed', 400);
    return;
  }

  // Default error
  const statusCode = (err as any).statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  sendError(res, 'INTERNAL_ERROR', message, statusCode);
};

const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
): void => {
  switch (err.code) {
    case 'P2002':
      sendError(
        res,
        'DUPLICATE_ENTRY',
        'A record with this value already exists',
        409
      );
      break;
    case 'P2025':
      sendError(res, 'NOT_FOUND', 'Record not found', 404);
      break;
    case 'P2003':
      sendError(
        res,
        'FOREIGN_KEY_CONSTRAINT',
        'Referenced record does not exist',
        400
      );
      break;
    default:
      sendError(res, 'DATABASE_ERROR', 'Database operation failed', 500);
  }
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  sendError(res, 'NOT_FOUND', `Route ${req.path} not found`, 404);
};

