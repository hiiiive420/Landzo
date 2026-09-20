import { AppError } from "../../common/errors/AppError.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit/audit.constants.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { recordSearchInsightSafely } from "../analytics/analytics.service.js";
import { LOCATION_LEVELS, LOCATION_STATUSES } from "../locations/location.constants.js";
import { Location } from "../locations/location.model.js";
import {
  PROPERTY_DETAIL_KEYS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_VALUES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_VALUES,
} from "./property.constants.js";
import { Property } from "./property.model.js";
import { deletePropertyImageFromCloudinary } from "./propertyMedia.cloudinary.js";
import {
  serializeProperty,
  serializePropertyListItem,
  serializePublicExploreMapProperty,
  serializePublicProperty,
  serializePublicPropertyListItem,
} from "./property.serializer.js";
import { generatePropertyCode } from "./propertyCode.service.js";
import {
  detailSchemasByType,
  propertyDraftSchema,
  propertyPricingSchema,
} from "./property.validator.js";

const duplicateKeyCode = 11000;
const pricingTransactionKeys = ["sale", "rent", "lease"];
const trashRetentionMs = 5 * 24 * 60 * 60 * 1000;
const publishableStatuses = Object.freeze([
  PROPERTY_STATUSES.DRAFT,
  PROPERTY_STATUSES.AVAILABLE,
]);
const statusTransitionTargets = Object.freeze({
  [PROPERTY_STATUSES.AVAILABLE]: Object.freeze([
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.RESERVED,
    PROPERTY_STATUSES.SOLD,
    PROPERTY_STATUSES.RENTED,
    PROPERTY_STATUSES.LEASED,
    PROPERTY_STATUSES.UNAVAILABLE,
    PROPERTY_STATUSES.ARCHIVED,
  ]),
  [PROPERTY_STATUSES.RESERVED]: Object.freeze([
    PROPERTY_STATUSES.RESERVED,
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.SOLD,
    PROPERTY_STATUSES.RENTED,
    PROPERTY_STATUSES.LEASED,
    PROPERTY_STATUSES.UNAVAILABLE,
    PROPERTY_STATUSES.ARCHIVED,
  ]),
  [PROPERTY_STATUSES.UNAVAILABLE]: Object.freeze([
    PROPERTY_STATUSES.UNAVAILABLE,
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.ARCHIVED,
  ]),
  [PROPERTY_STATUSES.SOLD]: Object.freeze([
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.RESERVED,
    PROPERTY_STATUSES.SOLD,
    PROPERTY_STATUSES.RENTED,
    PROPERTY_STATUSES.LEASED,
    PROPERTY_STATUSES.UNAVAILABLE,
    PROPERTY_STATUSES.ARCHIVED,
  ]),
  [PROPERTY_STATUSES.RENTED]: Object.freeze([
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.RESERVED,
    PROPERTY_STATUSES.SOLD,
    PROPERTY_STATUSES.RENTED,
    PROPERTY_STATUSES.LEASED,
    PROPERTY_STATUSES.UNAVAILABLE,
    PROPERTY_STATUSES.ARCHIVED,
  ]),
  [PROPERTY_STATUSES.LEASED]: Object.freeze([
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.RESERVED,
    PROPERTY_STATUSES.SOLD,
    PROPERTY_STATUSES.RENTED,
    PROPERTY_STATUSES.LEASED,
    PROPERTY_STATUSES.UNAVAILABLE,
    PROPERTY_STATUSES.ARCHIVED,
  ]),
  [PROPERTY_STATUSES.ARCHIVED]: Object.freeze([PROPERTY_STATUSES.ARCHIVED]),
});
const transactionRequiredByClosedStatus = Object.freeze({
  [PROPERTY_STATUSES.SOLD]: TRANSACTION_TYPES.SALE,
  [PROPERTY_STATUSES.RENTED]: TRANSACTION_TYPES.RENT,
  [PROPERTY_STATUSES.LEASED]: TRANSACTION_TYPES.LEASE,
});
const requiredPublicationDetailsByType = Object.freeze({
  [PROPERTY_TYPES.LAND]: ["landSize", "landSizeUnit", "landType"],
  [PROPERTY_TYPES.HOUSE]: [
    "bedrooms",
    "bathrooms",
    "houseSize",
    "houseSizeUnit",
    "landSize",
    "landSizeUnit",
  ],
  [PROPERTY_TYPES.APARTMENT]: ["bedrooms", "bathrooms", "unitSize", "unitSizeUnit"],
  [PROPERTY_TYPES.COMMERCIAL]: ["commercialType", "floorArea", "floorAreaUnit"],
});
const recordPropertyAuditLog = async ({ actorUserId, action, property }) => {
  try {
    await recordAuditLog({
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.PROPERTY,
      entityId: property._id,
      entityLabel: property.code,
    });
  } catch (error) {
    console.error("Audit log write failed", {
      action,
      entityType: AUDIT_ENTITY_TYPES.PROPERTY,
      errorCode: error?.code || "AUDIT_WRITE_FAILED",
    });
  }
};
const locationPopulate = [
  { path: "province", select: "name level slug" },
  { path: "district", select: "name level slug" },
  { path: "city", select: "name level slug" },
  { path: "area", select: "name level slug" },
];

const hasOwn = (value, key) => value != null && Object.prototype.hasOwnProperty.call(value, key);

const toPropertyDetailsError = (details) =>
  new AppError(400, "Invalid property details", "INVALID_PROPERTY_DETAILS", details);

const toPropertyPricingError = (details, code = "INVALID_PROPERTY_PRICING") =>
  new AppError(400, "Invalid property pricing", code, details);

const toPropertyMapError = (details) =>
  new AppError(400, "Invalid property map selection", "INVALID_PROPERTY_MAP", details);

const toPropertyLocationInvalidError = () =>
  new AppError(400, "Invalid property location hierarchy", "PROPERTY_LOCATION_INVALID");

const toPropertyLocationInactiveError = () =>
  new AppError(409, "Property location is inactive", "PROPERTY_LOCATION_INACTIVE");

const toPropertyNotFoundError = () => new AppError(404, "Property not found", "PROPERTY_NOT_FOUND");

const toPropertyNotReadyForPublicationError = (missingFields) =>
  new AppError(409, "Property is not ready for publication", "PROPERTY_NOT_READY_FOR_PUBLICATION", {
    missingFields,
  });

const toPropertyStatusNotPublishableError = (status) =>
  new AppError(409, "Property status cannot be published", "PROPERTY_STATUS_NOT_PUBLISHABLE", {
    status,
    allowedStatuses: publishableStatuses,
  });

const toPropertyFeaturedRequiresPublicError = () =>
  new AppError(409, "Only public properties can be featured", "PROPERTY_FEATURED_REQUIRES_PUBLIC");

const toPropertyExploreMapRequiresPublicError = () =>
  new AppError(
    409,
    "Only public properties can be shown on Explore Map",
    "PROPERTY_EXPLORE_MAP_REQUIRES_PUBLIC",
  );

const toPropertyExploreMapRequiresMapError = () =>
  new AppError(
    409,
    "Explore Map requires an exact property map location",
    "PROPERTY_EXPLORE_MAP_REQUIRES_MAP",
  );

const toPropertyStatusTransitionInvalidError = ({ fromStatus, toStatus }) =>
  new AppError(409, "Property status transition is not allowed", "PROPERTY_STATUS_TRANSITION_INVALID", {
    fromStatus,
    toStatus,
  });

const toPropertyStatusTransactionRequiredError = ({ status, transactionType }) =>
  new AppError(
    409,
    "Property status requires the matching transaction type",
    "PROPERTY_STATUS_TRANSACTION_REQUIRED",
    { status, transactionType },
  );

const toPropertyInTrashError = () =>
  new AppError(409, "Property is in trash", "PROPERTY_IN_TRASH");

const toPropertyRestoreWindowExpiredError = () =>
  new AppError(409, "Property restore window has expired", "PROPERTY_RESTORE_WINDOW_EXPIRED");

const isMeaningfulDetails = (value) =>
  value && Object.values(value).some((item) => item !== undefined && item !== null);

const normalizeNullableId = (value) => value ?? null;

const sameId = (left, right) => left?.toString() === right?.toString();

const formatValidationDetails = (issues) =>
  issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));

const hasIssueForPath = (issues, path) =>
  issues.some((issue) => issue.path[0] === path || issue.keys?.includes(path));

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPlainObject = (value) => value?.toObject?.({ depopulate: true }) ?? value;

const serializeId = (value) => value?._id?.toString?.() ?? value?.toString?.() ?? null;

const hasPublicationValue = (value) =>
  value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0);

const pushMissingField = (missingFields, path) => {
  if (!missingFields.includes(path)) {
    missingFields.push(path);
  }
};

const isPropertyTrashed = (property) => Boolean(property?.deletedAt);

const assertPropertyNotTrashed = (property) => {
  if (isPropertyTrashed(property)) {
    throw toPropertyInTrashError();
  }
};

const hasValidGeoPoint = (mapLocation) => {
  if (!mapLocation || mapLocation.type !== "Point" || !Array.isArray(mapLocation.coordinates)) {
    return false;
  }

  const [longitude, latitude] = mapLocation.coordinates;
  return (
    mapLocation.coordinates.length === 2 &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
};

const collectPricingPublicationIssues = ({ transactionTypes, pricing }) => {
  const missingFields = [];
  const plainPricing = toPlainObject(pricing);

  if (!plainPricing) {
    return ["pricing"];
  }

  const pricingResult = propertyPricingSchema.safeParse(plainPricing);

  if (!pricingResult.success) {
    pricingResult.error.issues.forEach((issue) => {
      const path = issue.path.length ? `pricing.${issue.path.join(".")}` : "pricing";
      pushMissingField(missingFields, path);
    });
  } else {
    try {
      validatePropertyPricing({
        transactionTypes,
        pricing: pricingResult.data,
        mismatchCode: "PROPERTY_PRICING_TRANSACTION_MISMATCH",
      });
    } catch {
      pushMissingField(missingFields, "pricing");
    }
  }

  transactionTypes.forEach((transactionType) => {
    if (!plainPricing[transactionType]) {
      pushMissingField(missingFields, `pricing.${transactionType}`);
    }
  });

  return missingFields;
};

const collectDetailsPublicationIssues = (property) => {
  const missingFields = [];
  const detailKey = PROPERTY_DETAIL_KEYS[property.type];
  const details = toPlainObject(property.details) ?? {};

  try {
    validatePropertyDetails({ type: property.type, details });
  } catch {
    pushMissingField(missingFields, "details");
  }

  const activeDetails = details[detailKey] ?? {};
  const requiredFields = requiredPublicationDetailsByType[property.type] ?? [];

  requiredFields.forEach((field) => {
    if (!hasPublicationValue(activeDetails[field])) {
      pushMissingField(missingFields, `details.${detailKey}.${field}`);
    }
  });

  return missingFields;
};

const collectMediaPublicationIssues = (property) => {
  const images = property.media?.images ?? [];
  const coverImages = images.filter((image) => image.isCover);
  const missingFields = [];

  if (images.length < 1) {
    pushMissingField(missingFields, "media.images");
  }

  if (coverImages.length !== 1) {
    pushMissingField(missingFields, "media.coverImage");
  }

  return missingFields;
};

const currentLocationInput = (property) => ({
  province: serializeId(property.province),
  district: serializeId(property.district),
  city: serializeId(property.city),
  area: serializeId(property.area),
  displayAddress: property.displayAddress ?? null,
});

const mergeLocationInput = (property, locationInput) => ({
  ...currentLocationInput(property),
  ...locationInput,
});

const populatePropertyLocations = async (property) => {
  await property.populate(locationPopulate);
  return property;
};

export const parsePropertyDraftInput = (input) => {
  if (!PROPERTY_TYPE_VALUES.includes(input?.type)) {
    throw new AppError(400, "Invalid property type", "INVALID_PROPERTY_TYPE");
  }

  if (
    !Array.isArray(input?.transactionTypes) ||
    input.transactionTypes.length === 0 ||
    input.transactionTypes.some(
      (transactionType) => !TRANSACTION_TYPE_VALUES.includes(transactionType),
    ) ||
    new Set(input.transactionTypes).size !== input.transactionTypes.length
  ) {
    throw new AppError(400, "Invalid transaction types", "INVALID_TRANSACTION_TYPES");
  }

  const result = propertyDraftSchema.safeParse(input);

  if (!result.success) {
    const details = formatValidationDetails(result.error.issues);

    if (hasIssueForPath(result.error.issues, "pricing")) {
      throw toPropertyPricingError(details);
    }

    if (hasIssueForPath(result.error.issues, "map")) {
      throw toPropertyMapError(details);
    }

    throw toPropertyDetailsError(details);
  }

  return result.data;
};

export const normalizeTransactionTypes = (transactionTypes) =>
  TRANSACTION_TYPE_VALUES.filter((transactionType) => transactionTypes.includes(transactionType));

export const validatePropertyDetails = ({ type, details = {} }) => {
  const expectedDetailKey = PROPERTY_DETAIL_KEYS[type];

  for (const detailKey of Object.values(PROPERTY_DETAIL_KEYS)) {
    if (detailKey !== expectedDetailKey && isMeaningfulDetails(details[detailKey])) {
      throw toPropertyDetailsError([
        {
          path: `details.${detailKey}`,
          message: `${detailKey} details are not allowed for ${type} properties`,
        },
      ]);
    }
  }

  if (!isMeaningfulDetails(details[expectedDetailKey])) {
    return {};
  }

  const result = detailSchemasByType[expectedDetailKey].safeParse(details[expectedDetailKey]);

  if (!result.success) {
    throw toPropertyDetailsError(formatValidationDetails(result.error.issues));
  }

  return { [expectedDetailKey]: result.data };
};

export const validatePropertyPricing = ({
  transactionTypes,
  pricing,
  mismatchCode = "INVALID_PROPERTY_PRICING",
} = {}) => {
  if (!pricing) {
    return pricing === null ? null : undefined;
  }

  const suppliedPricingKeys = pricingTransactionKeys.filter(
    (transactionType) => pricing[transactionType],
  );

  if (!suppliedPricingKeys.length) {
    throw toPropertyPricingError([
      { path: "pricing", message: "Pricing must include at least one transaction price" },
    ]);
  }

  const unsupportedPricingKeys = suppliedPricingKeys.filter(
    (transactionType) => !transactionTypes.includes(transactionType),
  );

  if (unsupportedPricingKeys.length) {
    throw toPropertyPricingError(
      unsupportedPricingKeys.map((transactionType) => ({
        path: `pricing.${transactionType}`,
        message: `${transactionType} pricing requires the matching transaction type`,
      })),
      mismatchCode,
    );
  }

  return pricing;
};

export const createMapLocation = (map) => {
  if (!map) {
    return map === null ? null : undefined;
  }

  return {
    type: "Point",
    coordinates: [map.lng, map.lat],
  };
};

const loadActiveLocation = async ({ locationId, expectedLevel }) => {
  if (!locationId) {
    return null;
  }

  const location = await Location.findById(locationId);

  if (!location || location.level !== expectedLevel) {
    throw toPropertyLocationInvalidError();
  }

  if (location.status !== LOCATION_STATUSES.ACTIVE) {
    throw toPropertyLocationInactiveError();
  }

  return location;
};

export const validatePropertyLocationHierarchy = async (locationInput = {}) => {
  const provinceId = normalizeNullableId(locationInput.province);
  const districtId = normalizeNullableId(locationInput.district);
  const cityId = normalizeNullableId(locationInput.city);
  const areaId = normalizeNullableId(locationInput.area);

  if (districtId && !provinceId) {
    throw toPropertyLocationInvalidError();
  }

  if (cityId && !districtId) {
    throw toPropertyLocationInvalidError();
  }

  if (areaId && !cityId) {
    throw toPropertyLocationInvalidError();
  }

  const province = await loadActiveLocation({
    locationId: provinceId,
    expectedLevel: LOCATION_LEVELS.PROVINCE,
  });
  const district = await loadActiveLocation({
    locationId: districtId,
    expectedLevel: LOCATION_LEVELS.DISTRICT,
  });
  const city = await loadActiveLocation({
    locationId: cityId,
    expectedLevel: LOCATION_LEVELS.CITY,
  });
  const area = await loadActiveLocation({
    locationId: areaId,
    expectedLevel: LOCATION_LEVELS.AREA,
  });

  if (district && !sameId(district.parent, province._id)) {
    throw toPropertyLocationInvalidError();
  }

  if (city && !sameId(city.parent, district._id)) {
    throw toPropertyLocationInvalidError();
  }

  if (area && !sameId(area.parent, city._id)) {
    throw toPropertyLocationInvalidError();
  }

  return {
    province: province?._id ?? null,
    district: district?._id ?? null,
    city: city?._id ?? null,
    area: area?._id ?? null,
    displayAddress: locationInput.displayAddress ?? null,
  };
};

const assertNoServerControlledFields = (input) => {
  const blockedFields = [
    "code",
    "slug",
    "createdBy",
    "updatedBy",
    "mapLocation",
    "deletedAt",
    "purgeAt",
    "deletedBy",
  ];
  const presentBlockedField = blockedFields.find((field) => hasOwn(input, field));

  if (presentBlockedField) {
    throw toPropertyDetailsError([
      {
        path: presentBlockedField,
        message: `${presentBlockedField} is server controlled`,
      },
    ]);
  }
};

const handleDuplicateCodeError = (error) => {
  if (error?.code === duplicateKeyCode) {
    throw new AppError(500, "Property code generation failed", "PROPERTY_CODE_GENERATION_FAILED");
  }

  throw error;
};

export const createPropertyDraft = async ({ actorUserId, input }) => {
  assertNoServerControlledFields(input);

  const parsedInput = parsePropertyDraftInput(input);
  const transactionTypes = normalizeTransactionTypes(parsedInput.transactionTypes);
  const pricing = validatePropertyPricing({ transactionTypes, pricing: parsedInput.pricing });
  const mapLocation = createMapLocation(parsedInput.map);
  const location = await validatePropertyLocationHierarchy(parsedInput.location ?? {});
  const details = validatePropertyDetails({ type: parsedInput.type, details: parsedInput.details });
  const code = await generatePropertyCode(parsedInput.type);

  try {
    const property = await Property.create({
      code,
      type: parsedInput.type,
      transactionTypes,
      status: parsedInput.status ?? PROPERTY_STATUSES.DRAFT,
      title: parsedInput.title,
      description: parsedInput.description ?? null,
      province: location.province,
      district: location.district,
      city: location.city,
      area: location.area,
      displayAddress: location.displayAddress,
      details,
      pricing,
      mapLocation,
      isPublic: parsedInput.isPublic ?? false,
      exploreMapEnabled: parsedInput.exploreMapEnabled ?? false,
      featured: parsedInput.featured ?? false,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });

    await recordPropertyAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.PROPERTY_CREATED,
      property,
    });

    return serializeProperty(property);
  } catch (error) {
    handleDuplicateCodeError(error);
  }
};

export const createAdminPropertyDraft = async ({ actorUserId, input }) => {
  const draft = await createPropertyDraft({ actorUserId, input });
  return getAdminProperty(draft.id);
};

const buildAdminPropertyFilter = (query, { trashed = false } = {}) => {
  const filter = trashed ? { deletedAt: { $ne: null } } : { deletedAt: null };

  if (query.type) {
    filter.type = query.type;
  }

  if (query.transactionType) {
    filter.transactionTypes = query.transactionType;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.provinceId) {
    filter.province = query.provinceId;
  }

  if (query.districtId) {
    filter.district = query.districtId;
  }

  if (query.cityId) {
    filter.city = query.cityId;
  }

  if (query.areaId) {
    filter.area = query.areaId;
  }
if (query.currency) {
  filter["pricing.currency"] = query.currency;
}

if (query.isPublic === "true") {
  filter.isPublic = true;
}

if (query.isPublic === "false") {
  filter.isPublic = false;
}

if (query.featured === "true") {
  filter.featured = true;
}

if (query.featured === "false") {
  filter.featured = false;
}

if (query.exploreMapEnabled === "true") {
  filter.exploreMapEnabled = true;
}

if (query.exploreMapEnabled === "false") {
  filter.exploreMapEnabled = false;
}

if (query.hasMap === "true") {
  filter.mapLocation = {
    $exists: true,
    $ne: null,
  };
}

if (query.hasMap === "false") {
  filter.$or = [
    { mapLocation: { $exists: false } },
    { mapLocation: null },
  ];
}

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    const searchFilter = [{ code: pattern }, { title: pattern }, { displayAddress: pattern }];

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
      delete filter.$or;
    } else {
      filter.$or = searchFilter;
    }
  }

  return filter;
};


const addFilterCondition = (filter, condition) => {
  if (!filter.$and) {
    filter.$and = [];
  }

  filter.$and.push(condition);
};

const addPublicPriceFilter = (filter, query) => {
  if (query.minPrice === undefined && query.maxPrice === undefined) {
    return;
  }

  const amountFilter = {};

  if (query.minPrice !== undefined) {
    amountFilter.$gte = query.minPrice;
  }

  if (query.maxPrice !== undefined) {
    amountFilter.$lte = query.maxPrice;
  }

  const transactionTypes = query.transactionType
    ? [query.transactionType]
    : Object.values(TRANSACTION_TYPES);

  addFilterCondition(filter, {
    $or: transactionTypes.map((transactionType) => ({
      [`pricing.${transactionType}.amount`]: amountFilter,
    })),
  });
};
const buildPublicPropertyFilter = (query) => {
  const filter = {
    isPublic: true,
    deletedAt: null,
  };

  if (query.type) {
    filter.type = query.type;
  }

  if (query.transactionType) {
    filter.transactionTypes = query.transactionType;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.provinceId) {
    filter.province = query.provinceId;
  }

  if (query.districtId) {
    filter.district = query.districtId;
  }

  if (query.cityId) {
    filter.city = query.cityId;
  }

  if (query.areaId) {
    filter.area = query.areaId;
  }

  if (query.currency) {
    filter["pricing.currency"] = query.currency;
  }

  if (query.featured === "true") {
    filter.featured = true;
  }

  if (query.featured === "false") {
    filter.featured = false;
  }

  addPublicPriceFilter(filter, query);

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");

    filter.$or = [
      { code: pattern },
      { title: pattern },
      { displayAddress: pattern },
    ];
  }

  return filter;
};

const sortMap = Object.freeze({
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  updated_desc: { updatedAt: -1 },
  updated_asc: { updatedAt: 1 },
  code_asc: { code: 1 },
  code_desc: { code: -1 },
});

export const listAdminProperties = async (query) => {
  const page = query.page;
  const limit = query.limit;
  const filter = buildAdminPropertyFilter(query);
  const sort = sortMap[query.sort] ?? sortMap.newest;
  const skip = (page - 1) * limit;

  const [properties, total] = await Promise.all([
    Property.find(filter).sort(sort).skip(skip).limit(limit).populate(locationPopulate),
    Property.countDocuments(filter),
  ]);

  return {
    data: properties.map(serializePropertyListItem),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
export const listPublicProperties = async (query) => {
  const page = query.page;
  const limit = query.limit;
  const filter = buildPublicPropertyFilter(query);
  const sort = sortMap[query.sort] ?? sortMap.newest;
  const skip = (page - 1) * limit;

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(locationPopulate),
    Property.countDocuments(filter),
  ]);

  await recordSearchInsightSafely({ query, resultCount: total });

  return {
    data: properties.map(serializePublicPropertyListItem),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const listPublicExploreMapProperties = async () => {
  const properties = await Property.find({
    ...buildPublicPropertyFilter({}),
    exploreMapEnabled: true,
    mapLocation: {
      $ne: null,
    },
    "mapLocation.type": "Point",
    "mapLocation.coordinates.0": { $gte: -180, $lte: 180 },
    "mapLocation.coordinates.1": { $gte: -90, $lte: 90 },
  })
    .sort(sortMap.newest)
    .populate(locationPopulate);

  return properties
    .filter((property) => hasValidGeoPoint(property.mapLocation))
    .map(serializePublicExploreMapProperty);
};

export const getPublicProperty = async (propertyCode) => {
  const property = await Property.findOne({
    code: propertyCode,
    isPublic: true,
    deletedAt: null,
  }).populate(locationPopulate);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  return serializePublicProperty(property);
};
export const getAdminProperty = async (propertyId) => {
  const property = await Property.findOne({ _id: propertyId, deletedAt: null }).populate(locationPopulate);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  return serializeProperty(property);
};

export const listTrashedAdminProperties = async (query) => {
  const page = query.page;
  const limit = query.limit;
  const filter = buildAdminPropertyFilter(query, { trashed: true });
  const sort = sortMap[query.sort] ?? sortMap.newest;
  const skip = (page - 1) * limit;

  const [properties, total] = await Promise.all([
    Property.find(filter).sort(sort).skip(skip).limit(limit).populate(locationPopulate),
    Property.countDocuments(filter),
  ]);

  return {
    data: properties.map(serializePropertyListItem),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const trashProperty = async ({ actorUserId, propertyId, now = new Date() }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  const wasTrashed = isPropertyTrashed(property);
  const hadVisibleFlags = property.isPublic || property.featured || property.exploreMapEnabled;

  if (!wasTrashed) {
    property.deletedAt = new Date(now);
    property.purgeAt = new Date(property.deletedAt.getTime() + trashRetentionMs);
    property.deletedBy = actorUserId;
  }

  property.isPublic = false;
  property.featured = false;
  property.exploreMapEnabled = false;
  property.updatedBy = actorUserId;

  await property.save();

  if (!wasTrashed || hadVisibleFlags) {
    await recordPropertyAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.PROPERTY_TRASHED,
      property,
    });
  }

  await populatePropertyLocations(property);
  return serializeProperty(property);
};

export const restoreProperty = async ({ actorUserId, propertyId, now = new Date() }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  if (!isPropertyTrashed(property)) {
    await populatePropertyLocations(property);
    return serializeProperty(property);
  }

  if (property.purgeAt && property.purgeAt.getTime() <= new Date(now).getTime()) {
    throw toPropertyRestoreWindowExpiredError();
  }

  property.deletedAt = null;
  property.purgeAt = null;
  property.deletedBy = null;
  property.isPublic = false;
  property.featured = false;
  property.exploreMapEnabled = false;
  property.updatedBy = actorUserId;

  await property.save();
  await recordPropertyAuditLog({
    actorUserId,
    action: AUDIT_ACTIONS.PROPERTY_RESTORED,
    property,
  });
  await populatePropertyLocations(property);
  return serializeProperty(property);
};

export const purgeExpiredTrashedProperties = async ({ env, now = new Date(), limit = 100 } = {}) => {
  const expiredProperties = await Property.find({
    deletedAt: { $ne: null },
    purgeAt: { $lte: new Date(now) },
  })
    .sort({ purgeAt: 1 })
    .limit(limit);
  const purgedPropertyIds = [];

  for (const property of expiredProperties) {
    const images = property.media?.images ?? [];

    for (const image of images) {
      await deletePropertyImageFromCloudinary({ env, publicId: image.publicId });
    }

    const deletion = await Property.deleteOne({
      _id: property._id,
      deletedAt: { $ne: null },
      purgeAt: { $lte: new Date(now) },
    });

    if (deletion.deletedCount === 1) {
      purgedPropertyIds.push(property._id.toString());
    }
  }

  return {
    purgedCount: purgedPropertyIds.length,
    propertyIds: purgedPropertyIds,
  };
};

export const validatePropertyForPublication = (property) => {
  const missingFields = [];

  ["title", "description", "province", "district", "city", "displayAddress"].forEach((field) => {
    if (!hasPublicationValue(property[field])) {
      pushMissingField(missingFields, field);
    }
  });

  if (!hasValidGeoPoint(property.mapLocation)) {
    pushMissingField(missingFields, "mapLocation");
  }

  collectPricingPublicationIssues({
    transactionTypes: property.transactionTypes,
    pricing: property.pricing,
  }).forEach((field) => pushMissingField(missingFields, field));

  collectDetailsPublicationIssues(property).forEach((field) => pushMissingField(missingFields, field));
  collectMediaPublicationIssues(property).forEach((field) => pushMissingField(missingFields, field));

  return missingFields;
};

const assertPropertyCanBePublished = (property) => {
  if (!publishableStatuses.includes(property.status)) {
    throw toPropertyStatusNotPublishableError(property.status);
  }
};

export const publishProperty = async ({ actorUserId, propertyId }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  assertPropertyNotTrashed(property);
  assertPropertyCanBePublished(property);

  const missingFields = validatePropertyForPublication(property);
  if (missingFields.length) {
    throw toPropertyNotReadyForPublicationError(missingFields);
  }

  const wasPublic = property.isPublic;
  const previousStatus = property.status;

  property.isPublic = true;
  property.status = PROPERTY_STATUSES.AVAILABLE;
  property.updatedBy = actorUserId;

  await property.save();

  if (!wasPublic || previousStatus !== PROPERTY_STATUSES.AVAILABLE) {
    await recordPropertyAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.PROPERTY_PUBLISHED,
      property,
    });
  }

  await populatePropertyLocations(property);
  return serializeProperty(property);
};

export const unpublishProperty = async ({ actorUserId, propertyId }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  assertPropertyNotTrashed(property);

  const wasPublic = property.isPublic;

  property.isPublic = false;
  property.updatedBy = actorUserId;

  await property.save();

  if (wasPublic) {
    await recordPropertyAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.PROPERTY_UNPUBLISHED,
      property,
    });
  }

  await populatePropertyLocations(property);
  return serializeProperty(property);
};

export const updatePropertyFeatured = async ({ actorUserId, propertyId, featured }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  assertPropertyNotTrashed(property);

  if (featured && !property.isPublic) {
    throw toPropertyFeaturedRequiresPublicError();
  }

  const previousFeatured = property.featured;

  property.featured = featured;
  property.updatedBy = actorUserId;

  await property.save();

  if (previousFeatured !== featured) {
    await recordPropertyAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.PROPERTY_FEATURED_CHANGED,
      property,
    });
  }

  await populatePropertyLocations(property);
  return serializeProperty(property);
};

export const updatePropertyExploreMap = async ({ actorUserId, propertyId, exploreMapEnabled }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  assertPropertyNotTrashed(property);

  if (exploreMapEnabled && !property.isPublic) {
    throw toPropertyExploreMapRequiresPublicError();
  }

  if (exploreMapEnabled && !hasValidGeoPoint(property.mapLocation)) {
    throw toPropertyExploreMapRequiresMapError();
  }

  const previousExploreMapEnabled = property.exploreMapEnabled;

  property.exploreMapEnabled = exploreMapEnabled;
  property.updatedBy = actorUserId;

  await property.save();

  if (previousExploreMapEnabled !== exploreMapEnabled) {
    await recordPropertyAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.PROPERTY_EXPLORE_MAP_CHANGED,
      property,
    });
  }

  await populatePropertyLocations(property);
  return serializeProperty(property);
};

const validatePropertyStatusTransition = ({ property, status }) => {
  if (status === PROPERTY_STATUSES.DRAFT || property.status === PROPERTY_STATUSES.DRAFT) {
    throw toPropertyStatusTransitionInvalidError({ fromStatus: property.status, toStatus: status });
  }

  const requiredTransactionType = transactionRequiredByClosedStatus[status];
  if (requiredTransactionType && !property.transactionTypes.includes(requiredTransactionType)) {
    throw toPropertyStatusTransactionRequiredError({
      status,
      transactionType: requiredTransactionType,
    });
  }

  const allowedTargets = statusTransitionTargets[property.status] ?? [];
  if (!allowedTargets.includes(status)) {
    throw toPropertyStatusTransitionInvalidError({ fromStatus: property.status, toStatus: status });
  }
};

export const unarchiveProperty = async ({ actorUserId, propertyId }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  assertPropertyNotTrashed(property);

  if (property.status === PROPERTY_STATUSES.ARCHIVED) {
    property.status = PROPERTY_STATUSES.AVAILABLE;
    property.updatedBy = actorUserId;
    await property.save();

    await recordPropertyAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.PROPERTY_STATUS_CHANGED,
      property,
    });
  }

  await populatePropertyLocations(property);
  return serializeProperty(property);
};
export const updatePropertyStatus = async ({ actorUserId, propertyId, status }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  assertPropertyNotTrashed(property);
  validatePropertyStatusTransition({ property, status });

  const previousStatus = property.status;

  property.status = status;
  property.updatedBy = actorUserId;

  await property.save();

  if (previousStatus !== status) {
    await recordPropertyAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.PROPERTY_STATUS_CHANGED,
      property,
    });
  }

  await populatePropertyLocations(property);
  return serializeProperty(property);
};

const getEditableDetails = (property) => toPlainObject(property.details) ?? {};

const mergeDetailsInput = (existingDetails = {}, patchDetails = {}) => {
  const nextDetails = { ...existingDetails };

  for (const detailKey of Object.values(PROPERTY_DETAIL_KEYS)) {
    if (hasOwn(patchDetails, detailKey)) {
      const patchValue = patchDetails[detailKey];
      nextDetails[detailKey] = patchValue
        ? { ...(existingDetails[detailKey] ?? {}), ...patchValue }
        : patchValue;
    }
  }

  return nextDetails;
};
const getEditablePricing = (property) => {
  const pricing = toPlainObject(property.pricing);
  return pricing ?? undefined;
};

export const updateAdminProperty = async ({ actorUserId, propertyId, input }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  assertPropertyNotTrashed(property);

  const transactionTypes = hasOwn(input, "transactionTypes")
    ? normalizeTransactionTypes(input.transactionTypes)
    : property.transactionTypes;
  const existingDetails = getEditableDetails(property);
  const prospectiveDetails = hasOwn(input, "details")
    ? mergeDetailsInput(existingDetails, input.details)
    : existingDetails;
  const details = validatePropertyDetails({ type: property.type, details: prospectiveDetails });
  const prospectivePricing = hasOwn(input, "pricing")
    ? input.pricing
    : getEditablePricing(property);
  const pricing = validatePropertyPricing({
    transactionTypes,
    pricing: prospectivePricing,
    mismatchCode: "PROPERTY_PRICING_TRANSACTION_MISMATCH",
  });

  let location;
  if (hasOwn(input, "location")) {
    location = await validatePropertyLocationHierarchy(
      mergeLocationInput(property, input.location ?? {}),
    );
  }

  property.transactionTypes = transactionTypes;

  if (hasOwn(input, "title")) {
    property.title = input.title;
  }

  if (hasOwn(input, "description")) {
    property.description = input.description ?? null;
  }

  if (location) {
    property.province = location.province;
    property.district = location.district;
    property.city = location.city;
    property.area = location.area;
    property.displayAddress = location.displayAddress;
  }

  property.details = details;

  if (hasOwn(input, "pricing")) {
    property.pricing = pricing;
  }

  if (hasOwn(input, "map")) {
    property.mapLocation = createMapLocation(input.map);
  }

  const hasPropertyChanges = property.modifiedPaths().some((path) => path !== "updatedBy");
  property.updatedBy = actorUserId;

  try {
    await property.save();

    if (hasPropertyChanges) {
      await recordPropertyAuditLog({
        actorUserId,
        action: AUDIT_ACTIONS.PROPERTY_UPDATED,
        property,
      });
    }

    await populatePropertyLocations(property);
    return serializeProperty(property);
  } catch (error) {
    handleDuplicateCodeError(error);
  }
};
export const duplicateAdminProperty = async ({ actorUserId, propertyId }) => {
  const source = await Property.findById(propertyId);

  if (!source) {
    throw toPropertyNotFoundError();
  }

  assertPropertyNotTrashed(source);

  const sourcePricing = getEditablePricing(source);
  const pricing = sourcePricing ? { ...sourcePricing, priceVisible: false } : undefined;
  const sourceCoordinates = source.mapLocation?.coordinates;
  const mapLocation =
    sourceCoordinates?.length === 2
      ? createMapLocation({ lat: sourceCoordinates[1], lng: sourceCoordinates[0] })
      : undefined;
  const code = await generatePropertyCode(source.type);

  try {
    const property = await Property.create({
      code,
      type: source.type,
      transactionTypes: [...source.transactionTypes],
      status: PROPERTY_STATUSES.DRAFT,
      title: `${source.title} (Copy)`,
      description: source.description ?? null,
      province: source.province ?? null,
      district: source.district ?? null,
      city: source.city ?? null,
      area: source.area ?? null,
      displayAddress: source.displayAddress ?? null,
      details: validatePropertyDetails({ type: source.type, details: getEditableDetails(source) }),
      pricing,
      mapLocation,
      isPublic: false,
      exploreMapEnabled: false,
      featured: false,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });

    await populatePropertyLocations(property);
    await recordPropertyAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.PROPERTY_CREATED,
      property,
    });

    return serializeProperty(property);
  } catch (error) {
    handleDuplicateCodeError(error);
  }
};

















