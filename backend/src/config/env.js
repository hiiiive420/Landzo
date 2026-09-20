import dotenv from "dotenv";
import { z } from "zod";

const nodeEnvValues = ["development", "test", "production"];
const durationPattern = /^\d+(s|m|h|d)$/;

const corsOriginsSchema = z
  .string({ required_error: "CORS_ORIGINS is required" })
  .trim()
  .min(1, "CORS_ORIGINS is required")
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().url("CORS_ORIGINS must contain valid URLs")).min(1));

const secretSchema = (name) =>
  z
    .string({ required_error: `${name} is required` })
    .trim()
    .min(32, `${name} must be at least 32 characters`);

const durationSchema = (name) =>
  z
    .string({ required_error: `${name} is required` })
    .trim()
    .regex(durationPattern, `${name} must use a duration like 15m, 7d, or 30s`);

const optionalCloudinaryValueSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z
  .object({
    NODE_ENV: z.enum(nodeEnvValues).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z
      .string({ required_error: "MONGODB_URI is required" })
      .trim()
      .min(1, "MONGODB_URI is required")
      .refine(
        (value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
        "MONGODB_URI must be a MongoDB connection URI",
      ),
    CORS_ORIGINS: corsOriginsSchema,
    JWT_ACCESS_SECRET: secretSchema("JWT_ACCESS_SECRET"),
    JWT_ACCESS_EXPIRES_IN: durationSchema("JWT_ACCESS_EXPIRES_IN").default("15m"),
    JWT_REFRESH_SECRET: secretSchema("JWT_REFRESH_SECRET"),
    JWT_REFRESH_EXPIRES_IN: durationSchema("JWT_REFRESH_EXPIRES_IN").default("7d"),
    JWT_ISSUER: z.string().trim().min(1).default("landzo-api"),
    JWT_AUDIENCE: z.string().trim().min(1).default("landzo-admin"),
    CLOUDINARY_CLOUD_NAME: optionalCloudinaryValueSchema,
    CLOUDINARY_API_KEY: optionalCloudinaryValueSchema,
    CLOUDINARY_API_SECRET: optionalCloudinaryValueSchema,
  })
  .refine(
    (value) => {
      const cloudinaryValues = [
        value.CLOUDINARY_CLOUD_NAME,
        value.CLOUDINARY_API_KEY,
        value.CLOUDINARY_API_SECRET,
      ];

      return cloudinaryValues.every(Boolean) || cloudinaryValues.every((item) => !item);
    },
    {
      message: "Cloudinary environment variables must be provided together",
      path: ["CLOUDINARY_CLOUD_NAME"],
    },
  );

const formatEnvIssues = (issues) =>
  issues.map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`).join("; ");

export const validateEnv = (source = process.env) => {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${formatEnvIssues(result.error.issues)}`);
  }

  return result.data;
};

export const loadEnv = () => {
  dotenv.config({ quiet: true });
  return validateEnv(process.env);
};
