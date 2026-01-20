import { z } from 'zod';
import { CallStatus } from '@prisma/client';

// Initiate call schema
export const initiateCallSchema = z.object({
  body: z.object({
    receiverId: z.string().uuid('Invalid receiver ID format'),
  }),
});

// Update call status schema
export const updateCallStatusSchema = z.object({
  params: z.object({
    callId: z.string().uuid('Invalid call ID format'),
  }),
  body: z.object({
    status: z.nativeEnum(CallStatus),
  }),
});

// End call schema
export const endCallSchema = z.object({
  params: z.object({
    callId: z.string().uuid('Invalid call ID format'),
  }),
});

// Get call schema
export const getCallSchema = z.object({
  params: z.object({
    callId: z.string().uuid('Invalid call ID format'),
  }),
});

// Get call history schema
export const getCallHistorySchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    status: z.nativeEnum(CallStatus).optional(),
  }),
});

// Generate token schema
export const generateTokenSchema = z.object({
  body: z.object({
    roomName: z.string().optional(),
  }),
});

