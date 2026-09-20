import { AppError } from "../../common/errors/AppError.js";
import { STAFF_STATUSES } from "../auth/auth.constants.js";
import { Enquiry } from "../enquiries/enquiry.model.js";
import { User } from "../users/user.model.js";
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from "./customer.constants.js";
import { Customer } from "./customer.model.js";
import {
  serializeCustomer,
  serializeCustomerListItem,
  serializeCustomerOption,
} from "./customer.serializer.js";

const STAFF_SELECT = "_id fullName email role status";
const STAFF_POPULATE = { path: "assignedTo", select: STAFF_SELECT };
const ENQUIRY_POPULATE = {
  path: "sourceEnquiry",
  select: "fullName email phone status property",
  populate: { path: "property", select: "code title" },
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeEmail = (email) => email?.trim().toLowerCase() || null;
const normalizePhone = (phone) => phone?.trim() || null;

const customerNotFoundError = () => new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");

const ensureContactMethod = ({ email, phone }) => {
  if (!normalizeEmail(email) && !normalizePhone(phone)) {
    throw new AppError(422, "At least one contact method is required", "CUSTOMER_CONTACT_REQUIRED");
  }
};

const ensureAssignableUser = async (userId) => {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId).select("_id status");

  if (!user) {
    throw new AppError(404, "Staff user not found", "CUSTOMER_ASSIGNEE_NOT_FOUND");
  }

  if (user.status !== STAFF_STATUSES.ACTIVE) {
    throw new AppError(409, "Only active staff can be assigned to a customer", "CUSTOMER_ASSIGNEE_INACTIVE");
  }

  return user._id;
};

const duplicateContactFilter = ({ email, phone, excludeCustomerId = null }) => {
  const contacts = [];

  if (normalizeEmail(email)) {
    contacts.push({ email: normalizeEmail(email) });
  }

  if (normalizePhone(phone)) {
    contacts.push({ phone: normalizePhone(phone) });
  }

  if (!contacts.length) {
    return null;
  }

  const filter = {
    status: CUSTOMER_STATUSES.ACTIVE,
    $or: contacts,
  };

  if (excludeCustomerId) {
    filter._id = { $ne: excludeCustomerId };
  }

  return filter;
};

const ensureNoDuplicateContact = async ({ email, phone, excludeCustomerId = null }) => {
  const filter = duplicateContactFilter({ email, phone, excludeCustomerId });

  if (!filter) {
    return;
  }

  const duplicate = await Customer.findOne(filter).select("_id");

  if (duplicate) {
    throw new AppError(409, "An active customer or lead already uses this contact", "CUSTOMER_DUPLICATE_CONTACT");
  }
};

const populateCustomer = async (customer) => {
  await customer.populate([STAFF_POPULATE, ENQUIRY_POPULATE]);
  return customer;
};

export const listCustomers = async (query) => {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const filter = {};

  if (query.type) {
    filter.type = query.type;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(STAFF_POPULATE)
      .populate(ENQUIRY_POPULATE),
    Customer.countDocuments(filter),
  ]);

  return {
    data: customers.map(serializeCustomerListItem),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const listCustomerAssignees = async () => {
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

export const listCustomerOptions = async ({ search = "", limit = 20 } = {}) => {
  const filter = { status: CUSTOMER_STATUSES.ACTIVE };

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }

  const customers = await Customer.find(filter).sort({ updatedAt: -1 }).limit(limit);
  return customers.map(serializeCustomerOption);
};

export const getCustomer = async (customerId) => {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw customerNotFoundError();
  }

  await populateCustomer(customer);
  return serializeCustomer(customer);
};

export const createCustomer = async ({ payload, actorUserId }) => {
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  ensureContactMethod({ email, phone });
  await ensureNoDuplicateContact({ email, phone });

  const assignedTo = await ensureAssignableUser(payload.assignedTo);

  const customer = await Customer.create({
    fullName: payload.fullName,
    email,
    phone,
    type: payload.type ?? CUSTOMER_TYPES.LEAD,
    status: payload.status ?? CUSTOMER_STATUSES.ACTIVE,
    sourceEnquiry: null,
    assignedTo,
    notes: payload.notes ?? null,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  await populateCustomer(customer);
  return serializeCustomer(customer);
};

export const updateCustomer = async ({ customerId, payload, actorUserId }) => {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw customerNotFoundError();
  }

  const nextEmail = Object.hasOwn(payload, "email") ? normalizeEmail(payload.email) : customer.email;
  const nextPhone = Object.hasOwn(payload, "phone") ? normalizePhone(payload.phone) : customer.phone;
  ensureContactMethod({ email: nextEmail, phone: nextPhone });
  await ensureNoDuplicateContact({ email: nextEmail, phone: nextPhone, excludeCustomerId: customer._id });

  if (Object.hasOwn(payload, "type")) {
    if (customer.type === CUSTOMER_TYPES.CUSTOMER && payload.type === CUSTOMER_TYPES.LEAD) {
      throw new AppError(409, "Customers cannot be changed back to leads", "CUSTOMER_TYPE_DOWNGRADE_NOT_ALLOWED");
    }

    customer.type = payload.type;
  }

  if (Object.hasOwn(payload, "fullName")) {
    customer.fullName = payload.fullName;
  }

  if (Object.hasOwn(payload, "email")) {
    customer.email = nextEmail;
  }

  if (Object.hasOwn(payload, "phone")) {
    customer.phone = nextPhone;
  }

  if (Object.hasOwn(payload, "status")) {
    customer.status = payload.status;
  }

  if (Object.hasOwn(payload, "assignedTo")) {
    customer.assignedTo = await ensureAssignableUser(payload.assignedTo);
  }

  if (Object.hasOwn(payload, "notes")) {
    customer.notes = payload.notes;
  }

  customer.updatedBy = actorUserId;
  await customer.save();
  await populateCustomer(customer);
  return serializeCustomer(customer);
};

export const createCustomerFromEnquiry = async ({ enquiryId, payload, actorUserId }) => {
  const enquiry = await Enquiry.findById(enquiryId).select("fullName email phone");

  if (!enquiry) {
    throw new AppError(404, "Enquiry not found", "ENQUIRY_NOT_FOUND");
  }

  const existingForEnquiry = await Customer.findOne({ sourceEnquiry: enquiry._id }).select("_id");

  if (existingForEnquiry) {
    throw new AppError(409, "A customer or lead already exists for this enquiry", "CUSTOMER_ALREADY_EXISTS_FOR_ENQUIRY");
  }

  const email = normalizeEmail(enquiry.email);
  const phone = normalizePhone(enquiry.phone);
  ensureContactMethod({ email, phone });
  await ensureNoDuplicateContact({ email, phone });

  const assignedTo = await ensureAssignableUser(payload.assignedTo);
  const customer = await Customer.create({
    fullName: enquiry.fullName,
    email,
    phone,
    type: payload.type ?? CUSTOMER_TYPES.LEAD,
    status: CUSTOMER_STATUSES.ACTIVE,
    sourceEnquiry: enquiry._id,
    assignedTo,
    notes: payload.notes ?? null,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  await populateCustomer(customer);
  return serializeCustomer(customer);
};

export const getCustomerByEnquiry = async (enquiryId) => {
  const customer = await Customer.findOne({
    sourceEnquiry: enquiryId,
  })
    .select(
      "_id fullName email phone type status sourceEnquiry assignedTo notes createdAt updatedAt",
    )
    .populate(STAFF_POPULATE)
    .populate(ENQUIRY_POPULATE);

  if (!customer) {
    return null;
  }

  return serializeCustomer(customer);
};