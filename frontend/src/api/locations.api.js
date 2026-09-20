import { apiClient } from "./apiClient";

export const listLocations = async (params = {}) => {
  const { data } = await apiClient.get("/admin/locations", {
    params,
  });

  return data;
};

export const getLocation = async (locationId) => {
  const { data } = await apiClient.get(
    `/admin/locations/${locationId}`,
  );

  return data.data;
};

export const createLocation = async (payload) => {
  const { data } = await apiClient.post(
    "/admin/locations",
    payload,
  );

  return data.data;
};

export const updateLocation = async (locationId, payload) => {
  const { data } = await apiClient.patch(
    `/admin/locations/${locationId}`,
    payload,
  );

  return data.data;
};

export const updateLocationStatus = async (
  locationId,
  status,
) => {
  const { data } = await apiClient.patch(
    `/admin/locations/${locationId}/status`,
    {
      status,
    },
  );

  return data.data;
};