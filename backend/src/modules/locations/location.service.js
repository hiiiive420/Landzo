import { AppError } from "../../common/errors/AppError.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit/audit.constants.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { EXPECTED_PARENT_LEVEL, LOCATION_LEVELS, LOCATION_STATUSES } from "./location.constants.js";
import { Location } from "./location.model.js";
import { serializeLocation } from "./location.serializer.js";
import { escapeRegex, normalizeLocationName } from "./location.utils.js";

const duplicateLocationCode = 11000;

const normalizeParentId = (parentId) => parentId ?? null;

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export const createMapLocation = (map) => {
  if (map === undefined) {
    return undefined;
  }

  if (map === null) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [map.lng, map.lat],
  };
};

const toDuplicateLocationError = () =>
  new AppError(409, "A location already exists in this hierarchy", "LOCATION_ALREADY_EXISTS");

const toLocationNotFoundError = () => new AppError(404, "Location not found", "LOCATION_NOT_FOUND");

const isSameObjectId = (left, right) => left?.toString() === right?.toString();

const populateParent = (query) => query.populate({ path: "parent", select: "name level slug mapLocation" });

const assertNoDuplicate = async ({ level, parent, canonicalKey, excludeId = null }) => {
  const duplicate = await Location.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    level,
    parent,
    canonicalKey,
  }).select("_id");

  if (duplicate) {
    throw toDuplicateLocationError();
  }
};

const saveWithDuplicateHandling = async (location) => {
  try {
    await location.save();
    return location;
  } catch (error) {
    if (error?.code === duplicateLocationCode) {
      throw toDuplicateLocationError();
    }

    throw error;
  }
};

const recordLocationAuditLog = async ({ actorUserId, action, location }) => {
  try {
    await recordAuditLog({
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.LOCATION,
      entityId: location._id,
      entityLabel: "Location",
    });
  } catch (error) {
    console.error("Location audit write failed", {
      action,
      entityType: AUDIT_ENTITY_TYPES.LOCATION,
      errorCode: error?.code || "AUDIT_WRITE_FAILED",
    });
  }
};

const serializeMapLocationForComparison = (mapLocation) =>
  mapLocation?.coordinates ? mapLocation.coordinates.join(",") : "";

const loadParentForHierarchy = async ({ level, parentId, requireActiveParent }) => {
  const expectedParentLevel = EXPECTED_PARENT_LEVEL[level];

  if (expectedParentLevel === null) {
    if (parentId) {
      throw new AppError(
        400,
        "Province locations cannot have a parent",
        "INVALID_LOCATION_HIERARCHY",
      );
    }

    return null;
  }

  if (!parentId) {
    throw new AppError(400, "Location parent is required", "INVALID_LOCATION_HIERARCHY");
  }

  const parent = await Location.findById(parentId);

  if (!parent) {
    throw new AppError(404, "Location parent not found", "LOCATION_PARENT_NOT_FOUND");
  }

  if (parent.level !== expectedParentLevel) {
    throw new AppError(400, "Invalid location hierarchy", "INVALID_LOCATION_HIERARCHY");
  }

  if (requireActiveParent && parent.status !== LOCATION_STATUSES.ACTIVE) {
    throw new AppError(409, "Location parent is inactive", "LOCATION_PARENT_INACTIVE");
  }

  return parent;
};

const getLocationOrFail = async (locationId) => {
  const location = await Location.findById(locationId).select(
    "+canonicalKey +createdBy +updatedBy",
  );

  if (!location) {
    throw toLocationNotFoundError();
  }

  return location;
};

const getLocationForResponse = async (locationId) =>
  populateParent(Location.findById(locationId)).then((location) => {
    if (!location) {
      throw toLocationNotFoundError();
    }

    return serializeLocation(location);
  });

const buildSearchFilter = (search) => {
  if (!search) {
    return {};
  }

  const trimmedSearch = search.trim();

  if (!trimmedSearch) {
    return {};
  }

  const displayPattern = new RegExp(escapeRegex(trimmedSearch), "i");
  const canonicalPattern = new RegExp(escapeRegex(normalizeLocationName(trimmedSearch)), "i");

  return {
    $or: [{ name: displayPattern }, { canonicalKey: canonicalPattern }, { slug: canonicalPattern }],
  };
};

export const createLocation = async ({ actorUserId, input }) => {
  const parentId = normalizeParentId(input.parentId);
  await loadParentForHierarchy({ level: input.level, parentId, requireActiveParent: true });

  const mapLocation = createMapLocation(input.map);

  const location = new Location({
    name: input.name,
    level: input.level,
    parent: parentId,
    status: LOCATION_STATUSES.ACTIVE,
    sortOrder: input.sortOrder ?? 0,
    ...(mapLocation !== undefined ? { mapLocation } : {}),
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  location.canonicalKey = normalizeLocationName(input.name);
  await assertNoDuplicate({
    level: input.level,
    parent: parentId,
    canonicalKey: location.canonicalKey,
  });

  await saveWithDuplicateHandling(location);
  await recordLocationAuditLog({
    actorUserId,
    action: AUDIT_ACTIONS.LOCATION_CREATED,
    location,
  });
  return getLocationForResponse(location._id);
};

export const listLocations = async ({ page, limit, level, parentId, status, search }) => {
  const filter = {
    ...buildSearchFilter(search),
  };

  if (level) {
    filter.level = level;
  }

  if (parentId) {
    filter.parent = parentId;
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const [locations, total] = await Promise.all([
    populateParent(Location.find(filter).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(limit)),
    Location.countDocuments(filter),
  ]);

  return {
    data: locations.map(serializeLocation),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const assertPublicLocationListHierarchy = async ({ level, parentId }) => {
  if (!level && parentId) {
    throw new AppError(400, "Location level is required when parentId is provided", "INVALID_LOCATION_HIERARCHY");
  }

  if (!level) {
    return;
  }

  if (level === LOCATION_LEVELS.PROVINCE && parentId) {
    throw new AppError(400, "Province locations cannot have a parent", "INVALID_LOCATION_HIERARCHY");
  }

  const expectedParentLevel = EXPECTED_PARENT_LEVEL[level];

  if (!expectedParentLevel) {
    return;
  }

  if (!parentId) {
    throw new AppError(400, "Location parent is required", "INVALID_LOCATION_HIERARCHY");
  }

  const parent = await Location.findById(parentId).select("_id level status");

  if (!parent) {
    throw new AppError(404, "Location parent not found", "LOCATION_PARENT_NOT_FOUND");
  }

  if (parent.level !== expectedParentLevel) {
    throw new AppError(400, "Invalid location hierarchy", "INVALID_LOCATION_HIERARCHY");
  }

  if (parent.status !== LOCATION_STATUSES.ACTIVE) {
    throw new AppError(409, "Location parent is inactive", "LOCATION_PARENT_INACTIVE");
  }
};

export const listPublicLocations = async ({ page = 1, limit = 20, level, parentId, search }) => {
  await assertPublicLocationListHierarchy({ level, parentId });

  const filter = {
    ...buildSearchFilter(search),
    status: LOCATION_STATUSES.ACTIVE,
  };

  if (level) {
    filter.level = level;
  }

  if (parentId) {
    filter.parent = parentId;
  }

  const skip = (page - 1) * limit;
  const [locations, total] = await Promise.all([
    populateParent(Location.find(filter).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(limit)),
    Location.countDocuments(filter),
  ]);

  return {
    data: locations.map(serializeLocation),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getLocation = async (locationId) => getLocationForResponse(locationId);

export const updateLocation = async ({ actorUserId, locationId, input }) => {
  const location = await getLocationOrFail(locationId);
  const previousSnapshot = {
    name: location.name,
    parent: location.parent?.toString?.() ?? null,
    sortOrder: location.sortOrder,
    mapLocation: serializeMapLocationForComparison(location.mapLocation),
  };
  const nextName = input.name ?? location.name;
  const nextParentId = Object.prototype.hasOwnProperty.call(input, "parentId")
    ? normalizeParentId(input.parentId)
    : location.parent;

  if (isSameObjectId(location._id, nextParentId)) {
    throw new AppError(400, "A location cannot be its own parent", "INVALID_LOCATION_HIERARCHY");
  }

  await loadParentForHierarchy({
    level: location.level,
    parentId: nextParentId,
    requireActiveParent: !isSameObjectId(location.parent, nextParentId),
  });

  const nextCanonicalKey = normalizeLocationName(nextName);

  if (
    !isSameObjectId(location.parent, nextParentId) ||
    nextCanonicalKey !== location.canonicalKey
  ) {
    await assertNoDuplicate({
      level: location.level,
      parent: nextParentId,
      canonicalKey: nextCanonicalKey,
      excludeId: location._id,
    });
  }

  location.name = nextName;
  location.parent = nextParentId;

  if (input.sortOrder !== undefined) {
    location.sortOrder = input.sortOrder;
  }

  if (hasOwn(input, "map")) {
    location.mapLocation = createMapLocation(input.map);
  }

  location.updatedBy = actorUserId;
  await saveWithDuplicateHandling(location);

  const hasMeaningfulChanges =
    previousSnapshot.name !== location.name ||
    previousSnapshot.parent !== (location.parent?.toString?.() ?? null) ||
    previousSnapshot.sortOrder !== location.sortOrder ||
    previousSnapshot.mapLocation !== serializeMapLocationForComparison(location.mapLocation);

  if (hasMeaningfulChanges) {
    await recordLocationAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.LOCATION_UPDATED,
      location,
    });
  }

  return getLocationForResponse(location._id);
};

export const updateLocationStatus = async ({ actorUserId, locationId, status }) => {
  const location = await getLocationOrFail(locationId);
  const previousStatus = location.status;

  if (status === LOCATION_STATUSES.INACTIVE) {
    const activeChildren = await Location.countDocuments({
      parent: location._id,
      status: LOCATION_STATUSES.ACTIVE,
    });

    if (activeChildren > 0) {
      throw new AppError(409, "Location has active child records", "LOCATION_HAS_ACTIVE_CHILDREN");
    }
  }

  if (status === LOCATION_STATUSES.ACTIVE && location.level !== LOCATION_LEVELS.PROVINCE) {
    await loadParentForHierarchy({
      level: location.level,
      parentId: location.parent,
      requireActiveParent: true,
    });
  }

  location.status = status;
  location.updatedBy = actorUserId;
  await saveWithDuplicateHandling(location);

  if (previousStatus !== location.status) {
    await recordLocationAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.LOCATION_STATUS_CHANGED,
      location,
    });
  }

  return getLocationForResponse(location._id);
};

