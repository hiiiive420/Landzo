export class AppError extends Error {
  constructor(statusCode, message, code, details, options = {}) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = options.isOperational ?? true;

    Error.captureStackTrace?.(this, this.constructor);
  }
}
