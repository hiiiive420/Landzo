import { AppError } from "../../common/errors/AppError.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit/audit.constants.js";
import { recordAuditLog } from "../audit/audit.service.js";
import {
  ANALYTICS_CONTEXT_SURFACES,
  ANALYTICS_EVENT_TYPES,
} from "../analytics/analytics.constants.js";
import { recordServerAnalyticsEventSafely } from "../analytics/analytics.service.js";

import { STAFF_STATUSES } from "../auth/auth.constants.js";
import { createNotificationSafely } from "../notifications/notification.service.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../notifications/notification.constants.js";
import { Property } from "../properties/property.model.js";
import { PERMISSIONS } from "../roles-permissions/permission.constants.js";
import { Role } from "../roles-permissions/role.model.js";
import { normalizePropertyCode } from "../properties/property.utils.js";
import { User } from "../users/user.model.js";

import {
  ENQUIRY_SOURCES,
  ENQUIRY_STATUSES,
} from "./enquiry.constants.js";
import { Enquiry } from "./enquiry.model.js";
import {
  serializeEnquiry,
  serializeEnquiryListItem,
  serializePublicEnquirySubmission,
} from "./enquiry.serializer.js";

const PROPERTY_POPULATE = {
  path: "property",
  select: "code title type status",
};

const STAFF_POPULATE = {
  path: "assignedTo",
  select: "fullName email role status",
};

const CLOSED_BY_POPULATE = {
  path: "closedBy",
  select: "fullName email role status",
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toEnquiryNotFoundError = () =>
  new AppError(
    404,
    "Enquiry not found",
    "ENQUIRY_NOT_FOUND",
  );

const ensurePropertyExists = async (propertyId) => {
  if (!propertyId) {
    return null;
  }

  const property = await Property.findOne({
    _id: propertyId,
    deletedAt: null,
  }).select("_id");

  if (!property) {
    throw new AppError(
      404,
      "Property not found",
      "ENQUIRY_PROPERTY_NOT_FOUND",
    );
  }

  return property._id;
};


const ensurePublicPropertyByCode = async (propertyCode) => {
  if (!propertyCode) {
    return null;
  }

  const property = await Property.findOne({
    code: normalizePropertyCode(propertyCode),
    isPublic: true,
    deletedAt: null,
  }).select("_id code title type status");

  if (!property) {
    throw new AppError(
      404,
      "Property not found",
      "PUBLIC_ENQUIRY_PROPERTY_NOT_FOUND",
    );
  }

  return property;
};

const ensureAssignableUser = async (userId) => {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId).select(
    "_id status",
  );

  if (!user) {
    throw new AppError(
      404,
      "Staff user not found",
      "ENQUIRY_ASSIGNEE_NOT_FOUND",
    );
  }

  if (user.status !== "active") {
    throw new AppError(
      409,
      "Only active staff can be assigned to an enquiry",
      "ENQUIRY_ASSIGNEE_INACTIVE",
    );
  }

  return user._id;
};

const ensureContactMethod = ({
  email,
  phone,
}) => {
  if (!email && !phone) {
    throw new AppError(
      422,
      "At least one contact method is required",
      "ENQUIRY_CONTACT_REQUIRED",
    );
  }
};

const ensureEnquiryIsOpen = (enquiry) => {
  if (enquiry.status === ENQUIRY_STATUSES.CLOSED) {
    throw new AppError(
      409,
      "Closed enquiries cannot be modified",
      "ENQUIRY_ALREADY_CLOSED",
    );
  }
};

const shouldNotifyAssignee = ({ actorUserId, recipientUserId }) =>
  recipientUserId && recipientUserId.toString() !== actorUserId?.toString();

const getNewEnquiryNotificationRecipientIds = async ({ actorUserId = null } = {}) => {
  const roles = await Role.find({
    permissions: PERMISSIONS.ENQUIRY_VIEW,
  }).select("key");

  const roleKeys = roles.map((role) => role.key);

  if (!roleKeys.length) {
    return [];
  }

  const users = await User.find({
    role: { $in: roleKeys },
    status: STAFF_STATUSES.ACTIVE,
  }).select("_id");

  return [
    ...new Set(
      users
        .map((user) => user._id.toString())
        .filter((userId) => userId !== actorUserId?.toString?.()),
    ),
  ];
};

const notifyNewEnquiry = async ({ enquiry, actorUserId = null }) => {
  const recipientIds = await getNewEnquiryNotificationRecipientIds({ actorUserId });

  await Promise.all(
    recipientIds.map((recipientUserId) =>
      createNotificationSafely({
        recipientUserId,
        type: NOTIFICATION_TYPES.ENQUIRY_NEW,
        title: "New enquiry received",
        message: "A new enquiry requires attention.",
        entityType: NOTIFICATION_ENTITY_TYPES.ENQUIRY,
        entityId: enquiry._id,
      }),
    ),
  );
};

const recordEnquiryAuditLog = async ({ actorUserId, action, enquiry }) => {
  try {
    await recordAuditLog({
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.ENQUIRY,
      entityId: enquiry._id,
      entityLabel: "Enquiry",
    });
  } catch (error) {
    console.error("Enquiry audit write failed", {
      action,
      entityType: AUDIT_ENTITY_TYPES.ENQUIRY,
      errorCode: error?.code || "AUDIT_WRITE_FAILED",
    });
  }
};
const notifyEnquiryAssigned = async ({ enquiry, actorUserId, previousAssigneeId }) => {
  const recipientUserId = enquiry.assignedTo?._id ?? enquiry.assignedTo;

  if (
    !shouldNotifyAssignee({ actorUserId, recipientUserId }) ||
    previousAssigneeId?.toString?.() === recipientUserId?.toString?.()
  ) {
    return;
  }

  await createNotificationSafely({
    recipientUserId,
    type: NOTIFICATION_TYPES.ENQUIRY_ASSIGNED,
    title: "Enquiry assigned",
    message: "An enquiry was assigned to you.",
    entityType: NOTIFICATION_ENTITY_TYPES.ENQUIRY,
    entityId: enquiry._id,
  });
};

const populateEnquiryDetail = async (enquiry) => {
  await enquiry.populate([
    PROPERTY_POPULATE,
    STAFF_POPULATE,
    CLOSED_BY_POPULATE,
  ]);

  return enquiry;
};

export const listEnquiries = async (query) => {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }

  if (query.propertyId) {
    filter.property = query.propertyId;
  }

  if (query.search) {
    const regex = new RegExp(
      escapeRegex(query.search),
      "i",
    );

    filter.$or = [
      { fullName: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(PROPERTY_POPULATE)
      .populate(STAFF_POPULATE),

    Enquiry.countDocuments(filter),
  ]);

  return {
    data: enquiries.map(serializeEnquiryListItem),

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getEnquiry = async (enquiryId) => {
  const enquiry = await Enquiry.findById(
    enquiryId,
  );

  if (!enquiry) {
    throw toEnquiryNotFoundError();
  }

  await populateEnquiryDetail(enquiry);

  return serializeEnquiry(enquiry);
};

export const listEnquiryPropertyOptions = async ({
  search = "",
  limit = 20,
} = {}) => {
  const filter = {
    deletedAt: null,
  };

  if (search) {
    const regex = new RegExp(
      escapeRegex(search),
      "i",
    );

    filter.$or = [
      { code: regex },
      { title: regex },
      { displayAddress: regex },
    ];
  }

  const properties = await Property.find(filter)
    .select(
      "_id code title type status displayAddress",
    )
    .sort({
      updatedAt: -1,
    })
    .limit(limit);

  return properties.map((property) => ({
    id: property._id.toString(),
    code: property.code,
    title: property.title,
    type: property.type,
    status: property.status,
    displayAddress:
      property.displayAddress ?? null,
  }));
};
export const createAdminEnquiry = async ({
  payload,
  actorUserId,
}) => {
  ensureContactMethod(payload);

  const property = await ensurePropertyExists(
    payload.propertyId,
  );

  const enquiry = await Enquiry.create({
    fullName: payload.fullName,

    email: payload.email ?? null,
    phone: payload.phone ?? null,
    message: payload.message ?? null,

    source: ENQUIRY_SOURCES.ADMIN,

    property,

    status: ENQUIRY_STATUSES.NEW,

    assignedTo: null,

    internalNote:
      payload.internalNote ?? null,

    closedAt: null,
    closedBy: null,

    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  await notifyNewEnquiry({ enquiry, actorUserId });

  await recordServerAnalyticsEventSafely({
    eventType: ANALYTICS_EVENT_TYPES.ENQUIRY_SUBMITTED,
    propertyId: property,
    context: {
      surface: ANALYTICS_CONTEXT_SURFACES.ENQUIRY,
    },
  });

  await populateEnquiryDetail(enquiry);

  return serializeEnquiry(enquiry);
};

export const createPublicEnquiry = async ({ payload }) => {
  ensureContactMethod(payload);

  const property = await ensurePublicPropertyByCode(payload.propertyCode);

  const enquiry = await Enquiry.create({
    fullName: payload.fullName,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    message: payload.message ?? null,
    source: property ? ENQUIRY_SOURCES.PROPERTY : ENQUIRY_SOURCES.WEBSITE,
    property: property?._id ?? null,
    status: ENQUIRY_STATUSES.NEW,
    assignedTo: null,
    internalNote: null,
    closedAt: null,
    closedBy: null,
    createdBy: null,
    updatedBy: null,
  });

  await notifyNewEnquiry({ enquiry });

  await recordServerAnalyticsEventSafely({
    eventType: ANALYTICS_EVENT_TYPES.ENQUIRY_SUBMITTED,
    propertyId: property?._id ?? null,
    context: {
      surface: ANALYTICS_CONTEXT_SURFACES.ENQUIRY,
    },
  });

  if (property) {
    enquiry.property = property;
  }

  return serializePublicEnquirySubmission(enquiry);
};
export const updateEnquiry = async ({
  enquiryId,
  payload,
  actorUserId,
}) => {
  const enquiry = await Enquiry.findById(
    enquiryId,
  );

  if (!enquiry) {
    throw toEnquiryNotFoundError();
  }

  ensureEnquiryIsOpen(enquiry);

  const nextEmail = Object.hasOwn(
    payload,
    "email",
  )
    ? payload.email
    : enquiry.email;

  const nextPhone = Object.hasOwn(
    payload,
    "phone",
  )
    ? payload.phone
    : enquiry.phone;

  ensureContactMethod({
    email: nextEmail,
    phone: nextPhone,
  });

  if (Object.hasOwn(payload, "propertyId")) {
    enquiry.property =
      await ensurePropertyExists(
        payload.propertyId,
      );
  }

  if (Object.hasOwn(payload, "fullName")) {
    enquiry.fullName = payload.fullName;
  }

  if (Object.hasOwn(payload, "email")) {
    enquiry.email = payload.email;
  }

  if (Object.hasOwn(payload, "phone")) {
    enquiry.phone = payload.phone;
  }

  if (Object.hasOwn(payload, "message")) {
    enquiry.message = payload.message;
  }

  if (
    Object.hasOwn(payload, "internalNote")
  ) {
    enquiry.internalNote =
      payload.internalNote;
  }

  if (Object.hasOwn(payload, "status")) {
    enquiry.status = payload.status;
  }
  const hasMeaningfulChanges = enquiry.modifiedPaths().some((path) => path !== "updatedBy");

  enquiry.updatedBy = actorUserId;

  await enquiry.save();

  if (hasMeaningfulChanges) {
    await recordEnquiryAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.ENQUIRY_UPDATED,
      enquiry,
    });
  }

  await populateEnquiryDetail(enquiry);

  return serializeEnquiry(enquiry);
};

export const listAssignableStaff = async () => {
  const users = await User.find({
    status: "active",
  })
    .select("_id fullName email role status")
    .sort({
      fullName: 1,
      email: 1,
    });

  return users.map((user) => ({
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  }));
};

export const assignEnquiry = async ({
  enquiryId,
  assignedTo,
  actorUserId,
}) => {
  const enquiry = await Enquiry.findById(
    enquiryId,
  );

  if (!enquiry) {
    throw toEnquiryNotFoundError();
  }

  ensureEnquiryIsOpen(enquiry);

  const previousAssigneeId = enquiry.assignedTo;

  enquiry.assignedTo =
    await ensureAssignableUser(assignedTo);

  if (
    enquiry.assignedTo &&
    enquiry.status === ENQUIRY_STATUSES.NEW
  ) {
    enquiry.status =
      ENQUIRY_STATUSES.IN_PROGRESS;
  }

  enquiry.updatedBy = actorUserId;
  await enquiry.save();

  const assigneeChanged =
    previousAssigneeId?.toString?.() !== enquiry.assignedTo?.toString?.();

  if (assigneeChanged) {
    await recordEnquiryAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.ENQUIRY_ASSIGNED,
      enquiry,
    });
  }

  await notifyEnquiryAssigned({
    enquiry,
    actorUserId,
    previousAssigneeId,
  });

  await populateEnquiryDetail(enquiry);

  return serializeEnquiry(enquiry);
};

export const closeEnquiry = async ({
  enquiryId,
  internalNote,
  actorUserId,
}) => {
  const enquiry = await Enquiry.findById(
    enquiryId,
  );

  if (!enquiry) {
    throw toEnquiryNotFoundError();
  }

  if (
    enquiry.status === ENQUIRY_STATUSES.CLOSED
  ) {
    await populateEnquiryDetail(enquiry);

    return serializeEnquiry(enquiry);
  }

  if (internalNote !== undefined) {
    enquiry.internalNote = internalNote;
  }

  enquiry.status = ENQUIRY_STATUSES.CLOSED;
  enquiry.closedAt = new Date();
  enquiry.closedBy = actorUserId;
  enquiry.updatedBy = actorUserId;
  await enquiry.save();

  await recordEnquiryAuditLog({
    actorUserId,
    action: AUDIT_ACTIONS.ENQUIRY_CLOSED,
    enquiry,
  });

  await populateEnquiryDetail(enquiry);

  return serializeEnquiry(enquiry);
};


