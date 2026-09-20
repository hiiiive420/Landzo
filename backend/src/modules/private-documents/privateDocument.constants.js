export const PRIVATE_DOCUMENT_CATEGORIES = Object.freeze({
  PROPERTY: "property",
  CUSTOMER: "customer",
  ENQUIRY: "enquiry",
  SITE_VISIT: "site_visit",
  GENERAL: "general",
});

export const PRIVATE_DOCUMENT_CATEGORY_VALUES = Object.freeze(
  Object.values(PRIVATE_DOCUMENT_CATEGORIES),
);

export const PRIVATE_DOCUMENT_STATUSES = Object.freeze({
  ACTIVE: "active",
  DELETED: "deleted",
});

export const PRIVATE_DOCUMENT_STATUS_VALUES = Object.freeze(
  Object.values(PRIVATE_DOCUMENT_STATUSES),
);

export const PRIVATE_DOCUMENT_ALLOWED_MIME_TYPES = Object.freeze([
  "application/pdf",

  "image/jpeg",
  "image/png",
  "image/webp",

  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const PRIVATE_DOCUMENT_LIMITS = Object.freeze({
  maxFileSizeBytes: 20 * 1024 * 1024,
  titleMaxLength: 180,
  descriptionMaxLength: 1000,
  originalFilenameMaxLength: 255,
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
  searchMaxLength: 120,
  accessUrlExpiresInSeconds: 300,
});

export const PRIVATE_DOCUMENT_ERROR_CODES = Object.freeze({
  UNSUPPORTED_TYPE: "PRIVATE_DOCUMENT_UNSUPPORTED_TYPE",
  FILE_REQUIRED: "PRIVATE_DOCUMENT_FILE_REQUIRED",
  STORAGE_NOT_CONFIGURED: "PRIVATE_DOCUMENT_STORAGE_NOT_CONFIGURED",
  UPLOAD_FAILED: "PRIVATE_DOCUMENT_UPLOAD_FAILED",
  ACCESS_URL_FAILED: "PRIVATE_DOCUMENT_ACCESS_URL_FAILED",
  DELETE_FAILED: "PRIVATE_DOCUMENT_DELETE_FAILED",
});

export const PRIVATE_DOCUMENT_FORMAT_BY_MIME_TYPE = Object.freeze({
  "application/pdf": "pdf",

  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",

  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",

  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
});