 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminSidebar from "../components/AdminSidebar";
import { getAdminDashboard } from "../services/api";

import "../styles/AdminDashboard.css";

import {
  FaUsers,
  FaBuilding,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaBell,
  FaSearch,
  FaUserCircle,
  FaChartPie,
  FaChartBar,
  FaFileContract,
  FaShoppingCart,
  FaArrowUp,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "{}"
      );
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminDashboard();

      console.log(
        "Admin Dashboard Response:",
        response
      );

      const stats =
        response?.stats ||
        response ||
        {};

      setDashboard(stats);
    } catch (err) {
      console.error(
        "Admin dashboard error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load admin dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  const numberValue = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      Number.isNaN(Number(value))
    ) {
      return null;
    }

    return Number(value);
  };

  const displayNumber = (
    value,
    decimals = 0
  ) => {
    const number = numberValue(value);

    if (number === null) {
      return "—";
    }

    return number.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const displayCurrency = (value) => {
    const number = numberValue(value);

    if (number === null) {
      return "—";
    }

    return `₹${number.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const displayDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const statusClass = (status) =>
    String(status || "unknown")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

  if (loading) {
    return (
      <div className="dashboard-loading">
        <h2>
          Loading Admin Dashboard...
        </h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>
          Unable to load dashboard
        </h2>

        <p>{error}</p>

        <button
          type="button"
          onClick={loadDashboard}
        >
          Try Again
        </button>
      </div>
    );
  }

  const stats = dashboard || {};

  const compliance =
    stats.compliance || {};

  const procurementStatus =
    Array.isArray(
      stats.procurementStatus
    )
      ? stats.procurementStatus
      : [];

  const vendorStatus =
    Array.isArray(
      stats.vendorStatus
    )
      ? stats.vendorStatus
      : [];

  const purchaseOrderStatus =
    Array.isArray(
      stats.purchaseOrderStatus
    )
      ? stats.purchaseOrderStatus
      : [];

  const recentVendors =
    Array.isArray(
      stats.recentVendors
    )
      ? stats.recentVendors
      : [];

  const recentPurchaseOrders =
    Array.isArray(
      stats.recentPurchaseOrders
    )
      ? stats.recentPurchaseOrders
      : [];

  const notifications =
    Array.isArray(
      stats.notifications
    )
      ? stats.notifications
      : [];

  const purchaseOrderSpend =
    stats.purchaseOrderSpend || {};

  const complianceScore =
    numberValue(
      stats.complianceScore
    );

  const procurementMax = Math.max(
    ...procurementStatus.map(
      (item) =>
        numberValue(item.count) || 0
    ),
    1
  );

  const vendorMax = Math.max(
    ...vendorStatus.map(
      (item) =>
        numberValue(item.count) || 0
    ),
    1
  );

  const purchaseOrderMax =
    Math.max(
      ...purchaseOrderStatus.map(
        (item) =>
          numberValue(item.count) ||
          0
      ),
      1
    );

  const totalCompliance =
    numberValue(compliance.total) ||
    0;

  const compliant =
    numberValue(compliance.compliant) ||
    0;

  const nonCompliant =
    numberValue(
      compliance.nonCompliant
    ) || 0;

  const underReview =
    numberValue(
      compliance.underReview
    ) || 0;

  const complianceItems = [
    {
      label: "Compliant",
      value: compliant,
      className: "compliant",
    },
    {
      label: "Non-Compliant",
      value: nonCompliant,
      className: "non-compliant",
    },
    {
      label: "Under Review",
      value: underReview,
      className: "under-review",
    },
  ];

  return (
    <div className="dashboard-layout">
      <AdminSidebar />

      <main className="dashboard-main">

        {/* =========================
            HEADER
        ========================= */}

        <header className="dashboard-header">
          <div>
            <h1>Admin Dashboard</h1>

            <p>
              Vendor Reliability Intelligence
              Platform
            </p>
          </div>

          <div className="header-right">

            <div className="search-box">
              <FaSearch />

              <input
                type="text"
                placeholder="Search anything..."
              />
            </div>

            <button
              className="notification-btn"
              type="button"
              onClick={() =>
                navigate("/notifications")
              }
            >
              <FaBell />

              {numberValue(
                stats.notifications
              ) !== null && (
                <span className="header-notification-count">
                  {displayNumber(
                    stats.notifications
                  )}
                </span>
              )}
            </button>

            <div className="profile-box">
              <FaUserCircle className="profile-icon" />

              <div>
                <h4>
                  {user.full_name ||
                    "Administrator"}
                </h4>

                <span>
                  {user.role ||
                    "Administrator"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* =========================
            WELCOME BANNER
        ========================= */}

        <section className="welcome-banner">
          <div>
            <span className="welcome-label">
              ADMIN OVERVIEW
            </span>

            <h2>
              Welcome Back 👋
            </h2>

            <p>
              Monitor vendors, procurement,
              purchase orders, contracts,
              compliance and platform activity
              from one centralized dashboard.
            </p>
          </div>

          <div className="welcome-icon">
            <FaChartBar />
          </div>
        </section>

        {/* =========================
            KPI CARDS
        ========================= */}

        <section className="admin-kpi-grid">

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon users">
              <FaUsers />
            </div>

            <div className="admin-kpi-content">
              <span>Total Users</span>

              <strong>
                {displayNumber(
                  stats.totalUsers
                )}
              </strong>

              <small>
                Registered platform users
              </small>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon vendors">
              <FaBuilding />
            </div>

            <div className="admin-kpi-content">
              <span>Active Vendors</span>

              <strong>
                {displayNumber(
                  stats.activeVendors
                )}
              </strong>

              <small>
                Approved vendors
              </small>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon procurement">
              <FaClipboardList />
            </div>

            <div className="admin-kpi-content">
              <span>
                Procurement Requests
              </span>

              <strong>
                {displayNumber(
                  stats.procurementRequests
                )}
              </strong>

              <small>
                Total procurement requests
              </small>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon orders">
              <FaFileInvoiceDollar />
            </div>

            <div className="admin-kpi-content">
              <span>
                Purchase Orders
              </span>

              <strong>
                {displayNumber(
                  stats.purchaseOrders
                )}
              </strong>

              <small>
                Total purchase orders
              </small>
            </div>
          </div>

        </section>

        {/* =========================
            ANALYTICS SECTION
        ========================= */}

        <section className="analytics-section">

          <div className="section-title-row">
            <div>
              <span>BUSINESS ANALYTICS</span>

              <h2>
                Procurement & Vendor Overview
              </h2>
            </div>
          </div>

          <div className="chart-grid">

            {/* PROCUREMENT STATUS */}

            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <h3>
                    Procurement Request Status
                  </h3>

                  <p>
                    Distribution of procurement
                    requests by status
                  </p>
                </div>

                <div className="chart-header-icon">
                  <FaChartPie />
                </div>
              </div>

              {procurementStatus.length >
              0 ? (
                <div className="horizontal-chart">
                  {procurementStatus.map(
                    (item, index) => {
                      const value =
                        numberValue(
                          item.count
                        ) || 0;

                      const width =
                        (value /
                          procurementMax) *
                        100;

                      return (
                        <div
                          className="chart-row"
                          key={`${item.status}-${index}`}
                        >
                          <div className="chart-row-top">
                            <span>
                              {item.status}
                            </span>

                            <strong>
                              {displayNumber(
                                value
                              )}
                            </strong>
                          </div>

                          <div className="bar-track">
                            <div
                              className={`bar-fill procurement-bar bar-${index % 4}`}
                              style={{
                                width: `${width}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="no-chart-data">
                  No procurement status data
                  available
                </div>
              )}
            </div>

            {/* VENDOR STATUS */}

            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <h3>
                    Vendor Approval Status
                  </h3>

                  <p>
                    Current vendor approval
                    distribution
                  </p>
                </div>

                <div className="chart-header-icon">
                  <FaBuilding />
                </div>
              </div>

              {vendorStatus.length >
              0 ? (
                <div className="horizontal-chart">
                  {vendorStatus.map(
                    (item, index) => {
                      const value =
                        numberValue(
                          item.count
                        ) || 0;

                      const width =
                        (value /
                          vendorMax) *
                        100;

                      return (
                        <div
                          className="chart-row"
                          key={`${item.status}-${index}`}
                        >
                          <div className="chart-row-top">
                            <span>
                              {item.status}
                            </span>

                            <strong>
                              {displayNumber(
                                value
                              )}
                            </strong>
                          </div>

                          <div className="bar-track">
                            <div
                              className={`bar-fill vendor-bar bar-${index % 4}`}
                              style={{
                                width: `${width}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="no-chart-data">
                  No vendor status data
                  available
                </div>
              )}
            </div>

          </div>
        </section>

        {/* =========================
            COMPLIANCE + PO STATUS
        ========================= */}

        <section className="chart-grid second-row">

          {/* COMPLIANCE */}

          <div className="chart-card compliance-card">

            <div className="chart-card-header">
              <div>
                <h3>
                  Contract Compliance
                </h3>

                <p>
                  Compliance status across all
                  contracts
                </p>
              </div>

              <div className="chart-header-icon">
                <FaFileContract />
              </div>
            </div>

            <div className="compliance-overview">

              <div
  className="compliance-circle"
  style={{
    "--compliance":
      complianceScore !== null
        ? complianceScore
        : 0,
  }}
>
                <div className="compliance-circle-inner">
                  <strong>
                    {complianceScore !==
                    null
                      ? `${complianceScore}%`
                      : "—"}
                  </strong>

                  <span>
                    Compliance
                  </span>
                </div>
              </div>

              <div className="compliance-summary">

                <div className="compliance-total">
                  <span>
                    Total Contracts
                  </span>

                  <strong>
                    {displayNumber(
                      totalCompliance
                    )}
                  </strong>
                </div>

                {complianceItems.map(
                  (item) => (
                    <div
                      className="compliance-row"
                      key={item.label}
                    >
                      <div>
                        <span
                          className={`compliance-dot ${item.className}`}
                        />

                        <span>
                          {item.label}
                        </span>
                      </div>

                      <strong>
                        {displayNumber(
                          item.value
                        )}
                      </strong>
                    </div>
                  )
                )}

              </div>
            </div>
          </div>

          {/* PURCHASE ORDER STATUS */}

          <div className="chart-card">

            <div className="chart-card-header">
              <div>
                <h3>
                  Purchase Order Status
                </h3>

                <p>
                  Current purchase order
                  distribution
                </p>
              </div>

              <div className="chart-header-icon">
                <FaShoppingCart />
              </div>
            </div>

            {purchaseOrderStatus.length >
            0 ? (
              <div className="horizontal-chart">
                {purchaseOrderStatus.map(
                  (item, index) => {
                    const value =
                      numberValue(
                        item.count
                      ) || 0;

                    const width =
                      (value /
                        purchaseOrderMax) *
                      100;

                    return (
                      <div
                        className="chart-row"
                        key={`${item.status}-${index}`}
                      >
                        <div className="chart-row-top">
                          <span>
                            {item.status}
                          </span>

                          <strong>
                            {displayNumber(
                              value
                            )}
                          </strong>
                        </div>

                        <div className="bar-track">
                          <div
                            className={`bar-fill po-bar bar-${index % 4}`}
                            style={{
                              width: `${width}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="no-chart-data">
                No purchase order status
                data available
              </div>
            )}
          </div>

        </section>

        {/* =========================
            SPEND ANALYTICS
        ========================= */}

        <section className="spend-section">

          <div className="section-title-row">
            <div>
              <span>SPEND ANALYTICS</span>

              <h2>
                Purchase Order Financial Overview
              </h2>
            </div>
          </div>

          <div className="spend-grid">

            <div className="spend-card">
              <div className="spend-icon">
                <FaArrowUp />
              </div>

              <div>
                <span>
                  Total PO Spend
                </span>

                <strong>
                  {displayCurrency(
                    purchaseOrderSpend.totalSpend
                  )}
                </strong>

                <small>
                  Across all purchase orders
                </small>
              </div>
            </div>

            <div className="spend-card">
              <div className="spend-icon">
                <FaChartBar />
              </div>

              <div>
                <span>
                  Average Order Value
                </span>

                <strong>
                  {displayCurrency(
                    purchaseOrderSpend.averageOrderValue
                  )}
                </strong>

                <small>
                  Average purchase order amount
                </small>
              </div>
            </div>

            <div className="spend-card">
              <div className="spend-icon">
                <FaFileInvoiceDollar />
              </div>

              <div>
                <span>
                  Highest Order Value
                </span>

                <strong>
                  {displayCurrency(
                    purchaseOrderSpend.highestOrderValue
                  )}
                </strong>

                <small>
                  Highest recorded purchase order
                </small>
              </div>
            </div>

          </div>
        </section>

        {/* =========================
            RECENT DATA
        ========================= */}

        <section className="dashboard-data-grid">

          {/* RECENT VENDORS */}

          <div className="dashboard-bottom-card">

            <div className="section-heading">
              <div>
                <span>
                  VENDOR MANAGEMENT
                </span>

                <h2>
                  Recent Vendors
                </h2>
              </div>

              <FaBuilding />
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>
                      Company
                    </th>

                    <th>
                      Category
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentVendors.length >
                  0 ? (
                    recentVendors.map(
                      (vendor) => (
                        <tr
                          key={
                            vendor.vendor_id
                          }
                        >
                          <td>
                            <strong>
                              {
                                vendor.company_name
                              }
                            </strong>
                          </td>

                          <td>
                            {vendor.category ||
                              "—"}
                          </td>

                          <td>
                            <span
                              className={`status status-${statusClass(
                                vendor.approval_status
                              )}`}
                            >
                              {
                                vendor.approval_status
                              }
                            </span>
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        className="empty-table"
                      >
                        No vendor data
                        available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RECENT PURCHASE ORDERS */}

          <div className="dashboard-bottom-card">

            <div className="section-heading">
              <div>
                <span>
                  PROCUREMENT
                </span>

                <h2>
                  Recent Purchase Orders
                </h2>
              </div>

              <FaShoppingCart />
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>
                      PO ID
                    </th>

                    <th>
                      Vendor
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentPurchaseOrders.length >
                  0 ? (
                    recentPurchaseOrders.map(
                      (po) => (
                        <tr
                          key={po.po_id}
                        >
                          <td>
                            <strong>
                              #{po.po_id}
                            </strong>
                          </td>

                          <td>
                            {
                              po.company_name
                            }
                          </td>

                          <td>
                            {displayCurrency(
                              po.order_amount
                            )}
                          </td>

                          <td>
                            <span
                              className={`status status-${statusClass(
                                po.status
                              )}`}
                            >
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="empty-table"
                      >
                        No purchase order
                        data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </section>

        {/* =========================
            NOTIFICATIONS
        ========================= */}

        <section className="dashboard-bottom-card notifications-card">

          <div className="section-heading">
            <div>
              <span>
                PLATFORM ACTIVITY
              </span>

              <h2>
                Recent Notifications
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/notifications")
              }
            >
              View All
            </button>
          </div>

          {notifications.length >
          0 ? (
            <div className="admin-notification-list">
              {notifications.map(
                (notification) => (
                  <div
                    className="admin-notification-item"
                    key={
                      notification.notification_id
                    }
                  >
                    <div className="notification-icon">
                      {notification.is_read ? (
                        <FaCheckCircle />
                      ) : (
                        <FaExclamationTriangle />
                      )}
                    </div>

                    <div className="notification-content">
                      <p>
                        {
                          notification.message
                        }
                      </p>

                      <span>
                        {displayDate(
                          notification.created_at
                        )}
                      </span>
                    </div>

                    {!notification.is_read && (
                      <span className="unread-badge">
                        New
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="no-notifications">
              <FaBell />

              <p>
                No recent notifications
              </p>
            </div>
          )}

        </section>

      </main>
    </div>
  );
}