import prisma from '@/config/database';
import { logger } from '@/utils/logger';

export class MatchService {
  /**
   * Like a profile
   * Returns true if it's a match (mutual like), false otherwise
   */
  async likeProfile(likerId: string, likedId: string): Promise<{ isMatch: boolean; matchId?: string }> {
    try {
      // Prevent self-like
      if (likerId === likedId) {
        throw new Error('Cannot like your own profile');
      }

      // Check if already liked
      const existingLike = await prisma.like.findUnique({
        where: {
          liker_id_liked_id: {
            liker_id: likerId,
            liked_id: likedId,
          },
        },
      });

      if (existingLike) {
        throw new Error('Profile already liked');
      }

      // Check if profiles exist
      const [likerProfile, likedProfile] = await Promise.all([
        prisma.profile.findUnique({ where: { user_id: likerId } }),
        prisma.profile.findUnique({ where: { user_id: likedId } }),
      ]);

      if (!likerProfile) {
        throw new Error('Your profile not found');
      }

      if (!likedProfile) {
        throw new Error('Profile not found');
      }

      // Create like
      await prisma.like.create({
        data: {
          liker_id: likerId,
          liked_id: likedId,
        },
      });

      // Check for mutual like (match)
      const mutualLike = await prisma.like.findUnique({
        where: {
          liker_id_liked_id: {
            liker_id: likedId,
            liked_id: likerId,
          },
        },
      });

      if (mutualLike) {
        // Create match
        // Ensure consistent ordering (user_a_id < user_b_id)
        const [userAId, userBId] = [likerId, likedId].sort();

        const match = await prisma.match.create({
          data: {
            user_a_id: userAId,
            user_b_id: userBId,
          },
        });

        logger.info(`Match created between ${likerId} and ${likedId}`);
        return { isMatch: true, matchId: match.match_id };
      }

      logger.info(`Like created from ${likerId} to ${likedId}`);
      return { isMatch: false };
    } catch (error) {
      logger.error('Error liking profile', error);
      throw error;
    }
  }

  /**
   * Unlike a profile (remove like)
   */
  async unlikeProfile(likerId: string, likedId: string): Promise<void> {
    try {
      const like = await prisma.like.findUnique({
        where: {
          liker_id_liked_id: {
            liker_id: likerId,
            liked_id: likedId,
          },
        },
      });

      if (!like) {
        throw new Error('Like not found');
      }

      // Delete like
      await prisma.like.delete({
        where: {
          liker_id_liked_id: {
            liker_id: likerId,
            liked_id: likedId,
          },
        },
      });

      // Check if there was a match and remove it
      const [userAId, userBId] = [likerId, likedId].sort();
      const match = await prisma.match.findUnique({
        where: {
          user_a_id_user_b_id: {
            user_a_id: userAId,
            user_b_id: userBId,
          },
        },
      });

      if (match) {
        await prisma.match.delete({
          where: {
            user_a_id_user_b_id: {
              user_a_id: userAId,
              user_b_id: userBId,
            },
          },
        });
        logger.info(`Match removed between ${likerId} and ${likedId}`);
      }

      logger.info(`Like removed from ${likerId} to ${likedId}`);
    } catch (error) {
      logger.error('Error unliking profile', error);
      throw error;
    }
  }

  /**
   * Get all matches for a user
   */
  async getMatches(userId: string) {
    try {
      const matches = await prisma.match.findMany({
        where: {
          AND: [
            { is_active: true },
            {
              OR: [
                { user_a_id: userId },
                { user_b_id: userId },
              ],
            },
          ],
        },
        include: {
          user_a: {
            include: {
              profile: true,
            },
          },
          user_b: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          matched_at: 'desc',
        },
      });

      // Transform to include the other user's profile
      const transformedMatches = matches.map((match) => {
        const otherUser = match.user_a_id === userId ? match.user_b : match.user_a;
        const otherProfile = match.user_a_id === userId ? match.user_b.profile : match.user_a.profile;

        return {
          match_id: match.match_id,
          matched_at: match.matched_at,
          is_active: match.is_active,
          other_user: {
            user_id: otherUser.user_id,
            first_name: otherUser.first_name,
            last_name: otherUser.last_name,
            phone_number: otherUser.phone_number,
            verified: otherUser.verified,
          },
          profile: otherProfile,
        };
      });

      return transformedMatches;
    } catch (error) {
      logger.error('Error getting matches', error);
      throw error;
    }
  }

  /**
   * Get likes given by a user
   */
  async getLikesGiven(userId: string) {
    try {
      const likes = await prisma.like.findMany({
        where: { liker_id: userId },
        include: {
          liked: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return likes.map((like) => ({
        like_id: like.like_id,
        created_at: like.created_at,
        profile: {
          user_id: like.liked.user_id,
          first_name: like.liked.first_name,
          last_name: like.liked.last_name,
          phone_number: like.liked.phone_number,
          verified: like.liked.verified,
          profile: like.liked.profile,
        },
      }));
    } catch (error) {
      logger.error('Error getting likes given', error);
      throw error;
    }
  }

  /**
   * Get likes received by a user
   */
  async getLikesReceived(userId: string) {
    try {
      const likes = await prisma.like.findMany({
        where: { liked_id: userId },
        include: {
          liker: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return likes.map((like) => ({
        like_id: like.like_id,
        created_at: like.created_at,
        profile: {
          user_id: like.liker.user_id,
          first_name: like.liker.first_name,
          last_name: like.liker.last_name,
          phone_number: like.liker.phone_number,
          verified: like.liker.verified,
          profile: like.liker.profile,
        },
      }));
    } catch (error) {
      logger.error('Error getting likes received', error);
      throw error;
    }
  }

  /**
   * Check if user has liked a profile
   */
  async hasLiked(likerId: string, likedId: string): Promise<boolean> {
    try {
      const like = await prisma.like.findUnique({
        where: {
          liker_id_liked_id: {
            liker_id: likerId,
            liked_id: likedId,
          },
        },
      });

      return !!like;
    } catch (error) {
      logger.error('Error checking like status', error);
      return false;
    }
  }

  /**
   * Check if two users are matched
   */
  async areMatched(userId1: string, userId2: string): Promise<boolean> {
    try {
      const [userAId, userBId] = [userId1, userId2].sort();

      const match = await prisma.match.findUnique({
        where: {
          user_a_id_user_b_id: {
            user_a_id: userAId,
            user_b_id: userBId,
          },
        },
      });

      return !!match && match.is_active;
    } catch (error) {
      logger.error('Error checking match status', error);
      return false;
    }
  }
}

// Export singleton instance
const matchService = new MatchService();
export default matchService;

