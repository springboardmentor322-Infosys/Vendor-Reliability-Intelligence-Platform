 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getVendorDashboard } from "../services/api";
import VendorSidebar from "../components/VendorSidebar";
import "../styles/VendorDashboard.css";

import {
  FaBell,
  FaChartLine,
  FaCheckCircle,
  FaChevronRight,
  FaClock,
  FaFileContract,
  FaFileInvoiceDollar,
  FaSearch,
  FaShieldAlt,
  FaShoppingCart,
  FaTruck,
  FaUserCircle,
  FaExclamationTriangle,
  FaEnvelope,
} from "react-icons/fa";

export default function VendorDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
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

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await getVendorDashboard();
      const stats = response?.stats || response || {};

      setDashboard(stats);
    } catch (err) {
      console.error("Vendor dashboard error:", err);
      setError(
        err?.message || "Failed to load vendor dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  const numberValue = (input) => {
    if (
      input === null ||
      input === undefined ||
      input === "" ||
      Number.isNaN(Number(input))
    ) {
      return null;
    }

    return Number(input);
  };

  const displayNumber = (input, decimals = 0) => {
    const number = numberValue(input);

    if (number === null) {
      return "—";
    }

    return number.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const displayCurrency = (input) => {
    const number = numberValue(input);

    if (number === null) {
      return "—";
    }

    return `₹${number.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const displayDate = (input) => {
    if (!input) {
      return "—";
    }

    const date = new Date(input);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const percentage = (input) => {
    const number = numberValue(input);

    if (number === null) {
      return null;
    }

    return Math.max(0, Math.min(100, number));
  };

  const progressWidth = (input) => {
    const number = percentage(input);
    return number === null ? "0%" : `${number}%`;
  };

  const statusClass = (status) =>
    String(status || "unknown")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

  if (loading) {
    return (
      <div className="vendor-loading">
        Loading Vendor Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="vendor-error">
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>
        <button type="button" onClick={loadDashboard}>
          Try Again
        </button>
      </div>
    );
  }

  const stats = dashboard || {};
  const deliveries = stats.deliveries || {};
  const quality = stats.quality || {};
  const performance = stats.performance || {};
  const reliability = stats.reliability || {};
  const invoices = stats.invoices || {};
  const contracts = stats.contracts || {};

  const recentOrders = Array.isArray(
    stats.recentPurchaseOrders
  )
    ? stats.recentPurchaseOrders
    : [];

  const recentInvoices = Array.isArray(
    stats.recentInvoices
  )
    ? stats.recentInvoices
    : [];

  const upcomingDeliveries = Array.isArray(
    stats.upcomingDeliveries
  )
    ? stats.upcomingDeliveries
    : [];

  const contractAlerts = Array.isArray(
    stats.contractAlerts
  )
    ? stats.contractAlerts
    : [];

  const notifications = Array.isArray(
    stats.recentNotifications
  )
    ? stats.recentNotifications
    : [];

  const performanceTrend = Array.isArray(
    stats.performanceTrend
  )
    ? stats.performanceTrend
    : [];

  const contractStatus = Array.isArray(
    stats.contractStatus
  )
    ? stats.contractStatus
    : [];

  const reliabilityScore =
    numberValue(reliability.score);

  const performanceScore =
    numberValue(performance.performanceScore);

  const onTimeRate =
    numberValue(deliveries.onTimeRate);

  const qualityScore =
    numberValue(quality.qualityScore) ??
    numberValue(performance.qualityScore);

  const qualityPassRate =
    numberValue(quality.qualityPassRate);

  const fulfillmentRate =
    numberValue(reliability.fulfillmentRate);

  const complianceScore =
    numberValue(performance.complianceScore);

  const totalOrders =
    numberValue(stats.purchaseOrders);

  const pendingOrders =
    numberValue(stats.pendingOrders);

  const activeOrders =
    numberValue(stats.activeOrders);

  const completedOrders =
    numberValue(stats.completedOrders);

  const totalInvoiced =
    numberValue(invoices.totalInvoiced);

  const pendingAmount =
    numberValue(invoices.pendingAmount);

  const totalContracts =
    numberValue(contracts.total);

  const activeContracts =
    numberValue(contracts.active);

  const expiringContracts =
    numberValue(contracts.expiringSoon);

  const expiredContracts =
    numberValue(contracts.expired);

  const performanceFactors = [
    {
      label: "Delivery",
      value: numberValue(performance.deliveryScore),
    },
    {
      label: "Quality",
      value: qualityScore,
    },
    {
      label: "Compliance",
      value: complianceScore,
    },
  ];

  const reliabilityFactors = [
    {
      label: "On-Time Delivery",
      value: onTimeRate,
    },
    {
      label: "Quality Pass Rate",
      value: qualityPassRate,
    },
    {
      label: "Fulfillment Rate",
      value: fulfillmentRate,
    },
    {
      label: "Compliance",
      value: complianceScore,
    },
  ];

  const trendMax = Math.max(
    ...performanceTrend.map((item) =>
      Math.max(
        numberValue(item.on_time) || 0,
        numberValue(item.delayed) || 0
      )
    ),
    1
  );

  const contractTotal =
    contractStatus.reduce(
      (sum, item) =>
        sum + (numberValue(item.count) || 0),
      0
    ) || totalContracts || 0;

  let contractOffset = 0;

  return (
    <div className="vendor-dashboard-layout">
      <VendorSidebar />

      <main className="vendor-dashboard-main">
        <header className="vendor-dashboard-header">
          <div>
            <h1>Vendor Dashboard</h1>
            <p>
              Vendor Reliability Intelligence Platform
            </p>
          </div>

          <div className="vendor-header-right">
            <div className="vendor-search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search anything..."
              />
            </div>

            <button
              className="vendor-notification-btn"
              type="button"
              onClick={() =>
                navigate("/notifications")
              }
            >
              <FaBell />
              {numberValue(stats.notifications) !==
                null && (
                <span className="vendor-notification-count">
                  {displayNumber(stats.notifications)}
                </span>
              )}
            </button>

            <div className="vendor-profile-box">
              <FaUserCircle className="vendor-profile-icon" />

              <div className="vendor-profile-info">
                <h4>
                  {stats.companyName ||
                    user.company_name ||
                    user.full_name ||
                    "Vendor"}
                </h4>
                <span>
                  {user.role || "Vendor"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="vendor-breadcrumb">
          <span>Home</span>
          <FaChevronRight />
          <strong>Vendor Dashboard</strong>
        </div>

        <section className="vendor-welcome">
          <div>
            <span>Vendor Overview</span>
            <h2>
              Welcome back,{" "}
              {stats.companyName || "Vendor"}
            </h2>
            <p>
              Monitor your purchase orders, deliveries,
              invoices, contracts and vendor performance
              from one centralized dashboard.
            </p>
          </div>
        </section>

        <section className="vendor-kpi-grid">
          <div className="vendor-kpi-card">
            <div className="vendor-kpi-icon reliability-kpi">
              <FaShieldAlt />
            </div>

            <div>
              <span>Reliability Score</span>
              <strong>
                {displayNumber(
                  reliabilityScore,
                  1
                )}
                <small>/100</small>
              </strong>
              <em>
                {reliability.status ||
                  "Insufficient Data"}
              </em>
            </div>
          </div>

          <div className="vendor-kpi-card">
            <div className="vendor-kpi-icon orders-kpi">
              <FaShoppingCart />
            </div>

            <div>
              <span>Total Purchase Orders</span>
              <strong>
                {displayNumber(totalOrders)}
              </strong>
              <em>
                {pendingOrders !== null
                  ? `${displayNumber(
                      pendingOrders
                    )} pending`
                  : "No pending data"}
              </em>
            </div>
          </div>

          <div className="vendor-kpi-card">
            <div className="vendor-kpi-icon delivery-kpi">
              <FaTruck />
            </div>

            <div>
              <span>On-Time Delivery</span>
              <strong>
                {onTimeRate !== null
                  ? `${displayNumber(
                      onTimeRate,
                      1
                    )}%`
                  : "—"}
              </strong>
              <em>
                {deliveries.onTime !==
                undefined
                  ? `${displayNumber(
                      deliveries.onTime
                    )} successful`
                  : "Delivery data"}
              </em>
            </div>
          </div>

          <div className="vendor-kpi-card">
            <div className="vendor-kpi-icon quality-kpi">
              <FaCheckCircle />
            </div>

            <div>
              <span>Quality Score</span>
              <strong>
                {qualityScore !== null
                  ? `${displayNumber(
                      qualityScore,
                      1
                    )}/100`
                  : "—"}
              </strong>
              <em>
                {qualityPassRate !== null
                  ? `${displayNumber(
                      qualityPassRate,
                      1
                    )}% pass rate`
                  : "Quality inspection data"}
              </em>
            </div>
          </div>

          <div className="vendor-kpi-card">
            <div className="vendor-kpi-icon invoice-kpi">
              <FaFileInvoiceDollar />
            </div>

            <div>
              <span>Total Invoiced</span>
              <strong>
                {displayCurrency(
                  totalInvoiced
                )}
              </strong>
              <em>
                {invoices.totalInvoices !==
                undefined
                  ? `${displayNumber(
                      invoices.totalInvoices
                    )} invoices`
                  : "Invoice records"}
              </em>
            </div>
          </div>

          <div className="vendor-kpi-card">
            <div className="vendor-kpi-icon payment-kpi">
              <FaClock />
            </div>

            <div>
              <span>Pending Payments</span>
              <strong>
                {displayCurrency(
                  pendingAmount
                )}
              </strong>
              <em>
                {invoices.totalInvoices !==
                undefined
                  ? `${displayNumber(
                      invoices.totalInvoices
                    )} total invoices`
                  : "Outstanding payments"}
              </em>
            </div>
          </div>
        </section>

        <section className="vendor-primary-grid">
          <div className="vendor-panel reliability-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Overall Reliability Score</h2>
                <p>
                  Current vendor reliability
                  assessment
                </p>
              </div>

              <FaShieldAlt />
            </div>

            <div className="reliability-main">
              <div
                className="reliability-gauge"
                style={{
                  "--reliability-value":
                    reliabilityScore !==
                    null
                      ? `${Math.max(
                          0,
                          Math.min(
                            100,
                            reliabilityScore
                          )
                        ) * 3.6}deg`
                      : "0deg",
                }}
              >
                <div className="reliability-gauge-inner">
                  <strong>
                    {displayNumber(
                      reliabilityScore,
                      1
                    )}
                  </strong>
                  <span>/100</span>
                </div>
              </div>

              <div className="reliability-gauge-label">
                <strong>
                  {reliability.status ||
                    "Insufficient Data"}
                </strong>
                <span>
                  Overall vendor reliability
                </span>
              </div>
            </div>

            <p className="reliability-description">
              Calculated from delivery, quality,
              fulfillment and compliance data
              associated with this vendor.
            </p>

            <div className="reliability-factor-list">
              {reliabilityFactors.map(
                (factor) => (
                  <div
                    className="reliability-factor"
                    key={factor.label}
                  >
                    <div>
                      <span>
                        {factor.label}
                      </span>
                      <strong>
                        {factor.value !==
                        null
                          ? `${displayNumber(
                              factor.value,
                              1
                            )}%`
                          : "—"}
                      </strong>
                    </div>

                    <div className="reliability-progress">
                      <div
                        style={{
                          width:
                            progressWidth(
                              factor.value
                            ),
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="vendor-panel performance-summary-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Performance Summary</h2>
                <p>
                  Current vendor performance
                  indicators
                </p>
              </div>

              <FaChartLine />
            </div>

            <div className="performance-summary-score">
              <strong>
                {displayNumber(
                  performanceScore,
                  1
                )}
              </strong>

              <span>
                /100 Performance Score
              </span>

              <em>
                {performance.riskStatus ||
                  "Insufficient Data"}
              </em>
            </div>

            <div className="performance-summary-grid">
              <div>
                <FaTruck />
                <span>On-Time Deliveries</span>
                <strong>
                  {displayNumber(
                    deliveries.onTime
                  )}
                </strong>
              </div>

              <div>
                <FaExclamationTriangle />
                <span>Delayed Deliveries</span>
                <strong>
                  {displayNumber(
                    deliveries.delayed
                  )}
                </strong>
              </div>

              <div>
                <FaCheckCircle />
                <span>Quality Score</span>
                <strong>
                  {displayNumber(
                    qualityScore,
                    1
                  )}
                </strong>
              </div>

              <div>
                <FaShoppingCart />
                <span>Order Completion</span>
                <strong>
                  {fulfillmentRate !==
                  null
                    ? `${displayNumber(
                        fulfillmentRate,
                        1
                      )}%`
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="performance-factor-list">
              {performanceFactors.map(
                (factor) => (
                  <div
                    className="performance-factor"
                    key={factor.label}
                  >
                    <div>
                      <span>
                        {factor.label}
                      </span>
                      <strong>
                        {factor.value !==
                        null
                          ? displayNumber(
                              factor.value,
                              1
                            )
                          : "—"}
                      </strong>
                    </div>

                    <div className="performance-progress">
                      <div
                        style={{
                          width:
                            progressWidth(
                              factor.value
                            ),
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        <section className="vendor-secondary-grid">
          <div className="vendor-panel recent-orders-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Recent Purchase Orders</h2>
                <p>
                  Latest purchase orders assigned
                  to your vendor account
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/purchase-orders"
                  )
                }
              >
                View All
                <FaChevronRight />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="vendor-empty-state">
                <FaShoppingCart />
                <p>
                  No purchase orders available.
                </p>
              </div>
            ) : (
              <div className="recent-orders-table">
                <div className="recent-orders-heading">
                  <span>PO Number</span>
                  <span>Status</span>
                  <span>Order Date</span>
                  <span>Delivery Date</span>
                  <span>Amount</span>
                </div>

                {recentOrders.map(
                  (order) => (
                    <div
                      className="recent-order-row"
                      key={order.po_id}
                    >
                      <strong>
                        PO-{order.po_id}
                      </strong>

                      <span
                        className={`order-status ${statusClass(
                          order.status
                        )}`}
                      >
                        {order.status ||
                          "—"}
                      </span>

                      <span>
                        {displayDate(
                          order.order_date
                        )}
                      </span>

                      <span>
                        {displayDate(
                          order.delivery_date
                        )}
                      </span>

                      <strong>
                        {displayCurrency(
                          order.order_amount
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="vendor-panel delivery-summary-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Delivery Performance</h2>
                <p>
                  Delivery distribution for
                  this vendor
                </p>
              </div>

              <FaTruck />
            </div>

            <div className="delivery-chart-layout">
              <div
                className="delivery-donut"
                style={{
                  background:
                    numberValue(
                      deliveries.total
                    ) > 0
                      ? `conic-gradient(
                          #16a96c 0 ${
                            ((numberValue(
                              deliveries.onTime
                            ) || 0) /
                              numberValue(
                                deliveries.total
                              )) *
                            100
                          }%,
                          #ef5350 ${
                            ((numberValue(
                              deliveries.onTime
                            ) || 0) /
                              numberValue(
                                deliveries.total
                              )) *
                            100
                          }% ${
                            (((numberValue(
                              deliveries.onTime
                            ) || 0) +
                              (numberValue(
                                deliveries.delayed
                              ) || 0)) /
                              numberValue(
                                deliveries.total
                              )) *
                            100
                          }%,
                          #7350e6 ${
                            (((numberValue(
                              deliveries.onTime
                            ) || 0) +
                              (numberValue(
                                deliveries.delayed
                              ) || 0)) /
                              numberValue(
                                deliveries.total
                              )) *
                            100
                          }% ${
                            (((numberValue(
                              deliveries.onTime
                            ) || 0) +
                              (numberValue(
                                deliveries.delayed
                              ) || 0) +
                              (numberValue(
                                deliveries.advance
                              ) || 0)) /
                              numberValue(
                                deliveries.total
                              )) *
                            100
                          }%,
                          #9aa4b2 ${
                            (((numberValue(
                              deliveries.onTime
                            ) || 0) +
                              (numberValue(
                                deliveries.delayed
                              ) || 0) +
                              (numberValue(
                                deliveries.advance
                              ) || 0)) /
                              numberValue(
                                deliveries.total
                              )) *
                            100
                          }% 100%
                        )`
                      : "#e7eaf1",
                }}
              >
                <div>
                  <strong>
                    {displayNumber(
                      deliveries.total
                    )}
                  </strong>
                  <span>Deliveries</span>
                </div>
              </div>

              <div className="delivery-legend">
                <div>
                  <i className="legend-on-time" />
                  <span>On-Time</span>
                  <strong>
                    {displayNumber(
                      deliveries.onTime
                    )}
                  </strong>
                </div>

                <div>
                  <i className="legend-delayed" />
                  <span>Delayed</span>
                  <strong>
                    {displayNumber(
                      deliveries.delayed
                    )}
                  </strong>
                </div>

                <div>
                  <i className="legend-advance" />
                  <span>Advance</span>
                  <strong>
                    {displayNumber(
                      deliveries.advance
                    )}
                  </strong>
                </div>

                <div>
                  <i className="legend-cancelled" />
                  <span>Cancelled</span>
                  <strong>
                    {displayNumber(
                      deliveries.cancelled
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="vendor-three-grid">
          <div className="vendor-panel payments-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Recent Payments</h2>
                <p>
                  Latest invoice activity
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/invoices")
                }
              >
                View All
              </button>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="vendor-empty-state">
                <FaFileInvoiceDollar />
                <p>
                  No invoice records available.
                </p>
              </div>
            ) : (
              <div className="simple-list">
                {recentInvoices.map(
                  (invoice) => (
                    <div
                      className="simple-list-row"
                      key={
                        invoice.invoice_id
                      }
                    >
                      <div>
                        <strong>
                          {invoice.invoice_number ||
                            `INV-${invoice.invoice_id}`}
                        </strong>
                        <span>
                          {displayDate(
                            invoice.invoice_date
                          )}
                        </span>
                      </div>

                      <div>
                        <strong>
                          {displayCurrency(
                            invoice.invoice_amount
                          )}
                        </strong>
                        <span
                          className={`payment-status ${statusClass(
                            invoice.payment_status
                          )}`}
                        >
                          {invoice.payment_status ||
                            "—"}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="vendor-panel contract-alert-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Contract & Compliance</h2>
                <p>
                  Current vendor agreements
                </p>
              </div>

              <FaFileContract />
            </div>

            <div className="contract-stat-grid">
              <div>
                <span>Total Contracts</span>
                <strong>
                  {displayNumber(
                    totalContracts
                  )}
                </strong>
              </div>

              <div>
                <span>Active</span>
                <strong>
                  {displayNumber(
                    activeContracts
                  )}
                </strong>
              </div>

              <div>
                <span>Expiring Soon</span>
                <strong>
                  {displayNumber(
                    expiringContracts
                  )}
                </strong>
              </div>

              <div>
                <span>Expired</span>
                <strong>
                  {displayNumber(
                    expiredContracts
                  )}
                </strong>
              </div>
            </div>

            <div className="contract-alert-list">
              {contractAlerts.length === 0 ? (
                <div className="vendor-empty-state compact">
                  <FaCheckCircle />
                  <p>
                    No contract alerts.
                  </p>
                </div>
              ) : (
                contractAlerts.map(
                  (contract) => (
                    <div
                      className="contract-alert-row"
                      key={
                        contract.contract_id
                      }
                    >
                      <div>
                        <strong>
                          {contract.contract_title ||
                            "Vendor Contract"}
                        </strong>
                        <span>
                          Valid till{" "}
                          {displayDate(
                            contract.end_date
                          )}
                        </span>
                      </div>

                      <span
                        className={`contract-status ${statusClass(
                          contract.status
                        )}`}
                      >
                        {contract.status ||
                          "—"}
                      </span>
                    </div>
                  )
                )
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/contracts")
              }
            >
              Open Contracts & Compliance
              <FaChevronRight />
            </button>
          </div>

          <div className="vendor-panel notifications-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Notifications</h2>
                <p>
                  Latest procurement activity
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/notifications"
                  )
                }
              >
                View All
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="vendor-empty-state">
                <FaBell />
                <p>
                  No notifications available.
                </p>
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map(
                  (notification) => (
                    <div
                      className="notification-row"
                      key={
                        notification.notification_id
                      }
                    >
                      <div className="notification-icon">
                        <FaBell />
                      </div>

                      <div>
                        <strong>
                          {notification.message}
                        </strong>
                        <span>
                          {displayDate(
                            notification.created_at
                          )}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        <section className="vendor-three-grid">
          <div className="vendor-panel trend-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Performance Trend</h2>
                <p>
                  Vendor delivery performance
                  over recent months
                </p>
              </div>

              <FaChartLine />
            </div>

            {performanceTrend.length ===
            0 ? (
              <div className="vendor-empty-state">
                <FaChartLine />
                <p>
                  No historical delivery
                  trend data available.
                </p>
              </div>
            ) : (
              <div className="trend-chart">
                {performanceTrend.map(
                  (item) => (
                    <div
                      className="trend-column"
                      key={item.month}
                    >
                      <div className="trend-bars">
                        <div
                          className="trend-bar on-time-bar"
                          style={{
                            height: `${
                              ((numberValue(
                                item.on_time
                              ) || 0) /
                                trendMax) *
                              100
                            }%`,
                          }}
                          title={`On-Time: ${item.on_time}`}
                        />
                        <div
                          className="trend-bar delayed-bar"
                          style={{
                            height: `${
                              ((numberValue(
                                item.delayed
                              ) || 0) /
                                trendMax) *
                              100
                            }%`,
                          }}
                          title={`Delayed: ${item.delayed}`}
                        />
                      </div>

                      <span>
                        {item.month}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="vendor-panel contract-chart-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Contract Status</h2>
                <p>
                  Current contracts for this
                  vendor
                </p>
              </div>

              <FaFileContract />
            </div>

            <div className="contract-chart-area">
              <div
                className="contract-donut"
                style={{
                  background:
                    contractTotal > 0
                      ? `conic-gradient(
                          #16a96c 0 ${
                            ((numberValue(
                              contractStatus[0]?.count
                            ) || 0) /
                              contractTotal) *
                            100
                          }%,
                          #7350e6 ${
                            ((numberValue(
                              contractStatus[0]?.count
                            ) || 0) /
                              contractTotal) *
                            100
                          }% ${
                            (((numberValue(
                              contractStatus[0]?.count
                            ) || 0) +
                              (numberValue(
                                contractStatus[1]?.count
                              ) || 0)) /
                              contractTotal) *
                            100
                          }%,
                          #f2b900 ${
                            (((numberValue(
                              contractStatus[0]?.count
                            ) || 0) +
                              (numberValue(
                                contractStatus[1]?.count
                              ) || 0)) /
                              contractTotal) *
                            100
                          }% ${
                            (((numberValue(
                              contractStatus[0]?.count
                            ) || 0) +
                              (numberValue(
                                contractStatus[1]?.count
                              ) || 0) +
                              (numberValue(
                                contractStatus[2]?.count
                              ) || 0)) /
                              contractTotal) *
                            100
                          }%,
                          #e7eaf1 ${
                            (((numberValue(
                              contractStatus[0]?.count
                            ) || 0) +
                              (numberValue(
                                contractStatus[1]?.count
                              ) || 0) +
                              (numberValue(
                                contractStatus[2]?.count
                              ) || 0)) /
                              contractTotal) *
                            100
                          }% 100%
                        )`
                      : "#e7eaf1",
                }}
              >
                <div>
                  <strong>
                    {displayNumber(
                      contractTotal
                    )}
                  </strong>
                  <span>
                    Total Contracts
                  </span>
                </div>
              </div>

              <div className="contract-legend">
                {contractStatus.map(
                  (item) => (
                    <div
                      key={
                        item.status
                      }
                    >
                      <span>
                        {item.status}
                      </span>
                      <strong>
                        {displayNumber(
                          item.count
                        )}
                      </strong>
                    </div>
                  )
                )}

                {contractStatus.length ===
                  0 && (
                  <span>
                    No contract status data
                    available.
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/contracts")
              }
            >
              View All Contracts
              <FaChevronRight />
            </button>
          </div>

          <div className="vendor-panel upcoming-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Upcoming Deliveries</h2>
                <p>
                  Scheduled purchase order
                  deliveries
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/delivery-tracking"
                  )
                }
              >
                View All
              </button>
            </div>

            {upcomingDeliveries.length ===
            0 ? (
              <div className="vendor-empty-state">
                <FaTruck />
                <p>
                  No upcoming deliveries.
                </p>
              </div>
            ) : (
              <div className="upcoming-list">
                {upcomingDeliveries.map(
                  (item) => (
                    <div
                      className="upcoming-row"
                      key={item.po_id}
                    >
                      <div>
                        <strong>
                          PO-{item.po_id}
                        </strong>
                        <span>
                          {displayDate(
                            item.delivery_date
                          )}
                        </span>
                      </div>

                      <span
                        className={`delivery-day ${item.days_remaining <= 3 ? "urgent" : ""}`}
                      >
                        {item.days_remaining ===
                        0
                          ? "Today"
                          : `${displayNumber(
                              item.days_remaining
                            )} days`}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        <section className="vendor-account-section">
          <div className="vendor-panel account-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Account Summary</h2>
                <p>
                  Vendor account information
                </p>
              </div>

              <FaUserCircle />
            </div>

            <div className="account-details">
              <div>
                <span>Vendor ID</span>
                <strong>
                  {stats.vendorId !==
                  undefined
                    ? `VDR-${stats.vendorId}`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Company</span>
                <strong>
                  {stats.companyName ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {stats.approvalStatus ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>
                  {stats.email ||
                    user.email ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>
                  {stats.phone ||
                    "Not Available"}
                </strong>
              </div>
            </div>
          </div>

          <div className="vendor-panel quick-links-panel">
            <div className="vendor-panel-header">
              <div>
                <h2>Quick Access</h2>
                <p>
                  Frequently used vendor
                  modules
                </p>
              </div>
            </div>

            <div className="vendor-quick-links">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/purchase-orders"
                  )
                }
              >
                <FaShoppingCart />
                <div>
                  <strong>
                    Purchase Orders
                  </strong>
                  <span>
                    View assigned purchase
                    orders
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/invoices")
                }
              >
                <FaFileInvoiceDollar />
                <div>
                  <strong>
                    Invoices
                  </strong>
                  <span>
                    Review invoice and
                    payment status
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/communication")
                }
              >
                <FaEnvelope />
                <div>
                  <strong>
                    Communication
                  </strong>
                  <span>
                    View procurement
                    messages
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/delivery-tracking"
                  )
                }
              >
                <FaTruck />
                <div>
                  <strong>
                    Delivery Tracking
                  </strong>
                  <span>
                    Track orders and
                    deliveries
                  </span>
                </div>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}