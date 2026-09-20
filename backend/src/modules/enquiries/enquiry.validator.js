import { z } from "zod";

import { publicPropertyCodeSchema } from "../properties/property.validator.js";

import {
  ENQUIRY_STATUSES,
} from "./enquiry.constants.js";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const fullNameSchema = z
  .string({ required_error: "Full name is required" })
  .trim()
  .min(2)
  .max(120);

const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .max(254)
  .nullable()
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .min(5)
  .max(40)
  .nullable()
  .optional();

const messageSchema = z
  .string()
  .trim()
  .max(5000)
  .nullable()
  .optional();

const internalNoteSchema = z
  .string()
  .trim()
  .max(5000)
  .nullable()
  .optional();

const propertyIdSchema = objectIdSchema
  .nullable()
  .optional();

const contactDetailsRefinement = (value) => {
  const email = value.email?.trim();
  const phone = value.phone?.trim();

  return Boolean(email || phone);
};

export const enquiryIdParamSchema = z.object({
  params: z.object({
    enquiryId: objectIdSchema,
  }),
});

export const listEnquiriesSchema = z.object({
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

      status: z
        .enum([
          ENQUIRY_STATUSES.NEW,
          ENQUIRY_STATUSES.IN_PROGRESS,
          ENQUIRY_STATUSES.CLOSED,
        ])
        .optional(),

      assignedTo: objectIdSchema.optional(),

      propertyId: objectIdSchema.optional(),

      search: z
        .string()
        .trim()
        .max(80)
        .optional(),
    })
    .strict(),
});

export const createPublicEnquirySchema = z.object({
  body: z
    .object({
      fullName: fullNameSchema,
      email: emailSchema,
      phone: phoneSchema,
      message: messageSchema,
      propertyCode: publicPropertyCodeSchema.optional(),
    })
    .strict()
    .refine(contactDetailsRefinement, {
      message: "At least one contact method is required",
      path: ["email"],
    }),
});
export const createAdminEnquirySchema = z.object({
  body: z
    .object({
      fullName: fullNameSchema,

      email: emailSchema,

      phone: phoneSchema,

      message: messageSchema,

      propertyId: propertyIdSchema,

      internalNote: internalNoteSchema,
    })
    .strict()
    .refine(contactDetailsRefinement, {
      message:
        "At least one contact method is required",
      path: ["email"],
    }),
});

export const updateEnquirySchema = z.object({
  params: z.object({
    enquiryId: objectIdSchema,
  }),

  body: z
    .object({
      fullName: fullNameSchema.optional(),

      email: emailSchema,

      phone: phoneSchema,

      message: messageSchema,

      propertyId: propertyIdSchema,

      internalNote: internalNoteSchema,

      status: z
        .enum([
          ENQUIRY_STATUSES.NEW,
          ENQUIRY_STATUSES.IN_PROGRESS,
        ])
        .optional(),
    })
    .strict()
    .refine(
      (value) => Object.keys(value).length > 0,
      {
        message:
          "At least one enquiry field is required",
      },
    ),
});

export const assignEnquirySchema = z.object({
  params: z.object({
    enquiryId: objectIdSchema,
  }),

  body: z
    .object({
      assignedTo: objectIdSchema.nullable(),
    })
    .strict(),
});

export const closeEnquirySchema = z.object({
  params: z.object({
    enquiryId: objectIdSchema,
  }),

  body: z
    .object({
      internalNote: internalNoteSchema,
    })
    .strict(),
});
export const listEnquiryPropertyOptionsSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(80).optional(),

      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20),
    })
    .strict(),
});