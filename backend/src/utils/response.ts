import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '@/types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
    },
  };

  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
    },
  };

  res.status(statusCode).json(response);
};

