import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";
import {
  cancelSiteVisitHandler,
  completeSiteVisitHandler,
  createSiteVisitHandler,
  getSiteVisitHandler,
  listSiteVisitAssigneesHandler,
  listSiteVisitCustomerOptionsHandler,
  listSiteVisitPropertyOptionsHandler,
  listSiteVisitsHandler,
  markSiteVisitNoShowHandler,
  updateSiteVisitHandler,
} from "./siteVisit.controller.js";
import {
  cancelSiteVisitSchema,
  completeSiteVisitSchema,
  createSiteVisitSchema,
  listSiteVisitOptionsSchema,
  listSiteVisitsSchema,
  siteVisitIdParamSchema,
  updateSiteVisitSchema,
} from "./siteVisit.validator.js";

export const createSiteVisitRouter = (env) => {
  const router = Router();
  const requireStaff = authenticateStaff(env);
  const requireSiteVisitView = requirePermissions(PERMISSIONS.SITE_VISIT_VIEW);
  const requireSiteVisitManage = requirePermissions(PERMISSIONS.SITE_VISIT_MANAGE);

  router.use(requireStaff);

  router.get("/", requireSiteVisitView, validateRequest(listSiteVisitsSchema), listSiteVisitsHandler);
  router.get("/assignees", requireSiteVisitManage, listSiteVisitAssigneesHandler);
  router.get(
    "/property-options",
    requireSiteVisitManage,
    validateRequest(listSiteVisitOptionsSchema),
    listSiteVisitPropertyOptionsHandler,
  );
  router.get(
    "/customer-options",
    requireSiteVisitManage,
    validateRequest(listSiteVisitOptionsSchema),
    listSiteVisitCustomerOptionsHandler,
  );
  router.get("/:siteVisitId", requireSiteVisitView, validateRequest(siteVisitIdParamSchema), getSiteVisitHandler);
  router.post("/", requireSiteVisitManage, validateRequest(createSiteVisitSchema), createSiteVisitHandler);
  router.patch("/:siteVisitId", requireSiteVisitManage, validateRequest(updateSiteVisitSchema), updateSiteVisitHandler);
  router.post(
    "/:siteVisitId/complete",
    requireSiteVisitManage,
    validateRequest(completeSiteVisitSchema),
    completeSiteVisitHandler,
  );
  router.post(
    "/:siteVisitId/cancel",
    requireSiteVisitManage,
    validateRequest(cancelSiteVisitSchema),
    cancelSiteVisitHandler,
  );
  router.post("/:siteVisitId/no-show", requireSiteVisitManage, validateRequest(siteVisitIdParamSchema), markSiteVisitNoShowHandler);

  return router;
};