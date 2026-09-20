import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../api/apiClient";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.api";
import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/useAuth";
import { permissions } from "../utils/propertyOptions";

export const AdminLayout = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const canAccessBlogs = [
    permissions.blogCreate,
    permissions.blogEdit,
    permissions.blogPublish,
    permissions.blogDelete,
  ].some((permission) => hasPermission(permission));

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let ignore = false;

    const loadNotifications = async () => {
      try {
        setNotificationsLoading(true);
        const [notificationResponse, unreadResponse] = await Promise.all([
          listNotifications({ page: 1, limit: 5, status: "all" }),
          getUnreadNotificationCount(),
        ]);

        if (ignore) {
          return;
        }

        setNotifications(notificationResponse?.data ?? []);
        setUnreadCount(unreadResponse?.count ?? 0);
        setNotificationError("");
      } catch (error) {
        if (!ignore) {
          setNotifications([]);
          setUnreadCount(0);
          setNotificationError(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setNotificationsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const handleNotificationOpen = async () => {
    setNotificationsOpen((current) => !current);

    if (!notificationsOpen && user?.id) {
      try {
        const response = await listNotifications({ page: 1, limit: 5, status: "all" });
        setNotifications(response?.data ?? []);
      } catch (error) {
        setNotificationError(getErrorMessage(error));
      }
    }
  };

  const handleNotificationRead = async (notification) => {
    if (!notification?.id) {
      return;
    }

    try {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));

      if (notification.entity?.type === "enquiry") {
        navigate(`/admin/enquiries/${notification.entity.id}`);
        return;
      }

      if (notification.entity?.type === "site_visit") {
        navigate(`/admin/site-visits/${notification.entity.id}`);
      }
    } catch (error) {
      setNotificationError(getErrorMessage(error));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(response?.count ?? 0);
    } catch (error) {
      setNotificationError(getErrorMessage(error));
    }
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            className="brand-logo"
            src="/logo.webp"
            alt="LANDZO"
          />
        </div>

        <nav className="nav-list">
          <NavLink to="/admin" end>
            Dashboard
          </NavLink>

          <div className="nav-section">
            <p className="nav-section-label">
              Personal
            </p>

            <div className="nav-sublist">
              <NavLink to="/admin/account">
                My Account
              </NavLink>
            </div>
          </div>

          <div className="nav-section">
            <p className="nav-section-label">
              Properties
            </p>

            <div className="nav-sublist">
              <PermissionGate
                permission={permissions.propertyView}
              >
                <NavLink
                  to="/admin/properties"
                  end
                >
                  All Properties
                </NavLink>
              </PermissionGate>

              <PermissionGate
                permission={permissions.propertyCreate}
              >
                <NavLink to="/admin/properties/new">
                  Add Property
                </NavLink>
              </PermissionGate>

              <PermissionGate
                permission={permissions.propertyView}
              >
                <NavLink to="/admin/properties/trash">
                  Trash
                </NavLink>
              </PermissionGate>

              <PermissionGate
  permission={permissions.propertyPublish}
>
  <NavLink to="/admin/properties/featured">
    Featured Properties
  </NavLink>
</PermissionGate>

<PermissionGate
  permission={permissions.propertyPublish}
>
  <NavLink to="/admin/properties/explore-map">
    Explore Map
  </NavLink>
</PermissionGate>
            </div>
          </div>

          <div className="nav-section">
            <p className="nav-section-label">
              Operations
            </p>

            <div className="nav-sublist">
              <PermissionGate
                permission={permissions.enquiryView}
              >
                <NavLink
                  to="/admin/enquiries"
                  end
                >
                  Enquiries
                </NavLink>
              </PermissionGate>

              <PermissionGate
                permission={permissions.siteVisitView}
              >
                <NavLink to="/admin/site-visits">
                  Site Visits
                </NavLink>
              </PermissionGate>

              <PermissionGate
                permission={permissions.customerView}
              >
                <NavLink to="/admin/customers">
                  Customers / Leads
                </NavLink>
              </PermissionGate>
            </div>
          </div>

          <div className="nav-section">
            <p className="nav-section-label">
              Content
            </p>

            <div className="nav-sublist">
            <PermissionGate
  permission={permissions.homepageView}
>
  <NavLink
    to="/admin/homepage"
    end
  >
    Homepage
  </NavLink>
</PermissionGate>

              {canAccessBlogs ? (
  <NavLink
    to="/admin/blogs"
    end
  >
    Blogs
  </NavLink>
) : null}

              <PermissionGate
                permission={permissions.mediaView}
              >
                <NavLink to="/admin/media-library">
                  Media Library
                </NavLink>
              </PermissionGate>
            </div>
          </div>

          <div className="nav-section">
            <p className="nav-section-label">
              Management
            </p>

            <div className="nav-sublist">
              <PermissionGate
                permission={permissions.locationView}
              >
                <NavLink to="/admin/locations">
                  Locations
                </NavLink>
              </PermissionGate>

              <PermissionGate
                permission={permissions.userManage}
              >
                <NavLink to="/admin/users">
                  Users
                </NavLink>
              </PermissionGate>

              <PermissionGate
                permission={permissions.roleManage}
              >
                <NavLink to="/admin/roles">
                  Roles & Permissions
                </NavLink>
              </PermissionGate>

              <PermissionGate
                permission={permissions.privateDocumentView}
              >
                <NavLink to="/admin/private-documents">
                  Private Documents
                </NavLink>
              </PermissionGate>
            </div>
          </div>

          <div className="nav-section">
            <p className="nav-section-label">
              Insights
            </p>

            <div className="nav-sublist">
              <PermissionGate
                permission={permissions.analyticsView}
              >
                <NavLink to="/admin/analytics">
                  Analytics
                </NavLink>
              </PermissionGate>

              <PermissionGate
  permission={permissions.auditView}
>
  <NavLink to="/admin/audit-logs">
    Audit Logs
  </NavLink>
</PermissionGate>
            </div>
          </div>

          <div className="nav-section">
            <p className="nav-section-label">
              System
            </p>

            <div className="nav-sublist">
              <NavLink to="/admin/notifications">Notifications</NavLink>
 
              <PermissionGate
                permission={permissions.settingsManage}
              >
                <NavLink to="/admin/settings">
                  Settings
                </NavLink>
              </PermissionGate>
            </div>
          </div>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <div>
            <strong>
              {user?.fullName || "LANDZO Staff"}
            </strong>

            <span>{user?.email}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ position: "relative" }}>
              <button
                className="button secondary"
                type="button"
                aria-label="Toggle notifications"
                onClick={handleNotificationOpen}
                style={{ position: "relative" }}
              >
                🔔
                {unreadCount > 0 ? (
                  <span
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      background: "#d32f2f",
                      color: "#fff",
                      borderRadius: "999px",
                      padding: "0.15rem 0.4rem",
                      fontSize: "0.7rem",
                      minWidth: "1.2rem",
                      textAlign: "center",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 0.5rem)",
                    width: "320px",
                    background: "#fff",
                    border: "1px solid #dfe3e8",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
                    padding: "0.75rem",
                    zIndex: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <strong>Notifications</strong>
                    {notifications.length > 0 ? (
                      <button className="button link" type="button" onClick={handleMarkAllRead}>
                        Mark all read
                      </button>
                    ) : null}
                  </div>

                  {notificationsLoading ? (
                    <p>Loading notifications...</p>
                  ) : notificationError ? (
                    <p>{notificationError}</p>
                  ) : notifications.length === 0 ? (
                    <p>No notifications yet.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {notifications.map((notification) => (
                        <li key={notification.id} style={{ borderTop: "1px solid #eef2f7", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                          <button
                            type="button"
                            onClick={() => handleNotificationRead(notification)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              background: "transparent",
                              border: "none",
                              padding: "0",
                              cursor: "pointer",
                              color: "#0f172a",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                              <strong>{notification.title}</strong>
                              {!notification.isRead ? <span style={{ width: "8px", height: "8px", background: "#2563eb", borderRadius: "999px", display: "inline-block" }} /> : null}
                            </div>
                            <p style={{ margin: "0.25rem 0", color: "#475569" }}>{notification.message}</p>
                            <small style={{ color: "#64748b" }}>{new Date(notification.createdAt).toLocaleString()}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            <button className="button secondary" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};


