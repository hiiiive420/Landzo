import { apiClient } from "./apiClient";

export const getMediaLibrary = async (params = {}) => {
  const { data } = await apiClient.get("/admin/media-library", {
    params,
  });

  return data.data;
};
