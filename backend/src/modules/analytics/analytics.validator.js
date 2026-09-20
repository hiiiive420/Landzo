import { z } from "zod";

import {
  ANALYTICS_CONTEXT_SURFACE_VALUES,
  ANALYTICS_DEFAULT_RANGE,
  ANALYTICS_RANGE_VALUES,
  PUBLIC_ANALYTICS_EVENT_TYPES,
} from "./analytics.constants.js";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const analyticsContextSchema = z
  .object({
    surface: z.enum(ANALYTICS_CONTEXT_SURFACE_VALUES).optional(),
  })
  .strict();

export const createPublicAnalyticsEventSchema = z.object({
  body: z
    .object({
      eventType: z.enum(PUBLIC_ANALYTICS_EVENT_TYPES),
      propertyId: objectIdSchema.optional(),
      context: analyticsContextSchema.optional(),
    })
    .strict(),
});

export const getAnalyticsSummarySchema = z.object({
  query: z
    .object({
      range: z
        .enum(ANALYTICS_RANGE_VALUES)
        .default(ANALYTICS_DEFAULT_RANGE),
    })
    .strict(),
});
