import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  profileService,
  Profile as ProfileType,
  CreateProfileData,
  UpdateProfileData,
} from '../../services/api/profileService';

export interface Profile {
  profileId: string;
  userId: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  interests?: string[];
  location?: string;
  lookingFor?: 'DATING' | 'FRIENDSHIP' | 'HOBBY' | 'ALL';
  voiceBioUrl?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  createdAt: string;
  updatedAt: string;
}

export interface ProfileState {
  currentProfile: Profile | null;
  profiles: Record<string, Profile>;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  currentProfile: null,
  profiles: {},
  isLoading: false,
  error: null,
};

// Async thunks
export const getMyProfile = createAsyncThunk(
  'profile/getMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const profile = await profileService.getMyProfile();
      return profile;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch profile');
    }
  }
);

export const getProfile = createAsyncThunk(
  'profile/getProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const profile = await profileService.getProfile(userId);
      return profile;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch profile');
    }
  }
);

export const createProfile = createAsyncThunk(
  'profile/createProfile',
  async (data: CreateProfileData, { rejectWithValue }) => {
    try {
      const profile = await profileService.createProfile(data);
      return profile;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async ({ userId, data }: { userId: string; data: UpdateProfileData }, { rejectWithValue }) => {
    try {
      const profile = await profileService.updateProfile(userId, data);
      return profile;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update profile');
    }
  }
);

export const deleteProfile = createAsyncThunk(
  'profile/deleteProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      await profileService.deleteProfile(userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete profile');
    }
  }
);

export const uploadVoiceBio = createAsyncThunk(
  'profile/uploadVoiceBio',
  async (file: FormData, { rejectWithValue }) => {
    try {
      const result = await profileService.uploadVoiceBio(file);
      return result.voiceBioUrl;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to upload voice bio');
    }
  }
);

export const deleteVoiceBio = createAsyncThunk(
  'profile/deleteVoiceBio',
  async (_, { rejectWithValue }) => {
    try {
      await profileService.deleteVoiceBio();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete voice bio');
    }
  }
);

export const likeProfile = createAsyncThunk(
  'profile/likeProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      await profileService.likeProfile(userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to like profile');
    }
  }
);

export const unlikeProfile = createAsyncThunk(
  'profile/unlikeProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      await profileService.unlikeProfile(userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to unlike profile');
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Profile>) => {
      state.currentProfile = action.payload;
      state.profiles[action.payload.userId] = action.payload;
    },
    clearProfile: (state) => {
      state.currentProfile = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // getMyProfile
      .addCase(getMyProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMyProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.currentProfile = action.payload;
        if (action.payload) {
          state.profiles[action.payload.userId] = action.payload;
        }
      })
      .addCase(getMyProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.currentProfile = null; // 404 = no profile yet; UI can show auth user fallback
      })
      // getProfile
      .addCase(getProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profiles[action.payload.userId] = action.payload;
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // createProfile
      .addCase(createProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProfile = action.payload;
        state.profiles[action.payload.userId] = action.payload;
      })
      .addCase(createProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // updateProfile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.currentProfile?.userId === action.payload.userId) {
          state.currentProfile = action.payload;
        }
        state.profiles[action.payload.userId] = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // deleteProfile
      .addCase(deleteProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.currentProfile?.userId === action.payload) {
          state.currentProfile = null;
        }
        delete state.profiles[action.payload];
      })
      .addCase(deleteProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // uploadVoiceBio
      .addCase(uploadVoiceBio.fulfilled, (state, action) => {
        if (state.currentProfile) {
          state.currentProfile.voiceBioUrl = action.payload;
        }
      })
      // deleteVoiceBio
      .addCase(deleteVoiceBio.fulfilled, (state) => {
        if (state.currentProfile) {
          state.currentProfile.voiceBioUrl = undefined;
        }
      });
  },
});

export const { setProfile, clearProfile, setError, setLoading } = profileSlice.actions;
export default profileSlice.reducer;
