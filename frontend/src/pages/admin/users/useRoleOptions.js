import { useEffect, useState } from "react";

import { listRoles } from "../../../api/roles.api";
import { useAuth } from "../../../auth/useAuth";
import { permissions } from "../../../utils/propertyOptions";
import {
  fallbackRoleOptions,
  roleOptionsFromApi,
} from "../../../utils/userOptions";

export const useRoleOptions = () => {
  const { hasPermission } = useAuth();

  const canManageRoles = hasPermission(permissions.roleManage);

  const [apiRoleOptions, setApiRoleOptions] = useState(null);

  useEffect(() => {
    if (!canManageRoles) {
      return undefined;
    }

    let ignore = false;

    listRoles()
      .then((roles) => {
        if (!ignore) {
          setApiRoleOptions(roleOptionsFromApi(roles));
        }
      })
      .catch(() => {
        if (!ignore) {
          setApiRoleOptions(fallbackRoleOptions);
        }
      });

    return () => {
      ignore = true;
    };
  }, [canManageRoles]);

  if (!canManageRoles) {
    return fallbackRoleOptions;
  }

  return apiRoleOptions ?? fallbackRoleOptions;
};