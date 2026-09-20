import multer from "multer";

import { AppError } from "../../common/errors/AppError.js";
import {
  PROPERTY_IMAGE_ALLOWED_MIME_TYPES,
  PROPERTY_IMAGE_ERROR_CODES,
  PROPERTY_IMAGE_MAX_FILE_SIZE_BYTES,
  PROPERTY_IMAGE_MAX_UPLOAD_FILES,
} from "./property.constants.js";

const storage = multer.memoryStorage();

const fileFilter = (_req, file, callback) => {
  if (!PROPERTY_IMAGE_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new AppError(
        415,
        "Unsupported property image type",
        PROPERTY_IMAGE_ERROR_CODES.UNSUPPORTED_TYPE,
      ),
    );
    return;
  }

  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: PROPERTY_IMAGE_MAX_FILE_SIZE_BYTES,
    files: PROPERTY_IMAGE_MAX_UPLOAD_FILES,
  },
});

export const uploadPropertyImagesMiddleware = upload.array(
  "images",
  PROPERTY_IMAGE_MAX_UPLOAD_FILES,
);
