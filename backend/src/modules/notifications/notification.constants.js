export const NOTIFICATION_TYPES = Object.freeze({
  ENQUIRY_NEW: "enquiry.new",
  ENQUIRY_ASSIGNED: "enquiry.assigned",
  SITE_VISIT_ASSIGNED: "site_visit.assigned",
  SITE_VISIT_UPDATED: "site_visit.updated",
});

export const NOTIFICATION_TYPE_VALUES = Object.freeze(Object.values(NOTIFICATION_TYPES));

export const NOTIFICATION_ENTITY_TYPES = Object.freeze({
  ENQUIRY: "enquiry",
  SITE_VISIT: "site_visit",
});

export const NOTIFICATION_ENTITY_TYPE_VALUES = Object.freeze(
  Object.values(NOTIFICATION_ENTITY_TYPES),
);

export const NOTIFICATION_STATUSES = Object.freeze({
  ALL: "all",
  UNREAD: "unread",
  READ: "read",
});

export const NOTIFICATION_STATUS_VALUES = Object.freeze(Object.values(NOTIFICATION_STATUSES));

export const NOTIFICATION_LIMITS = Object.freeze({
  titleMaxLength: 120,
  messageMaxLength: 240,
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
});