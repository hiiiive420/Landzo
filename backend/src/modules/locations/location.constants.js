export const LOCATION_LEVELS = Object.freeze({
  PROVINCE: "province",
  DISTRICT: "district",
  CITY: "city",
  AREA: "area",
});

export const LOCATION_LEVEL_VALUES = Object.freeze(Object.values(LOCATION_LEVELS));

export const LOCATION_STATUSES = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
});

export const LOCATION_STATUS_VALUES = Object.freeze(Object.values(LOCATION_STATUSES));

export const EXPECTED_PARENT_LEVEL = Object.freeze({
  [LOCATION_LEVELS.PROVINCE]: null,
  [LOCATION_LEVELS.DISTRICT]: LOCATION_LEVELS.PROVINCE,
  [LOCATION_LEVELS.CITY]: LOCATION_LEVELS.DISTRICT,
  [LOCATION_LEVELS.AREA]: LOCATION_LEVELS.CITY,
});
