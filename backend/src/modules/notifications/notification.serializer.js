const toIdString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && ("_id" in value || "id" in value)) {
    const nestedId = value._id ?? value.id;
    return nestedId?.toString?.() ?? null;
  }

  return value.toString?.() ?? null;
};

export const serializeNotification = (notification) => ({
  id: toIdString(notification),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  entity:
    notification.entityType && notification.entityId
      ? {
          type: notification.entityType,
          id: toIdString(notification.entityId),
        }
      : null,
  isRead: Boolean(notification.readAt),
  readAt: notification.readAt?.toISOString?.() ?? notification.readAt ?? null,
  createdAt: notification.createdAt?.toISOString?.() ?? notification.createdAt ?? null,
});

export const serializeNotificationList = (result) => ({
  data: (result.items ?? []).map(serializeNotification),
  meta: {
    page: result.page ?? 1,
    limit: result.limit ?? 20,
    total: result.total ?? 0,
    totalPages: result.totalPages ?? 0,
  },
});