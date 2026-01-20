import { z } from 'zod';
import { UserRole, KYCStatus } from '@prisma/client';

// List users schema
export const listUsersSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z
      .string()
      .optional()
      .transform((val) => (val === 'true')),
    verified: z
      .string()
      .optional()
      .transform((val) => (val === 'true')),
    search: z.string().optional(),
  }),
});

// Get user details schema
export const getUserDetailsSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Update user status schema
export const updateUserStatusSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    isActive: z.boolean(),
    role: z.nativeEnum(UserRole).optional(),
  }),
});

// List KYC verifications schema
export const listKYCVerificationsSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    status: z.nativeEnum(KYCStatus).optional(),
    method: z.string().optional(),
  }),
});

