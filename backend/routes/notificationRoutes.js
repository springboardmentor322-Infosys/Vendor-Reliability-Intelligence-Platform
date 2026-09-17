 const express = require("express");

const {
  getNotifications,
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  getNotifications
);

router.get(
  "/user/:user_id",
  authMiddleware,
  getUserNotifications
);

router.put(
  "/:id/read",
  authMiddleware,
  markNotificationAsRead
);

router.delete(
  "/:id",
  authMiddleware,
  deleteNotification
);

module.exports = router;