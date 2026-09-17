 import { NavLink, useNavigate } from "react-router-dom";

import {
  FaTachometerAlt,
  FaUsers,
  FaFileContract,
  FaChartLine,
  FaShoppingCart,
  FaClipboardList,
  FaComments,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

import "../styles/AuditorSidebar.css";

export default function AuditorSidebar() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <aside className="auditor-sidebar">

      <div className="auditor-sidebar-brand">
        <h2>VendorIQ</h2>
        <p>Vendor Reliability Platform</p>
      </div>

      <nav className="auditor-sidebar-menu">

        <p className="auditor-menu-title">
          MAIN MENU
        </p>

        {/* Dashboard */}

        <NavLink
          to="/auditor-dashboard"
          className={({ isActive }) =>
            `auditor-nav-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <FaTachometerAlt />
          <span>Dashboard</span>
        </NavLink>

        {/* Vendor Management */}

        <NavLink
          to="/vendors"
          className={({ isActive }) =>
            `auditor-nav-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <FaUsers />
          <span>Vendor Management</span>
        </NavLink>

        {/* Procurement */}

        <NavLink
          to="/procurement"
          className={({ isActive }) =>
            `auditor-nav-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <FaShoppingCart />
          <span>Procurement</span>
        </NavLink>

        {/* Purchase Orders */}

        <NavLink
          to="/purchase-orders"
          className={({ isActive }) =>
            `auditor-nav-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <FaClipboardList />
          <span>Purchase Orders</span>
        </NavLink>

        {/* Contracts */}

        <NavLink
          to="/contracts"
          className={({ isActive }) =>
            `auditor-nav-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <FaFileContract />
          <span>Contracts</span>
        </NavLink>

        {/* Performance Analytics */}

        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `auditor-nav-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <FaChartLine />
          <span>Performance Analytics</span>
        </NavLink>

        {/* Communications */}

        <NavLink
          to="/communication"
          className={({ isActive }) =>
            `auditor-nav-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <FaComments />
          <span>Communications</span>
        </NavLink>

        {/* Notifications */}

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `auditor-nav-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <FaBell />
          <span>Notifications</span>
        </NavLink>

        <p className="auditor-menu-title auditor-account-title">
          ACCOUNT
        </p>

        {/* Profile */}

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `auditor-nav-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <FaUserCircle />
          <span>Profile</span>
        </NavLink>

      </nav>

      <div className="auditor-sidebar-bottom">

        <div className="auditor-user-info">

          <FaUserCircle className="auditor-user-icon" />

          <div className="auditor-user-details">

            <strong>
              {user.full_name || "Auditor"}
            </strong>

            <span>
              {user.role || "Auditor"}
            </span>

          </div>

        </div>

        <button
          className="auditor-logout"
          onClick={handleLogout}
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>

      </div>

    </aside>
  );
}