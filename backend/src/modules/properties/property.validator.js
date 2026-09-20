import { z } from "zod";

import {
  BUILDING_SIZE_UNIT_VALUES,
  COMMERCIAL_TYPE_VALUES,
  CURRENCY_VALUES,
  FURNISHED_STATUS_VALUES,
  LAND_SIZE_UNIT_VALUES,
  LAND_TYPE_VALUES,
  LAND_UTILITY_VALUES,
  LEASE_PERIOD_VALUES,
  PRICE_MODES,
  PRICE_MODE_VALUES,
  PROPERTY_STATUS_VALUES,
  PROPERTY_TYPE_VALUES,
  RENT_PERIOD_VALUES,
  TRANSACTION_TYPE_VALUES,
} from "./property.constants.js";

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");
const finitePositiveNumber = z.number().finite().positive();
const positiveSafeInteger = z
  .number()
  .finite()
  .int()
  .positive()
  .refine((value) => Number.isSafeInteger(value), "Amount must be a safe integer");
const nonNegativeInteger = z.number().finite().int().min(0);
const optionalNullableText = (maxLength) => z.string().trim().max(maxLength).nullable().optional();

const uniqueArray = (message) => (values, ctx) => {
  if (new Set(values).size !== values.length) {
    ctx.addIssue({ code: "custom", message });
  }
};

const requireAmountForPricedMode = (value, ctx) => {
  if (
    [PRICE_MODES.FIXED, PRICE_MODES.NEGOTIABLE].includes(value.mode) &&
    value.amount === undefined
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["amount"],
      message: "Amount is required for fixed and negotiable pricing",
    });
  }
};

export const landDetailsSchema = z
  .object({
    landSize: finitePositiveNumber.optional(),
    landSizeUnit: z.enum(LAND_SIZE_UNIT_VALUES).optional(),
    landType: z.enum(LAND_TYPE_VALUES).optional(),
    roadAccess: z.boolean().optional(),
    roadWidth: finitePositiveNumber.optional(),
    utilities: z
      .array(z.enum(LAND_UTILITY_VALUES))
      .superRefine(uniqueArray("Utilities must be unique"))
      .optional(),
  })
  .strict();

export const houseDetailsSchema = z
  .object({
    bedrooms: nonNegativeInteger.optional(),
    bathrooms: nonNegativeInteger.optional(),
    floors: nonNegativeInteger.optional(),
    landSize: finitePositiveNumber.optional(),
    landSizeUnit: z.enum(LAND_SIZE_UNIT_VALUES).optional(),
    houseSize: finitePositiveNumber.optional(),
    houseSizeUnit: z.enum(BUILDING_SIZE_UNIT_VALUES).optional(),
    parkingSpaces: nonNegativeInteger.optional(),
    furnishedStatus: z.enum(FURNISHED_STATUS_VALUES).optional(),
  })
  .strict();

export const apartmentDetailsSchema = z
  .object({
    bedrooms: nonNegativeInteger.optional(),
    bathrooms: nonNegativeInteger.optional(),
    floorNumber: nonNegativeInteger.optional(),
    totalFloors: nonNegativeInteger.optional(),
    unitSize: finitePositiveNumber.optional(),
    unitSizeUnit: z.enum(BUILDING_SIZE_UNIT_VALUES).optional(),
    parkingSpaces: nonNegativeInteger.optional(),
    furnishedStatus: z.enum(FURNISHED_STATUS_VALUES).optional(),
  })
  .strict();

export const commercialDetailsSchema = z
  .object({
    commercialType: z.enum(COMMERCIAL_TYPE_VALUES).optional(),
    floorArea: finitePositiveNumber.optional(),
    floorAreaUnit: z.enum(BUILDING_SIZE_UNIT_VALUES).optional(),
    floorNumber: nonNegativeInteger.optional(),
    parkingSpaces: nonNegativeInteger.optional(),
  })
  .strict();

const salePricingSchema = z
  .object({
    mode: z.enum(PRICE_MODE_VALUES),
    amount: positiveSafeInteger.optional(),
  })
  .strict()
  .superRefine(requireAmountForPricedMode);

const recurringPricingSchema = (periodValues) =>
  z
    .object({
      mode: z.enum(PRICE_MODE_VALUES),
      period: z.enum(periodValues),
      amount: positiveSafeInteger.optional(),
    })
    .strict()
    .superRefine(requireAmountForPricedMode);

export const propertyPricingSchema = z
  .object({
    currency: z.enum(CURRENCY_VALUES),
    priceVisible: z.boolean().default(false),
    sale: salePricingSchema.optional(),
    rent: recurringPricingSchema(RENT_PERIOD_VALUES).optional(),
    lease: recurringPricingSchema(LEASE_PERIOD_VALUES).optional(),
  })
  .strict();

export const mapSelectionSchema = z
  .object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  })
  .strict();

const locationDraftSchema = z
  .object({
    province: objectIdSchema.nullable().optional(),
    district: objectIdSchema.nullable().optional(),
    city: objectIdSchema.nullable().optional(),
    area: objectIdSchema.nullable().optional(),
    displayAddress: optionalNullableText(240),
  })
  .strict()
  .optional();

const detailsContainerSchema = z
  .object({
    land: landDetailsSchema.optional(),
    house: houseDetailsSchema.optional(),
    apartment: apartmentDetailsSchema.optional(),
    commercial: commercialDetailsSchema.optional(),
  })
  .strict()
  .default({});

const apiCreateBodySchema = z
  .object({
    type: z.enum(PROPERTY_TYPE_VALUES),
    transactionTypes: z
      .array(z.enum(TRANSACTION_TYPE_VALUES))
      .min(1)
      .superRefine(uniqueArray("Transaction types must be unique")),
    title: z.string({ required_error: "Property title is required" }).trim().min(2).max(180),
    description: optionalNullableText(5000),
    location: locationDraftSchema,
    details: detailsContainerSchema,
    pricing: propertyPricingSchema.nullable().optional(),
    map: mapSelectionSchema.nullable().optional(),
  })
  .strict();

const apiUpdateBodySchema = z
  .object({
    transactionTypes: z
      .array(z.enum(TRANSACTION_TYPE_VALUES))
      .min(1)
      .superRefine(uniqueArray("Transaction types must be unique"))
      .optional(),
    title: z.string().trim().min(2).max(180).optional(),
    description: optionalNullableText(5000),
    location: locationDraftSchema,
    details: detailsContainerSchema.optional(),
    pricing: propertyPricingSchema.nullable().optional(),
    map: mapSelectionSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one property field is required");

export const propertyDraftSchema = z
  .object({
    type: z.enum(PROPERTY_TYPE_VALUES),
    transactionTypes: z
      .array(z.enum(TRANSACTION_TYPE_VALUES))
      .min(1)
      .superRefine(uniqueArray("Transaction types must be unique")),
    status: z.enum(PROPERTY_STATUS_VALUES).optional(),
    title: z.string({ required_error: "Property title is required" }).trim().min(2).max(180),
    description: optionalNullableText(5000),
    location: locationDraftSchema,
    details: detailsContainerSchema,
    pricing: propertyPricingSchema.nullable().optional(),
    map: mapSelectionSchema.nullable().optional(),
    isPublic: z.boolean().optional(),
    exploreMapEnabled: z.boolean().optional(),
    featured: z.boolean().optional(),
  })
  .strict();

export const propertyIdParamSchema = z.object({
  params: z.object({
    propertyId: objectIdSchema,
  }),
});
export const publicPropertyCodeSchema = z
  .string()
  .trim()
  .regex(
    /^(LND|HSE|APT|COM)-\d{5,}$/i,
    "Invalid property code",
  )
  .transform((value) => value.toUpperCase());

export const getPublicPropertySchema = z.object({
  params: z.object({
    propertyCode: publicPropertyCodeSchema,
  }),
});

export const createAdminPropertySchema = z.object({
  body: apiCreateBodySchema,
});

export const updateAdminPropertySchema = z.object({
  params: z.object({ propertyId: objectIdSchema }),
  body: apiUpdateBodySchema,
});

export const duplicateAdminPropertySchema = propertyIdParamSchema;

export const trashPropertySchema = propertyIdParamSchema;

export const restorePropertySchema = propertyIdParamSchema;

export const unarchivePropertySchema = propertyIdParamSchema;

export const publishPropertySchema = propertyIdParamSchema;

export const unpublishPropertySchema = propertyIdParamSchema;

export const updatePropertyFeaturedSchema = z.object({
  params: z.object({ propertyId: objectIdSchema }),
  body: z.object({ featured: z.boolean() }).strict(),
});

export const updatePropertyExploreMapSchema = z.object({
  params: z.object({ propertyId: objectIdSchema }),
  body: z.object({ exploreMapEnabled: z.boolean() }).strict(),
});

export const updatePropertyStatusSchema = z.object({
  params: z.object({ propertyId: objectIdSchema }),
  body: z.object({ status: z.enum(PROPERTY_STATUS_VALUES) }).strict(),
});

const propertyListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    search: z.string().trim().max(80).optional(),

    type: z.enum(PROPERTY_TYPE_VALUES).optional(),

    transactionType: z
      .enum(TRANSACTION_TYPE_VALUES)
      .optional(),

    status: z.enum(PROPERTY_STATUS_VALUES).optional(),

    provinceId: objectIdSchema.optional(),

    districtId: objectIdSchema.optional(),

    cityId: objectIdSchema.optional(),

    areaId: objectIdSchema.optional(),

    currency: z.enum(CURRENCY_VALUES).optional(),

    hasMap: z.enum(["true", "false"]).optional(),

    isPublic: z.enum(["true", "false"]).optional(),

    featured: z.enum(["true", "false"]).optional(),

    exploreMapEnabled: z
      .enum(["true", "false"])
      .optional(),

    sort: z
      .enum([
        "newest",
        "oldest",
        "updated_desc",
        "updated_asc",
        "code_asc",
        "code_desc",
      ])
      .default("newest"),
  })
  .strict();

export const listAdminPropertiesSchema = z.object({
  query: propertyListQuerySchema,
});

export const listTrashedAdminPropertiesSchema = listAdminPropertiesSchema;

const publicPropertyListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    search: z.string().trim().max(80).optional(),

    type: z.enum(PROPERTY_TYPE_VALUES).optional(),

    transactionType: z.enum(TRANSACTION_TYPE_VALUES).optional(),

    status: z.enum(PROPERTY_STATUS_VALUES).optional(),

    provinceId: objectIdSchema.optional(),
    districtId: objectIdSchema.optional(),
    cityId: objectIdSchema.optional(),
    areaId: objectIdSchema.optional(),

    currency: z.enum(CURRENCY_VALUES).optional(),

    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),

    featured: z.enum(["true", "false"]).optional(),

    sort: z
      .enum([
        "newest",
        "oldest",
        "updated_desc",
        "updated_asc",
        "code_asc",
        "code_desc",
      ])
      .default("newest"),
  })
  .strict();

export const listPublicPropertiesSchema = z.object({
  query: publicPropertyListQuerySchema,
});

export const listPublicExploreMapPropertiesSchema = z.object({
  query: z.object({}).strict().default({}),
});

export const detailSchemasByType = Object.freeze({
  land: landDetailsSchema,
  house: houseDetailsSchema,
  apartment: apartmentDetailsSchema,
  commercial: commercialDetailsSchema,
});

export const propertyImageIdParamSchema = z.object({
  params: z.object({
    propertyId: objectIdSchema,
    imageId: objectIdSchema,
  }),
});

export const uploadPropertyImagesSchema = propertyIdParamSchema;

export const setPropertyImageCoverSchema = propertyImageIdParamSchema;

export const deletePropertyImageSchema = propertyImageIdParamSchema;

export const reorderPropertyImagesSchema = z.object({
  params: z.object({ propertyId: objectIdSchema }),
  body: z
    .object({
      imageIds: z.array(objectIdSchema),
    })
    .strict(),
});

