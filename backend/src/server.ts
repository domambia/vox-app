import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import prisma from './config/database';
import { initializeWebSocket } from './utils/websocket';
import { Server as HTTPServer } from 'http';

const PORT = config.port;

// Start HTTP server
const server: HTTPServer = app.listen(PORT, async () => {
  logger.info(`🚀 VOX API Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 API Version: ${config.apiVersion}`);

  // Test database connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed', error);
    process.exit(1);
  }

  // Initialize WebSocket server
  initializeWebSocket(server);
  logger.info('✅ WebSocket server initialized');
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

