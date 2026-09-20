import { z } from "zod";

import { STAFF_ROLES } from "../auth/auth.constants.js";
import { PERMISSION_VALUES } from "./permission.constants.js";
import { SYSTEM_ROLE_KEYS } from "./role.constants.js";

export const roleKeyParamSchema = z.object({
  params: z.object({
    roleKey: z.enum(SYSTEM_ROLE_KEYS),
  }),
});

export const updateRolePermissionsSchema = z.object({
  params: z.object({
    roleKey: z.enum(SYSTEM_ROLE_KEYS),
  }),
  body: z.object({
    permissions: z
      .array(z.enum(PERMISSION_VALUES), { required_error: "Permissions are required" })
      .transform((permissions) => [...new Set(permissions)]),
  }),
});

export const ownerRoleKey = STAFF_ROLES.OWNER;
