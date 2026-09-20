import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../src/modules/audit/audit.constants.js";
import { AuditLog } from "../src/modules/audit/auditLog.model.js";
import { LOCATION_LEVELS, LOCATION_STATUSES } from "../src/modules/locations/location.constants.js";
import { Location } from "../src/modules/locations/location.model.js";
import {
  CURRENCIES,
  LAND_SIZE_UNITS,
  LAND_TYPES,
  PRICE_MODES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { Property } from "../src/modules/properties/property.model.js";
import {
  createPropertyDraft,
  publishProperty,
  restoreProperty,
  trashProperty,
  unpublishProperty,
  updateAdminProperty,
  updatePropertyExploreMap,
  updatePropertyFeatured,
  updatePropertyStatus,
} from "../src/modules/properties/property.service.js";
import { PropertyCodeCounter } from "../src/modules/properties/propertyCode.model.js";
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

const createStaffUser = async ({
  fullName = "Property Auditor",
  email = "owner@example.com",
  role = STAFF_ROLES.OWNER,
  status = STAFF_STATUSES.ACTIVE,
} = {}) =>
  User.create({
    fullName,
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

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const createLocationRecord = (input) =>
  Location.create({
    name: input.name,
    level: input.level,
    parent: input.parent ?? null,
    status: input.status ?? LOCATION_STATUSES.ACTIVE,
  });

const createLocationHierarchy = async () => {
  const province = await createLocationRecord({
    name: "Western Province",
    level: LOCATION_LEVELS.PROVINCE,
  });
  const district = await createLocationRecord({
    name: "Colombo District",
    level: LOCATION_LEVELS.DISTRICT,
    parent: province._id,
  });
  const city = await createLocationRecord({
    name: "Colombo City",
    level: LOCATION_LEVELS.CITY,
    parent: district._id,
  });
  const area = await createLocationRecord({
    name: "Colombo 03",
    level: LOCATION_LEVELS.AREA,
    parent: city._id,
  });

  return { province, district, city, area };
};

const publishableInput = async (overrides = {}) => {
  const { province, district, city, area } = await createLocationHierarchy();

  return {
    type: PROPERTY_TYPES.LAND,
    transactionTypes: [TRANSACTION_TYPES.SALE],
    title: "Audit Ready Land",
    description: "A complete land listing for audit integration tests.",
    location: {
      province: province._id.toString(),
      district: district._id.toString(),
      city: city._id.toString(),
      area: area._id.toString(),
      displayAddress: "Colombo 03, Colombo District, Western Province",
    },
    details: {
      land: {
        landSize: 12,
        landSizeUnit: LAND_SIZE_UNITS.PERCH,
        landType: LAND_TYPES.RESIDENTIAL,
      },
    },
    pricing: {
      currency: CURRENCIES.LKR,
      priceVisible: true,
      sale: {
        mode: PRICE_MODES.FIXED,
        amount: 25000000,
      },
    },
    map: {
      lat: 6.9271,
      lng: 79.8612,
    },
    ...overrides,
  };
};

const attachCoverImage = (propertyId, code = "LND-00001") =>
  Property.updateOne(
    { _id: propertyId },
    {
      $set: {
        "media.images": [
          {
            publicId: `landzo/properties/${code}/cover`,
            secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/cover.webp",
            width: 1200,
            height: 800,
            format: "webp",
            bytes: 12345,
            order: 0,
            isCover: true,
            uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
            originalFilename: "cover.webp",
          },
        ],
      },
    },
  );

const createCompleteProperty = async (actor, overrides = {}) => {
  const property = await createPropertyDraft({
    actorUserId: actor._id,
    input: await publishableInput(overrides),
  });

  await attachCoverImage(property.id, property.code);

  return property;
};

const latestAuditLog = () => AuditLog.findOne({}).sort({ createdAt: -1, _id: -1 }).lean();

const expectAuditLog = async ({ action, actor, property }) => {
  const auditLog = await latestAuditLog();

  expect(auditLog).toMatchObject({
    actor: actor._id,
    action,
    entityType: AUDIT_ENTITY_TYPES.PROPERTY,
    entityId: property.id ? expect.any(Object) : property._id,
    entityLabel: property.code,
  });
  expect(auditLog.entityId.toString()).toBe(property.id || property._id.toString());
};

describe("property audit integration", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
    await Location.init();
    await PropertyCodeCounter.init();
    await Property.init();
    await AuditLog.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("records successful property creation and update with safe labels", async () => {
    const actor = await createStaffUser();
    const property = await createPropertyDraft({
      actorUserId: actor._id,
      input: await publishableInput({ title: "Audit Created Land" }),
    });

    await expectAuditLog({
      action: AUDIT_ACTIONS.PROPERTY_CREATED,
      actor,
      property,
    });

    await AuditLog.deleteMany({});

    await updateAdminProperty({
      actorUserId: actor._id,
      propertyId: property.id,
      input: { title: "Audit Updated Land" },
    });

    const updated = await Property.findById(property.id).lean();
    await expectAuditLog({
      action: AUDIT_ACTIONS.PROPERTY_UPDATED,
      actor,
      property: updated,
    });
    expect(await AuditLog.countDocuments()).toBe(1);
  });

  it("records lifecycle property mutations only when state actually changes", async () => {
    const actor = await createStaffUser();
    const property = await createCompleteProperty(actor);
    await AuditLog.deleteMany({});

    await publishProperty({ actorUserId: actor._id, propertyId: property.id });
    await publishProperty({ actorUserId: actor._id, propertyId: property.id });
    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.PROPERTY_PUBLISHED })).toBe(1);

    await unpublishProperty({ actorUserId: actor._id, propertyId: property.id });
    await unpublishProperty({ actorUserId: actor._id, propertyId: property.id });
    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.PROPERTY_UNPUBLISHED })).toBe(1);

    await publishProperty({ actorUserId: actor._id, propertyId: property.id });
    await updatePropertyFeatured({ actorUserId: actor._id, propertyId: property.id, featured: true });
    await updatePropertyFeatured({ actorUserId: actor._id, propertyId: property.id, featured: true });
    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.PROPERTY_FEATURED_CHANGED })).toBe(1);

    await updatePropertyExploreMap({
      actorUserId: actor._id,
      propertyId: property.id,
      exploreMapEnabled: true,
    });
    await updatePropertyExploreMap({
      actorUserId: actor._id,
      propertyId: property.id,
      exploreMapEnabled: true,
    });
    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.PROPERTY_EXPLORE_MAP_CHANGED })).toBe(1);

    await updatePropertyStatus({
      actorUserId: actor._id,
      propertyId: property.id,
      status: PROPERTY_STATUSES.RESERVED,
    });
    await updatePropertyStatus({
      actorUserId: actor._id,
      propertyId: property.id,
      status: PROPERTY_STATUSES.RESERVED,
    });
    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.PROPERTY_STATUS_CHANGED })).toBe(1);

    await trashProperty({ actorUserId: actor._id, propertyId: property.id });
    await trashProperty({ actorUserId: actor._id, propertyId: property.id });
    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.PROPERTY_TRASHED })).toBe(1);

    await restoreProperty({ actorUserId: actor._id, propertyId: property.id });
    await restoreProperty({ actorUserId: actor._id, propertyId: property.id });
    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.PROPERTY_RESTORED })).toBe(1);
  });

  it("does not create audit logs for unauthorized or validation-failed property requests", async () => {
    const support = await createStaffUser({
      email: "support@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
    });
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const supportToken = await loginAs(support);
    const ownerToken = await loginAs(owner);

    await request(app())
      .post("/api/v1/admin/properties")
      .set(authHeader(supportToken))
      .send(await publishableInput({ title: "Unauthorized Create" }))
      .expect(403);

    await request(app())
      .post("/api/v1/admin/properties")
      .set(authHeader(ownerToken))
      .send({ type: PROPERTY_TYPES.LAND, transactionTypes: [], title: "x" })
      .expect(400);

    expect(await AuditLog.countDocuments()).toBe(0);
  });
});
