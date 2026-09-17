 const pool = require("../config/db");

const getVendorInvoices = async (req, res) => {
  try {
    const userId = req.user.user_id;

    /*
     * Find the vendor linked to the logged-in user.
     * Vendor relationship is stored in vendors.user_id.
     */
    const vendorResult = await pool.query(
      `
      SELECT
        v.vendor_id,
        v.company_name
      FROM vendors v
      WHERE v.user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor profile not linked to this user",
      });
    }

    const vendorId = vendorResult.rows[0].vendor_id;

    /*
     * Get all invoices belonging to this vendor.
     */
    const result = await pool.query(
      `
      SELECT
        i.invoice_id,
        i.po_id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.invoice_amount,
        i.payment_status,
        i.payment_date,
        i.created_at
      FROM invoices i
      WHERE i.vendor_id = $1
      ORDER BY
        i.invoice_date DESC NULLS LAST,
        i.invoice_id DESC
      `,
      [vendorId]
    );

    /*
     * Calculate invoice summary for this vendor.
     */
    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_invoices,

        COALESCE(
          SUM(i.invoice_amount),
          0
        ) AS total_invoiced,

        COALESCE(
          SUM(
            CASE
              WHEN LOWER(COALESCE(i.payment_status, '')) IN
                   ('paid', 'completed')
              THEN i.invoice_amount
              ELSE 0
            END
          ),
          0
        ) AS total_paid,

        COALESCE(
          SUM(
            CASE
              WHEN LOWER(COALESCE(i.payment_status, '')) NOT IN
                   ('paid', 'completed')
              THEN i.invoice_amount
              ELSE 0
            END
          ),
          0
        ) AS pending_amount

      FROM invoices i
      WHERE i.vendor_id = $1
      `,
      [vendorId]
    );

    const summary = summaryResult.rows[0];

    res.json({
      vendorId,
      companyName: vendorResult.rows[0].company_name,
      invoices: result.rows,
      summary: {
        total_invoices: Number(summary.total_invoices || 0),
        total_invoiced: Number(summary.total_invoiced || 0),
        total_paid: Number(summary.total_paid || 0),
        pending_amount: Number(summary.pending_amount || 0),
      },
    });
  } catch (error) {
    console.error("Get vendor invoices error:", error);

    res.status(500).json({
      message: "Failed to load vendor invoices",
    });
  }
};

module.exports = {
  getVendorInvoices,
};