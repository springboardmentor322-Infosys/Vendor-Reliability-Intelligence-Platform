const express = require("express");
const router = express.Router();

const {
  getVendorReliability,
} = require("../controllers/vendorReliabilityController");

const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/",
  authMiddleware,
  getVendorReliability
);

module.exports = router;