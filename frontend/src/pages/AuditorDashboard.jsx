 import { useEffect, useMemo, useState } from "react";
import AuditorSidebar from "../components/AuditorSidebar";
import { getAuditorDashboard } from "../services/api";

import {
  FaBell,
  FaCheckCircle,
  FaClipboardCheck,
  FaClock,
  FaExclamationTriangle,
  FaFileContract,
  FaFileInvoiceDollar,
  FaHistory,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "../styles/AuditorDashboard.css";

const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value) =>
  numberValue(value).toLocaleString("en-IN");

const formatStatus = (value) => {
  if (!value) return "Not Specified";

  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

/*
 * Converts different possible backend response formats
 * into a consistent array.
 */
const normalizeArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, value]) => ({
      name: key,
      value: numberValue(value),
    }));
  }

  return [];
};

const EmptyChart = ({ message }) => (
  <div className="auditor-empty-state">
    <FaClipboardCheck />
    <span>{message}</span>
  </div>
);

function AuditorDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo(() => getUser(), []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAuditorDashboard();

      console.log("AUDITOR DASHBOARD RESPONSE:", data);

      setDashboard(data);
    } catch (err) {
      console.error("Auditor dashboard error:", err);

      setError(
        err?.message || "Failed to load Auditor Dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="auditor-loading">
        <div className="auditor-spinner"></div>
        <p>Loading Auditor Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auditor-error">
        <FaExclamationTriangle />

        <h2>Unable to load dashboard</h2>

        <p>{error}</p>

        <button onClick={loadDashboard}>
          Try Again
        </button>
      </div>
    );
  }

  /*
   * =========================================================
   * MAIN DATA
   * =========================================================
   */

  const stats = dashboard?.stats || {};

  const contractsReviewed =
    numberValue(stats.contractsReviewed);

  const vendorsAudited =
    numberValue(stats.vendorsAudited);

  const compliantContracts =
    numberValue(stats.compliantContracts);

  const nonCompliantContracts =
    numberValue(stats.nonCompliantContracts);

  const underReviewContracts =
    numberValue(stats.underReviewContracts);

  const notAssessedContracts =
    numberValue(stats.notAssessedContracts);

  const highRiskVendors =
    numberValue(stats.highRiskVendors);

  const pendingApprovals =
    numberValue(stats.pendingApprovals);

  const overdueContracts =
    numberValue(stats.overdueContracts);

  const totalNotifications =
    numberValue(stats.totalNotifications);

  const unreadNotifications =
    numberValue(stats.unreadNotifications);

  const auditLogCount =
    numberValue(stats.auditLogCount);

  const communicationCount =
    numberValue(stats.communicationCount);

  /*
   * =========================================================
   * COMPLIANCE RATE
   * =========================================================
   */

  const totalCompliance =
    compliantContracts +
    nonCompliantContracts +
    underReviewContracts +
    notAssessedContracts;

  const calculatedComplianceRate =
    totalCompliance > 0
      ? Math.round(
          (compliantContracts / totalCompliance) * 100
        )
      : 0;

  const backendComplianceRate =
    numberValue(stats.complianceRate);

  const complianceRate =
    stats.complianceRate !== undefined &&
    stats.complianceRate !== null
      ? backendComplianceRate
      : calculatedComplianceRate;

  /*
   * =========================================================
   * COMPLIANCE OVERVIEW
   *
   * Supports BOTH:
   *
   * {
   *   compliant: 8,
   *   nonCompliant: 1,
   *   underReview: 1
   * }
   *
   * and:
   *
   * [
   *   { status: "Compliant", count: 8 }
   * ]
   * =========================================================
   */

  const rawComplianceOverview =
    dashboard?.complianceOverview;

  let complianceChartData = [];

  if (Array.isArray(rawComplianceOverview)) {
    complianceChartData = rawComplianceOverview
      .map((item) => ({
        name: formatStatus(
          item.status ||
            item.name ||
            item.complianceStatus ||
            item.compliance_status
        ),
        value: numberValue(
          item.count ??
            item.value
        ),
      }))
      .filter((item) => item.value > 0);
  } else if (
    rawComplianceOverview &&
    typeof rawComplianceOverview === "object"
  ) {
    complianceChartData = [
      {
        name: "Compliant",
        value: numberValue(
          rawComplianceOverview.compliant
        ),
      },
      {
        name: "Non-Compliant",
        value: numberValue(
          rawComplianceOverview.nonCompliant ??
            rawComplianceOverview.non_compliant
        ),
      },
      {
        name: "Under Review",
        value: numberValue(
          rawComplianceOverview.underReview ??
            rawComplianceOverview.under_review
        ),
      },
      {
        name: "Not Assessed",
        value: numberValue(
          rawComplianceOverview.notAssessed ??
            rawComplianceOverview.not_assessed
        ),
      },
    ].filter((item) => item.value > 0);
  }

  if (complianceChartData.length === 0) {
    complianceChartData = [
      {
        name: "Compliant",
        value: compliantContracts,
      },
      {
        name: "Non-Compliant",
        value: nonCompliantContracts,
      },
      {
        name: "Under Review",
        value: underReviewContracts,
      },
      {
        name: "Not Assessed",
        value: notAssessedContracts,
      },
    ].filter((item) => item.value > 0);
  }

  /*
   * =========================================================
   * CONTRACT COMPLIANCE
   * =========================================================
   */

  const contractCompliance =
    normalizeArray(
      dashboard?.contractCompliance
    );

  const findingsChartData =
    contractCompliance
      .map((item) => ({
        status: formatStatus(
          item.status ||
            item.name ||
            item.complianceStatus ||
            item.compliance_status
        ),

        count: numberValue(
          item.count ??
            item.value
        ),
      }))
      .filter((item) => item.count > 0);

  const finalFindingsData =
    findingsChartData.length > 0
      ? findingsChartData
      : complianceChartData.map((item) => ({
          status: item.name,
          count: item.value,
        }));

  /*
   * =========================================================
   * RISK ASSESSMENT
   * =========================================================
   */

  const riskAssessment =
    normalizeArray(
      dashboard?.riskAssessment
    );

  let riskChartData = riskAssessment
    .map((item) => ({
      name: formatStatus(
        item.riskLevel ||
          item.risk_level ||
          item.status ||
          item.name
      ),

      value: numberValue(
        item.count ??
          item.value
      ),
    }))
    .filter((item) => item.value > 0);

  if (riskChartData.length === 0) {
    riskChartData = [
      {
        name: "High Risk",
        value: nonCompliantContracts,
      },
      {
        name: "Medium Risk",
        value: underReviewContracts,
      },
      {
        name: "Low Risk",
        value: compliantContracts,
      },
      {
        name: "Not Assessed",
        value: notAssessedContracts,
      },
    ].filter((item) => item.value > 0);
  }

  /*
   * =========================================================
   * VENDOR PERFORMANCE
   * =========================================================
   *
   * Supports:
   * vendor_name / vendorName
   * delivery_score / deliveryScore
   * quality_score / qualityScore
   * compliance_score / complianceScore
   * performance_score / performanceScore
   * =========================================================
   */

  const vendorPerformance =
    normalizeArray(
      dashboard?.vendorPerformance
    );

  const vendorChartData =
    vendorPerformance
      .map((vendor) => ({
        name:
          vendor.vendorName ||
          vendor.vendor_name ||
          vendor.companyName ||
          vendor.company_name ||
          "Vendor",

        delivery: numberValue(
          vendor.deliveryScore ??
            vendor.delivery_score
        ),

        quality: numberValue(
          vendor.qualityScore ??
            vendor.quality_score
        ),

        compliance: numberValue(
          vendor.complianceScore ??
            vendor.compliance_score
        ),

        overall: numberValue(
          vendor.performanceScore ??
            vendor.performance_score
        ),
      }))
      .filter(
        (vendor) =>
          vendor.delivery > 0 ||
          vendor.quality > 0 ||
          vendor.compliance > 0 ||
          vendor.overall > 0
      )
      .slice(0, 7);

  /*
   * =========================================================
   * PROCUREMENT REQUESTS
   * =========================================================
   */

  const procurementStatuses =
    normalizeArray(
      dashboard?.procurementStatuses
    );

  const procurementChartData =
    procurementStatuses
      .map((item) => ({
        status: formatStatus(
          item.status ||
            item.name
        ),

        count: numberValue(
          item.count ??
            item.value
        ),
      }))
      .filter((item) => item.count > 0);

  /*
   * =========================================================
   * PURCHASE ORDERS
   * =========================================================
   */

  const purchaseOrderStatuses =
    normalizeArray(
      dashboard?.purchaseOrderStatuses
    );

  const purchaseOrderChartData =
    purchaseOrderStatuses
      .map((item) => ({
        status: formatStatus(
          item.status ||
            item.name
        ),

        count: numberValue(
          item.count ??
            item.value
        ),
      }))
      .filter((item) => item.count > 0);

  /*
   * =========================================================
   * CONTRACT STATUS
   * =========================================================
   */

  const contractStatuses =
    normalizeArray(
      dashboard?.contractStatuses
    );

  const contractStatusChartData =
    contractStatuses
      .map((item) => ({
        status: formatStatus(
          item.status ||
            item.name
        ),

        count: numberValue(
          item.count ??
            item.value
        ),
      }))
      .filter((item) => item.count > 0);

  /*
   * =========================================================
   * COLORS
   * =========================================================
   */

  const complianceColors = [
    "#22c55e",
    "#ef4444",
    "#f59e0b",
    "#94a3b8",
  ];

  const riskColors = [
    "#ef4444",
    "#f59e0b",
    "#22c55e",
    "#94a3b8",
  ];

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <div className="auditor-layout">

      <AuditorSidebar />

      <main className="auditor-main">

        {/* HEADER */}

        <header className="auditor-header">

          <div>
            <span className="auditor-page-label">
              AUDIT & COMPLIANCE
            </span>

            <h1>
              Auditor Dashboard
            </h1>

            <p>
              Monitor vendor compliance, contract
              performance and procurement risk.
            </p>
          </div>

          <div className="auditor-header-actions">

            <div className="auditor-notification-button">

              <FaBell />

 {unreadNotifications > 0 && (
  <span>
    {unreadNotifications}
  </span>
)}

            </div>

            <div className="auditor-profile">

              <div className="auditor-avatar">
                {user?.full_name
                  ? user.full_name
                      .charAt(0)
                      .toUpperCase()
                  : "A"}
              </div>

              <div>
                <strong>
                  {user?.full_name || "Auditor"}
                </strong>

                <span>
                  {user?.role || "Auditor"}
                </span>
              </div>

            </div>

          </div>

        </header>


        {/* WELCOME */}

        <section className="auditor-welcome">

          <div className="auditor-welcome-content">

            <span className="auditor-welcome-tag">
              AUDIT OVERVIEW
            </span>

            <h2>
              Welcome back,{" "}
              {user?.full_name || "Auditor"}!
            </h2>

            <p>
              Review vendor compliance, contract
              status, procurement activity and
              platform risk from one centralized
              dashboard.
            </p>

          </div>

          <div className="auditor-welcome-icon">
            <FaShieldAlt />
          </div>

        </section>


        {/* KPI CARDS */}

        <section className="auditor-kpi-grid">

          <div className="auditor-kpi-card">

            <div className="auditor-kpi-icon purple">
              <FaFileContract />
            </div>

            <div className="auditor-kpi-content">

              <span>
                Contracts Reviewed
              </span>

              <strong>
                {formatNumber(
                  contractsReviewed
                )}
              </strong>

              <small>
                Total contracts
              </small>

            </div>

          </div>


          <div className="auditor-kpi-card">

            <div className="auditor-kpi-icon blue">
              <FaUsers />
            </div>

            <div className="auditor-kpi-content">

              <span>
                Vendors Audited
              </span>

              <strong>
                {formatNumber(
                  vendorsAudited
                )}
              </strong>

              <small>
                Evaluated vendors
              </small>

            </div>

          </div>


          <div className="auditor-kpi-card">

            <div className="auditor-kpi-icon green">
              <FaCheckCircle />
            </div>

            <div className="auditor-kpi-content">

              <span>
                Compliance Score
              </span>

              <strong>
                {complianceRate}%
              </strong>

              <small>
                Contract compliance
              </small>

            </div>

          </div>


          <div className="auditor-kpi-card">

            <div className="auditor-kpi-icon red">
              <FaExclamationTriangle />
            </div>

            <div className="auditor-kpi-content">

              <span>
                High Risk Vendors
              </span>

              <strong>
                {formatNumber(
                  highRiskVendors
                )}
              </strong>

              <small>
                Non-compliant exposure
              </small>

            </div>

          </div>


          <div className="auditor-kpi-card">

            <div className="auditor-kpi-icon orange">
              <FaClock />
            </div>

            <div className="auditor-kpi-content">

              <span>
                Pending Approvals
              </span>

              <strong>
                {formatNumber(
                  pendingApprovals
                )}
              </strong>

              <small>
                Procurement requests
              </small>

            </div>

          </div>


          <div className="auditor-kpi-card">

            <div className="auditor-kpi-icon dark">
              <FaExclamationTriangle />
            </div>

            <div className="auditor-kpi-content">

              <span>
                Overdue Contracts
              </span>

              <strong>
                {formatNumber(
                  overdueContracts
                )}
              </strong>

              <small>
                Past contract end date
              </small>

            </div>

          </div>

        </section>


        {/* COMPLIANCE / FINDINGS / RISK */}

        <section className="auditor-chart-grid">

          {/* COMPLIANCE */}

          <div className="auditor-panel">

            <div className="auditor-panel-header">

              <div>
                <h2>
                  Compliance Overview
                </h2>

                <p>
                  Current contract compliance
                </p>
              </div>

              <div className="auditor-panel-icon">
                <FaShieldAlt />
              </div>

            </div>

            <div className="auditor-chart-area">

              {complianceChartData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height={270}
                >

                  <PieChart>

                    <Pie
                      data={complianceChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                    >

                      {complianceChartData.map(
                        (entry, index) => (
                          <Cell
                            key={`compliance-${index}`}
                            fill={
                              complianceColors[
                                index %
                                  complianceColors.length
                              ]
                            }
                          />
                        )
                      )}

                    </Pie>

                    <Tooltip />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart
                  message="No compliance data available."
                />
              )}

              {complianceChartData.length > 0 && (
                <div className="auditor-donut-center">

                  <strong>
                    {complianceRate}%
                  </strong>

                  <span>
                    Compliant
                  </span>

                </div>
              )}

            </div>

          </div>


          {/* FINDINGS */}

          <div className="auditor-panel">

            <div className="auditor-panel-header">

              <div>
                <h2>
                  Compliance Findings
                </h2>

                <p>
                  Contract compliance distribution
                </p>
              </div>

              <div className="auditor-panel-icon warning">
                <FaClipboardCheck />
              </div>

            </div>

            <div className="auditor-chart-area">

              {finalFindingsData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height={270}
                >

                  <BarChart
                    data={finalFindingsData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 10,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="status"
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      name="Contracts"
                      fill="#6b4de6"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart
                  message="No compliance findings available."
                />
              )}

            </div>

          </div>


          {/* RISK */}

          <div className="auditor-panel">

            <div className="auditor-panel-header">

              <div>
                <h2>
                  Risk Assessment
                </h2>

                <p>
                  Vendor risk distribution
                </p>
              </div>

              <div className="auditor-panel-icon danger">
                <FaExclamationTriangle />
              </div>

            </div>

            <div className="auditor-chart-area">

              {riskChartData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height={270}
                >

                  <PieChart>

                    <Pie
                      data={riskChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                    >

                      {riskChartData.map(
                        (entry, index) => (
                          <Cell
                            key={`risk-${index}`}
                            fill={
                              riskColors[
                                index %
                                  riskColors.length
                              ]
                            }
                          />
                        )
                      )}

                    </Pie>

                    <Tooltip />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart
                  message="No risk assessment data available."
                />
              )}

            </div>

          </div>

        </section>


        {/* VENDOR PERFORMANCE / PROCUREMENT */}

        <section className="auditor-two-column-grid">

          {/* VENDOR PERFORMANCE */}

          <div className="auditor-panel">

            <div className="auditor-panel-header">

              <div>
                <h2>
                  Vendor Performance
                </h2>

                <p>
                  Delivery, quality and compliance scores
                </p>
              </div>

              <div className="auditor-panel-icon">
                <FaUsers />
              </div>

            </div>

            <div className="auditor-large-chart">

              {vendorChartData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >

                  <BarChart
                    data={vendorChartData}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 20,
                      left: 10,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      domain={[0, 100]}
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={125}
                      tick={{
                        fontSize: 9,
                      }}
                    />

                    <Tooltip />

                    <Legend />

                    <Bar
                      dataKey="delivery"
                      name="Delivery"
                      fill="#6b4de6"
                      radius={[
                        0,
                        4,
                        4,
                        0,
                      ]}
                    />

                    <Bar
                      dataKey="quality"
                      name="Quality"
                      fill="#3b82f6"
                      radius={[
                        0,
                        4,
                        4,
                        0,
                      ]}
                    />

                    <Bar
                      dataKey="compliance"
                      name="Compliance"
                      fill="#22c55e"
                      radius={[
                        0,
                        4,
                        4,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart
                  message="No vendor performance data available."
                />
              )}

            </div>

          </div>


          {/* PROCUREMENT REQUESTS */}

          <div className="auditor-panel">

            <div className="auditor-panel-header">

              <div>
                <h2>
                  Procurement Requests
                </h2>

                <p>
                  Current procurement request status
                </p>
              </div>

              <div className="auditor-panel-icon warning">
                <FaClipboardCheck />
              </div>

            </div>

            <div className="auditor-large-chart">

              {procurementChartData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >

                  <BarChart
                    data={procurementChartData}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="status"
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      name="Requests"
                      fill="#f59e0b"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart
                  message="No procurement request data available."
                />
              )}

            </div>

          </div>

        </section>


        {/* CONTRACT STATUS / PURCHASE ORDERS */}

        <section className="auditor-two-column-grid">

          {/* CONTRACT STATUS */}

          <div className="auditor-panel">

            <div className="auditor-panel-header">

              <div>
                <h2>
                  Contract Status
                </h2>

                <p>
                  Current contract lifecycle distribution
                </p>
              </div>

              <div className="auditor-panel-icon">
                <FaFileContract />
              </div>

            </div>

            <div className="auditor-large-chart">

              {contractStatusChartData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >

                  <BarChart
                    data={contractStatusChartData}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="status"
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      name="Contracts"
                      fill="#6b4de6"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart
                  message="No contract status data available."
                />
              )}

            </div>

          </div>


          {/* PURCHASE ORDERS */}

          <div className="auditor-panel">

            <div className="auditor-panel-header">

              <div>
                <h2>
                  Purchase Order Status
                </h2>

                <p>
                  Current purchase order distribution
                </p>
              </div>

              <div className="auditor-panel-icon">
                <FaFileInvoiceDollar />
              </div>

            </div>

            <div className="auditor-large-chart">

              {purchaseOrderChartData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >

                  <BarChart
                    data={purchaseOrderChartData}
                    margin={{
                      top: 10,
                      right: 15,
                      left: 0,
                      bottom: 20,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="status"
                      tick={{
                        fontSize: 9,
                      }}
                      interval={0}
                    />

                    <YAxis
                      allowDecimals={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      name="Purchase Orders"
                      fill="#22c55e"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              ) : (
                <EmptyChart
                  message="No purchase order data available."
                />
              )}

            </div>

          </div>

        </section>


        {/* PLATFORM SUMMARY */}

        <section className="auditor-summary-panel">

          <div className="auditor-summary-heading">

            <div>

              <span className="auditor-page-label">
                AUDIT SUMMARY
              </span>

              <h2>
                Platform Audit Snapshot
              </h2>

              <p>
                Consolidated audit, notification and
                communication activity from the platform.
              </p>

            </div>

            <div className="auditor-summary-score">

              <FaShieldAlt />

              <strong>
                {complianceRate}%
              </strong>

              <span>
                Compliance
              </span>

            </div>

          </div>


          <div className="auditor-summary-stats">

            <div>
              <FaHistory />

              <span>
                Audit Records
              </span>

              <strong>
                {formatNumber(
                  auditLogCount
                )}
              </strong>
            </div>


            <div>
              <FaBell />

              <span>
                Notifications
              </span>

              <strong>
                {formatNumber(
                  totalNotifications
                )}
              </strong>
            </div>


            <div>
              <FaUsers />

              <span>
                Unread Alerts
              </span>

              <strong>
                {formatNumber(
                  unreadNotifications
                )}
              </strong>
            </div>


            <div>
              <FaFileInvoiceDollar />

              <span>
                Communications
              </span>

              <strong>
                {formatNumber(
                  communicationCount
                )}
              </strong>
            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default AuditorDashboard;