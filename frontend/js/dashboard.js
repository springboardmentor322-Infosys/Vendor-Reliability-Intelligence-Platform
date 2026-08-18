
// ==================================================
// DASHBOARD.JS
// Vendor Reliability Platform
// ==================================================

const API_BASE_URL = "http://127.0.0.1:8000";


// ==================================================
// LOAD DASHBOARD SUMMARY
// ==================================================

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/dashboard`
        );

        if (!response.ok) {
            throw new Error(
                `Dashboard API Error: ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Dashboard Data:", data);


        // Total Vendors
        const vendorCount =
            document.getElementById("vendorCount");

        if (vendorCount) {
            vendorCount.textContent =
                data.total_vendors ?? 0;
        }


        // Total Purchase Orders
        const orderCount =
            document.getElementById("orderCount");

        if (orderCount) {
            orderCount.textContent =
                data.total_orders ?? 0;
        }


        // Total Contracts
        const contractCount =
            document.getElementById("contractCount");

        if (contractCount) {
            contractCount.textContent =
                data.total_contracts ?? 0;
        }


        // Completed Orders
        const completedOrders =
            document.getElementById("completedOrders");

        if (completedOrders) {
            completedOrders.textContent =
                data.completed_orders ?? 0;
        }

    }

    catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

    }
}


// ==================================================
// LOAD VENDOR RELIABILITY SUMMARY
// ==================================================

async function loadVendorReliabilitySummary() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/vendor-reliability/summary`
        );

        if (!response.ok) {
            throw new Error(
                `Vendor Reliability Summary API Error: ${response.status}`
            );
        }

        const summary = await response.json();

        if (!summary || typeof summary !== 'object') {
            throw new Error(
                "Unexpected vendor reliability summary response format"
            );
        }

        const totalVendors = summary.total_vendors ?? 0;
        const averageReliability = summary.average_reliability ?? 0;
        const bestVendor = summary.best_vendor ?? "N/A";
        const bestScore = summary.best_score ?? 0;
        const poorVendors = summary.poor_vendors ?? 0;

        const totalVendorsEl =
            document.getElementById("totalVendors");
        const averageReliabilityEl =
            document.getElementById("averageReliability");
        const bestVendorEl =
            document.getElementById("bestVendor");
        const bestScoreEl =
            document.getElementById("bestScore");
        const poorVendorsEl =
            document.getElementById("poorVendors");
        const avgReliabilityCard =
            document.getElementById("avgReliability");

        if (totalVendorsEl) {
            totalVendorsEl.textContent = totalVendors;
        }

        if (averageReliabilityEl) {
            averageReliabilityEl.textContent =
                `${averageReliability.toFixed(2)}%`;
        }

        if (bestVendorEl) {
            bestVendorEl.textContent = bestVendor;
        }

        if (bestScoreEl) {
            bestScoreEl.textContent = `${bestScore}%`;
        }

        if (poorVendorsEl) {
            poorVendorsEl.textContent = poorVendors;
        }

        if (avgReliabilityCard) {
            avgReliabilityCard.textContent =
                `${averageReliability.toFixed(2)}%`;
        }

    }

    catch (error) {

        console.error(
            "Vendor Reliability Summary Error:",
            error
        );

        const averageReliabilityEl =
            document.getElementById("averageReliability");
        const totalVendorsEl =
            document.getElementById("totalVendors");
        const bestVendorEl =
            document.getElementById("bestVendor");
        const bestScoreEl =
            document.getElementById("bestScore");
        const poorVendorsEl =
            document.getElementById("poorVendors");
        const avgReliabilityCard =
            document.getElementById("avgReliability");

        if (averageReliabilityEl) {
            averageReliabilityEl.textContent = "N/A";
        }
        if (totalVendorsEl) {
            totalVendorsEl.textContent = "N/A";
        }
        if (bestVendorEl) {
            bestVendorEl.textContent = "N/A";
        }
        if (bestScoreEl) {
            bestScoreEl.textContent = "N/A";
        }
        if (poorVendorsEl) {
            poorVendorsEl.textContent = "N/A";
        }
        if (avgReliabilityCard) {
            avgReliabilityCard.textContent = "N/A";
        }
    }
}


// ==================================================
// LOAD CONTRACT OVERVIEW
// ==================================================

async function loadContractOverview() {

    try {

        console.log(
            "Loading Contract Overview..."
        );


        const response = await fetch(
            `${API_BASE_URL}/contract-monitoring`
        );


        if (!response.ok) {
            throw new Error(
                `Contract API Error: ${response.status}`
            );
        }


        const contracts = await response.json();

        if (!Array.isArray(contracts)) {
            throw new Error(
                "Contract API returned unexpected response"
            );
        }

        console.log(
            "Contract Overview Data:",
            contracts
        );

        const totalContracts =
            contracts.length;

        const activeContracts =
            contracts.filter(
                contract =>
                    String(contract.status ?? "").toLowerCase() ===
                    "active"
            ).length;

        const expiringContracts =
            contracts.filter(
                contract =>
                    contract.monitoring_status ===
                    "Expiring Soon"
            ).length;

        const expiredContracts =
            contracts.filter(
                contract =>
                    String(contract.status ?? "").toLowerCase() ===
                        "expired" ||
                    contract.monitoring_status ===
                        "Expired"
            ).length;


        const totalElement =
            document.getElementById(
                "dashboardTotalContracts"
            );

        const activeElement =
            document.getElementById(
                "dashboardActiveContracts"
            );

        const expiringElement =
            document.getElementById(
                "dashboardExpiringContracts"
            );

        const expiredElement =
            document.getElementById(
                "dashboardExpiredContracts"
            );


        if (totalElement) {
            totalElement.textContent =
                totalContracts;
        }

        if (activeElement) {
            activeElement.textContent =
                activeContracts;
        }

        if (expiringElement) {
            expiringElement.textContent =
                expiringContracts;
        }

        if (expiredElement) {
            expiredElement.textContent =
                expiredContracts;
        }


        console.log(
            "FINAL CONTRACT SUMMARY:",
            {
                totalContracts,
                activeContracts,
                expiringContracts,
                expiredContracts
            }
        );

    } catch (error) {

        console.error(
            "Contract Overview Error:",
            error
        );

        const totalElement =
            document.getElementById(
                "dashboardTotalContracts"
            );

        const activeElement =
            document.getElementById(
                "dashboardActiveContracts"
            );

        const expiringElement =
            document.getElementById(
                "dashboardExpiringContracts"
            );

        const expiredElement =
            document.getElementById(
                "dashboardExpiredContracts"
            );

        if (totalElement) {
            totalElement.textContent = 0;
        }
        if (activeElement) {
            activeElement.textContent = 0;
        }
        if (expiringElement) {
            expiringElement.textContent = 0;
        }
        if (expiredElement) {
            expiredElement.textContent = 0;
        }
    }
}


// ==================================================
// LOAD NOTIFICATIONS
// ==================================================

async function loadNotifications() {

    const notificationArea =
        document.getElementById(
            "notificationArea"
        );


    if (!notificationArea) {

        console.log(
            "Notification area not found."
        );

        return;
    }


    try {

        notificationArea.innerHTML = "";

        let notificationCount = 0;


        // ==========================================
        // VENDOR RELIABILITY
        // ==========================================

        const vendorResponse =
            await fetch(
                `${API_BASE_URL}/vendor-reliability`
            );


        if (!vendorResponse.ok) {

            throw new Error(
                `Vendor Reliability API Error: ${vendorResponse.status}`
            );

        }


        const vendors =
            await vendorResponse.json();


        console.log(
            "Vendor Reliability Alerts:",
            vendors
        );


        // ==========================================
        // VENDOR RISK ALERTS
        // ==========================================

        if (Array.isArray(vendors)) {

            vendors.forEach(vendor => {

                const reliability =
                    Number(
                        vendor.reliability_score ?? 0
                    );

                const status =
                    String(vendor.reliability_status ?? "").trim();

                const lateDeliveryRate =
                    Number(
                        vendor.late_delivery_rate ?? 0
                    );

                const totalOrders =
                    Number(
                        vendor.total_orders ?? 0
                    );

                const lateOrders =
                    Number(
                        vendor.late_orders ?? 0
                    );

                const isPoor =
                    status.toLowerCase() === "poor";

                const isAverage =
                    status.toLowerCase() === "average";

                if (!isPoor && !isAverage) {
                    return;
                }

                notificationCount++;

                const alert =
                    document.createElement("div");

                alert.className =
                    "notification-card";

                alert.innerHTML = `

                    <h3>
                        ${isPoor ? "🔴" : "⚠"} Vendor Risk Alert
                    </h3>

                    <p>
                        <strong>Vendor:</strong>
                        ${vendor.vendor_name}
                    </p>

                    <p>
                        <strong>Reliability Status:</strong>
                        ${status}
                    </p>

                    <p>
                        <strong>Reliability Score:</strong>
                        ${reliability.toFixed(2)}
                    </p>

                    <p>
                        <strong>Late Delivery Rate:</strong>
                        ${lateDeliveryRate.toFixed(2)}%
                    </p>

                    <p>
                        <strong>Total Orders:</strong>
                        ${totalOrders}
                    </p>

                    <p>
                        <strong>Late Orders:</strong>
                        ${lateOrders}
                    </p>

                    <p>
                        <strong>Action:</strong>
                        Review Vendor
                    </p>

                `;

                notificationArea.appendChild(
                    alert
                );

            });

        }


        // ==========================================
        // CONTRACTS
        // ==========================================

        const contractResponse =
            await fetch(
                `${API_BASE_URL}/contract-monitoring`
            );


        if (!contractResponse.ok) {
            throw new Error(
                `Contract API Error: ${contractResponse.status}`
            );
        }


        const contracts =
            await contractResponse.json();

        if (!Array.isArray(contracts)) {
            throw new Error(
               
                "Contract API returned unexpected response"
            );
        }

        console.log(
            "Contracts for Notifications:",
            contracts
        );


        // ==========================================
        // CONTRACT ALERTS
        // ==========================================

        if (Array.isArray(contracts)) {

            contracts.forEach(contract => {

                const endDate =
                    contract.end_date
                        ? new Date(contract.end_date)
                        : null;

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let daysRemaining = 0;
                if (endDate instanceof Date && !isNaN(endDate)) {
                    const diffMs = endDate - today;
                    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                }

                const vendorLabel =
                    contract.vendor_name ||
                    `Vendor ID ${contract.vendor_id ?? 'N/A'}`;

                if (daysRemaining < 0) {
                    notificationCount++;

                    const alert =
                        document.createElement("div");

                    alert.className =
                        "notification-card";

                    alert.innerHTML = `
                        <h3>
                            🔴 Contract Expired
                        </h3>

                        <p>
                            <strong>Vendor:</strong>
                            ${vendorLabel}
                        </p>

                        <p>
                            <strong>Contract:</strong>
                            ${contract.contract_name}
                        </p>

                        <p>
                            <strong>Remaining Days:</strong>
                            ${daysRemaining}
                        </p>

                        <p>
                            <strong>Action:</strong>
                            Renew Contract
                        </p>
                    `;

                    notificationArea.appendChild(
                        alert
                    );
                }

                else if (daysRemaining <= 30) {
                    notificationCount++;

                    const alert =
                        document.createElement("div");

                    alert.className =
                        "notification-card";

                    alert.innerHTML = `
                        <h3>
                            ⚠ Contract Expiring Soon
                        </h3>

                        <p>
                            <strong>Vendor:</strong>
                            ${vendorLabel}
                        </p>

                        <p>
                            <strong>Contract:</strong>
                            ${contract.contract_name}
                        </p>

                        <p>
                            <strong>Remaining Days:</strong>
                            ${daysRemaining}
                        </p>

                        <p>
                            <strong>Action:</strong>
                            Review / Renew Contract
                        </p>
                    `;

                    notificationArea.appendChild(
                        alert
                    );
                }

            });

        }


        // ==========================================
        // NO NOTIFICATIONS
        // ==========================================

        if (notificationCount === 0) {

            notificationArea.innerHTML = `

                <div class="notification-card">

                    <h3>
                        ✓ No Active Notifications
                    </h3>

                    <p>
                        All vendors and contracts
                        are currently within
                        acceptable limits.
                    </p>

                </div>

            `;

        }


        console.log(
            "Total Notifications:",
            notificationCount
        );

    }

    catch (error) {

        console.error(
            "Notification Error:",
            error
        );


        notificationArea.innerHTML = `

            <div class="notification-card">

                <h3>
                    ⚠ Unable to Load Notifications
                </h3>

                <p>
                    Please check whether the
                    FastAPI server is running.
                </p>

            </div>

        `;

    }

}


// ==================================================
// LOAD CHARTS
// ==================================================

let charts = {};

async function loadCharts() {
    try {
        // Destroy existing charts to prevent duplication
        Object.keys(charts).forEach(key => {
            if (charts[key]) charts[key].destroy();
        });

        // 1. Vendor Reliability Chart
        const vrRes = await fetch(`${API_BASE_URL}/vendor-reliability`);
        if (vrRes.ok) {
            const vendors = await vrRes.json();
            if (Array.isArray(vendors)) {
                const sorted = [...vendors].sort((a, b) => (b.reliability_score || 0) - (a.reliability_score || 0));
                const labels = sorted.map(v => v.vendor_name);
                const data = sorted.map(v => v.reliability_score);
                
                const ctx = document.getElementById('vendorReliabilityChart').getContext('2d');
                charts.vr = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Reliability Score (%)',
                            data: data,
                            backgroundColor: '#3b82f6',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { min: 0, max: 100 } }
                    }
                });
            }
        }

        // 2. PO Status Chart
        const poRes = await fetch(`${API_BASE_URL}/analytics/order-status-distribution`);
        if (poRes.ok) {
            const poData = await poRes.json();
            if (Array.isArray(poData)) {
                const labels = poData.map(item => item.status);
                const data = poData.map(item => item.count);
                
                const ctx = document.getElementById('poStatusChart').getContext('2d');
                charts.po = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#6b7280', '#ec4899', '#8b5cf6']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'right' } }
                    }
                });
            }
        }

        // 3. Risk Distribution Chart
        if (vrRes.ok) {
            const vendors = await fetch(`${API_BASE_URL}/vendor-reliability`).then(r => r.json());
            if (Array.isArray(vendors)) {
                const counts = { 'Low Risk': 0, 'Medium Risk': 0, 'High Risk': 0 };
                vendors.forEach(v => {
                    const score = v.reliability_score ?? 0;
                    if (score >= 70) counts['Low Risk']++;
                    else if (score >= 50) counts['Medium Risk']++;
                    else counts['High Risk']++;
                });
                
                const ctx = document.getElementById('riskDistributionChart').getContext('2d');
                charts.risk = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(counts),
                        datasets: [{
                            label: 'Vendors',
                            data: Object.values(counts),
                            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                    }
                });
            }
        }

        // 4. Contract Status Chart
        const cRes = await fetch(`${API_BASE_URL}/contract-monitoring`);
        if (cRes.ok) {
            const contracts = await cRes.json();
            if (Array.isArray(contracts)) {
                let active = 0, warning = 0, expired = 0;
                contracts.forEach(c => {
                    const status = c.monitoring_status;
                    if (status === 'Active') active++;
                    else if (status === 'Expired') expired++;
                    else warning++;
                });
                
                const ctx = document.getElementById('contractStatusChart').getContext('2d');
                charts.contracts = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Active', 'Expiring / Action Needed', 'Expired'],
                        datasets: [{
                            data: [active, warning, expired],
                            backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'right' } }
                    }
                });
            }
        }

    } catch (e) {
        console.error("Error loading dashboard charts:", e);
    }
}


// ==================================================
// PAGE LOAD
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Dashboard page loaded."
        );


        loadDashboard();

        loadVendorReliabilitySummary();

        loadContractOverview();

        loadNotifications();
        
        loadCharts();

    }
);

