import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";

import { authenticateStaff } from "../auth/auth.middleware.js";

import { PERMISSIONS } from "../roles-permissions/permission.constants.js";

import {
  requireAnyPermissions,
  requirePermissions,
} from "../roles-permissions/rbac.middleware.js";

import {
  createBlogHandler,
  deleteBlogHandler,
  getAdminBlogHandler,
  getPublicBlogBySlugHandler,
  incrementBlogViewsHandler,
  listAdminBlogsHandler,
  listPublicBlogsHandler,
  publishBlogHandler,
  unpublishBlogHandler,
  updateBlogFeaturedHandler,
  updateBlogHandler,
  uploadBlogEditorImageHandler,
} from "./blog.controller.js";

import {
  uploadBlogEditorImageMiddleware,
  uploadBlogFeaturedImageMiddleware,
} from "./blogMedia.middleware.js";

import {
  blogIdParamSchema,
  blogSlugParamSchema,
  createBlogSchema,
  listAdminBlogsSchema,
  listPublicBlogsSchema,
  updateBlogFeaturedSchema,
  updateBlogSchema,
} from "./blog.validator.js";

export const createBlogRouter = (env) => {
  const router = Router();

  const requireStaff = authenticateStaff(env);

  const requireBlogCreate = requirePermissions(
    PERMISSIONS.BLOG_CREATE,
  );

  const requireBlogEdit = requirePermissions(
    PERMISSIONS.BLOG_EDIT,
  );

  const requireBlogPublish = requirePermissions(
    PERMISSIONS.BLOG_PUBLISH,
  );

  const requireBlogDelete = requirePermissions(
    PERMISSIONS.BLOG_DELETE,
  );

  const requireBlogRead = requireAnyPermissions(
    PERMISSIONS.BLOG_CREATE,
    PERMISSIONS.BLOG_EDIT,
    PERMISSIONS.BLOG_PUBLISH,
    PERMISSIONS.BLOG_DELETE,
  );

  const requireBlogEditorImageAccess =
    requireAnyPermissions(
      PERMISSIONS.BLOG_CREATE,
      PERMISSIONS.BLOG_EDIT,
    );

  router.use(requireStaff);

  router.get(
    "/",
    requireBlogRead,
    validateRequest(listAdminBlogsSchema),
    listAdminBlogsHandler,
  );

  router.post(
    "/",
    requireBlogCreate,
    uploadBlogFeaturedImageMiddleware,
    validateRequest(createBlogSchema),
    createBlogHandler(env),
  );

  /*
   * Keep this static route before /:blogId.
   */
  router.post(
    "/editor-image",
    requireBlogEditorImageAccess,
    uploadBlogEditorImageMiddleware,
    uploadBlogEditorImageHandler(env),
  );

  router.get(
    "/:blogId",
    requireBlogRead,
    validateRequest(blogIdParamSchema),
    getAdminBlogHandler,
  );

  router.patch(
    "/:blogId",
    requireBlogEdit,
    uploadBlogFeaturedImageMiddleware,
    validateRequest(updateBlogSchema),
    updateBlogHandler(env),
  );

  router.post(
    "/:blogId/publish",
    requireBlogPublish,
    validateRequest(blogIdParamSchema),
    publishBlogHandler,
  );

  router.post(
    "/:blogId/unpublish",
    requireBlogPublish,
    validateRequest(blogIdParamSchema),
    unpublishBlogHandler,
  );

  router.patch(
    "/:blogId/featured",
    requireBlogPublish,
    validateRequest(updateBlogFeaturedSchema),
    updateBlogFeaturedHandler,
  );

  router.delete(
    "/:blogId",
    requireBlogDelete,
    validateRequest(blogIdParamSchema),
    deleteBlogHandler,
  );

  return router;
};

export const createPublicBlogRouter = () => {
  const router = Router();

  router.get(
    "/",
    validateRequest(listPublicBlogsSchema),
    listPublicBlogsHandler,
  );

  router.patch(
    "/:blogId/view",
    validateRequest(blogIdParamSchema),
    incrementBlogViewsHandler,
  );

  router.get(
    "/:slug",
    validateRequest(blogSlugParamSchema),
    getPublicBlogBySlugHandler,
  );

  return router;
};