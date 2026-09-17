 import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/login.css";
import { loginUser } from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    try {
      const data = await loginUser({
        email,
        password,
      });

      // Store JWT token
      localStorage.setItem("token", data.token);

      // Store logged-in user information
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // Role-based navigation
      if (data.user.role === "Administrator") {
        navigate("/admin/dashboard");
      
        } else if (data.user.role === "Procurement Manager") {
  navigate("/procurement-dashboard");

} else if (data.user.role === "Supply Chain Manager") {
  navigate("/supply-chain-dashboard");

} else if (data.user.role === "Finance Officer") {
  navigate("/finance-dashboard");

} else if (data.user.role === "Vendor") {
  navigate("/vendor-dashboard");

} else if (data.user.role === "Auditor") {
  navigate("/auditor-dashboard");


      } else {
        navigate("/unauthorized");
      }

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">

      <div className="login-card">

        <h1>
          Vendor Reliability Intelligence Platform
        </h1>

        <p className="subtitle">
          Securely sign in to your account
        </p>

        <h2>Login</h2>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <div className="forgot-link">

            <Link to="/forgot-password">
              Forgot Password?
            </Link>

          </div>

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          <button type="submit">
            Login
          </button>

        </form>

        <p>
          Don't have an account?{" "}

          <Link to="/register">
            Register
          </Link>

        </p>

      </div>

    </div>
  );
}

export default Login;