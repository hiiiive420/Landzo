import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const propertyMediaCloudinaryMocks = vi.hoisted(() => ({
  deletePropertyImageFromCloudinary: vi.fn(),
  uploadPropertyImageToCloudinary: vi.fn(),
}));

vi.mock("../src/modules/properties/propertyMedia.cloudinary.js", () => propertyMediaCloudinaryMocks);

import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import { LOCATION_LEVELS, LOCATION_STATUSES } from "../src/modules/locations/location.constants.js";
import { Location } from "../src/modules/locations/location.model.js";
import { searchPlaces } from "../src/modules/geocoding/geocoding.service.js";
import {
  CURRENCIES,
  LAND_SIZE_UNITS,
  LAND_TYPES,
  LEASE_PERIODS,
  PRICE_MODES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  RENT_PERIODS,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { Property } from "../src/modules/properties/property.model.js";
import { purgeExpiredTrashedProperties } from "../src/modules/properties/property.service.js";
import { PropertyCodeCounter } from "../src/modules/properties/propertyCode.model.js";
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
const missingPropertyId = "000000000000000000000000";

const createStaffUser = async ({
  fullName = "Landzo Staff",
  email = "staff@example.com",
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

const loginAs = async (user, customApp = app()) => {
  const response = await request(customApp)
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

const createLocationHierarchy = async (suffix = "") => {
  const province = await createLocationRecord({
    name: `Western Province${suffix}`,
    level: LOCATION_LEVELS.PROVINCE,
  });
  const district = await createLocationRecord({
    name: `Colombo District${suffix}`,
    level: LOCATION_LEVELS.DISTRICT,
    parent: province._id,
  });
  const city = await createLocationRecord({
    name: `Colombo City${suffix}`,
    level: LOCATION_LEVELS.CITY,
    parent: district._id,
  });
  const area = await createLocationRecord({
    name: `Colombo 03${suffix}`,
    level: LOCATION_LEVELS.AREA,
    parent: city._id,
  });

  return { province, district, city, area };
};

const minimalPropertyInput = (overrides = {}) => ({
  type: PROPERTY_TYPES.LAND,
  transactionTypes: [TRANSACTION_TYPES.SALE],
  title: "Residential Land in Colombo 03",
  ...overrides,
});

const fullPropertyInput = async (overrides = {}) => {
  const { locationSuffix = "", ...propertyOverrides } = overrides;
  const { province, district, city, area } = await createLocationHierarchy(locationSuffix);

  return minimalPropertyInput({
    description: "A quiet residential plot near the city.",
    location: {
      province: province._id.toString(),
      district: district._id.toString(),
      city: city._id.toString(),
      area: area._id.toString(),
      displayAddress: "No. 25, Galle Road, Colombo 03",
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
      sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
    },
    map: { lat: 6.9271, lng: 79.8612 },
    ...propertyOverrides,
  });
};

const createPropertyViaApi = async (token, input) => {
  const response = await request(app())
    .post("/api/v1/admin/properties")
    .set(authHeader(token))
    .send(input)
    .expect(201);

  return response.body.data;
};

const publishPath = (propertyId) => `/api/v1/admin/properties/${propertyId}/publish`;
const unpublishPath = (propertyId) => `/api/v1/admin/properties/${propertyId}/unpublish`;
const featuredPath = (propertyId) => `/api/v1/admin/properties/${propertyId}/featured`;
const exploreMapPath = (propertyId) => `/api/v1/admin/properties/${propertyId}/explore-map`;
const statusPath = (propertyId) => `/api/v1/admin/properties/${propertyId}/status`;
const trashPath = (propertyId) => `/api/v1/admin/properties/${propertyId}/trash`;
const restorePath = (propertyId) => `/api/v1/admin/properties/${propertyId}/restore`;
const unarchivePath = (propertyId) => `/api/v1/admin/properties/${propertyId}/unarchive`;
const trashListPath = "/api/v1/admin/properties/trash";

const publicationImages = (overrides = {}) => [
  {
    publicId: "landzo/properties/LND-00001/publish-cover",
    secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/publish-cover.jpg",
    width: 1200,
    height: 800,
    format: "jpg",
    bytes: 12345,
    order: 0,
    isCover: true,
    uploadedAt: new Date(),
    originalFilename: "publish-cover.jpg",
    ...overrides,
  },
];

const seedPublicationImages = async (propertyId, images = publicationImages()) => {
  await Property.updateOne({ _id: propertyId }, { $set: { media: { images } } });
};

let publishFixtureSequence = 0;

const createPublishableProperty = async (token, overrides = {}) => {
  publishFixtureSequence += 1;
  const property = await createPropertyViaApi(
    token,
    await fullPropertyInput({
      title: "Publishable Property",
      locationSuffix: ` Publish ${publishFixtureSequence}`,
      ...overrides,
    }),
  );
  await seedPublicationImages(property.id);
  return property;
};

const expectPublicationNotReady = async ({ token, propertyId, missingFields }) => {
  const response = await request(app())
    .post(publishPath(propertyId))
    .set(authHeader(token))
    .expect(409);

  expect(response.body).toMatchObject({ code: "PROPERTY_NOT_READY_FOR_PUBLICATION" });
  expect(response.body.details.missingFields).toEqual(expect.arrayContaining(missingFields));
};

const expectSafePropertyPayload = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).not.toContain("passwordhash");
  expect(serialized).not.toContain("createdby");
  expect(serialized).not.toContain("updatedby");
  expect(serialized).not.toContain("maplocation");
  expect(serialized).not.toContain("__v");
  expect(serialized).not.toContain("private");
};

describe("admin property CRUD and draft management API", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
    await Location.init();
    await PropertyCodeCounter.init();
    await Property.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
    propertyMediaCloudinaryMocks.deletePropertyImageFromCloudinary.mockReset();
    propertyMediaCloudinaryMocks.uploadPropertyImageToCloudinary.mockReset();
    propertyMediaCloudinaryMocks.deletePropertyImageFromCloudinary.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("creates minimal and full draft properties through the authenticated admin API", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);

    const minimal = await createPropertyViaApi(token, minimalPropertyInput());
    const full = await createPropertyViaApi(
      token,
      await fullPropertyInput({ title: "Full Land Draft" }),
    );
    const stored = await Property.findById(full.id).select("+createdBy +updatedBy");

    expect(minimal).toMatchObject({
      code: "LND-00001",
      status: PROPERTY_STATUSES.DRAFT,
      isPublic: false,
      exploreMapEnabled: false,
      featured: false,
    });
    expect(full).toMatchObject({
      code: "LND-00002",
      pricing: { currency: CURRENCIES.LKR, priceVisible: true, sale: { amount: 25000000 } },
      map: { lat: 6.9271, lng: 79.8612 },
    });
    expect(full.location.province).toMatchObject({ name: "Western Province" });
    expect(stored.createdBy.toString()).toBe(owner._id.toString());
    expect(stored.updatedBy.toString()).toBe(owner._id.toString());
    expectSafePropertyPayload(full);
  });

  it("enforces create RBAC with unauthenticated, forbidden, and allowed staff", async () => {
    const content = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const token = await loginAs(content);

    await request(app()).post("/api/v1/admin/properties").send(minimalPropertyInput()).expect(401);
    await request(app())
      .post("/api/v1/admin/properties")
      .set(authHeader(token))
      .send(minimalPropertyInput())
      .expect(403);

    await Role.updateOne(
      { key: STAFF_ROLES.CONTENT_MANAGER },
      { $set: { permissions: [PERMISSIONS.PROPERTY_CREATE] } },
    );

    await request(app())
      .post("/api/v1/admin/properties")
      .set(authHeader(token))
      .send(minimalPropertyInput())
      .expect(201);
  });

  it("rejects server-controlled and publication fields during create", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const rejectedFields = [
      { code: "LND-99999" },
      { slug: "manual" },
      { createdBy: owner._id.toString() },
      { updatedBy: owner._id.toString() },
      { mapLocation: { type: "Point", coordinates: [79.8612, 6.9271] } },
      { isPublic: true },
      { exploreMapEnabled: true },
      { featured: true },
      { status: PROPERTY_STATUSES.AVAILABLE },
    ];

    for (const rejectedField of rejectedFields) {
      await request(app())
        .post("/api/v1/admin/properties")
        .set(authHeader(token))
        .send(minimalPropertyInput(rejectedField))
        .expect(400);
    }
  });

  it("lists admin properties with pagination, search, filters, sort mapping, and safe DTOs", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const firstInput = await fullPropertyInput({ title: "Modern Apartment Search Anchor" });
    const secondHierarchy = await createLocationHierarchy(" Two");

    const first = await createPropertyViaApi(token, firstInput);
    await createPropertyViaApi(
      token,
      minimalPropertyInput({
        type: PROPERTY_TYPES.APARTMENT,
        title: "Urban Apartment Rent",
        transactionTypes: [TRANSACTION_TYPES.RENT],
        location: {
          province: secondHierarchy.province._id.toString(),
          district: secondHierarchy.district._id.toString(),
          city: secondHierarchy.city._id.toString(),
          area: secondHierarchy.area._id.toString(),
        },
        pricing: {
          currency: CURRENCIES.USD,
          rent: { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 1200 },
        },
      }),
    );

    const paginated = await request(app())
      .get("/api/v1/admin/properties?page=1&limit=1&sort=code_asc")
      .set(authHeader(token))
      .expect(200);
    expect(paginated.body.data).toHaveLength(1);
    expect(paginated.body.meta).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });

    const bySearch = await request(app())
      .get("/api/v1/admin/properties?search=modern%20apartment")
      .set(authHeader(token))
      .expect(200);
    expect(bySearch.body.data.map((property) => property.id)).toContain(first.id);

    const byCode = await request(app())
      .get(`/api/v1/admin/properties?search=${first.code.toLowerCase()}`)
      .set(authHeader(token))
      .expect(200);
    expect(byCode.body.data[0]).toMatchObject({ id: first.id, hasMap: true });

    const filtered = await request(app())
      .get(
        `/api/v1/admin/properties?type=apartment&transactionType=rent&status=draft&currency=USD&provinceId=${secondHierarchy.province._id}&hasMap=false&sort=updated_asc`,
      )
      .set(authHeader(token))
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0]).toMatchObject({ type: PROPERTY_TYPES.APARTMENT, hasMap: false });

    for (const locationFilter of [
      `districtId=${secondHierarchy.district._id}`,
      `cityId=${secondHierarchy.city._id}`,
      `areaId=${secondHierarchy.area._id}`,
    ]) {
      const locationFiltered = await request(app())
        .get(`/api/v1/admin/properties?${locationFilter}`)
        .set(authHeader(token))
        .expect(200);
      expect(locationFiltered.body.data).toHaveLength(1);
      expect(locationFiltered.body.data[0]).toMatchObject({ type: PROPERTY_TYPES.APARTMENT });
    }

    expectSafePropertyPayload(filtered.body);

    await request(app())
      .get("/api/v1/admin/properties?sort=price_desc")
      .set(authHeader(token))
      .expect(400);
  });

  it("returns property detail with location summaries and stable not-found validation", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPropertyViaApi(token, await fullPropertyInput());

    const detail = await request(app())
      .get(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(detail.body.data).toMatchObject({
      id: property.id,
      code: property.code,
      location: { province: { name: "Western Province", level: LOCATION_LEVELS.PROVINCE } },
      pricing: { sale: { amount: 25000000 } },
      map: { lat: 6.9271, lng: 79.8612 },
    });
    expectSafePropertyPayload(detail.body);

    await request(app())
      .get("/api/v1/admin/properties/not-a-valid-id")
      .set(authHeader(token))
      .expect(400);
    const missing = await request(app())
      .get(`/api/v1/admin/properties/${missingPropertyId}`)
      .set(authHeader(token))
      .expect(404);
    expect(missing.body).toMatchObject({ code: "PROPERTY_NOT_FOUND" });
  });

  it("updates editable draft fields while preserving immutable code and type", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const editor = await createStaffUser({ email: "editor@example.com", role: STAFF_ROLES.ADMIN });
    const ownerToken = await loginAs(owner);
    const editorToken = await loginAs(editor);
    const property = await createPropertyViaApi(ownerToken, await fullPropertyInput());
    const newHierarchy = await createLocationHierarchy(" Updated");

    const updated = await request(app())
      .patch(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(editorToken))
      .send({
        title: "Updated Property Title",
        description: "Updated draft description",
        transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
        location: {
          province: newHierarchy.province._id.toString(),
          district: newHierarchy.district._id.toString(),
          city: newHierarchy.city._id.toString(),
          area: newHierarchy.area._id.toString(),
          displayAddress: "Updated address",
        },
        details: { land: { roadAccess: true } },
        pricing: {
          currency: CURRENCIES.LKR,
          sale: { mode: PRICE_MODES.FIXED, amount: 27000000 },
          rent: { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 160000 },
        },
        map: { lat: 7, lng: 80 },
      })
      .expect(200);
    const stored = await Property.findById(property.id).select("+updatedBy");

    expect(updated.body.data).toMatchObject({
      code: property.code,
      type: PROPERTY_TYPES.LAND,
      title: "Updated Property Title",
      slug: "updated-property-title",
      description: "Updated draft description",
      transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
      location: { area: { name: "Colombo 03 Updated" } },
      details: { land: { landSize: 12, roadAccess: true } },
      pricing: { rent: { amount: 160000 } },
      map: { lat: 7, lng: 80 },
    });
    expect(stored.updatedBy.toString()).toBe(editor._id.toString());

    for (const forbiddenPatch of [
      { code: "LND-99999" },
      { type: PROPERTY_TYPES.HOUSE },
      { slug: "manual" },
      { createdBy: owner._id.toString() },
      { updatedBy: owner._id.toString() },
      { status: PROPERTY_STATUSES.SOLD },
      { isPublic: true },
      { exploreMapEnabled: true },
      { featured: true },
      { mapLocation: { type: "Point", coordinates: [80, 7] } },
    ]) {
      await request(app())
        .patch(`/api/v1/admin/properties/${property.id}`)
        .set(authHeader(editorToken))
        .send(forbiddenPatch)
        .expect(400);
    }
  });

  it("rejects cross-field pricing mismatches and supports explicit replacement", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPropertyViaApi(
      token,
      minimalPropertyInput({
        transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
        pricing: {
          currency: CURRENCIES.LKR,
          sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
          rent: { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 150000 },
        },
      }),
    );

    const rejected = await request(app())
      .patch(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(token))
      .send({ transactionTypes: [TRANSACTION_TYPES.SALE] })
      .expect(400);
    expect(rejected.body).toMatchObject({ code: "PROPERTY_PRICING_TRANSACTION_MISMATCH" });

    const accepted = await request(app())
      .patch(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(token))
      .send({
        transactionTypes: [TRANSACTION_TYPES.SALE],
        pricing: {
          currency: CURRENCIES.LKR,
          priceVisible: false,
          sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
        },
      })
      .expect(200);
    expect(accepted.body.data.transactionTypes).toEqual([TRANSACTION_TYPES.SALE]);
    expect(accepted.body.data.pricing.rent).toBeUndefined();
  });

  it("clears optional pricing, map, area, and display address while omitted fields stay unchanged", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPropertyViaApi(token, await fullPropertyInput());

    const updated = await request(app())
      .patch(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(token))
      .send({
        pricing: null,
        map: null,
        location: {
          area: null,
          displayAddress: null,
        },
      })
      .expect(200);

    expect(updated.body.data.title).toBe(property.title);
    expect(updated.body.data.pricing).toBeNull();
    expect(updated.body.data.map).toBeNull();
    expect(updated.body.data.location).toMatchObject({
      province: { name: "Western Province" },
      district: { name: "Colombo District" },
      city: { name: "Colombo City" },
      area: null,
      displayAddress: null,
    });

    await request(app())
      .patch(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(token))
      .send({ location: { province: null } })
      .expect(400);
  });

  it("duplicates a listing with a new draft identity and conservative visibility resets", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const creator = await createStaffUser({
      email: "creator@example.com",
      role: STAFF_ROLES.ADMIN,
    });
    const ownerToken = await loginAs(owner);
    const creatorToken = await loginAs(creator);
    const original = await createPropertyViaApi(ownerToken, await fullPropertyInput());

    await Property.updateOne(
      { _id: original.id },
      {
        $set: {
          status: PROPERTY_STATUSES.AVAILABLE,
          isPublic: true,
          exploreMapEnabled: true,
          featured: true,
        },
      },
    );

    const response = await request(app())
      .post(`/api/v1/admin/properties/${original.id}/duplicate`)
      .set(authHeader(creatorToken))
      .expect(201);
    const duplicate = response.body.data;
    const storedDuplicate = await Property.findById(duplicate.id).select("+createdBy +updatedBy");
    const reloadedOriginal = await Property.findById(original.id);

    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.code).not.toBe(original.code);
    expect(duplicate.title).toBe(`${original.title} (Copy)`);
    expect(duplicate).toMatchObject({
      type: original.type,
      transactionTypes: original.transactionTypes,
      status: PROPERTY_STATUSES.DRAFT,
      isPublic: false,
      exploreMapEnabled: false,
      featured: false,
      pricing: { priceVisible: false, sale: { amount: 25000000 } },
      map: original.map,
    });
    expect(new Date(duplicate.createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(original.createdAt).getTime(),
    );
    expect(storedDuplicate.createdBy.toString()).toBe(creator._id.toString());
    expect(storedDuplicate.updatedBy.toString()).toBe(creator._id.toString());
    expect(reloadedOriginal.status).toBe(PROPERTY_STATUSES.AVAILABLE);
    expect(reloadedOriginal.isPublic).toBe(true);
  });

  it("enforces RBAC for list, detail, update, and duplicate routes", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const content = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const ownerToken = await loginAs(owner);
    const contentToken = await loginAs(content);
    const property = await createPropertyViaApi(ownerToken, minimalPropertyInput());

    await request(app()).get("/api/v1/admin/properties").expect(401);
    await request(app()).get("/api/v1/admin/properties").set(authHeader(contentToken)).expect(403);
    await request(app())
      .get(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(contentToken))
      .expect(403);
    await request(app())
      .patch(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(contentToken))
      .send({ title: "Forbidden" })
      .expect(403);
    await request(app())
      .post(`/api/v1/admin/properties/${property.id}/duplicate`)
      .set(authHeader(contentToken))
      .expect(403);

    await Role.updateOne(
      { key: STAFF_ROLES.CONTENT_MANAGER },
      { $set: { permissions: [PERMISSIONS.PROPERTY_VIEW] } },
    );
    await request(app()).get("/api/v1/admin/properties").set(authHeader(contentToken)).expect(200);
    await request(app())
      .get(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(contentToken))
      .expect(200);

    await Role.updateOne(
      { key: STAFF_ROLES.CONTENT_MANAGER },
      { $set: { permissions: [PERMISSIONS.PROPERTY_CREATE, PERMISSIONS.PROPERTY_EDIT] } },
    );
    await request(app())
      .patch(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(contentToken))
      .send({ title: "Allowed Edit" })
      .expect(200);
    await request(app())
      .post(`/api/v1/admin/properties/${property.id}/duplicate`)
      .set(authHeader(contentToken))
      .expect(201);
  });
  it("enforces authentication and property.publish for publish", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const content = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const ownerToken = await loginAs(owner);
    const contentToken = await loginAs(content);
    const property = await createPublishableProperty(ownerToken);

    await request(app()).post(publishPath(property.id)).expect(401);
    await request(app()).post(publishPath(property.id)).set(authHeader(contentToken)).expect(403);
  });

  it("rejects incomplete properties with a stable publication readiness error", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPropertyViaApi(token, minimalPropertyInput());

    await expectPublicationNotReady({
      token,
      propertyId: property.id,
      missingFields: [
        "description",
        "province",
        "district",
        "city",
        "displayAddress",
        "mapLocation",
        "pricing",
        "details.land.landSize",
        "details.land.landSizeUnit",
        "details.land.landType",
        "media.images",
        "media.coverImage",
      ],
    });
  });

  it("rejects missing publication basics individually", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);

    const missingDescription = await createPublishableProperty(token, { description: null });
    await expectPublicationNotReady({
      token,
      propertyId: missingDescription.id,
      missingFields: ["description"],
    });

    const missingLocations = await createPublishableProperty(token, {
      title: "Missing Location Property",
      location: { displayAddress: "No. 25, Galle Road, Colombo 03" },
    });
    await expectPublicationNotReady({
      token,
      propertyId: missingLocations.id,
      missingFields: ["province", "district", "city"],
    });

    const missingMap = await createPublishableProperty(token, {
      title: "Missing Map Property",
      map: null,
    });
    await expectPublicationNotReady({
      token,
      propertyId: missingMap.id,
      missingFields: ["mapLocation"],
    });
  });

  it("rejects missing pricing for selected transactions", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);

    const missingPricing = await createPublishableProperty(token, {
      pricing: null,
    });
    await expectPublicationNotReady({
      token,
      propertyId: missingPricing.id,
      missingFields: ["pricing"],
    });

    const saleAndRentOnlySalePricing = await createPublishableProperty(token, {
      title: "Sale Rent Missing Rent Price",
      transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
      pricing: {
        currency: CURRENCIES.LKR,
        priceVisible: true,
        sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
      },
    });
    await expectPublicationNotReady({
      token,
      propertyId: saleAndRentOnlySalePricing.id,
      missingFields: ["pricing.rent"],
    });
  });

  it("rejects missing type-specific details", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPublishableProperty(token, {
      details: {
        land: {
          landSize: 12,
          landSizeUnit: LAND_SIZE_UNITS.PERCH,
        },
      },
    });

    await expectPublicationNotReady({
      token,
      propertyId: property.id,
      missingFields: ["details.land.landType"],
    });
  });

  it("rejects missing media and invalid cover state", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);

    const noImage = await createPropertyViaApi(token, await fullPropertyInput());
    await expectPublicationNotReady({
      token,
      propertyId: noImage.id,
      missingFields: ["media.images", "media.coverImage"],
    });

    const noCover = await createPublishableProperty(token, { title: "No Cover Property" });
    await seedPublicationImages(noCover.id, publicationImages({ isCover: false }));
    await expectPublicationNotReady({
      token,
      propertyId: noCover.id,
      missingFields: ["media.coverImage"],
    });

    const duplicateCover = await createPublishableProperty(token, { title: "Duplicate Cover Property" });
    await seedPublicationImages(duplicateCover.id, [
      ...publicationImages(),
      {
        ...publicationImages()[0],
        publicId: "landzo/properties/LND-00001/publish-cover-2",
        secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/publish-cover-2.jpg",
        order: 1,
        originalFilename: "publish-cover-2.jpg",
      },
    ]);
    await expectPublicationNotReady({
      token,
      propertyId: duplicateCover.id,
      missingFields: ["media.coverImage"],
    });
  });

  it("persists village settlement City IDs from geocoding and publishes without location readiness errors", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const province = await createLocationRecord({
      name: "North Central Province",
      level: LOCATION_LEVELS.PROVINCE,
    });
    const district = await createLocationRecord({
      name: "Anuradhapura District",
      level: LOCATION_LEVELS.DISTRICT,
      parent: province._id,
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        place_id: 9004,
        name: "Ikirigollewa",
        display_name: "Ikirigollewa, Anuradhapura District, North Central Province, 50450, Sri Lanka",
        lat: "8.470630",
        lon: "80.508873",
        address: {
          village: "Ikirigollewa",
          state_district: "Anuradhapura District",
          state: "North Central Province",
          postcode: "50450",
          country: "Sri Lanka",
          country_code: "lk",
        },
      }],
    }));

    const [suggestion] = await searchPlaces({ q: "Ikirigollewa" });
    const createdCity = await createLocationRecord({
      name: suggestion.suggestedNames.city[0],
      level: LOCATION_LEVELS.CITY,
      parent: suggestion.matches.district.id,
    });

    const property = await createPropertyViaApi(
      token,
      minimalPropertyInput({
        description: "A complete property with an Ikirigollewa settlement pin.",
        location: {
          province: suggestion.matches.province.id,
          district: suggestion.matches.district.id,
          city: createdCity._id.toString(),
          displayAddress: suggestion.displayName,
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
          sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
        },
        map: suggestion.map,
      }),
    );
    await seedPublicationImages(property.id);

    const reloaded = await request(app())
      .get(`/api/v1/admin/properties/${property.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(reloaded.body.data.location).toMatchObject({
      province: { id: province._id.toString(), name: "North Central Province" },
      district: { id: district._id.toString(), name: "Anuradhapura District" },
      city: { id: createdCity._id.toString(), name: "Ikirigollewa" },
      area: null,
    });

    const published = await request(app())
      .post(publishPath(property.id))
      .set(authHeader(token))
      .expect(200);

    expect(published.body.data).toMatchObject({
      isPublic: true,
      status: PROPERTY_STATUSES.AVAILABLE,
    });
  });
  it("publishes with hidden valid pricing and stable publish side effects", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPublishableProperty(token, {
      pricing: {
        currency: CURRENCIES.LKR,
        priceVisible: false,
        sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
      },
    });

    const response = await request(app())
      .post(publishPath(property.id))
      .set(authHeader(token))
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: property.id,
      isPublic: true,
      status: PROPERTY_STATUSES.AVAILABLE,
      pricing: { priceVisible: false, sale: { amount: 25000000 } },
    });
    const stored = await Property.findById(property.id).select("+updatedBy");
    expect(stored.isPublic).toBe(true);
    expect(stored.status).toBe(PROPERTY_STATUSES.AVAILABLE);
    expect(stored.updatedBy.toString()).toBe(owner._id.toString());
  });

  it("unpublishes without rewriting operational status", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPublishableProperty(token);
    await request(app()).post(publishPath(property.id)).set(authHeader(token)).expect(200);

    const response = await request(app())
      .post(unpublishPath(property.id))
      .set(authHeader(token))
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: property.id,
      isPublic: false,
      status: PROPERTY_STATUSES.AVAILABLE,
    });
    const stored = await Property.findById(property.id).select("+updatedBy");
    expect(stored.isPublic).toBe(false);
    expect(stored.status).toBe(PROPERTY_STATUSES.AVAILABLE);
    expect(stored.updatedBy.toString()).toBe(owner._id.toString());
  });

  it("keeps generic PATCH from changing public state directly", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPublishableProperty(token);

    for (const blockedPatch of [
      { status: PROPERTY_STATUSES.AVAILABLE },
      { isPublic: true },
      { featured: true },
      { exploreMapEnabled: true },
    ]) {
      await request(app())
        .patch(`/api/v1/admin/properties/${property.id}`)
        .set(authHeader(token))
        .send(blockedPatch)
        .expect(400);
    }
  });

  it("treats publish and unpublish as idempotent operations", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPublishableProperty(token);

    await request(app()).post(publishPath(property.id)).set(authHeader(token)).expect(200);
    const secondPublish = await request(app())
      .post(publishPath(property.id))
      .set(authHeader(token))
      .expect(200);
    expect(secondPublish.body.data).toMatchObject({
      isPublic: true,
      status: PROPERTY_STATUSES.AVAILABLE,
    });

    await request(app()).post(unpublishPath(property.id)).set(authHeader(token)).expect(200);
    const secondUnpublish = await request(app())
      .post(unpublishPath(property.id))
      .set(authHeader(token))
      .expect(200);
    expect(secondUnpublish.body.data).toMatchObject({
      isPublic: false,
      status: PROPERTY_STATUSES.AVAILABLE,
    });
  });
  it("updates featured only through the explicit publish-gated endpoint", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const content = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const ownerToken = await loginAs(owner);
    const contentToken = await loginAs(content);
    const property = await createPublishableProperty(ownerToken);

    await request(app()).patch(featuredPath(property.id)).send({ featured: true }).expect(401);
    await request(app())
      .patch(featuredPath(property.id))
      .set(authHeader(contentToken))
      .send({ featured: true })
      .expect(403);

    const unpublished = await request(app())
      .patch(featuredPath(property.id))
      .set(authHeader(ownerToken))
      .send({ featured: true })
      .expect(409);
    expect(unpublished.body).toMatchObject({ code: "PROPERTY_FEATURED_REQUIRES_PUBLIC" });

    await request(app()).post(publishPath(property.id)).set(authHeader(ownerToken)).expect(200);

    const enabled = await request(app())
      .patch(featuredPath(property.id))
      .set(authHeader(ownerToken))
      .send({ featured: true })
      .expect(200);
    expect(enabled.body.data).toMatchObject({
      featured: true,
      exploreMapEnabled: false,
      isPublic: true,
      status: PROPERTY_STATUSES.AVAILABLE,
    });

    const idempotent = await request(app())
      .patch(featuredPath(property.id))
      .set(authHeader(ownerToken))
      .send({ featured: true })
      .expect(200);
    expect(idempotent.body.data.featured).toBe(true);

    const disabled = await request(app())
      .patch(featuredPath(property.id))
      .set(authHeader(ownerToken))
      .send({ featured: false })
      .expect(200);
    expect(disabled.body.data).toMatchObject({
      featured: false,
      exploreMapEnabled: false,
      isPublic: true,
      status: PROPERTY_STATUSES.AVAILABLE,
    });

    await request(app()).post(unpublishPath(property.id)).set(authHeader(ownerToken)).expect(200);
    const disabledWhileUnpublished = await request(app())
      .patch(featuredPath(property.id))
      .set(authHeader(ownerToken))
      .send({ featured: false })
      .expect(200);
    expect(disabledWhileUnpublished.body.data).toMatchObject({ featured: false, isPublic: false });
  });

  it("updates Explore Map only when public with an exact map location", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const content = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const ownerToken = await loginAs(owner);
    const contentToken = await loginAs(content);
    const property = await createPublishableProperty(ownerToken);

    await request(app()).patch(exploreMapPath(property.id)).send({ exploreMapEnabled: true }).expect(401);
    await request(app())
      .patch(exploreMapPath(property.id))
      .set(authHeader(contentToken))
      .send({ exploreMapEnabled: true })
      .expect(403);

    const unpublished = await request(app())
      .patch(exploreMapPath(property.id))
      .set(authHeader(ownerToken))
      .send({ exploreMapEnabled: true })
      .expect(409);
    expect(unpublished.body).toMatchObject({ code: "PROPERTY_EXPLORE_MAP_REQUIRES_PUBLIC" });

    await request(app()).post(publishPath(property.id)).set(authHeader(ownerToken)).expect(200);
    await Property.updateOne({ _id: property.id }, { $unset: { mapLocation: 1 } });

    const missingMap = await request(app())
      .patch(exploreMapPath(property.id))
      .set(authHeader(ownerToken))
      .send({ exploreMapEnabled: true })
      .expect(409);
    expect(missingMap.body).toMatchObject({ code: "PROPERTY_EXPLORE_MAP_REQUIRES_MAP" });

    const disabledWithoutMap = await request(app())
      .patch(exploreMapPath(property.id))
      .set(authHeader(ownerToken))
      .send({ exploreMapEnabled: false })
      .expect(200);
    expect(disabledWithoutMap.body.data.exploreMapEnabled).toBe(false);

    await Property.updateOne(
      { _id: property.id },
      { $set: { mapLocation: { type: "Point", coordinates: [79.8612, 6.9271] } } },
    );

    const enabled = await request(app())
      .patch(exploreMapPath(property.id))
      .set(authHeader(ownerToken))
      .send({ exploreMapEnabled: true })
      .expect(200);
    expect(enabled.body.data).toMatchObject({
      exploreMapEnabled: true,
      featured: false,
      isPublic: true,
      status: PROPERTY_STATUSES.AVAILABLE,
    });

    const idempotent = await request(app())
      .patch(exploreMapPath(property.id))
      .set(authHeader(ownerToken))
      .send({ exploreMapEnabled: true })
      .expect(200);
    expect(idempotent.body.data.exploreMapEnabled).toBe(true);

    const disabled = await request(app())
      .patch(exploreMapPath(property.id))
      .set(authHeader(ownerToken))
      .send({ exploreMapEnabled: false })
      .expect(200);
    expect(disabled.body.data).toMatchObject({ exploreMapEnabled: false, isPublic: true });
  });

  it("allows valid operational status transitions without changing visibility flags", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPublishableProperty(token, {
      transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT, TRANSACTION_TYPES.LEASE],
      pricing: {
        currency: CURRENCIES.LKR,
        priceVisible: true,
        sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
        rent: { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 150000 },
        lease: { mode: PRICE_MODES.FIXED, period: LEASE_PERIODS.TOTAL, amount: 9000000 },
      },
    });
    await request(app()).post(publishPath(property.id)).set(authHeader(token)).expect(200);
    await Property.updateOne(
      { _id: property.id },
      { $set: { featured: true, exploreMapEnabled: true } },
    );

    const reserved = await request(app())
      .patch(statusPath(property.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.RESERVED })
      .expect(200);
    expect(reserved.body.data).toMatchObject({
      status: PROPERTY_STATUSES.RESERVED,
      isPublic: true,
      featured: true,
      exploreMapEnabled: true,
    });

    await request(app())
      .patch(statusPath(property.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.AVAILABLE })
      .expect(200);
    await request(app())
      .patch(statusPath(property.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.UNAVAILABLE })
      .expect(200);
    await request(app())
      .patch(statusPath(property.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.ARCHIVED })
      .expect(200);

    const stored = await Property.findById(property.id);
    expect(stored).toMatchObject({
      status: PROPERTY_STATUSES.ARCHIVED,
      isPublic: true,
      featured: true,
      exploreMapEnabled: true,
    });
  });



  it("unarchives archived properties without changing visibility controls", async () => {
    const owner = await createStaffUser({ email: "owner-unarchive@example.com" });
    const token = await loginAs(owner);
    const property = await createPublishableProperty(token);

    await Property.updateOne(
      { _id: property.id },
      {
        $set: {
          status: PROPERTY_STATUSES.ARCHIVED,
          isPublic: false,
          featured: false,
          exploreMapEnabled: false,
        },
      },
    );

    const response = await request(app())
      .post(unarchivePath(property.id))
      .set(authHeader(token))
      .expect(200);

    expect(response.body.data).toMatchObject({
      status: PROPERTY_STATUSES.AVAILABLE,
      isPublic: false,
      featured: false,
      exploreMapEnabled: false,
    });

    const stored = await Property.findById(property.id).lean();
    expect(stored.status).toBe(PROPERTY_STATUSES.AVAILABLE);
    expect(stored.isPublic).toBe(false);
    expect(stored.featured).toBe(false);
    expect(stored.exploreMapEnabled).toBe(false);
  });

  it("rejects invalid operational status transitions", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const draft = await createPublishableProperty(token);

    const draftTransition = await request(app())
      .patch(statusPath(draft.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.AVAILABLE })
      .expect(409);
    expect(draftTransition.body).toMatchObject({ code: "PROPERTY_STATUS_TRANSITION_INVALID" });

    await request(app()).post(publishPath(draft.id)).set(authHeader(token)).expect(200);
    const backToDraft = await request(app())
      .patch(statusPath(draft.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.DRAFT })
      .expect(409);
    expect(backToDraft.body).toMatchObject({ code: "PROPERTY_STATUS_TRANSITION_INVALID" });

    await Property.updateOne({ _id: draft.id }, { $set: { status: PROPERTY_STATUSES.SOLD } });
    const reopenClosed = await request(app())
      .patch(statusPath(draft.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.AVAILABLE })
      .expect(200);
    expect(reopenClosed.body.data.status).toBe(PROPERTY_STATUSES.AVAILABLE);

    await Property.updateOne({ _id: draft.id }, { $set: { status: PROPERTY_STATUSES.ARCHIVED } });
    const reopenArchived = await request(app())
      .patch(statusPath(draft.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.AVAILABLE })
      .expect(409);
    expect(reopenArchived.body).toMatchObject({ code: "PROPERTY_STATUS_TRANSITION_INVALID" });
  });

  it("requires matching transaction types for closed statuses", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const saleOnly = await createPublishableProperty(token);
    await request(app()).post(publishPath(saleOnly.id)).set(authHeader(token)).expect(200);

    const rented = await request(app())
      .patch(statusPath(saleOnly.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.RENTED })
      .expect(409);
    expect(rented.body).toMatchObject({
      code: "PROPERTY_STATUS_TRANSACTION_REQUIRED",
      details: { transactionType: TRANSACTION_TYPES.RENT },
    });

    const leased = await request(app())
      .patch(statusPath(saleOnly.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.LEASED })
      .expect(409);
    expect(leased.body).toMatchObject({
      code: "PROPERTY_STATUS_TRANSACTION_REQUIRED",
      details: { transactionType: TRANSACTION_TYPES.LEASE },
    });

    const rentOnly = await createPublishableProperty(token, {
      title: "Rent Only Status Property",
      transactionTypes: [TRANSACTION_TYPES.RENT],
      pricing: {
        currency: CURRENCIES.LKR,
        priceVisible: true,
        rent: { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 150000 },
      },
    });
    await request(app()).post(publishPath(rentOnly.id)).set(authHeader(token)).expect(200);

    const sold = await request(app())
      .patch(statusPath(rentOnly.id))
      .set(authHeader(token))
      .send({ status: PROPERTY_STATUSES.SOLD })
      .expect(409);
    expect(sold.body).toMatchObject({
      code: "PROPERTY_STATUS_TRANSACTION_REQUIRED",
      details: { transactionType: TRANSACTION_TYPES.SALE },
    });
  });

  it("requires property.archive only for archive status transitions", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const content = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const ownerToken = await loginAs(owner);
    const contentToken = await loginAs(content);
    const property = await createPublishableProperty(ownerToken);
    await request(app()).post(publishPath(property.id)).set(authHeader(ownerToken)).expect(200);

    await Role.updateOne(
      { key: STAFF_ROLES.CONTENT_MANAGER },
      { $set: { permissions: [PERMISSIONS.PROPERTY_EDIT] } },
    );

    await request(app())
      .patch(statusPath(property.id))
      .set(authHeader(contentToken))
      .send({ status: PROPERTY_STATUSES.RESERVED })
      .expect(200);

    await request(app())
      .patch(statusPath(property.id))
      .set(authHeader(contentToken))
      .send({ status: PROPERTY_STATUSES.ARCHIVED })
      .expect(403);

    await Role.updateOne(
      { key: STAFF_ROLES.CONTENT_MANAGER },
      { $set: { permissions: [PERMISSIONS.PROPERTY_ARCHIVE] } },
    );

    await request(app())
      .patch(statusPath(property.id))
      .set(authHeader(contentToken))
      .send({ status: PROPERTY_STATUSES.ARCHIVED })
      .expect(200);
  });
  it("moves properties to trash with exact purge timing and no Cloudinary deletion", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const content = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    await Role.updateOne(
      { key: STAFF_ROLES.CONTENT_MANAGER },
      { $set: { permissions: [PERMISSIONS.PROPERTY_VIEW] } },
    );
    const ownerToken = await loginAs(owner);
    const contentToken = await loginAs(content);
    const property = await createPublishableProperty(ownerToken);
    await request(app()).post(publishPath(property.id)).set(authHeader(ownerToken)).expect(200);
    await Property.updateOne(
      { _id: property.id },
      { $set: { featured: true, exploreMapEnabled: true } },
    );

    await request(app()).post(trashPath(property.id)).send({}).expect(401);
    await request(app())
      .post(trashPath(property.id))
      .set(authHeader(contentToken))
      .send({})
      .expect(403);

    const trashed = await request(app())
      .post(trashPath(property.id))
      .set(authHeader(ownerToken))
      .send({})
      .expect(200);

    expect(trashed.body.data).toMatchObject({
      id: property.id,
      code: property.code,
      isPublic: false,
      featured: false,
      exploreMapEnabled: false,
    });
    expect(trashed.body.data.deletedAt).toEqual(expect.any(String));
    expect(trashed.body.data.purgeAt).toEqual(expect.any(String));

    const stored = await Property.findById(property.id).select("+deletedBy");
    expect(stored.deletedAt).toBeInstanceOf(Date);
    expect(stored.purgeAt.getTime() - stored.deletedAt.getTime()).toBe(5 * 24 * 60 * 60 * 1000);
    expect(stored.deletedBy.toString()).toBe(owner._id.toString());
    expect(stored.isPublic).toBe(false);
    expect(stored.featured).toBe(false);
    expect(stored.exploreMapEnabled).toBe(false);
    expect(stored.media.images).toHaveLength(1);
    expect(propertyMediaCloudinaryMocks.deletePropertyImageFromCloudinary).not.toHaveBeenCalled();

    const secondTrash = await request(app())
      .post(trashPath(property.id))
      .set(authHeader(ownerToken))
      .send({})
      .expect(200);
    expect(secondTrash.body.data.deletedAt).toBe(trashed.body.data.deletedAt);
    expect(secondTrash.body.data.purgeAt).toBe(trashed.body.data.purgeAt);
  });

  it("restores before purge without republishing or changing code/media", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPublishableProperty(token);
    await request(app()).post(publishPath(property.id)).set(authHeader(token)).expect(200);
    await Property.updateOne(
      { _id: property.id },
      { $set: { featured: true, exploreMapEnabled: true } },
    );
    await request(app()).post(trashPath(property.id)).set(authHeader(token)).send({}).expect(200);

    const restored = await request(app())
      .post(restorePath(property.id))
      .set(authHeader(token))
      .send({})
      .expect(200);

    expect(restored.body.data).toMatchObject({
      id: property.id,
      code: property.code,
      isPublic: false,
      featured: false,
      exploreMapEnabled: false,
      deletedAt: null,
      purgeAt: null,
    });
    expect(restored.body.data.media.images).toHaveLength(1);

    const stored = await Property.findById(property.id).select("+deletedBy");
    expect(stored.deletedAt).toBeNull();
    expect(stored.purgeAt).toBeNull();
    expect(stored.deletedBy).toBeNull();
    expect(stored.code).toBe(property.code);
    expect(stored.media.images).toHaveLength(1);

    await request(app()).post(trashPath(property.id)).set(authHeader(token)).send({}).expect(200);
    await Property.updateOne(
      { _id: property.id },
      { $set: { purgeAt: new Date(Date.now() - 1) } },
    );

    const expiredRestore = await request(app())
      .post(restorePath(property.id))
      .set(authHeader(token))
      .send({})
      .expect(409);
    expect(expiredRestore.body).toMatchObject({ code: "PROPERTY_RESTORE_WINDOW_EXPIRED" });
  });

  it("lists only trashed properties separately from the normal admin list and detail route", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const active = await createPublishableProperty(token, { title: "Active Trash List Property" });
    const trashed = await createPublishableProperty(token, { title: "Trashed List Property" });
    await request(app()).post(trashPath(trashed.id)).set(authHeader(token)).send({}).expect(200);

    const trashList = await request(app()).get(trashListPath).set(authHeader(token)).expect(200);
    expect(trashList.body.data.map((item) => item.id)).toContain(trashed.id);
    expect(trashList.body.data.map((item) => item.id)).not.toContain(active.id);
    expect(trashList.body.data[0]).toMatchObject({
      deletedAt: expect.any(String),
      purgeAt: expect.any(String),
    });

    const normalList = await request(app())
      .get("/api/v1/admin/properties")
      .set(authHeader(token))
      .expect(200);
    expect(normalList.body.data.map((item) => item.id)).toContain(active.id);
    expect(normalList.body.data.map((item) => item.id)).not.toContain(trashed.id);

    await request(app())
      .get(`/api/v1/admin/properties/${trashed.id}`)
      .set(authHeader(token))
      .expect(404);
  });

  it("rejects lifecycle, public, and generic patch controls for trashed properties", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createPublishableProperty(token);
    await request(app()).post(publishPath(property.id)).set(authHeader(token)).expect(200);
    await request(app()).post(trashPath(property.id)).set(authHeader(token)).send({}).expect(200);

    for (const action of [
      () => request(app()).post(publishPath(property.id)).set(authHeader(token)).send({}),
      () => request(app()).post(unpublishPath(property.id)).set(authHeader(token)).send({}),
      () =>
        request(app())
          .patch(featuredPath(property.id))
          .set(authHeader(token))
          .send({ featured: false }),
      () =>
        request(app())
          .patch(exploreMapPath(property.id))
          .set(authHeader(token))
          .send({ exploreMapEnabled: false }),
      () =>
        request(app())
          .patch(statusPath(property.id))
          .set(authHeader(token))
          .send({ status: PROPERTY_STATUSES.AVAILABLE }),
    ]) {
      const response = await action().expect(409);
      expect(response.body).toMatchObject({ code: "PROPERTY_IN_TRASH" });
    }

    for (const blockedPatch of [
      { deletedAt: new Date().toISOString() },
      { purgeAt: new Date().toISOString() },
      { deletedBy: owner._id.toString() },
    ]) {
      await request(app())
        .patch(`/api/v1/admin/properties/${property.id}`)
        .set(authHeader(token))
        .send(blockedPatch)
        .expect(400);
    }
  });

  it("purges only expired trashed properties after deleting Cloudinary media", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const now = new Date("2026-01-10T10:00:00.000Z");
    const expired = await createPublishableProperty(token, { title: "Expired Purge Property" });
    const notExpired = await createPublishableProperty(token, { title: "Future Purge Property" });
    const expiredCode = expired.code;
    const expiredDeletedAt = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const notExpiredDeletedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await Property.updateOne(
      { _id: expired.id },
      {
        $set: {
          deletedAt: expiredDeletedAt,
          purgeAt: new Date(expiredDeletedAt.getTime() + 5 * 24 * 60 * 60 * 1000),
          deletedBy: owner._id,
          isPublic: false,
          featured: false,
          exploreMapEnabled: false,
        },
      },
    );
    await Property.updateOne(
      { _id: notExpired.id },
      {
        $set: {
          deletedAt: notExpiredDeletedAt,
          purgeAt: new Date(notExpiredDeletedAt.getTime() + 5 * 24 * 60 * 60 * 1000),
          deletedBy: owner._id,
          isPublic: false,
          featured: false,
          exploreMapEnabled: false,
        },
      },
    );

    const purgeResult = await purgeExpiredTrashedProperties({ env: authTestEnv, now });

    expect(purgeResult).toMatchObject({ purgedCount: 1, propertyIds: [expired.id] });
    expect(propertyMediaCloudinaryMocks.deletePropertyImageFromCloudinary).toHaveBeenCalledTimes(1);
    expect(propertyMediaCloudinaryMocks.deletePropertyImageFromCloudinary).toHaveBeenCalledWith({
      env: authTestEnv,
      publicId: "landzo/properties/LND-00001/publish-cover",
    });
    await expect(Property.findById(expired.id)).resolves.toBeNull();
    await expect(Property.findById(notExpired.id)).resolves.not.toBeNull();

    const nextProperty = await createPropertyViaApi(
      token,
      minimalPropertyInput({ title: "Code Nonreuse After Purge" }),
    );
    expect(nextProperty.code).not.toBe(expiredCode);
  });
});


