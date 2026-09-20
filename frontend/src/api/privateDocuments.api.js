import { apiClient } from "./apiClient";

export const listPrivateDocuments = async (params = {}) => {
  const { data } = await apiClient.get("/admin/private-documents", { params });
  return data;
};

export const getPrivateDocument = async (documentId) => {
  const { data } = await apiClient.get(`/admin/private-documents/${documentId}`);
  return data.data;
};

export const uploadPrivateDocument = async ({
  file,
  title,
  description,
  category,
  entityId,
}) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("description", description || "");
  formData.append("category", category);

  if (entityId) {
    formData.append("entityId", entityId);
  }

  const { data } = await apiClient.post("/admin/private-documents", formData);
  return data.data;
};

export const getPrivateDocumentAccess = async (documentId, { attachment = false } = {}) => {
  const { data } = await apiClient.get(`/admin/private-documents/${documentId}/access`, {
    params: {
      attachment: attachment ? "true" : "false",
    },
  });

  return data.data;
};

export const updatePrivateDocumentMetadata = async (documentId, payload) => {
  const { data } = await apiClient.patch(`/admin/private-documents/${documentId}`, payload);
  return data.data;
};
export const replacePrivateDocumentFile = async (documentId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post(`/admin/private-documents/${documentId}/file`, formData);
  return data.data;
};

export const deletePrivateDocument = async (documentId) => {
  const { data } = await apiClient.delete(`/admin/private-documents/${documentId}`);
  return data.data;
};