import { Router } from 'express';
import groupController from '@/controllers/group.controller';
import eventController from '@/controllers/event.controller';
import { validate } from '@/middleware/validation.middleware';
import {
  createGroupSchema,
  updateGroupSchema,
  getGroupSchema,
  listGroupsSchema,
  joinGroupSchema,
  leaveGroupSchema,
  getGroupMembersSchema,
  getGroupMessagesSchema,
  sendGroupMessageSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from '@/validations/group.validation';
import { getGroupEventsSchema } from '@/validations/event.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /groups:
 *   post:
 *     summary: Create a new group
 *     description: Create a new community group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Tech Enthusiasts"
 *               description:
 *                 type: string
 *                 example: "A group for technology enthusiasts"
 *               is_private:
 *                 type: boolean
 *                 default: false
 *               max_members:
 *                 type: integer
 *                 example: 100
 *     responses:
 *       201:
 *         description: Group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   POST /api/v1/groups
 * @desc    Create a new group
 * @access  Private (Authenticated)
 */
router.post(
  '/',
  authenticate,
  validate(createGroupSchema),
  groupController.createGroup.bind(groupController)
);

/**
 * @swagger
 * /groups:
 *   get:
 *     summary: List groups with filters
 *     description: Get a paginated list of groups with optional filters
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_private
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Groups retrieved successfully
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
 *                     groups:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
/**
 * @route   GET /api/v1/groups
 * @desc    List groups with filters
 * @access  Private (Authenticated)
 */
router.get(
  '/',
  authenticate,
  validate(listGroupsSchema),
  groupController.listGroups.bind(groupController)
);

/**
 * @swagger
 * /groups/{groupId}:
 *   get:
 *     summary: Get group by ID
 *     description: Retrieve detailed information about a specific group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Group retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
/**
 * @route   GET /api/v1/groups/:groupId
 * @desc    Get group by ID
 * @access  Private (Authenticated)
 */
router.get(
  '/:groupId',
  authenticate,
  validate(getGroupSchema),
  groupController.getGroup.bind(groupController)
);

/**
 * @route   GET /api/v1/groups/:groupId/messages
 * @desc    Get group messages (members only)
 * @access  Private (Authenticated)
 */
router.get(
  '/:groupId/messages',
  authenticate,
  validate(getGroupMessagesSchema),
  groupController.getGroupMessages.bind(groupController)
);

/**
 * @route   POST /api/v1/groups/:groupId/messages
 * @desc    Send group message (members only)
 * @access  Private (Authenticated)
 */
router.post(
  '/:groupId/messages',
  authenticate,
  validate(sendGroupMessageSchema),
  groupController.sendGroupMessage.bind(groupController)
);

/**
 * @swagger
 * /groups/{groupId}:
 *   put:
 *     summary: Update group
 *     description: Update group information (group admin only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               is_private:
 *                 type: boolean
 *               max_members:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Group updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin access required)
 *       404:
 *         description: Group not found
 */
/**
 * @route   PUT /api/v1/groups/:groupId
 * @desc    Update group (admin only)
 * @access  Private (Authenticated)
 */
router.put(
  '/:groupId',
  authenticate,
  validate(getGroupSchema),
  validate(updateGroupSchema),
  groupController.updateGroup.bind(groupController)
);

/**
 * @swagger
 * /groups/{groupId}:
 *   delete:
 *     summary: Delete group
 *     description: Delete a group (group admin only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Group deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin access required)
 *       404:
 *         description: Group not found
 */
/**
 * @route   DELETE /api/v1/groups/:groupId
 * @desc    Delete group (admin only)
 * @access  Private (Authenticated)
 */
router.delete(
  '/:groupId',
  authenticate,
  validate(getGroupSchema),
  groupController.deleteGroup.bind(groupController)
);

/**
 * @swagger
 * /groups/{groupId}/join:
 *   post:
 *     summary: Join a group
 *     description: Join a group as a member
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully joined the group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Already a member or group is full
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
/**
 * @route   POST /api/v1/groups/:groupId/join
 * @desc    Join a group
 * @access  Private (Authenticated)
 */
router.post(
  '/:groupId/join',
  authenticate,
  validate(joinGroupSchema),
  groupController.joinGroup.bind(groupController)
);

/**
 * @swagger
 * /groups/{groupId}/leave:
 *   post:
 *     summary: Leave a group
 *     description: Leave a group that you are a member of
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully left the group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Not a member of the group
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
/**
 * @route   POST /api/v1/groups/:groupId/leave
 * @desc    Leave a group
 * @access  Private (Authenticated)
 */
router.post(
  '/:groupId/leave',
  authenticate,
  validate(leaveGroupSchema),
  groupController.leaveGroup.bind(groupController)
);

/**
 * @swagger
 * /groups/{groupId}/members:
 *   get:
 *     summary: Get group members
 *     description: Retrieve a list of all members in a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, moderator, member]
 *     responses:
 *       200:
 *         description: Members retrieved successfully
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
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
/**
 * @route   GET /api/v1/groups/:groupId/members
 * @desc    Get group members
 * @access  Private (Authenticated)
 */
router.get(
  '/:groupId/members',
  authenticate,
  validate(getGroupMembersSchema),
  groupController.getGroupMembers.bind(groupController)
);

/**
 * @swagger
 * /groups/{groupId}/members/{memberId}/role:
 *   put:
 *     summary: Update member role
 *     description: Update a member's role in the group (group admin only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, member]
 *                 example: "moderator"
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin access required)
 *       404:
 *         description: Group or member not found
 */
/**
 * @route   PUT /api/v1/groups/:groupId/members/:memberId/role
 * @desc    Update member role (admin only)
 * @access  Private (Authenticated)
 */
router.put(
  '/:groupId/members/:memberId/role',
  authenticate,
  validate(updateMemberRoleSchema),
  groupController.updateMemberRole.bind(groupController)
);

/**
 * @swagger
 * /groups/{groupId}/members/{memberId}:
 *   delete:
 *     summary: Remove member from group
 *     description: Remove a member from the group (admin/moderator only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin/moderator access required)
 *       404:
 *         description: Group or member not found
 */
/**
 * @route   DELETE /api/v1/groups/:groupId/members/:memberId
 * @desc    Remove member from group (admin/moderator only)
 * @access  Private (Authenticated)
 */
router.delete(
  '/:groupId/members/:memberId',
  authenticate,
  validate(removeMemberSchema),
  groupController.removeMember.bind(groupController)
);

/**
 * @swagger
 * /groups/{groupId}/events:
 *   get:
 *     summary: Get group events
 *     description: Retrieve all events associated with a group
 *     tags: [Groups, Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, past]
 *     responses:
 *       200:
 *         description: Events retrieved successfully
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
 *                     events:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
/**
 * @route   GET /api/v1/groups/:groupId/events
 * @desc    Get group events
 * @access  Private (Authenticated)
 */
router.get(
  '/:groupId/events',
  authenticate,
  validate(getGroupEventsSchema),
  eventController.getGroupEvents.bind(eventController)
);

export default router;
