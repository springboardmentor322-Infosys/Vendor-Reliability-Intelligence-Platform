 const express = require("express");

const router = express.Router();

const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} = require("../controllers/purchaseOrderController");

const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/",
  authMiddleware,
  getPurchaseOrders
);

router.get(
  "/:id",
  authMiddleware,
  getPurchaseOrderById
);

router.post(
  "/",
  authMiddleware,
  createPurchaseOrder
);

router.put(
  "/:id",
  authMiddleware,
  updatePurchaseOrder
);

router.patch(
  "/:id/status",
  authMiddleware,
  updatePurchaseOrderStatus
);

router.delete(
  "/:id",
  authMiddleware,
  deletePurchaseOrder
);

module.exports = router;