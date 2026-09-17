 import { NavLink, useNavigate } from "react-router-dom";

import {
  FaTachometerAlt,
  FaTruck,
  FaShoppingCart,
  FaFileContract,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
  FaUsers,
  FaChartLine,
  FaClipboardList,
  FaFileAlt,
  FaComments,
} from "react-icons/fa";

import "../styles/SupplyChainSidebar.css";

export default function SupplyChainSidebar() {
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
    <aside className="supply-sidebar">

      {/* BRAND */}
      <div className="supply-sidebar-brand">
        <h2>VendorIQ</h2>
        <p>Vendor Reliability Platform</p>
      </div>

      {/* MENU */}
      <div className="supply-sidebar-menu">

        <p className="supply-menu-title">
          MAIN MENU
        </p>

        {/* DASHBOARD */}
        <NavLink
          to="/supply-chain-dashboard"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaTachometerAlt />
          <span>Dashboard</span>
        </NavLink>

        {/* PROCUREMENT */}
        <NavLink
          to="/procurement"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaClipboardList />
          <span>Procurement</span>
        </NavLink>

        {/* PURCHASE ORDERS */}
        <NavLink
          to="/purchase-orders"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaShoppingCart />
          <span>Purchase Orders</span>
        </NavLink>

        {/* VENDOR MANAGEMENT */}
        <NavLink
          to="/vendors"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaUsers />
          <span>Vendor Management</span>
        </NavLink>

        {/* DELIVERY TRACKING */}
        <NavLink
          to="/deliveries"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaTruck />
          <span>Delivery Tracking</span>
        </NavLink>

        {/* CONTRACTS */}
        <NavLink
          to="/contracts"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaFileContract />
          <span>Contracts</span>
        </NavLink>

        {/* REPORTS */}
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaFileAlt />
          <span>Reports</span>
        </NavLink>

        {/* PERFORMANCE ANALYTICS */}
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaChartLine />
          <span>Performance Analytics</span>
        </NavLink>

        {/* COMMUNICATIONS */}
        <NavLink
          to="/communication"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaComments />
          <span>Communications</span>
        </NavLink>

        {/* NOTIFICATIONS */}
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaBell />
          <span>Notifications</span>
        </NavLink>

        {/* ACCOUNT */}
        <p className="supply-menu-title supply-account-title">
          ACCOUNT
        </p>

        {/* PROFILE */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `supply-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaUserCircle />
          <span>Profile</span>
        </NavLink>

      </div>

      {/* BOTTOM USER AREA */}
      <div className="supply-sidebar-bottom">

        <div className="supply-user-info">
          <FaUserCircle className="supply-user-icon" />

          <div className="supply-user-details">
            <strong>
              {user.full_name || "Supply Chain Manager"}
            </strong>

            <span>
              {user.role || "Supply Chain Manager"}
            </span>
          </div>
        </div>

        {/* LOGOUT */}
        <button
          className="supply-logout"
          onClick={handleLogout}
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>

      </div>

    </aside>
  );
}