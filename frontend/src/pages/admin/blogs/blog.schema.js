import { z } from "zod";

import {
  BLOG_ALLOWED_IMAGE_TYPES,
  BLOG_LIMITS,
  BLOG_MAX_CONTENT_IMAGES,
  BLOG_MAX_IMAGE_SIZE,
} from "./blog.constants.js";

import {
  getBlogContentImageCount,
  getBlogPlainText,
  prepareBlogHtmlForSave,
} from "./blog.helpers.js";

const requiredText = (
  label,
  maxLength,
) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(
      maxLength,
      `${label} must be ${maxLength} characters or less.`,
    );

const optionalText = (
  label,
  maxLength,
) =>
  z
    .string()
    .trim()
    .max(
      maxLength,
      `${label} must be ${maxLength} characters or less.`,
    );

const tagSchema = z
  .string()
  .trim()
  .min(1, "Tag cannot be empty.")
  .max(
    BLOG_LIMITS.TAG,
    `Each tag must be ${BLOG_LIMITS.TAG} characters or less.`,
  );

const tagsSchema = z
  .array(tagSchema)
  .max(
    BLOG_LIMITS.MAX_TAGS,
    `You can add a maximum of ${BLOG_LIMITS.MAX_TAGS} tags.`,
  )
  .transform((tags) => {
    const seen = new Set();

    return tags.filter((tag) => {
      const normalized = tag
        .trim()
        .toLowerCase();

      if (
        !normalized ||
        seen.has(normalized)
      ) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
  });

const featuredImageFileSchema = z
  .any()
  .nullable()
  .superRefine((file, context) => {
    if (!file) {
      return;
    }

    if (
      typeof File !== "undefined" &&
      !(file instanceof File)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Featured image must be a valid image file.",
      });

      return;
    }

    if (
      !BLOG_ALLOWED_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Only JPG, PNG, or WEBP images are allowed.",
      });
    }

    if (
      file.size > BLOG_MAX_IMAGE_SIZE
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Featured image must be 20 MB or less.",
      });
    }
  });

const contentSchema = z
  .string()
  .max(
    BLOG_LIMITS.CONTENT,
    `Content must be ${BLOG_LIMITS.CONTENT} characters or less.`,
  )
  .superRefine((value, context) => {
    const preparedHtml =
      prepareBlogHtmlForSave(value);

    const plainText =
      getBlogPlainText(preparedHtml);

    const imageCount =
      getBlogContentImageCount(
        preparedHtml,
      );

    if (!plainText && imageCount === 0) {
      context.addIssue({
        code: "custom",
        message:
          "Article content is required.",
      });
    }

    if (
      imageCount >
      BLOG_MAX_CONTENT_IMAGES
    ) {
      context.addIssue({
        code: "custom",
        message: `You can add a maximum of ${BLOG_MAX_CONTENT_IMAGES} content images.`,
      });
    }
  });

export const blogFormSchema = z.object({
  title: requiredText(
    "Title",
    BLOG_LIMITS.TITLE,
  ),

  excerpt: requiredText(
    "Excerpt",
    BLOG_LIMITS.EXCERPT,
  ),

  content: contentSchema,

  category: requiredText(
    "Category",
    BLOG_LIMITS.CATEGORY,
  ),

  tags: tagsSchema,

  featuredImageFile:
    featuredImageFileSchema,

  featuredImageAlt: optionalText(
    "Featured image alt text",
    BLOG_LIMITS.FEATURED_IMAGE_ALT,
  ),

  removeFeaturedImage:
    z.boolean(),

  metaTitle: optionalText(
    "Meta title",
    BLOG_LIMITS.META_TITLE,
  ),

  metaDescription: optionalText(
    "Meta description",
    BLOG_LIMITS.META_DESCRIPTION,
  ),
});

export const blogStepFields =
  Object.freeze([
    [
      "title",
      "category",
      "tags",
      "excerpt",
    ],

    ["content"],

    [
      "featuredImageFile",
      "featuredImageAlt",
    ],

    [
      "metaTitle",
      "metaDescription",
    ],

    [],
  ]);

export const isBlogImageFile = (
  file,
) => {
  if (!file) {
    return "";
  }

  if (
    !BLOG_ALLOWED_IMAGE_TYPES.includes(
      file.type,
    )
  ) {
    return "Only JPG, PNG, or WEBP images are allowed.";
  }

  if (
    file.size > BLOG_MAX_IMAGE_SIZE
  ) {
    return "Image must be 10 MB or less.";
  }

  return "";
};