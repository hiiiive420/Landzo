const serializePropertyReference = (property) => {
  if (!property) {
    return null;
  }

  if (!property.code) {
    return {
      id: property.toString(),
    };
  }

  return {
    id: property._id.toString(),
    code: property.code,
    title: property.title,
    type: property.type,
    status: property.status,
  };
};

const serializeStaffReference = (user) => {
  if (!user) {
    return null;
  }

  if (!user.fullName) {
    return {
      id: user.toString(),
    };
  }

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
};

export const serializeEnquiry = (enquiry) => ({
  id: enquiry._id.toString(),

  fullName: enquiry.fullName,
  email: enquiry.email ?? null,
  phone: enquiry.phone ?? null,
  message: enquiry.message ?? null,

  source: enquiry.source,
  status: enquiry.status,

  property: serializePropertyReference(
    enquiry.property,
  ),

  assignedTo: serializeStaffReference(
    enquiry.assignedTo,
  ),

  internalNote: enquiry.internalNote ?? null,

  closedAt:
    enquiry.closedAt?.toISOString?.() ?? null,

  closedBy: serializeStaffReference(
    enquiry.closedBy,
  ),

  createdAt:
    enquiry.createdAt?.toISOString?.() ?? null,

  updatedAt:
    enquiry.updatedAt?.toISOString?.() ?? null,
});

export const serializeEnquiryListItem = (
  enquiry,
) => ({
  id: enquiry._id.toString(),

  fullName: enquiry.fullName,
  email: enquiry.email ?? null,
  phone: enquiry.phone ?? null,

  source: enquiry.source,
  status: enquiry.status,

  property: serializePropertyReference(
    enquiry.property,
  ),

  assignedTo: serializeStaffReference(
    enquiry.assignedTo,
  ),

  createdAt:
    enquiry.createdAt?.toISOString?.() ?? null,

  updatedAt:
    enquiry.updatedAt?.toISOString?.() ?? null,
});
export const serializePublicEnquirySubmission = (enquiry) => ({
  submitted: true,
  enquiry: {
    id: enquiry._id.toString(),
    property: serializePropertyReference(enquiry.property),
  },
});