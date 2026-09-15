"use strict";

/* ============================================================
   CONFIGURATION
============================================================ */

const API_BASE = "http://127.0.0.1:8000";


/* ============================================================
   STATE
============================================================ */

const state = {
    reports: [],
    recent: [],
    scheduled: [],

    page: 1,
    limit: 8,

    search: "",

    selectedFormat: "PDF",

    editingScheduleId: null,

    vendorId: null,
    vendorProfile: null
};


/* ============================================================
   HELPER
============================================================ */

function $(id) {
    return document.getElementById(id);
}


/* ============================================================
   GET TOKEN
============================================================ */

function getToken() {
    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        null
    );
}


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(endpoint, options = {}) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    if (!response.ok) {

        let message = `HTTP ${response.status}`;

        try {
            const errorData = await response.json();

            if (errorData?.detail) {
                message = errorData.detail;
            } else if (errorData?.message) {
                message = errorData.message;
            }

        } catch (_) {
            // Response was not JSON
        }

        throw new Error(message);
    }

    return response;
}


/* ============================================================
   TOAST
============================================================ */

function showToast(message, isError = false) {

    const toast = $("toast");

    if (!toast) {
        console.log(message);
        return;
    }

    toast.textContent = message;

    toast.classList.remove("show", "error");

    if (isError) {
        toast.classList.add("error");
    }

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show", "error");
    }, 3500);
}


/* ============================================================
   CATEGORY LABEL
============================================================ */

function categoryLabel(value) {

    if (!value) {
        return "Report";
    }

    const labels = {
        "vendor-performance": "Vendor Performance",
        "vendor_performance": "Vendor Performance",

        "procurement": "Procurement",

        "purchase-orders": "Purchase Orders",
        "purchase_orders": "Purchase Orders",

        "compliance": "Compliance",

        "contracts": "Contracts",

        "custom": "Custom"
    };

    return (
        labels[value] ||
        String(value)
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, char => char.toUpperCase())
    );
}


/* ============================================================
   REPORT DESCRIPTION
============================================================ */

function reportDescription(category) {

    const descriptions = {
        "vendor-performance":
            "Overall vendor performance score and KPIs",

        "vendor_performance":
            "Overall vendor performance score and KPIs",

        "procurement":
            "Procurement summary, status and trends",

        "purchase-orders":
            "Purchase orders summary, status and trends",

        "purchase_orders":
            "Purchase orders summary, status and trends",

        "compliance":
            "Compliance status, documents and expiries",

        "contracts":
            "Contract details, values and expiry overview"
    };

    return descriptions[category] || "Generated report";
}


/* ============================================================
   DATE FORMAT
============================================================ */

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


function formatDateTime(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* ============================================================
   FILE SIZE
============================================================ */

function parseFileSize(value) {

    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value === "number") {
        return value;
    }

    const text = String(value).trim().toUpperCase();

    const match = text.match(
        /([\d.]+)\s*(B|KB|MB|GB|TB)?/
    );

    if (!match) {
        return 0;
    }

    const number = Number(match[1]);

    const unit = match[2] || "B";

    const multipliers = {
        B: 1,
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024,
        TB: 1024 * 1024 * 1024 * 1024
    };

    return number * (multipliers[unit] || 1);
}


function formatBytes(bytes) {

    if (!bytes || bytes <= 0) {
        return "0 MB";
    }

    const mb = bytes / (1024 * 1024);

    if (mb < 1) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (mb < 1024) {
        return `${mb.toFixed(2)} MB`;
    }

    return `${(mb / 1024).toFixed(2)} GB`;
}


/* ============================================================
   INITIALIZE DATES
============================================================ */

function initializeDates() {

    const today = new Date();

    const firstDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    const todayString =
        today.toISOString().split("T")[0];

    const firstDayString =
        firstDay.toISOString().split("T")[0];

    if ($("fromDate")) {
        $("fromDate").value = firstDayString;
    }

    if ($("toDate")) {
        $("toDate").value = todayString;
    }

    if ($("exportFromDate")) {
        $("exportFromDate").value = firstDayString;
    }

    if ($("exportToDate")) {
        $("exportToDate").value = todayString;
    }
}


/* ============================================================
   SYNC DATE FILTERS
============================================================ */

function setupDateSync() {

    const fromDate = $("fromDate");
    const toDate = $("toDate");

    const exportFromDate = $("exportFromDate");
    const exportToDate = $("exportToDate");


    if (fromDate && exportFromDate) {

        fromDate.addEventListener(
            "change",
            () => {
                exportFromDate.value = fromDate.value;
            }
        );
    }


    if (toDate && exportToDate) {

        toDate.addEventListener(
            "change",
            () => {
                exportToDate.value = toDate.value;
            }
        );
    }


    if (exportFromDate && fromDate) {

        exportFromDate.addEventListener(
            "change",
            () => {
                fromDate.value = exportFromDate.value;
            }
        );
    }


    if (exportToDate && toDate) {

        exportToDate.addEventListener(
            "change",
            () => {
                toDate.value = exportToDate.value;
            }
        );
    }
}


/* ============================================================
   LOAD VENDOR PROFILE
============================================================ */

async function loadCurrentUser() {

    try {

        /*
         * IMPORTANT:
         *
         * Your backend route is:
         *
         * GET /api/vendor/profile/{vendor_id}
         *
         * Therefore we need the real vendor ID.
         */

        const vendorId =
            localStorage.getItem("vendor_id") ||
            localStorage.getItem("vendorId") ||
            sessionStorage.getItem("vendor_id") ||
            sessionStorage.getItem("vendorId");


        if (!vendorId) {

            console.warn(
                "Vendor ID was not found in browser storage."
            );

            if ($("sidebarVendorName")) {
                $("sidebarVendorName").textContent = "Vendor";
            }

            if ($("sidebarVendorRole")) {
                $("sidebarVendorRole").textContent =
                    "Vendor ID: ----";
            }

            return;
        }


        state.vendorId = vendorId;


        const response = await apiFetch(
            `/api/vendor/profile/${encodeURIComponent(vendorId)}`
        );


        const vendor = await response.json();


        state.vendorProfile = vendor;


        const vendorName =
            vendor.vendor_name ||
            vendor.company_name ||
            "Vendor";


        const actualVendorId =
            vendor.vendor_id ||
            vendorId;


        if ($("headerVendorName")) {
            $("headerVendorName").textContent =
                vendorName;
        }


        if ($("sidebarVendorName")) {
            $("sidebarVendorName").textContent =
                vendorName;
        }


        if ($("sidebarVendorRole")) {
            $("sidebarVendorRole").textContent =
                `Vendor ID: ${actualVendorId}`;
        }


        console.log(
            "Vendor profile loaded:",
            vendor
        );

    } catch (error) {

        console.error(
            "Vendor profile loading error:",
            error
        );

        if ($("sidebarVendorName")) {
            $("sidebarVendorName").textContent =
                "Vendor";
        }

        showToast(
            "Unable to load vendor profile.",
            true
        );
    }
}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadDashboard() {

    try {

        const response = await apiFetch(
            "/api/admin/reports/dashboard"
        );

        const data = await response.json();


        if ($("reportsGenerated")) {

            $("reportsGenerated").textContent =
                data.generated_this_month ?? 0;
        }


        if ($("reportsDownloaded")) {

            $("reportsDownloaded").textContent =
                data.total_downloads ?? 0;
        }


        if ($("scheduledReports")) {

            $("scheduledReports").textContent =
                data.scheduled_reports ?? 0;
        }


        /*
         * Backend returns:
         *
         * total_reports
         * generated_this_month
         * total_downloads
         * scheduled_reports
         *
         * It does not return generatedGrowth/downloadGrowth.
         *
         * Therefore we leave those UI values at 0%.
         */

        if ($("generatedGrowth")) {

            $("generatedGrowth").innerHTML =
                `<i class="fa-solid fa-arrow-trend-up"></i> 0%`;
        }


        if ($("downloadGrowth")) {

            $("downloadGrowth").innerHTML =
                `<i class="fa-solid fa-arrow-trend-up"></i> 0%`;
        }


        return data;

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        showToast(
            "Unable to load report dashboard.",
            true
        );
    }
}


/* ============================================================
   LOAD CATEGORIES
============================================================ */

async function loadCategories() {

    try {

        const response = await apiFetch(
            "/api/admin/reports/categories"
        );

        const categories = await response.json();


        const select = $("categoryFilter");

        if (!select) {
            return;
        }


        select.innerHTML =
            `<option value="All">All Report Categories</option>`;


        Object.entries(categories).forEach(
            ([key, value]) => {

                /*
                 * Do not show empty/custom categories.
                 */

                if (
                    key === "custom" ||
                    Number(value) === 0
                ) {
                    return;
                }


                const option =
                    document.createElement("option");


                option.value = key;

                option.textContent =
                    `${categoryLabel(key)} (${value})`;


                select.appendChild(option);
            }
        );

    } catch (error) {

        console.error(
            "Category loading error:",
            error
        );
    }
}


/* ============================================================
   LOAD RECENT REPORTS
============================================================ */

async function loadRecentReports() {

    try {

        /*
         * Backend allows maximum limit = 100.
         */

        const response = await apiFetch(
            "/api/admin/reports/recent?limit=100"
        );


        const data = await response.json();


        state.recent =
            Array.isArray(data)
                ? data
                : [];


        state.reports =
            [...state.recent];


        state.page = 1;


        renderReports();

        renderRecentExports();

        updateDataExports();


    } catch (error) {

        console.error(
            "Recent reports loading error:",
            error
        );


        const table =
            $("reportsTable");


        if (table) {

            table.innerHTML = `
                <tr>
                    <td colspan="7" class="empty">
                        Unable to load reports.
                    </td>
                </tr>
            `;
        }


        const recent =
            $("recentExports");


        if (recent) {

            recent.innerHTML = `
                <div class="empty">
                    Unable to load recent exports.
                </div>
            `;
        }
    }
}


/* ============================================================
   UPDATE DATA EXPORTS
============================================================ */

function updateDataExports() {

    const element =
        $("dataExports");


    if (!element) {
        return;
    }


    const now = new Date();


    const totalBytes =
        state.recent.reduce(
            (total, report) => {

                if (!report.generated_at) {
                    return total;
                }


                const generatedDate =
                    new Date(report.generated_at);


                if (
                    generatedDate.getMonth() !==
                        now.getMonth() ||
                    generatedDate.getFullYear() !==
                        now.getFullYear()
                ) {
                    return total;
                }


                return (
                    total +
                    parseFileSize(report.file_size)
                );
            },
            0
        );


    element.textContent =
        formatBytes(totalBytes);
}


/* ============================================================
   FILTER REPORTS
============================================================ */

function getFilteredReports() {

    const category =
        $("categoryFilter")?.value || "All";


    const type =
        $("typeFilter")?.value || "All";


    const format =
        $("formatFilter")?.value || "All";


    const fromDate =
        $("fromDate")?.value || "";


    const toDate =
        $("toDate")?.value || "";


    const search =
        String(state.search || "")
            .trim()
            .toLowerCase();


    return state.reports.filter(
        report => {

            const reportCategory =
                String(
                    report.category || ""
                ).toLowerCase();


            const reportName =
                String(
                    report.report_name || ""
                ).toLowerCase();


            const reportFormat =
                String(
                    report.format || ""
                ).toUpperCase();


            const generatedBy =
                String(
                    report.generated_by || ""
                ).toLowerCase();


            /*
             * Search
             */

            if (search) {

                const searchable =
                    `${reportName} ${reportCategory} ${generatedBy}`
                        .toLowerCase();


                if (!searchable.includes(search)) {
                    return false;
                }
            }


            /*
             * Category filter
             */

            if (
                category !== "All" &&
                reportCategory !==
                    category.toLowerCase()
            ) {
                return false;
            }


            /*
             * Report type filter
             */

            if (
                type !== "All" &&
                reportCategory !==
                    type.toLowerCase()
            ) {
                return false;
            }


            /*
             * Format filter
             */

            if (
                format !== "All" &&
                reportFormat !== format.toUpperCase()
            ) {
                return false;
            }


            /*
             * Date filters
             */

            if (
                report.generated_at &&
                (fromDate || toDate)
            ) {

                const reportDate =
                    new Date(report.generated_at);


                if (fromDate) {

                    const from =
                        new Date(`${fromDate}T00:00:00`);

                    if (reportDate < from) {
                        return false;
                    }
                }


                if (toDate) {

                    const to =
                        new Date(`${toDate}T23:59:59`);

                    if (reportDate > to) {
                        return false;
                    }
                }
            }


            return true;
        }
    );
}


/* ============================================================
   RENDER REPORTS
============================================================ */

function renderReports() {

    const table =
        $("reportsTable");


    if (!table) {
        return;
    }


    const filtered =
        getFilteredReports();


    const total =
        filtered.length;


    const start =
        (state.page - 1) *
        state.limit;


    const end =
        start +
        state.limit;


    const pageItems =
        filtered.slice(start, end);


    table.innerHTML = "";


    if (!pageItems.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    No reports found.
                </td>
            </tr>
        `;


        updatePagination(
            0,
            0,
            0
        );

        return;
    }


    pageItems.forEach(
        report => {

            const row =
                document.createElement("tr");


            const category =
                report.category || "";


            const format =
                String(
                    report.format || "-"
                ).toUpperCase();


            const description =
                report.description ||
                reportDescription(category);


            const generatedDate =
                formatDate(report.generated_at);


            const fileSize =
                report.file_size || "-";


            row.innerHTML = `
                <td>
                    <strong>
                        ${escapeHtml(
                            report.report_name ||
                            categoryLabel(category)
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        categoryLabel(category)
                    )}
                </td>

                <td>
                    ${escapeHtml(description)}
                </td>

                <td>
                    ${escapeHtml(generatedDate)}
                </td>

                <td>
                    <span class="format-badge">
                        ${escapeHtml(format)}
                    </span>
                </td>

                <td>
                    ${escapeHtml(fileSize)}
                </td>

                <td>
                    <div class="table-actions">

                        <button
                            type="button"
                            class="action-button"
                            title="View Report"
                            onclick="viewReport(${Number(report.id)})"
                        >
                            <i class="fa-regular fa-eye"></i>
                        </button>

                        <button
                            type="button"
                            class="action-button"
                            title="Download Report"
                            onclick="downloadReport(${Number(report.id)})"
                        >
                            <i class="fa-solid fa-download"></i>
                        </button>

                    </div>
                </td>
            `;


            table.appendChild(row);
        }
    );


    const first =
        total === 0
            ? 0
            : start + 1;


    const last =
        Math.min(end, total);


    updatePagination(
        total,
        first,
        last
    );
}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   PAGINATION
============================================================ */

function updatePagination(
    total,
    first,
    last
) {

    const text =
        $("paginationText");


    if (text) {

        if (total === 0) {

            text.textContent =
                "Showing 0 reports";

        } else {

            text.textContent =
                `Showing ${first}-${last} of ${total} reports`;
        }
    }


    const pagination =
        $("pagination");


    if (!pagination) {
        return;
    }


    pagination.innerHTML = "";


    const totalPages =
        Math.ceil(
            total / state.limit
        );


    if (totalPages <= 1) {
        return;
    }


    /*
     * Previous
     */

    const previous =
        document.createElement("button");


    previous.innerHTML =
        `<i class="fa-solid fa-chevron-left"></i>`;


    previous.disabled =
        state.page === 1;


    previous.addEventListener(
        "click",
        () => {

            if (state.page > 1) {

                state.page--;

                renderReports();
            }
        }
    );


    pagination.appendChild(previous);


    /*
     * Page buttons
     */

    const maxVisible =
        7;


    let startPage =
        Math.max(
            1,
            state.page - 3
        );


    let endPage =
        Math.min(
            totalPages,
            startPage + maxVisible - 1
        );


    if (
        endPage - startPage <
        maxVisible - 1
    ) {

        startPage =
            Math.max(
                1,
                endPage - maxVisible + 1
            );
    }


    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

        const button =
            document.createElement("button");


        button.textContent =
            page;


        if (page === state.page) {
            button.classList.add("active");
        }


        button.addEventListener(
            "click",
            () => {

                state.page = page;

                renderReports();
            }
        );


        pagination.appendChild(button);
    }


    /*
     * Next
     */

    const next =
        document.createElement("button");


    next.innerHTML =
        `<i class="fa-solid fa-chevron-right"></i>`;


    next.disabled =
        state.page === totalPages;


    next.addEventListener(
        "click",
        () => {

            if (
                state.page <
                totalPages
            ) {

                state.page++;

                renderReports();
            }
        }
    );


    pagination.appendChild(next);
}


/* ============================================================
   RENDER RECENT EXPORTS
============================================================ */

function renderRecentExports() {

    const container =
        $("recentExports");


    if (!container) {
        return;
    }


    const reports =
        state.recent.slice(0, 5);


    container.innerHTML = "";


    if (!reports.length) {

        container.innerHTML = `
            <div class="empty">
                No recent exports.
            </div>
        `;

        return;
    }


    reports.forEach(
        report => {

            const item =
                document.createElement("div");


            item.className =
                "recent-item";


            const format =
                String(
                    report.format || "FILE"
                ).toUpperCase();


            item.innerHTML = `
                <div class="recent-icon">
                    <i class="fa-solid fa-file"></i>
                </div>

                <div class="recent-info">

                    <strong>
                        ${escapeHtml(
                            report.report_name ||
                            "Report"
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(format)}
                        •
                        ${escapeHtml(
                            formatDateTime(
                                report.generated_at
                            )
                        )}
                    </small>

                </div>

                <button
                    type="button"
                    class="recent-download"
                    title="Download"
                    onclick="downloadReport(${Number(report.id)})"
                >
                    <i class="fa-solid fa-download"></i>
                </button>
            `;


            container.appendChild(item);
        }
    );
}


/* ============================================================
   LOAD SCHEDULED REPORTS
============================================================ */

async function loadScheduledReports() {

    try {

        const response =
            await apiFetch(
                "/api/admin/reports/scheduled"
            );


        const data =
            await response.json();


        state.scheduled =
            Array.isArray(data)
                ? data
                : [];


        renderScheduledReports();


    } catch (error) {

        console.error(
            "Scheduled reports loading error:",
            error
        );


        const table =
            $("scheduledTable");


        if (table) {

            table.innerHTML = `
                <tr>
                    <td colspan="7" class="empty">
                        Unable to load schedules.
                    </td>
                </tr>
            `;
        }
    }
}


/* ============================================================
   RENDER SCHEDULED REPORTS
============================================================ */

function renderScheduledReports() {

    const table =
        $("scheduledTable");


    if (!table) {
        return;
    }


    table.innerHTML = "";


    if (!state.scheduled.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    No scheduled reports found.
                </td>
            </tr>
        `;

        return;
    }


    state.scheduled.forEach(
        schedule => {

            const row =
                document.createElement("tr");


            const status =
                schedule.status ||
                (
                    schedule.is_active
                        ? "Active"
                        : "Inactive"
                );


            const statusClass =
                String(status)
                    .toLowerCase()
                    .replace(/\s+/g, "-");


            row.innerHTML = `
                <td>
                    <strong>
                        ${escapeHtml(
                            schedule.report_name ||
                            "Report"
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        schedule.schedule || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatDateTime(
                            schedule.next_run
                        )
                    )}
                </td>

                <td>
                    ${
                        schedule.recipients
                            ? `<i class="fa-regular fa-envelope"></i> Email`
                            : `<i class="fa-solid fa-download"></i> Download`
                    }
                </td>

                <td>
                    ${escapeHtml(
                        schedule.recipients || "-"
                    )}
                </td>

                <td>
                    <span class="status ${statusClass}">
                        ${escapeHtml(status)}
                    </span>
                </td>

                <td>
                    <div class="table-actions">

                        <button
                            type="button"
                            class="action-button"
                            title="Edit"
                            onclick="editSchedule(${Number(schedule.id)})"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            type="button"
                            class="action-button danger"
                            title="Delete"
                            onclick="deleteSchedule(${Number(schedule.id)})"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>
                </td>
            `;


            table.appendChild(row);
        }
    );
}


/* ============================================================
   FORMAT BUTTONS
============================================================ */

function setupFormatButtons() {

    document
        .querySelectorAll(".format")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".format")
                        .forEach(item => {

                            item.classList.remove(
                                "active"
                            );
                        });


                    button.classList.add(
                        "active"
                    );


                    state.selectedFormat =
                        String(
                            button.dataset.format ||
                            "PDF"
                        ).toUpperCase();


                    /*
                     * Keep schedule format in sync.
                     *
                     * HTML only supports:
                     * PDF
                     * EXCEL
                     * CSV
                     */

                    const scheduleFormat =
                        $("scheduleFormat");


                    if (scheduleFormat) {

                        if (
                            state.selectedFormat ===
                            "XLSX"
                        ) {

                            scheduleFormat.value =
                                "EXCEL";

                        } else {

                            scheduleFormat.value =
                                state.selectedFormat;
                        }
                    }
                }
            );
        });
}


/* ============================================================
   GENERATE REPORT
============================================================ */

async function generateReport() {

    const reportType =
        $("exportCategory")?.value;


    const from =
        $("exportFromDate")?.value;


    const to =
        $("exportToDate")?.value;


    const format =
        String(
            state.selectedFormat || "PDF"
        ).toUpperCase();


    const delivery =
        document.querySelector(
            'input[name="delivery"]:checked'
        )?.value || "download";


    if (!reportType) {

        showToast(
            "Please select a report category.",
            true
        );

        return;
    }


    if (!from || !to) {

        showToast(
            "Please select a data range.",
            true
        );

        return;
    }


    if (from > to) {

        showToast(
            "Start date cannot be after end date.",
            true
        );

        return;
    }


    /*
     * Email delivery is not currently implemented
     * by the routers.py export endpoints.
     */

    if (delivery === "email") {

        showToast(
            "Email report delivery is not available yet.",
            true
        );

        return;
    }


    /*
     * Schedule selected
     */

    if (delivery === "schedule") {

        openScheduleModal(
            reportType
        );

        return;
    }


    /*
     * Correct backend endpoint mapping
     */

    let endpointFormat;


    if (format === "PDF") {

        endpointFormat = "pdf";

    } else if (
        format === "EXCEL" ||
        format === "XLSX"
    ) {

        endpointFormat = "excel";

    } else if (
        format === "CSV"
    ) {

        endpointFormat = "csv";

    } else {

        showToast(
            "Unsupported report format.",
            true
        );

        return;
    }


    const button =
        $("generateReportBtn");


    if (!button) {
        return;
    }


    const oldText =
        button.innerHTML;


    button.disabled = true;


    button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Generating...
    `;


    try {

        /*
         * Your CSV backend accepts from_date/to_date.
         *
         * PDF and Excel currently do not declare these
         * query parameters, so the backend ignores them.
         *
         * Sending them is safe.
         */

        const query =
            new URLSearchParams();


        query.set(
            "from_date",
            from
        );


        query.set(
            "to_date",
            to
        );


        const url =
            `/api/admin/reports/export/` +
            `${endpointFormat}/` +
            `${encodeURIComponent(reportType)}` +
            `?${query.toString()}`;


        const response =
            await apiFetch(url);


        const blob =
            await response.blob();


        const downloadUrl =
            URL.createObjectURL(blob);


        const anchor =
            document.createElement("a");


        anchor.href =
            downloadUrl;


        /*
         * Determine extension
         */

        let extension;


        if (format === "PDF") {

            extension = "pdf";

        } else if (format === "CSV") {

            extension = "csv";

        } else {

            extension = "xlsx";
        }


        let filename =
            `${reportType}.${extension}`;


        /*
         * Read Content-Disposition
         */

        const disposition =
            response.headers.get(
                "Content-Disposition"
            );


        if (disposition) {

            const match =
                disposition.match(
                    /filename="?([^"]+)"?/i
                );


            if (
                match &&
                match[1]
            ) {

                filename =
                    match[1];
            }
        }


        anchor.download =
            filename;


        document.body.appendChild(
            anchor
        );


        anchor.click();


        anchor.remove();


        URL.revokeObjectURL(
            downloadUrl
        );


        showToast(
            "Report generated successfully."
        );


        /*
         * Refresh dashboard/recent reports
         */

        await loadDashboard();

        await loadRecentReports();


    } catch (error) {

        console.error(
            "Report generation error:",
            error
        );


        showToast(
            error.message ||
            "Unable to generate report.",
            true
        );


    } finally {

        button.disabled =
            false;


        button.innerHTML =
            oldText;
    }
}


/* ============================================================
   VIEW REPORT
============================================================ */

async function viewReport(reportId) {

    try {

        const response =
            await apiFetch(
                `/api/admin/reports/${Number(reportId)}`
            );


        const report =
            await response.json();


        /*
         * If a modal exists, use it.
         * Otherwise show the report information.
         */

        console.log(
            "Report details:",
            report
        );


        let message =
            `Report: ${report.report_name || "-"}`;


        if (report.category) {

            message +=
                `\nCategory: ${categoryLabel(report.category)}`;
        }


        if (report.format) {

            message +=
                `\nFormat: ${report.format}`;
        }


        if (report.generated_at) {

            message +=
                `\nGenerated: ${formatDateTime(report.generated_at)}`;
        }


        alert(message);


    } catch (error) {

        console.error(
            "View report error:",
            error
        );


        showToast(
            error.message ||
            "Unable to open report.",
            true
        );
    }
}


/* ============================================================
   DOWNLOAD REPORT
============================================================ */

async function downloadReport(reportId) {

    try {

        const response =
            await apiFetch(
                `/api/admin/reports/${Number(reportId)}/download`
            );


        const blob =
            await response.blob();


        const url =
            URL.createObjectURL(blob);


        const anchor =
            document.createElement("a");


        anchor.href =
            url;


        let filename =
            `report-${reportId}`;


        const disposition =
            response.headers.get(
                "Content-Disposition"
            );


        if (disposition) {

            const match =
                disposition.match(
                    /filename="?([^"]+)"?/i
                );


            if (
                match &&
                match[1]
            ) {

                filename =
                    match[1];
            }
        }


        anchor.download =
            filename;


        document.body.appendChild(
            anchor
        );


        anchor.click();


        anchor.remove();


        URL.revokeObjectURL(
            url
        );


        showToast(
            "Report downloaded successfully."
        );


        /*
         * Backend increments download_count.
         */

        await loadDashboard();

        await loadRecentReports();


    } catch (error) {

        console.error(
            "Download report error:",
            error
        );


        showToast(
            error.message ||
            "Unable to download report.",
            true
        );
    }
}


/* ============================================================
   SEARCH
============================================================ */

function setupSearch() {

    const reportSearch =
        $("reportSearch");


    const globalSearch =
        $("globalSearch");


    const categoryFilter =
        $("categoryFilter");


    const typeFilter =
        $("typeFilter");


    const formatFilter =
        $("formatFilter");


    if (reportSearch) {

        reportSearch.addEventListener(
            "input",
            event => {

                state.search =
                    event.target.value;


                state.page = 1;


                renderReports();
            }
        );
    }


    if (globalSearch) {

        globalSearch.addEventListener(
            "input",
            event => {

                state.search =
                    event.target.value;


                if (reportSearch) {

                    reportSearch.value =
                        event.target.value;
                }


                state.page = 1;


                renderReports();
            }
        );
    }


    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            () => {

                state.page = 1;

                renderReports();
            }
        );
    }


    if (typeFilter) {

        typeFilter.addEventListener(
            "change",
            () => {

                state.page = 1;

                renderReports();
            }
        );
    }


    if (formatFilter) {

        formatFilter.addEventListener(
            "change",
            () => {

                state.page = 1;

                renderReports();
            }
        );
    }
}


/* ============================================================
   OPEN SCHEDULE MODAL
============================================================ */

function openScheduleModal(
    reportType = null
) {

    const modal =
        $("scheduleModal");


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "hidden"
    );


    /*
     * When creating a new schedule,
     * populate the report name.
     */

    if (
        reportType &&
        !state.editingScheduleId
    ) {

        const reportName =
            categoryLabel(
                reportType
            );


        if ($("scheduleReportName")) {

            $("scheduleReportName").value =
                `${reportName} Report`;
        }


        if ($("scheduleFormat")) {

            $("scheduleFormat").value =
                state.selectedFormat === "XLSX"
                    ? "EXCEL"
                    : state.selectedFormat;
        }
    }
}


/* ============================================================
   CLOSE SCHEDULE MODAL
============================================================ */

function closeScheduleModal() {

    const modal =
        $("scheduleModal");


    if (!modal) {
        return;
    }


    modal.classList.add(
        "hidden"
    );


    state.editingScheduleId =
        null;
}


/* ============================================================
   SETUP SCHEDULE MODAL
============================================================ */

function setupScheduleModal() {

    const createButton =
        $("createScheduleBtn");


    const closeButton =
        $("closeScheduleModal");


    const cancelButton =
        $("cancelSchedule");


    const form =
        $("scheduleForm");


    if (createButton) {

        createButton.addEventListener(
            "click",
            () => {

                state.editingScheduleId =
                    null;


                if (form) {
                    form.reset();
                }


                /*
                 * Default format should be the
                 * currently selected export format.
                 */

                if ($("scheduleFormat")) {

                    $("scheduleFormat").value =
                        state.selectedFormat === "XLSX"
                            ? "EXCEL"
                            : state.selectedFormat;
                }


                openScheduleModal();
            }
        );
    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeScheduleModal
        );
    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeScheduleModal
        );
    }


    /*
     * Only ONE submit listener.
     *
     * It handles both create and update.
     */

    if (form) {

        form.addEventListener(
            "submit",
            handleScheduleSubmit
        );
    }
}


/* ============================================================
   HANDLE SCHEDULE SUBMIT
============================================================ */

async function handleScheduleSubmit(
    event
) {

    event.preventDefault();


    if (state.editingScheduleId) {

        await updateSchedule(
            state.editingScheduleId
        );

    } else {

        await createSchedule();
    }
}


/* ============================================================
   CREATE SCHEDULE
============================================================ */

async function createSchedule() {

    const reportName =
        $("scheduleReportName")
            ?.value
            .trim();


    const frequency =
        $("scheduleFrequency")
            ?.value;


    const nextRun =
        $("scheduleNextRun")
            ?.value;


    const recipients =
        $("scheduleRecipients")
            ?.value
            .trim();


    const format =
        $("scheduleFormat")
            ?.value ||
        "PDF";


    if (!reportName) {

        showToast(
            "Report name is required.",
            true
        );

        return;
    }


    if (!nextRun) {

        showToast(
            "Please select the next run date and time.",
            true
        );

        return;
    }


    const nextRunDate =
        new Date(nextRun);


    if (
        Number.isNaN(
            nextRunDate.getTime()
        )
    ) {

        showToast(
            "Invalid next run date.",
            true
        );

        return;
    }


    const payload = {

        report_name:
            reportName,

        schedule:
            frequency,

        next_run:
            nextRunDate.toISOString(),

        recipients:
            recipients || null,

        format:
            format,

        status:
            "Active",

        is_active:
            true
    };


    try {

        await apiFetch(
            "/api/admin/reports/scheduled",
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


        closeScheduleModal();


        $("scheduleForm")?.reset();


        showToast(
            "Report schedule created successfully."
        );


        await loadScheduledReports();

        await loadDashboard();


    } catch (error) {

        console.error(
            "Create schedule error:",
            error
        );


        showToast(
            error.message ||
            "Unable to create schedule.",
            true
        );
    }
}


/* ============================================================
   EDIT SCHEDULE
============================================================ */

async function editSchedule(
    id
) {

    const schedule =
        state.scheduled.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!schedule) {

        showToast(
            "Scheduled report not found.",
            true
        );

        return;
    }


    state.editingScheduleId =
        Number(id);


    if ($("scheduleReportName")) {

        $("scheduleReportName").value =
            schedule.report_name || "";
    }


    if ($("scheduleFrequency")) {

        $("scheduleFrequency").value =
            schedule.schedule ||
            "Monthly";
    }


    if ($("scheduleRecipients")) {

        $("scheduleRecipients").value =
            schedule.recipients || "";
    }


    if ($("scheduleFormat")) {

        $("scheduleFormat").value =
            schedule.format || "PDF";
    }


    if (
        $("scheduleNextRun") &&
        schedule.next_run
    ) {

        const date =
            new Date(
                schedule.next_run
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            /*
             * Convert UTC datetime to
             * datetime-local value.
             */

            const local =
                new Date(
                    date.getTime() -
                    date.getTimezoneOffset() *
                    60000
                );


            $("scheduleNextRun").value =
                local
                    .toISOString()
                    .slice(0, 16);
        }
    }


    openScheduleModal();
}


/* ============================================================
   UPDATE SCHEDULE
============================================================ */

async function updateSchedule(
    id
) {

    const reportName =
        $("scheduleReportName")
            ?.value
            .trim();


    const schedule =
        $("scheduleFrequency")
            ?.value;


    const nextRun =
        $("scheduleNextRun")
            ?.value;


    const recipients =
        $("scheduleRecipients")
            ?.value
            .trim();


    const format =
        $("scheduleFormat")
            ?.value ||
        "PDF";


    if (!reportName) {

        showToast(
            "Report name is required.",
            true
        );

        return;
    }


    if (!nextRun) {

        showToast(
            "Please select the next run date and time.",
            true
        );

        return;
    }


    const nextRunDate =
        new Date(nextRun);


    if (
        Number.isNaN(
            nextRunDate.getTime()
        )
    ) {

        showToast(
            "Invalid next run date.",
            true
        );

        return;
    }


    const payload = {

        report_name:
            reportName,

        schedule:
            schedule,

        next_run:
            nextRunDate.toISOString(),

        recipients:
            recipients || null,

        format:
            format,

        status:
            "Active",

        is_active:
            true
    };


    try {

        await apiFetch(
            `/api/admin/reports/scheduled/${Number(id)}`,
            {
                method: "PUT",

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


        state.editingScheduleId =
            null;


        closeScheduleModal();


        $("scheduleForm")?.reset();


        showToast(
            "Schedule updated successfully."
        );


        await loadScheduledReports();

        await loadDashboard();


    } catch (error) {

        console.error(
            "Update schedule error:",
            error
        );


        showToast(
            error.message ||
            "Unable to update schedule.",
            true
        );
    }
}


/* ============================================================
   DELETE SCHEDULE
============================================================ */

async function deleteSchedule(
    id
) {

    if (
        !confirm(
            "Delete this scheduled report?"
        )
    ) {
        return;
    }


    try {

        await apiFetch(
            `/api/admin/reports/scheduled/${Number(id)}`,
            {
                method: "DELETE"
            }
        );


        showToast(
            "Schedule deleted successfully."
        );


        await loadScheduledReports();

        await loadDashboard();


    } catch (error) {

        console.error(
            "Delete schedule error:",
            error
        );


        showToast(
            error.message ||
            "Unable to delete schedule.",
            true
        );
    }
}


/* ============================================================
   SETUP GENERAL EVENTS
============================================================ */

function setupEvents() {

    setupFormatButtons();

    setupScheduleModal();

    setupSearch();

    setupDateSync();


    /*
     * Generate report
     */

    const generateButton =
        $("generateReportBtn");


    if (generateButton) {

        generateButton.addEventListener(
            "click",
            generateReport
        );
    }


    /*
     * Advanced filters
     */

    const advancedFilterButton =
        $("advancedFilterBtn");


    if (advancedFilterButton) {

        advancedFilterButton.addEventListener(
            "click",
            () => {

                document
                    .querySelector(
                        ".reports-panel"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });
            }
        );
    }


    /*
     * View schedules
     */

    const viewSchedulesButton =
        $("viewSchedulesBtn");


    if (viewSchedulesButton) {

        viewSchedulesButton.addEventListener(
            "click",
            () => {

                $("scheduledTable")
                    ?.closest(".scheduled-panel")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });
            }
        );
    }


    /*
     * View all exports
     */

    const viewAllExports =
        $("viewAllExports");


    if (viewAllExports) {

        viewAllExports.addEventListener(
            "click",
            () => {

                $("reportsTable")
                    ?.closest(".reports-panel")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });
            }
        );
    }


    /*
     * Export history
     */

    const exportHistory =
        $("exportHistoryBtn");


    if (exportHistory) {

        exportHistory.addEventListener(
            "click",
            () => {

                $("reportsTable")
                    ?.closest(".reports-panel")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });
            }
        );
    }


    /*
     * Close modal when clicking outside.
     */

    const modal =
        $("scheduleModal");


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    closeScheduleModal();
                }
            }
        );
    }
}


/* ============================================================
   INITIALIZE PAGE
============================================================ */

async function initializePage() {

    console.log(
        "Initializing Export Reports page..."
    );


    initializeDates();


    setupEvents();


    /*
     * Load everything.
     */

    await Promise.all([
        loadCurrentUser(),
        loadDashboard(),
        loadCategories(),
        loadRecentReports(),
        loadScheduledReports()
    ]);


    console.log(
        "Export Reports page initialized."
    );
}


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializePage
);