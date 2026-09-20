export const enquiryStatuses = Object.freeze({
  new: "new",
  inProgress: "in_progress",
  closed: "closed",
});

export const enquiryStatusOptions = Object.freeze([
  {
    value: enquiryStatuses.new,
    label: "New",
  },
  {
    value: enquiryStatuses.inProgress,
    label: "In Progress",
  },
  {
    value: enquiryStatuses.closed,
    label: "Closed",
  },
]);

export const enquirySources = Object.freeze({
  website: "website",
  property: "property",
  admin: "admin",
});

export const enquirySourceOptions = Object.freeze([
  {
    value: enquirySources.website,
    label: "Website",
  },
  {
    value: enquirySources.property,
    label: "Property",
  },
  {
    value: enquirySources.admin,
    label: "Admin",
  },
]);

export const getEnquiryStatusLabel = (status) =>
  enquiryStatusOptions.find(
    (option) => option.value === status,
  )?.label ?? status;

export const getEnquirySourceLabel = (source) =>
  enquirySourceOptions.find(
    (option) => option.value === source,
  )?.label ?? source;