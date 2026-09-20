import { describe, expect, it } from "vitest";

import { validateEnv } from "../src/config/env.js";

const validEnv = {
  NODE_ENV: "test",
  PORT: "5000",
  MONGODB_URI: "mongodb://127.0.0.1:27017/landzo",
  CORS_ORIGINS: "http://localhost:5173, http://localhost:3000",
  JWT_ACCESS_SECRET: "test-access-secret-with-at-least-32-characters",
  JWT_ACCESS_EXPIRES_IN: "15m",
  JWT_REFRESH_SECRET: "test-refresh-secret-with-at-least-32-characters",
  JWT_REFRESH_EXPIRES_IN: "7d",
  JWT_ISSUER: "landzo-api-test",
  JWT_AUDIENCE: "landzo-admin-test",
};

describe("environment validation", () => {
  it("fails when the MongoDB URI is missing", () => {
    const envWithoutMongoUri = { ...validEnv };
    delete envWithoutMongoUri.MONGODB_URI;

    expect(() => validateEnv(envWithoutMongoUri)).toThrow(/MONGODB_URI/);
  });

  it("fails when the port is invalid", () => {
    expect(() => validateEnv({ ...validEnv, PORT: "70000" })).toThrow(/PORT/);
  });

  it("fails when an auth secret is too short", () => {
    expect(() => validateEnv({ ...validEnv, JWT_ACCESS_SECRET: "short" })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it("normalizes comma-separated CORS origins", () => {
    const env = validateEnv(validEnv);

    expect(env).toMatchObject({
      NODE_ENV: "test",
      PORT: 5000,
      MONGODB_URI: "mongodb://127.0.0.1:27017/landzo",
      CORS_ORIGINS: ["http://localhost:5173", "http://localhost:3000"],
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "7d",
    });
  });
});
