import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";
import {
  createCustomerFromEnquiryHandler,
  createCustomerHandler,
  getCustomerHandler,
  listCustomerAssigneesHandler,
  listCustomerOptionsHandler,
  listCustomersHandler,
  updateCustomerHandler,
  getCustomerByEnquiryHandler
} from "./customer.controller.js";
import {
  createCustomerFromEnquirySchema,
  createCustomerSchema,
  customerIdParamSchema,
  enquiryIdParamSchema,
  listCustomerOptionsSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from "./customer.validator.js";

export const createCustomerRouter = (env) => {
  const router = Router();
  const requireStaff = authenticateStaff(env);
  const requireCustomerView = requirePermissions(PERMISSIONS.CUSTOMER_VIEW);
  const requireCustomerManage = requirePermissions(PERMISSIONS.CUSTOMER_MANAGE);

  router.use(requireStaff);
router.get(
  "/by-enquiry/:enquiryId",
  requireCustomerView,
  validateRequest(enquiryIdParamSchema),
  getCustomerByEnquiryHandler,
);
  router.get("/", requireCustomerView, validateRequest(listCustomersSchema), listCustomersHandler);
  router.get("/assignees", requireCustomerManage, listCustomerAssigneesHandler);
  router.get("/options", requireCustomerManage, validateRequest(listCustomerOptionsSchema), listCustomerOptionsHandler);
  router.post(
    "/from-enquiry/:enquiryId",
    requireCustomerManage,
    validateRequest(createCustomerFromEnquirySchema),
    createCustomerFromEnquiryHandler,
  );
  router.get("/:customerId", requireCustomerView, validateRequest(customerIdParamSchema), getCustomerHandler);
  router.post("/", requireCustomerManage, validateRequest(createCustomerSchema), createCustomerHandler);
  router.patch("/:customerId", requireCustomerManage, validateRequest(updateCustomerSchema), updateCustomerHandler);

  return router;
};