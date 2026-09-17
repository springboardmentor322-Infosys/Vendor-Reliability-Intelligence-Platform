import { NavLink, useNavigate } from "react-router-dom";
import "../styles/sidebar.css";

import {
  FaHome,
  FaUsers,
  FaShoppingCart,
  FaFileContract,
  FaChartBar,
  FaBell,
  FaUserCircle,
  FaTruck,
  FaMoneyBillWave,
  FaShieldAlt,
  FaClipboardList,
  FaComments,
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const role = user.role;

  const dashboardPaths = {
    Administrator: "/admin/dashboard",
    "Procurement Manager": "/procurement-dashboard",
    "Supply Chain Manager": "/supply-chain-dashboard",
    "Finance Officer": "/finance-dashboard",
    Vendor: "/vendor-dashboard",
    Auditor: "/auditor-dashboard",
  };

  const dashboardPath =
    dashboardPaths[role] || "/login";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  /*
   * Role-specific navigation
   */

  const menuByRole = {

    /* =========================
       ADMINISTRATOR
    ========================= */

    Administrator: [
      {
        path: "/admin/dashboard",
        label: "Dashboard",
        icon: <FaHome />,
      },
      {
        path: "/vendors",
        label: "Vendor Management",
        icon: <FaUsers />,
      },
      {
        path: "/procurement",
        label: "Procurement",
        icon: <FaClipboardList />,
      },
      {
        path: "/purchase-orders",
        label: "Purchase Orders",
        icon: <FaShoppingCart />,
      },
      {
        path: "/contracts",
        label: "Contracts & Compliance",
        icon: <FaFileContract />,
      },
      {
        path: "/analytics",
        label: "Analytics",
        icon: <FaChartBar />,
      },
      {
        path: "/communication",
        label: "Communication",
        icon: <FaComments />,
      },
      {
        path: "/notifications",
        label: "Notifications",
        icon: <FaBell />,
      },
      {
        path: "/profile",
        label: "Profile",
        icon: <FaUserCircle />,
      },
    ],


    /* =========================
       PROCUREMENT MANAGER
    ========================= */

    "Procurement Manager": [
      {
        path: "/procurement-dashboard",
        label: "Dashboard",
        icon: <FaHome />,
      },
      {
        path: "/procurement",
        label: "Procurement Requests",
        icon: <FaClipboardList />,
      },
      {
        path: "/purchase-orders",
        label: "Purchase Orders",
        icon: <FaShoppingCart />,
      },
      {
        path: "/vendors",
        label: "Vendors",
        icon: <FaUsers />,
      },
      {
        path: "/contracts",
        label: "Contracts",
        icon: <FaFileContract />,
      },
      {
        path: "/analytics",
        label: "Procurement Analytics",
        icon: <FaChartBar />,
      },
      {
        path: "/notifications",
        label: "Notifications",
        icon: <FaBell />,
      },
      {
        path: "/profile",
        label: "Profile",
        icon: <FaUserCircle />,
      },
    ],


    /* =========================
       SUPPLY CHAIN MANAGER
    ========================= */

    "Supply Chain Manager": [
      {
        path: "/supply-chain-dashboard",
        label: "Dashboard",
        icon: <FaHome />,
      },
      {
        path: "/purchase-orders",
        label: "Purchase Orders",
        icon: <FaShoppingCart />,
      },
      {
        path: "/deliveries",
        label: "Delivery Tracking",
        icon: <FaTruck />,
      },
      {
        path: "/vendors",
        label: "Suppliers",
        icon: <FaUsers />,
      },
      {
        path: "/analytics",
        label: "Performance",
        icon: <FaChartBar />,
      },
      {
        path: "/notifications",
        label: "Notifications",
        icon: <FaBell />,
      },
      {
        path: "/profile",
        label: "Profile",
        icon: <FaUserCircle />,
      },
    ],


    /* =========================
       FINANCE OFFICER
    ========================= */

    "Finance Officer": [
      {
        path: "/finance-dashboard",
        label: "Dashboard",
        icon: <FaHome />,
      },
      {
        path: "/purchase-orders",
        label: "Purchase Orders",
        icon: <FaShoppingCart />,
      },
      {
        path: "/contracts",
        label: "Contracts",
        icon: <FaFileContract />,
      },
      {
        path: "/analytics",
        label: "Financial Reports",
        icon: <FaChartBar />,
      },
      {
        path: "/notifications",
        label: "Notifications",
        icon: <FaBell />,
      },
      {
        path: "/profile",
        label: "Profile",
        icon: <FaUserCircle />,
      },
    ],


    /* =========================
       VENDOR
    ========================= */

    Vendor: [
      {
        path: "/vendor-dashboard",
        label: "Dashboard",
        icon: <FaHome />,
      },
      {
        path: "/purchase-orders",
        label: "My Purchase Orders",
        icon: <FaShoppingCart />,
      },
      {
        path: "/contracts",
        label: "My Contracts",
        icon: <FaFileContract />,
      },
      {
        path: "/analytics",
        label: "Performance",
        icon: <FaChartBar />,
      },
      {
        path: "/communication",
        label: "Communication",
        icon: <FaComments />,
      },
      {
        path: "/notifications",
        label: "Notifications",
        icon: <FaBell />,
      },
      {
        path: "/profile",
        label: "Vendor Profile",
        icon: <FaUserCircle />,
      },
    ],


    /* =========================
       AUDITOR
    ========================= */

    Auditor: [
      {
        path: "/auditor-dashboard",
        label: "Dashboard",
        icon: <FaHome />,
      },
      {
        path: "/vendors",
        label: "Vendor Audit",
        icon: <FaUsers />,
      },
      {
        path: "/contracts",
        label: "Contracts & Compliance",
        icon: <FaFileContract />,
      },
      {
        path: "/analytics",
        label: "Audit Analytics",
        icon: <FaChartBar />,
      },
      {
        path: "/notifications",
        label: "Notifications",
        icon: <FaBell />,
      },
      {
        path: "/profile",
        label: "Profile",
        icon: <FaUserCircle />,
      },
    ],
  };

  const menuItems = menuByRole[role] || [];

  return (
    <aside className="sidebar">

      {/* Brand */}

      <div className="sidebar-brand">
        <h2>VendorIQ</h2>
        <p>Vendor Reliability Platform</p>
      </div>


      {/* Current User */}

      <div className="sidebar-user">

        <FaUserCircle className="sidebar-user-icon" />

        <div>
          <strong>
            {user.full_name || "User"}
          </strong>

          <span>
            {role || "Guest"}
          </span>
        </div>

      </div>


      {/* Navigation */}

      <ul className="sidebar-menu">

        {menuItems.map((item) => (

          <li key={item.path}>

            <NavLink to={item.path}>

              {item.icon}

              <span>
                {item.label}
              </span>

            </NavLink>

          </li>

        ))}

      </ul>


      {/* Logout */}

      <div className="sidebar-bottom">

        <button
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;