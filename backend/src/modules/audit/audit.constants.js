export const AUDIT_ENTITY_TYPES = Object.freeze({
  PROPERTY: "property",
  BLOG: "blog",
  HOMEPAGE: "homepage",
  ENQUIRY: "enquiry",
  CUSTOMER: "customer",
  SITE_VISIT: "site_visit",
  USER: "user",
  ROLE: "role",
  LOCATION: "location",
  PRIVATE_DOCUMENT: "private_document",
  SETTINGS: "settings",
});

export const AUDIT_ENTITY_TYPE_VALUES = Object.freeze(
  Object.values(AUDIT_ENTITY_TYPES),
);

export const AUDIT_ACTIONS = Object.freeze({
  PROPERTY_CREATED: "property.created",
  PROPERTY_UPDATED: "property.updated",
  PROPERTY_PUBLISHED: "property.published",
  PROPERTY_UNPUBLISHED: "property.unpublished",
  PROPERTY_TRASHED: "property.trashed",
  PROPERTY_RESTORED: "property.restored",
  PROPERTY_FEATURED_CHANGED:
    "property.featured_changed",
  PROPERTY_EXPLORE_MAP_CHANGED:
    "property.explore_map_changed",
  PROPERTY_STATUS_CHANGED:
    "property.status_changed",

  BLOG_CREATED: "blog.created",
  BLOG_UPDATED: "blog.updated",
  BLOG_PUBLISHED: "blog.published",
  BLOG_UNPUBLISHED: "blog.unpublished",
  BLOG_TRASHED: "blog.trashed",

  HOMEPAGE_UPDATED: "homepage.updated",
  HOMEPAGE_MEDIA_CHANGED:
    "homepage.media_changed",

  ENQUIRY_CREATED: "enquiry.created",
  ENQUIRY_UPDATED: "enquiry.updated",
  ENQUIRY_ASSIGNED: "enquiry.assigned",
  ENQUIRY_CLOSED: "enquiry.closed",

  CUSTOMER_CREATED: "customer.created",
  CUSTOMER_UPDATED: "customer.updated",

  SITE_VISIT_CREATED: "site_visit.created",
  SITE_VISIT_UPDATED: "site_visit.updated",

  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_STATUS_CHANGED: "user.status_changed",
  USER_PASSWORD_RESET: "user.password_reset",

  ROLE_UPDATED: "role.updated",
  ROLE_PERMISSIONS_UPDATED: "role.permissions_updated",

  LOCATION_CREATED: "location.created",
  LOCATION_UPDATED: "location.updated",
  LOCATION_STATUS_CHANGED:
    "location.status_changed",

  PRIVATE_DOCUMENT_UPLOADED:
    "private_document.uploaded",
  PRIVATE_DOCUMENT_VIEWED:
    "private_document.viewed",
  PRIVATE_DOCUMENT_REPLACED:
    "private_document.replaced",
  PRIVATE_DOCUMENT_DELETED:
    "private_document.deleted",
  PRIVATE_DOCUMENT_UPDATED:
    "private_document.updated",

  SETTINGS_UPDATED: "settings.updated",
});

export const AUDIT_ACTION_VALUES = Object.freeze(
  Object.values(AUDIT_ACTIONS),
);

export const AUDIT_LIMITS = Object.freeze({
  defaultPage: 1,
  defaultLimit: 30,
  maxLimit: 100,
  searchMaxLength: 120,
  entityLabelMaxLength: 180,
});
