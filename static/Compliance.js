/* ============================================================
   FINMANAGE COMPLIANCE DASHBOARD
============================================================ */

"use strict";


const API_BASE = "http://127.0.0.1:8000";


let complianceTrendChart = null;
let complianceStatusChart = null;


/* ============================================================
   TOKEN
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        ""
    );
}


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {

        headers[
            "Authorization"
        ] = `Bearer ${token}`;

    }

    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );


    let data = null;

    try {

        data = await response.json();

    } catch {

        data = null;

    }


    if (
        response.status === 401
    ) {

        console.error(
            "Authentication failed."
        );

        sessionStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "jwt_token"
        );

        throw new Error(
            "Not authenticated"
        );
    }


    if (!response.ok) {

        throw new Error(
            data?.detail ||
            data?.message ||
            `HTTP ${response.status}`
        );

    }

    return data;
}


/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

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


/* ============================================================
   DAYS REMAINING
============================================================ */

function getDaysRemaining(
    dateString
) {

    if (!dateString) {
        return null;
    }

    const today =
        new Date();

    today.setHours(
        0, 0, 0, 0
    );

    const target =
        new Date(dateString);

    target.setHours(
        0, 0, 0, 0
    );

    return Math.ceil(
        (
            target - today
        ) /
        86400000
    );
}


/* ============================================================
   LOAD CURRENT USER
============================================================ */

async function loadCurrentUser() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/auth/me`
            );

        const name =
            data?.name ||
            "Rajesh Kumar";

        const nameElements =
            document.querySelectorAll(
                "#profileName, #sidebarUserName"
            );

        nameElements.forEach(
            element => {
                element.textContent =
                    name;
            }
        );

    } catch (error) {

        console.warn(
            "Unable to load user:",
            error
        );

    }
}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadComplianceDashboard() {

    try {

        showLoadingState();


        const data =
            await apiFetch(
                `${API_BASE}/api/compliance/dashboard`
            );


        if (
            !data ||
            data.success === false
        ) {

            throw new Error(
                "Invalid dashboard response"
            );

        }


        renderKPIs(
            data.kpis
        );


        renderTrendChart(
            data.trend || []
        );


        renderStatusChart(
            data.status_overview || {}
        );


        renderCategories(
            data.categories || []
        );


        renderActivities(
            data.activities || []
        );


        renderDeadlines(
            data.deadlines || []
        );


        renderAlerts(
            data.alerts || []
        );


    } catch (error) {

        console.error(
            "Compliance dashboard error:",
            error
        );

        showErrorState(
            error.message
        );

    }
}


/* ============================================================
   KPI
============================================================ */

function renderKPIs(
    kpis
) {

    if (!kpis) {
        return;
    }


    const overallScore =
        Number(
            kpis.overall_score || 0
        );

    const totalAreas =
        Number(
            kpis.total_areas || 0
        );

    const compliant =
        Number(
            kpis.compliant_areas || 0
        );

    const atRisk =
        Number(
            kpis.at_risk_areas || 0
        );

    const nonCompliant =
        Number(
            kpis.non_compliant_areas || 0
        );

    const pendingTasks =
        Number(
            kpis.pending_tasks || 0
        );


    setText(
        "overallScore",
        `${overallScore.toFixed(1)}%`
    );


    setText(
        "compliantAreas",
        compliant
    );


    setText(
        "riskAreas",
        atRisk
    );


    setText(
        "nonCompliantAreas",
        nonCompliant
    );


    setText(
        "pendingTasks",
        pendingTasks
    );


    const compliantPercentage =
        totalAreas
            ? (
                compliant /
                totalAreas *
                100
            )
            : 0;


    const riskPercentage =
        totalAreas
            ? (
                atRisk /
                totalAreas *
                100
            )
            : 0;


    const nonCompliantPercentage =
        totalAreas
            ? (
                nonCompliant /
                totalAreas *
                100
            )
            : 0;


    setText(
        "compliantPercentage",
        `${compliantPercentage.toFixed(1)}%`
    );


    setText(
        "riskPercentage",
        `${riskPercentage.toFixed(1)}%`
    );


    setText(
        "nonCompliantPercentage",
        `${nonCompliantPercentage.toFixed(1)}%`
    );


    const progress =
        document.getElementById(
            "scoreProgress"
        );

    if (progress) {

        progress.style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    overallScore
                )
            )}%`;

    }


    const status =
        document.getElementById(
            "overallStatus"
        );

    if (status) {

        if (overallScore >= 90) {

            status.textContent =
                "Good";

        } else if (overallScore >= 75) {

            status.textContent =
                "Needs Attention";

        } else {

            status.textContent =
                "At Risk";

        }

    }

}


/* ============================================================
   TREND CHART
============================================================ */

function renderTrendChart(
    trend
) {

    const canvas =
        document.getElementById(
            "complianceTrendChart"
        );

    if (!canvas) {
        return;
    }


    if (
        complianceTrendChart
    ) {

        complianceTrendChart.destroy();

    }


    const labels =
        trend.map(
            item =>
                item.month
        );


    const values =
        trend.map(
            item =>
                Number(
                    item.score || 0
                )
        );


    complianceTrendChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Compliance Score",

                            data:
                                values,

                            borderColor:
                                "#1677f9",

                            backgroundColor:
                                "rgba(22,119,249,.10)",

                            borderWidth: 2,

                            pointRadius: 3,

                            pointHoverRadius: 5,

                            fill: true,

                            tension: .35

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        intersect: false,

                        mode: "index"

                    },

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        `Compliance Score: ${context.parsed.y}%`

                            }

                        }

                    },

                    scales: {

                        y: {

                            min: 0,

                            max: 100,

                            ticks: {

                                font: {
                                    size: 9
                                },

                                callback:
                                    value =>
                                        `${value}%`

                            },

                            grid: {
                                color:
                                    "#edf1f6"
                            }

                        },

                        x: {

                            ticks: {

                                font: {
                                    size: 9
                                }

                            },

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            }
        );

}


/* ============================================================
   STATUS DONUT
============================================================ */

function renderStatusChart(
    status
) {

    const canvas =
        document.getElementById(
            "complianceStatusChart"
        );

    if (!canvas) {
        return;
    }


    if (
        complianceStatusChart
    ) {

        complianceStatusChart.destroy();

    }


    const compliant =
        Number(
            status.compliant || 0
        );

    const atRisk =
        Number(
            status.at_risk || 0
        );

    const nonCompliant =
        Number(
            status.non_compliant || 0
        );

    const total =
        Number(
            status.total ||
            (
                compliant +
                atRisk +
                nonCompliant
            )
        );


    setText(
        "totalAreas",
        total
    );


    complianceStatusChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Compliant",
                        "At Risk",
                        "Non-Compliant"
                    ],

                    datasets: [

                        {

                            data: [
                                compliant,
                                atRisk,
                                nonCompliant
                            ],

                            backgroundColor: [
                                "#18a765",
                                "#f59b23",
                                "#ef3d4c"
                            ],

                            borderWidth: 2,

                            borderColor: "#ffffff"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "66%",

                    plugins: {

                        legend: {
                            display: false
                        }

                    }

                }

            }
        );


    renderStatusLegend(
        compliant,
        atRisk,
        nonCompliant,
        total
    );


    const message =
        document.getElementById(
            "complianceMessage"
        );

    if (message) {

        if (total > 0) {

            const percentage =
                (
                    compliant /
                    total *
                    100
                ).toFixed(1);

            message.textContent =
                `Great! ${percentage}% of your compliance areas are compliant.`;

        } else {

            message.textContent =
                "No compliance areas have been configured yet.";

        }

    }

}


/* ============================================================
   STATUS LEGEND
============================================================ */

function renderStatusLegend(
    compliant,
    atRisk,
    nonCompliant,
    total
) {

    const container =
        document.getElementById(
            "statusLegend"
        );

    if (!container) {
        return;
    }


    function percentage(
        value
    ) {

        return total
            ? (
                value /
                total *
                100
            ).toFixed(1)
            : "0.0";

    }


    container.innerHTML = `

        <div class="legend-row">

            <span
                class="legend-color"
                style="background:#18a765"
            ></span>

            <div>

                <span class="legend-main">
                    Compliant
                </span>

                <span class="legend-value">
                    ${compliant}
                    (${percentage(compliant)}%)
                </span>

            </div>

        </div>


        <div class="legend-row">

            <span
                class="legend-color"
                style="background:#f59b23"
            ></span>

            <div>

                <span class="legend-main">
                    At Risk
                </span>

                <span class="legend-value">
                    ${atRisk}
                    (${percentage(atRisk)}%)
                </span>

            </div>

        </div>


        <div class="legend-row">

            <span
                class="legend-color"
                style="background:#ef3d4c"
            ></span>

            <div>

                <span class="legend-main">
                    Non-Compliant
                </span>

                <span class="legend-value">
                    ${nonCompliant}
                    (${percentage(nonCompliant)}%)
                </span>

            </div>

        </div>

    `;

}


/* ============================================================
   CATEGORIES
============================================================ */

function renderCategories(
    categories
) {

    const container =
        document.getElementById(
            "categoryList"
        );

    if (!container) {
        return;
    }


    if (!categories.length) {

        container.innerHTML =
            emptyMessage(
                "No compliance categories found."
            );

        return;

    }


    container.innerHTML =
        categories
            .map(
                item => {

                    const score =
                        Number(
                            item.score || 0
                        );

                    let level =
                        "good";

                    if (score < 70) {
                        level = "low";
                    } else if (score < 85) {
                        level = "medium";
                    }


                    return `

                        <div class="category-item">

                            <div class="category-header">

                                <span>
                                    ${escapeHtml(
                                        item.category
                                    )}
                                </span>

                                <span>
                                    ${score.toFixed(0)}%
                                </span>

                            </div>

                            <div class="category-progress">

                                <div
                                    class="category-progress-value ${level}"
                                    style="width:${score}%"
                                ></div>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   ACTIVITIES
============================================================ */

function renderActivities(
    activities
) {

    const tbody =
        document.getElementById(
            "activityTable"
        );

    if (!tbody) {
        return;
    }


    if (!activities.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;padding:30px"
                >
                    No compliance activities found.
                </td>

            </tr>

        `;

        setText(
            "activityPagination",
            "Showing 0 activities"
        );

        return;
    }


    tbody.innerHTML =
        activities
            .map(
                item => {

                    const status =
                        String(
                            item.status ||
                            ""
                        ).toLowerCase();

                    let statusClass =
                        "completed";

                    if (
                        status.includes(
                            "progress"
                        )
                    ) {

                        statusClass =
                            "progress";

                    } else if (
                        status.includes(
                            "overdue"
                        )
                    ) {

                        statusClass =
                            "overdue";

                    }


                    return `

                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        item.activity
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    item.category ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    item.date
                                )}
                            </td>

                            <td>

                                <span
                                    class="status-pill ${statusClass}"
                                >
                                    ${escapeHtml(
                                        item.status ||
                                        "-"
                                    )}
                                </span>

                            </td>

                            <td>
                                ${escapeHtml(
                                    item.assigned_to ||
                                    "-"
                                )}
                            </td>

                            <td>

                                <button
                                    class="more-button"
                                    title="More"
                                >
                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                </button>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    setText(
        "activityPagination",
        `Showing 1 to ${activities.length} of ${activities.length} activities`
    );

}


/* ============================================================
   DEADLINES
============================================================ */

function renderDeadlines(
    deadlines
) {

    const container =
        document.getElementById(
            "deadlineList"
        );

    if (!container) {
        return;
    }


    if (!deadlines.length) {

        container.innerHTML =
            emptyMessage(
                "No upcoming compliance deadlines."
            );

        return;

    }


    container.innerHTML =
        deadlines
            .map(
                item => {

                    const days =
                        getDaysRemaining(
                            item.due_date
                        );


                    let daysText =
                        "";

                    if (days === null) {

                        daysText =
                            "Date unavailable";

                    } else if (days < 0) {

                        daysText =
                            `${Math.abs(days)} days overdue`;

                    } else if (days === 0) {

                        daysText =
                            "Due today";

                    } else if (days === 1) {

                        daysText =
                            "1 day left";

                    } else {

                        daysText =
                            `${days} days left`;

                    }


                    return `

                        <div class="deadline-item">

                            <div class="deadline-icon">

                                <i class="fa-regular fa-calendar"></i>

                            </div>


                            <div class="deadline-info">

                                <div class="deadline-title">
                                    ${escapeHtml(
                                        item.title
                                    )}
                                </div>

                                <div class="deadline-category">
                                    ${escapeHtml(
                                        item.category ||
                                        "-"
                                    )}
                                </div>

                            </div>


                            <div class="deadline-date">

                                ${formatDate(
                                    item.due_date
                                )}

                                <span class="days-left">
                                    ${daysText}
                                </span>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   ALERTS
============================================================ */

function renderAlerts(
    alerts
) {

    const container =
        document.getElementById(
            "alertList"
        );

    if (!container) {
        return;
    }


    if (!alerts.length) {

        container.innerHTML =
            emptyMessage(
                "No active compliance alerts."
            );

        return;

    }


    container.innerHTML =
        alerts
            .map(
                item => {

                    const severity =
                        String(
                            item.severity ||
                            "Medium"
                        ).toLowerCase();


                    const icon =
                        severity === "high"
                            ? "fa-triangle-exclamation"
                            : severity === "medium"
                                ? "fa-triangle-exclamation"
                                : "fa-circle-info";


                    return `

                        <div class="alert-item">

                            <div
                                class="alert-icon ${severity}"
                            >

                                <i
                                    class="fa-solid ${icon}"
                                ></i>

                            </div>


                            <div class="alert-info">

                                <div class="alert-title">
                                    ${escapeHtml(
                                        item.title
                                    )}
                                </div>

                                <div class="alert-message">
                                    ${escapeHtml(
                                        item.message
                                    )}
                                </div>

                            </div>


                            <div class="alert-time">

                                ${relativeTime(
                                    item.created_at
                                )}

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   RELATIVE TIME
============================================================ */

function relativeTime(
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

        return "";

    }

    const now =
        new Date();

    const difference =
        Math.floor(
            (
                now -
                date
            ) / 86400000
        );


    if (difference <= 0) {

        return "Today";

    }

    if (difference === 1) {

        return "1 day ago";

    }

    return `${difference} days ago`;

}


/* ============================================================
   LOADING
============================================================ */

function showLoadingState() {

    setText(
        "overallScore",
        "..."
    );

    setText(
        "compliantAreas",
        "..."
    );

    setText(
        "riskAreas",
        "..."
    );

    setText(
        "nonCompliantAreas",
        "..."
    );

    setText(
        "pendingTasks",
        "..."
    );

}


/* ============================================================
   ERROR
============================================================ */

function showErrorState(
    message
) {

    console.error(
        message
    );

    setText(
        "overallScore",
        "0%"
    );

    setText(
        "compliantAreas",
        "0"
    );

    setText(
        "riskAreas",
        "0"
    );

    setText(
        "nonCompliantAreas",
        "0"
    );

    setText(
        "pendingTasks",
        "0"
    );

    const activityTable =
        document.getElementById(
            "activityTable"
        );

    if (activityTable) {

        activityTable.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;padding:30px;color:#ef3d4c"
                >
                    Unable to load compliance data.
                    Please check the FastAPI server.
                </td>

            </tr>

        `;

    }

}


/* ============================================================
   HELPERS
============================================================ */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (element) {

        element.textContent =
            value;

    }

}


function emptyMessage(
    message
) {

    return `

        <div
            style="
                padding:25px;
                text-align:center;
                color:#71809c;
                font-size:10px;
            "
        >
            ${escapeHtml(message)}
        </div>

    `;

}


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


/* ============================================================
   BUTTON EVENTS
============================================================ */

function bindEvents() {


    const search =
        document.getElementById(
            "globalSearch"
        );

    if (search) {

        search.addEventListener(
            "input",
            function () {

                const value =
                    this.value
                        .trim()
                        .toLowerCase();

                document
                    .querySelectorAll(
                        "#activityTable tr"
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


    document
        .querySelectorAll(
            ".action-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function () {

                        console.log(
                            "Quick action:",
                            this.textContent.trim()
                        );

                    }
                );

            }
        );


    const notificationButton =
        document.getElementById(
            "notificationButton"
        );

    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            function () {

                console.log(
                    "Notifications clicked"
                );

            }
        );

    }


    const viewTasksButton =
        document.getElementById(
            "viewTasksButton"
        );

    if (viewTasksButton) {

        viewTasksButton.addEventListener(
            "click",
            function () {

                console.log(
                    "View compliance tasks"
                );

            }
        );

    }

}


/* ============================================================
   INITIALIZE
============================================================ */

async function initialize() {

    bindEvents();

    await loadCurrentUser();

    await loadComplianceDashboard();

}


/* ============================================================
   DOM READY
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize,
        {
            once: true
        }
    );

} else {

    initialize();

}