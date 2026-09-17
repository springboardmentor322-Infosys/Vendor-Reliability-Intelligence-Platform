 import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/forgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset request failed");
      }

      setMessage(data.message);

      /*
        Demo mode:
        The backend returns a reset token instead of
        sending an actual email.
      */

      if (data.resetToken) {
        navigate(
          `/reset-password?email=${encodeURIComponent(
            email
          )}&token=${data.resetToken}`
        );
      }

    } catch (err) {
      console.error("Forgot Password Error:", err);

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">

      <div className="forgot-card">

        <h1>
          Vendor Reliability Intelligence Platform
        </h1>

        <h2>Forgot Password</h2>

        <div className="icon-box">
          🔒
        </div>

        <p className="info">
          Enter your registered email address to reset your password.
        </p>

        {message && (
          <p className="success-message">
            {message}
          </p>
        )}

        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        <form
          className="forgot-form"
          onSubmit={handleSubmit}
        >

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Processing..." : "Reset Password"}
          </button>

        </form>

        <p>
          Remember your password?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>

      </div>

    </div>
  );
}

export default ForgotPassword;