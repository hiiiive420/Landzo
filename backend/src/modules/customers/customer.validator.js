import { z } from "zod";

import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_VALUES,
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_VALUES,
} from "./customer.constants.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const nullableObjectIdSchema = objectIdSchema.nullable().optional();

const fullNameSchema = z.string({ required_error: "Full name is required" }).trim().min(2).max(120);
const emailSchema = z.string().trim().email("Invalid email address").max(254).nullable().optional();
const phoneSchema = z.string().trim().min(5).max(40).nullable().optional();
const notesSchema = z.string().trim().max(5000).nullable().optional();

const contactDetailsRefinement = (value) => Boolean(value.email?.trim() || value.phone?.trim());

export const customerIdParamSchema = z.object({
  params: z.object({ customerId: objectIdSchema }),
});

export const enquiryIdParamSchema = z.object({
  params: z.object({ enquiryId: objectIdSchema }),
});

export const listCustomersSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().trim().max(80).optional(),
      type: z.enum(CUSTOMER_TYPE_VALUES).optional(),
      status: z.enum(CUSTOMER_STATUS_VALUES).optional(),
      assignedTo: objectIdSchema.optional(),
    })
    .strict(),
});

export const listCustomerOptionsSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(80).optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .strict(),
});

export const createCustomerSchema = z.object({
  body: z
    .object({
      fullName: fullNameSchema,
      email: emailSchema,
      phone: phoneSchema,
      type: z.enum(CUSTOMER_TYPE_VALUES).default(CUSTOMER_TYPES.LEAD),
      status: z.enum(CUSTOMER_STATUS_VALUES).default(CUSTOMER_STATUSES.ACTIVE),
      assignedTo: nullableObjectIdSchema,
      notes: notesSchema,
    })
    .strict()
    .refine(contactDetailsRefinement, {
      message: "At least one contact method is required",
      path: ["email"],
    }),
});

export const updateCustomerSchema = z.object({
  params: z.object({ customerId: objectIdSchema }),
  body: z
    .object({
      fullName: fullNameSchema.optional(),
      email: emailSchema,
      phone: phoneSchema,
      type: z.enum(CUSTOMER_TYPE_VALUES).optional(),
      status: z.enum(CUSTOMER_STATUS_VALUES).optional(),
      assignedTo: nullableObjectIdSchema,
      notes: notesSchema,
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one customer field is required",
    }),
});

export const createCustomerFromEnquirySchema = z.object({
  params: z.object({ enquiryId: objectIdSchema }),
  body: z
    .object({
      type: z.enum(CUSTOMER_TYPE_VALUES).default(CUSTOMER_TYPES.LEAD),
      assignedTo: nullableObjectIdSchema,
      notes: notesSchema,
    })
    .strict(),
});