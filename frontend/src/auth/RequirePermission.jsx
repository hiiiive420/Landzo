import { Navigate } from "react-router-dom";

import { useAuth } from "./useAuth";

export const RequirePermission = ({ permission, children }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};