const express = require("express");

const router = express.Router();

const {
  getVendorCategories,
} = require("../controllers/vendorCategoryController");

const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/",
  authMiddleware,
  getVendorCategories
);

module.exports = router;