import { apiClient } from "./apiClient";

export const listRoles = async () => {
  const { data } = await apiClient.get("/admin/roles");

  return data.data;
};

export const getPermissionCatalog = async () => {
  const { data } = await apiClient.get(
    "/admin/roles/permissions",
  );

  return data.data;
};

export const updateRolePermissions = async (
  roleKey,
  permissions,
) => {
  const { data } = await apiClient.patch(
    `/admin/roles/${roleKey}/permissions`,
    {
      permissions,
    },
  );

  return data.data;
};