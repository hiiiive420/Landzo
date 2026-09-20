import { AppError } from "../../common/errors/AppError.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit/audit.constants.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { hashPassword } from "../auth/auth.service.js";
import { RefreshSession } from "../auth/refreshSession.model.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../auth/auth.constants.js";
import { SYSTEM_ROLE_KEYS } from "../roles-permissions/role.constants.js";
import { serializeManagedUser } from "./user.serializer.js";
import { User } from "./user.model.js";

const duplicateEmailCode = 11000;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchFilter = (search) => {
  if (!search) {
    return {};
  }

  const safeSearch = escapeRegex(search.trim());
  const pattern = new RegExp(safeSearch, "i");

  return {
    $or: [{ fullName: pattern }, { email: pattern }, { phone: pattern }],
  };
};

const toDuplicateEmailError = () =>
  new AppError(409, "A staff account already uses this email", "EMAIL_ALREADY_IN_USE");

const assertSystemRole = (role) => {
  if (!SYSTEM_ROLE_KEYS.includes(role)) {
    throw new AppError(400, "Invalid staff role", "INVALID_ROLE");
  }
};

const assertOwnerActorForOwnerTarget = ({ actorRole, targetRole, action }) => {
  if (targetRole === STAFF_ROLES.OWNER && actorRole !== STAFF_ROLES.OWNER) {
    throw new AppError(
      403,
      `Only an Owner may ${action} an Owner account`,
      "OWNER_ACTION_REQUIRED",
    );
  }
};

const assertCanCreateOrAssignRole = ({ actorRole, nextRole }) => {
  if (nextRole === STAFF_ROLES.OWNER && actorRole !== STAFF_ROLES.OWNER) {
    throw new AppError(403, "Only an Owner may assign the Owner role", "OWNER_ACTION_REQUIRED");
  }
};

const assertAnotherActiveOwnerRemains = async (targetUserId) => {
  const activeOwnerCount = await User.countDocuments({
    _id: { $ne: targetUserId },
    role: STAFF_ROLES.OWNER,
    status: STAFF_STATUSES.ACTIVE,
  });

  if (activeOwnerCount < 1) {
    throw new AppError(409, "LANDZO must retain at least one active Owner", "LAST_ACTIVE_OWNER");
  }
};

const revokeUserSessions = async (userId) => {
  await RefreshSession.updateMany(
    { user: userId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
};

const getUserOrFail = async (userId) => {
  const user = await User.findById(userId).select("+authVersion");

  if (!user) {
    throw new AppError(404, "Staff user not found", "USER_NOT_FOUND");
  }

  return user;
};

const recordUserAuditLog = async ({ actorUserId, action, user }) => {
  try {
    await recordAuditLog({
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user._id,
      entityLabel: "User",
    });
  } catch (error) {
    console.error("User audit write failed", {
      action,
      entityType: AUDIT_ENTITY_TYPES.USER,
      errorCode: error?.code || "AUDIT_WRITE_FAILED",
    });
  }
};
const saveWithDuplicateEmailHandling = async (user) => {
  try {
    await user.save();
    return user;
  } catch (error) {
    if (error?.code === duplicateEmailCode) {
      throw toDuplicateEmailError();
    }

    throw error;
  }
};

export const createStaffUser = async ({ actorUserId, actorRole, input }) => {
  assertSystemRole(input.role);
  assertCanCreateOrAssignRole({ actorRole, nextRole: input.role });

  try {
    const user = await User.create({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone ?? null,
      role: input.role,
      status: STAFF_STATUSES.ACTIVE,
      passwordHash: await hashPassword(input.initialPassword),
      createdBy: actorUserId,
    });

    await recordUserAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.USER_CREATED,
      user,
    });

    return serializeManagedUser(user);
  } catch (error) {
    if (error?.code === duplicateEmailCode) {
      throw toDuplicateEmailError();
    }

    throw error;
  }
};

export const listStaffUsers = async ({ page, limit, search, role, status }) => {
  const filter = {
    ...buildSearchFilter(search),
  };

  if (role) {
    filter.role = role;
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    data: users.map(serializeManagedUser),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getStaffUser = async (userId) => serializeManagedUser(await getUserOrFail(userId));

export const updateStaffUser = async ({ actorUserId, userId, input }) => {
  const user = await getUserOrFail(userId);
  const previousSnapshot = {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? null,
  };

  if (input.fullName !== undefined) {
    user.fullName = input.fullName;
  }

  if (input.email !== undefined) {
    user.email = input.email;
  }

  if (input.phone !== undefined) {
    user.phone = input.phone;
  }

  await saveWithDuplicateEmailHandling(user);

  const hasMeaningfulChanges =
    previousSnapshot.fullName !== user.fullName ||
    previousSnapshot.email !== user.email ||
    previousSnapshot.phone !== (user.phone ?? null);

  if (hasMeaningfulChanges) {
    await recordUserAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      user,
    });
  }

  return serializeManagedUser(user);
};

export const updateStaffRole = async ({ actorUserId, actorRole, targetUserId, nextRole }) => {
  assertSystemRole(nextRole);
  assertCanCreateOrAssignRole({ actorRole, nextRole });

  const user = await getUserOrFail(targetUserId);
  const previousRole = user.role;

  if (user.role === STAFF_ROLES.OWNER && nextRole !== STAFF_ROLES.OWNER) {
    assertOwnerActorForOwnerTarget({ actorRole, targetRole: user.role, action: "demote" });
    await assertAnotherActiveOwnerRemains(user._id);
  }

  user.role = nextRole;
  user.authVersion = (user.authVersion ?? 0) + 1;
  await user.save();
  await revokeUserSessions(user._id);

  if (previousRole !== user.role) {
    await recordUserAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      user,
    });
  }

  return serializeManagedUser(user);
};

export const updateStaffStatus = async ({ actorUserId, actorRole, targetUserId, nextStatus }) => {
  const user = await getUserOrFail(targetUserId);
  const previousStatus = user.status;

  if (actorUserId === user._id.toString() && nextStatus === STAFF_STATUSES.DISABLED) {
    throw new AppError(
      409,
      "Staff users cannot disable their own active account",
      "SELF_DISABLE_BLOCKED",
    );
  }

  if (user.role === STAFF_ROLES.OWNER && nextStatus === STAFF_STATUSES.DISABLED) {
    assertOwnerActorForOwnerTarget({ actorRole, targetRole: user.role, action: "disable" });
    await assertAnotherActiveOwnerRemains(user._id);
  }

  user.status = nextStatus;
  user.authVersion = (user.authVersion ?? 0) + 1;
  await user.save();
  await revokeUserSessions(user._id);

  if (previousStatus !== user.status) {
    await recordUserAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
      user,
    });
  }

  return serializeManagedUser(user);
};

export const resetStaffPassword = async ({ actorUserId, actorRole, targetUserId, newPassword }) => {
  const user = await User.findById(targetUserId).select("+passwordHash +authVersion");

  if (!user) {
    throw new AppError(404, "Staff user not found", "USER_NOT_FOUND");
  }

  if (user.role === STAFF_ROLES.OWNER) {
    if (actorRole !== STAFF_ROLES.OWNER || actorUserId === user._id.toString()) {
      throw new AppError(
        403,
        "Only another Owner may reset an Owner password",
        "OWNER_ACTION_REQUIRED",
      );
    }
  }

  user.passwordHash = await hashPassword(newPassword);
  user.lastPasswordChangeAt = new Date();
  user.authVersion = (user.authVersion ?? 0) + 1;
  await user.save();
  await revokeUserSessions(user._id);

  await recordUserAuditLog({
    actorUserId,
    action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
    user,
  });

  return serializeManagedUser(user);
};
