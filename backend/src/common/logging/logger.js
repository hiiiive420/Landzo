const sensitiveKeys = new Set([
  "authorization",
  "cookie",
  "cookies",
  "password",
  "token",
  "secret",
  "mongodb_uri",
  "mongouri",
  "uri",
]);

const shouldLog = (level) => process.env.NODE_ENV !== "test" || level === "error";

const sanitizeMeta = (meta = {}) =>
  Object.fromEntries(
    Object.entries(meta).filter(
      ([key]) => !sensitiveKeys.has(key.toLowerCase().replaceAll("_", "")),
    ),
  );

export const sanitizeErrorMessage = (error) => {
  const message = error?.message;

  if (!message) {
    return undefined;
  }

  return message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "[redacted-mongodb-uri]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/landzo_refresh_token=[^;\s]+/gi, "landzo_refresh_token=[redacted]")
    .replace(/(JWT_[A-Z_]*SECRET\s*=\s*)[^;\s]+/gi, "$1[redacted]");
};

const write = (level, message, meta) => {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeMeta(meta),
  };

  const output = JSON.stringify(payload);

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
};

export const logger = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
  debug: (message, meta) => write("debug", message, meta),
};
