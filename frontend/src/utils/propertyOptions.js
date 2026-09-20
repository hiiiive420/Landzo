export const permissions = Object.freeze({
  propertyCreate: "property.create",
  propertyView: "property.view",
  propertyEdit: "property.edit",
  propertyPublish: "property.publish",
  propertyArchive: "property.archive",
  propertyDelete: "property.delete",
  userManage: "user.manage",
  roleManage: "role.manage",
  settingsManage: "settings.manage",
  mediaView: "media.view",
  privateDocumentView: "privateDocument.view",
  privateDocumentManage: "privateDocument.manage",
  analyticsView: "analytics.view",
  auditView: "audit.view"
,
  locationView: "location.view",
  locationManage: "location.manage",
  enquiryView: "enquiry.view",
  enquiryUpdate: "enquiry.update",
  enquiryAssign: "enquiry.assign",
  enquiryClose: "enquiry.close",
  siteVisitView: "siteVisit.view",
  siteVisitManage: "siteVisit.manage",
  customerView: "customer.view",
  customerManage: "customer.manage",
  blogCreate: "blog.create",
blogEdit: "blog.edit",
blogPublish: "blog.publish",
blogDelete: "blog.delete"
,homepageView: "homepage.view",
homepageEdit: "homepage.edit"
});

export const propertyTypes = [
  { value: "land", label: "Land" },
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "commercial", label: "Commercial" },
];

export const transactionTypes = [
  { value: "sale", label: "Sale" },
  { value: "rent", label: "Rent" },
  { value: "lease", label: "Lease" },
];

export const propertyStatuses = [
  { value: "draft", label: "Draft" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "rented", label: "Rented" },
  { value: "leased", label: "Leased" },
  { value: "unavailable", label: "Unavailable" },
  { value: "archived", label: "Archived" },
];

export const currencies = [
  { value: "LKR", label: "LKR" },
  { value: "USD", label: "USD" },
];

export const priceModes = [
  { value: "fixed", label: "Fixed" },
  { value: "negotiable", label: "Negotiable" },
  { value: "price_on_request", label: "Price on request" },
];

export const rentPeriods = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export const leasePeriods = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "total", label: "Total Lease" },
];

export const landSizeUnits = [
  { value: "perch", label: "Perch" },
  { value: "acre", label: "Acre" },
  { value: "squareFeet", label: "Square feet" },
];

export const buildingSizeUnits = [{ value: "squareFeet", label: "Square feet" }];

export const landTypes = [
  { value: "bare_land", label: "Bare land" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "agricultural", label: "Agricultural" },
];

export const landUtilities = [
  { value: "water", label: "Water" },
  { value: "electricity", label: "Electricity" },
  { value: "road", label: "Road" },
];

export const furnishedStatuses = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi furnished" },
  { value: "furnished", label: "Furnished" },
];

export const commercialTypes = [
  { value: "office", label: "Office" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse" },
  { value: "mixed_use", label: "Mixed use" },
  { value: "other", label: "Other" },
];



