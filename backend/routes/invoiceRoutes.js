 const express = require("express");
const router = express.Router();

const {
  getVendorInvoices,
} = require("../controllers/invoiceController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getVendorInvoices);

module.exports = router;