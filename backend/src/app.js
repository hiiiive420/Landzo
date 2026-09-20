import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { AppError } from "./common/errors/AppError.js";
import { rejectDangerousKeys } from "./common/security/rejectDangerousKeys.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestId } from "./middleware/requestId.js";
import {
  createAdminAnalyticsRouter,
  createPublicAnalyticsRouter,
} from "./modules/analytics/analytics.routes.js";
import { createAuditRouter } from "./modules/audit/audit.routes.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import {
  createBlogRouter,
  createPublicBlogRouter,
} from "./modules/blogs/blog.routes.js";
import { createCustomerRouter } from "./modules/customers/customer.routes.js";
import { createEnquiryRouter } from "./modules/enquiries/enquiry.routes.js";
import { createPublicEnquiryRouter } from "./modules/enquiries/enquiry.public.routes.js";
import { createGeocodingRouter } from "./modules/geocoding/geocoding.routes.js";
import {
  createHomepageRouter,
  createPublicHomepageRouter,
} from "./modules/homepage/homepage.routes.js";
import { createLocationRouter } from "./modules/locations/location.routes.js";
import { createPublicLocationRouter } from "./modules/locations/location.public.routes.js";
import { createMediaLibraryRouter } from "./modules/media-library/mediaLibrary.routes.js";
import { createNotificationRouter } from "./modules/notifications/notification.routes.js";
import { createPropertyRouter } from "./modules/properties/property.routes.js";
import { createPrivateDocumentRouter } from "./modules/private-documents/privateDocument.routes.js";
import { createPublicPropertyRouter } from "./modules/properties/property.public.routes.js";
import { createRoleRouter } from "./modules/roles-permissions/role.routes.js";
import {
  createPublicSettingsRouter,
  createSettingsRouter,
} from "./modules/settings/settings.routes.js";
import { createSiteVisitRouter } from "./modules/site-visits/siteVisit.routes.js";
import { createUserRouter } from "./modules/users/user.routes.js";
import { healthRouter } from "./routes/health.routes.js";

const defaultEnv = {
  NODE_ENV: process.env.NODE_ENV || "development",
  CORS_ORIGINS: ["https://landzo.hiiiive.lk"],
};

const createCorsOptions = (allowedOrigins) => ({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError(403, "CORS origin is not allowed", "CORS_ORIGIN_NOT_ALLOWED"));
  },
  credentials: true,
});

const createApiRateLimiter = (env) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === "test" ? 1000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });

export const createApp = ({ env = defaultEnv, configureRoutes } = {}) => {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestId);
  app.use(helmet());
  app.use(cors(createCorsOptions(env.CORS_ORIGINS)));

  app.use("/api/v1", createApiRateLimiter(env));
  app.use("/api/v1", express.json({ limit: "1mb" }));
  app.use("/api/v1", rejectDangerousKeys);
  app.use("/api/v1", healthRouter);

  app.use("/api/v1/locations", createPublicLocationRouter());
  app.use("/api/v1/properties", createPublicPropertyRouter());
  app.use("/api/v1/analytics", createPublicAnalyticsRouter());
  app.use("/api/v1/enquiries", createPublicEnquiryRouter());
  app.use("/api/v1/settings", createPublicSettingsRouter());

  app.use("/api/v1/admin/auth", createAuthRouter(env));
  app.use("/api/v1/admin/users", createUserRouter(env));
  app.use("/api/v1/admin/roles", createRoleRouter(env));
  app.use("/api/v1/admin/locations", createLocationRouter(env));
  app.use("/api/v1/admin/geocoding", createGeocodingRouter(env));
  app.use("/api/v1/admin/properties", createPropertyRouter(env));
  app.use("/api/v1/admin/media-library", createMediaLibraryRouter(env));
  app.use("/api/v1/admin/notifications", createNotificationRouter(env));
  app.use(
  "/api/v1/admin/private-documents",
  createPrivateDocumentRouter(env),
);
  app.use("/api/v1/admin/analytics", createAdminAnalyticsRouter(env));
  app.use("/api/v1/admin/audit-logs", createAuditRouter(env));
  app.use("/api/v1/admin/settings", createSettingsRouter(env));
  app.use("/api/v1/homepage", createPublicHomepageRouter());
  app.use(
  "/api/v1/admin/homepage",
  createHomepageRouter(env),
);
  app.use("/api/v1/blogs", createPublicBlogRouter(env));
  app.use("/api/v1/admin/blogs", createBlogRouter(env));
  app.use("/api/v1/admin/enquiries", createEnquiryRouter(env));
  app.use("/api/v1/admin/customers", createCustomerRouter(env));
  app.use("/api/v1/admin/site-visits", createSiteVisitRouter(env));

  if (typeof configureRoutes === "function") {
    configureRoutes(app);
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

