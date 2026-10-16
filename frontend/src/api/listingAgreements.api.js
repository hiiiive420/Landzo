import { apiClient } from "./apiClient";

export const listListingAgreements = async (params = {}) => {
  const { data } = await apiClient.get("/admin/listing-agreements", { params });
  return data;
};

export const getListingAgreementById = async (propertyId, agreementId) => {
  const { data } = await apiClient.get(
    `/admin/listing-agreements/${propertyId}/${agreementId}`,
  );
  return data.data;
};

export const getLatestListingAgreement = async (propertyId) => {
  const { data } = await apiClient.get(
    `/admin/properties/${propertyId}/listing-agreement`,
  );
  return data.data;
};

export const generateListingAgreement = async (propertyId, payload) => {
  const { data } = await apiClient.post(
    `/admin/properties/${propertyId}/listing-agreement`,
    payload,
  );
  return data.data;
};
