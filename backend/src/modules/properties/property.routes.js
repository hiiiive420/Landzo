import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { PROPERTY_STATUSES } from "./property.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";
import {
  createPropertyHandler,
  duplicatePropertyHandler,
  getPropertyHandler,
  listPropertiesHandler,
  listTrashedPropertiesHandler,
  publishPropertyHandler,
  restorePropertyHandler,
  trashPropertyHandler,
  unpublishPropertyHandler,
  unarchivePropertyHandler,
  updatePropertyExploreMapHandler,
  updatePropertyFeaturedHandler,
  updatePropertyHandler,
  updatePropertyStatusHandler,
} from "./property.controller.js";
import {
  deletePropertyImageHandler,
  reorderPropertyImagesHandler,
  setPropertyImageCoverHandler,
  uploadPropertyImagesHandler,
} from "./propertyMedia.controller.js";
import { uploadPropertyImagesMiddleware } from "./propertyMedia.middleware.js";
import {
  createAdminPropertySchema,
  deletePropertyImageSchema,
  duplicateAdminPropertySchema,
  listAdminPropertiesSchema,
  listTrashedAdminPropertiesSchema,
  propertyIdParamSchema,
  publishPropertySchema,
  restorePropertySchema,
  reorderPropertyImagesSchema,
  trashPropertySchema,
  setPropertyImageCoverSchema,
  unpublishPropertySchema,
  unarchivePropertySchema,
  updateAdminPropertySchema,
  updatePropertyExploreMapSchema,
  updatePropertyFeaturedSchema,
  updatePropertyStatusSchema,
  uploadPropertyImagesSchema,
} from "./property.validator.js";

export const createPropertyRouter = (env) => {
  const router = Router();
  const requireStaff = authenticateStaff(env);
  const requirePropertyCreate = requirePermissions(PERMISSIONS.PROPERTY_CREATE);
  const requirePropertyView = requirePermissions(PERMISSIONS.PROPERTY_VIEW);
  const requirePropertyEdit = requirePermissions(PERMISSIONS.PROPERTY_EDIT);
  const requirePropertyPublish = requirePermissions(PERMISSIONS.PROPERTY_PUBLISH);
  const requirePropertyArchive = requirePermissions(PERMISSIONS.PROPERTY_ARCHIVE);
  const requirePropertyDelete = requirePermissions(PERMISSIONS.PROPERTY_DELETE);
  const requirePropertyStatusPermission = (req, res, next) => {
    const middleware =
      req.validated.body.status === PROPERTY_STATUSES.ARCHIVED
        ? requirePropertyArchive
        : requirePropertyEdit;
    return middleware(req, res, next);
  };

  router.use(requireStaff);

  router.post(
    "/",
    requirePropertyCreate,
    validateRequest(createAdminPropertySchema),
    createPropertyHandler,
  );
  router.get(
    "/",
    requirePropertyView,
    validateRequest(listAdminPropertiesSchema),
    listPropertiesHandler,
  );
  router.get(
    "/trash",
    requirePropertyView,
    validateRequest(listTrashedAdminPropertiesSchema),
    listTrashedPropertiesHandler,
  );
  router.post(
    "/:propertyId/trash",
    requirePropertyDelete,
    validateRequest(trashPropertySchema),
    trashPropertyHandler,
  );
  router.post(
    "/:propertyId/restore",
    requirePropertyDelete,
    validateRequest(restorePropertySchema),
    restorePropertyHandler,
  );
  router.post(
    "/:propertyId/unarchive",
    requirePropertyArchive,
    validateRequest(unarchivePropertySchema),
    unarchivePropertyHandler,
  );
  router.post(
    "/:propertyId/publish",
    requirePropertyPublish,
    validateRequest(publishPropertySchema),
    publishPropertyHandler,
  );
  router.post(
    "/:propertyId/unpublish",
    requirePropertyPublish,
    validateRequest(unpublishPropertySchema),
    unpublishPropertyHandler,
  );
  router.patch(
    "/:propertyId/featured",
    requirePropertyPublish,
    validateRequest(updatePropertyFeaturedSchema),
    updatePropertyFeaturedHandler,
  );
  router.patch(
    "/:propertyId/explore-map",
    requirePropertyPublish,
    validateRequest(updatePropertyExploreMapSchema),
    updatePropertyExploreMapHandler,
  );
  router.patch(
    "/:propertyId/status",
    validateRequest(updatePropertyStatusSchema),
    requirePropertyStatusPermission,
    updatePropertyStatusHandler,
  );
  router.post(
    "/:propertyId/media",
    requirePropertyEdit,
    validateRequest(uploadPropertyImagesSchema),
    uploadPropertyImagesMiddleware,
    uploadPropertyImagesHandler(env),
  );
  router.patch(
    "/:propertyId/media/reorder",
    requirePropertyEdit,
    validateRequest(reorderPropertyImagesSchema),
    reorderPropertyImagesHandler,
  );
  router.patch(
    "/:propertyId/media/:imageId/cover",
    requirePropertyEdit,
    validateRequest(setPropertyImageCoverSchema),
    setPropertyImageCoverHandler,
  );
  router.delete(
    "/:propertyId/media/:imageId",
    requirePropertyEdit,
    validateRequest(deletePropertyImageSchema),
    deletePropertyImageHandler(env),
  );
  router.get(
    "/:propertyId",
    requirePropertyView,
    validateRequest(propertyIdParamSchema),
    getPropertyHandler,
  );
  router.patch(
    "/:propertyId",
    requirePropertyEdit,
    validateRequest(updateAdminPropertySchema),
    updatePropertyHandler,
  );
  router.post(
    "/:propertyId/duplicate",
    requirePropertyCreate,
    validateRequest(duplicateAdminPropertySchema),
    duplicatePropertyHandler,
  );

  return router;
};




