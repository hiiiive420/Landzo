import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { Types } from "mongoose";

import { createApp } from "../src/app.js";
import {
  LOCATION_LEVELS,
  LOCATION_STATUSES,
} from "../src/modules/locations/location.constants.js";
import { Location } from "../src/modules/locations/location.model.js";
import {
  CURRENCIES,
  PRICE_MODES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  RENT_PERIODS,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { Property } from "../src/modules/properties/property.model.js";
import { authTestEnv } from "./helpers/authTestEnv.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from "./helpers/testDatabase.js";

const app = () => createApp({ env: authTestEnv });

const actorUserId = new Types.ObjectId();

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

  return {
    province,
    district,
    city,
    area,
  };
};

const createCoverImage = (code) => ({
  publicId: `landzo/properties/${code}/cover`,
  secureUrl: `https://res.cloudinary.com/landzo/image/upload/${code}-cover.webp`,
  width: 1600,
  height: 1000,
  format: "webp",
  bytes: 120000,
  order: 0,
  isCover: true,
  uploadedAt: new Date(),
  originalFilename: `${code}-cover.jpg`,
});

const createProperty = async ({
  code,
  title,
  type = PROPERTY_TYPES.LAND,
  transactionTypes = [TRANSACTION_TYPES.SALE],
  pricing,
  status = PROPERTY_STATUSES.AVAILABLE,
  isPublic = true,
  featured = false,
  exploreMapEnabled = false,
  deletedAt = null,
  purgeAt = null,
  location,
  mapLocation = {
    type: "Point",
    coordinates: [79.8612, 6.9271],
  },
} = {}) => {
  const hierarchy = location ?? (await createLocationHierarchy(` ${code}`));

  return Property.create({
    code,
    type,
    transactionTypes,
    status,
    title,
    description: `${title} public description`,
    province: hierarchy.province._id,
    district: hierarchy.district._id,
    city: hierarchy.city._id,
    area: hierarchy.area._id,
    displayAddress: `${title} display address`,
    pricing:
      pricing ??
      {
        currency: CURRENCIES.LKR,
        priceVisible: true,
        sale: {
          mode: PRICE_MODES.FIXED,
          amount: 25000000,
        },
      },
    mapLocation,
    media: {
      images: [createCoverImage(code)],
    },
    isPublic,
    featured,
    exploreMapEnabled,
    deletedAt,
    purgeAt,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
};

const expectNoPrivatePublicFields = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();

  expect(serialized).not.toContain("createdby");
  expect(serialized).not.toContain("updatedby");
  expect(serialized).not.toContain("deletedby");
  expect(serialized).not.toContain("deletedat");
  expect(serialized).not.toContain("purgeat");
  expect(serialized).not.toContain("maplocation");
  expect(serialized).not.toContain("publicid");
  expect(serialized).not.toContain("__v");
};

describe("public property list API", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await Location.init();
    await Property.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("is publicly accessible without staff authentication", async () => {
    await createProperty({
      code: "LND-10001",
      title: "Public Land",
    });

    const response = await request(app())
      .get("/api/v1/properties")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Public properties retrieved",
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      code: "LND-10001",
      title: "Public Land",
      type: PROPERTY_TYPES.LAND,
    });
  });

  it("returns only public non-trashed properties", async () => {
    await createProperty({
      code: "LND-10001",
      title: "Visible Public Property",
      isPublic: true,
    });

    await createProperty({
      code: "LND-10002",
      title: "Unpublished Property",
      isPublic: false,
    });

    const deletedAt = new Date();

    await createProperty({
      code: "LND-10003",
      title: "Trashed Public Property",
      isPublic: true,
      deletedAt,
      purgeAt: new Date(
        deletedAt.getTime() + 5 * 24 * 60 * 60 * 1000,
      ),
    });

    const response = await request(app())
      .get("/api/v1/properties")
      .expect(200);

    expect(response.body.data).toHaveLength(1);

    expect(response.body.data[0]).toMatchObject({
      code: "LND-10001",
      title: "Visible Public Property",
    });

    expect(response.body.meta.total).toBe(1);
  });

  it("never exposes hidden internal pricing amounts", async () => {
    await createProperty({
      code: "LND-10001",
      title: "Visible Price Property",
      pricing: {
        currency: CURRENCIES.LKR,
        priceVisible: true,
        sale: {
          mode: PRICE_MODES.FIXED,
          amount: 25000000,
        },
      },
    });

    await createProperty({
      code: "LND-10002",
      title: "Hidden Price Property",
      pricing: {
        currency: CURRENCIES.LKR,
        priceVisible: false,
        sale: {
          mode: PRICE_MODES.FIXED,
          amount: 77777777,
        },
      },
    });

    const response = await request(app())
      .get("/api/v1/properties?sort=code_asc")
      .expect(200);

    const visible = response.body.data.find(
      (property) => property.code === "LND-10001",
    );

    const hidden = response.body.data.find(
      (property) => property.code === "LND-10002",
    );

    expect(visible.pricing).toMatchObject({
      currency: CURRENCIES.LKR,
      priceVisible: true,
      sale: {
        mode: PRICE_MODES.FIXED,
        amount: 25000000,
      },
    });

    expect(hidden.pricing).toEqual({
      currency: CURRENCIES.LKR,
      priceVisible: false,
    });

    expect(JSON.stringify(hidden)).not.toContain("77777777");
  });

  it("returns a public-safe list DTO without internal lifecycle or Cloudinary fields", async () => {
    await createProperty({
      code: "LND-10001",
      title: "Safe DTO Property",
      featured: true,
      exploreMapEnabled: true,
    });

    const response = await request(app())
      .get("/api/v1/properties")
      .expect(200);

    const property = response.body.data[0];

    expect(property).toMatchObject({
      code: "LND-10001",
      title: "Safe DTO Property",
      featured: true,
      exploreMapEnabled: true,
      coverImage: {
        url: expect.any(String),
      },
    });

    expect(property.slug).toEqual(expect.any(String));

    expect(property.id).toEqual(expect.any(String));
    expect(property).not.toHaveProperty("isPublic");
    expect(property).not.toHaveProperty("deletedAt");
    expect(property).not.toHaveProperty("purgeAt");
    expect(property).not.toHaveProperty("media");
    expect(property).not.toHaveProperty("map");

    expect(property.coverImage).not.toHaveProperty("publicId");

    expectNoPrivatePublicFields(response.body);
  });

  it("supports public pagination, search, filters, featured filtering, and safe sorting", async () => {
    const firstLocation = await createLocationHierarchy(" Public One");
    const secondLocation = await createLocationHierarchy(" Public Two");

    await createProperty({
      code: "LND-10001",
      title: "Featured Colombo Land",
      featured: true,
      location: firstLocation,
      pricing: {
        currency: CURRENCIES.LKR,
        priceVisible: true,
        sale: {
          mode: PRICE_MODES.FIXED,
          amount: 22000000,
        },
      },
    });

    await createProperty({
      code: "APT-10001",
      title: "City Rental Apartment",
      type: PROPERTY_TYPES.APARTMENT,
      transactionTypes: [TRANSACTION_TYPES.RENT],
      featured: false,
      location: secondLocation,
      pricing: {
        currency: CURRENCIES.USD,
        priceVisible: true,
        rent: {
          mode: PRICE_MODES.FIXED,
          period: RENT_PERIODS.MONTH,
          amount: 1200,
        },
      },
    });

    const paginated = await request(app())
      .get("/api/v1/properties?page=1&limit=1&sort=code_asc")
      .expect(200);

    expect(paginated.body.data).toHaveLength(1);

    expect(paginated.body.meta).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });

    const searched = await request(app())
      .get("/api/v1/properties?search=featured%20colombo")
      .expect(200);

    expect(searched.body.data).toHaveLength(1);
    expect(searched.body.data[0].code).toBe("LND-10001");

    const filtered = await request(app())
      .get(
        `/api/v1/properties?type=apartment&transactionType=rent&currency=USD&provinceId=${secondLocation.province._id}&districtId=${secondLocation.district._id}&cityId=${secondLocation.city._id}&areaId=${secondLocation.area._id}&featured=false`,
      )
      .expect(200);

    expect(filtered.body.data).toHaveLength(1);

    expect(filtered.body.data[0]).toMatchObject({
      code: "APT-10001",
      type: PROPERTY_TYPES.APARTMENT,
      transactionTypes: [TRANSACTION_TYPES.RENT],
      featured: false,
    });

    const featured = await request(app())
      .get("/api/v1/properties?featured=true")
      .expect(200);

    expect(featured.body.data).toHaveLength(1);
    expect(featured.body.data[0].code).toBe("LND-10001");
  });

  it("rejects unsupported public query parameters and unsafe sort values", async () => {
    await request(app())
      .get("/api/v1/properties?isPublic=false")
      .expect(400);

    await request(app())
      .get("/api/v1/properties?deletedAt=null")
      .expect(400);

    await request(app())
      .get("/api/v1/properties?sort=price_desc")
      .expect(400);

    await request(app())
      .get("/api/v1/properties?featured=yes")
      .expect(400);
  });


  it("returns public Explore Map properties without staff authentication", async () => {
    await createProperty({
      code: "LND-20001",
      title: "Explore Public Land",
      exploreMapEnabled: true,
    });

    const response = await request(app())
      .get("/api/v1/properties/explore-map")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Public Explore Map properties retrieved",
    });

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: expect.any(String),
      code: "LND-20001",
      title: "Explore Public Land",
      map: {
        lat: 6.9271,
        lng: 79.8612,
      },
    });
  });

  it("returns only public Explore-enabled non-trashed properties with valid coordinates", async () => {
    await createProperty({
      code: "LND-20001",
      title: "Visible Explore Property",
      isPublic: true,
      exploreMapEnabled: true,
    });

    await createProperty({
      code: "LND-20002",
      title: "Explore Disabled Property",
      isPublic: true,
      exploreMapEnabled: false,
    });

    await createProperty({
      code: "LND-20003",
      title: "Unpublished Explore Property",
      isPublic: false,
      exploreMapEnabled: true,
    });

    const deletedAt = new Date();

    await createProperty({
      code: "LND-20004",
      title: "Trashed Explore Property",
      isPublic: true,
      exploreMapEnabled: true,
      deletedAt,
      purgeAt: new Date(deletedAt.getTime() + 5 * 24 * 60 * 60 * 1000),
    });

    await createProperty({
      code: "LND-20005",
      title: "Missing Map Property",
      isPublic: true,
      exploreMapEnabled: true,
      mapLocation: null,
    });


    const response = await request(app())
      .get("/api/v1/properties/explore-map")
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].code).toBe("LND-20001");
  });

  it("keeps Explore Map pricing and media DTO public-safe", async () => {
    await createProperty({
      code: "LND-20001",
      title: "Hidden Explore Price",
      exploreMapEnabled: true,
      pricing: {
        currency: CURRENCIES.LKR,
        priceVisible: false,
        sale: {
          mode: PRICE_MODES.FIXED,
          amount: 99999999,
        },
      },
    });

    const response = await request(app())
      .get("/api/v1/properties/explore-map")
      .expect(200);

    const property = response.body.data[0];

    expect(property.pricing).toEqual({
      currency: CURRENCIES.LKR,
      priceVisible: false,
    });
    expect(JSON.stringify(property)).not.toContain("99999999");
    expect(property.coverImage).toMatchObject({
      url: expect.any(String),
    });
    expect(property.coverImage).not.toHaveProperty("publicId");
    expect(property).not.toHaveProperty("media");
    expect(property).not.toHaveProperty("isPublic");
    expectNoPrivatePublicFields(response.body);
  });

  it("uses the static Explore Map route before the Property Code route", async () => {
    const response = await request(app())
      .get("/api/v1/properties/explore-map")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Public Explore Map properties retrieved",
      data: [],
    });
  });
  it("returns public Property detail by stable Property Code without authentication", async () => {
  await createProperty({
    code: "LND-10001",
    title: "Public Detail Land",
    featured: true,
    exploreMapEnabled: true,
  });

  const response = await request(app())
    .get("/api/v1/properties/LND-10001")
    .expect(200);

  expect(response.body).toMatchObject({
    success: true,
    message: "Public property retrieved",
  });

  expect(response.body.data).toMatchObject({
    code: "LND-10001",
    title: "Public Detail Land",
    type: PROPERTY_TYPES.LAND,
    transactionTypes: [TRANSACTION_TYPES.SALE],
    status: PROPERTY_STATUSES.AVAILABLE,
    description: "Public Detail Land public description",
    featured: true,
    exploreMapEnabled: true,
    map: {
      lat: 6.9271,
      lng: 79.8612,
    },
  });

  expect(response.body.data.id).toEqual(expect.any(String));
  expect(response.body.data.slug).toEqual(expect.any(String));

  expect(response.body.data.media.images).toHaveLength(1);

  expect(response.body.data.media.coverImage).toMatchObject({
    url: expect.any(String),
    isCover: true,
  });
});

it("normalizes lowercase public Property Codes", async () => {
  await createProperty({
    code: "APT-10001",
    title: "Public Apartment",
    type: PROPERTY_TYPES.APARTMENT,
    transactionTypes: [TRANSACTION_TYPES.RENT],
    pricing: {
      currency: CURRENCIES.LKR,
      priceVisible: true,
      rent: {
        mode: PRICE_MODES.FIXED,
        period: RENT_PERIODS.MONTH,
        amount: 175000,
      },
    },
  });

  const response = await request(app())
    .get("/api/v1/properties/apt-10001")
    .expect(200);

  expect(response.body.data).toMatchObject({
    code: "APT-10001",
    title: "Public Apartment",
  });
});

it("never exposes hidden pricing or private fields in public Property detail", async () => {
  await createProperty({
    code: "LND-10001",
    title: "Hidden Detail Price",
    pricing: {
      currency: CURRENCIES.LKR,
      priceVisible: false,
      sale: {
        mode: PRICE_MODES.FIXED,
        amount: 88888888,
      },
    },
  });

  const response = await request(app())
    .get("/api/v1/properties/LND-10001")
    .expect(200);

  const property = response.body.data;

  expect(property.pricing).toEqual({
    currency: CURRENCIES.LKR,
    priceVisible: false,
  });

  expect(JSON.stringify(property)).not.toContain("88888888");

  expect(property.id).toEqual(expect.any(String));
  expect(property).not.toHaveProperty("isPublic");
  expect(property).not.toHaveProperty("deletedAt");
  expect(property).not.toHaveProperty("purgeAt");

  expect(property.media.images[0]).not.toHaveProperty("publicId");
  expect(property.media.images[0]).not.toHaveProperty("bytes");
  expect(property.media.images[0]).not.toHaveProperty("uploadedAt");
  expect(property.media.images[0]).not.toHaveProperty(
    "originalFilename",
  );

  expectNoPrivatePublicFields(response.body);
});

it("returns the same not-found contract for unknown, unpublished, and trashed Properties", async () => {
  await createProperty({
    code: "LND-10001",
    title: "Private Property",
    isPublic: false,
  });

  const deletedAt = new Date();

  await createProperty({
    code: "LND-10002",
    title: "Trashed Property",
    isPublic: true,
    deletedAt,
    purgeAt: new Date(
      deletedAt.getTime() + 5 * 24 * 60 * 60 * 1000,
    ),
  });

  const unknown = await request(app())
    .get("/api/v1/properties/LND-99999")
    .expect(404);

  const unpublished = await request(app())
    .get("/api/v1/properties/LND-10001")
    .expect(404);

  const trashed = await request(app())
    .get("/api/v1/properties/LND-10002")
    .expect(404);

  for (const response of [unknown, unpublished, trashed]) {
    expect(response.body).toMatchObject({
      success: false,
      code: "PROPERTY_NOT_FOUND",
    });
  }
});

it("rejects malformed public Property Codes before database lookup", async () => {
  const invalidCodes = [
    "APT-42",
    "ABC-00001",
    "APT00042",
    "APT-0004X",
    "modern-apartment-colombo",
  ];

  for (const propertyCode of invalidCodes) {
    await request(app())
      .get(`/api/v1/properties/${propertyCode}`)
      .expect(400);
  }
});

it("does not use slug as the public Property identity", async () => {
  const property = await createProperty({
    code: "COM-10001",
    title: "Prime Commercial Building",
    type: PROPERTY_TYPES.COMMERCIAL,
  });

  await request(app())
    .get(`/api/v1/properties/${property.slug}`)
    .expect(400);

  const response = await request(app())
    .get("/api/v1/properties/COM-10001")
    .expect(200);

  expect(response.body.data).toMatchObject({
    code: "COM-10001",
    slug: property.slug,
  });
});
});

