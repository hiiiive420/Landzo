import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";

import { authenticateStaff } from "../auth/auth.middleware.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { requirePermissions } from "../roles-permissions/rbac.middleware.js";

import {
  accessPrivateDocumentHandler,
  createPrivateDocumentHandler,
  deletePrivateDocumentHandler,
  getPrivateDocumentHandler,
  listPrivateDocumentsHandler,
  replacePrivateDocumentFileHandler,
  updatePrivateDocumentMetadataHandler,
} from "./privateDocument.controller.js";
import { uploadPrivateDocumentMiddleware } from "./privateDocument.middleware.js";
import {
  accessPrivateDocumentSchema,
  deletePrivateDocumentSchema,
  getPrivateDocumentSchema,
  listPrivateDocumentsSchema,
  replacePrivateDocumentSchema,
  updatePrivateDocumentMetadataSchema,
  uploadPrivateDocumentSchema,
} from "./privateDocument.validator.js";

export const createPrivateDocumentRouter = (env) => {
  const router = Router();

  const requireStaff = authenticateStaff(env);
  const requirePrivateDocumentView = requirePermissions(PERMISSIONS.PRIVATE_DOCUMENT_VIEW);
  const requirePrivateDocumentManage = requirePermissions(PERMISSIONS.PRIVATE_DOCUMENT_MANAGE);

  router.use(requireStaff);

  router.post(
    "/",
    requirePrivateDocumentManage,
    uploadPrivateDocumentMiddleware,
    validateRequest(uploadPrivateDocumentSchema),
    createPrivateDocumentHandler(env),
  );

  router.get(
    "/",
    requirePrivateDocumentView,
    validateRequest(listPrivateDocumentsSchema),
    listPrivateDocumentsHandler,
  );

  router.get(
    "/:documentId/access",
    requirePrivateDocumentView,
    validateRequest(accessPrivateDocumentSchema),
    accessPrivateDocumentHandler(env),
  );

  router.patch(
    "/:documentId",
    requirePrivateDocumentManage,
    validateRequest(updatePrivateDocumentMetadataSchema),
    updatePrivateDocumentMetadataHandler,
  );
  router.post(
    "/:documentId/file",
    requirePrivateDocumentManage,
    uploadPrivateDocumentMiddleware,
    validateRequest(replacePrivateDocumentSchema),
    replacePrivateDocumentFileHandler(env),
  );

  router.delete(
    "/:documentId",
    requirePrivateDocumentManage,
    validateRequest(deletePrivateDocumentSchema),
    deletePrivateDocumentHandler(env),
  );

  router.get(
    "/:documentId",
    requirePrivateDocumentView,
    validateRequest(getPrivateDocumentSchema),
    getPrivateDocumentHandler,
  );

  return router;
};