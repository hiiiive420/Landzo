import { Router } from "express";
import rateLimit from "express-rate-limit";

import { validateRequest } from "../../common/validation/validateRequest.js";
import { authenticateStaff } from "./auth.middleware.js";
import { changePassword, login, logout, me, refresh, updateProfile } from "./auth.controller.js";
import { changePasswordSchema, loginSchema, updateProfileSchema } from "./auth.validator.js";

const createAuthRateLimiter = (env, limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === "test" ? 1000 : limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many authentication attempts",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
    },
  });

export const createAuthRouter = (env) => {
  const router = Router();
  const requireStaff = authenticateStaff(env);

  router.post("/login", createAuthRateLimiter(env, 20), validateRequest(loginSchema), login(env));
  router.post("/refresh", createAuthRateLimiter(env, 60), refresh(env));
  router.post("/logout", logout(env));
  router.get("/me", requireStaff, me());
  router.patch("/profile", requireStaff, validateRequest(updateProfileSchema), updateProfile());
  router.patch(
    "/change-password",
    requireStaff,
    validateRequest(changePasswordSchema),
    changePassword(),
  );

  return router;
};
