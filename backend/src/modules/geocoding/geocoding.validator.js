import { z } from "zod";

const coordinateSchema = z.coerce.number().finite();

export const geocodingSearchSchema = z.object({
  query: z.object({
    q: z.string().trim().min(3).max(120),
  }),
});

export const geocodingReverseSchema = z.object({
  query: z.object({
    lat: coordinateSchema.min(-90).max(90),
    lng: coordinateSchema.min(-180).max(180),
  }),
});
