export const serializeRole = (role, permissions) => ({
  key: role.key,
  name: role.name,
  permissions: permissions ?? role.permissions,
  isSystem: role.isSystem,
  updatedAt: role.updatedAt?.toISOString?.() ?? null,
});
