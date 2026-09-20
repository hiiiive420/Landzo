import { apiClient } from "./apiClient";
import { publicApiClient } from "./publicApiClient";

export const getAdminHomepage = async () => {
  const response = await apiClient.get(
    "/admin/homepage",
  );

  return response.data.data;
};

export const updateHomepage = async (payload) => {
  const response = await apiClient.patch(
    "/admin/homepage",
    payload,
  );

  return response.data.data;
};

export const uploadHomepageImage = async ({
  target,
  file,
  alt = "",
}) => {
  const formData = new FormData();

  formData.append("image", file);
  formData.append("alt", alt);

  const response = await apiClient.post(
    `/admin/homepage/images/${target}`,
    formData,
  );

  return response.data.data;
};

export const removeHomepageImage = async (
  target,
) => {
  const response = await apiClient.delete(
    `/admin/homepage/images/${target}`,
  );

  return response.data.data;
};

export const getPublicHomepage = async () => {
  const response = await publicApiClient.get(
    "/homepage",
  );

  return response.data.data;
};
