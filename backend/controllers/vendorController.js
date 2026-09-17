 const pool = require("../config/db");

// GET ALL VENDORS
const getVendors = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        v.vendor_id,
        v.company_name,
        v.contact_person,
        v.email,
        v.phone,
        v.address,
        v.category_id,
        vc.category_name,
        vc.category_name AS category,
        v.approval_status,
        v.created_at
       FROM vendors v
       LEFT JOIN vendor_categories vc
         ON v.category_id = vc.category_id
       ORDER BY v.vendor_id DESC`
    );

    res.status(200).json({
      message: "Vendors fetched successfully",
      vendors: result.rows,
    });
  } catch (err) {
    console.log("Get vendors error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// GET SINGLE VENDOR
const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        v.vendor_id,
        v.company_name,
        v.contact_person,
        v.email,
        v.phone,
        v.address,
        v.category_id,
        vc.category_name,
        vc.category_name AS category,
        v.approval_status,
        v.created_at
       FROM vendors v
       LEFT JOIN vendor_categories vc
         ON v.category_id = vc.category_id
       WHERE v.vendor_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      message: "Vendor fetched successfully",
      vendor: result.rows[0],
    });
  } catch (err) {
    console.log("Get vendor error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

 const getVendorPerformance = async (req, res) => {
  try {
    const allowedRoles = [
      "administrator",
      "admin",
      "procurement manager",
      "procurement_manager",
      "supply chain manager",
      "supply_chain_manager",
      "finance officer",
      "finance_officer",
      "vendor",
      "auditor"
    ];

    const rawRole = req.user?.role || "";
    const role = rawRole.toLowerCase().trim();

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "You are not authorized to access vendor performance"
      });
    }

    const isVendor = role === "vendor";

    if (isVendor && !req.user?.user_id) {
      return res.status(401).json({
        message: "Authenticated user information is missing"
      });
    }

    const queryParams = isVendor ? [req.user.user_id] : [];

    const vendorScope = isVendor
      ? `WHERE v.user_id = $1`
      : "";

    const result = await pool.query(
      `WITH vendor_scope AS (
        SELECT
          v.vendor_id,
          v.company_name
        FROM vendors v
        ${vendorScope}
      ),

      vendor_orders AS (
        SELECT
          vs.vendor_id,
          vs.company_name,
          COUNT(DISTINCT po.po_id) AS total_orders,

          COUNT(
            DISTINCT CASE
              WHEN d.delivery_status IN (
                'Advance shipping',
                'Shipping on time'
              )
              THEN po.po_id
            END
          ) AS successful_deliveries,

          COUNT(
            DISTINCT CASE
              WHEN d.delivery_status = 'Late delivery'
              THEN po.po_id
            END
          ) AS late_deliveries,

          COUNT(
            DISTINCT CASE
              WHEN d.late_delivery_risk::text = '1'
              THEN po.po_id
            END
          ) AS high_risk_orders,

          COUNT(
            DISTINCT CASE
              WHEN po.status = 'Fulfilled'
              THEN po.po_id
            END
          ) AS fulfilled_orders,

          COUNT(
            DISTINCT CASE
              WHEN po.status = 'Cancelled'
              THEN po.po_id
            END
          ) AS cancelled_orders

        FROM vendor_scope vs
        LEFT JOIN purchase_orders po
          ON po.vendor_id = vs.vendor_id
        LEFT JOIN deliveries d
          ON po.source_order_id::text = d.order_id::text
        GROUP BY
          vs.vendor_id,
          vs.company_name
      ),

      vendor_quality AS (
        SELECT
          po.vendor_id,
          AVG(qi.quality_score) AS average_quality_score,

          COUNT(
            DISTINCT CASE
              WHEN qi.inspection_result ILIKE 'pass%'
              THEN qi.inspection_id
            END
          ) AS passed_inspections,

          COUNT(
            DISTINCT CASE
              WHEN qi.inspection_result ILIKE 'fail%'
              THEN qi.inspection_id
            END
          ) AS failed_inspections,

          COUNT(DISTINCT qi.inspection_id) AS total_inspections

        FROM purchase_orders po
        LEFT JOIN quality_inspection qi
          ON po.source_order_id::text = qi.order_id::text
        GROUP BY
          po.vendor_id
      ),

      vendor_communication AS (
        SELECT
          vs.vendor_id,

          COUNT(ch.communication_id) AS total_communications,

          COUNT(
            CASE
              WHEN ch.communication_status IN ('Completed', 'Resolved')
              THEN 1
            END
          ) AS completed_communications,

          COUNT(
            CASE
              WHEN ch.communication_status = 'Pending'
              THEN 1
            END
          ) AS pending_communications,

          COUNT(
            CASE
              WHEN ch.communication_status = 'Follow-up Required'
              THEN 1
            END
          ) AS follow_up_required

        FROM vendor_scope vs
        LEFT JOIN communication_history ch
          ON ch.vendor_id = vs.vendor_id
        GROUP BY
          vs.vendor_id
      ),

      vendor_contracts AS (
        SELECT
          vs.vendor_id,
          COUNT(c.contract_id) AS total_contracts,

          AVG(
            CASE
              WHEN c.compliance_flag = 'Compliant'
              THEN 85
              WHEN c.compliance_flag = 'Under Review'
              THEN 60
              WHEN c.compliance_flag = 'Non-Compliant'
              THEN 25
              ELSE NULL
            END
          ) AS compliance_flag_score,

          AVG(
            CASE
              WHEN c.compliance_status = 'Compliant'
              THEN 85
              WHEN c.compliance_status = 'Under Review'
              THEN 60
              WHEN c.compliance_status = 'Non-Compliant'
              THEN 25
              ELSE NULL
            END
          ) AS compliance_status_score

        FROM vendor_scope vs
        LEFT JOIN contracts c
          ON c.vendor_id = vs.vendor_id
        GROUP BY
          vs.vendor_id
      ),

      calculated_scores AS (
        SELECT
          vo.vendor_id,
          vo.company_name,

          vo.total_orders,
          vo.successful_deliveries,
          vo.late_deliveries,
          vo.high_risk_orders,
          vo.fulfilled_orders,
          vo.cancelled_orders,

          COALESCE(vq.passed_inspections, 0) AS passed_inspections,
          COALESCE(vq.failed_inspections, 0) AS failed_inspections,
          COALESCE(vq.total_inspections, 0) AS total_inspections,

          COALESCE(vc.total_communications, 0) AS total_communications,
          COALESCE(vc.completed_communications, 0) AS completed_communications,
          COALESCE(vc.pending_communications, 0) AS pending_communications,
          COALESCE(vc.follow_up_required, 0) AS follow_up_required,

          COALESCE(vcon.total_contracts, 0) AS total_contracts,

          CASE
            WHEN vo.total_orders > 0
            THEN ROUND(
              (
                vo.successful_deliveries::numeric /
                vo.total_orders
              ) * 100,
              2
            )
          END AS delivery_score,

          CASE
            WHEN vq.average_quality_score IS NOT NULL
            THEN ROUND(
              CASE
                WHEN vq.average_quality_score <= 10
                THEN vq.average_quality_score * 10
                ELSE vq.average_quality_score
              END,
              2
            )
          END AS quality_score,

          CASE
            WHEN vo.total_orders > 0
            THEN ROUND(
              GREATEST(
                0,
                LEAST(
                  100,
                  (
                    vo.fulfilled_orders::numeric /
                    vo.total_orders
                  ) * 100
                  -
                  (
                    vo.cancelled_orders::numeric /
                    vo.total_orders
                  ) * 100
                )
              ),
              2
            )
          END AS compliance_score,

          CASE
            WHEN vc.total_communications > 0
            THEN ROUND(
              (
                (
                  vc.completed_communications * 85
                ) +
                (
                  vc.follow_up_required * 50
                )
              )::numeric /
              vc.total_communications,
              2
            )
          END AS communication_score,

          CASE
            WHEN vc.total_communications > 0
            THEN ROUND(
              (
                vc.completed_communications::numeric /
                vc.total_communications
              ) * 85,
              2
            )
          END AS issue_resolution_score,

          CASE
            WHEN vcon.total_contracts > 0
            THEN ROUND(
              (
                COALESCE(vcon.compliance_flag_score, 0) +
                COALESCE(vcon.compliance_status_score, 0)
              ) /
              NULLIF(
                (
                  CASE
                    WHEN vcon.compliance_flag_score IS NOT NULL
                    THEN 1
                    ELSE 0
                  END
                  +
                  CASE
                    WHEN vcon.compliance_status_score IS NOT NULL
                    THEN 1
                    ELSE 0
                  END
                ),
                0
              ),
              2
            )
          END AS contract_compliance_score

        FROM vendor_orders vo

        LEFT JOIN vendor_quality vq
          ON vo.vendor_id = vq.vendor_id

        LEFT JOIN vendor_communication vc
          ON vo.vendor_id = vc.vendor_id

        LEFT JOIN vendor_contracts vcon
          ON vo.vendor_id = vcon.vendor_id
      ),

      scored_vendors AS (
        SELECT
          cs.*,

          CASE
            WHEN
              cs.delivery_score IS NOT NULL
              OR cs.quality_score IS NOT NULL
              OR cs.compliance_score IS NOT NULL
            THEN ROUND(
              (
                COALESCE(cs.delivery_score * 0.40, 0) +
                COALESCE(cs.quality_score * 0.40, 0) +
                COALESCE(cs.compliance_score * 0.20, 0)
              )
              /
              NULLIF(
                (
                  CASE
                    WHEN cs.delivery_score IS NOT NULL THEN 0.40
                    ELSE 0
                  END
                  +
                  CASE
                    WHEN cs.quality_score IS NOT NULL THEN 0.40
                    ELSE 0
                  END
                  +
                  CASE
                    WHEN cs.compliance_score IS NOT NULL THEN 0.20
                    ELSE 0
                  END
                ),
                0
              ),
              2
            )
          END AS performance_score,

          CASE
            WHEN
              cs.delivery_score IS NOT NULL
              OR cs.quality_score IS NOT NULL
              OR cs.compliance_score IS NOT NULL
              OR cs.communication_score IS NOT NULL
              OR cs.contract_compliance_score IS NOT NULL
              OR cs.issue_resolution_score IS NOT NULL
            THEN ROUND(
              (
                COALESCE(cs.delivery_score * 0.30, 0) +
                COALESCE(cs.quality_score * 0.25, 0) +
                COALESCE(cs.compliance_score * 0.15, 0) +
                COALESCE(cs.communication_score * 0.10, 0) +
                COALESCE(cs.contract_compliance_score * 0.10, 0) +
                COALESCE(cs.issue_resolution_score * 0.10, 0)
              )
              /
              NULLIF(
                (
                  CASE
                    WHEN cs.delivery_score IS NOT NULL THEN 0.30
                    ELSE 0
                  END
                  +
                  CASE
                    WHEN cs.quality_score IS NOT NULL THEN 0.25
                    ELSE 0
                  END
                  +
                  CASE
                    WHEN cs.compliance_score IS NOT NULL THEN 0.15
                    ELSE 0
                  END
                  +
                  CASE
                    WHEN cs.communication_score IS NOT NULL THEN 0.10
                    ELSE 0
                  END
                  +
                  CASE
                    WHEN cs.contract_compliance_score IS NOT NULL THEN 0.10
                    ELSE 0
                  END
                  +
                  CASE
                    WHEN cs.issue_resolution_score IS NOT NULL THEN 0.10
                    ELSE 0
                  END
                ),
                0
              ),
              2
            )
          END AS reliability_score

        FROM calculated_scores cs
      ),

      ranked_vendors AS (
        SELECT
          sv.*,

          CASE
            WHEN sv.reliability_score IS NOT NULL
            THEN RANK() OVER (
              ORDER BY
                sv.reliability_score DESC,
                sv.vendor_id ASC
            )
          END AS vendor_rank

        FROM scored_vendors sv
      )

      SELECT
        vendor_id,
        company_name,

        total_orders,
        successful_deliveries,
        late_deliveries,
        high_risk_orders,

        fulfilled_orders,
        cancelled_orders,

        passed_inspections,
        failed_inspections,
        total_inspections,

        total_communications,
        completed_communications,
        pending_communications,
        follow_up_required,

        total_contracts,

        delivery_score,
        quality_score,
        compliance_score,

        communication_score,
        issue_resolution_score,
        contract_compliance_score,

        performance_score,
        reliability_score,

        CASE
          WHEN performance_score IS NULL
            AND reliability_score IS NULL
          THEN 'Insufficient Data'
          WHEN reliability_score >= 75
          THEN 'Low'
          WHEN reliability_score >= 50
          THEN 'Medium'
          ELSE 'High'
        END AS risk_level,

        vendor_rank

      FROM ranked_vendors

      ORDER BY
        CASE
          WHEN reliability_score IS NULL
          THEN 1
          ELSE 0
        END,
        reliability_score DESC NULLS LAST,
        vendor_id ASC`,
      queryParams
    );

    res.status(200).json({
      message:
        "Vendor performance, reliability and ranking calculated successfully",
      vendors: result.rows,
      scope: isVendor ? "own_vendor" : "management"
    });
  } catch (err) {
    console.log("Vendor performance error:", err);

    res.status(500).json({
      message: "Failed to calculate vendor performance",
      error: err.message
    });
  }
};

// ADD VENDOR
const createVendor = async (req, res) => {
  try {
    const {
      company_name,
      contact_person,
      email,
      phone,
      address,
      category_id,
    } = req.body;

    if (!category_id) {
      return res.status(400).json({
        message: "Vendor category is required",
      });
    }

    const categoryResult = await pool.query(
      `SELECT category_id
       FROM vendor_categories
       WHERE category_id = $1`,
      [category_id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid vendor category",
      });
    }

    const result = await pool.query(
      `INSERT INTO vendors
      (
        company_name,
        contact_person,
        email,
        phone,
        address,
        category_id,
        approval_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
      RETURNING
        vendor_id,
        company_name,
        contact_person,
        email,
        phone,
        address,
        category_id,
        approval_status,
        created_at`,
      [
        company_name,
        contact_person,
        email,
        phone,
        address,
        category_id,
      ]
    );

    const vendor = await pool.query(
      `SELECT
        v.vendor_id,
        v.company_name,
        v.contact_person,
        v.email,
        v.phone,
        v.address,
        v.category_id,
        vc.category_name,
        vc.category_name AS category,
        v.approval_status,
        v.created_at
       FROM vendors v
       LEFT JOIN vendor_categories vc
         ON v.category_id = vc.category_id
       WHERE v.vendor_id = $1`,
      [result.rows[0].vendor_id]
    );

    res.status(201).json({
      message: "Vendor created successfully",
      vendor: vendor.rows[0],
    });
  } catch (err) {
    console.log("Create vendor error:", err);

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// UPDATE VENDOR DETAILS
const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      company_name,
      contact_person,
      email,
      phone,
      address,
      category_id,
    } = req.body;

    if (!category_id) {
      return res.status(400).json({
        message: "Vendor category is required",
      });
    }

    const categoryResult = await pool.query(
      `SELECT category_id
       FROM vendor_categories
       WHERE category_id = $1`,
      [category_id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid vendor category",
      });
    }

    const result = await pool.query(
      `UPDATE vendors
       SET
         company_name = $1,
         contact_person = $2,
         email = $3,
         phone = $4,
         address = $5,
         category_id = $6
       WHERE vendor_id = $7
       RETURNING vendor_id`,
      [
        company_name,
        contact_person,
        email,
        phone,
        address,
        category_id,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const vendor = await pool.query(
      `SELECT
        v.vendor_id,
        v.company_name,
        v.contact_person,
        v.email,
        v.phone,
        v.address,
        v.category_id,
        vc.category_name,
        vc.category_name AS category,
        v.approval_status,
        v.created_at
       FROM vendors v
       LEFT JOIN vendor_categories vc
         ON v.category_id = vc.category_id
       WHERE v.vendor_id = $1`,
      [id]
    );

    res.status(200).json({
      message: "Vendor updated successfully",
      vendor: vendor.rows[0],
    });
  } catch (err) {
    console.log("Update vendor error:", err);

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// UPDATE APPROVAL STATUS
const updateVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Under Review",
      "Approved",
      "Rejected",
      "Active",
    ];

    if (!allowedStatuses.includes(approval_status)) {
      return res.status(400).json({
        message: "Invalid vendor approval status",
      });
    }

    const result = await pool.query(
      `UPDATE vendors
       SET approval_status = $1
       WHERE vendor_id = $2
       RETURNING vendor_id`,
      [approval_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const vendor = await pool.query(
      `SELECT
        v.vendor_id,
        v.company_name,
        v.contact_person,
        v.email,
        v.phone,
        v.address,
        v.category_id,
        vc.category_name,
        vc.category_name AS category,
        v.approval_status,
        v.created_at
       FROM vendors v
       LEFT JOIN vendor_categories vc
         ON v.category_id = vc.category_id
       WHERE v.vendor_id = $1`,
      [id]
    );

    res.status(200).json({
      message: "Vendor status updated successfully",
      vendor: vendor.rows[0],
    });
  } catch (err) {
    console.log("Update vendor status error:", err);

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

// DELETE VENDOR
const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM vendors
       WHERE vendor_id = $1
       RETURNING vendor_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      message: "Vendor deleted successfully",
    });
  } catch (err) {
    console.log("Delete vendor error:", err);

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

module.exports = {
  getVendors,
  getVendorById,
  getVendorPerformance,
  createVendor,
  updateVendor,
  updateVendorStatus,
  deleteVendor,
};