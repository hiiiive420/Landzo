export const BLOG_STATUSES = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
});

export const BLOG_STATUS_VALUES = Object.freeze(
  Object.values(BLOG_STATUSES),
);

export const BLOG_SORTS = Object.freeze({
  NEWEST: "newest",
  OLDEST: "oldest",
  TITLE: "title",
  VIEWS: "views",
  PUBLISH_DATE: "publishDate",
});

export const BLOG_SORT_VALUES = Object.freeze(
  Object.values(BLOG_SORTS),
);

export const BLOG_SORT_OPTIONS = Object.freeze({
  [BLOG_SORTS.NEWEST]: Object.freeze({
    createdAt: -1,
  }),

  [BLOG_SORTS.OLDEST]: Object.freeze({
    createdAt: 1,
  }),

  [BLOG_SORTS.TITLE]: Object.freeze({
    title: 1,
  }),

  [BLOG_SORTS.VIEWS]: Object.freeze({
    views: -1,
    createdAt: -1,
  }),

  [BLOG_SORTS.PUBLISH_DATE]: Object.freeze({
    publishDate: -1,
    createdAt: -1,
  }),
});

export const MAX_BLOG_CONTENT_IMAGES = 2;

export const BLOG_LIMITS = Object.freeze({
  TITLE: 180,
  EXCERPT: 300,
  CONTENT: 50000,
  CATEGORY: 80,
  TAG: 60,
  META_TITLE: 60,
  META_DESCRIPTION: 160,
  FEATURED_IMAGE_ALT: 160,
});

export const BLOG_IMAGE_LIMITS = Object.freeze({
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
});

export const BLOG_IMAGE_MAX_FILE_SIZE_BYTES =
  BLOG_IMAGE_LIMITS.MAX_FILE_SIZE_BYTES;

export const BLOG_IMAGE_ALLOWED_MIME_TYPES =
  Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

export const BLOG_IMAGE_ERROR_CODES =
  Object.freeze({
    TOO_LARGE: "BLOG_IMAGE_TOO_LARGE",
    UNSUPPORTED_TYPE:
      "BLOG_IMAGE_UNSUPPORTED_TYPE",
    REQUIRED: "BLOG_IMAGE_REQUIRED",
  });