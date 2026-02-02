import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env, getApiBaseUrl } from '../../config/env';
import { websocketService } from '../websocket/websocketService';

const LOG_API = env.ENVIRONMENT === 'development' || __DEV__;
const API_BASE_URL = getApiBaseUrl();

/** Keys to redact in request/response logs */
const SENSITIVE_KEYS = [
  'password', 'currentPassword', 'newPassword', 'token', 'refreshToken',
  'refresh_token', 'otpCode', 'otp_code', 'accessToken', 'authorization',
];

function redact(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sk) => keyLower.includes(sk.toLowerCase()));
    out[k] = isSensitive ? '[REDACTED]' : redact(v);
  }
  return out;
}

function logRequest(config: InternalAxiosRequestConfig) {
  if (!LOG_API) return;
  const method = (config.method ?? 'get').toUpperCase();
  const url = config.url ?? '';
  const fullUrl = config.baseURL ? `${config.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url;
  const body = config.data ? (typeof config.data === 'string' ? tryParse(config.data) : config.data) : undefined;
  console.log('[API Request]', {
    method,
    url: fullUrl,
    requestId: config.headers?.['X-Request-ID'],
    body: body ? redact(body) : undefined,
  });
}

function tryParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function logResponse(response: AxiosResponse) {
  if (!LOG_API) return;
  const status = response.status;
  const url = response.config?.url ?? '';
  const data = response.data;
  console.log('[API Response]', {
    status,
    url,
    requestId: response.config?.headers?.['X-Request-ID'],
    body: data ? redact(data) : undefined,
  });
}

function logError(error: AxiosError) {
  if (!LOG_API) return;
  const status = error.response?.status;
  const url = error.config?.url ?? '';
  const data = (error.response as any)?.data;
  console.log('[API Error]', {
    status,
    url,
    requestId: error.config?.headers?.['X-Request-ID'],
    body: data ? redact(data) : undefined,
    message: error.message,
  });
}

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<any> | null = null;
  private offlineQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    request: () => Promise<any>;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Add authorization header if token exists
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        logRequest(config);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logResponse(response);
        // Accept both { success, data } and raw data (e.g. some 200/201)
        const data = response.data;
        if (data && typeof data === 'object' && data.success === false) {
          return Promise.reject(new Error(data.error?.message || 'Request failed'));
        }
        return response;
      },
      async (error: AxiosError) => {
        logError(error);
        const originalRequest = error.config;

        if (!originalRequest) {
          return Promise.reject(error);
        }

        // Handle token refresh (skip for auth/refresh and auth/login to avoid loops)
        const isAuthEndpoint = originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login');
        if (
          error.response?.status === 401 &&
          !(originalRequest as any)._retry &&
          !isAuthEndpoint
        ) {
          (originalRequest as any)._retry = true;

          try {
            await this.refreshTokenIfNeeded();

            const token = await AsyncStorage.getItem('accessToken');
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            await this.handleAuthFailure();
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors (offline)
        if (!error.response && error.code === 'NETWORK_ERROR') {
          return new Promise((resolve, reject) => {
            this.offlineQueue.push({
              resolve,
              reject,
              request: () => this.client(originalRequest),
            });
          });
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        // Backend returns { token, expiresIn } (no new refreshToken)
        const payload = response.data?.data ?? response.data;
        const token = payload?.token;
        const newRefreshToken = payload?.refreshToken;
        if (token) {
          await AsyncStorage.setItem('accessToken', token);
        }
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }

        return token;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async handleAuthFailure(): Promise<void> {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    // Disconnect WebSocket on auth failure
    websocketService.disconnect();
    // Navigation to login screen will be handled by auth state change
  }

  // Process offline queue when connection is restored
  public async processOfflineQueue(): Promise<void> {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      try {
        const result = await item.request();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
  }

  // Public methods for HTTP operations
  public async get(url: string, config?: any): Promise<AxiosResponse> {
    return this.client.get(url, config);
  }

  public async post(url: string, data?: any, config?: any): Promise<AxiosResponse> {
    return this.client.post(url, data, config);
  }

  public async put(url: string, data?: any, config?: any): Promise<AxiosResponse> {
    return this.client.put(url, data, config);
  }

  public async patch(url: string, data?: any, config?: any): Promise<AxiosResponse> {
    return this.client.patch(url, data, config);
  }

  public async delete(url: string, config?: any): Promise<AxiosResponse> {
    return this.client.delete(url, config);
  }

  // Get the underlying axios instance for advanced usage
  public getClient(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
