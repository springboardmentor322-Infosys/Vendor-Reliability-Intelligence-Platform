let currentPage = 1;
let currentStatus = "All";
let currentSearch = "";
let currentLimit = 5;

let frameworkChart = null;
let statusChart = null;
let trendChart = null;


const API_BASE = "http://127.0.0.1:8000";


/* ============================================================
   AUTHENTICATION
============================================================ */

function getAccessToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        null
    );
}


/* ============================================================
   API
============================================================ */

async function apiFetch(url, options = {}) {

    const token = getAccessToken();

    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(options.headers || {})
    };


    // Add JWT token if available
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }


    const response = await fetch(
        `${API_BASE}${url}`,
        {
            credentials: "include",
            ...options,
            headers
        }
    );


    // Handle authentication failure
    if (response.status === 401) {

        console.error(
            "Authentication failed. Token:",
            token ? "Available" : "Missing"
        );

        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("jwt_token");

        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("token");

        throw new Error("Not authenticated");
    }


    if (!response.ok) {

        let message = `HTTP ${response.status}`;

        try {

            const data = await response.json();

            message =
                data.detail ||
                data.message ||
                message;

        } catch (_) {

            try {
                message = await response.text();
            } catch (_) {}

        }

        throw new Error(message);
    }


    // Handle empty responses
    const contentType =
        response.headers.get("content-type") || "";

    if (
        contentType.includes("application/json")
    ) {
        return response.json();
    }

    return response.text();
}

/* ============================================================
   HELPERS
============================================================ */

function safe(value, fallback = "—") {
    return (
        value !== null &&
        value !== undefined &&
        value !== ""
    )
        ? value
        : fallback;
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

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
        return "0%";
    }

    return `${Math.round(
        (value / total) * 100
    )}%`;
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


/* ============================================================
   INITIAL LOAD
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    setupEvents();

    try {

        await loadDashboard();
        await loadRequirements();

    } catch (error) {

        console.error(
            "Compliance initialization error:",
            error
        );

        showError(
            error.message
        );
    }
}


/* ============================================================
   EVENTS
============================================================ */

function setupEvents() {

    const search =
        document.getElementById(
            "requirementSearch"
        );

    if (search) {

        let timer;

        search.addEventListener(
            "input",
            () => {

                clearTimeout(timer);

                timer = setTimeout(
                    () => {

                        currentSearch =
                            search.value.trim();

                        currentPage = 1;

                        loadRequirements();

                    },
                    350
                );
            }
        );
    }


    document
        .querySelectorAll(".status-tab")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".status-tab"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );

                    button.classList.add(
                        "active"
                    );

                    currentStatus =
                        button.dataset.status;

                    currentPage = 1;

                    loadRequirements();
                }
            );

        });


    const trendRange =
        document.getElementById(
            "trendRange"
        );

    if (trendRange) {

        trendRange.addEventListener(
            "change",
            async () => {

                await loadDashboard(
                    trendRange.value
                );
            }
        );
    }


    const exportBtn =
        document.getElementById(
            "exportBtn"
        );

    if (exportBtn) {

        exportBtn.addEventListener(
            "click",
            exportReport
        );
    }


    const filterBtn =
        document.getElementById(
            "filterBtn"
        );

    if (filterBtn) {

        filterBtn.addEventListener(
            "click",
            () => {

                document
                    .querySelector(
                        ".requirements-panel"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });

            }
        );
    }


    const globalSearch =
        document.getElementById(
            "globalSearch"
        );

    if (globalSearch) {

        globalSearch.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    currentSearch =
                        globalSearch.value.trim();

                    const requirementSearch =
                        document.getElementById(
                            "requirementSearch"
                        );

                    if (requirementSearch) {
                        requirementSearch.value =
                            currentSearch;
                    }

                    currentPage = 1;

                    loadRequirements();
                }
            }
        );
    }

}


/* ============================================================
   DASHBOARD
============================================================ */

async function loadDashboard(
    trendMonths = 6
) {

    const data =
        await apiFetch(
            `/api/auditor/compliance/dashboard?trend_months=${trendMonths}`
        );


    updateUser(
        data.user
    );

    updateKPIs(
        data.kpis
    );

    renderFrameworkChart(
        data.frameworks || [],
        data.kpis?.overall_score || 0
    );

    renderStatusChart(
        data.status_overview || {}
    );

    renderTrendChart(
        data.trend || []
    );

    renderUpcomingReviews(
        data.upcoming_reviews || []
    );

    renderGaps(
        data.gaps || []
    );

    renderActivities(
        data.activities || []
    );
}


/* ============================================================
   USER
============================================================ */

function updateUser(user) {

    if (!user) {
        return;
    }

    const name =
        safe(user.name, "Auditor");

    const role =
        user.role === "Auditor"
            ? "Senior Auditor"
            : safe(user.role);


    document.getElementById(
        "sidebarUserName"
    ).textContent = name;

    document.getElementById(
        "headerUserName"
    ).textContent = name;

    document.getElementById(
        "sidebarUserRole"
    ).textContent = role;

    document.getElementById(
        "headerUserRole"
    ).textContent = role;
}


/* ============================================================
   KPIs
============================================================ */

function updateKPIs(kpis) {

    const total =
        Number(
            kpis.total_requirements || 0
        );

    const compliant =
        Number(
            kpis.compliant || 0
        );

    const partial =
        Number(
            kpis.partially_compliant || 0
        );

    const nonCompliant =
        Number(
            kpis.non_compliant || 0
        );


    document.getElementById(
        "overallScore"
    ).textContent =
        `${Number(
            kpis.overall_score || 0
        ).toFixed(0)}%`;


    document.getElementById(
        "compliantCount"
    ).textContent =
        compliant;


    document.getElementById(
        "partialCount"
    ).textContent =
        partial;


    document.getElementById(
        "nonCompliantCount"
    ).textContent =
        nonCompliant;


    document.getElementById(
        "totalRequirements"
    ).textContent =
        total;


    document.getElementById(
        "compliantPercent"
    ).textContent =
        `${percentage(
            compliant,
            total
        )} of total`;


    document.getElementById(
        "partialPercent"
    ).textContent =
        `${percentage(
            partial,
            total
        )} of total`;


    document.getElementById(
        "nonCompliantPercent"
    ).textContent =
        `${percentage(
            nonCompliant,
            total
        )} of total`;


    document.getElementById(
        "allTabCount"
    ).textContent =
        total;


    document.getElementById(
        "compliantTabCount"
    ).textContent =
        compliant;


    document.getElementById(
        "partialTabCount"
    ).textContent =
        partial;


    document.getElementById(
        "nonCompliantTabCount"
    ).textContent =
        nonCompliant;


    document.getElementById(
        "frameworkCenter"
    ).textContent =
        `${Number(
            kpis.overall_score || 0
        ).toFixed(0)}%`;
}


/* ============================================================
   FRAMEWORK CHART
============================================================ */

function renderFrameworkChart(
    frameworks,
    overallScore
) {

    const canvas =
        document.getElementById(
            "frameworkChart"
        );

    if (!canvas) {
        return;
    }


    const defaultFrameworks = [
        {
            name: "ISO 27001",
            score: 0
        },
        {
            name: "ISO 9001",
            score: 0
        },
        {
            name: "SOC 2 Type II",
            score: 0
        },
        {
            name: "GDPR",
            score: 0
        },
        {
            name: "COBIT 2019",
            score: 0
        }
    ];


    const values =
        frameworks.length
            ? frameworks
            : defaultFrameworks;


    const labels =
        values.map(
            item => item.name
        );

    const scores =
        values.map(
            item =>
                Number(
                    item.score || 0
                )
        );


    if (frameworkChart) {
        frameworkChart.destroy();
    }


    frameworkChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {
                    labels,

                    datasets: [
                        {
                            data: scores,
                            borderWidth: 2,
                            borderColor: "#fff"
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
                        },

                        tooltip: {
                            callbacks: {
                                label: context =>
                                    `${context.label}: ${context.raw}%`
                            }
                        }
                    }
                }
            }
        );


    const legend =
        document.getElementById(
            "frameworkLegend"
        );

    legend.innerHTML = "";


    values.forEach(
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
                        hsl(
                            ${index * 62},
                            78%,
                            52%
                        );
                    "
                ></span>

                <span>
                    ${escapeHtml(item.name)}
                </span>

                <strong>
                    ${Number(
                        item.score || 0
                    ).toFixed(0)}%
                </strong>
            `;

            legend.appendChild(row);
        }
    );
}


/* ============================================================
   STATUS CHART
============================================================ */

function renderStatusChart(status) {

    const canvas =
        document.getElementById(
            "statusChart"
        );

    if (!canvas) {
        return;
    }


    const values = [
        Number(status.compliant || 0),
        Number(status.partially_compliant || 0),
        Number(status.non_compliant || 0),
        Number(status.not_applicable || 0),
        Number(status.not_assessed || 0)
    ];


    const labels = [
        "Compliant",
        "Partially Compliant",
        "Non-Compliant",
        "Not Applicable",
        "Not Assessed"
    ];


    document.getElementById(
        "statusCenter"
    ).textContent =
        Number(
            status.total || 0
        );


    if (statusChart) {
        statusChart.destroy();
    }


    statusChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {
                    labels,

                    datasets: [
                        {
                            data: values,
                            borderWidth: 2,
                            borderColor: "#fff"
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


    const legend =
        document.getElementById(
            "statusLegend"
        );

    legend.innerHTML = "";


    values.forEach(
        (value, index) => {

            if (
                value === 0 &&
                index > 2
            ) {
                return;
            }

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
                        hsl(
                            ${index * 70},
                            75%,
                            50%
                        );
                    "
                ></span>

                <span>
                    ${labels[index]}
                </span>

                <strong>
                    ${value}
                    (${percentage(
                        value,
                        status.total
                    )})
                </strong>
            `;

            legend.appendChild(row);
        }
    );
}


/* ============================================================
   TREND
============================================================ */

function renderTrendChart(
    trend
) {

    const canvas =
        document.getElementById(
            "trendChart"
        );

    if (!canvas) {
        return;
    }


    const labels =
        trend.map(
            item =>
                `${item.month} ${item.year}`
        );


    const values =
        trend.map(
            item =>
                Number(
                    item.score || 0
                )
        );


    if (trendChart) {
        trendChart.destroy();
    }


    trendChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                "Compliance Score (%)",

                            data: values,

                            borderWidth: 2,

                            pointRadius: 3,

                            tension: .3,

                            fill: false
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
                                        `${value}%`
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
   REQUIREMENTS
============================================================ */

async function loadRequirements() {

    const params =
        new URLSearchParams();

    params.set(
        "page",
        currentPage
    );

    params.set(
        "limit",
        currentLimit
    );

    params.set(
        "status",
        currentStatus
    );

    if (currentSearch) {

        params.set(
            "search",
            currentSearch
        );
    }


    const data =
        await apiFetch(
            `/api/auditor/compliance/requirements?${params.toString()}`
        );


    renderRequirements(
        data.requirements || []
    );

    renderPagination(
        data.pagination || {}
    );
}


/* ============================================================
   REQUIREMENT TABLE
============================================================ */

function renderRequirements(
    requirements
) {

    const body =
        document.getElementById(
            "requirementsBody"
        );


    if (!requirements.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="loading-row"
                >
                    No compliance requirements found.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        requirements
            .map(
                item =>
                    createRequirementRow(
                        item
                    )
            )
            .join("");
}


function createRequirementRow(
    item
) {

    const status =
        String(
            item.status || "Not Assessed"
        );


    let statusClass =
        "status-not";

    const lower =
        status.toLowerCase();


    if (
        lower === "compliant"
    ) {
        statusClass =
            "status-compliant";
    }

    else if (
        lower.includes("partial")
    ) {
        statusClass =
            "status-partial";
    }

    else if (
        lower.includes("non")
    ) {
        statusClass =
            "status-non";
    }


    const score =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    item.compliance_score || 0
                )
            )
        );


    return `
        <tr>

            <td>
                ${escapeHtml(
                    safe(
                        item.requirement_id
                    )
                )}
            </td>

            <td>
                ${escapeHtml(
                    safe(
                        item.requirement
                    )
                )}
            </td>

            <td>
                <span class="framework-pill">
                    ${escapeHtml(
                        safe(
                            item.framework
                        )
                    )}
                </span>
            </td>

            <td>
                ${escapeHtml(
                    safe(
                        item.audit_assignment
                    )
                )}
            </td>

            <td>
                ${escapeHtml(
                    safe(
                        item.entity_department
                    )
                )}
            </td>

            <td>
                <span
                    class="status-pill ${statusClass}"
                >
                    ${escapeHtml(status)}
                </span>
            </td>

            <td class="score-cell">

                <span class="score-value">
                    ${score}%
                </span>

                <span class="progress">
                    <span
                        style="
                            width:${score}%
                        "
                    ></span>
                </span>

            </td>

            <td>
                ${formatDate(
                    item.last_assessed
                )}
            </td>

            <td>
                ${formatDate(
                    item.next_review
                )}
            </td>

            <td>

                <div class="action-buttons">

                    <button
                        class="action-btn"
                        title="View"
                        onclick="
                            viewRequirement(
                                ${Number(item.id)}
                            )
                        "
                    >
                        <i class="fa-regular fa-eye"></i>
                    </button>

                    <button
                        class="action-btn"
                        title="Assessment"
                        onclick="
                            assessRequirement(
                                ${Number(item.id)}
                            )
                        "
                    >
                        <i class="fa-solid fa-download"></i>
                    </button>

                    <button
                        class="action-btn"
                        title="More"
                    >
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>

                </div>

            </td>

        </tr>
    `;
}


/* ============================================================
   PAGINATION
============================================================ */

function renderPagination(
    pagination
) {

    const total =
        Number(
            pagination.total || 0
        );

    const pages =
        Number(
            pagination.pages || 1
        );

    const page =
        Number(
            pagination.page || 1
        );


    const from =
        total
            ? ((page - 1) * currentLimit) + 1
            : 0;

    const to =
        Math.min(
            page * currentLimit,
            total
        );


    document.getElementById(
        "paginationText"
    ).textContent =
        `Showing ${from} to ${to} of ${total} requirements`;


    const container =
        document.getElementById(
            "pagination"
        );

    container.innerHTML = "";


    if (pages <= 1) {
        return;
    }


    const previous =
        document.createElement(
            "button"
        );

    previous.className =
        "page-btn";

    previous.innerHTML =
        `<i class="fa-solid fa-chevron-left"></i>`;

    previous.disabled =
        page === 1;

    previous.addEventListener(
        "click",
        () => {

            if (page > 1) {

                currentPage =
                    page - 1;

                loadRequirements();
            }
        }
    );

    container.appendChild(
        previous
    );


    for (
        let i = 1;
        i <= pages;
        i++
    ) {

        if (
            pages > 7 &&
            i > 3 &&
            i < pages - 2 &&
            Math.abs(i - page) > 1
        ) {
            continue;
        }


        const button =
            document.createElement(
                "button"
            );

        button.className =
            "page-btn";


        if (i === page) {
            button.classList.add(
                "active"
            );
        }


        button.textContent = i;


        button.addEventListener(
            "click",
            () => {

                currentPage = i;

                loadRequirements();
            }
        );


        container.appendChild(
            button
        );
    }


    const next =
        document.createElement(
            "button"
        );

    next.className =
        "page-btn";

    next.innerHTML =
        `<i class="fa-solid fa-chevron-right"></i>`;

    next.disabled =
        page === pages;

    next.addEventListener(
        "click",
        () => {

            if (page < pages) {

                currentPage =
                    page + 1;

                loadRequirements();
            }
        }
    );

    container.appendChild(
        next
    );
}


/* ============================================================
   UPCOMING REVIEWS
============================================================ */

function renderUpcomingReviews(
    reviews
) {

    const container =
        document.getElementById(
            "upcomingReviews"
        );


    if (!reviews.length) {

        container.innerHTML =
            `<div class="loading-row">
                No upcoming reviews.
            </div>`;

        return;
    }


    container.innerHTML =
        reviews
            .map(
                item => {

                    const days =
                        Number(
                            item.days_left || 0
                        );

                    return `
                        <div class="list-item">

                            <div class="item-icon">
                                <i class="fa-regular fa-calendar"></i>
                            </div>

                            <div class="item-content">

                                <strong>
                                    ${escapeHtml(
                                        item.title
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        safe(
                                            item.department
                                        )
                                    )}
                                </span>

                            </div>

                            <div class="item-date">

                                <strong>
                                    ${formatDate(
                                        item.review_date
                                    )}
                                </strong>

                                <span>
                                    ${days >= 0
                                        ? `${days} days left`
                                        : `${Math.abs(days)} days overdue`
                                    }
                                </span>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* ============================================================
   GAPS
============================================================ */

function renderGaps(
    gaps
) {

    const container =
        document.getElementById(
            "gapsList"
        );


    if (!gaps.length) {

        container.innerHTML =
            `<div class="loading-row">
                No compliance gaps.
            </div>`;

        return;
    }


    container.innerHTML =
        gaps
            .map(
                item =>
                    `
                    <div class="gap-item">

                        <span>
                            ${escapeHtml(
                                safe(
                                    item.area,
                                    "Other"
                                )
                            )}
                        </span>

                        <span class="gap-count">
                            ${Number(
                                item.count || 0
                            )}
                        </span>

                        <i class="fa-solid fa-chevron-right"></i>

                    </div>
                    `
            )
            .join("");
}


/* ============================================================
   ACTIVITIES
============================================================ */

function renderActivities(
    activities
) {

    const container =
        document.getElementById(
            "activitiesList"
        );


    if (!activities.length) {

        container.innerHTML =
            `<div class="loading-row">
                No recent activities.
            </div>`;

        return;
    }


    container.innerHTML =
        activities
            .map(
                item => {

                    const status =
                        String(
                            item.status || ""
                        ).toLowerCase();


                    let iconClass =
                        "green";

                    let icon =
                        "fa-circle-check";


                    if (
                        status.includes(
                            "partial"
                        ) ||
                        status.includes(
                            "pending"
                        )
                    ) {

                        iconClass =
                            "orange";

                        icon =
                            "fa-triangle-exclamation";
                    }


                    if (
                        status.includes(
                            "non"
                        ) ||
                        status.includes(
                            "fail"
                        )
                    ) {

                        iconClass =
                            "red";

                        icon =
                            "fa-circle-xmark";
                    }


                    return `
                        <div class="activity-item">

                            <div
                                class="
                                    activity-icon
                                    ${iconClass}
                                "
                            >
                                <i
                                    class="
                                        fa-solid
                                        ${icon}
                                    "
                                ></i>
                            </div>

                            <div class="activity-text">

                                <strong>
                                    ${escapeHtml(
                                        safe(
                                            item.activity
                                        )
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        safe(
                                            item.category
                                        )
                                    )}
                                </span>

                            </div>

                            <div class="activity-date">

                                ${formatDate(
                                    item.date
                                )}

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* ============================================================
   ACTIONS
============================================================ */

function viewRequirement(id) {

    console.log(
        "View requirement:",
        id
    );

    alert(
        `Open compliance requirement ${id}`
    );
}


function assessRequirement(id) {

    console.log(
        "Assess requirement:",
        id
    );

    alert(
        `Assessment action for requirement ${id}`
    );
}


/* ============================================================
   EXPORT
============================================================ */

async function exportReport() {

    const button =
        document.getElementById(
            "exportBtn"
        );

    const original =
        button.innerHTML;


    button.disabled = true;

    button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Exporting...
    `;


    try {

        const params =
            new URLSearchParams();


        if (currentSearch) {

            params.set(
                "search",
                currentSearch
            );
        }


        if (
            currentStatus &&
            currentStatus !== "All"
        ) {

            params.set(
                "status",
                currentStatus
            );
        }


        const response =
            await fetch(
                `/api/auditor/compliance/export?${params.toString()}`,
                {
                    credentials: "include"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Export endpoint is not available."
            );
        }


        const blob =
            await response.blob();


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            "compliance-report.csv";

        link.click();

        URL.revokeObjectURL(
            url
        );


    } catch (error) {

        console.error(
            "Export error:",
            error
        );

        alert(
            error.message
        );

    } finally {

        button.disabled = false;

        button.innerHTML =
            original;
    }
}


/* ============================================================
   ERROR
============================================================ */

function showError(
    message
) {

    const body =
        document.getElementById(
            "requirementsBody"
        );


    if (body) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="loading-row"
                >
                    Unable to load compliance data:
                    ${escapeHtml(
                        message
                    )}
                </td>
            </tr>
        `;
    }
}