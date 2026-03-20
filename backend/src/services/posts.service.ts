import prisma from '@/config/database';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';
import {
  normalizePagination,
  createPaginatedResponse,
  getPaginationMetadata,
} from '@/utils/pagination';
import { deleteFile, getFilePathFromUrl } from '@/utils/fileUpload';

export interface CreatePostInput {
  content: string;
  imageUrl?: string;
}

export interface ListPostsParams {
  limit?: number;
  offset?: number;
  userId?: string;
}

export class PostsService {
  async createPost(userId: string, data: CreatePostInput) {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { user_id: true, first_name: true, last_name: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const post = await prisma.post.create({
        data: {
          user_id: userId,
          content: data.content,
          image_url: data.imageUrl || null,
        },
        include: {
          author: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: {
                select: {
                  bio: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Post created: ${post.post_id} by user ${userId}`);

      // Create a persistent notification for the post creator.
      // This lets the client show a real-time "post published" toast/badge via websocket.
      const notification = await prisma.notification.create({
        data: {
          user_id: userId,
          type: 'post',
          title: 'Post published',
          message: (data.content || '').slice(0, 120),
          post_id: post.post_id,
        },
      });

      const formattedPost = this.formatPost(post, userId);
      return {
        ...formattedPost,
        notification: {
          notification_id: notification.notification_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          post_id: notification.post_id,
          created_at: notification.created_at,
        },
      };
    } catch (error) {
      logger.error('Error creating post', error);
      throw error;
    }
  }

  async getPost(postId: string, userId?: string) {
    try {
      const post = await prisma.post.findUnique({
        where: { post_id: postId },
        include: {
          author: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: {
                select: {
                  bio: true,
                },
              },
            },
          },
          likes: userId
            ? {
                where: { user_id: userId },
                take: 1,
              }
            : false,
        },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      if (!post.is_active) {
        throw new Error('Post not found');
      }

      return this.formatPost(post, userId);
    } catch (error) {
      logger.error('Error getting post', error);
      throw error;
    }
  }

  async listPosts(params: ListPostsParams, currentUserId?: string) {
    try {
      const { limit, offset } = normalizePagination(params.limit, params.offset);
      const { userId } = params;

      const where: Prisma.PostWhereInput = {
        is_active: true,
      };

      if (userId) {
        where.user_id = userId;
      }

      const total = await prisma.post.count({ where });

      const posts = await prisma.post.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          author: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: {
                select: {
                  bio: true,
                },
              },
            },
          },
          likes: currentUserId
            ? {
                where: { user_id: currentUserId },
                take: 1,
              }
            : false,
        },
      });

      const formattedPosts = posts.map((post) => this.formatPost(post, currentUserId));

      const pagination = getPaginationMetadata(total, limit, offset);

      logger.info('Posts listed', {
        total,
        returned: posts.length,
        limit,
        offset,
      });

      return {
        ...createPaginatedResponse(formattedPosts, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error listing posts', error);
      throw error;
    }
  }

  async getRecentPosts(limit: number = 20, currentUserId?: string) {
    try {
      const posts = await prisma.post.findMany({
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          author: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: {
                select: {
                  bio: true,
                },
              },
            },
          },
          likes: currentUserId
            ? {
                where: { user_id: currentUserId },
                take: 1,
              }
            : false,
        },
      });

      return posts.map((post) => this.formatPost(post, currentUserId));
    } catch (error) {
      logger.error('Error getting recent posts', error);
      throw error;
    }
  }

  async deletePost(postId: string, userId: string) {
    try {
      const post = await prisma.post.findUnique({
        where: { post_id: postId },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      if (post.user_id !== userId) {
        throw new Error('You can only delete your own posts');
      }

      // Delete image file if exists
      if (post.image_url) {
        try {
          const filePath = getFilePathFromUrl(post.image_url);
          await deleteFile(filePath);
        } catch (err) {
          logger.warn('Failed to delete post image file', err);
        }
      }

      await prisma.post.update({
        where: { post_id: postId },
        data: { is_active: false },
      });

      logger.info(`Post ${postId} deleted by user ${userId}`);

      return { message: 'Post deleted successfully' };
    } catch (error) {
      logger.error('Error deleting post', error);
      throw error;
    }
  }

  async likePost(postId: string, userId: string) {
    try {
      const post = await prisma.post.findUnique({
        where: { post_id: postId },
      });

      if (!post || !post.is_active) {
        throw new Error('Post not found');
      }

      const existingLike = await prisma.postLike.findUnique({
        where: {
          post_id_user_id: {
            post_id: postId,
            user_id: userId,
          },
        },
      });

      if (existingLike) {
        throw new Error('Already liked this post');
      }

      await prisma.$transaction([
        prisma.postLike.create({
          data: {
            post_id: postId,
            user_id: userId,
          },
        }),
        prisma.post.update({
          where: { post_id: postId },
          data: {
            likes_count: { increment: 1 },
          },
        }),
      ]);

      logger.info(`User ${userId} liked post ${postId}`);

      return { message: 'Post liked successfully' };
    } catch (error) {
      logger.error('Error liking post', error);
      throw error;
    }
  }

  async unlikePost(postId: string, userId: string) {
    try {
      const post = await prisma.post.findUnique({
        where: { post_id: postId },
      });

      if (!post || !post.is_active) {
        throw new Error('Post not found');
      }

      const existingLike = await prisma.postLike.findUnique({
        where: {
          post_id_user_id: {
            post_id: postId,
            user_id: userId,
          },
        },
      });

      if (!existingLike) {
        throw new Error('Post not liked');
      }

      await prisma.$transaction([
        prisma.postLike.delete({
          where: {
            post_id_user_id: {
              post_id: postId,
              user_id: userId,
            },
          },
        }),
        prisma.post.update({
          where: { post_id: postId },
          data: {
            likes_count: { decrement: 1 },
          },
        }),
      ]);

      logger.info(`User ${userId} unliked post ${postId}`);

      return { message: 'Post unliked successfully' };
    } catch (error) {
      logger.error('Error unliking post', error);
      throw error;
    }
  }

  async getUserPosts(userId: string, currentUserId?: string, limit: number = 20, offset: number = 0) {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const total = await prisma.post.count({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      const posts = await prisma.post.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          author: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: {
                select: {
                  bio: true,
                },
              },
            },
          },
          likes: currentUserId
            ? {
                where: { user_id: currentUserId },
                take: 1,
              }
            : false,
        },
      });

      const formattedPosts = posts.map((post) => this.formatPost(post, currentUserId));
      const pagination = getPaginationMetadata(total, limit, offset);

      return {
        ...createPaginatedResponse(formattedPosts, total, limit, offset),
        pagination,
      };
    } catch (error) {
      logger.error('Error getting user posts', error);
      throw error;
    }
  }

  private formatPost(post: any, currentUserId?: string) {
    const isLiked =
      currentUserId && post.likes && Array.isArray(post.likes)
        ? post.likes.length > 0
        : false;

    return {
      postId: post.post_id,
      userId: post.user_id,
      content: post.content,
      imageUrl: post.image_url,
      image_url: post.image_url,
      likesCount: post.likes_count,
      isLiked,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: post.author
        ? {
            userId: post.author.user_id,
            firstName: post.author.first_name,
            lastName: post.author.last_name,
            bio: post.author.profile?.bio || null,
          }
        : null,
    };
  }
}

const postsService = new PostsService();
export default postsService;
