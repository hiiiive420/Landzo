import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "./permission.constants.js";
import { getPermissions, getRoles, patchRolePermissions } from "./role.controller.js";
import { requirePermissions } from "./rbac.middleware.js";
import { updateRolePermissionsSchema } from "./role.validator.js";

export const createRoleRouter = (env) => {
  const router = Router();
  const requireStaff = authenticateStaff(env);
  const requireRoleManage = requirePermissions(PERMISSIONS.ROLE_MANAGE);

  router.get("/", requireStaff, requireRoleManage, getRoles);
  router.get("/permissions", requireStaff, requireRoleManage, getPermissions);
  router.patch(
    "/:roleKey/permissions",
    requireStaff,
    requireRoleManage,
    validateRequest(updateRolePermissionsSchema),
    patchRolePermissions,
  );

  return router;
};
