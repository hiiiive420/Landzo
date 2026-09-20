import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";

import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";

import { getPublicContactSettingsHandler, getSettingsHandler, updateSettingsHandler } from "./settings.controller.js";
import { getSettingsSchema, updateSettingsSchema } from "./settings.validator.js";

export const createSettingsRouter = (env) => {
  const router = Router();

  router.use(authenticateStaff(env));
  router.use(requirePermissions(PERMISSIONS.SETTINGS_MANAGE));

  router.get("/", validateRequest(getSettingsSchema), getSettingsHandler);
  router.patch("/", validateRequest(updateSettingsSchema), updateSettingsHandler);

  return router;
};
export const createPublicSettingsRouter = () => {
  const router = Router();

  router.get("/contact", validateRequest(getSettingsSchema), getPublicContactSettingsHandler);

  return router;
};