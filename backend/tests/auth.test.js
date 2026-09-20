import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { serializeStaffUser } from "../src/modules/auth/auth.serializer.js";
import { hashPassword, verifyPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import { User } from "../src/modules/users/user.model.js";
import { authTestEnv } from "./helpers/authTestEnv.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from "./helpers/testDatabase.js";

const password = "CorrectHorse123";
const newPassword = "NewCorrectHorse123";

const createStaffUser = async (overrides = {}) => {
  const user = await User.create({
    fullName: "Landzo Admin",
    email: "admin@example.com",
    phone: "+94770000000",
    passwordHash: await hashPassword(password),
    role: STAFF_ROLES.ADMIN,
    status: STAFF_STATUSES.ACTIVE,
    ...overrides,
  });

  return user;
};

const getRefreshCookie = (response) => {
  const setCookie = response.headers["set-cookie"] || [];
  return setCookie.find((cookie) => cookie.startsWith("landzo_refresh_token="));
};

const login = (app, body = { email: "admin@example.com", password }) =>
  request(app).post("/api/v1/admin/auth/login").send(body);

const expectNoPasswordLeak = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).not.toContain("passwordhash");
  expect(serialized).not.toContain(password.toLowerCase());
  expect(serialized).not.toContain(newPassword.toLowerCase());
};

describe("staff authentication core", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await User.init();
    await RefreshSession.init();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("hashes passwords and verifies candidates", async () => {
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2b$")).toBe(true);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("does not return password hashes from the safe staff DTO", async () => {
    const user = await createStaffUser();
    const dto = serializeStaffUser(user);

    expect(dto).toMatchObject({
      id: user._id.toString(),
      email: "admin@example.com",
      role: STAFF_ROLES.ADMIN,
      status: STAFF_STATUSES.ACTIVE,
    });
    expect(dto.passwordHash).toBeUndefined();
    expectNoPasswordLeak(dto);
  });

  it("rejects duplicate normalized email addresses", async () => {
    await createStaffUser({ email: "Admin@Example.com" });

    await expect(
      createStaffUser({ email: "admin@example.com", fullName: "Duplicate Admin" }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("logs in with valid credentials, updates last login, and sets a refresh cookie", async () => {
    const app = createApp({ env: authTestEnv });
    const user = await createStaffUser();

    const response = await login(app).expect(200);
    const refreshedUser = await User.findById(user._id);

    expect(response.body).toMatchObject({
      success: true,
      message: "Login successful",
      data: {
        user: {
          email: "admin@example.com",
          role: STAFF_ROLES.ADMIN,
          status: STAFF_STATUSES.ACTIVE,
        },
        accessToken: expect.any(String),
      },
    });
    expect(refreshedUser.lastLogin).toBeInstanceOf(Date);
    expect(getRefreshCookie(response)).toContain("HttpOnly");
    expect(getRefreshCookie(response)).toContain("SameSite=Lax");
    expect(JSON.stringify(response.body)).not.toContain("landzo_refresh_token");
    expectNoPasswordLeak(response.body);
  });

  it("uses the same invalid credentials response for invalid password and unknown email", async () => {
    const app = createApp({ env: authTestEnv });
    await createStaffUser();

    const invalidPassword = await login(app, {
      email: "admin@example.com",
      password: "wrong-password",
    }).expect(401);
    const unknownEmail = await login(app, {
      email: "missing@example.com",
      password,
    }).expect(401);

    expect(invalidPassword.body).toEqual({
      success: false,
      message: "Invalid credentials",
      code: "INVALID_CREDENTIALS",
    });
    expect(unknownEmail.body).toEqual(invalidPassword.body);
  });

  it("blocks disabled accounts from logging in", async () => {
    const app = createApp({ env: authTestEnv });
    await createStaffUser({ status: STAFF_STATUSES.DISABLED });

    const response = await login(app).expect(401);

    expect(response.body).toMatchObject({
      success: false,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("temporarily locks an account after repeated invalid attempts", async () => {
    const app = createApp({ env: authTestEnv });
    const user = await createStaffUser();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(app, { email: "admin@example.com", password: "wrong-password" }).expect(401);
    }

    const lockedUser = await User.findById(user._id).select(
      "+failedLoginAttempts +loginLockedUntil",
    );
    expect(lockedUser.failedLoginAttempts).toBe(5);
    expect(lockedUser.loginLockedUntil.getTime()).toBeGreaterThan(Date.now());

    const lockedResponse = await login(app).expect(423);
    expect(lockedResponse.body).toMatchObject({
      success: false,
      code: "ACCOUNT_TEMPORARILY_LOCKED",
    });
  });

  it("authenticates /me with a valid access token and rejects invalid tokens", async () => {
    const app = createApp({ env: authTestEnv });
    await createStaffUser();

    const loginResponse = await login(app).expect(200);
    const token = loginResponse.body.data.accessToken;

    const meResponse = await request(app)
      .get("/api/v1/admin/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(meResponse.body.data.user).toMatchObject({
      email: "admin@example.com",
      role: STAFF_ROLES.ADMIN,
    });
    expectNoPasswordLeak(meResponse.body);

    const invalidResponse = await request(app)
      .get("/api/v1/admin/auth/me")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);

    expect(invalidResponse.body).toMatchObject({
      success: false,
      code: "AUTHENTICATION_REQUIRED",
    });
  });


  it("updates the authenticated staff profile without accepting privileged fields", async () => {
    const app = createApp({ env: authTestEnv });
    const user = await createStaffUser();
    const loginResponse = await login(app).expect(200);
    const token = loginResponse.body.data.accessToken;

    await request(app)
      .patch("/api/v1/admin/auth/profile")
      .send({ fullName: "No Auth", phone: "+94771111111" })
      .expect(401);

    const response = await request(app)
      .patch("/api/v1/admin/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "Updated Staff",
        phone: "+94771111111",
        email: "forged@example.com",
        role: STAFF_ROLES.OWNER,
        status: STAFF_STATUSES.DISABLED,
        passwordHash: "forged",
      })
      .expect(200);

    expect(response.body.data.user).toMatchObject({
      id: user._id.toString(),
      fullName: "Updated Staff",
      phone: "+94771111111",
      email: "admin@example.com",
      role: STAFF_ROLES.ADMIN,
      status: STAFF_STATUSES.ACTIVE,
    });
    expectNoPasswordLeak(response.body);

    const persisted = await User.findById(user._id).select("+passwordHash");
    expect(persisted.email).toBe("admin@example.com");
    expect(persisted.role).toBe(STAFF_ROLES.ADMIN);
    expect(persisted.status).toBe(STAFF_STATUSES.ACTIVE);
    expect(persisted.passwordHash).not.toBe("forged");
  });
  it("refreshes sessions, rotates refresh cookies, and rejects reused refresh credentials", async () => {
    const app = createApp({ env: authTestEnv });
    await createStaffUser();

    const loginResponse = await login(app).expect(200);
    const firstCookie = getRefreshCookie(loginResponse);

    const refreshResponse = await request(app)
      .post("/api/v1/admin/auth/refresh")
      .set("Cookie", firstCookie)
      .expect(200);
    const secondCookie = getRefreshCookie(refreshResponse);

    expect(refreshResponse.body.data.accessToken).toEqual(expect.any(String));
    expect(secondCookie).toContain("HttpOnly");
    expect(secondCookie).not.toBe(firstCookie);

    const reused = await request(app)
      .post("/api/v1/admin/auth/refresh")
      .set("Cookie", firstCookie)
      .expect(401);

    expect(reused.body).toMatchObject({
      success: false,
      code: "INVALID_SESSION",
    });
  });

  it("logs out by revoking the refresh session and clearing the cookie", async () => {
    const app = createApp({ env: authTestEnv });
    await createStaffUser();

    const loginResponse = await login(app).expect(200);
    const cookie = getRefreshCookie(loginResponse);

    const logoutResponse = await request(app)
      .post("/api/v1/admin/auth/logout")
      .set("Cookie", cookie)
      .expect(200);

    expect(getRefreshCookie(logoutResponse)).toContain("Expires=Thu, 01 Jan 1970");

    const refreshResponse = await request(app)
      .post("/api/v1/admin/auth/refresh")
      .set("Cookie", cookie)
      .expect(401);

    expect(refreshResponse.body).toMatchObject({
      success: false,
      code: "INVALID_SESSION",
    });
  });

  it("changes password, updates the hash, invalidates old credentials and sessions", async () => {
    const app = createApp({ env: authTestEnv });
    const user = await createStaffUser();
    const loginResponse = await login(app).expect(200);
    const token = loginResponse.body.data.accessToken;
    const refreshCookie = getRefreshCookie(loginResponse);
    const originalUser = await User.findById(user._id).select("+passwordHash +authVersion");

    await request(app)
      .patch("/api/v1/admin/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "wrong-password", newPassword })
      .expect(401);

    await request(app)
      .patch("/api/v1/admin/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: password, newPassword })
      .expect(200);

    const changedUser = await User.findById(user._id).select("+passwordHash +authVersion");
    expect(changedUser.passwordHash).not.toBe(originalUser.passwordHash);
    expect(changedUser.authVersion).toBe(originalUser.authVersion + 1);

    await login(app).expect(401);
    await login(app, { email: "admin@example.com", password: newPassword }).expect(200);

    await request(app).post("/api/v1/admin/auth/refresh").set("Cookie", refreshCookie).expect(401);

    await request(app)
      .get("/api/v1/admin/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });

  it("uses credentialed CORS only for allowlisted origins and exposes auth rate-limit headers", async () => {
    const app = createApp({ env: authTestEnv });
    await createStaffUser();

    const allowed = await login(app).set("Origin", "http://localhost:5173").expect(200);

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    expect(allowed.headers["ratelimit-policy"]).toEqual(expect.any(String));

    const blocked = await login(app).set("Origin", "http://evil.example").expect(403);

    expect(blocked.body).toMatchObject({
      success: false,
      code: "CORS_ORIGIN_NOT_ALLOWED",
    });
  });
});
