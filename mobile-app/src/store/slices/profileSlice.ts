import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Profile, CreateProfileRequest, UpdateProfileRequest } from '../../types/models.types';

interface ProfileState {
  currentProfile: Profile | null;
  profiles: Record<string, Profile>; // Cache of other users' profiles
  isLoading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  currentProfile: null,
  profiles: {},
  isLoading: false,
  error: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setCurrentProfile: (state, action) => {
      state.currentProfile = action.payload;
    },
    setProfile: (state, action: { payload: { userId: string; profile: Profile } }) => {
      state.profiles[action.payload.userId] = action.payload.profile;
    },
    clearProfile: (state) => {
      state.currentProfile = null;
      state.profiles = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Profile actions will be added when API services are created
  },
});

export const { setCurrentProfile, setProfile, clearProfile, clearError } = profileSlice.actions;
export default profileSlice.reducer;

