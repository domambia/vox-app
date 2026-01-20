import { z } from 'zod';

// Discover profiles schema
export const discoverProfilesSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    location: z.string().max(255).optional(),
    lookingFor: z.enum(['DATING', 'FRIENDSHIP', 'HOBBY', 'ALL']).optional(),
    minInterests: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

// Like profile schema
export const likeProfileSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Unlike profile schema
export const unlikeProfileSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Get matches schema (no params needed, uses authenticated user)
export const getMatchesSchema = z.object({
  query: z.object({}).optional(),
});

// Get likes schema
export const getLikesSchema = z.object({
  query: z.object({
    type: z.enum(['given', 'received']).optional().default('given'),
  }),
});

