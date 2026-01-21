// API Response Types
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Auth Types
export interface RegisterRequest {
  phoneNumber: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  countryCode: string;
}

export interface RegisterResponse {
  userId: string;
  phoneNumber: string;
  requiresVerification: boolean;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    userId: string;
    verified: boolean;
  };
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

export interface Country {
  code: string;
  name: string;
  is_allowed: boolean;
}

export interface AllowedCountriesResponse {
  countries: Country[];
}

export interface PasswordResetRequest {
  phoneNumber: string;
}

export interface PasswordResetVerify {
  token: string;
}

export interface PasswordResetComplete {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

