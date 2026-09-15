/* =========================================================
   SUPPLY CHAIN DASHBOARD
   PostgreSQL -> FastAPI -> JavaScript
========================================================= */


/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000";

const DASHBOARD_API =
    `${API_BASE_URL}/api/supply-chain/dashboard`;


/* =========================================================
   CHART VARIABLES
========================================================= */

let ordersChart = null;
let statusChart = null;


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   NUMBER FORMAT
========================================================= */

function formatNumber(value) {

    return Number(value || 0)
        .toLocaleString("en-US");
}


/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(value) {

    value = Number(value || 0);

    if (value >= 10000000) {

        return "$" +
            (value / 10000000)
                .toFixed(2) +
            "Cr";
    }

    if (value >= 1000000) {

        return "$" +
            (value / 1000000)
                .toFixed(2) +
            "M";
    }

    if (value >= 1000) {

        return "$" +
            (value / 1000)
                .toFixed(1) +
            "K";
    }

    return "$" +
        value.toLocaleString("en-US", {
            maximumFractionDigits: 0
        });
}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(dateString) {

    if (!dateString) {
        return "";
    }

    const date =
        new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString(
        "en-US",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   STATUS CLASS
========================================================= */

function statusClass(status) {

    const value =
        String(status || "")
            .toLowerCase()
            .replace(/\s+/g, "-");

    if (
        value.includes("processing")
    ) {
        return "status-processing";
    }

    if (
        value.includes("transit") ||
        value.includes("shipped") ||
        value.includes("dispatch")
    ) {
        return "status-transit";
    }

    if (
        value.includes("deliver")
    ) {
        return "status-delivered";
    }

    if (
        value.includes("cancel")
    ) {
        return "status-cancelled";
    }

    return "status-pending";
}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        showLoadingState();

        const response =
            await fetch(
                DASHBOARD_API,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        if (!response.ok) {

            throw new Error(
                `API Error: ${response.status}`
            );
        }

        const data =
            await response.json();

        if (!data.success) {

            throw new Error(
                "Dashboard API returned an error"
            );
        }

        updateSummary(
            data.summary
        );

        updateInventory(
            data.inventory
        );

        updateOrders(
            data.orders
        );

        updateSuppliers(
            data.suppliers
        );

        updateAlerts(
            data.alerts
        );

        updateUpcoming(
            data.upcoming
        );

        createOrdersChart(
            data.orders.monthly
        );

        createStatusChart(
            data.orders.status_distribution,
            data.summary.total_orders
        );

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        showApiError(
            error.message
        );
    }
}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary(summary) {

    $("totalOrders").textContent =
        formatNumber(
            summary.total_orders
        );

    $("inventoryValue").textContent =
        formatCurrency(
            summary.inventory_value
        );

    $("inTransit").textContent =
        formatNumber(
            summary.in_transit_shipments
        );

    $("atRisk").textContent =
        formatNumber(
            summary.at_risk_orders
        );

    $("fulfillmentRate").textContent =
        Number(
            summary.fulfillment_rate || 0
        ).toFixed(1) + "%";

    $("onTimeDelivery").textContent =
        Number(
            summary.on_time_delivery || 0
        ).toFixed(1) + "%";

    $("overviewRisk").textContent =
        formatNumber(
            summary.at_risk_orders
        );
}


/* =========================================================
   INVENTORY
========================================================= */

function updateInventory(inventory) {

    $("inventoryItems").textContent =
        formatNumber(
            inventory.total_items
        );

    $("totalInventory").textContent =
        formatNumber(
            inventory.total_items
        );

    $("lowStock").textContent =
        formatNumber(
            inventory.low_stock
        );

    $("outStock").textContent =
        formatNumber(
            inventory.out_of_stock
        );

    $("excessStock").textContent =
        formatNumber(
            inventory.excess
        );
}


/* =========================================================
   RECENT ORDERS
========================================================= */

function updateOrders(orderData) {

    const tbody =
        $("recentOrdersBody");

    tbody.innerHTML = "";

    if (
        !orderData.recent ||
        orderData.recent.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5"
                    style="text-align:center;">
                    No purchase orders found
                </td>
            </tr>
        `;

        return;
    }


    orderData.recent.forEach(
        order => {

            const tr =
                document.createElement("tr");

            tr.innerHTML = `

                <td>
                    ${escapeHtml(
                        order.po_number
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        order.supplier
                    )}
                </td>

                <td>
                    ${formatDate(
                        order.order_date
                    )}
                </td>

                <td>

                    <span
                        class="status-badge
                        ${statusClass(
                            order.status
                        )}"
                    >

                        ${escapeHtml(
                            order.status
                        )}

                    </span>

                </td>

                <td>
                    ${formatCurrency(
                        order.amount
                    )}
                </td>

            `;

            tbody.appendChild(tr);
        }
    );
}


/* =========================================================
   SUPPLIERS
========================================================= */

function updateSuppliers(
    suppliers
) {

    const tbody =
        $("suppliersBody");

    tbody.innerHTML = "";

    if (
        !suppliers ||
        suppliers.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4"
                    style="text-align:center;">
                    No supplier data
                </td>
            </tr>
        `;

        return;
    }


    suppliers.forEach(
        supplier => {

            const tr =
                document.createElement("tr");

            const performance =
                Math.min(
                    100,
                    Math.round(
                        supplier.orders * 10
                    )
                );

            tr.innerHTML = `

                <td>
                    ${escapeHtml(
                        supplier.supplier
                    )}
                </td>

                <td>
                    ${formatNumber(
                        supplier.orders
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        supplier.amount
                    )}
                </td>

                <td>

                    <div class="performance">

                        <span>
                            ${performance}%
                        </span>

                        <div
                            class="progress"
                        >

                            <div
                                style="
                                    width:${performance}%;
                                    height:5px;
                                    background:#22b573;
                                    border-radius:5px;
                                "
                            ></div>

                        </div>

                    </div>

                </td>
            `;

            tbody.appendChild(tr);
        }
    );
}


/* =========================================================
   ALERTS
========================================================= */

function updateAlerts(
    alerts
) {

    const container =
        $("alertsContainer");

    container.innerHTML = "";

    if (
        !alerts ||
        alerts.length === 0
    ) {

        container.innerHTML = `
            <div class="loading">
                No recent alerts
            </div>
        `;

        return;
    }


    alerts.forEach(
        alert => {

            const priority =
                String(
                    alert.priority || ""
                ).toLowerCase();

            let iconClass = "info";

            let icon =
                "fa-circle-info";

            if (
                priority === "high" ||
                priority === "critical"
            ) {

                iconClass = "high";

                icon =
                    "fa-triangle-exclamation";

            } else if (
                priority === "medium"
            ) {

                iconClass = "medium";

                icon =
                    "fa-triangle-exclamation";

            } else if (
                priority === "low"
            ) {

                iconClass = "low";

                icon =
                    "fa-bell";
            }


            const div =
                document.createElement("div");

            div.className = "alert";

            div.innerHTML = `

                <div
                    class="alert-icon
                    ${iconClass}"
                >

                    <i
                        class="fa-solid
                        ${icon}"
                    ></i>

                </div>

                <div>

                    <div class="alert-title">
                        ${escapeHtml(
                            alert.title
                        )}
                    </div>

                    <div class="alert-message">
                        ${escapeHtml(
                            alert.message
                        )}
                    </div>

                </div>

                <div class="alert-time">

                    ${formatTime(
                        alert.created_at
                    )}

                </div>
            `;

            container.appendChild(div);
        }
    );
}


/* =========================================================
   UPCOMING
========================================================= */

function updateUpcoming(
    upcoming
) {

    const container =
        $("upcomingContainer");

    container.innerHTML = "";

    if (
        !upcoming ||
        upcoming.length === 0
    ) {

        container.innerHTML = `
            <div class="loading">
                No upcoming activities
            </div>
        `;

        return;
    }


    upcoming.forEach(
        activity => {

            const date =
                new Date(
                    activity.date
                );

            const month =
                date.toLocaleDateString(
                    "en-US",
                    {
                        month: "short"
                    }
                ).toUpperCase();

            const day =
                date.getDate();


            const div =
                document.createElement("div");

            div.className = "upcoming";

            div.innerHTML = `

                <div class="upcoming-date">

                    <span>
                        ${month}
                    </span>

                    <strong>
                        ${day}
                    </strong>

                </div>

                <div>

                    <div class="upcoming-title">
                        ${escapeHtml(
                            activity.type
                        )}
                    </div>

                    <div class="upcoming-info">
                        ${escapeHtml(
                            activity.title
                        )}
                    </div>

                </div>

                <div class="upcoming-status">

                    ${escapeHtml(
                        activity.status || ""
                    )}

                </div>
            `;

            container.appendChild(div);
        }
    );
}


/* =========================================================
   ORDERS LINE CHART
========================================================= */

function createOrdersChart(
    monthly
) {

    const canvas =
        $("ordersChart");

    if (
        ordersChart
    ) {
        ordersChart.destroy();
    }


    const labels =
        monthly.map(
            item => item.month
        );

    const values =
        monthly.map(
            item => item.orders
        );


    ordersChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label:
                                "Orders",

                            data:
                                values,

                            borderWidth: 2,

                            tension: 0.35,

                            fill: false,

                            pointRadius: 3,

                            pointHoverRadius: 5
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: true,

                            position:
                                "top",

                            labels: {
                                font: {
                                    size: 9
                                }
                            }
                        }

                    },

                    scales: {

                        x: {
                            grid: {
                                display: false
                            },

                            ticks: {
                                font: {
                                    size: 8
                                }
                            }
                        },

                        y: {

                            beginAtZero:
                                true,

                            ticks: {
                                font: {
                                    size: 8
                                }
                            }

                        }

                    }

                }

            }
        );
}


/* =========================================================
   DONUT CHART
========================================================= */

function createStatusChart(
    statusData,
    totalOrders
) {

    const canvas =
        $("statusChart");

    if (
        statusChart
    ) {
        statusChart.destroy();
    }


    const labels =
        statusData.map(
            item => item.status
        );

    const values =
        statusData.map(
            item => item.count
        );


    statusChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            data: values,

                            borderWidth: 2,

                            borderColor:
                                "#ffffff"
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "66%",

                    plugins: {

                        legend: {
                            display: false
                        }

                    }

                }

            }
        );


    $("donutTotal").textContent =
        formatNumber(
            totalOrders
        );


    createStatusLegend(
        statusData
    );
}


/* =========================================================
   STATUS LEGEND
========================================================= */

function createStatusLegend(
    statusData
) {

    const container =
        $("statusLegend");

    container.innerHTML = "";

    const colors = [
        "#3478e5",
        "#20ad6c",
        "#ffb718",
        "#f6871f",
        "#e54246",
        "#8e55d8"
    ];


    statusData.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "legend-row";

            row.innerHTML = `

                <span
                    class="legend-dot"
                    style="
                        background:
                        ${colors[
                            index %
                            colors.length
                        ]};
                    "
                ></span>

                <span>
                    ${escapeHtml(
                        item.status
                    )}
                </span>

                <strong>
                    ${formatNumber(
                        item.count
                    )}
                </strong>

            `;

            container.appendChild(row);
        }
    );
}


/* =========================================================
   LOADING STATE
========================================================= */

function showLoadingState() {

    $("totalOrders").textContent =
        "...";

    $("inventoryValue").textContent =
        "...";

    $("inTransit").textContent =
        "...";

    $("atRisk").textContent =
        "...";
}


/* =========================================================
   API ERROR
========================================================= */

function showApiError(
    message
) {

    console.error(
        message
    );

    $("alertsContainer").innerHTML = `

        <div class="loading">

            <i
                class="fa-solid
                fa-triangle-exclamation"
            ></i>

            <br><br>

            Unable to load dashboard data.

            <br>

            <small>
                ${escapeHtml(
                    message
                )}
            </small>

        </div>
    `;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   CURRENT DATE / TIME
========================================================= */

function updateDateTime() {

    const now =
        new Date();


    $("currentDate").textContent =
        now.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );


    $("currentTime").textContent =
        now.toLocaleTimeString(
            "en-US",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {

    const search =
        $("dashboardSearch");


    search.addEventListener(
        "input",
        event => {

            const value =
                event.target.value
                    .toLowerCase()
                    .trim();

            document
                .querySelectorAll(
                    "#recentOrdersBody tr"
                )
                .forEach(
                    row => {

                        row.style.display =
                            row.textContent
                                .toLowerCase()
                                .includes(value)
                                ? ""
                                : "none";

                    }
                );

        }
    );
}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateDateTime();

        setInterval(
            updateDateTime,
            30000
        );

        initializeSearch();

        loadDashboard();

        /*
         * Refresh dashboard every 60 seconds.
         */

        setInterval(
            loadDashboard,
            60000
        );

    }
);