import { z } from 'zod';

// Phone number validation regex (supports international format)
const phoneRegex = /^\+[1-9]\d{1,14}$/;

// Password validation: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const registerSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters')
      .trim(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters')
      .trim(),
    email: z
      .string()
      .email('Invalid email format')
      .optional()
      .or(z.literal('')),
    phoneNumber: z
      .string()
      .min(1, 'Phone number is required')
      .regex(phoneRegex, 'Phone number must be in international format (e.g., +35612345678)'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        passwordRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    countryCode: z
      .string()
      .length(2, 'Country code must be 2 characters (ISO 3166-1 alpha-2)')
      .toUpperCase(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    phoneNumber: z
      .string()
      .min(1, 'Phone number is required')
      .regex(phoneRegex, 'Phone number must be in international format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({}).optional(), // Refresh token comes from header
});

export const logoutSchema = z.object({
  body: z.object({}).optional(), // Token comes from header
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  body: z.object({
    phoneNumber: z
      .string()
      .min(1, 'Phone number is required')
      .regex(phoneRegex, 'Phone number must be in international format'),
    email: z
      .string()
      .email('Invalid email format')
      .optional(),
  }),
});

// Password reset verify schema
export const passwordResetVerifySchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
  }),
});

// Password reset complete schema
export const passwordResetCompleteSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        passwordRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  }),
});

// OTP send schema (devBypassOtp only used in development to skip OTP and return tokens)
export const sendOTPSchema = z.object({
  body: z.object({
    phoneNumber: z
      .string()
      .min(1, 'Phone number is required')
      .regex(phoneRegex, 'Phone number must be in international format (e.g., +35612345678)'),
    purpose: z.enum(['REGISTRATION', 'LOGIN'], {
      errorMap: () => ({ message: 'Purpose must be either REGISTRATION or LOGIN' }),
    }),
    devBypassOtp: z.boolean().optional(),
  }),
});

// OTP verify schema
export const verifyOTPSchema = z.object({
  body: z.object({
    phoneNumber: z
      .string()
      .min(1, 'Phone number is required')
      .regex(phoneRegex, 'Phone number must be in international format'),
    otpCode: z
      .string()
      .length(6, 'OTP code must be 6 digits')
      .regex(/^\d{6}$/, 'OTP code must contain only digits'),
    purpose: z.enum(['REGISTRATION', 'LOGIN'], {
      errorMap: () => ({ message: 'Purpose must be either REGISTRATION or LOGIN' }),
    }),
  }),
});

// Change password schema
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        passwordRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type SendOTPInput = z.infer<typeof sendOTPSchema>['body'];
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>['body'];
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>['body'];
export type PasswordResetCompleteInput = z.infer<typeof passwordResetCompleteSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];

