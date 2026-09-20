import { z } from "zod";

import {
  BLOG_LIMITS,
  BLOG_SORT_VALUES,
  BLOG_STATUS_VALUES,
} from "./blog.constants.js";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const emptyToUndefined = (value) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  if (
    typeof value === "string" &&
    value.trim().toLowerCase() === "all"
  ) {
    return undefined;
  }

  return value;
};

const parseBoolean = (value) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }

    if (normalized === "all") {
      return undefined;
    }
  }

  return value;
};

const parseStringArray = (value) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => parseStringArray(item))
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter(Boolean);
      }
    } catch {
      // Fall back to comma-separated tags.
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
};

const requiredText = (maxLength) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength);

const optionalText = (maxLength) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(maxLength)
      .optional(),
  );

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(BLOG_LIMITS.TAG);

const tagsSchema = z.preprocess(
  parseStringArray,
  z
    .array(tagSchema)
    .max(30)
    .transform((tags) => [...new Set(tags)]),
);

const optionalBooleanSchema = z.preprocess(
  parseBoolean,
  z.boolean().optional(),
);

const blogEditableFieldsSchema = z
  .object({
    title: requiredText(BLOG_LIMITS.TITLE),

    excerpt: requiredText(BLOG_LIMITS.EXCERPT),

    content: requiredText(BLOG_LIMITS.CONTENT),

    category: requiredText(BLOG_LIMITS.CATEGORY),

    tags: tagsSchema.default([]),

    featuredImageAlt: optionalText(
      BLOG_LIMITS.FEATURED_IMAGE_ALT,
    ),

    metaTitle: optionalText(
      BLOG_LIMITS.META_TITLE,
    ),

    metaDescription: optionalText(
      BLOG_LIMITS.META_DESCRIPTION,
    ),
  })
  .strict();

export const createBlogSchema = z.object({
  body: blogEditableFieldsSchema,
});

export const updateBlogSchema = z.object({
  params: z.object({
    blogId: objectIdSchema,
  }),

  body: blogEditableFieldsSchema
    .partial()
    .extend({
      removeFeaturedImage: optionalBooleanSchema,
    })
    .strict(),
});

export const blogIdParamSchema = z.object({
  params: z.object({
    blogId: objectIdSchema,
  }),
});

export const blogSlugParamSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(220)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Invalid blog slug",
      ),
  }),
});

export const updateBlogFeaturedSchema = z.object({
  params: z.object({
    blogId: objectIdSchema,
  }),

  body: z
    .object({
      featured: z.preprocess(
        parseBoolean,
        z.boolean(),
      ),
    })
    .strict(),
});

export const listAdminBlogsSchema = z.object({
  query: z
    .object({
      page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),

      search: optionalText(120),

      category: optionalText(
        BLOG_LIMITS.CATEGORY,
      ),

      tag: optionalText(BLOG_LIMITS.TAG),

      status: z.preprocess(
        emptyToUndefined,
        z.enum(BLOG_STATUS_VALUES).optional(),
      ),

      featured: optionalBooleanSchema,

      sort: z.preprocess(
        emptyToUndefined,
        z.enum(BLOG_SORT_VALUES).default("newest"),
      ),
    })
    .strict(),
});

export const listPublicBlogsSchema = z.object({
  query: z
    .object({
      page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(24)
        .default(6),

      search: optionalText(120),

      category: optionalText(
        BLOG_LIMITS.CATEGORY,
      ),

      tag: optionalText(BLOG_LIMITS.TAG),

      featured: optionalBooleanSchema,

      exclude: optionalText(220),

      sort: z.preprocess(
        emptyToUndefined,
        z.enum(BLOG_SORT_VALUES).default("publishDate"),
      ),
    })
    .strict(),
});