import { z } from 'zod';

// Initiate verification schema
export const initiateVerificationSchema = z.object({
  body: z.object({
    method: z.enum(['DOCUMENT', 'VIDEO_CALL', 'REFERRAL'], {
      errorMap: () => ({ message: 'Method must be DOCUMENT, VIDEO_CALL, or REFERRAL' }),
    }),
  }),
});

// Upload document schema
export const uploadDocumentSchema = z.object({
  body: z.object({
    documentType: z
      .string()
      .min(1, 'Document type is required')
      .max(50, 'Document type must be less than 50 characters'),
    documentUrl: z.string().url('Invalid document URL'),
  }),
});

// Schedule call schema
export const scheduleCallSchema = z.object({
  body: z.object({
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    preferredTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    timezone: z.string().min(1, 'Timezone is required'),
  }),
});

// Get verification status schema (no params needed)
export const getVerificationStatusSchema = z.object({
  query: z.object({}).optional(),
});

// Approve verification schema (admin/moderator)
export const approveVerificationSchema = z.object({
  params: z.object({
    verificationId: z.string().uuid('Invalid verification ID format'),
  }),
});

// Reject verification schema (admin/moderator)
export const rejectVerificationSchema = z.object({
  params: z.object({
    verificationId: z.string().uuid('Invalid verification ID format'),
  }),
  body: z.object({
    rejectionReason: z
      .string()
      .min(1, 'Rejection reason is required')
      .max(500, 'Rejection reason must be less than 500 characters'),
  }),
});

// Get pending verifications schema (admin/moderator)
export const getPendingVerificationsSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

// Export types
export type InitiateVerificationInput = z.infer<typeof initiateVerificationSchema>['body'];
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>['body'];
export type ScheduleCallInput = z.infer<typeof scheduleCallSchema>['body'];

