import { z } from "zod";

import {
  MEDIA_LIBRARY_FORMATS,
  MEDIA_LIBRARY_PAGINATION,
  MEDIA_LIBRARY_SEARCH_MAX_LENGTH,
  MEDIA_LIBRARY_SOURCE_VALUES,
} from "./mediaLibrary.constants.js";

const mediaLibraryQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(MEDIA_LIBRARY_PAGINATION.DEFAULT_PAGE),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MEDIA_LIBRARY_PAGINATION.MAX_LIMIT)
      .default(MEDIA_LIBRARY_PAGINATION.DEFAULT_LIMIT),

    source: z.enum(MEDIA_LIBRARY_SOURCE_VALUES).optional(),

    search: z
      .string()
      .trim()
      .max(MEDIA_LIBRARY_SEARCH_MAX_LENGTH)
      .optional(),

    format: z.enum(MEDIA_LIBRARY_FORMATS).optional(),
  })
  .strict();

export const listMediaLibrarySchema = z.object({
  query: mediaLibraryQuerySchema,
});
