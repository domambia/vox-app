import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  discoveryService,
  DiscoverProfile,
  Match,
  Like,
  DiscoverProfilesParams,
  GetMatchesParams,
  GetLikesParams,
} from '../../services/api/discoveryService';

export interface DiscoveryState {
  discoverProfiles: DiscoverProfile[];
  matches: Match[];
  likes: Like[];
  isLoading: boolean;
  error: string | null;
  discoverPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  matchesPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  likesPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

const initialState: DiscoveryState = {
  discoverProfiles: [],
  matches: [],
  likes: [],
  isLoading: false,
  error: null,
  discoverPagination: null,
  matchesPagination: null,
  likesPagination: null,
};

// Async thunks
export const discoverProfiles = createAsyncThunk(
  'discovery/discoverProfiles',
  async (params: DiscoverProfilesParams = {}, { rejectWithValue }) => {
    try {
      const response = await discoveryService.discoverProfiles(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to discover profiles');
    }
  }
);

export const getMatches = createAsyncThunk(
  'discovery/getMatches',
  async (params: GetMatchesParams = {}, { rejectWithValue }) => {
    try {
      const response = await discoveryService.getMatches(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch matches');
    }
  }
);

export const getLikes = createAsyncThunk(
  'discovery/getLikes',
  async (params: GetLikesParams = {}, { rejectWithValue }) => {
    try {
      const response = await discoveryService.getLikes(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch likes');
    }
  }
);

const discoverySlice = createSlice({
  name: 'discovery',
  initialState,
  reducers: {
    clearDiscoverProfiles: (state) => {
      state.discoverProfiles = [];
      state.discoverPagination = null;
    },
    clearMatches: (state) => {
      state.matches = [];
      state.matchesPagination = null;
    },
    clearLikes: (state) => {
      state.likes = [];
      state.likesPagination = null;
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
      // discoverProfiles
      .addCase(discoverProfiles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(discoverProfiles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.discoverProfiles = action.payload.data;
        state.discoverPagination = action.payload.pagination;
      })
      .addCase(discoverProfiles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // getMatches
      .addCase(getMatches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMatches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.matches = action.payload.data;
        state.matchesPagination = action.payload.pagination;
      })
      .addCase(getMatches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // getLikes
      .addCase(getLikes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getLikes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.likes = action.payload.data;
        state.likesPagination = action.payload.pagination;
      })
      .addCase(getLikes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearDiscoverProfiles, clearMatches, clearLikes, setError, setLoading } = discoverySlice.actions;
export default discoverySlice.reducer;
