import { apiClient } from "./apiClient";

export const listSiteVisits = async (params = {}) => {
  const { data } = await apiClient.get("/admin/site-visits", { params });
  return data;
};

export const listSiteVisitAssignees = async () => {
  const { data } = await apiClient.get("/admin/site-visits/assignees");
  return data.data;
};

export const listSiteVisitPropertyOptions = async (params = {}) => {
  const { data } = await apiClient.get("/admin/site-visits/property-options", { params });
  return data.data;
};

export const listSiteVisitCustomerOptions = async (params = {}) => {
  const { data } = await apiClient.get("/admin/site-visits/customer-options", { params });
  return data.data;
};

export const getSiteVisit = async (siteVisitId) => {
  const { data } = await apiClient.get(`/admin/site-visits/${siteVisitId}`);
  return data.data;
};

export const createSiteVisit = async (payload) => {
  const { data } = await apiClient.post("/admin/site-visits", payload);
  return data.data;
};

export const updateSiteVisit = async (siteVisitId, payload) => {
  const { data } = await apiClient.patch(`/admin/site-visits/${siteVisitId}`, payload);
  return data.data;
};

export const completeSiteVisit = async (siteVisitId, completionNote) => {
  const { data } = await apiClient.post(`/admin/site-visits/${siteVisitId}/complete`, { completionNote });
  return data.data;
};

export const cancelSiteVisit = async (siteVisitId, cancellationReason) => {
  const { data } = await apiClient.post(`/admin/site-visits/${siteVisitId}/cancel`, { cancellationReason });
  return data.data;
};

export const markSiteVisitNoShow = async (siteVisitId) => {
  const { data } = await apiClient.post(`/admin/site-visits/${siteVisitId}/no-show`, {});
  return data.data;
};