const express = require("express");

const router = express.Router();

const {
  getAuditDeliveries,
  getAuditInspections,
  getAuditInspectionByDelivery,
  createAuditInspection,
} = require("../controllers/auditorController");

const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/deliveries",
  authMiddleware,
  getAuditDeliveries
);

router.get(
  "/inspections",
  authMiddleware,
  getAuditInspections
);

router.get(
  "/inspections/delivery/:delivery_id",
  authMiddleware,
  getAuditInspectionByDelivery
);

router.post(
  "/inspections",
  authMiddleware,
  createAuditInspection
);

module.exports = router;