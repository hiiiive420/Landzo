export const serializeStaffUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    status: user.status,
    profileImage: user.profileImage ?? null,
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
  };
};
