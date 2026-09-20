import { AppError } from "../../common/errors/AppError.js";

import cloudinary, { configureCloudinary } from "../../config/cloudinary.js";

import {
  PRIVATE_DOCUMENT_ERROR_CODES,
  PRIVATE_DOCUMENT_FORMAT_BY_MIME_TYPE,
} from "./privateDocument.constants.js";

const cloudinaryUnavailable = () =>
  new AppError(
    503,
    "Private document storage is not configured",
    PRIVATE_DOCUMENT_ERROR_CODES.STORAGE_NOT_CONFIGURED,
  );

const uploadFailed = () =>
  new AppError(
    502,
    "Private document upload failed",
    PRIVATE_DOCUMENT_ERROR_CODES.UPLOAD_FAILED,
  );

const deleteFailed = () =>
  new AppError(
    502,
    "Private document deletion failed",
    PRIVATE_DOCUMENT_ERROR_CODES.DELETE_FAILED,
  );

const accessUrlFailed = () =>
  new AppError(
    502,
    "Private document access could not be generated",
    PRIVATE_DOCUMENT_ERROR_CODES.ACCESS_URL_FAILED,
  );

const uploadBuffer = ({ buffer, folder, originalFilename }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        type: "authenticated",
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        context: originalFilename
          ? {
              original_filename: originalFilename,
            }
          : undefined,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });

export const uploadPrivateDocumentToCloudinary = async ({ env, file, folder }) => {
  if (!configureCloudinary(env)) {
    throw cloudinaryUnavailable();
  }

  try {
    const result = await uploadBuffer({
      buffer: file.buffer,
      folder,
      originalFilename: file.originalname,
    });

    return {
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format ?? PRIVATE_DOCUMENT_FORMAT_BY_MIME_TYPE[file.mimetype],
      bytes: result.bytes,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
    };
  } catch {
    throw uploadFailed();
  }
};

export const deletePrivateDocumentFromCloudinary = async ({
  env,
  publicId,
  resourceType,
}) => {
  if (!configureCloudinary(env)) {
    throw cloudinaryUnavailable();
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: "authenticated",
      invalidate: true,
    });

    if (!["ok", "not found"].includes(result?.result)) {
      throw deleteFailed();
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw deleteFailed();
  }
};

export const createPrivateDocumentAccessUrl = ({
  env,
  publicId,
  resourceType,
  format,
  attachment = false,
  expiresInSeconds,
}) => {
  if (!configureCloudinary(env)) {
    throw cloudinaryUnavailable();
  }

  try {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: "authenticated",
      expires_at: expiresAt,
      attachment,
    });
  } catch {
    throw accessUrlFailed();
  }
};