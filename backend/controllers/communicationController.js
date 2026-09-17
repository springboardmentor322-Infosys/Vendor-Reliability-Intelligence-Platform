 const pool = require("../config/db");

const validateEntity = async (entity_type, entity_id) => {
  if (!entity_type || !entity_id) {
    return { valid: false, message: "Entity type and entity ID are required" };
  }

  if (!["PO", "CONTRACT"].includes(entity_type)) {
    return {
      valid: false,
      message: "Entity type must be PO or CONTRACT",
    };
  }

  const table =
    entity_type === "PO"
      ? "purchase_orders"
      : "contracts";

  const idColumn =
    entity_type === "PO"
      ? "po_id"
      : "contract_id";

  const result = await pool.query(
    `SELECT ${idColumn}
     FROM ${table}
     WHERE ${idColumn} = $1`,
    [entity_id]
  );

  if (result.rows.length === 0) {
    return {
      valid: false,
      message: `${entity_type} not found`,
    };
  }

  return { valid: true };
};

const getCommunications = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        communication_id,
        vendor_id,
        communication_type,
        subject,
        message,
        communication_date,
        communication_status,
        created_at,
        contract_id,
        entity_type,
        entity_id,
        parent_communication_id,
        user_id
      FROM communication_history
      ORDER BY communication_id DESC
    `);

    res.status(200).json({
      message: "Communications fetched successfully",
      communications: result.rows,
    });
  } catch (err) {
    console.log("Get communications error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const getCommunicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        communication_id,
        vendor_id,
        communication_type,
        subject,
        message,
        communication_date,
        communication_status,
        created_at,
        contract_id,
        entity_type,
        entity_id,
        parent_communication_id,
        user_id
      FROM communication_history
      WHERE communication_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Communication not found",
      });
    }

    res.status(200).json({
      message: "Communication fetched successfully",
      communication: result.rows[0],
    });
  } catch (err) {
    console.log("Get communication error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const getCommunicationThread = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.params;

    const validation = await validateEntity(
      entity_type,
      entity_id
    );

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message,
      });
    }

    const result = await pool.query(
      `
      SELECT
        communication_id,
        vendor_id,
        communication_type,
        subject,
        message,
        communication_date,
        communication_status,
        created_at,
        contract_id,
        entity_type,
        entity_id,
        parent_communication_id,
        user_id
      FROM communication_history
      WHERE entity_type = $1
        AND entity_id = $2
      ORDER BY communication_date ASC, communication_id ASC
      `,
      [entity_type, entity_id]
    );

    res.status(200).json({
      message: "Communication thread fetched successfully",
      entity_type,
      entity_id,
      communications: result.rows,
    });
  } catch (err) {
    console.log("Get communication thread error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const createCommunication = async (req, res) => {
  try {
    const {
      vendor_id,
      communication_type,
      subject,
      message,
      communication_date,
      communication_status,
      contract_id,
      entity_type,
      entity_id,
      parent_communication_id,
      user_id,
    } = req.body;

    if (
      !vendor_id ||
      !communication_type ||
      !subject ||
      !message
    ) {
      return res.status(400).json({
        message:
          "Vendor, communication type, subject and message are required",
      });
    }

    const vendorResult = await pool.query(
      `
      SELECT vendor_id
      FROM vendors
      WHERE vendor_id = $1
      `,
      [vendor_id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    if (contract_id) {
      const contractResult = await pool.query(
        `
        SELECT contract_id
        FROM contracts
        WHERE contract_id = $1
        `,
        [contract_id]
      );

      if (contractResult.rows.length === 0) {
        return res.status(404).json({
          message: "Contract not found",
        });
      }
    }

    if (entity_type || entity_id) {
      const validation = await validateEntity(
        entity_type,
        entity_id
      );

      if (!validation.valid) {
        return res.status(400).json({
          message: validation.message,
        });
      }
    }

    if (parent_communication_id) {
      const parentResult = await pool.query(
        `
        SELECT
          communication_id,
          entity_type,
          entity_id
        FROM communication_history
        WHERE communication_id = $1
        `,
        [parent_communication_id]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({
          message: "Parent communication not found",
        });
      }

      const parent = parentResult.rows[0];

      if (
        parent.entity_type !== entity_type ||
        Number(parent.entity_id) !== Number(entity_id)
      ) {
        return res.status(400).json({
          message:
            "Reply must belong to the same communication thread",
        });
      }
    }

    const allowedStatuses = [
      "Pending",
      "Sent",
      "Resolved",
      "Closed",
    ];

    const finalStatus =
      communication_status || "Pending";

    if (!allowedStatuses.includes(finalStatus)) {
      return res.status(400).json({
        message: "Invalid communication status",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO communication_history
      (
        vendor_id,
        communication_type,
        subject,
        message,
        communication_date,
        communication_status,
        created_at,
        contract_id,
        entity_type,
        entity_id,
        parent_communication_id,
        user_id
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        CURRENT_TIMESTAMP,
        $7,
        $8,
        $9,
        $10,
        $11
      )
      RETURNING
        communication_id,
        vendor_id,
        communication_type,
        subject,
        message,
        communication_date,
        communication_status,
        created_at,
        contract_id,
        entity_type,
        entity_id,
        parent_communication_id,
        user_id
      `,
      [
        vendor_id,
        communication_type.trim(),
        subject.trim(),
        message.trim(),
        communication_date || new Date(),
        finalStatus,
        contract_id || null,
        entity_type || null,
        entity_id || null,
        parent_communication_id || null,
        user_id || req.user?.user_id || null,
      ]
    );

    res.status(201).json({
      message: "Communication created successfully",
      communication: result.rows[0],
    });
  } catch (err) {
    console.log("Create communication error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const replyToCommunication = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      message,
      communication_type,
      user_id,
    } = req.body;

    if (!vendor_id || !message) {
      return res.status(400).json({
        message: "Vendor and message are required",
      });
    }

    const parentResult = await pool.query(
      `
      SELECT
        communication_id,
        vendor_id,
        subject,
        entity_type,
        entity_id
      FROM communication_history
      WHERE communication_id = $1
      `,
      [id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Parent communication not found",
      });
    }

    const parent = parentResult.rows[0];

    if (!parent.entity_type || !parent.entity_id) {
      return res.status(400).json({
        message:
          "Parent communication is not attached to a PO or Contract",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO communication_history
      (
        vendor_id,
        communication_type,
        subject,
        message,
        communication_date,
        communication_status,
        created_at,
        contract_id,
        entity_type,
        entity_id,
        parent_communication_id,
        user_id
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        CURRENT_TIMESTAMP,
        'Sent',
        CURRENT_TIMESTAMP,
        $5,
        $6,
        $7,
        $8,
        $9
      )
      RETURNING
        communication_id,
        vendor_id,
        communication_type,
        subject,
        message,
        communication_date,
        communication_status,
        created_at,
        contract_id,
        entity_type,
        entity_id,
        parent_communication_id,
        user_id
      `,
      [
        vendor_id,
        communication_type || "Reply",
        `Re: ${parent.subject}`,
        message.trim(),
        parent.entity_type === "CONTRACT"
          ? parent.entity_id
          : null,
        parent.entity_type,
        parent.entity_id,
        id,
        user_id || req.user?.user_id || null,
      ]
    );

    res.status(201).json({
      message: "Reply added successfully",
      communication: result.rows[0],
    });
  } catch (err) {
    console.log("Reply communication error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const updateCommunication = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      communication_type,
      subject,
      message,
      communication_date,
      communication_status,
      contract_id,
      entity_type,
      entity_id,
    } = req.body;

    if (
      !vendor_id ||
      !communication_type ||
      !subject ||
      !message
    ) {
      return res.status(400).json({
        message:
          "Vendor, communication type, subject and message are required",
      });
    }

    const allowedStatuses = [
      "Pending",
      "Sent",
      "Resolved",
      "Closed",
    ];

    if (
      communication_status &&
      !allowedStatuses.includes(communication_status)
    ) {
      return res.status(400).json({
        message: "Invalid communication status",
      });
    }

    const vendorResult = await pool.query(
      `
      SELECT vendor_id
      FROM vendors
      WHERE vendor_id = $1
      `,
      [vendor_id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    if (contract_id) {
      const contractResult = await pool.query(
        `
        SELECT contract_id
        FROM contracts
        WHERE contract_id = $1
        `,
        [contract_id]
      );

      if (contractResult.rows.length === 0) {
        return res.status(404).json({
          message: "Contract not found",
        });
      }
    }

    if (entity_type || entity_id) {
      const validation = await validateEntity(
        entity_type,
        entity_id
      );

      if (!validation.valid) {
        return res.status(400).json({
          message: validation.message,
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE communication_history
      SET
        vendor_id = $1,
        communication_type = $2,
        subject = $3,
        message = $4,
        communication_date = $5,
        communication_status = $6,
        contract_id = $7,
        entity_type = $8,
        entity_id = $9
      WHERE communication_id = $10
      RETURNING
        communication_id,
        vendor_id,
        communication_type,
        subject,
        message,
        communication_date,
        communication_status,
        created_at,
        contract_id,
        entity_type,
        entity_id,
        parent_communication_id,
        user_id
      `,
      [
        vendor_id,
        communication_type.trim(),
        subject.trim(),
        message.trim(),
        communication_date || new Date(),
        communication_status || "Pending",
        contract_id || null,
        entity_type || null,
        entity_id || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Communication not found",
      });
    }

    res.status(200).json({
      message: "Communication updated successfully",
      communication: result.rows[0],
    });
  } catch (err) {
    console.log("Update communication error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const updateCommunicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { communication_status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Sent",
      "Resolved",
      "Closed",
    ];

    if (!allowedStatuses.includes(communication_status)) {
      return res.status(400).json({
        message: "Invalid communication status",
      });
    }

    const result = await pool.query(
      `
      UPDATE communication_history
      SET communication_status = $1
      WHERE communication_id = $2
      RETURNING
        communication_id,
        vendor_id,
        communication_type,
        subject,
        message,
        communication_date,
        communication_status,
        created_at,
        contract_id,
        entity_type,
        entity_id,
        parent_communication_id,
        user_id
      `,
      [communication_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Communication not found",
      });
    }

    res.status(200).json({
      message:
        "Communication status updated successfully",
      communication: result.rows[0],
    });
  } catch (err) {
    console.log(
      "Update communication status error:",
      err
    );

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const deleteCommunication = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM communication_history
      WHERE communication_id = $1
      RETURNING communication_id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Communication not found",
      });
    }

    res.status(200).json({
      message: "Communication deleted successfully",
    });
  } catch (err) {
    console.log("Delete communication error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  getCommunications,
  getCommunicationById,
  getCommunicationThread,
  createCommunication,
  replyToCommunication,
  updateCommunication,
  updateCommunicationStatus,
  deleteCommunication,
};