import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";

import { authenticateStaff } from "../auth/auth.middleware.js";

import { PERMISSIONS } from "../roles-permissions/permission.constants.js";

import { requirePermissions } from "../roles-permissions/rbac.middleware.js";

import {
  getAdminHomepageHandler,
  getPublicHomepageHandler,
  updateHomepageHandler,
} from "./homepage.controller.js";

import {
  removeHomepageImageHandler,
  uploadHomepageImageHandler,
} from "./homepageMedia.controller.js";

import { uploadHomepageImageMiddleware } from "./homepageMedia.middleware.js";

import {
  homepageImageTargetParamSchema,
  uploadHomepageImageSchema,
} from "./homepageMedia.validator.js";

import { updateHomepageSchema } from "./homepage.validator.js";

export const createHomepageRouter = (env) => {
  const router = Router();

  const requireStaff = authenticateStaff(env);

  const requireHomepageView = requirePermissions(
    PERMISSIONS.HOMEPAGE_VIEW,
  );

  const requireHomepageEdit = requirePermissions(
    PERMISSIONS.HOMEPAGE_EDIT,
  );

  router.use(requireStaff);

  router.get(
    "/",
    requireHomepageView,
    getAdminHomepageHandler,
  );

  router.patch(
    "/",
    requireHomepageEdit,
    validateRequest(updateHomepageSchema),
    updateHomepageHandler,
  );

  router.post(
    "/images/:target",
    requireHomepageEdit,
    uploadHomepageImageMiddleware,
    validateRequest(uploadHomepageImageSchema),
    uploadHomepageImageHandler(env),
  );

  router.delete(
    "/images/:target",
    requireHomepageEdit,
    validateRequest(homepageImageTargetParamSchema),
    removeHomepageImageHandler(env),
  );

  return router;
};

export const createPublicHomepageRouter = () => {
  const router = Router();

  router.get(
    "/",
    getPublicHomepageHandler,
  );

  return router;
};