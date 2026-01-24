import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../../config/env';

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
      baseURL: env.API_BASE_URL,
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
      async (config) => {
        // Add authorization header if token exists
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Ensure response has expected structure
        if (!response.data.success) {
          return Promise.reject(new Error(response.data.error?.message || 'Request failed'));
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (!originalRequest) {
          return Promise.reject(error);
        }

        // Handle token refresh
      if (error.response?.status === 401 && !(originalRequest as any)._retry) {
        (originalRequest as any)._retry = true;

          try {
            // Refresh token
            await this.refreshTokenIfNeeded();

            // Retry original request with new token
            const token = await AsyncStorage.getItem('accessToken');
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Token refresh failed, redirect to login
            await this.handleAuthFailure();
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors (offline)
        if (!error.response && error.code === 'NETWORK_ERROR') {
          // Queue request for when online
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
          `${env.API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const { token } = response.data.data;
        await AsyncStorage.setItem('accessToken', token);

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
