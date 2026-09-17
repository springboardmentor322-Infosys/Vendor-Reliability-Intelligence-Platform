 const pool = require("../config/db");

const addExpiryDetails = (contract) => {
  if (!contract || !contract.end_date) {
    return {
      ...contract,
      days_remaining: null,
      expiry_status: "No Expiry Date",
      expiry_risk: "Unknown",
    };
  }

  const today = new Date();
  const expiryDate = new Date(contract.end_date);

  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const difference =
    expiryDate.getTime() - today.getTime();

  const daysRemaining = Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );

  let expiryStatus;
  let expiryRisk;

  if (daysRemaining < 0) {
    expiryStatus = "Expired";
    expiryRisk = "High";
  } else if (daysRemaining <= 30) {
    expiryStatus = "Expires within 30 days";
    expiryRisk = "High";
  } else if (daysRemaining <= 60) {
    expiryStatus = "Expires within 60 days";
    expiryRisk = "Medium";
  } else if (daysRemaining <= 90) {
    expiryStatus = "Expires within 90 days";
    expiryRisk = "Low";
  } else {
    expiryStatus = "More than 90 days";
    expiryRisk = "Safe";
  }

  return {
    ...contract,
    days_remaining: daysRemaining,
    expiry_status: expiryStatus,
    expiry_risk: expiryRisk,
  };
};

const getContracts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        contract_id,
        vendor_id,
        contract_title,
        start_date,
        end_date,
        contract_value,
        status,
        description,
        renewal_notice_days,
        compliance_status
       FROM contracts
       ORDER BY contract_id DESC`
    );

    const contracts = result.rows.map(addExpiryDetails);

    res.status(200).json({
      message: "Contracts fetched successfully",
      contracts,
    });
  } catch (err) {
    console.log("Get contracts error:", err);

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

const getContractById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        contract_id,
        vendor_id,
        contract_title,
        start_date,
        end_date,
        contract_value,
        status,
        description,
        renewal_notice_days,
        compliance_status
       FROM contracts
       WHERE contract_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Contract not found",
      });
    }

    const contract = addExpiryDetails(
      result.rows[0]
    );

    res.status(200).json({
      message: "Contract fetched successfully",
      contract,
    });
  } catch (err) {
    console.log("Get contract error:", err);

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

const createContract = async (req, res) => {
  try {
    const {
      vendor_id,
      contract_title,
      start_date,
      end_date,
      contract_value,
      description,
      renewal_notice_days,
      compliance_status,
    } = req.body;

    if (
      !vendor_id ||
      !contract_title ||
      !start_date ||
      !end_date ||
      !contract_value
    ) {
      return res.status(400).json({
        message:
          "Vendor, contract title, dates and contract value are required",
      });
    }

    if (Number(contract_value) <= 0) {
      return res.status(400).json({
        message: "Contract value must be greater than 0",
      });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    const allowedComplianceStatuses = [
      "Compliant",
      "Under Review",
      "Non-Compliant",
    ];

    const finalComplianceStatus =
      compliance_status || "Compliant";

    if (
      !allowedComplianceStatuses.includes(
        finalComplianceStatus
      )
    ) {
      return res.status(400).json({
        message: "Invalid compliance status",
      });
    }

    const renewalDays =
      renewal_notice_days === undefined ||
      renewal_notice_days === ""
        ? 30
        : Number(renewal_notice_days);

    if (renewalDays < 0) {
      return res.status(400).json({
        message:
          "Renewal notice days cannot be negative",
      });
    }

    const vendorResult = await pool.query(
      `SELECT vendor_id
       FROM vendors
       WHERE vendor_id = $1`,
      [vendor_id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const result = await pool.query(
      `INSERT INTO contracts
      (
        vendor_id,
        contract_title,
        start_date,
        end_date,
        contract_value,
        status,
        description,
        renewal_notice_days,
        compliance_status
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9
      )
      RETURNING
        contract_id,
        vendor_id,
        contract_title,
        start_date,
        end_date,
        contract_value,
        status,
        description,
        renewal_notice_days,
        compliance_status`,
      [
        vendor_id,
        contract_title.trim(),
        start_date,
        end_date,
        contract_value,
        "Draft",
        description || null,
        renewalDays,
        finalComplianceStatus,
      ]
    );

    const contract = addExpiryDetails(
      result.rows[0]
    );

    res.status(201).json({
      message: "Contract created successfully",
      contract,
    });
  } catch (err) {
    console.log("Create contract error:", err);

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

const updateContract = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      vendor_id,
      contract_title,
      start_date,
      end_date,
      contract_value,
      status,
      description,
      renewal_notice_days,
      compliance_status,
    } = req.body;

    if (
      !vendor_id ||
      !contract_title ||
      !start_date ||
      !end_date ||
      !contract_value
    ) {
      return res.status(400).json({
        message:
          "Vendor, contract title, dates and contract value are required",
      });
    }

    if (Number(contract_value) <= 0) {
      return res.status(400).json({
        message: "Contract value must be greater than 0",
      });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    const allowedStatuses = [
      "Draft",
      "Active",
      "Expired",
      "Terminated",
    ];

    const finalStatus = status || "Draft";

    if (!allowedStatuses.includes(finalStatus)) {
      return res.status(400).json({
        message: "Invalid contract status",
      });
    }

    const allowedComplianceStatuses = [
      "Compliant",
      "Under Review",
      "Non-Compliant",
    ];

    const finalComplianceStatus =
      compliance_status || "Compliant";

    if (
      !allowedComplianceStatuses.includes(
        finalComplianceStatus
      )
    ) {
      return res.status(400).json({
        message: "Invalid compliance status",
      });
    }

    const renewalDays =
      renewal_notice_days === undefined ||
      renewal_notice_days === ""
        ? 30
        : Number(renewal_notice_days);

    if (renewalDays < 0) {
      return res.status(400).json({
        message:
          "Renewal notice days cannot be negative",
      });
    }

    const vendorResult = await pool.query(
      `SELECT vendor_id
       FROM vendors
       WHERE vendor_id = $1`,
      [vendor_id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const result = await pool.query(
      `UPDATE contracts
       SET
         vendor_id = $1,
         contract_title = $2,
         start_date = $3,
         end_date = $4,
         contract_value = $5,
         status = $6,
         description = $7,
         renewal_notice_days = $8,
         compliance_status = $9
       WHERE contract_id = $10
       RETURNING
         contract_id,
         vendor_id,
         contract_title,
         start_date,
         end_date,
         contract_value,
         status,
         description,
         renewal_notice_days,
         compliance_status`,
      [
        vendor_id,
        contract_title.trim(),
        start_date,
        end_date,
        contract_value,
        finalStatus,
        description || null,
        renewalDays,
        finalComplianceStatus,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Contract not found",
      });
    }

    const contract = addExpiryDetails(
      result.rows[0]
    );

    res.status(200).json({
      message: "Contract updated successfully",
      contract,
    });
  } catch (err) {
    console.log("Update contract error:", err);

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

const updateContractStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "Draft",
      "Active",
      "Expired",
      "Terminated",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid contract status",
      });
    }

    const result = await pool.query(
      `UPDATE contracts
       SET status = $1
       WHERE contract_id = $2
       RETURNING
         contract_id,
         vendor_id,
         contract_title,
         start_date,
         end_date,
         contract_value,
         status,
         description,
         renewal_notice_days,
         compliance_status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Contract not found",
      });
    }

    const contract = addExpiryDetails(
      result.rows[0]
    );

    res.status(200).json({
      message: "Contract status updated successfully",
      contract,
    });
  } catch (err) {
    console.log(
      "Update contract status error:",
      err
    );

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

const updateComplianceStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { compliance_status } = req.body;

    const allowedComplianceStatuses = [
      "Compliant",
      "Under Review",
      "Non-Compliant",
    ];

    if (
      !allowedComplianceStatuses.includes(
        compliance_status
      )
    ) {
      return res.status(400).json({
        message: "Invalid compliance status",
      });
    }

    const result = await pool.query(
      `UPDATE contracts
       SET compliance_status = $1
       WHERE contract_id = $2
       RETURNING
         contract_id,
         vendor_id,
         contract_title,
         start_date,
         end_date,
         contract_value,
         status,
         description,
         renewal_notice_days,
         compliance_status`,
      [compliance_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Contract not found",
      });
    }

    const contract = addExpiryDetails(
      result.rows[0]
    );

    res.status(200).json({
      message:
        "Compliance status updated successfully",
      contract,
    });
  } catch (err) {
    console.log(
      "Update compliance status error:",
      err
    );

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM contracts
       WHERE contract_id = $1
       RETURNING contract_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Contract not found",
      });
    }

    res.status(200).json({
      message: "Contract deleted successfully",
    });
  } catch (err) {
    console.log("Delete contract error:", err);

    res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

module.exports = {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  updateContractStatus,
  updateComplianceStatus,
  deleteContract,
};