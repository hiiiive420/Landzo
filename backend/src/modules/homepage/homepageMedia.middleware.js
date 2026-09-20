import multer from "multer";

import { AppError } from "../../common/errors/AppError.js";

import {
  HOMEPAGE_ALLOWED_IMAGE_MIME_TYPES,
  HOMEPAGE_IMAGE_LIMITS,
} from "./homepage.constants.js";

const storage = multer.memoryStorage();

const fileFilter = (
  req,
  file,
  callback,
) => {
  if (
    !HOMEPAGE_ALLOWED_IMAGE_MIME_TYPES.includes(
      file.mimetype,
    )
  ) {
    callback(
      new AppError(
        400,
        "Homepage image must be JPG, PNG, or WEBP",
        "HOMEPAGE_IMAGE_UNSUPPORTED_TYPE",
      ),
    );

    return;
  }

  callback(null, true);
};

const upload = multer({
  storage,

  limits: {
    fileSize:
      HOMEPAGE_IMAGE_LIMITS.maxBytes,
    files: 1,
  },

  fileFilter,
});

const singleHomepageImage =
  upload.single("image");

export const uploadHomepageImageMiddleware = (
  req,
  res,
  next,
) => {
  singleHomepageImage(
    req,
    res,
    (error) => {
      if (!error) {
        next();
        return;
      }

      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
      ) {
        next(
          new AppError(
            400,
            "Homepage image must not exceed 20 MB",
            "HOMEPAGE_IMAGE_TOO_LARGE",
          ),
        );

        return;
      }

      next(error);
    },
  );
};