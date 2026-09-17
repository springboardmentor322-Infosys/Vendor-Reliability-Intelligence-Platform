 import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import ProcurementSidebar from "../components/ProcurementSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import FinanceSidebar from "../components/FinanceSidebar";
import VendorSidebar from "../components/VendorSidebar";
import AuditorSidebar from "../components/AuditorSidebar";
import "../styles/VendorReliability.css";

const API_BASE = "http://localhost:5000/api";

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function firstValidNumber(...values) {
  for (const value of values) {
    const number = toNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return null;
}

function firstValidValue(...values) {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function normalizeVendor(vendor) {
  if (!vendor) {
    return null;
  }

  return {
    ...vendor,

    vendor_id: firstValidNumber(
      vendor.vendor_id,
      vendor.vendorId,
      vendor.id
    ),

    company_name: firstValidValue(
      vendor.company_name,
      vendor.companyName,
      vendor.vendor_name,
      vendor.vendorName
    ),

    rank: firstValidNumber(
      vendor.rank,
      vendor.vendor_rank
    ),

    total_orders: firstValidNumber(
      vendor.total_orders,
      vendor.totalOrders,
      vendor.orders
    ),

    fulfilled_orders: firstValidNumber(
      vendor.fulfilled_orders,
      vendor.fulfilledOrders
    ),

    cancelled_orders: firstValidNumber(
      vendor.cancelled_orders,
      vendor.cancelledOrders
    ),

    total_deliveries: firstValidNumber(
      vendor.total_deliveries,
      vendor.totalDeliveries
    ),

    on_time_deliveries: firstValidNumber(
      vendor.on_time_deliveries,
      vendor.onTimeDeliveries
    ),

    late_deliveries: firstValidNumber(
      vendor.late_deliveries,
      vendor.lateDeliveries,
      vendor.delayed_deliveries,
      vendor.delayedDeliveries
    ),

    advance_deliveries: firstValidNumber(
      vendor.advance_deliveries,
      vendor.advanceDeliveries
    ),

    cancelled_deliveries: firstValidNumber(
      vendor.cancelled_deliveries,
      vendor.cancelledDeliveries
    ),

    late_delivery_rate: firstValidNumber(
      vendor.late_delivery_rate,
      vendor.lateDeliveryRate
    ),

    average_late_delivery_risk: firstValidNumber(
      vendor.average_late_delivery_risk,
      vendor.averageLateDeliveryRisk,
      vendor.late_delivery_risk,
      vendor.lateDeliveryRisk
    ),

    total_inspections: firstValidNumber(
      vendor.total_inspections,
      vendor.totalInspections
    ),

    passed_inspections: firstValidNumber(
      vendor.passed_inspections,
      vendor.passedInspections
    ),

    failed_inspections: firstValidNumber(
      vendor.failed_inspections,
      vendor.failedInspections
    ),

    average_quality_score: firstValidNumber(
      vendor.average_quality_score,
      vendor.averageQualityScore,
      vendor.quality_score,
      vendor.qualityScore
    ),

    quality_pass_rate: firstValidNumber(
      vendor.quality_pass_rate,
      vendor.qualityPassRate
    ),

    total_defects: firstValidNumber(
      vendor.total_defects,
      vendor.totalDefects
    ),

    defect_rate: firstValidNumber(
      vendor.defect_rate,
      vendor.defectRate
    ),

    fulfillment_rate: firstValidNumber(
      vendor.fulfillment_rate,
      vendor.fulfillmentRate
    ),

    on_time_rate: firstValidNumber(
      vendor.on_time_rate,
      vendor.onTimeRate
    ),

    delivery_consistency: firstValidNumber(
      vendor.delivery_consistency,
      vendor.deliveryConsistency
    ),

    reliability_score: firstValidNumber(
      vendor.reliability_score,
      vendor.reliabilityScore
    ),

    reliability_status: firstValidValue(
      vendor.reliability_status,
      vendor.reliabilityStatus,
      vendor.status
    ),
  };
}

function extractRows(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.vendors)) {
    return responseData.vendors;
  }

  if (Array.isArray(responseData?.rows)) {
    return responseData.rows;
  }

  if (Array.isArray(responseData?.results)) {
    return responseData.results;
  }

  return [];
}

function extractDashboardStats(responseData) {
  return (
    responseData?.stats ||
    responseData?.data?.stats ||
    responseData?.data ||
    responseData ||
    {}
  );
}

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return {};
    }

    return JSON.parse(storedUser) || {};
  } catch {
    return {};
  }
}

function VendorReliability() {
  const [reliability, setReliability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [resolvedVendorId, setResolvedVendorId] = useState(null);

  const storedUser = useMemo(
    () => getStoredUser(),
    []
  );

  const normalizedRole = String(
    storedUser?.role ||
      storedUser?.role_name ||
      storedUser?.roleName ||
      ""
  )
    .toLowerCase()
    .trim();

  const isVendor =
    normalizedRole === "vendor";

  const localVendorId = firstValidNumber(
    storedUser?.vendor_id,
    storedUser?.vendorId
  );

  const userId = firstValidNumber(
    storedUser?.user_id,
    storedUser?.userId,
    storedUser?.id
  );

  const hasVendorLink =
    !isVendor ||
    resolvedVendorId !== null ||
    localVendorId !== null;

  const effectiveVendorId =
    resolvedVendorId ?? localVendorId;

  const renderRoleSidebar = () => {
    if (
      normalizedRole === "administrator" ||
      normalizedRole === "admin"
    ) {
      return <AdminSidebar />;
    }

    if (
      normalizedRole === "procurement manager" ||
      normalizedRole === "procurement_manager"
    ) {
      return <ProcurementSidebar />;
    }

    if (
      normalizedRole === "supply chain manager" ||
      normalizedRole === "supply_chain_manager"
    ) {
      return <SupplyChainSidebar />;
    }

    if (
      normalizedRole === "finance officer" ||
      normalizedRole === "finance_officer"
    ) {
      return <FinanceSidebar />;
    }

    if (normalizedRole === "vendor") {
      return <VendorSidebar />;
    }

    if (normalizedRole === "auditor") {
      return <AuditorSidebar />;
    }

    return <VendorSidebar />;
  };

  const fetchJson = async (
    url,
    token
  ) => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Request failed with status ${response.status}`
      );
    }

    return data;
  };

  const resolveVendorId = async (token) => {
    if (!isVendor) {
      return null;
    }

    if (localVendorId !== null) {
      return localVendorId;
    }

    try {
      const dashboardData = await fetchJson(
        `${API_BASE}/vendor-dashboard`,
        token
      );

      const stats =
        extractDashboardStats(dashboardData);

      const dashboardVendorId =
        firstValidNumber(
          stats.vendorId,
          stats.vendor_id,
          stats.vendorID,
          dashboardData?.vendorId,
          dashboardData?.vendor_id
        );

      if (dashboardVendorId !== null) {
        return dashboardVendorId;
      }
    } catch (dashboardError) {
      console.warn(
        "Could not resolve vendor ID from vendor dashboard:",
        dashboardError
      );
    }

    return null;
  };

  const fetchReliability = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please log in again."
        );
      }

      const vendorId =
        await resolveVendorId(token);

      if (
        isVendor &&
        vendorId !== null
      ) {
        setResolvedVendorId(vendorId);
      }

      const responseData =
        await fetchJson(
          `${API_BASE}/vendor-reliability`,
          token
        );

      const rows = extractRows(
        responseData
      );

      const normalizedRows = rows
        .map(normalizeVendor)
        .filter(Boolean);

      setReliability(normalizedRows);

      if (isVendor) {
        if (vendorId === null) {
          setSelectedVendorId("");
          setError(
            "Your vendor account could not be linked to a vendor company."
          );
          return;
        }

        const currentVendor =
          normalizedRows.find(
            (vendor) =>
              toNumber(vendor.vendor_id) ===
              vendorId
          );

        if (currentVendor) {
          setSelectedVendorId(
            String(currentVendor.vendor_id)
          );
        } else {
          setError(
            "Your vendor account is linked, but no reliability record was returned for that vendor."
          );
        }
      } else if (
        normalizedRows.length > 0
      ) {
        setSelectedVendorId(
          String(
            normalizedRows[0].vendor_id
          )
        );
      }
    } catch (err) {
      console.error(
        "Vendor reliability error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load vendor reliability."
      );

      setReliability([]);
      setSelectedVendorId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReliability();
  }, []);

  const scopedReliability = useMemo(() => {
    if (!isVendor) {
      return reliability;
    }

    if (effectiveVendorId === null) {
      return [];
    }

    return reliability.filter(
      (vendor) =>
        toNumber(vendor.vendor_id) ===
        effectiveVendorId
    );
  }, [
    reliability,
    isVendor,
    effectiveVendorId,
  ]);

  const filteredReliability = useMemo(() => {
    const searchText = search
      .toLowerCase()
      .trim();

    if (!searchText) {
      return scopedReliability;
    }

    return scopedReliability.filter(
      (vendor) =>
        String(
          vendor.company_name || ""
        )
          .toLowerCase()
          .includes(searchText)
    );
  }, [
    scopedReliability,
    search,
  ]);

  const analyticsVendor = useMemo(() => {
    if (isVendor) {
      return scopedReliability[0] || null;
    }

    return (
      scopedReliability.find(
        (vendor) =>
          String(vendor.vendor_id) ===
          String(selectedVendorId)
      ) ||
      scopedReliability[0] ||
      null
    );
  }, [
    scopedReliability,
    selectedVendorId,
    isVendor,
  ]);

  const averageReliability = useMemo(() => {
    const values = scopedReliability
      .map((vendor) =>
        toNumber(
          vendor.reliability_score
        )
      )
      .filter(
        (value) => value !== null
      );

    if (!values.length) {
      return null;
    }

    return (
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) / values.length
    );
  }, [scopedReliability]);

  const getScoreClass = (score) => {
    const value = toNumber(score);

    if (value === null) {
      return "reliability-neutral";
    }

    if (value >= 80) {
      return "reliability-good";
    }

    if (value >= 65) {
      return "reliability-medium";
    }

    if (value >= 50) {
      return "reliability-warning";
    }

    return "reliability-low";
  };

  const getStatusClass = (status) => {
    const normalized = String(
      status || ""
    )
      .toLowerCase()
      .trim();

    if (
      normalized.includes(
        "highly reliable"
      )
    ) {
      return "reliability-status-high";
    }

    if (
      normalized === "reliable"
    ) {
      return "reliability-status-good";
    }

    if (
      normalized.includes(
        "moderately reliable"
      )
    ) {
      return "reliability-status-medium";
    }

    if (
      normalized.includes("at risk")
    ) {
      return "reliability-status-risk";
    }

    return "reliability-status-neutral";
  };

  const formatScore = (value) => {
    const number = toNumber(value);

    if (number === null) {
      return "N/A";
    }

    return number.toFixed(1);
  };

  const formatNumber = (value) => {
    const number = toNumber(value);

    if (number === null) {
      return "N/A";
    }

    return number.toLocaleString(
      "en-IN"
    );
  };

  const formatPercentage = (value) => {
    const number = toNumber(value);

    if (number === null) {
      return "N/A";
    }

    return `${number.toFixed(1)}%`;
  };

  const scorePercent = (value) => {
    const number = toNumber(value);

    if (number === null) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, number)
    );
  };

  const reliabilityFactors =
    analyticsVendor
      ? [
          {
            label: "On-Time Delivery",
            value:
              analyticsVendor.on_time_rate,
          },
          {
            label: "Quality Pass Rate",
            value:
              analyticsVendor.quality_pass_rate,
          },
          {
            label: "Fulfillment Rate",
            value:
              analyticsVendor.fulfillment_rate,
          },
          {
            label: "Delivery Consistency",
            value:
              analyticsVendor.delivery_consistency,
          },
        ]
      : [];

  const renderValue = (
    value,
    suffix = ""
  ) => {
    const number = toNumber(value);

    if (number === null) {
      return "N/A";
    }

    return `${number.toFixed(1)}${suffix}`;
  };

  return (
    <div className="vendor-reliability-page">
      {renderRoleSidebar()}

      <main className="vendor-reliability-main">
        <header className="vendor-reliability-header">
          <div>
            <h1>
              {isVendor
                ? "My Vendor Reliability"
                : "Vendor Reliability"}
            </h1>

            <p>
              {isVendor
                ? "Monitor your company's delivery consistency, quality, fulfillment and reliability."
                : "Evaluate supplier reliability using historical delivery, quality and fulfillment evidence."}
            </p>
          </div>

          <button
            type="button"
            className="refresh-reliability-btn"
            onClick={fetchReliability}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </header>

        {error && (
          <div className="reliability-error">
            {error}
          </div>
        )}

        {isVendor &&
          !hasVendorLink &&
          !loading && (
            <div className="reliability-error">
              Your account is not linked to a
              vendor company.
            </div>
          )}

        <section className="reliability-summary">
          <div className="reliability-summary-card">
            <h3>
              Reliability Score
            </h3>

            <strong
              className={`summary-value ${getScoreClass(
                isVendor
                  ? analyticsVendor?.reliability_score
                  : averageReliability
              )}`}
            >
              {formatScore(
                isVendor
                  ? analyticsVendor?.reliability_score
                  : averageReliability
              )}
            </strong>

            <span className="summary-label">
              Based on operational
              reliability evidence
            </span>
          </div>

          <div className="reliability-summary-card">
            <h3>
              On-Time Delivery
            </h3>

            <strong
              className={`summary-value ${getScoreClass(
                analyticsVendor?.on_time_rate
              )}`}
            >
              {formatPercentage(
                analyticsVendor?.on_time_rate
              )}
            </strong>

            <span className="summary-label">
              {formatNumber(
                analyticsVendor?.on_time_deliveries
              )}{" "}
              on-time deliveries
            </span>
          </div>

          <div className="reliability-summary-card">
            <h3>
              Quality Pass Rate
            </h3>

            <strong
              className={`summary-value ${getScoreClass(
                analyticsVendor?.quality_pass_rate
              )}`}
            >
              {formatPercentage(
                analyticsVendor?.quality_pass_rate
              )}
            </strong>

            <span className="summary-label">
              {formatNumber(
                analyticsVendor?.passed_inspections
              )}{" "}
              passed inspections
            </span>
          </div>

          <div className="reliability-summary-card">
            <h3>
              Fulfillment Rate
            </h3>

            <strong
              className={`summary-value ${getScoreClass(
                analyticsVendor?.fulfillment_rate
              )}`}
            >
              {formatPercentage(
                analyticsVendor?.fulfillment_rate
              )}
            </strong>

            <span className="summary-label">
              Orders fulfilled
              successfully
            </span>
          </div>
        </section>

        <section className="reliability-analytics-grid">
          <div className="reliability-panel">
            <div className="reliability-panel-header">
              <div>
                <h2>
                  {isVendor
                    ? "My Reliability Status"
                    : "Reliability Status"}
                </h2>

                <p>
                  Overall reliability
                  classification based on
                  available operational
                  evidence.
                </p>
              </div>

              {analyticsVendor &&
                analyticsVendor.reliability_status && (
                  <span
                    className={`reliability-status-badge ${getStatusClass(
                      analyticsVendor.reliability_status
                    )}`}
                  >
                    {
                      analyticsVendor.reliability_status
                    }
                  </span>
                )}
            </div>

            {analyticsVendor ? (
              <div className="reliability-score-display">
                <div
                  className={`reliability-score-circle ${getScoreClass(
                    analyticsVendor.reliability_score
                  )}`}
                >
                  <strong>
                    {formatScore(
                      analyticsVendor.reliability_score
                    )}
                  </strong>

                  <span>
                    / 100
                  </span>
                </div>

                <div className="reliability-score-info">
                  <h3>
                    {
                      analyticsVendor.company_name ||
                      "Vendor"
                    }
                  </h3>

                  <p>
                    Reliability is evaluated
                    from delivery consistency,
                    quality outcomes and order
                    fulfillment.
                  </p>

                  <div className="reliability-mini-stats">
                    <div>
                      <span>
                        Total Deliveries
                      </span>
                      <strong>
                        {formatNumber(
                          analyticsVendor.total_deliveries
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Late Deliveries
                      </span>
                      <strong>
                        {formatNumber(
                          analyticsVendor.late_deliveries
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Total Inspections
                      </span>
                      <strong>
                        {formatNumber(
                          analyticsVendor.total_inspections
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Total Defects
                      </span>
                      <strong>
                        {formatNumber(
                          analyticsVendor.total_defects
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="reliability-empty">
                {loading
                  ? "Calculating vendor reliability..."
                  : "No reliability data available."}
              </div>
            )}
          </div>

          <div className="reliability-panel">
            <div className="reliability-panel-header">
              <div>
                <h2>
                  Reliability Factors
                </h2>

                <p>
                  Individual indicators
                  contributing to the overall
                  reliability assessment.
                </p>
              </div>

              {!isVendor &&
                scopedReliability.length >
                  0 && (
                  <select
                    className="reliability-vendor-select"
                    value={
                      analyticsVendor
                        ? String(
                            analyticsVendor.vendor_id
                          )
                        : ""
                    }
                    onChange={(e) =>
                      setSelectedVendorId(
                        e.target.value
                      )
                    }
                  >
                    {scopedReliability.map(
                      (vendor) => (
                        <option
                          key={
                            vendor.vendor_id
                          }
                          value={
                            vendor.vendor_id
                          }
                        >
                          {
                            vendor.company_name
                          }
                        </option>
                      )
                    )}
                  </select>
                )}
            </div>

            {analyticsVendor ? (
              <div className="reliability-factors">
                {reliabilityFactors.map(
                  (factor) => (
                    <div
                      className="reliability-factor"
                      key={factor.label}
                    >
                      <div className="reliability-factor-header">
                        <span>
                          {factor.label}
                        </span>

                        <strong>
                          {formatScore(
                            factor.value
                          )}
                          {toNumber(
                            factor.value
                          ) !== null
                            ? "%"
                            : ""}
                        </strong>
                      </div>

                      <div className="reliability-factor-track">
                        <div
                          className={`reliability-factor-fill ${getScoreClass(
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
              <div className="reliability-empty">
                No reliability factors
                available.
              </div>
            )}
          </div>
        </section>

        <section className="reliability-metrics-grid">
          <div className="reliability-panel">
            <div className="reliability-panel-header">
              <div>
                <h2>
                  Delivery Reliability
                </h2>

                <p>
                  Delivery behavior used to
                  assess supplier consistency.
                </p>
              </div>
            </div>

            {analyticsVendor ? (
              <div className="reliability-detail-grid">
                <div>
                  <span>
                    Total Deliveries
                  </span>
                  <strong>
                    {formatNumber(
                      analyticsVendor.total_deliveries
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    On-Time Deliveries
                  </span>
                  <strong>
                    {formatNumber(
                      analyticsVendor.on_time_deliveries
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Late Deliveries
                  </span>
                  <strong>
                    {formatNumber(
                      analyticsVendor.late_deliveries
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Advance Deliveries
                  </span>
                  <strong>
                    {formatNumber(
                      analyticsVendor.advance_deliveries
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Cancelled Deliveries
                  </span>
                  <strong>
                    {formatNumber(
                      analyticsVendor.cancelled_deliveries
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    On-Time Rate
                  </span>
                  <strong>
                    {renderValue(
                      analyticsVendor.on_time_rate,
                      "%"
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Late Delivery Rate
                  </span>
                  <strong>
                    {renderValue(
                      analyticsVendor.late_delivery_rate,
                      "%"
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Late Delivery Risk
                  </span>
                  <strong>
                    {formatScore(
                      analyticsVendor.average_late_delivery_risk
                    )}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="reliability-empty">
                No delivery reliability
                data available.
              </div>
            )}
          </div>

          <div className="reliability-panel">
            <div className="reliability-panel-header">
              <div>
                <h2>
                  Quality Reliability
                </h2>

                <p>
                  Quality outcomes used to
                  assess supplier
                  dependability.
                </p>
              </div>
            </div>

            {analyticsVendor ? (
              <div className="reliability-detail-grid">
                <div>
                  <span>
                    Total Inspections
                  </span>
                  <strong>
                    {formatNumber(
                      analyticsVendor.total_inspections
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Passed Inspections
                  </span>
                  <strong>
                    {formatNumber(
                      analyticsVendor.passed_inspections
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Failed Inspections
                  </span>
                  <strong>
                    {formatNumber(
                      analyticsVendor.failed_inspections
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Quality Pass Rate
                  </span>
                  <strong>
                    {renderValue(
                      analyticsVendor.quality_pass_rate,
                      "%"
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Average Quality Score
                  </span>
                  <strong>
                    {formatScore(
                      analyticsVendor.average_quality_score
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Total Defects
                  </span>
                  <strong>
                    {formatNumber(
                      analyticsVendor.total_defects
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Defect Rate
                  </span>
                  <strong>
                    {renderValue(
                      analyticsVendor.defect_rate,
                      "%"
                    )}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="reliability-empty">
                No quality reliability
                data available.
              </div>
            )}
          </div>
        </section>

        <section className="reliability-table-card">
          <div className="reliability-table-header">
            <div>
              <h2>
                {isVendor
                  ? "My Reliability Details"
                  : "Vendor Reliability Monitoring"}
              </h2>

              <p>
                Reliability is calculated
                separately from the Vendor
                Performance module.
              </p>
            </div>

            {!isVendor && (
              <input
                type="text"
                className="reliability-search"
                placeholder="Search vendor..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            )}
          </div>

          {loading ? (
            <div className="reliability-loading">
              Calculating vendor
              reliability...
            </div>
          ) : filteredReliability.length ===
            0 ? (
            <div className="reliability-empty">
              {isVendor
                ? effectiveVendorId ===
                  null
                  ? "Your vendor account could not be linked to a vendor company."
                  : "No reliability data is available for your linked vendor."
                : "No vendor reliability data available."}
            </div>
          ) : (
            <div className="reliability-table-wrapper">
              <table className="reliability-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Vendor</th>
                    <th>Orders</th>
                    <th>On-Time</th>
                    <th>
                      Quality Pass
                    </th>
                    <th>
                      Fulfillment
                    </th>
                    <th>
                      Late Rate
                    </th>
                    <th>Defects</th>
                    <th>
                      Reliability
                    </th>
                    <th>Status</th>
                    <th>
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReliability.map(
                    (vendor) => (
                      <tr
                        key={
                          vendor.vendor_id
                        }
                      >
                        <td>
                          {vendor.rank !==
                          null
                            ? `#${vendor.rank}`
                            : "N/A"}
                        </td>

                        <td className="vendor-name">
                          {vendor.company_name ||
                            "Unknown Vendor"}
                        </td>

                        <td>
                          {formatNumber(
                            vendor.total_orders
                          )}
                        </td>

                        <td>
                          {renderValue(
                            vendor.on_time_rate,
                            "%"
                          )}
                        </td>

                        <td>
                          {renderValue(
                            vendor.quality_pass_rate,
                            "%"
                          )}
                        </td>

                        <td>
                          {renderValue(
                            vendor.fulfillment_rate,
                            "%"
                          )}
                        </td>

                        <td>
                          {renderValue(
                            vendor.late_delivery_rate,
                            "%"
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            vendor.total_defects
                          )}
                        </td>

                        <td>
                          <span
                            className={`reliability-score ${getScoreClass(
                              vendor.reliability_score
                            )}`}
                          >
                            {formatScore(
                              vendor.reliability_score
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`reliability-status-badge ${getStatusClass(
                              vendor.reliability_status
                            )}`}
                          >
                            {vendor.reliability_status ||
                              "N/A"}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="reliability-details-btn"
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
            className="reliability-modal-overlay"
            onClick={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                setSelectedVendor(
                  null
                );
              }
            }}
          >
            <div className="reliability-modal">
              <div className="reliability-modal-header">
                <div>
                  <span className="reliability-modal-eyebrow">
                    Vendor Reliability
                  </span>

                  <h2>
                    {selectedVendor.company_name ||
                      "Vendor"}
                  </h2>

                  <p>
                    Reliability evidence
                    and operational
                    indicators
                  </p>
                </div>

                <button
                  type="button"
                  className="reliability-modal-close"
                  onClick={() =>
                    setSelectedVendor(
                      null
                    )
                  }
                >
                  ×
                </button>
              </div>

              <div className="reliability-modal-body">
                <div className="reliability-modal-summary">
                  <div className="reliability-modal-summary-card">
                    <span>
                      Reliability Score
                    </span>

                    <strong
                      className={getScoreClass(
                        selectedVendor.reliability_score
                      )}
                    >
                      {formatScore(
                        selectedVendor.reliability_score
                      )}
                    </strong>

                    <small>
                      {selectedVendor.reliability_status ||
                        "N/A"}
                    </small>
                  </div>

                  <div className="reliability-modal-summary-card">
                    <span>
                      On-Time Rate
                    </span>

                    <strong>
                      {renderValue(
                        selectedVendor.on_time_rate,
                        "%"
                      )}
                    </strong>

                    <small>
                      Delivery consistency
                    </small>
                  </div>

                  <div className="reliability-modal-summary-card">
                    <span>
                      Quality Pass Rate
                    </span>

                    <strong>
                      {renderValue(
                        selectedVendor.quality_pass_rate,
                        "%"
                      )}
                    </strong>

                    <small>
                      Inspection outcomes
                    </small>
                  </div>
                </div>

                <div className="reliability-modal-grid">
                  <div className="reliability-detail-section">
                    <h3>
                      Delivery Reliability
                    </h3>

                    <div className="reliability-detail-item">
                      <span>
                        Total Deliveries
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.total_deliveries
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        On-Time Deliveries
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.on_time_deliveries
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Late Deliveries
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.late_deliveries
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Advance Deliveries
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.advance_deliveries
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Late Delivery Risk
                      </span>
                      <strong>
                        {formatScore(
                          selectedVendor.average_late_delivery_risk
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="reliability-detail-section">
                    <h3>
                      Quality Reliability
                    </h3>

                    <div className="reliability-detail-item">
                      <span>
                        Total Inspections
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.total_inspections
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Passed Inspections
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.passed_inspections
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Failed Inspections
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.failed_inspections
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Average Quality
                        Score
                      </span>
                      <strong>
                        {formatScore(
                          selectedVendor.average_quality_score
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Total Defects
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.total_defects
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="reliability-detail-section">
                    <h3>
                      Fulfillment Reliability
                    </h3>

                    <div className="reliability-detail-item">
                      <span>
                        Total Orders
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.total_orders
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Fulfilled Orders
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.fulfilled_orders
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Fulfillment Rate
                      </span>
                      <strong>
                        {renderValue(
                          selectedVendor.fulfillment_rate,
                          "%"
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Cancelled Orders
                      </span>
                      <strong>
                        {formatNumber(
                          selectedVendor.cancelled_orders
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="reliability-detail-section">
                    <h3>
                      Reliability Indicators
                    </h3>

                    <div className="reliability-detail-item">
                      <span>
                        Delivery Consistency
                      </span>
                      <strong>
                        {renderValue(
                          selectedVendor.delivery_consistency,
                          "%"
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Late Delivery Rate
                      </span>
                      <strong>
                        {renderValue(
                          selectedVendor.late_delivery_rate,
                          "%"
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Defect Rate
                      </span>
                      <strong>
                        {renderValue(
                          selectedVendor.defect_rate,
                          "%"
                        )}
                      </strong>
                    </div>

                    <div className="reliability-detail-item">
                      <span>
                        Reliability Status
                      </span>
                      <strong>
                        {selectedVendor.reliability_status ||
                          "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="reliability-modal-footer">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedVendor(
                      null
                    )
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default VendorReliability;