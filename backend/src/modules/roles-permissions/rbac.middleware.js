import { AppError } from "../../common/errors/AppError.js";
import { successResponse } from "../../common/responses/apiResponse.js";
import { getEffectivePermissionsForRole } from "./role.service.js";

export const requirePermissions =
  (...requiredPermissions) =>
  async (req, _res, next) => {
    try {
      if (!req.auth?.userId) {
        throw new AppError(401, "Authentication required", "AUTHENTICATION_REQUIRED");
      }

      const permissions = await getEffectivePermissionsForRole(req.auth.role);
      const allowed = requiredPermissions.every((permission) => permissions.includes(permission));

      if (!allowed) {
        throw new AppError(403, "You do not have permission to perform this action", "FORBIDDEN");
      }

      req.permissions = permissions;
      next();
    } catch (error) {
      next(error);
    }
  };


  export const requireAnyPermissions =
  (...requiredPermissions) =>
  async (req, _res, next) => {
    try {
      if (!req.auth?.userId) {
        throw new AppError(
          401,
          "Authentication required",
          "AUTHENTICATION_REQUIRED",
        );
      }

      const permissions =
        await getEffectivePermissionsForRole(
          req.auth.role,
        );

      const allowed =
        requiredPermissions.some((permission) =>
          permissions.includes(permission),
        );

      if (!allowed) {
        throw new AppError(
          403,
          "You do not have permission to perform this action",
          "FORBIDDEN",
        );
      }

      req.permissions = permissions;
      next();
    } catch (error) {
      next(error);
    }
  };
export const respondWithPermissions = async (req, res, next) => {
  try {
    const permissions = await getEffectivePermissionsForRole(req.auth.role);

    res.status(200).json(
      successResponse({
        message: "Permission context resolved",
        data: { permissions },
      }),
    );
  } catch (error) {
    next(error);
  }
};
