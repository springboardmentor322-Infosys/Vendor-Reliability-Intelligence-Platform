const API_BASE = "http://127.0.0.1:8000";

let severityChart = null;
let statusChart = null;
let categoryChart = null;
let trendChart = null;

let currentPage = 1;
const pageSize = 5;


/* =========================================================
   API
   ========================================================= */

async function apiFetch(url, options = {}) {

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token");

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

    if (!response.ok) {

        let message =
            `Request failed (${response.status})`;

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


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
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


function percentage(value, total) {

    if (!total) {
        return 0;
    }

    return Math.round(
        (value / total) * 100
    );
}


function severityClass(value) {

    const normalized =
        String(value || "")
            .toLowerCase();

    if (normalized === "high") {
        return "severity-high";
    }

    if (normalized === "low") {
        return "severity-low";
    }

    return "severity-medium";
}


function statusClass(value) {

    const normalized =
        String(value || "")
            .toLowerCase();

    if (normalized === "open") {
        return "status-open";
    }

    if (
        normalized.includes("progress")
    ) {
        return "status-progress";
    }

    if (
        normalized.includes("review")
    ) {
        return "status-review";
    }

    if (
        normalized === "closed" ||
        normalized === "resolved"
    ) {
        return "status-closed";
    }

    return "status-open";
}


/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

async function loadDashboard() {

    const search =
        document
            .getElementById("globalSearch")
            .value
            .trim();

    const params =
        new URLSearchParams();

    if (search) {
        params.set(
            "search",
            search
        );
    }

    params.set(
        "page",
        currentPage
    );

    params.set(
        "limit",
        pageSize
    );

    const data =
        await apiFetch(
            `/api/auditor/issues-findings/dashboard?${params.toString()}`
        );

    renderDashboard(data);
}


/* =========================================================
   RENDER DASHBOARD
   ========================================================= */

function renderDashboard(data) {

    const kpis =
        data.kpis || {};

    const total =
        Number(kpis.total || 0);

    document.getElementById(
        "totalIssues"
    ).textContent = total;

    document.getElementById(
        "highIssues"
    ).textContent =
        kpis.high || 0;

    document.getElementById(
        "mediumIssues"
    ).textContent =
        kpis.medium || 0;

    document.getElementById(
        "lowIssues"
    ).textContent =
        kpis.low || 0;

    document.getElementById(
        "closedIssues"
    ).textContent =
        kpis.closed || 0;

    document.getElementById(
        "highPercent"
    ).textContent =
        `${percentage(kpis.high, total)}% of total`;

    document.getElementById(
        "mediumPercent"
    ).textContent =
        `${percentage(kpis.medium, total)}% of total`;

    document.getElementById(
        "lowPercent"
    ).textContent =
        `${percentage(kpis.low, total)}% of total`;

    document.getElementById(
        "closedPercent"
    ).textContent =
        `${percentage(kpis.closed, total)}% of total`;


    renderSeverityChart(kpis);

    renderStatusChart(
        data.status_counts || {}
    );

    renderCategoryChart(
        data.categories || []
    );

    renderTrendChart(
        data.trend || []
    );

    renderIssues(
        data.items || []
    );

    renderOverdue(
        data.overdue || []
    );

    const resolution =
        data.resolution || {};

    document.getElementById(
        "avgResolution"
    ).textContent =
        resolution.average_days || 0;

    document.getElementById(
        "closedThisMonth"
    ).textContent =
        resolution.closed_this_month || 0;

    document.getElementById(
        "pendingReview"
    ).textContent =
        resolution.pending_review || 0;

    loadReopenRate();
}


/* =========================================================
   SEVERITY CHART
   ========================================================= */

function renderSeverityChart(kpis) {

    const values = [
        kpis.high || 0,
        kpis.medium || 0,
        kpis.low || 0,
        kpis.closed || 0
    ];

    const labels = [
        "High",
        "Medium",
        "Low",
        "Closed"
    ];

    const canvas =
        document.getElementById(
            "severityChart"
        );

    if (severityChart) {
        severityChart.destroy();
    }

    severityChart =
        new Chart(canvas, {

            type: "doughnut",

            data: {
                labels,

                datasets: [{
                    data: values,
                    backgroundColor: [
                        "#ff3138",
                        "#ff9900",
                        "#f5a400",
                        "#20b768"
                    ],
                    borderWidth: 0
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                cutout: "67%",

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });


    const legend =
        document.getElementById(
            "severityLegend"
        );

    const colors = [
        "#ff3138",
        "#ff9900",
        "#f5a400",
        "#20b768"
    ];

    legend.innerHTML =
        labels.map(
            (label, index) => `
                <div class="legend-row">
                    <span
                        class="legend-dot"
                        style="background:${colors[index]}"
                    ></span>

                    <span>${label}</span>

                    <strong>
                        ${values[index]}
                        (${percentage(
                            values[index],
                            values.reduce(
                                (a,b) => a + b,
                                0
                            )
                        )}%)
                    </strong>
                </div>
            `
        ).join("");
}


/* =========================================================
   STATUS CHART
   ========================================================= */

function renderStatusChart(statuses) {

    const labels = [
        "Open",
        "In Progress",
        "Pending Review",
        "Closed"
    ];

    const values = labels.map(
        label =>
            Number(
                statuses[label] || 0
            )
    );

    const canvas =
        document.getElementById(
            "statusChart"
        );

    if (statusChart) {
        statusChart.destroy();
    }

    statusChart =
        new Chart(canvas, {

            type: "bar",

            data: {
                labels,

                datasets: [{
                    data: values,
                    backgroundColor: [
                        "#ff343a",
                        "#ff9d00",
                        "#1168ed",
                        "#22b768"
                    ],
                    borderRadius: 4,
                    barThickness: 36
                }]
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
                            color: "#e6ebf2"
                        }
                    },

                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
}


/* =========================================================
   CATEGORY CHART
   ========================================================= */

function renderCategoryChart(categories) {

    const sorted =
        [...categories]
            .sort(
                (a, b) =>
                    b.count - a.count
            )
            .slice(0, 5);

    const labels =
        sorted.map(
            x => x.category
        );

    const values =
        sorted.map(
            x => x.count
        );

    const colors = [
        "#1268ed",
        "#ff9800",
        "#20b768",
        "#7439d8",
        "#2aaec7"
    ];

    const canvas =
        document.getElementById(
            "categoryChart"
        );

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart =
        new Chart(canvas, {

            type: "doughnut",

            data: {
                labels,

                datasets: [{
                    data: values,
                    backgroundColor:
                        colors,
                    borderWidth: 0
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "65%",

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });


    const legend =
        document.getElementById(
            "categoryLegend"
        );

    legend.innerHTML =
        sorted.map(
            (item, index) => `

                <div class="legend-row">

                    <span
                        class="legend-dot"
                        style="background:${colors[index]}"
                    ></span>

                    <span>
                        ${escapeHtml(
                            item.category
                        )}
                    </span>

                    <strong>
                        ${item.count}
                        (${percentage(
                            item.count,
                            values.reduce(
                                (a,b) => a+b,
                                0
                            )
                        )}%)
                    </strong>

                </div>
            `
        ).join("");
}


/* =========================================================
   TREND CHART
   ========================================================= */

function renderTrendChart(trend) {

    const labels =
        trend.map(
            x => x.month
        );

    const values =
        trend.map(
            x => x.count
        );

    const canvas =
        document.getElementById(
            "trendChart"
        );

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart =
        new Chart(canvas, {

            type: "line",

            data: {

                labels,

                datasets: [{

                    label: "Total Issues",

                    data: values,

                    borderColor: "#1268ed",

                    backgroundColor:
                        "rgba(18,104,237,.08)",

                    fill: true,

                    tension: .35,

                    pointRadius: 4,

                    pointBackgroundColor:
                        "#1268ed"
                }]
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
                            color: "#e6ebf2"
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
        });
}


/* =========================================================
   ISSUE TABLE
   ========================================================= */

function renderIssues(items) {

    const tbody =
        document.getElementById(
            "issuesTableBody"
        );

    if (!items.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8"
                    style="text-align:center;padding:30px;">
                    No issues or findings found.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        items.map(
            item => `

                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(
                                item.issue_id
                            )}
                        </strong>
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(
                                item.title
                            )}
                        </strong>
                    </td>

                    <td>
                        <span>
                            ${escapeHtml(
                                item.audit_title ||
                                item.audit_number ||
                                "—"
                            )}
                        </span>
                    </td>

                    <td>

                        <span
                            class="severity-badge
                            ${severityClass(
                                item.severity
                            )}"
                        >
                            ${escapeHtml(
                                item.severity
                            )}
                        </span>

                    </td>

                    <td>

                        <span
                            class="status-badge
                            ${statusClass(
                                item.status
                            )}"
                        >
                            ${escapeHtml(
                                item.status
                            )}
                        </span>

                    </td>

                    <td>

                        <div class="table-user">

                            <div class="table-avatar">
                                <i class="fa-solid fa-user"></i>
                            </div>

                            ${escapeHtml(
                                item.assigned_to_name ||
                                "Unassigned"
                            )}

                        </div>

                    </td>

                    <td>

                        <div class="due-date">

                            ${formatDate(
                                item.due_date
                            )}

                            ${
                                item.due_date &&
                                new Date(
                                    item.due_date
                                ) < new Date()
                                &&
                                ![
                                    "Closed",
                                    "Resolved"
                                ].includes(
                                    item.status
                                )
                                ?
                                `<small>Overdue</small>`
                                :
                                ""
                            }

                        </div>

                    </td>

                    <td>

                        <div class="row-actions">

                            <button
                                class="row-action"
                                title="View"
                                onclick="viewFinding(${item.id})"
                            >
                                <i class="fa-regular fa-eye"></i>
                            </button>

                            <button
                                class="row-action"
                                title="Edit"
                                onclick="editFinding(${item.id})"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                class="row-action"
                                title="Delete"
                                onclick="deleteFinding(${item.id})"
                            >
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>

                        </div>

                    </td>

                </tr>
            `
        ).join("");
}


/* =========================================================
   OVERDUE
   ========================================================= */

function renderOverdue(items) {

    document.getElementById(
        "overdueCount"
    ).textContent =
        items.length;

    const container =
        document.getElementById(
            "overdueList"
        );

    if (!items.length) {

        container.innerHTML = `
            <div
                style="
                    padding:20px 0;
                    color:#748196;
                    font-size:11px;
                "
            >
                No overdue issues.
            </div>
        `;

        return;
    }

    container.innerHTML =
        items.map(
            item => `

                <div class="overdue-item">

                    <div class="overdue-title">
                        ${escapeHtml(
                            item.title
                        )}
                    </div>

                    <div class="overdue-meta">

                        <span class="overdue-id">
                            ${escapeHtml(
                                item.issue_id
                            )}
                        </span>

                        <span class="overdue-days">
                            ${item.days_overdue}
                            days overdue
                        </span>

                    </div>

                </div>
            `
        ).join("");
}


/* =========================================================
   REOPEN RATE
   ========================================================= */

async function loadReopenRate() {

    try {

        const data =
            await apiFetch(
                "/api/auditor/issues-findings/reopen-rate"
            );

        document.getElementById(
            "reopenRate"
        ).textContent =
            `${data.reopen_rate || 0}%`;

    } catch (error) {

        console.warn(
            "Reopen rate unavailable:",
            error.message
        );

        document.getElementById(
            "reopenRate"
        ).textContent = "0%";
    }
}


/* =========================================================
   VIEW FINDING
   ========================================================= */

async function viewFinding(id) {

    try {

        const item =
            await apiFetch(
                `/api/auditor/issues-findings/${id}`
            );

        alert(
            `Issue: ${item.issue_id}\n\n` +
            `Title: ${item.title}\n` +
            `Severity: ${item.severity}\n` +
            `Status: ${item.status}\n` +
            `Category: ${item.category}\n` +
            `Audit: ${item.audit_title}\n\n` +
            `${item.description || ""}`
        );

    } catch (error) {

        alert(error.message);
    }
}


/* =========================================================
   DELETE
   ========================================================= */

async function deleteFinding(id) {

    if (
        !confirm(
            "Are you sure you want to delete this issue?"
        )
    ) {
        return;
    }

    try {

        await apiFetch(
            `/api/auditor/issues-findings/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadDashboard();

    } catch (error) {

        alert(error.message);
    }
}


/* =========================================================
   SEARCH
   ========================================================= */

let searchTimer;

document
    .getElementById("globalSearch")
    .addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );

            searchTimer =
                setTimeout(
                    () => {

                        currentPage = 1;

                        loadDashboard()
                            .catch(
                                console.error
                            );

                    },
                    350
                );
        }
    );


/* =========================================================
   MODAL
   ========================================================= */

function openModal() {

    document
        .getElementById("issueModal")
        .classList.add("show");
}

function closeModal() {

    document
        .getElementById("issueModal")
        .classList.remove("show");

    document
        .getElementById("issueForm")
        .reset();

    document
        .getElementById(
            "editingFindingId"
        )
        .value = "";
}

document
    .getElementById("addIssueButton")
    .addEventListener(
        "click",
        openModal
    );

document
    .getElementById("closeModal")
    .addEventListener(
        "click",
        closeModal
    );

document
    .getElementById("cancelModal")
    .addEventListener(
        "click",
        closeModal
    );


/* =========================================================
   FORM SUBMIT
   ========================================================= */

document
    .getElementById("issueForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const id =
                document
                    .getElementById(
                        "editingFindingId"
                    )
                    .value;

            const payload = {

                audit_id: Number(
                    document
                        .getElementById(
                            "auditId"
                        )
                        .value
                ),

                title:
                    document
                        .getElementById(
                            "issueTitle"
                        )
                        .value
                        .trim(),

                description:
                    document
                        .getElementById(
                            "description"
                        )
                        .value,

                category:
                    document
                        .getElementById(
                            "category"
                        )
                        .value,

                severity:
                    document
                        .getElementById(
                            "severity"
                        )
                        .value,

                status:
                    document
                        .getElementById(
                            "status"
                        )
                        .value,

                due_date:
                    document
                        .getElementById(
                            "dueDate"
                        )
                        .value || null
            };

            try {

                if (id) {

                    await apiFetch(
                        `/api/auditor/issues-findings/${id}`,
                        {
                            method: "PUT",
                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

                } else {

                    await apiFetch(
                        "/api/auditor/issues-findings",
                        {
                            method: "POST",
                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );
                }

                closeModal();

                await loadDashboard();

            } catch (error) {

                alert(error.message);
            }
        }
    );


/* =========================================================
   EDIT
   ========================================================= */

async function editFinding(id) {

    try {

        const item =
            await apiFetch(
                `/api/auditor/issues-findings/${id}`
            );

        document.getElementById(
            "editingFindingId"
        ).value = id;

        document.getElementById(
            "issueTitle"
        ).value =
            item.title || "";

        document.getElementById(
            "description"
        ).value =
            item.description || "";

        document.getElementById(
            "category"
        ).value =
            item.category || "Operational";

        document.getElementById(
            "severity"
        ).value =
            item.severity || "Medium";

        document.getElementById(
            "status"
        ).value =
            item.status || "Open";

        document.getElementById(
            "dueDate"
        ).value =
            item.due_date || "";

        document.getElementById(
            "auditId"
        ).value =
            item.audit_id || "";

        document.getElementById(
            "modalTitle"
        ).textContent =
            "Edit Issue / Finding";

        openModal();

    } catch (error) {

        alert(error.message);
    }
}


async function loadAuditOptions() {

    try {

        const data =
            await apiFetch(
                "/api/auditor/issues-findings/audits"
            );

        const select =
            document.getElementById(
                "auditId"
            );

        select.innerHTML = `
            <option value="">
                Select audit
            </option>
        `;

        (data.items || []).forEach(
            audit => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    audit.id;

                option.textContent =
                    `${audit.audit_number} - ${audit.title}`;

                select.appendChild(
                    option
                );
            }
        );

    } catch (error) {

        console.error(
            "Unable to load audits:",
            error
        );
    }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializePage() {

    try {

        const user =
            await apiFetch(
                "/api/auth/me"
            );

        if (user) {

            document.getElementById(
                "sideUserName"
            ).textContent =
                user.name || "Auditor";

            document.getElementById(
                "headerUserName"
            ).textContent =
                user.name || "Auditor";

            document.getElementById(
                "sideUserRole"
            ).textContent =
                user.role || "Auditor";

            document.getElementById(
                "headerUserRole"
            ).textContent =
                user.role || "Auditor";
        }

    } catch (error) {

        console.warn(
            "User profile unavailable:",
            error.message
        );
    }


    try {

        await loadAuditOptions();

        await loadDashboard();

    } catch (error) {

        console.error(
            "ISSUES FINDINGS LOAD ERROR:",
            error
        );

        document.getElementById(
            "issuesTableBody"
        ).innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        color:#ef3038;
                        text-align:center;
                        padding:30px;
                    "
                >
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>
        `;
    }
}


document.addEventListener(
    "DOMContentLoaded",
    initializePage
);