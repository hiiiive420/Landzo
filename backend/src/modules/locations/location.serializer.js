const serializeParent = (parent) => {
  if (!parent) {
    return null;
  }

  if (!parent.name) {
    return {
      id: parent.toString(),
    };
  }

  return {
    id: parent._id.toString(),
    name: parent.name,
    level: parent.level,
    slug: parent.slug,
    map: serializeMap(parent.mapLocation),
  };
};

const serializeMap = (mapLocation) => {
  if (!mapLocation?.coordinates || mapLocation.coordinates.length !== 2) {
    return null;
  }

  const [lng, lat] = mapLocation.coordinates;
  return { lat, lng };
};

export const serializeLocation = (location) => ({
  id: location._id.toString(),
  name: location.name,
  level: location.level,
  slug: location.slug,
  status: location.status,
  sortOrder: location.sortOrder,
  parent: serializeParent(location.parent),
  map: serializeMap(location.mapLocation),
  createdAt: location.createdAt?.toISOString?.() ?? null,
  updatedAt: location.updatedAt?.toISOString?.() ?? null,
});
