import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, 'Content is required')
      .max(2000, 'Content must be 2000 characters or less'),
  }),
});

export const getPostSchema = z.object({
  params: z.object({
    postId: z.string().uuid('Invalid post ID'),
  }),
});

export const listPostsSchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    offset: z.string().optional(),
    userId: z.string().uuid('Invalid user ID').optional(),
  }),
});

export const recentPostsSchema = z.object({
  query: z.object({
    limit: z.string().optional(),
  }),
});

export const likePostSchema = z.object({
  params: z.object({
    postId: z.string().uuid('Invalid post ID'),
  }),
});

export const getUserPostsSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
  query: z.object({
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),
});
