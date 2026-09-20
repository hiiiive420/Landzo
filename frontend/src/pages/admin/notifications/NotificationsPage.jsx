import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../api/notifications.api";

const DEFAULT_META = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const response = await listNotifications({ page: 1, limit: 20, status: "all" });
        if (ignore) {
          return;
        }
        setNotifications(response?.data ?? []);
        setMeta(response?.meta ?? DEFAULT_META);
      } catch (requestError) {
        if (!ignore) {
          setNotifications([]);
          setMeta(DEFAULT_META);
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification?.id) {
      return;
    }

    await markNotificationRead(notification.id);
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
      ),
    );

    if (notification.entity?.type === "enquiry") {
      navigate(`/admin/enquiries/${notification.entity.id}`);
      return;
    }

    if (notification.entity?.type === "site_visit") {
      navigate(`/admin/site-visits/${notification.entity.id}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <div className="stack">
      <div className="row-between">
        <div className="page-heading">
          <p className="eyebrow">System</p>
          <h1>Notifications</h1>
        </div>

        {notifications.length > 0 ? (
          <button className="button secondary" type="button" onClick={handleMarkAllRead}>
            Mark all read
          </button>
        ) : null}
      </div>

      {loading ? (
        <p>Loading notifications...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : notifications.length === 0 ? (
        <div className="panel empty-state">
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="panel">
          <ul className="notification-list">
            {notifications.map((notification) => (
              <li key={notification.id} className={notification.isRead ? "notification-item read" : "notification-item unread"}>
                <button type="button" className="notification-trigger" onClick={() => handleNotificationClick(notification)}>
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <small>{new Date(notification.createdAt).toLocaleString()}</small>
                  </div>
                  {!notification.isRead ? <span className="notification-dot" aria-label="Unread" /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {meta.totalPages > 1 ? <p>Page {meta.page} of {meta.totalPages}</p> : null}
    </div>
  );
};
