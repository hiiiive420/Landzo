import { cleanObject, toNumberOrUndefined } from "./formatters";

const emptyLocation = {
  province: null,
  district: null,
  city: null,
  area: null,
  displayAddress: "",
};

const normalizeLocationFromProperty = (property) => ({
  province: property?.location?.province?.id || null,
  district: property?.location?.district?.id || null,
  city: property?.location?.city?.id || null,
  area: property?.location?.area?.id || null,
  displayAddress: property?.location?.displayAddress || "",
});

const normalizePricingForForm = (pricing) => {
  if (!pricing) {
    return null;
  }

  const normalizeSection = (section) => (section ? { ...section, amount: section.amount || "" } : undefined);

  return cleanObject({
    currency: pricing.currency || "LKR",
    priceVisible: Boolean(pricing.priceVisible),
    sale: normalizeSection(pricing.sale),
    rent: normalizeSection(pricing.rent),
    lease: normalizeSection(pricing.lease),
  });
};

export const formStateFromProperty = (property = null) => ({
  type: property?.type || "land",
  transactionTypes: property?.transactionTypes || ["sale"],
  title: property?.title || "",
  description: property?.description || "",
  location: property ? normalizeLocationFromProperty(property) : emptyLocation,
  details: property?.details || {},
  pricing: normalizePricingForForm(property?.pricing),
  map: property?.map ? { lat: property.map.lat, lng: property.map.lng } : null,
});

const numberFieldsByType = {
  land: ["landSize", "roadWidth"],
  house: ["bedrooms", "bathrooms", "floors", "landSize", "houseSize", "parkingSpaces"],
  apartment: ["bedrooms", "bathrooms", "floorNumber", "totalFloors", "unitSize", "parkingSpaces"],
  commercial: ["floorArea", "floorNumber", "parkingSpaces"],
};

const normalizeDetails = (type, details) => {
  const branch = { ...(details[type] || {}) };

  for (const field of numberFieldsByType[type] || []) {
    branch[field] = toNumberOrUndefined(branch[field]);
  }

  const cleanedBranch = cleanObject(branch);
  return Object.keys(cleanedBranch).length ? { [type]: cleanedBranch } : {};
};

const normalizePricingSection = (section, includePeriod) => {
  if (!section) {
    return undefined;
  }

  return cleanObject({
    mode: section.mode,
    period: includePeriod ? section.period : undefined,
    amount: toNumberOrUndefined(section.amount),
  });
};

const normalizePricing = (pricing, selectedTransactions) => {
  if (!pricing) {
    return null;
  }

  return cleanObject({
    currency: pricing.currency || "LKR",
    priceVisible: Boolean(pricing.priceVisible),
    sale: selectedTransactions.includes("sale") ? normalizePricingSection(pricing.sale, false) : undefined,
    rent: selectedTransactions.includes("rent") ? normalizePricingSection(pricing.rent, true) : undefined,
    lease: selectedTransactions.includes("lease") ? normalizePricingSection(pricing.lease, true) : undefined,
  });
};

const normalizeLocation = (location) => ({
  province: location.province || null,
  district: location.district || null,
  city: location.city || null,
  area: location.area || null,
  displayAddress: location.displayAddress?.trim() || null,
});

const normalizeMap = (map) => {
  if (!map) {
    return null;
  }

  return {
    lat: toNumberOrUndefined(map.lat),
    lng: toNumberOrUndefined(map.lng),
  };
};

export const toPropertyPayload = (formState, includeType = true) => ({
  ...(includeType ? { type: formState.type } : {}),
  transactionTypes: formState.transactionTypes,
  title: formState.title.trim(),
  description: formState.description.trim() || null,
  location: normalizeLocation(formState.location),
  details: normalizeDetails(formState.type, formState.details),
  pricing: normalizePricing(formState.pricing, formState.transactionTypes),
  map: normalizeMap(formState.map),
});

