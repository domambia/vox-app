import { z } from 'zod';

// Looking for enum values
const lookingForEnum = z.enum(['DATING', 'FRIENDSHIP', 'HOBBY', 'ALL']);

// Create profile schema
export const createProfileSchema = z.object({
  body: z.object({
    bio: z
      .string()
      .max(500, 'Bio must be less than 500 characters')
      .optional()
      .or(z.literal('')),
    interests: z
      .array(z.string().min(1).max(50))
      .max(20, 'Maximum 20 interests allowed')
      .default([]),
    location: z
      .string()
      .max(255, 'Location must be less than 255 characters')
      .optional()
      .or(z.literal('')),
    lookingFor: lookingForEnum.default('ALL'),
    voiceBioUrl: z.string().url('Invalid voice bio URL').optional().or(z.literal('')),
  }),
});

// Update profile schema (all fields optional)
export const updateProfileSchema = z.object({
  body: z.object({
    bio: z
      .string()
      .max(500, 'Bio must be less than 500 characters')
      .optional()
      .or(z.literal('')),
    interests: z
      .array(z.string().min(1).max(50))
      .max(20, 'Maximum 20 interests allowed')
      .optional(),
    location: z
      .string()
      .max(255, 'Location must be less than 255 characters')
      .optional()
      .or(z.literal('')),
    lookingFor: lookingForEnum.optional(),
    voiceBioUrl: z.string().url('Invalid voice bio URL').optional().or(z.literal('')),
  }),
});

// Get profile schema (params)
export const getProfileSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Delete profile schema (params)
export const deleteProfileSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Voice bio upload schema
export const uploadVoiceBioSchema = z.object({
  body: z.object({}).optional(), // File comes from multipart/form-data
});

// Export types
export type CreateProfileInput = z.infer<typeof createProfileSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];

