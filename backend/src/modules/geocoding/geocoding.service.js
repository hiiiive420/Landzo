import { AppError } from "../../common/errors/AppError.js";
import { LOCATION_LEVELS, LOCATION_STATUSES } from "../locations/location.constants.js";
import { Location } from "../locations/location.model.js";
import { normalizeLocationName } from "../locations/location.utils.js";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const NOMINATIM_TIMEOUT_MS = 6500;
const SEARCH_LIMIT = 6;

const stripLevelWords = (value, words) => {
  if (!value) {
    return null;
  }

  let current = value;

  for (const word of words) {
    current = current.replace(new RegExp(`\\b${word}\\b`, "gi"), " ");
  }

  return current.replace(/\s+/g, " ").trim() || null;
};

const uniqueValues = (values) => {
  const seen = new Set();
  const unique = [];

  for (const value of values) {
    const normalized = normalizeLocationName(value || "");

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(value);
  }

  return unique;
};

const toCandidates = (values, stripWords = []) =>
  uniqueValues(
    values.flatMap((value) => [value, stripLevelWords(value, stripWords)]).filter(Boolean),
  );

const locationLevelSuffixes = Object.freeze({
  [LOCATION_LEVELS.PROVINCE]: ["province"],
  [LOCATION_LEVELS.DISTRICT]: ["district"],
  [LOCATION_LEVELS.CITY]: ["city", "town", "municipality", "village"],
  [LOCATION_LEVELS.AREA]: ["area"],
});

const expandCanonicalKeysForLevel = ({ level, candidate }) => {
  const normalized = normalizeLocationName(candidate);

  if (!normalized) {
    return [];
  }

  const suffixes = locationLevelSuffixes[level] ?? [];
  const keys = new Set([normalized]);

  suffixes.forEach((suffix) => {
    const stripped = normalizeLocationName(normalized.replace(new RegExp(`\\b${suffix}\\b`, "gi"), " "));

    if (stripped) {
      keys.add(stripped);
      keys.add(normalizeLocationName(`${stripped} ${suffix}`));
    }

    keys.add(normalizeLocationName(`${normalized} ${suffix}`));
  });

  return [...keys].filter(Boolean);
};

const toCanonicalKeys = ({ level, candidates }) =>
  uniqueValues(
    candidates.flatMap((candidate) => expandCanonicalKeysForLevel({ level, candidate })),
  );

const toLocationNames = (place) => {
  const address = place.address ?? {};

  return {
    province: toCandidates([address.state, address.province, address.region], ["province"]),
    district: toCandidates([address.district, address.state_district, address.county], ["district"]),
    city: toCandidates([
      address.city,
      address.town,
      address.municipality,
      address.village,
    ]),
    area: toCandidates([
      address.suburb,
      address.neighbourhood,
      address.quarter,
      address.hamlet,
      address.city_district,
    ]),
  };
};

const firstCandidate = (values) => values.find(Boolean) ?? null;

const detectLocationLevel = (place, names) => {
  const address = place.address ?? {};
  const areaName = firstCandidate([
    address.suburb,
    address.neighbourhood,
    address.quarter,
    address.hamlet,
    address.city_district,
  ]);
  const cityName = firstCandidate([
    address.city,
    address.town,
    address.municipality,
    address.village,
  ]);
  const districtName = firstCandidate([address.district, address.state_district, address.county]);
  const provinceName = firstCandidate([address.state, address.province, address.region]);

  if (areaName) {
    return { level: LOCATION_LEVELS.AREA, name: names.area[0] ?? areaName };
  }

  if (cityName) {
    return { level: LOCATION_LEVELS.CITY, name: names.city[0] ?? cityName };
  }

  if (districtName) {
    return { level: LOCATION_LEVELS.DISTRICT, name: names.district[0] ?? districtName };
  }

  if (provinceName) {
    return { level: LOCATION_LEVELS.PROVINCE, name: names.province[0] ?? provinceName };
  }

  return null;
};

const findLocationByCandidates = async ({ level, parent, candidates }) => {
  for (const canonicalKey of toCanonicalKeys({ level, candidates })) {
    const location = await Location.findOne({
      level,
      parent,
      canonicalKey,
      status: LOCATION_STATUSES.ACTIVE,
    }).select("_id name level parent mapLocation");

    if (location) {
      return location;
    }
  }

  return null;
};

const serializeMatchedLocation = (location) =>
  location
    ? {
        id: location._id.toString(),
        name: location.name,
        level: location.level,
      }
    : null;

const resolveLocationCatalogMatches = async (place) => {
  const names = toLocationNames(place);
  const province = await findLocationByCandidates({
    level: LOCATION_LEVELS.PROVINCE,
    parent: null,
    candidates: names.province,
  });

  const district = province
    ? await findLocationByCandidates({
        level: LOCATION_LEVELS.DISTRICT,
        parent: province._id,
        candidates: names.district,
      })
    : null;

  const city = district
    ? await findLocationByCandidates({
        level: LOCATION_LEVELS.CITY,
        parent: district._id,
        candidates: names.city,
      })
    : null;

  const area = city
    ? await findLocationByCandidates({
        level: LOCATION_LEVELS.AREA,
        parent: city._id,
        candidates: names.area,
      })
    : null;

  return {
    suggestedNames: names,
    detectedLocation: detectLocationLevel(place, names),
    matches: {
      province: serializeMatchedLocation(province),
      district: serializeMatchedLocation(district),
      city: serializeMatchedLocation(city),
      area: serializeMatchedLocation(area),
    },
  };
};

const requestNominatim = async (path, params) => {
  const url = new URL(path, NOMINATIM_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "LANDZO/1.0 Admin Geocoding",
      },
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error("Geocoding provider rejected the request");
    }

    return response.json();
  } catch {
    throw new AppError(502, "Geocoding service is unavailable", "GEOCODING_UNAVAILABLE");
  }
};

const toSuggestion = async (place) => {
  const lat = Number(place.lat);
  const lng = Number(place.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const catalog = await resolveLocationCatalogMatches(place);

  return {
    id: String(place.place_id ?? `${lat},${lng}`),
    name: place.name || place.display_name,
    displayName: place.display_name,
    map: { lat, lng },
    address: place.address ?? {},
    suggestedNames: catalog.suggestedNames,
    detectedLocation: catalog.detectedLocation,
    matches: catalog.matches,
  };
};

export const searchPlaces = async ({ q }) => {
  const results = await requestNominatim("/search", {
    q,
    format: "jsonv2",
    addressdetails: 1,
    countrycodes: "lk",
    limit: SEARCH_LIMIT,
  });

  const suggestions = await Promise.all((Array.isArray(results) ? results : []).map(toSuggestion));
  return suggestions.filter(Boolean);
};

export const reverseGeocode = async ({ lat, lng }) => {
  const result = await requestNominatim("/reverse", {
    lat,
    lon: lng,
    format: "jsonv2",
    addressdetails: 1,
  });

  return toSuggestion(result);
};




