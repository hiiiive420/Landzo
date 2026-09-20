import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import { Location } from "../src/modules/locations/location.model.js";
import {
  CURRENCIES,
  LEASE_PERIODS,
  PRICE_MODES,
  PROPERTY_TYPES,
  RENT_PERIODS,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { Property } from "../src/modules/properties/property.model.js";
import { serializeProperty } from "../src/modules/properties/property.serializer.js";
import { createPropertyDraft, updateAdminProperty } from "../src/modules/properties/property.service.js";
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

const createDraft = (actor, input) => createPropertyDraft({ actorUserId: actor._id, input });

const saleFixedPricing = (overrides = {}) => ({
  currency: CURRENCIES.LKR,
  sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
  ...overrides,
});

describe("property pricing and exact map location", () => {
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

  it("keeps pricing optional for drafts", async () => {
    const actor = await createStaffUser();

    const withoutPricing = await createDraft(actor, baseInput());
    const nullPricing = await createDraft(
      actor,
      baseInput({ title: "Null pricing", pricing: null }),
    );

    expect(withoutPricing.pricing).toBeNull();
    expect(nullPricing.pricing).toBeNull();
  });

  it("accepts only LKR and USD as selected currencies", async () => {
    const actor = await createStaffUser();

    await expect(
      createDraft(actor, baseInput({ pricing: saleFixedPricing() })),
    ).resolves.toMatchObject({
      pricing: { currency: CURRENCIES.LKR },
    });
    await expect(
      createDraft(
        actor,
        baseInput({
          title: "USD priced land",
          pricing: saleFixedPricing({ currency: CURRENCIES.USD }),
        }),
      ),
    ).resolves.toMatchObject({ pricing: { currency: CURRENCIES.USD } });
    await expect(
      createDraft(actor, baseInput({ pricing: saleFixedPricing({ currency: "EUR" }) })),
    ).rejects.toMatchObject({ code: "INVALID_PROPERTY_PRICING" });
  });

  it("defaults price visibility to false and retains hidden amounts internally", async () => {
    const actor = await createStaffUser();

    const draft = await createDraft(actor, baseInput({ pricing: saleFixedPricing() }));
    const stored = await Property.findById(draft.id);

    expect(draft.pricing).toMatchObject({
      currency: CURRENCIES.LKR,
      priceVisible: false,
      sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
    });
    expect(stored.pricing.priceVisible).toBe(false);
    expect(stored.pricing.sale.amount).toBe(25000000);
  });

  it("accepts sale fixed, negotiable, and price-on-request pricing rules", async () => {
    const actor = await createStaffUser();

    await expect(
      createDraft(actor, baseInput({ pricing: saleFixedPricing() })),
    ).resolves.toMatchObject({ pricing: { sale: { amount: 25000000 } } });
    await expect(
      createDraft(
        actor,
        baseInput({
          title: "Negotiable sale",
          pricing: { currency: CURRENCIES.LKR, sale: { mode: PRICE_MODES.NEGOTIABLE, amount: 1 } },
        }),
      ),
    ).resolves.toMatchObject({ pricing: { sale: { mode: PRICE_MODES.NEGOTIABLE, amount: 1 } } });
    await expect(
      createDraft(
        actor,
        baseInput({
          title: "Price request sale",
          pricing: { currency: CURRENCIES.LKR, sale: { mode: PRICE_MODES.PRICE_ON_REQUEST } },
        }),
      ),
    ).resolves.toMatchObject({ pricing: { sale: { mode: PRICE_MODES.PRICE_ON_REQUEST } } });
    await expect(
      createDraft(
        actor,
        baseInput({
          title: "Price request sale with amount",
          pricing: {
            currency: CURRENCIES.LKR,
            sale: { mode: PRICE_MODES.PRICE_ON_REQUEST, amount: 50000000 },
          },
        }),
      ),
    ).resolves.toMatchObject({ pricing: { sale: { amount: 50000000 } } });
  });

  it("rejects invalid sale pricing fields and amounts", async () => {
    const actor = await createStaffUser();
    const invalidSalePricing = [
      { mode: PRICE_MODES.FIXED },
      { mode: PRICE_MODES.NEGOTIABLE },
      { mode: PRICE_MODES.FIXED, amount: 0 },
      { mode: PRICE_MODES.FIXED, amount: -1 },
      { mode: PRICE_MODES.FIXED, amount: 10.5 },
      { mode: PRICE_MODES.FIXED, amount: "25000000" },
      { mode: PRICE_MODES.FIXED, amount: Number.NaN },
      { mode: PRICE_MODES.FIXED, amount: Number.POSITIVE_INFINITY },
      { mode: PRICE_MODES.FIXED, amount: Number.MAX_SAFE_INTEGER + 1 },
      { mode: "auction", amount: 25000000 },
      { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 25000000 },
    ];

    for (const sale of invalidSalePricing) {
      await expect(
        createDraft(actor, baseInput({ pricing: { currency: CURRENCIES.LKR, sale } })),
      ).rejects.toMatchObject({ code: "INVALID_PROPERTY_PRICING" });
    }
  });

  it("accepts rent pricing modes with month and year periods", async () => {
    const actor = await createStaffUser();

    await expect(
      createDraft(
        actor,
        baseInput({
          transactionTypes: [TRANSACTION_TYPES.RENT],
          pricing: {
            currency: CURRENCIES.LKR,
            rent: { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 150000 },
          },
        }),
      ),
    ).resolves.toMatchObject({ pricing: { rent: { period: RENT_PERIODS.MONTH, amount: 150000 } } });
    await expect(
      createDraft(
        actor,
        baseInput({
          title: "Yearly rent",
          transactionTypes: [TRANSACTION_TYPES.RENT],
          pricing: {
            currency: CURRENCIES.USD,
            rent: { mode: PRICE_MODES.NEGOTIABLE, period: RENT_PERIODS.YEAR, amount: 12000 },
          },
        }),
      ),
    ).resolves.toMatchObject({ pricing: { rent: { period: RENT_PERIODS.YEAR } } });
    await expect(
      createDraft(
        actor,
        baseInput({
          title: "Request rent",
          transactionTypes: [TRANSACTION_TYPES.RENT],
          pricing: {
            currency: CURRENCIES.LKR,
            rent: { mode: PRICE_MODES.PRICE_ON_REQUEST, period: RENT_PERIODS.MONTH },
          },
        }),
      ),
    ).resolves.toMatchObject({ pricing: { rent: { mode: PRICE_MODES.PRICE_ON_REQUEST } } });
  });

  it("rejects invalid rent periods and amount rules", async () => {
    const actor = await createStaffUser();
    const invalidRentPricing = [
      { mode: PRICE_MODES.FIXED, amount: 150000 },
      { mode: PRICE_MODES.FIXED, period: "total", amount: 150000 },
      { mode: PRICE_MODES.FIXED, period: "week", amount: 150000 },
      { mode: PRICE_MODES.NEGOTIABLE, period: RENT_PERIODS.MONTH },
      { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 0 },
    ];

    for (const rent of invalidRentPricing) {
      await expect(
        createDraft(
          actor,
          baseInput({
            transactionTypes: [TRANSACTION_TYPES.RENT],
            pricing: { currency: CURRENCIES.LKR, rent },
          }),
        ),
      ).rejects.toMatchObject({ code: "INVALID_PROPERTY_PRICING" });
    }
  });

  it("accepts lease pricing with monthly, annual, and total periods", async () => {
    const actor = await createStaffUser();

    for (const period of Object.values(LEASE_PERIODS)) {
      await expect(
        createDraft(
          actor,
          baseInput({
            title: `Lease ${period}`,
            transactionTypes: [TRANSACTION_TYPES.LEASE],
            pricing: {
              currency: CURRENCIES.LKR,
              lease: { mode: PRICE_MODES.FIXED, period, amount: 9000000 },
            },
          }),
        ),
      ).resolves.toMatchObject({ pricing: { lease: { period, amount: 9000000 } } });
    }
  });


  it("persists lease period changes through property updates", async () => {
    const actor = await createStaffUser();
    const draft = await createDraft(
      actor,
      baseInput({
        transactionTypes: [TRANSACTION_TYPES.LEASE],
        pricing: {
          currency: CURRENCIES.LKR,
          priceVisible: true,
          lease: { mode: PRICE_MODES.FIXED, period: LEASE_PERIODS.MONTHLY, amount: 150000 },
        },
      }),
    );

    const annual = await updateAdminProperty({
      actorUserId: actor._id,
      propertyId: draft.id,
      input: {
        pricing: {
          currency: CURRENCIES.LKR,
          priceVisible: true,
          lease: { mode: PRICE_MODES.FIXED, period: LEASE_PERIODS.ANNUAL, amount: 1500000 },
        },
      },
    });

    expect(annual.pricing.lease).toMatchObject({
      period: LEASE_PERIODS.ANNUAL,
      amount: 1500000,
    });

    const total = await updateAdminProperty({
      actorUserId: actor._id,
      propertyId: draft.id,
      input: {
        pricing: {
          currency: CURRENCIES.LKR,
          priceVisible: true,
          lease: { mode: PRICE_MODES.FIXED, period: LEASE_PERIODS.TOTAL, amount: 5000000 },
        },
      },
    });

    expect(total.pricing.lease).toMatchObject({
      period: LEASE_PERIODS.TOTAL,
      amount: 5000000,
    });

    const stored = await Property.findById(draft.id);
    expect(stored.pricing.lease.period).toBe(LEASE_PERIODS.TOTAL);
  });
  it("rejects invalid lease periods and amount rules", async () => {
    const actor = await createStaffUser();
    const invalidLeasePricing = [
      { mode: PRICE_MODES.FIXED, amount: 9000000 },
      { mode: PRICE_MODES.FIXED, period: "week", amount: 9000000 },
      { mode: PRICE_MODES.NEGOTIABLE, period: LEASE_PERIODS.TOTAL },
      { mode: PRICE_MODES.FIXED, period: LEASE_PERIODS.MONTHLY, amount: 10.25 },
    ];

    for (const lease of invalidLeasePricing) {
      await expect(
        createDraft(
          actor,
          baseInput({
            transactionTypes: [TRANSACTION_TYPES.LEASE],
            pricing: { currency: CURRENCIES.LKR, lease },
          }),
        ),
      ).rejects.toMatchObject({ code: "INVALID_PROPERTY_PRICING" });
    }
  });

  it("keeps pricing aligned to selected transaction types without auto-mutating them", async () => {
    const actor = await createStaffUser();

    const multi = await createDraft(
      actor,
      baseInput({
        transactionTypes: [TRANSACTION_TYPES.RENT, TRANSACTION_TYPES.SALE],
        pricing: {
          currency: CURRENCIES.LKR,
          sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
          rent: { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 150000 },
        },
      }),
    );
    const missingDraftPrice = await createDraft(
      actor,
      baseInput({
        title: "Sale and rent with sale price only",
        transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
        pricing: { currency: CURRENCIES.LKR, sale: { mode: PRICE_MODES.FIXED, amount: 25000000 } },
      }),
    );

    expect(multi.transactionTypes).toEqual([TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT]);
    expect(multi.pricing).toMatchObject({ sale: { amount: 25000000 }, rent: { amount: 150000 } });
    expect(missingDraftPrice.transactionTypes).toEqual([
      TRANSACTION_TYPES.SALE,
      TRANSACTION_TYPES.RENT,
    ]);
    expect(missingDraftPrice.pricing.rent).toBeUndefined();

    await expect(
      createDraft(
        actor,
        baseInput({
          pricing: {
            currency: CURRENCIES.LKR,
            rent: { mode: PRICE_MODES.FIXED, period: RENT_PERIODS.MONTH, amount: 150000 },
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_PROPERTY_PRICING" });
    await expect(
      createDraft(
        actor,
        baseInput({
          transactionTypes: [TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.RENT],
          pricing: {
            currency: CURRENCIES.LKR,
            lease: { mode: PRICE_MODES.FIXED, period: LEASE_PERIODS.TOTAL, amount: 9000000 },
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_PROPERTY_PRICING" });
  });

  it("rejects empty and unknown pricing fields", async () => {
    const actor = await createStaffUser();

    await expect(
      createDraft(actor, baseInput({ pricing: { currency: CURRENCIES.LKR } })),
    ).rejects.toMatchObject({
      code: "INVALID_PROPERTY_PRICING",
    });
    await expect(
      createDraft(
        actor,
        baseInput({
          pricing: {
            currency: CURRENCIES.LKR,
            sale: { mode: PRICE_MODES.FIXED, amount: 1 },
            fxRate: 300,
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_PROPERTY_PRICING" });
  });

  it("converts admin lat/lng map input into GeoJSON longitude/latitude storage", async () => {
    const actor = await createStaffUser();

    const draft = await createDraft(actor, baseInput({ map: { lat: 6.9271, lng: 79.8612 } }));
    const stored = await Property.findById(draft.id);

    expect(Array.from(stored.mapLocation.coordinates)).toEqual([79.8612, 6.9271]);
    expect(stored.mapLocation.type).toBe("Point");
    expect(draft.map).toEqual({ lat: 6.9271, lng: 79.8612 });
  });

  it("keeps exact map location optional for drafts", async () => {
    const actor = await createStaffUser();

    const withoutMap = await createDraft(actor, baseInput());
    const nullMap = await createDraft(actor, baseInput({ title: "Null map", map: null }));
    const stored = await Property.findById(withoutMap.id);

    expect(withoutMap.map).toBeNull();
    expect(nullMap.map).toBeNull();
    expect(stored.mapLocation).toBeUndefined();
  });

  it("accepts global coordinate boundaries without a Sri Lanka bounding box", async () => {
    const actor = await createStaffUser();

    await expect(
      createDraft(actor, baseInput({ map: { lat: -90, lng: -180 } })),
    ).resolves.toMatchObject({
      map: { lat: -90, lng: -180 },
    });
    await expect(
      createDraft(actor, baseInput({ title: "North east boundary", map: { lat: 90, lng: 180 } })),
    ).resolves.toMatchObject({ map: { lat: 90, lng: 180 } });
  });

  it("rejects invalid map selections and raw GeoJSON input", async () => {
    const actor = await createStaffUser();
    const invalidMaps = [
      { lat: -90.1, lng: 79.8612 },
      { lat: 90.1, lng: 79.8612 },
      { lat: 6.9271, lng: -180.1 },
      { lat: 6.9271, lng: 180.1 },
      { lat: "6.9271", lng: 79.8612 },
      { lat: 6.9271, lng: "79.8612" },
      { lng: 79.8612 },
      { lat: 6.9271 },
      { lat: Number.NaN, lng: 79.8612 },
      { lat: 6.9271, lng: Number.POSITIVE_INFINITY },
    ];

    for (const map of invalidMaps) {
      await expect(createDraft(actor, baseInput({ map }))).rejects.toMatchObject({
        code: "INVALID_PROPERTY_MAP",
      });
    }

    await expect(
      createDraft(
        actor,
        baseInput({ mapLocation: { type: "Point", coordinates: [79.8612, 6.9271] } }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_PROPERTY_DETAILS" });
  });

  it("declares only the exact map location as a geospatial index", () => {
    const indexes = Property.schema.indexes().map(([keys]) => keys);
    const hasMapLocation2dsphere = indexes.some((keys) => keys.mapLocation === "2dsphere");
    const locationCatalogGeoIndexes = indexes.filter((keys) =>
      ["province", "district", "city", "area"].some((key) => keys[key] === "2dsphere"),
    );

    expect(hasMapLocation2dsphere).toBe(true);
    expect(locationCatalogGeoIndexes).toEqual([]);
  });

  it("serializes pricing and map DTOs without raw GeoJSON or private internals", async () => {
    const actor = await createStaffUser();
    const draft = await createDraft(
      actor,
      baseInput({
        pricing: saleFixedPricing({ priceVisible: true }),
        map: { lat: 6.9271, lng: 79.8612 },
      }),
    );
    const stored = await Property.findById(draft.id).select("+createdBy +updatedBy");
    const dto = serializeProperty(stored);
    const serialized = JSON.stringify(dto).toLowerCase();

    expect(dto.pricing).toMatchObject({
      currency: CURRENCIES.LKR,
      priceVisible: true,
      sale: { mode: PRICE_MODES.FIXED, amount: 25000000 },
    });
    expect(dto.map).toEqual({ lat: 6.9271, lng: 79.8612 });
    expect(dto.mapLocation).toBeUndefined();
    expect(serialized).not.toContain("coordinates");
    expect(serialized).not.toContain("createdby");
    expect(serialized).not.toContain("updatedby");
    expect(serialized).not.toContain("private");
  });
});
