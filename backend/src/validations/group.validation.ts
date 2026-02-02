import { z } from 'zod';

// Create group schema
export const createGroupSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Group name is required')
      .max(255, 'Group name must be less than 255 characters'),
    description: z
      .string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional()
      .or(z.literal('')),
    category: z
      .string()
      .min(1, 'Category is required')
      .max(50, 'Category must be less than 50 characters'),
    isPublic: z.boolean().optional().default(true),
  }),
});

// Update group schema
export const updateGroupSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Group name is required')
      .max(255, 'Group name must be less than 255 characters')
      .optional(),
    description: z
      .string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional()
      .or(z.literal('')),
    category: z
      .string()
      .min(1, 'Category is required')
      .max(50, 'Category must be less than 50 characters')
      .optional(),
    isPublic: z.boolean().optional(),
  }),
});

// Get group schema (params)
export const getGroupSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
});

// List groups schema
export const listGroupsSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    category: z.string().max(50).optional(),
    search: z.string().max(255).optional(),
    isPublic: z
      .string()
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
  }),
});

// Join group schema
export const joinGroupSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
});

// Leave group schema
export const leaveGroupSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
});

// Get group members schema
export const getGroupMembersSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

// Update member role schema
export const updateMemberRoleSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
    memberId: z.string().uuid('Invalid member ID format'),
  }),
  body: z.object({
    role: z.enum(['MEMBER', 'MODERATOR', 'ADMIN'], {
      errorMap: () => ({ message: 'Role must be MEMBER, MODERATOR, or ADMIN' }),
    }),
  }),
});

// Remove member schema
export const removeMemberSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
    memberId: z.string().uuid('Invalid member ID format'),
  }),
});

// Get user groups schema
export const getUserGroupsSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// Get group messages schema
export const getGroupMessagesSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

// Send group message schema
export const sendGroupMessageSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
  body: z.object({
    content: z.string().min(1, 'Message content is required').max(4000, 'Message too long'),
    message_type: z.enum(['TEXT', 'VOICE', 'IMAGE', 'FILE', 'SYSTEM']).optional().default('TEXT'),
  }),
});

