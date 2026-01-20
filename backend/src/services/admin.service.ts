import prisma from '@/config/database';
import { logger } from '@/utils/logger';
import { UserRole, KYCStatus } from '@prisma/client';
import {
  normalizePagination,
  createPaginatedResponse,
  getPaginationMetadata,
} from '@/utils/pagination';

export interface ListUsersParams {
  limit?: number;
  offset?: number;
  role?: UserRole;
  isActive?: boolean;
  verified?: boolean;
  search?: string;
}

export interface ListKYCVerificationsParams {
  limit?: number;
  offset?: number;
  status?: KYCStatus;
  method?: string;
}

export interface UpdateUserStatusInput {
  isActive: boolean;
  role?: UserRole;
}

export class AdminService {
  /**
   * List all users with filters
   */
  async listUsers(params: ListUsersParams) {
    try {
      const { limit, offset } = normalizePagination(params.limit, params.offset);

      // Build where clause
      const where: any = {};

      if (params.role) {
        where.role = params.role;
      }

      if (params.isActive !== undefined) {
        where.is_active = params.isActive;
      }

      if (params.verified !== undefined) {
        where.verified = params.verified;
      }

      if (params.search) {
        where.OR = [
          { first_name: { contains: params.search, mode: 'insensitive' } },
          { last_name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
          { phone_number: { contains: params.search } },
        ];
      }

      // Get total count
      const total = await prisma.user.count({ where });

      // Get users
      const users = await prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        select: {
          user_id: true,
          phone_number: true,
          first_name: true,
          last_name: true,
          email: true,
          country_code: true,
          verified: true,
          verification_date: true,
          is_active: true,
          role: true,
          created_at: true,
          last_active: true,
          profile: {
            select: {
              profile_id: true,
              bio: true,
              location: true,
            },
          },
        },
      });

      const pagination = getPaginationMetadata(total, limit, offset);

      return {
        ...createPaginatedResponse(users, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error listing users', error);
      throw error;
    }
  }

  /**
   * Get user details
   */
  async getUserDetails(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: {
          profile: true,
          kyc_verifications: {
            orderBy: { created_at: 'desc' },
            take: 5,
          },
          groups_created: {
            take: 5,
            select: {
              group_id: true,
              name: true,
              created_at: true,
            },
          },
          events_created: {
            take: 5,
            select: {
              event_id: true,
              title: true,
              date_time: true,
            },
          },
          _count: {
            select: {
              messages_sent: true,
              likes_given: true,
              likes_received: true,
              matches_as_a: true,
              matches_as_b: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Error getting user details', error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, data: UpdateUserStatusInput) {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const updateData: any = {
        is_active: data.isActive,
      };

      if (data.role) {
        updateData.role = data.role;
      }

      const updatedUser = await prisma.user.update({
        where: { user_id: userId },
        data: updateData,
        select: {
          user_id: true,
          phone_number: true,
          first_name: true,
          last_name: true,
          email: true,
          is_active: true,
          role: true,
          updated_at: true,
        },
      });

      logger.info(`User ${userId} status updated`, { isActive: data.isActive, role: data.role });

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user status', error);
      throw error;
    }
  }

  /**
   * List KYC verifications queue
   */
  async listKYCVerifications(params: ListKYCVerificationsParams) {
    try {
      const { limit, offset } = normalizePagination(params.limit, params.offset);

      // Build where clause
      const where: any = {};

      if (params.status) {
        where.status = params.status;
      }

      if (params.method) {
        where.method = params.method;
      }

      // Get total count
      const total = await prisma.kYCVerification.count({ where });

      // Get verifications
      const verifications = await prisma.kYCVerification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              email: true,
            },
          },
          reviewer: {
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
        ...createPaginatedResponse(verifications, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error listing KYC verifications', error);
      throw error;
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        totalGroups,
        totalEvents,
        totalMatches,
        totalMessages,
        pendingKYC,
        approvedKYC,
        rejectedKYC,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { is_active: true } }),
        prisma.user.count({ where: { verified: true } }),
        prisma.group.count(),
        prisma.event.count(),
        prisma.match.count({ where: { is_active: true } }),
        prisma.message.count(),
        prisma.kYCVerification.count({ where: { status: 'PENDING' } }),
        prisma.kYCVerification.count({ where: { status: 'APPROVED' } }),
        prisma.kYCVerification.count({ where: { status: 'REJECTED' } }),
      ]);

      // Get recent activity (last 24 hours)
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const [
        newUsers24h,
        newMessages24h,
        newMatches24h,
      ] = await Promise.all([
        prisma.user.count({
          where: { created_at: { gte: last24Hours } },
        }),
        prisma.message.count({
          where: { created_at: { gte: last24Hours } },
        }),
        prisma.match.count({
          where: { matched_at: { gte: last24Hours } },
        }),
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          verified: verifiedUsers,
          new_last_24h: newUsers24h,
        },
        community: {
          total_groups: totalGroups,
          total_events: totalEvents,
          total_matches: totalMatches,
          new_matches_24h: newMatches24h,
        },
        messaging: {
          total_messages: totalMessages,
          new_messages_24h: newMessages24h,
        },
        kyc: {
          pending: pendingKYC,
          approved: approvedKYC,
          rejected: rejectedKYC,
        },
      };
    } catch (error) {
      logger.error('Error getting platform stats', error);
      throw error;
    }
  }

  /**
   * Get moderation queue
   */
  async getModerationQueue() {
    try {
      // Get pending KYC verifications
      const pendingKYC = await prisma.kYCVerification.findMany({
        where: { status: 'PENDING' },
        orderBy: { created_at: 'asc' },
        take: 20,
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
            },
          },
        },
      });

      // Get inactive users (potential issues)
      const inactiveUsers = await prisma.user.findMany({
        where: { is_active: false },
        orderBy: { updated_at: 'desc' },
        take: 10,
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          is_active: true,
          created_at: true,
        },
      });

      return {
        pending_kyc: pendingKYC,
        inactive_users: inactiveUsers,
      };
    } catch (error) {
      logger.error('Error getting moderation queue', error);
      throw error;
    }
  }
}

// Export singleton instance
const adminService = new AdminService();
export default adminService;

