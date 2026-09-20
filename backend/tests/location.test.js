import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import { searchPlaces } from "../src/modules/geocoding/geocoding.service.js";
import { LOCATION_LEVELS, LOCATION_STATUSES } from "../src/modules/locations/location.constants.js";
import { Location } from "../src/modules/locations/location.model.js";
import {
  PERMISSIONS,
  PERMISSION_VALUES,
} from "../src/modules/roles-permissions/permission.constants.js";
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
const missingLocationId = "000000000000000000000000";

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

const createProvince = async (token, name = "Western Province") => {
  const response = await request(app())
    .post("/api/v1/admin/locations")
    .set(authHeader(token))
    .send({ name, level: LOCATION_LEVELS.PROVINCE, sortOrder: 1 })
    .expect(201);

  return response.body.data;
};

const createDistrict = async (token, parentId, name = "Colombo District") => {
  const response = await request(app())
    .post("/api/v1/admin/locations")
    .set(authHeader(token))
    .send({ name, level: LOCATION_LEVELS.DISTRICT, parentId, sortOrder: 10 })
    .expect(201);

  return response.body.data;
};

const createCity = async (token, parentId, name = "Colombo") => {
  const response = await request(app())
    .post("/api/v1/admin/locations")
    .set(authHeader(token))
    .send({ name, level: LOCATION_LEVELS.CITY, parentId, sortOrder: 20 })
    .expect(201);

  return response.body.data;
};

const createArea = async (token, parentId, name = "Colombo 03") => {
  const response = await request(app())
    .post("/api/v1/admin/locations")
    .set(authHeader(token))
    .send({ name, level: LOCATION_LEVELS.AREA, parentId, sortOrder: 30 })
    .expect(201);

  return response.body.data;
};

const createHierarchy = async (token) => {
  const province = await createProvince(token);
  const district = await createDistrict(token, province.id);
  const city = await createCity(token, district.id);
  const area = await createArea(token, city.id);

  return { province, district, city, area };
};

const expectSafeLocation = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).not.toContain("canonicalkey");
  expect(serialized).not.toContain("createdby");
  expect(serialized).not.toContain("updatedby");
  expect(serialized).not.toContain("__v");
};

describe("location catalog and hierarchy", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
    await Location.init();
  });

  beforeEach(async () => {
    vi.unstubAllGlobals();
    await clearTestDatabase();
    await bootstrapSystemRoles();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("creates a valid Province, District, City, and Area with generated identity fields", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);

    const { province, district, city, area } = await createHierarchy(token);

    expect(province).toMatchObject({
      name: "Western Province",
      level: LOCATION_LEVELS.PROVINCE,
      slug: "western-province",
      status: LOCATION_STATUSES.ACTIVE,
      parent: null,
    });
    expect(district.parent).toMatchObject({ id: province.id, level: LOCATION_LEVELS.PROVINCE });
    expect(city.parent).toMatchObject({ id: district.id, level: LOCATION_LEVELS.DISTRICT });
    expect(area.parent).toMatchObject({ id: city.id, level: LOCATION_LEVELS.CITY });
    expect(area.slug).toBe("colombo-3");
    expectSafeLocation(area);

    const storedArea = await Location.findById(area.id).select("+canonicalKey +createdBy");
    expect(storedArea.canonicalKey).toBe("colombo 3");
    expect(storedArea.createdBy.toString()).toBe(owner._id.toString());
  });

  it("rejects invalid hierarchy structures and nonexistent parents", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const province = await createProvince(token);
    const district = await createDistrict(token, province.id);

    const invalidCases = [
      {
        body: { name: "Nested Province", level: LOCATION_LEVELS.PROVINCE, parentId: province.id },
        code: "INVALID_LOCATION_HIERARCHY",
      },
      {
        body: { name: "No Parent District", level: LOCATION_LEVELS.DISTRICT },
        code: "INVALID_LOCATION_HIERARCHY",
      },
      {
        body: {
          name: "District Under District",
          level: LOCATION_LEVELS.DISTRICT,
          parentId: district.id,
        },
        code: "INVALID_LOCATION_HIERARCHY",
      },
      {
        body: { name: "City Under Province", level: LOCATION_LEVELS.CITY, parentId: province.id },
        code: "INVALID_LOCATION_HIERARCHY",
      },
      {
        body: { name: "Area Under District", level: LOCATION_LEVELS.AREA, parentId: district.id },
        code: "INVALID_LOCATION_HIERARCHY",
      },
      {
        body: {
          name: "Missing Parent",
          level: LOCATION_LEVELS.DISTRICT,
          parentId: missingLocationId,
        },
        code: "LOCATION_PARENT_NOT_FOUND",
      },
    ];

    for (const invalidCase of invalidCases) {
      const response = await request(app())
        .post("/api/v1/admin/locations")
        .set(authHeader(token))
        .send(invalidCase.body)
        .expect(invalidCase.code === "LOCATION_PARENT_NOT_FOUND" ? 404 : 400);

      expect(response.body).toMatchObject({ code: invalidCase.code });
    }
  });

  it("public location catalog only exposes active hierarchy options", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const province = await createProvince(token, "Western Province");
    const district = await createDistrict(token, province.id, "Colombo District");
    const city = await createCity(token, district.id, "Colombo");
    const area = await createArea(token, city.id, "Colombo 03");

    const provinces = await request(app())
      .get("/api/v1/locations")
      .query({ level: LOCATION_LEVELS.PROVINCE, limit: 20 })
      .expect(200);

    expect(provinces.body.data.some((item) => item.id === province.id)).toBe(true);

    const districts = await request(app())
      .get("/api/v1/locations")
      .query({ level: LOCATION_LEVELS.DISTRICT, parentId: province.id, limit: 20 })
      .expect(200);

    expect(districts.body.data.some((item) => item.id === district.id)).toBe(true);

    const cityOptions = await request(app())
      .get("/api/v1/locations")
      .query({ level: LOCATION_LEVELS.CITY, parentId: district.id, limit: 20 })
      .expect(200);

    expect(cityOptions.body.data).toHaveLength(1);
    expect(cityOptions.body.data[0]).toMatchObject({ id: city.id, name: "Colombo" });

    const areaOptions = await request(app())
      .get("/api/v1/locations")
      .query({ level: LOCATION_LEVELS.AREA, parentId: city.id, limit: 20 })
      .expect(200);

    expect(areaOptions.body.data).toHaveLength(1);
    expect(areaOptions.body.data[0]).toMatchObject({ id: area.id, name: "Colombo 03" });

    await request(app())
      .patch(`/api/v1/admin/locations/${area.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.INACTIVE })
      .expect(200);

    await request(app())
      .patch(`/api/v1/admin/locations/${city.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.INACTIVE })
      .expect(200);

    await request(app())
      .patch(`/api/v1/admin/locations/${district.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.INACTIVE })
      .expect(200);

    const inactiveCityOptions = await request(app())
      .get("/api/v1/locations")
      .query({ level: LOCATION_LEVELS.CITY, parentId: district.id, limit: 20 })
      .expect(409);

    expect(inactiveCityOptions.body).toMatchObject({ code: "LOCATION_PARENT_INACTIVE" });
  });

  it("public location catalog rejects broken hierarchy queries", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const province = await createProvince(token, "Western Province");

    const invalidParentResponse = await request(app())
      .get("/api/v1/locations")
      .query({ level: LOCATION_LEVELS.CITY, parentId: province.id })
      .expect(400);

    expect(invalidParentResponse.body).toMatchObject({ code: "INVALID_LOCATION_HIERARCHY" });
  });

  it("rejects active children beneath inactive parents", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const province = await createProvince(token, "Northern Province");

    await request(app())
      .patch(`/api/v1/admin/locations/${province.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.INACTIVE })
      .expect(200);

    const response = await request(app())
      .post("/api/v1/admin/locations")
      .set(authHeader(token))
      .send({ name: "Jaffna District", level: LOCATION_LEVELS.DISTRICT, parentId: province.id })
      .expect(409);

    expect(response.body).toMatchObject({ code: "LOCATION_PARENT_INACTIVE" });
  });

  it("prevents canonical duplicates under the same parent", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const { city } = await createHierarchy(token);

    await request(app())
      .post("/api/v1/admin/locations")
      .set(authHeader(token))
      .send({ name: "Colombo 3", level: LOCATION_LEVELS.AREA, parentId: city.id })
      .expect(409)
      .expect((response) => {
        expect(response.body).toMatchObject({ code: "LOCATION_ALREADY_EXISTS" });
      });

    await request(app())
      .post("/api/v1/admin/locations")
      .set(authHeader(token))
      .send({ name: "Colombo-03", level: LOCATION_LEVELS.AREA, parentId: city.id })
      .expect(409)
      .expect((response) => {
        expect(response.body).toMatchObject({ code: "LOCATION_ALREADY_EXISTS" });
      });
  });

  it("lists locations with pagination, level, parent, status, and safe search filters", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const { province, district, area } = await createHierarchy(token);
    const central = await createProvince(token, "Central Province");
    const inactiveDistrict = await createDistrict(token, central.id, "Kandy District");

    await request(app())
      .patch(`/api/v1/admin/locations/${inactiveDistrict.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.INACTIVE })
      .expect(200);

    const paginated = await request(app())
      .get("/api/v1/admin/locations?level=province&page=1&limit=1")
      .set(authHeader(token))
      .expect(200);
    expect(paginated.body.data).toHaveLength(1);
    expect(paginated.body.meta).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });

    const byParent = await request(app())
      .get(`/api/v1/admin/locations?level=district&parentId=${province.id}`)
      .set(authHeader(token))
      .expect(200);
    expect(byParent.body.data).toHaveLength(1);
    expect(byParent.body.data[0]).toMatchObject({ id: district.id });

    const byStatus = await request(app())
      .get("/api/v1/admin/locations?status=inactive")
      .set(authHeader(token))
      .expect(200);
    expect(byStatus.body.data).toHaveLength(1);
    expect(byStatus.body.data[0]).toMatchObject({ id: inactiveDistrict.id });

    const bySearch = await request(app())
      .get("/api/v1/admin/locations?search=Colombo-03")
      .set(authHeader(token))
      .expect(200);
    expect(bySearch.body.data.map((location) => location.id)).toContain(area.id);
    expectSafeLocation(bySearch.body);

    await request(app())
      .get("/api/v1/admin/locations?search=(Colombo-03")
      .set(authHeader(token))
      .expect(200);
  });

  it("returns safe location detail and stable not-found errors", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const { area, city } = await createHierarchy(token);

    const response = await request(app())
      .get(`/api/v1/admin/locations/${area.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: area.id,
      name: "Colombo 03",
      parent: { id: city.id, name: "Colombo", level: LOCATION_LEVELS.CITY },
    });
    expectSafeLocation(response.body);

    const missing = await request(app())
      .get(`/api/v1/admin/locations/${missingLocationId}`)
      .set(authHeader(token))
      .expect(404);
    expect(missing.body).toMatchObject({ code: "LOCATION_NOT_FOUND" });
  });

  it("matches structured geocoding hierarchy without using POI names as catalog areas", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const province = await createProvince(token, "Northern Province");
    const district = await createDistrict(token, province.id, "Jaffna District");
    const city = await createCity(token, district.id, "Jaffna");
    const area = await createArea(token, city.id, "Nallur");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        place_id: 9001,
        name: "Chief Minister's Secretariat-Nothern Province",
        display_name: "Chief Minister's Secretariat-Nothern Province, Somasundram Lane, Nallur, Jaffna District, Northern Province, 40000, Sri Lanka",
        lat: "9.674214",
        lon: "80.029801",
        address: {
          state: "Northern Province",
          county: "Jaffna District",
          city: "Jaffna",
          suburb: "Nallur",
          road: "Somasundram Lane",
          postcode: "40000",
          country: "Sri Lanka",
        },
      }],
    }));

    const suggestions = await searchPlaces({ q: "Nallur Jaffna" });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      map: { lat: 9.674214, lng: 80.029801 },
      detectedLocation: { level: LOCATION_LEVELS.AREA, name: "Nallur" },
      matches: {
        province: { id: province.id, name: "Northern Province", level: LOCATION_LEVELS.PROVINCE },
        district: { id: district.id, name: "Jaffna District", level: LOCATION_LEVELS.DISTRICT },
        city: { id: city.id, name: "Jaffna", level: LOCATION_LEVELS.CITY },
        area: { id: area.id, name: "Nallur", level: LOCATION_LEVELS.AREA },
      },
    });
    expect(suggestions[0].suggestedNames.area).toContain("Nallur");
    expect(suggestions[0].suggestedNames.area).not.toContain("Chief Minister's Secretariat-Nothern Province");
  });
  it("classifies Sri Lankan village settlements as City candidates and creates them under District", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const province = await createProvince(token, "North Central Province");
    const district = await createDistrict(token, province.id, "Anuradhapura District");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        place_id: 9003,
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

    const suggestions = await searchPlaces({ q: "Ikirigollewa" });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      map: { lat: 8.47063, lng: 80.508873 },
      detectedLocation: { level: LOCATION_LEVELS.CITY, name: "Ikirigollewa" },
      matches: {
        province: { id: province.id, name: "North Central Province", level: LOCATION_LEVELS.PROVINCE },
        district: { id: district.id, name: "Anuradhapura District", level: LOCATION_LEVELS.DISTRICT },
        city: null,
        area: null,
      },
    });
    expect(suggestions[0].suggestedNames.city).toEqual(["Ikirigollewa"]);
    expect(suggestions[0].suggestedNames.area).toEqual([]);

    const createdCity = await request(app())
      .post("/api/v1/admin/locations")
      .set(authHeader(token))
      .send({
        name: suggestions[0].suggestedNames.city[0],
        level: LOCATION_LEVELS.CITY,
        parentId: suggestions[0].matches.district.id,
        sortOrder: 0,
      })
      .expect(201);

    expect(createdCity.body.data).toMatchObject({
      name: "Ikirigollewa",
      level: LOCATION_LEVELS.CITY,
      parent: { id: district.id, level: LOCATION_LEVELS.DISTRICT },
    });
  });
  it("matches Batticaloa structured geocoding fields to the correct catalog hierarchy", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const province = await createProvince(token, "Eastern");
    const district = await createDistrict(token, province.id, "Batticaloa District");
    const city = await createCity(token, district.id, "Batticaloa");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        place_id: 9002,
        name: "Batticaloa",
        display_name: "Batticaloa, Manmunai North DS Division, Batticaloa District, Eastern Province, 30100, Sri Lanka",
        lat: "7.716667",
        lon: "81.700000",
        address: {
          railway: "Batticaloa",
          road: "Station Road",
          city: "Batticaloa",
          county: "Manmunai North DS Division",
          state_district: "Batticaloa District",
          state: "Eastern Province",
          postcode: "30100",
          country: "Sri Lanka",
          country_code: "lk",
        },
      }],
    }));

    const suggestions = await searchPlaces({ q: "Batticaloa Eastern Province" });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      map: { lat: 7.716667, lng: 81.7 },
      detectedLocation: { level: LOCATION_LEVELS.CITY, name: "Batticaloa" },
      matches: {
        province: { id: province.id, name: "Eastern", level: LOCATION_LEVELS.PROVINCE },
        district: { id: district.id, name: "Batticaloa District", level: LOCATION_LEVELS.DISTRICT },
        city: { id: city.id, name: "Batticaloa", level: LOCATION_LEVELS.CITY },
        area: null,
      },
    });
    expect(suggestions[0].suggestedNames.province).toContain("Eastern Province");
    expect(suggestions[0].suggestedNames.district).toContain("Batticaloa District");
    expect(suggestions[0].suggestedNames.city).toEqual(["Batticaloa"]);
    expect(suggestions[0].suggestedNames.city).not.toContain("Manmunai North DS Division");
  });
  it("updates names, regenerates canonical identity, and supports valid reparenting", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const { district, city, area } = await createHierarchy(token);
    const alternateCity = await createCity(token, district.id, "Dehiwala");

    const renamed = await request(app())
      .patch(`/api/v1/admin/locations/${area.id}`)
      .set(authHeader(token))
      .send({ name: "Colombo 05", sortOrder: 55 })
      .expect(200);
    expect(renamed.body.data).toMatchObject({
      name: "Colombo 05",
      slug: "colombo-5",
      sortOrder: 55,
    });

    const stored = await Location.findById(area.id).select("+canonicalKey +updatedBy");
    expect(stored.canonicalKey).toBe("colombo 5");
    expect(stored.updatedBy.toString()).toBe(owner._id.toString());

    const reparented = await request(app())
      .patch(`/api/v1/admin/locations/${area.id}`)
      .set(authHeader(token))
      .send({ parentId: alternateCity.id })
      .expect(200);
    expect(reparented.body.data.parent).toMatchObject({ id: alternateCity.id });

    const invalidReparent = await request(app())
      .patch(`/api/v1/admin/locations/${area.id}`)
      .set(authHeader(token))
      .send({ parentId: district.id })
      .expect(400);
    expect(invalidReparent.body).toMatchObject({ code: "INVALID_LOCATION_HIERARCHY" });

    await request(app())
      .patch(`/api/v1/admin/locations/${city.id}`)
      .set(authHeader(token))
      .send({ level: LOCATION_LEVELS.PROVINCE })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({ code: "VALIDATION_ERROR" });
      });

    await request(app())
      .patch(`/api/v1/admin/locations/${city.id}`)
      .set(authHeader(token))
      .send({ canonicalKey: "manual", slug: "manual" })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({ code: "VALIDATION_ERROR" });
      });
  });

  it("enforces status rules for active children and inactive parents", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const { province, district } = await createHierarchy(token);

    const blockedParent = await request(app())
      .patch(`/api/v1/admin/locations/${province.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.INACTIVE })
      .expect(409);
    expect(blockedParent.body).toMatchObject({ code: "LOCATION_HAS_ACTIVE_CHILDREN" });

    await Location.updateMany(
      { parent: district.id },
      { $set: { status: LOCATION_STATUSES.INACTIVE } },
    );

    const deactivatedLeaf = await request(app())
      .patch(`/api/v1/admin/locations/${district.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.INACTIVE })
      .expect(200);
    expect(deactivatedLeaf.body.data.status).toBe(LOCATION_STATUSES.INACTIVE);

    await request(app())
      .patch(`/api/v1/admin/locations/${province.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.INACTIVE })
      .expect(200);

    const blockedActivation = await request(app())
      .patch(`/api/v1/admin/locations/${district.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.ACTIVE })
      .expect(409);
    expect(blockedActivation.body).toMatchObject({ code: "LOCATION_PARENT_INACTIVE" });

    await request(app())
      .patch(`/api/v1/admin/locations/${province.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.ACTIVE })
      .expect(200);

    const reactivated = await request(app())
      .patch(`/api/v1/admin/locations/${district.id}/status`)
      .set(authHeader(token))
      .send({ status: LOCATION_STATUSES.ACTIVE })
      .expect(200);
    expect(reactivated.body.data.status).toBe(LOCATION_STATUSES.ACTIVE);
  });

  it("protects location APIs with RBAC and exposes location permissions to Owner", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const contentManager = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const ownerToken = await loginAs(owner);
    const contentToken = await loginAs(contentManager);

    await request(app()).get("/api/v1/admin/locations").expect(401);

    await request(app()).get("/api/v1/admin/locations").set(authHeader(contentToken)).expect(403);

    await Role.updateOne(
      { key: STAFF_ROLES.CONTENT_MANAGER },
      { $set: { permissions: [PERMISSIONS.LOCATION_VIEW] } },
    );

    await request(app()).get("/api/v1/admin/locations").set(authHeader(contentToken)).expect(200);

    await request(app())
      .post("/api/v1/admin/locations")
      .set(authHeader(contentToken))
      .send({ name: "Western Province", level: LOCATION_LEVELS.PROVINCE })
      .expect(403);

    await Role.updateOne(
      { key: STAFF_ROLES.CONTENT_MANAGER },
      { $set: { permissions: [PERMISSIONS.LOCATION_MANAGE] } },
    );

    await request(app())
      .post("/api/v1/admin/locations")
      .set(authHeader(contentToken))
      .send({ name: "Western Province", level: LOCATION_LEVELS.PROVINCE })
      .expect(201);

    const me = await request(app())
      .get("/api/v1/admin/auth/me")
      .set(authHeader(ownerToken))
      .expect(200);
    expect(me.body.data.permissions).toEqual(expect.arrayContaining(PERMISSION_VALUES));
    expect(me.body.data.permissions).toEqual(
      expect.arrayContaining([PERMISSIONS.LOCATION_VIEW, PERMISSIONS.LOCATION_MANAGE]),
    );
  });

  it("keeps RBAC bootstrap and permission catalog behavior stable after adding location permissions", async () => {
    const owner = await createStaffUser({ email: "owner@example.com", role: STAFF_ROLES.OWNER });
    const token = await loginAs(owner);
    const customPermissions = [PERMISSIONS.ENQUIRY_VIEW];

    await Role.updateOne({ key: STAFF_ROLES.ADMIN }, { $set: { permissions: customPermissions } });

    await bootstrapSystemRoles();

    const adminRole = await Role.findOne({ key: STAFF_ROLES.ADMIN });
    expect(adminRole.permissions).toEqual(customPermissions);

    const catalog = await request(app())
      .get("/api/v1/admin/roles/permissions")
      .set(authHeader(token))
      .expect(200);
    expect(catalog.body.data.locations).toEqual([
      PERMISSIONS.LOCATION_VIEW,
      PERMISSIONS.LOCATION_MANAGE,
    ]);

    await request(app())
      .patch(`/api/v1/admin/roles/${STAFF_ROLES.ADMIN}/permissions`)
      .set(authHeader(token))
      .send({ permissions: ["location.unknown"] })
      .expect(400);
  });
});




