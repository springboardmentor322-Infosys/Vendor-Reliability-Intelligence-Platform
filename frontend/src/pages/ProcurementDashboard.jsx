 import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ProcurementSidebar from "../components/ProcurementSidebar";
import { getProcurementDashboard } from "../services/api";

import "../styles/ProcurementDashboard.css";

import {
  FaArrowRight,
  FaBuilding,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaFileContract,
  FaFileInvoiceDollar,
  FaExclamationTriangle,
  FaTruck,
  FaTrophy,
  FaUserCircle,
  FaShoppingCart,
  FaCalendarAlt,
  FaSyncAlt
} from "react-icons/fa";

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value) =>
  numberValue(value).toLocaleString("en-IN");

const formatCurrency = (value) => {
  const amount = numberValue(value);

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)} K`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
};

const formatFullCurrency = (value) =>
  `₹${numberValue(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getStatusClass = (status) => {
  const normalized = String(status || "")
    .toLowerCase()
    .trim();

  if (
    normalized.includes("complete") ||
    normalized.includes("deliver") ||
    normalized.includes("fulfill") ||
    normalized.includes("approved")
  ) {
    return "status-success";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("issued") ||
    normalized.includes("accepted") ||
    normalized.includes("progress") ||
    normalized.includes("shipped")
  ) {
    return "status-warning";
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("late") ||
    normalized.includes("delay")
  ) {
    return "status-danger";
  }

  return "status-neutral";
};

const getRiskClass = (risk) => {
  const value = String(risk || "").toLowerCase();

  if (value === "low") {
    return "risk-low";
  }

  if (value === "medium") {
    return "risk-medium";
  }

  if (value === "high") {
    return "risk-high";
  }

  return "risk-unknown";
};

const getInitials = (name) => {
  const value = String(name || "Procurement Manager").trim();

  if (!value) {
    return "PM";
  }

  const parts = value.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

function DonutChart({ data, total }) {
  const safeData = Array.isArray(data)
    ? data.filter((item) => numberValue(item.value) > 0)
    : [];

  if (safeData.length === 0 || total <= 0) {
    return (
      <div className="chart-empty">
        <div className="empty-chart-circle">
          <strong>0</strong>
          <span>Requests</span>
        </div>
      </div>
    );
  }

  const gradients = [];
  let current = 0;

  safeData.forEach((item) => {
    const start = (current / total) * 100;
    current += numberValue(item.value);
    const end = (current / total) * 100;

    gradients.push(
      `${item.color} ${start}% ${end}%`
    );
  });

  return (
    <div className="donut-wrapper">
      <div
        className="donut-chart"
        style={{
          background: `conic-gradient(${gradients.join(", ")})`
        }}
      >
        <div className="donut-center">
          <strong>{formatNumber(total)}</strong>
          <span>Requests</span>
        </div>
      </div>

      <div className="donut-legend">
        {data.map((item) => (
          <div
            className="legend-row"
            key={item.label}
          >
            <div className="legend-label">
              <span
                className="legend-dot"
                style={{
                  background: item.color
                }}
              />
              <span>{item.label}</span>
            </div>

            <strong>
              {formatNumber(item.value)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlySpendChart({ data }) {
  const values = Array.isArray(data)
    ? data
    : [];

  const maxValue = Math.max(
    ...values.map((item) =>
      numberValue(item.value)
    ),
    1
  );

  if (values.length === 0) {
    return (
      <div className="chart-empty large-empty">
        <FaChartLine />
        <p>No historical spending data available.</p>
      </div>
    );
  }

  const chartWidth = 700;
  const chartHeight = 250;
  const leftPadding = 45;
  const rightPadding = 20;
  const topPadding = 20;
  const bottomPadding = 45;

  const usableWidth =
    chartWidth -
    leftPadding -
    rightPadding;

  const usableHeight =
    chartHeight -
    topPadding -
    bottomPadding;

  const points = values.map((item, index) => {
    const x =
      leftPadding +
      (values.length === 1
        ? usableWidth / 2
        : (index / (values.length - 1)) *
          usableWidth);

    const y =
      topPadding +
      usableHeight -
      (numberValue(item.value) / maxValue) *
        usableHeight;

    return {
      x,
      y,
      ...item
    };
  });

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${
          topPadding + usableHeight
        } L ${points[0].x} ${
          topPadding + usableHeight
        } Z`
      : "";

  return (
    <div className="line-chart-container">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="line-chart"
        preserveAspectRatio="none"
      >
        {[0, 0.25, 0.5, 0.75, 1].map(
          (ratio) => {
            const y =
              topPadding +
              usableHeight -
              ratio * usableHeight;

            return (
              <line
                key={ratio}
                x1={leftPadding}
                x2={chartWidth - rightPadding}
                y1={y}
                y2={y}
                className="chart-grid-line"
              />
            );
          }
        )}

        <path
          d={areaPath}
          className="chart-area"
        />

        <path
          d={linePath}
          className="chart-line"
        />

        {points.map((point) => (
          <g key={point.label}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              className="chart-point"
            />

            <text
              x={point.x}
              y={chartHeight - 17}
              textAnchor="middle"
              className="chart-label"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="chart-value-row">
        <span>Monthly procurement spend</span>
        <strong>
          {formatCurrency(
            values.reduce(
              (sum, item) =>
                sum + numberValue(item.value),
              0
            )
          )}
        </strong>
      </div>
    </div>
  );
}

function HorizontalBars({ items }) {
  const values = Array.isArray(items)
    ? items
    : [];

  if (values.length === 0) {
    return (
      <div className="chart-empty">
        <p>No vendor performance data available.</p>
      </div>
    );
  }

  return (
    <div className="horizontal-bars">
      {values.map((vendor) => {
        const score = numberValue(
          vendor.reliability
        );

        return (
          <div
            className="vendor-performance-row"
            key={vendor.vendorId}
          >
            <div className="vendor-performance-header">
              <div>
                <strong>
                  {vendor.companyName ||
                    "Unknown Vendor"}
                </strong>

                <span>
                  {vendor.category ||
                    "Supplier"}
                </span>
              </div>

              <strong>
                {score.toFixed(1)}/100
              </strong>
            </div>

            <div className="performance-track">
              <div
                className={`performance-fill ${
                  score >= 75
                    ? "performance-good"
                    : score >= 50
                    ? "performance-medium"
                    : "performance-low"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, score)
                  )}%`
                }}
              />
            </div>

            <div className="vendor-performance-meta">
              <span>
                Delivery{" "}
                {vendor.delivery !== null &&
                vendor.delivery !== undefined
                  ? `${numberValue(
                      vendor.delivery
                    ).toFixed(1)}%`
                  : "—"}
              </span>

              <span>
                Quality{" "}
                {vendor.quality !== null &&
                vendor.quality !== undefined
                  ? `${numberValue(
                      vendor.quality
                    ).toFixed(1)}%`
                  : "—"}
              </span>

              <span
                className={getRiskClass(
                  vendor.riskStatus
                )}
              >
                {vendor.riskStatus ||
                  "Insufficient Data"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBars({ data }) {
  const values = Array.isArray(data)
    ? data
    : [];

  const maxValue = Math.max(
    ...values.map((item) =>
      numberValue(item.value)
    ),
    1
  );

  return (
    <div className="status-bars">
      {values.map((item) => (
        <div
          className="status-bar-row"
          key={item.label}
        >
          <div className="status-bar-header">
            <span>{item.label}</span>
            <strong>
              {formatNumber(item.value)}
            </strong>
          </div>

          <div className="status-track">
            <div
              className={`status-fill ${item.className}`}
              style={{
                width: `${Math.max(
                  2,
                  (numberValue(item.value) /
                    maxValue) *
                    100
                )}%`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProcurementDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "{}"
      );
    } catch {
      return {};
    }
  }, []);

  const loadDashboard = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data =
        await getProcurementDashboard();

      const stats =
        data?.stats || data || {};

      setDashboard(stats);
      setError("");
    } catch (err) {
      console.error(
        "Procurement dashboard error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load procurement dashboard"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const procurement = dashboard
    ?.procurementRequests || {};

  const orders =
    dashboard?.purchaseOrders || {};

  const deliveries =
    dashboard?.deliveries || {};

  const vendors =
    dashboard?.vendorComparisonSummary || {};

  const financial =
    dashboard?.financial || {};

  const contracts =
    dashboard?.contracts || {};

  const requestsTotal = numberValue(
    procurement.total
  );

  const pendingRequests = numberValue(
    procurement.pending
  );

  const approvedRequests = numberValue(
    procurement.approved
  );

  const rejectedRequests = numberValue(
    procurement.rejected
  );

  const totalOrders = numberValue(
    orders.total
  );

  const pendingOrders = numberValue(
    orders.pending
  );

  const issuedOrders = numberValue(
    orders.issued
  );

  const acceptedOrders = numberValue(
    orders.accepted
  );

  const fulfilledOrders = numberValue(
    orders.fulfilled
  );

  const cancelledOrders = numberValue(
    orders.cancelled
  );

  const activeOrders = numberValue(
    orders.active
  );

  const totalSpend = numberValue(
    dashboard?.totalProcurementValue ??
      orders.totalValue
  );

  const delayedDeliveries = numberValue(
    deliveries.delayed
  );

  const totalDeliveries = numberValue(
    deliveries.total
  );

  const onTimeRate = numberValue(
    deliveries.onTimeRate
  );

  const averageReliability = numberValue(
    dashboard?.averageReliability
  );

  const activeVendors = numberValue(
    dashboard?.activeVendors
  );

  const activeContracts = numberValue(
    dashboard?.activeContracts
  );

  const procurementStatusData = [
    {
      label: "Pending",
      value: pendingRequests,
      color: "#f59e0b"
    },
    {
      label: "Approved",
      value: approvedRequests,
      color: "#22c55e"
    },
    {
      label: "Rejected",
      value: rejectedRequests,
      color: "#ef4444"
    }
  ];

  const poStatusData = [
    {
      label: "Pending",
      value: pendingOrders,
      className: "status-pending"
    },
    {
      label: "Issued",
      value: issuedOrders,
      className: "status-issued"
    },
    {
      label: "Accepted",
      value: acceptedOrders,
      className: "status-accepted"
    },
    {
      label: "Completed",
      value: fulfilledOrders,
      className: "status-completed"
    },
    {
      label: "Cancelled",
      value: cancelledOrders,
      className: "status-cancelled"
    }
  ];

  const deliveryStatusData = [
    {
      label: "On Time / Advance",
      value: numberValue(
        deliveries.onTimeDeliveries
      ) +
        numberValue(
          deliveries.advance
        ),
      color: "#22c55e"
    },
    {
      label: "Delayed",
      value: delayedDeliveries,
      color: "#ef4444"
    }
  ];

  const topVendors = Array.isArray(
    dashboard?.vendorSelection
  )
    ? dashboard.vendorSelection.slice(0, 5)
    : [];

  const recentOrders = Array.isArray(
    dashboard?.recentPurchaseOrders
  )
    ? dashboard.recentPurchaseOrders
    : [];

  const upcomingDeliveries =
    Array.isArray(
      dashboard?.upcomingDeliveries
    )
      ? dashboard.upcomingDeliveries
      : [];

  const contractAlerts =
    Array.isArray(
      dashboard?.contractExpiryAlerts
    )
      ? dashboard.contractExpiryAlerts
      : [];

  if (loading) {
    return (
      <div className="procurement-loading">
        <div className="loading-spinner" />
        <span>
          Loading Procurement Dashboard...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="procurement-error">
        <FaExclamationTriangle />

        <h2>
          Unable to load dashboard
        </h2>

        <p>{error}</p>

        <button
          onClick={() => loadDashboard()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="procurement-layout">
      <ProcurementSidebar />

      <main className="procurement-main">
        <header className="procurement-header">
          <div>
            <h1>
              Procurement Dashboard
            </h1>

            <p>
              Vendor Reliability Intelligence &
              Procurement Risk Management
            </p>
          </div>

          <div className="procurement-header-actions">
            <button
              className={`refresh-dashboard-btn ${
                refreshing
                  ? "refreshing"
                  : ""
              }`}
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
              title="Refresh dashboard"
            >
              <FaSyncAlt />
            </button>

            <div className="procurement-header-profile">
              <div className="profile-avatar">
                {getInitials(
                  user.full_name ||
                    user.name
                )}
              </div>

              <div className="procurement-profile-info">
                <h4>
                  {user.full_name ||
                    user.name ||
                    "Procurement Manager"}
                </h4>

                <span>
                  {user.role ||
                    "Procurement Manager"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="procurement-welcome">
          <div>
            <span className="welcome-eyebrow">
              PROCUREMENT CONTROL CENTER
            </span>

            <h2>
              Welcome Back 👋
            </h2>

            <p>
              Monitor procurement requests,
              purchase orders, supplier performance,
              delivery risk and procurement
              spending from one centralized view.
            </p>
          </div>

          <div className="welcome-actions">
            <button
              className="welcome-primary-btn"
              onClick={() =>
                navigate("/procurement")
              }
            >
              Manage Procurement
              <FaArrowRight />
            </button>

            <button
              className="welcome-secondary-btn"
              onClick={() =>
                navigate("/purchase-orders")
              }
            >
              View Purchase Orders
              <FaFileInvoiceDollar />
            </button>
          </div>
        </section>

        <section className="procurement-kpi-grid">
          <div className="procurement-kpi-card">
            <div className="procurement-kpi-icon request-icon">
              <FaClipboardList />
            </div>

            <div className="kpi-content">
              <span className="kpi-label">
                TOTAL REQUESTS
              </span>

              <h3>
                {formatNumber(
                  requestsTotal
                )}
              </h3>

              <p>
                {formatNumber(
                  pendingRequests
                )}{" "}
                awaiting action
              </p>
            </div>
          </div>

          <div className="procurement-kpi-card">
            <div className="procurement-kpi-icon pending-icon">
              <FaClock />
            </div>

            <div className="kpi-content">
              <span className="kpi-label">
                PENDING POs
              </span>

              <h3>
                {formatNumber(
                  pendingOrders
                )}
              </h3>

              <p>
                Awaiting processing
              </p>
            </div>
          </div>

          <div className="procurement-kpi-card">
            <div className="procurement-kpi-icon order-icon">
              <FaShoppingCart />
            </div>

            <div className="kpi-content">
              <span className="kpi-label">
                ACTIVE POs
              </span>

              <h3>
                {formatNumber(
                  activeOrders
                )}
              </h3>

              <p>
                {formatNumber(
                  numberValue(
                    deliveries.inTransit
                  )
                )}{" "}
                in transit
              </p>
            </div>
          </div>

          <div className="procurement-kpi-card">
            <div className="procurement-kpi-icon spend-icon">
              <FaFileInvoiceDollar />
            </div>

            <div className="kpi-content">
              <span className="kpi-label">
                TOTAL SPEND
              </span>

              <h3>
                {formatCurrency(
                  totalSpend
                )}
              </h3>

              <p>
                {formatNumber(
                  totalOrders
                )}{" "}
                purchase orders
              </p>
            </div>
          </div>

          <div className="procurement-kpi-card">
            <div className="procurement-kpi-icon delayed-icon">
              <FaExclamationTriangle />
            </div>

            <div className="kpi-content">
              <span className="kpi-label">
                DELAYED DELIVERIES
              </span>

              <h3>
                {formatNumber(
                  delayedDeliveries
                )}
              </h3>

              <p>
                {onTimeRate.toFixed(1)}%
                {" "}on-time rate
              </p>
            </div>
          </div>

          <div className="procurement-kpi-card">
            <div className="procurement-kpi-icon reliability-icon">
              <FaTrophy />
            </div>

            <div className="kpi-content">
              <span className="kpi-label">
                AVG. RELIABILITY
              </span>

              <h3>
                {averageReliability > 0
                  ? `${averageReliability.toFixed(
                      1
                    )}/100`
                  : "—"}
              </h3>

              <p>
                {formatNumber(
                  numberValue(
                    vendors.comparableVendors
                  )
                )}{" "}
                comparable vendors
              </p>
            </div>
          </div>
        </section>

        <section className="dashboard-grid two-column">
          <div className="dashboard-card procurement-overview-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  Procurement Overview
                </h2>

                <p>
                  Request pipeline and current
                  procurement workload
                </p>
              </div>

              <FaChartLine />
            </div>

            <DonutChart
              data={
                procurementStatusData
              }
              total={requestsTotal}
            />

            <div className="overview-mini-grid">
              <div>
                <span>
                  PO Fulfillment
                </span>

                <strong>
                  {numberValue(
                    orders.fulfillmentRate
                  ).toFixed(1)}
                  %
                </strong>
              </div>

              <div>
                <span>
                  Approved Vendors
                </span>

                <strong>
                  {formatNumber(
                    activeVendors
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Contracts
                </span>

                <strong>
                  {formatNumber(
                    activeContracts
                  )}
                </strong>
              </div>
            </div>
          </div>

          <div className="dashboard-card spending-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  Procurement Cost Analysis
                </h2>

                <p>
                  Monthly purchase-order spending
                  trend
                </p>
              </div>

              <FaFileInvoiceDollar />
            </div>

            <MonthlySpendChart
              data={
                dashboard?.spendingByMonth ||
                []
              }
            />
          </div>
        </section>

        <section className="dashboard-grid two-column">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  Purchase Order Status
                </h2>

                <p>
                  Current purchase-order lifecycle
                  distribution
                </p>
              </div>

              <FaTruck />
            </div>

            <StatusBars
              data={poStatusData}
            />

            <div className="delivery-summary-grid">
              <div>
                <span>On Time</span>
                <strong className="positive">
                  {formatNumber(
                    numberValue(
                      deliveries.onTimeDeliveries
                    ) +
                      numberValue(
                        deliveries.advance
                      )
                  )}
                </strong>
              </div>

              <div>
                <span>Delayed</span>
                <strong className="negative">
                  {formatNumber(
                    delayedDeliveries
                  )}
                </strong>
              </div>

              <div>
                <span>Delivery Rate</span>
                <strong>
                  {onTimeRate.toFixed(1)}%
                </strong>
              </div>

              <div>
                <span>Total Deliveries</span>
                <strong>
                  {formatNumber(
                    totalDeliveries
                  )}
                </strong>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  Top Vendor Performance
                </h2>

                <p>
                  Ranked using available
                  historical performance evidence
                </p>
              </div>

              <FaTrophy />
            </div>

            <HorizontalBars
              items={topVendors}
            />

            <div className="risk-summary">
              <span>
                <i className="risk-dot low" />
                Low{" "}
                {formatNumber(
                  numberValue(
                    dashboard?.riskSummary
                      ?.low
                  )
                )}
              </span>

              <span>
                <i className="risk-dot medium" />
                Medium{" "}
                {formatNumber(
                  numberValue(
                    dashboard?.riskSummary
                      ?.medium
                  )
                )}
              </span>

              <span>
                <i className="risk-dot high" />
                High{" "}
                {formatNumber(
                  numberValue(
                    dashboard?.riskSummary
                      ?.high
                  )
                )}
              </span>
            </div>
          </div>
        </section>

        <section className="dashboard-grid two-column">
          <div className="dashboard-card recent-orders-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  Recent Purchase Orders
                </h2>

                <p>
                  Latest procurement transactions
                </p>
              </div>

              <button
                className="view-all-btn"
                onClick={() =>
                  navigate(
                    "/purchase-orders"
                  )
                }
              >
                View All
                <FaArrowRight />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="table-empty">
                <FaShoppingCart />
                <p>
                  No purchase orders available.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>PO ID</th>
                      <th>VENDOR</th>
                      <th>AMOUNT</th>
                      <th>ORDER DATE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders
                      .slice(0, 8)
                      .map((order) => (
                        <tr
                          key={
                            order.poId ||
                            order.po_id
                          }
                        >
                          <td>
                            <strong className="po-id">
                              #
                              {order.poId ||
                                order.po_id}
                            </strong>
                          </td>

                          <td>
                            {order.vendorName ||
                              order.companyName ||
                              "Unassigned Vendor"}
                          </td>

                          <td>
                            {formatCurrency(
                              order.amount ??
                                order.order_amount
                            )}
                          </td>

                          <td>
                            {formatDate(
                              order.orderDate ||
                                order.order_date
                            )}
                          </td>

                          <td>
                            <span
                              className={`status-badge ${getStatusClass(
                                order.status
                              )}`}
                            >
                              {order.status ||
                                "Unknown"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="dashboard-card upcoming-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  Upcoming Deliveries
                </h2>

                <p>
                  Orders requiring delivery
                  monitoring
                </p>
              </div>

              <FaClock />
            </div>

            {upcomingDeliveries.length ===
            0 ? (
              <div className="table-empty">
                <FaCalendarAlt />
                <p>
                  No upcoming deliveries
                  requiring monitoring.
                </p>
              </div>
            ) : (
              <div className="upcoming-list">
                {upcomingDeliveries
                  .slice(0, 6)
                  .map((delivery) => (
                    <div
                      className="upcoming-item"
                      key={
                        delivery.poId ||
                        delivery.po_id
                      }
                    >
                      <div className="upcoming-icon">
                        <FaTruck />
                      </div>

                      <div className="upcoming-info">
                        <strong>
                          PO-
                          {delivery.poId ||
                            delivery.po_id}
                        </strong>

                        <span>
                          {delivery.vendorName ||
                            "Unassigned Vendor"}
                        </span>
                      </div>

                      <div className="upcoming-date">
                        <strong>
                          {formatDate(
                            delivery.deliveryDate ||
                              delivery.delivery_date
                          )}
                        </strong>

                        <span
                          className={getStatusClass(
                            delivery.status
                          )}
                        >
                          {delivery.daysRemaining >=
                          0
                            ? delivery.daysRemaining ===
                              0
                              ? "Today"
                              : `In ${delivery.daysRemaining} days`
                            : "Overdue"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-grid two-column">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  Delivery Performance
                </h2>

                <p>
                  Actual delivery performance
                  from recorded delivery history
                </p>
              </div>

              <FaTruck />
            </div>

            <div className="delivery-chart">
              {deliveryStatusData.map(
                (item) => {
                  const percentage =
                    totalDeliveries > 0
                      ? (item.value /
                          totalDeliveries) *
                        100
                      : 0;

                  return (
                    <div
                      className="delivery-bar-item"
                      key={item.label}
                    >
                      <div className="delivery-bar-header">
                        <span>
                          <i
                            style={{
                              background:
                                item.color
                            }}
                          />
                          {item.label}
                        </span>

                        <strong>
                          {formatNumber(
                            item.value
                          )}
                        </strong>
                      </div>

                      <div className="delivery-track">
                        <div
                          className="delivery-fill"
                          style={{
                            width: `${Math.max(
                              percentage,
                              item.value >
                                0
                                ? 3
                                : 0
                            )}%`,
                            background:
                              item.color
                          }}
                        />
                      </div>

                      <span className="delivery-percentage">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <h2>
                  Contract Expiry Alerts
                </h2>

                <p>
                  Contracts requiring renewal
                  attention
                </p>
              </div>

              <button
                className="view-all-btn"
                onClick={() =>
                  navigate("/contracts")
                }
              >
                View All
                <FaArrowRight />
              </button>
            </div>

            {contractAlerts.length ===
            0 ? (
              <div className="table-empty">
                <FaFileContract />
                <p>
                  No contracts currently require
                  expiry monitoring.
                </p>
              </div>
            ) : (
              <div className="contract-alert-list">
                {contractAlerts
                  .slice(0, 6)
                  .map((contract) => (
                    <div
                      className="contract-alert-item"
                      key={
                        contract.contractId ||
                        contract.contract_id
                      }
                    >
                      <div>
                        <strong>
                          {contract.contractName ||
                            "Vendor Contract"}
                        </strong>

                        <span>
                          {contract.vendorName ||
                            "Unknown Vendor"}
                        </span>
                      </div>

                      <div className="contract-expiry">
                        <strong>
                          {formatDate(
                            contract.expiryDate ||
                              contract.expiry_date
                          )}
                        </strong>

                        <span
                          className={
                            contract.daysRemaining <=
                            30
                              ? "expiry-danger"
                              : contract.daysRemaining <=
                                60
                              ? "expiry-warning"
                              : "expiry-safe"
                          }
                        >
                          {contract.daysRemaining >=
                          0
                            ? `In ${contract.daysRemaining} days`
                            : "Expired"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        <section className="decision-support-card">
          <div className="decision-support-icon">
            <FaTrophy />
          </div>

          <div className="decision-support-content">
            <h2>
              Procurement Decision Support
            </h2>

            <p>
              {formatNumber(
                vendors.approvedVendors
              )}{" "}
              approved vendors,{" "}
              {formatNumber(
                vendors.comparableVendors
              )}{" "}
              with sufficient performance evidence,
              and{" "}
              {formatNumber(
                vendors.insufficientDataVendors
              )}{" "}
              requiring more data.
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/vendors")
            }
          >
            Compare Vendors
            <FaArrowRight />
          </button>
        </section>

        <section className="procurement-snapshot">
          <div className="snapshot-header">
            <div>
              <h2>
                Procurement Snapshot
              </h2>

              <p>
                Key operational indicators for
                procurement decisions
              </p>
            </div>
          </div>

          <div className="snapshot-grid">
            <div className="snapshot-card">
              <span>
                Approved Requests
              </span>

              <strong>
                {formatNumber(
                  approvedRequests
                )}
              </strong>

              <FaCheckCircle />
            </div>

            <div className="snapshot-card">
              <span>
                Orders In Transit
              </span>

              <strong>
                {formatNumber(
                  deliveries.inTransit
                )}
              </strong>

              <FaTruck />
            </div>

            <div className="snapshot-card">
              <span>
                Fulfillment Rate
              </span>

              <strong>
                {numberValue(
                  orders.fulfillmentRate
                ).toFixed(1)}
                %
              </strong>

              <FaChartLine />
            </div>

            <div className="snapshot-card">
              <span>
                On-Time Delivery
              </span>

              <strong>
                {onTimeRate.toFixed(1)}%
              </strong>

              <FaTruck />
            </div>

            <div className="snapshot-card">
              <span>
                Approved Vendors
              </span>

              <strong>
                {formatNumber(
                  vendors.approvedVendors
                )}
              </strong>

              <FaBuilding />
            </div>

            <div className="snapshot-card">
              <span>
                Contracts
              </span>

              <strong>
                {formatNumber(
                  activeContracts
                )}
              </strong>

              <FaFileContract />
            </div>

            <div className="snapshot-card">
              <span>
                Procurement Spend
              </span>

              <strong>
                {formatCurrency(
                  totalSpend
                )}
              </strong>

              <FaFileInvoiceDollar />
            </div>

            <div className="snapshot-card">
              <span>
                Procurement Status
              </span>

              <strong className="active-text">
                Active
              </strong>

              <FaCheckCircle />
            </div>
          </div>
        </section>

        <section className="procurement-feature-grid">
          <div className="procurement-feature-card">
            <div className="feature-icon">
              <FaClipboardList />
            </div>

            <div className="feature-content">
              <h2>
                Procurement Management
              </h2>

              <p>
                Review procurement requests,
                compare eligible vendors using
                reliability and performance, and
                create purchase orders.
              </p>

              <button
                onClick={() =>
                  navigate("/procurement")
                }
              >
                Manage Procurement
                <FaArrowRight />
              </button>
            </div>
          </div>

          <div className="procurement-feature-card">
            <div className="feature-icon">
              <FaFileInvoiceDollar />
            </div>

            <div className="feature-content">
              <h2>
                Purchase Orders
              </h2>

              <p>
                Monitor vendor assignments, order
                amounts, statuses and delivery dates
                throughout the purchase-order
                lifecycle.
              </p>

              <button
                onClick={() =>
                  navigate(
                    "/purchase-orders"
                  )
                }
              >
                View Purchase Orders
                <FaArrowRight />
              </button>
            </div>
          </div>

          <div className="procurement-feature-card">
            <div className="feature-icon">
              <FaBuilding />
            </div>

            <div className="feature-content">
              <h2>
                Vendor Management
              </h2>

              <p>
                Review vendor profiles, approval
                status, categories and supplier
                performance information.
              </p>

              <button
                onClick={() =>
                  navigate("/vendors")
                }
              >
                Manage Vendors
                <FaArrowRight />
              </button>
            </div>
          </div>

          <div className="procurement-feature-card">
            <div className="feature-icon">
              <FaFileContract />
            </div>

            <div className="feature-content">
              <h2>
                Contracts & Analytics
              </h2>

              <p>
                Review contracts, procurement
                analytics and supplier insights to
                support purchasing decisions.
              </p>

              <button
                onClick={() =>
                  navigate("/contracts")
                }
              >
                View Contracts
                <FaArrowRight />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}