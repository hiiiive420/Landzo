import { apiClient } from "./apiClient";

export const listUsers = async (params = {}) => {
  const { data } = await apiClient.get("/admin/users", { params });
  return data;
};

export const getUser = async (userId) => {
  const { data } = await apiClient.get(`/admin/users/${userId}`);
  return data.data;
};

export const createUser = async (payload) => {
  const { data } = await apiClient.post("/admin/users", payload);
  return data.data;
};

export const updateUser = async (userId, payload) => {
  const { data } = await apiClient.patch(`/admin/users/${userId}`, payload);
  return data.data;
};

export const updateUserRole = async (userId, role) => {
  const { data } = await apiClient.patch(`/admin/users/${userId}/role`, { role });
  return data.data;
};

export const updateUserStatus = async (userId, status) => {
  const { data } = await apiClient.patch(`/admin/users/${userId}/status`, { status });
  return data.data;
};

export const resetUserPassword = async (userId, newPassword) => {
  const { data } = await apiClient.patch(`/admin/users/${userId}/reset-password`, {
    newPassword,
  });
  return data.data;
};
