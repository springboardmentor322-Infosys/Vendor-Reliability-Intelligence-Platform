 import Sidebar from "./sidebar";
import "../styles/RoleDashboard.css";

import { FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function RoleDashboard({
  title,
  subtitle,
  stats,
  sections,
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <div className="role-dashboard-container">

      <Sidebar />

      <main className="role-dashboard-main">

        {/* Header */}

        <header className="role-dashboard-header">

          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <button
            className="role-logout-btn"
            onClick={handleLogout}
          >
            <FaSignOutAlt />
            Logout
          </button>

        </header>


        {/* Statistics */}

        <section className="role-stats">

          {stats.map((stat, index) => (

            <div
              className="role-stat-card"
              key={index}
            >

              <div className="role-stat-icon">
                {stat.icon}
              </div>

              <div>
                <h2>{stat.value}</h2>
                <p>{stat.label}</p>
              </div>

            </div>

          ))}

        </section>


        {/* Dashboard Sections */}

        <section className="role-dashboard-sections">

          {sections.map((section, index) => (

            <div
              className="role-section-card"
              key={index}
            >

              <h2>{section.title}</h2>

              <p>{section.description}</p>

              <div className="role-section-value">
                {section.value}
              </div>

            </div>

          ))}

        </section>


        {/* Recent Activity */}

        <section className="role-recent-card">

          <h2>Recent Activity</h2>

          <div className="activity-row">
            <span>System activity</span>

            <span className="activity-status">
              Active
            </span>
          </div>

          <div className="activity-row">
            <span>Platform services</span>

            <span className="activity-status">
              Operational
            </span>
          </div>

          <div className="activity-row">
            <span>Database connection</span>

            <span className="activity-status">
              Connected
            </span>
          </div>

        </section>

      </main>

    </div>
  );
}

export default RoleDashboard;