 import { NavLink, useNavigate } from "react-router-dom";
import "../styles/AdminSidebar.css";

import {
  FaHome,
  FaUsers,
  FaBuilding,
  FaClipboardList,
  FaShoppingCart,
  FaFileContract,
  FaChartLine,
  FaComments,
  FaFileAlt,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

function AdminSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <aside className="admin-sidebar">

      {/* Brand */}
      <div className="admin-sidebar-brand">
        <h2>VendorIQ</h2>
        <p>Vendor Reliability Platform</p>
      </div>

      {/* Main Menu */}
      <div className="admin-sidebar-section-title">
        MAIN MENU
      </div>

      <ul className="admin-sidebar-menu">

        <li>
          <NavLink to="/admin/dashboard">
            <FaHome />
            <span>Dashboard</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/users">
            <FaUsers />
            <span>User Management</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/vendors">
            <FaBuilding />
            <span>Vendor Management</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/procurement">
            <FaClipboardList />
            <span>Procurement</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/purchase-orders">
            <FaShoppingCart />
            <span>Purchase Orders</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/contracts">
            <FaFileContract />
            <span>Contracts & Compliance</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/analytics">
            <FaChartLine />
            <span>Performance Analytics</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/communication">
            <FaComments />
            <span>Communication</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/admin/reports">
            <FaFileAlt />
            <span>Reports & Exports</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/notifications">
            <FaBell />
            <span>Notifications</span>
          </NavLink>
        </li>

      </ul>

      {/* Account */}
      <div className="admin-sidebar-section-title">
        ACCOUNT
      </div>

      <ul className="admin-sidebar-menu">

        <li>
          <NavLink to="/profile">
            <FaUserCircle />
            <span>Profile</span>
          </NavLink>
        </li>

        <li>
          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </li>

      </ul>

    </aside>
  );
}

export default AdminSidebar;