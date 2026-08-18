const API_BASE_URL = "http://127.0.0.1:8000";
let allContracts = [];
let charts = {};

async function loadContractMonitoring() {
    try {
        const response = await fetch(`${API_BASE_URL}/contract-monitoring`);
        const contracts = await response.json();

        if (!Array.isArray(contracts)) {
            throw new Error(contracts?.error || "Failed to load contract monitoring data");
        }

        allContracts = contracts;

        // Calculate and render summary counters
        calculateKPIs();

        // Render charts
        renderCharts();

        // Render table
        filterAndRenderTable();

        // Bind filter event listeners
        document.getElementById("searchMonitoring").addEventListener("input", filterAndRenderTable);
        document.getElementById("filterMonitoringStatus").addEventListener("change", filterAndRenderTable);

    } catch (error) {
        console.error("Contract Monitoring Error:", error);
        const tbody = document.getElementById("contractTableBody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error: ${error.message || "Unable to load monitoring data."}</td></tr>`;
        }
    }
}

function calculateKPIs() {
    const total = allContracts.length;
    let active = 0;
    let expiring = 0;
    let expired = 0;

    allContracts.forEach(c => {
        const dbStatus = (c.status || "").toLowerCase();
        const mStatus = c.monitoring_status;

        if (dbStatus === "expired" || mStatus === "Expired") {
            expired++;
        } else if (dbStatus === "active") {
            active++;
            if (mStatus === "Expiring Soon" || mStatus === "Renewal Due Soon") {
                expiring++;
            }
        }
    });

    document.getElementById("totalContracts").textContent = total;
    document.getElementById("activeContracts").textContent = active;
    document.getElementById("expiringContracts").textContent = expiring;
    document.getElementById("expiredContracts").textContent = expired;
}

function renderCharts() {
    Object.keys(charts).forEach(key => {
        if (charts[key]) charts[key].destroy();
    });

    if (allContracts.length === 0) return;

    // 1. Status Distribution
    const counts = { 'Active': 0, 'Renewal Due Soon': 0, 'Expiring Soon': 0, 'Expired': 0 };
    allContracts.forEach(c => {
        if (counts[c.monitoring_status] !== undefined) {
            counts[c.monitoring_status]++;
        }
    });

    charts.status = new Chart(document.getElementById("statusChart").getContext("2d"), {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // 2. Contracts by Vendor
    const vendorCounts = {};
    allContracts.forEach(c => {
        const name = c.vendor_name || "Unknown";
        vendorCounts[name] = (vendorCounts[name] || 0) + 1;
    });

    charts.vendor = new Chart(document.getElementById("vendorChart").getContext("2d"), {
        type: 'bar',
        data: {
            labels: Object.keys(vendorCounts),
            datasets: [{
                label: 'Active Contracts',
                data: Object.values(vendorCounts),
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function filterAndRenderTable() {
    const searchVal = document.getElementById("searchMonitoring").value.toLowerCase();
    const statusFilter = document.getElementById("filterMonitoringStatus").value;

    const filtered = allContracts.filter(c => {
        const nameMatch = (c.contract_name || "").toLowerCase().includes(searchVal) || 
                          (c.vendor_name || "").toLowerCase().includes(searchVal);
        const statusMatch = statusFilter === "" || c.monitoring_status === statusFilter;
        return nameMatch && statusMatch;
    });

    const tbody = document.getElementById("contractTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state-wrapper">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No monitored contracts found</div>
            <p>Modify search term or monitoring filters.</p>
        </td></tr>`;
        return;
    }

    filtered.forEach(c => {
        let statusClass = "badge-neutral";
        const mStatus = c.monitoring_status || "Active";
        if (mStatus === "Active") statusClass = "badge-active";
        else if (mStatus === "Renewal Due Soon") statusClass = "badge-pending";
        else if (mStatus === "Expiring Soon") statusClass = "badge-warning";
        else if (mStatus === "Expired") statusClass = "badge-poor";

        let dayClass = "";
        const days = c.remaining_days;
        if (days < 0) dayClass = "color: var(--danger-color); font-weight: 700;";
        else if (days <= 7) dayClass = "color: var(--danger-color); font-weight: 600;";
        else if (days <= 30) dayClass = "color: var(--warning-color); font-weight: 600;";

        tbody.innerHTML += `
        <tr>
            <td style="font-weight: 600;">${c.vendor_name}</td>
            <td style="font-weight: 500;">${c.contract_name}</td>
            <td>${c.start_date}</td>
            <td>${c.end_date}</td>
            <td style="${dayClass}">${days} days</td>
            <td><span class="badge badge-neutral">${c.status}</span></td>
            <td><span class="badge ${statusClass}">${c.monitoring_status}</span></td>
            <td style="font-style: italic; color: var(--text-secondary);">${c.recommendation}</td>
        </tr>
        `;
    });

    // Render alert panels
    renderAlerts(filtered);
}

function renderAlerts(filteredContracts) {
    const alertsContainer = document.getElementById("contractAlerts");
    if (!alertsContainer) return;
    alertsContainer.innerHTML = "";

    let alertCount = 0;

    filteredContracts.forEach(c => {
        const mStatus = c.monitoring_status;
        if (mStatus === "Expiring Soon" || mStatus === "Renewal Due Soon" || mStatus === "Expired") {
            alertCount++;
            
            let alertStyle = "border-left: 4px solid var(--warning-color); background-color: var(--warning-bg); color: var(--warning-text);";
            let icon = "⚠️";
            if (mStatus === "Expired") {
                alertStyle = "border-left: 4px solid var(--danger-color); background-color: var(--danger-bg); color: var(--danger-text);";
                icon = "🚨";
            }
            
            const card = document.createElement("div");
            card.className = "kpi-card";
            card.style = `${alertStyle} padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; box-shadow: none; border-radius: 8px;`;
            
            card.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px;">
                    <span>${icon} ${c.vendor_name} - ${c.contract_name}</span>
                    <span>${c.remaining_days} days left</span>
                </div>
                <div style="font-size: 12px; opacity: 0.95;">
                    Status: <strong>${c.monitoring_status}</strong> | Action: <em>${c.recommendation}</em>
                </div>
            `;
            alertsContainer.appendChild(card);
        }
    });

    if (alertCount === 0) {
        alertsContainer.innerHTML = `
            <div class="kpi-card" style="border-left: 4px solid var(--success-color); background-color: var(--success-bg); color: var(--success-text); padding: 16px 20px; box-shadow: none;">
                <div style="font-weight: 600; font-size: 14px;">✅ No Active Expiry Alerts</div>
                <div style="font-size: 12px; opacity: 0.95;">All contracts are currently within safe SLA compliance thresholds.</div>
            </div>
        `;
    }
}

// Initial load
document.addEventListener("DOMContentLoaded", loadContractMonitoring);