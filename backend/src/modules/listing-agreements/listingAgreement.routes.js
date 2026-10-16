import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";
import {
  getListingAgreementByIdHandler,
  listListingAgreementsHandler,
} from "./listingAgreement.controller.js";
import {
  listingAgreementIdParamsSchema,
  listListingAgreementsSchema,
} from "./listingAgreement.validator.js";

export const createListingAgreementRouter = (env) => {
  const router = Router();
  const requireAgreementAccess = requirePermissions(
    PERMISSIONS.PROPERTY_VIEW,
    PERMISSIONS.PROPERTY_EDIT,
    PERMISSIONS.PROPERTY_VIEW_PRIVATE_DATA,
  );

  router.use(authenticateStaff(env), requireAgreementAccess);
  router.get("/", validateRequest(listListingAgreementsSchema), listListingAgreementsHandler);
  router.get(
    "/:propertyId/:agreementId",
    validateRequest(listingAgreementIdParamsSchema),
    getListingAgreementByIdHandler,
  );

  return router;
};
