import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getCurrentStaff, loginStaff, logoutStaff, refreshStaffSession } from "../api/auth.api";
import { registerAuthBridge } from "../api/authBridge";
import { AuthContext } from "./useAuth";

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [initializing, setInitializing] = useState(true);
  const tokenRef = useRef(null);

  const applySession = useCallback((session) => {
    tokenRef.current = session.accessToken;
    setAccessToken(session.accessToken);
    setUser(session.user);
    setPermissions(session.permissions || []);
    return session.accessToken;
  }, []);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
  }, []);

  const refreshSession = useCallback(async () => {
    const refreshed = await refreshStaffSession();
    tokenRef.current = refreshed.accessToken;
    setAccessToken(refreshed.accessToken);
    setUser(refreshed.user);

    const profile = await getCurrentStaff();
    setUser(profile.user);
    setPermissions(profile.permissions || []);

    return refreshed.accessToken;
  }, []);

  useEffect(() => {
    registerAuthBridge({
      getAccessToken: () => tokenRef.current,
      refreshSession,
      clearSession,
    });
  }, [clearSession, refreshSession]);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        await refreshSession();
      } catch {
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, [clearSession, refreshSession]);

  const login = useCallback(
    async (credentials) => {
      const session = await loginStaff(credentials);
      applySession({ ...session, permissions: [] });

      const profile = await getCurrentStaff();
      setUser(profile.user);
      setPermissions(profile.permissions || []);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutStaff();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateCurrentUser = useCallback((nextUser) => {
    setUser(nextUser);
  }, []);

  const hasPermission = useCallback(
    (permission) => permissions.includes(permission),
    [permissions],
  );

  const value = useMemo(
    () => ({
      accessToken,
      user,
      permissions,
      initializing,
      isAuthenticated: Boolean(accessToken && user),
      login,
      logout,
      hasPermission,
      updateCurrentUser,
      clearSession,
    }),
    [accessToken, user, permissions, initializing, login, logout, hasPermission, updateCurrentUser, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
