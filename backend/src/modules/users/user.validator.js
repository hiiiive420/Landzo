import mongoose from "mongoose";
import { z } from "zod";

import { PASSWORD_POLICY, STAFF_ROLES, STAFF_STATUSES } from "../auth/auth.constants.js";
import { SYSTEM_ROLE_KEYS } from "../roles-permissions/role.constants.js";

const objectIdSchema = z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
  message: "Invalid user id",
});

const optionalPhoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^\+?[0-9()\-\s]+$/, "Phone must contain only phone-safe characters")
  .nullable()
  .optional();

const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(
    PASSWORD_POLICY.minLength,
    `Password must be at least ${PASSWORD_POLICY.minLength} characters`,
  )
  .max(
    PASSWORD_POLICY.maxLength,
    `Password must be at most ${PASSWORD_POLICY.maxLength} characters`,
  );

export const userIdParamSchema = z.object({
  params: z.object({
    userId: objectIdSchema,
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(80).optional(),
    role: z.enum(SYSTEM_ROLE_KEYS).optional(),
    status: z.enum(Object.values(STAFF_STATUSES)).optional(),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string({ required_error: "Full name is required" }).trim().min(2).max(120),
    email: z.string({ required_error: "Email is required" }).trim().email().toLowerCase(),
    phone: optionalPhoneSchema,
    role: z.enum(SYSTEM_ROLE_KEYS).default(STAFF_ROLES.ADMIN),
    initialPassword: passwordSchema,
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    userId: objectIdSchema,
  }),
  body: z
    .object({
      fullName: z.string().trim().min(2).max(120).optional(),
      email: z.string().trim().email().toLowerCase().optional(),
      phone: optionalPhoneSchema,
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, "At least one profile field is required"),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    userId: objectIdSchema,
  }),
  body: z.object({
    role: z.enum(SYSTEM_ROLE_KEYS),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    userId: objectIdSchema,
  }),
  body: z.object({
    status: z.enum(Object.values(STAFF_STATUSES)),
  }),
});

export const resetUserPasswordSchema = z.object({
  params: z.object({
    userId: objectIdSchema,
  }),
  body: z.object({
    newPassword: passwordSchema,
  }),
});
