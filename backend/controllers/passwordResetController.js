const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const result = await pool.query(
      "SELECT user_id, email FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No account found with this email",
      });
    }

    const user = result.rows[0];

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the hash of the token
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token valid for 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidate previous unused tokens
    await pool.query(
      `UPDATE password_reset_tokens
       SET used = TRUE
       WHERE user_id = $1
       AND used = FALSE`,
      [user.user_id]
    );

    await pool.query(
      `INSERT INTO password_reset_tokens
       (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.user_id, tokenHash, expiresAt]
    );

    /*
      DEMO MODE:
      In a production application, this token would be
      sent through an email service instead of returning it.
    */

    res.status(200).json({
      message: "Password reset request successful",
      resetToken: resetToken,
    });

  } catch (error) {
    console.log("Forgot Password Error:", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};


const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        message: "Email, token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters",
      });
    }

    const userResult = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userId = userResult.rows[0].user_id;

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const tokenResult = await pool.query(
      `SELECT *
       FROM password_reset_tokens
       WHERE user_id = $1
       AND token_hash = $2
       AND used = FALSE
       AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password = $1
       WHERE user_id = $2`,
      [hashedPassword, userId]
    );

    // Mark token as used
    await pool.query(
      `UPDATE password_reset_tokens
       SET used = TRUE
       WHERE reset_id = $1`,
      [tokenResult.rows[0].reset_id]
    );

    res.status(200).json({
      message: "Password reset successfully",
    });

  } catch (error) {
    console.log("Reset Password Error:", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};


module.exports = {
  forgotPassword,
  resetPassword,
};