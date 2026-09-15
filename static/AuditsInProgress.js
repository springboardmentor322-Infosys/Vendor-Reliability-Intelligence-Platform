"use strict";

const API_BASE = "http://127.0.0.1:8000";

let statusChart = null;
let trendChart = null;
let allAudits = [];


// ============================================================
// AUTH
// ============================================================

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        ""
    );
}


// ============================================================
// API REQUEST
// ============================================================

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    const response = await fetch(
        API_BASE + url,
        {
            ...options,
            headers
        }
    );

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const data =
                await response.json();

            message =
                data.detail ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response;
}


// ============================================================
// LOAD DASHBOARD
// ============================================================

async function loadDashboard() {

    const search =
        document
            .getElementById("globalSearch")
            .value
            .trim();

    const status =
        document
            .getElementById("statusFilter")
            .value;

    const auditType =
        document
            .getElementById("auditTypeFilter")
            .value;

    const department =
        document
            .getElementById("departmentFilter")
            .value;

    const params =
        new URLSearchParams();

    if (search) {
        params.set(
            "search",
            search
        );
    }

    if (status !== "All") {
        params.set(
            "status",
            status
        );
    }

    if (auditType !== "All") {
        params.set(
            "audit_type",
            auditType
        );
    }

    if (department !== "All") {
        params.set(
            "department",
            department
        );
    }

    try {

        const response =
            await apiFetch(
                `/api/auditor/audits-in-progress/dashboard?${params}`
            );

        const data =
            await response.json();

        if (!data.success) {
            throw new Error(
                "Unable to load dashboard."
            );
        }

        allAudits =
            data.audits || [];

        updateUser(data.user);

        updateKpis(data.kpis);

        renderAuditTable(
            data.audits
        );

        renderMilestones(
            data.milestones
        );

        renderActivities(
            data.activities
        );

        populateFilters(
            data.audits
        );

        renderStatusChart(
            data.kpis
        );

        renderTrendChart(
            data.trend
        );

    } catch (error) {

        console.error(
            "AUDITS IN PROGRESS ERROR:",
            error
        );

        showError(
            error.message
        );
    }
}


// ============================================================
// USER
// ============================================================

function updateUser(user) {

    if (!user) {
        return;
    }

    const name =
        user.name ||
        user.email ||
        "Auditor";

    document
        .getElementById("sidebarName")
        .textContent = name;

    document
        .getElementById("headerName")
        .textContent = name;

    document
        .getElementById("sidebarRole")
        .textContent =
            user.role || "Auditor";

    document
        .getElementById("headerRole")
        .textContent =
            user.role || "Auditor";
}


// ============================================================
// KPI
// ============================================================

function updateKpis(kpis) {

    const total =
        Number(
            kpis.total_in_progress || 0
        );

    const progress =
        Number(
            kpis.overall_progress || 0
        );

    const elapsed =
        Number(
            kpis.avg_days_elapsed || 0
        );

    const remaining =
        Number(
            kpis.avg_days_remaining || 0
        );

    const onTrack =
        Number(
            kpis.on_track || 0
        );

    document
        .getElementById("totalInProgress")
        .textContent = total;

    document
        .getElementById("overallProgress")
        .textContent =
            Math.round(progress);

    document
        .getElementById("overallProgressBar")
        .style.width =
            `${Math.min(progress, 100)}%`;

    document
        .getElementById("avgElapsed")
        .textContent =
            Math.round(elapsed);

    document
        .getElementById("avgRemaining")
        .textContent =
            Math.round(remaining);

    document
        .getElementById("onTrack")
        .textContent = onTrack;

    const percentage =
        total
            ? Math.round(
                (onTrack / total) * 100
            )
            : 0;

    document
        .getElementById("onTrackPercent")
        .textContent =
            `${percentage}% of total`;

    document
        .getElementById("donutTotal")
        .textContent = total;

    document
        .getElementById("legendOnTrack")
        .textContent = onTrack;

    document
        .getElementById("legendAtRisk")
        .textContent =
            Number(
                kpis.at_risk || 0
            );

    document
        .getElementById("legendDelayed")
        .textContent =
            Number(
                kpis.delayed || 0
            );
}


// ============================================================
// AUDIT TABLE
// ============================================================

function renderAuditTable(audits) {

    const tbody =
        document.getElementById(
            "auditTableBody"
        );

    document
        .getElementById("resultCount")
        .textContent =
            `${audits.length} audit${audits.length === 1 ? "" : "s"}`;

    if (!audits.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="loading">
                    No audits currently in progress.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        audits.map(
            audit => {

                const progress =
                    Math.max(
                        0,
                        Math.min(
                            100,
                            Number(
                                audit.progress || 0
                            )
                        )
                    );

                const statusClass =
                    statusCss(
                        audit.status
                    );

                const targetDate =
                    formatDate(
                        audit.target_date
                    );

                const startDate =
                    formatDate(
                        audit.start_date
                    );

                const remaining =
                    Number(
                        audit.days_remaining || 0
                    );

                let dateClass = "";

                if (remaining < 0) {
                    dateClass = "date-danger";
                } else if (remaining <= 7) {
                    dateClass = "date-warning";
                }

                const initials =
                    getInitials(
                        audit.owner
                    );

                return `
                    <tr>

                        <td>
                            <div class="audit-title">
                                ${escapeHtml(
                                    audit.audit_name
                                )}
                            </div>

                            <div class="audit-number">
                                ${escapeHtml(
                                    audit.audit_number || ""
                                )}
                            </div>
                        </td>

                        <td>
                            ${escapeHtml(
                                audit.audit_type || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                audit.department ||
                                audit.entity_name ||
                                "-"
                            )}
                        </td>

                        <td>

                            <div class="owner">

                                <div class="owner-avatar">
                                    ${escapeHtml(
                                        initials
                                    )}
                                </div>

                                <span>
                                    ${escapeHtml(
                                        audit.owner || "-"
                                    )}
                                </span>

                            </div>

                        </td>

                        <td>
                            ${startDate}
                        </td>

                        <td>

                            ${targetDate}

                            ${
                                remaining !== 0
                                    ? `
                                        <div class="${dateClass}">
                                            ${
                                                remaining < 0
                                                    ? `${Math.abs(remaining)} days overdue`
                                                    : `${remaining} days left`
                                            }
                                        </div>
                                    `
                                    : ""
                            }

                        </td>

                        <td class="progress-cell">

                            <div class="progress-number">
                                ${progress}%
                            </div>

                            <div class="progress-track">
                                <div
                                    class="progress-fill"
                                    style="width:${progress}%"
                                ></div>
                            </div>

                        </td>

                        <td>

                            <span
                                class="status ${statusClass}"
                            >
                                ${escapeHtml(
                                    audit.status
                                )}
                            </span>

                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="action-btn"
                                    title="View"
                                    onclick="viewAudit(${audit.audit_id})"
                                >
                                    ◉
                                </button>

                                <button
                                    class="action-btn"
                                    title="More"
                                    onclick="showAuditMenu(${audit.id})"
                                >
                                    ⋮
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


// ============================================================
// STATUS
// ============================================================

function statusCss(status) {

    const value =
        String(status || "")
            .toLowerCase();

    if (value === "on track") {
        return "on-track";
    }

    if (value === "at risk") {
        return "at-risk";
    }

    return "delayed";
}


// ============================================================
// STATUS CHART
// ============================================================

function renderStatusChart(kpis) {

    const ctx =
        document
            .getElementById("statusChart")
            .getContext("2d");

    if (statusChart) {
        statusChart.destroy();
    }

    statusChart =
        new Chart(
            ctx,
            {
                type: "doughnut",

                data: {
                    labels: [
                        "On Track",
                        "At Risk",
                        "Delayed"
                    ],

                    datasets: [
                        {
                            data: [
                                Number(
                                    kpis.on_track || 0
                                ),

                                Number(
                                    kpis.at_risk || 0
                                ),

                                Number(
                                    kpis.delayed || 0
                                )
                            ],

                            backgroundColor: [
                                "#20ad62",
                                "#f7931e",
                                "#ef4c4c"
                            ],

                            borderWidth: 1
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    cutout: "70%",

                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        );
}


// ============================================================
// TREND CHART
// ============================================================

function renderTrendChart(trend) {

    const ctx =
        document
            .getElementById("trendChart")
            .getContext("2d");

    if (trendChart) {
        trendChart.destroy();
    }

    trend =
        trend || [];

    trendChart =
        new Chart(
            ctx,
            {
                type: "line",

                data: {

                    labels:
                        trend.map(
                            item =>
                                formatShortDate(
                                    item.date
                                )
                        ),

                    datasets: [
                        {
                            label:
                                "Overall Progress %",

                            data:
                                trend.map(
                                    item =>
                                        Number(
                                            item.progress || 0
                                        )
                                ),

                            borderColor:
                                "#1167e8",

                            backgroundColor:
                                "rgba(17,103,232,.08)",

                            borderWidth: 2,

                            pointRadius: 3,

                            tension: .35,

                            fill: true
                        }
                    ]
                },

                options: {

                    responsive: true,
                    maintainAspectRatio: false,

                    scales: {

                        y: {
                            min: 0,
                            max: 100,

                            ticks: {
                                callback:
                                    value =>
                                        `${value}%`,
                                font: {
                                    size: 9
                                }
                            }
                        },

                        x: {
                            ticks: {
                                font: {
                                    size: 8
                                }
                            }
                        }
                    },

                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                boxWidth: 20,
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


// ============================================================
// MILESTONES
// ============================================================

function renderMilestones(
    milestones
) {

    const tbody =
        document.getElementById(
            "milestoneBody"
        );

    if (!milestones || !milestones.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="loading"
                >
                    No upcoming milestones.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        milestones.map(
            item => {

                const days =
                    Number(
                        item.days_left || 0
                    );

                const dayClass =
                    days <= 3
                        ? "days-red"
                        : "days-orange";

                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                item.audit_name
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                item.milestone
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                item.due_date
                            )}
                        </td>

                        <td>
                            <strong class="${dayClass}">
                                ${days} day${days === 1 ? "" : "s"}
                            </strong>
                        </td>

                        <td>
                            <div class="owner">

                                <div class="owner-avatar">
                                    ${escapeHtml(
                                        getInitials(
                                            item.owner
                                        )
                                    )}
                                </div>

                                ${escapeHtml(
                                    item.owner || "-"
                                )}

                            </div>
                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


// ============================================================
// ACTIVITIES
// ============================================================

function renderActivities(
    activities
) {

    const container =
        document.getElementById(
            "activityList"
        );

    if (!activities || !activities.length) {

        container.innerHTML = `
            <div class="loading">
                No recent audit activities.
            </div>
        `;

        return;
    }

    container.innerHTML =
        activities.map(
            activity => {

                return `
                    <div class="activity">

                        <div class="activity-icon">
                            ✓
                        </div>

                        <div class="activity-content">

                            <strong>
                                ${escapeHtml(
                                    activity.action ||
                                    "Audit activity"
                                )}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    activity.description ||
                                    ""
                                )}
                            </small>

                            <small>
                                By ${
                                    escapeHtml(
                                        activity.user_name ||
                                        "System"
                                    )
                                }
                                ·
                                ${
                                    formatDateTime(
                                        activity.created_at
                                    )
                                }
                            </small>

                        </div>

                    </div>
                `;
            }
        )
        .join("");
}


// ============================================================
// FILTER OPTIONS
// ============================================================

let filtersInitialized = false;

function populateFilters(
    audits
) {

    if (filtersInitialized) {
        return;
    }

    filtersInitialized = true;

    const auditTypeSelect =
        document.getElementById(
            "auditTypeFilter"
        );

    const departmentSelect =
        document.getElementById(
            "departmentFilter"
        );

    const auditTypes =
        [
            ...new Set(
                audits
                    .map(
                        item =>
                            item.audit_type
                    )
                    .filter(Boolean)
            )
        ]
        .sort();

    const departments =
        [
            ...new Set(
                audits
                    .map(
                        item =>
                            item.department
                    )
                    .filter(Boolean)
            )
        ]
        .sort();

    auditTypes.forEach(
        type => {

            auditTypeSelect.insertAdjacentHTML(
                "beforeend",
                `
                    <option value="${escapeAttr(type)}">
                        ${escapeHtml(type)}
                    </option>
                `
            );

        }
    );

    departments.forEach(
        department => {

            departmentSelect.insertAdjacentHTML(
                "beforeend",
                `
                    <option value="${escapeAttr(department)}">
                        ${escapeHtml(department)}
                    </option>
                `
            );

        }
    );
}


// ============================================================
// EXPORT
// ============================================================

function exportReport() {

    const search =
        document
            .getElementById("globalSearch")
            .value
            .trim();

    const status =
        document
            .getElementById("statusFilter")
            .value;

    const auditType =
        document
            .getElementById("auditTypeFilter")
            .value;

    const department =
        document
            .getElementById("departmentFilter")
            .value;

    const params =
        new URLSearchParams();

    if (search) {
        params.set(
            "search",
            search
        );
    }

    if (status !== "All") {
        params.set(
            "status",
            status
        );
    }

    if (auditType !== "All") {
        params.set(
            "audit_type",
            auditType
        );
    }

    if (department !== "All") {
        params.set(
            "department",
            department
        );
    }

    const token =
        getToken();

    const url =
        `/api/auditor/audits-in-progress/export?${params}`;

    fetch(
        url,
        {
            headers: token
                ? {
                    Authorization:
                        `Bearer ${token}`
                }
                : {}
        }
    )
    .then(
        response => {

            if (!response.ok) {
                throw new Error(
                    "Unable to export report."
                );
            }

            return response.blob();
        }
    )
    .then(
        blob => {

            const objectUrl =
                URL.createObjectURL(blob);

            const link =
                document.createElement(
                    "a"
                );

            link.href =
                objectUrl;

            link.download =
                "audits-in-progress.csv";

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();

            URL.revokeObjectURL(
                objectUrl
            );
        }
    )
    .catch(
        error => {

            console.error(
                "EXPORT ERROR:",
                error
            );

            alert(
                error.message
            );
        }
    );
}


// ============================================================
// VIEW AUDIT
// ============================================================

function viewAudit(
    auditId
) {

    if (!auditId) {
        return;
    }

    window.location.href =
        `/api/auditor/audit-plans/${auditId}`;
}


function showAuditMenu(
    assignmentId
) {

    const audit =
        allAudits.find(
            item =>
                Number(item.id) ===
                Number(assignmentId)
        );

    if (!audit) {
        return;
    }

    alert(
        `${audit.audit_name}\nProgress: ${audit.progress}%\nStatus: ${audit.status}`
    );
}


// ============================================================
// ERROR
// ============================================================

function showError(
    message
) {

    document
        .getElementById(
            "auditTableBody"
        )
        .innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="loading"
                >
                    ${escapeHtml(
                        message ||
                        "Unable to load data."
                    )}
                </td>
            </tr>
        `;
}


// ============================================================
// UTILITIES
// ============================================================

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
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


function formatShortDate(
    value
) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric"
        }
    );
}


function formatDateTime(
    value
) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


function getInitials(
    name
) {

    if (!name) {
        return "AU";
    }

    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(
            part =>
                part[0]
        )
        .join("")
        .toUpperCase();
}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttr(
    value
) {

    return escapeHtml(value);
}


// ============================================================
// EVENTS
// ============================================================

function setupEvents() {

    document
        .getElementById("filterBtn")
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "filterPanel"
                    )
                    .classList.toggle(
                        "show"
                    );

            }
        );

    document
        .getElementById("applyFilterBtn")
        .addEventListener(
            "click",
            () => {

                loadDashboard();

            }
        );

    document
        .getElementById("clearFilterBtn")
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "statusFilter"
                    )
                    .value = "All";

                document
                    .getElementById(
                        "auditTypeFilter"
                    )
                    .value = "All";

                document
                    .getElementById(
                        "departmentFilter"
                    )
                    .value = "All";

                document
                    .getElementById(
                        "globalSearch"
                    )
                    .value = "";

                loadDashboard();

            }
        );

    document
        .getElementById("exportBtn")
        .addEventListener(
            "click",
            exportReport
        );

    document
        .getElementById("globalSearch")
        .addEventListener(
            "input",
            debounce(
                loadDashboard,
                350
            )
        );

    document
        .getElementById("viewAllBtn")
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "statusFilter"
                    )
                    .value = "All";

                loadDashboard();

            }
        );
}


// ============================================================
// DEBOUNCE
// ============================================================

function debounce(
    callback,
    delay
) {

    let timer;

    return function () {

        clearTimeout(timer);

        timer =
            setTimeout(
                () => callback(),
                delay
            );
    };
}


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupEvents();

        loadDashboard();

    }
);