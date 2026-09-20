import { z } from "zod";

import {
  HOMEPAGE_COLLECTION_LIMITS,
  HOMEPAGE_LIMITS,
} from "./homepage.constants.js";

const trimmedString = (max) => z.string().trim().max(max);

const optionalText = (max) => trimmedString(max).optional();

const linkSchema = trimmedString(HOMEPAGE_LIMITS.ctaLink)
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      if (value.startsWith("/")) {
        return true;
      }

      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    },
    {
      message: "Link must be an internal path or a valid HTTP/HTTPS URL",
    },
  )
  .optional();

const ctaSchema = z
  .object({
    label: optionalText(HOMEPAGE_LIMITS.ctaLabel),
    link: linkSchema,
  })
  .strict();

const heroSchema = z
  .object({
    eyebrow: optionalText(HOMEPAGE_LIMITS.heroEyebrow),
    heading: optionalText(HOMEPAGE_LIMITS.heroHeading),
    highlight: optionalText(HOMEPAGE_LIMITS.heroHighlight),
    description: optionalText(HOMEPAGE_LIMITS.heroDescription),

    primaryCta: ctaSchema.optional(),
    secondaryCta: ctaSchema.optional(),
  })
  .strict();

const sectionIntroSchema = z
  .object({
    heading: optionalText(HOMEPAGE_LIMITS.sectionHeading),
    description: optionalText(HOMEPAGE_LIMITS.sectionDescription),
  })
  .strict();

const benefitSchema = z
  .object({
    title: trimmedString(HOMEPAGE_LIMITS.benefitTitle).min(
      1,
      "Benefit title is required",
    ),

    description: trimmedString(
      HOMEPAGE_LIMITS.benefitDescription,
    ).min(1, "Benefit description is required"),

    iconKey: optionalText(HOMEPAGE_LIMITS.benefitIconKey),
  })
  .strict();

const whyLandzoSchema = z
  .object({
    heading: optionalText(HOMEPAGE_LIMITS.sectionHeading),

    description: optionalText(
      HOMEPAGE_LIMITS.sectionDescription,
    ),

    benefits: z
      .array(benefitSchema)
      .min(HOMEPAGE_COLLECTION_LIMITS.benefitsMin)
      .max(HOMEPAGE_COLLECTION_LIMITS.benefitsMax)
      .optional(),
  })
  .strict();

const statSchema = z
  .object({
    value: trimmedString(HOMEPAGE_LIMITS.statValue).min(
      1,
      "Stat value is required",
    ),

    label: trimmedString(HOMEPAGE_LIMITS.statLabel).min(
      1,
      "Stat label is required",
    ),
  })
  .strict();

const statsSchema = z
  .object({
    heading: optionalText(HOMEPAGE_LIMITS.sectionHeading),

    items: z
      .array(statSchema)
      .min(HOMEPAGE_COLLECTION_LIMITS.statsMin)
      .max(HOMEPAGE_COLLECTION_LIMITS.statsMax)
      .optional(),
  })
  .strict();

const homepageCtaSchema = z
  .object({
    heading: optionalText(HOMEPAGE_LIMITS.sectionHeading),

    description: optionalText(
      HOMEPAGE_LIMITS.sectionDescription,
    ),

    button: ctaSchema.optional(),
  })
  .strict();

const seoSchema = z
  .object({
    metaTitle: optionalText(HOMEPAGE_LIMITS.metaTitle),

    metaDescription: optionalText(
      HOMEPAGE_LIMITS.metaDescription,
    ),
  })
  .strict();

const homepageEditableFieldsSchema = z
  .object({
    hero: heroSchema.optional(),

    featuredProperties: sectionIntroSchema.optional(),

    exploreMap: sectionIntroSchema.optional(),

    whyLandzo: whyLandzoSchema.optional(),

    stats: statsSchema.optional(),

    cta: homepageCtaSchema.optional(),

    seo: seoSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one homepage field is required",
  });

export const updateHomepageSchema = z.object({
  body: homepageEditableFieldsSchema,
});