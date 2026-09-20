import { Router } from "express";

import { authenticateStaff } from "../auth/auth.middleware.js";

import {
  PERMISSIONS,
} from "../roles-permissions/permission.constants.js";

import {
  requirePermissions,
} from "../roles-permissions/rbac.middleware.js";

import {
  validateRequest,
} from "../../common/validation/validateRequest.js";

import {
  listAuditLogsHandler,
} from "./audit.controller.js";

import {
  listAuditLogsSchema,
} from "./audit.validator.js";

export const createAuditRouter = (env) => {
  const router = Router();

  const requireStaff =
    authenticateStaff(env);

  const requireAuditView =
    requirePermissions(
      PERMISSIONS.AUDIT_VIEW,
    );

  router.use(requireStaff);

  router.get(
    "/",
    requireAuditView,
    validateRequest(
      listAuditLogsSchema,
    ),
    listAuditLogsHandler,
  );

  return router;
};