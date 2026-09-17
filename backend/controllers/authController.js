const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      full_name,
      email,
      password,
      phone,
      role_id,
      company_name,
      category_id,
      address,
    } = req.body;

    if (Number(role_id) === 1) {
      return res.status(403).json({
        message: "Administrator registration is not allowed",
      });
    }

    if (Number(role_id) === 4) {
      if (!company_name || !company_name.trim()) {
        return res.status(400).json({
          message: "Company Name is required for Vendor registration",
        });
      }

      if (!category_id) {
        return res.status(400).json({
          message: "Vendor Category is required for Vendor registration",
        });
      }

      const categoryCheck = await client.query(
        "SELECT category_id FROM vendor_categories WHERE category_id = $1",
        [category_id]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Invalid Vendor Category",
        });
      }
    }

    const existingUser = await client.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users
      (full_name, email, password, phone, role_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, full_name, email, phone, role_id, vendor_id, status, created_at`,
      [
        full_name,
        email,
        hashedPassword,
        phone,
        role_id,
      ]
    );

    let user = userResult.rows[0];

    if (Number(role_id) === 4) {
      const vendorResult = await client.query(
        `INSERT INTO vendors
        (company_name, contact_person, email, phone, address, category_id, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          vendor_id,
          company_name,
          contact_person,
          email,
          phone,
          address,
          approval_status,
          created_at,
          category_id,
          user_id`,
        [
          company_name.trim(),
          full_name,
          email,
          phone,
          address || null,
          category_id,
          user.user_id,
        ]
      );

      const vendor = vendorResult.rows[0];

      const updatedUserResult = await client.query(
        `UPDATE users
         SET vendor_id = $1
         WHERE user_id = $2
         RETURNING
           user_id,
           full_name,
           email,
           phone,
           role_id,
           vendor_id,
           status,
           created_at`,
        [
          vendor.vendor_id,
          user.user_id,
        ]
      );

      user = updatedUserResult.rows[0];
    }

    await client.query("COMMIT");

    res.status(201).json({
      message:
        Number(role_id) === 4
          ? "Vendor registration successful. Your account is pending approval."
          : "Registration Successful",
      user,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });
  } finally {
    client.release();
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT
        users.*,
        roles.role_name
      FROM users
      LEFT JOIN roles
      ON users.role_id = roles.role_id
      WHERE users.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        role_id: user.role_id,
        role: user.role_name,
        email: user.email,
        vendor_id: user.vendor_id ?? null,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login Successful",
      token: token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role: user.role_name,
        vendor_id: user.vendor_id ?? null,
        status: user.status,
      },
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.phone,
        u.role_id,
        u.vendor_id,
        r.role_name AS role,
        u.status,
        u.created_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile fetched successfully",
      user: result.rows[0],
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET full_name = $1,
           phone = $2
       WHERE user_id = $3
       RETURNING user_id, full_name, email, phone, role_id, vendor_id, status, created_at`,
      [
        full_name,
        phone,
        req.user.user_id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: result.rows[0],
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
};
