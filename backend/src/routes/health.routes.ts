import { Router } from 'express';
import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import prisma from '@/config/database';

const router = Router();

// Health check endpoint
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: 'connected',
    });
  } catch (error) {
    sendError(res, 'SERVICE_UNAVAILABLE', 'Database connection failed', 503);
  }
});

// Readiness check
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, { ready: true });
  } catch (error) {
    sendError(res, 'NOT_READY', 'Service not ready', 503);
  }
});

// Liveness check
router.get('/live', (_req: Request, res: Response) => {
  sendSuccess(res, { alive: true });
});

export default router;

