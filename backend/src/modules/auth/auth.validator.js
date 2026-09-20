import { z } from "zod";

import { PASSWORD_POLICY } from "./auth.constants.js";

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

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).trim().email().toLowerCase(),
    password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string({ required_error: "Current password is required" }).min(1),
    newPassword: passwordSchema,
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string({ required_error: "Full name is required" }).trim().min(2).max(120),
    phone: z.string().trim().max(30).nullable().optional(),
  }),
});