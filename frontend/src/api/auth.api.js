import { apiClient } from "./apiClient";

export const loginStaff = async (payload) => {
  const { data } = await apiClient.post("/admin/auth/login", payload);
  return data.data;
};

export const refreshStaffSession = async () => {
  const { data } = await apiClient.post("/admin/auth/refresh");
  return data.data;
};

export const getCurrentStaff = async () => {
  const { data } = await apiClient.get("/admin/auth/me");
  return data.data;
};

export const logoutStaff = async () => {
  const { data } = await apiClient.post("/admin/auth/logout");
  return data.data;
};


export const updateCurrentStaffProfile = async (payload) => {
  const { data } = await apiClient.patch("/admin/auth/profile", payload);
  return data.data;
};

export const changeStaffPassword = async (payload) => {
  const { data } = await apiClient.patch("/admin/auth/change-password", payload);
  return data.data;
};