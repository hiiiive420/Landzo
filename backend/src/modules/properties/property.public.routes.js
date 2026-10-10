import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";

import {
  getPublicPropertyHandler,
  listPublicExploreMapPropertiesHandler,
  listPublicPropertyLocationSuggestionsHandler,
  listPublicPropertiesHandler,
} from "./property.controller.js";
import {
  getPublicPropertySchema,
  listPublicExploreMapPropertiesSchema,
  publicPropertyLocationSuggestionsSchema,
  listPublicPropertiesSchema,
} from "./property.validator.js";

export const createPublicPropertyRouter = () => {
  const router = Router();

  router.get(
    "/",
    validateRequest(listPublicPropertiesSchema),
    listPublicPropertiesHandler,
  );

  router.get(
    "/location-suggestions",
    validateRequest(publicPropertyLocationSuggestionsSchema),
    listPublicPropertyLocationSuggestionsHandler,
  );

  router.get(
    "/explore-map",
    validateRequest(listPublicExploreMapPropertiesSchema),
    listPublicExploreMapPropertiesHandler,
  );

  router.get(
    "/:propertyCode",
    validateRequest(getPublicPropertySchema),
    getPublicPropertyHandler,
  );

  return router;
};