import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { listPublicLocationsHandler } from "./location.controller.js";
import { publicListLocationsSchema } from "./location.validator.js";

export const createPublicLocationRouter = () => {
  const router = Router();

  router.get("/", validateRequest(publicListLocationsSchema), listPublicLocationsHandler);

  return router;
};
