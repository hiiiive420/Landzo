import { z } from "zod";

import {
  PRIVATE_DOCUMENT_CATEGORIES,
  PRIVATE_DOCUMENT_CATEGORY_VALUES,
  PRIVATE_DOCUMENT_LIMITS,
  PRIVATE_DOCUMENT_STATUS_VALUES,
} from "./privateDocument.constants.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const categorySchema = z.enum(PRIVATE_DOCUMENT_CATEGORY_VALUES);

const validateCategoryEntityRelationship = (value, ctx) => {
  if (value.category === PRIVATE_DOCUMENT_CATEGORIES.GENERAL) {
    if (value.entityId) {
      ctx.addIssue({
        code: "custom",
        path: ["entityId"],
        message: "General documents must not have an entityId",
      });
    }

    return;
  }

  if (!value.entityId) {
    ctx.addIssue({
      code: "custom",
      path: ["entityId"],
      message: "entityId is required for linked documents",
    });
  }
};

const privateDocumentUploadBodySchema = z
  .object({
    title: z.string().trim().min(1).max(PRIVATE_DOCUMENT_LIMITS.titleMaxLength),
    description: z
      .string()
      .trim()
      .max(PRIVATE_DOCUMENT_LIMITS.descriptionMaxLength)
      .optional()
      .default(""),
    category: categorySchema,
    entityId: objectIdSchema.optional(),
  })
  .strict()
  .superRefine(validateCategoryEntityRelationship);

const privateDocumentListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(PRIVATE_DOCUMENT_LIMITS.defaultPage),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PRIVATE_DOCUMENT_LIMITS.maxLimit)
      .default(PRIVATE_DOCUMENT_LIMITS.defaultLimit),
    search: z.string().trim().max(PRIVATE_DOCUMENT_LIMITS.searchMaxLength).optional(),
    category: categorySchema.optional(),
    entityId: objectIdSchema.optional(),
    status: z.enum(PRIVATE_DOCUMENT_STATUS_VALUES).optional(),
  })
  .strict();

const privateDocumentAccessQuerySchema = z
  .object({
    attachment: z
      .enum(["true", "false"])
      .optional()
      .default("false")
      .transform((value) => value === "true"),
  })
  .strict();

const privateDocumentIdParamsSchema = z
  .object({
    documentId: objectIdSchema,
  })
  .strict();

export const uploadPrivateDocumentSchema = z.object({
  body: privateDocumentUploadBodySchema,
});

export const listPrivateDocumentsSchema = z.object({
  query: privateDocumentListQuerySchema,
});

export const getPrivateDocumentSchema = z.object({
  params: privateDocumentIdParamsSchema,
});

export const accessPrivateDocumentSchema = z.object({
  params: privateDocumentIdParamsSchema,
  query: privateDocumentAccessQuerySchema,
});


export const updatePrivateDocumentMetadataSchema = z.object({
  params: privateDocumentIdParamsSchema,
  body: z
    .object({
      title: z.string().trim().min(1).max(PRIVATE_DOCUMENT_LIMITS.titleMaxLength).optional(),
      description: z
        .string()
        .trim()
        .max(PRIVATE_DOCUMENT_LIMITS.descriptionMaxLength)
        .optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, "At least one metadata field is required"),
});
export const replacePrivateDocumentSchema = z.object({
  params: privateDocumentIdParamsSchema,
});

export const deletePrivateDocumentSchema = z.object({
  params: privateDocumentIdParamsSchema,
});