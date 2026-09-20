import { z } from "zod";

import { SETTINGS_LIMITS } from "./settings.constants.js";

const optionalText = (maxLength) => z.string().trim().max(maxLength).optional();

const optionalEmail = z
  .string()
  .trim()
  .max(SETTINGS_LIMITS.businessEmailMaxLength)
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Invalid email",
  })
  .optional();

const optionalUrl = z
  .string()
  .trim()
  .max(SETTINGS_LIMITS.socialUrlMaxLength)
  .refine((value) => value === "" || z.url().safeParse(value).success, {
    message: "Invalid URL",
  })
  .optional();

const businessSchema = z
  .object({
    name: optionalText(SETTINGS_LIMITS.businessNameMaxLength),
    email: optionalEmail,
    phone: optionalText(SETTINGS_LIMITS.businessPhoneMaxLength),
    whatsapp: optionalText(SETTINGS_LIMITS.businessWhatsappMaxLength),
    address: optionalText(SETTINGS_LIMITS.businessAddressMaxLength),
  })
  .strict();

const socialSchema = z
  .object({
    facebook: optionalUrl,
    instagram: optionalUrl,
    linkedin: optionalUrl,
    youtube: optionalUrl,
  })
  .strict();

const websiteSchema = z
  .object({
    defaultMetaTitle: optionalText(SETTINGS_LIMITS.defaultMetaTitleMaxLength),
    defaultMetaDescription: optionalText(SETTINGS_LIMITS.defaultMetaDescriptionMaxLength),
  })
  .strict();

const updateSettingsBodySchema = z
  .object({
    business: businessSchema.optional(),
    social: socialSchema.optional(),
    website: websiteSchema.optional(),
  })
  .strict();

export const getSettingsSchema = z.object({});

export const updateSettingsSchema = z.object({
  body: updateSettingsBodySchema,
});