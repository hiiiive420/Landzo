import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid property id");
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid date");
const requiredText = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).default("");

const sellerSchema = z
  .object({
    fullName: requiredText(160),
    identificationNumber: requiredText(40),
    address: optionalText(500),
    phone: optionalText(40),
    mobilePhone: optionalText(40),
  })
  .strict();

const optionalSellerSchema = z
  .object({
    fullName: optionalText(160),
    identificationNumber: optionalText(40),
    address: optionalText(500),
    phone: optionalText(40),
    mobilePhone: optionalText(40),
  })
  .strict();

export const listingAgreementPropertyParamsSchema = z.object({
  params: z.object({ propertyId: objectIdSchema }).strict(),
});

export const listingAgreementIdParamsSchema = z.object({
  params: z
    .object({
      propertyId: objectIdSchema,
      agreementId: objectIdSchema,
    })
    .strict(),
});

export const listListingAgreementsSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(120).optional(),
      status: z
        .enum(["generated", "printed", "signed", "cancelled", "expired"])
        .optional(),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict(),
});

export const generateListingAgreementSchema = z.object({
  params: z.object({ propertyId: objectIdSchema }).strict(),
  body: z
    .object({
      judicialZone: optionalText(160),
      deedNumber: optionalText(120),
      propertyInformation: requiredText(1200),
      propertyAddress: requiredText(500),
      seller1: sellerSchema,
      seller2: optionalSellerSchema.default({}),
      agreementDate: dateSchema,
      commencementDate: dateSchema,
      exclusivePeriodDays: z.number().int().min(1).max(3650),
      protectionPeriodDays: z.number().int().min(0).max(3650),
      minimumSellingPrice: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
      currency: z.enum(["LKR", "USD"]),
      totalValuation: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).nullable().default(null),
      commissionPercentage: z.number().min(0).max(100),
    })
    .strict(),
});
