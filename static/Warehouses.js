const API_BASE = "/api/supply-chain/warehouses";

let warehouseData = null;

let utilizationChart = null;
let inventoryChart = null;


/* ============================================================
   API
============================================================ */

async function loadWarehouseDashboard() {

    try {

        const response = await fetch(
            `${API_BASE}/dashboard`
        );

        if (!response.ok) {

            throw new Error(
                `API Error: ${response.status}`
            );
        }

        warehouseData = await response.json();

        renderDashboard(
            warehouseData
        );

    } catch (error) {

        console.error(
            "Warehouse dashboard error:",
            error
        );

        showToast(
            "Unable to load warehouse dashboard"
        );
    }
}


/* ============================================================
   DASHBOARD
============================================================ */

function renderDashboard(data) {

    renderKPIs(
        data.kpis
    );

    renderUtilization(
        data.utilization
    );

    renderHealth(
        data.kpis,
        data.health
    );

    renderWarehouses(
        data.warehouses
    );

    renderAlerts(
        data.alerts
    );

    renderActivities(
        data.activities
    );

    renderMap(
        data.warehouses
    );

    renderInventoryChart(
        data.warehouses
    );
}


/* ============================================================
   KPI
============================================================ */

function renderKPIs(kpi) {

    document.getElementById(
        "totalWarehouses"
    ).textContent =
        number(kpi.total_warehouses);

    document.getElementById(
        "totalCapacity"
    ).textContent =
        formatCapacity(
            kpi.total_capacity
        );

    document.getElementById(
        "utilizationRate"
    ).textContent =
        `${kpi.utilization_rate.toFixed(1)}%`;

    document.getElementById(
        "inventoryValue"
    ).textContent =
        formatMoney(
            kpi.inventory_value
        );

    document.getElementById(
        "turnoverRate"
    ).textContent =
        `${kpi.turnover_rate.toFixed(1)}x`;
}


/* ============================================================
   UTILIZATION
============================================================ */

function renderUtilization(data) {

    const ctx =
        document
            .getElementById(
                "utilizationChart"
            )
            .getContext("2d");

    if (utilizationChart) {
        utilizationChart.destroy();
    }

    utilizationChart =
        new Chart(
            ctx,
            {
                type: "doughnut",

                data: {

                    labels: [
                        "Above 90%",
                        "70% - 90%",
                        "40% - 70%",
                        "Below 40%"
                    ],

                    datasets: [
                        {
                            data: [
                                data.above_90,
                                data["70_90"],
                                data["40_70"],
                                data.below_40
                            ],

                            backgroundColor: [
                                "#ef4444",
                                "#f97316",
                                "#f59e0b",
                                "#16a34a"
                            ],

                            borderWidth: 0
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "62%",

                    plugins: {

                        legend: {
                            position: "right",

                            labels: {
                                font: {
                                    size: 10
                                },

                                boxWidth: 8
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   HEALTH
============================================================ */

function renderHealth(
    kpi,
    health
) {

    document.getElementById(
        "healthScore"
    ).textContent =
        `${kpi.health_score.toFixed(0)}%`;

    document.getElementById(
        "healthyCount"
    ).textContent =
        health.healthy;

    document.getElementById(
        "riskCount"
    ).textContent =
        health.at_risk;

    document.getElementById(
        "criticalCount"
    ).textContent =
        health.critical;
}


/* ============================================================
   WAREHOUSE TABLE
============================================================ */

function renderWarehouses(
    warehouses
) {

    const tbody =
        document.getElementById(
            "warehouseTableBody"
        );

    tbody.innerHTML = "";

    warehouses.forEach(
        warehouse => {

            const statusClass =
                healthClass(
                    warehouse.health_status
                );

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            warehouse.warehouse_name
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        warehouse.location || "-"
                    )}
                </td>

                <td>
                    ${formatCapacity(
                        warehouse.capacity
                    )}
                </td>

                <td>

                    ${warehouse.utilization.toFixed(0)}%

                    <span class="progress">

                        <span
                            style="
                                width:${Math.min(
                                    warehouse.utilization,
                                    100
                                )}%
                            "
                        ></span>

                    </span>

                </td>

                <td>
                    ${formatMoney(
                        warehouse.inventory_value
                    )}
                </td>

                <td>
                    ${warehouse.turnover_rate.toFixed(1)}x
                </td>

                <td>

                    <span
                        class="status ${statusClass}"
                    >
                        ${escapeHtml(
                            warehouse.health_status
                        )}
                    </span>

                </td>
            `;

            tbody.appendChild(
                row
            );
        }
    );
}


/* ============================================================
   INVENTORY CHART
============================================================ */

function renderInventoryChart(
    warehouses
) {

    const ctx =
        document
            .getElementById(
                "inventoryChart"
            )
            .getContext("2d");

    if (inventoryChart) {
        inventoryChart.destroy();
    }

    inventoryChart =
        new Chart(
            ctx,
            {
                type: "bar",

                data: {

                    labels:
                        warehouses.map(
                            x =>
                                x.warehouse_name
                        ),

                    datasets: [
                        {
                            label:
                                "Inventory Value",

                            data:
                                warehouses.map(
                                    x =>
                                        x.inventory_value
                                ),

                            backgroundColor:
                                "#2563eb",

                            borderRadius: 4
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        }
                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return
                                            "$" +
                                            formatCompact(
                                                value
                                            );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   MAP
============================================================ */

function renderMap(
    warehouses
) {

    const map =
        document.getElementById(
            "warehouseMap"
        );

    map.innerHTML = "";

    warehouses.forEach(
        (warehouse, index) => {

            /*
             * If latitude/longitude are available,
             * replace these normalized positions
             * with a real map provider.
             */

            const left =
                15 +
                (
                    (index * 17) % 70
                );

            const top =
                18 +
                (
                    (index * 23) % 60
                );

            const marker =
                document.createElement(
                    "div"
                );

            marker.className =
                "map-marker";

            marker.style.left =
                `${left}%`;

            marker.style.top =
                `${top}%`;

            marker.textContent =
                index + 1;

            marker.title =
                `${warehouse.warehouse_name} - ${warehouse.location}`;

            map.appendChild(
                marker
            );
        }
    );
}


/* ============================================================
   ALERTS
============================================================ */

function renderAlerts(
    alerts
) {

    const container =
        document.getElementById(
            "alertsList"
        );

    container.innerHTML = "";

    if (!alerts.length) {

        container.innerHTML =
            `<div class="empty">
                No active warehouse alerts
            </div>`;

        return;
    }

    alerts.forEach(
        alert => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "alert-item";

            item.innerHTML = `

                <div
                    class="
                        alert-icon
                        ${escapeHtml(
                            alert.severity
                        )}
                    "
                >
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>

                <div class="alert-content">

                    <strong>
                        ${escapeHtml(
                            alert.title
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            alert.message ||
                            alert.warehouse
                        )}
                    </span>

                </div>
            `;

            container.appendChild(
                item
            );
        }
    );
}


/* ============================================================
   ACTIVITIES
============================================================ */

function renderActivities(
    activities
) {

    const container =
        document.getElementById(
            "activitiesList"
        );

    container.innerHTML = "";

    if (!activities.length) {

        container.innerHTML =
            `<div class="empty">
                No recent warehouse activities
            </div>`;

        return;
    }

    activities.forEach(
        activity => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "activity-item";

            item.innerHTML = `

                <div class="activity-icon">

                    <i class="
                        fa-solid
                        fa-box
                    "></i>

                </div>

                <div class="activity-content">

                    <strong>
                        ${escapeHtml(
                            activity.title
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            activity.warehouse
                        )}

                        ${activity.reference_number
                            ? " • " +
                              escapeHtml(
                                  activity.reference_number
                              )
                            : ""
                        }
                    </span>

                </div>
            `;

            container.appendChild(
                item
            );
        }
    );
}


/* ============================================================
   HELPERS
============================================================ */

function formatMoney(
    value
) {

    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0
        }
    ).format(
        value || 0
    );
}


function formatCapacity(
    value
) {

    value = Number(
        value || 0
    );

    if (value >= 1000000) {

        return (
            value / 1000000
        ).toFixed(2) +
        "M sq ft";
    }

    if (value >= 1000) {

        return (
            value / 1000
        ).toFixed(0) +
        "K sq ft";
    }

    return (
        value.toFixed(0) +
        " sq ft"
    );
}


function formatCompact(
    value
) {

    if (value >= 1000000) {

        return (
            value / 1000000
        ).toFixed(1) +
        "M";
    }

    if (value >= 1000) {

        return (
            value / 1000
        ).toFixed(0) +
        "K";
    }

    return value;
}


function number(value) {

    return new Intl.NumberFormat(
        "en-US"
    ).format(
        value || 0
    );
}


function healthClass(
    status
) {

    if (status === "Healthy") {
        return "healthy";
    }

    if (status === "At Risk") {
        return "risk";
    }

    return "critical";
}


function escapeHtml(
    value
) {

    if (value === null ||
        value === undefined) {

        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   CLOCK
============================================================ */

function updateClock() {

    const now =
        new Date();

    document.getElementById(
        "currentDate"
    ).textContent =
        now.toLocaleDateString(
            "en-IN",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );

    document.getElementById(
        "currentTime"
    ).textContent =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}

setInterval(
    updateClock,
    1000
);

updateClock();


/* ============================================================
   SEARCH
============================================================ */

document
    .getElementById(
        "searchInput"
    )
    .addEventListener(
        "input",
        function() {

            const term =
                this.value
                    .toLowerCase()
                    .trim();

            if (!warehouseData) {
                return;
            }

            const filtered =
                warehouseData.warehouses
                    .filter(
                        warehouse =>
                            warehouse
                                .warehouse_name
                                .toLowerCase()
                                .includes(term)
                            ||
                            (
                                warehouse.location ||
                                ""
                            )
                            .toLowerCase()
                            .includes(term)
                    );

            renderWarehouses(
                filtered
            );
        }
    );


/* ============================================================
   QUICK ACTIONS
============================================================ */

function addWarehouse() {

    showToast(
        "Opening Add Warehouse"
    );
}


function warehouseTransfer() {

    showToast(
        "Opening Warehouse Transfer"
    );
}


function stockAdjustment() {

    showToast(
        "Opening Stock Adjustment"
    );
}


function warehouseReport() {

    showToast(
        "Generating Warehouse Report"
    );
}


function uploadDocument() {

    showToast(
        "Opening Document Upload"
    );
}


function viewAllWarehouses() {

    showToast(
        "Opening All Warehouses"
    );
}


function viewAllAlerts() {

    showToast(
        "Opening Warehouse Alerts"
    );
}


function viewAllActivities() {

    showToast(
        "Opening Warehouse Activities"
    );
}


/* ============================================================
   TOAST
============================================================ */

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    setTimeout(
        () => {
            toast.classList.remove(
                "show"
            );
        },
        2500
    );
}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


/* ============================================================
   INITIALIZE
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadWarehouseDashboard();

        /*
         * Automatically refresh the dashboard
         * every 60 seconds.
         */
        setInterval(
            loadWarehouseDashboard,
            60000
        );
    }
);