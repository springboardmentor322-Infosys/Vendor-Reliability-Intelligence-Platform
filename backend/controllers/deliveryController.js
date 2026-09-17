const pool = require("../config/db");

// GET ALL DELIVERIES
const getDeliveries = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        delivery_id,
        order_id,
        order_date,
        shipping_date,
        delivery_status,
        shipping_mode,
        late_delivery_risk,
        order_region,
        order_country
      FROM deliveries
      ORDER BY delivery_id DESC`
    );

    res.status(200).json({
      deliveries: result.rows,
    });
  } catch (error) {
    console.error("Get deliveries error:", error);

    res.status(500).json({
      message: "Failed to fetch deliveries",
    });
  }
};

// GET DELIVERY BY ID
const getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        delivery_id,
        order_id,
        order_date,
        shipping_date,
        delivery_status,
        shipping_mode,
        late_delivery_risk,
        order_region,
        order_country
      FROM deliveries
      WHERE delivery_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Delivery not found",
      });
    }

    res.status(200).json({
      delivery: result.rows[0],
    });
  } catch (error) {
    console.error("Get delivery error:", error);

    res.status(500).json({
      message: "Failed to fetch delivery",
    });
  }
};

module.exports = {
  getDeliveries,
  getDeliveryById,
};