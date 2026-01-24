import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Profile {
  profileId: string;
  userId: string;
  bio?: string;
  interests: string[];
  location?: string;
  lookingFor: 'DATING' | 'FRIENDSHIP' | 'HOBBY' | 'ALL';
  voiceBioUrl?: string;
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

// Async thunks will be added as needed
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Profile>) => {
      state.currentProfile = action.payload;
      state.profiles[action.payload.userId] = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<Profile>>) => {
      if (state.currentProfile) {
        state.currentProfile = { ...state.currentProfile, ...action.payload };
        state.profiles[state.currentProfile.userId] = state.currentProfile;
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setProfile, updateProfile, setError, setLoading } = profileSlice.actions;
export default profileSlice.reducer;
