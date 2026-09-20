import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import { AppError } from "../../common/errors/AppError.js";
import { User } from "../users/user.model.js";
import { serializeStaffUser } from "./auth.serializer.js";
import {
  AUTH_ERROR_CODES,
  LOGIN_PROTECTION,
  REFRESH_COOKIE_NAME,
  STAFF_STATUSES,
} from "./auth.constants.js";
import { RefreshSession } from "./refreshSession.model.js";

const bcryptRounds = 12;
const dummyPasswordHash = "$2b$12$RlOHATK6D2RhhS9tbYddFOT.S7FQ6vi/G6Ziq2YkbXTWVDIX5jg/q";

const durationPattern = /^(?<amount>\d+)(?<unit>s|m|h|d)$/;

export const parseDurationToSeconds = (duration) => {
  if (typeof duration === "number") {
    return duration;
  }

  const match = durationPattern.exec(duration);
  if (!match?.groups) {
    throw new Error("Invalid duration format");
  }

  const amount = Number(match.groups.amount);
  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * multipliers[match.groups.unit];
};

export const hashPassword = (password) => bcrypt.hash(password, bcryptRounds);

export const verifyPassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);

const hashRefreshToken = (token, secret) =>
  crypto.createHmac("sha256", secret).update(token).digest("hex");

const generateRefreshToken = () => crypto.randomBytes(48).toString("base64url");

const getRefreshExpirationDate = (env) =>
  new Date(Date.now() + parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000);

const isLocked = (user) => user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now();

const clearFailedLoginState = async (user) => {
  user.failedLoginAttempts = 0;
  user.loginLockedUntil = null;
  await user.save();
};

const recordFailedLogin = async (user) => {
  if (!user) {
    await bcrypt.compare("invalid-password", dummyPasswordHash);
    return;
  }

  user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;

  if (user.failedLoginAttempts >= LOGIN_PROTECTION.maxFailedAttempts) {
    user.loginLockedUntil = new Date(Date.now() + LOGIN_PROTECTION.lockMinutes * 60 * 1000);
  }

  await user.save();
};

export const createAccessToken = (user, env) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      authVersion: user.authVersion ?? 0,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
  );

export const createRefreshSession = async ({ user, env, requestId, userAgent }) => {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken, env.JWT_REFRESH_SECRET);

  await RefreshSession.create({
    user: user._id,
    tokenHash,
    expiresAt: getRefreshExpirationDate(env),
    userAgent: userAgent ?? null,
    requestId: requestId ?? null,
  });

  return { refreshToken, tokenHash };
};

export const buildRefreshCookieOptions = (env) => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/admin/auth",
  maxAge: parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000,
});

export const clearRefreshCookieOptions = (env) => ({
  ...buildRefreshCookieOptions(env),
  maxAge: 0,
});

export const getRefreshTokenFromCookies = (cookieHeader = "") => {
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");

    if (name === REFRESH_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
};

const loadActiveUserForLogin = (email) =>
  User.findOne({ email })
    .select("+passwordHash +failedLoginAttempts +loginLockedUntil +authVersion")
    .collation({ locale: "en", strength: 2 });

export const loginStaff = async ({ email, password, env, requestId, userAgent }) => {
  const user = await loadActiveUserForLogin(email);

  if (!user) {
    await recordFailedLogin(null);
    throw new AppError(401, "Invalid credentials", AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (user.status !== STAFF_STATUSES.ACTIVE) {
    throw new AppError(401, "Invalid credentials", AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (isLocked(user)) {
    throw new AppError(
      423,
      "Account temporarily locked",
      AUTH_ERROR_CODES.ACCOUNT_TEMPORARILY_LOCKED,
    );
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    await recordFailedLogin(user);
    throw new AppError(401, "Invalid credentials", AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }

  user.lastLogin = new Date();
  await clearFailedLoginState(user);

  const accessToken = createAccessToken(user, env);
  const { refreshToken } = await createRefreshSession({ user, env, requestId, userAgent });

  return {
    user: serializeStaffUser(user),
    accessToken,
    refreshToken,
  };
};

const loadRefreshSession = async (refreshToken, env) => {
  if (!refreshToken) {
    throw new AppError(401, "Invalid session", AUTH_ERROR_CODES.INVALID_SESSION);
  }

  const tokenHash = hashRefreshToken(refreshToken, env.JWT_REFRESH_SECRET);
  const session = await RefreshSession.findOne({ tokenHash }).populate({
    path: "user",
    select: "+authVersion",
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new AppError(401, "Invalid session", AUTH_ERROR_CODES.INVALID_SESSION);
  }

  if (!session.user || session.user.status !== STAFF_STATUSES.ACTIVE) {
    throw new AppError(401, "Invalid session", AUTH_ERROR_CODES.INVALID_SESSION);
  }

  return { session, tokenHash };
};

export const refreshStaffSession = async ({ refreshToken, env, requestId, userAgent }) => {
  const { session, tokenHash } = await loadRefreshSession(refreshToken, env);
  const user = session.user;
  const accessToken = createAccessToken(user, env);
  const nextSession = await createRefreshSession({ user, env, requestId, userAgent });

  session.revokedAt = new Date();
  session.replacedByTokenHash = nextSession.tokenHash;
  await session.save();

  return {
    user: serializeStaffUser(user),
    accessToken,
    refreshToken: nextSession.refreshToken,
    revokedTokenHash: tokenHash,
  };
};

export const logoutStaff = async ({ refreshToken, env }) => {
  if (!refreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(refreshToken, env.JWT_REFRESH_SECRET);
  await RefreshSession.updateOne(
    { tokenHash, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
};

export const getAuthenticatedStaff = async (userId) => {
  const user = await User.findById(userId).select("+authVersion");

  if (!user || user.status !== STAFF_STATUSES.ACTIVE) {
    throw new AppError(401, "Authentication required", AUTH_ERROR_CODES.AUTHENTICATION_REQUIRED);
  }

  return user;
};


export const updateAuthenticatedStaffProfile = async ({ userId, input }) => {
  const user = await User.findById(userId).select("+authVersion");

  if (!user || user.status !== STAFF_STATUSES.ACTIVE) {
    throw new AppError(401, "Authentication required", AUTH_ERROR_CODES.AUTHENTICATION_REQUIRED);
  }

  if (input.fullName !== undefined) {
    user.fullName = input.fullName;
  }

  if (input.phone !== undefined) {
    user.phone = input.phone;
  }

  await user.save();

  return serializeStaffUser(user);
};
export const changeStaffPassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await User.findById(userId).select("+passwordHash +authVersion");

  if (!user || user.status !== STAFF_STATUSES.ACTIVE) {
    throw new AppError(401, "Authentication required", AUTH_ERROR_CODES.AUTHENTICATION_REQUIRED);
  }

  const passwordMatches = await verifyPassword(currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "Invalid credentials", AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }

  user.passwordHash = await hashPassword(newPassword);
  user.lastPasswordChangeAt = new Date();
  user.authVersion = (user.authVersion ?? 0) + 1;
  await user.save();

  await RefreshSession.updateMany(
    { user: user._id, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );

  return serializeStaffUser(user);
};
