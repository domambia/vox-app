import apiClient from './apiClient';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  AllowedCountriesResponse,
  PasswordResetRequest,
  PasswordResetVerify,
  PasswordResetComplete,
  ChangePasswordRequest,
  ApiResponse,
} from '../../types/api.types';

export const authApi = {
  register: async (data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> => {
    const response = await apiClient.post<ApiResponse<RegisterResponse>>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data;
  },

  refresh: async (): Promise<ApiResponse<RefreshTokenResponse>> => {
    const response = await apiClient.post<ApiResponse<RefreshTokenResponse>>('/auth/refresh');
    return response.data;
  },

  logout: async (): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/auth/logout');
    return response.data;
  },

  getAllowedCountries: async (): Promise<ApiResponse<AllowedCountriesResponse>> => {
    const response = await apiClient.get<ApiResponse<AllowedCountriesResponse>>('/auth/allowed-countries');
    return response.data;
  },

  requestPasswordReset: async (data: PasswordResetRequest): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/auth/password-reset/request', data);
    return response.data;
  },

  verifyPasswordReset: async (data: PasswordResetVerify): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/auth/password-reset/verify', data);
    return response.data;
  },

  completePasswordReset: async (data: PasswordResetComplete): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/auth/password-reset/complete', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/auth/change-password', data);
    return response.data;
  },
};

