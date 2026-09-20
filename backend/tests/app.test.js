import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";

const testEnv = {
  NODE_ENV: "test",
  CORS_ORIGINS: ["http://localhost:5173", "http://localhost:3000"],
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("LANDZO Express foundation", () => {
  it("returns the standard health response", async () => {
    const app = createApp({ env: testEnv });

    const response = await request(app).get("/api/v1/health").expect(200);

    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      success: true,
      message: "LANDZO API is healthy",
      data: {
        status: "ok",
        service: "landzo-backend",
      },
    });
    expect(response.body.data.timestamp).toEqual(expect.any(String));
  });

  it("returns a standardized 404 response", async () => {
    const app = createApp({ env: testEnv });

    const response = await request(app).get("/api/v1/missing").expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Route not found",
      code: "ROUTE_NOT_FOUND",
    });
  });

  it("rejects dangerous Mongo-style request keys", async () => {
    const app = createApp({ env: testEnv });

    const response = await request(app)
      .post("/api/v1/health")
      .send({ $where: "this.password" })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid request structure",
      code: "INVALID_REQUEST_STRUCTURE",
    });
  });

  it("returns and accepts safe request IDs", async () => {
    const app = createApp({ env: testEnv });

    const generated = await request(app).get("/api/v1/health").expect(200);
    expect(generated.headers["x-request-id"]).toMatch(uuidPattern);

    const incomingId = "landzo-test-request-1";
    const echoed = await request(app)
      .get("/api/v1/health")
      .set("X-Request-Id", incomingId)
      .expect(200);

    expect(echoed.headers["x-request-id"]).toBe(incomingId);
  });

  it("applies important security headers and hides Express fingerprinting", async () => {
    const app = createApp({ env: testEnv });

    const response = await request(app)
      .get("/api/v1/health")
      .set("Origin", "http://localhost:5173")
      .expect(200);

    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-dns-prefetch-control"]).toBe("off");
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("returns a safe 500 shape for unexpected errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp({
      env: testEnv,
      configureRoutes(appInstance) {
        appInstance.get("/api/v1/test-error", () => {
          throw new Error("database password leaked path C:/secret");
        });
      },
    });

    const response = await request(app).get("/api/v1/test-error").expect(500);

    expect(response.body).toEqual({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(JSON.stringify(response.body)).not.toContain("password");

    errorSpy.mockRestore();
  });
});
