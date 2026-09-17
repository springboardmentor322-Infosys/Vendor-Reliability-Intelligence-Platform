 const express = require("express");

const router = express.Router();

const {
  getProcurementRequests,
  getProcurementRequestById,
  createProcurementRequest,
  updateProcurementRequest,
  deleteProcurementRequest,
  approveProcurementRequest,
  rejectProcurementRequest,
} = require("../controllers/procurementController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, getProcurementRequests);

router.get("/:id", authMiddleware, getProcurementRequestById);

router.post("/", authMiddleware, createProcurementRequest);

router.put("/:id", authMiddleware, updateProcurementRequest);

router.delete("/:id", authMiddleware, deleteProcurementRequest);

router.patch(
  "/:id/approve",
  authMiddleware,
  roleMiddleware("Procurement Manager", "Finance Officer"),
  approveProcurementRequest
);

router.patch(
  "/:id/reject",
  authMiddleware,
  roleMiddleware("Procurement Manager", "Finance Officer"),
  rejectProcurementRequest
);

module.exports = router;