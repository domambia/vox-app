import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extraLarge';
  voiceSpeed: number; // 0.5 to 2.0
  hapticEnabled: boolean;
  hapticIntensity: 'light' | 'medium' | 'strong';
  announcementVerbosity: 'brief' | 'normal' | 'detailed';
  enableImageDescriptions: boolean;
}

export interface ThemeSettings {
  theme: 'light' | 'dark' | 'system';
  highContrast: boolean;
}

export interface NotificationSettings {
  messageNotifications: boolean;
  matchNotifications: boolean;
  eventNotifications: boolean;
  groupNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowProfileViews: boolean;
  allowMessagesFrom: 'everyone' | 'matches' | 'none';
}

export interface SettingsState {
  accessibility: AccessibilitySettings;
  theme: ThemeSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  isLoading: boolean;
  error: string | null;
}

const defaultAccessibility: AccessibilitySettings = {
  fontSize: 'medium',
  voiceSpeed: 1.0,
  hapticEnabled: true,
  hapticIntensity: 'medium',
  announcementVerbosity: 'normal',
  enableImageDescriptions: true,
};

const defaultTheme: ThemeSettings = {
  theme: 'system',
  highContrast: false,
};

const defaultNotifications: NotificationSettings = {
  messageNotifications: true,
  matchNotifications: true,
  eventNotifications: true,
  groupNotifications: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

const defaultPrivacy: PrivacySettings = {
  showOnlineStatus: true,
  showLastSeen: true,
  allowProfileViews: true,
  allowMessagesFrom: 'everyone',
};

const initialState: SettingsState = {
  accessibility: defaultAccessibility,
  theme: defaultTheme,
  notifications: defaultNotifications,
  privacy: defaultPrivacy,
  isLoading: false,
  error: null,
};

const SETTINGS_STORAGE_KEY = 'vox_settings';

// Load settings from storage
export const loadSettings = createAsyncThunk(
  'settings/loadSettings',
  async (_, { rejectWithValue }) => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return initialState;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load settings');
    }
  }
);

// Save settings to storage
export const saveSettings = createAsyncThunk(
  'settings/saveSettings',
  async (settings: Partial<SettingsState>, { rejectWithValue }) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save settings');
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateAccessibility: (state, action: PayloadAction<Partial<AccessibilitySettings>>) => {
      state.accessibility = { ...state.accessibility, ...action.payload };
    },
    updateTheme: (state, action: PayloadAction<Partial<ThemeSettings>>) => {
      state.theme = { ...state.theme, ...action.payload };
    },
    updateNotifications: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updatePrivacy: (state, action: PayloadAction<Partial<PrivacySettings>>) => {
      state.privacy = { ...state.privacy, ...action.payload };
    },
    resetSettings: (state) => {
      state.accessibility = defaultAccessibility;
      state.theme = defaultTheme;
      state.notifications = defaultNotifications;
      state.privacy = defaultPrivacy;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.accessibility = action.payload.accessibility || defaultAccessibility;
          state.theme = action.payload.theme || defaultTheme;
          state.notifications = action.payload.notifications || defaultNotifications;
          state.privacy = action.payload.privacy || defaultPrivacy;
        }
      })
      .addCase(loadSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        if (action.payload) {
          if (action.payload.accessibility) {
            state.accessibility = { ...state.accessibility, ...action.payload.accessibility };
          }
          if (action.payload.theme) {
            state.theme = { ...state.theme, ...action.payload.theme };
          }
          if (action.payload.notifications) {
            state.notifications = { ...state.notifications, ...action.payload.notifications };
          }
          if (action.payload.privacy) {
            state.privacy = { ...state.privacy, ...action.payload.privacy };
          }
        }
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  updateAccessibility,
  updateTheme,
  updateNotifications,
  updatePrivacy,
  resetSettings,
  setError,
} = settingsSlice.actions;

export default settingsSlice.reducer;
