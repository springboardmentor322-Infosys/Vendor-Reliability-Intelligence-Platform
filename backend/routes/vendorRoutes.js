 const express = require("express");

const router = express.Router();

const {
  getVendors,
  getVendorById,
  getVendorPerformance,
  createVendor,
  updateVendor,
  updateVendorStatus,
  deleteVendor,
} = require("../controllers/vendorController");

const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/",
  authMiddleware,
  getVendors
);

router.get(
  "/intelligence/performance",
  authMiddleware,
  getVendorPerformance
);

router.get(
  "/:id",
  authMiddleware,
  getVendorById
);

router.post(
  "/",
  authMiddleware,
  createVendor
);

router.put(
  "/:id",
  authMiddleware,
  updateVendor
);

router.patch(
  "/:id/status",
  authMiddleware,
  updateVendorStatus
);

router.delete(
  "/:id",
  authMiddleware,
  deleteVendor
);

module.exports = router;