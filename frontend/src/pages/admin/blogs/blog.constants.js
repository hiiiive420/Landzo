export const BLOG_STATUSES = Object.freeze([
  {
    value: "draft",
    label: "Draft",
  },
  {
    value: "published",
    label: "Published",
  },
]);

export const BLOG_STATUS = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
});

export const BLOG_SORT_OPTIONS = Object.freeze([
  {
    value: "newest",
    label: "Newest",
  },
  {
    value: "oldest",
    label: "Oldest",
  },
  {
    value: "title",
    label: "Title A-Z",
  },
  {
    value: "views",
    label: "Most Viewed",
  },
  {
    value: "publishDate",
    label: "Publish Date",
  },
]);

export const BLOG_FILTER_DEFAULTS = Object.freeze({
  search: "",
  category: "",
  status: "",
  featured: "",
  sort: "newest",
  page: 1,
  limit: 20,
});

export const BLOG_FORM_DEFAULTS = Object.freeze({
  title: "",
  excerpt: "",
  content: "",
  category: "",
  tags: [],
  featuredImageFile: null,
  featuredImageAlt: "",
  removeFeaturedImage: false,
  metaTitle: "",
  metaDescription: "",
});

export const BLOG_ALLOWED_IMAGE_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const BLOG_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp";

export const BLOG_MAX_IMAGE_SIZE =
  20 * 1024 * 1024;

export const BLOG_MAX_CONTENT_IMAGES = 2;

export const BLOG_LIMITS = Object.freeze({
  TITLE: 180,
  EXCERPT: 300,
  CONTENT: 50000,
  CATEGORY: 80,
  TAG: 60,
  MAX_TAGS: 30,
  META_TITLE: 60,
  META_DESCRIPTION: 160,
  FEATURED_IMAGE_ALT: 160,
});

export const BLOG_EDITOR_IMAGE_WIDTHS =
  Object.freeze([
    "50%",
    "75%",
    "100%",
  ]);

export const BLOG_EDITOR_IMAGE_ALIGNMENTS =
  Object.freeze([
    "left",
    "center",
    "right",
  ]);