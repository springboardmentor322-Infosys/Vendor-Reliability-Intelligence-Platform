"use strict";

/* ============================================================
   CONFIG
============================================================ */

const API_BASE = "http://127.0.0.1:8000";

let auditActivityChart = null;
let severityChart = null;
let complianceChart = null;
let categoryChart = null;
let statusChart = null;


/* ============================================================
   DOM HELPERS
============================================================ */

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   AUTHENTICATED FETCH
============================================================ */

function getAccessToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token")
    );
}


async function apiFetch(url, options = {}) {

    const token = getAccessToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {

        throw new Error(
            "Authentication required. Please log in again."
        );
    }

    if (!response.ok) {

        let message =
            `Request failed (${response.status})`;

        try {

            const error =
                await response.json();

            message =
                error.detail ||
                error.message ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


/* ============================================================
   DATE
============================================================ */

function formatDate(dateString) {

    if (!dateString) {
        return "—";
    }

    const date =
        new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "2-digit",
            year: "numeric"
        }
    );
}


function setDefaultDates() {

    const today =
        new Date();

    const firstDay =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

    $("startDate").value =
        firstDay.toISOString().slice(0, 10);

    $("endDate").value =
        today.toISOString().slice(0, 10);
}


/* ============================================================
   KPI
============================================================ */

function formatChange(
    value,
    label = "from previous period"
) {

    const number =
        Number(value || 0);

    if (number === 0) {
        return `No change ${label}`;
    }

    const sign =
        number > 0 ? "+" : "";

    return `${sign}${number} ${label}`;
}


function setChange(
    elementId,
    value,
    positiveClass = "positive"
) {

    const element =
        $(elementId);

    if (!element) {
        return;
    }

    const number =
        Number(value || 0);

    element.textContent =
        formatChange(number);

    element.className =
        number < 0
            ? "negative"
            : positiveClass;
}


function renderKPIs(data) {

    const kpi =
        data.kpis || {};

    $("totalAudits").textContent =
        kpi.total_audits ?? 0;

    $("completedAudits").textContent =
        kpi.completed_audits ?? 0;

    $("issuesIdentified").textContent =
        kpi.issues_identified ?? 0;

    $("avgCompliance").textContent =
        `${Number(
            kpi.avg_compliance_score || 0
        ).toFixed(0)}%`;

    $("openIssues").textContent =
        kpi.open_issues ?? 0;

    $("recommendations").textContent =
        kpi.recommendations ?? 0;

    setChange(
        "totalAuditsChange",
        kpi.total_audits_change
    );

    setChange(
        "completedAuditsChange",
        kpi.completed_audits_change
    );

    setChange(
        "issuesIdentifiedChange",
        kpi.issues_identified_change,
        "orange-text"
    );

    setChange(
        "complianceChange",
        kpi.compliance_change
    );

    setChange(
        "openIssuesChange",
        kpi.open_issues_change
    );

    setChange(
        "recommendationsChange",
        kpi.recommendations_change
    );
}


/* ============================================================
   CHART DEFAULTS
============================================================ */

Chart.defaults.font.family =
    "Inter, Segoe UI, Arial, sans-serif";

Chart.defaults.font.size = 10;

Chart.defaults.color =
    "#44546a";


/* ============================================================
   AUDIT ACTIVITY
============================================================ */

function renderAuditActivity(data) {

    const labels =
        data.map(item => item.short_month);

    const initiated =
        data.map(item => item.initiated);

    const completed =
        data.map(item => item.completed);

    if (auditActivityChart) {
        auditActivityChart.destroy();
    }

    auditActivityChart =
        new Chart(
            $("auditActivityChart"),
            {
                type: "line",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                "Audits Initiated",

                            data: initiated,

                            borderColor:
                                "#1768ed",

                            backgroundColor:
                                "rgba(23,104,237,0.08)",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            pointBackgroundColor:
                                "#1768ed"
                        },

                        {
                            label:
                                "Audits Completed",

                            data: completed,

                            borderColor:
                                "#16a75c",

                            backgroundColor:
                                "rgba(22,167,92,0.08)",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            pointBackgroundColor:
                                "#16a75c"
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

                        x: {
                            grid: {
                                display: false
                            },

                            border: {
                                display: false
                            }
                        },

                        y: {
                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            },

                            border: {
                                display: false
                            },

                            grid: {
                                color:
                                    "#edf1f6"
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   SEVERITY CHART
============================================================ */

function renderSeverityChart(data) {

    const labels =
        data.map(item => item.short_month);

    if (severityChart) {
        severityChart.destroy();
    }

    severityChart =
        new Chart(
            $("severityChart"),
            {
                type: "bar",

                data: {

                    labels,

                    datasets: [
                        {
                            label: "Informational",

                            data: data.map(
                                item =>
                                    item.informational
                            ),

                            backgroundColor:
                                "#16a75c",

                            borderRadius: 3
                        },

                        {
                            label: "Low",

                            data: data.map(
                                item =>
                                    item.low
                            ),

                            backgroundColor:
                                "#1768ed",

                            borderRadius: 3
                        },

                        {
                            label: "Medium",

                            data: data.map(
                                item =>
                                    item.medium
                            ),

                            backgroundColor:
                                "#f4960b",

                            borderRadius: 3
                        },

                        {
                            label: "High",

                            data: data.map(
                                item =>
                                    item.high
                            ),

                            backgroundColor:
                                "#ef3939",

                            borderRadius: 3
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        x: {
                            stacked: true,

                            grid: {
                                display: false
                            },

                            border: {
                                display: false
                            }
                        },

                        y: {
                            stacked: true,

                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            },

                            border: {
                                display: false
                            },

                            grid: {
                                color:
                                    "#edf1f6"
                            }
                        }
                    },

                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        );
}


/* ============================================================
   COMPLIANCE CHART
============================================================ */

function renderComplianceChart(data) {

    const labels =
        data.map(item => item.short_month);

    const scores =
        data.map(item => item.score);

    if (complianceChart) {
        complianceChart.destroy();
    }

    complianceChart =
        new Chart(
            $("complianceChart"),
            {
                type: "line",

                data: {

                    labels,

                    datasets: [
                        {
                            label:
                                "Compliance Score",

                            data: scores,

                            borderColor:
                                "#6936d7",

                            backgroundColor:
                                "rgba(105,54,215,0.12)",

                            fill: true,

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            pointBackgroundColor:
                                "#6936d7"
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

                        x: {
                            grid: {
                                display: false
                            },

                            border: {
                                display: false
                            }
                        },

                        y: {

                            min: 0,

                            max: 100,

                            ticks: {
                                callback:
                                    value =>
                                        `${value}%`
                            },

                            border: {
                                display: false
                            },

                            grid: {
                                color:
                                    "#edf1f6"
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   CATEGORY DONUT
============================================================ */

function renderCategoryChart(data) {

    const labels =
        data.map(item => item.category);

    const values =
        data.map(item => item.count);

    const total =
        values.reduce(
            (sum, value) =>
                sum + Number(value || 0),
            0
        );

    $("categoryTotal").textContent =
        total;

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart =
        new Chart(
            $("categoryChart"),
            {
                type: "doughnut",

                data: {

                    labels,

                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#1768ed",
                                "#16a75c",
                                "#f4960b",
                                "#6936d7",
                                "#11a6d9",
                                "#8794a8",
                                "#ef3939"
                            ],

                            borderWidth: 2,

                            borderColor:
                                "#ffffff"
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

    const legend =
        $("categoryLegend");

    if (!data.length) {

        legend.innerHTML =
            `<div class="empty-cell">
                No findings available
            </div>`;

        return;
    }

    legend.innerHTML =
        data.slice(0, 5)
            .map(
                (item, index) => {

                    const percentage =
                        total
                            ? Math.round(
                                item.count /
                                total *
                                100
                            )
                            : 0;

                    return `
                        <div class="legend-row">

                            <i
                                class="dot"
                                style="
                                    background:
                                    ${[
                                        "#1768ed",
                                        "#16a75c",
                                        "#f4960b",
                                        "#6936d7",
                                        "#11a6d9"
                                    ][index % 5]};
                                "
                            ></i>

                            <strong>
                                ${escapeHtml(
                                    item.category
                                )}
                            </strong>

                            <span>
                                ${item.count}
                                (${percentage}%)
                            </span>

                        </div>
                    `;
                }
            )
            .join("");
}


/* ============================================================
   TOP AREAS
============================================================ */

function renderTopAreas(data) {

    const container =
        $("topAreas");

    if (!data.length) {

        container.innerHTML =
            `<div class="empty-cell">
                No audited areas available
            </div>`;

        return;
    }

    const maximum =
        Math.max(
            ...data.map(
                item =>
                    Number(item.count || 0)
            ),
            1
        );

    container.innerHTML =
        data.map(item => {

            const width =
                Number(item.count || 0) /
                maximum *
                100;

            return `
                <div class="area-row">

                    <span class="area-name">
                        ${escapeHtml(item.area)}
                    </span>

                    <div class="area-track">

                        <div
                            class="area-fill"
                            style="width:${width}%"
                        ></div>

                    </div>

                    <span class="area-count">
                        ${item.count}
                    </span>

                </div>
            `;

        }).join("");
}


/* ============================================================
   STATUS DONUT
============================================================ */

function renderStatusChart(data) {

    const labels =
        data.map(item => item.status);

    const values =
        data.map(item => item.count);

    const total =
        values.reduce(
            (sum, value) =>
                sum + Number(value || 0),
            0
        );

    $("statusTotal").textContent =
        total;

    if (statusChart) {
        statusChart.destroy();
    }

    statusChart =
        new Chart(
            $("statusChart"),
            {
                type: "doughnut",

                data: {

                    labels,

                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#16a75c",
                                "#1768ed",
                                "#f4960b",
                                "#6936d7",
                                "#8794a8"
                            ],

                            borderWidth: 2,

                            borderColor:
                                "#ffffff"
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

    const legend =
        $("statusLegend");

    const statusColors = {
        "Completed": "#16a75c",
        "In Progress": "#1768ed",
        "Planned": "#f4960b",
        "Not Started": "#6936d7"
    };

    legend.innerHTML =
        data.map(item => {

            const percentage =
                total
                    ? Math.round(
                        item.count /
                        total *
                        100
                    )
                    : 0;

            return `
                <div class="legend-row">

                    <i
                        class="dot"
                        style="
                            background:
                            ${statusColors[item.status] ||
                            "#8794a8"};
                        "
                    ></i>

                    <strong>
                        ${escapeHtml(item.status)}
                    </strong>

                    <span>
                        ${item.count}
                        (${percentage}%)
                    </span>

                </div>
            `;

        }).join("");
}


/* ============================================================
   RECENT PERFORMANCE
============================================================ */

function statusClass(status) {

    switch (String(status || "").toLowerCase()) {

        case "completed":
            return "status-completed";

        case "in progress":
            return "status-progress";

        case "planned":
            return "status-planned";

        default:
            return "status-not-started";
    }
}


function renderPerformanceTable(data) {

    const tbody =
        $("performanceTable");

    if (!data.length) {

        tbody.innerHTML =
            `<tr>
                <td
                    colspan="8"
                    class="empty-cell"
                >
                    No audit performance records
                    found for the selected period.
                </td>
            </tr>`;

        return;
    }

    tbody.innerHTML =
        data.map(item => {

            const score =
                item.compliance_score;

            return `
                <tr>

                    <td>
                        <div class="audit-title"
                             title="${escapeHtml(
                                 item.audit_title
                             )}">
                            ${escapeHtml(
                                item.audit_title
                            )}
                        </div>
                    </td>

                    <td>
                        ${escapeHtml(
                            item.audit_type
                        )}
                    </td>

                    <td>
                        <span
                            class="status-pill
                            ${statusClass(item.status)}"
                        >
                            ${escapeHtml(
                                item.status
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(
                            item.auditor
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            item.start_date
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            item.completion_date
                        )}
                    </td>

                    <td>
                        ${item.issues_found ?? 0}
                    </td>

                    <td
                        class="${
                            score !== null &&
                            score !== undefined
                                ? "score-good"
                                : "score-empty"
                        }"
                    >
                        ${
                            score !== null &&
                            score !== undefined
                                ? `${Number(score).toFixed(0)}%`
                                : "—"
                        }
                    </td>

                </tr>
            `;

        }).join("");
}


/* ============================================================
   INSIGHTS
============================================================ */

function renderInsights(data) {

    const container =
        $("insightsContainer");

    if (!data.length) {

        container.innerHTML =
            `<div class="empty-cell">
                No insights available.
            </div>`;

        return;
    }

    container.innerHTML =
        data.map(item => {

            return `
                <div
                    class="insight
                    ${escapeHtml(
                        item.type || "info"
                    )}"
                >

                    <div class="insight-icon">

                        <i
                            class="fa-solid
                            ${escapeHtml(
                                item.icon ||
                                "fa-chart-column"
                            )}"
                        ></i>

                    </div>

                    <div class="insight-content">

                        <strong>
                            ${escapeHtml(
                                item.title
                            )}
                        </strong>

                        <p>
                            ${escapeHtml(
                                item.description
                            )}
                        </p>

                    </div>

                </div>
            `;

        }).join("");
}


/* ============================================================
   USER
============================================================ */

function renderUser(user) {

    if (!user) {
        return;
    }

    const name =
        user.name ||
        user.email ||
        "Auditor";

    const role =
        user.role ||
        "Auditor";

    $("sidebarUserName").textContent =
        name;

    $("sidebarUserRole").textContent =
        role;

    $("headerUserName").textContent =
        name;

    $("headerUserRole").textContent =
        role;
}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadAnalytics() {

    const start =
        $("startDate").value;

    const end =
        $("endDate").value;

    const trendMonths =
        $("trendMonths").value || 6;

    if (!start || !end) {
        return;
    }

    if (start > end) {

        alert(
            "Start date cannot be greater than end date."
        );

        return;
    }

    try {

        const params =
            new URLSearchParams({
                start_date: start,
                end_date: end,
                trend_months: trendMonths
            });

        const data =
            await apiFetch(
                `/api/auditor/analytics/dashboard?${params.toString()}`
            );

        renderUser(data.user);

        renderKPIs(data);

        renderAuditActivity(
            data.audit_activity || []
        );

        renderSeverityChart(
            data.issues_trend || []
        );

        renderComplianceChart(
            data.compliance_trend || []
        );

        renderCategoryChart(
            data.findings_by_category || []
        );

        renderTopAreas(
            data.top_areas || []
        );

        renderStatusChart(
            data.status_distribution || []
        );

        renderPerformanceTable(
            data.recent_performance || []
        );

        renderInsights(
            data.insights || []
        );

    } catch (error) {

        console.error(
            "AUDITOR ANALYTICS LOAD ERROR:",
            error
        );

        $("performanceTable").innerHTML =
            `<tr>
                <td
                    colspan="8"
                    class="empty-cell"
                >
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>`;

        $("insightsContainer").innerHTML =
            `<div class="empty-cell">
                Unable to load analytics.
            </div>`;
    }
}


/* ============================================================
   EVENTS
============================================================ */

function setupEvents() {

    const filterButton =
        $("filterButton");

    const filterPanel =
        $("filterPanel");

    const applyFilters =
        $("applyFilters");

    filterButton.addEventListener(
        "click",
        () => {

            filterPanel.classList.toggle(
                "show"
            );
        }
    );

    applyFilters.addEventListener(
        "click",
        () => {

            filterPanel.classList.remove(
                "show"
            );

            loadAnalytics();
        }
    );


    $("startDate").addEventListener(
        "change",
        loadAnalytics
    );

    $("endDate").addEventListener(
        "change",
        loadAnalytics
    );


    $("trendMonths").addEventListener(
        "change",
        loadAnalytics
    );


    $("globalSearch").addEventListener(
        "keydown",
        event => {

            if (event.key !== "Enter") {
                return;
            }

            const search =
                event.target.value
                    .trim()
                    .toLowerCase();

            if (!search) {
                loadAnalytics();
                return;
            }

            const rows =
                document.querySelectorAll(
                    "#performanceTable tr"
                );

            rows.forEach(row => {

                row.style.display =
                    row.textContent
                        .toLowerCase()
                        .includes(search)
                        ? ""
                        : "none";
            });
        }
    );
}


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setDefaultDates();

        setupEvents();

        await loadAnalytics();
    }
);