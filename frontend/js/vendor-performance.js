let reliabilityChart = null;
let historyChart = null;

async function loadVendorPerformance() {
    try {
        const response = await fetch("http://127.0.0.1:8000/vendor-performance");

        if (!response.ok) {
            console.error("Vendor Performance API error:", response.status, response.statusText);
            return;
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error("Vendor Performance API returned unexpected data:", data);
            return;
        }

        data.sort((a, b) => Number(b.reliability_score || 0) - Number(a.reliability_score || 0));

        const totalVendors = data.length;
        const totalOrders = data.reduce((sum, vendor) => sum + Number(vendor.total_orders || 0), 0);
        const completedOrders = data.reduce((sum, vendor) => sum + Number(vendor.completed_orders || 0), 0);
        const activeVendors = data.filter(
    vendor => Number(vendor.total_orders || 0) > 0
);

const averageReliability =
    activeVendors.length > 0
        ? activeVendors.reduce(
            (sum, vendor) =>
                sum + Number(vendor.reliability_score || 0),
            0
        ) / activeVendors.length
        : 0;
        document.getElementById("totalVendors").textContent = totalVendors;
        document.getElementById("totalOrders").textContent = totalOrders;
        document.getElementById("completedOrders").textContent = completedOrders;
        document.getElementById("averageReliability").textContent = averageReliability.toFixed(2);

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

function renderPerformanceTable(data) {
    const table = document.getElementById("performanceTable");
    if (!table) {
        console.error("performanceTable element not found");
        return;
    }

    table.innerHTML = "";

    data.forEach((vendor, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${vendor.vendor_name || "-"}</td>
            <td>${vendor.total_orders ?? 0}</td>
            <td>${vendor.completed_orders ?? 0}</td>
            <td>${vendor.pending_orders ?? 0}</td>
            <td>${vendor.ordered_orders ?? 0}</td>
            <td>${vendor.delivered_orders ?? 0}</td>
            <td>${Number(vendor.quality_score || 0).toFixed(2)}</td>
            <td>${Number(vendor.delivery_rate || 0).toFixed(2)}%</td>
            <td>${Number(vendor.reliability_score || 0).toFixed(2)}</td>
            <td>${vendor.performance || "-"}</td>
            <td>${vendor.risk || "-"}</td>
            <td>${vendor.recommendation || "-"}</td>
        `;

        table.appendChild(row);
    });
}

function renderVendorSelect(data) {
    const vendorSelect = document.getElementById("vendorSelect");
    const vendorDetails = document.getElementById("vendorDetails");

    if (!vendorSelect) {
        return;
    }

    vendorSelect.innerHTML = `<option value="">Select Vendor</option>`;

    data.forEach((vendor) => {
        const option = document.createElement("option");
        option.value = vendor.vendor_id;
        option.textContent = vendor.vendor_name;
        vendorSelect.appendChild(option);
    });

    vendorSelect.onchange = function () {
        const selectedId = Number(this.value);
        const vendor = data.find((v) => Number(v.vendor_id) === selectedId);

        if (!vendor) {
            if (vendorDetails) {
                vendorDetails.innerHTML = "";
            }
            return;
        }

        if (vendorDetails) {
            vendorDetails.innerHTML = `
                <div class="card">
                    <h2>${vendor.vendor_name}</h2>
                    <p><strong>Total Orders:</strong> ${vendor.total_orders ?? 0}</p>
                    <p><strong>Completed Orders:</strong> ${vendor.completed_orders ?? 0}</p>
                    <p><strong>Pending Orders:</strong> ${vendor.pending_orders ?? 0}</p>
                    <p><strong>Ordered Orders:</strong> ${vendor.ordered_orders ?? 0}</p>
                    <p><strong>Delivered Orders:</strong> ${vendor.delivered_orders ?? 0}</p>
                    <p><strong>Quality Score:</strong> ${Number(vendor.quality_score || 0).toFixed(2)}</p>
                    <p><strong>Delivery Rate:</strong> ${Number(vendor.delivery_rate || 0).toFixed(2)}%</p>
                    <p><strong>Reliability Score:</strong> ${Number(vendor.reliability_score || 0).toFixed(2)}</p>
                    <p><strong>Performance:</strong> ${vendor.performance || "-"}</p>
                    <p><strong>Risk:</strong> ${vendor.risk || "-"}</p>
                    <p><strong>Recommendation:</strong> ${vendor.recommendation || "-"}</p>
                </div>
            `;
        }
    };
}

function renderHistoryVendorSelect(data) {
    const historyVendorSelect = document.getElementById("historyVendorSelect");

    if (!historyVendorSelect) {
        return;
    }

    historyVendorSelect.innerHTML = `<option value="">Select Vendor</option>`;

    data.forEach((vendor) => {
        const option = document.createElement("option");
        option.value = vendor.vendor_id;
        option.textContent = vendor.vendor_name;
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

    const lowRiskElement =
        document.getElementById("lowRiskVendors");

    const mediumRiskElement =
        document.getElementById("mediumRiskVendors");

    const highRiskElement =
        document.getElementById("highRiskVendors");

    if (lowRiskElement) {
        lowRiskElement.textContent = lowRisk;
    }

    if (mediumRiskElement) {
        mediumRiskElement.textContent = mediumRisk;
    }

    if (highRiskElement) {
        highRiskElement.textContent = highRisk;
    }
}

function renderRiskAlerts(data) {
    const riskAlerts = document.getElementById("riskAlerts");

    if (!riskAlerts) {
        return;
    }

    riskAlerts.innerHTML = "";

    // Show only actual risk vendors.
    const alerts = data.filter(
        vendor =>
            vendor.risk === "Low Risk" ||
            vendor.risk === "Medium Risk" ||
            vendor.risk === "High Risk"
    );

    const activeAlerts = alerts.filter(
        vendor => vendor.risk !== "Low Risk"
    );

    if (activeAlerts.length === 0) {
        riskAlerts.innerHTML = `
            <div class="card">
                <h3>No Active Risk Alerts</h3>
                <p>
                    All vendors with available performance data
                    are currently within acceptable limits.
                </p>
            </div>
        `;
        return;
    }

    activeAlerts.forEach(vendor => {
        const alert = document.createElement("div");

        alert.className = "card";

        alert.innerHTML = `
            <h3>${vendor.vendor_name}</h3>

            <p>
                <strong>Risk:</strong>
                ${vendor.risk}
            </p>

            <p>
                <strong>Reliability Score:</strong>
                ${Number(
                    vendor.reliability_score || 0
                ).toFixed(2)}
            </p>

            <p>
                <strong>Delivery Rate:</strong>
                ${Number(
                    vendor.delivery_rate || 0
                ).toFixed(2)}%
            </p>

            <p>
                <strong>Recommendation:</strong>
                ${vendor.recommendation || "-"}
            </p>
        `;

        riskAlerts.appendChild(alert);
    });
}

function renderReliabilityChart(data) {
    const chartCanvas = document.getElementById("reliabilityChart");
    if (!chartCanvas || typeof Chart === "undefined") {
        return;
    }

    if (reliabilityChart) {
        reliabilityChart.destroy();
    }

    const labels = data.map((vendor) => vendor.vendor_name || "");
    const values = data.map((vendor) => Number(vendor.reliability_score || 0));

    reliabilityChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Reliability Score",
                    data: values,
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                },
            },
        },
    });
}

function clearHistoryTable() {
    const tableBody = document.getElementById("historyTableBody");
    if (tableBody) {
        tableBody.innerHTML = "";
    }
}

async function loadVendorHistory(vendorId) {
    if (!vendorId) {
        clearHistoryTable();
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:8000/vendor-performance-history/${vendorId}`);

        if (!response.ok) {
            console.error("Vendor Performance History API error:", response.status, response.statusText);
            return;
        }

        const history = await response.json();

        if (!Array.isArray(history)) {
            console.error("Vendor Performance History returned unexpected data:", history);
            return;
        }

        const tableBody = document.getElementById("historyTableBody");
        if (!tableBody) {
            console.error("historyTableBody element not found");
            return;
        }

        tableBody.innerHTML = "";

        const labels = [];
        const reliabilityValues = [];
        const qualityValues = [];
        const deliveryValues = [];

        history.forEach((item) => {
            const date = new Date(item.recorded_date);
            const monthLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

            labels.push(monthLabel);
            reliabilityValues.push(Number(item.reliability_score || 0));
            qualityValues.push(Number(item.quality_score || 0));
            deliveryValues.push(Number(item.delivery_rate || 0));

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${monthLabel}</td>
                <td>${Number(item.quality_score || 0).toFixed(2)}</td>
                <td>${Number(item.delivery_rate || 0).toFixed(2)}%</td>
                <td>${Number(item.reliability_score || 0).toFixed(2)}</td>
            `;
            tableBody.appendChild(row);
        });

        const canvas = document.getElementById("historyChart");
        if (!canvas) {
            console.error("historyChart element not found");
            return;
        }

        if (historyChart) {
            historyChart.destroy();
        }

        historyChart = new Chart(canvas, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Reliability Score",
                        data: reliabilityValues,
                        borderColor: "rgba(75, 192, 192, 1)",
                        backgroundColor: "rgba(75, 192, 192, 0.2)",
                        tension: 0.3,
                    },
                    {
                        label: "Quality Score",
                        data: qualityValues,
                        borderColor: "rgba(153, 102, 255, 1)",
                        backgroundColor: "rgba(153, 102, 255, 0.2)",
                        tension: 0.3,
                    },
                    {
                        label: "Delivery Rate",
                        data: deliveryValues,
                        borderColor: "rgba(255, 159, 64, 1)",
                        backgroundColor: "rgba(255, 159, 64, 0.2)",
                        tension: 0.3,
                    },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                    },
                },
            },
        });
    } catch (error) {
        console.error("Vendor History Error:", error);
    }
}

loadVendorPerformance();
