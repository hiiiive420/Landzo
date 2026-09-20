import crypto from "node:crypto";

const safeIncomingRequestIdPattern = /^[A-Za-z0-9._:-]{8,128}$/;

const getRequestId = (incomingRequestId) => {
  if (
    typeof incomingRequestId === "string" &&
    safeIncomingRequestIdPattern.test(incomingRequestId)
  ) {
    return incomingRequestId;
  }

  return crypto.randomUUID();
};

export const requestId = (req, res, next) => {
  const id = getRequestId(req.get("X-Request-Id"));

  req.id = id;
  res.setHeader("X-Request-Id", id);

  next();
};
