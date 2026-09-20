export const ENQUIRY_STATUSES = Object.freeze({
  NEW: "new",
  IN_PROGRESS: "in_progress",
  CLOSED: "closed",
});

export const ENQUIRY_STATUS_VALUES = Object.freeze(
  Object.values(ENQUIRY_STATUSES),
);

export const ENQUIRY_SOURCES = Object.freeze({
  WEBSITE: "website",
  PROPERTY: "property",
  ADMIN: "admin",
});

export const ENQUIRY_SOURCE_VALUES = Object.freeze(
  Object.values(ENQUIRY_SOURCES),
);