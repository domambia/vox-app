import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '@/config/env';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import path from 'path';

// Import routes
import healthRoutes from '@/routes/health.routes';
import filesRoutes from '@/routes/files.routes';
import authRoutes from '@/routes/auth.routes';
import countryRoutes from '@/routes/country.routes';
import profileRoutes from '@/routes/profile.routes';
import discoveryRoutes from '@/routes/discovery.routes';
import kycRoutes from '@/routes/kyc.routes';
import groupRoutes from '@/routes/group.routes';
import eventRoutes from '@/routes/event.routes';
import userRoutes from '@/routes/user.routes';
import messagingRoutes from '@/routes/messaging.routes';
import messagesRoutes from '@/routes/messages.routes';
import voiceCallRoutes from '@/routes/voiceCall.routes';
import adminRoutes from '@/routes/admin.routes';
import notificationsRoutes from '@/routes/notifications.routes';
import swaggerRoutes from '@/routes/swagger.routes';

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

// Serve uploaded files
app.use(
  `/api/${config.apiVersion}/files`,
  express.static(path.join(process.cwd(), config.upload.uploadDir))
);

// API Routes
const apiPrefix = `/api/${config.apiVersion}`;

// Swagger Documentation (before other routes)
app.use('/api-docs', swaggerRoutes);

app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/files`, filesRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/countries`, countryRoutes);
app.use(`${apiPrefix}/profile`, profileRoutes);
app.use(`${apiPrefix}/profiles`, discoveryRoutes);
app.use(`${apiPrefix}/kyc`, kycRoutes);
app.use(`${apiPrefix}/groups`, groupRoutes);
app.use(`${apiPrefix}/events`, eventRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/conversations`, messagingRoutes);
app.use(`${apiPrefix}/messages`, messagesRoutes);
app.use(`${apiPrefix}/calls`, voiceCallRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use(`${apiPrefix}/notifications`, notificationsRoutes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

