import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  groupsService,
  Group,
  GroupMember,
  CreateGroupData,
  UpdateGroupData,
  ListGroupsParams,
  GetGroupMembersParams,
  UpdateMemberRoleData,
} from '../../services/api/groupsService';

export interface GroupsState {
  groups: Group[];
  userGroups: Group[];
  groupMembers: Record<string, GroupMember[]>; // groupId -> members
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

const initialState: GroupsState = {
  groups: [],
  userGroups: [],
  groupMembers: {},
  isLoading: false,
  error: null,
  pagination: null,
};

// Async thunks
export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (data: CreateGroupData, { rejectWithValue }) => {
    try {
      const group = await groupsService.createGroup(data);
      return group;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create group');
    }
  }
);

export const listGroups = createAsyncThunk(
  'groups/listGroups',
  async (params: ListGroupsParams = {}, { rejectWithValue }) => {
    try {
      const response = await groupsService.listGroups(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch groups');
    }
  }
);

export const getGroup = createAsyncThunk(
  'groups/getGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const group = await groupsService.getGroup(groupId);
      return group;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch group');
    }
  }
);

export const updateGroup = createAsyncThunk(
  'groups/updateGroup',
  async ({ groupId, data }: { groupId: string; data: UpdateGroupData }, { rejectWithValue }) => {
    try {
      const group = await groupsService.updateGroup(groupId, data);
      return group;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update group');
    }
  }
);

export const deleteGroup = createAsyncThunk(
  'groups/deleteGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      await groupsService.deleteGroup(groupId);
      return groupId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete group');
    }
  }
);

export const joinGroup = createAsyncThunk(
  'groups/joinGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      await groupsService.joinGroup(groupId);
      return groupId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to join group');
    }
  }
);

export const leaveGroup = createAsyncThunk(
  'groups/leaveGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      await groupsService.leaveGroup(groupId);
      return groupId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to leave group');
    }
  }
);

export const getGroupMembers = createAsyncThunk(
  'groups/getGroupMembers',
  async (params: GetGroupMembersParams, { rejectWithValue }) => {
    try {
      const response = await groupsService.getGroupMembers(params);
      return { groupId: params.groupId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch group members');
    }
  }
);

export const updateMemberRole = createAsyncThunk(
  'groups/updateMemberRole',
  async ({ groupId, memberId, data }: { groupId: string; memberId: string; data: UpdateMemberRoleData }, { rejectWithValue }) => {
    try {
      const member = await groupsService.updateMemberRole(groupId, memberId, data);
      return { groupId, member };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update member role');
    }
  }
);

export const removeMember = createAsyncThunk(
  'groups/removeMember',
  async ({ groupId, memberId }: { groupId: string; memberId: string }, { rejectWithValue }) => {
    try {
      await groupsService.removeMember(groupId, memberId);
      return { groupId, memberId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to remove member');
    }
  }
);

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
  extraReducers: (builder) => {
    builder
      // createGroup
      .addCase(createGroup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groups.unshift(action.payload);
        if (action.payload.isMember) {
          state.userGroups.unshift(action.payload);
        }
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // listGroups
      .addCase(listGroups.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(listGroups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groups = action.payload.data;
        state.pagination = action.payload.pagination;
        // Separate user groups
        state.userGroups = action.payload.data.filter(g => g.isMember);
      })
      .addCase(listGroups.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // getGroup
      .addCase(getGroup.fulfilled, (state, action) => {
        const index = state.groups.findIndex(g => g.groupId === action.payload.groupId);
        if (index >= 0) {
          state.groups[index] = action.payload;
        } else {
          state.groups.unshift(action.payload);
        }
        if (action.payload.isMember) {
          const userGroupIndex = state.userGroups.findIndex(g => g.groupId === action.payload.groupId);
          if (userGroupIndex >= 0) {
            state.userGroups[userGroupIndex] = action.payload;
          } else {
            state.userGroups.unshift(action.payload);
          }
        }
      })
      // updateGroup
      .addCase(updateGroup.fulfilled, (state, action) => {
        const index = state.groups.findIndex(g => g.groupId === action.payload.groupId);
        if (index >= 0) {
          state.groups[index] = action.payload;
        }
        const userGroupIndex = state.userGroups.findIndex(g => g.groupId === action.payload.groupId);
        if (userGroupIndex >= 0) {
          state.userGroups[userGroupIndex] = action.payload;
        }
      })
      // deleteGroup
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter(g => g.groupId !== action.payload);
        state.userGroups = state.userGroups.filter(g => g.groupId !== action.payload);
        delete state.groupMembers[action.payload];
      })
      // joinGroup
      .addCase(joinGroup.fulfilled, (state, action) => {
        const group = state.groups.find(g => g.groupId === action.payload);
        if (group) {
          group.isMember = true;
          group.memberCount += 1;
          if (!state.userGroups.find(g => g.groupId === action.payload)) {
            state.userGroups.push(group);
          }
        }
      })
      // leaveGroup
      .addCase(leaveGroup.fulfilled, (state, action) => {
        const group = state.groups.find(g => g.groupId === action.payload);
        if (group) {
          group.isMember = false;
          group.memberCount = Math.max(0, group.memberCount - 1);
        }
        state.userGroups = state.userGroups.filter(g => g.groupId !== action.payload);
      })
      // getGroupMembers
      .addCase(getGroupMembers.fulfilled, (state, action) => {
        state.groupMembers[action.payload.groupId] = action.payload.data;
      })
      // updateMemberRole
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        const members = state.groupMembers[action.payload.groupId];
        if (members) {
          const index = members.findIndex(m => m.userId === action.payload.member.userId);
          if (index >= 0) {
            members[index] = action.payload.member;
          }
        }
      })
      // removeMember
      .addCase(removeMember.fulfilled, (state, action) => {
        const members = state.groupMembers[action.payload.groupId];
        if (members) {
          state.groupMembers[action.payload.groupId] = members.filter(
            m => m.userId !== action.payload.memberId
          );
        }
        const group = state.groups.find(g => g.groupId === action.payload.groupId);
        if (group) {
          group.memberCount = Math.max(0, group.memberCount - 1);
        }
      });
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
