 const pool = require("../config/db");

// GET NOTIFICATIONS FOR LOGGED-IN USER
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      `
      SELECT
        n.notification_id,
        n.user_id,
        u.full_name,
        u.email,
        n.message,
        n.is_read,
        n.created_at
      FROM notifications n
      JOIN users u
        ON n.user_id = u.user_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      `,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(
      "Error fetching notifications:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
};

// GET NOTIFICATIONS FOR SPECIFIC USER
const getUserNotifications = async (req, res) => {
  try {
    const requestedUserId = Number(
      req.params.user_id
    );

    const loggedInUserId = Number(
      req.user.user_id
    );

    if (requestedUserId !== loggedInUserId) {
      return res.status(403).json({
        message:
          "You are not authorized to view these notifications",
      });
    }

    const result = await pool.query(
      `
      SELECT
        n.notification_id,
        n.user_id,
        u.full_name,
        u.email,
        n.message,
        n.is_read,
        n.created_at
      FROM notifications n
      JOIN users u
        ON n.user_id = u.user_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      `,
      [loggedInUserId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(
      "Error fetching user notifications:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch user notifications",
    });
  }
};

// MARK NOTIFICATION AS READ
const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = Number(
      req.params.id
    );

    const userId = req.user.user_id;

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE notification_id = $1
        AND user_id = $2
      RETURNING
        notification_id,
        user_id,
        message,
        is_read,
        created_at
      `,
      [
        notificationId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Notification not found or not accessible",
      });
    }

    res.status(200).json({
      message:
        "Notification marked as read",
      notification: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Error updating notification:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update notification",
    });
  }
};

// DELETE NOTIFICATION
const deleteNotification = async (req, res) => {
  try {
    const notificationId = Number(
      req.params.id
    );

    const userId = req.user.user_id;

    const result = await pool.query(
      `
      DELETE FROM notifications
      WHERE notification_id = $1
        AND user_id = $2
      RETURNING
        notification_id,
        user_id,
        message,
        is_read,
        created_at
      `,
      [
        notificationId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Notification not found or not accessible",
      });
    }

    res.status(200).json({
      message:
        "Notification deleted successfully",
    });
  } catch (error) {
    console.error(
      "Error deleting notification:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete notification",
    });
  }
};

module.exports = {
  getNotifications,
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
};