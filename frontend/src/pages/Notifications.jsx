 import { useEffect, useState } from "react";
import "../styles/Notifications.css";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/notifications",
        {
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch notifications"
        );
      }

      setNotifications(data);
    } catch (err) {
      console.error(
        "Notification fetch error:",
        err
      );

      setError(
        err.message ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to mark notification as read"
        );
      }

      setNotifications(
        (previousNotifications) =>
          previousNotifications.map(
            (notification) =>
              notification.notification_id ===
              notificationId
                ? {
                    ...notification,
                    is_read: true,
                  }
                : notification
          )
      );
    } catch (err) {
      console.error(
        "Mark notification as read error:",
        err
      );

      setError(
        err.message ||
          "Unable to update notification."
      );
    }
  };

  const deleteNotification = async (
    notificationId
  ) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete notification"
        );
      }

      setNotifications(
        (previousNotifications) =>
          previousNotifications.filter(
            (notification) =>
              notification.notification_id !==
              notificationId
          )
      );
    } catch (err) {
      console.error(
        "Delete notification error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete notification."
      );
    }
  };

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read
    ).length;

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-header">
          <h1>Notifications</h1>
        </div>

        <div className="notification-loading">
          Loading notifications...
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>

          <p>
            Stay updated with vendor and
            procurement activities.
          </p>
        </div>

        <div className="notification-count">
          {unreadCount} Unread
        </div>
      </div>

      {error && (
        <div className="notification-error">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="empty-notifications">
          <h3>No notifications</h3>

          <p>
            You don't have any notifications
            at the moment.
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(
            (notification) => (
              <div
                key={
                  notification.notification_id
                }
                className={`notification-card ${
                  notification.is_read
                    ? "read"
                    : "unread"
                }`}
              >
                <div className="notification-icon">
                  🔔
                </div>

                <div className="notification-content">
                  <div className="notification-top">
                    <h3>
                      {notification.message}
                    </h3>

                    {!notification.is_read && (
                      <span className="unread-badge">
                        New
                      </span>
                    )}
                  </div>

                  <p className="notification-user">
                    {notification.full_name} •{" "}
                    {notification.email}
                  </p>

                  <p className="notification-date">
                    {new Date(
                      notification.created_at
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="notification-actions">
                  {!notification.is_read && (
                    <button
                      className="read-button"
                      onClick={() =>
                        markAsRead(
                          notification.notification_id
                        )
                      }
                    >
                      Mark as Read
                    </button>
                  )}

                  <button
                    className="delete-button"
                    onClick={() =>
                      deleteNotification(
                        notification.notification_id
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;