import { z } from 'zod';

export const markNotificationsReadSchema = z.object({
  body: z
    .object({
      notificationIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
});

