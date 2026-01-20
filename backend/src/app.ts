import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '@/config/env';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import { generalLimiter } from '@/middleware/rateLimit.middleware';
import { logger } from '@/utils/logger';
import path from 'path';

// Import routes
import healthRoutes from '@/routes/health.routes';
import filesRoutes from '@/routes/files.routes';
import authRoutes from '@/routes/auth.routes';
import countryRoutes from '@/routes/country.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Rate limiting
app.use(generalLimiter);

// Serve uploaded files
app.use(
  `/api/${config.apiVersion}/files`,
  express.static(path.join(process.cwd(), config.upload.uploadDir))
);

// API Routes
const apiPrefix = `/api/${config.apiVersion}`;
app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/files`, filesRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/countries`, countryRoutes);
// app.use(`${apiPrefix}/auth`, authRoutes);
// app.use(`${apiPrefix}/profile`, profileRoutes);
// ... other routes

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

