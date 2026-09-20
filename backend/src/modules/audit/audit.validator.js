import { z } from "zod";

import {
  AUDIT_ACTION_VALUES,
  AUDIT_ENTITY_TYPE_VALUES,
  AUDIT_LIMITS,
} from "./audit.constants.js";

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid ObjectId",
  );

const dateOnlySchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must use YYYY-MM-DD format",
  )
  .refine((value) => {
    const date = new Date(
      `${value}T00:00:00.000Z`,
    );

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return (
      date.toISOString().slice(0, 10) ===
      value
    );
  }, "Invalid date");

const auditListQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(
        AUDIT_LIMITS.defaultPage,
      ),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(AUDIT_LIMITS.maxLimit)
      .default(
        AUDIT_LIMITS.defaultLimit,
      ),

    search: z
      .string()
      .trim()
      .max(
        AUDIT_LIMITS.searchMaxLength,
      )
      .optional(),

    actorId:
      objectIdSchema.optional(),

    action: z
      .enum(AUDIT_ACTION_VALUES)
      .optional(),

    entityType: z
      .enum(AUDIT_ENTITY_TYPE_VALUES)
      .optional(),

    entityId:
      objectIdSchema.optional(),

    startDate:
      dateOnlySchema.optional(),

    endDate:
      dateOnlySchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.startDate &&
      value.endDate &&
      value.startDate > value.endDate
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          "End date must be on or after start date",
      });
    }
  });

export const listAuditLogsSchema =
  z.object({
    query: auditListQuerySchema,
  });