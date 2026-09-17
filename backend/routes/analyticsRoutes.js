 const express = require("express");

const router = express.Router();

const {
  getAnalytics,
  getVendorAnalytics,
  getProcurementAnalytics,
  getPurchaseOrderAnalytics,
  getDeliveryAnalytics,
  getRiskAnalytics,
  getPerformanceTrends,
} = require("../controllers/analyticsController");

const authMiddleware = require("../middleware/authMiddleware");


router.get(
  "/",
  authMiddleware,
  getAnalytics
);


router.get(
  "/vendors",
  authMiddleware,
  getVendorAnalytics
);


router.get(
  "/procurement",
  authMiddleware,
  getProcurementAnalytics
);


router.get(
  "/purchase-orders",
  authMiddleware,
  getPurchaseOrderAnalytics
);


router.get(
  "/delivery",
  authMiddleware,
  getDeliveryAnalytics
);


router.get(
  "/risk",
  authMiddleware,
  getRiskAnalytics
);


router.get(
  "/trends",
  authMiddleware,
  getPerformanceTrends
);


module.exports = router;