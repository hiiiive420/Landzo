import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";

import { createPublicEnquiryHandler } from "./enquiry.controller.js";
import { createPublicEnquirySchema } from "./enquiry.validator.js";

export const createPublicEnquiryRouter = () => {
  const router = Router();

  router.post(
    "/",
    validateRequest(createPublicEnquirySchema),
    createPublicEnquiryHandler,
  );

  return router;
};