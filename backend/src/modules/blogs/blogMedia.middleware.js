import multer from "multer";

import { AppError } from "../../common/errors/AppError.js";

import {
  BLOG_IMAGE_ALLOWED_MIME_TYPES,
  BLOG_IMAGE_ERROR_CODES,
  BLOG_IMAGE_MAX_FILE_SIZE_BYTES,
} from "./blog.constants.js";

const storage = multer.memoryStorage();

const fileFilter = (_req, file, callback) => {
  if (
    !BLOG_IMAGE_ALLOWED_MIME_TYPES.includes(
      file.mimetype,
    )
  ) {
    callback(
      new AppError(
        415,
        "Unsupported blog image type",
        BLOG_IMAGE_ERROR_CODES.UNSUPPORTED_TYPE,
      ),
    );

    return;
  }

  callback(null, true);
};

const createSingleImageUpload = (fieldName) =>
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize: BLOG_IMAGE_MAX_FILE_SIZE_BYTES,
      files: 1,
    },
  }).single(fieldName);

export const uploadBlogFeaturedImageMiddleware =
  createSingleImageUpload("featuredImage");

export const uploadBlogEditorImageMiddleware =
  createSingleImageUpload("image");