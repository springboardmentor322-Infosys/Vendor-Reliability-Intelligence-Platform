const pool = require("../config/db");
const {
  notifyAdmins,
  notifyRole,
  notifyVendor,
} = require("../services/notificationService");

const ensureAuditor = (req, res) => {
  if (req.user?.role !== "Auditor") {
    res.status(403).json({
      success: false,
      message: "Only Auditors can perform inspections",
    });

    return false;
  }

  return true;
};

const sendNotificationSafely = async (callback) => {
  try {
    await callback();
  } catch (error) {
    console.error(
      "Auditor notification error:",
      error.message
    );
  }
};

const getAuditDeliveries = async (req, res) => {
  try {
    if (!ensureAuditor(req, res)) {
      return;
    }

    const result = await pool.query(`
      SELECT
        d.delivery_id,
        d.order_id,
        d.order_date,
        d.shipping_date,
        d.delivery_status,
        d.shipping_mode,
        d.late_delivery_risk,
        d.order_region,
        d.order_country,
        v.vendor_id,
        v.company_name,
        qi.inspection_id,
        qi.inspection_date,
        qi.quality_score,
        qi.inspection_result,
        qi.defect_count,
        qi.notes
      FROM deliveries d
      LEFT JOIN purchase_orders po
        ON po.source_order_id::text = d.order_id::text
      LEFT JOIN vendors v
        ON po.vendor_id = v.vendor_id
      LEFT JOIN quality_inspection qi
        ON qi.delivery_id = d.delivery_id
      ORDER BY d.delivery_id DESC
    `);

    res.status(200).json({
      success: true,
      deliveries: result.rows,
    });
  } catch (error) {
    console.error(
      "Get audit deliveries error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch deliveries for audit",
      error: error.message,
    });
  }
};

const getAuditInspections = async (req, res) => {
  try {
    if (!ensureAuditor(req, res)) {
      return;
    }

    const result = await pool.query(`
      SELECT
        qi.inspection_id,
        qi.delivery_id,
        qi.order_id,
        qi.inspection_date,
        qi.quality_score,
        qi.inspection_result,
        qi.defect_count,
        qi.notes,
        qi.created_at,
        d.delivery_status,
        d.shipping_mode,
        d.order_region,
        d.order_country,
        v.vendor_id,
        v.company_name
      FROM quality_inspection qi
      LEFT JOIN deliveries d
        ON qi.delivery_id = d.delivery_id
      LEFT JOIN purchase_orders po
        ON po.source_order_id::text = qi.order_id::text
      LEFT JOIN vendors v
        ON po.vendor_id = v.vendor_id
      ORDER BY qi.inspection_date DESC, qi.inspection_id DESC
    `);

    res.status(200).json({
      success: true,
      inspections: result.rows,
    });
  } catch (error) {
    console.error(
      "Get audit inspections error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch audit inspections",
      error: error.message,
    });
  }
};

const getAuditInspectionByDelivery = async (req, res) => {
  try {
    if (!ensureAuditor(req, res)) {
      return;
    }

    const deliveryId = Number(req.params.delivery_id);

    if (!Number.isInteger(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID",
      });
    }

    const result = await pool.query(
      `
      SELECT
        qi.inspection_id,
        qi.delivery_id,
        qi.order_id,
        qi.inspection_date,
        qi.quality_score,
        qi.inspection_result,
        qi.defect_count,
        qi.notes,
        qi.created_at,
        d.delivery_status,
        d.shipping_mode,
        d.order_region,
        d.order_country
      FROM quality_inspection qi
      LEFT JOIN deliveries d
        ON qi.delivery_id = d.delivery_id
      WHERE qi.delivery_id = $1
      ORDER BY qi.inspection_id DESC
      LIMIT 1
      `,
      [deliveryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No inspection found for this delivery",
      });
    }

    res.status(200).json({
      success: true,
      inspection: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Get audit inspection error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch inspection",
      error: error.message,
    });
  }
};

const createAuditInspection = async (req, res) => {
  try {
    if (!ensureAuditor(req, res)) {
      return;
    }

    const {
      delivery_id,
      order_id,
      inspection_date,
      quality_score,
      inspection_result,
      defect_count,
      notes,
    } = req.body;

    const deliveryId = Number(delivery_id);
    const orderId = Number(order_id);
    const qualityScore = Number(quality_score);
    const defectCount = Number(defect_count);

    if (!Number.isInteger(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: "Valid delivery_id is required",
      });
    }

    if (!Number.isInteger(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order_id is required",
      });
    }

    if (!inspection_date) {
      return res.status(400).json({
        success: false,
        message: "Inspection date is required",
      });
    }

    if (
      !Number.isFinite(qualityScore) ||
      qualityScore < 0 ||
      qualityScore > 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Quality score must be between 0 and 10",
      });
    }

    if (!Number.isInteger(defectCount) || defectCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Defect count must be a non-negative integer",
      });
    }

    if (!inspection_result) {
      return res.status(400).json({
        success: false,
        message: "Inspection result is required",
      });
    }

    const normalizedResult =
      String(inspection_result).trim();

    const allowedResults = [
      "Passed",
      "Failed",
      "Conditional",
    ];

    const matchedResult = allowedResults.find(
      (result) =>
        result.toLowerCase() ===
        normalizedResult.toLowerCase()
    );

    if (!matchedResult) {
      return res.status(400).json({
        success: false,
        message:
          "Inspection result must be Passed, Failed, or Conditional",
      });
    }

    const deliveryResult = await pool.query(
      `
      SELECT
        delivery_id,
        order_id,
        delivery_status
      FROM deliveries
      WHERE delivery_id = $1
      `,
      [deliveryId]
    );

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    const delivery = deliveryResult.rows[0];

    if (Number(delivery.order_id) !== orderId) {
      return res.status(400).json({
        success: false,
        message:
          "The selected order does not belong to this delivery",
      });
    }

    const existingInspection = await pool.query(
      `
      SELECT inspection_id
      FROM quality_inspection
      WHERE delivery_id = $1
      LIMIT 1
      `,
      [deliveryId]
    );

    if (existingInspection.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This delivery has already been inspected",
        inspection_id:
          existingInspection.rows[0].inspection_id,
      });
    }

    const inspectionResult = await pool.query(
      `
      INSERT INTO quality_inspection (
        delivery_id,
        order_id,
        inspection_date,
        quality_score,
        inspection_result,
        defect_count,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        inspection_id,
        delivery_id,
        order_id,
        inspection_date,
        quality_score,
        inspection_result,
        defect_count,
        notes,
        created_at
      `,
      [
        deliveryId,
        orderId,
        inspection_date,
        qualityScore,
        matchedResult,
        defectCount,
        notes || null,
      ]
    );

    const inspection =
      inspectionResult.rows[0];

    const hasIssue =
      matchedResult.toLowerCase() === "failed" ||
      matchedResult.toLowerCase() === "conditional" ||
      defectCount > 0;

    if (hasIssue) {
      const vendorResult = await pool.query(
        `
        SELECT
          v.vendor_id,
          v.company_name
        FROM purchase_orders po
        JOIN vendors v
          ON po.vendor_id = v.vendor_id
        WHERE po.source_order_id::text = $1::text
        LIMIT 1
        `,
        [orderId]
      );

      const vendor =
        vendorResult.rows[0] || null;

      const vendorName =
        vendor?.company_name ||
        "Unknown Vendor";

      const message =
        `Audit issue detected for delivery ${deliveryId} ` +
        `(Order ${orderId}) from ${vendorName}. ` +
        `Inspection result: ${matchedResult}. ` +
        `Defects: ${defectCount}.`;

      await sendNotificationSafely(() =>
        notifyAdmins(message)
      );

      await sendNotificationSafely(() =>
        notifyRole(
          "Supply Chain Manager",
          message
        )
      );

      if (vendor?.vendor_id) {
        await sendNotificationSafely(() =>
          notifyVendor(
            vendor.vendor_id,
            `Your delivery ${deliveryId} (Order ${orderId}) has an audit issue. Result: ${matchedResult}. Defects: ${defectCount}.`
          )
        );
      }
    }

    res.status(201).json({
      success: true,
      message: hasIssue
        ? "Inspection recorded and issue notifications sent"
        : "Inspection recorded successfully",
      inspection,
      issueDetected: hasIssue,
    });
  } catch (error) {
    console.error(
      "Create audit inspection error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to record audit inspection",
      error: error.message,
    });
  }
};

module.exports = {
  getAuditDeliveries,
  getAuditInspections,
  getAuditInspectionByDelivery,
  createAuditInspection,
};