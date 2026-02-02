/**
 * Auth API service – mirrors backend routes under /api/v1/auth
 * App uses OTP-only login (no password, no password reset).
 */
import { apiClient } from './apiClient';

const AUTH_PREFIX = '/auth';

export type OTPPurpose = 'REGISTRATION' | 'LOGIN';

export interface SendOTPParams {
  phoneNumber: string;
  purpose: OTPPurpose;
}

export interface VerifyOTPParams {
  phoneNumber: string;
  otpCode: string;
  purpose: OTPPurpose;
}

export interface RegisterParams {
  phoneNumber: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  countryCode: string;
}

export interface LoginParams {
  phoneNumber: string;
  password: string;
}

export interface AuthUserResponse {
  userId: string;
  phoneNumber: string;
  verified: boolean;
  firstName?: string;
  lastName?: string;
  email?: string | null;
}

export interface AllowedCountry {
  code: string;
  name: string;
}

export const authService = {
  sendOTP: (params: SendOTPParams) =>
    apiClient.post(`${AUTH_PREFIX}/send-otp`, params),

  verifyOTP: (params: VerifyOTPParams) =>
    apiClient.post(`${AUTH_PREFIX}/verify-otp`, params),

  register: (params: RegisterParams) =>
    apiClient.post(`${AUTH_PREFIX}/register`, params),

  login: (params: LoginParams) =>
    apiClient.post(`${AUTH_PREFIX}/login`, params),

  refresh: () =>
    apiClient.post(`${AUTH_PREFIX}/refresh`, {}),

  logout: () =>
    apiClient.post(`${AUTH_PREFIX}/logout`, {}),

  getAllowedCountries: () =>
    apiClient.get(`${AUTH_PREFIX}/allowed-countries`),
};
