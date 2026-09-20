import { apiClient } from "./apiClient";

export const listProperties = async (params = {}) => {
  const { data } = await apiClient.get("/admin/properties", { params });
  return data;
};

export const getProperty = async (propertyId) => {
  const { data } = await apiClient.get(`/admin/properties/${propertyId}`);
  return data.data;
};

export const createProperty = async (payload) => {
  const { data } = await apiClient.post("/admin/properties", payload);
  return data.data;
};

export const updateProperty = async (propertyId, payload) => {
  const { data } = await apiClient.patch(`/admin/properties/${propertyId}`, payload);
  return data.data;
};

export const duplicateProperty = async (propertyId) => {
  const { data } = await apiClient.post(`/admin/properties/${propertyId}/duplicate`);
  return data.data;
};

export const listTrashedProperties = async (params = {}) => {
  const { data } = await apiClient.get("/admin/properties/trash", { params });
  return data;
};

export const trashProperty = async (propertyId) => {
  const { data } = await apiClient.post(`/admin/properties/${propertyId}/trash`);
  return data.data;
};

export const restoreProperty = async (propertyId) => {
  const { data } = await apiClient.post(`/admin/properties/${propertyId}/restore`);
  return data.data;
};

export const unarchiveProperty = async (propertyId) => {
  const { data } = await apiClient.post(`/admin/properties/${propertyId}/unarchive`);
  return data.data;
};

export const publishProperty = async (propertyId) => {
  const { data } = await apiClient.post(`/admin/properties/${propertyId}/publish`);
  return data.data;
};

export const unpublishProperty = async (propertyId) => {
  const { data } = await apiClient.post(`/admin/properties/${propertyId}/unpublish`);
  return data.data;
};

export const setPropertyFeatured = async (propertyId, featured) => {
  const { data } = await apiClient.patch(`/admin/properties/${propertyId}/featured`, { featured });
  return data.data;
};

export const setPropertyExploreMap = async (propertyId, exploreMapEnabled) => {
  const { data } = await apiClient.patch(`/admin/properties/${propertyId}/explore-map`, {
    exploreMapEnabled,
  });
  return data.data;
};

export const updatePropertyStatus = async (propertyId, status) => {
  const { data } = await apiClient.patch(`/admin/properties/${propertyId}/status`, { status });
  return data.data;
};

export const uploadPropertyImages = async (propertyId, files, onUploadProgress) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("images", file));

  const { data } = await apiClient.post(`/admin/properties/${propertyId}/media`, formData, {
    onUploadProgress,
  });

  return data.data;
};

export const deletePropertyImage = async (propertyId, imageId) => {
  const { data } = await apiClient.delete(`/admin/properties/${propertyId}/media/${imageId}`);
  return data.data;
};

export const setPropertyCoverImage = async (propertyId, imageId) => {
  const { data } = await apiClient.patch(`/admin/properties/${propertyId}/media/${imageId}/cover`);
  return data.data;
};

export const reorderPropertyImages = async (propertyId, imageIds) => {
  const { data } = await apiClient.patch(`/admin/properties/${propertyId}/media/reorder`, { imageIds });
  return data.data;
};