import multer from "multer";

import { AppError } from "../../common/errors/AppError.js";

import {
  PRIVATE_DOCUMENT_ALLOWED_MIME_TYPES,
  PRIVATE_DOCUMENT_ERROR_CODES,
  PRIVATE_DOCUMENT_LIMITS,
} from "./privateDocument.constants.js";

const storage = multer.memoryStorage();

const fileFilter = (
  _req,
  file,
  callback,
) => {
  if (
    !PRIVATE_DOCUMENT_ALLOWED_MIME_TYPES.includes(
      file.mimetype,
    )
  ) {
    callback(
      new AppError(
        415,
        "Unsupported private document type",
        PRIVATE_DOCUMENT_ERROR_CODES.UNSUPPORTED_TYPE,
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
    fileSize:
      PRIVATE_DOCUMENT_LIMITS.maxFileSizeBytes,

    files: 1,
  },
});

export const uploadPrivateDocumentMiddleware =
  upload.single("file");