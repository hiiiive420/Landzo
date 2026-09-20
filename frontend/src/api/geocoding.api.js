import { apiClient } from "./apiClient";

export const searchPlaces = async (query) => {
  const { data } = await apiClient.get("/admin/geocoding/search", {
    params: { q: query },
  });

  return data.data;
};

export const reverseGeocode = async ({ lat, lng }) => {
  const { data } = await apiClient.get("/admin/geocoding/reverse", {
    params: { lat, lng },
  });

  return data.data;
};
