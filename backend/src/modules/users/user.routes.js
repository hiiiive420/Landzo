import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";
import {
  changeUserRole,
  changeUserStatus,
  createUser,
  getUser,
  listUsers,
  resetUserPassword,
  updateUser,
} from "./user.controller.js";
import {
  createUserSchema,
  listUsersSchema,
  resetUserPasswordSchema,
  updateUserRoleSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from "./user.validator.js";

export const createUserRouter = (env) => {
  const router = Router();
  const requireStaff = authenticateStaff(env);
  const requireUserManage = requirePermissions(PERMISSIONS.USER_MANAGE);

  router.use(requireStaff, requireUserManage);
  router.get("/", validateRequest(listUsersSchema), listUsers);
  router.post("/", validateRequest(createUserSchema), createUser);
  router.get("/:userId", validateRequest(userIdParamSchema), getUser);
  router.patch("/:userId", validateRequest(updateUserSchema), updateUser);
  router.patch("/:userId/role", validateRequest(updateUserRoleSchema), changeUserRole);
  router.patch("/:userId/status", validateRequest(updateUserStatusSchema), changeUserStatus);
  router.patch(
    "/:userId/reset-password",
    validateRequest(resetUserPasswordSchema),
    resetUserPassword,
  );

  return router;
};
