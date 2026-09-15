"use strict";

/* ============================================================
   CONFIGURATION
============================================================ */

const API_BASE = "http://127.0.0.1:8000";

let scoreTrendChart = null;
let statusChart = null;
let categoryChart = null;

let currentPage = 1;
const pageSize = 8;

let currentData = null;


/* ============================================================
   AUTHENTICATION
============================================================ */

/*
 * Get JWT token from localStorage/sessionStorage.
 *
 * Supports:
 * access_token
 * token
 * jwt_token
 */
function getAuthToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token")
    );
}


/*
 * Get authenticated request headers.
 */
function getAuthHeaders(includeJson = false) {

    const token = getAuthToken();

    const headers = {
        "Accept": "application/json"
    };

    if (includeJson) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}


/*
 * Common API fetch function.
 */
async function apiFetch(url, options = {}) {

    const token = getAuthToken();

    if (!token) {

        console.error(
            "JWT token not found."
        );

        throw new Error(
            "Authentication required. Please login again."
        );
    }


    const headers = {
        ...getAuthHeaders(
            options.body !== undefined
        ),
        ...(options.headers || {})
    };


    console.log(
        "API Request:",
        options.method || "GET",
        url
    );


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    if (response.status === 401) {

        console.error(
            "401 Unauthorized."
        );


        /*
         * Remove expired/invalid tokens.
         */
        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "jwt_token"
        );

        sessionStorage.removeItem(
            "access_token"
        );

        sessionStorage.removeItem(
            "token"
        );

        sessionStorage.removeItem(
            "jwt_token"
        );


        throw new Error(
            "Authentication failed. Your session may have expired. Please login again."
        );
    }


    return response;
}


/* ============================================================
   GET VENDOR ID
============================================================ */

function getVendorId() {

    /*
     * 1. URL:
     * ?vendor_id=VND0000001
     */
    const params =
        new URLSearchParams(
            window.location.search
        );


    const urlVendorId =
        params.get(
            "vendor_id"
        );


    if (urlVendorId) {
        return urlVendorId;
    }


    /*
     * 2. sessionStorage
     */
    const sessionVendorId =
        sessionStorage.getItem(
            "vendor_id"
        );


    if (sessionVendorId) {
        return sessionVendorId;
    }


    /*
     * 3. localStorage
     */
    const localVendorId =
        localStorage.getItem(
            "vendor_id"
        );


    if (localVendorId) {
        return localVendorId;
    }


    /*
     * 4. sessionStorage vendor object
     */
    const storedVendor =
        sessionStorage.getItem(
            "vendor"
        );


    if (storedVendor) {

        try {

            const vendor =
                JSON.parse(
                    storedVendor
                );


            if (
                vendor &&
                vendor.vendor_id
            ) {

                return vendor.vendor_id;
            }

        } catch (error) {

            console.error(
                "Session vendor parsing error:",
                error
            );
        }
    }


    /*
     * 5. localStorage vendor object
     */
    const localVendor =
        localStorage.getItem(
            "vendor"
        );


    if (localVendor) {

        try {

            const vendor =
                JSON.parse(
                    localVendor
                );


            if (
                vendor &&
                vendor.vendor_id
            ) {

                return vendor.vendor_id;
            }

        } catch (error) {

            console.error(
                "Local vendor parsing error:",
                error
            );
        }
    }


    /*
     * Default vendor ID.
     */
    return "VND0000001";
}


/* ============================================================
   DOM HELPER
============================================================ */

function $(id) {

    return document.getElementById(
        id
    );
}


/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(value) {

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
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* ============================================================
   LOAD COMPLIANCE REPORT
============================================================ */

async function loadComplianceReport() {

    const vendorId =
        getVendorId();


    const params =
        new URLSearchParams();


    const startDate =
        $("startDate")?.value || "";


    const endDate =
        $("endDate")?.value || "";


    const category =
        $("categoryFilter")?.value || "All";


    const complianceType =
        $("complianceTypeFilter")?.value || "All";


    const status =
        $("statusFilter")?.value || "All";


    const search =
        $("documentSearch")?.value || "";


    /*
     * Date filters
     */
    if (startDate) {

        params.set(
            "start_date",
            startDate
        );
    }


    if (endDate) {

        params.set(
            "end_date",
            endDate
        );
    }


    /*
     * Category
     */
    if (
        category &&
        category !== "All"
    ) {

        params.set(
            "category",
            category
        );
    }


    /*
     * Compliance type
     */
    if (
        complianceType &&
        complianceType !== "All"
    ) {

        params.set(
            "compliance_type",
            complianceType
        );
    }


    /*
     * Status
     */
    if (
        status &&
        status !== "All"
    ) {

        params.set(
            "status",
            status
        );
    }


    /*
     * Search
     */
    if (search) {

        params.set(
            "search",
            search
        );
    }


    /*
     * Pagination
     */
    params.set(
        "page",
        currentPage
    );


    params.set(
        "limit",
        pageSize
    );


    const url =
        `${API_BASE}/api/vendor/compliance-reports/${encodeURIComponent(vendorId)}?${params.toString()}`;


    console.log(
        "========================================"
    );

    console.log(
        "Loading Vendor Compliance Report"
    );

    console.log(
        "Vendor ID:",
        vendorId
    );

    console.log(
        "Token available:",
        !!getAuthToken()
    );

    console.log(
        "URL:",
        url
    );

    console.log(
        "========================================"
    );


    try {

        showLoading();


        /*
         * IMPORTANT:
         *
         * apiFetch adds:
         *
         * Authorization:
         * Bearer <JWT>
         */
        const response =
            await apiFetch(
                url,
                {
                    method: "GET"
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `HTTP ${response.status}: ${errorText}`
            );
        }


        const data =
            await response.json();


        console.log(
            "Compliance report data:",
            data
        );


        currentData =
            data;


        renderDashboard(
            data
        );


    } catch (error) {

        console.error(
            "Compliance report error:",
            error
        );


        showError(
            error.message
        );
    }
}


/* ============================================================
   RENDER DASHBOARD
============================================================ */

function renderDashboard(data) {

    if (!data) {
        return;
    }


    renderSummary(
        data.summary || {}
    );


    renderStatusChart(
        data.status_distribution || {}
    );


    renderScoreTrend(
        data.trend || {
            labels: [],
            scores: []
        }
    );


    renderCategoryChart(
        data.category_distribution || []
    );


    renderDocuments(
        data.documents || [],
        data.pagination || {
            page: 1,
            limit: pageSize,
            total: 0,
            total_pages: 0
        }
    );


    renderFilters(
        data.filters || {}
    );


    renderExpiry(
        data.upcoming_expiry || []
    );


    renderInsights(
        data.summary || {}
    );


    updateVendorInfo(
        data.vendor_id ||
        getVendorId()
    );
}


/* ============================================================
   SUMMARY
============================================================ */

function renderSummary(summary) {

    if ($("complianceScore")) {

        $("complianceScore")
            .textContent =
            Number(
                summary.overall_compliance_score || 0
            ).toFixed(1);
    }


    if ($("compliantDocuments")) {

        $("compliantDocuments")
            .textContent =
            summary.compliant_documents || 0;
    }


    if ($("expiringSoon")) {

        $("expiringSoon")
            .textContent =
            summary.expiring_soon || 0;
    }


    if ($("nonCompliant")) {

        $("nonCompliant")
            .textContent =
            summary.non_compliant || 0;
    }


    if ($("pendingReview")) {

        $("pendingReview")
            .textContent =
            summary.pending_review || 0;
    }


    if ($("overdue")) {

        $("overdue")
            .textContent =
            summary.overdue || 0;
    }


    if ($("summaryCompliant")) {

        $("summaryCompliant")
            .textContent =
            summary.compliant_documents || 0;
    }


    if ($("summaryExpiring")) {

        $("summaryExpiring")
            .textContent =
            summary.expiring_soon || 0;
    }


    if ($("summaryPending")) {

        $("summaryPending")
            .textContent =
            summary.pending_review || 0;
    }


    if ($("summaryNonCompliant")) {

        $("summaryNonCompliant")
            .textContent =
            summary.non_compliant || 0;
    }


    if ($("summaryOverdue")) {

        $("summaryOverdue")
            .textContent =
            summary.overdue || 0;
    }


    if ($("summaryTotal")) {

        $("summaryTotal")
            .textContent =
            summary.total_documents || 0;
    }


    if ($("donutTotal")) {

        $("donutTotal")
            .textContent =
            summary.total_documents || 0;
    }
}


/* ============================================================
   STATUS CHART
============================================================ */

function renderStatusChart(
    distribution
) {

    const canvas =
        $("statusChart");


    if (!canvas) {
        return;
    }


    if (statusChart) {

        statusChart.destroy();

        statusChart = null;
    }


    const labels = [
        "Compliant",
        "Expiring Soon",
        "Pending Review",
        "Non-Compliant",
        "Overdue"
    ];


    const values =
        labels.map(
            label =>
                Number(
                    distribution[label] || 0
                )
        );


    statusChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels,

                    datasets: [

                        {

                            data:
                                values,

                            backgroundColor: [
                                "#12ad72",
                                "#ff981d",
                                "#7445e8",
                                "#ef4b4b",
                                "#d92e2e"
                            ],

                            borderWidth: 0
                        }
                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout:
                        "68%",

                    plugins: {

                        legend: {

                            display: false
                        }
                    }
                }
            }
        );


    renderLegend(
        labels,
        values
    );
}


/* ============================================================
   STATUS LEGEND
============================================================ */

function renderLegend(
    labels,
    values
) {

    const container =
        $("statusLegend");


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    const colors = [
        "#12ad72",
        "#ff981d",
        "#7445e8",
        "#ef4b4b",
        "#d92e2e"
    ];


    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    labels.forEach(
        (label, index) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "legend-row";


            const percentage =
                total
                    ? (
                        values[index] /
                        total
                    ) * 100
                    : 0;


            row.innerHTML = `

                <span
                    class="legend-dot"
                    style="
                        background:${colors[index]}
                    "
                ></span>

                <span>
                    ${escapeHtml(label)}
                </span>

                <strong>
                    ${values[index]}
                    (${percentage.toFixed(1)}%)
                </strong>

            `;


            container.appendChild(
                row
            );
        }
    );
}


/* ============================================================
   SCORE TREND
============================================================ */

function renderScoreTrend(
    trend
) {

    const canvas =
        $("scoreTrendChart");


    if (!canvas) {
        return;
    }


    if (scoreTrendChart) {

        scoreTrendChart.destroy();

        scoreTrendChart = null;
    }


    scoreTrendChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels:
                        trend.labels || [],

                    datasets: [

                        {

                            label:
                                "Compliance Score (%)",

                            data:
                                trend.scores || [],

                            borderColor:
                                "#1465eb",

                            backgroundColor:
                                "rgba(20,101,235,.08)",

                            borderWidth:
                                2,

                            pointRadius:
                                3,

                            pointBackgroundColor:
                                "#1465eb",

                            tension:
                                0.35,

                            fill:
                                true
                        }
                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        y: {

                            min:
                                0,

                            max:
                                100,

                            ticks: {

                                font: {
                                    size: 9
                                }
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

                                display:
                                    false
                            }
                        }
                    },


                    plugins: {

                        legend: {

                            display:
                                false
                        }
                    }
                }
            }
        );
}


/* ============================================================
   CATEGORY CHART
============================================================ */

function renderCategoryChart(
    categories
) {

    const canvas =
        $("categoryChart");


    if (!canvas) {
        return;
    }


    if (categoryChart) {

        categoryChart.destroy();

        categoryChart = null;
    }


    const sorted =
        [...(categories || [])]
        .sort(
            (a, b) => {

                const aValue =
                    (a.Compliant || 0) +
                    (a["Expiring Soon"] || 0);


                const bValue =
                    (b.Compliant || 0) +
                    (b["Expiring Soon"] || 0);


                return bValue - aValue;
            }
        )
        .slice(
            0,
            7
        );


    const labels =
        sorted.map(
            item =>
                item.category
        );


    const compliant =
        sorted.map(
            item =>
                item.Compliant || 0
        );


    const expiring =
        sorted.map(
            item =>
                item["Expiring Soon"] || 0
        );


    const pending =
        sorted.map(
            item =>
                item["Pending Review"] || 0
        );


    const nonCompliant =
        sorted.map(
            item =>
                item["Non-Compliant"] || 0
        );


    categoryChart =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Compliant",

                            data:
                                compliant,

                            backgroundColor:
                                "#12ad72"
                        },


                        {

                            label:
                                "Expiring Soon",

                            data:
                                expiring,

                            backgroundColor:
                                "#ff981d"
                        },


                        {

                            label:
                                "Pending Review",

                            data:
                                pending,

                            backgroundColor:
                                "#7445e8"
                        },


                        {

                            label:
                                "Non-Compliant",

                            data:
                                nonCompliant,

                            backgroundColor:
                                "#ef4b4b"
                        }
                    ]
                },


                options: {

                    indexAxis:
                        "y",

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        x: {

                            stacked:
                                true,

                            beginAtZero:
                                true,

                            ticks: {

                                font: {
                                    size: 8
                                }
                            },

                            grid: {

                                color:
                                    "#edf1f6"
                            }
                        },


                        y: {

                            stacked:
                                true,

                            ticks: {

                                font: {
                                    size: 8
                                }
                            },

                            grid: {

                                display:
                                    false
                            }
                        }
                    },


                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {

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


/* ============================================================
   DOCUMENT TABLE
============================================================ */

function renderDocuments(
    documents,
    pagination
) {

    const tbody =
        $("documentTableBody");


    if (!tbody) {
        return;
    }


    tbody.innerHTML =
        "";


    if (
        !documents ||
        !documents.length
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#8795ad;
                    "
                >
                    No compliance documents found.
                </td>

            </tr>

        `;


        if ($("paginationInfo")) {

            $("paginationInfo")
                .textContent =
                "Showing 0 documents";
        }


        if ($("paginationControls")) {

            $("paginationControls")
                .innerHTML =
                "";
        }


        return;
    }


    documents.forEach(
        item => {

            const tr =
                document.createElement(
                    "tr"
                );


            const statusClass =
                getStatusClass(
                    item.status
                );


            const daysClass =
                getDaysClass(
                    item.days_left
                );


            const daysText =
                formatDaysLeft(
                    item.days_left
                );


            tr.innerHTML = `

                <td>

                    <div class="document-name">

                        ${escapeHtml(
                            item.document_name
                        )}

                    </div>

                </td>


                <td>

                    ${escapeHtml(
                        item.category || "-"
                    )}

                </td>


                <td>

                    ${escapeHtml(
                        item.compliance_type || "-"
                    )}

                </td>


                <td>

                    ${formatDate(
                        item.issue_date
                    )}

                </td>


                <td>

                    ${formatDate(
                        item.expiry_date
                    )}

                </td>


                <td>

                    <span
                        class="status ${statusClass}"
                    >
                        ${escapeHtml(
                            item.status || "-"
                        )}
                    </span>

                </td>


                <td>

                    <span
                        class="${daysClass}"
                    >
                        ${daysText}
                    </span>

                </td>


                <td>

                    <button
                        class="action-button"
                        type="button"
                        onclick="
                            viewDocument(${Number(item.id)})
                        "
                    >
                        ⋯
                    </button>

                </td>

            `;


            tbody.appendChild(
                tr
            );
        }
    );


    renderPagination(
        pagination
    );
}


/* ============================================================
   STATUS CLASS
============================================================ */

function getStatusClass(
    status
) {

    switch (status) {

        case "Compliant":
            return "compliant";

        case "Expiring Soon":
            return "expiring";

        case "Pending Review":
            return "pending";

        case "Non-Compliant":
            return "non-compliant";

        case "Overdue":
            return "overdue";

        default:
            return "pending";
    }
}


/* ============================================================
   DAYS CLASS
============================================================ */

function getDaysClass(
    days
) {

    if (
        days === null ||
        days === undefined
    ) {

        return "";
    }


    if (days < 0) {
        return "days-negative";
    }


    if (days <= 90) {
        return "days-warning";
    }


    return "days-positive";
}


/* ============================================================
   FORMAT DAYS
============================================================ */

function formatDaysLeft(
    days
) {

    if (
        days === null ||
        days === undefined
    ) {

        return "-";
    }


    return `${days} days`;
}


/* ============================================================
   PAGINATION
============================================================ */

function renderPagination(
    pagination
) {

    const info =
        $("paginationInfo");


    const container =
        $("paginationControls");


    if (
        !info ||
        !container
    ) {

        return;
    }


    const page =
        Number(
            pagination.page || 1
        );


    const limit =
        Number(
            pagination.limit || pageSize
        );


    const total =
        Number(
            pagination.total || 0
        );


    const totalPages =
        Number(
            pagination.total_pages || 0
        );


    const start =
        total
            ? ((page - 1) * limit) + 1
            : 0;


    const end =
        Math.min(
            page * limit,
            total
        );


    info.textContent =
        `Showing ${start} to ${end} of ${total} documents`;


    container.innerHTML =
        "";


    if (
        totalPages <= 1
    ) {

        return;
    }


    /*
     * Previous button
     */
    const previous =
        document.createElement(
            "button"
        );


    previous.type =
        "button";


    previous.textContent =
        "‹";


    previous.disabled =
        page <= 1;


    previous.onclick =
        () => {

            if (
                currentPage > 1
            ) {

                currentPage--;

                loadComplianceReport();
            }
        };


    container.appendChild(
        previous
    );


    /*
     * Page buttons
     */
    for (
        let pageNumber = 1;
        pageNumber <= totalPages;
        pageNumber++
    ) {

        /*
         * Display first 5 pages and last page.
         */
        if (
            pageNumber > 5 &&
            pageNumber < totalPages
        ) {

            continue;
        }


        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.textContent =
            pageNumber;


        if (
            pageNumber === page
        ) {

            button.classList.add(
                "active"
            );
        }


        button.onclick =
            () => {

                currentPage =
                    pageNumber;

                loadComplianceReport();
            };


        container.appendChild(
            button
        );
    }


    /*
     * Next button
     */
    const next =
        document.createElement(
            "button"
        );


    next.type =
        "button";


    next.textContent =
        "›";


    next.disabled =
        page >= totalPages;


    next.onclick =
        () => {

            if (
                currentPage < totalPages
            ) {

                currentPage++;

                loadComplianceReport();
            }
        };


    container.appendChild(
        next
    );
}


/* ============================================================
   FILTER OPTIONS
============================================================ */

function renderFilters(
    filters
) {

    const categorySelect =
        $("categoryFilter");


    const typeSelect =
        $("complianceTypeFilter");


    if (
        !categorySelect ||
        !typeSelect
    ) {

        return;
    }


    const selectedCategory =
        categorySelect.value ||
        "All";


    const selectedType =
        typeSelect.value ||
        "All";


    /*
     * Category
     */
    categorySelect.innerHTML = `

        <option value="All">
            All Categories
        </option>

    `;


    (
        filters.categories ||
        []
    ).forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                category;


            option.textContent =
                category;


            categorySelect.appendChild(
                option
            );
        }
    );


    /*
     * Compliance type
     */
    typeSelect.innerHTML = `

        <option value="All">
            All Compliance Types
        </option>

    `;


    (
        filters.compliance_types ||
        []
    ).forEach(
        type => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                type;


            option.textContent =
                type;


            typeSelect.appendChild(
                option
            );
        }
    );


    /*
     * Restore category
     */
    if (
        [...categorySelect.options]
            .some(
                option =>
                    option.value ===
                    selectedCategory
            )
    ) {

        categorySelect.value =
            selectedCategory;
    }


    /*
     * Restore type
     */
    if (
        [...typeSelect.options]
            .some(
                option =>
                    option.value ===
                    selectedType
            )
    ) {

        typeSelect.value =
            selectedType;
    }
}


/* ============================================================
   UPCOMING EXPIRY
============================================================ */

function renderExpiry(
    documents
) {

    const container =
        $("upcomingExpiry");


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    (
        documents || []
    )
    .slice(
        0,
        5
    )
    .forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "expiry-item";


            div.innerHTML = `

                <div>

                    <div class="expiry-name">

                        ${escapeHtml(
                            item.document_name
                        )}

                    </div>

                    <span class="expiry-date">

                        ${formatDate(
                            item.expiry_date
                        )}

                    </span>

                </div>


                <div class="expiry-days">

                    ${formatDaysLeft(
                        item.days_left
                    )}

                </div>

            `;


            container.appendChild(
                div
            );
        }
    );


    if (
        !documents ||
        !documents.length
    ) {

        container.innerHTML = `

            <div
                style="
                    font-size:9px;
                    color:#8795ad;
                "
            >
                No upcoming expiries.
            </div>

        `;
    }
}


/* ============================================================
   INSIGHTS
============================================================ */

function renderInsights(
    summary
) {

    const container =
        $("insights");


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    const score =
        Number(
            summary.overall_compliance_score || 0
        );


    if (
        score >= 90
    ) {

        addInsight(
            container,
            "green",
            "✓",
            `Overall compliance score is ${score.toFixed(1)}.`
        );

    } else {

        addInsight(
            container,
            "orange",
            "!",
            `Compliance score is ${score.toFixed(1)}. Review outstanding documents.`
        );
    }


    if (
        Number(
            summary.expiring_soon || 0
        ) > 0
    ) {

        addInsight(
            container,
            "orange",
            "▲",
            `${summary.expiring_soon} documents are expiring soon.`
        );
    }


    if (
        Number(
            summary.overdue || 0
        ) > 0
    ) {

        addInsight(
            container,
            "red",
            "×",
            `${summary.overdue} documents are overdue.`
        );
    }


    if (
        Number(
            summary.pending_review || 0
        ) > 0
    ) {

        addInsight(
            container,
            "orange",
            "◷",
            `${summary.pending_review} documents are awaiting review.`
        );
    }
}


/* ============================================================
   ADD INSIGHT
============================================================ */

function addInsight(
    container,
    type,
    icon,
    text
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        `insight ${type}`;


    item.innerHTML = `

        <div class="insight-icon">
            ${escapeHtml(icon)}
        </div>

        <div>
            ${escapeHtml(text)}
        </div>

    `;


    container.appendChild(
        item
    );
}


/* ============================================================
   EXPORT REPORT
============================================================ */

function exportReport() {

    if (
        !currentData ||
        !currentData.documents
    ) {

        alert(
            "No report data available."
        );

        return;
    }


    const rows = [

        [
            "Document Name",
            "Category",
            "Compliance Type",
            "Issue Date",
            "Expiry Date",
            "Status",
            "Days Left"
        ]
    ];


    currentData.documents.forEach(
        item => {

            rows.push([

                item.document_name,

                item.category,

                item.compliance_type,

                item.issue_date || "",

                item.expiry_date || "",

                item.status,

                item.days_left ?? ""

            ]);
        }
    );


    const csv =
        rows
        .map(
            row =>
                row
                .map(
                    value =>
                        `"${String(value)
                            .replace(
                                /"/g,
                                '""'
                            )}"`
                )
                .join(",")
        )
        .join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        "compliance-report.csv";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );
}


/* ============================================================
   VIEW / DOWNLOAD DOCUMENT
============================================================ */

async function viewDocument(
    documentId
) {

    const vendorId =
        getVendorId();


    const token =
        getAuthToken();


    if (!token) {

        alert(
            "Authentication required. Please login again."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/api/vendor/documents/${encodeURIComponent(vendorId)}/${encodeURIComponent(documentId)}/download`,
                {
                    method:
                        "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`,

                        "Accept":
                            "*/*"
                    }
                }
            );


        if (
            response.status === 401
        ) {

            throw new Error(
                "Authentication failed. Please login again."
            );
        }


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `HTTP ${response.status}: ${errorText}`
            );
        }


        const blob =
            await response.blob();


        const blobUrl =
            URL.createObjectURL(
                blob
            );


        window.open(
            blobUrl,
            "_blank"
        );


        setTimeout(
            () => {

                URL.revokeObjectURL(
                    blobUrl
                );

            },
            60000
        );


    } catch (error) {

        console.error(
            "Document download error:",
            error
        );


        alert(
            error.message
        );
    }
}


/* ============================================================
   VENDOR INFORMATION
============================================================ */

function updateVendorInfo(
    vendorId
) {

    const element =
        $("sidebarVendorId");


    if (!element) {
        return;
    }


    element.textContent =
        `Vendor ID: ${vendorId}`;
}


/* ============================================================
   LOADING
============================================================ */

function showLoading() {

    const tbody =
        $("documentTableBody");


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                style="
                    text-align:center;
                    padding:30px;
                "
            >
                Loading compliance report...
            </td>

        </tr>

    `;
}


/* ============================================================
   ERROR
============================================================ */

function showError(
    message
) {

    const tbody =
        $("documentTableBody");


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                style="
                    text-align:center;
                    padding:30px;
                    color:#ef4b4b;
                "
            >

                Failed to load compliance report.

                <br><br>

                ${escapeHtml(message)}

            </td>

        </tr>

    `;
}


/* ============================================================
   HTML ESCAPE
============================================================ */

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


/* ============================================================
   INITIAL DATES
============================================================ */

function initializeDates() {

    const today =
        new Date();


    const sixMonthsAgo =
        new Date(
            today
        );


    /*
     * Current month + previous 5 months.
     */
    sixMonthsAgo.setMonth(
        today.getMonth() - 5
    );


    const startDate =
        $("startDate");


    const endDate =
        $("endDate");


    if (startDate) {

        startDate.value =
            sixMonthsAgo
            .toISOString()
            .split("T")[0];
    }


    if (endDate) {

        endDate.value =
            today
            .toISOString()
            .split("T")[0];
    }
}


/* ============================================================
   EVENTS
============================================================ */

function setupEvents() {

    /*
     * Apply filters
     */
    $("applyFilters")
        ?.addEventListener(
            "click",
            () => {

                currentPage =
                    1;

                loadComplianceReport();
            }
        );


    /*
     * Document search
     */
    $("documentSearch")
        ?.addEventListener(
            "input",
            debounce(
                () => {

                    currentPage =
                        1;

                    loadComplianceReport();

                },
                500
            )
        );


    /*
     * Status filter
     */
    $("statusFilter")
        ?.addEventListener(
            "change",
            () => {

                currentPage =
                    1;

                loadComplianceReport();
            }
        );


    /*
     * Category filter
     */
    $("categoryFilter")
        ?.addEventListener(
            "change",
            () => {

                currentPage =
                    1;

                loadComplianceReport();
            }
        );


    /*
     * Compliance type filter
     */
    $("complianceTypeFilter")
        ?.addEventListener(
            "change",
            () => {

                currentPage =
                    1;

                loadComplianceReport();
            }
        );


    /*
     * Export button
     */
    $("exportButton")
        ?.addEventListener(
            "click",
            exportReport
        );


    /*
     * Download button
     */
    $("downloadButton")
        ?.addEventListener(
            "click",
            exportReport
        );


    /*
     * Global search
     */
    $("globalSearch")
        ?.addEventListener(
            "input",
            debounce(
                event => {

                    if (
                        $("documentSearch")
                    ) {

                        $("documentSearch")
                            .value =
                            event.target.value;
                    }


                    currentPage =
                        1;


                    loadComplianceReport();

                },
                500
            )
        );


    /*
     * Schedule report
     */
    $("scheduleButton")
        ?.addEventListener(
            "click",
            scheduleReport
        );
}


/* ============================================================
   SCHEDULE REPORT
============================================================ */

async function scheduleReport() {

    const vendorId =
        getVendorId();


    const payload = {

        vendor_id:
            vendorId,

        report_name:
            "Compliance Report",

        schedule:
            "Monthly",

        format:
            "CSV",

        filters: {

            category:
                $("categoryFilter")?.value ||
                "All",

            compliance_type:
                $("complianceTypeFilter")?.value ||
                "All",

            status:
                $("statusFilter")?.value ||
                "All"
        }
    };


    try {

        const response =
            await apiFetch(
                `${API_BASE}/api/vendor/compliance-reports/schedule`,
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `HTTP ${response.status}: ${errorText}`
            );
        }


        alert(
            "Compliance report scheduled successfully."
        );


    } catch (error) {

        console.error(
            "Schedule report error:",
            error
        );


        alert(
            error.message
        );
    }
}


/* ============================================================
   DEBOUNCE
============================================================ */

function debounce(
    callback,
    delay
) {

    let timer;


    return function (...args) {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => {

                    callback.apply(
                        this,
                        args
                    );

                },
                delay
            );
    };
}


/* ============================================================
   INITIALIZE
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "Vendor Compliance Reports initialized"
        );

        console.log(
            "Vendor ID:",
            getVendorId()
        );

        console.log(
            "JWT available:",
            !!getAuthToken()
        );

        console.log(
            "========================================"
        );


        initializeDates();


        setupEvents();

        loadVendorProfile();

        loadComplianceReport();
    }
);


async function loadVendorProfile() {

    /*
     * Get the currently authenticated vendor ID.
     * Do NOT use an undeclared vendorId variable.
     */
    const vendorId =
        getVendorId();


    if (!vendorId) {

        console.warn(
            "Vendor ID not found."
        );

        return;
    }


    console.log(
        "Loading vendor profile for:",
        vendorId
    );


    try {

        const vendor =
            await apiFetch(
                `${API_BASE}/api/vendor/profile/${encodeURIComponent(vendorId)}`,
                {
                    method: "GET"
                }
            );


        /*
         * apiFetch returns the Response object,
         * so we must convert the response to JSON.
         */

        if (!vendor.ok) {

            const errorText =
                await vendor.text();


            throw new Error(
                `HTTP ${vendor.status}: ${errorText}`
            );
        }


        const vendorData =
            await vendor.json();


        console.log(
            "Vendor profile:",
            vendorData
        );


        const name =
            vendorData.vendor_name ||
            vendorData.company_name ||
            vendorData.name ||
            "Vendor";


        const headerName =
            document.getElementById(
                "headerVendorName"
            );


        const sidebarName =
            document.getElementById(
                "sidebarVendorName"
            );


        if (headerName) {

            headerName.textContent =
                name;
        }


        if (sidebarName) {

            sidebarName.textContent =
                name;
        }


    } catch (error) {

        console.error(
            "Vendor profile error:",
            error
        );
    }
}