import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Group {
  groupId: string;
  name: string;
  description?: string;
  creatorId: string;
  category: string;
  memberCount: number;
  isPublic: boolean;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  joinedAt: string;
}

export interface GroupsState {
  groups: Group[];
  userGroups: Group[];
  groupMembers: Record<string, GroupMember[]>; // groupId -> members
  isLoading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  groups: [],
  userGroups: [],
  groupMembers: {},
  isLoading: false,
  error: null,
};

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setGroups: (state, action: PayloadAction<Group[]>) => {
      state.groups = action.payload;
    },
    setUserGroups: (state, action: PayloadAction<Group[]>) => {
      state.userGroups = action.payload;
    },
    addGroup: (state, action: PayloadAction<Group>) => {
      state.groups.unshift(action.payload);
    },
    setGroupMembers: (state, action: PayloadAction<{ groupId: string; members: GroupMember[] }>) => {
      state.groupMembers[action.payload.groupId] = action.payload.members;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setGroups,
  setUserGroups,
  addGroup,
  setGroupMembers,
  setError,
  setLoading,
} = groupsSlice.actions;
export default groupsSlice.reducer;
