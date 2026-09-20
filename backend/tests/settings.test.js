import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../src/modules/audit/audit.constants.js";
import { AuditLog } from "../src/modules/audit/auditLog.model.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { createAccessToken } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import { Role } from "../src/modules/roles-permissions/role.model.js";
import { bootstrapSystemRoles } from "../src/modules/roles-permissions/role.service.js";
import { Settings } from "../src/modules/settings/settings.model.js";
import { User } from "../src/modules/users/user.model.js";
import { authTestEnv } from "./helpers/authTestEnv.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from "./helpers/testDatabase.js";

const passwordHash = "$2b$12$RlOHATK6D2RhhS9tbYddFOT.S7FQ6vi/G6Ziq2YkbXTWVDIX5jg/q";
const app = () => createApp({ env: authTestEnv });
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const createStaffUser = async ({
  fullName = "Settings Staff",
  email = "settings@example.com",
  role = STAFF_ROLES.OWNER,
  status = STAFF_STATUSES.ACTIVE,
} = {}) =>
  User.create({
    fullName,
    email,
    phone: "+94770000000",
    passwordHash,
    role,
    status,
  });

const tokenFor = (user) => createAccessToken(user, authTestEnv);

const expectSafeSettingsPayload = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();

  expect(serialized).not.toContain("passwordhash");
  expect(serialized).not.toContain("authversion");
  expect(serialized).not.toContain("jwt");
  expect(serialized).not.toContain("cloudinary");
  expect(serialized).not.toContain("mongodb");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("metadata");
  expect(serialized).not.toContain("__v");
};

describe("admin settings API", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();

    await User.init();
    await RefreshSession.init();
    await Role.init();
    await Settings.init();
    await AuditLog.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("protects GET and PATCH with settings.manage only", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const admin = await createStaffUser({
      email: "admin@example.com",
      role: STAFF_ROLES.ADMIN,
    });
    const support = await createStaffUser({
      email: "support@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
    });
    const content = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });

    const ownerToken = tokenFor(owner);
    const adminToken = tokenFor(admin);
    const supportToken = tokenFor(support);
    const contentToken = tokenFor(content);

    await request(app()).get("/api/v1/admin/settings").expect(401);
    await request(app()).patch("/api/v1/admin/settings").send({}).expect(401);

    for (const token of [adminToken, supportToken, contentToken]) {
      await request(app()).get("/api/v1/admin/settings").set(authHeader(token)).expect(403);
      await request(app())
        .patch("/api/v1/admin/settings")
        .set(authHeader(token))
        .send({ business: { name: "Denied" } })
        .expect(403);
    }

    await request(app()).get("/api/v1/admin/settings").set(authHeader(ownerToken)).expect(200);
  });

  it("initializes safe defaults and does not duplicate the singleton", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = tokenFor(owner);

    const first = await request(app())
      .get("/api/v1/admin/settings")
      .set(authHeader(token))
      .expect(200);

    expect(first.body.data).toMatchObject({
      business: {
        name: "",
        email: "",
        phone: "",
        whatsapp: "",
        address: "",
      },
      social: {
        facebook: "",
        instagram: "",
        linkedin: "",
        youtube: "",
      },
      website: {
        defaultMetaTitle: "",
        defaultMetaDescription: "",
      },
      updatedBy: null,
    });
    expect(first.body.data.key).toBeUndefined();
    expectSafeSettingsPayload(first.body);

    await request(app()).get("/api/v1/admin/settings").set(authHeader(token)).expect(200);

    expect(await Settings.countDocuments()).toBe(1);
  });

  it("merges partial business, social, and website updates while preserving unrelated values", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      fullName: "Settings Owner",
    });
    const token = tokenFor(owner);

    const firstPatch = await request(app())
      .patch("/api/v1/admin/settings")
      .set(authHeader(token))
      .send({
        business: {
          name: "LANDZO",
          email: "hello@landzo.test",
          phone: "+94112223344",
          whatsapp: "+94712223344",
          address: "Colombo, Sri Lanka",
        },
        social: {
          facebook: "https://facebook.com/landzo",
          instagram: "https://instagram.com/landzo",
        },
        website: {
          defaultMetaTitle: "LANDZO Properties",
          defaultMetaDescription: "Sri Lankan property discovery.",
        },
      })
      .expect(200);

    expect(firstPatch.body.data).toMatchObject({
      business: {
        name: "LANDZO",
        email: "hello@landzo.test",
        phone: "+94112223344",
        whatsapp: "+94712223344",
        address: "Colombo, Sri Lanka",
      },
      social: {
        facebook: "https://facebook.com/landzo",
        instagram: "https://instagram.com/landzo",
        linkedin: "",
        youtube: "",
      },
      website: {
        defaultMetaTitle: "LANDZO Properties",
        defaultMetaDescription: "Sri Lankan property discovery.",
      },
      updatedBy: {
        id: owner._id.toString(),
        fullName: "Settings Owner",
      },
    });

    const secondPatch = await request(app())
      .patch("/api/v1/admin/settings")
      .set(authHeader(token))
      .send({
        business: { phone: "+94115556666" },
        social: { youtube: "https://youtube.com/@landzo" },
      })
      .expect(200);

    expect(secondPatch.body.data.business).toMatchObject({
      name: "LANDZO",
      email: "hello@landzo.test",
      phone: "+94115556666",
      whatsapp: "+94712223344",
      address: "Colombo, Sri Lanka",
    });
    expect(secondPatch.body.data.social).toMatchObject({
      facebook: "https://facebook.com/landzo",
      instagram: "https://instagram.com/landzo",
      youtube: "https://youtube.com/@landzo",
    });
    expect(secondPatch.body.data.website.defaultMetaTitle).toBe("LANDZO Properties");
    expect(await Settings.countDocuments()).toBe(1);
    expectSafeSettingsPayload(secondPatch.body);
  });

  it("rejects invalid and forbidden settings fields", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = tokenFor(owner);

    const invalidPayloads = [
      { business: { email: "not-an-email" } },
      { social: { facebook: "not-a-url" } },
      { business: { name: "x".repeat(161) } },
      { website: { defaultMetaDescription: "x".repeat(501) } },
      { key: "other" },
      { updatedBy: owner._id.toString() },
      { createdAt: new Date().toISOString() },
      { updatedAt: new Date().toISOString() },
      { permissions: ["settings.manage"] },
      { metadata: { theme: "dark" } },
      { config: { NODE_ENV: "production" } },
      { secrets: { CLOUDINARY_API_SECRET: "secret" } },
      { business: { unknown: "value" } },
      { social: { tiktok: "https://example.com" } },
      { website: { robots: "index" } },
    ];

    for (const payload of invalidPayloads) {
      await request(app())
        .patch("/api/v1/admin/settings")
        .set(authHeader(token))
        .send(payload)
        .expect(400);
    }

    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it("audits successful updates without leaking settings values", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = tokenFor(owner);

    await request(app())
      .patch("/api/v1/admin/settings")
      .set(authHeader(token))
      .send({
        business: {
          email: "private@landzo.test",
          phone: "+94117778888",
          whatsapp: "+94717778888",
          address: "Sensitive address",
        },
        social: {
          linkedin: "https://linkedin.com/company/landzo-private",
        },
      })
      .expect(200);

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: owner._id,
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.SETTINGS,
      entityLabel: "Settings",
    });

    const serialized = JSON.stringify(auditLog);
    expect(serialized).not.toContain("private@landzo.test");
    expect(serialized).not.toContain("+94117778888");
    expect(serialized).not.toContain("+94717778888");
    expect(serialized).not.toContain("Sensitive address");
    expect(serialized).not.toContain("landzo-private");
  });

  it("creates no audit for unauthorized requests and does not expose POST or DELETE routes", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const admin = await createStaffUser({
      email: "admin@example.com",
      role: STAFF_ROLES.ADMIN,
    });
    const ownerToken = tokenFor(owner);
    const adminToken = tokenFor(admin);

    await request(app())
      .patch("/api/v1/admin/settings")
      .set(authHeader(adminToken))
      .send({ business: { name: "Denied" } })
      .expect(403);

    expect(await AuditLog.countDocuments()).toBe(0);

    await request(app())
      .post("/api/v1/admin/settings")
      .set(authHeader(ownerToken))
      .send({ business: { name: "No Post" } })
      .expect(404);

    await request(app())
      .delete("/api/v1/admin/settings")
      .set(authHeader(ownerToken))
      .expect(404);
  });
});