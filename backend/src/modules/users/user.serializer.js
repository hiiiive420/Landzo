import { serializeStaffUser } from "../auth/auth.serializer.js";

export const serializeManagedUser = (user) => ({
  ...serializeStaffUser(user),
  createdBy: user.createdBy ? user.createdBy.toString() : null,
  createdAt: user.createdAt?.toISOString?.() ?? null,
  updatedAt: user.updatedAt?.toISOString?.() ?? null,
});
