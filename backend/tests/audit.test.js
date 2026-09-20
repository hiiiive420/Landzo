import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AUDIT_LIMITS,
} from "../src/modules/audit/audit.constants.js";
import { recordAuditLog } from "../src/modules/audit/audit.service.js";
import { AuditLog } from "../src/modules/audit/auditLog.model.js";

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
const objectId = () => new mongoose.Types.ObjectId();

const createStaffUser = async ({
  fullName = "Audit Staff",
  email,
  role = STAFF_ROLES.ADMIN,
  phone = "+94770000000",
} = {}) =>
  User.create({
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role,
    status: STAFF_STATUSES.ACTIVE,
  });

const loginAs = async (user) => {
  const response = await request(app())
    .post("/api/v1/admin/auth/login")
    .send({ email: user.email, password })
    .expect(200);

  return response.body.data.accessToken;
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const createAuditEntry = async ({
  actor,
  action = AUDIT_ACTIONS.PROPERTY_CREATED,
  entityType = AUDIT_ENTITY_TYPES.PROPERTY,
  entityId = objectId(),
  entityLabel = "LND-00001",
  createdAt = "2026-01-10T10:00:00.000Z",
} = {}) => {
  const auditLog = await AuditLog.create({
    actor: actor._id,
    action,
    entityType,
    entityId,
    entityLabel,
  });

  await AuditLog.collection.updateOne(
    {
      _id: auditLog._id,
    },
    {
      $set: {
        createdAt: new Date(createdAt),
      },
    },
  );

  return AuditLog.findById(
    auditLog._id,
  );
};

const seedAuditEntries = async () => {
  const firstActor = await createStaffUser({
    email: "audit-owner@example.com",
    fullName: "Audit Owner",
    role: STAFF_ROLES.OWNER,
  });
  const secondActor = await createStaffUser({
    email: "audit-admin@example.com",
    fullName: "Audit Admin",
    role: STAFF_ROLES.ADMIN,
  });
  const firstPropertyId = objectId();
  const secondPropertyId = objectId();

  await createAuditEntry({
    actor: firstActor,
    action: AUDIT_ACTIONS.PROPERTY_CREATED,
    entityType: AUDIT_ENTITY_TYPES.PROPERTY,
    entityId: firstPropertyId,
    entityLabel: "LND-00001",
    createdAt: "2026-01-10T08:00:00.000Z",
  });
  await createAuditEntry({
    actor: firstActor,
    action: AUDIT_ACTIONS.PROPERTY_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.PROPERTY,
    entityId: secondPropertyId,
    entityLabel: "LND-00002",
    createdAt: "2026-01-10T23:59:59.000Z",
  });
  await createAuditEntry({
    actor: secondActor,
    action: AUDIT_ACTIONS.BLOG_CREATED,
    entityType: AUDIT_ENTITY_TYPES.BLOG,
    entityId: objectId(),
    entityLabel: "Market Guide",
    createdAt: "2026-01-11T00:00:00.000Z",
  });
  await createAuditEntry({
    actor: secondActor,
    action: AUDIT_ACTIONS.PROPERTY_FEATURED_CHANGED,
    entityType: AUDIT_ENTITY_TYPES.PROPERTY,
    entityId: objectId(),
    entityLabel: "Literal .* Search",
    createdAt: "2026-01-12T00:00:00.000Z",
  });

  return { firstActor, secondActor, firstPropertyId, secondPropertyId };
};

const getAuditLogs = (token, query = {}) =>
  request(app()).get("/api/v1/admin/audit-logs").query(query).set(authHeader(token));

const expectSafeAuditPayload = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).not.toContain("email");
  expect(serialized).not.toContain("phone");
  expect(serialized).not.toContain("role");
  expect(serialized).not.toContain("passwordhash");
  expect(serialized).not.toContain("authversion");
  expect(serialized).not.toContain("failedloginattempts");
  expect(serialized).not.toContain("loginlockeduntil");
  expect(serialized).not.toContain("__v");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("cookie");
};

describe("admin audit logs API", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
    await AuditLog.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("requires authentication", async () => {
    const response = await request(app()).get("/api/v1/admin/audit-logs").expect(401);

    expect(response.body).toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("enforces audit.view using default role permissions", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const admin = await createStaffUser({ email: "admin@example.com", role: STAFF_ROLES.ADMIN });
    const support = await createStaffUser({
      email: "support@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
    });
    const contentManager = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });

    await getAuditLogs(await loginAs(owner)).expect(200);
    await getAuditLogs(await loginAs(admin)).expect(200);
    await getAuditLogs(await loginAs(support)).expect(403);
    await getAuditLogs(await loginAs(contentManager)).expect(403);
  });

  it("is read-only over HTTP", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);

    await getAuditLogs(token).expect(200);

    for (const method of ["post", "patch", "put", "delete"]) {
      const response = await request(app())
        [method]("/api/v1/admin/audit-logs")
        .set(authHeader(token))
        .send({ action: AUDIT_ACTIONS.PROPERTY_CREATED })
        .expect(404);

      expect(response.body).toMatchObject({ code: "ROUTE_NOT_FOUND" });
    }
  });

  it("serializes only approved audit fields", async () => {
    const { firstActor } = await seedAuditEntries();
    const token = await loginAs(firstActor);

    const response = await getAuditLogs(token, { limit: 1, search: "LND-00001" }).expect(200);
    const item = response.body.data[0];

    expect(Object.keys(item).sort()).toEqual([
      "action",
      "actor",
      "createdAt",
      "entityId",
      "entityLabel",
      "entityType",
      "id",
    ]);
    expect(Object.keys(item.actor).sort()).toEqual(["fullName", "id"]);
    expect(item).toMatchObject({
      actor: {
        id: firstActor._id.toString(),
        fullName: "Audit Owner",
      },
      action: AUDIT_ACTIONS.PROPERTY_CREATED,
      entityType: AUDIT_ENTITY_TYPES.PROPERTY,
      entityLabel: "LND-00001",
    });
    expectSafeAuditPayload(response.body);
  });

  it("filters and paginates audit logs deterministically", async () => {
    const { firstActor, secondActor, firstPropertyId, secondPropertyId } = await seedAuditEntries();
    const token = await loginAs(firstActor);

    const paged = await getAuditLogs(token, { page: 2, limit: 2 }).expect(200);
    expect(paged.body.meta).toMatchObject({ page: 2, limit: 2, total: 4, totalPages: 2 });
    expect(paged.body.data).toHaveLength(2);

    const actorFiltered = await getAuditLogs(token, { actorId: firstActor._id.toString() }).expect(200);
    expect(actorFiltered.body.meta.total).toBe(2);

    const actionFiltered = await getAuditLogs(token, {
      action: AUDIT_ACTIONS.PROPERTY_UPDATED,
    }).expect(200);
    expect(actionFiltered.body.data).toHaveLength(1);
    expect(actionFiltered.body.data[0].entityId).toBe(secondPropertyId.toString());

    const entityTypeFiltered = await getAuditLogs(token, {
      entityType: AUDIT_ENTITY_TYPES.BLOG,
    }).expect(200);
    expect(entityTypeFiltered.body.data).toHaveLength(1);
    expect(entityTypeFiltered.body.data[0].actor.id).toBe(secondActor._id.toString());

    const entityIdFiltered = await getAuditLogs(token, {
      entityId: firstPropertyId.toString(),
    }).expect(200);
    expect(entityIdFiltered.body.data).toHaveLength(1);
    expect(entityIdFiltered.body.data[0].entityLabel).toBe("LND-00001");

    const endDateFiltered = await getAuditLogs(token, {
      startDate: "2026-01-10",
      endDate: "2026-01-10",
    }).expect(200);
    expect(endDateFiltered.body.meta.total).toBe(2);
    expect(endDateFiltered.body.data.map((item) => item.entityLabel).sort()).toEqual([
      "LND-00001",
      "LND-00002",
    ]);

    const escapedSearch = await getAuditLogs(token, { search: ".*" }).expect(200);
    expect(escapedSearch.body.meta.total).toBe(1);
    expect(escapedSearch.body.data[0].entityLabel).toBe("Literal .* Search");
  });

  it("rejects invalid or unknown filters", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);

    const invalidQueries = [
      { unknown: "field" },
      { actorId: "invalid" },
      { entityId: "invalid" },
      { action: "property.deleted" },
      { entityType: "secret" },
      { startDate: "2026-2-01" },
      { endDate: "2026-02-31" },
      { startDate: "2026-01-11", endDate: "2026-01-10" },
    ];

    for (const query of invalidQueries) {
      const response = await getAuditLogs(token, query).expect(400);
      expect(response.body).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
});

describe("audit log write service", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await AuditLog.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("requires an actor and approved action/entity values", async () => {
    const actor = await createStaffUser({ email: "actor@example.com" });

    await expect(
      recordAuditLog({
        action: AUDIT_ACTIONS.PROPERTY_CREATED,
        entityType: AUDIT_ENTITY_TYPES.PROPERTY,
      }),
    ).rejects.toMatchObject({ code: "AUDIT_ACTOR_REQUIRED" });

    await expect(
      recordAuditLog({
        actorUserId: actor._id,
        action: "property.secret",
        entityType: AUDIT_ENTITY_TYPES.PROPERTY,
      }),
    ).rejects.toMatchObject({ code: "AUDIT_ACTION_INVALID" });

    await expect(
      recordAuditLog({
        actorUserId: actor._id,
        action: AUDIT_ACTIONS.PROPERTY_CREATED,
        entityType: "secret",
      }),
    ).rejects.toMatchObject({ code: "AUDIT_ENTITY_TYPE_INVALID" });
  });

  it("records only approved fields and safely normalizes labels", async () => {
    const actor = await createStaffUser({ email: "actor@example.com" });
    const longLabel = `  ${"L".repeat(AUDIT_LIMITS.entityLabelMaxLength + 20)}  `;

    const auditLog = await recordAuditLog({
      actorUserId: actor._id,
      action: AUDIT_ACTIONS.PROPERTY_CREATED,
      entityType: AUDIT_ENTITY_TYPES.PROPERTY,
      entityLabel: longLabel,
    });

    const stored = await AuditLog.findById(auditLog._id).lean();

    expect(stored).toMatchObject({
      actor: actor._id,
      action: AUDIT_ACTIONS.PROPERTY_CREATED,
      entityType: AUDIT_ENTITY_TYPES.PROPERTY,
      entityId: null,
    });
    expect(stored.entityLabel).toHaveLength(AUDIT_LIMITS.entityLabelMaxLength);
    expect(Object.keys(stored).sort()).toEqual([
      "_id",
      "action",
      "actor",
      "createdAt",
      "entityId",
      "entityLabel",
      "entityType",
    ]);
  });
});

