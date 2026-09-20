export const staffRoles = Object.freeze({
  owner: "owner",
  admin: "admin",
  enquirySupport: "enquiry_support",
  contentManager: "content_manager",
});

export const staffStatuses = Object.freeze({
  active: "active",
  disabled: "disabled",
});

export const fallbackRoleOptions = [
  { value: staffRoles.owner, label: "Owner / Super Admin" },
  { value: staffRoles.admin, label: "Admin" },
  { value: staffRoles.enquirySupport, label: "Enquiry / Customer Support" },
  { value: staffRoles.contentManager, label: "Content / Blog Manager" },
];

export const staffStatusOptions = [
  { value: staffStatuses.active, label: "Active" },
  { value: staffStatuses.disabled, label: "Disabled" },
];

export const roleOptionsFromApi = (roles = []) =>
  roles.length
    ? roles.map((role) => ({ value: role.key, label: role.name || role.key }))
    : fallbackRoleOptions;
