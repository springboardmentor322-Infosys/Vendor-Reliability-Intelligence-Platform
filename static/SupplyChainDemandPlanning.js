const API_BASE = "http://127.0.0.1:8000";

let forecastChart = null;
let categoryChart = null;
let accuracyChart = null;


/* ============================================================
   INITIALIZE
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateDateTime();

        setInterval(
            updateDateTime,
            30000
        );

        loadDashboard();

        document
            .getElementById("globalSearch")
            ?.addEventListener(
                "input",
                handleSearch
            );
    }
);


/* ============================================================
   DATE / TIME
============================================================ */

function updateDateTime() {

    const now = new Date();

    const date = now.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

    const time = now.toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );

    document.getElementById(
        "currentDate"
    ).textContent = date;

    document.getElementById(
        "currentTime"
    ).textContent = time;
}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_BASE}/api/demand-planning/dashboard`
        );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        renderKPIs(data);

        renderForecastChart(data);

        renderCategoryChart(data);

        renderTopProducts(data);

        renderInsights(data);

        renderAccuracyChart(data);

        renderForecastRuns(data);

        renderPlans(data);

    }

    catch (error) {

        console.error(
            "Demand dashboard error:",
            error
        );

        showError(
            "Unable to load demand planning data."
        );
    }
}


/* ============================================================
   KPI
============================================================ */

function renderKPIs(data) {

    document.getElementById(
        "totalDemand"
    ).textContent =
        formatNumber(
            data.total_demand
        );

    document.getElementById(
        "forecastAccuracy"
    ).textContent =
        `${Number(
            data.forecast_accuracy || 0
        ).toFixed(1)}%`;

    document.getElementById(
        "plannedOrders"
    ).textContent =
        formatNumber(
            data.planned_orders
        );

    document.getElementById(
        "planningHorizon"
    ).textContent =
        data.planning_horizon ||
        "12 Weeks";

    document.getElementById(
        "demandChange"
    ).textContent =
        `${data.demand_change_percent || 0}%`;

    document.getElementById(
        "accuracyChange"
    ).textContent =
        `${data.accuracy_change_percent || 0}%`;

    document.getElementById(
        "ordersChange"
    ).textContent =
        `${data.planned_orders_change_percent || 0}%`;
}


/* ============================================================
   FORECAST CHART
============================================================ */

function renderForecastChart(data) {

    const canvas =
        document.getElementById(
            "forecastChart"
        );

    if (forecastChart) {
        forecastChart.destroy();
    }

    forecastChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels: data.months,

                    datasets: [

                        {
                            label: "Forecast",

                            data:
                                data.forecast_values,

                            borderColor:
                                "#2878ef",

                            backgroundColor:
                                "rgba(40,120,239,.08)",

                            borderWidth: 2,

                            pointRadius: 4,

                            pointBackgroundColor:
                                "#2878ef",

                            tension: .35,

                            fill: false
                        },

                        {
                            label: "Actual",

                            data:
                                data.actual_values,

                            borderColor:
                                "#12b866",

                            backgroundColor:
                                "rgba(18,184,102,.08)",

                            borderWidth: 2,

                            pointRadius: 4,

                            pointBackgroundColor:
                                "#12b866",

                            tension: .35,

                            fill: false
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

                            grid: {
                                color: "#edf1f6"
                            },

                            ticks: {
                                font: {
                                    size: 9
                                }
                            }

                        },

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {
                                font: {
                                    size: 9
                                }
                            }

                        }

                    }
                }
            }
        );
}


/* ============================================================
   CATEGORY CHART
============================================================ */

function renderCategoryChart(data) {

    const canvas =
        document.getElementById(
            "categoryChart"
        );

    if (categoryChart) {
        categoryChart.destroy();
    }

    const categories =
        data.category_demand || [];

    const labels =
        categories.map(
            item => item.category
        );

    const values =
        categories.map(
            item => item.units
        );

    categoryChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#2878ef",
                                "#12b866",
                                "#ff9d00",
                                "#7951d9",
                                "#27b7c4",
                                "#ef6c91",
                                "#8b9bb5"
                            ],

                            borderWidth: 2,
                            borderColor: "#fff"
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "62%",

                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        );


    const total =
        values.reduce(
            (sum, value) =>
                sum + Number(value || 0),
            0
        );

    document.getElementById(
        "donutTotal"
    ).textContent =
        formatNumber(total);


    const legend =
        document.getElementById(
            "categoryLegend"
        );

    legend.innerHTML = "";

    categories.forEach(
        (item, index) => {

            const percentage =
                total
                    ? (
                        item.units /
                        total *
                        100
                    ).toFixed(0)
                    : 0;

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "category-item";

            div.innerHTML = `

                <span
                    class="category-marker"
                    style="
                        background:
                        ${[
                            "#2878ef",
                            "#12b866",
                            "#ff9d00",
                            "#7951d9",
                            "#27b7c4",
                            "#ef6c91",
                            "#8b9bb5"
                        ][index % 7]}
                    "
                ></span>

                <span>
                    ${escapeHtml(item.category)}
                </span>

                <span>
                    ${formatNumber(item.units)}
                    (${percentage}%)
                </span>

            `;

            legend.appendChild(div);
        }
    );
}


/* ============================================================
   TOP PRODUCTS
============================================================ */

function renderTopProducts(data) {

    const tbody =
        document.getElementById(
            "topProductsTable"
        );

    tbody.innerHTML = "";

    const products =
        data.top_products || [];

    if (!products.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="2">
                    No forecast data available
                </td>
            </tr>
        `;

        return;
    }

    products.forEach(
        product => {

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        product.product
                    )}
                </td>

                <td>
                    ${formatNumber(
                        product.forecast
                    )}
                </td>

            `;

            tbody.appendChild(row);
        }
    );
}


/* ============================================================
   INSIGHTS
============================================================ */

function renderInsights(data) {

    const container =
        document.getElementById(
            "insights"
        );

    container.innerHTML = "";

    const insights =
        data.insights || [];

    if (!insights.length) {

        container.innerHTML = `
            <div class="insight">
                No demand insights available.
            </div>
        `;

        return;
    }

    const icons = {
        high: "fa-arrow-trend-up",
        growth: "fa-chart-line",
        inventory: "fa-box",
        seasonal: "fa-calendar"
    };

    insights.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                `insight ${item.type}`;

            div.innerHTML = `

                <div class="insight-icon">

                    <i class="fa-solid
                        ${icons[item.type]
                            || "fa-lightbulb"}">
                    </i>

                </div>

                <div>
                    ${escapeHtml(item.text)}
                </div>

            `;

            container.appendChild(div);
        }
    );
}


/* ============================================================
   ACCURACY CHART
============================================================ */

function renderAccuracyChart(data) {

    const canvas =
        document.getElementById(
            "accuracyChart"
        );

    if (accuracyChart) {
        accuracyChart.destroy();
    }

    const categories =
        data.category_accuracy || [];

    accuracyChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels:
                        categories.map(
                            x => x.category
                        ),

                    datasets: [
                        {
                            label:
                                "Accuracy (%)",

                            data:
                                categories.map(
                                    x => x.accuracy
                                ),

                            backgroundColor:
                                "#2878ef",

                            borderRadius: 4,

                            barPercentage: .5
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

                            max: 100,

                            ticks: {
                                font: {
                                    size: 9
                                }
                            },

                            grid: {
                                color: "#edf1f6"
                            }

                        },

                        x: {

                            grid: {
                                display: false
                            },

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


/* ============================================================
   FORECAST RUNS
============================================================ */

function renderForecastRuns(data) {

    const tbody =
        document.getElementById(
            "forecastRunsTable"
        );

    tbody.innerHTML = "";

    const runs =
        data.recent_forecast_runs || [];

    if (!runs.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    No forecast runs available
                </td>
            </tr>
        `;

        return;
    }

    runs.forEach(
        run => {

            const row =
                document.createElement("tr");

            const statusClass =
                String(
                    run.status || ""
                ).toLowerCase();

            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        run.forecast_name
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        run.horizon
                    )}
                </td>

                <td>
                    ${formatDate(
                        run.start_date
                    )}
                </td>

                <td>
                    ${Number(
                        run.accuracy || 0
                    ).toFixed(1)}%
                </td>

                <td>
                    <span
                        class="status
                        ${statusClass}"
                    >
                        ${escapeHtml(
                            run.status
                        )}
                    </span>
                </td>

            `;

            tbody.appendChild(row);
        }
    );
}


/* ============================================================
   DEMAND PLANS
============================================================ */

function renderPlans(data) {

    const tbody =
        document.getElementById(
            "plansTable"
        );

    tbody.innerHTML = "";

    const plans =
        data.demand_plans || [];

    if (!plans.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="10">
                    No demand plans available
                </td>
            </tr>
        `;

        return;
    }

    plans.forEach(
        (plan, index) => {

            const status =
                String(
                    plan.status || ""
                ).toLowerCase();

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        plan.plan_name
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        plan.time_horizon
                    )}
                </td>

                <td>
                    ${formatNumber(
                        plan.total_demand
                    )}
                </td>

                <td>
                    ${formatNumber(
                        plan.planned_orders
                    )}
                </td>

                <td>
                    ${formatNumber(
                        plan.inventory_required
                    )}
                </td>

                <td>
                    ${Number(
                        plan.service_level_target
                    ).toFixed(0)}%
                </td>

                <td>
                    ${escapeHtml(
                        plan.created_by || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        plan.last_updated || "-"
                    )}
                </td>

                <td>

                    <span
                        class="status
                        ${status}"
                    >
                        ${escapeHtml(
                            plan.status
                        )}
                    </span>

                </td>

                <td>

                    <button
                        class="icon-btn"
                        onclick="planMenu(${index})"
                    >
                        <i class="fa-solid
                            fa-ellipsis">
                        </i>
                    </button>

                </td>
            `;

            tbody.appendChild(row);
        }
    );
}


/* ============================================================
   ACTIONS
============================================================ */

async function createForecast() {

    const name =
        prompt(
            "Forecast name:",
            "New Forecast"
        );

    if (!name) return;

    try {

        const response =
            await fetch(
                `${API_BASE}/api/demand-planning/forecast-runs`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        forecast_name: name,
                        horizon: "12 Weeks",
                        start_date:
                            new Date()
                                .toISOString()
                                .split("T")[0],

                        accuracy: 0,
                        status: "Completed",
                        created_by:
                            "Supply Chain Manager"
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        alert(
            "Forecast created successfully."
        );

        loadDashboard();

    }

    catch (error) {

        console.error(error);

        alert(
            "Unable to create forecast."
        );
    }
}


async function createDemandPlan() {

    const name =
        prompt(
            "Demand plan name:",
            "Demand Plan - New"
        );

    if (!name) return;

    const start =
        new Date();

    const end =
        new Date(start);

    end.setDate(
        end.getDate() + 84
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/api/demand-planning/plans`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        plan_name: name,

                        time_horizon:
                            "12 Weeks",

                        start_date:
                            start
                                .toISOString()
                                .split("T")[0],

                        end_date:
                            end
                                .toISOString()
                                .split("T")[0],

                        total_demand: 0,

                        planned_orders: 0,

                        inventory_required: 0,

                        service_level_target:
                            95,

                        created_by:
                            "Supply Chain Manager",

                        status:
                            "Active"
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        alert(
            "Demand plan created successfully."
        );

        loadDashboard();

    }

    catch (error) {

        console.error(error);

        alert(
            "Unable to create demand plan."
        );
    }
}


function uploadData() {

    alert(
        "Connect this button to your demand-data upload endpoint."
    );
}


function viewReports() {

    window.location.href =
        "/analytics";
}


function planMenu(index) {

    alert(
        "Plan actions: View | Edit | Archive"
    );
}


/* ============================================================
   SEARCH
============================================================ */

function handleSearch(event) {

    const search =
        event.target.value
            .toLowerCase()
            .trim();

    document
        .querySelectorAll(
            "table tbody tr"
        )
        .forEach(row => {

            const text =
                row.textContent
                    .toLowerCase();

            row.style.display =
                !search ||
                text.includes(search)
                    ? ""
                    : "none";
        });
}


/* ============================================================
   SIDEBAR
============================================================ */

function toggleSidebar() {

    document
        .querySelector(".sidebar")
        .classList.toggle("open");
}


/* ============================================================
   DARK MODE
============================================================ */

function toggleTheme() {

    document.body
        .classList.toggle("dark");

    localStorage.setItem(
        "scm-dark-mode",
        document.body
            .classList.contains("dark")
            ? "1"
            : "0"
    );
}

if (
    localStorage.getItem(
        "scm-dark-mode"
    ) === "1"
) {

    document.body
        .classList.add("dark");
}


/* ============================================================
   HELPERS
============================================================ */

function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );
}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
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


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


function showError(message) {

    console.error(message);
}