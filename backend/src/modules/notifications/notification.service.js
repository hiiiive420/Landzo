import { AppError } from "../../common/errors/AppError.js";

import {
  NOTIFICATION_ENTITY_TYPE_VALUES,
  NOTIFICATION_LIMITS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPE_VALUES,
} from "./notification.constants.js";
import { Notification } from "./notification.model.js";

const notificationNotFound = () =>
  new AppError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");

const invalidNotificationInput = () =>
  new AppError(500, "Notification could not be created", "NOTIFICATION_INVALID_INPUT", undefined, {
    isOperational: false,
  });

const buildRecipientFilter = ({ recipientUserId, status }) => {
  const filter = {
    recipient: recipientUserId,
  };

  if (status === NOTIFICATION_STATUSES.UNREAD) {
    filter.readAt = null;
  }

  if (status === NOTIFICATION_STATUSES.READ) {
    filter.readAt = { $ne: null };
  }

  return filter;
};

export const listNotifications = async ({
  recipientUserId,
  page = NOTIFICATION_LIMITS.defaultPage,
  limit = NOTIFICATION_LIMITS.defaultLimit,
  status = NOTIFICATION_STATUSES.ALL,
}) => {
  const filter = buildRecipientFilter({ recipientUserId, status });
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
};

export const getUnreadNotificationCount = async ({ recipientUserId }) => ({
  count: await Notification.countDocuments({
    recipient: recipientUserId,
    readAt: null,
  }),
});

export const markNotificationRead = async ({ recipientUserId, notificationId }) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: recipientUserId,
  });

  if (!notification) {
    throw notificationNotFound();
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

export const markAllNotificationsRead = async ({ recipientUserId }) => {
  const readAt = new Date();

  await Notification.updateMany(
    {
      recipient: recipientUserId,
      readAt: null,
    },
    {
      $set: {
        readAt,
      },
    },
  );

  return getUnreadNotificationCount({ recipientUserId });
};

export const createNotification = async ({
  recipientUserId,
  type,
  title,
  message,
  entityType = null,
  entityId = null,
}) => {
  if (
    !recipientUserId ||
    !NOTIFICATION_TYPE_VALUES.includes(type) ||
    !title ||
    !message ||
    (entityType && !NOTIFICATION_ENTITY_TYPE_VALUES.includes(entityType)) ||
    (!entityType && entityId)
  ) {
    throw invalidNotificationInput();
  }

  return Notification.create({
    recipient: recipientUserId,
    type,
    title,
    message,
    entityType,
    entityId,
  });
};

export const createNotificationSafely = async (input) => {
  try {
    return await createNotification(input);
  } catch (error) {
    console.error("Notification write failed", {
      type: input?.type || "unknown",
      entityType: input?.entityType || null,
      errorCode: error?.code || "NOTIFICATION_WRITE_FAILED",
    });

    return null;
  }
};