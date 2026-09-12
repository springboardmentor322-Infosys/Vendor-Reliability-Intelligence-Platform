let reliabilityChart = null;
let historyChart = null;
let showAllMediumRisk = false;
let cachedVendorData = [];

function getAuthHeader() {
    const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function loadVendorPerformance() {
    try {
        const headers = getAuthHeader();
        const response = await fetch("http://127.0.0.1:8000/vendor-performance", { headers });

        if (response.status === 401) {
            console.warn("Unauthorized request to /vendor-performance. Redirecting to login...");
            if (typeof logout === "function") {
                logout();
            } else {
                window.location.replace("login.html");
            }
            return;
        }

        if (!response.ok) {
            console.error("Vendor Performance API error:", response.status, response.statusText);
            return;
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error("Vendor Performance API returned unexpected data:", data);
            return;
        }

        cachedVendorData = data;

        // Sort descending by reliability score
        data.sort((a, b) => Number(b.reliability_score || 0) - Number(a.reliability_score || 0));

        const totalVendors = data.length;
        const totalOrders = data.reduce((sum, vendor) => sum + Number(vendor.total_orders || 0), 0);
        const completedOrders = data.reduce((sum, vendor) => sum + Number(vendor.completed_orders || 0), 0);
        const activeVendors = data.filter(vendor => Number(vendor.total_orders || 0) > 0);

        const averageReliability = activeVendors.length > 0
            ? activeVendors.reduce((sum, vendor) => sum + Number(vendor.reliability_score || 0), 0) / activeVendors.length
            : 0;

        const totalVendorsEl = document.getElementById("totalVendors");
        const totalOrdersEl = document.getElementById("totalOrders");
        const completedOrdersEl = document.getElementById("completedOrders");
        const averageReliabilityEl = document.getElementById("averageReliability");

        if (totalVendorsEl) totalVendorsEl.textContent = totalVendors.toLocaleString();
        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders.toLocaleString();
        if (completedOrdersEl) completedOrdersEl.textContent = completedOrders.toLocaleString();
        if (averageReliabilityEl) averageReliabilityEl.textContent = `${averageReliability.toFixed(2)}%`;

        renderPerformanceTable(data);
        renderVendorSelect(data);
        renderHistoryVendorSelect(data);
        renderRiskSummary(data);
        renderRiskAlerts(data);
        renderTopVendor(data);
        renderReliabilityChart(data);

    } catch (error) {
        console.error("Vendor Performance Error:", error);
    }
}

// --------------------------------------------------
// 1. TOP PERFORMING VENDOR
// --------------------------------------------------
function renderTopVendor(data) {
    const topNameEl = document.getElementById("topVendorName");
    const topRelEl = document.getElementById("topVendorReliability");
    const topPerfEl = document.getElementById("topVendorPerformance");
    const topRiskEl = document.getElementById("topVendorRisk");
    const topRecEl = document.getElementById("topVendorRecommendation");

    if (!topNameEl) return;

    // Filter to active vendors that have placed orders
    const activeVendors = data.filter(v => Number(v.total_orders || 0) > 0);

    if (activeVendors.length === 0) {
        topNameEl.textContent = "No Active Vendors";
        if (topRelEl) topRelEl.textContent = "0.00%";
        if (topPerfEl) topPerfEl.textContent = "-";
        if (topRiskEl) topRiskEl.textContent = "-";
        if (topRecEl) topRecEl.textContent = "-";
        return;
    }

    // Active vendors are already sorted descending by reliability_score
    const topVendor = activeVendors[0];

    topNameEl.textContent = topVendor.vendor_name || `Vendor #${topVendor.vendor_id}`;
    if (topRelEl) topRelEl.textContent = `${Number(topVendor.reliability_score || 0).toFixed(2)}%`;
    if (topPerfEl) topPerfEl.textContent = topVendor.performance || "Excellent";
    
    if (topRiskEl) {
        const riskClass = topVendor.risk === "Low Risk" ? "badge badge-low" :
                          topVendor.risk === "Medium Risk" ? "badge badge-medium" : "badge badge-high";
        topRiskEl.innerHTML = `<span class="${riskClass}">${topVendor.risk || "Low Risk"}</span>`;
    }

    if (topRecEl) {
        topRecEl.textContent = topVendor.recommendation || "Preferred Vendor";
    }
}

function renderPerformanceTable(data) {
    const table = document.getElementById("performanceTable");
    if (!table) return;

    table.innerHTML = "";

    data.forEach((vendor, index) => {
        const row = document.createElement("tr");

        const riskBadge = vendor.risk === "Low Risk" ? `<span class="badge badge-low">Low Risk</span>` :
                          vendor.risk === "Medium Risk" ? `<span class="badge badge-medium">Medium Risk</span>` :
                          `<span class="badge badge-high">${vendor.risk || "High Risk"}</span>`;

        row.innerHTML = `
            <td>${index + 1}</td>
            <td style="text-align:left; font-weight:500;">${vendor.vendor_name || "-"}</td>
            <td><strong>${(vendor.total_orders ?? 0).toLocaleString()}</strong></td>
            <td>${(vendor.completed_orders ?? 0).toLocaleString()}</td>
            <td>${(vendor.pending_orders ?? 0).toLocaleString()}</td>
            <td>${(vendor.ordered_orders ?? 0).toLocaleString()}</td>
            <td>${(vendor.delivered_orders ?? 0).toLocaleString()}</td>
            <td>${(vendor.cancelled_orders ?? 0).toLocaleString()}</td>
            <td>${Number(vendor.quality_score || 0).toFixed(2)}%</td>
            <td>${Number(vendor.delivery_rate || 0).toFixed(2)}%</td>
            <td><strong>${Number(vendor.reliability_score || 0).toFixed(2)}%</strong></td>
            <td>${vendor.performance || "-"}</td>
            <td>${riskBadge}</td>
            <td>${vendor.recommendation || "-"}</td>
        `;

        table.appendChild(row);
    });
}

function renderVendorSelect(data) {
    const vendorSelect = document.getElementById("vendorSelect");
    const vendorDetails = document.getElementById("vendorDetails");

    if (!vendorSelect) return;

    vendorSelect.innerHTML = `<option value="">Select Vendor to View Detailed Profile...</option>`;

    data.forEach((vendor) => {
        const option = document.createElement("option");
        option.value = vendor.vendor_id;
        option.textContent = `${vendor.vendor_name} (Reliability: ${Number(vendor.reliability_score || 0).toFixed(1)}%)`;
        vendorSelect.appendChild(option);
    });

    vendorSelect.onchange = function () {
        const selectedId = Number(this.value);
        const vendor = data.find((v) => Number(v.vendor_id) === selectedId);

        if (!vendor) {
            if (vendorDetails) {
                vendorDetails.innerHTML = `<div class="empty-state-box">Select a vendor from the dropdown above to view detailed metrics.</div>`;
            }
            return;
        }

        if (vendorDetails) {
            const riskClass = vendor.risk === "Low Risk" ? "badge badge-low" :
                              vendor.risk === "Medium Risk" ? "badge badge-medium" : "badge badge-high";

            vendorDetails.innerHTML = `
                <div class="card" style="margin-bottom:20px; border-top: 4px solid #3b82f6;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h2 style="margin:0;">${vendor.vendor_name}</h2>
                        <span class="${riskClass}">${vendor.risk || "-"}</span>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
                        <div>
                            <p style="font-size:13px; color:#6b7280; margin:0;">Total Orders</p>
                            <p style="font-size:22px; font-weight:bold; margin:2px 0;">${(vendor.total_orders ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p style="font-size:13px; color:#6b7280; margin:0;">Reliability Score</p>
                            <p style="font-size:22px; font-weight:bold; color:#2563eb; margin:2px 0;">${Number(vendor.reliability_score || 0).toFixed(2)}%</p>
                        </div>
                        <div>
                            <p style="font-size:13px; color:#6b7280; margin:0;">Performance Level</p>
                            <p style="font-size:20px; font-weight:bold; margin:2px 0;">${vendor.performance || "-"}</p>
                        </div>
                    </div>
                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #e5e7eb;" />
                    <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:10px; text-align:center; background:#f9fafb; padding:12px; border-radius:8px;">
                        <div>
                            <small style="color:#6b7280;">Completed</small>
                            <div style="font-weight:bold; font-size:16px;">${(vendor.completed_orders ?? 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <small style="color:#6b7280;">Delivered</small>
                            <div style="font-weight:bold; font-size:16px;">${(vendor.delivered_orders ?? 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <small style="color:#6b7280;">Pending</small>
                            <div style="font-weight:bold; font-size:16px;">${(vendor.pending_orders ?? 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <small style="color:#6b7280;">Ordered</small>
                            <div style="font-weight:bold; font-size:16px;">${(vendor.ordered_orders ?? 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <small style="color:#6b7280;">Cancelled</small>
                            <div style="font-weight:bold; font-size:16px;">${(vendor.cancelled_orders ?? 0).toLocaleString()}</div>
                        </div>
                    </div>
                    <div style="margin-top:15px; display:flex; justify-content:space-between; font-size:14px;">
                        <span><strong>Quality Score:</strong> ${Number(vendor.quality_score || 0).toFixed(2)}%</span>
                        <span><strong>Delivery Rate:</strong> ${Number(vendor.delivery_rate || 0).toFixed(2)}%</span>
                        <span><strong>Recommendation:</strong> <strong>${vendor.recommendation || "-"}</strong></span>
                    </div>
                </div>
            `;
        }
    };
}

function renderHistoryVendorSelect(data) {
    const historyVendorSelect = document.getElementById("historyVendorSelect");
    if (!historyVendorSelect) return;

    historyVendorSelect.innerHTML = `<option value="">Select Vendor to View Performance Trend...</option>`;

    data.forEach((vendor) => {
        const option = document.createElement("option");
        option.value = vendor.vendor_id;
        option.textContent = `${vendor.vendor_name} (ID: ${vendor.vendor_id})`;
        historyVendorSelect.appendChild(option);
    });

    historyVendorSelect.onchange = function () {
        if (!this.value) {
            clearHistoryTable();
            return;
        }
        loadVendorHistory(this.value);
    };
}

function renderRiskSummary(data) {
    let lowRisk = 0;
    let mediumRisk = 0;
    let highRisk = 0;

    data.forEach(vendor => {
        if (vendor.risk === "Low Risk") {
            lowRisk++;
        } else if (vendor.risk === "Medium Risk") {
            mediumRisk++;
        } else if (vendor.risk === "High Risk") {
            highRisk++;
        }
    });

    const lowEl = document.getElementById("lowRiskVendors");
    const medEl = document.getElementById("mediumRiskVendors");
    const highEl = document.getElementById("highRiskVendors");

    if (lowEl) lowEl.textContent = lowRisk;
    if (medEl) medEl.textContent = mediumRisk;
    if (highEl) highEl.textContent = highRisk;
}

function renderRiskAlerts(data) {
    const riskAlerts = document.getElementById("riskAlerts");
    if (!riskAlerts) return;

    riskAlerts.innerHTML = "";

    const highRisk = data.filter(v => v.risk === "High Risk");
    const mediumRisk = data
        .filter(v => v.risk === "Medium Risk")
        .sort((a, b) => Number(a.reliability_score || 0) - Number(b.reliability_score || 0));

    if (highRisk.length === 0 && mediumRisk.length === 0) {
        riskAlerts.innerHTML = `
            <div class="card">
                <h3>No Active Risk Alerts</h3>
                <p>All active vendors are currently within acceptable reliability thresholds.</p>
            </div>
        `;
        return;
    }

    // High Risk Section (ALWAYS SHOW ALL HIGH RISK VENDORS)
    if (highRisk.length > 0) {
        const hrContainer = document.createElement("div");
        hrContainer.style.marginBottom = "20px";
        hrContainer.innerHTML = `<h3 style="color: #b91c1c; margin-bottom: 12px;">🚨 Critical Attention: High Risk Vendors (${highRisk.length})</h3>`;
        
        highRisk.forEach(vendor => {
            const card = document.createElement("div");
            card.className = "card";
            card.style.borderLeft = "5px solid #dc2626";
            card.style.marginBottom = "10px";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0;">${vendor.vendor_name}</h3>
                    <span class="badge badge-high">High Risk</span>
                </div>
                <p style="font-size:14px; margin-top:8px; color:#374151;">
                    <strong>Reliability Score:</strong> ${Number(vendor.reliability_score || 0).toFixed(2)}% |
                    <strong>Delivery Rate:</strong> ${Number(vendor.delivery_rate || 0).toFixed(2)}% |
                    <strong>Total Orders:</strong> ${vendor.total_orders ?? 0} |
                    <strong>Recommendation:</strong> <span style="color:#b91c1c; font-weight:600;">${vendor.recommendation || "Review Vendor"}</span>
                </p>
            `;
            hrContainer.appendChild(card);
        });
        riskAlerts.appendChild(hrContainer);
    }

    // Medium Risk Section (Capped at top 6 most critical, with toggle button)
    if (mediumRisk.length > 0) {
        const mrContainer = document.createElement("div");
        const displayedMedium = showAllMediumRisk ? mediumRisk : mediumRisk.slice(0, 6);

        mrContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="color: #d97706; margin:0;">
                    ⚠️ Priority Monitoring: Medium Risk Vendors 
                    <span style="font-size:14px; font-weight:normal; color:#6b7280;">(Showing ${displayedMedium.length} of ${mediumRisk.length})</span>
                </h3>
                <button class="btn-toggle" id="toggleAlertsBtn" onclick="toggleRiskAlertsView()">
                    ${showAllMediumRisk ? "Show Top 6 Only" : `View All Alerts (${mediumRisk.length})`}
                </button>
            </div>
        `;

        displayedMedium.forEach(vendor => {
            const card = document.createElement("div");
            card.className = "card";
            card.style.borderLeft = "5px solid #f59e0b";
            card.style.marginBottom = "10px";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0;">${vendor.vendor_name}</h3>
                    <span class="badge badge-medium">Medium Risk</span>
                </div>
                <p style="font-size:14px; margin-top:8px; color:#374151;">
                    <strong>Reliability Score:</strong> ${Number(vendor.reliability_score || 0).toFixed(2)}% |
                    <strong>Delivery Rate:</strong> ${Number(vendor.delivery_rate || 0).toFixed(2)}% |
                    <strong>Total Orders:</strong> ${vendor.total_orders ?? 0} |
                    <strong>Recommendation:</strong> <span style="color:#d97706; font-weight:600;">${vendor.recommendation || "Monitor Vendor"}</span>
                </p>
            `;
            mrContainer.appendChild(card);
        });

        riskAlerts.appendChild(mrContainer);
    }
}

window.toggleRiskAlertsView = function() {
    showAllMediumRisk = !showAllMediumRisk;
    renderRiskAlerts(cachedVendorData);
};

// --------------------------------------------------
// 2. RELIABILITY CHART (TOP 10 MULTI-METRIC)
// --------------------------------------------------
function renderReliabilityChart(data) {
    const chartCanvas = document.getElementById("reliabilityChart");
    if (!chartCanvas || typeof Chart === "undefined") {
        return;
    }

    if (reliabilityChart) {
        reliabilityChart.destroy();
    }

    // Display Top 10 ranked active vendors
    const activeVendors = data.filter(v => Number(v.total_orders || 0) > 0);
    const top10 = activeVendors.slice(0, 10);

    const labels = top10.map(v => v.vendor_name || `Vendor ${v.vendor_id}`);
    const reliabilityData = top10.map(v => Number(v.reliability_score || 0));
    const qualityData = top10.map(v => Number(v.quality_score || 0));
    const deliveryData = top10.map(v => Number(v.delivery_rate || 0));

    reliabilityChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Reliability Score (%)",
                    data: reliabilityData,
                    backgroundColor: "rgba(59, 130, 246, 0.75)",
                    borderColor: "rgba(37, 99, 235, 1)",
                    borderWidth: 1
                },
                {
                    label: "Quality Score (%)",
                    data: qualityData,
                    backgroundColor: "rgba(16, 185, 129, 0.75)",
                    borderColor: "rgba(5, 150, 105, 1)",
                    borderWidth: 1
                },
                {
                    label: "Delivery Rate (%)",
                    data: deliveryData,
                    backgroundColor: "rgba(245, 158, 11, 0.75)",
                    borderColor: "rgba(217, 119, 6, 1)",
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "Top 10 Performing Vendors — Multi-Metric Reliability Comparison"
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: "Score / Rate (%)"
                    }
                },
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 20
                    }
                }
            }
        }
    });
}

// --------------------------------------------------
// 3. PERFORMANCE HISTORY CHART & TABLE (GENUINE EMPTY STATE)
// --------------------------------------------------
function clearHistoryTable() {
    const tableBody = document.getElementById("historyTableBody");
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-state-box">Select a vendor above to inspect historical performance data.</td></tr>`;
    }
    const emptyNotice = document.getElementById("historyEmptyNotice");
    if (emptyNotice) {
        emptyNotice.style.display = "none";
    }
    const chartContainer = document.getElementById("historyChartContainer");
    if (chartContainer) {
        chartContainer.style.display = "block";
    }
    if (historyChart) {
        historyChart.destroy();
        historyChart = null;
    }
}

async function loadVendorHistory(vendorId) {
    if (!vendorId) {
        clearHistoryTable();
        return;
    }

    try {
        const headers = getAuthHeader();
        const response = await fetch(`http://127.0.0.1:8000/vendor-performance-history/${vendorId}`, { headers });

        if (!response.ok) {
            console.error("Vendor Performance History API error:", response.status, response.statusText);
            return;
        }

        const history = await response.json();

        const tableBody = document.getElementById("historyTableBody");
        const emptyNotice = document.getElementById("historyEmptyNotice");
        const chartContainer = document.getElementById("historyChartContainer");

        if (!Array.isArray(history) || history.length === 0) {
            // Genuine empty state: no historical logs exist for this vendor
            if (historyChart) {
                historyChart.destroy();
                historyChart = null;
            }
            if (chartContainer) {
                chartContainer.style.display = "none";
            }
            if (emptyNotice) {
                emptyNotice.style.display = "block";
                emptyNotice.textContent = "No historical performance data is currently available for this vendor.";
            }
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="4" class="empty-state-box">No historical performance data is currently available for this vendor.</td></tr>`;
            }
            return;
        }

        // Genuine history records exist (e.g. Vendor 24)
        if (emptyNotice) {
            emptyNotice.style.display = "none";
        }
        if (chartContainer) {
            chartContainer.style.display = "block";
        }

        if (tableBody) {
            tableBody.innerHTML = "";
        }

        const labels = [];
        const reliabilityValues = [];
        const qualityValues = [];
        const deliveryValues = [];

        history.forEach((item) => {
            const date = new Date(item.recorded_date);
            const dateLabel = isNaN(date.getTime())
                ? item.recorded_date
                : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

            labels.push(dateLabel);
            reliabilityValues.push(Number(item.reliability_score || 0));
            qualityValues.push(Number(item.quality_score || 0));
            deliveryValues.push(Number(item.delivery_rate || 0));

            if (tableBody) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><strong>${dateLabel}</strong></td>
                    <td>${Number(item.quality_score || 0).toFixed(2)}%</td>
                    <td>${Number(item.delivery_rate || 0).toFixed(2)}%</td>
                    <td><strong>${Number(item.reliability_score || 0).toFixed(2)}%</strong></td>
                `;
                tableBody.appendChild(row);
            }
        });

        const canvas = document.getElementById("historyChart");
        if (!canvas || typeof Chart === "undefined") return;

        if (historyChart) {
            historyChart.destroy();
        }

        historyChart = new Chart(canvas, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Reliability Score (%)",
                        data: reliabilityValues,
                        borderColor: "rgba(59, 130, 246, 1)",
                        backgroundColor: "rgba(59, 130, 246, 0.15)",
                        tension: 0.25,
                        fill: true
                    },
                    {
                        label: "Quality Score (%)",
                        data: qualityValues,
                        borderColor: "rgba(16, 185, 129, 1)",
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        tension: 0.25,
                        fill: false
                    },
                    {
                        label: "Delivery Rate (%)",
                        data: deliveryValues,
                        borderColor: "rgba(245, 158, 11, 1)",
                        backgroundColor: "rgba(245, 158, 11, 0.15)",
                        tension: 0.25,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: "Percentage (%)" }
                    }
                }
            }
        });

    } catch (error) {
        console.error("Vendor History Error:", error);
    }
}

// Initial load
document.addEventListener("DOMContentLoaded", () => {
    if (typeof checkPageProtection === "function") {
        checkPageProtection();
    }
    loadVendorPerformance();
});

// Fallback execution if DOM is already ready
if (document.readyState === "complete" || document.readyState === "interactive") {
    loadVendorPerformance();
}
