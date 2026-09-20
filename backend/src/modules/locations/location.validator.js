import mongoose from "mongoose";
import { z } from "zod";

import { LOCATION_LEVEL_VALUES, LOCATION_STATUS_VALUES } from "./location.constants.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid location id");
const parentIdSchema = objectIdSchema.nullable().optional();

const nameSchema = z.string({ required_error: "Location name is required" }).trim().min(2).max(120);

const sortOrderSchema = z.coerce.number().int().min(0).max(100000);

const mapSelectionSchema = z
  .object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  })
  .strict();

export const locationIdParamSchema = z.object({
  params: z.object({
    locationId: objectIdSchema,
  }),
});

export const listLocationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    level: z.enum(LOCATION_LEVEL_VALUES).optional(),
    parentId: objectIdSchema.optional(),
    status: z.enum(LOCATION_STATUS_VALUES).optional(),
    search: z.string().trim().max(80).optional(),
  }),
});

export const publicListLocationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    level: z.enum(LOCATION_LEVEL_VALUES).optional(),
    parentId: objectIdSchema.optional(),
    search: z.string().trim().max(80).optional(),
  }),
});

export const createLocationSchema = z.object({
  body: z
    .object({
      name: nameSchema,
      level: z.enum(LOCATION_LEVEL_VALUES),
      parentId: parentIdSchema,
      sortOrder: sortOrderSchema.default(0),
      map: mapSelectionSchema.nullable().optional(),
    })
    .strict(),
});

export const updateLocationSchema = z.object({
  params: z.object({
    locationId: objectIdSchema,
  }),
  body: z
    .object({
      name: nameSchema.optional(),
      parentId: parentIdSchema,
      sortOrder: sortOrderSchema.optional(),
      map: mapSelectionSchema.nullable().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, "At least one location field is required"),
});

export const updateLocationStatusSchema = z.object({
  params: z.object({
    locationId: objectIdSchema,
  }),
  body: z
    .object({
      status: z.enum(LOCATION_STATUS_VALUES),
    })
    .strict(),
});

export const toObjectId = (value) => new mongoose.Types.ObjectId(value);

