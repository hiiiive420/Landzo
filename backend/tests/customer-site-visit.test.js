import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { Customer } from "../src/modules/customers/customer.model.js";
import { Enquiry } from "../src/modules/enquiries/enquiry.model.js";
import { Property } from "../src/modules/properties/property.model.js";
import { PROPERTY_STATUSES, PROPERTY_TYPES, TRANSACTION_TYPES } from "../src/modules/properties/property.constants.js";
import { PERMISSIONS } from "../src/modules/roles-permissions/permission.constants.js";
import { Role } from "../src/modules/roles-permissions/role.model.js";
import { bootstrapSystemRoles } from "../src/modules/roles-permissions/role.service.js";
import { User } from "../src/modules/users/user.model.js";
import { authTestEnv } from "./helpers/authTestEnv.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from "./helpers/testDatabase.js";

const password = "Password12345!";
const app = () => createApp({ env: authTestEnv });
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const createStaffUser = async ({
  email = "staff@example.com",
  role = STAFF_ROLES.ADMIN,
  status = STAFF_STATUSES.ACTIVE,
  fullName = "LANDZO Staff",
} = {}) =>
  User.create({
    fullName,
    email,
    role,
    status,
    passwordHash: await hashPassword(password),
  });

const loginAs = async (user) => {
  const response = await request(app())
    .post("/api/v1/admin/auth/login")
    .send({ email: user.email, password })
    .expect(200);

  return response.body.data.accessToken;
};

const grantRolePermissions = (role, permissions) =>
  Role.updateOne({ key: role }, { $set: { permissions } });

const createProperty = (overrides = {}) =>
  Property.create({
    code: `LND-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: PROPERTY_TYPES.LAND,
    transactionTypes: [TRANSACTION_TYPES.SALE],
    status: PROPERTY_STATUSES.AVAILABLE,
    title: "Lake View Land",
    description: "A test property",
    displayAddress: "Batticaloa, Sri Lanka",
    pricing: {
      currency: "LKR",
      priceVisible: true,
      sale: { mode: "fixed", amount: 1000000 },
    },
    deletedAt: null,
    ...overrides,
  });

const createEnquiry = (overrides = {}) =>
  Enquiry.create({
    fullName: "Nimal Perera",
    email: "nimal@example.com",
    phone: "+94770000000",
    message: "Interested",
    source: "admin",
    status: "new",
    ...overrides,
  });

const createCustomerPayload = (overrides = {}) => ({
  fullName: "Nimal Perera",
  email: "Nimal@Example.com",
  phone: "+94770000000",
  type: "lead",
  notes: "Initial lead",
  ...overrides,
});

const createSiteVisitPayload = async (overrides = {}) => {
  const property = overrides.propertyId ? null : await createProperty();

  return {
    propertyId: overrides.propertyId ?? property._id.toString(),
    visitorName: "Nimal Perera",
    visitorEmail: "nimal@example.com",
    visitorPhone: "+94770000000",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    notes: "Morning visit",
    ...overrides,
  };
};

beforeAll(connectTestDatabase);

beforeEach(async () => {
  await resetTestDatabase();
  await bootstrapSystemRoles();
});

afterAll(async () => {
  await clearTestDatabase();
  await disconnectTestDatabase();
});

describe("customers and leads admin API", () => {
  it("protects customer APIs with authentication and customer.view/customer.manage", async () => {
    await request(app()).get("/api/v1/admin/customers").expect(401);

    await grantRolePermissions(STAFF_ROLES.CONTENT_MANAGER, []);
    const staff = await createStaffUser({ email: "content@example.com", role: STAFF_ROLES.CONTENT_MANAGER });
    const token = await loginAs(staff);

    await request(app()).get("/api/v1/admin/customers").set(authHeader(token)).expect(403);

    await grantRolePermissions(STAFF_ROLES.CONTENT_MANAGER, [PERMISSIONS.CUSTOMER_VIEW]);
    await request(app()).get("/api/v1/admin/customers").set(authHeader(token)).expect(200);

    await request(app()).post("/api/v1/admin/customers").set(authHeader(token)).send(createCustomerPayload()).expect(403);
  });

  it("creates, lists, searches, and returns customer detail without raw internals", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);

    const created = await request(app())
      .post("/api/v1/admin/customers")
      .set(authHeader(token))
      .send(createCustomerPayload())
      .expect(201);

    expect(created.body.data).toMatchObject({
      fullName: "Nimal Perera",
      email: "nimal@example.com",
      type: "lead",
      status: "active",
    });
    expect(JSON.stringify(created.body.data)).not.toContain("__v");
    expect(JSON.stringify(created.body.data)).not.toContain("createdBy");

    const list = await request(app())
      .get("/api/v1/admin/customers")
      .query({ search: "nimal", type: "lead", status: "active" })
      .set(authHeader(token))
      .expect(200);

    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.total).toBe(1);

    const detail = await request(app())
      .get(`/api/v1/admin/customers/${created.body.data.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(detail.body.data.notes).toBe("Initial lead");
  });

  it("requires a contact method and blocks duplicate active contacts", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);

    await request(app())
      .post("/api/v1/admin/customers")
      .set(authHeader(token))
      .send(createCustomerPayload({ email: null, phone: null }))
      .expect(400);

    await request(app()).post("/api/v1/admin/customers").set(authHeader(token)).send(createCustomerPayload()).expect(201);

    const duplicate = await request(app())
      .post("/api/v1/admin/customers")
      .set(authHeader(token))
      .send(createCustomerPayload({ fullName: "Duplicate Lead", phone: "+94771111111" }))
      .expect(409);

    expect(duplicate.body.code).toBe("CUSTOMER_DUPLICATE_CONTACT");
  });

  it("allows active staff assignment and rejects inactive or unknown assignees", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const assignee = await createStaffUser({ email: "agent@example.com" });
    const inactive = await createStaffUser({ email: "inactive@example.com", status: STAFF_STATUSES.DISABLED });
    const token = await loginAs(owner);

    const created = await request(app())
      .post("/api/v1/admin/customers")
      .set(authHeader(token))
      .send(createCustomerPayload({ assignedTo: assignee._id.toString() }))
      .expect(201);

    expect(created.body.data.assignedTo.email).toBe("agent@example.com");

    const inactiveResponse = await request(app())
      .patch(`/api/v1/admin/customers/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ assignedTo: inactive._id.toString() })
      .expect(409);

    expect(inactiveResponse.body.code).toBe("CUSTOMER_ASSIGNEE_INACTIVE");

    await request(app())
      .patch(`/api/v1/admin/customers/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ assignedTo: "64ad2d753a9a22b8e6ac1122" })
      .expect(404);
  });

  it("supports lead to customer promotion, activation lifecycle, and rejects customer downgrade", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);
    const created = await request(app()).post("/api/v1/admin/customers").set(authHeader(token)).send(createCustomerPayload()).expect(201);

    const promoted = await request(app())
      .patch(`/api/v1/admin/customers/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ type: "customer", status: "inactive" })
      .expect(200);

    expect(promoted.body.data).toMatchObject({ type: "customer", status: "inactive" });

    await request(app())
      .patch(`/api/v1/admin/customers/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ status: "active" })
      .expect(200);

    const downgrade = await request(app())
      .patch(`/api/v1/admin/customers/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ type: "lead" })
      .expect(409);

    expect(downgrade.body.code).toBe("CUSTOMER_TYPE_DOWNGRADE_NOT_ALLOWED");
  });

  it("creates a lead from an enquiry once and preserves the source enquiry", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);
    const enquiry = await createEnquiry();

    const created = await request(app())
      .post(`/api/v1/admin/customers/from-enquiry/${enquiry._id}`)
      .set(authHeader(token))
      .send({ type: "lead", notes: "Converted" })
      .expect(201);

    expect(created.body.data).toMatchObject({ fullName: "Nimal Perera", email: "nimal@example.com", type: "lead" });
    expect(created.body.data.sourceEnquiry.id).toBe(enquiry._id.toString());

    const duplicate = await request(app())
      .post(`/api/v1/admin/customers/from-enquiry/${enquiry._id}`)
      .set(authHeader(token))
      .send({ type: "lead" })
      .expect(409);

    expect(duplicate.body.code).toBe("CUSTOMER_ALREADY_EXISTS_FOR_ENQUIRY");

    const unchangedEnquiry = await Enquiry.findById(enquiry._id);
    expect(unchangedEnquiry.status).toBe("new");
  });

  it("exposes CRM permissions to Owner/Admin/Support but not Content Manager defaults", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);

    const response = await request(app()).get("/api/v1/admin/roles").set(authHeader(token)).expect(200);
    const admin = response.body.data.find((role) => role.key === STAFF_ROLES.ADMIN);
    const support = response.body.data.find((role) => role.key === STAFF_ROLES.ENQUIRY_SUPPORT);
    const content = response.body.data.find((role) => role.key === STAFF_ROLES.CONTENT_MANAGER);

    expect(admin.permissions).toEqual(expect.arrayContaining([PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.CUSTOMER_MANAGE]));
    expect(support.permissions).toEqual(expect.arrayContaining([PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.CUSTOMER_MANAGE]));
    expect(content.permissions).not.toContain(PERMISSIONS.CUSTOMER_VIEW);
  });
});

describe("site visits admin API", () => {
  it("protects site visit APIs with authentication and siteVisit.view/siteVisit.manage", async () => {
    await request(app()).get("/api/v1/admin/site-visits").expect(401);

    await grantRolePermissions(STAFF_ROLES.CONTENT_MANAGER, []);
    const staff = await createStaffUser({ email: "content@example.com", role: STAFF_ROLES.CONTENT_MANAGER });
    const token = await loginAs(staff);

    await request(app()).get("/api/v1/admin/site-visits").set(authHeader(token)).expect(403);

    await grantRolePermissions(STAFF_ROLES.CONTENT_MANAGER, [PERMISSIONS.SITE_VISIT_VIEW]);
    await request(app()).get("/api/v1/admin/site-visits").set(authHeader(token)).expect(200);

    await request(app()).post("/api/v1/admin/site-visits").set(authHeader(token)).send(await createSiteVisitPayload()).expect(403);
  });

  it("creates manual site visits, lists/filters, and returns detail", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);
    const payload = await createSiteVisitPayload();

    const created = await request(app()).post("/api/v1/admin/site-visits").set(authHeader(token)).send(payload).expect(201);

    expect(created.body.data).toMatchObject({
      visitorName: "Nimal Perera",
      visitorEmail: "nimal@example.com",
      status: "scheduled",
    });
    expect(created.body.data.property.code).toBeTruthy();

    const list = await request(app())
      .get("/api/v1/admin/site-visits")
      .query({ search: "nimal", status: "scheduled", propertyId: payload.propertyId })
      .set(authHeader(token))
      .expect(200);

    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.total).toBe(1);

    const detail = await request(app())
      .get(`/api/v1/admin/site-visits/${created.body.data.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(detail.body.data.notes).toBe("Morning visit");
  });

  it("requires property and manual visitor contact, and rejects invalid properties", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);

    await request(app())
      .post("/api/v1/admin/site-visits")
      .set(authHeader(token))
      .send({ ...(await createSiteVisitPayload()), propertyId: undefined })
      .expect(400);

    await request(app())
      .post("/api/v1/admin/site-visits")
      .set(authHeader(token))
      .send(await createSiteVisitPayload({ visitorName: undefined, visitorEmail: null, visitorPhone: null }))
      .expect(400);

    const invalidProperty = await request(app())
      .post("/api/v1/admin/site-visits")
      .set(authHeader(token))
      .send(await createSiteVisitPayload({ propertyId: "64ad2d753a9a22b8e6ac1122" }))
      .expect(404);

    expect(invalidProperty.body.code).toBe("SITE_VISIT_PROPERTY_NOT_FOUND");
  });

  it("creates Customer-linked and Enquiry-linked visits with server-side contact snapshots", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);
    const property = await createProperty();
    const customer = await Customer.create({
      fullName: "Customer One",
      email: "customer@example.com",
      phone: "+94771111111",
      type: "customer",
      status: "active",
    });
    const enquiry = await createEnquiry({ fullName: "Enquiry One", email: "enquiry@example.com", phone: "+94772222222" });

    const customerVisit = await request(app())
      .post("/api/v1/admin/site-visits")
      .set(authHeader(token))
      .send({
        propertyId: property._id.toString(),
        customerId: customer._id.toString(),
        visitorName: "Forged Name",
        visitorEmail: "forged@example.com",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);

    expect(customerVisit.body.data).toMatchObject({ visitorName: "Customer One", visitorEmail: "customer@example.com" });

    const enquiryVisit = await request(app())
      .post("/api/v1/admin/site-visits")
      .set(authHeader(token))
      .send({
        propertyId: property._id.toString(),
        enquiryId: enquiry._id.toString(),
        scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      })
      .expect(201);

    expect(enquiryVisit.body.data).toMatchObject({ visitorName: "Enquiry One", visitorEmail: "enquiry@example.com" });
  });

  it("supports safe lookup endpoints without broader management permissions", async () => {
    await grantRolePermissions(STAFF_ROLES.CONTENT_MANAGER, [PERMISSIONS.SITE_VISIT_MANAGE]);
    const staff = await createStaffUser({ email: "scheduler@example.com", role: STAFF_ROLES.CONTENT_MANAGER });
    const token = await loginAs(staff);
    await createProperty({ title: "Colombo House", displayAddress: "Colombo 03" });
    await Customer.create({ fullName: "Lookup Lead", email: "lookup@example.com", type: "lead", status: "active" });

    const properties = await request(app())
      .get("/api/v1/admin/site-visits/property-options")
      .query({ search: "colombo" })
      .set(authHeader(token))
      .expect(200);

    expect(properties.body.data[0]).toEqual(expect.objectContaining({ title: "Colombo House" }));
    expect(JSON.stringify(properties.body.data[0])).not.toContain("pricing");

    const customers = await request(app())
      .get("/api/v1/admin/site-visits/customer-options")
      .query({ search: "lookup" })
      .set(authHeader(token))
      .expect(200);

    expect(customers.body.data[0]).toEqual(expect.objectContaining({ fullName: "Lookup Lead" }));
    expect(JSON.stringify(customers.body.data[0])).not.toContain("notes");
  });

  it("validates active assignees for site visits", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const inactive = await createStaffUser({ email: "inactive@example.com", status: STAFF_STATUSES.DISABLED });
    const token = await loginAs(owner);

    const response = await request(app())
      .post("/api/v1/admin/site-visits")
      .set(authHeader(token))
      .send(await createSiteVisitPayload({ assignedTo: inactive._id.toString() }))
      .expect(409);

    expect(response.body.code).toBe("SITE_VISIT_ASSIGNEE_INACTIVE");
  });

  it("reschedules scheduled visits and blocks generic direct status mutation", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);
    const created = await request(app()).post("/api/v1/admin/site-visits").set(authHeader(token)).send(await createSiteVisitPayload()).expect(201);
    const nextDate = new Date(Date.now() + 259200000).toISOString();

    const updated = await request(app())
      .patch(`/api/v1/admin/site-visits/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ scheduledAt: nextDate, notes: "Rescheduled" })
      .expect(200);

    expect(updated.body.data.scheduledAt).toBe(nextDate);
    expect(updated.body.data.notes).toBe("Rescheduled");

    await request(app())
      .patch(`/api/v1/admin/site-visits/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ status: "completed" })
      .expect(400);
  });

  it("completes, cancels, marks no-show, and rejects terminal mutation", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);

    const completed = await request(app()).post("/api/v1/admin/site-visits").set(authHeader(token)).send(await createSiteVisitPayload()).expect(201);
    const completeResponse = await request(app())
      .post(`/api/v1/admin/site-visits/${completed.body.data.id}/complete`)
      .set(authHeader(token))
      .send({ completionNote: "Done" })
      .expect(200);

    expect(completeResponse.body.data.status).toBe("completed");
    expect(completeResponse.body.data.completedAt).toBeTruthy();

    const terminalUpdate = await request(app())
      .patch(`/api/v1/admin/site-visits/${completed.body.data.id}`)
      .set(authHeader(token))
      .send({ notes: "Should fail" })
      .expect(409);

    expect(terminalUpdate.body.code).toBe("SITE_VISIT_ALREADY_TERMINAL");

    const cancelled = await request(app()).post("/api/v1/admin/site-visits").set(authHeader(token)).send(await createSiteVisitPayload()).expect(201);
    const cancelResponse = await request(app())
      .post(`/api/v1/admin/site-visits/${cancelled.body.data.id}/cancel`)
      .set(authHeader(token))
      .send({ cancellationReason: "Client unavailable" })
      .expect(200);

    expect(cancelResponse.body.data.status).toBe("cancelled");
    expect(cancelResponse.body.data.cancelledAt).toBeTruthy();

    const noShow = await request(app()).post("/api/v1/admin/site-visits").set(authHeader(token)).send(await createSiteVisitPayload()).expect(201);
    const noShowResponse = await request(app())
      .post(`/api/v1/admin/site-visits/${noShow.body.data.id}/no-show`)
      .set(authHeader(token))
      .send({})
      .expect(200);

    expect(noShowResponse.body.data.status).toBe("no_show");

    const secondTerminalAction = await request(app())
      .post(`/api/v1/admin/site-visits/${noShow.body.data.id}/complete`)
      .set(authHeader(token))
      .send({})
      .expect(409);

    expect(secondTerminalAction.body.code).toBe("SITE_VISIT_ALREADY_TERMINAL");
  });

  it("exposes Site Visit permissions to Admin/Support but not Content Manager defaults", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);

    const response = await request(app()).get("/api/v1/admin/roles").set(authHeader(token)).expect(200);
    const admin = response.body.data.find((role) => role.key === STAFF_ROLES.ADMIN);
    const support = response.body.data.find((role) => role.key === STAFF_ROLES.ENQUIRY_SUPPORT);
    const content = response.body.data.find((role) => role.key === STAFF_ROLES.CONTENT_MANAGER);

    expect(admin.permissions).toEqual(expect.arrayContaining([PERMISSIONS.SITE_VISIT_VIEW, PERMISSIONS.SITE_VISIT_MANAGE]));
    expect(support.permissions).toEqual(expect.arrayContaining([PERMISSIONS.SITE_VISIT_VIEW, PERMISSIONS.SITE_VISIT_MANAGE]));
    expect(content.permissions).not.toContain(PERMISSIONS.SITE_VISIT_VIEW);
  });
});