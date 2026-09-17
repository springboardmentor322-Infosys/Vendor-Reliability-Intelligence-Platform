 const pool = require("../config/db");

    const getAdminDashboard = async (req, res) => {
  try {
    /* =========================================================
       KPI DATA
    ========================================================= */

    const usersResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM users
    `);

    /* =========================================================
       ALL USERS
       Used by Admin User Management page
    ========================================================= */

    const usersListResult = await pool.query(`
      SELECT
        user_id,
        full_name,
        email,
        phone,
        role_id,
        status,
        created_at,
        vendor_id
      FROM users
      ORDER BY user_id ASC
    `);

    const vendorsResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM vendors
      WHERE LOWER(TRIM(approval_status)) = 'approved'
    `);

    const procurementResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM procurement_requests
    `);

    const openRequestsResult = await pool.query(`
  SELECT COUNT(*) AS total
  FROM procurement_requests
  WHERE LOWER(TRIM(status)) = 'pending'
`);

    const purchaseOrdersResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM purchase_orders
    `);

    /* =========================================================
       CONTRACT COMPLIANCE
    ========================================================= */

    const contractsResult = await pool.query(`
      SELECT
        COUNT(*) AS total,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(compliance_status)) = 'compliant'
        ) AS compliant,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(compliance_status)) = 'non-compliant'
        ) AS non_compliant,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(compliance_status)) = 'under review'
        ) AS under_review

      FROM contracts
    `);

    const totalContracts =
      Number(contractsResult.rows[0].total) || 0;

    const compliantContracts =
      Number(contractsResult.rows[0].compliant) || 0;

    const nonCompliantContracts =
      Number(contractsResult.rows[0].non_compliant) || 0;

    const underReviewContracts =
      Number(contractsResult.rows[0].under_review) || 0;

    const complianceScore =
      totalContracts > 0
        ? Number(
            (
              (compliantContracts / totalContracts) *
              100
            ).toFixed(1)
          )
        : 0;

    /* =========================================================
       PROCUREMENT REQUEST STATUS
    ========================================================= */

    const procurementStatusResult = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(status), ''), 'Unknown') AS status,
        COUNT(*) AS count
      FROM procurement_requests
      GROUP BY COALESCE(NULLIF(TRIM(status), ''), 'Unknown')
      ORDER BY count DESC
    `);

    const procurementStatus =
      procurementStatusResult.rows.map((row) => ({
        status: row.status,
        count: Number(row.count) || 0,
      }));

    /* =========================================================
       VENDOR APPROVAL STATUS
    ========================================================= */

    const vendorStatusResult = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(approval_status), ''), 'Unknown') AS status,
        COUNT(*) AS count
      FROM vendors
      GROUP BY COALESCE(NULLIF(TRIM(approval_status), ''), 'Unknown')
      ORDER BY count DESC
    `);

    const vendorStatus =
      vendorStatusResult.rows.map((row) => ({
        status: row.status,
        count: Number(row.count) || 0,
      }));

    /* =========================================================
       PURCHASE ORDER STATUS
    ========================================================= */

    const purchaseOrderStatusResult = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(status), ''), 'Unknown') AS status,
        COUNT(*) AS count
      FROM purchase_orders
      GROUP BY COALESCE(NULLIF(TRIM(status), ''), 'Unknown')
      ORDER BY count DESC
    `);

    const purchaseOrderStatus =
      purchaseOrderStatusResult.rows.map((row) => ({
        status: row.status,
        count: Number(row.count) || 0,
      }));

    /* =========================================================
       PURCHASE ORDER SPEND
    ========================================================= */

    const purchaseOrderSpendResult = await pool.query(`
      SELECT
        COALESCE(SUM(order_amount), 0) AS total_spend,
        COALESCE(AVG(order_amount), 0) AS average_order_value,
        COALESCE(MAX(order_amount), 0) AS highest_order_value
      FROM purchase_orders
    `);

    const purchaseOrderSpend = {
      totalSpend:
        Number(
          purchaseOrderSpendResult.rows[0].total_spend
        ) || 0,

      averageOrderValue:
        Number(
          purchaseOrderSpendResult.rows[0].average_order_value
        ) || 0,

      highestOrderValue:
        Number(
          purchaseOrderSpendResult.rows[0].highest_order_value
        ) || 0,
    };

    /* =========================================================
       RECENT VENDORS
    ========================================================= */

    const recentVendorsResult = await pool.query(`
      SELECT
        v.vendor_id,
        v.company_name,
        vc.category_name AS category,
        v.approval_status,
        v.created_at
      FROM vendors v
      LEFT JOIN vendor_categories vc
        ON v.category_id = vc.category_id
      ORDER BY v.created_at DESC
      LIMIT 5
    `);

    /* =========================================================
       RECENT PURCHASE ORDERS
    ========================================================= */

    const recentPurchaseOrdersResult = await pool.query(`
      SELECT
        po.po_id,
        po.vendor_id,
        v.company_name,
        po.order_amount,
        po.status,
        po.order_date
      FROM purchase_orders po
      LEFT JOIN vendors v
        ON po.vendor_id = v.vendor_id
      ORDER BY po.order_date DESC
      LIMIT 5
    `);

    /* =========================================================
       RECENT NOTIFICATIONS
    ========================================================= */

    const notificationsResult = await pool.query(`
      SELECT
        notification_id,
        user_id,
        message,
        is_read,
        created_at
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 5
    `);

    /* =========================================================
       COMMUNICATION SUMMARY
    ========================================================= */

    const communicationResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE LOWER(TRIM(communication_status)) = 'completed'
        ) AS completed,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(communication_status)) = 'pending'
        ) AS pending,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(communication_status)) IN (
            'follow-up required',
            'follow up required',
            'follow-up'
          )
        ) AS follow_up_required

      FROM communication_history
    `);

    /* =========================================================
       RESPONSE
    ========================================================= */

    res.status(200).json({
      success: true,

      stats: {
        /* KPI CARDS */

        totalUsers:
          Number(usersResult.rows[0].total) || 0,

        activeVendors:
          Number(vendorsResult.rows[0].total) || 0,

        procurementRequests:
          Number(procurementResult.rows[0].total) || 0,
 
          openRequests:
  Number(openRequestsResult.rows[0].total) || 0,

        purchaseOrders:
          Number(purchaseOrdersResult.rows[0].total) || 0,

        /* COMPLIANCE */

        contracts: totalContracts,

        complianceScore,

        compliance: {
          total: totalContracts,
          compliant: compliantContracts,
          nonCompliant: nonCompliantContracts,
          underReview: underReviewContracts,
        },

        /* CHART DATA */

        procurementStatus,

        vendorStatus,

        purchaseOrderStatus,

        purchaseOrderSpend,

        /* RECENT DATA */

        recentVendors:
          recentVendorsResult.rows,

        recentPurchaseOrders:
          recentPurchaseOrdersResult.rows,

        notifications:
          notificationsResult.rows,

        /* COMMUNICATIONS */

        communications: {
          completed:
            Number(
              communicationResult.rows[0].completed
            ) || 0,

          pending:
            Number(
              communicationResult.rows[0].pending
            ) || 0,

          followUpRequired:
            Number(
              communicationResult.rows[0]
                .follow_up_required
            ) || 0,
        },
      },

      /* =======================================================
         USER MANAGEMENT DATA
         ======================================================= */

      users: usersListResult.rows,
    });

  } catch (error) {
    console.error(
      "Admin Dashboard Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard data",
      error: error.message,
    });
  }
};
  
const getProcurementDashboard = async (req, res) => {
  try {
    const requestsResult = await pool.query(`
      SELECT
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'pending'
        ) AS pending_requests,
        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN ('approved', 'accepted')
        ) AS approved_requests,
        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN ('rejected', 'cancelled', 'canceled')
        ) AS rejected_requests
      FROM procurement_requests
    `);

    const requestValueResult = await pool.query(`
      SELECT
        COALESCE(
          SUM(
            COALESCE(quantity, 0) *
            COALESCE(estimated_cost, 0)
          ),
          0
        ) AS total_value
      FROM procurement_items
    `);

    const ordersResult = await pool.query(`
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(order_amount), 0) AS total_spend,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'pending'
        ) AS pending,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN ('issued', 'ordered')
        ) AS issued,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'accepted'
        ) AS accepted,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN (
            'fulfilled',
            'completed',
            'delivered'
          )
        ) AS fulfilled,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN ('cancelled', 'canceled')
        ) AS cancelled,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN (
            'issued',
            'accepted',
            'ordered',
            'processing',
            'in progress',
            'shipped'
          )
        ) AS active
      FROM purchase_orders
    `);

    const orderStatusResult = await pool.query(`
      SELECT
        LOWER(TRIM(status)) AS status,
        COUNT(*) AS count
      FROM purchase_orders
      GROUP BY LOWER(TRIM(status))
      ORDER BY
        CASE LOWER(TRIM(status))
          WHEN 'pending' THEN 1
          WHEN 'issued' THEN 2
          WHEN 'accepted' THEN 3
          WHEN 'fulfilled' THEN 4
          WHEN 'completed' THEN 5
          WHEN 'delivered' THEN 6
          WHEN 'cancelled' THEN 7
          ELSE 8
        END
    `);

    const recentOrdersResult = await pool.query(`
      SELECT
        po.po_id,
        po.vendor_id,
        po.order_amount,
        po.order_date,
        po.delivery_date,
        po.status,
        v.company_name,
        vc.category_name AS category
      FROM purchase_orders po
      LEFT JOIN vendors v
        ON po.vendor_id = v.vendor_id
      LEFT JOIN vendor_categories vc
        ON v.category_id = vc.category_id
      WHERE po.vendor_id IS NOT NULL
      ORDER BY
        po.order_date DESC NULLS LAST,
        po.po_id DESC
      LIMIT 8
    `);

    const activeVendorsResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM vendors
      WHERE LOWER(TRIM(approval_status)) IN (
        'approved',
        'active'
      )
    `);

    const activeContractsResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM contracts
      WHERE LOWER(TRIM(status)) = 'active'
    `);

    const monthlySpendResult = await pool.query(`
      SELECT
        TO_CHAR(
          DATE_TRUNC('month', order_date),
          'Mon YYYY'
        ) AS month,
        DATE_TRUNC('month', order_date) AS month_date,
        COUNT(*) AS orders,
        COALESCE(SUM(order_amount), 0) AS amount
      FROM purchase_orders
      WHERE order_date IS NOT NULL
        AND order_date >= (
          SELECT
            DATE_TRUNC('month', MAX(order_date))
            - INTERVAL '11 months'
          FROM purchase_orders
        )
      GROUP BY DATE_TRUNC('month', order_date)
      ORDER BY month_date ASC
    `);

    const deliveryResult = await pool.query(`
      SELECT
        COUNT(*) AS total,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(delivery_status)) LIKE '%late%'
        ) AS delayed,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(delivery_status)) LIKE '%advance%'
        ) AS advance,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(delivery_status)) LIKE '%on time%'
        ) AS on_time,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(delivery_status)) NOT LIKE '%late%'
            AND LOWER(TRIM(delivery_status)) NOT LIKE '%advance%'
            AND LOWER(TRIM(delivery_status)) NOT LIKE '%on time%'
            AND LOWER(TRIM(delivery_status)) NOT LIKE '%cancel%'
        ) AS other
      FROM deliveries
    `);

    const inTransitResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM purchase_orders
      WHERE LOWER(TRIM(status)) IN (
        'issued',
        'accepted',
        'ordered',
        'processing',
        'in progress',
        'shipped'
      )
    `);

    const upcomingDeliveriesResult = await pool.query(`
      SELECT
        po.po_id,
        po.vendor_id,
        v.company_name,
        po.order_amount,
        po.order_date,
        po.delivery_date,
        po.status,

        (
          po.delivery_date::date -
          CURRENT_DATE
        ) AS days_remaining,

        CASE
          WHEN po.delivery_date::date < CURRENT_DATE
            THEN 'Overdue'
          WHEN po.delivery_date::date = CURRENT_DATE
            THEN 'Due Today'
          WHEN po.delivery_date::date <= CURRENT_DATE + INTERVAL '7 days'
            THEN 'Due Soon'
          ELSE 'Upcoming'
        END AS delivery_attention

      FROM purchase_orders po

      LEFT JOIN vendors v
        ON po.vendor_id = v.vendor_id

      WHERE po.vendor_id IS NOT NULL
        AND po.delivery_date IS NOT NULL
        AND po.delivery_date::date >= CURRENT_DATE - INTERVAL '30 days'
        AND po.delivery_date::date <= CURRENT_DATE + INTERVAL '30 days'
        AND LOWER(TRIM(po.status)) NOT IN (
          'fulfilled',
          'completed',
          'delivered',
          'cancelled',
          'canceled'
        )

      ORDER BY
        CASE
          WHEN po.delivery_date::date < CURRENT_DATE THEN 0
          ELSE 1
        END,
        po.delivery_date ASC,
        po.po_id ASC

      LIMIT 8
    `);

    const contractAlertsResult = await pool.query(`
      SELECT
        c.contract_id,
        c.vendor_id,
        c.contract_title,
        c.end_date,
        c.contract_value,
        c.status,
        v.company_name,

        (
          c.end_date::date -
          CURRENT_DATE
        ) AS days_remaining

      FROM contracts c

      LEFT JOIN vendors v
        ON c.vendor_id = v.vendor_id

      WHERE c.end_date IS NOT NULL
        AND (
          c.end_date::date <= CURRENT_DATE + INTERVAL '90 days'
          OR LOWER(TRIM(c.status)) = 'expired'
        )

      ORDER BY c.end_date ASC
      LIMIT 6
    `);

    const vendorPerformanceResult = await pool.query(`
      SELECT
        v.vendor_id,
        v.company_name,
        vc.category_name AS category,

        vp.delivery_score,
        vp.quality_score,
        vp.compliance_score,
        vp.rating,

        COALESCE(del.delivery_count, 0) AS delivery_count,
        COALESCE(del.late_count, 0) AS late_count,
        COALESCE(del.successful_count, 0) AS successful_count,

        COALESCE(qi.inspection_count, 0) AS inspection_count,
        COALESCE(qi.average_quality, 0) AS average_quality,

        COALESCE(po_count.purchase_orders, 0) AS purchase_orders

      FROM vendors v

      LEFT JOIN vendor_categories vc
        ON v.category_id = vc.category_id

      LEFT JOIN LATERAL (
        SELECT
          AVG(delivery_score) AS delivery_score,
          AVG(quality_score) AS quality_score,
          AVG(compliance_score) AS compliance_score,
          AVG(rating) AS rating
        FROM vendor_performance
        WHERE vendor_id = v.vendor_id
      ) vp ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS delivery_count,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(d.delivery_status)) LIKE '%late%'
          ) AS late_count,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(d.delivery_status)) LIKE '%advance%'
               OR LOWER(TRIM(d.delivery_status)) LIKE '%on time%'
          ) AS successful_count

        FROM deliveries d

        INNER JOIN purchase_orders po
          ON (
            d.order_id = po.po_id
            OR d.order_id = po.source_order_id
          )

        WHERE po.vendor_id = v.vendor_id
      ) del ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS inspection_count,
          AVG(qi.quality_score) AS average_quality
        FROM quality_inspection qi

        INNER JOIN purchase_orders po
          ON (
            qi.order_id = po.po_id
            OR qi.order_id = po.source_order_id
          )

        WHERE po.vendor_id = v.vendor_id
      ) qi ON TRUE

      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS purchase_orders
        FROM purchase_orders
        WHERE vendor_id = v.vendor_id
      ) po_count ON TRUE

      WHERE LOWER(TRIM(v.approval_status)) IN (
        'approved',
        'active'
      )

      ORDER BY v.company_name
    `);

    const requests = requestsResult.rows[0];
    const orders = ordersResult.rows[0];
    const deliveries = deliveryResult.rows[0];

    const requestsTotal =
      Number(requests.total_requests) || 0;

    const pendingRequests =
      Number(requests.pending_requests) || 0;

    const approvedRequests =
      Number(requests.approved_requests) || 0;

    const rejectedRequests =
      Number(requests.rejected_requests) || 0;

    const totalEstimatedRequestValue =
      Number(requestValueResult.rows[0].total_value) || 0;

    const totalOrders =
      Number(orders.total_orders) || 0;

    const pendingOrders =
      Number(orders.pending) || 0;

    const issuedOrders =
      Number(orders.issued) || 0;

    const acceptedOrders =
      Number(orders.accepted) || 0;

    const fulfilledOrders =
      Number(orders.fulfilled) || 0;

    const cancelledOrders =
      Number(orders.cancelled) || 0;

    const activeOrders =
      Number(orders.active) || 0;

    const totalSpend =
      Number(orders.total_spend) || 0;

    const fulfillmentRate =
      totalOrders > 0
        ? Number(
            (
              (fulfilledOrders / totalOrders) *
              100
            ).toFixed(1)
          )
        : 0;

    const totalDeliveries =
      Number(deliveries.total) || 0;

    const delayedDeliveries =
      Number(deliveries.delayed) || 0;

    const advanceDeliveries =
      Number(deliveries.advance) || 0;

    const onTimeDeliveryRecords =
      Number(deliveries.on_time) || 0;

    const otherDeliveryRecords =
      Number(deliveries.other) || 0;

    const successfulDeliveries =
      advanceDeliveries +
      onTimeDeliveryRecords;

    const onTimeRate =
      totalDeliveries > 0
        ? Number(
            (
              (successfulDeliveries /
                totalDeliveries) *
              100
            ).toFixed(1)
          )
        : 0;

    const monthlySpend =
      monthlySpendResult.rows.map(row => ({
        label: row.month,
        value: Number(row.amount) || 0,
        orders: Number(row.orders) || 0
      }));

    const procurementStatusData = [
      {
        label: "Pending",
        value: pendingRequests,
        color: "#f59e0b"
      },
      {
        label: "Approved",
        value: approvedRequests,
        color: "#22c55e"
      },
      {
        label: "Rejected",
        value: rejectedRequests,
        color: "#ef4444"
      }
    ];

    const statusRows = orderStatusResult.rows;

    const getStatusCount = statuses => {
      return statusRows
        .filter(row =>
          statuses.includes(
            String(row.status).toLowerCase()
          )
        )
        .reduce(
          (sum, row) =>
            sum + (Number(row.count) || 0),
          0
        );
    };

    const poStatusData = {
      pending: getStatusCount(["pending"]),
      issued: getStatusCount([
        "issued",
        "ordered"
      ]),
      accepted: getStatusCount(["accepted"]),
      fulfilled: getStatusCount([
        "fulfilled",
        "completed",
        "delivered"
      ]),
      cancelled: getStatusCount([
        "cancelled",
        "canceled"
      ])
    };

    const vendorPerformance =
      vendorPerformanceResult.rows.map(vendor => {
        const storedDelivery =
          vendor.delivery_score !== null
            ? Number(vendor.delivery_score)
            : null;

        const storedQuality =
          vendor.quality_score !== null
            ? Number(vendor.quality_score)
            : null;

        const compliance =
          vendor.compliance_score !== null
            ? Number(vendor.compliance_score)
            : null;

        const rating =
          vendor.rating !== null
            ? Number(vendor.rating)
            : null;

        const deliveryCount =
          Number(vendor.delivery_count) || 0;

        const lateCount =
          Number(vendor.late_count) || 0;

        const successfulCount =
          Number(vendor.successful_count) || 0;

        const inspectionCount =
          Number(vendor.inspection_count) || 0;

        const averageQuality =
          Number(vendor.average_quality) || 0;

        let deliveryScore = storedDelivery;

        if (deliveryCount > 0) {
          deliveryScore =
            Number(
              (
                (successfulCount /
                  deliveryCount) *
                100
              ).toFixed(2)
            );
        }

        let qualityScore = storedQuality;

        if (inspectionCount > 0) {
          qualityScore =
            Number(
              averageQuality.toFixed(2)
            );
        }

        const scoreValues = [];

        if (
          deliveryScore !== null &&
          Number.isFinite(deliveryScore)
        ) {
          scoreValues.push(
            Math.min(
              100,
              Math.max(0, deliveryScore)
            )
          );
        }

        if (
          qualityScore !== null &&
          Number.isFinite(qualityScore)
        ) {
          scoreValues.push(
            Math.min(
              100,
              Math.max(0, qualityScore)
            )
          );
        }

        if (
          compliance !== null &&
          Number.isFinite(compliance)
        ) {
          scoreValues.push(
            Math.min(
              100,
              Math.max(0, compliance)
            )
          );
        }

        if (
          rating !== null &&
          Number.isFinite(rating)
        ) {
          scoreValues.push(
            Math.min(
              100,
              Math.max(0, rating)
            )
          );
        }

        const performance =
          scoreValues.length > 0
            ? Number(
                (
                  scoreValues.reduce(
                    (sum, value) =>
                      sum + value,
                    0
                  ) /
                  scoreValues.length
                ).toFixed(2)
              )
            : null;

        let riskStatus = "Insufficient Data";

        if (performance !== null) {
          if (performance >= 75) {
            riskStatus = "Low";
          } else if (performance >= 50) {
            riskStatus = "Medium";
          } else {
            riskStatus = "High";
          }
        }

        return {
          vendorId:
            Number(vendor.vendor_id),

          companyName:
            vendor.company_name,

          category:
            vendor.category ||
            "Not specified",

          purchaseOrders:
            Number(vendor.purchase_orders) || 0,

          delivery:
            deliveryScore !== null
              ? Number(
                  deliveryScore.toFixed(2)
                )
              : null,

          quality:
            qualityScore !== null
              ? Number(
                  qualityScore.toFixed(2)
                )
              : null,

          compliance:
            compliance !== null
              ? Number(
                  compliance.toFixed(2)
                )
              : null,

          rating,

          performance,

          reliability: performance,

          riskStatus,

          deliveryRecords:
            deliveryCount,

          lateDeliveries:
            lateCount,

          inspectionRecords:
            inspectionCount
        };
      });

    const rankedVendors =
      vendorPerformance
        .filter(
          vendor =>
            vendor.performance !== null
        )
        .sort(
          (a, b) =>
            b.performance -
            a.performance
        )
        .map((vendor, index) => ({
          ...vendor,
          rank: index + 1,
          selectionStatus:
            "Historical performance data"
        }));

    const insufficientDataVendors =
      vendorPerformance
        .filter(
          vendor =>
            vendor.performance === null
        )
        .map(vendor => ({
          ...vendor,
          rank: null,
          selectionStatus:
            "Insufficient Data"
        }));

    const approvedVendors =
      Number(
        activeVendorsResult.rows[0].total
      ) || 0;

    const totalVendors =
      vendorPerformance.length;

    const comparableVendors =
      rankedVendors.length;

    const averageReliability =
      comparableVendors > 0
        ? Number(
            (
              rankedVendors.reduce(
                (sum, vendor) =>
                  sum +
                  Number(
                    vendor.reliability
                  ),
                0
              ) /
              comparableVendors
            ).toFixed(1)
          )
        : 0;

    const riskSummary = {
      low:
        rankedVendors.filter(
          vendor =>
            vendor.riskStatus === "Low"
        ).length,

      medium:
        rankedVendors.filter(
          vendor =>
            vendor.riskStatus === "Medium"
        ).length,

      high:
        rankedVendors.filter(
          vendor =>
            vendor.riskStatus === "High"
        ).length,

      insufficient:
        insufficientDataVendors.length
    };

    const recentPurchaseOrders =
      recentOrdersResult.rows.map(order => ({
        poId: order.po_id,
        vendorId: order.vendor_id,
        vendorName:
          order.company_name ||
          "Unassigned Vendor",
        amount:
          Number(order.order_amount) || 0,
        orderAmount:
          Number(order.order_amount) || 0,
        orderDate: order.order_date,
        deliveryDate: order.delivery_date,
        status:
          order.status || "Unknown",
        category:
          order.category ||
          "Not specified"
      }));

    const upcomingDeliveries =
      upcomingDeliveriesResult.rows.map(
        delivery => ({
          poId: delivery.po_id,
          vendorId: delivery.vendor_id,
          vendorName:
            delivery.company_name ||
            "Unassigned Vendor",
          amount:
            Number(delivery.order_amount) || 0,
          orderDate: delivery.order_date,
          deliveryDate:
            delivery.delivery_date,
          status:
            delivery.status || "Unknown",
          daysRemaining:
            Number(
              delivery.days_remaining
            ) || 0,
          deliveryAttention:
            delivery.delivery_attention
        })
      );

    const contractExpiryAlerts =
      contractAlertsResult.rows.map(
        contract => ({
          contractId:
            contract.contract_id,
          contractName:
            contract.contract_title ||
            "Vendor Contract",
          vendorId:
            contract.vendor_id,
          vendorName:
            contract.company_name ||
            "Unknown Vendor",
          expiryDate:
            contract.end_date,
          endDate:
            contract.end_date,
          status:
            contract.status,
          contractValue:
            Number(
              contract.contract_value
            ) || 0,
          daysRemaining:
            Number(
              contract.days_remaining
            ) || 0
        })
      );

    const inTransit =
      Number(
        inTransitResult.rows[0].total
      ) || 0;

    res.status(200).json({
      success: true,
      stats: {
        procurementRequests: {
          total: requestsTotal,
          pending: pendingRequests,
          approved: approvedRequests,
          rejected: rejectedRequests,
          estimatedValue:
            totalEstimatedRequestValue
        },

        purchaseOrders: {
          total: totalOrders,
          pending: pendingOrders,
          issued: issuedOrders,
          accepted: acceptedOrders,
          fulfilled: fulfilledOrders,
          cancelled: cancelledOrders,
          active: activeOrders,
          totalValue: totalSpend,
          fulfillmentRate
        },

        totalProcurementValue:
          totalSpend,

        activeVendors:
          approvedVendors,

        vendorComparisonSummary: {
          totalVendors,
          approvedVendors,
          comparableVendors,
          insufficientDataVendors:
            insufficientDataVendors.length
        },

        activeContracts:
          Number(
            activeContractsResult.rows[0].total
          ) || 0,

        contracts: {
          active:
            Number(
              activeContractsResult.rows[0].total
            ) || 0,
          total:
            contractExpiryAlerts.length
        },

        deliveries: {
          total: totalDeliveries,
          onTime:
            onTimeDeliveryRecords,
          onTimeDeliveries:
            successfulDeliveries,
          advance:
            advanceDeliveries,
          delayed:
            delayedDeliveries,
          other:
            otherDeliveryRecords,
          onTimeRate,
          inTransit
        },

        averageReliability,

        riskSummary,

        procurementStatus:
          procurementStatusData,

        purchaseOrderStatus:
          poStatusData,

        spendingByMonth:
          monthlySpend,

        monthlySpend:
          monthlySpend,

        vendorSelection:
          rankedVendors,

        vendorPerformance:
          rankedVendors,

        insufficientDataVendors,

        recentPurchaseOrders:
          recentPurchaseOrders,

        upcomingDeliveries:
          upcomingDeliveries,

        contractExpiryAlerts:
          contractExpiryAlerts,

        deliveryStatus: {
          total: totalDeliveries,
          onTime:
            onTimeDeliveryRecords,
          onTimeDeliveries:
            successfulDeliveries,
          advance:
            advanceDeliveries,
          delayed:
            delayedDeliveries,
          onTimeRate
        }
      }
    });
  } catch (error) {
    console.error(
      "Procurement dashboard error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to load procurement dashboard",
      error: error.message
    });
  }
};
 

 const getSupplyChainDashboard = async (req, res) => {
  try {
    /* =========================================================
       DELIVERY SUMMARY
    ========================================================= */

    const deliveriesResult = await pool.query(`
      SELECT
        COUNT(*) AS total_deliveries,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(delivery_status)) LIKE '%advance%'
        ) AS advance_shipping,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(delivery_status)) LIKE '%late%'
        ) AS late_delivery,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(delivery_status)) LIKE '%on time%'
        ) AS on_time_delivery

      FROM deliveries
    `);

    /* =========================================================
       PURCHASE ORDER SUMMARY
    ========================================================= */

    const ordersResult = await pool.query(`
      SELECT
        COUNT(*) AS total_orders,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'pending'
        ) AS pending,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'accepted'
        ) AS accepted,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN (
            'fulfilled',
            'completed',
            'delivered'
          )
        ) AS fulfilled,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'cancelled'
        ) AS cancelled

      FROM purchase_orders
    `);

    /* =========================================================
       SUPPLIER COUNT
    ========================================================= */

    const suppliersResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM vendors
      WHERE LOWER(TRIM(approval_status)) = 'approved'
    `);

    /* =========================================================
       CONTRACT COUNT
    ========================================================= */

    const contractsResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM contracts
    `);

    /* =========================================================
       DELIVERY STATUS CHART
    ========================================================= */

    const deliveryStatusResult = await pool.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(delivery_status), ''),
          'Unknown'
        ) AS status,
        COUNT(*) AS count
      FROM deliveries
      GROUP BY COALESCE(
        NULLIF(TRIM(delivery_status), ''),
        'Unknown'
      )
      ORDER BY count DESC
    `);

    const deliveryStatus = deliveryStatusResult.rows.map(
      (row) => ({
        status: row.status,
        count: Number(row.count) || 0,
      })
    );

    /* =========================================================
       PURCHASE ORDER STATUS CHART
    ========================================================= */

    const purchaseOrderStatusResult = await pool.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(status), ''),
          'Unknown'
        ) AS status,
        COUNT(*) AS count
      FROM purchase_orders
      GROUP BY COALESCE(
        NULLIF(TRIM(status), ''),
        'Unknown'
      )
      ORDER BY count DESC
    `);

    const purchaseOrderStatus =
      purchaseOrderStatusResult.rows.map(
        (row) => ({
          status: row.status,
          count: Number(row.count) || 0,
        })
      );

    /* =========================================================
       SHIPPING MODE ANALYSIS
    ========================================================= */

    const shippingModeResult = await pool.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(shipping_mode), ''),
          'Unknown'
        ) AS mode,
        COUNT(*) AS count
      FROM deliveries
      GROUP BY COALESCE(
        NULLIF(TRIM(shipping_mode), ''),
        'Unknown'
      )
      ORDER BY count DESC
    `);

    const shippingModes = shippingModeResult.rows.map(
      (row) => ({
        mode: row.mode,
        count: Number(row.count) || 0,
      })
    );

    /* =========================================================
       REGIONAL DELIVERY ANALYSIS
    ========================================================= */

    const regionResult = await pool.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(order_region), ''),
          'Unknown'
        ) AS region,
        COUNT(*) AS deliveries
      FROM deliveries
      GROUP BY COALESCE(
        NULLIF(TRIM(order_region), ''),
        'Unknown'
      )
      ORDER BY deliveries DESC
      LIMIT 8
    `);

    const regionalDeliveries = regionResult.rows.map(
      (row) => ({
        region: row.region,
        deliveries: Number(row.deliveries) || 0,
      })
    );

    /* =========================================================
       CONVERT NUMBERS
    ========================================================= */

    const deliveryData = deliveriesResult.rows[0];
    const orderData = ordersResult.rows[0];

    const totalDeliveries =
      Number(deliveryData.total_deliveries) || 0;

    const advanceShipping =
      Number(deliveryData.advance_shipping) || 0;

    const lateDelivery =
      Number(deliveryData.late_delivery) || 0;

    const onTimeDelivery =
      Number(deliveryData.on_time_delivery) || 0;

    const totalOrders =
      Number(orderData.total_orders) || 0;

    const pendingOrders =
      Number(orderData.pending) || 0;

    const acceptedOrders =
      Number(orderData.accepted) || 0;

    const fulfilledOrders =
      Number(orderData.fulfilled) || 0;

    const cancelledOrders =
      Number(orderData.cancelled) || 0;

    const suppliers =
      Number(suppliersResult.rows[0].total) || 0;

    const contracts =
      Number(contractsResult.rows[0].total) || 0;

    /* =========================================================
       FULFILLMENT RATE
    ========================================================= */

    const fulfillmentRate =
      totalOrders > 0
        ? Number(
            (
              (fulfilledOrders / totalOrders) *
              100
            ).toFixed(2)
          )
        : 0;

    /* =========================================================
       ON-TIME DELIVERY RATE
    ========================================================= */

    const onTimeDeliveryRate =
      totalDeliveries > 0
        ? Number(
            (
              (onTimeDelivery / totalDeliveries) *
              100
            ).toFixed(2)
          )
        : 0;

    /* =========================================================
       RESPONSE
    ========================================================= */

    res.status(200).json({
      success: true,

      stats: {
        deliveries: {
          total: totalDeliveries,
          advanceShipping,
          lateDelivery,
          onTimeDelivery,
          onTimeDeliveryRate,
        },

        purchaseOrders: {
          total: totalOrders,
          pending: pendingOrders,
          accepted: acceptedOrders,
          fulfilled: fulfilledOrders,
          cancelled: cancelledOrders,
          fulfillmentRate,
        },

        suppliers,

        contracts,

        deliveryStatus,

        purchaseOrderStatus,

        shippingModes,

        regionalDeliveries,
      },
    });
  } catch (error) {
    console.error(
      "Supply chain dashboard error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to load supply chain dashboard",
      error: error.message,
    });
  }
};

 const getFinanceDashboard = async (req, res) => {
  try {
    const [
      kpiResult,
      categoryResult,
      monthlyResult,
      paymentResult,
      recentInvoicesResult,
      topVendorsResult,
      alertsResult,
      contractResult,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_orders,
          COALESCE(SUM(order_amount), 0) AS total_procurement_value,
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(status)) = 'pending'
          ) AS pending_orders,
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(status)) IN (
              'fulfilled',
              'delivered',
              'completed'
            )
          ) AS completed_orders
        FROM purchase_orders
        WHERE order_date >= DATE_TRUNC('year', CURRENT_DATE)
          AND order_date < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
      `),

      pool.query(`
        SELECT
          vc.category_name,
          COUNT(po.po_id) AS order_count,
          COALESCE(SUM(po.order_amount), 0) AS total_spend
        FROM purchase_orders po
        JOIN vendors v
          ON po.vendor_id = v.vendor_id
        JOIN vendor_categories vc
          ON v.category_id = vc.category_id
        WHERE po.order_date >= DATE_TRUNC('year', CURRENT_DATE)
          AND po.order_date < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
        GROUP BY vc.category_id, vc.category_name
        ORDER BY total_spend DESC
      `),

      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', order_date), 'Mon YYYY') AS month_label,
          DATE_TRUNC('month', order_date)::date AS month_date,
          COALESCE(SUM(order_amount), 0) AS total_spend
        FROM purchase_orders
        WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
          AND order_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY DATE_TRUNC('month', order_date)
        ORDER BY month_date
      `),

      pool.query(`
        SELECT
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'paid'
          ) AS paid_count,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'pending'
          ) AS pending_count,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'overdue'
          ) AS overdue_count,

          COUNT(*) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'cancelled'
          ) AS cancelled_count,

          COALESCE(SUM(invoice_amount) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'paid'
          ), 0) AS paid_amount,

          COALESCE(SUM(invoice_amount) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'pending'
          ), 0) AS pending_amount,

          COALESCE(SUM(invoice_amount) FILTER (
            WHERE LOWER(TRIM(payment_status)) = 'overdue'
          ), 0) AS overdue_amount,

          COALESCE(SUM(invoice_amount), 0) AS total_invoice_amount
        FROM invoices
        WHERE invoice_date >= DATE_TRUNC('year', CURRENT_DATE)
          AND invoice_date < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
      `),

      pool.query(`
        SELECT
          i.invoice_id,
          i.invoice_number,
          v.company_name AS vendor_name,
          i.invoice_amount,
          i.invoice_date,
          i.due_date,
          i.payment_date,
          i.payment_status
        FROM invoices i
        LEFT JOIN vendors v
          ON i.vendor_id = v.vendor_id
        WHERE i.invoice_date >= DATE_TRUNC('year', CURRENT_DATE)
          AND i.invoice_date < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
        ORDER BY COALESCE(i.invoice_date, i.created_at) DESC
        LIMIT 6
      `),

      pool.query(`
        SELECT
          v.vendor_id,
          v.company_name,
          COUNT(po.po_id) AS order_count,
          COALESCE(SUM(po.order_amount), 0) AS total_spend
        FROM purchase_orders po
        JOIN vendors v
          ON po.vendor_id = v.vendor_id
        WHERE po.order_date >= DATE_TRUNC('year', CURRENT_DATE)
          AND po.order_date < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
        GROUP BY v.vendor_id, v.company_name
        ORDER BY total_spend DESC
        LIMIT 5
      `),

      pool.query(`
        SELECT
          i.invoice_number AS reference,
          v.company_name AS vendor_name,
          i.invoice_amount AS amount,
          i.due_date,
          i.payment_status,
          'invoice' AS alert_type
        FROM invoices i
        LEFT JOIN vendors v
          ON i.vendor_id = v.vendor_id
        WHERE LOWER(TRIM(i.payment_status)) = 'overdue'

        UNION ALL

        SELECT
          i.invoice_number AS reference,
          v.company_name AS vendor_name,
          i.invoice_amount AS amount,
          i.due_date,
          i.payment_status,
          'due_soon' AS alert_type
        FROM invoices i
        LEFT JOIN vendors v
          ON i.vendor_id = v.vendor_id
        WHERE LOWER(TRIM(i.payment_status)) = 'pending'
          AND i.due_date IS NOT NULL
          AND i.due_date BETWEEN CURRENT_DATE
              AND CURRENT_DATE + INTERVAL '7 days'

        ORDER BY due_date ASC
        LIMIT 6
      `),

      pool.query(`
        SELECT
          c.contract_id,
          c.contract_title,
          v.company_name AS vendor_name,
          c.contract_value,
          c.end_date,
          c.status,
          c.compliance_status,
          c.compliance_flag
        FROM contracts c
        LEFT JOIN vendors v
          ON c.vendor_id = v.vendor_id
        WHERE
          LOWER(TRIM(c.status)) IN ('expired', 'terminated')
          OR LOWER(TRIM(c.compliance_status)) IN (
            'non-compliant',
            'under review'
          )
          OR (
            c.end_date IS NOT NULL
            AND c.end_date BETWEEN CURRENT_DATE
                AND CURRENT_DATE + INTERVAL '30 days'
          )
        ORDER BY c.end_date ASC NULLS LAST
        LIMIT 5
      `),
    ]);

    const kpi = kpiResult.rows[0];
    const payment = paymentResult.rows[0];

    const totalProcurementValue = Number(kpi.total_procurement_value) || 0;
    const totalInvoiceAmount = Number(payment.total_invoice_amount) || 0;

    const invoiceCoverage =
      totalProcurementValue > 0
        ? Math.round(
            (totalInvoiceAmount / totalProcurementValue) * 100
          )
        : 0;

    const currentMonthPaymentResult = await pool.query(`
      SELECT
        COALESCE(SUM(invoice_amount), 0) AS current_month_paid
      FROM invoices
      WHERE LOWER(TRIM(payment_status)) = 'paid'
        AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    `);

    const currentMonthPaid =
      Number(currentMonthPaymentResult.rows[0].current_month_paid) || 0;

    res.status(200).json({
      success: true,

      stats: {
        purchaseOrders: Number(kpi.total_orders) || 0,

        totalProcurementValue,

        pendingOrders: Number(kpi.pending_orders) || 0,

        completedOrders: Number(kpi.completed_orders) || 0,

        totalPayments: Number(payment.paid_amount) || 0,

        pendingPayments: Number(payment.pending_amount) || 0,

        overduePayments: Number(payment.overdue_amount) || 0,

        totalInvoiceAmount,

        invoiceCoverage,

        cashOutflowThisMonth: currentMonthPaid,

        paidInvoiceCount: Number(payment.paid_count) || 0,

        pendingInvoiceCount: Number(payment.pending_count) || 0,

        overdueInvoiceCount: Number(payment.overdue_count) || 0,

        cancelledInvoiceCount: Number(payment.cancelled_count) || 0,
      },

      categorySpend: categoryResult.rows.map((row) => ({
        category: row.category_name,
        orderCount: Number(row.order_count) || 0,
        totalSpend: Number(row.total_spend) || 0,
      })),

      monthlySpend: monthlyResult.rows.map((row) => ({
        month: row.month_label,
        date: row.month_date,
        totalSpend: Number(row.total_spend) || 0,
      })),

      paymentSummary: {
        paid: Number(payment.paid_amount) || 0,
        pending: Number(payment.pending_amount) || 0,
        overdue: Number(payment.overdue_amount) || 0,
        cancelled: 0,
        paidCount: Number(payment.paid_count) || 0,
        pendingCount: Number(payment.pending_count) || 0,
        overdueCount: Number(payment.overdue_count) || 0,
        cancelledCount: Number(payment.cancelled_count) || 0,
      },

      recentInvoices: recentInvoicesResult.rows.map((row) => ({
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        vendorName: row.vendor_name || "Unknown Vendor",
        amount: Number(row.invoice_amount) || 0,
        invoiceDate: row.invoice_date,
        dueDate: row.due_date,
        paymentDate: row.payment_date,
        status: row.payment_status || "Unknown",
      })),

      topVendors: topVendorsResult.rows.map((row) => ({
        vendorId: row.vendor_id,
        vendorName: row.company_name,
        orderCount: Number(row.order_count) || 0,
        totalSpend: Number(row.total_spend) || 0,
      })),

      financialAlerts: alertsResult.rows.map((row) => ({
        reference: row.reference,
        vendorName: row.vendor_name || "Unknown Vendor",
        amount: Number(row.amount) || 0,
        dueDate: row.due_date,
        status: row.payment_status,
        type: row.alert_type,
      })),

      contractAlerts: contractResult.rows.map((row) => ({
        contractId: row.contract_id,
        title: row.contract_title,
        vendorName: row.vendor_name || "Unknown Vendor",
        contractValue: Number(row.contract_value) || 0,
        endDate: row.end_date,
        status: row.status,
        complianceStatus: row.compliance_status,
        complianceFlag: row.compliance_flag,
      })),

      insight: {
        text:
          totalInvoiceAmount > 0
            ? `Invoices currently represent ${invoiceCoverage}% of the procurement value recorded for the year.`
            : "No invoice value is currently recorded for the selected year.",
      },
    });
  } catch (error) {
    console.error("Finance dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load finance dashboard",
      error: error.message,
    });
  }
};
 
    
const getVendorDashboard = async (req, res) => {
  try {
    const userId = Number(req.user.user_id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    /* =========================================================
       1. FIND VENDOR USING vendors.user_id
       ========================================================= */

    const vendorResult = await pool.query(
      `
      SELECT
        v.vendor_id,
        v.company_name,
        v.email,
        v.phone,
        v.approval_status
      FROM vendors v
      WHERE v.user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not linked to this user",
      });
    }

    const vendor = vendorResult.rows[0];

    const vendorId = Number(vendor.vendor_id);
    const companyName = vendor.company_name;

    /* =========================================================
       2. PURCHASE ORDERS
       ========================================================= */

    const ordersResult = await pool.query(
      `
      SELECT
        COUNT(*) AS total,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'pending'
        ) AS pending,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) = 'accepted'
        ) AS accepted,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN (
            'fulfilled',
            'completed',
            'delivered'
          )
        ) AS fulfilled,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN (
            'cancelled',
            'canceled'
          )
        ) AS cancelled,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(status)) IN (
            'issued',
            'accepted',
            'ordered',
            'processing',
            'in progress',
            'shipped'
          )
        ) AS active,

        COALESCE(
          SUM(order_amount),
          0
        ) AS total_value,

        COALESCE(
          SUM(order_amount) FILTER (
            WHERE LOWER(TRIM(status)) = 'pending'
          ),
          0
        ) AS pending_amount

      FROM purchase_orders
      WHERE vendor_id = $1
      `,
      [vendorId]
    );

    /* =========================================================
       3. DELIVERIES
       Match deliveries to vendor POs using po_id OR source_order_id
       ========================================================= */

    const deliveryResult = await pool.query(
      `
      SELECT
        COUNT(DISTINCT d.delivery_id) AS total,

        COUNT(DISTINCT d.delivery_id) FILTER (
          WHERE LOWER(TRIM(d.delivery_status)) LIKE '%late%'
        ) AS delayed,

        COUNT(DISTINCT d.delivery_id) FILTER (
          WHERE LOWER(TRIM(d.delivery_status)) LIKE '%advance%'
        ) AS advance,

        COUNT(DISTINCT d.delivery_id) FILTER (
          WHERE
            LOWER(TRIM(d.delivery_status)) LIKE '%on time%'
            OR
            LOWER(TRIM(d.delivery_status)) LIKE '%on-time%'
        ) AS on_time,

        COUNT(DISTINCT d.delivery_id) FILTER (
          WHERE LOWER(TRIM(d.delivery_status)) LIKE '%cancel%'
        ) AS cancelled

      FROM deliveries d

      INNER JOIN purchase_orders po
        ON (
          d.order_id = po.po_id
          OR
          d.order_id = po.source_order_id
        )

      WHERE po.vendor_id = $1
      `,
      [vendorId]
    );

    /* =========================================================
       4. QUALITY INSPECTIONS
       ========================================================= */

    const qualityResult = await pool.query(
      `
      SELECT
        COUNT(DISTINCT qi.inspection_id) AS total_inspections,

        COUNT(DISTINCT qi.inspection_id) FILTER (
          WHERE LOWER(TRIM(qi.inspection_result)) = 'passed'
        ) AS passed_inspections,

        COUNT(DISTINCT qi.inspection_id) FILTER (
          WHERE LOWER(TRIM(qi.inspection_result)) = 'failed'
        ) AS failed_inspections,

        AVG(qi.quality_score) FILTER (
          WHERE qi.quality_score IS NOT NULL
        ) AS quality_score

      FROM quality_inspection qi

      INNER JOIN deliveries d
        ON qi.delivery_id = d.delivery_id

      INNER JOIN purchase_orders po
        ON (
          d.order_id = po.po_id
          OR
          d.order_id = po.source_order_id
        )

      WHERE po.vendor_id = $1
      `,
      [vendorId]
    );

    /* =========================================================
       5. STORED VENDOR PERFORMANCE
       ========================================================= */

    const performanceResult = await pool.query(
      `
      SELECT
        AVG(delivery_score) FILTER (
          WHERE delivery_score IS NOT NULL
        ) AS delivery_score,

        AVG(quality_score) FILTER (
          WHERE quality_score IS NOT NULL
        ) AS quality_score,

        AVG(compliance_score) FILTER (
          WHERE compliance_score IS NOT NULL
        ) AS compliance_score,

        AVG(rating) FILTER (
          WHERE rating IS NOT NULL
        ) AS rating

      FROM vendor_performance

      WHERE vendor_id = $1
      `,
      [vendorId]
    );

    /* =========================================================
       6. CONTRACTS
       ========================================================= */

     const contractResult = await pool.query(
  `
  SELECT
    COUNT(*) AS total,

    COUNT(*) FILTER (
      WHERE LOWER(TRIM(status)) = 'active'
    ) AS active,

    COUNT(*) FILTER (
      WHERE
        end_date IS NOT NULL
        AND end_date::date >= CURRENT_DATE
        AND end_date::date <= CURRENT_DATE + INTERVAL '30 days'
    ) AS expiring_soon,

    COUNT(*) FILTER (
      WHERE
        LOWER(TRIM(status)) = 'expired'
        OR (
          end_date IS NOT NULL
          AND end_date::date < CURRENT_DATE
        )
    ) AS expired,

    COUNT(*) FILTER (
      WHERE LOWER(TRIM(compliance_status)) = 'compliant'
    ) AS compliant

  FROM contracts

  WHERE vendor_id = $1
  `,
  [vendorId]
);

    /* =========================================================
       7. CONTRACT STATUS
       ========================================================= */

    const contractStatusResult = await pool.query(
      `
      SELECT
        INITCAP(
          LOWER(TRIM(status))
        ) AS status,
        COUNT(*) AS count

      FROM contracts

      WHERE vendor_id = $1

      GROUP BY LOWER(TRIM(status))

      ORDER BY
        CASE LOWER(TRIM(status))
          WHEN 'active' THEN 1
          WHEN 'expired' THEN 2
          WHEN 'pending' THEN 3
          WHEN 'terminated' THEN 4
          ELSE 5
        END
      `,
      [vendorId]
    );

    /* =========================================================
       8. INVOICES
       Important:
       Match invoice directly by vendor_id OR through po_id.
       ========================================================= */

    const invoicesResult = await pool.query(
      `
      SELECT
        COUNT(DISTINCT i.invoice_id) AS total_invoices,

        COALESCE(
          SUM(i.invoice_amount),
          0
        ) AS total_invoiced,

        COALESCE(
          SUM(i.invoice_amount) FILTER (
            WHERE LOWER(TRIM(i.payment_status)) IN (
              'pending',
              'unpaid',
              'overdue'
            )
          ),
          0
        ) AS pending_amount,

        COALESCE(
          SUM(i.invoice_amount) FILTER (
            WHERE LOWER(TRIM(i.payment_status)) = 'paid'
          ),
          0
        ) AS paid_amount,

        COALESCE(
          SUM(i.invoice_amount) FILTER (
            WHERE LOWER(TRIM(i.payment_status)) = 'overdue'
          ),
          0
        ) AS overdue_amount

      FROM invoices i

      LEFT JOIN purchase_orders po
        ON i.po_id = po.po_id

      WHERE
        i.vendor_id = $1
        OR po.vendor_id = $1
      `,
      [vendorId]
    );

    /* =========================================================
       9. RECENT INVOICES
       ========================================================= */

    const recentInvoicesResult = await pool.query(
      `
      SELECT
        i.invoice_id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.invoice_amount,
        i.payment_status,
        i.payment_date

      FROM invoices i

      LEFT JOIN purchase_orders po
        ON i.po_id = po.po_id

      WHERE
        i.vendor_id = $1
        OR po.vendor_id = $1

      ORDER BY
        i.invoice_date DESC NULLS LAST,
        i.invoice_id DESC

      LIMIT 5
      `,
      [vendorId]
    );

    /* =========================================================
       10. NOTIFICATIONS
       ========================================================= */

    const notificationsResult = await pool.query(
      `
      SELECT
        COUNT(*) AS total

      FROM notifications

      WHERE user_id = $1
      `,
      [userId]
    );

    /* =========================================================
       11. RECENT NOTIFICATIONS
       ========================================================= */

    const recentNotificationsResult = await pool.query(
      `
      SELECT
        notification_id,
        user_id,
        message,
        is_read,
        created_at

      FROM notifications

      WHERE user_id = $1

      ORDER BY
        created_at DESC NULLS LAST,
        notification_id DESC

      LIMIT 5
      `,
      [userId]
    );

    /* =========================================================
       12. RECENT PURCHASE ORDERS
       ========================================================= */

    const recentOrdersResult = await pool.query(
      `
      SELECT
        po.po_id,
        po.vendor_id,
        po.order_amount,
        po.order_date,
        po.delivery_date,
        po.status

      FROM purchase_orders po

      WHERE po.vendor_id = $1

      ORDER BY
        po.order_date DESC NULLS LAST,
        po.po_id DESC

      LIMIT 5
      `,
      [vendorId]
    );

    /* =========================================================
       13. UPCOMING DELIVERIES
       ========================================================= */

    const upcomingDeliveriesResult = await pool.query(
      `
      SELECT
        po.po_id,
        po.vendor_id,
        po.order_amount,
        po.order_date,
        po.delivery_date,
        po.status,

        (
          po.delivery_date::date -
          CURRENT_DATE
        ) AS days_remaining,

        CASE
          WHEN po.delivery_date::date < CURRENT_DATE
            THEN 'Overdue'

          WHEN po.delivery_date::date = CURRENT_DATE
            THEN 'Due Today'

          WHEN po.delivery_date::date <=
               CURRENT_DATE + INTERVAL '7 days'
            THEN 'Due Soon'

          ELSE 'Upcoming'
        END AS delivery_attention

      FROM purchase_orders po

      WHERE
        po.vendor_id = $1
        AND po.delivery_date IS NOT NULL
        AND po.delivery_date::date >= CURRENT_DATE
        AND LOWER(TRIM(po.status)) NOT IN (
          'fulfilled',
          'completed',
          'delivered',
          'cancelled',
          'canceled'
        )

      ORDER BY
        po.delivery_date ASC,
        po.po_id ASC

      LIMIT 5
      `,
      [vendorId]
    );

    /* =========================================================
       14. CONTRACT ALERTS
       ========================================================= */

    const contractAlertsResult = await pool.query(
      `
      SELECT
        contract_id,
        vendor_id,
        contract_title,
        start_date,
        end_date,
        contract_value,
        status,
        compliance_flag,
        compliance_status,

        (
          end_date::date -
          CURRENT_DATE
        ) AS days_remaining

      FROM contracts

      WHERE
        vendor_id = $1
        AND (
          (
            end_date IS NOT NULL
            AND end_date::date <=
                CURRENT_DATE + INTERVAL '90 days'
          )
          OR
          LOWER(TRIM(status)) = 'expired'
        )

      ORDER BY
        end_date ASC NULLS LAST

      LIMIT 5
      `,
      [vendorId]
    );

    /* =========================================================
       15. PERFORMANCE TREND
       ========================================================= */

    const performanceTrendResult = await pool.query(
      `
      SELECT
        TO_CHAR(
          DATE_TRUNC(
            'month',
            po.order_date
          ),
          'Mon YYYY'
        ) AS month,

        DATE_TRUNC(
          'month',
          po.order_date
        ) AS month_date,

        COUNT(DISTINCT d.delivery_id) FILTER (
          WHERE
            LOWER(TRIM(d.delivery_status))
            LIKE '%on time%'
            OR
            LOWER(TRIM(d.delivery_status))
            LIKE '%on-time%'
        ) AS on_time,

        COUNT(DISTINCT d.delivery_id) FILTER (
          WHERE LOWER(TRIM(d.delivery_status))
          LIKE '%late%'
        ) AS delayed,

        COUNT(DISTINCT d.delivery_id) FILTER (
          WHERE LOWER(TRIM(d.delivery_status))
          LIKE '%advance%'
        ) AS advance,

        COUNT(DISTINCT d.delivery_id) AS deliveries

      FROM purchase_orders po

      LEFT JOIN deliveries d
        ON (
          d.order_id = po.po_id
          OR
          d.order_id = po.source_order_id
        )

      WHERE
        po.vendor_id = $1
        AND po.order_date IS NOT NULL
        AND po.order_date >= (
          SELECT
            DATE_TRUNC(
              'month',
              MAX(order_date)
            ) - INTERVAL '5 months'

          FROM purchase_orders

          WHERE vendor_id = $1
        )

      GROUP BY
        DATE_TRUNC(
          'month',
          po.order_date
        )

      ORDER BY
        month_date ASC
      `,
      [vendorId]
    );

    /* =========================================================
       16. RAW RESULTS
       ========================================================= */

    const orders = ordersResult.rows[0] || {};
    const deliveries = deliveryResult.rows[0] || {};
    const quality = qualityResult.rows[0] || {};
    const performance = performanceResult.rows[0] || {};
    const invoices = invoicesResult.rows[0] || {};
    const contracts = contractResult.rows[0] || {};

    /* =========================================================
       17. PURCHASE ORDER VALUES
       ========================================================= */

    const totalOrders =
      Number(orders.total) || 0;

    const pendingOrders =
      Number(orders.pending) || 0;

    const acceptedOrders =
      Number(orders.accepted) || 0;

    const fulfilledOrders =
      Number(orders.fulfilled) || 0;

    const cancelledOrders =
      Number(orders.cancelled) || 0;

    const activeOrders =
      Number(orders.active) || 0;

    const totalProcurementValue =
      Number(orders.total_value) || 0;

    const pendingPOAmount =
      Number(orders.pending_amount) || 0;

    /* =========================================================
       18. DELIVERY VALUES
       ========================================================= */

    const totalDeliveries =
      Number(deliveries.total) || 0;

    const delayedDeliveries =
      Number(deliveries.delayed) || 0;

    const advanceDeliveries =
      Number(deliveries.advance) || 0;

    const onTimeDeliveries =
      Number(deliveries.on_time) || 0;

    const cancelledDeliveries =
      Number(deliveries.cancelled) || 0;

    const measurableDeliveries =
      totalDeliveries - cancelledDeliveries;

    const onTimeRate =
      measurableDeliveries > 0
        ? Number(
            (
              (onTimeDeliveries /
                measurableDeliveries) *
              100
            ).toFixed(1)
          )
        : null;

    /* =========================================================
       19. QUALITY VALUES
       ========================================================= */

    const inspectionCount =
      Number(quality.total_inspections) || 0;

    const passedInspections =
      Number(quality.passed_inspections) || 0;

    const failedInspections =
      Number(quality.failed_inspections) || 0;

    const qualityPassRate =
      inspectionCount > 0
        ? Number(
            (
              (passedInspections /
                inspectionCount) *
              100
            ).toFixed(1)
          )
        : null;

    const storedQualityScore =
      performance.quality_score !== null &&
      performance.quality_score !== undefined
        ? Number(performance.quality_score)
        : null;

    const inspectionQualityScore =
      quality.quality_score !== null &&
      quality.quality_score !== undefined
        ? Number(quality.quality_score)
        : null;

    const qualityScore =
      storedQualityScore !== null
        ? Number(storedQualityScore.toFixed(1))
        : inspectionQualityScore !== null
          ? Number(
              inspectionQualityScore.toFixed(1)
            )
          : null;

    /* =========================================================
       20. DELIVERY SCORE
       ========================================================= */

    const storedDeliveryScore =
      performance.delivery_score !== null &&
      performance.delivery_score !== undefined
        ? Number(performance.delivery_score)
        : null;

    const deliveryScore =
      storedDeliveryScore !== null
        ? Number(
            storedDeliveryScore.toFixed(1)
          )
        : onTimeRate;

     /* =========================================================
   21. COMPLIANCE
   ========================================================= */

const storedComplianceScore =
  performance.compliance_score !== null &&
  performance.compliance_score !== undefined
    ? Number(performance.compliance_score)
    : null;

const totalComplianceContracts =
  Number(contracts.total) || 0;

const compliantContracts =
  Number(contracts.compliant) || 0;

const contractComplianceScore =
  totalComplianceContracts > 0
    ? Number(
        (
          (compliantContracts /
            totalComplianceContracts) *
          100
        ).toFixed(1)
      )
    : null;

const complianceScore =
  storedComplianceScore !== null
    ? Number(storedComplianceScore.toFixed(1))
    : contractComplianceScore;

    

    /* =========================================================
       22. FULFILLMENT
       ========================================================= */

    const fulfillmentRate =
      totalOrders > 0
        ? Number(
            (
              (fulfilledOrders /
                totalOrders) *
              100
            ).toFixed(1)
          )
        : null;

    /* =========================================================
       23. PERFORMANCE SCORE
       ========================================================= */

    const scoreParts = [];

    if (deliveryScore !== null) {
      scoreParts.push({
        value: Math.max(
          0,
          Math.min(100, deliveryScore)
        ),
        weight: 0.4,
      });
    }

    if (qualityScore !== null) {
      scoreParts.push({
        value: Math.max(
          0,
          Math.min(100, qualityScore)
        ),
        weight: 0.4,
      });
    }

    if (complianceScore !== null) {
      scoreParts.push({
        value: Math.max(
          0,
          Math.min(100, complianceScore)
        ),
        weight: 0.2,
      });
    }

    const totalPerformanceWeight =
      scoreParts.reduce(
        (sum, item) =>
          sum + item.weight,
        0
      );

    const performanceScore =
      totalPerformanceWeight > 0
        ? Number(
            (
              scoreParts.reduce(
                (sum, item) =>
                  sum +
                  item.value *
                    item.weight,
                0
              ) /
              totalPerformanceWeight
            ).toFixed(1)
          )
        : null;

    let riskStatus = "Insufficient Data";

    if (performanceScore !== null) {
      if (performanceScore >= 75) {
        riskStatus = "Low";
      } else if (performanceScore >= 50) {
        riskStatus = "Medium";
      } else {
        riskStatus = "High";
      }
    }

    /* =========================================================
       24. INVOICE VALUES
       ========================================================= */

    const totalInvoices =
      Number(invoices.total_invoices) || 0;

    const totalInvoiced =
      Number(invoices.total_invoiced) || 0;

    const paidAmount =
      Number(invoices.paid_amount) || 0;

    const pendingInvoiceAmount =
      Number(invoices.pending_amount) || 0;

    const overdueAmount =
      Number(invoices.overdue_amount) || 0;

    /* =========================================================
       25. RELIABILITY SCORE
       ========================================================= */

    const reliabilityParts = [];

    if (onTimeRate !== null) {
      reliabilityParts.push({
        value: onTimeRate,
        weight: 0.4,
      });
    }

    if (qualityPassRate !== null) {
      reliabilityParts.push({
        value: qualityPassRate,
        weight: 0.3,
      });
    }

    if (fulfillmentRate !== null) {
      reliabilityParts.push({
        value: fulfillmentRate,
        weight: 0.2,
      });
    }

    if (complianceScore !== null) {
      reliabilityParts.push({
        value: complianceScore,
        weight: 0.1,
      });
    }

    const reliabilityWeight =
      reliabilityParts.reduce(
        (sum, item) =>
          sum + item.weight,
        0
      );

    const reliabilityScore =
      reliabilityWeight > 0
        ? Number(
            (
              reliabilityParts.reduce(
                (sum, item) =>
                  sum +
                  item.value *
                    item.weight,
                0
              ) /
              reliabilityWeight
            ).toFixed(1)
          )
        : null;

    let reliabilityStatus =
      "Insufficient Data";

    if (reliabilityScore !== null) {
      if (reliabilityScore >= 75) {
        reliabilityStatus =
          "Good Reliability";
      } else if (reliabilityScore >= 50) {
        reliabilityStatus =
          "Moderate Reliability";
      } else {
        reliabilityStatus =
          "Needs Attention";
      }
    }

    /* =========================================================
       26. CONTRACT VALUES
       ========================================================= */

    const totalContracts =
      Number(contracts.total) || 0;

    const activeContracts =
      Number(contracts.active) || 0;

    const expiringSoonContracts =
      Number(
        contracts.expiring_soon
      ) || 0;

    const expiredContracts =
      Number(contracts.expired) || 0;

    /* =========================================================
       27. PERFORMANCE TREND
       ========================================================= */

    const performanceTrend =
      performanceTrendResult.rows.map(
        row => ({
          month: row.month,
          monthDate: row.month_date,
          on_time:
            Number(row.on_time) || 0,
          delayed:
            Number(row.delayed) || 0,
          advance:
            Number(row.advance) || 0,
          deliveries:
            Number(row.deliveries) || 0,
        })
      );

    /* =========================================================
       28. RESPONSE
       ========================================================= */

    res.status(200).json({
      success: true,

      stats: {
        vendorId,
        companyName,

        email:
          vendor.email || null,

        phone:
          vendor.phone || null,

        approvalStatus:
          vendor.approval_status || null,

        purchaseOrders:
          totalOrders,

        pendingOrders,

        pendingPOAmount,

        acceptedOrders,

        activeOrders,

        completedOrders:
          fulfilledOrders,

        fulfilledOrders,

        cancelledOrders,

        totalProcurementValue,

        contracts: {
          total: totalContracts,
          active: activeContracts,
          expiringSoon:
            expiringSoonContracts,
          expired:
            expiredContracts,
        },

        contractStatus:
          contractStatusResult.rows,

        notifications:
          Number(
            notificationsResult.rows[0]
              ?.total
          ) || 0,

        deliveries: {
          total: totalDeliveries,
          onTime:
            onTimeDeliveries,
          delayed:
            delayedDeliveries,
          advance:
            advanceDeliveries,
          cancelled:
            cancelledDeliveries,
          onTimeRate,
        },

        quality: {
          totalInspections:
            inspectionCount,
          passedInspections,
          failedInspections,
          qualityPassRate,
          qualityScore,
        },

        reliability: {
          score:
            reliabilityScore,
          status:
            reliabilityStatus,
          onTimeDelivery:
            onTimeRate,
          qualityPassRate,
          fulfillmentRate,
          deliveryConsistency:
            onTimeRate,
        },

        performance: {
          deliveryScore,
          qualityScore,
          complianceScore,
          rating:
            performance.rating !== null &&
            performance.rating !== undefined
              ? Number(
                  Number(
                    performance.rating
                  ).toFixed(1)
                )
              : null,
          performanceScore,
          riskStatus,
        },

        invoices: {
          totalInvoices,
          totalInvoiced,
          paidAmount,
          pendingAmount:
            pendingInvoiceAmount,
          overdueAmount,
        },

        recentPurchaseOrders:
          recentOrdersResult.rows,

        recentInvoices:
          recentInvoicesResult.rows,

        recentNotifications:
          recentNotificationsResult.rows,

        upcomingDeliveries:
          upcomingDeliveriesResult.rows,

        contractAlerts:
          contractAlertsResult.rows,

        performanceTrend,
      },
    });
  } catch (error) {
    console.error(
      "Vendor dashboard error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to load vendor dashboard",
      error: error.message,
    });
  }
};  

  const getAuditorDashboard = async (req, res) => {
  try {
    const contractsResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM contracts
    `);

    const vendorsAuditedResult = await pool.query(`
      SELECT COUNT(DISTINCT vendor_id) AS total
      FROM vendor_performance
      WHERE vendor_id IS NOT NULL
    `);

    const compliantResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM contracts
      WHERE LOWER(TRIM(COALESCE(compliance_status, ''))) = 'compliant'
    `);

    const nonCompliantResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM contracts
      WHERE LOWER(TRIM(COALESCE(compliance_status, ''))) = 'non-compliant'
    `);

    const underReviewResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM contracts
      WHERE LOWER(TRIM(COALESCE(compliance_status, ''))) = 'under review'
    `);

    const contractComplianceResult = await pool.query(`
      SELECT
        CASE
          WHEN LOWER(TRIM(COALESCE(compliance_status, ''))) = 'compliant'
            THEN 'Compliant'
          WHEN LOWER(TRIM(COALESCE(compliance_status, ''))) = 'non-compliant'
            THEN 'Non-Compliant'
          WHEN LOWER(TRIM(COALESCE(compliance_status, ''))) = 'under review'
            THEN 'Under Review'
          WHEN TRIM(COALESCE(compliance_status, '')) = ''
            THEN 'Not Assessed'
          ELSE INITCAP(TRIM(compliance_status))
        END AS status,
        COUNT(*) AS count
      FROM contracts
      GROUP BY
        CASE
          WHEN LOWER(TRIM(COALESCE(compliance_status, ''))) = 'compliant'
            THEN 'Compliant'
          WHEN LOWER(TRIM(COALESCE(compliance_status, ''))) = 'non-compliant'
            THEN 'Non-Compliant'
          WHEN LOWER(TRIM(COALESCE(compliance_status, ''))) = 'under review'
            THEN 'Under Review'
          WHEN TRIM(COALESCE(compliance_status, '')) = ''
            THEN 'Not Assessed'
          ELSE INITCAP(TRIM(compliance_status))
        END
      ORDER BY count DESC
    `);

    const contractStatusResult = await pool.query(`
      SELECT
        INITCAP(TRIM(COALESCE(status, 'Not Specified'))) AS status,
        COUNT(*) AS count
      FROM contracts
      GROUP BY INITCAP(TRIM(COALESCE(status, 'Not Specified')))
      ORDER BY count DESC
    `);

    const vendorPerformanceResult = await pool.query(`
      SELECT
        v.vendor_id,
        v.company_name,
        vp.rating,
        vp.delivery_score,
        vp.quality_score,
        vp.compliance_score,
        vp.evaluation_date
      FROM vendor_performance vp
      JOIN vendors v
        ON v.vendor_id = vp.vendor_id
      ORDER BY
        vp.evaluation_date DESC NULLS LAST,
        vp.performance_id DESC
    `);

    const procurementStatusResult = await pool.query(`
      SELECT
        INITCAP(TRIM(COALESCE(status, 'Not Specified'))) AS status,
        COUNT(*) AS count
      FROM procurement_requests
      GROUP BY INITCAP(TRIM(COALESCE(status, 'Not Specified')))
      ORDER BY count DESC
    `);

    const purchaseOrderStatusResult = await pool.query(`
      SELECT
        INITCAP(TRIM(COALESCE(status, 'Not Specified'))) AS status,
        COUNT(*) AS count
      FROM purchase_orders
      GROUP BY INITCAP(TRIM(COALESCE(status, 'Not Specified')))
      ORDER BY count DESC
    `);

    const expiringContractsResult = await pool.query(`
      SELECT
        c.contract_id,
        c.contract_title,
        c.vendor_id,
        v.company_name AS vendor_name,
        c.end_date,
        c.status,
        c.compliance_status,
        GREATEST(
          0,
          (c.end_date - CURRENT_DATE)
        ) AS days_left
      FROM contracts c
      LEFT JOIN vendors v
        ON v.vendor_id = c.vendor_id
      WHERE c.end_date IS NOT NULL
        AND c.end_date BETWEEN CURRENT_DATE
                           AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY c.end_date ASC
      LIMIT 10
    `);

    const recentAuditLogsResult = await pool.query(`
      SELECT
        al.audit_id,
        al.user_id,
        al.action,
        al.table_name,
        al.record_id,
        al.description,
        al.created_at
      FROM audit_logs al
      ORDER BY al.created_at DESC NULLS LAST, al.audit_id DESC
      LIMIT 10
    `);
const auditLogCountResult = await pool.query(`
  SELECT COUNT(*) AS total
  FROM audit_logs
`);

const recentNotificationsResult = await pool.query(
  `
  SELECT
    n.notification_id,
    n.user_id,
    n.message,
    n.is_read,
    n.created_at
  FROM notifications n
  WHERE n.user_id = $1
  ORDER BY
    n.created_at DESC NULLS LAST,
    n.notification_id DESC
  LIMIT 10
  `,
  [req.user.user_id]
);

const notificationResult = await pool.query(
  `
  SELECT
    COUNT(*) AS total_notifications,
    COUNT(*) FILTER (
      WHERE COALESCE(is_read, false) = false
    ) AS unread_notifications
  FROM notifications
  WHERE user_id = $1
  `,
  [req.user.user_id]
);
     
    const communicationResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM communication_history
    `);

    const complianceRecordsResult = await pool.query(`
      SELECT
        CASE
          WHEN LOWER(TRIM(COALESCE(status, ''))) IN
            ('compliant', 'approved', 'valid', 'verified')
            THEN 'Compliant'

          WHEN LOWER(TRIM(COALESCE(status, ''))) IN
            ('non-compliant', 'rejected', 'expired', 'invalid')
            THEN 'Non-Compliant'

          WHEN LOWER(TRIM(COALESCE(status, ''))) IN
            ('under review', 'pending', 'in progress')
            THEN 'Under Review'

          WHEN TRIM(COALESCE(status, '')) = ''
            THEN 'Not Assessed'

          ELSE INITCAP(TRIM(status))
        END AS status,
        COUNT(*) AS count
      FROM compliance_records
      GROUP BY
        CASE
          WHEN LOWER(TRIM(COALESCE(status, ''))) IN
            ('compliant', 'approved', 'valid', 'verified')
            THEN 'Compliant'

          WHEN LOWER(TRIM(COALESCE(status, ''))) IN
            ('non-compliant', 'rejected', 'expired', 'invalid')
            THEN 'Non-Compliant'

          WHEN LOWER(TRIM(COALESCE(status, ''))) IN
            ('under review', 'pending', 'in progress')
            THEN 'Under Review'

          WHEN TRIM(COALESCE(status, '')) = ''
            THEN 'Not Assessed'

          ELSE INITCAP(TRIM(status))
        END
      ORDER BY count DESC
    `);

      
    const highRiskVendorsResult = await pool.query(`
      SELECT COUNT(DISTINCT c.vendor_id) AS total
      FROM contracts c
      WHERE c.vendor_id IS NOT NULL
        AND LOWER(TRIM(COALESCE(c.compliance_status, '')))
            = 'non-compliant'
    `);

    /*
     * Pending approvals are derived from procurement request
     * statuses containing "pending" or "approval".
     */
    const pendingApprovalsResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM procurement_requests
      WHERE LOWER(TRIM(COALESCE(status, ''))) LIKE '%pending%'
         OR LOWER(TRIM(COALESCE(status, ''))) LIKE '%approval%'
    `);

    /*
     * Since audit_logs has no due_date/action_due_date field,
     * we cannot honestly calculate "overdue audit actions".
     *
     * Instead, this metric represents contracts that have
     * already passed their end date and are not marked closed.
     */
    const overdueContractsResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM contracts
      WHERE end_date IS NOT NULL
        AND end_date < CURRENT_DATE
        AND LOWER(TRIM(COALESCE(status, ''))) NOT IN (
          'closed',
          'completed',
          'terminated'
        )
    `);

    /*
     * Vendor risk/compliance distribution.
     * The current schema has no risk_level column, so we use
     * contract compliance status as the risk basis.
     */
    const riskAssessmentResult = await pool.query(`
      SELECT
        CASE
          WHEN LOWER(TRIM(COALESCE(c.compliance_status, ''))) = 'non-compliant'
            THEN 'High Risk'

          WHEN LOWER(TRIM(COALESCE(c.compliance_status, ''))) = 'under review'
            THEN 'Medium Risk'

          WHEN LOWER(TRIM(COALESCE(c.compliance_status, ''))) = 'compliant'
            THEN 'Low Risk'

          ELSE 'Not Assessed'
        END AS risk_level,
        COUNT(*) AS count
      FROM contracts c
      GROUP BY
        CASE
          WHEN LOWER(TRIM(COALESCE(c.compliance_status, ''))) = 'non-compliant'
            THEN 'High Risk'

          WHEN LOWER(TRIM(COALESCE(c.compliance_status, ''))) = 'under review'
            THEN 'Medium Risk'

          WHEN LOWER(TRIM(COALESCE(c.compliance_status, ''))) = 'compliant'
            THEN 'Low Risk'

          ELSE 'Not Assessed'
        END
      ORDER BY count DESC
    `);

    /*
     * Audit activity by month.
     * If audit_logs is empty, the returned array will simply
     * be empty instead of displaying fake activity.
     */
    const auditActivityResult = await pool.query(`
      SELECT
        TO_CHAR(
          DATE_TRUNC('month', created_at),
          'Mon YYYY'
        ) AS month,
        COUNT(*) AS count
      FROM audit_logs
      WHERE created_at IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    /*
     * Procurement activity over the latest six months.
     */
    const procurementActivityResult = await pool.query(`
      SELECT
        TO_CHAR(
          DATE_TRUNC('month', created_at),
          'Mon YYYY'
        ) AS month,
        COUNT(*) AS count
      FROM procurement_requests
      WHERE created_at IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    const contractsReviewed =
      Number(contractsResult.rows[0].total) || 0;

    const vendorsAudited =
      Number(vendorsAuditedResult.rows[0].total) || 0;

    const compliantContracts =
      Number(compliantResult.rows[0].total) || 0;

    const nonCompliantContracts =
      Number(nonCompliantResult.rows[0].total) || 0;

    const underReviewContracts =
      Number(underReviewResult.rows[0].total) || 0;

    const notAssessedContracts =
      Math.max(
        contractsReviewed -
          compliantContracts -
          nonCompliantContracts -
          underReviewContracts,
        0
      );

    const assessedContracts =
      compliantContracts +
      nonCompliantContracts +
      underReviewContracts;

    const complianceRate =
      assessedContracts > 0
        ? Number(
            (
              (compliantContracts / assessedContracts) *
              100
            ).toFixed(1)
          )
        : 0;

    const procurementStatuses =
      procurementStatusResult.rows.map((row) => ({
        status: row.status,
        count: Number(row.count) || 0,
      }));

    const purchaseOrderStatuses =
      purchaseOrderStatusResult.rows.map((row) => ({
        status: row.status,
        count: Number(row.count) || 0,
      }));

    const contractStatuses =
      contractStatusResult.rows.map((row) => ({
        status: row.status,
        count: Number(row.count) || 0,
      }));

    const contractCompliance =
      contractComplianceResult.rows.map((row) => ({
        status: row.status,
        count: Number(row.count) || 0,
      }));

    const vendorPerformance =
      vendorPerformanceResult.rows.map((row) => ({
        vendorId: Number(row.vendor_id),
        vendorName: row.company_name,

        rating:
          row.rating === null
            ? null
            : Number(row.rating),

        deliveryScore:
          row.delivery_score === null
            ? null
            : Number(row.delivery_score),

        qualityScore:
          row.quality_score === null
            ? null
            : Number(row.quality_score),

        complianceScore:
          row.compliance_score === null
            ? null
            : Number(row.compliance_score),

        evaluationDate: row.evaluation_date,
      }));

    const contractsExpiringSoon =
      expiringContractsResult.rows.map((row) => ({
        contractId: Number(row.contract_id),

        title:
          row.contract_title ||
          "Untitled Contract",

        vendorId:
          row.vendor_id === null
            ? null
            : Number(row.vendor_id),

        vendorName:
          row.vendor_name ||
          "Unknown Vendor",

        endDate: row.end_date,

        daysLeft:
          Number(row.days_left) || 0,

        status:
          row.status ||
          "Not Specified",

        complianceStatus:
          row.compliance_status ||
          "Not Assessed",
      }));

    const recentAuditLogs =
      recentAuditLogsResult.rows.map((row) => ({
        auditId: Number(row.audit_id),

        userId:
          row.user_id === null
            ? null
            : Number(row.user_id),

        action:
          row.action ||
          "Activity",

        tableName:
          row.table_name ||
          null,

        recordId:
          row.record_id === null
            ? null
            : Number(row.record_id),

        description:
          row.description ||
          "Audit activity recorded",

        createdAt:
          row.created_at,
      }));

    const recentNotifications =
      recentNotificationsResult.rows.map((row) => ({
        notificationId:
          Number(row.notification_id),

        userId:
          row.user_id === null
            ? null
            : Number(row.user_id),

        message:
          row.message ||
          "Notification",

        isRead:
          Boolean(row.is_read),

        createdAt:
          row.created_at,
      }));

    const complianceRecordOverview =
      complianceRecordsResult.rows.map((row) => ({
        status: row.status,
        count: Number(row.count) || 0,
      }));

    const riskAssessment =
      riskAssessmentResult.rows.map((row) => ({
        riskLevel: row.risk_level,
        count: Number(row.count) || 0,
      }));

    const auditActivity =
      auditActivityResult.rows.map((row) => ({
        month: row.month,
        count: Number(row.count) || 0,
      }));

    const procurementActivity =
      procurementActivityResult.rows.map((row) => ({
        month: row.month,
        count: Number(row.count) || 0,
      }));

    const highRiskVendors =
      Number(highRiskVendorsResult.rows[0].total) || 0;

    const pendingApprovals =
      Number(pendingApprovalsResult.rows[0].total) || 0;

    const overdueContracts =
      Number(overdueContractsResult.rows[0].total) || 0;

     const totalNotifications =
  Number(
    notificationResult.rows[0]?.total_notifications
  ) || 0;

const unreadNotifications =
  Number(
    notificationResult.rows[0]?.unread_notifications
  ) || 0;

    const communicationCount =
      Number(communicationResult.rows[0].total) || 0;

    const auditLogCount =
  Number(auditLogCountResult.rows[0].total) || 0;

    res.status(200).json({
      success: true,

      stats: {
        contractsReviewed,
        vendorsAudited,

        compliantContracts,
        nonCompliantContracts,
        underReviewContracts,
        notAssessedContracts,

        complianceRate,

        highRiskVendors,
        pendingApprovals,
        overdueContracts,

        totalNotifications,
        unreadNotifications,

        auditLogCount,
        communicationCount,

        expiringContracts:
          contractsExpiringSoon.length,
      },

      complianceOverview: {
        compliant: compliantContracts,
        nonCompliant: nonCompliantContracts,
        underReview: underReviewContracts,
        notAssessed: notAssessedContracts,
      },

      /*
       * This is based on compliance_records when available.
       * Currently your table has 0 rows, so this will naturally
       * return an empty array.
       */
      complianceRecordsOverview:
        complianceRecordOverview,

      contractCompliance,

      contractStatuses,

      riskAssessment,

      vendorPerformance,

      procurementStatuses,

      purchaseOrderStatuses,

      auditActivity,

      procurementActivity,

      recentAuditLogs,

      contractsExpiringSoon,

      recentNotifications,

      communicationSummary: {
        total: communicationCount,
      },

      summary: {
        auditsConducted: auditLogCount,
        complianceScore: complianceRate,
        openFindings: nonCompliantContracts,
        highRiskVendors,
        pendingApprovals,
        overdueActions: overdueContracts,
      },
    });
  } catch (error) {
    console.error(
      "Auditor dashboard error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to load auditor dashboard",
      error: error.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
  getProcurementDashboard,
  getSupplyChainDashboard,
  getFinanceDashboard,
  getVendorDashboard,
  getAuditorDashboard,
};