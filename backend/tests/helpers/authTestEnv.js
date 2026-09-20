export const authTestEnv = {
  NODE_ENV: "test",
  CORS_ORIGINS: ["http://localhost:5173", "http://localhost:3000"],
  JWT_ACCESS_SECRET: "test-access-secret-with-at-least-32-characters",
  JWT_ACCESS_EXPIRES_IN: "15m",
  JWT_REFRESH_SECRET: "test-refresh-secret-with-at-least-32-characters",
  JWT_REFRESH_EXPIRES_IN: "7d",
  JWT_ISSUER: "landzo-api-test",
  JWT_AUDIENCE: "landzo-admin-test",
};
