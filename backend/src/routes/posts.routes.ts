import { Router } from 'express';
import postsController from '@/controllers/posts.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  createPostSchema,
  getPostSchema,
  listPostsSchema,
  recentPostsSchema,
  likePostSchema,
  getUserPostsSchema,
} from '@/validations/post.validation';
import { authenticate } from '@/middleware/auth.middleware';
import { uploadPostImage } from '@/utils/fileUpload';

const router = Router();

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a new post with optional image
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Hello world! This is my first post."
 *               postImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional image file
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  uploadPostImage,
  validate(createPostSchema),
  postsController.createPost.bind(postsController)
);

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: List posts
 *     description: Get a paginated list of posts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter posts by user ID
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  validate(listPostsSchema),
  postsController.listPosts.bind(postsController)
);

/**
 * @swagger
 * /posts/recent:
 *   get:
 *     summary: Get recent posts
 *     description: Get the most recent posts for the feed
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Recent posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/recent',
  authenticate,
  validate(recentPostsSchema),
  postsController.getRecentPosts.bind(postsController)
);

/**
 * @swagger
 * /posts/user/{userId}:
 *   get:
 *     summary: Get user's posts
 *     description: Get all posts by a specific user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: User posts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
  '/user/:userId',
  authenticate,
  validate(getUserPostsSchema),
  postsController.getUserPosts.bind(postsController)
);

/**
 * @swagger
 * /posts/{postId}:
 *   get:
 *     summary: Get post by ID
 *     description: Retrieve a specific post by its ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.get(
  '/:postId',
  authenticate,
  validate(getPostSchema),
  postsController.getPost.bind(postsController)
);

/**
 * @swagger
 * /posts/{postId}:
 *   delete:
 *     summary: Delete post
 *     description: Delete a post (own posts only)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (can only delete own posts)
 *       404:
 *         description: Post not found
 */
router.delete(
  '/:postId',
  authenticate,
  validate(getPostSchema),
  postsController.deletePost.bind(postsController)
);

/**
 * @swagger
 * /posts/{postId}/like:
 *   post:
 *     summary: Like a post
 *     description: Add a like to a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post liked successfully
 *       400:
 *         description: Already liked this post
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.post(
  '/:postId/like',
  authenticate,
  validate(likePostSchema),
  postsController.likePost.bind(postsController)
);

/**
 * @swagger
 * /posts/{postId}/like:
 *   delete:
 *     summary: Unlike a post
 *     description: Remove a like from a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post unliked successfully
 *       400:
 *         description: Post not liked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.delete(
  '/:postId/like',
  authenticate,
  validate(likePostSchema),
  postsController.unlikePost.bind(postsController)
);

export default router;
