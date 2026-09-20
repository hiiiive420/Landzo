import { apiClient } from "./apiClient";

export const listNotifications = async (params = {}) => {
  const { data } = await apiClient.get("/admin/notifications", { params });
  return data;
};

export const getUnreadNotificationCount = async () => {
  const { data } = await apiClient.get("/admin/notifications/unread-count");
  return data.data;
};

export const markNotificationRead = async (notificationId) => {
  const { data } = await apiClient.patch(`/admin/notifications/${notificationId}/read`);
  return data.data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await apiClient.patch("/admin/notifications/read-all");
  return data.data;
};
