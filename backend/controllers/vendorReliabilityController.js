 const pool = require("../config/db");

const getVendorReliability = async (req, res) => {
  try {
    const user = req.user || {};
    const role = user.role;
    const userId = Number(user.user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    const allowedRoles = [
      "Vendor",
      "Administrator",
      "Procurement Manager",
      "Supply Chain Manager",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view vendor reliability",
      });
    }

    /*
     * Vendor accounts are linked through:
     *
     * users.user_id
     *      ↓
     * vendors.user_id
     *
     * Do NOT depend on req.user.vendor_id because the JWT
     * does not necessarily contain vendor_id.
     */

    let vendorFilter = "";
    const queryParams = [];

    if (role === "Vendor") {
      vendorFilter = "WHERE v.user_id = $1";
      queryParams.push(userId);
    }

    const result = await pool.query(
      `
      WITH order_metrics AS (
        SELECT
          po.vendor_id,

          COUNT(DISTINCT po.po_id) AS total_orders,

          COUNT(DISTINCT po.po_id) FILTER (
            WHERE LOWER(TRIM(COALESCE(po.status, ''))) IN (
              'fulfilled',
              'delivered',
              'completed',
              'closed'
            )
          ) AS fulfilled_orders,

          COUNT(DISTINCT po.po_id) FILTER (
            WHERE LOWER(TRIM(COALESCE(po.status, ''))) IN (
              'cancelled',
              'canceled'
            )
          ) AS cancelled_orders

        FROM purchase_orders po
        GROUP BY po.vendor_id
      ),

      delivery_metrics AS (
        SELECT
          po.vendor_id,

          COUNT(DISTINCT d.delivery_id) AS total_deliveries,

          COUNT(DISTINCT d.delivery_id) FILTER (
            WHERE LOWER(TRIM(COALESCE(d.delivery_status, ''))) IN (
              'shipping on time',
              'on time',
              'delivered on time',
              'on-time',
              'on_time',
              'ontime'
            )
          ) AS on_time_deliveries,

          COUNT(DISTINCT d.delivery_id) FILTER (
            WHERE LOWER(TRIM(COALESCE(d.delivery_status, ''))) IN (
              'late delivery',
              'late',
              'delayed',
              'delayed delivery'
            )
          ) AS late_deliveries,

          COUNT(DISTINCT d.delivery_id) FILTER (
            WHERE LOWER(TRIM(COALESCE(d.delivery_status, ''))) IN (
              'advance shipping',
              'advance',
              'early delivery',
              'delivered early'
            )
          ) AS advance_deliveries,

          COUNT(DISTINCT d.delivery_id) FILTER (
            WHERE LOWER(TRIM(COALESCE(d.delivery_status, ''))) IN (
              'shipping canceled',
              'shipping cancelled',
              'cancelled',
              'canceled'
            )
          ) AS cancelled_deliveries,

          COALESCE(
            AVG(d.late_delivery_risk),
            0
          ) AS average_late_delivery_risk

        FROM purchase_orders po

        LEFT JOIN deliveries d
          ON d.order_id = COALESCE(
            po.source_order_id,
            po.po_id
          )

        GROUP BY po.vendor_id
      ),

      quality_metrics AS (
        SELECT
          po.vendor_id,

          COUNT(DISTINCT qi.inspection_id) AS total_inspections,

          COUNT(DISTINCT qi.inspection_id) FILTER (
            WHERE LOWER(TRIM(COALESCE(qi.inspection_result, ''))) IN (
              'passed',
              'pass',
              'approved'
            )
          ) AS passed_inspections,

          COUNT(DISTINCT qi.inspection_id) FILTER (
            WHERE LOWER(TRIM(COALESCE(qi.inspection_result, ''))) IN (
              'failed',
              'fail',
              'rejected'
            )
          ) AS failed_inspections,

          COALESCE(
            AVG(qi.quality_score),
            0
          ) AS average_quality_score,

          COALESCE(
            SUM(qi.defect_count),
            0
          ) AS total_defects

        FROM purchase_orders po

        LEFT JOIN deliveries d
          ON d.order_id = COALESCE(
            po.source_order_id,
            po.po_id
          )

        LEFT JOIN quality_inspection qi
          ON qi.delivery_id = d.delivery_id

        GROUP BY po.vendor_id
      )

      SELECT
        v.vendor_id,
        v.user_id,
        v.company_name,
        v.approval_status,
        v.category_id,

        COALESCE(
          om.total_orders,
          0
        ) AS total_orders,

        COALESCE(
          om.fulfilled_orders,
          0
        ) AS fulfilled_orders,

        COALESCE(
          om.cancelled_orders,
          0
        ) AS cancelled_orders,

        COALESCE(
          dm.total_deliveries,
          0
        ) AS total_deliveries,

        COALESCE(
          dm.on_time_deliveries,
          0
        ) AS on_time_deliveries,

        COALESCE(
          dm.late_deliveries,
          0
        ) AS late_deliveries,

        COALESCE(
          dm.advance_deliveries,
          0
        ) AS advance_deliveries,

        COALESCE(
          dm.cancelled_deliveries,
          0
        ) AS cancelled_deliveries,

        COALESCE(
          dm.average_late_delivery_risk,
          0
        ) AS average_late_delivery_risk,

        COALESCE(
          qm.total_inspections,
          0
        ) AS total_inspections,

        COALESCE(
          qm.passed_inspections,
          0
        ) AS passed_inspections,

        COALESCE(
          qm.failed_inspections,
          0
        ) AS failed_inspections,

        COALESCE(
          qm.average_quality_score,
          0
        ) AS average_quality_score,

        COALESCE(
          qm.total_defects,
          0
        ) AS total_defects

      FROM vendors v

      LEFT JOIN order_metrics om
        ON om.vendor_id = v.vendor_id

      LEFT JOIN delivery_metrics dm
        ON dm.vendor_id = v.vendor_id

      LEFT JOIN quality_metrics qm
        ON qm.vendor_id = v.vendor_id

      ${vendorFilter}

      ORDER BY v.vendor_id
      `,
      queryParams
    );

    const reliability = result.rows.map((row) => {
      const totalOrders = Number(row.total_orders) || 0;
      const fulfilledOrders = Number(row.fulfilled_orders) || 0;
      const cancelledOrders = Number(row.cancelled_orders) || 0;

      const totalDeliveries = Number(row.total_deliveries) || 0;
      const onTimeDeliveries =
        Number(row.on_time_deliveries) || 0;
      const lateDeliveries =
        Number(row.late_deliveries) || 0;
      const advanceDeliveries =
        Number(row.advance_deliveries) || 0;
      const cancelledDeliveries =
        Number(row.cancelled_deliveries) || 0;

      const totalInspections =
        Number(row.total_inspections) || 0;
      const passedInspections =
        Number(row.passed_inspections) || 0;
      const failedInspections =
        Number(row.failed_inspections) || 0;

      const averageQualityScore =
        Number(row.average_quality_score) || 0;

      const totalDefects =
        Number(row.total_defects) || 0;

      const averageLateDeliveryRisk =
        Number(row.average_late_delivery_risk) || 0;

      /*
       * DELIVERY
       */
      const onTimeRate =
        totalDeliveries > 0
          ? (onTimeDeliveries / totalDeliveries) * 100
          : 0;

      const deliveryConsistency =
        totalDeliveries > 0
          ? ((onTimeDeliveries + advanceDeliveries) /
              totalDeliveries) *
            100
          : 0;

      const lateDeliveryRate =
        totalDeliveries > 0
          ? (lateDeliveries / totalDeliveries) * 100
          : 0;

      const cancellationDeliveryRate =
        totalDeliveries > 0
          ? (cancelledDeliveries / totalDeliveries) * 100
          : 0;

      /*
       * QUALITY
       */
      const qualityPassRate =
        totalInspections > 0
          ? (passedInspections / totalInspections) * 100
          : 0;

      const defectRate =
        totalInspections > 0
          ? (totalDefects / totalInspections) * 100
          : 0;

      /*
       * FULFILLMENT
       */
      const fulfillmentRate =
        totalOrders > 0
          ? (fulfilledOrders / totalOrders) * 100
          : 0;

      const cancellationRate =
        totalOrders > 0
          ? (cancelledOrders / totalOrders) * 100
          : 0;

      /*
       * RELIABILITY SCORE
       *
       * Delivery       40%
       * Quality        30%
       * Fulfillment    20%
       * Consistency    10%
       */
      let reliabilityScore = 0;

      const hasOperationalData =
        totalOrders > 0 ||
        totalDeliveries > 0 ||
        totalInspections > 0;

      if (hasOperationalData) {
        reliabilityScore =
          onTimeRate * 0.4 +
          qualityPassRate * 0.3 +
          fulfillmentRate * 0.2 +
          deliveryConsistency * 0.1;
      }

      reliabilityScore = Math.min(
        100,
        Math.max(0, reliabilityScore)
      );

      /*
       * STATUS
       */
      let reliabilityStatus = "Insufficient Data";

      if (hasOperationalData) {
        if (reliabilityScore >= 80) {
          reliabilityStatus = "Highly Reliable";
        } else if (reliabilityScore >= 65) {
          reliabilityStatus = "Reliable";
        } else if (reliabilityScore >= 50) {
          reliabilityStatus = "Moderately Reliable";
        } else {
          reliabilityStatus = "At Risk";
        }
      }

      return {
        vendor_id: Number(row.vendor_id),

        user_id: Number(row.user_id),

        company_name:
          row.company_name || "Unknown Vendor",

        approval_status:
          row.approval_status || "Pending",

        category_id:
          row.category_id,

        total_orders:
          totalOrders,

        fulfilled_orders:
          fulfilledOrders,

        cancelled_orders:
          cancelledOrders,

        total_deliveries:
          totalDeliveries,

        on_time_deliveries:
          onTimeDeliveries,

        late_deliveries:
          lateDeliveries,

        advance_deliveries:
          advanceDeliveries,

        cancelled_deliveries:
          cancelledDeliveries,

        total_inspections:
          totalInspections,

        passed_inspections:
          passedInspections,

        failed_inspections:
          failedInspections,

        average_quality_score:
          Number(
            averageQualityScore.toFixed(2)
          ),

        total_defects:
          totalDefects,

        average_late_delivery_risk:
          Number(
            averageLateDeliveryRisk.toFixed(2)
          ),

        on_time_rate:
          Number(onTimeRate.toFixed(2)),

        delivery_consistency:
          Number(
            deliveryConsistency.toFixed(2)
          ),

        quality_pass_rate:
          Number(
            qualityPassRate.toFixed(2)
          ),

        fulfillment_rate:
          Number(
            fulfillmentRate.toFixed(2)
          ),

        cancellation_rate:
          Number(
            cancellationRate.toFixed(2)
          ),

        cancellation_delivery_rate:
          Number(
            cancellationDeliveryRate.toFixed(2)
          ),

        late_delivery_rate:
          Number(
            lateDeliveryRate.toFixed(2)
          ),

        defect_rate:
          Number(
            defectRate.toFixed(2)
          ),

        reliability_score:
          Number(
            reliabilityScore.toFixed(2)
          ),

        reliability_status:
          reliabilityStatus,
      };
    });

    /*
     * Rank vendors by reliability.
     */
    const rankedReliability = [...reliability]
      .sort(
        (a, b) =>
          b.reliability_score -
          a.reliability_score
      )
      .map((vendor, index) => ({
        ...vendor,
        rank: index + 1,
      }));

    return res.status(200).json({
      success: true,
      count: rankedReliability.length,
      data: rankedReliability,
    });
  } catch (error) {
    console.error(
      "Vendor reliability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load vendor reliability data",
      error: error.message,
    });
  }
};

module.exports = {
  getVendorReliability,
};