const API_BASE = "http://127.0.0.1:8000";

let currentPage = 1;
let pageSize = 5;

let priorityChart = null;
let implementationChart = null;
let trendChart = null;


/* ============================================================
   HELPERS
============================================================ */

function $(id) {
    return document.getElementById(id);
}


function setText(id, value) {

    const element = $(id);

    if (element) {
        element.textContent =
            value ?? "0";
    }
}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function percentage(count, total) {

    if (!total) {
        return 0;
    }

    return Math.round(
        (count / total) * 100
    );
}


function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            maximumFractionDigits: 0
        }
    ).format(
        Number(value || 0)
    );
}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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


/* ============================================================
   API
============================================================ */

async function apiFetch(url, options = {}) {

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token");

    const headers = {
        ...(options.headers || {})
    };

    // Send JWT token
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Only add Content-Type automatically when a body exists
    if (
        options.body &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] =
            "application/json";
    }

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers,
            credentials: "include"
        }
    );

    // --------------------------------------------------
    // Unauthorized
    // --------------------------------------------------

    if (response.status === 401) {

        console.error(
            "401 Unauthorized - JWT token:",
            token ? "FOUND" : "MISSING"
        );

        let message =
            "Not authenticated";

        try {

            const error =
                await response.json();

            message =
                error.detail ||
                message;

        } catch (_) {}

        // Optional: clear invalid token
        if (token) {
            console.warn(
                "JWT token may be expired or invalid."
            );
        }

        throw new Error(message);
    }

    // --------------------------------------------------
    // Other errors
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Empty response
    // --------------------------------------------------

    const contentType =
        response.headers.get("content-type") || "";

    if (
        !contentType.includes(
            "application/json"
        )
    ) {
        return null;
    }

    return response.json();
}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadDashboard() {

    const params =
        new URLSearchParams();

    const search =
        $("recommendationSearch")?.value ||
        $("globalSearch")?.value ||
        "";

    const priority =
        $("priorityFilter")?.value ||
        "All";

    const status =
        $("statusFilter")?.value ||
        "All";

    if (search.trim()) {
        params.set(
            "search",
            search.trim()
        );
    }

    if (priority !== "All") {
        params.set(
            "priority",
            priority
        );
    }

    if (status !== "All") {
        params.set(
            "status",
            status
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

    try {

        const data =
            await apiFetch(
                `/api/auditor/recommendations/dashboard?${params.toString()}`
            );

        renderUser(
            data.user
        );

        renderKPIs(
            data.kpis
        );

        renderPriorityChart(
            data.priority_breakdown,
            data.kpis.total
        );

        renderImplementationChart(
            data.implementation_breakdown,
            data.kpis.total
        );

        renderTrend(
            data.trend
        );

        renderRecommendations(
            data.items
        );

        renderPagination(
            data.pagination
        );

        renderOverdue(
            data.overdue_items
        );

        renderImpact(
            data.impact_breakdown
        );

        renderPotentialImpact(
            data.potential_impact
        );

    } catch (error) {

        console.error(
            "RECOMMENDATIONS LOAD ERROR:",
            error
        );

        showTableError(
            error.message
        );
    }
}


/* ============================================================
   USER
============================================================ */

function renderUser(user) {

    if (!user) {
        return;
    }

    setText(
        "sidebarName",
        user.name
    );

    setText(
        "headerName",
        user.name
    );

    setText(
        "sidebarRole",
        user.role
    );

    setText(
        "headerRole",
        user.role
    );
}


/* ============================================================
   KPI
============================================================ */

function renderKPIs(kpis) {

    const total =
        Number(kpis.total || 0);

    const implemented =
        Number(kpis.implemented || 0);

    const inProgress =
        Number(kpis.in_progress || 0);

    const pending =
        Number(kpis.pending || 0);

    const overdue =
        Number(kpis.overdue || 0);

    setText(
        "totalRecommendations",
        total
    );

    setText(
        "implementedRecommendations",
        implemented
    );

    setText(
        "inProgressRecommendations",
        inProgress
    );

    setText(
        "pendingRecommendations",
        pending
    );

    setText(
        "overdueRecommendations",
        overdue
    );

    setText(
        "priorityTotal",
        total
    );

    setText(
        "implementationTotal",
        total
    );

    setText(
        "implementedPercentage",
        `${percentage(
            implemented,
            total
        )}%`
    );

    setText(
        "inProgressPercentage",
        `${percentage(
            inProgress,
            total
        )}%`
    );

    setText(
        "pendingPercentage",
        `${percentage(
            pending,
            total
        )}%`
    );

    setText(
        "overduePercentage",
        `${percentage(
            overdue,
            total
        )}%`
    );
}


/* ============================================================
   PRIORITY CHART
============================================================ */

function renderPriorityChart(
    items,
    total
) {

    const labels =
        items.map(
            item => item.priority
        );

    const values =
        items.map(
            item => item.count
        );

    const canvas =
        $("priorityChart");

    if (!canvas) {
        return;
    }

    if (priorityChart) {
        priorityChart.destroy();
    }

    priorityChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {
                    labels,
                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#ef3037",
                                "#f59b16",
                                "#1267ed",
                                "#20a85e"
                            ],

                            borderWidth: 2,
                            borderColor: "#ffffff"
                        }
                    ]
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
            }
        );

    const legend =
        $("priorityLegend");

    if (!legend) {
        return;
    }

    legend.innerHTML = "";

    const colors = [
        "#ef3037",
        "#f59b16",
        "#1267ed",
        "#20a85e"
    ];

    items.forEach(
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
                        background:${colors[index]};
                    "
                ></span>

                <span>
                    ${escapeHTML(item.priority)}
                </span>

                <span class="legend-value">
                    ${item.count}
                    (${item.percentage}%)
                </span>
            `;

            legend.appendChild(
                row
            );
        }
    );
}


/* ============================================================
   IMPLEMENTATION CHART
============================================================ */

function renderImplementationChart(
    items
) {

    const labels =
        items.map(
            item => item.status
        );

    const values =
        items.map(
            item => item.count
        );

    const canvas =
        $("implementationChart");

    if (!canvas) {
        return;
    }

    if (implementationChart) {
        implementationChart.destroy();
    }

    implementationChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {
                    labels,

                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#19a957",
                                "#f59b16",
                                "#743bd5",
                                "#ef3037"
                            ],

                            borderWidth: 2,
                            borderColor: "#ffffff"
                        }
                    ]
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
            }
        );

    const legend =
        $("implementationLegend");

    if (!legend) {
        return;
    }

    legend.innerHTML = "";

    const colors = [
        "#19a957",
        "#f59b16",
        "#743bd5",
        "#ef3037"
    ];

    items.forEach(
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
                        background:${colors[index]};
                    "
                ></span>

                <span>
                    ${escapeHTML(item.status)}
                </span>

                <span class="legend-value">
                    ${item.count}
                    (${item.percentage}%)
                </span>
            `;

            legend.appendChild(
                row
            );
        }
    );
}


/* ============================================================
   TREND
============================================================ */

function renderTrend(items) {

    const canvas =
        $("trendChart");

    if (!canvas) {
        return;
    }

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels:
                        items.map(
                            item =>
                                item.month
                        ),

                    datasets: [
                        {
                            label:
                                "Total Recommendations",

                            data:
                                items.map(
                                    item =>
                                        item.count
                                ),

                            borderColor:
                                "#0969ff",

                            backgroundColor:
                                "rgba(9,105,255,.08)",

                            pointBackgroundColor:
                                "#0969ff",

                            pointRadius: 4,

                            borderWidth: 2,

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
                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            },

                            grid: {
                                color:
                                    "#e7edf5"
                            }
                        },

                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },

                    plugins: {

                        legend: {
                            display: true,

                            position: "bottom",

                            labels: {
                                boxWidth: 18,
                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   TABLE
============================================================ */

function renderRecommendations(
    items
) {

    const tbody =
        $("recommendationTableBody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (!items || !items.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:35px;
                        color:#64748b;
                    "
                >
                    No recommendations found.
                </td>

            </tr>

        `;

        return;
    }

    items.forEach(
        item => {

            const tr =
                document.createElement(
                    "tr"
                );

            const priorityClass =
                String(
                    item.priority || ""
                )
                .toLowerCase();

            const statusClass =
                String(
                    item.status || ""
                )
                .toLowerCase()
                .replaceAll(
                    " ",
                    "-"
                );

            tr.innerHTML = `

                <td>
                    ${escapeHTML(
                        item.recommendation_id
                    )}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(
                            item.title
                        )}
                    </strong>
                </td>

                <td class="audit-cell">

                    ${escapeHTML(
                        item.audit_title
                    )}

                </td>

                <td>

                    <span
                        class="
                            badge
                            ${priorityClass}
                        "
                    >
                        ${escapeHTML(
                            item.priority
                        )}
                    </span>

                </td>

                <td>

                    <span
                        class="
                            badge
                            ${statusClass}
                        "
                    >
                        ${escapeHTML(
                            item.status
                        )}
                    </span>

                </td>

                <td>

                    <div class="person-cell">

                        <div class="person-avatar">
                            <i class="fa-solid fa-user"></i>
                        </div>

                        <span>
                            ${escapeHTML(
                                item.assigned_to_name
                            )}
                        </span>

                    </div>

                </td>

                <td>
                    ${formatDate(
                        item.due_date
                    )}
                </td>

                <td>

                    <div class="action-buttons">

                        <button
                            class="action-btn"
                            title="View"
                            onclick="
                                viewRecommendation(
                                    ${item.id}
                                )
                            "
                        >
                            <i class="fa-regular fa-eye"></i>
                        </button>

                        <button
                            class="action-btn"
                            title="Edit"
                            onclick="
                                editRecommendation(
                                    ${item.id}
                                )
                            "
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            class="action-btn"
                            title="Delete"
                            onclick="
                                deleteRecommendation(
                                    ${item.id}
                                )
                            "
                        >
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>

                    </div>

                </td>
            `;

            tbody.appendChild(
                tr
            );
        }
    );
}


/* ============================================================
   PAGINATION
============================================================ */

function renderPagination(
    pagination
) {

    const container =
        $("pagination");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const total =
        Number(
            pagination.total || 0
        );

    const page =
        Number(
            pagination.page || 1
        );

    const pages =
        Number(
            pagination.pages || 1
        );

    if (!total) {

        setText(
            "paginationText",
            "Showing 0 recommendations"
        );

        return;
    }

    const start =
        ((page - 1) * pageSize) + 1;

    const end =
        Math.min(
            page * pageSize,
            total
        );

    setText(
        "paginationText",
        `Showing ${start} to ${end} of ${total} recommendations`
    );

    if (page > 1) {

        addPageButton(
            container,
            "‹",
            page - 1,
            false
        );
    }

    for (
        let i = 1;
        i <= pages;
        i++
    ) {

        if (
            pages > 7 &&
            i > 3 &&
            i < pages - 2
        ) {

            if (i === 4) {

                const dots =
                    document.createElement(
                        "span"
                    );

                dots.textContent = "...";

                dots.style.padding =
                    "6px";

                container.appendChild(
                    dots
                );
            }

            continue;
        }

        addPageButton(
            container,
            i,
            i,
            i === page
        );
    }

    if (page < pages) {

        addPageButton(
            container,
            "›",
            page + 1,
            false
        );
    }
}


function addPageButton(
    container,
    label,
    page,
    active
) {

    const button =
        document.createElement(
            "button"
        );

    button.className =
        `page-btn ${
            active ? "active" : ""
        }`;

    button.textContent =
        label;

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


/* ============================================================
   OVERDUE
============================================================ */

function renderOverdue(items) {

    const container =
        $("overdueList");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    setText(
        "overdueCount",
        items?.length || 0
    );

    if (!items || !items.length) {

        container.innerHTML = `

            <div
                style="
                    padding:25px;
                    text-align:center;
                    color:#64748b;
                    font-size:11px;
                "
            >
                No overdue recommendations.
            </div>

        `;

        return;
    }

    items.forEach(
        item => {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "overdue-item";

            element.innerHTML = `

                <div class="overdue-icon">
                    <i class="fa-regular fa-file-lines"></i>
                </div>

                <div class="overdue-info">

                    <strong>
                        ${escapeHTML(
                            item.recommendation_id
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            item.title
                        )}
                    </span>

                    <span>
                        ${escapeHTML(
                            item.audit_title
                        )}
                    </span>

                </div>

                <div class="overdue-days">

                    ${item.days_overdue}
                    days

                    <br>

                    Overdue

                </div>
            `;

            container.appendChild(
                element
            );
        }
    );
}


/* ============================================================
   IMPACT
============================================================ */

function renderImpact(items) {

    const container =
        $("impactGrid");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const icons = {
        High:
            "fa-chart-line",

        Medium:
            "fa-circle-notch",

        Low:
            "fa-thumbs-up",

        Informational:
            "fa-circle-info"
    };

    items.forEach(
        item => {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "impact-item";

            element.innerHTML = `

                <div class="impact-icon">

                    <i
                        class="
                            fa-solid
                            ${
                                icons[
                                    item.impact
                                ] ||
                                "fa-circle-info"
                            }
                        "
                    ></i>

                </div>

                <div>

                    <span>
                        ${escapeHTML(
                            item.impact
                        )} Impact
                    </span>

                    <strong>
                        ${item.count}
                    </strong>

                    <small>
                        ${item.percentage}%
                    </small>

                </div>
            `;

            container.appendChild(
                element
            );
        }
    );
}


/* ============================================================
   POTENTIAL IMPACT
============================================================ */

function renderPotentialImpact(
    data
) {

    if (!data) {
        return;
    }

    setText(
        "riskReduction",
        `${Number(
            data.risk_reduction || 0
        ).toFixed(0)}%`
    );

    setText(
        "controlImprovement",
        `${Number(
            data.control_improvement || 0
        ).toFixed(0)}%`
    );

    setText(
        "costSavings",
        `₹${formatCurrency(
            data.cost_savings
        )}`
    );
}


/* ============================================================
   TABLE ERROR
============================================================ */

function showTableError(
    message
) {

    const tbody =
        $("recommendationTableBody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                style="
                    text-align:center;
                    padding:35px;
                    color:#ef3037;
                "
            >
                ${escapeHTML(message)}
            </td>

        </tr>
    `;
}


/* ============================================================
   AUDIT OPTIONS
============================================================ */

async function loadAudits() {

    try {

        const data =
            await apiFetch(
                "/api/auditor/issues-findings/audits"
            );

        const select =
            $("formAudit");

        if (!select) {
            return;
        }

        select.innerHTML =
            `<option value="">
                Select audit
            </option>`;

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
            "AUDIT OPTIONS ERROR:",
            error
        );
    }
}


/* ============================================================
   AUDITOR OPTIONS
============================================================ */

async function loadAuditors() {

    try {

        const data =
            await apiFetch(
                "/api/auditor/assignment-auditors"
            );

        const select =
            $("formAssignee");

        if (!select) {
            return;
        }

        (data.items || []).forEach(
            auditor => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    auditor.id;

                option.textContent =
                    auditor.name;

                select.appendChild(
                    option
                );
            }
        );

    } catch (error) {

        console.warn(
            "Auditor dropdown unavailable:",
            error
        );
    }
}


/* ============================================================
   MODAL
============================================================ */

function openModal() {

    $("recommendationModal")
        ?.classList
        .add("show");

    loadAudits();
    loadAuditors();
}


function closeModal() {

    $("recommendationModal")
        ?.classList
        .remove("show");
}


/* ============================================================
   CREATE
============================================================ */

async function createRecommendation(
    event
) {

    event.preventDefault();

    const payload = {

        audit_id:
            Number(
                $("formAudit").value
            ),

        title:
            $("formTitle").value.trim(),

        description:
            $("formDescription").value.trim(),

        category:
            $("formCategory").value,

        priority:
            $("formPriority").value,

        status:
            "Pending",

        assigned_to:
            $("formAssignee").value
                ? Number(
                    $("formAssignee").value
                )
                : null,

        due_date:
            $("formDueDate").value
                || null,

        impact:
            $("formImpact").value,

        risk_reduction:
            Number(
                $("formRiskReduction").value
            ),

        control_improvement:
            Number(
                $("formControlImprovement").value
            ),

        cost_savings:
            Number(
                $("formCostSavings").value
            )
    };

    if (!payload.audit_id) {

        alert(
            "Please select an audit."
        );

        return;
    }

    try {

        await apiFetch(
            "/api/auditor/recommendations",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

        closeModal();

        $("recommendationForm")
            .reset();

        currentPage = 1;

        await loadDashboard();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* ============================================================
   VIEW
============================================================ */

async function viewRecommendation(
    id
) {

    try {

        const data =
            await apiFetch(
                `/api/auditor/recommendations/${id}`
            );

        alert(
            [
                `Recommendation: ${data.recommendation_id}`,
                `Title: ${data.title}`,
                `Audit: ${data.audit_title}`,
                `Priority: ${data.priority}`,
                `Status: ${data.status}`,
                `Assigned To: ${data.assigned_to_name}`,
                `Due Date: ${formatDate(data.due_date)}`,
                `Impact: ${data.impact}`,
                `Risk Reduction: ${data.risk_reduction}%`,
                `Control Improvement: ${data.control_improvement}%`,
                `Cost Savings: ₹${formatCurrency(data.cost_savings)}`
            ].join("\n")
        );

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* ============================================================
   EDIT
============================================================ */

async function editRecommendation(
    id
) {

    try {

        const data =
            await apiFetch(
                `/api/auditor/recommendations/${id}`
            );

        const status =
            prompt(
                "Enter status:\nImplemented / In Progress / Pending",
                data.status === "Overdue"
                    ? "In Progress"
                    : data.status
            );

        if (!status) {
            return;
        }

        await apiFetch(
            `/api/auditor/recommendations/${id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        status
                    })
            }
        );

        loadDashboard();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* ============================================================
   DELETE
============================================================ */

async function deleteRecommendation(
    id
) {

    const confirmed =
        confirm(
            "Delete this recommendation?"
        );

    if (!confirmed) {
        return;
    }

    try {

        await apiFetch(
            `/api/auditor/recommendations/${id}`,
            {
                method: "DELETE"
            }
        );

        loadDashboard();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* ============================================================
   EVENTS
============================================================ */

function initializeEvents() {

    $("sidebarToggle")
        ?.addEventListener(
            "click",
            () => {

                $("sidebar")
                    ?.classList
                    .toggle("open");

                document
                    .querySelector(".sidebar")
                    ?.classList
                    .toggle("open");
            }
        );


    $("newRecommendationButton")
        ?.addEventListener(
            "click",
            openModal
        );


    $("closeModal")
        ?.addEventListener(
            "click",
            closeModal
        );


    $("cancelModal")
        ?.addEventListener(
            "click",
            closeModal
        );


    $("recommendationForm")
        ?.addEventListener(
            "submit",
            createRecommendation
        );


    $("priorityFilter")
        ?.addEventListener(
            "change",
            () => {

                currentPage = 1;

                loadDashboard();
            }
        );


    $("statusFilter")
        ?.addEventListener(
            "change",
            () => {

                currentPage = 1;

                loadDashboard();
            }
        );


    let searchTimer;

    $("recommendationSearch")
        ?.addEventListener(
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
                        350
                    );
            }
        );


    $("globalSearch")
        ?.addEventListener(
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
                        350
                    );
            }
        );


    $("filterButton")
        ?.addEventListener(
            "click",
            () => {

                $("priorityFilter")
                    ?.focus();
            }
        );


    $("recommendationModal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    $("recommendationModal")
                ) {
                    closeModal();
                }
            }
        );
}


/* ============================================================
   INITIALIZE
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeEvents();

        loadDashboard();

    }
);