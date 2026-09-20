import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../src/modules/audit/audit.constants.js";
import { AuditLog } from "../src/modules/audit/auditLog.model.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import {
  PERMISSIONS,
  PERMISSION_VALUES,
} from "../src/modules/roles-permissions/permission.constants.js";
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_LABELS,
  SYSTEM_ROLE_KEYS,
} from "../src/modules/roles-permissions/role.constants.js";
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
const newPassword = "NewCorrectHorse123";

const createStaffUser = async ({
  fullName = "Landzo Staff",
  email = "staff@example.com",
  role = STAFF_ROLES.ADMIN,
  status = STAFF_STATUSES.ACTIVE,
  phone = "+94770000000",
} = {}) =>
  User.create({
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role,
    status,
  });

const app = () => createApp({ env: authTestEnv });

const getRefreshCookie = (response) =>
  (response.headers["set-cookie"] || []).find((cookie) =>
    cookie.startsWith("landzo_refresh_token="),
  );

const loginAs = async (user, customApp = app()) => {
  const response = await request(customApp)
    .post("/api/v1/admin/auth/login")
    .send({ email: user.email, password })
    .expect(200);

  return {
    token: response.body.data.accessToken,
    cookie: getRefreshCookie(response),
    response,
  };
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const expectNoSecurityFields = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).not.toContain("passwordhash");
  expect(serialized).not.toContain("initialpassword");
  expect(serialized).not.toContain("failedloginattempts");
  expect(serialized).not.toContain("loginlockeduntil");
  expect(serialized).not.toContain("authversion");
  expect(serialized).not.toContain("tokenhash");
};

describe("system roles and RBAC", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("creates missing system roles with conservative defaults", async () => {
    await Role.deleteMany({});

    await bootstrapSystemRoles();

    const roles = await Role.find({}).sort({ key: 1 });
    expect(roles).toHaveLength(SYSTEM_ROLE_KEYS.length);
    expect(roles.map((role) => role.key).sort()).toEqual([...SYSTEM_ROLE_KEYS].sort());
    expect(roles.find((role) => role.key === STAFF_ROLES.OWNER).permissions).toEqual(
      expect.arrayContaining(PERMISSION_VALUES),
    );
    expect(roles.find((role) => role.key === STAFF_ROLES.ADMIN).permissions).toEqual(
      DEFAULT_ROLE_PERMISSIONS[STAFF_ROLES.ADMIN],
    );
    expect(roles.find((role) => role.key === STAFF_ROLES.ADMIN).permissions).toContain(
      PERMISSIONS.MEDIA_VIEW,
    );
    expect(roles.find((role) => role.key === STAFF_ROLES.CONTENT_MANAGER).permissions).toContain(
      PERMISSIONS.MEDIA_VIEW,
    );
    expect(roles.find((role) => role.key === STAFF_ROLES.ENQUIRY_SUPPORT).permissions).not.toContain(
      PERMISSIONS.MEDIA_VIEW,
    );
  });

  it("preserves existing non-owner permissions during bootstrap", async () => {
    const customPermissions = [PERMISSIONS.ENQUIRY_VIEW];
    await Role.updateOne(
      { key: STAFF_ROLES.ADMIN },
      { $set: { name: ROLE_LABELS[STAFF_ROLES.ADMIN], permissions: customPermissions } },
    );

    await bootstrapSystemRoles();

    const adminRole = await Role.findOne({ key: STAFF_ROLES.ADMIN });
    expect(adminRole.permissions).toEqual(customPermissions);
  });

  it("treats Owner as all permissions and prevents reducing Owner permissions", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const { token } = await loginAs(owner);

    const meResponse = await request(app())
      .get("/api/v1/admin/auth/me")
      .set(authHeader(token))
      .expect(200);

    expect(meResponse.body.data.permissions).toEqual(expect.arrayContaining(PERMISSION_VALUES));

    const updateResponse = await request(app())
      .patch(`/api/v1/admin/roles/${STAFF_ROLES.OWNER}/permissions`)
      .set(authHeader(token))
      .send({ permissions: [PERMISSIONS.PROPERTY_VIEW] })
      .expect(403);

    expect(updateResponse.body).toMatchObject({ code: "OWNER_ROLE_IMMUTABLE" });
  });

  it("distinguishes unauthenticated 401 from authenticated unauthorized 403", async () => {
    const admin = await createStaffUser({ email: "admin@example.com", role: STAFF_ROLES.ADMIN });
    const { token } = await loginAs(admin);

    const unauthenticated = await request(app()).get("/api/v1/admin/users").expect(401);
    expect(unauthenticated.body).toMatchObject({ code: "AUTHENTICATION_REQUIRED" });

    const unauthorized = await request(app())
      .get("/api/v1/admin/users")
      .set(authHeader(token))
      .expect(403);
    expect(unauthorized.body).toMatchObject({ code: "FORBIDDEN" });
  });

  it("applies permission changes without waiting for access-token expiry", async () => {
    const admin = await createStaffUser({ email: "admin@example.com", role: STAFF_ROLES.ADMIN });
    const { token } = await loginAs(admin);

    await request(app()).get("/api/v1/admin/users").set(authHeader(token)).expect(403);

    await Role.updateOne(
      { key: STAFF_ROLES.ADMIN },
      { $set: { permissions: [PERMISSIONS.USER_MANAGE] } },
    );

    await request(app()).get("/api/v1/admin/users").set(authHeader(token)).expect(200);
  });

  it("lets role.manage users view and update non-owner role permissions", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const { token } = await loginAs(owner);

    const catalog = await request(app())
      .get("/api/v1/admin/roles/permissions")
      .set(authHeader(token))
      .expect(200);
    expect(catalog.body.data.administration).toContain(PERMISSIONS.ROLE_MANAGE);
    expect(catalog.body.data.media).toEqual([PERMISSIONS.MEDIA_VIEW]);

    const roleResponse = await request(app())
      .patch(`/api/v1/admin/roles/${STAFF_ROLES.CONTENT_MANAGER}/permissions`)
      .set(authHeader(token))
      .send({ permissions: [PERMISSIONS.BLOG_EDIT, PERMISSIONS.BLOG_EDIT] })
      .expect(200);

    expect(roleResponse.body.data.permissions).toEqual([PERMISSIONS.BLOG_EDIT]);

    const role = await Role.findOne({ key: STAFF_ROLES.CONTENT_MANAGER });
    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATED,
      entityId: role._id,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: owner._id,
      entityType: AUDIT_ENTITY_TYPES.ROLE,
      entityId: role._id,
      entityLabel: "Role",
    });
    expect(JSON.stringify(auditLog).toLowerCase()).not.toContain(PERMISSIONS.BLOG_EDIT);

    await request(app())
      .patch(`/api/v1/admin/roles/${STAFF_ROLES.CONTENT_MANAGER}/permissions`)
      .set(authHeader(token))
      .send({ permissions: [PERMISSIONS.BLOG_EDIT] })
      .expect(200);

    await expect(
      AuditLog.countDocuments({ action: AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATED }),
    ).resolves.toBe(1);
  });
});

describe("staff user management", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("allows an Owner to create staff safely", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const { token } = await loginAs(owner);

    const response = await request(app())
      .post("/api/v1/admin/users")
      .set(authHeader(token))
      .send({
        fullName: "Nimal Perera",
        email: "Nimal@Example.com",
        phone: "+94771111111",
        role: STAFF_ROLES.ADMIN,
        initialPassword: "InitialPass123",
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      fullName: "Nimal Perera",
      email: "nimal@example.com",
      role: STAFF_ROLES.ADMIN,
      status: STAFF_STATUSES.ACTIVE,
      createdBy: owner._id.toString(),
    });
    expectNoSecurityFields(response.body);

    const created = await User.findOne({ email: "nimal@example.com" }).select("+passwordHash");
    expect(created.passwordHash).not.toBe("InitialPass123");

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.USER_CREATED,
      entityId: created._id,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: owner._id,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: created._id,
      entityLabel: "User",
    });
    const serializedAudit = JSON.stringify(auditLog).toLowerCase();
    expect(serializedAudit).not.toContain("nimal@example.com");
    expect(serializedAudit).not.toContain("94771111111");
    expect(serializedAudit).not.toContain("initialpass123");
  });

  it("converts duplicate normalized email to a stable 409", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const { token } = await loginAs(owner);

    await createStaffUser({ email: "duplicate@example.com" });

    const response = await request(app())
      .post("/api/v1/admin/users")
      .set(authHeader(token))
      .send({
        fullName: "Duplicate User",
        email: "Duplicate@Example.com",
        role: STAFF_ROLES.ADMIN,
        initialPassword: "InitialPass123",
      })
      .expect(409);

    expect(response.body).toMatchObject({ code: "EMAIL_ALREADY_IN_USE" });
  });

  it("rejects invalid roles during staff creation", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const { token } = await loginAs(owner);

    await request(app())
      .post("/api/v1/admin/users")
      .set(authHeader(token))
      .send({
        fullName: "Invalid Role",
        email: "invalid@example.com",
        role: "customer",
        initialPassword: "InitialPass123",
      })
      .expect(400);
  });

  it("lists users with pagination, role filter, status filter, and search", async () => {
    const owner = await createStaffUser({
      fullName: "Owner One",
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });
    await createStaffUser({
      fullName: "Support Lead",
      email: "support@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
      status: STAFF_STATUSES.DISABLED,
      phone: "+94772222222",
    });
    await createStaffUser({
      fullName: "Content Editor",
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const { token } = await loginAs(owner);

    const response = await request(app())
      .get("/api/v1/admin/users?page=1&limit=1&role=enquiry_support&status=disabled&search=support")
      .set(authHeader(token))
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ email: "support@example.com" });
    expect(response.body.meta).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 });
    expectNoSecurityFields(response.body);
  });

  it("retrieves user details safely and returns 404 for missing users", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const staff = await createStaffUser({ email: "staff@example.com" });
    const { token } = await loginAs(owner);

    const response = await request(app())
      .get(`/api/v1/admin/users/${staff._id}`)
      .set(authHeader(token))
      .expect(200);
    expect(response.body.data).toMatchObject({
      id: staff._id.toString(),
      email: "staff@example.com",
    });
    expectNoSecurityFields(response.body);

    await request(app())
      .get("/api/v1/admin/users/000000000000000000000000")
      .set(authHeader(token))
      .expect(404);
  });

  it("updates only allowlisted profile fields and rejects mass assignment", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const staff = await createStaffUser({ email: "staff@example.com", role: STAFF_ROLES.ADMIN });
    const { token } = await loginAs(owner);

    await request(app())
      .patch(`/api/v1/admin/users/${staff._id}`)
      .set(authHeader(token))
      .send({ fullName: "Updated Staff", status: STAFF_STATUSES.DISABLED })
      .expect(400);

    const unchanged = await User.findById(staff._id);
    expect(unchanged.status).toBe(STAFF_STATUSES.ACTIVE);

    const response = await request(app())
      .patch(`/api/v1/admin/users/${staff._id}`)
      .set(authHeader(token))
      .send({ fullName: "Updated Staff", phone: null })
      .expect(200);

    expect(response.body.data).toMatchObject({ fullName: "Updated Staff", phone: null });

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityId: staff._id,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: owner._id,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: staff._id,
      entityLabel: "User",
    });
    expect(JSON.stringify(auditLog).toLowerCase()).not.toContain("staff@example.com");
  });

  it("invalidates existing sessions on role change and blocks non-owner promotion to Owner", async () => {
    await Role.updateOne(
      { key: STAFF_ROLES.ADMIN },
      { $set: { permissions: [PERMISSIONS.USER_MANAGE] } },
    );
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const admin = await createStaffUser({ email: "admin@example.com", role: STAFF_ROLES.ADMIN });
    const staff = await createStaffUser({
      email: "staff@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const { token: ownerToken } = await loginAs(owner);
    const { token: adminToken } = await loginAs(admin);
    const { token: staffToken, cookie: staffCookie } = await loginAs(staff);

    await request(app())
      .patch(`/api/v1/admin/users/${staff._id}/role`)
      .set(authHeader(adminToken))
      .send({ role: STAFF_ROLES.OWNER })
      .expect(403);

    await request(app())
      .patch(`/api/v1/admin/users/${staff._id}/role`)
      .set(authHeader(ownerToken))
      .send({ role: STAFF_ROLES.ENQUIRY_SUPPORT })
      .expect(200);

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityId: staff._id,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: owner._id,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: staff._id,
      entityLabel: "User",
    });

    await request(app()).get("/api/v1/admin/auth/me").set(authHeader(staffToken)).expect(401);
    await request(app()).post("/api/v1/admin/auth/refresh").set("Cookie", staffCookie).expect(401);
  });

  it("prevents removing the final active Owner through role or status changes", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const { token } = await loginAs(owner);

    await request(app())
      .patch(`/api/v1/admin/users/${owner._id}/role`)
      .set(authHeader(token))
      .send({ role: STAFF_ROLES.ADMIN })
      .expect(409);

    await request(app())
      .patch(`/api/v1/admin/users/${owner._id}/status`)
      .set(authHeader(token))
      .send({ status: STAFF_STATUSES.DISABLED })
      .expect(409);
  });

  it("blocks self-disable and revokes disabled user sessions", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const staff = await createStaffUser({ email: "staff@example.com", role: STAFF_ROLES.ADMIN });
    const { token: ownerToken } = await loginAs(owner);
    const { token: staffToken, cookie: staffCookie } = await loginAs(staff);

    await request(app())
      .patch(`/api/v1/admin/users/${owner._id}/status`)
      .set(authHeader(ownerToken))
      .send({ status: STAFF_STATUSES.DISABLED })
      .expect(409);

    await request(app())
      .patch(`/api/v1/admin/users/${staff._id}/status`)
      .set(authHeader(ownerToken))
      .send({ status: STAFF_STATUSES.DISABLED })
      .expect(200);

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
      entityId: staff._id,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: owner._id,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: staff._id,
      entityLabel: "User",
    });

    await request(app()).get("/api/v1/admin/auth/me").set(authHeader(staffToken)).expect(401);
    await request(app()).post("/api/v1/admin/auth/refresh").set("Cookie", staffCookie).expect(401);
    await request(app())
      .post("/api/v1/admin/auth/login")
      .send({ email: "staff@example.com", password })
      .expect(401);

    await request(app())
      .patch(`/api/v1/admin/users/${staff._id}/status`)
      .set(authHeader(ownerToken))
      .send({ status: STAFF_STATUSES.ACTIVE })
      .expect(200);
  });

  it("resets staff passwords safely and revokes existing sessions", async () => {
    await Role.updateOne(
      { key: STAFF_ROLES.ADMIN },
      { $set: { permissions: [PERMISSIONS.USER_MANAGE] } },
    );
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const admin = await createStaffUser({ email: "admin@example.com", role: STAFF_ROLES.ADMIN });
    const staff = await createStaffUser({
      email: "staff@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const { token: ownerToken } = await loginAs(owner);
    const { token: adminToken } = await loginAs(admin);
    const { token: staffToken, cookie: staffCookie } = await loginAs(staff);
    const before = await User.findById(staff._id).select("+passwordHash");

    await request(app())
      .patch(`/api/v1/admin/users/${owner._id}/reset-password`)
      .set(authHeader(adminToken))
      .send({ newPassword })
      .expect(403);

    const response = await request(app())
      .patch(`/api/v1/admin/users/${staff._id}/reset-password`)
      .set(authHeader(ownerToken))
      .send({ newPassword })
      .expect(200);

    expectNoSecurityFields(response.body);

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: owner._id,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: staff._id,
      entityLabel: "User",
    });
    expect(JSON.stringify(auditLog).toLowerCase()).not.toContain(newPassword.toLowerCase());

    const after = await User.findById(staff._id).select("+passwordHash");
    expect(after.passwordHash).not.toBe(before.passwordHash);

    await request(app()).get("/api/v1/admin/auth/me").set(authHeader(staffToken)).expect(401);
    await request(app()).post("/api/v1/admin/auth/refresh").set("Cookie", staffCookie).expect(401);
    await request(app())
      .post("/api/v1/admin/auth/login")
      .send({ email: "staff@example.com", password })
      .expect(401);
    await request(app())
      .post("/api/v1/admin/auth/login")
      .send({ email: "staff@example.com", password: newPassword })
      .expect(200);
  });
});

