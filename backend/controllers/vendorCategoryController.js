const pool = require("../config/db");

const getVendorCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        category_id,
        category_name,
        description,
        created_at
       FROM vendor_categories
       ORDER BY category_id`
    );

    res.status(200).json({
      message: "Vendor categories fetched successfully",
      categories: result.rows,
    });
  } catch (err) {
    console.log("Get vendor categories error:", err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  getVendorCategories,
};