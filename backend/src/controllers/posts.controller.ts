import { Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import postsService from '@/services/posts.service';
import { AuthRequest } from '@/types';
import { extractPaginationFromQuery } from '@/utils/pagination';
import { getFileUrl } from '@/utils/fileUpload';
import { emitToUser, getIo } from '@/utils/websocket';

export class PostsController {
  async createPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { content } = req.body;

      let imageUrl: string | undefined;
      if (req.file) {
        imageUrl = getFileUrl(req.file.path);
      }

      const post = await postsService.createPost(userId, {
        content,
        imageUrl,
      });

      // Emit persistent notification to the creator (if they're connected).
      const io = getIo();
      const notification = (post as any)?.notification;
      if (io && notification && notification.notification_id) {
        emitToUser(io, userId, 'notification:new', {
          ...notification,
        });
      }

      sendSuccess(res, post, 201);
    } catch (error: any) {
      if (error.message === 'User not found') {
        sendError(res, 'USER_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'POST_CREATION_ERROR', error.message || 'Failed to create post', 400);
    }
  }

  async getPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const userId = req.user?.userId;

      const post = await postsService.getPost(postId, userId);
      sendSuccess(res, post);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        sendError(res, 'POST_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'POST_FETCH_ERROR', error.message || 'Failed to fetch post', 400);
    }
  }

  async listPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit, offset } = extractPaginationFromQuery(req.query);
      const { userId } = req.query;
      const currentUserId = req.user?.userId;

      const result = await postsService.listPosts(
        {
          limit,
          offset,
          userId: userId as string | undefined,
        },
        currentUserId
      );

      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, 'POSTS_LIST_ERROR', error.message || 'Failed to list posts', 400);
    }
  }

  async getRecentPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const currentUserId = req.user?.userId;

      const posts = await postsService.getRecentPosts(limit, currentUserId);
      sendSuccess(res, { posts });
    } catch (error: any) {
      sendError(res, 'RECENT_POSTS_ERROR', error.message || 'Failed to get recent posts', 400);
    }
  }

  async deletePost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const userId = req.user!.userId;

      const result = await postsService.deletePost(postId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        sendError(res, 'POST_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'You can only delete your own posts') {
        sendError(res, 'FORBIDDEN', error.message, 403);
        return;
      }
      sendError(res, 'POST_DELETE_ERROR', error.message || 'Failed to delete post', 400);
    }
  }

  async likePost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const userId = req.user!.userId;

      const result = await postsService.likePost(postId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        sendError(res, 'POST_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Already liked this post') {
        sendError(res, 'ALREADY_LIKED', error.message, 400);
        return;
      }
      sendError(res, 'LIKE_ERROR', error.message || 'Failed to like post', 400);
    }
  }

  async unlikePost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const userId = req.user!.userId;

      const result = await postsService.unlikePost(postId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        sendError(res, 'POST_NOT_FOUND', error.message, 404);
        return;
      }
      if (error.message === 'Post not liked') {
        sendError(res, 'NOT_LIKED', error.message, 400);
        return;
      }
      sendError(res, 'UNLIKE_ERROR', error.message || 'Failed to unlike post', 400);
    }
  }

  async getUserPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit, offset } = extractPaginationFromQuery(req.query);
      const currentUserId = req.user?.userId;

      const result = await postsService.getUserPosts(userId, currentUserId, limit, offset);
      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'User not found') {
        sendError(res, 'USER_NOT_FOUND', error.message, 404);
        return;
      }
      sendError(res, 'USER_POSTS_ERROR', error.message || 'Failed to get user posts', 400);
    }
  }
}

const postsController = new PostsController();
export default postsController;
