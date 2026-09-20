import { apiClient } from "./apiClient";

export const listCustomers = async (params = {}) => {
  const { data } = await apiClient.get("/admin/customers", { params });
  return data;
};


export const listCustomerAssignees = async () => {
  const { data } = await apiClient.get("/admin/customers/assignees");
  return data.data;
};

export const listCustomerOptions = async (params = {}) => {
  const { data } = await apiClient.get("/admin/customers/options", { params });
  return data.data;
};

export const getCustomer = async (customerId) => {
  const { data } = await apiClient.get(`/admin/customers/${customerId}`);
  return data.data;
};

export const getCustomerByEnquiry = async (enquiryId) => {
  const { data } = await apiClient.get(
    `/admin/customers/by-enquiry/${enquiryId}`,
  );

  return data.data;
};
export const createCustomer = async (payload) => {
  const { data } = await apiClient.post("/admin/customers", payload);
  return data.data;
};

export const createCustomerFromEnquiry = async (enquiryId, payload = {}) => {
  const { data } = await apiClient.post(`/admin/customers/from-enquiry/${enquiryId}`, payload);
  return data.data;
};

export const updateCustomer = async (customerId, payload) => {
  const { data } = await apiClient.patch(`/admin/customers/${customerId}`, payload);
  return data.data;
};