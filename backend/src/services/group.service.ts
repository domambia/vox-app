import prisma from '@/config/database';
import { logger } from '@/utils/logger';
import { Prisma, GroupRole, MessageType } from '@prisma/client';
import {
  normalizePagination,
  createPaginatedResponse,
  getPaginationMetadata,
} from '@/utils/pagination';

export interface CreateGroupInput {
  name: string;
  description?: string;
  category: string;
  isPublic?: boolean;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

export interface ListGroupsParams {
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
  isPublic?: boolean;
}

export class GroupService {
  /**
   * Create a new group
   */
  async createGroup(creatorId: string, data: CreateGroupInput) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { user_id: creatorId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create group
      const group = await prisma.group.create({
        data: {
          name: data.name,
          description: data.description,
          creator_id: creatorId,
          category: data.category,
          is_public: data.isPublic ?? true,
          member_count: 1, // Creator is first member
        },
        include: {
          creator: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
        },
      });

      // Add creator as admin member
      await prisma.groupMember.create({
        data: {
          group_id: group.group_id,
          user_id: creatorId,
          role: 'ADMIN',
        },
      });

      logger.info(`Group created: ${group.group_id} by user ${creatorId}`);

      return group;
    } catch (error) {
      logger.error('Error creating group', error);
      throw error;
    }
  }

  /**
   * Get group by ID
   */
  async getGroup(groupId: string, userId?: string) {
    try {
      const group = await prisma.group.findUnique({
        where: { group_id: groupId },
        include: {
          creator: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
        },
      });

      if (!group) {
        throw new Error('Group not found');
      }

      // Check if user is a member
      let isMember = false;
      let role: GroupRole | null = null;

      if (userId) {
        const membership = await prisma.groupMember.findUnique({
          where: {
            group_id_user_id: {
              group_id: groupId,
              user_id: userId,
            },
          },
        });

        if (membership) {
          isMember = true;
          role = membership.role;
        }
      }

      return {
        ...group,
        isMember,
        role,
      };
    } catch (error) {
      logger.error('Error getting group', error);
      throw error;
    }
  }

  /**
   * List groups with filters
   */
  async listGroups(params: ListGroupsParams) {
    try {
      const { limit, offset } = normalizePagination(params.limit, params.offset);
      const { category, search, isPublic } = params;

      // Build where clause
      const where: Prisma.GroupWhereInput = {};

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (isPublic !== undefined) {
        where.is_public = isPublic;
      }

      // Get total count
      const total = await prisma.group.count({ where });

      // Get groups
      const groups = await prisma.group.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          creator: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      const pagination = getPaginationMetadata(total, limit, offset);

      logger.info('Groups listed', {
        total,
        returned: groups.length,
        limit,
        offset,
      });

      return {
        ...createPaginatedResponse(groups, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error listing groups', error);
      throw error;
    }
  }

  /**
   * Update group (admin only)
   */
  async updateGroup(groupId: string, userId: string, data: UpdateGroupInput) {
    try {
      // Check if user is admin of the group
      const membership = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: userId,
          },
        },
      });

      if (!membership || membership.role !== 'ADMIN') {
        throw new Error('Only group admins can update the group');
      }

      // Build update data
      const updateData: Prisma.GroupUpdateInput = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.category !== undefined) {
        updateData.category = data.category;
      }

      if (data.isPublic !== undefined) {
        updateData.is_public = data.isPublic;
      }

      // Update group
      const group = await prisma.group.update({
        where: { group_id: groupId },
        data: updateData,
        include: {
          creator: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      logger.info(`Group ${groupId} updated by user ${userId}`);

      return group;
    } catch (error) {
      logger.error('Error updating group', error);
      throw error;
    }
  }

  /**
   * Delete group (admin only)
   */
  async deleteGroup(groupId: string, userId: string) {
    try {
      // Check if user is admin of the group
      const membership = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: userId,
          },
        },
      });

      if (!membership || membership.role !== 'ADMIN') {
        throw new Error('Only group admins can delete the group');
      }

      // Delete group (cascade will handle members)
      await prisma.group.delete({
        where: { group_id: groupId },
      });

      logger.info(`Group ${groupId} deleted by user ${userId}`);

      return { message: 'Group deleted successfully' };
    } catch (error) {
      logger.error('Error deleting group', error);
      throw error;
    }
  }

  /**
   * Join a group
   */
  async joinGroup(groupId: string, userId: string) {
    try {
      // Check if group exists
      const group = await prisma.group.findUnique({
        where: { group_id: groupId },
      });

      if (!group) {
        throw new Error('Group not found');
      }

      // Check if already a member
      const existingMembership = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: userId,
          },
        },
      });

      if (existingMembership) {
        throw new Error('Already a member of this group');
      }

      // Add member
      const membership = await prisma.groupMember.create({
        data: {
          group_id: groupId,
          user_id: userId,
          role: 'MEMBER',
        },
      });

      // Update member count
      await prisma.group.update({
        where: { group_id: groupId },
        data: {
          member_count: {
            increment: 1,
          },
        },
      });

      logger.info(`User ${userId} joined group ${groupId}`);

      return membership;
    } catch (error) {
      logger.error('Error joining group', error);
      throw error;
    }
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string, userId: string) {
    try {
      // Check if member
      const membership = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: userId,
          },
        },
      });

      if (!membership) {
        throw new Error('Not a member of this group');
      }

      // Prevent admin from leaving if they're the only admin
      if (membership.role === 'ADMIN') {
        const adminCount = await prisma.groupMember.count({
          where: {
            group_id: groupId,
            role: 'ADMIN',
          },
        });

        if (adminCount === 1) {
          throw new Error('Cannot leave group. You are the only admin. Transfer admin role or delete the group.');
        }
      }

      // Remove member
      await prisma.groupMember.delete({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: userId,
          },
        },
      });

      // Update member count
      await prisma.group.update({
        where: { group_id: groupId },
        data: {
          member_count: {
            decrement: 1,
          },
        },
      });

      logger.info(`User ${userId} left group ${groupId}`);

      return { message: 'Left group successfully' };
    } catch (error) {
      logger.error('Error leaving group', error);
      throw error;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string, limit: number = 50, offset: number = 0) {
    try {
      // Check if group exists
      const group = await prisma.group.findUnique({
        where: { group_id: groupId },
      });

      if (!group) {
        throw new Error('Group not found');
      }

      // Get total count
      const total = await prisma.groupMember.count({
        where: { group_id: groupId },
      });

      // Get members
      const members = await prisma.groupMember.findMany({
        where: { group_id: groupId },
        orderBy: [
          { role: 'asc' }, // Admins first, then moderators, then members
          { joined_at: 'asc' },
        ],
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              verified: true,
              profile: {
                select: {
                  profile_id: true,
                  bio: true,
                  interests: true,
                },
              },
            },
          },
        },
      });

      const pagination = getPaginationMetadata(total, limit, offset);

      return {
        members: members.map((m) => ({
          membership_id: m.membership_id,
          role: m.role,
          joined_at: m.joined_at,
          user: m.user,
        })),
        pagination,
      };
    } catch (error) {
      logger.error('Error getting group members', error);
      throw error;
    }
  }

  /**
   * Update member role (admin only)
   */
  async updateMemberRole(
    groupId: string,
    memberId: string,
    newRole: GroupRole,
    adminId: string
  ) {
    try {
      // Check if admin is actually an admin
      const adminMembership = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: adminId,
          },
        },
      });

      if (!adminMembership || adminMembership.role !== 'ADMIN') {
        throw new Error('Only group admins can update member roles');
      }

      // Check if member exists
      const memberMembership = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: memberId,
          },
        },
      });

      if (!memberMembership) {
        throw new Error('Member not found');
      }

      // Prevent removing the last admin
      if (memberMembership.role === 'ADMIN' && newRole !== 'ADMIN') {
        const adminCount = await prisma.groupMember.count({
          where: {
            group_id: groupId,
            role: 'ADMIN',
          },
        });

        if (adminCount === 1) {
          throw new Error('Cannot remove the last admin. Transfer admin role to another member first.');
        }
      }

      // Update role
      const updatedMembership = await prisma.groupMember.update({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: memberId,
          },
        },
        data: { role: newRole },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      logger.info(`Member ${memberId} role updated to ${newRole} in group ${groupId}`);

      return updatedMembership;
    } catch (error) {
      logger.error('Error updating member role', error);
      throw error;
    }
  }

  /**
   * Remove member from group (admin/moderator only)
   */
  async removeMember(groupId: string, memberId: string, removerId: string) {
    try {
      // Check if remover is admin or moderator
      const removerMembership = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: removerId,
          },
        },
      });

      if (!removerMembership || (removerMembership.role !== 'ADMIN' && removerMembership.role !== 'MODERATOR')) {
        throw new Error('Only admins and moderators can remove members');
      }

      // Check if member exists
      const memberMembership = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: memberId,
          },
        },
      });

      if (!memberMembership) {
        throw new Error('Member not found');
      }

      // Prevent removing the last admin
      if (memberMembership.role === 'ADMIN') {
        const adminCount = await prisma.groupMember.count({
          where: {
            group_id: groupId,
            role: 'ADMIN',
          },
        });

        if (adminCount === 1) {
          throw new Error('Cannot remove the last admin. Transfer admin role to another member first.');
        }
      }

      // Prevent moderators from removing admins
      if (removerMembership.role === 'MODERATOR' && memberMembership.role === 'ADMIN') {
        throw new Error('Moderators cannot remove admins');
      }

      // Remove member
      await prisma.groupMember.delete({
        where: {
          group_id_user_id: {
            group_id: groupId,
            user_id: memberId,
          },
        },
      });

      // Update member count
      await prisma.group.update({
        where: { group_id: groupId },
        data: {
          member_count: {
            decrement: 1,
          },
        },
      });

      logger.info(`Member ${memberId} removed from group ${groupId} by ${removerId}`);

      return { message: 'Member removed successfully' };
    } catch (error) {
      logger.error('Error removing member', error);
      throw error;
    }
  }

  /**
   * Get group messages (members only)
   */
  async getGroupMessages(groupId: string, userId: string, limit: number = 50, offset: number = 0) {
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: { group_id: groupId, user_id: userId },
      },
    });
    if (!membership) {
      throw new Error('Not a member of this group');
    }

    const total = await prisma.groupMessage.count({
      where: { group_id: groupId },
    });

    const messages = await prisma.groupMessage.findMany({
      where: { group_id: groupId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        sender: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    const pagination = getPaginationMetadata(total, limit, offset);
    return {
      items: messages.reverse(),
      pagination,
    };
  }

  /**
   * Send a group message (members only)
   */
  async sendGroupMessage(groupId: string, userId: string, content: string, messageType: MessageType = 'TEXT') {
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: { group_id: groupId, user_id: userId },
      },
    });
    if (!membership) {
      throw new Error('Not a member of this group');
    }

    const message = await prisma.groupMessage.create({
      data: {
        group_id: groupId,
        sender_id: userId,
        content: content.trim(),
        message_type: messageType,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    const preview = content.trim().slice(0, 100);
    await prisma.group.update({
      where: { group_id: groupId },
      data: {
        last_message_at: message.created_at,
        last_message_preview: preview || null,
      },
    });

    logger.info(`Group message sent in ${groupId} by ${userId}`);
    return message;
  }

  /**
   * Get user's groups
   */
  async getUserGroups(userId: string) {
    try {
      const memberships = await prisma.groupMember.findMany({
        where: { user_id: userId },
        include: {
          group: {
            include: {
              creator: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
        orderBy: { joined_at: 'desc' },
      });

      return memberships.map((m) => ({
        membership_id: m.membership_id,
        role: m.role,
        joined_at: m.joined_at,
        group: m.group,
      }));
    } catch (error) {
      logger.error('Error getting user groups', error);
      throw error;
    }
  }
}

// Export singleton instance
const groupService = new GroupService();
export default groupService;

