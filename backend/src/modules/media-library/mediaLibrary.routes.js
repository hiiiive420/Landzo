import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";
import { listMediaLibraryHandler } from "./mediaLibrary.controller.js";
import { listMediaLibrarySchema } from "./mediaLibrary.validator.js";

export const createMediaLibraryRouter = (env) => {
  const router = Router();
  const requireStaff = authenticateStaff(env);
  const requireMediaView = requirePermissions(PERMISSIONS.MEDIA_VIEW);

  router.use(requireStaff);

  router.get(
    "/",
    requireMediaView,
    validateRequest(listMediaLibrarySchema),
    listMediaLibraryHandler,
  );

  return router;
};
