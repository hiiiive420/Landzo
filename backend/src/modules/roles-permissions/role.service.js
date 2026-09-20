import { AppError } from "../../common/errors/AppError.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit/audit.constants.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { STAFF_ROLES } from "../auth/auth.constants.js";
import { User } from "../users/user.model.js";
import { PERMISSION_CATALOG, PERMISSION_VALUES } from "./permission.constants.js";
import { DEFAULT_ROLE_PERMISSIONS, ROLE_LABELS, SYSTEM_ROLE_KEYS } from "./role.constants.js";
import { Role } from "./role.model.js";
import { serializeRole } from "./role.serializer.js";

export const bootstrapSystemRoles = async () => {
  for (const key of SYSTEM_ROLE_KEYS) {
    const existing = await Role.findOne({ key });

    if (!existing) {
      await Role.create({
        key,
        name: ROLE_LABELS[key],
        permissions: [...DEFAULT_ROLE_PERMISSIONS[key]],
        isSystem: true,
      });
      continue;
    }

    if (key === STAFF_ROLES.OWNER) {
      existing.name = ROLE_LABELS[key];
      existing.permissions = [...PERMISSION_VALUES];
      existing.isSystem = true;
      await existing.save();
      continue;
    }

    if (!existing.isSystem || existing.name !== ROLE_LABELS[key]) {
      existing.name = ROLE_LABELS[key];
      existing.isSystem = true;
      await existing.save();
    }
  }
};

export const getEffectivePermissionsForRole = async (roleKey) => {
  if (roleKey === STAFF_ROLES.OWNER) {
    return [...PERMISSION_VALUES];
  }

  const role = await Role.findOne({ key: roleKey });

  if (!role) {
    return [...(DEFAULT_ROLE_PERMISSIONS[roleKey] ?? [])];
  }

  return [...role.permissions];
};

export const getEffectivePermissionsForUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(401, "Authentication required", "AUTHENTICATION_REQUIRED");
  }

  return getEffectivePermissionsForRole(user.role);
};

export const listRoles = async () => {
  const roles = await Role.find({ key: { $in: SYSTEM_ROLE_KEYS } }).sort({ key: 1 });
  const existingKeys = new Set(roles.map((role) => role.key));

  const serializedRoles = [];

  for (const key of SYSTEM_ROLE_KEYS) {
    const role = roles.find((currentRole) => currentRole.key === key);
    const permissions = await getEffectivePermissionsForRole(key);

    if (role) {
      serializedRoles.push(serializeRole(role, permissions));
    } else if (!existingKeys.has(key)) {
      serializedRoles.push({
        key,
        name: ROLE_LABELS[key],
        permissions,
        isSystem: true,
        updatedAt: null,
      });
    }
  }

  return serializedRoles;
};

export const getPermissionCatalog = () => PERMISSION_CATALOG;

const recordRoleAuditLog = async ({ actorUserId, action, role }) => {
  try {
    await recordAuditLog({
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.ROLE,
      entityId: role._id,
      entityLabel: "Role",
    });
  } catch (error) {
    console.error("Role audit write failed", {
      action,
      entityType: AUDIT_ENTITY_TYPES.ROLE,
      errorCode: error?.code || "AUDIT_WRITE_FAILED",
    });
  }
};

const haveSamePermissions = (first, second) => {
  if (first.length !== second.length) {
    return false;
  }

  const secondSet = new Set(second);
  return first.every((permission) => secondSet.has(permission));
};

export const updateRolePermissions = async ({ roleKey, permissions, actorUserId }) => {
  if (roleKey === STAFF_ROLES.OWNER) {
    throw new AppError(403, "Owner permissions cannot be modified", "OWNER_ROLE_IMMUTABLE");
  }

  const uniquePermissions = [...new Set(permissions)];
  const role = await Role.findOne({ key: roleKey });

  if (!role) {
    throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");
  }

  const permissionsChanged = !haveSamePermissions(role.permissions, uniquePermissions);

  role.permissions = uniquePermissions;
  role.updatedBy = actorUserId;
  await role.save();

  if (permissionsChanged) {
    await recordRoleAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATED,
      role,
    });
  }

  return serializeRole(role);
};
