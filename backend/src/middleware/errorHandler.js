import { AppError } from "../common/errors/AppError.js";
import { errorResponse } from "../common/responses/apiResponse.js";
import { logger } from "../common/logging/logger.js";

const normalizeError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.code === "LIMIT_FILE_SIZE") {
    return new AppError(413, "Property image is too large", "PROPERTY_IMAGE_TOO_LARGE");
  }

  if (["LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"].includes(error?.code)) {
    return new AppError(
      400,
      "Too many property images in one request",
      "PROPERTY_IMAGE_REQUEST_LIMIT_EXCEEDED",
    );
  }

  if (error?.type === "entity.parse.failed") {
    return new AppError(400, "Invalid JSON payload", "INVALID_JSON");
  }

  if (error?.type === "entity.too.large") {
    return new AppError(413, "Request body is too large", "PAYLOAD_TOO_LARGE");
  }

  return new AppError(500, "Internal server error", "INTERNAL_SERVER_ERROR", undefined, {
    isOperational: false,
  });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalizedError = normalizeError(error);

  if (!normalizedError.isOperational) {
    logger.error("Unexpected application error", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      errorName: error?.name,
    });
  }

  res.status(normalizedError.statusCode).json(
    errorResponse({
      message: normalizedError.message,
      code: normalizedError.code,
      details: normalizedError.details,
    }),
  );
};
