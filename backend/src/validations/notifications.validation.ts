import { z } from 'zod';

export const markNotificationsReadSchema = z.object({
  body: z
    .object({
      notificationIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
});

export const registerPushTokenSchema = z.object({
  body: z.object({
    token: z.string().min(10).max(4096),
    platform: z.string().min(2).max(32).optional(),
  }),
});

