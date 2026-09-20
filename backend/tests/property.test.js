import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import { LOCATION_LEVELS, LOCATION_STATUSES } from "../src/modules/locations/location.constants.js";
import { Location } from "../src/modules/locations/location.model.js";
import { Property } from "../src/modules/properties/property.model.js";
import {
  BUILDING_SIZE_UNITS,
  COMMERCIAL_TYPES,
  FURNISHED_STATUSES,
  LAND_SIZE_UNITS,
  LAND_TYPES,
  LAND_UTILITIES,
  PROPERTY_CODE_PREFIXES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_VALUES,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { serializeProperty } from "../src/modules/properties/property.serializer.js";
import {
  createPropertyDraft,
  validatePropertyLocationHierarchy,
} from "../src/modules/properties/property.service.js";
import { PropertyCodeCounter } from "../src/modules/properties/propertyCode.model.js";
import { Role } from "../src/modules/roles-permissions/role.model.js";
import { bootstrapSystemRoles } from "../src/modules/roles-permissions/role.service.js";
import { User } from "../src/modules/users/user.model.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from "./helpers/testDatabase.js";

const password = "CorrectHorse123";

const createStaffUser = async ({
  fullName = "Landzo Owner",
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

const baseInput = (overrides = {}) => ({
  type: PROPERTY_TYPES.LAND,
  transactionTypes: [TRANSACTION_TYPES.SALE],
  title: "Residential Land in Colombo 03",
  ...overrides,
});

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

const createDraft = (actor, input) => createPropertyDraft({ actorUserId: actor._id, input });

const expectSafeProperty = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).not.toContain("__v");
  expect(serialized).not.toContain("propertycodecounter");
  expect(serialized).not.toContain("createdby");
  expect(serialized).not.toContain("updatedby");
  expect(serialized).not.toContain("seller");
  expect(serialized).not.toContain("private");
};

describe("core property domain", () => {
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
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("generates code prefixes and independent sequences per property type", async () => {
    const actor = await createStaffUser();

    const landOne = await createDraft(actor, baseInput());
    const landTwo = await createDraft(actor, baseInput({ title: "Second Land" }));
    const house = await createDraft(
      actor,
      baseInput({
        type: PROPERTY_TYPES.HOUSE,
        title: "Family House",
        transactionTypes: [TRANSACTION_TYPES.RENT],
      }),
    );
    const apartment = await createDraft(
      actor,
      baseInput({
        type: PROPERTY_TYPES.APARTMENT,
        title: "Apartment Unit",
        transactionTypes: [TRANSACTION_TYPES.SALE],
      }),
    );
    const commercial = await createDraft(
      actor,
      baseInput({
        type: PROPERTY_TYPES.COMMERCIAL,
        title: "Commercial Space",
        transactionTypes: [TRANSACTION_TYPES.LEASE],
      }),
    );

    expect(landOne.code).toBe("LND-00001");
    expect(landTwo.code).toBe("LND-00002");
    expect(house.code).toBe("HSE-00001");
    expect(apartment.code).toBe("APT-00001");
    expect(commercial.code).toBe("COM-00001");
    expect(PROPERTY_CODE_PREFIXES).toMatchObject({
      [PROPERTY_TYPES.LAND]: "LND",
      [PROPERTY_TYPES.HOUSE]: "HSE",
      [PROPERTY_TYPES.APARTMENT]: "APT",
      [PROPERTY_TYPES.COMMERCIAL]: "COM",
    });
  });

  it("does not reuse property codes after deletion in the isolated test context", async () => {
    const actor = await createStaffUser();
    const first = await createDraft(actor, baseInput());

    await Property.deleteOne({ code: first.code });

    const second = await createDraft(actor, baseInput({ title: "Replacement Land" }));

    expect(first.code).toBe("LND-00001");
    expect(second.code).toBe("LND-00002");
  });

  it("generates unique codes under concurrent draft creation", async () => {
    const actor = await createStaffUser();

    const drafts = await Promise.all(
      Array.from({ length: 12 }, (_value, index) =>
        createDraft(
          actor,
          baseInput({
            type: PROPERTY_TYPES.APARTMENT,
            title: `Concurrent Apartment ${index + 1}`,
            transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
          }),
        ),
      ),
    );

    const codes = drafts.map((draft) => draft.code).sort();
    expect(new Set(codes).size).toBe(12);
    expect(codes).toEqual([
      "APT-00001",
      "APT-00002",
      "APT-00003",
      "APT-00004",
      "APT-00005",
      "APT-00006",
      "APT-00007",
      "APT-00008",
      "APT-00009",
      "APT-00010",
      "APT-00011",
      "APT-00012",
    ]);
  });

  it("keeps property code and type immutable while allowing title slug regeneration", async () => {
    const actor = await createStaffUser();
    const draft = await createDraft(actor, baseInput());
    const property = await Property.findById(draft.id);

    property.title = "Updated Land Title";
    await property.save();

    const updatedTitle = await Property.findById(draft.id);
    expect(updatedTitle.code).toBe("LND-00001");
    expect(updatedTitle.type).toBe(PROPERTY_TYPES.LAND);
    expect(updatedTitle.slug).toBe("updated-land-title");

    updatedTitle.code = "HSE-99999";
    updatedTitle.type = PROPERTY_TYPES.HOUSE;
    await updatedTitle.save();

    const reloaded = await Property.findById(draft.id);
    expect(reloaded.code).toBe("LND-00001");
    expect(reloaded.type).toBe(PROPERTY_TYPES.LAND);
  });

  it("accepts valid transaction type arrays and normalizes order", async () => {
    const actor = await createStaffUser();

    await expect(
      createDraft(actor, baseInput({ transactionTypes: [TRANSACTION_TYPES.SALE] })),
    ).resolves.toMatchObject({
      transactionTypes: [TRANSACTION_TYPES.SALE],
    });
    await expect(
      createDraft(actor, baseInput({ transactionTypes: [TRANSACTION_TYPES.RENT] })),
    ).resolves.toMatchObject({
      transactionTypes: [TRANSACTION_TYPES.RENT],
    });
    await expect(
      createDraft(actor, baseInput({ transactionTypes: [TRANSACTION_TYPES.LEASE] })),
    ).resolves.toMatchObject({
      transactionTypes: [TRANSACTION_TYPES.LEASE],
    });
    await expect(
      createDraft(
        actor,
        baseInput({ transactionTypes: [TRANSACTION_TYPES.RENT, TRANSACTION_TYPES.SALE] }),
      ),
    ).resolves.toMatchObject({
      transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
    });
  });

  it("rejects invalid transaction type inputs", async () => {
    const actor = await createStaffUser();

    await expect(createDraft(actor, baseInput({ transactionTypes: [] }))).rejects.toMatchObject({
      code: "INVALID_TRANSACTION_TYPES",
    });
    await expect(
      createDraft(
        actor,
        baseInput({ transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.SALE] }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_TRANSACTION_TYPES" });
    await expect(
      createDraft(actor, baseInput({ transactionTypes: ["invalid"] })),
    ).rejects.toMatchObject({
      code: "INVALID_TRANSACTION_TYPES",
    });
    await expect(
      createDraft(actor, baseInput({ transactionTypes: TRANSACTION_TYPES.SALE })),
    ).rejects.toMatchObject({
      code: "INVALID_TRANSACTION_TYPES",
    });
  });

  it("accepts exactly the four approved property types and rejects arbitrary values", async () => {
    const actor = await createStaffUser();

    for (const type of PROPERTY_TYPE_VALUES) {
      const draft = await createDraft(actor, baseInput({ type, title: `${type} draft` }));
      expect(draft.type).toBe(type);
    }

    await expect(createDraft(actor, baseInput({ type: "villa" }))).rejects.toMatchObject({
      code: "INVALID_PROPERTY_TYPE",
    });
  });

  it("defaults to draft and accepts only approved statuses", async () => {
    const actor = await createStaffUser();
    const defaultDraft = await createDraft(actor, baseInput());

    expect(defaultDraft.status).toBe(PROPERTY_STATUSES.DRAFT);

    for (const status of Object.values(PROPERTY_STATUSES)) {
      const draft = await createDraft(actor, baseInput({ title: `Status ${status}`, status }));
      expect(draft.status).toBe(status);
    }

    await expect(createDraft(actor, baseInput({ status: "published" }))).rejects.toMatchObject({
      code: "INVALID_PROPERTY_DETAILS",
    });
  });

  it("keeps public, Explore Map, and featured flags independent", async () => {
    const actor = await createStaffUser();
    const defaults = await createDraft(actor, baseInput());

    expect(defaults).toMatchObject({ isPublic: false, exploreMapEnabled: false, featured: false });

    const visibleOnly = await createDraft(
      actor,
      baseInput({
        title: "Visible Only",
        isPublic: true,
        exploreMapEnabled: false,
        featured: true,
      }),
    );

    expect(visibleOnly).toMatchObject({ isPublic: true, exploreMapEnabled: false, featured: true });
  });

  it("validates full and partial Location Catalog references", async () => {
    const actor = await createStaffUser();
    const { province, district, city, area } = await createLocationHierarchy();

    const full = await createDraft(
      actor,
      baseInput({
        location: {
          province: province._id.toString(),
          district: district._id.toString(),
          city: city._id.toString(),
          area: area._id.toString(),
          displayAddress: "No. 25, Galle Road, Colombo 03",
        },
      }),
    );

    expect(full.location).toMatchObject({
      province: province._id.toString(),
      district: district._id.toString(),
      city: city._id.toString(),
      area: area._id.toString(),
      displayAddress: "No. 25, Galle Road, Colombo 03",
    });

    const provinceOnly = await createDraft(
      actor,
      baseInput({ title: "Province Only Draft", location: { province: province._id.toString() } }),
    );
    expect(provinceOnly.location).toMatchObject({
      province: province._id.toString(),
      district: null,
    });

    await expect(
      validatePropertyLocationHierarchy({
        province: province._id.toString(),
        district: district._id.toString(),
      }),
    ).resolves.toMatchObject({ province: province._id, district: district._id });
  });

  it("rejects invalid property location hierarchy and inactive locations", async () => {
    const actor = await createStaffUser();
    const first = await createLocationHierarchy();
    const second = await createLocationHierarchy(" Two");

    await expect(
      createDraft(
        actor,
        baseInput({
          location: {
            province: second.province._id.toString(),
            district: first.district._id.toString(),
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "PROPERTY_LOCATION_INVALID" });

    await expect(
      createDraft(
        actor,
        baseInput({
          location: {
            province: first.province._id.toString(),
            district: first.district._id.toString(),
            city: second.city._id.toString(),
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "PROPERTY_LOCATION_INVALID" });

    await expect(
      createDraft(
        actor,
        baseInput({
          location: {
            province: first.province._id.toString(),
            district: first.district._id.toString(),
            city: first.city._id.toString(),
            area: second.area._id.toString(),
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "PROPERTY_LOCATION_INVALID" });

    await expect(
      createDraft(actor, baseInput({ location: { city: first.city._id.toString() } })),
    ).rejects.toMatchObject({ code: "PROPERTY_LOCATION_INVALID" });

    await expect(
      createDraft(actor, baseInput({ location: { area: first.area._id.toString() } })),
    ).rejects.toMatchObject({ code: "PROPERTY_LOCATION_INVALID" });

    first.area.status = LOCATION_STATUSES.INACTIVE;
    await first.area.save();

    await expect(
      createDraft(
        actor,
        baseInput({
          location: {
            province: first.province._id.toString(),
            district: first.district._id.toString(),
            city: first.city._id.toString(),
            area: first.area._id.toString(),
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "PROPERTY_LOCATION_INACTIVE" });
  });

  it("accepts valid partial subtype details for every property type", async () => {
    const actor = await createStaffUser();

    await expect(
      createDraft(
        actor,
        baseInput({
          type: PROPERTY_TYPES.LAND,
          details: {
            land: {
              landSize: 12.5,
              landSizeUnit: LAND_SIZE_UNITS.PERCH,
              landType: LAND_TYPES.RESIDENTIAL,
              roadAccess: true,
              roadWidth: 20,
              utilities: [LAND_UTILITIES.WATER, LAND_UTILITIES.ELECTRICITY],
            },
          },
        }),
      ),
    ).resolves.toMatchObject({ details: { land: { landSize: 12.5 } } });

    await expect(
      createDraft(
        actor,
        baseInput({
          type: PROPERTY_TYPES.HOUSE,
          title: "House Draft",
          details: {
            house: {
              bedrooms: 3,
              bathrooms: 2,
              floors: 2,
              landSize: 10,
              landSizeUnit: LAND_SIZE_UNITS.PERCH,
              houseSize: 1800,
              houseSizeUnit: BUILDING_SIZE_UNITS.SQUARE_FEET,
              parkingSpaces: 1,
              furnishedStatus: FURNISHED_STATUSES.SEMI_FURNISHED,
            },
          },
        }),
      ),
    ).resolves.toMatchObject({ details: { house: { bedrooms: 3 } } });

    await expect(
      createDraft(
        actor,
        baseInput({
          type: PROPERTY_TYPES.APARTMENT,
          title: "Apartment Draft",
          details: {
            apartment: {
              bedrooms: 2,
              bathrooms: 1,
              floorNumber: 5,
              totalFloors: 12,
              unitSize: 950,
              unitSizeUnit: BUILDING_SIZE_UNITS.SQUARE_FEET,
              parkingSpaces: 1,
              furnishedStatus: FURNISHED_STATUSES.FURNISHED,
            },
          },
        }),
      ),
    ).resolves.toMatchObject({ details: { apartment: { floorNumber: 5 } } });

    await expect(
      createDraft(
        actor,
        baseInput({
          type: PROPERTY_TYPES.COMMERCIAL,
          title: "Commercial Draft",
          details: {
            commercial: {
              commercialType: COMMERCIAL_TYPES.OFFICE,
              floorArea: 1200,
              floorAreaUnit: BUILDING_SIZE_UNITS.SQUARE_FEET,
              floorNumber: 2,
              parkingSpaces: 3,
            },
          },
        }),
      ),
    ).resolves.toMatchObject({
      details: { commercial: { commercialType: COMMERCIAL_TYPES.OFFICE } },
    });
  });

  it("rejects invalid numeric subtype values", async () => {
    const actor = await createStaffUser();

    const invalidInputs = [
      baseInput({ details: { land: { landSize: -1 } } }),
      baseInput({ type: PROPERTY_TYPES.HOUSE, details: { house: { bedrooms: -1 } } }),
      baseInput({ type: PROPERTY_TYPES.APARTMENT, details: { apartment: { bedrooms: -1 } } }),
      baseInput({ type: PROPERTY_TYPES.COMMERCIAL, details: { commercial: { floorArea: -1 } } }),
      baseInput({
        type: PROPERTY_TYPES.COMMERCIAL,
        details: { commercial: { floorArea: Number.POSITIVE_INFINITY } },
      }),
    ];

    for (const input of invalidInputs) {
      await expect(createDraft(actor, input)).rejects.toMatchObject({
        code: "INVALID_PROPERTY_DETAILS",
      });
    }
  });

  it("rejects mismatched subtype structures and unknown detail fields", async () => {
    const actor = await createStaffUser();

    await expect(
      createDraft(
        actor,
        baseInput({ type: PROPERTY_TYPES.LAND, details: { apartment: { bedrooms: 2 } } }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_PROPERTY_DETAILS" });

    await expect(
      createDraft(actor, baseInput({ details: { land: { landSize: 10, unexpected: true } } })),
    ).rejects.toMatchObject({ code: "INVALID_PROPERTY_DETAILS" });
  });

  it("rejects client-supplied server-controlled fields", async () => {
    const actor = await createStaffUser();

    await expect(createDraft(actor, baseInput({ code: "LND-99999" }))).rejects.toMatchObject({
      code: "INVALID_PROPERTY_DETAILS",
    });
    await expect(
      createDraft(actor, baseInput({ createdBy: actor._id.toString() })),
    ).rejects.toMatchObject({
      code: "INVALID_PROPERTY_DETAILS",
    });
  });

  it("serializes a safe property DTO without internal fields", async () => {
    const actor = await createStaffUser();
    const draft = await createDraft(
      actor,
      baseInput({
        type: PROPERTY_TYPES.APARTMENT,
        transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
        details: { apartment: { bedrooms: 2 } },
      }),
    );
    const stored = await Property.findById(draft.id).select("+createdBy +updatedBy");
    const dto = serializeProperty(stored);

    expect(dto).toMatchObject({
      code: "APT-00001",
      type: PROPERTY_TYPES.APARTMENT,
      transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
      status: PROPERTY_STATUSES.DRAFT,
    });
    expectSafeProperty(dto);
  });
});
