import { z } from "zod";

import { NOTIFICATION_LIMITS, NOTIFICATION_STATUS_VALUES } from "./notification.constants.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const emptyBodySchema = z.object({}).strict().optional().default({});

export const listNotificationsSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(NOTIFICATION_LIMITS.defaultPage),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(NOTIFICATION_LIMITS.maxLimit)
        .default(NOTIFICATION_LIMITS.defaultLimit),
      status: z.enum(NOTIFICATION_STATUS_VALUES).default("all"),
    })
    .strict(),
});

export const unreadNotificationCountSchema = z.object({
  query: z.object({}).strict().optional().default({}),
});

export const markNotificationReadSchema = z.object({
  params: z.object({ notificationId: objectIdSchema }).strict(),
  body: emptyBodySchema,
});

export const markAllNotificationsReadSchema = z.object({
  body: emptyBodySchema,
});