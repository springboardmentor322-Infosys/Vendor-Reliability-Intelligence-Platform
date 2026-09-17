 import { useEffect, useState } from "react";
import {
  FaFileAlt,
  FaShoppingCart,
  FaTruck,
  FaShieldAlt,
  FaChartLine,
  FaFileContract,
  FaFileInvoiceDollar,
} from "react-icons/fa";

import VendorSidebar from "../components/VendorSidebar";
import { getVendorDashboard } from "../services/api";

import "../styles/VendorReports.css";

export default function VendorReports() {
  const [dashboard, setDashboard] = useState({});
  const [performance, setPerformance] = useState(null);
  const [reliability, setReliability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error(
            "Authentication token not found."
          );
        }

        const [
          dashboardResponse,
          performanceResponse,
          reliabilityResponse,
        ] = await Promise.all([
          getVendorDashboard(),

          fetch(
            "http://localhost:5000/api/vendor-performance",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          ),

          fetch(
            "http://localhost:5000/api/vendor-reliability",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          ),
        ]);

        const performanceData =
          await performanceResponse.json();

        const reliabilityData =
          await reliabilityResponse.json();

        if (!performanceResponse.ok) {
          throw new Error(
            performanceData.message ||
              "Failed to load performance data."
          );
        }

        if (!reliabilityResponse.ok) {
          throw new Error(
            reliabilityData.message ||
              "Failed to load reliability data."
          );
        }

        console.log(
          "VENDOR DASHBOARD RESPONSE:",
          dashboardResponse
        );

        setDashboard(
          dashboardResponse?.stats ||
            dashboardResponse ||
            {}
        );

        const performanceRows =
          Array.isArray(performanceData.data)
            ? performanceData.data
            : [];

        const reliabilityRows =
          Array.isArray(reliabilityData.data)
            ? reliabilityData.data
            : [];

        const storedUser = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        const vendorId = Number(
          storedUser.vendor_id ??
            storedUser.vendorId
        );

        const vendorPerformance =
          performanceRows.find(
            (item) =>
              Number(item.vendor_id) ===
              vendorId
          ) || null;

        const vendorReliability =
          reliabilityRows.find(
            (item) =>
              Number(item.vendor_id) ===
              vendorId
          ) || null;

        setPerformance(
          vendorPerformance
        );

        setReliability(
          vendorReliability
        );
      } catch (err) {
        console.error(
          "Vendor Reports Error:",
          err
        );

        setError(
          err.message ||
            "Unable to load vendor reports."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const formatAmount = (value) => {
    const amount = Number(value || 0);

    return `₹${amount.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  if (loading) {
    return (
      <div className="vendor-reports-page">
        <VendorSidebar />

        <main className="vendor-reports-content">
          <div className="vendor-report-loading">
            Loading reports...
          </div>
        </main>
      </div>
    );
  }

  const totalOrders = Number(
    dashboard.purchaseOrders || 0
  );

  const totalDeliveries = Number(
    dashboard.deliveries?.total || 0
  );

  const performanceScore = Number(
    performance?.performance_score || 0
  );

  const qualityScore = Number(
    performance?.quality_score || 0
  );

  const reliabilityScore = Number(
    reliability?.reliability_score || 0
  );

  const totalInvoiced = Number(
    dashboard.invoices?.totalInvoiced ||
      dashboard.invoices?.total_invoiced ||
      0
  );

  const pendingAmount = Number(
    dashboard.invoices?.pendingAmount ||
      dashboard.invoices?.pending_amount ||
      0
  );

  const contractStatus = Array.isArray(
    dashboard.contractStatus
  )
    ? dashboard.contractStatus
    : [];

  console.log(
    "REPORTS FINANCIAL DATA:",
    dashboard.invoices
  );

  console.log(
    "REPORTS CONTRACT STATUS:",
    dashboard.contractStatus
  );

  const recentPurchaseOrders =
    Array.isArray(
      dashboard.recentPurchaseOrders
    )
      ? dashboard.recentPurchaseOrders
      : [];

  return (
    <div className="vendor-reports-page">
      <VendorSidebar />

      <main className="vendor-reports-content">

        <div className="vendor-reports-header">
          <div className="vendor-reports-title">
            <FaFileAlt />

            <h1>
              Reports & Analytics
            </h1>
          </div>

          <p>
            Review your procurement, delivery,
            performance, reliability and
            financial information.
          </p>
        </div>

        {error && (
          <div className="vendor-report-error">
            {error}
          </div>
        )}

        <section className="vendor-report-cards">

          <div className="vendor-report-card">
            <div className="vendor-report-icon">
              <FaShoppingCart />
            </div>

            <div>
              <span>
                Total Purchase Orders
              </span>

              <strong>
                {totalOrders}
              </strong>
            </div>
          </div>

          <div className="vendor-report-card">
            <div className="vendor-report-icon">
              <FaTruck />
            </div>

            <div>
              <span>
                Total Deliveries
              </span>

              <strong>
                {totalDeliveries}
              </strong>
            </div>
          </div>

          <div className="vendor-report-card">
            <div className="vendor-report-icon">
              <FaChartLine />
            </div>

            <div>
              <span>
                Performance Score
              </span>

              <strong>
                {performance
                  ? performanceScore.toFixed(1)
                  : "N/A"}
              </strong>
            </div>
          </div>

          <div className="vendor-report-card">
            <div className="vendor-report-icon">
              <FaShieldAlt />
            </div>

            <div>
              <span>
                Reliability Score
              </span>

              <strong>
                {reliability
                  ? reliabilityScore.toFixed(1)
                  : "N/A"}
              </strong>
            </div>
          </div>

        </section>

        <section className="vendor-report-grid">

          <div className="vendor-report-panel">

            <div className="vendor-report-panel-header">
              <FaChartLine />

              <div>
                <h2>
                  Performance Summary
                </h2>

                <p>
                  Same calculated data used
                  by My Performance.
                </p>
              </div>
            </div>

            <div className="vendor-report-metrics">

              <div>
                <span>
                  Performance Score
                </span>

                <strong>
                  {performance
                    ? performanceScore.toFixed(1)
                    : "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Quality Score
                </span>

                <strong>
                  {performance
                    ? qualityScore.toFixed(1)
                    : "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Compliance Score
                </span>

                <strong>
                  {performance
                    ? Number(
                        performance.compliance_score ||
                          0
                      ).toFixed(1)
                    : "N/A"}
                </strong>
              </div>

            </div>

          </div>

          <div className="vendor-report-panel">

            <div className="vendor-report-panel-header">
              <FaShieldAlt />

              <div>
                <h2>
                  Reliability Summary
                </h2>

                <p>
                  Same calculated data used
                  by My Reliability.
                </p>
              </div>
            </div>

            <div className="vendor-report-metrics">

              <div>
                <span>
                  Reliability Score
                </span>

                <strong>
                  {reliability
                    ? reliabilityScore.toFixed(1)
                    : "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  On-Time Rate
                </span>

                <strong>
                  {reliability
                    ? `${Number(
                        reliability.on_time_rate ||
                          0
                      ).toFixed(1)}%`
                    : "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Quality Pass Rate
                </span>

                <strong>
                  {reliability
                    ? `${Number(
                        reliability.quality_pass_rate ||
                          0
                      ).toFixed(1)}%`
                    : "N/A"}
                </strong>
              </div>

            </div>

          </div>

        </section>

        <section className="vendor-report-panel vendor-report-full">

          <div className="vendor-report-panel-header">
            <FaFileInvoiceDollar />

            <div>
              <h2>
                Financial Summary
              </h2>

              <p>
                Invoice and payment overview.
              </p>
            </div>
          </div>

          <div className="vendor-report-financial">

            <div>
              <span>
                Total Invoiced
              </span>

              <strong>
                {formatAmount(
                  totalInvoiced
                )}
              </strong>
            </div>

            <div>
              <span>
                Pending Amount
              </span>

              <strong>
                {formatAmount(
                  pendingAmount
                )}
              </strong>
            </div>

          </div>

        </section>

        <section className="vendor-report-panel vendor-report-full">

          <div className="vendor-report-panel-header">
            <FaFileContract />

            <div>
              <h2>
                Contract Status
              </h2>

              <p>
                Current contract overview.
              </p>
            </div>
          </div>

          {contractStatus.length === 0 ? (
            <div className="vendor-report-empty-small">
              No contract status data available.
            </div>
          ) : (
            <div className="vendor-contract-status-list">

              {contractStatus.map(
                (item, index) => (
                  <div
                    className="vendor-contract-status-item"
                    key={index}
                  >
                    <span>
                      {item.status ||
                        item.contract_status ||
                        "Unknown"}
                    </span>

                    <strong>
                      {Number(
                        item.count || 0
                      )}
                    </strong>
                  </div>
                )
              )}

            </div>
          )}

        </section>

        <section className="vendor-report-panel vendor-report-full">

          <div className="vendor-report-panel-header">
            <FaShoppingCart />

            <div>
              <h2>
                Recent Purchase Orders
              </h2>

              <p>
                Latest procurement activity.
              </p>
            </div>
          </div>

          {recentPurchaseOrders.length === 0 ? (
            <div className="vendor-report-empty-small">
              No recent purchase orders available.
            </div>
          ) : (
            <div className="vendor-report-table-wrapper">

              <table className="vendor-report-table">

                <thead>
                  <tr>
                    <th>PO ID</th>
                    <th>Order Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>

                  {recentPurchaseOrders.map(
                    (order, index) => (
                      <tr key={index}>

                        <td>
                          PO-
                          {order.po_id}
                        </td>

                        <td>
                          {new Date(
                            order.order_date
                          ).toLocaleDateString(
                            "en-IN"
                          )}
                        </td>

                        <td>
                          {formatAmount(
                            order.order_amount
                          )}
                        </td>

                        <td>
                          <span className="vendor-report-status">
                            {order.status}
                          </span>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        <section className="vendor-report-note">

          <FaFileAlt />

          <div>
            <h3>
              Vendor Report
            </h3>

            <p>
              This report uses the authenticated
              vendor account and displays only
              that vendor's procurement,
              performance, reliability and
              financial information.
            </p>
          </div>

        </section>

      </main>
    </div>
  );
}