 const pool = require("../config/db");

const {
  notifyAdmins,
  notifyRole,
  notifyVendor,
} = require("../services/notificationService");

const getVendorIdForUser = async (userId) => {
  const result = await pool.query(
    `SELECT vendor_id
     FROM users
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].vendor_id;
};

const sendNotificationSafely = async (notificationAction) => {
  try {
    await notificationAction();
  } catch (error) {
    console.error("Notification creation error:", error);
  }
};

const getPurchaseOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit) || 20, 1),
      50
    );

    const offset = (page - 1) * limit;
    const { role, user_id } = req.user;

    let vendorId = null;

    if (role === "Vendor") {
      vendorId = await getVendorIdForUser(user_id);

      if (!vendorId) {
        return res.status(403).json({
          message: "No vendor account is linked to this user",
        });
      }
    }

    const filterClause = vendorId
      ? "WHERE vendor_id = $1"
      : "";

    const filterParams = vendorId ? [vendorId] : [];

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM purchase_orders
       ${filterClause}`,
      filterParams
    );

    const total = Number(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const statusResult = await pool.query(
      `SELECT
        COUNT(*) AS total_records,
        COUNT(*) FILTER (
          WHERE LOWER(status) = 'pending'
        ) AS pending_count,
        COUNT(*) FILTER (
          WHERE LOWER(status) = 'issued'
        ) AS issued_count,
        COUNT(*) FILTER (
          WHERE LOWER(status) = 'accepted'
        ) AS accepted_count,
        COUNT(*) FILTER (
          WHERE LOWER(status) = 'fulfilled'
        ) AS fulfilled_count,
        COUNT(*) FILTER (
          WHERE LOWER(status) = 'cancelled'
        ) AS cancelled_count
       FROM purchase_orders
       ${filterClause}`,
      filterParams
    );

    const statusCounts = statusResult.rows[0];

    const queryParams = vendorId
      ? [vendorId, limit, offset]
      : [limit, offset];

    const limitPosition = vendorId ? "$2" : "$1";
    const offsetPosition = vendorId ? "$3" : "$2";

    const result = await pool.query(
      `SELECT
        po_id,
        vendor_id,
        order_amount,
        order_date,
        delivery_date,
        status,
        source_order_id
       FROM purchase_orders
       ${filterClause}
       ORDER BY po_id DESC
       LIMIT ${limitPosition} OFFSET ${offsetPosition}`,
      queryParams
    );

    res.status(200).json({
      message: "Purchase orders fetched successfully",

      purchaseOrders: result.rows,

      pagination: {
        currentPage: page,
        limit,
        totalRecords: total,
        totalPages,
      },

      summary: {
        totalRecords: Number(statusCounts.total_records),
        pendingCount: Number(statusCounts.pending_count),
        issuedCount: Number(statusCounts.issued_count),
        acceptedCount: Number(statusCounts.accepted_count),
        fulfilledCount: Number(statusCounts.fulfilled_count),
        cancelledCount: Number(statusCounts.cancelled_count),
      },
    });
  } catch (err) {
    console.log("Get purchase orders error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, user_id } = req.user;

    let vendorId = null;

    if (role === "Vendor") {
      vendorId = await getVendorIdForUser(user_id);

      if (!vendorId) {
        return res.status(403).json({
          message: "No vendor account is linked to this user",
        });
      }
    }

    const result = await pool.query(
      `SELECT
        po_id,
        vendor_id,
        order_amount,
        order_date,
        delivery_date,
        status,
        source_order_id
       FROM purchase_orders
       WHERE po_id = $1
       ${vendorId ? "AND vendor_id = $2" : ""}`,
      vendorId ? [id, vendorId] : [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Purchase order not found",
      });
    }

    res.status(200).json({
      message: "Purchase order fetched successfully",
      purchaseOrder: result.rows[0],
    });
  } catch (err) {
    console.log("Get purchase order error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const createPurchaseOrder = async (req, res) => {
  try {
    const { role } = req.user;

    if (
      role !== "Administrator" &&
      role !== "Procurement Manager"
    ) {
      return res.status(403).json({
        message:
          "Only Administrator or Procurement Manager can create purchase orders",
      });
    }

    const {
      vendor_id,
      order_amount,
      order_date,
      delivery_date,
    } = req.body;

    if (!vendor_id || !order_amount || !order_date) {
      return res.status(400).json({
        message:
          "Vendor, order amount and order date are required",
      });
    }

    if (Number(order_amount) <= 0) {
      return res.status(400).json({
        message: "Order amount must be greater than 0",
      });
    }

    const vendorResult = await pool.query(
      `SELECT vendor_id, company_name
       FROM vendors
       WHERE vendor_id = $1`,
      [vendor_id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const vendor = vendorResult.rows[0];

    const result = await pool.query(
      `INSERT INTO purchase_orders
      (
        vendor_id,
        order_amount,
        order_date,
        delivery_date,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        po_id,
        vendor_id,
        order_amount,
        order_date,
        delivery_date,
        status,
        source_order_id`,
      [
        vendor_id,
        order_amount,
        order_date,
        delivery_date || null,
        "Pending",
      ]
    );

    const purchaseOrder = result.rows[0];

    await sendNotificationSafely(() =>
      notifyVendor(
        vendor_id,
        `A new purchase order PO-${purchaseOrder.po_id} has been created for ${vendor.company_name} and is pending issuance.`
      )
    );

    res.status(201).json({
      message: "Purchase order created successfully",
      purchaseOrder,
    });
  } catch (err) {
    console.log("Create purchase order error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const updatePurchaseOrder = async (req, res) => {
  try {
    const { role } = req.user;

    if (
      role !== "Administrator" &&
      role !== "Procurement Manager"
    ) {
      return res.status(403).json({
        message:
          "Only Administrator or Procurement Manager can edit purchase orders",
      });
    }

    const { id } = req.params;

    const {
      vendor_id,
      order_amount,
      order_date,
      delivery_date,
    } = req.body;

    if (!vendor_id || !order_amount || !order_date) {
      return res.status(400).json({
        message:
          "Vendor, order amount and order date are required",
      });
    }

    if (Number(order_amount) <= 0) {
      return res.status(400).json({
        message: "Order amount must be greater than 0",
      });
    }

    const existingResult = await pool.query(
      `SELECT
        po_id,
        vendor_id,
        status
       FROM purchase_orders
       WHERE po_id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        message: "Purchase order not found",
      });
    }

    const existingPurchaseOrder = existingResult.rows[0];
    const oldVendorId = existingPurchaseOrder.vendor_id;

    const vendorResult = await pool.query(
      `SELECT vendor_id, company_name
       FROM vendors
       WHERE vendor_id = $1`,
      [vendor_id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const vendor = vendorResult.rows[0];

    const result = await pool.query(
      `UPDATE purchase_orders
       SET
         vendor_id = $1,
         order_amount = $2,
         order_date = $3,
         delivery_date = $4
       WHERE po_id = $5
       RETURNING
         po_id,
         vendor_id,
         order_amount,
         order_date,
         delivery_date,
         status,
         source_order_id`,
      [
        vendor_id,
        order_amount,
        order_date,
        delivery_date || null,
        id,
      ]
    );

    const purchaseOrder = result.rows[0];

    if (Number(oldVendorId) !== Number(vendor_id)) {
      await sendNotificationSafely(() =>
        notifyVendor(
          oldVendorId,
          `Purchase order PO-${purchaseOrder.po_id} has been reassigned to another vendor.`
        )
      );

      await sendNotificationSafely(() =>
        notifyVendor(
          vendor_id,
          `Purchase order PO-${purchaseOrder.po_id} has been assigned to ${vendor.company_name}.`
        )
      );
    } else {
      await sendNotificationSafely(() =>
        notifyVendor(
          vendor_id,
          `Purchase order PO-${purchaseOrder.po_id} has been updated.`
        )
      );
    }

    res.status(200).json({
      message: "Purchase order updated successfully",
      purchaseOrder,
    });
  } catch (err) {
    console.log("Update purchase order error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { role, user_id } = req.user;

    const allowedStatuses = [
      "Pending",
      "Issued",
      "Accepted",
      "Fulfilled",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid purchase order status",
      });
    }

    const existingResult = await pool.query(
      `SELECT
        po_id,
        vendor_id,
        status
       FROM purchase_orders
       WHERE po_id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        message: "Purchase order not found",
      });
    }

    const existingPurchaseOrder = existingResult.rows[0];
    const currentStatus = existingPurchaseOrder.status;

    if (currentStatus === status) {
      return res.status(400).json({
        message: `Purchase order is already ${status}`,
      });
    }

    if (role === "Vendor") {
      const vendorId = await getVendorIdForUser(user_id);

      if (!vendorId) {
        return res.status(403).json({
          message: "No vendor account is linked to this user",
        });
      }

      if (
        Number(existingPurchaseOrder.vendor_id) !==
        Number(vendorId)
      ) {
        return res.status(403).json({
          message:
            "You are not authorized to modify this purchase order",
        });
      }
    }

    let allowed = false;

    const errorMessage =
      "You are not authorized for this status change.";

    if (
      role === "Procurement Manager" &&
      currentStatus === "Pending" &&
      status === "Issued"
    ) {
      allowed = true;
    }

    if (
      role === "Vendor" &&
      currentStatus === "Issued" &&
      status === "Accepted"
    ) {
      allowed = true;
    }

    if (
      role === "Vendor" &&
      currentStatus === "Accepted" &&
      status === "Fulfilled"
    ) {
      allowed = true;
    }

    if (
      role === "Procurement Manager" &&
      ["Pending", "Issued", "Accepted"].includes(currentStatus) &&
      status === "Cancelled"
    ) {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({
        message: errorMessage,
        currentStatus,
        requestedStatus: status,
        role,
      });
    }

    const result = await pool.query(
      `UPDATE purchase_orders
       SET status = $1
       WHERE po_id = $2
       RETURNING
         po_id,
         vendor_id,
         order_amount,
         order_date,
         delivery_date,
         status,
         source_order_id`,
      [status, id]
    );

    const purchaseOrder = result.rows[0];
    const vendorId = purchaseOrder.vendor_id;
    const poNumber = `PO-${purchaseOrder.po_id}`;

    if (status === "Issued") {
      await sendNotificationSafely(() =>
        notifyVendor(
          vendorId,
          `Purchase order ${poNumber} has been issued and is ready for your review.`
        )
      );
    }

    if (status === "Accepted") {
      await sendNotificationSafely(() =>
        notifyAdmins(
          `Purchase order ${poNumber} has been accepted by the vendor.`
        )
      );

      await sendNotificationSafely(() =>
        notifyRole(
          "Procurement Manager",
          `Purchase order ${poNumber} has been accepted by the vendor.`
        )
      );
    }

    if (status === "Fulfilled") {
      await sendNotificationSafely(() =>
        notifyAdmins(
          `Purchase order ${poNumber} has been marked as fulfilled by the vendor.`
        )
      );

      await sendNotificationSafely(() =>
        notifyRole(
          "Supply Chain Manager",
          `Purchase order ${poNumber} has been marked as fulfilled by the vendor.`
        )
      );

      await sendNotificationSafely(() =>
        notifyRole(
          "Procurement Manager",
          `Purchase order ${poNumber} has been marked as fulfilled by the vendor.`
        )
      );
    }

    if (status === "Cancelled") {
      await sendNotificationSafely(() =>
        notifyVendor(
          vendorId,
          `Purchase order ${poNumber} has been cancelled.`
        )
      );

      await sendNotificationSafely(() =>
        notifyAdmins(
          `Purchase order ${poNumber} has been cancelled.`
        )
      );
    }

    res.status(200).json({
      message: `Purchase order status changed to ${status}`,
      purchaseOrder,
    });
  } catch (err) {
    console.log(
      "Update purchase order status error:",
      err
    );

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const deletePurchaseOrder = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "Administrator") {
      return res.status(403).json({
        message:
          "Only Administrator can delete purchase orders",
      });
    }

    const { id } = req.params;

    const existingResult = await pool.query(
      `SELECT
        po_id,
        vendor_id
       FROM purchase_orders
       WHERE po_id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        message: "Purchase order not found",
      });
    }

    const existingPurchaseOrder = existingResult.rows[0];

    const result = await pool.query(
      `DELETE FROM purchase_orders
       WHERE po_id = $1
       RETURNING po_id`,
      [id]
    );

    const deletedPurchaseOrder = result.rows[0];

    await sendNotificationSafely(() =>
      notifyVendor(
        existingPurchaseOrder.vendor_id,
        `Purchase order PO-${deletedPurchaseOrder.po_id} has been deleted by the administrator.`
      )
    );

    res.status(200).json({
      message: "Purchase order deleted successfully",
    });
  } catch (err) {
    console.log(
      "Delete purchase order error:",
      err
    );

    res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
};