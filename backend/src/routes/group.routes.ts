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
  updateMemberRoleSchema,
  removeMemberSchema,
} from '@/validations/group.validation';
import { getGroupEventsSchema } from '@/validations/event.validation';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

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

