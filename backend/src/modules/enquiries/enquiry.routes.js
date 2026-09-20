import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";

import { authenticateStaff } from "../auth/auth.middleware.js";

import { PERMISSIONS } from "../roles-permissions/permission.constants.js";

import { requirePermissions } from "../roles-permissions/rbac.middleware.js";

import {
  assignEnquiryHandler,
  closeEnquiryHandler,
  createAdminEnquiryHandler,
  getEnquiryHandler,
  listAssignableStaffHandler,
  listEnquiriesHandler,
  listEnquiryPropertyOptionsHandler,
  updateEnquiryHandler,
} from "./enquiry.controller.js";

import {
  assignEnquirySchema,
  closeEnquirySchema,
  createAdminEnquirySchema,
  enquiryIdParamSchema,
  listEnquiriesSchema,
  listEnquiryPropertyOptionsSchema,
  updateEnquirySchema,
} from "./enquiry.validator.js";

export const createEnquiryRouter = (env) => {
  const router = Router();

  const requireStaff = authenticateStaff(env);

  const requireEnquiryView = requirePermissions(
    PERMISSIONS.ENQUIRY_VIEW,
  );

  const requireEnquiryUpdate = requirePermissions(
    PERMISSIONS.ENQUIRY_UPDATE,
  );

  const requireEnquiryAssign = requirePermissions(
    PERMISSIONS.ENQUIRY_ASSIGN,
  );

  const requireEnquiryClose = requirePermissions(
    PERMISSIONS.ENQUIRY_CLOSE,
  );

  router.use(requireStaff);

  router.get(
    "/",
    requireEnquiryView,
    validateRequest(listEnquiriesSchema),
    listEnquiriesHandler,
  );

  router.post(
    "/",
    requireEnquiryUpdate,
    validateRequest(createAdminEnquirySchema),
    createAdminEnquiryHandler,
  );

  router.get(
    "/assignees",
    requireEnquiryAssign,
    listAssignableStaffHandler,
  );

  router.get(
    "/property-options",
    requireEnquiryUpdate,
    validateRequest(listEnquiryPropertyOptionsSchema),
    listEnquiryPropertyOptionsHandler,
  );

  router.get(
    "/:enquiryId",
    requireEnquiryView,
    validateRequest(enquiryIdParamSchema),
    getEnquiryHandler,
  );

  router.patch(
    "/:enquiryId",
    requireEnquiryUpdate,
    validateRequest(updateEnquirySchema),
    updateEnquiryHandler,
  );

  router.patch(
    "/:enquiryId/assign",
    requireEnquiryAssign,
    validateRequest(assignEnquirySchema),
    assignEnquiryHandler,
  );

  router.post(
    "/:enquiryId/close",
    requireEnquiryClose,
    validateRequest(closeEnquirySchema),
    closeEnquiryHandler,
  );

  return router;
};