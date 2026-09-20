export const PERMISSIONS = Object.freeze({
  PROPERTY_CREATE: "property.create",
  PROPERTY_VIEW: "property.view",
  PROPERTY_EDIT: "property.edit",
  PROPERTY_PUBLISH: "property.publish",
  PROPERTY_ARCHIVE: "property.archive",
  PROPERTY_DELETE: "property.delete",
  PROPERTY_VIEW_PRIVATE_DATA: "property.viewPrivateData",

  ENQUIRY_VIEW: "enquiry.view",
  ENQUIRY_UPDATE: "enquiry.update",
  ENQUIRY_ASSIGN: "enquiry.assign",
  ENQUIRY_CLOSE: "enquiry.close",

  SITE_VISIT_VIEW: "siteVisit.view",
  SITE_VISIT_MANAGE: "siteVisit.manage",

  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_MANAGE: "customer.manage",

  BLOG_CREATE: "blog.create",
  BLOG_EDIT: "blog.edit",
  BLOG_PUBLISH: "blog.publish",
  BLOG_DELETE: "blog.delete",

  HOMEPAGE_VIEW: "homepage.view",
  HOMEPAGE_EDIT: "homepage.edit",

MEDIA_VIEW: "media.view",

PRIVATE_DOCUMENT_VIEW: "privateDocument.view",
PRIVATE_DOCUMENT_MANAGE: "privateDocument.manage",

LOCATION_VIEW: "location.view",
  LOCATION_MANAGE: "location.manage",

  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",
  SETTINGS_MANAGE: "settings.manage",

ANALYTICS_VIEW: "analytics.view",

AUDIT_VIEW: "audit.view",
});

export const PERMISSION_VALUES = Object.freeze(
  Object.values(PERMISSIONS),
);

export const PERMISSION_CATALOG = Object.freeze({
  properties: Object.freeze([
    PERMISSIONS.PROPERTY_CREATE,
    PERMISSIONS.PROPERTY_VIEW,
    PERMISSIONS.PROPERTY_EDIT,
    PERMISSIONS.PROPERTY_PUBLISH,
    PERMISSIONS.PROPERTY_ARCHIVE,
    PERMISSIONS.PROPERTY_DELETE,
    PERMISSIONS.PROPERTY_VIEW_PRIVATE_DATA,
  ]),

  enquiries: Object.freeze([
    PERMISSIONS.ENQUIRY_VIEW,
    PERMISSIONS.ENQUIRY_UPDATE,
    PERMISSIONS.ENQUIRY_ASSIGN,
    PERMISSIONS.ENQUIRY_CLOSE,
  ]),

  siteVisits: Object.freeze([
    PERMISSIONS.SITE_VISIT_VIEW,
    PERMISSIONS.SITE_VISIT_MANAGE,
  ]),

  customers: Object.freeze([
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_MANAGE,
  ]),

  blogs: Object.freeze([
    PERMISSIONS.BLOG_CREATE,
    PERMISSIONS.BLOG_EDIT,
    PERMISSIONS.BLOG_PUBLISH,
    PERMISSIONS.BLOG_DELETE,
  ]),

  homepage: Object.freeze([
    PERMISSIONS.HOMEPAGE_VIEW,
    PERMISSIONS.HOMEPAGE_EDIT,
  ]),

  media: Object.freeze([
    PERMISSIONS.MEDIA_VIEW,
  ]),

  locations: Object.freeze([
    PERMISSIONS.LOCATION_VIEW,
    PERMISSIONS.LOCATION_MANAGE,
  ]),

  administration: Object.freeze([
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
  ]),
  auditLogs: Object.freeze([
  PERMISSIONS.AUDIT_VIEW,
]),
privateDocuments: Object.freeze([
  PERMISSIONS.PRIVATE_DOCUMENT_VIEW,
  PERMISSIONS.PRIVATE_DOCUMENT_MANAGE,
]),
});

