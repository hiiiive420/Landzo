import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";
import {
  createLocationHandler,
  getLocationHandler,
  listLocationsHandler,
  updateLocationHandler,
  updateLocationStatusHandler,
} from "./location.controller.js";
import {
  createLocationSchema,
  listLocationsSchema,
  locationIdParamSchema,
  updateLocationSchema,
  updateLocationStatusSchema,
} from "./location.validator.js";

export const createLocationRouter = (env) => {
  const router = Router();
  const requireStaff = authenticateStaff(env);
  const requireLocationView = requirePermissions(PERMISSIONS.LOCATION_VIEW);
  const requireLocationManage = requirePermissions(PERMISSIONS.LOCATION_MANAGE);

  router.use(requireStaff);

  router.get("/", requireLocationView, validateRequest(listLocationsSchema), listLocationsHandler);
  router.post(
    "/",
    requireLocationManage,
    validateRequest(createLocationSchema),
    createLocationHandler,
  );
  router.get(
    "/:locationId",
    requireLocationView,
    validateRequest(locationIdParamSchema),
    getLocationHandler,
  );
  router.patch(
    "/:locationId",
    requireLocationManage,
    validateRequest(updateLocationSchema),
    updateLocationHandler,
  );
  router.patch(
    "/:locationId/status",
    requireLocationManage,
    validateRequest(updateLocationStatusSchema),
    updateLocationStatusHandler,
  );

  return router;
};
