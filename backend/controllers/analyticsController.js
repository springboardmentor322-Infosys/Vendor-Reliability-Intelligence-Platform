 const pool = require("../config/db");


// ============================================================
// MAIN ANALYTICS DASHBOARD
// ============================================================

const getAnalytics = async (req, res) => {
  try {

    // ----------------------------------------------------------
    // 1. VENDOR SUMMARY
    // ----------------------------------------------------------

    const vendors = await pool.query(`
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE LOWER(approval_status) = 'approved'
        )::int AS approved,

        COUNT(*) FILTER (
          WHERE LOWER(approval_status) = 'pending'
        )::int AS pending,

        COUNT(*) FILTER (
          WHERE LOWER(approval_status) = 'rejected'
        )::int AS rejected

      FROM vendors
    `);


    // ----------------------------------------------------------
    // 2. PROCUREMENT SUMMARY
    // ----------------------------------------------------------

    const procurement = await pool.query(`
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'pending'
        )::int AS pending,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'approved'
        )::int AS approved,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'rejected'
        )::int AS rejected

      FROM procurement_requests
    `);


    // ----------------------------------------------------------
    // 3. PURCHASE ORDER SUMMARY
    // ----------------------------------------------------------

    const purchaseOrders = await pool.query(`
      SELECT
        COUNT(*)::int AS total,

        COALESCE(
          SUM(order_amount),
          0
        ) AS total_value,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'pending'
        )::int AS pending,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'issued'
        )::int AS issued,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'accepted'
        )::int AS accepted,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'fulfilled'
        )::int AS fulfilled,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'cancelled'
        )::int AS cancelled

      FROM purchase_orders
    `);


    // ----------------------------------------------------------
    // 4. CONTRACT SUMMARY
    // ----------------------------------------------------------

    const contracts = await pool.query(`
      SELECT
        COUNT(*)::int AS total,

        COALESCE(
          SUM(contract_value),
          0
        ) AS total_value,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'draft'
        )::int AS draft,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'active'
        )::int AS active,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'expired'
        )::int AS expired,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'terminated'
        )::int AS terminated

      FROM contracts
    `);


    // ----------------------------------------------------------
    // 5. RECENT PURCHASE ORDERS
    // ----------------------------------------------------------

    const recentOrders = await pool.query(`
      SELECT
        po_id,
        vendor_id,
        order_amount,
        order_date,
        delivery_date,
        status

      FROM purchase_orders

      ORDER BY po_id DESC

      LIMIT 5
    `);


    // ----------------------------------------------------------
    // 6. RECENT CONTRACTS
    // ----------------------------------------------------------

    const recentContracts = await pool.query(`
      SELECT
        contract_id,
        vendor_id,
        contract_title,
        start_date,
        end_date,
        contract_value,
        status

      FROM contracts

      ORDER BY contract_id DESC

      LIMIT 5
    `);


    // ==========================================================
    // ADVANCED ANALYTICS
    // ==========================================================


    // ----------------------------------------------------------
    // 7. VENDOR ANALYTICS
    // ----------------------------------------------------------

    const vendorAnalytics = await pool.query(`
      SELECT
        v.vendor_id,
        v.company_name,

        COUNT(DISTINCT po.po_id)::int AS total_orders,

        COALESCE(
          SUM(po.order_amount),
          0
        ) AS procurement_value,

        COUNT(DISTINCT po.po_id) FILTER (
          WHERE LOWER(po.status) = 'fulfilled'
        )::int AS fulfilled_orders,

        COUNT(DISTINCT po.po_id) FILTER (
          WHERE LOWER(po.status) = 'cancelled'
        )::int AS cancelled_orders,

        ROUND(
          (
            COUNT(DISTINCT po.po_id) FILTER (
              WHERE LOWER(po.status) = 'fulfilled'
            )::numeric
            /
            NULLIF(COUNT(DISTINCT po.po_id), 0)
          ) * 100,
          2
        ) AS fulfillment_rate,

        ROUND(
          (
            COUNT(DISTINCT po.po_id) FILTER (
              WHERE LOWER(po.status) = 'cancelled'
            )::numeric
            /
            NULLIF(COUNT(DISTINCT po.po_id), 0)
          ) * 100,
          2
        ) AS cancellation_rate

      FROM vendors v

      LEFT JOIN purchase_orders po
        ON po.vendor_id = v.vendor_id

      GROUP BY
        v.vendor_id,
        v.company_name

      ORDER BY
        procurement_value DESC
    `);


    // ----------------------------------------------------------
    // 8. PROCUREMENT ANALYTICS
    // ----------------------------------------------------------

    const procurementAnalytics = await pool.query(`
      SELECT
        LOWER(status) AS status,
        COUNT(*)::int AS count

      FROM procurement_requests

      GROUP BY LOWER(status)

      ORDER BY count DESC
    `);


    // ----------------------------------------------------------
    // 9. PURCHASE ORDER ANALYTICS
    // ----------------------------------------------------------

    const purchaseOrderAnalytics = await pool.query(`
      SELECT
        LOWER(status) AS status,

        COUNT(*)::int AS order_count,

        COALESCE(
          SUM(order_amount),
          0
        ) AS total_value

      FROM purchase_orders

      GROUP BY LOWER(status)

      ORDER BY order_count DESC
    `);


    // ----------------------------------------------------------
    // 10. DELIVERY ANALYTICS
    // ----------------------------------------------------------
    //
    // DataCo commonly uses:
    // "Shipping on time"
    // "Late delivery"
    //
    // We also support other possible values.
    // ----------------------------------------------------------

    const deliveryAnalytics = await pool.query(`
      SELECT

        COUNT(*)::int AS total_deliveries,

        COUNT(*) FILTER (
          WHERE LOWER(delivery_status) IN (
            'shipping on time',
            'delivered',
            'completed',
            'on time',
            'on-time'
          )
        )::int AS successful_deliveries,

        COUNT(*) FILTER (
          WHERE LOWER(delivery_status) LIKE '%late%'
             OR LOWER(delivery_status) LIKE '%delay%'
        )::int AS delayed_deliveries,

        COUNT(*) FILTER (
          WHERE late_delivery_risk = 1
        )::int AS high_risk_deliveries

      FROM deliveries
    `);


    // ----------------------------------------------------------
    // 11. VENDOR RISK ANALYTICS
    // ----------------------------------------------------------
    //
    // Risk is based on cancellation percentage.
    //
    // >= 25%       High
    // >= 10%       Medium
    // < 10%        Low
    // No orders    Insufficient Data
    // ----------------------------------------------------------

    const riskAnalytics = await pool.query(`
      SELECT
        risk_level,
        COUNT(*)::int AS vendor_count

      FROM (

        SELECT

          v.vendor_id,

          CASE

            WHEN COUNT(po.po_id) = 0
              THEN 'Insufficient Data'

            WHEN (
              COUNT(po.po_id) FILTER (
                WHERE LOWER(po.status) = 'cancelled'
              )::numeric
              /
              NULLIF(
                COUNT(po.po_id),
                0
              )
            ) >= 0.25
              THEN 'High'

            WHEN (
              COUNT(po.po_id) FILTER (
                WHERE LOWER(po.status) = 'cancelled'
              )::numeric
              /
              NULLIF(
                COUNT(po.po_id),
                0
              )
            ) >= 0.10
              THEN 'Medium'

            ELSE 'Low'

          END AS risk_level

        FROM vendors v

        LEFT JOIN purchase_orders po
          ON po.vendor_id = v.vendor_id

        GROUP BY v.vendor_id

      ) risk_data

      GROUP BY risk_level

      ORDER BY vendor_count DESC
    `);


    // ----------------------------------------------------------
    // 12. PERFORMANCE TRENDS
    // ----------------------------------------------------------

    const performanceTrends = await pool.query(`
      SELECT

        DATE_TRUNC(
          'month',
          order_date
        )::date AS month,

        COUNT(*)::int AS total_orders,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'fulfilled'
        )::int AS fulfilled_orders,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'cancelled'
        )::int AS cancelled_orders,

        COALESCE(
          SUM(order_amount),
          0
        ) AS procurement_value

      FROM purchase_orders

      WHERE order_date IS NOT NULL

      GROUP BY
        DATE_TRUNC(
          'month',
          order_date
        )

      ORDER BY month
    `);


    // ==========================================================
    // SEND RESPONSE
    // ==========================================================

    res.status(200).json({

      // Basic summaries
      vendors: vendors.rows[0],
      procurement: procurement.rows[0],
      purchaseOrders: purchaseOrders.rows[0],
      contracts: contracts.rows[0],

      // Recent records
      recentOrders: recentOrders.rows,
      recentContracts: recentContracts.rows,

      // Advanced analytics
      vendorAnalytics: vendorAnalytics.rows,
      procurementAnalytics: procurementAnalytics.rows,
      purchaseOrderAnalytics: purchaseOrderAnalytics.rows,
      deliveryAnalytics: deliveryAnalytics.rows[0],
      riskAnalytics: riskAnalytics.rows,
      performanceTrends: performanceTrends.rows,

    });

  } catch (err) {

    console.error(
      "Analytics error:",
      err
    );

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};


// ============================================================
// INDIVIDUAL ANALYTICS ENDPOINTS
// ============================================================

const getVendorAnalytics = async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        v.vendor_id,
        v.company_name,

        COUNT(DISTINCT po.po_id)::int AS total_orders,

        COALESCE(
          SUM(po.order_amount),
          0
        ) AS procurement_value,

        COUNT(DISTINCT po.po_id) FILTER (
          WHERE LOWER(po.status) = 'fulfilled'
        )::int AS fulfilled_orders,

        COUNT(DISTINCT po.po_id) FILTER (
          WHERE LOWER(po.status) = 'cancelled'
        )::int AS cancelled_orders,

        ROUND(
          (
            COUNT(DISTINCT po.po_id) FILTER (
              WHERE LOWER(po.status) = 'fulfilled'
            )::numeric
            /
            NULLIF(
              COUNT(DISTINCT po.po_id),
              0
            )
          ) * 100,
          2
        ) AS fulfillment_rate,

        ROUND(
          (
            COUNT(DISTINCT po.po_id) FILTER (
              WHERE LOWER(po.status) = 'cancelled'
            )::numeric
            /
            NULLIF(
              COUNT(DISTINCT po.po_id),
              0
            )
          ) * 100,
          2
        ) AS cancellation_rate

      FROM vendors v

      LEFT JOIN purchase_orders po
        ON po.vendor_id = v.vendor_id

      GROUP BY
        v.vendor_id,
        v.company_name

      ORDER BY procurement_value DESC
    `);

    res.status(200).json({
      vendors: result.rows,
    });

  } catch (err) {

    console.error(
      "Vendor analytics error:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch vendor analytics",
    });
  }
};


// ============================================================

const getProcurementAnalytics = async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        LOWER(status) AS status,
        COUNT(*)::int AS count

      FROM procurement_requests

      GROUP BY LOWER(status)

      ORDER BY count DESC
    `);

    res.status(200).json({
      procurement: result.rows,
    });

  } catch (err) {

    console.error(
      "Procurement analytics error:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch procurement analytics",
    });
  }
};


// ============================================================

const getPurchaseOrderAnalytics = async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        LOWER(status) AS status,

        COUNT(*)::int AS order_count,

        COALESCE(
          SUM(order_amount),
          0
        ) AS total_value

      FROM purchase_orders

      GROUP BY LOWER(status)

      ORDER BY order_count DESC
    `);

    res.status(200).json({
      purchaseOrders: result.rows,
    });

  } catch (err) {

    console.error(
      "Purchase order analytics error:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch purchase order analytics",
    });
  }
};


// ============================================================

const getDeliveryAnalytics = async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT

        COUNT(*)::int AS total_deliveries,

        COUNT(*) FILTER (
          WHERE LOWER(delivery_status) IN (
            'shipping on time',
            'delivered',
            'completed',
            'on time',
            'on-time'
          )
        )::int AS successful_deliveries,

        COUNT(*) FILTER (
          WHERE LOWER(delivery_status) LIKE '%late%'
             OR LOWER(delivery_status) LIKE '%delay%'
        )::int AS delayed_deliveries,

        COUNT(*) FILTER (
          WHERE late_delivery_risk = 1
        )::int AS high_risk_deliveries

      FROM deliveries
    `);

    res.status(200).json({
      delivery: result.rows[0],
    });

  } catch (err) {

    console.error(
      "Delivery analytics error:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch delivery analytics",
    });
  }
};


// ============================================================

const getRiskAnalytics = async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        risk_level,
        COUNT(*)::int AS vendor_count

      FROM (

        SELECT

          v.vendor_id,

          CASE

            WHEN COUNT(po.po_id) = 0
              THEN 'Insufficient Data'

            WHEN (
              COUNT(po.po_id) FILTER (
                WHERE LOWER(po.status) = 'cancelled'
              )::numeric
              /
              NULLIF(
                COUNT(po.po_id),
                0
              )
            ) >= 0.25
              THEN 'High'

            WHEN (
              COUNT(po.po_id) FILTER (
                WHERE LOWER(po.status) = 'cancelled'
              )::numeric
              /
              NULLIF(
                COUNT(po.po_id),
                0
              )
            ) >= 0.10
              THEN 'Medium'

            ELSE 'Low'

          END AS risk_level

        FROM vendors v

        LEFT JOIN purchase_orders po
          ON po.vendor_id = v.vendor_id

        GROUP BY v.vendor_id

      ) risk_data

      GROUP BY risk_level

      ORDER BY vendor_count DESC
    `);

    res.status(200).json({
      risks: result.rows,
    });

  } catch (err) {

    console.error(
      "Risk analytics error:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch risk analytics",
    });
  }
};


// ============================================================

const getPerformanceTrends = async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT

        DATE_TRUNC(
          'month',
          order_date
        )::date AS month,

        COUNT(*)::int AS total_orders,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'fulfilled'
        )::int AS fulfilled_orders,

        COUNT(*) FILTER (
          WHERE LOWER(status) = 'cancelled'
        )::int AS cancelled_orders,

        COALESCE(
          SUM(order_amount),
          0
        ) AS procurement_value

      FROM purchase_orders

      WHERE order_date IS NOT NULL

      GROUP BY
        DATE_TRUNC(
          'month',
          order_date
        )

      ORDER BY month
    `);

    res.status(200).json({
      trends: result.rows,
    });

  } catch (err) {

    console.error(
      "Performance trends error:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch performance trends",
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAnalytics,
  getVendorAnalytics,
  getProcurementAnalytics,
  getPurchaseOrderAnalytics,
  getDeliveryAnalytics,
  getRiskAnalytics,
  getPerformanceTrends,
};