"use strict";

const API_BASE = "http://127.0.0.1:8000";

let progressChart = null;
let statusChart = null;


/* =========================================================
   AUTH
========================================================= */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        ""
    );
}


/* =========================================================
   API
========================================================= */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        "Accept": "application/json",
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

        console.error(
            "Auditor authentication failed."
        );

        throw new Error(
            "Your Auditor session has expired. Please login again."
        );
        
        redirectToLogin();
    }

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const error =
                await response.json();

            message =
                error.detail ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}
function redirectToLogin() {

    const loginUrl =
        "/login";

    window.location.href =
        loginUrl;
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);


async function initializeDashboard() {

    setCurrentDate();

    setupSidebar();

    try {

        const data =
            await apiFetch(
                "/api/auditor/dashboard"
            );

        renderDashboard(data);

    } catch (error) {

        console.error(
            "AUDITOR DASHBOARD ERROR:",
            error
        );

        showDashboardError(
            error.message
        );
    }
}


/* =========================================================
   DATE
========================================================= */

function setCurrentDate() {

    const element =
        document.getElementById(
            "currentDate"
        );

    if (!element) {
        return;
    }

    const today =
        new Date();

    element.textContent =
        today.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard(data) {

    if (!data) {
        return;
    }

    renderUser(
        data.user
    );

    renderKPIs(
        data.kpis
    );

    renderProgress(
        data.audit_progress
    );

    renderUpcoming(
        data.upcoming_activities || []
    );

    renderFindings(
        data.recent_issues || []
    );

    renderCompliance(
        data.kpis?.compliance_score || 0
    );

    renderDocuments(
        data.kpis?.documents_uploaded || 0
    );
}


/* =========================================================
   USER
========================================================= */

function renderUser(user) {

    if (!user) {
        return;
    }

    const name =
        user.name ||
        user.email ||
        "Auditor";

    setText(
        "welcomeName",
        name
    );

    setText(
        "profileName",
        name
    );

    setText(
        "sidebarName",
        name
    );

    const initials =
        getInitials(name);

    setText(
        "profileAvatar",
        initials
    );

    setText(
        "sidebarAvatar",
        initials
    );
}


function getInitials(name) {

    return String(name)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            part =>
                part.charAt(0)
                    .toUpperCase()
        )
        .join("");
}


/* =========================================================
   KPIs
========================================================= */

function renderKPIs(kpis) {

    if (!kpis) {
        return;
    }

    setText(
        "totalAssignments",
        kpis.total_assignments || 0
    );

    setText(
        "inProgress",
        kpis.in_progress || 0
    );

    setText(
        "issuesFound",
        kpis.issues_found || 0
    );

    setText(
        "reportsCompleted",
        kpis.reports_completed || 0
    );

    setText(
        "complianceScore",
        Math.round(
            Number(
                kpis.compliance_score || 0
            )
        )
    );
}


/* =========================================================
   PROGRESS
========================================================= */

function renderProgress(progress) {

    progress =
        progress || {};

    const values = [

        Number(
            progress.not_started || 0
        ),

        Number(
            progress.in_progress || 0
        ),

        Number(
            progress.under_review || 0
        ),

        Number(
            progress.completed || 0
        )

    ];

    const total =
        Number(
            progress.total ||
            values.reduce(
                (a, b) => a + b,
                0
            )
        );

    setText(
        "chartTotal",
        total
    );

    createProgressChart(
        values
    );

    renderProgressLegend(
        values,
        total
    );

    createStatusChart(
        values
    );
}


/* =========================================================
   DONUT
========================================================= */

function createProgressChart(values) {

    const canvas =
        document.getElementById(
            "progressChart"
        );

    if (!canvas) {
        return;
    }

    if (progressChart) {
        progressChart.destroy();
    }

    progressChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {
                    labels: [
                        "Not Started",
                        "In Progress",
                        "Under Review",
                        "Completed"
                    ],

                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#2875e6",
                                "#27b875",
                                "#f49a21",
                                "#7541d9"
                            ],

                            borderWidth: 0,

                            hoverOffset: 4
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "63%",

                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        );
}


/* =========================================================
   LEGEND
========================================================= */

function renderProgressLegend(
    values,
    total
) {

    const container =
        document.getElementById(
            "progressLegend"
        );

    if (!container) {
        return;
    }

    const labels = [
        "Not Started",
        "In Progress",
        "Under Review",
        "Completed"
    ];

    const colors = [
        "#2875e6",
        "#27b875",
        "#f49a21",
        "#7541d9"
    ];

    container.innerHTML = "";

    values.forEach(
        (value, index) => {

            const percent =
                total > 0
                    ? Math.round(
                        value /
                        total *
                        100
                    )
                    : 0;

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
                        background:${colors[index]}
                    "
                ></span>

                <span>
                    ${labels[index]}
                </span>

                <strong
                    class="legend-count"
                >
                    ${value} (${percent}%)
                </strong>

            `;

            container.appendChild(row);
        }
    );
}


/* =========================================================
   STATUS BAR
========================================================= */

function createStatusChart(values) {

    const canvas =
        document.getElementById(
            "statusChart"
        );

    if (!canvas) {
        return;
    }

    if (statusChart) {
        statusChart.destroy();
    }

    statusChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels: [
                        "Not Started",
                        "In Progress",
                        "Under Review",
                        "Completed"
                    ],

                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#2875e6",
                                "#27b875",
                                "#f49a21",
                                "#7541d9"
                            ],

                            borderRadius: 5,

                            barThickness: 43
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
                                precision: 0
                            },

                            grid: {
                                color:
                                    "#dce2e9"
                            }
                        },

                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   UPCOMING
========================================================= */

function renderUpcoming(items) {

    const container =
        document.getElementById(
            "upcomingList"
        );

    if (!container) {
        return;
    }

    if (!items.length) {

        container.innerHTML = `
            <div class="loading">
                No upcoming audit activities.
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    items.forEach(
        item => {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "upcoming-item";

            const date =
                formatDateTime(
                    item.date
                );

            element.innerHTML = `

                <div class="activity-icon">
                    ▣
                </div>

                <div class="activity-content">

                    <strong>
                        ${escapeHtml(
                            item.title ||
                            item.audit_number ||
                            "Audit"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            date
                        )}
                    </span>

                    ${
                        item.entity_name
                            ? `
                            <span>
                                ${escapeHtml(
                                    item.entity_name
                                )}
                            </span>
                            `
                            : ""
                    }

                </div>
            `;

            container.appendChild(
                element
            );
        }
    );
}


/* =========================================================
   FINDINGS
========================================================= */

function renderFindings(items) {

    const tbody =
        document.getElementById(
            "findingsTable"
        );

    if (!tbody) {
        return;
    }

    if (!items.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    No findings found.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = "";

    items.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );

            const severity =
                String(
                    item.severity ||
                    "Medium"
                )
                .toLowerCase();

            const status =
                String(
                    item.status ||
                    "Open"
                )
                .toLowerCase()
                .replace(
                    /\s+/g,
                    "-"
                );

            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        item.issue ||
                        "Finding"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.audit ||
                        "-"
                    )}
                </td>

                <td>
                    <span
                        class="severity ${severity}"
                    >
                        ${escapeHtml(
                            item.severity ||
                            "Medium"
                        )}
                    </span>
                </td>

                <td>
                    <span
                        class="finding-status ${status}"
                    >
                        ${escapeHtml(
                            item.status ||
                            "Open"
                        )}
                    </span>
                </td>

            `;

            tbody.appendChild(row);
        }
    );
}


/* =========================================================
   COMPLIANCE
========================================================= */

function renderCompliance(score) {

    score =
        Math.max(
            0,
            Math.min(
                100,
                Number(score) || 0
            )
        );

    setText(
        "complianceMeterValue",
        Math.round(score)
    );

    const meter =
        document.getElementById(
            "complianceMeter"
        );

    if (meter) {

        const angle =
            score * 3.6;

        meter.style.background =
            `
            conic-gradient(
                #25b874
                ${angle}deg,
                #e4e9ef
                ${angle}deg
            )
            `;
    }
}


/* =========================================================
   DOCUMENTS
========================================================= */

function renderDocuments(count) {

    setText(
        "documentsUploaded",
        count || 0
    );
}


/* =========================================================
   SIDEBAR
========================================================= */

function setupSidebar() {

    const toggle =
        document.getElementById(
            "sidebarToggle"
        );

    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    if (
        toggle &&
        sidebar
    ) {

        toggle.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "open"
                );
            }
        );
    }
}


/* =========================================================
   ERROR
========================================================= */

function showDashboardError(
    message
) {

    console.error(
        message
    );

    const upcoming =
        document.getElementById(
            "upcomingList"
        );

    if (upcoming) {

        upcoming.innerHTML = `
            <div class="loading">
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
}


/* =========================================================
   HELPERS
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value ?? "";
    }
}


function formatDateTime(value) {

    if (!value) {
        return "Date not available";
    }

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    )) {
        return value;
    }

    return date.toLocaleString(
        "en-US",
        {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function escapeHtml(value) {

    return String(value ?? "")
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