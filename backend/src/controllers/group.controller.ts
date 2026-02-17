import { Response } from "express";
import { sendSuccess, sendError } from "@/utils/response";
import groupService from "@/services/group.service";
import { AuthRequest } from "@/types";
import { extractPaginationFromQuery } from "@/utils/pagination";

export class GroupController {
  /**
   * Create a new group
   * POST /api/v1/groups
   */
  async createGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const creatorId = req.user!.userId;
      const data = req.body;

      const group = await groupService.createGroup(creatorId, data);
      sendSuccess(res, group, 201);
    } catch (error: any) {
      if (error.message === "User not found") {
        sendError(res, "USER_NOT_FOUND", error.message, 404);
        return;
      }
      sendError(
        res,
        "GROUP_CREATION_ERROR",
        error.message || "Failed to create group",
        400,
      );
    }
  }

  /**
   * Get group by ID
   * GET /api/v1/groups/:groupId
   */
  async getGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?.userId;

      const group = await groupService.getGroup(groupId, userId);
      sendSuccess(res, group);
    } catch (error: any) {
      if (error.message === "Group not found") {
        sendError(res, "GROUP_NOT_FOUND", error.message, 404);
        return;
      }
      sendError(
        res,
        "GROUP_FETCH_ERROR",
        error.message || "Failed to fetch group",
        400,
      );
    }
  }

  /**
   * List groups
   * GET /api/v1/groups
   */
  async listGroups(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit, offset } = extractPaginationFromQuery(req.query);
      const { category, search, isPublic, memberOnly } = req.query;
      const userId = req.user?.userId;

      const result = await groupService.listGroups({
        limit,
        offset,
        category: category as string | undefined,
        search: search as string | undefined,
        isPublic: isPublic as boolean | undefined,
        memberOnly: memberOnly as boolean | undefined,
        userId,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(
        res,
        "GROUPS_LIST_ERROR",
        error.message || "Failed to list groups",
        400,
      );
    }
  }

  /**
   * Update group
   * PUT /api/v1/groups/:groupId
   */
  async updateGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user!.userId;
      const data = req.body;

      const group = await groupService.updateGroup(groupId, userId, data);
      sendSuccess(res, group);
    } catch (error: any) {
      if (error.message === "Group not found") {
        sendError(res, "GROUP_NOT_FOUND", error.message, 404);
        return;
      }
      if (error.message.includes("Only group admins")) {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "GROUP_UPDATE_ERROR",
        error.message || "Failed to update group",
        400,
      );
    }
  }

  /**
   * Delete group
   * DELETE /api/v1/groups/:groupId
   */
  async deleteGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user!.userId;

      const result = await groupService.deleteGroup(groupId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === "Group not found") {
        sendError(res, "GROUP_NOT_FOUND", error.message, 404);
        return;
      }
      if (error.message.includes("Only group admins")) {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "GROUP_DELETE_ERROR",
        error.message || "Failed to delete group",
        400,
      );
    }
  }

  /**
   * Join a group
   * POST /api/v1/groups/:groupId/join
   */
  async joinGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user!.userId;

      const membership = await groupService.joinGroup(groupId, userId);
      sendSuccess(res, membership, 201);
    } catch (error: any) {
      if (error.message === "Group not found") {
        sendError(res, "GROUP_NOT_FOUND", error.message, 404);
        return;
      }
      if (error.message === "Already a member of this group") {
        sendError(res, "ALREADY_MEMBER", error.message, 409);
        return;
      }
      sendError(
        res,
        "JOIN_GROUP_ERROR",
        error.message || "Failed to join group",
        400,
      );
    }
  }

  /**
   * Leave a group
   * POST /api/v1/groups/:groupId/leave
   */
  async leaveGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user!.userId;

      const result = await groupService.leaveGroup(groupId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === "Not a member of this group") {
        sendError(res, "NOT_MEMBER", error.message, 404);
        return;
      }
      if (error.message.includes("Cannot leave group")) {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "LEAVE_GROUP_ERROR",
        error.message || "Failed to leave group",
        400,
      );
    }
  }

  /**
   * Get group messages
   * GET /api/v1/groups/:groupId/messages
   */
  async getGroupMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user!.userId;
      const { limit, offset } = extractPaginationFromQuery(req.query);

      const result = await groupService.getGroupMessages(
        groupId,
        userId,
        limit,
        offset,
      );
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === "Not a member of this group") {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "GROUP_MESSAGES_FETCH_ERROR",
        error.message || "Failed to fetch group messages",
        400,
      );
    }
  }

  /**
   * Send group message
   * POST /api/v1/groups/:groupId/messages
   */
  async sendGroupMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user!.userId;
      const { content, message_type, attachmentIds } = req.body;

      const message = await groupService.sendGroupMessage(
        groupId,
        userId,
        content,
        message_type || "TEXT",
        attachmentIds,
      );
      sendSuccess(res, message, 201);
    } catch (error: any) {
      if (error.message === "Not a member of this group") {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "SEND_GROUP_MESSAGE_ERROR",
        error.message || "Failed to send message",
        400,
      );
    }
  }

  /**
   * Upload group message attachment
   * POST /api/v1/groups/:groupId/attachments
   */
  async uploadGroupAttachment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user!.userId;

      // Ensure membership
      await groupService.getGroupMessages(groupId, userId, 1, 0);

      if (!req.file) {
        sendError(res, "NO_FILE", "No file uploaded", 400);
        return;
      }

      const fileUrl = `/api/${process.env.API_VERSION || "v1"}/files/messages/${req.file.filename}`;
      const attachment = await groupService.createGroupMessageAttachment({
        fileUrl,
        fileType: req.file.mimetype,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      });

      sendSuccess(
        res,
        {
          attachment_id: attachment.attachment_id,
          file_url: attachment.file_url,
          file_type: attachment.file_type,
          file_name: attachment.file_name,
          file_size: attachment.file_size,
        },
        201,
      );
    } catch (error: any) {
      if (error.message === "Not a member of this group") {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "GROUP_ATTACHMENT_UPLOAD_ERROR",
        error.message || "Failed to upload attachment",
        400,
      );
    }
  }

  /**
   * Get group members
   * GET /api/v1/groups/:groupId/members
   */
  async getGroupMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { limit, offset } = extractPaginationFromQuery(req.query);

      const result = await groupService.getGroupMembers(groupId, limit, offset);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === "Group not found") {
        sendError(res, "GROUP_NOT_FOUND", error.message, 404);
        return;
      }
      sendError(
        res,
        "MEMBERS_FETCH_ERROR",
        error.message || "Failed to fetch members",
        400,
      );
    }
  }

  /**
   * Update member role
   * PUT /api/v1/groups/:groupId/members/:memberId/role
   */
  async updateMemberRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId, memberId } = req.params;
      const adminId = req.user!.userId;
      const { role } = req.body;

      const membership = await groupService.updateMemberRole(
        groupId,
        memberId,
        role,
        adminId,
      );
      sendSuccess(res, membership);
    } catch (error: any) {
      if (error.message.includes("Only group admins")) {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      if (error.message === "Member not found") {
        sendError(res, "MEMBER_NOT_FOUND", error.message, 404);
        return;
      }
      if (error.message.includes("Cannot remove the last admin")) {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "ROLE_UPDATE_ERROR",
        error.message || "Failed to update member role",
        400,
      );
    }
  }

  /**
   * Remove member from group
   * DELETE /api/v1/groups/:groupId/members/:memberId
   */
  async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId, memberId } = req.params;
      const removerId = req.user!.userId;

      const result = await groupService.removeMember(
        groupId,
        memberId,
        removerId,
      );
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message.includes("Only admins and moderators")) {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      if (error.message === "Member not found") {
        sendError(res, "MEMBER_NOT_FOUND", error.message, 404);
        return;
      }
      if (
        error.message.includes("Cannot remove the last admin") ||
        error.message.includes("Moderators cannot remove admins")
      ) {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "REMOVE_MEMBER_ERROR",
        error.message || "Failed to remove member",
        400,
      );
    }
  }

  /**
   * Add member to group
   * POST /api/v1/groups/:groupId/members
   */
  async addMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const actorId = req.user!.userId;
      const { userId } = req.body;

      const membership = await groupService.addMemberToGroup(
        groupId,
        actorId,
        userId,
      );

      sendSuccess(res, membership, 201);
    } catch (error: any) {
      if (error.message === "Group not found") {
        sendError(res, "GROUP_NOT_FOUND", error.message, 404);
        return;
      }
      if (error.message === "User not found") {
        sendError(res, "USER_NOT_FOUND", error.message, 404);
        return;
      }
      if (error.message === "Already a member of this group") {
        sendError(res, "ALREADY_MEMBER", error.message, 409);
        return;
      }
      if (error.message.includes("Only admins and moderators")) {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "ADD_MEMBER_ERROR",
        error.message || "Failed to add member",
        400,
      );
    }
  }

  /**
   * Search users for adding to group
   * GET /api/v1/groups/:groupId/members/search?q=...
   */
  async searchUsersToAdd(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const actorId = req.user!.userId;
      const q = (req.query.q as string) || "";
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 20;

      const users = await groupService.searchUsersToAdd(
        groupId,
        actorId,
        q,
        limit,
      );
      sendSuccess(res, { users });
    } catch (error: any) {
      if (error.message === "Not a member of this group") {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      sendError(
        res,
        "USER_SEARCH_ERROR",
        error.message || "Failed to search users",
        400,
      );
    }
  }

  /**
   * Get user's groups
   * GET /api/v1/users/:userId/groups
   */
  async getUserGroups(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Users can only see their own groups unless admin
      if (userId !== req.user!.userId) {
        sendError(res, "FORBIDDEN", "You can only view your own groups", 403);
        return;
      }

      const groups = await groupService.getUserGroups(userId);
      sendSuccess(res, { groups });
    } catch (error: any) {
      sendError(
        res,
        "USER_GROUPS_ERROR",
        error.message || "Failed to get user groups",
        400,
      );
    }
  }
}

// Export singleton instance
const groupController = new GroupController();
export default groupController;
