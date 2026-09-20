import { z } from "zod";

import { SITE_VISIT_STATUS_VALUES } from "./siteVisit.constants.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const nullableObjectIdSchema = objectIdSchema.nullable().optional();
const nameSchema = z.string().trim().min(2).max(120);
const emailSchema = z.string().trim().email("Invalid email address").max(254).nullable().optional();
const phoneSchema = z.string().trim().min(5).max(40).nullable().optional();
const notesSchema = z.string().trim().max(5000).nullable().optional();
const completionNoteSchema = z.string().trim().max(5000).nullable().optional();
const cancellationReasonSchema = z.string().trim().max(2000).nullable().optional();
const scheduledAtSchema = z.coerce.date();

const contactDetailsRefinement = (value) => {
  if (value.customerId || value.enquiryId) {
    return true;
  }

  return Boolean(value.visitorName?.trim() && (value.visitorEmail?.trim() || value.visitorPhone?.trim()));
};

export const siteVisitIdParamSchema = z.object({
  params: z.object({ siteVisitId: objectIdSchema }),
});

export const listSiteVisitsSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(SITE_VISIT_STATUS_VALUES).optional(),
      assignedTo: objectIdSchema.optional(),
      propertyId: objectIdSchema.optional(),
      customerId: objectIdSchema.optional(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
      search: z.string().trim().max(80).optional(),
    })
    .strict(),
});

export const listSiteVisitOptionsSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(80).optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .strict(),
});

export const createSiteVisitSchema = z.object({
  body: z
    .object({
      propertyId: objectIdSchema,

      customerId: nullableObjectIdSchema,

      enquiryId: nullableObjectIdSchema,

      visitorName: nameSchema.optional(),

      visitorEmail: emailSchema,

      visitorPhone: phoneSchema,

      scheduledAt: scheduledAtSchema,

      assignedTo: nullableObjectIdSchema,

      notes: notesSchema,
    })
    .strict()

    // Customer and Enquiry are alternative authoritative visitor sources.
    // A Site Visit must not reference both at the same time.
    .refine(
      (value) =>
        !(value.customerId && value.enquiryId),
      {
        message:
          "Choose either a customer or an enquiry, not both",
        path: ["customerId"],
      },
    )

    // Manual visits require their own visitor identity.
    // Customer/Enquiry visits are validated again server-side
    // using the authoritative linked record.
    .refine(contactDetailsRefinement, {
      message:
        "Visitor name and at least one contact method are required",
      path: ["visitorName"],
    }),
});

export const updateSiteVisitSchema = z.object({
  params: z.object({ siteVisitId: objectIdSchema }),
  body: z
    .object({
      propertyId: objectIdSchema.optional(),
      scheduledAt: scheduledAtSchema.optional(),
      assignedTo: nullableObjectIdSchema,
      notes: notesSchema,
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one site visit field is required",
    }),
});

export const completeSiteVisitSchema = z.object({
  params: z.object({ siteVisitId: objectIdSchema }),
  body: z.object({ completionNote: completionNoteSchema }).strict(),
});

export const cancelSiteVisitSchema = z.object({
  params: z.object({ siteVisitId: objectIdSchema }),
  body: z.object({ cancellationReason: cancellationReasonSchema }).strict(),
});