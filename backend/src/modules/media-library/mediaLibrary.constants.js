export const MEDIA_LIBRARY_SOURCES = Object.freeze({
  PROPERTY: "property",
  BLOG: "blog",
  HOMEPAGE: "homepage",
});

export const MEDIA_LIBRARY_SOURCE_VALUES = Object.freeze(
  Object.values(MEDIA_LIBRARY_SOURCES),
);

export const MEDIA_LIBRARY_SOURCE_FILTERS = Object.freeze([
  "all",
  ...MEDIA_LIBRARY_SOURCE_VALUES,
]);

export const MEDIA_LIBRARY_ITEM_ROLES = Object.freeze({
  PROPERTY_COVER: "cover",
  PROPERTY_GALLERY: "gallery",
  BLOG_FEATURED: "featured",
  BLOG_CONTENT: "content",
  HOMEPAGE_HERO: "hero",
  HOMEPAGE_CTA: "cta",
});

export const MEDIA_LIBRARY_FORMATS = Object.freeze([
  "webp",
  "jpg",
  "jpeg",
  "png",
]);

export const MEDIA_LIBRARY_PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 24,
  MAX_LIMIT: 100,
});

export const MEDIA_LIBRARY_SEARCH_MAX_LENGTH = 120;
