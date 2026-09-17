import { NavLink, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaShoppingCart,
  FaFileContract,
  FaChartLine,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
  FaClipboardList,
} from "react-icons/fa";

import "../styles/FinanceSidebar.css";

function FinanceSidebar() {
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
    <aside className="finance-sidebar">

      <div className="finance-sidebar-brand">
        <h2>VendorIQ</h2>
        <p>Vendor Reliability Platform</p>
      </div>

      <nav className="finance-sidebar-menu">

        <p className="finance-menu-title">
          MAIN MENU
        </p>

        <NavLink
          to="/finance-dashboard"
          className={({ isActive }) =>
            `finance-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaTachometerAlt />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/purchase-orders"
          className={({ isActive }) =>
            `finance-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaShoppingCart />
          <span>Purchase Orders</span>
        </NavLink>  


        <NavLink
          to="/procurement"
          className={({ isActive }) =>
            `finance-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaClipboardList />
          <span>Procurement</span>
        </NavLink>

        <NavLink
          to="/contracts"
          className={({ isActive }) =>
            `finance-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaFileContract />
          <span>Contracts</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `finance-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaChartLine />
          <span>Financial Analytics</span>
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `finance-nav-link ${isActive ? "active" : ""}`
          }
        >



          <FaBell />
          <span>Notifications</span>
        </NavLink>

        <p className="finance-menu-title finance-account-title">
          ACCOUNT
        </p>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `finance-nav-link ${isActive ? "active" : ""}`
          }
        >
          <FaUserCircle />
          <span>Profile</span>
        </NavLink>

      </nav>

      <div className="finance-sidebar-bottom">

        <div className="finance-user-info">
          <FaUserCircle className="finance-user-icon" />

          <div>
            <strong>
              {user.full_name || "Finance Officer"}
            </strong>

            <span>
              {user.role || "Finance Officer"}
            </span>
          </div>
        </div>

        <button
          className="finance-logout"
          onClick={handleLogout}
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>

      </div>

    </aside>
  );
}

export default FinanceSidebar;