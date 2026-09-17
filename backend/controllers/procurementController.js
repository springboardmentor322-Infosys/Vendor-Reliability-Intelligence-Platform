 const pool = require("../config/db");

const APPROVAL_THRESHOLD = 100000;

const getProcurementRequests = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pr.request_id,
        pr.request_title,
        pr.description,
        pr.department,
        pr.requested_by,
        pr.status,
        pr.created_at,
        COUNT(pi.item_id)::int AS item_count,
        COALESCE(SUM(pi.quantity * pi.estimated_cost), 0) AS total_estimated_cost
      FROM procurement_requests pr
      LEFT JOIN procurement_items pi
        ON pr.request_id = pi.request_id
      GROUP BY
        pr.request_id,
        pr.request_title,
        pr.description,
        pr.department,
        pr.requested_by,
        pr.status,
        pr.created_at
      ORDER BY pr.request_id DESC
    `);

    res.status(200).json({
      message: "Procurement requests fetched successfully",
      requests: result.rows,
    });
  } catch (err) {
    console.log("Get procurement requests error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const getProcurementRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const requestResult = await pool.query(
      `
      SELECT
        request_id,
        request_title,
        description,
        department,
        requested_by,
        status,
        created_at
      FROM procurement_requests
      WHERE request_id = $1
      `,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        message: "Procurement request not found",
      });
    }

    const itemsResult = await pool.query(
      `
      SELECT
        item_id,
        request_id,
        item_name,
        quantity,
        estimated_cost
      FROM procurement_items
      WHERE request_id = $1
      ORDER BY item_id
      `,
      [id]
    );

    res.status(200).json({
      message: "Procurement request fetched successfully",
      request: {
        ...requestResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    console.log("Get procurement request error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const createProcurementRequest = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      request_title,
      description,
      department,
      items,
    } = req.body;

    if (!request_title || !department) {
      return res.status(400).json({
        message: "Request title and department are required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "At least one procurement item is required",
      });
    }

    for (const item of items) {
      if (
        !item.item_name ||
        !item.quantity ||
        Number(item.quantity) <= 0 ||
        item.estimated_cost === "" ||
        item.estimated_cost === undefined ||
        Number(item.estimated_cost) < 0
      ) {
        return res.status(400).json({
          message:
            "Each item must have a valid name, quantity and estimated cost",
        });
      }
    }

    await client.query("BEGIN");

    const requested_by = req.user.user_id;

    const requestResult = await client.query(
      `
      INSERT INTO procurement_requests
      (
        request_title,
        description,
        department,
        requested_by,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        request_id,
        request_title,
        description,
        department,
        requested_by,
        status,
        created_at
      `,
      [
        request_title,
        description || "",
        department,
        requested_by,
        "Pending",
      ]
    );

    const request = requestResult.rows[0];

    for (const item of items) {
      await client.query(
        `
        INSERT INTO procurement_items
        (
          request_id,
          item_name,
          quantity,
          estimated_cost
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
          request.request_id,
          item.item_name,
          Number(item.quantity),
          Number(item.estimated_cost),
        ]
      );
    }

    await client.query("COMMIT");

    const itemsResult = await pool.query(
      `
      SELECT
        item_id,
        request_id,
        item_name,
        quantity,
        estimated_cost
      FROM procurement_items
      WHERE request_id = $1
      ORDER BY item_id
      `,
      [request.request_id]
    );

    res.status(201).json({
      message: "Procurement request created successfully",
      request: {
        ...request,
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.log("Create procurement request error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  } finally {
    client.release();
  }
};

const updateProcurementRequest = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      request_title,
      description,
      department,
      items,
    } = req.body;

    if (!request_title || !department) {
      return res.status(400).json({
        message: "Request title and department are required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "At least one procurement item is required",
      });
    }

    for (const item of items) {
      if (
        !item.item_name ||
        !item.quantity ||
        Number(item.quantity) <= 0 ||
        item.estimated_cost === "" ||
        item.estimated_cost === undefined ||
        Number(item.estimated_cost) < 0
      ) {
        return res.status(400).json({
          message:
            "Each item must have a valid name, quantity and estimated cost",
        });
      }
    }

    await client.query("BEGIN");

    const existingRequest = await client.query(
      `
      SELECT
        request_id,
        status
      FROM procurement_requests
      WHERE request_id = $1
      `,
      [id]
    );

    if (existingRequest.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Procurement request not found",
      });
    }

    if (existingRequest.rows[0].status !== "Pending") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          `Only Pending procurement requests can be edited. Current status is ${existingRequest.rows[0].status}`,
      });
    }

    const result = await client.query(
      `
      UPDATE procurement_requests
      SET
        request_title = $1,
        description = $2,
        department = $3
      WHERE request_id = $4
      RETURNING
        request_id,
        request_title,
        description,
        department,
        requested_by,
        status,
        created_at
      `,
      [
        request_title,
        description || "",
        department,
        id,
      ]
    );

    await client.query(
      `
      DELETE FROM procurement_items
      WHERE request_id = $1
      `,
      [id]
    );

    for (const item of items) {
      await client.query(
        `
        INSERT INTO procurement_items
        (
          request_id,
          item_name,
          quantity,
          estimated_cost
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
          id,
          item.item_name,
          Number(item.quantity),
          Number(item.estimated_cost),
        ]
      );
    }

    await client.query("COMMIT");

    const itemsResult = await pool.query(
      `
      SELECT
        item_id,
        request_id,
        item_name,
        quantity,
        estimated_cost
      FROM procurement_items
      WHERE request_id = $1
      ORDER BY item_id
      `,
      [id]
    );

    res.status(200).json({
      message: "Procurement request updated successfully",
      request: {
        ...result.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.log("Update procurement request error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  } finally {
    client.release();
  }
};

const deleteProcurementRequest = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    await client.query(
      `
      DELETE FROM procurement_items
      WHERE request_id = $1
      `,
      [id]
    );

    const requestResult = await client.query(
      `
      DELETE FROM procurement_requests
      WHERE request_id = $1
      RETURNING request_id
      `,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Procurement request not found",
      });
    }

    await client.query("COMMIT");

    res.status(200).json({
      message: "Procurement request deleted successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.log("Delete procurement request error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  } finally {
    client.release();
  }
};

const approveProcurementRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const requestResult = await pool.query(
      `
      SELECT
        pr.request_id,
        pr.status,
        COALESCE(
          SUM(pi.quantity * pi.estimated_cost),
          0
        ) AS total_estimated_cost
      FROM procurement_requests pr
      LEFT JOIN procurement_items pi
        ON pr.request_id = pi.request_id
      WHERE pr.request_id = $1
      GROUP BY
        pr.request_id,
        pr.status
      `,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        message: "Procurement request not found",
      });
    }

    const request = requestResult.rows[0];
    const totalAmount = Number(request.total_estimated_cost);

    if (request.status !== "Pending") {
      return res.status(400).json({
        message:
          `Request cannot be approved because its current status is ${request.status}`,
      });
    }

    if (
      totalAmount <= APPROVAL_THRESHOLD &&
      req.user.role !== "Procurement Manager"
    ) {
      return res.status(403).json({
        message:
          "Procurement Manager approval is required for requests up to ₹1,00,000",
      });
    }

    if (
      totalAmount > APPROVAL_THRESHOLD &&
      req.user.role !== "Finance Officer"
    ) {
      return res.status(403).json({
        message:
          "Finance Officer approval is required for requests above ₹1,00,000",
      });
    }

    const result = await pool.query(
      `
      UPDATE procurement_requests
      SET status = 'Approved'
      WHERE request_id = $1
        AND status = 'Pending'
      RETURNING
        request_id,
        request_title,
        department,
        requested_by,
        status,
        created_at
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Request could not be approved",
      });
    }

    res.status(200).json({
      message: "Procurement request approved successfully",
      request: result.rows[0],
      approved_by: req.user.role,
      total_estimated_cost: totalAmount,
    });
  } catch (err) {
    console.log("Approve procurement request error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const rejectProcurementRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const requestResult = await pool.query(
      `
      SELECT
        pr.request_id,
        pr.status,
        COALESCE(
          SUM(pi.quantity * pi.estimated_cost),
          0
        ) AS total_estimated_cost
      FROM procurement_requests pr
      LEFT JOIN procurement_items pi
        ON pr.request_id = pi.request_id
      WHERE pr.request_id = $1
      GROUP BY
        pr.request_id,
        pr.status
      `,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        message: "Procurement request not found",
      });
    }

    const request = requestResult.rows[0];
    const totalAmount = Number(request.total_estimated_cost);

    if (request.status !== "Pending") {
      return res.status(400).json({
        message:
          `Request cannot be rejected because its current status is ${request.status}`,
      });
    }

    if (
      totalAmount <= APPROVAL_THRESHOLD &&
      req.user.role !== "Procurement Manager"
    ) {
      return res.status(403).json({
        message:
          "Procurement Manager approval is required for requests up to ₹1,00,000",
      });
    }

    if (
      totalAmount > APPROVAL_THRESHOLD &&
      req.user.role !== "Finance Officer"
    ) {
      return res.status(403).json({
        message:
          "Finance Officer approval is required for requests above ₹1,00,000",
      });
    }

    const result = await pool.query(
      `
      UPDATE procurement_requests
      SET status = 'Rejected'
      WHERE request_id = $1
        AND status = 'Pending'
      RETURNING
        request_id,
        request_title,
        department,
        requested_by,
        status,
        created_at
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Request could not be rejected",
      });
    }

    res.status(200).json({
      message: "Procurement request rejected successfully",
      request: result.rows[0],
      rejected_by: req.user.role,
      total_estimated_cost: totalAmount,
    });
  } catch (err) {
    console.log("Reject procurement request error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  getProcurementRequests,
  getProcurementRequestById,
  createProcurementRequest,
  updateProcurementRequest,
  deleteProcurementRequest,
  approveProcurementRequest,
  rejectProcurementRequest,
};