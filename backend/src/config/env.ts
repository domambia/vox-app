import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Redis (Optional)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // WebRTC (Voice Calls)
  webrtc: {
    // STUN/TURN server configuration
    // For production, configure your own TURN server
    stunServers: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
    ],
    turnServer: process.env.TURN_SERVER_URL || '',
    turnUsername: process.env.TURN_USERNAME || '',
    turnCredential: process.env.TURN_CREDENTIAL || '',
  },
};

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

if (config.nodeEnv === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

