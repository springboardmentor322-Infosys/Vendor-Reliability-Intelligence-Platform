 const express = require("express");

const router = express.Router();

const {
  getAdminDashboard,
  getProcurementDashboard,
  getSupplyChainDashboard,
  getFinanceDashboard,
  getVendorDashboard,
  getAuditorDashboard,
} = require("../controllers/dashboardController");

const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/admin",
  authMiddleware,
  getAdminDashboard
);

router.get(
  "/procurement",
  authMiddleware,
  getProcurementDashboard
);

router.get(
  "/supply-chain",
  authMiddleware,
  getSupplyChainDashboard
);

router.get(
  "/finance",
  authMiddleware,
  getFinanceDashboard
);

router.get(
  "/vendor",
  authMiddleware,
  getVendorDashboard
);

router.get(
  "/auditor",
  authMiddleware,
  getAuditorDashboard
);

module.exports = router;