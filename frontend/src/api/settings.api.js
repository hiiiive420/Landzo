import { apiClient } from "./apiClient";

export const getSettings = async () => {
  const { data } = await apiClient.get("/admin/settings");
  return data.data;
};

export const updateSettings = async (payload) => {
  const { data } = await apiClient.patch("/admin/settings", payload);
  return data.data;
};