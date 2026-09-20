import { apiClient } from "./apiClient";

export const listEnquiries = async (params = {}) => {
  const { data } = await apiClient.get(
    "/admin/enquiries",
    {
      params,
    },
  );

  return data;
};

export const listAssignableStaff = async () => {
  const { data } = await apiClient.get(
    "/admin/enquiries/assignees",
  );

  return data.data;
};

export const listEnquiryPropertyOptions = async (
  params = {},
) => {
  const { data } = await apiClient.get(
    "/admin/enquiries/property-options",
    {
      params,
    },
  );

  return data.data;
};

export const getEnquiry = async (enquiryId) => {
  const { data } = await apiClient.get(
    `/admin/enquiries/${enquiryId}`,
  );

  return data.data;
};

export const createEnquiry = async (payload) => {
  const { data } = await apiClient.post(
    "/admin/enquiries",
    payload,
  );

  return data.data;
};

export const updateEnquiry = async (
  enquiryId,
  payload,
) => {
  const { data } = await apiClient.patch(
    `/admin/enquiries/${enquiryId}`,
    payload,
  );

  return data.data;
};

export const assignEnquiry = async (
  enquiryId,
  assignedTo,
) => {
  const { data } = await apiClient.patch(
    `/admin/enquiries/${enquiryId}/assign`,
    {
      assignedTo,
    },
  );

  return data.data;
};

export const closeEnquiry = async (
  enquiryId,
  internalNote,
) => {
  const payload =
    internalNote === undefined
      ? {}
      : {
          internalNote,
        };

  const { data } = await apiClient.post(
    `/admin/enquiries/${enquiryId}/close`,
    payload,
  );

  return data.data;
};