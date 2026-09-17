 import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  FaTachometerAlt,
  FaUserTie,
  FaChartLine,
  FaShieldAlt,
  FaShoppingCart,
  FaTruck,
  FaFileInvoiceDollar,
  FaFileContract,
  FaComments,
  FaBell,
  FaFileAlt,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

import { getVendorDashboard } from "../services/api";

import "../styles/VendorSidebar.css";

export default function VendorSidebar() {
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  useEffect(() => {
    const loadVendorDetails = async () => {
      try {
        const data = await getVendorDashboard();

        setVendor(data.stats || data);
      } catch (error) {
        console.error(
          "Vendor sidebar error:",
          error
        );
      }
    };

    loadVendorDetails();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside className="vendor-sidebar">

      <div className="vendor-sidebar-logo">
        <div className="vendor-logo-icon">
          <FaUserTie />
        </div>

        <div>
          <h2>VendorIQ</h2>
          <p>
            Vendor Reliability
            <br />
            & Procurement Platform
          </p>
        </div>
      </div>

      <div className="vendor-sidebar-section-title">
        MAIN MENU
      </div>

      <ul className="vendor-sidebar-menu">

        <li>
          <NavLink to="/vendor-dashboard">
            <FaTachometerAlt />
            <span>Dashboard</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/profile">
            <FaUserTie />
            <span>Profile & Company</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/vendor-performance">
            <FaChartLine />
            <span>My Performance</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/vendor-reliability">
            <FaShieldAlt />
            <span>My Reliability</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/purchase-orders">
            <FaShoppingCart />
            <span>Purchase Orders</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/delivery-tracking">
            <FaTruck />
            <span>Order & Delivery Tracking</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/invoices">
            <FaFileInvoiceDollar />
            <span>Invoices</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/contracts">
            <FaFileContract />
            <span>Contracts & Compliance</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/communication">
            <FaComments />
            <span>Communications</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/notifications">
            <FaBell />
            <span>Notifications</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/reports">
            <FaFileAlt />
            <span>Reports</span>
          </NavLink>
        </li>

      </ul>

      <div className="vendor-sidebar-section-title">
        ACCOUNT
      </div>

      <ul className="vendor-sidebar-menu">

        <li>
          <NavLink to="/settings">
            <FaCog />
            <span>Settings</span>
          </NavLink>
        </li>

        <li>
          <button
            className="vendor-sidebar-logout"
            onClick={handleLogout}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </li>

      </ul>

      <div className="vendor-sidebar-company-card">

        <h3>
          {vendor?.companyName ||
            "Vendor Company"}
        </h3>

        <p>
          Vendor ID:{" "}
          {vendor?.vendorId || "Not Available"}
        </p>

        <p>
          {user.email || "Email not available"}
        </p>

        <p>
          {user.phone || "Phone not available"}
        </p>

        <div className="vendor-company-status">
          <span>Status:</span>
          <strong>
            {user.status || "Active"}
          </strong>
        </div>

      </div>

    </aside>
  );
}