const serializePropertyImage = (image) => ({
  id: image._id.toString(),
  url: image.secureUrl,
  width: image.width,
  height: image.height,
  format: image.format,
  bytes: image.bytes,
  order: image.order,
  isCover: image.isCover,
  uploadedAt: image.uploadedAt?.toISOString?.() ?? null,
  originalFilename: image.originalFilename ?? null,
});

const serializePublicPropertyImage = (image) => ({
  id: image._id.toString(),
  url: image.secureUrl,
  width: image.width,
  height: image.height,
  format: image.format,
  order: image.order,
  isCover: image.isCover,
});
const sortImages = (images = []) => [...images].sort((left, right) => left.order - right.order);

export const serializePropertyMedia = (media = {}) => {
  const images = sortImages(media.images ?? []).map(serializePropertyImage);
  const coverImage = images.find((image) => image.isCover) ?? null;

  return { images, coverImage };
};
const serializePublicPropertyMedia = (media = {}) => {
  const images = sortImages(media.images ?? []).map(
    serializePublicPropertyImage,
  );

  const coverImage = images.find((image) => image.isCover) ?? null;

  return {
    images,
    coverImage,
  };
};

const serializePropertyCoverImage = (media = {}) => {
  const coverImage = sortImages(media.images ?? []).find((image) => image.isCover);

  if (!coverImage) {
    return null;
  }

  return {
    id: coverImage._id.toString(),
    url: coverImage.secureUrl,
  };
};
const serializeLocationReference = (location) => {
  if (!location) {
    return null;
  }

  if (location.name) {
    return {
      id: location._id.toString(),
      name: location.name,
      level: location.level,
      slug: location.slug,
    };
  }

  return location.toString();
};

const serializeDetails = (details = {}) => ({
  ...(details.land ? { land: details.land.toObject?.() ?? details.land } : {}),
  ...(details.house ? { house: details.house.toObject?.() ?? details.house } : {}),
  ...(details.apartment ? { apartment: details.apartment.toObject?.() ?? details.apartment } : {}),
  ...(details.commercial
    ? { commercial: details.commercial.toObject?.() ?? details.commercial }
    : {}),
});

const serializePricingSection = (section) => {
  if (!section) {
    return undefined;
  }

  const plainSection = section.toObject?.() ?? section;

  return {
    mode: plainSection.mode,
    ...(plainSection.period ? { period: plainSection.period } : {}),
    ...(plainSection.amount !== undefined ? { amount: plainSection.amount } : {}),
  };
};

const serializePricing = (pricing) => {
  if (!pricing) {
    return null;
  }

  const plainPricing = pricing.toObject?.() ?? pricing;

  return {
    currency: plainPricing.currency,
    priceVisible: plainPricing.priceVisible ?? false,
    ...(plainPricing.sale ? { sale: serializePricingSection(plainPricing.sale) } : {}),
    ...(plainPricing.rent ? { rent: serializePricingSection(plainPricing.rent) } : {}),
    ...(plainPricing.lease ? { lease: serializePricingSection(plainPricing.lease) } : {}),
  };
};

const serializePublicPricing = (pricing) => {
  if (!pricing) {
    return null;
  }

  const plainPricing = pricing.toObject?.() ?? pricing;
  const priceVisible = plainPricing.priceVisible ?? false;

  if (!priceVisible) {
    return {
      currency: plainPricing.currency,
      priceVisible: false,
    };
  }

  return {
    currency: plainPricing.currency,
    priceVisible: true,
    ...(plainPricing.sale
      ? { sale: serializePricingSection(plainPricing.sale) }
      : {}),
    ...(plainPricing.rent
      ? { rent: serializePricingSection(plainPricing.rent) }
      : {}),
    ...(plainPricing.lease
      ? { lease: serializePricingSection(plainPricing.lease) }
      : {}),
  };
};

const serializeMap = (mapLocation) => {
  if (!mapLocation?.coordinates || mapLocation.coordinates.length !== 2) {
    return null;
  }

  const [lng, lat] = mapLocation.coordinates;

  return { lat, lng };
};

const serializePropertyLocation = (property) => ({
  province: serializeLocationReference(property.province),
  district: serializeLocationReference(property.district),
  city: serializeLocationReference(property.city),
  area: serializeLocationReference(property.area),
  displayAddress: property.displayAddress ?? null,
});

const serializeTrashFields = (property) => ({
  deletedAt: property.deletedAt?.toISOString?.() ?? null,
  purgeAt: property.purgeAt?.toISOString?.() ?? null,
});

export const serializeProperty = (property) => ({
  id: property._id.toString(),
  code: property.code,
  type: property.type,
  transactionTypes: property.transactionTypes,
  status: property.status,
  title: property.title,
  slug: property.slug,
  description: property.description ?? null,
  location: serializePropertyLocation(property),
  details: serializeDetails(property.details),
  pricing: serializePricing(property.pricing),
  map: serializeMap(property.mapLocation),
  media: serializePropertyMedia(property.media),
  isPublic: property.isPublic,
  exploreMapEnabled: property.exploreMapEnabled,
  featured: property.featured,
  ...serializeTrashFields(property),
  createdAt: property.createdAt?.toISOString?.() ?? null,
  updatedAt: property.updatedAt?.toISOString?.() ?? null,
});

export const serializePropertyListItem = (property) => ({
  id: property._id.toString(),
  code: property.code,
  title: property.title,
  type: property.type,
  transactionTypes: property.transactionTypes,
  status: property.status,
  location: serializePropertyLocation(property),
  pricing: serializePricing(property.pricing),
  isPublic: property.isPublic,
  featured: property.featured,
  exploreMapEnabled: property.exploreMapEnabled,
  hasMap: Boolean(property.mapLocation?.coordinates?.length === 2),
  coverImage: serializePropertyCoverImage(property.media),
  ...serializeTrashFields(property),
  createdAt: property.createdAt?.toISOString?.() ?? null,
  updatedAt: property.updatedAt?.toISOString?.() ?? null,
});

export const serializePublicPropertyListItem = (property) => ({
  id: property._id.toString(),

  code: property.code,

  slug: property.slug,

  title: property.title,

  type: property.type,

  transactionTypes: property.transactionTypes,

  status: property.status,

  location: serializePropertyLocation(property),

  /* =====================================================
     ADD PUBLIC PROPERTY DETAILS TO LIST RESPONSE

     This allows:
     - Properties page cards
     - Home Featured cards

     to display type-specific Admin details without
     additional individual property API requests.
     ===================================================== */

  details: serializeDetails(
    property.details,
  ),

  pricing: serializePublicPricing(
    property.pricing,
  ),

  featured: property.featured,

  exploreMapEnabled:
    property.exploreMapEnabled,

  coverImage:
    serializePropertyCoverImage(
      property.media,
    ),

  createdAt:
    property.createdAt
      ?.toISOString?.() ??
    null,

  updatedAt:
    property.updatedAt
      ?.toISOString?.() ??
    null,
});

export const serializePublicExploreMapProperty = (property) => ({
  id: property._id.toString(),
  code: property.code,
  title: property.title,
  type: property.type,
  transactionTypes: property.transactionTypes,
  status: property.status,
  location: serializePropertyLocation(property),
  pricing: serializePublicPricing(property.pricing),
  map: serializeMap(property.mapLocation),
  coverImage: serializePropertyCoverImage(property.media),
});

export const serializePublicProperty = (property) => ({
  id: property._id.toString(),
  code: property.code,
  slug: property.slug,
  title: property.title,
  type: property.type,
  transactionTypes: property.transactionTypes,
  status: property.status,

  description: property.description ?? null,

  location: serializePropertyLocation(property),

  details: serializeDetails(property.details),

  pricing: serializePublicPricing(property.pricing),

  map: serializeMap(property.mapLocation),

  media: serializePublicPropertyMedia(property.media),

  featured: property.featured,
  exploreMapEnabled: property.exploreMapEnabled,

  createdAt: property.createdAt?.toISOString?.() ?? null,
  updatedAt: property.updatedAt?.toISOString?.() ?? null,
});