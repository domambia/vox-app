import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../services/api/apiClient';
import { websocketService } from '../../services/websocket/websocketService';
import { getWsBaseUrl } from '../../config/env';

export interface User {
  userId: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  countryCode?: string;
  verified: boolean;
  verificationDate?: string;
  lastActive?: string;
  isActive: boolean;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  createdAt: string;
}

/** Backend profile/me returns profile with included user (snake_case) */
interface BackendProfileUser {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string;
  verified: boolean;
  created_at?: string;
}

interface BackendProfileResponse {
  user_id: string;
  user?: BackendProfileUser;
  [key: string]: any;
}

/** Backend login/verifyOTP returns user with camelCase or snake_case */
interface BackendAuthUser {
  userId?: string;
  user_id?: string;
  phoneNumber?: string;
  phone_number?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  email?: string | null;
  verified?: boolean;
}

function mapBackendAuthUserToUser(backend: BackendAuthUser | null | undefined): User | null {
  if (!backend) return null;
  const userId = backend.userId ?? backend.user_id ?? '';
  const phoneNumber = backend.phoneNumber ?? backend.phone_number ?? '';
  const firstName = backend.firstName ?? backend.first_name ?? '';
  const lastName = backend.lastName ?? backend.last_name ?? '';
  const email = backend.email ?? undefined;
  return {
    userId,
    phoneNumber,
    firstName,
    lastName,
    email: email || undefined,
    countryCode: '',
    verified: backend.verified ?? false,
    isActive: true,
    role: 'USER',
    createdAt: '',
  };
}

function mapBackendProfileToUser(profile: BackendProfileResponse | null | undefined): User | null {
  if (!profile?.user) return null;
  const u = profile.user as BackendProfileUser;
  return {
    userId: u.user_id,
    phoneNumber: u.phone_number,
    firstName: u.first_name ?? '',
    lastName: u.last_name ?? '',
    email: undefined,
    countryCode: undefined,
    verified: u.verified,
    isActive: true,
    role: 'USER',
    createdAt: u.created_at ?? '',
  };
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AllowedCountry {
  code: string;
  name: string;
}

export interface AuthError {
  code?: string;
  message: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  isOffline: boolean;
  lastSync: string | null;
  otpSent: boolean;
  otpPhoneNumber: string | null;
  otpPurpose: 'REGISTRATION' | 'LOGIN' | null;
  otpExpiresIn: number | null;
  /** When true, main app should open on Profile tab (e.g. after OTP login). */
  postLogin: boolean;
  allowedCountries: AllowedCountry[];
  allowedCountriesLoaded: boolean;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  errorCode: null,
  isOffline: false,
  lastSync: null,
  otpSent: false,
  otpPhoneNumber: null,
  otpPurpose: null,
  otpExpiresIn: null,
  postLogin: false,
  allowedCountries: [],
  allowedCountriesLoaded: false,
};

/**
 * Helper function to connect WebSocket after authentication
 */
const connectWebSocket = async (token: string): Promise<void> => {
  try {
    const wsUrl = getWsBaseUrl();
    websocketService.connect(wsUrl, token);
    console.log('WebSocket connection initiated');
  } catch (error) {
    console.error('Failed to connect WebSocket:', error);
    // Don't throw - WebSocket connection failure shouldn't block auth
  }
};

/**
 * Helper function to disconnect WebSocket
 */
const disconnectWebSocket = (): void => {
  try {
    websocketService.disconnect();
    console.log('WebSocket disconnected');
  } catch (error) {
    console.error('Error disconnecting WebSocket:', error);
  }
};

function getAuthError(error: any, fallbackMessage: string): AuthError {
  const data = error?.response?.data?.error;
  return {
    code: data?.code,
    message: data?.message || error?.message || fallbackMessage,
  };
}

// Async thunks for auth operations
// In development, pass devBypassOtp: true to get tokens directly from send-otp (skip OTP screen).
export const sendOTP = createAsyncThunk(
  'auth/sendOTP',
  async (
    { phoneNumber, purpose, devBypassOtp }: { phoneNumber: string; purpose: 'REGISTRATION' | 'LOGIN'; devBypassOtp?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const body: { phoneNumber: string; purpose: 'REGISTRATION' | 'LOGIN'; devBypassOtp?: boolean } = {
        phoneNumber,
        purpose,
      };
      if (__DEV__ && devBypassOtp) body.devBypassOtp = true;

      const response = await apiClient.post('/auth/send-otp', body);
      const data = response.data?.data ?? response.data;

      // Dev bypass: backend returned tokens; store and return same shape as verifyOTP
      if (data?.token) {
        const { token, refreshToken, expiresIn, user: minimalUser } = data;
        await AsyncStorage.setItem('accessToken', token);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await connectWebSocket(token);
        let user = mapBackendAuthUserToUser(minimalUser);
        try {
          const profileRes = await apiClient.get('/profile/me');
          const raw = profileRes.data?.data ?? profileRes.data;
          const profileUser = mapBackendProfileToUser(raw);
          if (profileUser) user = profileUser;
        } catch {
          // keep minimal user
        }
        return { token, refreshToken, expiresIn, user, _devBypass: true };
      }

      return data;
    } catch (error: any) {
      return rejectWithValue(getAuthError(error, 'Failed to send OTP'));
    }
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ phoneNumber, otpCode, purpose }: { phoneNumber: string; otpCode: string; purpose: 'REGISTRATION' | 'LOGIN' }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/verify-otp', { phoneNumber, otpCode, purpose });
      const data = response.data?.data ?? response.data;
      const { token, refreshToken, expiresIn, user: minimalUser } = data;

      await AsyncStorage.setItem('accessToken', token);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await connectWebSocket(token);

      // Fetch full profile after OTP success for display name etc.
      let user = mapBackendAuthUserToUser(minimalUser);
      try {
        const profileRes = await apiClient.get('/profile/me');
        const raw = profileRes.data?.data ?? profileRes.data;
        const profileUser = mapBackendProfileToUser(raw);
        if (profileUser) user = profileUser;
      } catch {
        // 404 or other: keep minimal user from verifyOTP
      }

      return { token, refreshToken, expiresIn, user };
    } catch (error: any) {
      return rejectWithValue(getAuthError(error, 'OTP verification failed'));
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

      await AsyncStorage.setItem('accessToken', token);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await connectWebSocket(token);

      return { token, refreshToken, expiresIn, user };
    } catch (error: any) {
      return rejectWithValue(getAuthError(error, 'Login failed'));
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
      return rejectWithValue(getAuthError(error, 'Registration failed'));
    }
  }
);

export const getAllowedCountries = createAsyncThunk(
  'auth/getAllowedCountries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/auth/allowed-countries');
      const data = response.data?.data ?? response.data;
      const countries = data?.countries ?? data ?? [];
      return countries as AllowedCountry[];
    } catch (error: any) {
      return rejectWithValue(getAuthError(error, 'Failed to load countries'));
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post(
        '/auth/refresh',
        {},
        {
          headers: { Authorization: `Bearer ${refreshTokenValue}` },
        }
      );

      // Backend returns { token, expiresIn } (refreshToken may be omitted)
      const data = response.data?.data ?? response.data;
      const token = data?.token;
      const newRefreshToken = data?.refreshToken;
      const expiresIn = data?.expiresIn ?? 3600;

      if (token) {
        await AsyncStorage.setItem('accessToken', token);
      }
      if (newRefreshToken) {
        await AsyncStorage.setItem('refreshToken', newRefreshToken);
      }

      if (websocketService.getIsConnected()) {
        disconnectWebSocket();
      }
      await connectWebSocket(token);

      return { token, refreshToken: newRefreshToken, expiresIn };
    } catch (error: any) {
      // Clear invalid/expired tokens so we don't retry on next launch
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      return rejectWithValue(getAuthError(error, 'Token refresh failed'));
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
      // Disconnect WebSocket
      disconnectWebSocket();
      
      // Clear stored tokens
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
    }
  }
);

export interface InitializeAuthResult {
  user: User | null;
}

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch }): Promise<InitializeAuthResult | null> => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        return null;
      }

      const result = await dispatch(refreshToken());
      if (!refreshToken.fulfilled.match(result)) {
        return null;
      }

      const accessToken = result.payload.token;
      await connectWebSocket(accessToken);

      try {
        const profileResponse = await apiClient.get('/profile/me');
        const raw = profileResponse.data?.data ?? profileResponse.data;
        const user = mapBackendProfileToUser(raw);
        return { user };
      } catch (profileError: any) {
        // 404 = no profile yet (new user); still authenticated
        if (profileError.response?.status === 404) {
          return { user: null };
        }
        throw profileError;
      }
    } catch {
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
      state.errorCode = null;
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
    clearPostLogin: (state) => {
      state.postLogin = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(getAllowedCountries.fulfilled, (state, action) => {
        state.allowedCountries = action.payload ?? [];
        state.allowedCountriesLoaded = true;
      })
      .addCase(getAllowedCountries.rejected, (state) => {
        state.allowedCountriesLoaded = true;
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.errorCode = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = mapBackendAuthUserToUser(action.payload.user) ?? state.user;
        state.tokens = {
          token: action.payload.token,
          refreshToken: action.payload.refreshToken ?? state.tokens?.refreshToken ?? '',
          expiresIn: action.payload.expiresIn ?? 3600,
        };
        state.error = null;
        state.errorCode = null;
        state.lastSync = new Date().toISOString();
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        const p = action.payload as AuthError | string | undefined;
        state.error = typeof p === 'object' ? p?.message : p ?? null;
        state.errorCode = typeof p === 'object' && p?.code ? p.code : null;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.errorCode = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.errorCode = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        const p = action.payload as AuthError | string | undefined;
        state.error = typeof p === 'object' ? p?.message : p ?? null;
        state.errorCode = typeof p === 'object' && p?.code ? p.code : null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        if (state.tokens) {
          state.tokens.token = action.payload.token;
          state.tokens.expiresIn = action.payload.expiresIn;
          if (action.payload.refreshToken) {
            state.tokens.refreshToken = action.payload.refreshToken;
          }
        }
      })
      .addCase(refreshToken.rejected, (state, action) => {
        // Token refresh failed (invalid/expired); user must go to login
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        const p = action.payload as AuthError | string | undefined;
        state.errorCode = typeof p === 'object' && p?.code ? p.code : 'UNAUTHORIZED';
        state.error = typeof p === 'object' ? p?.message : p ?? 'Session expired';
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = null;
        state.errorCode = null;
        state.lastSync = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user ?? state.user;
        }
      })
      .addCase(sendOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        // Dev bypass: payload has token → treat as login, go to Profile
        const p = action.payload as any;
        if (p?.token && p?._devBypass) {
          state.isAuthenticated = true;
          state.user = mapBackendAuthUserToUser(p.user) ?? state.user;
          state.tokens = {
            token: p.token,
            refreshToken: p.refreshToken ?? '',
            expiresIn: p.expiresIn ?? 3600,
          };
          state.postLogin = true;
          state.otpSent = false;
          state.otpPhoneNumber = null;
          state.otpPurpose = null;
          state.otpExpiresIn = null;
          state.lastSync = new Date().toISOString();
          return;
        }
        state.otpSent = true;
        state.otpPhoneNumber = action.meta.arg.phoneNumber;
        state.otpPurpose = action.meta.arg.purpose;
        state.otpExpiresIn = p?.expiresIn ?? null;
      })
      .addCase(sendOTP.rejected, (state, action) => {
        state.isLoading = false;
        const p = action.payload as AuthError | string | undefined;
        state.error = typeof p === 'object' ? p?.message : p ?? 'Failed to send OTP';
        state.errorCode = typeof p === 'object' && p?.code ? p.code : null;
        state.otpSent = false;
      })
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = mapBackendAuthUserToUser(action.payload.user) ?? state.user;
        state.tokens = {
          token: action.payload.token,
          refreshToken: action.payload.refreshToken ?? '',
          expiresIn: action.payload.expiresIn ?? 3600,
        };
        state.error = null;
        state.lastSync = new Date().toISOString();
        state.otpSent = false;
        state.otpPhoneNumber = null;
        state.otpPurpose = null;
        state.otpExpiresIn = null;
        state.postLogin = true;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        const p = action.payload as AuthError | string | undefined;
        state.error = typeof p === 'object' ? p?.message : p ?? null;
        state.errorCode = typeof p === 'object' && p?.code ? p.code : null;
      });
  },
});

export const { setError, setOffline, clearError, updateLastSync, resetOTPState, clearPostLogin } = authSlice.actions;
export default authSlice.reducer;
