const serializeStaffReference = (user) => {
  if (!user) {
    return null;
  }

  if (!user.fullName) {
    return { id: user.toString() };
  }

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
};

const serializeEnquiryReference = (enquiry) => {
  if (!enquiry) {
    return null;
  }

  if (!enquiry.fullName) {
    return { id: enquiry.toString() };
  }

  return {
    id: enquiry._id.toString(),
    fullName: enquiry.fullName,
    email: enquiry.email ?? null,
    phone: enquiry.phone ?? null,
    status: enquiry.status,
    property: enquiry.property
      ? {
          id: enquiry.property._id?.toString?.() ?? enquiry.property.toString(),
          code: enquiry.property.code,
          title: enquiry.property.title,
        }
      : null,
  };
};

export const serializeCustomer = (customer) => ({
  id: customer._id.toString(),
  fullName: customer.fullName,
  email: customer.email ?? null,
  phone: customer.phone ?? null,
  type: customer.type,
  status: customer.status,
  sourceEnquiry: serializeEnquiryReference(customer.sourceEnquiry),
  assignedTo: serializeStaffReference(customer.assignedTo),
  notes: customer.notes ?? null,
  createdAt: customer.createdAt?.toISOString?.() ?? null,
  updatedAt: customer.updatedAt?.toISOString?.() ?? null,
});

export const serializeCustomerListItem = (customer) => ({
  id: customer._id.toString(),
  fullName: customer.fullName,
  email: customer.email ?? null,
  phone: customer.phone ?? null,
  type: customer.type,
  status: customer.status,
  sourceEnquiry: serializeEnquiryReference(customer.sourceEnquiry),
  assignedTo: serializeStaffReference(customer.assignedTo),
  updatedAt: customer.updatedAt?.toISOString?.() ?? null,
});

export const serializeCustomerOption = (customer) => ({
  id: customer._id.toString(),
  fullName: customer.fullName,
  email: customer.email ?? null,
  phone: customer.phone ?? null,
  type: customer.type,
  status: customer.status,
});