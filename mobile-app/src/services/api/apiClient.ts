import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, ERROR_MESSAGES } from '../../utils/constants';
import { ApiResponse, ApiErrorResponse } from '../../types/api.types';
import { getAuthToken, getRefreshToken, setAuthToken, clearAuthTokens } from '../storage/authStorage';
import { announceError, announceNetworkStatus } from '../accessibility/accessibilityUtils';
import NetInfo from '@react-native-community/netinfo';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      announceNetworkStatus(false);
      return Promise.reject(new Error(ERROR_MESSAGES.OFFLINE));
    }

    // Handle 401 Unauthorized - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          await clearAuthTokens();
          return Promise.reject(new Error(ERROR_MESSAGES.UNAUTHORIZED));
        }

        // Attempt to refresh token
        const response = await axios.post<ApiResponse<{ token: string; expiresIn: number }>>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        if (response.data.success && 'data' in response.data) {
          const { token } = response.data.data;
          await setAuthToken(token);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        await clearAuthTokens();
        announceError(ERROR_MESSAGES.UNAUTHORIZED);
        return Promise.reject(new Error(ERROR_MESSAGES.UNAUTHORIZED));
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.error?.message || error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
    
    // Announce error to screen reader
    if (error.response?.status !== 401) {
      announceError(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

