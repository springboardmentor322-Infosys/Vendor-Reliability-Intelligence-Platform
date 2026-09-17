const express = require("express");

const router = express.Router();

const {
  getVendorPerformance,
} = require("../controllers/vendorPerformanceController");

const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/",
  authMiddleware,
  getVendorPerformance
);

module.exports = router;