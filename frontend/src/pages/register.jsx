import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/register.css";
import { registerUser } from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role_id: "",
    company_name: "",
    category_id: "",
    address: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (Number(formData.role_id) === 4) {
      if (!formData.company_name.trim()) {
        setError("Company Name is required for Vendor registration");
        return;
      }

      if (!formData.category_id) {
        setError("Please select a Vendor Category");
        return;
      }
    }

    try {
      const registrationData = {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role_id: Number(formData.role_id),
      };

      if (Number(formData.role_id) === 4) {
        registrationData.company_name = formData.company_name.trim();
        registrationData.category_id = Number(formData.category_id);
        registrationData.address = formData.address.trim();
      }

      const data = await registerUser(registrationData);

      setMessage(data.message);

      setFormData({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        role_id: "",
        company_name: "",
        category_id: "",
        address: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const isVendor = Number(formData.role_id) === 4;

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Vendor Reliability Intelligence Platform</h1>

        <p className="subtitle">
          Register to access the Vendor Reliability Platform
        </p>

        <h2>Create Account</h2>

        <form className="register-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="full_name"
            placeholder="Full Name"
            value={formData.full_name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <select
            name="role_id"
            value={formData.role_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Role</option>
            <option value="2">Procurement Manager</option>
            <option value="3">Supply Chain Manager</option>
            <option value="4">Vendor</option>
            <option value="5">Finance Officer</option>
            <option value="6">Auditor</option>
          </select>

          {isVendor && (
            <>
              <input
                type="text"
                name="company_name"
                placeholder="Company Name"
                value={formData.company_name}
                onChange={handleChange}
                required
              />

              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Vendor Category</option>
                <option value="1">Raw Materials</option>
                <option value="2">Equipment</option>
                <option value="3">IT</option>
                <option value="4">Logistics</option>
                <option value="5">Services</option>
                <option value="6">Maintenance</option>
              </select>

              <textarea
                name="address"
                placeholder="Company Address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
              />
            </>
          )}

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          {message && (
            <p className="success-message">
              {message}
            </p>
          )}

          <button type="submit">
            Register
          </button>
        </form>

        <p>
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
