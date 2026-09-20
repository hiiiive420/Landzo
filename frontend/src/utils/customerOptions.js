export const customerTypes = Object.freeze({
  lead: "lead",
  customer: "customer",
});

export const customerTypeOptions = Object.freeze([
  { value: customerTypes.lead, label: "Lead" },
  { value: customerTypes.customer, label: "Customer" },
]);

export const customerStatuses = Object.freeze({
  active: "active",
  inactive: "inactive",
});

export const customerStatusOptions = Object.freeze([
  { value: customerStatuses.active, label: "Active" },
  { value: customerStatuses.inactive, label: "Inactive" },
]);

export const getCustomerTypeLabel = (type) => customerTypeOptions.find((option) => option.value === type)?.label ?? type;
export const getCustomerStatusLabel = (status) => customerStatusOptions.find((option) => option.value === status)?.label ?? status;