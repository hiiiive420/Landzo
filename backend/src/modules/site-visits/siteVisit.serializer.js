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

const serializePropertyReference = (property) => {
  if (!property) {
    return null;
  }

  if (!property.code) {
    return { id: property.toString() };
  }

  return {
    id: property._id.toString(),
    code: property.code,
    title: property.title,
    type: property.type,
    status: property.status,
    displayAddress: property.displayAddress ?? null,
  };
};

const serializeCustomerReference = (customer) => {
  if (!customer) {
    return null;
  }

  if (!customer.fullName) {
    return { id: customer.toString() };
  }

  return {
    id: customer._id.toString(),
    fullName: customer.fullName,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    type: customer.type,
    status: customer.status,
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
  };
};

export const serializeSiteVisit = (siteVisit) => ({
  id: siteVisit._id.toString(),
  property: serializePropertyReference(siteVisit.property),
  customer: serializeCustomerReference(siteVisit.customer),
  enquiry: serializeEnquiryReference(siteVisit.enquiry),
  visitorName: siteVisit.visitorName,
  visitorEmail: siteVisit.visitorEmail ?? null,
  visitorPhone: siteVisit.visitorPhone ?? null,
  scheduledAt: siteVisit.scheduledAt?.toISOString?.() ?? null,
  status: siteVisit.status,
  assignedTo: serializeStaffReference(siteVisit.assignedTo),
  notes: siteVisit.notes ?? null,
  completionNote: siteVisit.completionNote ?? null,
  cancellationReason: siteVisit.cancellationReason ?? null,
  completedAt: siteVisit.completedAt?.toISOString?.() ?? null,
  cancelledAt: siteVisit.cancelledAt?.toISOString?.() ?? null,
  createdAt: siteVisit.createdAt?.toISOString?.() ?? null,
  updatedAt: siteVisit.updatedAt?.toISOString?.() ?? null,
});

export const serializeSiteVisitListItem = (siteVisit) => ({
  id: siteVisit._id.toString(),
  property: serializePropertyReference(siteVisit.property),
  customer: serializeCustomerReference(siteVisit.customer),
  visitorName: siteVisit.visitorName,
  visitorEmail: siteVisit.visitorEmail ?? null,
  visitorPhone: siteVisit.visitorPhone ?? null,
  scheduledAt: siteVisit.scheduledAt?.toISOString?.() ?? null,
  status: siteVisit.status,
  assignedTo: serializeStaffReference(siteVisit.assignedTo),
  updatedAt: siteVisit.updatedAt?.toISOString?.() ?? null,
});