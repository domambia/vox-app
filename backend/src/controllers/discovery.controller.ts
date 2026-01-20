import { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import discoveryService from '@/services/discovery.service';
import matchService from '@/services/match.service';
import { AuthRequest } from '@/types';
import { extractPaginationFromQuery } from '@/utils/pagination';

export class DiscoveryController {
  /**
   * Discover profiles
   * GET /api/v1/profiles/discover
   */
  async discoverProfiles(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { limit, offset } = extractPaginationFromQuery(req.query);
      const { location, lookingFor, minInterests } = req.query;

      const result = await discoveryService.discoverProfiles({
        userId,
        limit,
        offset,
        location: location as string | undefined,
        lookingFor: lookingFor as string | undefined,
        minInterests: minInterests ? parseInt(minInterests as string, 10) : undefined,
      });

      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Profile not found. Please create a profile first.') {
        sendError(res, 'PROFILE_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'DISCOVERY_ERROR', error.message || 'Failed to discover profiles', 400);
    }
  }

  /**
   * Like a profile
   * POST /api/v1/profile/:userId/like
   */
  async likeProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const likerId = req.user!.userId;
      const { userId: likedId } = req.params;

      const result = await matchService.likeProfile(likerId, likedId);

      if (result.isMatch) {
        sendSuccess(res, {
          likeId: result.matchId, // Using matchId as likeId for consistency
          isMatch: true,
          matchId: result.matchId,
          message: "It's a match!",
        });
      } else {
        sendSuccess(res, {
          isMatch: false,
          message: 'Like recorded',
        });
      }
    } catch (error: any) {
      if (error.message === 'Cannot like your own profile') {
        sendError(res, 'INVALID_ACTION', error.message, 400);
        return;
      }
      if (error.message === 'Profile already liked') {
        sendError(res, 'ALREADY_LIKED', error.message, 409);
        return;
      }
      if (error.message === 'Profile not found' || error.message === 'Your profile not found') {
        sendError(res, 'PROFILE_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'LIKE_ERROR', error.message || 'Failed to like profile', 400);
    }
  }

  /**
   * Unlike a profile
   * DELETE /api/v1/profile/:userId/like
   */
  async unlikeProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const likerId = req.user!.userId;
      const { userId: likedId } = req.params;

      await matchService.unlikeProfile(likerId, likedId);

      sendSuccess(res, {
        message: 'Like removed successfully',
      });
    } catch (error: any) {
      if (error.message === 'Like not found') {
        sendError(res, 'LIKE_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'UNLIKE_ERROR', error.message || 'Failed to unlike profile', 400);
    }
  }

  /**
   * Get all matches
   * GET /api/v1/matches
   */
  async getMatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const matches = await matchService.getMatches(userId);

      sendSuccess(res, {
        matches,
      });
    } catch (error: any) {
      sendError(res, 'MATCHES_ERROR', error.message || 'Failed to get matches', 400);
    }
  }

  /**
   * Get likes (given or received)
   * GET /api/v1/likes
   */
  async getLikes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const type = (req.query.type as string) || 'given';

      let likes;
      if (type === 'received') {
        likes = await matchService.getLikesReceived(userId);
      } else {
        likes = await matchService.getLikesGiven(userId);
      }

      sendSuccess(res, {
        likes,
        type,
      });
    } catch (error: any) {
      sendError(res, 'LIKES_ERROR', error.message || 'Failed to get likes', 400);
    }
  }
}

// Export singleton instance
const discoveryController = new DiscoveryController();
export default discoveryController;

