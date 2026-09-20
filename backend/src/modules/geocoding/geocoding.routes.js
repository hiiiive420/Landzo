import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";
import { reverseGeocodeHandler, searchPlacesHandler } from "./geocoding.controller.js";
import { geocodingReverseSchema, geocodingSearchSchema } from "./geocoding.validator.js";

export const createGeocodingRouter = (env) => {
  const router = Router();
  const requireStaff = authenticateStaff(env);
  const requireLocationView = requirePermissions(PERMISSIONS.LOCATION_VIEW);

  router.use(requireStaff);

  router.get("/search", requireLocationView, validateRequest(geocodingSearchSchema), searchPlacesHandler);
  router.get("/reverse", requireLocationView, validateRequest(geocodingReverseSchema), reverseGeocodeHandler);

  return router;
};
