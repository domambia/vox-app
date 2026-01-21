import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../services/api/auth.api';
import { LoginRequest, RegisterRequest } from '../../types/api.types';
import { User } from '../../types/models.types';
import { setAuthToken, setRefreshToken, setUserData, clearAuthTokens, getAuthToken } from '../../services/storage/authStorage';
import { announceSuccess, announceError } from '../../services/accessibility/accessibilityUtils';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../utils/constants';

interface AuthState {
  user: Partial<User> & { userId: string } | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      if (response.success && 'data' in response) {
        const { token, refreshToken, user: userPartial } = response.data;
        await setAuthToken(token);
        await setRefreshToken(refreshToken);
        announceSuccess(SUCCESS_MESSAGES.LOGIN_SUCCESS);
        // Login response only returns userId and verified
        // Full user profile should be fetched from profile API after login
        const user: Partial<User> & { userId: string; verified: boolean } = {
          userId: userPartial.userId,
          verified: userPartial.verified,
        };
        return { token, refreshToken, user };
      }
      throw new Error('Login failed');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
      announceError(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.register(data);
      if (response.success && 'data' in response) {
        announceSuccess(SUCCESS_MESSAGES.REGISTRATION_SUCCESS);
        return response.data;
      }
      throw new Error('Registration failed');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
      announceError(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch (error) {
    // Continue with logout even if API call fails
  } finally {
    await clearAuthTokens();
  }
});

export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.refresh();
      if (response.success && 'data' in response) {
        const { token } = response.data;
        await setAuthToken(token);
        return token;
      }
      throw new Error('Token refresh failed');
    } catch (error: any) {
      await clearAuthTokens();
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ token: string; refreshToken: string; user: User }>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Refresh token
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.token = action.payload;
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setCredentials, clearAuth } = authSlice.actions;
export default authSlice.reducer;

