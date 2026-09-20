import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { createApp } from "../src/app.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../src/modules/audit/audit.constants.js";
import { AuditLog } from "../src/modules/audit/auditLog.model.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import { PRIVATE_DOCUMENT_CATEGORIES, PRIVATE_DOCUMENT_STATUSES } from "../src/modules/private-documents/privateDocument.constants.js";
import { PrivateDocument } from "../src/modules/private-documents/privateDocument.model.js";
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

const password = "CorrectHorse123";
const app = () => createApp({ env: authTestEnv });
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const createStaffUser = async ({
  email = "staff@example.com",
  role = STAFF_ROLES.ADMIN,
  status = STAFF_STATUSES.ACTIVE,
} = {}) =>
  User.create({
    fullName: "Document Staff",
    email,
    phone: "+94770000000",
    passwordHash: await hashPassword(password),
    role,
    status,
  });

const loginAs = async (user) => {
  const response = await request(app())
    .post("/api/v1/admin/auth/login")
    .send({ email: user.email, password })
    .expect(200);

  return response.body.data.accessToken;
};

const createDocument = ({ createdBy, ...overrides } = {}) =>
  PrivateDocument.create({
    title: "Original Title",
    description: "Original description",
    category: PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
    entityId: null,
    storage: {
      publicId: "landzo/private-documents/test/document-1",
      resourceType: "raw",
      format: "pdf",
      bytes: 12345,
      mimeType: "application/pdf",
      originalFilename: "land-deed.pdf",
    },
    status: PRIVATE_DOCUMENT_STATUSES.ACTIVE,
    createdBy,
    ...overrides,
  });

describe("private document metadata edit", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
    await PrivateDocument.init();
    await AuditLog.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("requires privateDocument.manage", async () => {
    await Role.updateOne(
      { key: STAFF_ROLES.ADMIN },
      { $set: { permissions: [PERMISSIONS.PRIVATE_DOCUMENT_VIEW] } },
    );
    const staff = await createStaffUser({ email: "viewer@example.com" });
    const token = await loginAs(staff);
    const document = await createDocument({ createdBy: staff._id });

    await request(app())
      .patch(`/api/v1/admin/private-documents/${document._id}`)
      .set(authHeader(token))
      .send({ title: "Updated Title" })
      .expect(403);
  });

  it("updates title and description only, preserves storage/link fields, and writes safe audit", async () => {
    await Role.updateOne(
      { key: STAFF_ROLES.ADMIN },
      { $set: { permissions: [PERMISSIONS.PRIVATE_DOCUMENT_MANAGE, PERMISSIONS.PRIVATE_DOCUMENT_VIEW] } },
    );
    const staff = await createStaffUser({ email: "manager@example.com" });
    const token = await loginAs(staff);
    const document = await createDocument({ createdBy: staff._id });

    const response = await request(app())
      .patch(`/api/v1/admin/private-documents/${document._id}`)
      .set(authHeader(token))
      .send({
        title: "Updated Title",
        description: "Updated description",
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: document._id.toString(),
      title: "Updated Title",
      description: "Updated description",
      category: PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
      status: PRIVATE_DOCUMENT_STATUSES.ACTIVE,
      file: {
        originalFilename: "land-deed.pdf",
        format: "pdf",
        bytes: 12345,
      },
    });
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain("publicid");

    const stored = await PrivateDocument.findById(document._id).lean();
    expect(stored.storage).toMatchObject(document.storage.toObject());
    expect(stored.category).toBe(document.category);
    expect(stored.entityId).toBeNull();
    expect(stored.status).toBe(PRIVATE_DOCUMENT_STATUSES.ACTIVE);

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_UPDATED,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: staff._id,
      entityType: AUDIT_ENTITY_TYPES.PRIVATE_DOCUMENT,
      entityId: document._id,
      entityLabel: "Private Document",
    });
    const serializedAudit = JSON.stringify(auditLog).toLowerCase();
    expect(serializedAudit).not.toContain("updated title");
    expect(serializedAudit).not.toContain("updated description");
    expect(serializedAudit).not.toContain("land-deed.pdf");
  });

  it("rejects unknown or protected metadata mutation fields", async () => {
    await Role.updateOne(
      { key: STAFF_ROLES.ADMIN },
      { $set: { permissions: [PERMISSIONS.PRIVATE_DOCUMENT_MANAGE] } },
    );
    const staff = await createStaffUser({ email: "manager@example.com" });
    const token = await loginAs(staff);
    const document = await createDocument({ createdBy: staff._id });

    const protectedFields = [
      { category: PRIVATE_DOCUMENT_CATEGORIES.PROPERTY },
      { entityId: staff._id.toString() },
      { storage: { publicId: "changed" } },
      { publicId: "changed" },
      { resourceType: "image" },
      { mimeType: "image/png" },
      { filename: "changed.pdf" },
      { status: PRIVATE_DOCUMENT_STATUSES.DELETED },
      { createdBy: staff._id.toString() },
      { deletedBy: staff._id.toString() },
      { deletedAt: new Date().toISOString() },
      { createdAt: new Date().toISOString() },
      { updatedAt: new Date().toISOString() },
    ];

    for (const payload of protectedFields) {
      await request(app())
        .patch(`/api/v1/admin/private-documents/${document._id}`)
        .set(authHeader(token))
        .send(payload)
        .expect(400);
    }

    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it("returns the current safe DTO without audit for no-op metadata updates", async () => {
    await Role.updateOne(
      { key: STAFF_ROLES.ADMIN },
      { $set: { permissions: [PERMISSIONS.PRIVATE_DOCUMENT_MANAGE, PERMISSIONS.PRIVATE_DOCUMENT_VIEW] } },
    );
    const staff = await createStaffUser({ email: "manager@example.com" });
    const token = await loginAs(staff);
    const document = await createDocument({ createdBy: staff._id });

    const response = await request(app())
      .patch(`/api/v1/admin/private-documents/${document._id}`)
      .set(authHeader(token))
      .send({
        title: document.title,
        description: document.description,
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      title: document.title,
      description: document.description,
    });
    expect(await AuditLog.countDocuments()).toBe(0);
  });
});