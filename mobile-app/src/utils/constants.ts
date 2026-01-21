// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
export const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_BASE_URL || 'http://localhost:3000';
export const ENVIRONMENT = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@vox/auth_token',
  REFRESH_TOKEN: '@vox/refresh_token',
  USER_DATA: '@vox/user_data',
  ACCESSIBILITY_PREFS: '@vox/accessibility_prefs',
  OFFLINE_QUEUE: '@vox/offline_queue',
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0,
  MESSAGES_LIMIT: 50,
} as const;

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'TEXT',
  VOICE: 'VOICE',
  IMAGE: 'IMAGE',
  FILE: 'FILE',
  SYSTEM: 'SYSTEM',
} as const;

// Call Status
export const CALL_STATUS = {
  INITIATED: 'INITIATED',
  RINGING: 'RINGING',
  ANSWERED: 'ANSWERED',
  REJECTED: 'REJECTED',
  MISSED: 'MISSED',
  ENDED: 'ENDED',
  CANCELLED: 'CANCELLED',
} as const;

// Looking For Options
export const LOOKING_FOR_OPTIONS = {
  DATING: 'dating',
  FRIENDSHIP: 'friendship',
  HOBBY: 'hobby',
  ALL: 'all',
} as const;

// KYC Methods
export const KYC_METHODS = {
  DOCUMENT: 'document',
  VIDEO_CALL: 'video_call',
  REFERRAL: 'referral',
} as const;

// RSVP Status
export const RSVP_STATUS = {
  GOING: 'going',
  MAYBE: 'maybe',
  NOT_GOING: 'not_going',
} as const;

// Accessibility
export const ACCESSIBILITY = {
  MIN_TOUCH_TARGET: 48, // dp
  MIN_SPACING: 8, // dp
  MIN_FONT_SIZE: 16, // sp
  PREFERRED_FONT_SIZE: 18, // sp
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  OFFLINE: 'You are offline. Some features may not work.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful. Welcome to VOX.',
  REGISTRATION_SUCCESS: 'Account created successfully.',
  PASSWORD_RESET_SUCCESS: 'Password reset successful. You can now log in.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  MESSAGE_SENT: 'Message sent.',
  CALL_INITIATED: 'Call initiated.',
} as const;

