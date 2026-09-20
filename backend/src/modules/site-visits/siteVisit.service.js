import { AppError } from "../../common/errors/AppError.js";
import { STAFF_STATUSES } from "../auth/auth.constants.js";
import { Customer } from "../customers/customer.model.js";
import { Enquiry } from "../enquiries/enquiry.model.js";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../notifications/notification.constants.js";
import { createNotificationSafely } from "../notifications/notification.service.js";
import { Property } from "../properties/property.model.js";
import { User } from "../users/user.model.js";
import { SITE_VISIT_STATUSES } from "./siteVisit.constants.js";
import { SiteVisit } from "./siteVisit.model.js";
import { serializeSiteVisit, serializeSiteVisitListItem } from "./siteVisit.serializer.js";

const STAFF_SELECT = "_id fullName email role status";
const PROPERTY_SELECT = "_id code title type status displayAddress deletedAt";
const CUSTOMER_SELECT = "_id fullName email phone type status";
const ENQUIRY_SELECT = "_id fullName email phone status property";
const STAFF_POPULATE = { path: "assignedTo", select: STAFF_SELECT };
const PROPERTY_POPULATE = { path: "property", select: PROPERTY_SELECT };
const CUSTOMER_POPULATE = { path: "customer", select: CUSTOMER_SELECT };
const ENQUIRY_POPULATE = { path: "enquiry", select: ENQUIRY_SELECT };

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeEmail = (email) => email?.trim().toLowerCase() || null;
const normalizePhone = (phone) => phone?.trim() || null;
const isTerminalStatus = (status) => status !== SITE_VISIT_STATUSES.SCHEDULED;

const notFoundError = () => new AppError(404, "Site visit not found", "SITE_VISIT_NOT_FOUND");

const ensureAssignableUser = async (userId) => {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId).select("_id status");

  if (!user) {
    throw new AppError(404, "Staff user not found", "SITE_VISIT_ASSIGNEE_NOT_FOUND");
  }

  if (user.status !== STAFF_STATUSES.ACTIVE) {
    throw new AppError(409, "Only active staff can be assigned to a site visit", "SITE_VISIT_ASSIGNEE_INACTIVE");
  }

  return user._id;
};

const ensureProperty = async (propertyId) => {
  const property = await Property.findOne({ _id: propertyId, deletedAt: null }).select(PROPERTY_SELECT);

  if (!property) {
    throw new AppError(404, "Property not found", "SITE_VISIT_PROPERTY_NOT_FOUND");
  }

  return property;
};

const ensureCustomer = async (customerId) => {
  if (!customerId) {
    return null;
  }

  const customer = await Customer.findById(customerId).select(CUSTOMER_SELECT);

  if (!customer) {
    throw new AppError(404, "Customer not found", "SITE_VISIT_CUSTOMER_NOT_FOUND");
  }

  return customer;
};

const ensureEnquiry = async (enquiryId) => {
  if (!enquiryId) {
    return null;
  }

  const enquiry = await Enquiry.findById(enquiryId).select(ENQUIRY_SELECT);

  if (!enquiry) {
    throw new AppError(404, "Enquiry not found", "SITE_VISIT_ENQUIRY_NOT_FOUND");
  }

  return enquiry;
};

const ensureVisitorContact = ({ visitorName, visitorEmail, visitorPhone }) => {
  if (!visitorName?.trim() || (!normalizeEmail(visitorEmail) && !normalizePhone(visitorPhone))) {
    throw new AppError(422, "Visitor name and at least one contact method are required", "SITE_VISIT_CONTACT_REQUIRED");
  }
};

const buildVisitorSnapshot = ({ payload, customer, enquiry }) => {
  if (customer) {
    return {
      visitorName: customer.fullName,
      visitorEmail: customer.email ?? null,
      visitorPhone: customer.phone ?? null,
    };
  }

  if (enquiry) {
    return {
      visitorName: enquiry.fullName,
      visitorEmail: enquiry.email ?? null,
      visitorPhone: enquiry.phone ?? null,
    };
  }

  return {
    visitorName: payload.visitorName,
    visitorEmail: normalizeEmail(payload.visitorEmail),
    visitorPhone: normalizePhone(payload.visitorPhone),
  };
};

const shouldNotifyAssignee = ({ actorUserId, recipientUserId }) =>
  recipientUserId && recipientUserId.toString() !== actorUserId?.toString();

const notifySiteVisitAssignee = async ({ siteVisit, actorUserId, type, title, message }) => {
  const recipientUserId = siteVisit.assignedTo?._id ?? siteVisit.assignedTo;

  if (!shouldNotifyAssignee({ actorUserId, recipientUserId })) {
    return;
  }

  await createNotificationSafely({
    recipientUserId,
    type,
    title,
    message,
    entityType: NOTIFICATION_ENTITY_TYPES.SITE_VISIT,
    entityId: siteVisit._id,
  });
};

const notifySiteVisitUpdateIfNeeded = async ({ siteVisit, actorUserId, previousAssigneeId, previousScheduledAt, previousStatus }) => {
  const assignedChanged =
    previousAssigneeId?.toString?.() !== siteVisit.assignedTo?.toString?.();
  const scheduleChanged =
    previousScheduledAt && siteVisit.scheduledAt && previousScheduledAt.getTime?.() !== siteVisit.scheduledAt.getTime?.();
  const statusChanged = previousStatus !== siteVisit.status;

  if (assignedChanged) {
    await notifySiteVisitAssignee({
      siteVisit,
      actorUserId,
      type: NOTIFICATION_TYPES.SITE_VISIT_ASSIGNED,
      title: "Site visit assigned",
      message: "A site visit was assigned to you.",
    });
    return;
  }

  if (scheduleChanged) {
    await notifySiteVisitAssignee({
      siteVisit,
      actorUserId,
      type: NOTIFICATION_TYPES.SITE_VISIT_UPDATED,
      title: "Site visit schedule updated",
      message: "A site visit schedule was updated.",
    });
    return;
  }

  if (statusChanged) {
    await notifySiteVisitAssignee({
      siteVisit,
      actorUserId,
      type: NOTIFICATION_TYPES.SITE_VISIT_UPDATED,
      title: "Site visit updated",
      message: "A site visit status was updated.",
    });
  }
};

const populateSiteVisit = async (siteVisit) => {
  await siteVisit.populate([PROPERTY_POPULATE, CUSTOMER_POPULATE, ENQUIRY_POPULATE, STAFF_POPULATE]);
  return siteVisit;
};

const ensureScheduledVisit = (siteVisit) => {
  if (isTerminalStatus(siteVisit.status)) {
    throw new AppError(409, "Terminal site visits cannot be modified", "SITE_VISIT_ALREADY_TERMINAL");
  }
};

export const listSiteVisits = async (query) => {
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

  if (query.customerId) {
    filter.customer = query.customerId;
  }

  if (query.dateFrom || query.dateTo) {
    filter.scheduledAt = {};

    if (query.dateFrom) {
      filter.scheduledAt.$gte = query.dateFrom;
    }

    if (query.dateTo) {
      filter.scheduledAt.$lte = query.dateTo;
    }
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ visitorName: regex }, { visitorEmail: regex }, { visitorPhone: regex }];
  }

  const [siteVisits, total] = await Promise.all([
    SiteVisit.find(filter)
      .sort({ status: 1, scheduledAt: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(PROPERTY_POPULATE)
      .populate(CUSTOMER_POPULATE)
      .populate(STAFF_POPULATE),
    SiteVisit.countDocuments(filter),
  ]);

  return {
    data: siteVisits.map(serializeSiteVisitListItem),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const listSiteVisitAssignees = async () => {
  const users = await User.find({ status: STAFF_STATUSES.ACTIVE })
    .select(STAFF_SELECT)
    .sort({ fullName: 1, email: 1 });

  return users.map((user) => ({
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  }));
};

export const listSiteVisitPropertyOptions = async ({ search = "", limit = 20 } = {}) => {
  const filter = { deletedAt: null };

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ code: regex }, { title: regex }, { displayAddress: regex }];
  }

  const properties = await Property.find(filter).select(PROPERTY_SELECT).sort({ updatedAt: -1 }).limit(limit);

  return properties.map((property) => ({
    id: property._id.toString(),
    code: property.code,
    title: property.title,
    type: property.type,
    status: property.status,
    displayAddress: property.displayAddress ?? null,
  }));
};

export const getSiteVisit = async (siteVisitId) => {
  const siteVisit = await SiteVisit.findById(siteVisitId);

  if (!siteVisit) {
    throw notFoundError();
  }

  await populateSiteVisit(siteVisit);
  return serializeSiteVisit(siteVisit);
};

export const createSiteVisit = async ({ payload, actorUserId }) => {
  await ensureProperty(payload.propertyId);
  const customer = await ensureCustomer(payload.customerId);
  const enquiry = await ensureEnquiry(payload.enquiryId);
  const assignedTo = await ensureAssignableUser(payload.assignedTo);
  const snapshot = buildVisitorSnapshot({ payload, customer, enquiry });
  ensureVisitorContact(snapshot);

  const siteVisit = await SiteVisit.create({
    property: payload.propertyId,
    customer: customer?._id ?? null,
    enquiry: enquiry?._id ?? null,
    visitorName: snapshot.visitorName,
    visitorEmail: normalizeEmail(snapshot.visitorEmail),
    visitorPhone: normalizePhone(snapshot.visitorPhone),
    scheduledAt: payload.scheduledAt,
    status: SITE_VISIT_STATUSES.SCHEDULED,
    assignedTo,
    notes: payload.notes ?? null,
    completionNote: null,
    cancellationReason: null,
    completedAt: null,
    cancelledAt: null,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  await notifySiteVisitAssignee({
    siteVisit,
    actorUserId,
    type: NOTIFICATION_TYPES.SITE_VISIT_ASSIGNED,
    title: "Site visit assigned",
    message: "A site visit was assigned to you.",
  });

  await populateSiteVisit(siteVisit);
  return serializeSiteVisit(siteVisit);
};

export const updateSiteVisit = async ({ siteVisitId, payload, actorUserId }) => {
  const siteVisit = await SiteVisit.findById(siteVisitId);

  if (!siteVisit) {
    throw notFoundError();
  }

  ensureScheduledVisit(siteVisit);

  const previousAssigneeId = siteVisit.assignedTo;
  const previousScheduledAt = siteVisit.scheduledAt;
  const previousStatus = siteVisit.status;

  if (Object.hasOwn(payload, "propertyId")) {
    await ensureProperty(payload.propertyId);
    siteVisit.property = payload.propertyId;
  }

  if (Object.hasOwn(payload, "scheduledAt")) {
    siteVisit.scheduledAt = payload.scheduledAt;
  }

  if (Object.hasOwn(payload, "assignedTo")) {
    siteVisit.assignedTo = await ensureAssignableUser(payload.assignedTo);
  }

  if (Object.hasOwn(payload, "notes")) {
    siteVisit.notes = payload.notes;
  }

  siteVisit.updatedBy = actorUserId;
  await siteVisit.save();

  await notifySiteVisitUpdateIfNeeded({
    siteVisit,
    actorUserId,
    previousAssigneeId,
    previousScheduledAt,
    previousStatus,
  });

  await populateSiteVisit(siteVisit);
  return serializeSiteVisit(siteVisit);
};

export const completeSiteVisit = async ({ siteVisitId, completionNote, actorUserId }) => {
  const siteVisit = await SiteVisit.findById(siteVisitId);

  if (!siteVisit) {
    throw notFoundError();
  }

  const previousStatus = siteVisit.status;
  const previousAssigneeId = siteVisit.assignedTo;
  const previousScheduledAt = siteVisit.scheduledAt;

  ensureScheduledVisit(siteVisit);
  siteVisit.status = SITE_VISIT_STATUSES.COMPLETED;
  siteVisit.completedAt = new Date();
  siteVisit.completionNote = completionNote ?? null;
  siteVisit.updatedBy = actorUserId;
  await siteVisit.save();

  await notifySiteVisitUpdateIfNeeded({
    siteVisit,
    actorUserId,
    previousAssigneeId,
    previousScheduledAt,
    previousStatus,
  });

  await populateSiteVisit(siteVisit);
  return serializeSiteVisit(siteVisit);
};

export const cancelSiteVisit = async ({ siteVisitId, cancellationReason, actorUserId }) => {
  const siteVisit = await SiteVisit.findById(siteVisitId);

  if (!siteVisit) {
    throw notFoundError();
  }

  const previousStatus = siteVisit.status;
  const previousAssigneeId = siteVisit.assignedTo;
  const previousScheduledAt = siteVisit.scheduledAt;

  ensureScheduledVisit(siteVisit);
  siteVisit.status = SITE_VISIT_STATUSES.CANCELLED;
  siteVisit.cancelledAt = new Date();
  siteVisit.cancellationReason = cancellationReason ?? null;
  siteVisit.updatedBy = actorUserId;
  await siteVisit.save();

  await notifySiteVisitUpdateIfNeeded({
    siteVisit,
    actorUserId,
    previousAssigneeId,
    previousScheduledAt,
    previousStatus,
  });

  await populateSiteVisit(siteVisit);
  return serializeSiteVisit(siteVisit);
};

export const markSiteVisitNoShow = async ({ siteVisitId, actorUserId }) => {
  const siteVisit = await SiteVisit.findById(siteVisitId);

  if (!siteVisit) {
    throw notFoundError();
  }

  const previousStatus = siteVisit.status;
  const previousAssigneeId = siteVisit.assignedTo;
  const previousScheduledAt = siteVisit.scheduledAt;

  ensureScheduledVisit(siteVisit);
  siteVisit.status = SITE_VISIT_STATUSES.NO_SHOW;
  siteVisit.updatedBy = actorUserId;
  await siteVisit.save();

  await notifySiteVisitUpdateIfNeeded({
    siteVisit,
    actorUserId,
    previousAssigneeId,
    previousScheduledAt,
    previousStatus,
  });

  await populateSiteVisit(siteVisit);
  return serializeSiteVisit(siteVisit);
};