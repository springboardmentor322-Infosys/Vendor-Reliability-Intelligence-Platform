const express = require("express");

const router = express.Router();

const {
  getDeliveries,
  getDeliveryById,
} = require("../controllers/deliveryController");

const authMiddleware = require("../middleware/authMiddleware");

// GET ALL DELIVERIES
router.get(
  "/",
  authMiddleware,
  getDeliveries
);

// GET DELIVERY BY ID
router.get(
  "/:id",
  authMiddleware,
  getDeliveryById
);

module.exports = router;
