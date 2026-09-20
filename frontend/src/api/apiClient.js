import axios from "axios";

import { getAuthBridge } from "./authBridge";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    config.headers.delete?.("Content-Type");
    delete config.headers["Content-Type"];
  }

  const token = getAuthBridge().getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isRefreshRequest = originalRequest?.url?.includes("/admin/auth/refresh");

    if (error.response?.status !== 401 || originalRequest?._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const token = await getAuthBridge().refreshSession();

      if (!token) {
        throw error;
      }

      originalRequest.headers.Authorization = `Bearer ${token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      getAuthBridge().clearSession();
      return Promise.reject(refreshError);
    }
  },
);

export const getErrorMessage = (error) => {
  const code = error.response?.data?.code;
  const message = error.response?.data?.message || error.message || "Request failed";
  return code ? `${code}: ${message}` : message;
};