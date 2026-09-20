import { successResponse } from "../../common/responses/apiResponse.js";
import { getEffectivePermissionsForRole } from "../roles-permissions/role.service.js";
import {
  buildRefreshCookieOptions,
  changeStaffPassword,
  clearRefreshCookieOptions,
  getRefreshTokenFromCookies,
  loginStaff,
  logoutStaff,
  refreshStaffSession,
  updateAuthenticatedStaffProfile,
} from "./auth.service.js";
import { REFRESH_COOKIE_NAME } from "./auth.constants.js";

const getRequestContext = (req) => ({
  requestId: req.id,
  userAgent: req.get("User-Agent"),
});

export const login = (env) => async (req, res, next) => {
  try {
    const result = await loginStaff({
      ...req.validated.body,
      env,
      ...getRequestContext(req),
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, buildRefreshCookieOptions(env));

    res.status(200).json(
      successResponse({
        message: "Login successful",
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const refresh = (env) => async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromCookies(req.get("Cookie"));
    const result = await refreshStaffSession({
      refreshToken,
      env,
      ...getRequestContext(req),
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, buildRefreshCookieOptions(env));

    res.status(200).json(
      successResponse({
        message: "Session refreshed",
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const logout = (env) => async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromCookies(req.get("Cookie"));
    await logoutStaff({ refreshToken, env });
    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions(env));

    res.status(200).json(
      successResponse({
        message: "Logout successful",
        data: {
          loggedOut: true,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const me = () => async (req, res, next) => {
  try {
    const permissions = await getEffectivePermissionsForRole(req.auth.role);

    res.status(200).json(
      successResponse({
        message: "Authenticated staff profile",
        data: {
          user: req.user,
          permissions,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const changePassword = () => async (req, res, next) => {
  try {
    const user = await changeStaffPassword({
      userId: req.auth.userId,
      ...req.validated.body,
    });

    res.status(200).json(
      successResponse({
        message: "Password changed successfully",
        data: {
          user,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updateProfile = () => async (req, res, next) => {
  try {
    const user = await updateAuthenticatedStaffProfile({
      userId: req.auth.userId,
      input: req.validated.body,
    });

    res.status(200).json(
      successResponse({
        message: "Profile updated successfully",
        data: {
          user,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};