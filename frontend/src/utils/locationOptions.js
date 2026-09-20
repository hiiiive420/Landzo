export const locationLevels = Object.freeze({
  province: "province",
  district: "district",
  city: "city",
  area: "area",
});

export const locationLevelOptions = Object.freeze([
  {
    value: locationLevels.province,
    label: "Province",
  },
  {
    value: locationLevels.district,
    label: "District",
  },
  {
    value: locationLevels.city,
    label: "City",
  },
  {
    value: locationLevels.area,
    label: "Area",
  },
]);

export const locationStatuses = Object.freeze({
  active: "active",
  inactive: "inactive",
});

export const locationStatusOptions = Object.freeze([
  {
    value: locationStatuses.active,
    label: "Active",
  },
  {
    value: locationStatuses.inactive,
    label: "Inactive",
  },
]);

export const expectedParentLevel = Object.freeze({
  [locationLevels.province]: null,
  [locationLevels.district]: locationLevels.province,
  [locationLevels.city]: locationLevels.district,
  [locationLevels.area]: locationLevels.city,
});

export const getLocationLevelLabel = (level) =>
  locationLevelOptions.find((option) => option.value === level)?.label ??
  level;

export const getLocationStatusLabel = (status) =>
  locationStatusOptions.find((option) => option.value === status)?.label ??
  status;

export const getRequiredParentLevel = (level) =>
  expectedParentLevel[level] ?? null;