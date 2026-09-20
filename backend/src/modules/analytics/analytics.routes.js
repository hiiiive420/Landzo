import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";

import {
  createPublicAnalyticsEventHandler,
  getAnalyticsSummaryHandler,
} from "./analytics.controller.js";
import {
  createPublicAnalyticsEventSchema,
  getAnalyticsSummarySchema,
} from "./analytics.validator.js";

export const createPublicAnalyticsRouter = () => {
  const router = Router();

  router.post(
    "/events",
    validateRequest(createPublicAnalyticsEventSchema),
    createPublicAnalyticsEventHandler,
  );

  return router;
};

export const createAdminAnalyticsRouter = (env) => {
  const router = Router();

  const requireStaff = authenticateStaff(env);
  const requireAnalyticsView = requirePermissions(
    PERMISSIONS.ANALYTICS_VIEW,
  );

  router.use(requireStaff);

  router.get(
    "/summary",
    requireAnalyticsView,
    validateRequest(getAnalyticsSummarySchema),
    getAnalyticsSummaryHandler,
  );

  return router;
};
