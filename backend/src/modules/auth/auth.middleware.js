import jwt from "jsonwebtoken";

import { AppError } from "../../common/errors/AppError.js";
import { serializeStaffUser } from "./auth.serializer.js";
import { AUTH_ERROR_CODES } from "./auth.constants.js";
import { getAuthenticatedStaff } from "./auth.service.js";

const getAccessToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

export const authenticateStaff = (env) => async (req, _res, next) => {
  try {
    const token = getAccessToken(req.get("Authorization"));

    if (!token) {
      throw new AppError(401, "Authentication required", AUTH_ERROR_CODES.AUTHENTICATION_REQUIRED);
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    const user = await getAuthenticatedStaff(payload.sub);

    if ((user.authVersion ?? 0) !== (payload.authVersion ?? 0)) {
      throw new AppError(401, "Authentication required", AUTH_ERROR_CODES.AUTHENTICATION_REQUIRED);
    }

    req.auth = {
      userId: user._id.toString(),
      role: user.role,
    };
    req.user = serializeStaffUser(user);

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(401, "Authentication required", AUTH_ERROR_CODES.AUTHENTICATION_REQUIRED));
  }
};
