 import { useEffect, useState } from "react";
import {
  FaBell,
  FaLock,
  FaPalette,
  FaUser,
  FaSave,
  FaSignOutAlt,
} from "react-icons/fa";
import VendorSidebar from "../components/VendorSidebar";
import "../styles/VendorSettings.css";

const VendorSettings = () => {
  const [user, setUser] = useState({});
  const [settings, setSettings] = useState({
    emailNotifications: true,
    orderNotifications: true,
    paymentNotifications: true,
    contractNotifications: true,
    performanceNotifications: true,
    darkMode: false,
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const storedSettings = JSON.parse(
      localStorage.getItem("vendorSettings") || "{}"
    );

    setUser(storedUser);

    setSettings((prev) => ({
      ...prev,
      ...storedSettings,
    }));
  }, []);

  const handleChange = (event) => {
    const { name, checked } = event.target;

    setSettings((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSave = () => {
    localStorage.setItem("vendorSettings", JSON.stringify(settings));
    alert("Settings saved successfully.");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="vendor-settings-page">
      <VendorSidebar />

      <main className="vendor-settings-content">
        <div className="vendor-settings-header">
          <div>
            <h1>Settings</h1>
            <p>
              Manage your vendor account, notifications and preferences.
            </p>
          </div>

          <button className="settings-save-btn" onClick={handleSave}>
            <FaSave />
            Save Settings
          </button>
        </div>

        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-icon">
              <FaUser />
            </div>

            <div>
              <h2>Account Information</h2>
              <p>Your account information and login details.</p>
            </div>
          </div>

          <div className="settings-grid">
            <div className="settings-field">
              <label>Full Name</label>
              <input
                type="text"
                value={user.full_name || user.fullName || ""}
                readOnly
              />
            </div>

            <div className="settings-field">
              <label>Email Address</label>
              <input
                type="email"
                value={user.email || ""}
                readOnly
              />
            </div>

            <div className="settings-field">
              <label>Role</label>
              <input
                type="text"
                value={user.role_name || user.role || "Vendor"}
                readOnly
              />
            </div>

            <div className="settings-field">
              <label>Vendor ID</label>
              <input
                type="text"
                value={user.vendor_id || user.vendorId || ""}
                readOnly
              />
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-icon">
              <FaBell />
            </div>

            <div>
              <h2>Notification Preferences</h2>
              <p>
                Choose which vendor activities you want to be notified about.
              </p>
            </div>
          </div>

          <div className="settings-options">
            <label className="settings-option">
              <div>
                <strong>Email Notifications</strong>
                <span>Receive important account notifications.</span>
              </div>

              <input
                type="checkbox"
                name="emailNotifications"
                checked={settings.emailNotifications}
                onChange={handleChange}
              />
            </label>

            <label className="settings-option">
              <div>
                <strong>Purchase Order Notifications</strong>
                <span>Get updates about purchase order activity.</span>
              </div>

              <input
                type="checkbox"
                name="orderNotifications"
                checked={settings.orderNotifications}
                onChange={handleChange}
              />
            </label>

            <label className="settings-option">
              <div>
                <strong>Payment Notifications</strong>
                <span>Receive updates about invoice and payment status.</span>
              </div>

              <input
                type="checkbox"
                name="paymentNotifications"
                checked={settings.paymentNotifications}
                onChange={handleChange}
              />
            </label>

            <label className="settings-option">
              <div>
                <strong>Contract Notifications</strong>
                <span>Receive contract and compliance updates.</span>
              </div>

              <input
                type="checkbox"
                name="contractNotifications"
                checked={settings.contractNotifications}
                onChange={handleChange}
              />
            </label>

            <label className="settings-option">
              <div>
                <strong>Performance Notifications</strong>
                <span>
                  Receive updates about vendor performance evaluations.
                </span>
              </div>

              <input
                type="checkbox"
                name="performanceNotifications"
                checked={settings.performanceNotifications}
                onChange={handleChange}
              />
            </label>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-icon">
              <FaPalette />
            </div>

            <div>
              <h2>Display Preferences</h2>
              <p>Manage your preferred dashboard appearance.</p>
            </div>
          </div>

          <label className="settings-option">
            <div>
              <strong>Dark Mode</strong>
              <span>
                Use a darker appearance throughout the vendor portal.
              </span>
            </div>

            <input
              type="checkbox"
              name="darkMode"
              checked={settings.darkMode}
              onChange={handleChange}
            />
          </label>
        </section>

        <section className="settings-section security-section">
          <div className="settings-section-header">
            <div className="settings-icon">
              <FaLock />
            </div>

            <div>
              <h2>Security</h2>
              <p>Manage your account security.</p>
            </div>
          </div>

          <div className="security-content">
            <div>
              <strong>Password</strong>
              <span>
                Your password is securely protected. Use the password reset
                option if you need to change it.
              </span>
            </div>

            <button
              className="security-btn"
              onClick={() => {
                window.location.href = "/forgot-password";
              }}
            >
              Change Password
            </button>
          </div>
        </section>

        <section className="settings-danger-section">
          <div>
            <h2>Logout</h2>
            <p>
              Sign out of your VendorIQ account on this device.
            </p>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            Logout
          </button>
        </section>
      </main>
    </div>
  );
};

export default VendorSettings;