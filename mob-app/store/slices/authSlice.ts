import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../services/api/apiClient';

export interface User {
  userId: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  countryCode: string;
  verified: boolean;
  verificationDate?: string;
  lastActive?: string;
  isActive: boolean;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  createdAt: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  lastSync: string | null;
  otpSent: boolean;
  otpPhoneNumber: string | null;
  otpPurpose: 'REGISTRATION' | 'LOGIN' | null;
  otpExpiresIn: number | null;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isOffline: false,
  lastSync: null,
  otpSent: false,
  otpPhoneNumber: null,
  otpPurpose: null,
  otpExpiresIn: null,
};

// Async thunks for auth operations
export const sendOTP = createAsyncThunk(
  'auth/sendOTP',
  async ({ phoneNumber, purpose }: { phoneNumber: string; purpose: 'REGISTRATION' | 'LOGIN' }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/send-otp', { phoneNumber, purpose });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to send OTP');
    }
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ phoneNumber, otpCode, purpose }: { phoneNumber: string; otpCode: string; purpose: 'REGISTRATION' | 'LOGIN' }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/verify-otp', { phoneNumber, otpCode, purpose });
      const { token, refreshToken, expiresIn, user } = response.data.data;

      // Store tokens securely
      await AsyncStorage.setItem('accessToken', token);
      await AsyncStorage.setItem('refreshToken', refreshToken);

      return { token, refreshToken, expiresIn, user };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'OTP verification failed');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ phoneNumber, password }: { phoneNumber?: string; password: string }, { rejectWithValue }) => {
    try {
      const loginData: { password: string; phoneNumber?: string } = { password };
      if (phoneNumber) {
        loginData.phoneNumber = phoneNumber;
      }
      const response = await apiClient.post('/auth/login', loginData);
      const { token, refreshToken, expiresIn, user } = response.data.data;

      // Store tokens securely
      await AsyncStorage.setItem('accessToken', token);
      await AsyncStorage.setItem('refreshToken', refreshToken);

      return { token, refreshToken, expiresIn, user };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: {
    phoneNumber: string;
    password: string;
    firstName: string;
    lastName: string;
    email?: string;
    countryCode: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Registration failed');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post(
        '/auth/refresh',
        {},
        {
          headers: { Authorization: `Bearer ${refreshToken}` },
        }
      );

      const { token, expiresIn } = response.data.data;

      // Update stored token
      await AsyncStorage.setItem('accessToken', token);

      return { token, expiresIn };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Token refresh failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        await apiClient.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      // Logout should succeed even if API call fails
    } finally {
      // Clear stored tokens
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      console.log('Starting auth initialization...');

      // Check if there's a stored token
      const token = await AsyncStorage.getItem('accessToken');
      console.log('Stored token exists:', !!token);

      if (!token) {
        console.log('No stored token, resolving as unauthenticated');
        return null;
      }

      // Try to refresh token to verify it's still valid
      console.log('Attempting token refresh...');
      const result = await dispatch(refreshToken());

      if (refreshToken.fulfilled.match(result)) {
        console.log('Token refresh successful, fetching profile...');
        // Token refresh successful, get user profile
        const profileResponse = await apiClient.get('/profile/me', {
          headers: { Authorization: `Bearer ${result.payload.token}` }
        });
        console.log('Profile fetched successfully');
        return profileResponse.data.data;
      }

      console.log('Token refresh failed, user needs to login');
      return null;
    } catch (error) {
      console.warn('Auth initialization failed:', error);
      // Always resolve, never reject - we want the app to load even if auth fails
      return null;
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setOffline: (state, action: PayloadAction<boolean>) => {
      state.isOffline = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateLastSync: (state) => {
      state.lastSync = new Date().toISOString();
    },
    resetOTPState: (state) => {
      state.otpSent = false;
      state.otpPhoneNumber = null;
      state.otpPurpose = null;
      state.otpExpiresIn = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = {
          token: action.payload.token,
          refreshToken: action.payload.refreshToken,
          expiresIn: action.payload.expiresIn,
        };
        state.error = null;
        state.lastSync = new Date().toISOString();
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        // Registration successful, but user needs to verify
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        if (state.tokens) {
          state.tokens.token = action.payload.token;
          state.tokens.expiresIn = action.payload.expiresIn;
        }
      })
      .addCase(refreshToken.rejected, (state) => {
        // Token refresh failed, user needs to login again
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = null;
        state.lastSync = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload;
        }
      })
      .addCase(sendOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpSent = true;
        state.otpPhoneNumber = action.meta.arg.phoneNumber;
        state.otpPurpose = action.meta.arg.purpose;
        state.otpExpiresIn = action.payload.expiresIn;
        state.error = null;
      })
      .addCase(sendOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.otpSent = false;
      })
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = {
          token: action.payload.token,
          refreshToken: action.payload.refreshToken,
          expiresIn: action.payload.expiresIn,
        };
        state.error = null;
        state.lastSync = new Date().toISOString();
        // Reset OTP state after successful verification
        state.otpSent = false;
        state.otpPhoneNumber = null;
        state.otpPurpose = null;
        state.otpExpiresIn = null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setError, setOffline, clearError, updateLastSync, resetOTPState } = authSlice.actions;
export default authSlice.reducer;
