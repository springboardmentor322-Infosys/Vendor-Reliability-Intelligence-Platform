const express = require("express");

const router = express.Router();

const {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  updateContractStatus,
  updateComplianceStatus,
  deleteContract,
} = require("../controllers/contractController");

const authMiddleware = require("../middleware/authMiddleware");

// GET ALL CONTRACTS
router.get(
  "/",
  authMiddleware,
  getContracts
);

// GET CONTRACT BY ID
router.get(
  "/:id",
  authMiddleware,
  getContractById
);

// CREATE CONTRACT
router.post(
  "/",
  authMiddleware,
  createContract
);

// UPDATE CONTRACT
router.put(
  "/:id",
  authMiddleware,
  updateContract
);

// UPDATE CONTRACT STATUS
router.patch(
  "/:id/status",
  authMiddleware,
  updateContractStatus
);

// UPDATE COMPLIANCE STATUS
router.patch(
  "/:id/compliance",
  authMiddleware,
  updateComplianceStatus
);

// DELETE CONTRACT
router.delete(
  "/:id",
  authMiddleware,
  deleteContract
);

module.exports = router;