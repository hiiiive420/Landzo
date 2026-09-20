import { z } from "zod";

import {
  HOMEPAGE_LIMITS,
} from "./homepage.constants.js";

const HOMEPAGE_IMAGE_TARGETS = Object.freeze([
  "hero",
  "cta",
]);

const homepageImageTargetSchema = z.enum(
  HOMEPAGE_IMAGE_TARGETS,
);

const optionalAltSchema = z.preprocess(
  (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return value;
  },
  z
    .string()
    .trim()
    .max(
      HOMEPAGE_LIMITS.imageAlt,
      `Image alt text must not exceed ${HOMEPAGE_LIMITS.imageAlt} characters`,
    ),
);

export const homepageImageTargetParamSchema =
  z.object({
    params: z
      .object({
        target:
          homepageImageTargetSchema,
      })
      .strict(),
  });

export const uploadHomepageImageSchema =
  z.object({
    params: z
      .object({
        target:
          homepageImageTargetSchema,
      })
      .strict(),

    body: z
      .object({
        alt:
          optionalAltSchema.optional(),
      })
      .strict(),
  });