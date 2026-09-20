import { Router } from "express";

import { validateRequest } from "../../common/validation/validateRequest.js";

import { authenticateStaff } from "../auth/auth.middleware.js";

import {
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
  unreadNotificationCountHandler,
} from "./notification.controller.js";
import {
  listNotificationsSchema,
  markAllNotificationsReadSchema,
  markNotificationReadSchema,
  unreadNotificationCountSchema,
} from "./notification.validator.js";

export const createNotificationRouter = (env) => {
  const router = Router();

  router.use(authenticateStaff(env));

  router.get("/", validateRequest(listNotificationsSchema), listNotificationsHandler);
  router.get(
    "/unread-count",
    validateRequest(unreadNotificationCountSchema),
    unreadNotificationCountHandler,
  );
  router.patch(
    "/read-all",
    validateRequest(markAllNotificationsReadSchema),
    markAllNotificationsReadHandler,
  );
  router.patch(
    "/:notificationId/read",
    validateRequest(markNotificationReadSchema),
    markNotificationReadHandler,
  );

  return router;
};