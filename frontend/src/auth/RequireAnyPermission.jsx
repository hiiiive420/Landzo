import { Navigate } from "react-router-dom";

import { useAuth } from "./useAuth";

export const RequireAnyPermission = ({
  permissions = [],
  children,
}) => {
  const { hasPermission } = useAuth();

  const allowed = permissions.some(
    (permission) =>
      hasPermission(permission),
  );

  if (!allowed) {
    return (
      <Navigate
        to="/admin"
        replace
      />
    );
  }

  return children;
};