export const PROPERTY_TYPES = Object.freeze({
  LAND: "land",
  HOUSE: "house",
  APARTMENT: "apartment",
  COMMERCIAL: "commercial",
});

export const PROPERTY_TYPE_VALUES = Object.freeze(Object.values(PROPERTY_TYPES));

export const PROPERTY_CODE_PREFIXES = Object.freeze({
  [PROPERTY_TYPES.LAND]: "LND",
  [PROPERTY_TYPES.HOUSE]: "HSE",
  [PROPERTY_TYPES.APARTMENT]: "APT",
  [PROPERTY_TYPES.COMMERCIAL]: "COM",
});

export const TRANSACTION_TYPES = Object.freeze({
  SALE: "sale",
  RENT: "rent",
  LEASE: "lease",
});

export const TRANSACTION_TYPE_VALUES = Object.freeze(Object.values(TRANSACTION_TYPES));

export const CURRENCIES = Object.freeze({
  LKR: "LKR",
  USD: "USD",
});

export const CURRENCY_VALUES = Object.freeze(Object.values(CURRENCIES));

export const PRICE_MODES = Object.freeze({
  FIXED: "fixed",
  NEGOTIABLE: "negotiable",
  PRICE_ON_REQUEST: "price_on_request",
});

export const PRICE_MODE_VALUES = Object.freeze(Object.values(PRICE_MODES));

export const RENT_PERIODS = Object.freeze({
  MONTH: "month",
  YEAR: "year",
});

export const RENT_PERIOD_VALUES = Object.freeze(Object.values(RENT_PERIODS));

export const LEASE_PERIODS = Object.freeze({
  MONTHLY: "monthly",
  ANNUAL: "annual",
  TOTAL: "total",
});

export const LEASE_PERIOD_VALUES = Object.freeze(Object.values(LEASE_PERIODS));

export const PROPERTY_STATUSES = Object.freeze({
  DRAFT: "draft",
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
  RENTED: "rented",
  LEASED: "leased",
  UNAVAILABLE: "unavailable",
  ARCHIVED: "archived",
});

export const PROPERTY_STATUS_VALUES = Object.freeze(Object.values(PROPERTY_STATUSES));

export const PROPERTY_DETAIL_KEYS = Object.freeze({
  [PROPERTY_TYPES.LAND]: "land",
  [PROPERTY_TYPES.HOUSE]: "house",
  [PROPERTY_TYPES.APARTMENT]: "apartment",
  [PROPERTY_TYPES.COMMERCIAL]: "commercial",
});

export const LAND_SIZE_UNITS = Object.freeze({
  PERCH: "perch",
  ACRE: "acre",
  SQUARE_FEET: "squareFeet",
});

export const LAND_SIZE_UNIT_VALUES = Object.freeze(Object.values(LAND_SIZE_UNITS));

export const BUILDING_SIZE_UNITS = Object.freeze({
  SQUARE_FEET: "squareFeet",
});

export const BUILDING_SIZE_UNIT_VALUES = Object.freeze(Object.values(BUILDING_SIZE_UNITS));

export const FURNISHED_STATUSES = Object.freeze({
  UNFURNISHED: "unfurnished",
  SEMI_FURNISHED: "semi_furnished",
  FURNISHED: "furnished",
});

export const FURNISHED_STATUS_VALUES = Object.freeze(Object.values(FURNISHED_STATUSES));

export const LAND_TYPES = Object.freeze({
  BARE_LAND: "bare_land",
  RESIDENTIAL: "residential",
  COMMERCIAL: "commercial",
  AGRICULTURAL: "agricultural",
});

export const LAND_TYPE_VALUES = Object.freeze(Object.values(LAND_TYPES));

export const LAND_UTILITIES = Object.freeze({
  WATER: "water",
  ELECTRICITY: "electricity",
  ROAD: "road",
});

export const LAND_UTILITY_VALUES = Object.freeze(Object.values(LAND_UTILITIES));

export const COMMERCIAL_TYPES = Object.freeze({
  OFFICE: "office",
  RETAIL: "retail",
  WAREHOUSE: "warehouse",
  MIXED_USE: "mixed_use",
  OTHER: "other",
});

export const COMMERCIAL_TYPE_VALUES = Object.freeze(Object.values(COMMERCIAL_TYPES));

export const PROPERTY_IMAGE_LIMITS = Object.freeze({
  MAX_IMAGES: 20,
  MAX_UPLOAD_FILES: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
});

export const PROPERTY_IMAGE_MAX_IMAGES = PROPERTY_IMAGE_LIMITS.MAX_IMAGES;
export const PROPERTY_IMAGE_MAX_UPLOAD_FILES = PROPERTY_IMAGE_LIMITS.MAX_UPLOAD_FILES;
export const PROPERTY_IMAGE_MAX_FILE_SIZE_BYTES = PROPERTY_IMAGE_LIMITS.MAX_FILE_SIZE_BYTES;

export const PROPERTY_IMAGE_ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const PROPERTY_IMAGE_ERROR_CODES = Object.freeze({
  LIMIT_EXCEEDED: "PROPERTY_IMAGE_LIMIT_EXCEEDED",
  REQUEST_LIMIT_EXCEEDED: "PROPERTY_IMAGE_REQUEST_LIMIT_EXCEEDED",
  TOO_LARGE: "PROPERTY_IMAGE_TOO_LARGE",
  UNSUPPORTED_TYPE: "PROPERTY_IMAGE_UNSUPPORTED_TYPE",
  NOT_FOUND: "PROPERTY_IMAGE_NOT_FOUND",
  INVALID_ORDER: "PROPERTY_IMAGE_ORDER_INVALID",
});
