 import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import ProcurementSidebar from "../components/ProcurementSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import FinanceSidebar from "../components/FinanceSidebar";
import VendorSidebar from "../components/VendorSidebar";
import AuditorSidebar from "../components/AuditorSidebar";
import "../styles/VendorPerformance.css";

function VendorPerformance() {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [analyticsVendorId, setAnalyticsVendorId] = useState("");

  const getStoredUser = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  };

  const storedUser = getStoredUser();

  const getUserRole = () => {
    if (!storedUser) {
      return "";
    }

    return storedUser.role || storedUser.role_name || "";
  };

  const normalizedRole = getUserRole().toLowerCase().trim();

  const isVendor = normalizedRole === "vendor";

  const loggedInVendorId = Number(
    storedUser?.vendor_id ?? storedUser?.vendorId
  );

  const hasVendorLink =
    isVendor &&
    Number.isFinite(loggedInVendorId) &&
    loggedInVendorId > 0;

  const renderRoleSidebar = () => {
    const role = normalizedRole;

    if (role === "administrator" || role === "admin") {
      return <AdminSidebar />;
    }

    if (
      role === "procurement manager" ||
      role === "procurement_manager"
    ) {
      return <ProcurementSidebar />;
    }

    if (
      role === "supply chain manager" ||
      role === "supply_chain_manager"
    ) {
      return <SupplyChainSidebar />;
    }

    if (
      role === "finance officer" ||
      role === "finance_officer"
    ) {
      return <FinanceSidebar />;
    }

    if (role === "vendor") {
      return <VendorSidebar />;
    }

    if (role === "auditor") {
      return <AuditorSidebar />;
    }

    return null;
  };

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(
        "http://localhost:5000/api/vendor-performance",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch vendor performance"
        );
      }

      const vendors = Array.isArray(data.data)
        ? data.data
        : [];

      setPerformance(vendors);

      if (vendors.length > 0 && !isVendor) {
        setAnalyticsVendorId(String(vendors[0].vendor_id));
      }
    } catch (err) {
      console.error("Vendor performance error:", err);

      setError(
        err.message || "Failed to load vendor performance."
      );

      setPerformance([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  const scopedPerformance = useMemo(() => {
    if (!isVendor) {
      return performance;
    }

    if (!hasVendorLink) {
      return [];
    }

    return performance.filter(
      (vendor) =>
        Number(vendor.vendor_id) === loggedInVendorId
    );
  }, [
    performance,
    isVendor,
    hasVendorLink,
    loggedInVendorId,
  ]);

  const filteredPerformance = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      return scopedPerformance;
    }

    return scopedPerformance.filter((vendor) =>
      vendor.company_name
        ?.toLowerCase()
        .includes(searchText)
    );
  }, [scopedPerformance, search]);

  useEffect(() => {
    if (isVendor && scopedPerformance.length === 1) {
      setAnalyticsVendorId(
        String(scopedPerformance[0].vendor_id)
      );
    }
  }, [isVendor, scopedPerformance]);

  const analyticsVendor = useMemo(() => {
    if (isVendor) {
      return scopedPerformance[0] || null;
    }

    return (
      scopedPerformance.find(
        (vendor) =>
          String(vendor.vendor_id) ===
          String(analyticsVendorId)
      ) ||
      scopedPerformance[0] ||
      null
    );
  }, [
    scopedPerformance,
    analyticsVendorId,
    isVendor,
  ]);

  const totalOrders = useMemo(() => {
    if (isVendor) {
      return Number(
        analyticsVendor?.total_orders || 0
      );
    }

    return scopedPerformance.reduce(
      (sum, vendor) =>
        sum + Number(vendor.total_orders || 0),
      0
    );
  }, [
    scopedPerformance,
    analyticsVendor,
    isVendor,
  ]);

  const totalDeliveries = useMemo(() => {
    if (isVendor) {
      return Number(
        analyticsVendor?.total_deliveries || 0
      );
    }

    return scopedPerformance.reduce(
      (sum, vendor) =>
        sum + Number(vendor.total_deliveries || 0),
      0
    );
  }, [
    scopedPerformance,
    analyticsVendor,
    isVendor,
  ]);

  const onTimeDeliveries = useMemo(() => {
    if (isVendor) {
      return Number(
        analyticsVendor?.on_time_deliveries || 0
      );
    }

    return scopedPerformance.reduce(
      (sum, vendor) =>
        sum + Number(vendor.on_time_deliveries || 0),
      0
    );
  }, [
    scopedPerformance,
    analyticsVendor,
    isVendor,
  ]);

  const delayedDeliveries = useMemo(() => {
    if (isVendor) {
      return Number(
        analyticsVendor?.late_deliveries || 0
      );
    }

    return scopedPerformance.reduce(
      (sum, vendor) =>
        sum + Number(vendor.late_deliveries || 0),
      0
    );
  }, [
    scopedPerformance,
    analyticsVendor,
    isVendor,
  ]);

  const advanceDeliveries = useMemo(() => {
    if (isVendor) {
      return Number(
        analyticsVendor?.advance_deliveries || 0
      );
    }

    return scopedPerformance.reduce(
      (sum, vendor) =>
        sum + Number(vendor.advance_deliveries || 0),
      0
    );
  }, [
    scopedPerformance,
    analyticsVendor,
    isVendor,
  ]);

  const cancelledDeliveries = useMemo(() => {
    if (isVendor) {
      return Number(
        analyticsVendor?.cancelled_deliveries || 0
      );
    }

    return scopedPerformance.reduce(
      (sum, vendor) =>
        sum + Number(vendor.cancelled_deliveries || 0),
      0
    );
  }, [
    scopedPerformance,
    analyticsVendor,
    isVendor,
  ]);

  const onTimeRate = useMemo(() => {
    if (totalDeliveries <= 0) {
      return null;
    }

    return (
      (onTimeDeliveries / totalDeliveries) *
      100
    );
  }, [totalDeliveries, onTimeDeliveries]);

  const averagePerformance = useMemo(() => {
    const values = scopedPerformance
      .map((vendor) =>
        Number(vendor.performance_score)
      )
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
      return null;
    }

    return (
      values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length
    );
  }, [scopedPerformance]);

  const averageQuality = useMemo(() => {
    const values = scopedPerformance
      .map((vendor) =>
        Number(vendor.quality_score)
      )
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
      return null;
    }

    return (
      values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length
    );
  }, [scopedPerformance]);

  const lowRiskVendors = scopedPerformance.filter(
    (vendor) => vendor.risk_status === "Low"
  ).length;

  const mediumRiskVendors = scopedPerformance.filter(
    (vendor) => vendor.risk_status === "Medium"
  ).length;

  const highRiskVendors = scopedPerformance.filter(
    (vendor) => vendor.risk_status === "High"
  ).length;

  const insufficientDataVendors =
    scopedPerformance.filter(
      (vendor) =>
        vendor.risk_status === "Insufficient Data"
    ).length;

  const averageReliability = null;

  const getScoreClass = (score) => {
    if (
      score === null ||
      score === undefined ||
      score === "" ||
      !Number.isFinite(Number(score))
    ) {
      return "performance-neutral";
    }

    const value = Number(score);

    if (value >= 75) {
      return "performance-good";
    }

    if (value >= 50) {
      return "performance-medium";
    }

    return "performance-low";
  };

  const getRiskClass = (risk) => {
    if (risk === "Low") {
      return "risk-low";
    }

    if (risk === "Medium") {
      return "risk-medium";
    }

    if (risk === "High") {
      return "risk-high";
    }

    return "risk-neutral";
  };

  const formatScore = (score) => {
    if (
      score === null ||
      score === undefined ||
      score === "" ||
      !Number.isFinite(Number(score))
    ) {
      return "N/A";
    }

    return Number(score).toFixed(1);
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString();
  };

  const getPerformanceStatus = (score) => {
    if (
      score === null ||
      score === undefined ||
      score === "" ||
      !Number.isFinite(Number(score))
    ) {
      return "Insufficient Data";
    }

    const value = Number(score);

    if (value >= 75) {
      return "Strong";
    }

    if (value >= 50) {
      return "Moderate";
    }

    return "Needs Attention";
  };

  const scorePercent = (value) => {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, Number(value))
    );
  };

  const performanceBreakdown = analyticsVendor
    ? [
        {
          label: "Delivery",
          value: analyticsVendor.delivery_score,
        },
        {
          label: "Quality",
          value: analyticsVendor.quality_score,
        },
        {
          label: "Compliance",
          value: analyticsVendor.compliance_score,
        },
        {
          label: "Communication",
          value: analyticsVendor.communication_score,
        },
        {
          label: "Issue Resolution",
          value:
            analyticsVendor.issue_resolution_score,
        },
      ]
    : [];

  const deliveryTotal = Number(
    analyticsVendor?.total_deliveries || 0
  );

  const deliveryOnTimePercent =
    deliveryTotal > 0
      ? (Number(
          analyticsVendor?.on_time_deliveries || 0
        ) /
          deliveryTotal) *
        100
      : 0;

  const deliveryLatePercent =
    deliveryTotal > 0
      ? (Number(
          analyticsVendor?.late_deliveries || 0
        ) /
          deliveryTotal) *
        100
      : 0;

  const deliveryAdvancePercent =
    deliveryTotal > 0
      ? (Number(
          analyticsVendor?.advance_deliveries || 0
        ) /
          deliveryTotal) *
        100
      : 0;

  const deliveryCancelledPercent =
    deliveryTotal > 0
      ? (Number(
          analyticsVendor?.cancelled_deliveries || 0
        ) /
          deliveryTotal) *
        100
      : 0;

  const qualityPassed = Number(
    analyticsVendor?.passed_inspections || 0
  );

  const qualityFailed = Number(
    analyticsVendor?.failed_inspections || 0
  );

  const qualityTotal =
    Number(
      analyticsVendor?.total_inspections || 0
    ) ||
    qualityPassed + qualityFailed;

  const qualityPassedPercent =
    qualityTotal > 0
      ? (qualityPassed / qualityTotal) * 100
      : 0;

  const qualityFailedPercent =
    qualityTotal > 0
      ? (qualityFailed / qualityTotal) * 100
      : 0;

  const riskTotal =
    lowRiskVendors +
    mediumRiskVendors +
    highRiskVendors +
    insufficientDataVendors;

  return (
    <div className="vendor-performance-page">
      {renderRoleSidebar()}

      <main className="vendor-performance-main">
        <header className="vendor-performance-header">
          <div>
            <h1>
              {isVendor
                ? "My Vendor Performance"
                : "Vendor Performance"}
            </h1>

            <p>
              {isVendor
                ? "Monitor your company's delivery, quality, compliance, communication and performance."
                : "Monitor supplier delivery, quality, compliance, communication and overall performance."}
            </p>
          </div>

          <button
            type="button"
            className="refresh-performance-btn"
            onClick={fetchPerformance}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && (
          <div className="performance-error">
            {error}
          </div>
        )}

        {isVendor && !hasVendorLink && !loading && (
          <div className="performance-error">
            Your account is not linked to a vendor company.
            Please contact the administrator to assign your
            vendor_id.
          </div>
        )}

        <section className="performance-summary">
          <div className="performance-summary-card">
            <h3>Total Orders</h3>

            <strong className="summary-value">
              {formatNumber(totalOrders)}
            </strong>

            <span className="summary-label">
              {isVendor
                ? "Orders associated with your company"
                : "Orders across evaluated vendors"}
            </span>
          </div>

          <div className="performance-summary-card">
            <h3>On-Time Rate</h3>

            <strong
              className={`summary-value ${getScoreClass(
                onTimeRate
              )}`}
            >
              {onTimeRate === null
                ? "N/A"
                : `${onTimeRate.toFixed(1)}%`}
            </strong>

            <span className="summary-label">
              {formatNumber(onTimeDeliveries)} on-time /{" "}
              {formatNumber(delayedDeliveries)} delayed
            </span>
          </div>

          <div className="performance-summary-card">
            <h3>Quality Score</h3>

            <strong
              className={`summary-value ${getScoreClass(
                isVendor
                  ? analyticsVendor?.quality_score
                  : averageQuality
              )}`}
            >
              {formatScore(
                isVendor
                  ? analyticsVendor?.quality_score
                  : averageQuality
              )}
            </strong>

            <span className="summary-label">
              Based on stored quality inspections
            </span>
          </div>

          <div className="performance-summary-card">
            <h3>Performance Score</h3>

            <strong
              className={`summary-value ${getScoreClass(
                isVendor
                  ? analyticsVendor?.performance_score
                  : averagePerformance
              )}`}
            >
              {formatScore(
                isVendor
                  ? analyticsVendor?.performance_score
                  : averagePerformance
              )}
            </strong>

            <span className="summary-label">
              Delivery, quality and compliance weighted score
            </span>
          </div>
        </section>

        <section className="performance-analytics-grid">
          <div className="performance-panel risk-panel">
            <div className="performance-panel-header">
              <div>
                <h2>
                  {isVendor
                    ? "My Risk Status"
                    : "Vendor Risk Overview"}
                </h2>

                <p>
                  Risk classification based on available
                  performance and operational evidence.
                </p>
              </div>

              {analyticsVendor && (
                <span
                  className={`analytics-risk-badge ${getRiskClass(
                    analyticsVendor.risk_status
                  )}`}
                >
                  {analyticsVendor.risk_status ||
                    "Insufficient Data"}
                </span>
              )}
            </div>

            <div className="risk-overview-content">
              <div className="risk-visual">
                <div
                  className="risk-donut"
                  style={{
                    background:
                      riskTotal > 0
                        ? `conic-gradient(
                            var(--risk-low-color) 0 ${
                              (lowRiskVendors /
                                riskTotal) *
                              100
                            }%,
                            var(--risk-medium-color) 0 ${
                              ((lowRiskVendors +
                                mediumRiskVendors) /
                                riskTotal) *
                              100
                            }%,
                            var(--risk-high-color) 0 ${
                              ((lowRiskVendors +
                                mediumRiskVendors +
                                highRiskVendors) /
                                riskTotal) *
                              100
                            }%,
                            var(--risk-neutral-color) 0 100%
                          )`
                        : "var(--risk-neutral-color)",
                  }}
                >
                  <div className="risk-donut-center">
                    <strong>{riskTotal}</strong>
                    <span>Evaluated</span>
                  </div>
                </div>
              </div>

              <div className="risk-stat-list">
                <div className="risk-stat">
                  <span>
                    <i className="risk-dot risk-dot-low" />
                    Low Risk
                  </span>
                  <strong>{lowRiskVendors}</strong>
                </div>

                <div className="risk-stat">
                  <span>
                    <i className="risk-dot risk-dot-medium" />
                    Medium Risk
                  </span>
                  <strong>{mediumRiskVendors}</strong>
                </div>

                <div className="risk-stat">
                  <span>
                    <i className="risk-dot risk-dot-high" />
                    High Risk
                  </span>
                  <strong>{highRiskVendors}</strong>
                </div>

                {insufficientDataVendors > 0 && (
                  <div className="risk-stat">
                    <span>
                      <i className="risk-dot risk-dot-neutral" />
                      Insufficient Data
                    </span>
                    <strong>
                      {insufficientDataVendors}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="performance-panel breakdown-panel">
            <div className="performance-panel-header">
              <div>
                <h2>Performance Score Breakdown</h2>

                <p>
                  Individual factors contributing to vendor
                  performance.
                </p>
              </div>

              {!isVendor &&
                scopedPerformance.length > 0 && (
                  <select
                    className="analytics-vendor-select"
                    value={
                      analyticsVendor
                        ? String(
                            analyticsVendor.vendor_id
                          )
                        : ""
                    }
                    onChange={(e) =>
                      setAnalyticsVendorId(
                        e.target.value
                      )
                    }
                  >
                    {scopedPerformance.map((vendor) => (
                      <option
                        key={vendor.vendor_id}
                        value={vendor.vendor_id}
                      >
                        {vendor.company_name}
                      </option>
                    ))}
                  </select>
                )}
            </div>

            {analyticsVendor ? (
              <div className="score-breakdown">
                {performanceBreakdown.map(
                  (factor) => (
                    <div
                      className="score-bar-row"
                      key={factor.label}
                    >
                      <div className="score-bar-label">
                        <span>{factor.label}</span>

                        <strong>
                          {formatScore(factor.value)}
                        </strong>
                      </div>

                      <div
                        className="score-bar-track"
                        title={`${factor.label}: ${formatScore(
                          factor.value
                        )}`}
                      >
                        <div
                          className={`score-bar-fill ${getScoreClass(
                            factor.value
                          )}`}
                          style={{
                            width: `${scorePercent(
                              factor.value
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="chart-empty">
                No vendor performance data available.
              </div>
            )}
          </div>
        </section>

        <section className="performance-chart-grid">
          <div className="performance-panel chart-panel">
            <div className="performance-panel-header">
              <div>
                <h2>Delivery Distribution</h2>

                <p>
                  Actual delivery status distribution from
                  stored delivery records.
                </p>
              </div>
            </div>

            {analyticsVendor ? (
              <div className="distribution-chart">
                <div className="distribution-visual">
                  <div
                    className="distribution-donut"
                    style={{
                      background:
                        deliveryTotal > 0
                          ? `conic-gradient(
                              var(--chart-on-time) 0 ${deliveryOnTimePercent}%,
                              var(--chart-delayed) ${deliveryOnTimePercent}% ${
                                deliveryOnTimePercent +
                                deliveryLatePercent
                              }%,
                              var(--risk-medium-color) ${
                                deliveryOnTimePercent +
                                deliveryLatePercent
                              }% ${
                                deliveryOnTimePercent +
                                deliveryLatePercent +
                                deliveryAdvancePercent
                              }%,
                              var(--risk-neutral-color) ${
                                deliveryOnTimePercent +
                                deliveryLatePercent +
                                deliveryAdvancePercent
                              }% 100%
                            )`
                          : "var(--risk-neutral-color)",
                    }}
                  >
                    <div className="distribution-center">
                      <strong>
                        {formatNumber(deliveryTotal)}
                      </strong>
                      <span>Deliveries</span>
                    </div>
                  </div>
                </div>

                <div className="distribution-legend">
                  <div className="legend-item">
                    <span className="legend-color on-time" />

                    <div>
                      <strong>Shipping On-Time</strong>

                      <span>
                        {formatNumber(
                          analyticsVendor.on_time_deliveries
                        )}{" "}
                        (
                        {deliveryTotal > 0
                          ? deliveryOnTimePercent.toFixed(
                              1
                            )
                          : "0.0"}
                        %)
                      </span>
                    </div>
                  </div>

                  <div className="legend-item">
                    <span className="legend-color delayed" />

                    <div>
                      <strong>Late Delivery</strong>

                      <span>
                        {formatNumber(
                          analyticsVendor.late_deliveries
                        )}{" "}
                        (
                        {deliveryTotal > 0
                          ? deliveryLatePercent.toFixed(
                              1
                            )
                          : "0.0"}
                        %)
                      </span>
                    </div>
                  </div>

                  <div className="legend-item">
                    <span className="legend-color on-time" />

                    <div>
                      <strong>Advance Shipping</strong>

                      <span>
                        {formatNumber(
                          analyticsVendor.advance_deliveries
                        )}{" "}
                        (
                        {deliveryTotal > 0
                          ? deliveryAdvancePercent.toFixed(
                              1
                            )
                          : "0.0"}
                        %)
                      </span>
                    </div>
                  </div>

                  <div className="legend-item">
                    <span className="legend-color delayed" />

                    <div>
                      <strong>Shipping Cancelled</strong>

                      <span>
                        {formatNumber(
                          analyticsVendor.cancelled_deliveries
                        )}{" "}
                        (
                        {deliveryTotal > 0
                          ? deliveryCancelledPercent.toFixed(
                              1
                            )
                          : "0.0"}
                        %)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chart-empty">
                No delivery data available.
              </div>
            )}
          </div>

          <div className="performance-panel chart-panel">
            <div className="performance-panel-header">
              <div>
                <h2>Quality Inspection</h2>

                <p>
                  Passed and failed inspections from stored
                  quality data.
                </p>
              </div>
            </div>

            {analyticsVendor ? (
              <div className="quality-chart">
                <div className="quality-chart-total">
                  <strong>
                    {formatNumber(qualityTotal)}
                  </strong>

                  <span>Total Inspections</span>
                </div>

                <div className="quality-bars">
                  <div className="quality-bar-item">
                    <div className="quality-bar-header">
                      <span>Passed</span>

                      <strong>
                        {formatNumber(qualityPassed)}
                      </strong>
                    </div>

                    <div className="quality-bar-track">
                      <div
                        className="quality-bar-fill quality-pass"
                        style={{
                          width: `${qualityPassedPercent}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="quality-bar-item">
                    <div className="quality-bar-header">
                      <span>Failed</span>

                      <strong>
                        {formatNumber(qualityFailed)}
                      </strong>
                    </div>

                    <div className="quality-bar-track">
                      <div
                        className="quality-bar-fill quality-fail"
                        style={{
                          width: `${qualityFailedPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chart-empty">
                No quality inspection data available.
              </div>
            )}
          </div>
        </section>

        <section className="performance-table-card">
          <div className="performance-table-header">
            <div>
              <h2>
                {isVendor
                  ? "My Performance Details"
                  : "Vendor Performance Monitoring"}
              </h2>

              <p className="table-description">
                Performance metrics are calculated from stored
                procurement, delivery, quality, communication
                and contract data.
              </p>
            </div>

            {!isVendor && (
              <input
                type="text"
                className="performance-search"
                placeholder="Search vendor..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            )}
          </div>

          {loading ? (
            <div className="performance-loading">
              Calculating vendor performance...
            </div>
          ) : filteredPerformance.length === 0 ? (
            <div className="performance-empty">
              {isVendor
                ? !hasVendorLink
                  ? "This account is not linked to a vendor company."
                  : "No performance data is available for your linked vendor."
                : "No vendor performance data available."}
            </div>
          ) : (
            <div className="performance-table-wrapper">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Vendor</th>
                    <th>Orders</th>
                    <th>On-Time</th>
                    <th>Delayed</th>
                    <th>Quality</th>
                    <th>Compliance</th>
                    <th>Communication</th>
                    <th>Issue Resolution</th>
                    <th>Performance</th>
                    <th>Reliability</th>
                    <th>Risk</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPerformance.map(
                    (vendor) => (
                      <tr key={vendor.vendor_id}>
                        <td>
                          {vendor.rank === null ||
                          vendor.rank === undefined
                            ? "—"
                            : `#${vendor.rank}`}
                        </td>

                        <td className="vendor-name">
                          {vendor.company_name}
                        </td>

                        <td>
                          {formatNumber(
                            vendor.total_orders
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            vendor.on_time_deliveries
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            vendor.late_deliveries
                          )}
                        </td>

                        <td>
                          <span
                            className={getScoreClass(
                              vendor.quality_score
                            )}
                          >
                            {formatScore(
                              vendor.quality_score
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={getScoreClass(
                              vendor.compliance_score
                            )}
                          >
                            {formatScore(
                              vendor.compliance_score
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={getScoreClass(
                              vendor.communication_score
                            )}
                          >
                            {formatScore(
                              vendor.communication_score
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={getScoreClass(
                              vendor.issue_resolution_score
                            )}
                          >
                            {formatScore(
                              vendor.issue_resolution_score
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`performance-score ${getScoreClass(
                              vendor.performance_score
                            )}`}
                          >
                            {formatScore(
                              vendor.performance_score
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="performance-score performance-neutral">
                            N/A
                          </span>
                        </td>

                        <td>
                          <span
                            className={`performance-risk-badge ${getRiskClass(
                              vendor.risk_status
                            )}`}
                          >
                            {vendor.risk_status ||
                              "Insufficient Data"}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="performance-details-btn"
                            onClick={() =>
                              setSelectedVendor(
                                vendor
                              )
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedVendor && (
          <div
            className="performance-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedVendor(null);
              }
            }}
          >
            <div className="performance-modal">
              <div className="performance-modal-header">
                <div>
                  <span className="modal-eyebrow">
                    Vendor Performance
                  </span>

                  <h2>
                    {selectedVendor.company_name}
                  </h2>

                  <p>
                    Performance and operational evidence
                  </p>
                </div>

                <button
                  type="button"
                  className="performance-modal-close"
                  aria-label="Close details"
                  onClick={() =>
                    setSelectedVendor(null)
                  }
                >
                  ×
                </button>
              </div>

              <div className="performance-modal-body">
                <div className="performance-modal-summary">
                  <div className="performance-modal-summary-card">
                    <span>Performance</span>

                    <strong
                      className={getScoreClass(
                        selectedVendor.performance_score
                      )}
                    >
                      {formatScore(
                        selectedVendor.performance_score
                      )}
                    </strong>

                    <small>
                      {getPerformanceStatus(
                        selectedVendor.performance_score
                      )}
                    </small>
                  </div>

                  <div className="performance-modal-summary-card">
                    <span>Reliability</span>

                    <strong className="performance-neutral">
                      N/A
                    </strong>

                    <small>
                      Separate Reliability Scoring module
                    </small>
                  </div>

                  <div className="performance-modal-summary-card">
                    <span>Vendor Rank</span>

                    <strong>
                      {selectedVendor.rank === null ||
                      selectedVendor.rank === undefined
                        ? "—"
                        : `#${selectedVendor.rank}`}
                    </strong>

                    <small>Supplier performance ranking</small>
                  </div>
                </div>

                <div className="performance-detail-grid">
                  <div className="performance-detail-column">
                    <div className="performance-detail-section">
                      <h3>Delivery Performance</h3>

                      <div className="performance-detail-item">
                        <span>Total Orders</span>
                        <strong>
                          {formatNumber(
                            selectedVendor.total_orders
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Total Deliveries</span>
                        <strong>
                          {formatNumber(
                            selectedVendor.total_deliveries
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Shipping On-Time</span>
                        <strong>
                          {formatNumber(
                            selectedVendor.on_time_deliveries
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Late Deliveries</span>
                        <strong>
                          {formatNumber(
                            selectedVendor.late_deliveries
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Advance Shipping</span>
                        <strong>
                          {formatNumber(
                            selectedVendor.advance_deliveries
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Shipping Cancelled</span>
                        <strong>
                          {formatNumber(
                            selectedVendor.cancelled_deliveries
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Delivery Score</span>

                        <strong
                          className={getScoreClass(
                            selectedVendor.delivery_score
                          )}
                        >
                          {formatScore(
                            selectedVendor.delivery_score
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="performance-detail-section">
                      <h3>Quality Performance</h3>

                      <div className="performance-detail-item">
                        <span>Quality Score</span>

                        <strong
                          className={getScoreClass(
                            selectedVendor.quality_score
                          )}
                        >
                          {formatScore(
                            selectedVendor.quality_score
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Total Inspections</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.total_inspections
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Passed Inspections</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.passed_inspections
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Failed Inspections</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.failed_inspections
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Total Defects</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.total_defects
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="performance-detail-section">
                      <h3>Procurement Performance</h3>

                      <div className="performance-detail-item">
                        <span>Fulfilled Orders</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.fulfilled_orders
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Pending Orders</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.pending_orders
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Accepted Orders</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.accepted_orders
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Cancelled Orders</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.cancelled_orders
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Compliance Score</span>

                        <strong
                          className={getScoreClass(
                            selectedVendor.compliance_score
                          )}
                        >
                          {formatScore(
                            selectedVendor.compliance_score
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="performance-detail-column">
                    <div className="performance-detail-section">
                      <h3>Communication & Resolution</h3>

                      <div className="performance-detail-item">
                        <span>Total Communications</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.total_communications
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Resolved</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.resolved_communications
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Completed</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.completed_communications
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Pending</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.pending_communications
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Follow-up Required</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.follow_up_communications
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Issue Resolution Score</span>

                        <strong
                          className={getScoreClass(
                            selectedVendor.issue_resolution_score
                          )}
                        >
                          {formatScore(
                            selectedVendor.issue_resolution_score
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="performance-detail-section">
                      <h3>Contract Compliance</h3>

                      <div className="performance-detail-item">
                        <span>Total Contracts</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.total_contracts
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Compliant Contracts</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.compliant_contracts
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Under Review</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.under_review_contracts
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Non-Compliant</span>

                        <strong>
                          {formatNumber(
                            selectedVendor.non_compliant_contracts
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Compliance Score</span>

                        <strong
                          className={getScoreClass(
                            selectedVendor.compliance_score
                          )}
                        >
                          {formatScore(
                            selectedVendor.compliance_score
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="performance-detail-section">
                      <h3>Performance Factors</h3>

                      {[
                        [
                          "Delivery",
                          selectedVendor.delivery_score,
                        ],
                        [
                          "Quality",
                          selectedVendor.quality_score,
                        ],
                        [
                          "Compliance",
                          selectedVendor.compliance_score,
                        ],
                        [
                          "Communication",
                          selectedVendor.communication_score,
                        ],
                        [
                          "Issue Resolution",
                          selectedVendor.issue_resolution_score,
                        ],
                      ].map(([label, value]) => (
                        <div
                          className="performance-detail-item"
                          key={label}
                        >
                          <span>{label}</span>

                          <strong
                            className={getScoreClass(
                              value
                            )}
                          >
                            {formatScore(value)}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div className="performance-detail-section">
                      <h3>Risk Assessment</h3>

                      <div className="performance-detail-item">
                        <span>Risk Status</span>

                        <strong
                          className={getScoreClass(
                            selectedVendor.performance_score
                          )}
                        >
                          {selectedVendor.risk_status ||
                            "Insufficient Data"}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Average Late Delivery Risk</span>

                        <strong>
                          {formatScore(
                            selectedVendor.average_late_delivery_risk
                          )}
                        </strong>
                      </div>

                      <div className="performance-detail-item">
                        <span>Performance Score</span>

                        <strong
                          className={getScoreClass(
                            selectedVendor.performance_score
                          )}
                        >
                          {formatScore(
                            selectedVendor.performance_score
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="performance-modal-footer">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedVendor(null)
                    }
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default VendorPerformance;