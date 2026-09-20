import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { Enquiry } from "../src/modules/enquiries/enquiry.model.js";
import { NOTIFICATION_TYPES } from "../src/modules/notifications/notification.constants.js";
import { Notification } from "../src/modules/notifications/notification.model.js";
import * as notificationService from "../src/modules/notifications/notification.service.js";
import { Property } from "../src/modules/properties/property.model.js";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { PERMISSIONS } from "../src/modules/roles-permissions/permission.constants.js";
import { Role } from "../src/modules/roles-permissions/role.model.js";
import { bootstrapSystemRoles } from "../src/modules/roles-permissions/role.service.js";
import { createSiteVisit as createSiteVisitService } from "../src/modules/site-visits/siteVisit.service.js";
import { User } from "../src/modules/users/user.model.js";
import { authTestEnv } from "./helpers/authTestEnv.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from "./helpers/testDatabase.js";

const app = () => createApp({ env: authTestEnv });
const password = "Password12345!";
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

const createProperty = async (overrides = {}) =>
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
    message: "Interested in the property",
    source: "admin",
    status: "new",
    ...overrides,
  });

beforeAll(connectTestDatabase);

beforeEach(async () => {
  await resetTestDatabase();
  await bootstrapSystemRoles();
});

afterAll(async () => {
  await clearTestDatabase();
  await disconnectTestDatabase();
});

describe("admin notifications API", () => {
  it("requires authentication and rejects unsupported notification methods", async () => {
    const user = await createStaffUser({ email: "auth-check@example.com" });
    const token = await loginAs(user);

    await request(app()).get("/api/v1/admin/notifications").expect(401);
    await request(app()).patch("/api/v1/admin/notifications/507f1f77bcf86cd799439011/read").expect(401);
    await request(app()).post("/api/v1/admin/notifications").set(authHeader(token)).send({}).expect(404);
    await request(app()).delete("/api/v1/admin/notifications/507f1f77bcf86cd799439011").set(authHeader(token)).expect(404);
  });

  it("lists, paginates, filters, and counts unread notifications for the authenticated staff user", async () => {
    const user = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(user);

    const objectId = (await import("mongoose")).Types.ObjectId;
    await Notification.create([
      {
        recipient: user._id,
        type: "enquiry.assigned",
        title: "Enquiry assigned",
        message: "An enquiry was assigned to you.",
        entityType: "enquiry",
        entityId: new objectId(),
      },
      {
        recipient: user._id,
        type: "site_visit.assigned",
        title: "Site visit assigned",
        message: "A site visit was assigned to you.",
        entityType: "site_visit",
        entityId: new objectId(),
      },
      {
        recipient: user._id,
        type: "site_visit.updated",
        title: "Site visit updated",
        message: "A site visit schedule was updated.",
        entityType: "site_visit",
        entityId: new objectId(),
        readAt: new Date(),
      },
    ]);

    const listResponse = await request(app())
      .get("/api/v1/admin/notifications")
      .query({ page: 1, limit: 2, status: "all" })
      .set(authHeader(token))
      .expect(200);

    expect(listResponse.body.data).toHaveLength(2);
    expect(listResponse.body.meta).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const unreadResponse = await request(app())
      .get("/api/v1/admin/notifications")
      .query({ status: "unread" })
      .set(authHeader(token))
      .expect(200);

    expect(unreadResponse.body.data).toHaveLength(2);

    const readResponse = await request(app())
      .get("/api/v1/admin/notifications")
      .query({ status: "read" })
      .set(authHeader(token))
      .expect(200);

    expect(readResponse.body.data).toHaveLength(1);

    const countResponse = await request(app())
      .get("/api/v1/admin/notifications/unread-count")
      .set(authHeader(token))
      .expect(200);

    expect(countResponse.body.data).toMatchObject({ count: 2 });
  });

  it("marks a notification read and marks all notifications read for the current user only", async () => {
    const user = await createStaffUser({ email: "reader@example.com" });
    const token = await loginAs(user);

    const objectId = (await import("mongoose")).Types.ObjectId;
    const notification = await Notification.create({
      recipient: user._id,
      type: "enquiry.assigned",
      title: "Enquiry assigned",
      message: "An enquiry was assigned to you.",
      entityType: "enquiry",
      entityId: new objectId(),
    });

    const readResponse = await request(app())
      .patch(`/api/v1/admin/notifications/${notification._id}/read`)
      .set(authHeader(token))
      .expect(200);

    expect(readResponse.body.data.isRead).toBe(true);
    expect(readResponse.body.data.readAt).toBeTruthy();

    const second = await Notification.create({
      recipient: user._id,
      type: "site_visit.updated",
      title: "Site visit updated",
      message: "A site visit schedule was updated.",
      entityType: "site_visit",
      entityId: new objectId(),
    });

    const readAllResponse = await request(app())
      .patch("/api/v1/admin/notifications/read-all")
      .set(authHeader(token))
      .expect(200);

    expect(readAllResponse.body.data).toMatchObject({ count: 0 });

    const finalList = await request(app())
      .get("/api/v1/admin/notifications")
      .query({ status: "unread" })
      .set(authHeader(token))
      .expect(200);

    expect(finalList.body.data).toHaveLength(0);
    const secondItem = await Notification.findById(second._id);
    expect(secondItem.readAt).toBeTruthy();
  });

  it("rejects another user's notification access and rejects invalid request payloads", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const other = await createStaffUser({ email: "other@example.com" });
    const ownerToken = await loginAs(owner);
    const otherToken = await loginAs(other);

    const notification = await Notification.create({
      recipient: owner._id,
      type: "site_visit.assigned",
      title: "Site visit assigned",
      message: "A site visit was assigned to you.",
      entityType: "site_visit",
      entityId: new (await import("mongoose")).Types.ObjectId(),
    });

    await request(app())
      .patch(`/api/v1/admin/notifications/${notification._id}/read`)
      .set(authHeader(otherToken))
      .expect(404);

    await request(app())
      .get("/api/v1/admin/notifications")
      .query({ status: "not-valid", recipientId: owner._id.toString() })
      .set(authHeader(ownerToken))
      .expect(400);

    await request(app())
      .patch("/api/v1/admin/notifications/read-all")
      .set(authHeader(ownerToken))
      .send({ recipientId: owner._id.toString() })
      .expect(400);
  });

  it("creates assignment notifications and keeps them generic without PII leakage", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const assignee = await createStaffUser({ email: "agent@example.com" });
    const ownerToken = await loginAs(owner);
    const assigneeToken = await loginAs(assignee);

    const property = await createProperty();
    const enquiry = await createEnquiry({
      property: property._id,
      assignedTo: null,
      createdBy: owner._id,
      updatedBy: owner._id,
    });

    await request(app())
      .patch(`/api/v1/admin/enquiries/${enquiry._id}/assign`)
      .set(authHeader(ownerToken))
      .send({ assignedTo: assignee._id.toString() })
      .expect(200);

    const createdNotification = await Notification.findOne({
      recipient: assignee._id,
      type: "enquiry.assigned",
    }).lean();

    expect(createdNotification).toMatchObject({
      type: "enquiry.assigned",
      entityType: "enquiry",
    });
    expect(createdNotification.title).toBe("Enquiry assigned");
    expect(createdNotification.message).toBe("An enquiry was assigned to you.");

    const notificationList = await request(app())
      .get("/api/v1/admin/notifications")
      .set(authHeader(assigneeToken))
      .expect(200);

    const raw = JSON.stringify(notificationList.body);
    expect(raw).not.toContain("nimal@example.com");
    expect(raw).not.toContain("+94770000000");
    expect(raw).not.toContain("Interested in the property");

    const createdSiteVisit = await createSiteVisitService({
      payload: {
        propertyId: property._id.toString(),
        visitorName: "Nimal Perera",
        visitorEmail: "nimal@example.com",
        visitorPhone: "+94770000000",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        assignedTo: assignee._id.toString(),
      },
      actorUserId: owner._id,
    });

    const siteVisitNotification = await Notification.findOne({
      recipient: assignee._id,
      type: "site_visit.assigned",
      entityId: createdSiteVisit.id,
    }).lean();

    expect(siteVisitNotification).toBeTruthy();
  });

  it("does not create misleading notifications on no-op or failed updates", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const assignee = await createStaffUser({ email: "agent@example.com" });
    const token = await loginAs(owner);

    const property = await createProperty();
    const enquiry = await createEnquiry({
      property: property._id,
      assignedTo: assignee._id,
      createdBy: owner._id,
      updatedBy: owner._id,
    });

    const notificationSpy = vi.spyOn(notificationService, "createNotificationSafely");

    await request(app())
      .patch(`/api/v1/admin/enquiries/${enquiry._id}/assign`)
      .set(authHeader(token))
      .send({ assignedTo: assignee._id.toString() })
      .expect(200);

    expect(notificationSpy).not.toHaveBeenCalled();

    vi.spyOn(notificationService, "createNotification").mockRejectedValue(new Error("notification db failure"));

    const siteVisit = await createSiteVisitService({
      payload: {
        propertyId: property._id.toString(),
        visitorName: "Nimal Perera",
        visitorEmail: "nimal@example.com",
        visitorPhone: "+94770000000",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        assignedTo: assignee._id.toString(),
      },
      actorUserId: owner._id,
    });

    const response = await request(app())
      .patch(`/api/v1/admin/site-visits/${siteVisit.id}`)
      .set(authHeader(token))
      .send({ scheduledAt: new Date(Date.now() + 172800000).toISOString() })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("scheduled");
  });

  it("notifies active enquiry.view staff for public enquiries without leaking PII", async () => {
    await Role.updateOne(
      { key: STAFF_ROLES.ENQUIRY_SUPPORT },
      { $set: { permissions: [PERMISSIONS.ENQUIRY_VIEW] } },
    );
    await Role.updateOne(
      { key: STAFF_ROLES.CONTENT_MANAGER },
      { $set: { permissions: [] } },
    );

    const recipient = await createStaffUser({
      email: "recipient@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
    });
    const disabledRecipient = await createStaffUser({
      email: "disabled@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
      status: STAFF_STATUSES.DISABLED,
    });
    const nonPermitted = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });

    await request(app())
      .post("/api/v1/enquiries")
      .send({
        fullName: "Sensitive Visitor",
        email: "visitor@example.com",
        phone: "+94770000001",
        message: "Please call me about this property",
      })
      .expect(201);

    const notifications = await Notification.find({
      type: NOTIFICATION_TYPES.ENQUIRY_NEW,
    }).lean();

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      recipient: recipient._id,
      title: "New enquiry received",
      message: "A new enquiry requires attention.",
      entityType: "enquiry",
    });
    expect(notifications[0].recipient.toString()).not.toBe(disabledRecipient._id.toString());
    expect(notifications[0].recipient.toString()).not.toBe(nonPermitted._id.toString());

    const serialized = JSON.stringify(notifications).toLowerCase();
    expect(serialized).not.toContain("sensitive visitor");
    expect(serialized).not.toContain("visitor@example.com");
    expect(serialized).not.toContain("+94770000001");
    expect(serialized).not.toContain("please call me");
  });

  it("keeps persisted public enquiries successful when new-enquiry notification writes fail", async () => {
    await Role.updateOne(
      { key: STAFF_ROLES.ENQUIRY_SUPPORT },
      { $set: { permissions: [PERMISSIONS.ENQUIRY_VIEW] } },
    );
    await createStaffUser({
      email: "recipient@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
    });

    vi.spyOn(Notification, "create").mockRejectedValueOnce(new Error("notification unavailable"));

    await request(app())
      .post("/api/v1/enquiries")
      .send({
        fullName: "Public Visitor",
        email: "visitor@example.com",
      })
      .expect(201);

    expect(await Enquiry.countDocuments()).toBe(1);
  });

  it("does not create new-enquiry notifications for failed public submissions", async () => {
    await Role.updateOne(
      { key: STAFF_ROLES.ENQUIRY_SUPPORT },
      { $set: { permissions: [PERMISSIONS.ENQUIRY_VIEW] } },
    );
    await createStaffUser({
      email: "recipient@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
    });

    await request(app())
      .post("/api/v1/enquiries")
      .send({
        fullName: "Public Visitor",
      })
      .expect(400);

    expect(await Notification.countDocuments()).toBe(0);
  });
});
