const API_BASE = window.location.origin;

let revenueTrendChart = null;
let sourceChart = null;

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];


// ============================================================
// AUTH
// ============================================================

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        ""
    );
}


// ============================================================
// API
// ============================================================

async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {

        console.error(
            "Revenue page: authentication required"
        );

        throw new Error(
            "Authentication required"
        );
    }

    if (!response.ok) {

        const text = await response.text();

        throw new Error(
            `HTTP ${response.status}: ${text}`
        );
    }

    return response.json();
}


// ============================================================
// HELPERS
// ============================================================

function money(value) {

    const number = Number(value || 0);

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(number);
}


function number(value) {

    return new Intl.NumberFormat(
        "en-IN"
    ).format(
        Number(value || 0)
    );
}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


// ============================================================
// YEAR SELECT
// ============================================================

function initializeYears() {

    const select =
        document.getElementById("yearSelect");

    const currentYear =
        new Date().getFullYear();

    for (
        let year = currentYear;
        year >= currentYear - 5;
        year--
    ) {

        const option =
            document.createElement("option");

        option.value = year;
        option.textContent = year;

        select.appendChild(option);
    }

    /*
       The screenshot shows 2025.
       If 2025 exists in the list, use it
       as the initial display year.
    */

    if (
        currentYear >= 2025 &&
        currentYear - 5 <= 2025
    ) {
        select.value = "2025";
    }

    else {
        select.value = currentYear;
    }
}


// ============================================================
// DEFAULT MONTH
// ============================================================

function initializeMonth() {

    const select =
        document.getElementById("monthSelect");

    /*
       Screenshot uses May 2025.
    */

    select.value = "5";
}


// ============================================================
// LOAD REVENUE
// ============================================================

async function loadRevenue() {

    try {

        const year =
            Number(
                document.getElementById(
                    "yearSelect"
                ).value
            );

        const month =
            Number(
                document.getElementById(
                    "monthSelect"
                ).value
            );

        setLoading(true);

        const url =
            `${API_BASE}/api/finance/revenue-dashboard` +
            `?year=${year}&month=${month}`;

        const data =
            await apiFetch(url);

        renderDashboard(data);

    }

    catch (error) {

        console.error(
            "Revenue dashboard load error:",
            error
        );

        showError(
            error.message
        );

    }

    finally {

        setLoading(false);
    }
}


// ============================================================
// RENDER DASHBOARD
// ============================================================

function renderDashboard(data) {

    renderKPIs(
        data.kpis,
        data.year,
        data.month
    );

    renderTrend(
        data.trend,
        data.year
    );

    renderSources(
        data.sources
    );

    renderDepartments(
        data.departments
    );

    renderOverview(
        data.overview
    );

    renderRecentTransactions(
        data.recent_transactions
    );

    renderInsights(
        data.insights
    );
}


// ============================================================
// KPI
// ============================================================

function renderKPIs(
    kpis,
    year,
    month
) {

    setText(
        "totalRevenue",
        money(kpis.total_revenue)
    );

    setText(
        "monthRevenue",
        money(kpis.this_month_revenue)
    );

    setText(
        "averageRevenue",
        money(kpis.average_monthly_revenue)
    );

    setText(
        "totalInvoices",
        number(kpis.total_invoices)
    );

    setText(
        "revenueTarget",
        `${Number(kpis.revenue_target || 0).toFixed(1)}%`
    );

    setText(
        "monthLabel",
        `${months[month - 1]} ${year}`
    );

    const growth =
        Number(kpis.month_growth || 0);

    setText(
        "revenueGrowth",
        growth >= 0
            ? `↑ ${growth.toFixed(1)}%`
            : `↓ ${Math.abs(growth).toFixed(1)}%`
    );

    setText(
        "monthGrowth",
        growth >= 0
            ? `↑ ${growth.toFixed(1)}%`
            : `↓ ${Math.abs(growth).toFixed(1)}%`
    );

    const progress =
        Math.min(
            Number(kpis.revenue_target || 0),
            100
        );

    const targetProgress =
        document.getElementById(
            "targetProgress"
        );

    if (targetProgress) {

        targetProgress.style.width =
            `${progress}%`;
    }

    setText(
        "trendYear",
        `${year} vs ${year - 1}`
    );
}


// ============================================================
// TREND CHART
// ============================================================

function renderTrend(
    trend,
    year
) {

    const canvas =
        document.getElementById(
            "revenueTrendChart"
        );

    if (revenueTrendChart) {
        revenueTrendChart.destroy();
    }

    revenueTrendChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels: trend.labels,

                    datasets: [

                        {
                            label:
                                `This Year (${year})`,

                            data:
                                trend.this_year,

                            borderColor:
                                "#1467e8",

                            backgroundColor:
                                "rgba(20,103,232,.08)",

                            borderWidth: 2,

                            tension: .35,

                            pointRadius: 3,

                            pointBackgroundColor:
                                "#1467e8"
                        },

                        {
                            label:
                                `Last Year (${year - 1})`,

                            data:
                                trend.last_year,

                            borderColor:
                                "#13a864",

                            backgroundColor:
                                "rgba(19,168,100,.08)",

                            borderWidth: 2,

                            tension: .35,

                            pointRadius: 3,

                            pointBackgroundColor:
                                "#13a864"
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                        mode: "index",
                        intersect: false
                    },

                    plugins: {

                        legend: {
                            position: "top",
                            align: "center",
                            labels: {
                                boxWidth: 8,
                                font: {
                                    size: 10
                                }
                            }
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {
                                font: {
                                    size: 9
                                },

                                callback: function(value) {

                                    return (
                                        "₹" +
                                        Number(value)
                                            .toLocaleString(
                                                "en-IN"
                                            )
                                    );
                                }
                            },

                            grid: {
                                color:
                                    "#edf0f5"
                            }

                        },

                        x: {

                            ticks: {
                                font: {
                                    size: 9
                                }
                            },

                            grid: {
                                color:
                                    "#f0f2f6"
                            }
                        }
                    }
                }
            }
        );
}


// ============================================================
// SOURCES
// ============================================================

function renderSources(
    sources
) {

    const canvas =
        document.getElementById(
            "sourceChart"
        );

    const legend =
        document.getElementById(
            "sourceLegend"
        );

    if (sourceChart) {
        sourceChart.destroy();
    }

    const labels =
        sources.map(
            item => item.source
        );

    const values =
        sources.map(
            item => item.amount
        );

    const colors = [
        "#1467e8",
        "#13a864",
        "#ff991c",
        "#8248d6",
        "#e32955",
        "#a9b3c3",
        "#6b7c99"
    ];

    sourceChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {
                    labels,
                    datasets: [
                        {
                            data: values,
                            backgroundColor:
                                colors,
                            borderWidth: 2,
                            borderColor: "#fff"
                        }
                    ]
                },

                options: {

                    cutout: "67%",

                    plugins: {
                        legend: {
                            display: false
                        }
                    },

                    maintainAspectRatio: false
                }
            }
        );

    legend.innerHTML = "";

    sources
        .slice(0, 7)
        .forEach(
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
                            ${colors[index]};
                        "
                    ></span>

                    <span>
                        ${escapeHtml(item.source)}
                    </span>

                    <strong>
                        ${Number(
                            item.percentage || 0
                        ).toFixed(1)}%
                    </strong>
                `;

                legend.appendChild(row);
            }
        );
}


// ============================================================
// DEPARTMENTS
// ============================================================

function renderDepartments(
    departments
) {

    const container =
        document.getElementById(
            "departmentsList"
        );

    container.innerHTML = "";

    if (!departments.length) {

        container.innerHTML =
            `<p class="empty" style="font-size: 10px;">
                No department revenue data.
            </p>`;

        return;
    }

    const max =
        Math.max(
            ...departments.map(
                item =>
                    Number(item.amount || 0)
            )
        );

    departments
        .slice(0, 5)
        .forEach(
            item => {

                const width =
                    max
                        ? (
                            Number(item.amount)
                            / max
                        ) * 100
                        : 0;

                const element =
                    document.createElement(
                        "div"
                    );

                element.className =
                    "department-item";

                element.innerHTML = `

                    <div class="department-head">

                        <div class="department-name">

                            <span class="rank">
                                ${item.rank}
                            </span>

                            <span>
                                ${escapeHtml(
                                    item.department
                                )}
                            </span>

                        </div>

                        <span class="department-amount">
                            ${money(item.amount)}
                        </span>

                    </div>

                    <div class="department-bar">
                        <div
                            style="width:${width}%"
                        ></div>
                    </div>

                `;

                container.appendChild(element);
            }
        );
}


// ============================================================
// OVERVIEW
// ============================================================

function renderOverview(
    rows
) {

    const body =
        document.getElementById(
            "overviewBody"
        );

    body.innerHTML = "";

    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td colspan="6">
                    No revenue plan data found.
                </td>
            </tr>
        `;

        return;
    }

    rows.forEach(
        row => {

            const tr =
                document.createElement(
                    "tr"
                );

            const statusClass =
                row.status === "Over Target"
                    ? "over"
                    : "under";

            tr.innerHTML = `

                <td>
                    ${escapeHtml(row.source)}
                </td>

                <td>
                    ${money(row.budget)}
                </td>

                <td>
                    ${money(row.actual)}
                </td>

                <td>
                    ${money(row.variance)}
                </td>

                <td>
                    ${Number(
                        row.variance_percentage || 0
                    ).toFixed(2)}%
                </td>

                <td>
                    <span
                        class="status ${statusClass}"
                    >
                        ${escapeHtml(row.status)}
                    </span>
                </td>

            `;

            body.appendChild(tr);
        }
    );
}


// ============================================================
// RECENT
// ============================================================

function renderRecentTransactions(
    rows
) {

    const container =
        document.getElementById(
            "recentTransactions"
        );

    container.innerHTML = "";

    if (!rows.length) {

        container.innerHTML =
            `<p style="font-size:10px;">No recent revenue transactions.</p>`;

        return;
    }

    rows.forEach(
        row => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "recent-item";

            item.innerHTML = `

                <div class="recent-icon">
                    <i
                        class="fa-solid
                        fa-money-bill-transfer"
                    ></i>
                </div>

                <div class="recent-content">

                    <strong>
                        ${escapeHtml(
                            row.title
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            row.category || ""
                        )}
                        ${row.department
                            ? " • " +
                              escapeHtml(
                                  row.department
                              )
                            : ""
                        }
                    </small>

                    <small>
                        ${formatDate(row.date)}
                    </small>

                </div>

                <div class="recent-amount">
                    ${money(row.amount)}
                </div>

            `;

            container.appendChild(item);
        }
    );
}


// ============================================================
// INSIGHTS
// ============================================================

function renderInsights(
    insights
) {

    const container =
        document.getElementById(
            "insights"
        );

    container.innerHTML = "";

    insights.forEach(
        insight => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "insight";

            item.innerHTML =
                escapeHtml(
                    insight.text
                );

            container.appendChild(item);
        }
    );
}


// ============================================================
// PROFILE
// ============================================================

async function loadProfile() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/finance/profile`
            );

        const name =
            data.name ||
            "Finance Officer";

        const role =
            data.role ||
            "Finance Officer";

        setText(
            "sidebarName",
            name
        );

        setText(
            "headerName",
            name
        );

        setText(
            "sidebarRole",
            role
        );

        setText(
            "headerRole",
            role
        );

    }

    catch (error) {

        console.warn(
            "Unable to load finance profile:",
            error
        );
    }
}


// ============================================================
// LOADING
// ============================================================

function setLoading(
    loading
) {

    const button =
        document.getElementById(
            "refreshBtn"
        );

    if (!button) return;

    button.disabled =
        loading;

    button.innerHTML =
        loading
            ? `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading
              `
            : `
                <i class="fa-solid fa-rotate"></i>
                Refresh
              `;
}


// ============================================================
// ERROR
// ============================================================

function showError(
    message
) {

    console.error(
        message
    );

    const body =
        document.getElementById(
            "overviewBody"
        );

    if (body) {

        body.innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load revenue data.
                    ${escapeHtml(message)}
                </td>
            </tr>
        `;
    }
}


// ============================================================
// DATE
// ============================================================

function formatDate(
    value
) {

    if (!value) {
        return "";
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
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// ============================================================
// ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// EVENTS
// ============================================================

function setupEvents() {

    document
        .getElementById(
            "yearSelect"
        )
        .addEventListener(
            "change",
            loadRevenue
        );

    document
        .getElementById(
            "monthSelect"
        )
        .addEventListener(
            "change",
            loadRevenue
        );

    document
        .getElementById(
            "refreshBtn"
        )
        .addEventListener(
            "click",
            loadRevenue
        );

    document
        .getElementById(
            "viewAllBtn"
        )
        .addEventListener(
            "click",
            () => {

                window.location.href =
                    "/financial-reports";
            }
        );

    document
        .getElementById(
            "globalSearch"
        )
        .addEventListener(
            "input",
            event => {

                const search =
                    event.target.value
                        .trim()
                        .toLowerCase();

                document
                    .querySelectorAll(
                        ".recent-item"
                    )
                    .forEach(
                        item => {

                            item.style.display =
                                item.textContent
                                    .toLowerCase()
                                    .includes(search)
                                    ? ""
                                    : "none";
                        }
                    );
            }
        );
}


// ============================================================
// INIT
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeYears();

        initializeMonth();

        setupEvents();

        await loadProfile();

        await loadRevenue();
    }
);