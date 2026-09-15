const API = "http://127.0.0.1:8000";

let typeChart = null;
let statusChart = null;
let trendChart = null;


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   AUTHENTICATION
========================================================= */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token")
    );
}


function authHeaders() {

    const token = getToken();

    const headers = {
        "Accept": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}


function handleUnauthorized() {

    console.warn("Authentication required.");

    /*
       Do not automatically redirect here.
       This makes debugging easier.

       If you want automatic login redirection,
       uncomment the following:

       localStorage.removeItem("access_token");
       localStorage.removeItem("token");
       localStorage.removeItem("jwt_token");

       window.location.href = "login.html";
    */
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   NUMBER FORMAT
========================================================= */

function formatNumber(value) {

    return Number(value || 0)
        .toLocaleString("en-US");
}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
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


/* =========================================================
   STATUS CLASS
========================================================= */

function statusClass(status) {

    switch (
        String(status || "")
            .toLowerCase()
            .trim()
    ) {

        case "published":
            return "status-published";

        case "draft":
            return "status-draft";

        case "pending approval":
        case "pending_approval":
        case "pending":
            return "status-pending";

        case "archived":
            return "status-archived";

        default:
            return "status-draft";
    }
}


/* =========================================================
   PERCENTAGE
========================================================= */

function percentage(value, total) {

    if (!total) {
        return 0;
    }

    return Math.round(
        (Number(value || 0) /
            Number(total || 0)) * 100
    );
}


/* =========================================================
   API ERROR HELPER
========================================================= */

async function getApiError(response) {

    try {

        const data =
            await response.json();

        if (data.detail) {

            if (Array.isArray(data.detail)) {

                return data.detail
                    .map(item =>
                        item.msg || "Validation error"
                    )
                    .join(", ");
            }

            return String(data.detail);
        }

        return JSON.stringify(data);

    } catch {

        try {
            return await response.text();
        } catch {
            return `HTTP ${response.status}`;
        }
    }
}


/* =========================================================
   LOAD CURRENT USER
========================================================= */

async function loadCurrentUser() {

    try {

        const response =
            await fetch(
                `${API}/api/auth/me`,
                {
                    method: "GET",
                    headers: authHeaders()
                }
            );


        if (response.status === 401) {

            handleUnauthorized();

            console.error(
                "USER ERROR: 401 Unauthorized"
            );

            return;
        }


        if (!response.ok) {

            const error =
                await getApiError(response);

            throw new Error(error);
        }


        const user =
            await response.json();


        const name =
            user.name ||
            user.full_name ||
            user.username ||
            user.email ||
            "Auditor";


        const role =
            user.role ||
            "Auditor";


        if ($("sidebarUserName")) {

            $("sidebarUserName")
                .textContent = name;
        }


        if ($("sidebarUserRole")) {

            $("sidebarUserRole")
                .textContent = role;
        }


        if ($("headerUserName")) {

            $("headerUserName")
                .textContent = name;
        }


        if ($("headerUserRole")) {

            $("headerUserRole")
                .textContent = role;
        }

    } catch (error) {

        console.error(
            "USER LOAD ERROR:",
            error
        );
    }
}


/* =========================================================
   LOAD FILTER OPTIONS
========================================================= */

async function loadFilterOptions() {

    try {

        const response =
            await fetch(
                `${API}/api/admin/reports/filter-options`,
                {
                    method: "GET",
                    headers: authHeaders()
                }
            );


        if (response.status === 401) {

            handleUnauthorized();

            throw new Error(
                "Unauthorized. Please login again."
            );
        }


        if (response.status === 422) {

            const error =
                await getApiError(response);

            console.error(
                "FILTER OPTIONS 422:",
                error
            );

            throw new Error(
                `Filter options validation error: ${error}`
            );
        }


        if (!response.ok) {

            const error =
                await getApiError(response);

            throw new Error(error);
        }


        const data =
            await response.json();


        /* =====================================================
           AUDITS
        ===================================================== */

        const auditFilter =
            $("auditFilter");


        if (auditFilter) {

            auditFilter.innerHTML =
                `<option value="All Audits">
                    All Audits
                </option>`;


            const audits =
                Array.isArray(data.audits)
                    ? data.audits
                    : [];


            audits.forEach(value => {

                const option =
                    document.createElement("option");

                option.value = value;
                option.textContent = value;

                auditFilter.appendChild(option);
            });
        }


        /* =====================================================
           AUDITORS
        ===================================================== */

        const preparedByFilter =
            $("preparedByFilter");


        if (preparedByFilter) {

            preparedByFilter.innerHTML =
                `<option value="All Auditors">
                    All Auditors
                </option>`;


            const auditors =
                Array.isArray(data.prepared_by)
                    ? data.prepared_by
                    : [];


            auditors.forEach(value => {

                const option =
                    document.createElement("option");

                option.value = value;
                option.textContent = value;

                preparedByFilter.appendChild(option);
            });
        }

    } catch (error) {

        console.error(
            "FILTER OPTIONS ERROR:",
            error
        );
    }
}


/* =========================================================
   GET FILTER PARAMETERS
========================================================= */

function getFilterParameters() {

    const params =
        new URLSearchParams();


    /* =====================================================
       SEARCH
    ===================================================== */

    const searchElement =
        $("reportSearch");


    if (searchElement) {

        const search =
            searchElement.value.trim();


        if (search) {

            params.set(
                "search",
                search
            );
        }
    }


    /* =====================================================
       REPORT TYPE
    ===================================================== */

    const typeElement =
        $("reportTypeFilter");


    if (typeElement) {

        const type =
            typeElement.value;


        if (
            type &&
            type !== "All Types"
        ) {

            params.set(
                "report_type",
                type
            );
        }
    }


    /* =====================================================
       AUDIT
    ===================================================== */

    const auditElement =
        $("auditFilter");


    if (auditElement) {

        const audit =
            auditElement.value;


        if (
            audit &&
            audit !== "All Audits"
        ) {

            params.set(
                "audit",
                audit
            );
        }
    }


    /* =====================================================
       PREPARED BY
    ===================================================== */

    const preparedByElement =
        $("preparedByFilter");


    if (preparedByElement) {

        const preparedBy =
            preparedByElement.value;


        if (
            preparedBy &&
            preparedBy !== "All Auditors"
        ) {

            params.set(
                "prepared_by",
                preparedBy
            );
        }
    }


    /* =====================================================
       DATE RANGE
    ===================================================== */

    const dateElement =
        $("dateRange");


    if (dateElement) {

        const range =
            dateElement.value.trim();


        if (range) {

            const parts =
                range.split(
                    /\s+to\s+/i
                );


            if (parts.length === 2) {

                params.set(
                    "from_date",
                    parts[0].trim()
                );


                params.set(
                    "to_date",
                    parts[1].trim()
                );
            }
        }
    }


    /* =====================================================
       TREND MONTHS
    ===================================================== */

    const trendElement =
        $("trendRange");


    if (trendElement) {

        const trendMonths =
            trendElement.value;


        if (trendMonths) {

            params.set(
                "trend_months",
                trendMonths
            );
        }
    }


    return params;
}


/* =========================================================
   LOAD REPORTS
========================================================= */

async function loadReports() {

    try {

        const params =
            getFilterParameters();


        const url =
            `${API}/api/admin/reports/overview?${params.toString()}`;


        console.log(
            "Loading reports:",
            url
        );


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    headers: authHeaders()
                }
            );


        /* =====================================================
           AUTH ERROR
        ===================================================== */

        if (response.status === 401) {

            handleUnauthorized();

            throw new Error(
                "Unauthorized. Please login again."
            );
        }


        /* =====================================================
           VALIDATION ERROR
        ===================================================== */

        if (response.status === 422) {

            const error =
                await getApiError(response);


            console.error(
                "REPORT OVERVIEW 422:",
                error
            );


            throw new Error(
                `Report validation error: ${error}`
            );
        }


        /* =====================================================
           OTHER ERROR
        ===================================================== */

        if (!response.ok) {

            const error =
                await getApiError(response);


            throw new Error(error);
        }


        const data =
            await response.json();


        console.log(
            "REPORT DATA:",
            data
        );


        renderDashboard(data);

    } catch (error) {

        console.error(
            "REPORT LOAD ERROR:",
            error
        );


        const tbody =
            $("recentReportsBody");


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="loading"
                    >
                        Unable to load reports.
                    </td>
                </tr>
            `;
        }
    }
}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function renderDashboard(data) {

    data =
        data || {};


    const kpis =
        data.kpis || {};


    /* =====================================================
       KPI VALUES
    ===================================================== */

    const total =
        Number(
            kpis.total_reports || 0
        );


    const published =
        Number(
            kpis.published_reports || 0
        );


    const drafts =
        Number(
            kpis.draft_reports || 0
        );


    const pending =
        Number(
            kpis.pending_approval || 0
        );


    const downloads =
        Number(
            kpis.downloads_this_month || 0
        );


    /* =====================================================
       KPI DISPLAY
    ===================================================== */

    if ($("totalReports")) {

        $("totalReports")
            .textContent =
            formatNumber(total);
    }


    if ($("publishedReports")) {

        $("publishedReports")
            .textContent =
            formatNumber(published);
    }


    if ($("draftReports")) {

        $("draftReports")
            .textContent =
            formatNumber(drafts);
    }


    if ($("pendingReports")) {

        $("pendingReports")
            .textContent =
            formatNumber(pending);
    }


    if ($("downloadCount")) {

        $("downloadCount")
            .textContent =
            formatNumber(downloads);
    }


    /* =====================================================
       PERCENTAGES
    ===================================================== */

    if ($("publishedPercentage")) {

        $("publishedPercentage")
            .textContent =
            `${percentage(published, total)}% of total`;
    }


    if ($("draftPercentage")) {

        $("draftPercentage")
            .textContent =
            `${percentage(drafts, total)}% of total`;
    }


    if ($("pendingPercentage")) {

        $("pendingPercentage")
            .textContent =
            `${percentage(pending, total)}% of total`;
    }


    /* =====================================================
       CURRENT MONTH
    ===================================================== */

    const currentMonth =
        Number(
            data.current_month_reports || 0
        );


    if ($("totalReportsChange")) {

        $("totalReportsChange")
            .textContent =
            `+${formatNumber(currentMonth)} this month`;
    }


    /* =====================================================
       CHART DATA
    ===================================================== */

    const typeBreakdown =
        Array.isArray(data.type_breakdown)
            ? data.type_breakdown
            : [];


    const statusBreakdown =
        Array.isArray(data.status_breakdown)
            ? data.status_breakdown
            : [];


    const trend =
        Array.isArray(data.trend)
            ? data.trend
            : [];


    const recentReports =
        Array.isArray(data.recent_reports)
            ? data.recent_reports
            : [];


    const topReports =
        Array.isArray(data.top_reports)
            ? data.top_reports
            : [];


    /* =====================================================
       RENDER
    ===================================================== */

    renderTypeChart(
        typeBreakdown
    );


    renderStatusChart(
        statusBreakdown
    );


    renderTrendChart(
        trend
    );


    renderTypeLegend(
        typeBreakdown
    );


    renderStatusLegend(
        statusBreakdown
    );


    renderRecentReports(
        recentReports
    );


    renderTopReports(
        topReports
    );


    /* =====================================================
       TOTALS
    ===================================================== */

    if ($("typeTotal")) {

        $("typeTotal")
            .textContent =
            formatNumber(total);
    }


    if ($("statusTotal")) {

        $("statusTotal")
            .textContent =
            formatNumber(total);
    }


    /* =====================================================
       TIMESTAMP
    ===================================================== */

    if ($("dataTimestamp")) {

        $("dataTimestamp")
            .textContent =
            `Reports are generated from the latest data available as of ${new Date().toLocaleString()}.`;
    }
}


/* =========================================================
   TYPE CHART
========================================================= */

function renderTypeChart(items) {

    const canvas =
        $("typeChart");


    if (!canvas) {
        return;
    }


    const labels =
        items.map(
            item =>
                item.type || "Unknown"
        );


    const values =
        items.map(
            item =>
                Number(item.count || 0)
        );


    if (typeChart) {

        typeChart.destroy();

        typeChart = null;
    }


    typeChart =
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
                                "#246BFD",
                                "#1DB56F",
                                "#FF9900",
                                "#7740D8",
                                "#2CA9C9"
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

                    cutout: "65%",

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            `${context.label}: ${context.raw}`
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   STATUS CHART
========================================================= */

function renderStatusChart(items) {

    const canvas =
        $("statusChart");


    if (!canvas) {
        return;
    }


    const labels =
        items.map(
            item =>
                item.status || "Unknown"
        );


    const values =
        items.map(
            item =>
                Number(item.count || 0)
        );


    if (statusChart) {

        statusChart.destroy();

        statusChart = null;
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

                            backgroundColor: [
                                "#20B66F",
                                "#246BFD",
                                "#FF9900",
                                "#7A40D8"
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

                    cutout: "65%",

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            `${context.label}: ${context.raw}`
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   TREND CHART
========================================================= */

function renderTrendChart(items) {

    const canvas =
        $("trendChart");


    if (!canvas) {
        return;
    }


    const labels =
        items.map(
            item =>
                item.month || ""
        );


    const values =
        items.map(
            item =>
                Number(item.count || 0)
        );


    if (trendChart) {

        trendChart.destroy();

        trendChart = null;
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
                                "Total Reports",

                            data:
                                values,

                            borderColor:
                                "#1264E8",

                            backgroundColor:
                                "rgba(18,100,232,0.08)",

                            borderWidth: 2,

                            tension: 0.35,

                            fill: false,

                            pointRadius: 4,

                            pointHoverRadius: 6,

                            pointBackgroundColor:
                                "#1264E8"
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
                                color: "#e7edf5"
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
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            ` Reports: ${context.raw}`
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   TYPE LEGEND
========================================================= */

function renderTypeLegend(items) {

    const container =
        $("typeLegend");


    if (!container) {
        return;
    }


    const colors = [
        "#246BFD",
        "#1DB56F",
        "#FF9900",
        "#7740D8",
        "#2CA9C9"
    ];


    if (!items.length) {

        container.innerHTML =
            `<div class="loading">
                No data available.
            </div>`;

        return;
    }


    container.innerHTML =
        items.map(
            (item, index) => {

                const color =
                    colors[
                        index %
                        colors.length
                    ];


                return `
                    <div class="legend-item">

                        <span
                            class="legend-dot"
                            style="background:${color}"
                        ></span>

                        <span class="legend-name">
                            ${escapeHtml(
                                item.type
                            )}
                        </span>

                        <span class="legend-value">
                            ${formatNumber(
                                item.count
                            )}
                            (${Number(
                                item.percentage || 0
                            )}%)
                        </span>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   STATUS LEGEND
========================================================= */

function renderStatusLegend(items) {

    const container =
        $("statusLegend");


    if (!container) {
        return;
    }


    const colors = [
        "#20B66F",
        "#246BFD",
        "#FF9900",
        "#7A40D8"
    ];


    if (!items.length) {

        container.innerHTML =
            `<div class="loading">
                No data available.
            </div>`;

        return;
    }


    container.innerHTML =
        items.map(
            (item, index) => {

                const color =
                    colors[
                        index %
                        colors.length
                    ];


                return `
                    <div class="legend-item">

                        <span
                            class="legend-dot"
                            style="background:${color}"
                        ></span>

                        <span class="legend-name">
                            ${escapeHtml(
                                item.status
                            )}
                        </span>

                        <span class="legend-value">
                            ${formatNumber(
                                item.count
                            )}
                            (${Number(
                                item.percentage || 0
                            )}%)
                        </span>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   RECENT REPORTS
========================================================= */

function renderRecentReports(reports) {

    const tbody =
        $("recentReportsBody");


    if (!tbody) {
        return;
    }


    if (!reports.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="loading"
                >
                    No reports found.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        reports.map(
            report => {

                const reportId =
                    Number(report.id);


                return `
                    <tr>

                        <td class="report-name-cell">

                            <span class="report-name">
                                ${escapeHtml(
                                    report.report_name
                                )}
                            </span>

                            <span class="report-id">
                                RPT-${String(
                                    reportId
                                ).padStart(6, "0")}
                            </span>

                        </td>


                        <td>
                            ${escapeHtml(
                                report.report_type
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                report.audit_assignment
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                report.prepared_by
                            )}
                        </td>


                        <td>
                            ${formatDate(
                                report.generated_at
                            )}
                        </td>


                        <td>

                            <span
                                class="status-pill ${statusClass(
                                    report.status
                                )}"
                            >
                                ${escapeHtml(
                                    report.status
                                )}
                            </span>

                        </td>


                        <td>

                            <div class="action-buttons">

                                <button
                                    type="button"
                                    class="action-button"
                                    title="View"
                                    onclick="viewReport(${reportId})"
                                >
                                    <i class="fa-regular fa-eye"></i>
                                </button>


                                <button
                                    type="button"
                                    class="action-button"
                                    title="Download"
                                    onclick="downloadReport(${reportId})"
                                >
                                    <i class="fa-solid fa-download"></i>
                                </button>


                                <button
                                    type="button"
                                    class="action-button"
                                    title="More"
                                    onclick="reportMenuAction(${reportId})"
                                >
                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
            }
        ).join("");
}


/* =========================================================
   TOP REPORTS
========================================================= */

function renderTopReports(reports) {

    const container =
        $("topReports");


    if (!container) {
        return;
    }


    if (!reports.length) {

        container.innerHTML =
            `<div class="loading">
                No reports found.
            </div>`;

        return;
    }


    container.innerHTML =
        reports.map(
            report => {

                const reportId =
                    Number(report.id);


                return `
                    <div class="top-report-item">

                        <div class="top-report-icon">

                            <i
                                class="fa-solid fa-file-lines"
                            ></i>

                        </div>


                        <div class="top-report-info">

                            <strong>
                                ${escapeHtml(
                                    report.report_name
                                )}
                            </strong>

                            <span>
                                RPT-${String(
                                    reportId
                                ).padStart(6, "0")}
                            </span>

                        </div>


                        <div class="top-report-downloads">

                            ${formatNumber(
                                report.download_count
                            )}

                            <span>
                                Downloads
                            </span>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   VIEW REPORT
========================================================= */

async function viewReport(id) {

    try {

        if (!id) {

            alert(
                "Invalid report ID."
            );

            return;
        }


        const response =
            await fetch(
                `${API}/api/admin/reports/${id}`,
                {
                    method: "GET",
                    headers: authHeaders()
                }
            );


        if (response.status === 401) {

            handleUnauthorized();

            throw new Error(
                "Unauthorized. Please login again."
            );
        }


        if (response.status === 404) {

            throw new Error(
                "Report not found."
            );
        }


        if (!response.ok) {

            const error =
                await getApiError(response);

            throw new Error(error);
        }


        const report =
            await response.json();


        alert(
            `Report: ${
                report.report_name || "—"
            }\n\n` +

            `Type: ${
                report.category ||
                report.report_type ||
                "—"
            }\n` +

            `Prepared By: ${
                report.generated_by ||
                report.prepared_by ||
                "System"
            }\n` +

            `Date: ${
                formatDate(
                    report.generated_at
                )
            }\n` +

            `Format: ${
                report.format || "—"
            }\n` +

            `Size: ${
                report.file_size || "—"
            }`
        );

    } catch (error) {

        console.error(
            "VIEW REPORT ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to open report."
        );
    }
}


/* =========================================================
   DOWNLOAD REPORT
========================================================= */

async function downloadReport(id) {

    try {

        if (!id) {

            alert(
                "Invalid report ID."
            );

            return;
        }


        const response =
            await fetch(
                `${API}/api/admin/reports/${id}/download`,
                {
                    method: "GET",
                    headers: authHeaders()
                }
            );


        if (response.status === 401) {

            handleUnauthorized();

            throw new Error(
                "Unauthorized. Please login again."
            );
        }


        if (response.status === 404) {

            throw new Error(
                "Report file not found."
            );
        }


        if (!response.ok) {

            const error =
                await getApiError(response);

            throw new Error(error);
        }


        const blob =
            await response.blob();


        const contentDisposition =
            response.headers.get(
                "Content-Disposition"
            );


        let filename =
            `RPT-${String(id).padStart(6, "0")}`;


        if (contentDisposition) {

            const match =
                contentDisposition.match(
                    /filename="?([^"]+)"?/i
                );


            if (match && match[1]) {

                filename =
                    match[1];
            }
        }


        const url =
            window.URL.createObjectURL(
                blob
            );


        const anchor =
            document.createElement("a");


        anchor.href =
            url;


        anchor.download =
            filename;


        document.body.appendChild(
            anchor
        );


        anchor.click();


        anchor.remove();


        window.URL.revokeObjectURL(
            url
        );

    } catch (error) {

        console.error(
            "DOWNLOAD ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to download report."
        );
    }
}


/* =========================================================
   MORE ACTION
========================================================= */

function reportMenuAction(id) {

    const action =
        confirm(
            "Download this report?"
        );


    if (action) {

        downloadReport(id);
    }
}


/* =========================================================
   GENERATE REPORT
========================================================= */

function generateReport(type) {

    if (!type) {

        alert(
            "Invalid report type."
        );

        return;
    }


    const format =
        prompt(
            "Enter format: PDF, EXCEL or CSV",
            "PDF"
        );


    if (!format) {
        return;
    }


    const normalized =
        format
            .trim()
            .toUpperCase();


    let endpoint = "";


    /* =====================================================
       PDF
    ===================================================== */

    if (normalized === "PDF") {

        endpoint =
            `${API}/api/admin/reports/export/pdf/${encodeURIComponent(type)}`;
    }


    /* =====================================================
       EXCEL
    ===================================================== */

    else if (
        normalized === "EXCEL" ||
        normalized === "XLSX"
    ) {

        endpoint =
            `${API}/api/admin/reports/export/excel/${encodeURIComponent(type)}`;
    }


    /* =====================================================
       CSV
    ===================================================== */

    else if (normalized === "CSV") {

        endpoint =
            `${API}/api/admin/reports/export/csv/${encodeURIComponent(type)}`;
    }


    else {

        alert(
            "Please enter PDF, EXCEL or CSV."
        );

        return;
    }


    /*
       IMPORTANT:

       window.location.href does not automatically
       attach your Authorization Bearer token.

       Therefore use fetch() for protected exports.
    */

    downloadExport(
        endpoint,
        normalized,
        type
    );
}


/* =========================================================
   DOWNLOAD EXPORT
========================================================= */

async function downloadExport(
    endpoint,
    format,
    type
) {

    try {

        const response =
            await fetch(
                endpoint,
                {
                    method: "GET",
                    headers: authHeaders()
                }
            );


        if (response.status === 401) {

            handleUnauthorized();

            throw new Error(
                "Unauthorized. Please login again."
            );
        }


        if (!response.ok) {

            const error =
                await getApiError(response);

            throw new Error(error);
        }


        const blob =
            await response.blob();


        let extension =
            "pdf";


        if (
            format === "EXCEL" ||
            format === "XLSX"
        ) {

            extension =
                "xlsx";
        }


        if (format === "CSV") {

            extension =
                "csv";
        }


        const filename =
            `${String(type)
                .replace(/\s+/g, "_")
                .toLowerCase()}_report.${extension}`;


        const url =
            window.URL.createObjectURL(
                blob
            );


        const anchor =
            document.createElement("a");


        anchor.href =
            url;


        anchor.download =
            filename;


        document.body.appendChild(
            anchor
        );


        anchor.click();


        anchor.remove();


        window.URL.revokeObjectURL(
            url
        );

    } catch (error) {

        console.error(
            "EXPORT ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to generate report."
        );
    }
}


/* =========================================================
   SEARCH TIMER
========================================================= */

let reportSearchTimer = null;

let localReportSearchTimer = null;


/* =========================================================
   SETUP EVENTS
========================================================= */

function setupEvents() {


    /* =====================================================
       GLOBAL SEARCH
    ===================================================== */

    const globalSearch =
        $("globalSearch");


    if (globalSearch) {

        globalSearch.addEventListener(
            "input",
            function() {

                const reportSearch =
                    $("reportSearch");


                if (reportSearch) {

                    reportSearch.value =
                        this.value;
                }


                clearTimeout(
                    reportSearchTimer
                );


                reportSearchTimer =
                    setTimeout(
                        loadReports,
                        350
                    );
            }
        );
    }


    /* =====================================================
       LOCAL REPORT SEARCH
    ===================================================== */

    const reportSearch =
        $("reportSearch");


    if (reportSearch) {

        reportSearch.addEventListener(
            "input",
            function() {

                clearTimeout(
                    localReportSearchTimer
                );


                localReportSearchTimer =
                    setTimeout(
                        loadReports,
                        350
                    );
            }
        );
    }


    /* =====================================================
       FILTER BUTTON
    ===================================================== */

    const filterButton =
        $("filterButton");


    if (filterButton) {

        filterButton.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();


                const panel =
                    $("filterPanel");


                if (panel) {

                    panel.classList.toggle(
                        "hidden"
                    );
                }
            }
        );
    }


    /* =====================================================
       APPLY FILTERS
    ===================================================== */

    const applyFilters =
        $("applyFilters");


    if (applyFilters) {

        applyFilters.addEventListener(
            "click",
            function() {

                loadReports();
            }
        );
    }


    /* =====================================================
       REPORT TYPE
    ===================================================== */

    const reportTypeFilter =
        $("reportTypeFilter");


    if (reportTypeFilter) {

        reportTypeFilter.addEventListener(
            "change",
            loadReports
        );
    }


    /* =====================================================
       AUDIT
    ===================================================== */

    const auditFilter =
        $("auditFilter");


    if (auditFilter) {

        auditFilter.addEventListener(
            "change",
            loadReports
        );
    }


    /* =====================================================
       PREPARED BY
    ===================================================== */

    const preparedByFilter =
        $("preparedByFilter");


    if (preparedByFilter) {

        preparedByFilter.addEventListener(
            "change",
            loadReports
        );
    }


    /* =====================================================
       TREND RANGE
    ===================================================== */

    const trendRange =
        $("trendRange");


    if (trendRange) {

        trendRange.addEventListener(
            "change",
            loadReports
        );
    }


    /* =====================================================
       NEW REPORT BUTTON
    ===================================================== */

    const newReportButton =
        $("newReportButton");


    const reportMenu =
        $("reportMenu");


    if (
        newReportButton &&
        reportMenu
    ) {

        newReportButton.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();


                reportMenu.classList.toggle(
                    "hidden"
                );
            }
        );
    }


    /* =====================================================
       REPORT MENU ITEMS
    ===================================================== */

    document
        .querySelectorAll(
            "[data-report]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function(event) {

                    event.stopPropagation();


                    const type =
                        this.dataset.report;


                    if (reportMenu) {

                        reportMenu.classList.add(
                            "hidden"
                        );
                    }


                    generateReport(
                        type
                    );
                }
            );
        });


    /* =====================================================
       CLOSE REPORT MENU
    ===================================================== */

    document.addEventListener(
        "click",
        function() {

            if (reportMenu) {

                reportMenu.classList.add(
                    "hidden"
                );
            }
        }
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeReports() {

    console.log(
        "Initializing Auditor Reports..."
    );


    /* =====================================================
       CHECK TOKEN
    ===================================================== */

    const token =
        getToken();


    if (!token) {

        console.warn(
            "No authentication token found in localStorage/sessionStorage."
        );
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    setupEvents();


    /* =====================================================
       CURRENT USER
    ===================================================== */

    await loadCurrentUser();


    /* =====================================================
       FILTER OPTIONS
    ===================================================== */

    await loadFilterOptions();


    /* =====================================================
       REPORT DATA
    ===================================================== */

    await loadReports();


    console.log(
        "Auditor Reports initialized."
    );
}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeReports
);