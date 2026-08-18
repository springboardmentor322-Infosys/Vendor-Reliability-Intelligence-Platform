const API_BASE_URL = "http://127.0.0.1:8000";


// =========================================================
// ERROR MESSAGE
// =========================================================

function showError(message) {

    const errorElement =
        document.getElementById("errorMessage");

    errorElement.textContent = message;

    errorElement.style.display = "block";
}


// =========================================================
// LOAD SUMMARY
// =========================================================

async function loadAnalyticsSummary() {

    try {

        console.log("Loading analytics summary...");


        const response = await fetch(
            `${API_BASE_URL}/analytics/summary`
        );


        console.log(
            "Analytics Summary Status:",
            response.status
        );


        const data = await response.json();


        console.log(
            "Analytics Summary Data:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                `API Error: ${response.status}`
            );

        }


        if (data.error) {

            throw new Error(data.error);

        }


        // -------------------------
        // TOTAL VENDORS
        // -------------------------

        document.getElementById(
            "totalVendors"
        ).textContent =
            data.total_vendors ?? 0;


        // -------------------------
        // TOTAL ORDERS
        // -------------------------

        document.getElementById(
            "totalOrders"
        ).textContent =
            data.total_orders ?? 0;


        // -------------------------
        // COMPLETED
        // -------------------------

        document.getElementById(
            "completedOrders"
        ).textContent =
            data.completed_orders ?? 0;


        // -------------------------
        // PENDING
        // -------------------------

        document.getElementById(
            "pendingOrders"
        ).textContent =
            data.pending_orders ?? 0;


        // -------------------------
        // DELIVERED
        // -------------------------

        document.getElementById(
            "deliveredOrders"
        ).textContent =
            data.delivered_orders ?? 0;


        // -------------------------
        // ORDERED
        // -------------------------

        document.getElementById(
            "orderedOrders"
        ).textContent =
            data.ordered_orders ?? 0;


        // -------------------------
        // TOTAL SPEND
        // -------------------------

        document.getElementById(
            "totalSpend"
        ).textContent =
            `₹${Number(
                data.total_spend ?? 0
            ).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;


        // -------------------------
        // RELIABILITY
        // -------------------------

        document.getElementById(
            "averageReliability"
        ).textContent =
            `${Number(
                data.average_reliability ?? 0
            ).toFixed(2)}%`;


        // -------------------------
        // EXTRA CSV METRICS
        // -------------------------

        document.getElementById("totalProfit").textContent =
            `₹${Number(data.total_profit ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        document.getElementById("avgShippingDays").textContent =
            Number(data.avg_shipping_days ?? 0).toFixed(2);

        document.getElementById("onTimeDeliveryPct").textContent =
            `${Number(data.on_time_delivery_percentage ?? 0).toFixed(2)}%`;

        document.getElementById("lateDeliveryCount").textContent =
            Number(data.late_delivery_count ?? 0).toLocaleString();

        document.getElementById("lateRiskPct").textContent =
            `${Number(data.late_delivery_risk_pct ?? 0).toFixed(2)}%`;


        console.log(
            "Analytics summary loaded successfully."
        );

    }

    catch (error) {

        console.error(
            "Analytics Summary Error:",
            error
        );

        showError(
            "Unable to load analytics summary: " +
            error.message
        );

    }

}



// =========================================================
// LOAD CATEGORY RISK
// =========================================================

async function loadCategoryRisk() {

    try {

        console.log(
            "Loading category risk..."
        );


        const response = await fetch(
            `${API_BASE_URL}/analytics/category-risk`
        );


        console.log(
            "Category Risk Status:",
            response.status
        );


        const data = await response.json();


        console.log(
            "Category Risk Data:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                `API Error: ${response.status}`
            );

        }


        if (data.error) {

            throw new Error(data.error);

        }


        const tableBody =
            document.getElementById(
                "riskTableBody"
            );


        tableBody.innerHTML = "";


        // -------------------------
        // CHECK DATA
        // -------------------------

        if (
            !data.data ||
            data.data.length === 0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="10">
                        No category risk data found.
                    </td>
                </tr>
            `;

            return;
        }


        // -------------------------
        // CREATE ROWS
        // -------------------------

        data.data.forEach(
            function(category) {


                const row =
                    document.createElement("tr");


                // Risk class

                let riskClass = "";


                if (
                    category.risk_level ===
                    "High Risk"
                ) {

                    riskClass = "high-risk";

                }

                else if (
                    category.risk_level ===
                    "Medium Risk"
                ) {

                    riskClass = "medium-risk";

                }

                else if (
                    category.risk_level ===
                    "Low Risk"
                ) {

                    riskClass = "low-risk";

                }


                row.innerHTML = `

                    <td>
                        ${category.id}
                    </td>

                    <td>
                        <strong>
                            ${category.category_name}
                        </strong>
                    </td>

                    <td>
                        ${Number(
                            category.total_orders
                        ).toLocaleString()}
                    </td>

                    <td>
                        ${Number(
                            category.on_time_percentage
                        ).toFixed(2)}%
                    </td>

                    <td>
                        ${Number(
                            category.late_percentage
                        ).toFixed(2)}%
                    </td>

                    <td>
                        ${Number(
                            category.avg_shipping_days
                        ).toFixed(2)}
                    </td>

                    <td>
                        ${Number(
                            category.avg_scheduled_days
                        ).toFixed(2)}
                    </td>

                    <td>
                        ${Number(
                            category.avg_profit_ratio
                        ).toFixed(2)}
                    </td>

                    <td>
                        ₹${Number(
                            category.avg_profit
                        ).toFixed(2)}
                    </td>

                    <td>

                        <span
                            class="risk-badge ${riskClass}"
                        >

                            ${category.risk_level}

                        </span>

                    </td>

                `;


                tableBody.appendChild(row);

            }
        );


        document.getElementById(
            "loadingMessage"
        ).style.display = "none";


        console.log(
            "Category risk loaded successfully."
        );

    }

    catch (error) {

        console.error(
            "Category Risk Error:",
            error
        );


        document.getElementById(
            "loadingMessage"
        ).textContent =
            "Unable to load category risk data.";


        showError(
            "Category Risk Error: " +
            error.message
        );

    }

}



// =========================================================
// CHARTS POPULATION
// =========================================================

async function loadOrderStatusChart() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/order-status-distribution`);
        if (!response.ok) throw new Error("Order status API failed");
        const data = await response.json();
        
        const labels = data.map(item => item.status);
        const counts = data.map(item => item.count);
        
        const ctx = document.getElementById("orderStatusChart").getContext("2d");
        new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    label: "Orders",
                    data: counts,
                    backgroundColor: [
                        "#0d6efd", "#6610f2", "#6f42c1", "#d63384", "#dc3545",
                        "#fd7e14", "#ffc107", "#198754", "#20c997", "#0dcaf0"
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right"
                    }
                }
            }
        });
    } catch (err) {
        console.error("Order Status Chart Error:", err);
    }
}

async function loadDeliveryStatusChart() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/delivery-status-distribution`);
        if (!response.ok) throw new Error("Delivery status API failed");
        const data = await response.json();
        
        const labels = data.map(item => item.delivery_status);
        const counts = data.map(item => item.count);
        
        const ctx = document.getElementById("deliveryStatusChart").getContext("2d");
        new Chart(ctx, {
            type: "pie",
            data: {
                labels: labels,
                datasets: [{
                    label: "Orders",
                    data: counts,
                    backgroundColor: ["#dc3545", "#198754", "#0dcaf0", "#ffc107"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right"
                    }
                }
            }
        });
    } catch (err) {
        console.error("Delivery Status Chart Error:", err);
    }
}

async function loadCategoryCharts() {
    try {
        // 1. Category wise Orders
        const ordRes = await fetch(`${API_BASE_URL}/analytics/category-orders-distribution`);
        if (!ordRes.ok) throw new Error("Category orders API failed");
        const ordData = await ordRes.json();
        
        // Show top 10 categories
        const topOrdData = ordData.slice(0, 10);
        const ordLabels = topOrdData.map(item => item.category);
        const ordCounts = topOrdData.map(item => item.count);
        
        const ordCtx = document.getElementById("categoryOrdersChart").getContext("2d");
        new Chart(ordCtx, {
            type: "bar",
            data: {
                labels: ordLabels,
                datasets: [{
                    label: "Order Count",
                    data: ordCounts,
                    backgroundColor: "#0d6efd"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                plugins: {
                    legend: { display: false }
                }
            }
        });
        
        // 2. Category wise Sales
        const salesRes = await fetch(`${API_BASE_URL}/analytics/category-sales-distribution`);
        if (!salesRes.ok) throw new Error("Category sales API failed");
        const salesData = await salesRes.json();
        
        // Show top 10 categories
        const topSalesData = salesData.slice(0, 10);
        const salesLabels = topSalesData.map(item => item.category);
        const salesAmount = topSalesData.map(item => item.sales);
        
        const salesCtx = document.getElementById("categorySalesChart").getContext("2d");
        new Chart(salesCtx, {
            type: "bar",
            data: {
                labels: salesLabels,
                datasets: [{
                    label: "Sales (₹)",
                    data: salesAmount,
                    backgroundColor: "#198754"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } catch (err) {
        console.error("Category Charts Error:", err);
    }
}


// =========================================================
// PAGE LOAD
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Analytics page loaded."
        );


        // Load summary

        loadAnalyticsSummary();


        // Load category risk

        loadCategoryRisk();
        
        // Load charts
        
        loadOrderStatusChart();
        loadDeliveryStatusChart();
        loadCategoryCharts();

    }
);