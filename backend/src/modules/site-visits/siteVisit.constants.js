export const SITE_VISIT_STATUSES = Object.freeze({
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
});

export const SITE_VISIT_STATUS_VALUES = Object.freeze(
  Object.values(SITE_VISIT_STATUSES),
);

export const SITE_VISIT_TERMINAL_STATUSES = Object.freeze([
  SITE_VISIT_STATUSES.COMPLETED,
  SITE_VISIT_STATUSES.CANCELLED,
  SITE_VISIT_STATUSES.NO_SHOW,
]);

export const SITE_VISIT_VISITOR_SOURCES = Object.freeze({
  MANUAL: "manual",
  CUSTOMER: "customer",
  ENQUIRY: "enquiry",
});

export const SITE_VISIT_VISITOR_SOURCE_VALUES = Object.freeze(
  Object.values(SITE_VISIT_VISITOR_SOURCES),
);