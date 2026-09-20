import { successResponse } from "../../common/responses/apiResponse.js";

import {
  createBlog,
  deleteBlog,
  getAdminBlog,
  getPublicBlogBySlug,
  incrementBlogViews,
  listAdminBlogs,
  listPublicBlogs,
  publishBlog,
  unpublishBlog,
  updateBlog,
  updateBlogFeatured,
  uploadBlogEditorImage,
} from "./blog.service.js";

export const listAdminBlogsHandler = async (
  req,
  res,
  next,
) => {
  try {
    const result = await listAdminBlogs(
      req.validated.query,
    );

    res.status(200).json(
      successResponse({
        message: "Blogs retrieved",
        data: result.data,
        meta: result.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getAdminBlogHandler = async (
  req,
  res,
  next,
) => {
  try {
    const blog = await getAdminBlog(
      req.validated.params.blogId,
    );

    res.status(200).json(
      successResponse({
        message: "Blog retrieved",
        data: blog,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const createBlogHandler =
  (env) => async (req, res, next) => {
    try {
      const blog = await createBlog({
        env,
        actorUserId: req.auth.userId,
        input: req.validated.body,
        featuredImageFile: req.file ?? null,
      });

      res.status(201).json(
        successResponse({
          message: "Blog created",
          data: blog,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

export const updateBlogHandler =
  (env) => async (req, res, next) => {
    try {
      const blog = await updateBlog({
        env,
        actorUserId: req.auth.userId,
        blogId:
          req.validated.params.blogId,
        input: req.validated.body,
        featuredImageFile: req.file ?? null,
      });

      res.status(200).json(
        successResponse({
          message: "Blog updated",
          data: blog,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

export const publishBlogHandler = async (
  req,
  res,
  next,
) => {
  try {
    const blog = await publishBlog({
      actorUserId: req.auth.userId,
      blogId:
        req.validated.params.blogId,
    });

    res.status(200).json(
      successResponse({
        message: "Blog published",
        data: blog,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const unpublishBlogHandler = async (
  req,
  res,
  next,
) => {
  try {
    const blog = await unpublishBlog({
      actorUserId: req.auth.userId,
      blogId:
        req.validated.params.blogId,
    });

    res.status(200).json(
      successResponse({
        message: "Blog unpublished",
        data: blog,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updateBlogFeaturedHandler =
  async (req, res, next) => {
    try {
      const blog =
        await updateBlogFeatured({
          actorUserId:
            req.auth.userId,

          blogId:
            req.validated.params.blogId,

          featured:
            req.validated.body.featured,
        });

      res.status(200).json(
        successResponse({
          message:
            "Blog featured status updated",
          data: blog,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

export const deleteBlogHandler = async (
  req,
  res,
  next,
) => {
  try {
    const result = await deleteBlog({
      actorUserId: req.auth.userId,
      blogId:
        req.validated.params.blogId,
    });

    res.status(200).json(
      successResponse({
        message: "Blog deleted",
        data: result,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const uploadBlogEditorImageHandler =
  (env) => async (req, res, next) => {
    try {
      const image =
        await uploadBlogEditorImage({
          env,
          file: req.file,
        });

      res.status(201).json(
        successResponse({
          message:
            "Blog editor image uploaded",
          data: image,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

export const listPublicBlogsHandler = async (
  req,
  res,
  next,
) => {
  try {
    const result = await listPublicBlogs(
      req.validated.query,
    );

    res.status(200).json(
      successResponse({
        message:
          "Published blogs retrieved",

        data: result.data,

        meta: {
          ...result.meta,
          categories: result.categories,
          featuredBlog:
            result.featuredBlog,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getPublicBlogBySlugHandler =
  async (req, res, next) => {
    try {
      const blog =
        await getPublicBlogBySlug(
          req.validated.params.slug,
        );

      res.status(200).json(
        successResponse({
          message:
            "Published blog retrieved",
          data: blog,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

export const incrementBlogViewsHandler =
  async (req, res, next) => {
    try {
      const result =
        await incrementBlogViews(
          req.validated.params.blogId,
        );

      res.status(200).json(
        successResponse({
          message:
            "Blog view recorded",
          data: result,
        }),
      );
    } catch (error) {
      next(error);
    }
  };