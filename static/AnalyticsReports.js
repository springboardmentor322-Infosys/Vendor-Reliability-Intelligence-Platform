/* ==========================================================
   VENDORIQ - ANALYTICS & REPORTS
========================================================== */

const API_BASE = "";

let dashboardData = null;


/* ==========================================================
   TOKEN
========================================================== */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token")
    );

}


/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    const response = await fetch(
        API_BASE + url,
        {
            ...options,
            headers
        }
    );


    if (response.status === 401) {

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token"
        );

        sessionStorage.removeItem(
            "access_token"
        );

        sessionStorage.removeItem(
            "token"
        );

        window.location.href =
            "/login";

        return null;
    }


    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            text ||
            `API error ${response.status}`
        );

    }


    return response.json();

}


/* ==========================================================
   DATE
========================================================== */

function getDateRange() {

    const days =
        Number(
            document.getElementById(
                "dateRange"
            ).value
        );

    const end =
        new Date();

    const start =
        new Date();

    start.setDate(
        end.getDate() - days
    );


    return {

        start:
            start.toISOString()
                .slice(0, 10),

        end:
            end.toISOString()
                .slice(0, 10)

    };

}


/* ==========================================================
   FORMAT
========================================================== */

function money(value) {

    value =
        Number(value || 0);


    if (Math.abs(value) >= 1000000) {

        return "$" +
            (
                value / 1000000
            ).toFixed(2) +
            "M";

    }


    if (Math.abs(value) >= 1000) {

        return "$" +
            (
                value / 1000
            ).toFixed(1) +
            "K";

    }


    return "$" +
        value.toFixed(0);

}


function number(value) {

    return Number(
        value || 0
    ).toLocaleString();

}


/* ==========================================================
   LOAD DASHBOARD
========================================================== */

async function loadDashboard() {

    try {

        const range =
            getDateRange();


        const url =
            `/api/analytics/dashboard` +
            `?start_date=${range.start}` +
            `&end_date=${range.end}`;


        dashboardData =
            await apiFetch(url);


        if (!dashboardData) {

            return;

        }


        renderSummary(
            dashboardData.summary
        );

        renderPerformanceChart(
            dashboardData.trend
        );

        renderCostBreakdown(
            dashboardData.cost_breakdown,
            dashboardData.summary.total_cost
        );

        renderServiceLevel(
            dashboardData.service_level
        );

        renderPerformance(
            dashboardData.performance
        );

        renderSuppliers(
            dashboardData.suppliers
        );

        renderDemandSupply(
            dashboardData.demand_supply
        );

        renderInventory(
            dashboardData.inventory
        );

        renderReports(
            dashboardData.reports
        );

        renderInsights(
            dashboardData.insights
        );


    } catch (error) {

        console.error(
            "Analytics dashboard error:",
            error
        );

        showError(
            "Unable to load analytics data."
        );

    }

}


/* ==========================================================
   SUMMARY
========================================================== */

function renderSummary(summary) {

    document.getElementById(
        "totalRevenue"
    ).textContent =
        money(summary.total_revenue);


    document.getElementById(
        "totalOrders"
    ).textContent =
        number(summary.total_orders);


    document.getElementById(
        "totalShipments"
    ).textContent =
        number(summary.total_shipments);


    document.getElementById(
        "totalCost"
    ).textContent =
        money(summary.total_cost);


    document.getElementById(
        "inventoryTurnover"
    ).textContent =
        Number(
            summary.inventory_turnover || 0
        ).toFixed(1) + "x";


    document.getElementById(
        "costCenter"
    ).textContent =
        money(summary.total_cost);

}


/* ==========================================================
   SVG HELPERS
========================================================== */

function createSvgLine(
    values,
    width,
    height,
    maxValue
) {

    if (!values.length) {

        return "";

    }


    const padding = 25;

    const usableWidth =
        width - padding * 2;

    const usableHeight =
        height - padding * 2;


    return values.map(
        (value, index) => {

            const x =
                padding +
                (
                    index /
                    Math.max(
                        values.length - 1,
                        1
                    )
                ) *
                usableWidth;


            const y =
                height -
                padding -
                (
                    Number(value) /
                    Math.max(
                        maxValue,
                        1
                    )
                ) *
                usableHeight;


            return `${x},${y}`;

        }
    ).join(" ");

}


/* ==========================================================
   PERFORMANCE CHART
========================================================== */

function renderPerformanceChart(data) {

    const svg =
        document.getElementById(
            "performanceChart"
        );


    svg.innerHTML = "";


    if (!data.labels.length) {

        svg.innerHTML =
            `<text x="50%" y="50%"
             text-anchor="middle"
             font-size="14"
             fill="#8a94a6">
             No trend data available
             </text>`;

        return;

    }


    const width = 700;

    const height = 300;


    const maxValue =
        Math.max(
            ...data.revenue,
            ...data.cost,
            ...data.profit,
            1
        );


    let html = "";


    /* GRID */

    for (let i = 0; i < 5; i++) {

        const y =
            25 +
            i *
            (
                (height - 50) /
                4
            );


        html +=
            `<line
                x1="25"
                y1="${y}"
                x2="675"
                y2="${y}"
                stroke="#edf0f5"
            />`;

    }


    /* REVENUE */

    const revenuePoints =
        createSvgLine(
            data.revenue,
            width,
            height,
            maxValue
        );


    const costPoints =
        createSvgLine(
            data.cost,
            width,
            height,
            maxValue
        );


    const profitPoints =
        createSvgLine(
            data.profit,
            width,
            height,
            maxValue
        );


    html +=
        `<polyline
            points="${revenuePoints}"
            fill="none"
            stroke="#2563eb"
            stroke-width="3"
        />`;


    html +=
        `<polyline
            points="${costPoints}"
            fill="none"
            stroke="#f59e0b"
            stroke-width="3"
        />`;


    html +=
        `<polyline
            points="${profitPoints}"
            fill="none"
            stroke="#0ca56b"
            stroke-width="3"
        />`;


    /* X LABELS */

    data.labels.forEach(
        (label, index) => {

            const x =
                25 +
                (
                    index /
                    Math.max(
                        data.labels.length - 1,
                        1
                    )
                ) *
                650;


            html +=
                `<text
                    x="${x}"
                    y="292"
                    text-anchor="middle"
                    font-size="10"
                    fill="#6d7890"
                >
                    ${label}
                </text>`;

        }
    );


    svg.innerHTML =
        html;

}


/* ==========================================================
   COST BREAKDOWN
========================================================== */

function renderCostBreakdown(
    items,
    total
) {

    const legend =
        document.getElementById(
            "costLegend"
        );


    legend.innerHTML = "";


    const colors = [
        "#2563eb",
        "#0ca56b",
        "#f59e0b",
        "#7135c7",
        "#94a3b8"
    ];


    let cumulative = 0;


    const stops =
        items.map(
            (item, index) => {

                const start =
                    cumulative;

                cumulative +=
                    Number(
                        item.percentage
                    );


                return `${colors[index % colors.length]} ${start}% ${cumulative}%`;

            }
        );


    if (stops.length) {

        document.getElementById(
            "costDonut"
        ).style.background =
            `conic-gradient(${stops.join(",")})`;

    }


    items.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "cost-row";


            row.innerHTML = `

                <span
                    class="dot"
                    style="
                    background:${colors[index % colors.length]}
                    "
                ></span>

                <span>
                    ${item.category}
                </span>

                <strong>
                    ${money(item.amount)}
                    (${item.percentage}%)
                </strong>

            `;


            legend.appendChild(row);

        }
    );


    document.getElementById(
        "costCenter"
    ).textContent =
        money(total);

}


/* ==========================================================
   SERVICE LEVEL
========================================================== */

function renderServiceLevel(data) {

    document.getElementById(
        "serviceValue"
    ).textContent =
        Number(
            data.current || 0
        ).toFixed(1) + "%";


    const percentage =
        Math.min(
            Math.max(
                Number(data.current || 0),
                0
            ),
            100
        );


    const degrees =
        percentage * 1.8;


    document.getElementById(
        "serviceGauge"
    ).style.background =
        `conic-gradient(
            from 270deg,
            #0ca56b 0deg ${degrees * .72}deg,
            #f59e0b ${degrees * .72}deg ${degrees * .88}deg,
            #ef4444 ${degrees * .88}deg ${degrees}deg,
            transparent ${degrees}deg 360deg
        )`;


    renderSmallLineChart(
        "serviceChart",
        data.values
    );

}


/* ==========================================================
   SMALL CHART
========================================================== */

function renderSmallLineChart(
    elementId,
    values
) {

    const svg =
        document.getElementById(
            elementId
        );


    svg.innerHTML = "";


    if (!values.length) {

        return;

    }


    const max =
        Math.max(
            ...values,
            100
        );


    const points =
        createSvgLine(
            values,
            700,
            150,
            max
        );


    svg.innerHTML = `

        <polyline
            points="${points}"
            fill="none"
            stroke="#2563eb"
            stroke-width="3"
        />

    `;

}


/* ==========================================================
   PERFORMANCE TABLE
========================================================== */

function renderPerformance(items) {

    const container =
        document.getElementById(
            "performanceTable"
        );


    container.innerHTML = "";


    items.forEach(
        item => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "metric-row";


            row.innerHTML = `

                <span>
                    ${item.metric}
                </span>

                <div class="progress">

                    <span
                        style="
                        width:${Math.min(
                            item.performance,
                            100
                        )}%
                        "
                    ></span>

                </div>

                <strong>
                    ${item.performance.toFixed(1)}%
                </strong>

                <span class="status">
                    ${item.status}
                </span>

            `;


            container.appendChild(
                row
            );

        }
    );

}


/* ==========================================================
   SUPPLIERS
========================================================== */

function renderSuppliers(items) {

    const tbody =
        document.getElementById(
            "supplierTable"
        );


    tbody.innerHTML = "";


    items.forEach(
        item => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = `

                <td>
                    ${item.supplier}
                </td>

                <td>
                    ${item.on_time_delivery.toFixed(1)}%
                </td>

                <td>
                    ${item.quality_score.toFixed(1)}
                    ★
                </td>

                <td>
                    ${item.total_orders}
                </td>

            `;


            tbody.appendChild(
                tr
            );

        }
    );

}


/* ==========================================================
   DEMAND VS SUPPLY
========================================================== */

function renderDemandSupply(items) {

    const svg =
        document.getElementById(
            "demandSupplyChart"
        );


    svg.innerHTML = "";


    if (!items.length) {

        return;

    }


    const max =
        Math.max(
            ...items.map(
                x =>
                    Math.max(
                        x.demand,
                        x.supply
                    )
            ),
            1
        );


    let html = "";


    const groupWidth =
        650 / items.length;


    items.forEach(
        (item, index) => {

            const x =
                30 +
                index *
                groupWidth;


            const demandHeight =
                (
                    item.demand /
                    max
                ) * 210;


            const supplyHeight =
                (
                    item.supply /
                    max
                ) * 210;


            html += `

                <rect
                    x="${x}"
                    y="${240 - demandHeight}"
                    width="16"
                    height="${demandHeight}"
                    fill="#2563eb"
                    rx="2"
                />

                <rect
                    x="${x + 20}"
                    y="${240 - supplyHeight}"
                    width="16"
                    height="${supplyHeight}"
                    fill="#0ca56b"
                    rx="2"
                />

                <text
                    x="${x + 18}"
                    y="265"
                    text-anchor="middle"
                    font-size="9"
                    fill="#6d7890"
                >
                    ${item.label}
                </text>

            `;

        }
    );


    svg.innerHTML =
        html;

}


/* ==========================================================
   INVENTORY
========================================================== */

function renderInventory(data) {

    document.getElementById(
        "avgInventory"
    ).textContent =
        money(
            data.average_inventory_value
        );


    document.getElementById(
        "stockoutValue"
    ).textContent =
        money(
            data.stockout_value
        );


    document.getElementById(
        "slowMoving"
    ).textContent =
        number(
            data.slow_moving_items
        );


    document.getElementById(
        "excessInventory"
    ).textContent =
        money(
            data.excess_inventory
        );


    const tbody =
        document.getElementById(
            "inventoryTable"
        );


    tbody.innerHTML = "";


    data.categories.forEach(
        item => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = `

                <td>
                    ${item.category}
                </td>

                <td>
                    ${money(
                        item.inventory_value
                    )}
                </td>

                <td>
                    ${item.percentage.toFixed(1)}%
                </td>

                <td>
                    ${item.turnover_rate.toFixed(1)}x
                </td>

            `;


            tbody.appendChild(
                tr
            );

        }
    );

}


/* ==========================================================
   REPORTS
========================================================== */

function renderReports(items) {

    const container =
        document.getElementById(
            "reportList"
        );


    container.innerHTML = "";


    if (!items.length) {

        container.innerHTML =
            `<div class="report-item">
                <span>No reports available.</span>
            </div>`;

        return;

    }


    items.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "report-item";


            div.innerHTML = `

                <div class="report-icon">
                    ▤
                </div>

                <div>

                    <strong>
                        ${item.report_name}
                    </strong>

                    <span>
                        ${item.category}
                    </span>

                    <span>
                        Generated:
                        ${
                            item.generated_at
                            ? new Date(
                                item.generated_at
                            ).toLocaleDateString()
                            : "N/A"
                        }
                    </span>

                </div>

            `;


            container.appendChild(
                div
            );

        }
    );

}


/* ==========================================================
   INSIGHTS
========================================================== */

function renderInsights(items) {

    const container =
        document.getElementById(
            "insightList"
        );


    container.innerHTML = "";


    if (!items.length) {

        container.innerHTML =
            `<div class="insight-item">
                <strong>
                    No new insights
                </strong>

                <p>
                    Your supply chain is currently
                    operating without recorded alerts.
                </p>
            </div>`;

        return;

    }


    items.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "insight-item";


            div.innerHTML = `

                <strong>
                    ${item.title}
                </strong>

                <p>
                    ${item.description}
                </p>

                <p>
                    ${item.action || ""}
                    →
                </p>

            `;


            container.appendChild(
                div
            );

        }
    );

}


/* ==========================================================
   CLOCK
========================================================== */

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


/* ==========================================================
   DATE RANGE
========================================================== */

document.getElementById(
    "dateRange"
).addEventListener(
    "change",
    loadDashboard
);


/* ==========================================================
   EXPORT
========================================================== */

document.getElementById(
    "exportButton"
).addEventListener(
    "click",
    () => {

        if (!dashboardData) {

            return;

        }


        const rows = [
            [
                "Metric",
                "Value"
            ],

            [
                "Total Revenue",
                dashboardData.summary.total_revenue
            ],

            [
                "Total Orders",
                dashboardData.summary.total_orders
            ],

            [
                "Total Shipments",
                dashboardData.summary.total_shipments
            ],

            [
                "Total Cost",
                dashboardData.summary.total_cost
            ],

            [
                "Inventory Turnover",
                dashboardData.summary.inventory_turnover
            ]
        ];


        const csv =
            rows
                .map(
                    row =>
                        row.join(",")
                )
                .join("\n");


        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const a =
            document.createElement(
                "a"
            );


        a.href = url;

        a.download =
            "supply-chain-analytics.csv";

        a.click();


        URL.revokeObjectURL(
            url
        );

    }
);


/* ==========================================================
   SEARCH
========================================================== */

document.getElementById(
    "searchInput"
).addEventListener(
    "input",
    event => {

        const search =
            event.target.value
                .toLowerCase()
                .trim();


        document.querySelectorAll(
            ".panel"
        ).forEach(
            panel => {

                if (!search) {

                    panel.style.opacity =
                        "1";

                    return;

                }


                panel.style.opacity =
                    panel.innerText
                        .toLowerCase()
                        .includes(search)
                        ? "1"
                        : ".35";

            }
        );

    }
);


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


/* ==========================================================
   ERROR
========================================================== */

function showError(message) {

    console.error(message);

    const banner = document.getElementById("dashboardError");

    if (banner) {
        banner.textContent = message;
        banner.style.display = "block";
    } else {
        alert(message);
    }
}


/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    loadDashboard
);