import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { config } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VOX Community Platform API',
      version: '1.0.0',
      description: 'RESTful API documentation for the VOX Community Platform - An accessible community platform for people with disabilities.',
      contact: {
        name: 'VOX API Support',
        email: 'support@vox.app',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/${config.apiVersion}`,
        description: 'Development server',
      },
      {
        url: `https://api.vox.app/api/${config.apiVersion}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 10,
            },
            total: {
              type: 'integer',
              example: 100,
            },
            totalPages: {
              type: 'integer',
              example: 10,
            },
            hasNext: {
              type: 'boolean',
              example: true,
            },
            hasPrev: {
              type: 'boolean',
              example: false,
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            phone_number: {
              type: 'string',
              example: '+1234567890',
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            verified: {
              type: 'boolean',
              example: false,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            expiresIn: {
              type: 'string',
              example: '1h',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Profile',
        description: 'User profile management',
      },
      {
        name: 'Discovery',
        description: 'Profile discovery and matching',
      },
      {
        name: 'KYC',
        description: 'Know Your Customer verification',
      },
      {
        name: 'Groups',
        description: 'Community groups management',
      },
      {
        name: 'Events',
        description: 'Events management',
      },
      {
        name: 'Messaging',
        description: 'Conversations and messaging',
      },
      {
        name: 'Voice Calls',
        description: 'WebRTC voice calls',
      },
      {
        name: 'Admin',
        description: 'Administrative operations',
      },
      {
        name: 'Countries',
        description: 'Country management',
      },
      {
        name: 'Files',
        description: 'File serving',
      },
    ],
  },
  apis: [
    // Absolute paths from dist/config (when running compiled code)
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../controllers/*.ts'),
    path.join(__dirname, '../app.ts'),
    // Also try from project root (relative to process.cwd())
    path.join(process.cwd(), 'src/routes/*.ts'),
    path.join(process.cwd(), 'src/controllers/*.ts'),
    path.join(process.cwd(), 'src/app.ts'),
    // Relative paths as fallback
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/app.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

