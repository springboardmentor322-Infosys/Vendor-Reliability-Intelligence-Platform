 const pool = require("../config/db");

const getAdminDashboard = async (req, res) => {
  try {
    // =========================================================
    // TOTAL USERS
    // =========================================================
    const usersResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM users
    `);

    // =========================================================
    // ALL USERS
    // =========================================================
    const allUsersResult = await pool.query(`
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

    // =========================================================
    // TOTAL VENDORS
    // =========================================================
    const vendorsResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM vendors
    `);

    // =========================================================
    // PROCUREMENT REQUESTS
    // =========================================================
    const procurementResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM procurement_requests
    `);

    // =========================================================
    // PURCHASE ORDERS
    // =========================================================
    const purchaseOrdersResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM purchase_orders
    `);

    // =========================================================
    // CONTRACTS + COMPLIANCE
    // =========================================================
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

    // =========================================================
    // NOTIFICATIONS
    // =========================================================
    const notificationsResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM notifications
    `);

    // =========================================================
    // COMMUNICATIONS
    // =========================================================
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

    // =========================================================
    // RESPONSE
    // =========================================================
    res.status(200).json({
      success: true,

      stats: {
        totalUsers:
          Number(usersResult.rows[0].total) || 0,

        activeVendors:
          Number(vendorsResult.rows[0].total) || 0,

        procurementRequests:
          Number(procurementResult.rows[0].total) || 0,

        purchaseOrders:
          Number(purchaseOrdersResult.rows[0].total) || 0,

        contracts:
          totalContracts,

        complianceScore:
          complianceScore,

        compliance: {
          total:
            totalContracts,

          compliant:
            compliantContracts,

          nonCompliant:
            nonCompliantContracts,

          underReview:
            underReviewContracts,
        },

        notifications:
          Number(notificationsResult.rows[0].total) || 0,

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
              communicationResult.rows[0].follow_up_required
            ) || 0,
        },
      },

      // IMPORTANT:
      // Actual user records for User Management page
      users: allUsersResult.rows,
    });
  } catch (error) {
    console.error(
      "Admin dashboard error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard",
      error: error.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
};