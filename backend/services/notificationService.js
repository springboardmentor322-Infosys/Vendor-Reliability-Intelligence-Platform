const pool = require("../config/db");

const createNotification = async (userId, message) => {
  if (!userId || !message) {
    throw new Error("userId and message are required");
  }

  const result = await pool.query(
    `
    INSERT INTO notifications (user_id, message, is_read)
    VALUES ($1, $2, false)
    RETURNING notification_id, user_id, message, is_read, created_at
    `,
    [userId, message]
  );

  return result.rows[0];
};

const createNotifications = async (userIds, message) => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0 || !message) {
    return [];
  }

  const notifications = [];

  for (const userId of uniqueUserIds) {
    const notification = await createNotification(userId, message);
    notifications.push(notification);
  }

  return notifications;
};

const notifyAdmins = async (message) => {
  const result = await pool.query(
    `
    SELECT u.user_id
    FROM users u
    JOIN roles r
      ON u.role_id = r.role_id
    WHERE r.role_name = 'Administrator'
      AND COALESCE(u.status, 'Active') = 'Active'
    `
  );

  return createNotifications(
    result.rows.map((row) => row.user_id),
    message
  );
};

const notifyRole = async (roleName, message) => {
  const result = await pool.query(
    `
    SELECT u.user_id
    FROM users u
    JOIN roles r
      ON u.role_id = r.role_id
    WHERE r.role_name = $1
      AND COALESCE(u.status, 'Active') = 'Active'
    `,
    [roleName]
  );

  return createNotifications(
    result.rows.map((row) => row.user_id),
    message
  );
};

const notifyVendor = async (vendorId, message) => {
  const result = await pool.query(
    `
    SELECT v.user_id
    FROM vendors v
    JOIN users u
      ON v.user_id = u.user_id
    JOIN roles r
      ON u.role_id = r.role_id
    WHERE v.vendor_id = $1
      AND r.role_name = 'Vendor'
      AND COALESCE(u.status, 'Active') = 'Active'
    `,
    [vendorId]
  );

  return createNotifications(
    result.rows.map((row) => row.user_id),
    message
  );
};

module.exports = {
  createNotification,
  createNotifications,
  notifyAdmins,
  notifyRole,
  notifyVendor,
};