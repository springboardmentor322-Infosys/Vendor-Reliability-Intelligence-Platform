 import { useEffect, useState } from "react";
import FinanceSidebar from "../components/FinanceSidebar";
import { getFinanceDashboard } from "../services/api";
import {
  FaRupeeSign,
  FaFileInvoiceDollar,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartLine,
  FaShoppingCart,
  FaFileContract,
  FaArrowUp,
  FaArrowDown,
  FaMoneyBillWave,
} from "react-icons/fa";
import "../styles/FinanceDashboard.css";

function formatCurrency(value) {
  const amount = Number(value) || 0;

  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }

  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }

  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatFullCurrency(value) {
  return `₹${(Number(value) || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function FinanceDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const data = await getFinanceDashboard();

      setDashboard(data);
      setError("");
    } catch (err) {
      console.error("Finance dashboard error:", err);
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="finance-page">
        <FinanceSidebar />

        <main className="finance-main">
          <div className="finance-loading">
            Loading Finance Dashboard...
          </div>
        </main>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="finance-page">
        <FinanceSidebar />

        <main className="finance-main">
          <div className="finance-error">
            <h2>Unable to load dashboard</h2>
            <p>{error || "No dashboard data available."}</p>

            <button onClick={loadDashboard}>
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  const stats = dashboard.stats || {};
  const categorySpend = dashboard.categorySpend || [];
  const monthlySpend = dashboard.monthlySpend || [];
  const paymentSummary = dashboard.paymentSummary || {};
  const recentInvoices = dashboard.recentInvoices || [];
  const topVendors = dashboard.topVendors || [];
  const financialAlerts = dashboard.financialAlerts || [];
  const contractAlerts = dashboard.contractAlerts || [];

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const totalSpend = Number(stats.totalProcurementValue) || 0;
  const totalPayments = Number(stats.totalPayments) || 0;
  const pendingPayments = Number(stats.pendingPayments) || 0;
  const overduePayments = Number(stats.overduePayments) || 0;
  const invoiceCoverage = Number(stats.invoiceCoverage) || 0;
  const cashOutflow = Number(stats.cashOutflowThisMonth) || 0;

  const maxMonthlySpend = Math.max(
    ...monthlySpend.map((item) => Number(item.totalSpend) || 0),
    1
  );

  const maxCategorySpend = Math.max(
    ...categorySpend.map((item) => Number(item.totalSpend) || 0),
    1
  );

  const maxVendorSpend = Math.max(
    ...topVendors.map((item) => Number(item.totalSpend) || 0),
    1
  );

  const totalPaymentActivity =
    (Number(paymentSummary.paid) || 0) +
    (Number(paymentSummary.pending) || 0) +
    (Number(paymentSummary.overdue) || 0) +
    (Number(paymentSummary.cancelled) || 0);

  const paidPercentage =
    totalPaymentActivity > 0
      ? Math.round(
          (Number(paymentSummary.paid) / totalPaymentActivity) * 100
        )
      : 0;

  const pendingPercentage =
    totalPaymentActivity > 0
      ? Math.round(
          (Number(paymentSummary.pending) / totalPaymentActivity) * 100
        )
      : 0;

  const overduePercentage =
    totalPaymentActivity > 0
      ? Math.round(
          (Number(paymentSummary.overdue) / totalPaymentActivity) * 100
        )
      : 0;

  const completionRate =
    Number(stats.purchaseOrders) > 0
      ? Math.round(
          (Number(stats.completedOrders) /
            Number(stats.purchaseOrders)) *
            100
        )
      : 0;

  return (
    <div className="finance-page">
      <FinanceSidebar />

      <main className="finance-main">

        <header className="finance-header">
          <div>
            <h1>Welcome back, Finance Manager! 👋</h1>
            <p>
              Here's the financial summary and performance overview.
            </p>
          </div>

          <div className="finance-header-profile">
            <div className="finance-profile-icon">
              <FaChartLine />
            </div>

            <div className="finance-profile-info">
              <h4>
                {user.full_name || user.name || "Finance Officer"}
              </h4>

              <span>Finance Department</span>
            </div>
          </div>
        </header>

        <section className="finance-kpi-grid">

          <div className="finance-kpi-card">
            <div className="finance-kpi-icon spend">
              <FaRupeeSign />
            </div>

            <div className="finance-kpi-content">
              <span>Total Spend (YTD)</span>
              <strong>{formatCurrency(totalSpend)}</strong>
              <small>
                Procurement commitments recorded this year
              </small>
            </div>
          </div>

          <div className="finance-kpi-card">
            <div className="finance-kpi-icon payment">
              <FaFileInvoiceDollar />
            </div>

            <div className="finance-kpi-content">
              <span>Total Payments (YTD)</span>
              <strong>{formatCurrency(totalPayments)}</strong>
              <small>
                {stats.paidInvoiceCount || 0} paid invoices
              </small>
            </div>
          </div>

          <div className="finance-kpi-card">
            <div className="finance-kpi-icon pending">
              <FaClock />
            </div>

            <div className="finance-kpi-content">
              <span>Pending Payments</span>
              <strong>{formatCurrency(pendingPayments)}</strong>
              <small>
                {stats.pendingInvoiceCount || 0} pending invoices
              </small>
            </div>
          </div>

          <div className="finance-kpi-card">
            <div className="finance-kpi-icon coverage">
              <FaChartLine />
            </div>

            <div className="finance-kpi-content">
              <span>Invoice Coverage</span>
              <strong>{invoiceCoverage}%</strong>
              <small>
                Invoiced amount vs procurement value
              </small>
            </div>
          </div>

          <div className="finance-kpi-card">
            <div className="finance-kpi-icon overdue">
              <FaExclamationTriangle />
            </div>

            <div className="finance-kpi-content">
              <span>Overdue Payments</span>
              <strong>{formatCurrency(overduePayments)}</strong>
              <small>
                {stats.overdueInvoiceCount || 0} overdue invoices
              </small>
            </div>
          </div>

          <div className="finance-kpi-card">
            <div className="finance-kpi-icon cash">
              <FaMoneyBillWave />
            </div>

            <div className="finance-kpi-content">
              <span>Cash Outflow (This Month)</span>
              <strong>{formatCurrency(cashOutflow)}</strong>
              <small>Paid invoice amount</small>
            </div>
          </div>

        </section>

        <section className="finance-chart-grid">

          <div className="finance-card category-card">
            <div className="finance-card-header">
              <div>
                <h2>Spend by Category (YTD)</h2>
                <p>Procurement spend grouped by vendor category</p>
              </div>
            </div>

            <div className="category-layout">

              <div
                className="category-donut"
                style={{
                  background: (() => {
                    if (!categorySpend.length || totalSpend <= 0) {
                      return "#e5e7eb";
                    }

                    const colors = [
                      "#6b4de6",
                      "#16a34a",
                      "#f59e0b",
                      "#2563eb",
                      "#ec4899",
                      "#8b5cf6",
                      "#14b8a6",
                      "#f97316",
                    ];

                    let currentPercentage = 0;

                    const stops = categorySpend
                      .filter(
                        (item) => Number(item.totalSpend) > 0
                      )
                      .map((item, index) => {
                        const percentage =
                          (Number(item.totalSpend) / totalSpend) * 100;

                        const start = currentPercentage;
                        const end = currentPercentage + percentage;

                        currentPercentage = end;

                        return `${colors[index % colors.length]} ${start}% ${end}%`;
                      });

                    return stops.length > 0
                      ? `conic-gradient(${stops.join(", ")})`
                      : "#e5e7eb";
                  })(),
                }}
              >
                <div className="donut-center">
                  <strong>{formatCurrency(totalSpend)}</strong>
                  <span>Total Spend</span>
                </div>
              </div>

              <div className="category-list">
                {categorySpend.map((item, index) => {
                  const percentage =
                    totalSpend > 0
                      ? (
                          (Number(item.totalSpend) / totalSpend) *
                          100
                        ).toFixed(1)
                      : 0;

                  return (
                    <div
                      className="category-item"
                      key={`${item.category}-${index}`}
                    >
                      <div className="category-item-left">
                        <span
                          className={`category-dot dot-${index % 5}`}
                        />
                        <span>{item.category}</span>
                      </div>

                      <div className="category-item-value">
                        <strong>
                          {formatCurrency(item.totalSpend)}
                        </strong>

                        <small>{percentage}%</small>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          <div className="finance-card monthly-card">
            <div className="finance-card-header">
              <div>
                <h2>Monthly Spend Trend</h2>
                <p>Latest six months of procurement spend</p>
              </div>
            </div>

            <div className="monthly-chart">

              <div className="chart-y-axis">
                <span>{formatCurrency(maxMonthlySpend)}</span>
                <span>{formatCurrency(maxMonthlySpend * 0.75)}</span>
                <span>{formatCurrency(maxMonthlySpend * 0.5)}</span>
                <span>{formatCurrency(maxMonthlySpend * 0.25)}</span>
                <span>₹0</span>
              </div>

              <div className="monthly-bars">
                {monthlySpend.map((item, index) => {
                  const value = Number(item.totalSpend) || 0;

                  const height =
                    value > 0
                      ? Math.max(
                          (value / maxMonthlySpend) * 100,
                          5
                        )
                      : 2;

                  return (
                    <div
                      className="monthly-column"
                      key={`${item.month}-${index}`}
                    >
                      <div className="monthly-value">
                        {formatCurrency(value)}
                      </div>

                      <div className="monthly-bar-track">
                        <div
                          className="monthly-bar"
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      </div>

                      <span className="monthly-label">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </section>

        <section className="finance-two-column">

          <div className="finance-card">
            <div className="finance-card-header">
              <div>
                <h2>Committed vs Invoiced</h2>
                <p>
                  Procurement commitments compared with invoice value
                </p>
              </div>
            </div>

            <div className="comparison-chart">

              <div className="comparison-row">
                <div className="comparison-label">
                  <span>Procurement Value</span>
                  <strong>{formatFullCurrency(totalSpend)}</strong>
                </div>

                <div className="comparison-track">
                  <div
                    className="comparison-fill committed"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div className="comparison-row">
                <div className="comparison-label">
                  <span>Invoice Value</span>
                  <strong>
                    {formatFullCurrency(
                      stats.totalInvoiceAmount
                    )}
                  </strong>
                </div>

                <div className="comparison-track">
                  <div
                    className="comparison-fill invoiced"
                    style={{
                      width: `${Math.min(
                        invoiceCoverage,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="comparison-summary">
                <span>Invoice coverage</span>
                <strong>{invoiceCoverage}%</strong>
              </div>

            </div>
          </div>

          <div className="finance-card payment-card">

            <div className="finance-card-header">
              <div>
                <h2>Payment Summary</h2>
                <p>Current invoice payment distribution</p>
              </div>
            </div>

            <div className="payment-summary-content">

              <div
                className="payment-donut"
                style={{
                  background: `conic-gradient(
                    #16a34a 0% ${paidPercentage}%,
                    #f59e0b ${paidPercentage}% ${
                    paidPercentage + pendingPercentage
                  }%,
                    #ef4444 ${
                      paidPercentage + pendingPercentage
                    }% ${
                    paidPercentage +
                    pendingPercentage +
                    overduePercentage
                  }%,
                    #94a3b8 ${
                      paidPercentage +
                      pendingPercentage +
                      overduePercentage
                    }% 100%
                  )`,
                }}
              >
                <div className="donut-center">
                  <strong>
                    {formatCurrency(
                      totalPaymentActivity
                    )}
                  </strong>

                  <span>Invoice Value</span>
                </div>
              </div>

              <div className="payment-legend">

                <div>
                  <span className="legend-dot paid-dot" />
                  <span>Paid</span>
                  <strong>
                    {formatFullCurrency(paymentSummary.paid)}
                  </strong>
                </div>

                <div>
                  <span className="legend-dot pending-dot" />
                  <span>Pending</span>
                  <strong>
                    {formatFullCurrency(paymentSummary.pending)}
                  </strong>
                </div>

                <div>
                  <span className="legend-dot overdue-dot" />
                  <span>Overdue</span>
                  <strong>
                    {formatFullCurrency(paymentSummary.overdue)}
                  </strong>
                </div>

              </div>

            </div>

          </div>

        </section>

        <section className="finance-two-column">

  <div className="finance-card">
    <div className="finance-card-header">
      <div>
        <h2>Recent Invoices</h2>
        <p>Latest financial transactions</p>
      </div>

      <span className="finance-count-badge">
        {recentInvoices.length}
      </span>
    </div>

    <div className="finance-table-wrapper">
      <table className="finance-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Vendor</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {recentInvoices.length > 0 ? (
            recentInvoices.map((invoice) => (
              <tr key={invoice.invoiceId}>
                <td>
                  <strong>{invoice.invoiceNumber}</strong>
                </td>

                <td>{invoice.vendorName}</td>

                <td>
                  {formatFullCurrency(invoice.amount)}
                </td>

                <td>
                  {formatDate(invoice.dueDate)}
                </td>

                <td>
                  <span
                    className={`invoice-status ${String(
                      invoice.status
                    )
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {invoice.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="5"
                className="empty-state"
              >
                No invoices found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>

  <div className="finance-card">
    <div className="finance-card-header">
      <div>
        <h2>Top Vendors by Spend</h2>
        <p>Highest procurement spend this year</p>
      </div>
    </div>

    <div className="vendor-spend-list">
      {topVendors.map((vendor, index) => {
        const width =
          (Number(vendor.totalSpend) / maxVendorSpend) * 100;

        const percentage =
          totalSpend > 0
            ? (
                (Number(vendor.totalSpend) / totalSpend) *
                100
              ).toFixed(1)
            : 0;

        return (
          <div
            className="vendor-spend-item"
            key={vendor.vendorId}
          >
            <div className="vendor-spend-top">
              <div>
                <span className="vendor-rank">
                  #{index + 1}
                </span>

                <strong>{vendor.vendorName}</strong>
              </div>

              <span>{percentage}%</span>
            </div>

            <div className="vendor-progress">
              <div
                style={{ width: `${width}%` }}
              ></div>
            </div>

            <div className="vendor-spend-bottom">
              <span>{vendor.orderCount} orders</span>

              <strong>
                {formatFullCurrency(vendor.totalSpend)}
              </strong>
            </div>
          </div>
        );
      })}

      {topVendors.length === 0 && (
        <div className="empty-state">
          No vendor spend data available.
        </div>
      )}
    </div>
  </div>

</section>

        <section className="finance-three-column">

          <div className="finance-card compact-card">
            <div className="finance-card-header">
              <div>
                <h2>Financial Alerts</h2>
                <p>Items requiring attention</p>
              </div>
            </div>

            <div className="alert-list">

              {financialAlerts.length > 0 ? (
                financialAlerts.map((alert, index) => (
                  <div
                    className="finance-alert"
                    key={`${alert.reference}-${index}`}
                  >
                    <div
                      className={`alert-icon ${
                        alert.type === "invoice"
                          ? "alert-danger"
                          : "alert-warning"
                      }`}
                    >
                      {alert.type === "invoice" ? (
                        <FaExclamationTriangle />
                      ) : (
                        <FaClock />
                      )}
                    </div>

                    <div>
                      <strong>
                        {alert.type === "invoice"
                          ? "Overdue invoice"
                          : "Payment due soon"}
                      </strong>

                      <span>
                        {alert.reference} ·{" "}
                        {alert.vendorName}
                      </span>

                      <small>
                        {formatFullCurrency(alert.amount)}
                        {" · "}
                        Due {formatDate(alert.dueDate)}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  No urgent payment alerts.
                </div>
              )}

            </div>
          </div>

          <div className="finance-card compact-card">
            <div className="finance-card-header">
              <div>
                <h2>Contract Alerts</h2>
                <p>Contracts requiring review</p>
              </div>
            </div>

            <div className="alert-list">

              {contractAlerts.length > 0 ? (
                contractAlerts.map((contract) => (
                  <div
                    className="finance-alert"
                    key={contract.contractId}
                  >
                    <div className="alert-icon alert-info">
                      <FaFileContract />
                    </div>

                    <div>
                      <strong>
                        {contract.title}
                      </strong>

                      <span>
                        {contract.vendorName}
                      </span>

                      <small>
                        {contract.status} ·{" "}
                        {formatDate(contract.endDate)}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  No contract alerts.
                </div>
              )}

            </div>
          </div>

          <div className="finance-card compact-card">

            <div className="finance-card-header">
              <div>
                <h2>Quick Actions</h2>
                <p>Finance operations</p>
              </div>
            </div>

            <div className="quick-actions">

              <button
                onClick={() => {
                  window.location.href =
                    "/purchase-orders";
                }}
              >
                <FaShoppingCart />
                <span>Purchase Orders</span>
              </button>
 

              <button
                onClick={() => {
                  window.location.href =
                    "/contracts";
                }}
              >
                <FaFileContract />
                <span>Contracts</span>
              </button>

              <button
                onClick={() => {
                  window.location.href =
                    "/analytics";
                }}
              >
                <FaChartLine />
                <span>Financial Analytics</span>
              </button>

            </div>

          </div>

        </section>

        <section className="finance-insight">

          <div className="insight-icon">
            <FaChartLine />
          </div>

          <div className="insight-content">
            <strong>Finance Insight</strong>

            <p>
              {dashboard.insight?.text ||
                "Financial performance data is available from your procurement and invoice records."}
            </p>
          </div>

          <div className="insight-metrics">

            <div>
              <span>Orders</span>
              <strong>
                {Number(stats.purchaseOrders).toLocaleString(
                  "en-IN"
                )}
              </strong>
            </div>

            <div>
              <span>Completion</span>
              <strong>{completionRate}%</strong>
            </div>

          </div>

        </section>

      </main>
    </div>
  );
}
 

export default FinanceDashboard;