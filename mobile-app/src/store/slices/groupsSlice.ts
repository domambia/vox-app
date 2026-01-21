import { createSlice } from '@reduxjs/toolkit';
import { Group, GroupMember } from '../../types/models.types';

interface GroupsState {
  groups: Group[];
  groupDetails: Record<string, Group>; // groupId -> group details
  groupMembers: Record<string, GroupMember[]>; // groupId -> members
  isLoading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  groups: [],
  groupDetails: {},
  groupMembers: {},
  isLoading: false,
  error: null,
};

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setGroups: (state, action) => {
      state.groups = action.payload;
    },
    addGroup: (state, action) => {
      const existingIndex = state.groups.findIndex((g) => g.groupId === action.payload.groupId);
      if (existingIndex >= 0) {
        state.groups[existingIndex] = action.payload;
      } else {
        state.groups.push(action.payload);
      }
    },
    setGroupDetails: (state, action: { payload: { groupId: string; group: Group } }) => {
      state.groupDetails[action.payload.groupId] = action.payload.group;
    },
    setGroupMembers: (state, action: { payload: { groupId: string; members: GroupMember[] } }) => {
      state.groupMembers[action.payload.groupId] = action.payload.members;
    },
    updateGroup: (state, action) => {
      const group = action.payload;
      const index = state.groups.findIndex((g) => g.groupId === group.groupId);
      if (index >= 0) {
        state.groups[index] = group;
      }
      if (state.groupDetails[group.groupId]) {
        state.groupDetails[group.groupId] = group;
      }
    },
    removeGroup: (state, action: { payload: string }) => {
      state.groups = state.groups.filter((g) => g.groupId !== action.payload);
      delete state.groupDetails[action.payload];
      delete state.groupMembers[action.payload];
    },
    clearGroups: (state) => {
      state.groups = [];
      state.groupDetails = {};
      state.groupMembers = {};
    },
  },
});

export const {
  setGroups,
  addGroup,
  setGroupDetails,
  setGroupMembers,
  updateGroup,
  removeGroup,
  clearGroups,
} = groupsSlice.actions;
export default groupsSlice.reducer;

