import { successResponse } from "../../common/responses/apiResponse.js";

import { serializeNotification, serializeNotificationList } from "./notification.serializer.js";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service.js";

export const listNotificationsHandler = async (req, res, next) => {
  try {
    const result = await listNotifications({
      recipientUserId: req.user.id,
      ...req.validated.query,
    });
    const serialized = serializeNotificationList(result);

    res.status(200).json(
      successResponse({
        message: "Notifications retrieved",
        data: serialized.data,
        meta: serialized.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const unreadNotificationCountHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Unread notification count retrieved",
        data: await getUnreadNotificationCount({ recipientUserId: req.user.id }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const markNotificationReadHandler = async (req, res, next) => {
  try {
    const notification = await markNotificationRead({
      recipientUserId: req.user.id,
      notificationId: req.validated.params.notificationId,
    });

    res.status(200).json(
      successResponse({
        message: "Notification marked read",
        data: serializeNotification(notification),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsReadHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Notifications marked read",
        data: await markAllNotificationsRead({ recipientUserId: req.user.id }),
      }),
    );
  } catch (error) {
    next(error);
  }
};