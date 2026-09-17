 import { useEffect, useState } from "react";

import AdminSidebar from "../components/AdminSidebar";
import ProcurementSidebar from "../components/ProcurementSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import FinanceSidebar from "../components/FinanceSidebar";
import VendorSidebar from "../components/VendorSidebar";
import AuditorSidebar from "../components/AuditorSidebar";

import "../styles/Analytics.css";

import {
  FaUsers,
  FaShoppingCart,
  FaFileContract,
  FaSyncAlt,
  FaClipboardList,
} from "react-icons/fa";

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  let loggedInUser = null;

  try {
    loggedInUser = JSON.parse(localStorage.getItem("user"));
  } catch (err) {
    loggedInUser = null;
  }

  const userRole = loggedInUser?.role || "";

  const renderSidebar = () => {
    switch (userRole) {
      case "Administrator":
        return <AdminSidebar />;

      case "Procurement Manager":
        return <ProcurementSidebar />;

      case "Supply Chain Manager":
        return <SupplyChainSidebar />;

      case "Finance Officer":
        return <FinanceSidebar />;

      case "Vendor":
        return <VendorSidebar />;

      case "Auditor":
        return <AuditorSidebar />;

      default:
        return null;
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/analytics",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to load analytics"
        );
      }

      setData(result);
    } catch (err) {
      console.error("Analytics error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const percent = (value, total) => {
    if (!total) return 0;

    return Math.round(
      (Number(value) / Number(total)) * 100
    );
  };

  const money = (value) => {
    return Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const d = new Date(value);

    if (isNaN(d.getTime())) return "—";

    return d.toLocaleDateString("en-IN");
  };

  const formatMonth = (value) => {
    if (!value) return "—";

    const d = new Date(value);

    if (isNaN(d.getTime())) return "—";

    return d.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  const vendorName = (id) => `Vendor #${id}`;

  const getRiskCount = (level) => {
    const item = data?.riskAnalytics?.find(
      (risk) => risk.risk_level === level
    );

    return item ? Number(item.vendor_count) : 0;
  };

  const getRiskClass = (level) => {
    if (level === "Low") {
      return "risk-low";
    }

    if (level === "Medium") {
      return "risk-medium";
    }

    if (level === "High") {
      return "risk-high";
    }

    return "risk-insufficient";
  };

  if (loading) {
    return (
      <div className="analytics-layout">
        {renderSidebar()}

        <main className="analytics-main">
          <div className="analytics-loading">
            Loading analytics...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="analytics-layout">
      {renderSidebar()}

      <main className="analytics-main">
        <header className="analytics-header">
          <div>
            <h1>Reports & Analytics</h1>

            <p>
              Live insights from your vendor, procurement,
              purchase order and contract data.
            </p>
          </div>

          <button
            className="analytics-refresh"
            onClick={fetchAnalytics}
          >
            <FaSyncAlt />
            Refresh
          </button>
        </header>

        {error && (
          <div className="analytics-error">
            {error}
          </div>
        )}

        {data && (
          <>
            <section className="analytics-cards">
              <div className="analytics-card">
                <div className="analytics-icon">
                  <FaUsers />
                </div>

                <div>
                  <span>Total Vendors</span>

                  <strong>
                    {data.vendors.total}
                  </strong>

                  <small>
                    {data.vendors.approved} approved
                  </small>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">
                  <FaClipboardList />
                </div>

                <div>
                  <span>Procurement Requests</span>

                  <strong>
                    {data.procurement.total}
                  </strong>

                  <small>
                    {data.procurement.pending} pending
                  </small>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">
                  <FaShoppingCart />
                </div>

                <div>
                  <span>Purchase Orders</span>

                  <strong>
                    {data.purchaseOrders.total}
                  </strong>

                  <small>
                    ₹{money(data.purchaseOrders.total_value)}
                  </small>
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-icon">
                  <FaFileContract />
                </div>

                <div>
                  <span>Contracts</span>

                  <strong>
                    {data.contracts.total}
                  </strong>

                  <small>
                    ₹{money(data.contracts.total_value)}
                  </small>
                </div>
              </div>
            </section>

            <section className="analytics-grid">
              <div className="analytics-panel">
                <h2>Vendor Performance</h2>

                <div className="progress-row">
                  <span>Approved</span>

                  <b>
                    {data.vendors.approved}
                  </b>

                  <div>
                    <i
                      style={{
                        width: `${percent(
                          data.vendors.approved,
                          data.vendors.total
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="progress-row">
                  <span>Pending</span>

                  <b>
                    {data.vendors.pending}
                  </b>

                  <div>
                    <i
                      style={{
                        width: `${percent(
                          data.vendors.pending,
                          data.vendors.total
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="progress-row">
                  <span>Rejected</span>

                  <b>
                    {data.vendors.rejected}
                  </b>

                  <div>
                    <i
                      style={{
                        width: `${percent(
                          data.vendors.rejected,
                          data.vendors.total
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="analytics-panel">
                <h2>Procurement Requests</h2>

                <div className="status-grid">
                  <div>
                    <strong>
                      {data.procurement.pending}
                    </strong>

                    <span>Pending</span>
                  </div>

                  <div>
                    <strong>
                      {data.procurement.approved}
                    </strong>

                    <span>Approved</span>
                  </div>

                  <div>
                    <strong>
                      {data.procurement.rejected}
                    </strong>

                    <span>Rejected</span>
                  </div>
                </div>

                <div className="completion">
                  <span>Approval Rate</span>

                  <strong>
                    {percent(
                      data.procurement.approved,
                      data.procurement.total
                    )}
                    %
                  </strong>
                </div>
              </div>

              <div className="analytics-panel">
                <h2>Purchase Order Progress</h2>

                <div className="status-grid">
                  <div>
                    <strong>
                      {data.purchaseOrders.pending}
                    </strong>

                    <span>Pending</span>
                  </div>

                  <div>
                    <strong>
                      {data.purchaseOrders.issued}
                    </strong>

                    <span>Issued</span>
                  </div>

                  <div>
                    <strong>
                      {data.purchaseOrders.accepted}
                    </strong>

                    <span>Accepted</span>
                  </div>

                  <div>
                    <strong>
                      {data.purchaseOrders.fulfilled}
                    </strong>

                    <span>Fulfilled</span>
                  </div>

                  <div>
                    <strong>
                      {data.purchaseOrders.cancelled}
                    </strong>

                    <span>Cancelled</span>
                  </div>
                </div>

                <div className="completion">
                  <span>Fulfillment Rate</span>

                  <strong>
                    {percent(
                      data.purchaseOrders.fulfilled,
                      data.purchaseOrders.total
                    )}
                    %
                  </strong>
                </div>
              </div>

              <div className="analytics-panel">
                <h2>Contract Status</h2>

                <div className="status-grid">
                  <div>
                    <strong>
                      {data.contracts.draft}
                    </strong>

                    <span>Draft</span>
                  </div>

                  <div>
                    <strong>
                      {data.contracts.active}
                    </strong>

                    <span>Active</span>
                  </div>

                  <div>
                    <strong>
                      {data.contracts.expired}
                    </strong>

                    <span>Expired</span>
                  </div>

                  <div>
                    <strong>
                      {data.contracts.terminated}
                    </strong>

                    <span>Terminated</span>
                  </div>
                </div>

                <div className="completion">
                  <span>Active Rate</span>

                  <strong>
                    {percent(
                      data.contracts.active,
                      data.contracts.total
                    )}
                    %
                  </strong>
                </div>
              </div>
            </section>

            <section className="analytics-grid">
              <div className="analytics-panel">
                <h2>Procurement Risk Overview</h2>

                <div className="status-grid">
                  <div>
                    <strong className="risk-low">
                      {getRiskCount("Low")}
                    </strong>

                    <span>Low Risk</span>
                  </div>

                  <div>
                    <strong className="risk-medium">
                      {getRiskCount("Medium")}
                    </strong>

                    <span>Medium Risk</span>
                  </div>

                  <div>
                    <strong className="risk-high">
                      {getRiskCount("High")}
                    </strong>

                    <span>High Risk</span>
                  </div>

                  <div>
                    <strong className="risk-insufficient">
                      {getRiskCount("Insufficient Data")}
                    </strong>

                    <span>Insufficient Data</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="analytics-panel">
              <div className="panel-heading">
                <h2>Performance Trends</h2>

                <span>
                  {data.performanceTrends?.length || 0} months
                </span>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Total Orders</th>
                      <th>Fulfilled</th>
                      <th>Cancelled</th>
                      <th>Fulfillment Rate</th>
                      <th>Procurement Value</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!data.performanceTrends ||
                    data.performanceTrends.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="empty"
                        >
                          No performance trend data
                          available.
                        </td>
                      </tr>
                    ) : (
                      data.performanceTrends.map(
                        (trend) => {
                          const total = Number(
                            trend.total_orders || 0
                          );

                          const fulfilled = Number(
                            trend.fulfilled_orders || 0
                          );

                          const cancelled = Number(
                            trend.cancelled_orders || 0
                          );

                          const fulfillmentRate =
                            total > 0
                              ? Math.round(
                                  (fulfilled / total) *
                                    100
                                )
                              : 0;

                          return (
                            <tr
                              key={String(
                                trend.month
                              )}
                            >
                              <td>
                                <strong>
                                  {formatMonth(
                                    trend.month
                                  )}
                                </strong>
                              </td>

                              <td>
                                {total.toLocaleString()}
                              </td>

                              <td>
                                {fulfilled.toLocaleString()}
                              </td>

                              <td>
                                {cancelled.toLocaleString()}
                              </td>

                              <td>
                                {fulfillmentRate}%
                              </td>

                              <td>
                                ₹
                                {money(
                                  trend.procurement_value
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="analytics-tables">
              <div className="analytics-panel">
                <div className="panel-heading">
                  <h2>Recent Purchase Orders</h2>

                  <span>
                    {data.purchaseOrders.total} total
                  </span>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>PO</th>
                        <th>Vendor</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.recentOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="empty"
                          >
                            No purchase orders found.
                          </td>
                        </tr>
                      ) : (
                        data.recentOrders.map(
                          (order) => (
                            <tr
                              key={order.po_id}
                            >
                              <td>
                                <strong>
                                  PO-{order.po_id}
                                </strong>
                              </td>

                              <td>
                                {vendorName(
                                  order.vendor_id
                                )}
                              </td>

                              <td>
                                ₹
                                {money(
                                  order.order_amount
                                )}
                              </td>

                              <td>
                                {formatDate(
                                  order.order_date
                                )}
                              </td>

                              <td>
                                <span
                                  className={`status ${String(
                                    order.status
                                  ).toLowerCase()}`}
                                >
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="analytics-panel">
                <div className="panel-heading">
                  <h2>Recent Contracts</h2>

                  <span>
                    {data.contracts.total} total
                  </span>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Contract</th>
                        <th>Vendor</th>
                        <th>Value</th>
                        <th>End Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.recentContracts.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="empty"
                          >
                            No contracts found.
                          </td>
                        </tr>
                      ) : (
                        data.recentContracts.map(
                          (contract) => (
                            <tr
                              key={
                                contract.contract_id
                              }
                            >
                              <td>
                                <strong>
                                  CON-
                                  {
                                    contract.contract_id
                                  }
                                </strong>

                                <small>
                                  {
                                    contract.contract_title
                                  }
                                </small>
                              </td>

                              <td>
                                {vendorName(
                                  contract.vendor_id
                                )}
                              </td>

                              <td>
                                ₹
                                {money(
                                  contract.contract_value
                                )}
                              </td>

                              <td>
                                {formatDate(
                                  contract.end_date
                                )}
                              </td>

                              <td>
                                <span
                                  className={`status ${String(
                                    contract.status
                                  ).toLowerCase()}`}
                                >
                                  {contract.status}
                                </span>
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Analytics;
