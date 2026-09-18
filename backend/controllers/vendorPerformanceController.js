 const pool = require("../config/db");

const getVendorPerformance = async (req, res) => {
  try {
    const user = req.user || {};
    const role = user.role;

    let vendorFilter = "";
    const queryParams = [];

    if (role === "Vendor") {
      const vendorId = Number(user.vendor_id);

      if (!Number.isInteger(vendorId) || vendorId <= 0) {
        return res.status(403).json({
          success: false,
          message: "Vendor account is not linked to a vendor",
        });
      }

      vendorFilter = "WHERE v.vendor_id = $1";
      queryParams.push(vendorId);
    } else if (
      ![
        "Administrator",
        "Procurement Manager",
        "Supply Chain Manager",
      ].includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view vendor performance",
      });
    }

    const result = await pool.query(
      `
      WITH order_metrics AS (
        SELECT
          po.vendor_id,
          COUNT(*) AS total_orders,
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(po.status)) = 'fulfilled'
          ) AS fulfilled_orders,
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(po.status)) = 'cancelled'
          ) AS cancelled_orders,
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(po.status)) = 'pending'
          ) AS pending_orders,
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(po.status)) = 'issued'
          ) AS issued_orders,
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(po.status)) = 'accepted'
          ) AS accepted_orders,
          COALESCE(SUM(po.order_amount), 0) AS total_order_value
        FROM purchase_orders po
        GROUP BY po.vendor_id
      ),

      delivery_metrics AS (
        SELECT
          po.vendor_id,
          COUNT(d.delivery_id) AS total_deliveries,

          COUNT(d.delivery_id) FILTER (
            WHERE LOWER(TRIM(d.delivery_status)) = 'shipping on time'
          ) AS on_time_deliveries,

          COUNT(d.delivery_id) FILTER (
            WHERE LOWER(TRIM(d.delivery_status)) = 'late delivery'
          ) AS late_deliveries,

          COUNT(d.delivery_id) FILTER (
            WHERE LOWER(TRIM(d.delivery_status)) = 'advance shipping'
          ) AS advance_deliveries,

          COUNT(d.delivery_id) FILTER (
            WHERE LOWER(TRIM(d.delivery_status)) = 'shipping canceled'
          ) AS cancelled_deliveries,

          COALESCE(
            AVG(d.late_delivery_risk),
            0
          ) AS average_late_delivery_risk

        FROM purchase_orders po

        LEFT JOIN deliveries d
          ON d.order_id = po.po_id

        GROUP BY po.vendor_id
      ),

      quality_metrics AS (
        SELECT
          po.vendor_id,

          COUNT(qi.inspection_id) AS total_inspections,

          COUNT(qi.inspection_id) FILTER (
            WHERE LOWER(TRIM(qi.inspection_result)) = 'passed'
          ) AS passed_inspections,

          COUNT(qi.inspection_id) FILTER (
            WHERE LOWER(TRIM(qi.inspection_result)) = 'failed'
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

        LEFT JOIN quality_inspection qi
          ON qi.order_id = po.po_id

        GROUP BY po.vendor_id
      ),

      communication_metrics AS (
        SELECT
          ch.vendor_id,

          COUNT(*) AS total_communications,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(ch.communication_status)) = 'resolved'
          ) AS resolved_communications,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(ch.communication_status)) = 'completed'
          ) AS completed_communications,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(ch.communication_status)) = 'closed'
          ) AS closed_communications,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(ch.communication_status)) = 'pending'
          ) AS pending_communications,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(ch.communication_status)) = 'follow-up required'
          ) AS follow_up_communications

        FROM communication_history ch

        GROUP BY ch.vendor_id
      ),

      contract_metrics AS (
        SELECT
          c.vendor_id,

          COUNT(*) AS total_contracts,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(COALESCE(c.compliance_status, ''))) = 'compliant'
          ) AS compliant_contracts,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(COALESCE(c.compliance_status, ''))) IN (
              'non-compliant',
              'non compliant'
            )
          ) AS non_compliant_contracts,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(COALESCE(c.compliance_status, ''))) = 'under review'
          ) AS under_review_contracts,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(COALESCE(c.compliance_status, ''))) = 'expired'
          ) AS expired_contracts

        FROM contracts c

        GROUP BY c.vendor_id
      ),

      existing_performance AS (
        SELECT
          vp.vendor_id,

          COALESCE(
            AVG(vp.rating),
            0
          ) AS rating,

          COALESCE(
            AVG(vp.delivery_score),
            0
          ) AS stored_delivery_score,

          COALESCE(
            AVG(vp.quality_score),
            0
          ) AS stored_quality_score,

          COALESCE(
            AVG(vp.compliance_score),
            0
          ) AS stored_compliance_score,

          MAX(vp.evaluation_date) AS latest_evaluation_date

        FROM vendor_performance vp

        GROUP BY vp.vendor_id
      )

      SELECT
        v.vendor_id,
        v.company_name,
        v.contact_person,
        v.email,
        v.phone,
        v.approval_status,
        v.category_id,

        COALESCE(om.total_orders, 0) AS total_orders,
        COALESCE(om.fulfilled_orders, 0) AS fulfilled_orders,
        COALESCE(om.cancelled_orders, 0) AS cancelled_orders,
        COALESCE(om.pending_orders, 0) AS pending_orders,
        COALESCE(om.issued_orders, 0) AS issued_orders,
        COALESCE(om.accepted_orders, 0) AS accepted_orders,
        COALESCE(om.total_order_value, 0) AS total_order_value,

        COALESCE(dm.total_deliveries, 0) AS total_deliveries,
        COALESCE(dm.on_time_deliveries, 0) AS on_time_deliveries,
        COALESCE(dm.late_deliveries, 0) AS late_deliveries,
        COALESCE(dm.advance_deliveries, 0) AS advance_deliveries,
        COALESCE(dm.cancelled_deliveries, 0) AS cancelled_deliveries,
        COALESCE(dm.average_late_delivery_risk, 0) AS average_late_delivery_risk,

        COALESCE(qm.total_inspections, 0) AS total_inspections,
        COALESCE(qm.passed_inspections, 0) AS passed_inspections,
        COALESCE(qm.failed_inspections, 0) AS failed_inspections,
        COALESCE(qm.average_quality_score, 0) AS average_quality_score,
        COALESCE(qm.total_defects, 0) AS total_defects,

        COALESCE(cm.total_communications, 0) AS total_communications,
        COALESCE(cm.resolved_communications, 0) AS resolved_communications,
        COALESCE(cm.completed_communications, 0) AS completed_communications,
        COALESCE(cm.closed_communications, 0) AS closed_communications,
        COALESCE(cm.pending_communications, 0) AS pending_communications,
        COALESCE(cm.follow_up_communications, 0) AS follow_up_communications,

        COALESCE(ct.total_contracts, 0) AS total_contracts,
        COALESCE(ct.compliant_contracts, 0) AS compliant_contracts,
        COALESCE(ct.non_compliant_contracts, 0) AS non_compliant_contracts,
        COALESCE(ct.under_review_contracts, 0) AS under_review_contracts,
        COALESCE(ct.expired_contracts, 0) AS expired_contracts,

        COALESCE(ep.rating, 0) AS rating,
        COALESCE(ep.stored_delivery_score, 0) AS stored_delivery_score,
        COALESCE(ep.stored_quality_score, 0) AS stored_quality_score,
        COALESCE(ep.stored_compliance_score, 0) AS stored_compliance_score,
        ep.latest_evaluation_date

      FROM vendors v

      LEFT JOIN order_metrics om
        ON om.vendor_id = v.vendor_id

      LEFT JOIN delivery_metrics dm
        ON dm.vendor_id = v.vendor_id

      LEFT JOIN quality_metrics qm
        ON qm.vendor_id = v.vendor_id

      LEFT JOIN communication_metrics cm
        ON cm.vendor_id = v.vendor_id

      LEFT JOIN contract_metrics ct
        ON ct.vendor_id = v.vendor_id

      LEFT JOIN existing_performance ep
        ON ep.vendor_id = v.vendor_id

      ${vendorFilter}

      ORDER BY v.vendor_id
      `,
      queryParams
    );

    const performance = result.rows.map((row) => {
      const totalOrders = Number(row.total_orders) || 0;
      const totalDeliveries = Number(row.total_deliveries) || 0;
      const onTimeDeliveries = Number(row.on_time_deliveries) || 0;
      const lateDeliveries = Number(row.late_deliveries) || 0;
      const advanceDeliveries = Number(row.advance_deliveries) || 0;
      const cancelledDeliveries = Number(row.cancelled_deliveries) || 0;

      const totalInspections = Number(row.total_inspections) || 0;
      const passedInspections = Number(row.passed_inspections) || 0;
      const failedInspections = Number(row.failed_inspections) || 0;

      const totalCommunications =
        Number(row.total_communications) || 0;

      const resolvedCommunications =
        Number(row.resolved_communications) || 0;

      const completedCommunications =
        Number(row.completed_communications) || 0;

      const closedCommunications =
        Number(row.closed_communications) || 0;

      const totalContracts = Number(row.total_contracts) || 0;
      const compliantContracts =
        Number(row.compliant_contracts) || 0;

      const deliveryScore =
        totalDeliveries > 0
          ? (onTimeDeliveries / totalDeliveries) * 100
          : Number(row.stored_delivery_score) || 0;

      const qualityScore =
        totalInspections > 0
          ? Number(row.average_quality_score) || 0
          : Number(row.stored_quality_score) || 0;

      const successfulCommunications =
        resolvedCommunications +
        completedCommunications +
        closedCommunications;

      const communicationScore =
        totalCommunications > 0
          ? (successfulCommunications / totalCommunications) * 100
          : 0;

      const complianceScore =
        totalContracts > 0
          ? (compliantContracts / totalContracts) * 100
          : Number(row.stored_compliance_score) || 0;

      const issueResolutionScore =
        totalCommunications > 0
          ? communicationScore
          : 0;

      const performanceScore =
        totalOrders > 0
          ? deliveryScore * 0.4 +
            qualityScore * 0.4 +
            complianceScore * 0.2
          : 0;

      const onTimeRate =
        totalDeliveries > 0
          ? (onTimeDeliveries / totalDeliveries) * 100
          : 0;

      const fulfillmentRate =
  totalOrders > 0
    ? (Number(row.fulfilled_orders) / totalOrders) * 100
    : 0;

const reliabilityScore =
  totalOrders > 0
    ? deliveryScore * 0.5 +
      fulfillmentRate * 0.2 +
      qualityScore * 0.2 +
      complianceScore * 0.1
    : 0;

const qualityPassRate =
  totalInspections > 0
    ? (passedInspections / totalInspections) * 100
    : 0;

      let riskStatus = "Insufficient Data";

      if (totalOrders > 0) {
        if (performanceScore >= 75) {
          riskStatus = "Low";
        } else if (performanceScore >= 50) {
          riskStatus = "Medium";
        } else {
          riskStatus = "High";
        }
      }

      return {
        vendor_id: Number(row.vendor_id),

        company_name: row.company_name,
        contact_person: row.contact_person,
        email: row.email,
        phone: row.phone,
        approval_status: row.approval_status,
        category_id: row.category_id,

        total_orders: totalOrders,

        fulfilled_orders:
          Number(row.fulfilled_orders) || 0,

        cancelled_orders:
          Number(row.cancelled_orders) || 0,

        pending_orders:
          Number(row.pending_orders) || 0,

        issued_orders:
          Number(row.issued_orders) || 0,

        accepted_orders:
          Number(row.accepted_orders) || 0,

        total_order_value:
          Number(row.total_order_value) || 0,

        total_deliveries: totalDeliveries,
        on_time_deliveries: onTimeDeliveries,
        late_deliveries: lateDeliveries,
        advance_deliveries: advanceDeliveries,
        cancelled_deliveries: cancelledDeliveries,

        average_late_delivery_risk:
          Number(row.average_late_delivery_risk) || 0,

        total_inspections: totalInspections,
        passed_inspections: passedInspections,
        failed_inspections: failedInspections,

        average_quality_score:
          Number(row.average_quality_score) || 0,

        total_defects:
          Number(row.total_defects) || 0,

        total_communications: totalCommunications,

        resolved_communications:
          resolvedCommunications,

        completed_communications:
          completedCommunications,

        closed_communications:
          closedCommunications,

        pending_communications:
          Number(row.pending_communications) || 0,

        follow_up_communications:
          Number(row.follow_up_communications) || 0,

        total_contracts: totalContracts,

        compliant_contracts:
          compliantContracts,

        non_compliant_contracts:
          Number(row.non_compliant_contracts) || 0,

        under_review_contracts:
          Number(row.under_review_contracts) || 0,

        expired_contracts:
          Number(row.expired_contracts) || 0,

        rating:
          Number(row.rating) || 0,

        delivery_score:
          Number(deliveryScore.toFixed(2)),

        quality_score:
          Number(qualityScore.toFixed(2)),

        compliance_score:
          Number(complianceScore.toFixed(2)),

        communication_score:
          Number(communicationScore.toFixed(2)),

        issue_resolution_score:
          Number(issueResolutionScore.toFixed(2)),

        on_time_rate:
          Number(onTimeRate.toFixed(2)),

        fulfillment_rate:
          Number(fulfillmentRate.toFixed(2)),

        quality_pass_rate:
          Number(qualityPassRate.toFixed(2)),

         performance_score:
  Number(performanceScore.toFixed(2)),

reliability_score:
  Number(reliabilityScore.toFixed(2)),

risk_status: riskStatus,

        latest_evaluation_date:
          row.latest_evaluation_date,
      };
    });

    const rankedPerformance = [...performance]
      .sort(
        (a, b) =>
          b.performance_score -
          a.performance_score
      )
      .map((vendor, index) => ({
        ...vendor,
        rank: index + 1,
      }));

    return res.status(200).json({
      success: true,
      count: rankedPerformance.length,
      data: rankedPerformance,
    });
  } catch (error) {
    console.error(
      "Vendor performance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load vendor performance data",
      error: error.message,
    });
  }
};

module.exports = {
  getVendorPerformance,
};