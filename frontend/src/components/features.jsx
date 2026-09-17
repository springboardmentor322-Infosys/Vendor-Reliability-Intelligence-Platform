 import "../styles/features.css";
import {
  FaUsers,
  FaShoppingCart,
  FaChartLine,
  FaFileContract,
  FaBell,
  FaChartPie,
} from "react-icons/fa";

function Features() {
  return (
    <section className="features">

      <h2>Platform Features</h2>

      <p className="features-subtitle">
        Everything you need to manage vendors and procurement efficiently.
      </p>

      <div className="features-grid">

        <div className="feature-card">
          <FaUsers className="feature-icon" />
          <h3>Vendor Management</h3>
          <p>Manage vendor profiles, categories and approvals.</p>
        </div>

        <div className="feature-card">
          <FaShoppingCart className="feature-icon" />
          <h3>Procurement</h3>
          <p>Create and monitor procurement requests.</p>
        </div>

        <div className="feature-card">
          <FaChartLine className="feature-icon" />
          <h3>Performance</h3>
          <p>Track supplier performance using KPIs.</p>
        </div>

        <div className="feature-card">
          <FaFileContract className="feature-icon" />
          <h3>Contracts</h3>
          <p>Manage contracts and compliance records.</p>
        </div>

        <div className="feature-card">
          <FaBell className="feature-icon" />
          <h3>Notifications</h3>
          <p>Receive alerts for approvals and renewals.</p>
        </div>

        <div className="feature-card">
          <FaChartPie className="feature-icon" />
          <h3>Analytics</h3>
          <p>Gain insights through reports and dashboards.</p>
        </div>

      </div>

    </section>
  );
}

export default Features;