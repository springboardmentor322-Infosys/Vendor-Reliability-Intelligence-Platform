let currentPage = 1;
let pageSize = 5;

let approvalChart = null;
let typeChart = null;

let selectedWorkflowId = null;
let selectedDecision = null;


const API_BASE = "http://127.0.0.1:8000";

function getToken() {
    return (
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
    );
}

function clearTokens() {
    [
        "access_token",
        "token",
        "jwt_token"
    ].forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
}

async function apiFetch(url, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const headers = {
        Accept: "application/json",
        ...(options.body ? {
            "Content-Type": "application/json"
        } : {}),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    console.log("Finance API Request:", {
        url: `${API_BASE}${url}`,
        method: options.method || "GET",
        hasToken: !!token
    });

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers,
            credentials: "include"
        }
    );

    const contentType =
        response.headers.get("content-type") || "";

    let data;

    try {
        data = contentType.includes("application/json")
            ? await response.json()
            : await response.text();
    } catch {
        data = null;
    }

    console.log("Finance API Response:", {
        url: `${API_BASE}${url}`,
        status: response.status,
        data
    });

    if (response.status === 401) {
        throw new Error(
            typeof data === "object"
                ? data?.detail || "Authentication failed"
                : "Authentication failed"
        );
    }

    if (response.status === 403) {
        throw new Error(
            typeof data === "object"
                ? data?.detail || "Finance Officer access required"
                : "Finance Officer access required"
        );
    }

    if (!response.ok) {
        const message =
            typeof data === "string"
                ? data
                : data?.detail ||
                  data?.message ||
                  `Request failed (${response.status})`;

        throw new Error(message);
    }

    return data;
}


/* ==========================================================
   INITIALIZATION
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setDefaultDates();

        loadDashboard();

        document
            .getElementById(
                "applyDate"
            )
            .addEventListener(
                "click",
                () => {

                    currentPage = 1;

                    loadDashboard();
                }
            );


        document
            .getElementById(
                "refreshButton"
            )
            .addEventListener(
                "click",
                loadDashboard
            );


        let searchTimer = null;

        document
            .getElementById(
                "searchInput"
            )
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

                                loadDashboard();
                            },
                            400
                        );
                }
            );

    }
);


/* ==========================================================
   DEFAULT DATE
========================================================== */

function setDefaultDates() {

    const today =
        new Date();

    const start =
        new Date();

    start.setDate(
        today.getDate() - 30
    );

    document
        .getElementById(
            "startDate"
        )
        .value =
        formatInputDate(start);


    document
        .getElementById(
            "endDate"
        )
        .value =
        formatInputDate(today);
}


function formatInputDate(
    date
) {

    return date
        .toISOString()
        .split("T")[0];
}


/* ==========================================================
   LOAD DASHBOARD
========================================================== */

async function loadDashboard() {

    try {

        showLoading();

        const params =
            new URLSearchParams();


        const start =
            document
                .getElementById(
                    "startDate"
                )
                .value;

        const end =
            document
                .getElementById(
                    "endDate"
                )
                .value;

        const search =
            document
                .getElementById(
                    "searchInput"
                )
                .value
                .trim();


        if (start) {
            params.set(
                "start_date",
                start
            );
        }

        if (end) {
            params.set(
                "end_date",
                end
            );
        }

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
            "page_size",
            pageSize
        );


        const data =
            await apiFetch(
                `/api/finance/approvals/dashboard?${params.toString()}`
            );


        renderProfile(
            data.profile
        );

        renderKPIs(
            data.kpis
        );

        renderApprovalSummary(
            data.approval_summary
        );

        renderRequestTypes(
            data.requests_by_type
        );

        renderApprovalStatus(
            data.approval_status
        );

        renderApprovalTable(
            data.pending_approvals
        );

        renderRecentActivity(
            data.recent_activity
        );

    }
    catch (error) {

        console.error(
            "Approval dashboard error:",
            error
        );

        showError(
            error.message
        );
    }
}


/* ==========================================================
   PROFILE
========================================================== */

function renderProfile(
    profile
) {

    if (!profile) {
        return;
    }

    const name =
        profile.name ||
        "Finance Officer";


    document
        .getElementById(
            "topUserName"
        )
        .textContent = name;


    document
        .getElementById(
            "sidebarUserName"
        )
        .textContent = name;
}


/* ==========================================================
   KPI
========================================================== */

function renderKPIs(
    kpis
) {

    document
        .getElementById(
            "pendingCount"
        )
        .textContent =
        formatNumber(
            kpis.pending_approvals
        );


    document
        .getElementById(
            "sidebarPending"
        )
        .textContent =
        formatNumber(
            kpis.pending_approvals
        );


    document
        .getElementById(
            "approvedCount"
        )
        .textContent =
        formatNumber(
            kpis.approved_this_month
        );


    document
        .getElementById(
            "rejectedCount"
        )
        .textContent =
        formatNumber(
            kpis.rejected_this_month
        );


    document
        .getElementById(
            "averageDays"
        )
        .textContent =
        formatNumber(
            kpis.average_approval_days
        );


    document
        .getElementById(
            "approvalRate"
        )
        .textContent =
        formatNumber(
            kpis.approval_rate
        );


    document
        .getElementById(
            "totalApprovals"
        )
        .textContent =
        formatNumber(
            kpis.total_approvals
        );
}


/* ==========================================================
   APPROVAL SUMMARY
========================================================== */

function renderApprovalSummary(
    summary
) {

    const approved =
        Number(
            summary.approved || 0
        );

    const pending =
        Number(
            summary.pending || 0
        );

    const rejected =
        Number(
            summary.rejected || 0
        );

    const cancelled =
        Number(
            summary.cancelled || 0
        );


    const total =
        approved +
        pending +
        rejected +
        cancelled;


    document
        .getElementById(
            "summaryTotal"
        )
        .textContent =
        formatNumber(total);


    const canvas =
        document
            .getElementById(
                "approvalSummaryChart"
            );


    if (approvalChart) {
        approvalChart.destroy();
    }


    approvalChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Approved",
                        "Pending",
                        "Rejected",
                        "Cancelled"
                    ],

                    datasets: [{

                        data: [
                            approved,
                            pending,
                            rejected,
                            cancelled
                        ],

                        backgroundColor: [
                            "#16a765",
                            "#1268ed",
                            "#ef4444",
                            "#94a3b8"
                        ],

                        borderWidth: 2,

                        borderColor:
                            "#ffffff"
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "64%",

                    plugins: {

                        legend: {
                            display: false
                        }
                    }
                }
            }
        );


    renderSummaryLegend({
        approved,
        pending,
        rejected,
        cancelled,
        total
    });


    const message =
        document
            .getElementById(
                "approvalMessage"
            );


    if (total > 0) {

        const rate =
            (
                approved /
                total
            ) * 100;

        message.textContent =
            `${rate.toFixed(1)}% of requests have been approved.`;

    }
    else {

        message.textContent =
            "No approval requests found for this period.";
    }
}


function renderSummaryLegend(
    values
) {

    const container =
        document
            .getElementById(
                "summaryLegend"
            );

    const items = [

        {
            name: "Approved",
            value: values.approved,
            color: "#16a765"
        },

        {
            name: "Pending",
            value: values.pending,
            color: "#1268ed"
        },

        {
            name: "Rejected",
            value: values.rejected,
            color: "#ef4444"
        },

        {
            name: "Cancelled",
            value: values.cancelled,
            color: "#94a3b8"
        }
    ];


    container.innerHTML = "";


    items.forEach(
        item => {

            const percentage =
                values.total > 0
                    ? (
                        item.value /
                        values.total
                    ) * 100
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
                    style="background:${item.color}"
                ></span>

                <span>
                    ${escapeHtml(
                        item.name
                    )}
                </span>

                <span class="legend-value">
                    ${item.value}
                    (${percentage.toFixed(1)}%)
                </span>
            `;


            container.appendChild(row);
        }
    );
}


/* ==========================================================
   REQUEST TYPE CHART
========================================================== */

function renderRequestTypes(
    types
) {

    const labels =
        types.map(
            item => item.type
        );

    const values =
        types.map(
            item =>
                Number(
                    item.count || 0
                )
        );


    const canvas =
        document
            .getElementById(
                "requestTypeChart"
            );


    if (typeChart) {
        typeChart.destroy();
    }


    typeChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels,

                    datasets: [{

                        label:
                            "Number of Requests",

                        data:
                            values,

                        backgroundColor: [
                            "#1268ed",
                            "#16a765",
                            "#f59e0b",
                            "#7c4de8"
                        ],

                        borderRadius: 4,

                        maxBarThickness: 40
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: false
                        }
                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {
                                precision: 0
                            },

                            grid: {
                                color:
                                    "#edf0f5"
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


/* ==========================================================
   APPROVAL STATUS
========================================================== */

function renderApprovalStatus(
    statuses
) {

    const container =
        document
            .getElementById(
                "statusList"
            );

    container.innerHTML = "";


    const icons = {

        Pending: "⌛",

        "In Progress": "◷",

        Approved: "✓",

        Rejected: "×",

        Cancelled: "−"
    };


    statuses.forEach(
        item => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "status-row";


            row.innerHTML = `

                <span>
                    ${icons[item.status] || "•"}
                </span>

                <span>
                    ${escapeHtml(
                        item.status
                    )}
                </span>

                <strong
                    class="status-count"
                >
                    ${formatNumber(
                        item.count
                    )}
                </strong>

            `;

            container.appendChild(
                row
            );
        }
    );
}


/* ==========================================================
   APPROVAL TABLE
========================================================== */

function renderApprovalTable(
    result
) {

    const tbody =
        document
            .getElementById(
                "approvalTableBody"
            );

    tbody.innerHTML = "";


    const items =
        result.items || [];


    if (!items.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#68738b;
                    "
                >
                    No approval requests found.
                </td>

            </tr>
        `;

    }
    else {

        items.forEach(
            item => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHtml(
                            item.request_id
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.type
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.description
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.requested_by ||
                            "-"
                        )}
                    </td>

                    <td class="amount">
                        ₹${formatCurrency(
                            item.amount
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            item.request_date
                        )}
                    </td>

                    <td>
                        <span
                            class="priority ${priorityClass(item.priority)}"
                        >
                            ${escapeHtml(
                                item.priority
                            )}
                        </span>
                    </td>

                    <td>
                        <span
                            class="status-pill ${statusClass(item)}"
                        >
                            ${displayStatus(item)}
                        </span>
                    </td>

                    <td>
                        ${renderActions(item)}
                    </td>

                `;


                tbody.appendChild(
                    row
                );
            }
        );
    }


    document
        .getElementById(
            "tableCount"
        )
        .textContent =
        `Showing ${
            items.length
        } of ${
            result.total || 0
        } requests`;


    renderPagination(
        result
    );
}


function displayStatus(
    item
) {

    // ---------------------------------------------------------
    // PURCHASE ORDER
    // ---------------------------------------------------------

    if (
        item.reference_type === "PO" &&
        item.status === "Completed"
    ) {
        return "Approved";
    }

    // ---------------------------------------------------------
    // CURRENT FINANCE APPROVAL
    // ---------------------------------------------------------

    if (
        item.status === "Pending" &&
        item.can_decide
    ) {
        return "Pending";
    }

    // ---------------------------------------------------------
    // OTHER WORKFLOW ITEMS
    // ---------------------------------------------------------

    if (
        item.user_step_status ===
        "Approved" &&
        item.status !== "Completed"
    ) {
        return "In Progress";
    }

    return (
        item.status ||
        item.user_step_status ||
        "Pending"
    );
}


function statusClass(
    item
) {

    const status =
        displayStatus(item)
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );

    return status;
}


function priorityClass(
    priority
) {

    return String(
        priority || "Medium"
    )
        .toLowerCase();
}


function renderActions(
    item
) {

    if (item.can_decide) {

        return `

            <div class="action-buttons">

                <button
                    class="action-button approve"
                    title="Approve"
                    onclick="
                        openDecision(
                            ${item.id},
                            'Approved',
                            '${escapeJs(
                                item.description
                            )}'
                        )
                    "
                >
                    ✓
                </button>

                <button
                    class="action-button reject"
                    title="Reject"
                    onclick="
                        openDecision(
                            ${item.id},
                            'Rejected',
                            '${escapeJs(
                                item.description
                            )}'
                        )
                    "
                >
                    ×
                </button>

            </div>
        `;
    }


    return `

        <button
            class="action-button view"
            title="View"
            onclick="
                viewApproval(
                    ${item.id}
                )
            "
        >
            ◉
        </button>
    `;
}


/* ==========================================================
   PAGINATION
========================================================== */

function renderPagination(
    result
) {

    const container =
        document
            .getElementById(
                "pagination"
            );

    container.innerHTML = "";


    const totalPages =
        result.total_pages || 1;


    if (totalPages <= 1) {
        return;
    }


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        if (
            page > 5 &&
            page !== totalPages
        ) {
            continue;
        }


        const button =
            document.createElement(
                "button"
            );

        button.className =
            "page-button";


        if (
            page === currentPage
        ) {

            button.classList.add(
                "active"
            );
        }


        button.textContent =
            page;


        button.addEventListener(
            "click",
            () => {

                currentPage =
                    page;

                loadDashboard();
            }
        );


        container.appendChild(
            button
        );
    }
}


/* ==========================================================
   RECENT ACTIVITY
========================================================== */

function renderRecentActivity(
    activities
) {

    const container =
        document
            .getElementById(
                "recentActivity"
            );

    container.innerHTML = "";


    if (!activities.length) {

        container.innerHTML = `

            <div
                style="
                    padding:20px 0;
                    color:#68738b;
                    font-size:9px;
                "
            >
                No recent approval activity.
            </div>
        `;

        return;
    }


    activities.forEach(
        item => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "activity-item";


            const icon =
                item.status ===
                "Approved"
                    ? "✓"
                    : item.status ===
                      "Rejected"
                        ? "×"
                        : "⌛";


            row.innerHTML = `

                <div class="activity-icon">
                    ${icon}
                </div>

                <div class="activity-text">

                    <strong>
                        ${escapeHtml(
                            item.message
                        )}
                    </strong>

                    <small>
                        ${relativeTime(
                            item.acted_at
                        )}
                    </small>

                </div>
            `;


            container.appendChild(
                row
            );
        }
    );
}


/* ==========================================================
   DECISION MODAL
========================================================== */

function openDecision(
    workflowId,
    decision,
    description
) {

    selectedWorkflowId =
        workflowId;

    selectedDecision =
        decision;


    document
        .getElementById(
            "modalTitle"
        )
        .textContent =
        decision === "Approved"
            ? "Approve Request"
            : "Reject Request";


    document
        .getElementById(
            "modalDescription"
        )
        .textContent =
        description ||
        "Are you sure you want to continue?";


    document
        .getElementById(
            "decisionComment"
        )
        .value = "";


    document
        .getElementById(
            "decisionModal"
        )
        .classList.remove(
            "hidden"
        );
}


document
    .getElementById(
        "confirmDecision"
    )
    .addEventListener(
        "click",
        submitDecision
    );


async function submitDecision() {

    if (!selectedWorkflowId) {
        return;
    }


    const comments =
        document
            .getElementById(
                "decisionComment"
            )
            .value
            .trim();


    const button =
        document
            .getElementById(
                "confirmDecision"
            );


    button.disabled = true;

    button.textContent =
        "Processing...";


    try {

        await apiFetch(
            `/api/finance/approvals/${selectedWorkflowId}/decision`,
            {

                method: "POST",

                body:
                    JSON.stringify({

                        status:
                            selectedDecision,

                        comments:
                            comments ||
                            null
                    })
            }
        );


        closeModal();

        await loadDashboard();


        alert(
            `Request ${selectedDecision.toLowerCase()} successfully.`
        );

    }
    catch (error) {

        alert(
            error.message
        );

    }
    finally {

        button.disabled =
            false;

        button.textContent =
            "Confirm";
    }
}


function closeModal() {

    document
        .getElementById(
            "decisionModal"
        )
        .classList.add(
            "hidden"
        );

    selectedWorkflowId =
        null;

    selectedDecision =
        null;
}


/* ==========================================================
   VIEW DETAILS
========================================================== */

async function viewApproval(
    workflowId
) {

    try {

        const data =
            await apiFetch(
                `/api/finance/approvals/${workflowId}`
            );


        const workflow =
            data.workflow;


        let text =
            `Request: ${
                workflow.reference_number
            }\n\n`;


        text +=
            `Type: ${
                workflow.reference_type
            }\n`;

        text +=
            `Title: ${
                workflow.title || "-"
            }\n`;

        text +=
            `Requested By: ${
                workflow.requested_by || "-"
            }\n`;

        text +=
            `Amount: ₹${
                formatCurrency(
                    workflow.amount
                )
            }\n`;

        text +=
            `Priority: ${
                workflow.priority
            }\n`;

        text +=
            `Status: ${
                workflow.status
            }\n\n`;


        text +=
            "Approval Steps:\n";


        (data.steps || [])
            .forEach(
                step => {

                    text +=
                        `${step.step_order}. ${
                            step.step_name
                        } - ${
                            step.status
                        }\n`;
                }
            );


        alert(text);

    }
    catch (error) {

        alert(
            error.message
        );
    }
}


/* ==========================================================
   QUICK ACTIONS
========================================================== */

function createNewRequest() {

    window.location.href =
        "/FinanceRequests";
}


function viewMyRequests() {

    window.location.href =
        "/FinanceApprovalRequests";
}


function openDelegation() {

    window.location.href =
        "/ApprovalDelegation";
}


function openWorkflow() {

    window.location.href =
        "/ApprovalWorkflow";
}


function viewAllActivity() {

    window.location.href =
        "/FinanceApprovalActivity";
}


/* ==========================================================
   HELPERS
========================================================== */

function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-IN"
    );
}


function formatCurrency(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );
}


function formatDate(
    value
) {

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
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function relativeTime(
    value
) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    const seconds =
        Math.floor(
            (
                Date.now() -
                date.getTime()
            ) / 1000
        );


    if (seconds < 60) {
        return `${seconds} sec ago`;
    }


    const minutes =
        Math.floor(
            seconds / 60
        );

    if (minutes < 60) {
        return `${minutes} min ago`;
    }


    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {
        return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }


    const days =
        Math.floor(
            hours / 24
        );

    return `${days} day${days !== 1 ? "s" : ""} ago`;
}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
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


function escapeJs(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            '\\"'
        )
        .replace(
            /\n/g,
            "\\n"
        );
}


/* ==========================================================
   LOADING / ERROR
========================================================== */

function showLoading() {

    document
        .getElementById(
            "approvalTableBody"
        )
        .innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="
                        text-align:center;
                        padding:25px;
                    "
                >
                    Loading approvals...
                </td>

            </tr>
        `;
}


function showError(
    message
) {

    document
        .getElementById(
            "approvalTableBody"
        )
        .innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="
                        text-align:center;
                        padding:25px;
                        color:#ef4444;
                    "
                >
                    ${escapeHtml(
                        message
                    )}
                </td>

            </tr>
        `;
}