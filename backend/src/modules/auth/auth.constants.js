export const STAFF_ROLES = Object.freeze({
  OWNER: "owner",
  ADMIN: "admin",
  ENQUIRY_SUPPORT: "enquiry_support",
  CONTENT_MANAGER: "content_manager",
});

export const STAFF_STATUSES = Object.freeze({
  ACTIVE: "active",
  DISABLED: "disabled",
});

export const AUTH_ERROR_CODES = Object.freeze({
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_TEMPORARILY_LOCKED: "ACCOUNT_TEMPORARILY_LOCKED",
  INVALID_SESSION: "INVALID_SESSION",
  VALIDATION_ERROR: "VALIDATION_ERROR",
});

export const REFRESH_COOKIE_NAME = "landzo_refresh_token";

export const PASSWORD_POLICY = Object.freeze({
  minLength: 12,
  maxLength: 128,
});

export const LOGIN_PROTECTION = Object.freeze({
  maxFailedAttempts: 5,
  lockMinutes: 15,
});
