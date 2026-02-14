import { apiClient } from "./apiClient";
import { AxiosResponse } from "axios";

export interface Group {
  groupId: string;
  name: string;
  description?: string;
  creatorId: string;
  isPrivate: boolean;
  maxMembers?: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  isMember?: boolean;
  userRole?: "MEMBER" | "MODERATOR" | "ADMIN";
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: "MEMBER" | "MODERATOR" | "ADMIN";
  joinedAt: string;
  user?: {
    userId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export interface CreateGroupData {
  name: string;
  description?: string;
  category: string;
  isPublic?: boolean;
  isPrivate?: boolean;
  maxMembers?: number;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}

export interface ListGroupsParams {
  page?: number;
  limit?: number;
  search?: string;
  isPrivate?: boolean;
  category?: string;
}

export interface GetGroupMembersParams {
  groupId: string;
  page?: number;
  limit?: number;
  role?: "MEMBER" | "MODERATOR" | "ADMIN";
}

export interface UpdateMemberRoleData {
  role: "MEMBER" | "MODERATOR" | "ADMIN";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GroupMessage {
  messageId: string;
  groupId: string;
  senderId: string;
  content: string;
  messageType: "TEXT" | "VOICE" | "IMAGE" | "FILE" | "SYSTEM";
  createdAt: string;
  updatedAt: string;
  sender?: {
    userId: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface GetGroupMessagesParams {
  groupId: string;
  limit?: number;
  offset?: number;
}

class GroupsService {
  /**
   * Create a new group. Backend expects name, description?, category, isPublic?.
   */
  async createGroup(data: CreateGroupData): Promise<Group> {
    const body = {
      name: data.name,
      description: data.description ?? "",
      category: data.category,
      isPublic:
        data.isPublic ??
        (data.isPrivate !== undefined ? !data.isPrivate : true),
    };
    const response: AxiosResponse = await apiClient.post("/groups", body);
    return response.data.data;
  }

  /**
   * List groups with filters
   */
  async listGroups(
    params?: ListGroupsParams,
  ): Promise<PaginatedResponse<Group>> {
    const queryParams = new URLSearchParams();
    const limit = params?.limit;
    const page = params?.page;
    if (limit) queryParams.append("limit", limit.toString());
    if (page && limit)
      queryParams.append("offset", ((page - 1) * limit).toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.isPrivate !== undefined)
      queryParams.append("isPublic", String(!params.isPrivate));

    const url = `/groups${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    const items = data?.items ?? data?.groups ?? data?.data ?? [];
    const pagination = data?.pagination ?? {
      page: 1,
      limit: 20,
      total: items.length,
      totalPages: 1,
    };
    return { data: items, pagination };
  }

  /**
   * Get group by ID
   */
  async getGroup(groupId: string): Promise<Group> {
    const response: AxiosResponse = await apiClient.get(`/groups/${groupId}`);
    return response.data.data;
  }

  /**
   * Update group (admin only)
   */
  async updateGroup(groupId: string, data: UpdateGroupData): Promise<Group> {
    const response: AxiosResponse = await apiClient.put(
      `/groups/${groupId}`,
      data,
    );
    return response.data.data;
  }

  /**
   * Delete group (admin only)
   */
  async deleteGroup(groupId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}`);
  }

  /**
   * Join a group
   */
  async joinGroup(groupId: string): Promise<void> {
    await apiClient.post(`/groups/${groupId}/join`);
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string): Promise<void> {
    await apiClient.post(`/groups/${groupId}/leave`);
  }

  /**
   * Get group members
   */
  async getGroupMembers(
    params: GetGroupMembersParams,
  ): Promise<PaginatedResponse<GroupMember>> {
    const queryParams = new URLSearchParams();
    const limit = params.limit;
    const page = params.page;
    if (limit) queryParams.append("limit", limit.toString());
    if (page && limit)
      queryParams.append("offset", ((page - 1) * limit).toString());

    const url = `/groups/${params.groupId}/members${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: AxiosResponse = await apiClient.get(url);
    return response.data.data;
  }

  /**
   * Update member role (admin only)
   */
  async updateMemberRole(
    groupId: string,
    memberId: string,
    data: UpdateMemberRoleData,
  ): Promise<GroupMember> {
    const response: AxiosResponse = await apiClient.put(
      `/groups/${groupId}/members/${memberId}/role`,
      data,
    );
    return response.data.data;
  }

  /**
   * Remove member from group (admin/moderator only)
   */
  async removeMember(groupId: string, memberId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}/members/${memberId}`);
  }

  /**
   * Get group messages (members only)
   * GET /api/v1/groups/:groupId/messages
   */
  async getGroupMessages(
    params: GetGroupMessagesParams,
  ): Promise<{ items: GroupMessage[]; pagination: any }> {
    const { groupId, limit = 50, offset = 0 } = params;
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append("limit", limit.toString());
    if (offset) queryParams.append("offset", offset.toString());
    const url = `/groups/${groupId}/messages${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    const items = (data?.items ?? data?.messages ?? []).map((m: any) =>
      this.mapGroupMessage(m),
    );
    const pagination = data?.pagination ?? {
      limit: 50,
      offset: 0,
      total: items.length,
      totalPages: 1,
    };
    return { items, pagination };
  }

  /**
   * Send group message (members only)
   * POST /api/v1/groups/:groupId/messages
   */
  async sendGroupMessage(
    groupId: string,
    content: string,
    messageType: string = "TEXT",
  ): Promise<GroupMessage> {
    const response: AxiosResponse = await apiClient.post(
      `/groups/${groupId}/messages`,
      {
        content: content.trim(),
        message_type: messageType,
      },
    );
    const data = response.data?.data ?? response.data;
    return this.mapGroupMessage(data);
  }

  private mapGroupMessage(raw: any): GroupMessage {
    const m = raw?.message ?? raw;
    const sender = m.sender ?? raw?.sender;
    return {
      messageId: m.message_id ?? m.messageId ?? "",
      groupId: m.group_id ?? m.groupId ?? "",
      senderId: m.sender_id ?? m.senderId ?? "",
      content: m.content ?? "",
      messageType: (m.message_type ??
        m.messageType ??
        "TEXT") as GroupMessage["messageType"],
      createdAt: m.created_at ?? m.createdAt ?? "",
      updatedAt: m.updated_at ?? m.updatedAt ?? "",
      sender: sender
        ? {
            userId: sender.user_id ?? sender.userId ?? "",
            firstName: sender.first_name ?? sender.firstName,
            lastName: sender.last_name ?? sender.lastName,
          }
        : undefined,
    };
  }

  /**
   * Get groups the user is a member of
   * GET /api/v1/users/:userId/groups
   */
  async getUserGroups(
    userId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ groups: Group[] }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `/users/${userId}/groups${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response: AxiosResponse = await apiClient.get(url);
    const data = response.data?.data ?? response.data;
    return {
      groups: Array.isArray(data.groups) ? data.groups : [],
    };
  }
}

export const groupsService = new GroupsService();
