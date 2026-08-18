const API_BASE_URL = "http://127.0.0.1:8000";
let allVendors = [];
let charts = {};

async function loadVendorReliability() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendor-reliability`);
        const vendors = await response.json();

        if (!response.ok) {
            throw new Error(vendors?.error || "Failed to load reliability data");
        }

        allVendors = Array.isArray(vendors) ? vendors : [];
        
        // Calculate and populate KPI summary cards
        calculateKPIs();
        
        // Render charts
        renderCharts();

        // Render table
        filterAndRenderTable();
        
        // Setup filters
        document.getElementById("searchVendors").addEventListener("input", filterAndRenderTable);
        document.getElementById("filterRisk").addEventListener("change", filterAndRenderTable);
        document.getElementById("filterStatus").addEventListener("change", filterAndRenderTable);

    } catch (error) {
        console.error("Vendor reliability error:", error);
        const tbody = document.querySelector("#reliabilityTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="12" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error: ${error.message || "Unable to load vendor reliability data."}</td></tr>`;
        }
    }
}

function calculateKPIs() {
    const total = allVendors.length;
    let sumReliability = 0;
    let bestVendor = "N/A";
    let bestScore = -1;
    let highRiskCount = 0;

    allVendors.forEach(v => {
        const score = v.reliability_score ?? 0;
        sumReliability += score;
        
        if (score > bestScore) {
            bestScore = score;
            bestVendor = v.vendor_name;
        }

        const risk = v.risk_level || "";
        if (risk.toLowerCase().includes("high")) {
            highRiskCount++;
        }
    });

    const avg = total > 0 ? sumReliability / total : 0;

    document.getElementById("kpiTotalVendors").textContent = total;
    document.getElementById("kpiAverageReliability").textContent = `${avg.toFixed(2)}%`;
    document.getElementById("kpiBestVendor").textContent = total > 0 ? `${bestVendor} (${bestScore.toFixed(1)}%)` : "N/A";
    document.getElementById("kpiHighRiskVendors").textContent = highRiskCount;
}

function renderCharts() {
    // Destroy previous charts to allow clean resizing
    Object.keys(charts).forEach(key => {
        if (charts[key]) charts[key].destroy();
    });

    if (allVendors.length === 0) return;

    // 1. Reliability Horizontal Chart
    const sorted = [...allVendors].sort((a, b) => b.reliability_score - a.reliability_score);
    charts.ranking = new Chart(document.getElementById("rankingChart").getContext("2d"), {
        type: 'bar',
        data: {
            labels: sorted.map(v => v.vendor_name),
            datasets: [{
                label: 'Reliability Score (%)',
                data: sorted.map(v => v.reliability_score),
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { min: 0, max: 100 } }
        }
    });

    // 2. On-Time vs Late Grouped Bar Chart
    charts.delivery = new Chart(document.getElementById("deliveryComparisonChart").getContext("2d"), {
        type: 'bar',
        data: {
            labels: allVendors.map(v => v.vendor_name),
            datasets: [
                {
                    label: 'On-Time Orders',
                    data: allVendors.map(v => (v.total_orders - v.late_orders)),
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Late Orders',
                    data: allVendors.map(v => v.late_orders),
                    backgroundColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    // 3. Risk Distribution Doughnut Chart
    const riskCounts = { 'Low Risk': 0, 'Medium Risk': 0, 'High Risk': 0 };
    allVendors.forEach(v => {
        const risk = v.risk_level || "Medium Risk";
        if (risk.toLowerCase().includes("low")) riskCounts['Low Risk']++;
        else if (risk.toLowerCase().includes("high")) riskCounts['High Risk']++;
        else riskCounts['Medium Risk']++;
    });

    charts.risk = new Chart(document.getElementById("riskDistributionChart").getContext("2d"), {
        type: 'doughnut',
        data: {
            labels: Object.keys(riskCounts),
            datasets: [{
                data: Object.values(riskCounts),
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });

    // 4. Shipping vs Scheduled Comparison Bar Chart
    charts.shipping = new Chart(document.getElementById("shippingComparisonChart").getContext("2d"), {
        type: 'bar',
        data: {
            labels: allVendors.map(v => v.vendor_name),
            datasets: [
                {
                    label: 'Avg Shipping Days (Real)',
                    data: allVendors.map(v => v.average_shipping_days),
                    backgroundColor: '#3b82f6'
                },
                {
                    label: 'Avg Scheduled Days',
                    data: allVendors.map(v => v.average_scheduled_days),
                    backgroundColor: '#94a3b8'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function filterAndRenderTable() {
    const searchVal = document.getElementById("searchVendors").value.toLowerCase();
    const riskFilter = document.getElementById("filterRisk").value;
    const statusFilter = document.getElementById("filterStatus").value;

    const filtered = allVendors.filter(v => {
        const nameMatch = v.vendor_name.toLowerCase().includes(searchVal);
        const risk = v.risk_level || "Medium Risk";
        const riskMatch = riskFilter === "" || risk.toLowerCase().includes(riskFilter.toLowerCase());
        const statusMatch = statusFilter === "" || (v.reliability_status || "").toLowerCase() === statusFilter.toLowerCase();
        return nameMatch && riskMatch && statusMatch;
    });

    const tbody = document.querySelector("#reliabilityTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="empty-state-wrapper">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No matching vendors found</div>
            <p>Adjust your search query or filters.</p>
        </td></tr>`;
        return;
    }

    filtered.forEach(vendor => {
        const risk = vendor.risk_level || "Medium Risk";
        let riskClass = "badge-neutral";
        if (risk.toLowerCase().includes("high")) riskClass = "badge-poor";
        else if (risk.toLowerCase().includes("low")) riskClass = "badge-active";
        else if (risk.toLowerCase().includes("medium")) riskClass = "badge-pending";

        const status = vendor.reliability_status || "Average";
        let statusClass = "badge-neutral";
        if (status.toLowerCase() === "good") statusClass = "badge-active";
        else if (status.toLowerCase() === "poor") statusClass = "badge-poor";
        else if (status.toLowerCase() === "average") statusClass = "badge-pending";

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">${vendor.vendor_name}</td>
                <td>${vendor.total_orders}</td>
                <td>${vendor.late_orders}</td>
                <td>${vendor.average_shipping_days.toFixed(2)}</td>
                <td>${vendor.average_scheduled_days.toFixed(2)}</td>
                <td style="font-weight: 500;">₹${vendor.total_sales.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="color: var(--success-color); font-weight: 500;">${vendor.on_time_rate.toFixed(1)}%</td>
                <td style="color: var(--danger-color); font-weight: 500;">${vendor.late_delivery_rate.toFixed(1)}%</td>
                <td style="font-weight: 600;">${vendor.reliability_score.toFixed(1)}%</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td><span class="badge ${riskClass}">${risk}</span></td>
                <td style="font-style: italic; color: var(--text-secondary);">${vendor.recommendation ?? "N/A"}</td>
            </tr>
        `;
    });
}

// Load on DOM ready
document.addEventListener("DOMContentLoaded", loadVendorReliability);