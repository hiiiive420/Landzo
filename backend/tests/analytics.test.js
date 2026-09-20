import mongoose from "mongoose";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import {
  ANALYTICS_CONTEXT_SURFACES,
  ANALYTICS_EVENT_TYPES,
  ANALYTICS_RANGES,
} from "../src/modules/analytics/analytics.constants.js";
import {
  getAnalyticsSummary,
} from "../src/modules/analytics/analytics.service.js";
import { AnalyticsEvent } from "../src/modules/analytics/analyticsEvent.model.js";
import { SearchInsight } from "../src/modules/analytics/searchInsight.model.js";
import { Enquiry } from "../src/modules/enquiries/enquiry.model.js";
import { LOCATION_LEVELS, LOCATION_STATUSES } from "../src/modules/locations/location.constants.js";
import { Location } from "../src/modules/locations/location.model.js";
import {
  CURRENCIES,
  PRICE_MODES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { Property } from "../src/modules/properties/property.model.js";
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

const createStaffUser = async ({
  email,
  role = STAFF_ROLES.ADMIN,
} = {}) =>
  User.create({
    fullName: "Analytics Staff",
    email,
    phone: "+94770000000",
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

const grantRolePermissions = (role, permissions) =>
  Role.updateOne({ key: role }, { $set: { permissions } });

const createLocationHierarchy = async (suffix = "") => {
  const slugSuffix = suffix.toLowerCase().replaceAll(" ", "-");
  const province = await Location.create({
    name: `Western Province${suffix}`,
    slug: `western-province${slugSuffix}`,
    level: LOCATION_LEVELS.PROVINCE,
    parent: null,
    status: LOCATION_STATUSES.ACTIVE,
  });
  const district = await Location.create({
    name: `Colombo District${suffix}`,
    slug: `colombo-district${slugSuffix}`,
    level: LOCATION_LEVELS.DISTRICT,
    parent: province._id,
    status: LOCATION_STATUSES.ACTIVE,
  });
  const city = await Location.create({
    name: `Colombo${suffix}`,
    slug: `colombo${slugSuffix}`,
    level: LOCATION_LEVELS.CITY,
    parent: district._id,
    status: LOCATION_STATUSES.ACTIVE,
  });

  return { province, district, city };
};

const createProperty = async ({
  code = "LND-92001",
  title = "Analytics Land",
  type = PROPERTY_TYPES.LAND,
  transactionTypes = [TRANSACTION_TYPES.SALE],
  isPublic = true,
  deletedAt = null,
  location = {},
  pricing = null,
} = {}) =>
  Property.create({
    code,
    type,
    transactionTypes,
    status: PROPERTY_STATUSES.AVAILABLE,
    title,
    isPublic,
    deletedAt,
    province: location.province?._id ?? null,
    district: location.district?._id ?? null,
    city: location.city?._id ?? null,
    displayAddress: location.city ? `${title} display address` : null,
    pricing,
  });

const createEventAt = async ({
  eventType,
  property = null,
  createdAt,
  context,
}) => {
  const event = await AnalyticsEvent.create({
    eventType,
    property,
    context,
  });

  if (createdAt) {
    await AnalyticsEvent.collection.updateOne(
      { _id: event._id },
      { $set: { createdAt: new Date(createdAt) } },
    );
  }

  return AnalyticsEvent.findById(event._id);
};

const expectNoPrivateAnalyticsFields = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();

  expect(serialized).not.toContain("ip");
  expect(serialized).not.toContain("useragent");
  expect(serialized).not.toContain("email");
  expect(serialized).not.toContain("phone");
  expect(serialized).not.toContain("raw enquiry");
  expect(serialized).not.toContain("publicid");
  expect(serialized).not.toContain("createdby");
  expect(serialized).not.toContain("updatedby");
  expect(serialized).not.toContain("__v");
  expect(serialized).not.toContain("metadata");
};

describe("analytics backend", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
    await Property.init();
    await Enquiry.init();
    await AnalyticsEvent.init();
    await SearchInsight.init();
    await Location.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectTestDatabase();
  });

  it("enforces the analytics event model contract", async () => {
    const property = await createProperty();

    await expect(
      AnalyticsEvent.create({
        eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
        property: property._id,
        context: {
          surface: ANALYTICS_CONTEXT_SURFACES.PROPERTY_DETAIL,
        },
      }),
    ).resolves.toMatchObject({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
    });

    await expect(
      AnalyticsEvent.create({ eventType: "random_event" }),
    ).rejects.toThrow();

    const attempted = await AnalyticsEvent.create({
      eventType: ANALYTICS_EVENT_TYPES.MAP_INTERACTION,
      metadata: { email: "visitor@example.com" },
    });

    expect(attempted.toObject()).not.toHaveProperty("metadata");
  });

  it("records valid public-ingestible events and rejects client-only pollution", async () => {
    const property = await createProperty();

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
        propertyId: property._id.toString(),
        context: {
          surface: ANALYTICS_CONTEXT_SURFACES.PROPERTY_DETAIL,
        },
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toEqual({ recorded: true });
      });

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.PROPERTY_SAVE,
        propertyId: property._id.toString(),
      })
      .expect(201);

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.PROPERTY_UNSAVE,
        propertyId: property._id.toString(),
      })
      .expect(201);

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.MAP_INTERACTION,
        context: {
          surface: ANALYTICS_CONTEXT_SURFACES.EXPLORE_MAP,
        },
      })
      .expect(201);

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.WHATSAPP_CLICK,
      })
      .expect(201);

    await request(app())
      .post("/api/v1/analytics/events")
      .send({ eventType: ANALYTICS_EVENT_TYPES.ENQUIRY_SUBMITTED })
      .expect(400)
      .expect((response) => {
        expect(response.body.code).toBe("VALIDATION_ERROR");
      });

    await request(app())
      .post("/api/v1/analytics/events")
      .send({ eventType: "made_up" })
      .expect(400);

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
        propertyId: "not-object-id",
      })
      .expect(400);

    await request(app())
      .post("/api/v1/analytics/events")
      .send({ eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW })
      .expect(400)
      .expect((response) => {
        expect(response.body.code).toBe("ANALYTICS_PROPERTY_REQUIRED");
      });

    const unpublished = await createProperty({
      code: "LND-92002",
      isPublic: false,
    });

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.PROPERTY_SAVE,
        propertyId: unpublished._id.toString(),
      })
      .expect(404)
      .expect((response) => {
        expect(response.body.code).toBe("ANALYTICS_PROPERTY_NOT_PUBLIC");
      });

    expect(await AnalyticsEvent.countDocuments()).toBe(5);
  });

  it("strictly rejects public analytics privacy and metadata fields", async () => {
    const property = await createProperty();

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
        propertyId: property._id.toString(),
        createdAt: "2026-01-01T00:00:00.000Z",
      })
      .expect(400);

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
        propertyId: property._id.toString(),
        ip: "127.0.0.1",
        userAgent: "Browser",
        email: "visitor@example.com",
        phone: "+94770000000",
        metadata: { anything: true },
      })
      .expect(400);

    await request(app())
      .post("/api/v1/analytics/events")
      .send({
        eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
        propertyId: property._id.toString(),
      })
      .set("User-Agent", "Should not persist")
      .expect(201);

    const event = await AnalyticsEvent.findOne().lean();

    expect(event).toMatchObject({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
    });
    expect(event).not.toHaveProperty("ip");
    expect(event).not.toHaveProperty("userAgent");
    expect(event).not.toHaveProperty("email");
    expect(event).not.toHaveProperty("phone");
    expect(event).not.toHaveProperty("metadata");
  });

  it("creates enquiry_submitted only after successful authoritative enquiry creation", async () => {
    const user = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(user);
    const property = await createProperty();

    await request(app())
      .post("/api/v1/admin/enquiries")
      .set(authHeader(token))
      .send({
        fullName: "Nimal Perera",
        email: "nimal@example.com",
        phone: "+94770000001",
        message: "Please call me",
        propertyId: property._id.toString(),
      })
      .expect(201);

    const event = await AnalyticsEvent.findOne().lean();

    expect(event).toMatchObject({
      eventType: ANALYTICS_EVENT_TYPES.ENQUIRY_SUBMITTED,
      property: property._id,
    });
    expect(event.context).toEqual({
      surface: ANALYTICS_CONTEXT_SURFACES.ENQUIRY,
    });
    expect(event).not.toHaveProperty("fullName");
    expect(event).not.toHaveProperty("email");
    expect(event).not.toHaveProperty("phone");

    await request(app())
      .post("/api/v1/admin/enquiries")
      .set(authHeader(token))
      .send({
        fullName: "No Contact",
        propertyId: property._id.toString(),
      })
      .expect(400);

    expect(await AnalyticsEvent.countDocuments()).toBe(1);
  });

  it("does not roll back a valid enquiry when analytics recording fails", async () => {
    const user = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(user);
    const createSpy = vi
      .spyOn(AnalyticsEvent, "create")
      .mockRejectedValueOnce(new Error("analytics unavailable"));

    await request(app())
      .post("/api/v1/admin/enquiries")
      .set(authHeader(token))
      .send({
        fullName: "Analytics Failure",
        email: "failure@example.com",
      })
      .expect(201);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(await Enquiry.countDocuments()).toBe(1);
  });

  it("protects admin summary with analytics.view and exposes read-only routes only", async () => {
    await request(app())
      .get("/api/v1/admin/analytics/summary")
      .expect(401);

    const support = await createStaffUser({
      email: "support@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
    });
    const supportToken = await loginAs(support);

    await request(app())
      .get("/api/v1/admin/analytics/summary")
      .set(authHeader(supportToken))
      .expect(403);

    await grantRolePermissions(STAFF_ROLES.ENQUIRY_SUPPORT, [
      PERMISSIONS.ANALYTICS_VIEW,
    ]);

    await request(app())
      .get("/api/v1/admin/analytics/summary")
      .set(authHeader(supportToken))
      .expect(200);

    await request(app())
      .post("/api/v1/admin/analytics/summary")
      .set(authHeader(supportToken))
      .send({ count: 10 })
      .expect(404);

    await request(app())
      .delete("/api/v1/admin/analytics/summary")
      .set(authHeader(supportToken))
      .expect(404);

    await request(app())
      .patch("/api/v1/analytics/events")
      .send({})
      .expect(404);

    await request(app())
      .delete("/api/v1/analytics/events")
      .expect(404);
  });

  it("summarizes deterministic ranges and bounded top properties without N+1 lookups", async () => {
    const first = await createProperty({
      code: "LND-92011",
      title: "First Analytics Land",
    });
    const second = await createProperty({
      code: "LND-92012",
      title: "Second Analytics Land",
    });
    const deleted = await createProperty({
      code: "LND-92013",
      title: "Deleted Analytics Land",
      deletedAt: new Date("2026-01-05T00:00:00.000Z"),
    });
    const missingPropertyId = new mongoose.Types.ObjectId();

    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
      property: first._id,
      createdAt: "2026-01-29T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
      property: first._id,
      createdAt: "2026-01-28T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
      property: second._id,
      createdAt: "2026-01-27T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_SAVE,
      property: second._id,
      createdAt: "2026-01-29T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_SAVE,
      property: second._id,
      createdAt: "2026-01-28T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_SAVE,
      property: first._id,
      createdAt: "2026-01-27T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_UNSAVE,
      property: first._id,
      createdAt: "2026-01-26T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.ENQUIRY_SUBMITTED,
      property: deleted._id,
      createdAt: "2026-01-25T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.ENQUIRY_SUBMITTED,
      property: missingPropertyId,
      createdAt: "2026-01-24T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.MAP_INTERACTION,
      createdAt: "2026-01-23T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.WHATSAPP_CLICK,
      createdAt: "2026-01-22T00:00:00.000Z",
    });
    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
      property: first._id,
      createdAt: "2025-12-15T00:00:00.000Z",
    });

    const propertyFindSpy = vi.spyOn(Property, "find");
    const now = new Date("2026-01-30T00:00:00.000Z");
    const sevenDays = await getAnalyticsSummary({
      range: ANALYTICS_RANGES.SEVEN_DAYS,
      now,
    });

    expect(sevenDays.period.start).toEqual(
      new Date("2026-01-23T00:00:00.000Z"),
    );
    expect(sevenDays.metrics).toMatchObject({
      propertyViews: 3,
      propertySaves: 3,
      propertyUnsaves: 1,
      enquiriesSubmitted: 2,
      mapInteractions: 1,
      whatsappClicks: 0,
    });
    expect(sevenDays.topViewedProperties[0]).toMatchObject({
      count: 2,
      property: {
        id: first._id.toString(),
        code: "LND-92011",
        title: "First Analytics Land",
      },
    });
    expect(sevenDays.topSavedProperties[0]).toMatchObject({
      count: 2,
      property: {
        id: second._id.toString(),
        code: "LND-92012",
      },
    });
    expect(sevenDays.topViewedProperties).toHaveLength(2);
    expect(sevenDays.topEnquiredProperties).toHaveLength(2);
    expect(
      sevenDays.topEnquiredProperties.some(
        (item) => item.property.code === "LND-92013",
      ),
    ).toBe(true);
    expect(
      sevenDays.topEnquiredProperties.some(
        (item) => item.property.id === missingPropertyId.toString(),
      ),
    ).toBe(true);
    expect(propertyFindSpy).not.toHaveBeenCalled();

    const thirtyDays = await getAnalyticsSummary({
      range: ANALYTICS_RANGES.THIRTY_DAYS,
      now,
    });
    expect(thirtyDays.metrics.propertyViews).toBe(3);

    const all = await getAnalyticsSummary({
      range: ANALYTICS_RANGES.ALL,
      now,
    });
    expect(all.period.start).toBeNull();
    expect(all.metrics.propertyViews).toBe(4);
  });



  it("summarizes property-derived location, type, and transaction dimensions", async () => {
    const location = await createLocationHierarchy(" Activity");
    const land = await createProperty({
      code: "LND-93001",
      title: "Activity Land",
      type: PROPERTY_TYPES.LAND,
      transactionTypes: [TRANSACTION_TYPES.SALE],
      location,
    });
    const apartment = await createProperty({
      code: "APT-93001",
      title: "Activity Apartment",
      type: PROPERTY_TYPES.APARTMENT,
      transactionTypes: [TRANSACTION_TYPES.RENT, TRANSACTION_TYPES.LEASE],
      location,
    });

    await createEventAt({ eventType: ANALYTICS_EVENT_TYPES.PROPERTY_VIEW, property: land._id });
    await createEventAt({ eventType: ANALYTICS_EVENT_TYPES.PROPERTY_SAVE, property: apartment._id });
    await createEventAt({ eventType: ANALYTICS_EVENT_TYPES.MAP_INTERACTION, property: apartment._id });

    const summary = await getAnalyticsSummary({ range: ANALYTICS_RANGES.ALL });

    expect(summary.locationActivity[0]).toMatchObject({
      count: 3,
      location: {
        id: location.city._id.toString(),
        name: "Colombo Activity",
        level: LOCATION_LEVELS.CITY,
      },
    });
    expect(summary.propertyTypeActivity).toEqual(
      expect.arrayContaining([
        { propertyType: PROPERTY_TYPES.APARTMENT, count: 2 },
        { propertyType: PROPERTY_TYPES.LAND, count: 1 },
      ]),
    );
    expect(summary.transactionActivity).toEqual(
      expect.arrayContaining([
        { transactionType: TRANSACTION_TYPES.SALE, count: 1 },
        { transactionType: TRANSACTION_TYPES.RENT, count: 2 },
        { transactionType: TRANSACTION_TYPES.LEASE, count: 2 },
      ]),
    );
  });

  it("records structured public search insights without raw free text or visitor metadata", async () => {
    const location = await createLocationHierarchy(" Search");
    await createProperty({
      code: "LND-94001",
      title: "Searchable Land",
      type: PROPERTY_TYPES.LAND,
      transactionTypes: [TRANSACTION_TYPES.SALE],
      location,
      pricing: {
        currency: CURRENCIES.LKR,
        priceVisible: true,
        sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
      },
    });

    const response = await request(app())
      .get("/api/v1/properties")
      .query({
        search: "Searchable",
        type: PROPERTY_TYPES.LAND,
        transactionType: TRANSACTION_TYPES.SALE,
        provinceId: location.province._id.toString(),
        districtId: location.district._id.toString(),
        cityId: location.city._id.toString(),
        currency: CURRENCIES.LKR,
        maxPrice: 30000000,
      })
      .expect(200);

    expect(response.body.meta.total).toBe(1);

    const insight = await SearchInsight.findOne().lean();
    expect(insight).toMatchObject({
      province: location.province._id,
      district: location.district._id,
      city: location.city._id,
      propertyType: PROPERTY_TYPES.LAND,
      transactionType: TRANSACTION_TYPES.SALE,
      currency: CURRENCIES.LKR,
      maxPrice: 30000000,
      resultCount: 1,
    });
    expect(insight.filters).toEqual(
      expect.arrayContaining(["province", "district", "city", "propertyType", "transactionType", "currency", "maxPrice"]),
    );
    const serializedInsight = JSON.stringify(insight).toLowerCase();
    expect(serializedInsight).not.toContain("searchable");
    expect(serializedInsight).not.toContain("ip");
    expect(serializedInsight).not.toContain("user-agent");

    await request(app())
      .get("/api/v1/properties")
      .query({ type: PROPERTY_TYPES.HOUSE })
      .expect(200);

    const summary = await getAnalyticsSummary({ range: ANALYTICS_RANGES.ALL });
    expect(summary.searchInsights.searchedLocations[0]).toMatchObject({
      location: { id: location.city._id.toString(), name: "Colombo Search" },
      count: 1,
    });
    expect(summary.searchInsights.selectedPropertyTypes).toEqual(
      expect.arrayContaining([
        { propertyType: PROPERTY_TYPES.LAND, count: 1 },
        { propertyType: PROPERTY_TYPES.HOUSE, count: 1 },
      ]),
    );
    expect(summary.searchInsights.selectedTransactionTypes).toEqual([
      { transactionType: TRANSACTION_TYPES.SALE, count: 1 },
    ]);
    expect(summary.searchInsights.commonBudgets).toEqual([
      { currency: CURRENCIES.LKR, minPrice: null, maxPrice: 30000000, count: 1 },
    ]);
    expect(summary.searchInsights.zeroResultSearches).toBe(1);
  });

  it("validates admin summary query and serializes only safe summary fields", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);

    await createEventAt({
      eventType: ANALYTICS_EVENT_TYPES.WHATSAPP_CLICK,
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    await request(app())
      .get("/api/v1/admin/analytics/summary")
      .query({ range: "random" })
      .set(authHeader(token))
      .expect(400);

    await request(app())
      .get("/api/v1/admin/analytics/summary")
      .query({ unknown: "value" })
      .set(authHeader(token))
      .expect(400);

    const response = await request(app())
      .get("/api/v1/admin/analytics/summary")
      .query({ range: ANALYTICS_RANGES.ALL })
      .set(authHeader(token))
      .expect(200);

    expect(response.body.data).toMatchObject({
      range: ANALYTICS_RANGES.ALL,
      metrics: {
        whatsappClicks: 1,
      },
    });
    expectNoPrivateAnalyticsFields(response.body);
  });
});


