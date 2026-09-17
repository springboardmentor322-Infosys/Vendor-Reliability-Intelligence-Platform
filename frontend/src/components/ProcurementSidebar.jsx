import { NavLink, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBuilding,
  FaClipboardList,
  FaShoppingCart,
  FaFileContract,
  FaComments,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

import "../styles/ProcurementSidebar.css";

export default function ProcurementSidebar() {
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
    <aside className="procurement-sidebar">

      <div className="procurement-brand">
        <h2>VendorIQ</h2>
        <p>Vendor Reliability Platform</p>
      </div>

      <div className="procurement-menu-title">
        MAIN MENU
      </div>

      <nav className="procurement-nav">

        <NavLink
          to="/procurement-dashboard"
          className={({ isActive }) =>
            isActive ? "active" : ""
          }
        >
          <FaTachometerAlt />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/vendors"
          className={({ isActive }) =>
            isActive ? "active" : ""
          }
        >
          <FaBuilding />
          <span>Vendor Management</span>
        </NavLink>

        <NavLink
          to="/procurement"
          className={({ isActive }) =>
            isActive ? "active" : ""
          }
        >
          <FaClipboardList />
          <span>Procurement</span>
        </NavLink>

        <NavLink
          to="/purchase-orders"
          className={({ isActive }) =>
            isActive ? "active" : ""
          }
        >
          <FaShoppingCart />
          <span>Purchase Orders</span>
        </NavLink>

        <NavLink
          to="/contracts"
          className={({ isActive }) =>
            isActive ? "active" : ""
          }
        >
          <FaFileContract />
          <span>Contracts</span>
        </NavLink>

        <NavLink
          to="/communication"
          className={({ isActive }) =>
            isActive ? "active" : ""
          }
        >
          <FaComments />
          <span>Communication</span>
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            isActive ? "active" : ""
          }
        >
          <FaBell />
          <span>Notifications</span>
        </NavLink>

      </nav>

      <div className="procurement-account-title">
        ACCOUNT
      </div>

      <div className="procurement-account">

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? "active" : ""
          }
        >
          <FaUserCircle />
          <span>Profile</span>
        </NavLink>

        <div className="procurement-user">
          <div className="procurement-user-icon">
            <FaUserCircle />
          </div>

          <div className="procurement-user-info">
            <strong>
              {user.full_name || "Procurement Manager"}
            </strong>

            <span>
              {user.role || "Procurement Manager"}
            </span>
          </div>
        </div>

        <button
          className="procurement-logout"
          onClick={handleLogout}
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>

      </div>

    </aside>
  );
}