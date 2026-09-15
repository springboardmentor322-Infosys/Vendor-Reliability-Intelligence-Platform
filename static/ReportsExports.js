/* ==========================================================
   VENDORIQ
   REPORTS & EXPORT JAVASCRIPT
   MATCHED WITH FASTAPI REPORT ENDPOINTS
   ========================================================== */

const API = "http://127.0.0.1:8000";

let currentReportType = "vendor-performance";


/* ==========================================================
   AUTHENTICATION
   ========================================================== */

function getAuthToken() {

    return (

        localStorage.getItem("access_token") ||

        localStorage.getItem("token") ||

        localStorage.getItem("accessToken") ||

        localStorage.getItem("jwt_token") ||

        localStorage.getItem("vendor_token") ||

        sessionStorage.getItem("access_token") ||

        sessionStorage.getItem("token") ||

        sessionStorage.getItem("accessToken") ||

        sessionStorage.getItem("jwt_token") ||

        sessionStorage.getItem("vendor_token") ||

        null

    );

}


/* ==========================================================
   API FETCH
   ========================================================== */

async function apiFetch(url, options = {}) {

    const token = getAuthToken();

    const requestOptions = {
        ...options,

        headers: {
            ...(options.headers || {})
        }
    };


    /*
     * Only add JSON content type when a body exists.
     */

    if (options.body) {

        requestOptions.headers["Content-Type"] =
            "application/json";

    }


    if (token) {

        requestOptions.headers["Authorization"] =
            `Bearer ${token}`;

    }


    console.log("API REQUEST:", url);


    const response = await fetch(
        url,
        requestOptions
    );


    if (!response.ok) {

        let message =
            `API ${response.status}`;


        try {

            const error =
                await response.json();

            message =
                error.detail ||
                error.message ||
                message;

        }

        catch {

            try {

                const text =
                    await response.text();

                if (text) {

                    message = text;

                }

            }

            catch {

                // Ignore parsing failure

            }

        }


        throw new Error(message);

    }


    return response;

}


/* ==========================================================
   SHOW TOAST
   ========================================================== */

function showToast(message) {

    const toast =
        document.getElementById("toast");


    if (!toast) {

        console.log(message);

        return;

    }


    toast.textContent = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


/* ==========================================================
   LOAD DASHBOARD SUMMARY
   ========================================================== */

async function loadDashboard() {

    try {

        /*
         * Your Python dashboard endpoint returns:
         *
         * total_reports
         * generated_this_month
         * total_downloads
         * scheduled_reports
         */

        const dashboardResponse =
            await apiFetch(
                `${API}/api/admin/reports/dashboard`
            );


        const dashboard =
            await dashboardResponse.json();


        console.log(
            "Reports dashboard:",
            dashboard
        );


        setText(
            "totalReports",
            dashboard.total_reports || 0
        );


        setText(
            "generatedThisMonth",
            dashboard.generated_this_month || 0
        );


        setText(
            "totalDownloads",
            dashboard.total_downloads || 0
        );


        setText(
            "scheduledReports",
            dashboard.scheduled_reports || 0
        );


        /*
         * IMPORTANT:
         *
         * Categories are NOT returned by /dashboard.
         *
         * They come from:
         * /api/admin/reports/categories
         */

        try {

            const categoriesResponse =
                await apiFetch(
                    `${API}/api/admin/reports/categories`
                );


            const categories =
                await categoriesResponse.json();


            console.log(
                "Report categories:",
                categories
            );


            setText(
                "vendorReportCount",
                categories.vendor_performance || 0
            );


            setText(
                "procurementReportCount",
                categories.procurement || 0
            );


            setText(
                "purchaseOrderReportCount",
                categories.purchase_orders || 0
            );


            setText(
                "complianceReportCount",
                categories.compliance || 0
            );


            setText(
                "contractReportCount",
                categories.contracts || 0
            );


            setText(
                "customReportCount",
                categories.custom || 0
            );

        }

        catch (categoryError) {

            console.error(
                "Report category loading error:",
                categoryError
            );


            /*
             * Keep dashboard usable even if
             * category API fails.
             */

            setText("vendorReportCount", 0);
            setText("procurementReportCount", 0);
            setText("purchaseOrderReportCount", 0);
            setText("complianceReportCount", 0);
            setText("contractReportCount", 0);
            setText("customReportCount", 0);

        }

    }

    catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );


        showToast(
            error.message ||
            "Unable to load report dashboard"
        );

    }

}


/* ==========================================================
   LOAD RECENT REPORTS
   ========================================================== */

async function loadRecentReports() {

    const table =
        document.getElementById(
            "recentReportsTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = `
        <tr>
            <td colspan="7">
                Loading reports...
            </td>
        </tr>
    `;


    try {

        const response =
            await apiFetch(
                `${API}/api/admin/reports/recent?limit=20`
            );


        const result =
            await response.json();


        console.log(
            "Recent reports:",
            result
        );


        /*
         * Supports:
         *
         * [...]
         *
         * OR
         *
         * { reports: [...] }
         */

        const reports =
            Array.isArray(result)
                ? result
                : Array.isArray(result.reports)
                    ? result.reports
                    : [];


        table.innerHTML = "";


        if (!reports.length) {

            table.innerHTML = `
                <tr>
                    <td colspan="7">
                        No reports found.
                    </td>
                </tr>
            `;

            return;

        }


        reports.forEach(report => {

            const row =
                document.createElement("tr");


            const generatedDate =
                report.generated_at
                    ? formatDate(
                        report.generated_at
                    )
                    : "-";


            const format =
                (
                    report.format ||
                    "PDF"
                ).toUpperCase();


            const formatClass =
                format === "EXCEL" ||
                format === "XLSX"
                    ? "excel"
                    : "pdf";


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            report.report_name || "-"
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        report.category || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        report.generated_by || "-"
                    )}
                </td>

                <td>
                    ${generatedDate}
                </td>

                <td>
                    <span class="format ${formatClass}">
                        ${escapeHtml(format)}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        report.file_size || "-"
                    )}
                </td>

                <td>
                    <div class="action-buttons">

                        <button
                            type="button"
                            class="action-button"
                            title="Download"
                            onclick="downloadExistingReport(${Number(report.id)})"
                        >
                            ↓
                        </button>

                        <button
                            type="button"
                            class="action-button"
                            title="View"
                            onclick="viewExistingReport(${Number(report.id)})"
                        >
                            ◉
                        </button>

                    </div>
                </td>

            `;


            table.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Recent reports error:",
            error
        );


        table.innerHTML = `
            <tr>
                <td colspan="7">
                    Failed to load reports.
                </td>
            </tr>
        `;

    }

}


/* ==========================================================
   LOAD SCHEDULED REPORTS
   ========================================================== */

async function loadScheduledReports() {

    const table =
        document.getElementById(
            "scheduledReportsTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = `
        <tr>
            <td colspan="7">
                Loading schedules...
            </td>
        </tr>
    `;


    try {

        const response =
            await apiFetch(
                `${API}/api/admin/reports/scheduled`
            );


        const result =
            await response.json();


        console.log(
            "Scheduled reports:",
            result
        );


        const reports =
            Array.isArray(result)
                ? result
                : Array.isArray(result.reports)
                    ? result.reports
                    : [];


        table.innerHTML = "";


        if (!reports.length) {

            table.innerHTML = `
                <tr>
                    <td colspan="7">
                        No scheduled reports.
                    </td>
                </tr>
            `;

            return;

        }


        reports.forEach(report => {

            const row =
                document.createElement("tr");


            const nextRun =
                report.next_run
                    ? formatDate(
                        report.next_run
                    )
                    : "-";


            const format =
                (
                    report.format ||
                    "PDF"
                ).toUpperCase();


            const formatClass =
                format === "EXCEL" ||
                format === "XLSX"
                    ? "excel"
                    : "pdf";


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            report.report_name || "-"
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        report.schedule || "-"
                    )}
                </td>

                <td>
                    ${nextRun}
                </td>

                <td>
                    ${escapeHtml(
                        formatRecipients(
                            report.recipients
                        )
                    )}
                </td>

                <td>
                    <span class="format ${formatClass}">
                        ${escapeHtml(format)}
                    </span>
                </td>

                <td>
                    <span class="status">
                        ${escapeHtml(
                            report.status ||
                            (
                                report.is_active
                                    ? "Active"
                                    : "Inactive"
                            )
                        )}
                    </span>
                </td>

                <td>

                    <div class="action-buttons">

                        <button
                            type="button"
                            class="action-button"
                            title="Edit"
                            onclick="editSchedule(${Number(report.id)})"
                        >
                            ✎
                        </button>

                        <button
                            type="button"
                            class="action-button"
                            title="Enable / Disable"
                            onclick="toggleSchedule(${Number(report.id)})"
                        >
                            ${
                                report.is_active
                                    ? "Ⅱ"
                                    : "▶"
                            }
                        </button>

                    </div>

                </td>

            `;


            table.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Scheduled reports error:",
            error
        );


        table.innerHTML = `
            <tr>
                <td colspan="7">
                    Failed to load schedules.
                </td>
            </tr>
        `;

    }

}


/* ==========================================================
   VIEW REPORT
   ========================================================== */

function viewReport(reportType) {

    currentReportType =
        reportType;


    showToast(
        `Preparing ${reportType} report...`
    );


    setTimeout(() => {

        exportReport(
            reportType,
            "pdf"
        );

    }, 300);

}


/* ==========================================================
   QUICK EXPORT
   ========================================================== */

function quickExport(format) {

    const normalizedFormat =
        String(format || "pdf")
            .toLowerCase();


    exportReport(
        currentReportType,
        normalizedFormat
    );

}


/* ==========================================================
   EXPORT REPORT
   ========================================================== */

async function exportReport(
    reportType,
    format
) {

    reportType =
        String(reportType || "")
            .trim()
            .toLowerCase();


    format =
        String(format || "pdf")
            .trim()
            .toLowerCase();


    /*
     * Supported by your FastAPI routes:
     *
     * /api/admin/reports/export/pdf/{report_type}
     * /api/admin/reports/export/excel/{report_type}
     * /api/admin/reports/export/csv/{report_type}
     */

    const supportedFormats = [
        "pdf",
        "excel",
        "csv"
    ];


    if (!supportedFormats.includes(format)) {

        showToast(
            `Unsupported export format: ${format}`
        );

        return;

    }


    const url =
        `${API}/api/admin/reports/export/${format}/${encodeURIComponent(reportType)}`;


    showToast(
        `Generating ${format.toUpperCase()} report...`
    );


    try {

        const response =
            await apiFetch(url);


        const blob =
            await response.blob();


        /*
         * Prefer filename supplied by FastAPI.
         */

        let filename =
            getFilenameFromResponse(
                response
            );


        if (!filename) {

            let extension = "pdf";


            if (format === "excel") {

                extension = "xlsx";

            }

            else if (format === "csv") {

                extension = "csv";

            }


            filename =
                `${reportType}-report.${extension}`;

        }


        const blobUrl =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement("a");


        link.href =
            blobUrl;


        link.download =
            filename;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        setTimeout(() => {

            window.URL.revokeObjectURL(
                blobUrl
            );

        }, 1000);


        showToast(
            "Report exported successfully."
        );


        /*
         * Refresh dashboard because a new
         * Report row has been inserted.
         */

        await loadDashboard();

        await loadRecentReports();

    }

    catch (error) {

        console.error(
            "Export error:",
            error
        );


        showToast(
            error.message ||
            "Export failed."
        );

    }

}


/* ==========================================================
   DOWNLOAD EXISTING REPORT
   ========================================================== */

async function downloadExistingReport(
    reportId
) {

    if (!reportId) {

        showToast(
            "Invalid report ID."
        );

        return;

    }


    showToast(
        "Downloading report..."
    );


    try {

        /*
         * IMPORTANT:
         *
         * Python endpoint is:
         *
         * /api/admin/reports/{report_id}/download
         *
         * NOT:
         *
         * /api/admin/reports/{report_id}
         */

        const response =
            await apiFetch(
                `${API}/api/admin/reports/${encodeURIComponent(reportId)}/download`
            );


        const blob =
            await response.blob();


        let filename =
            getFilenameFromResponse(
                response
            );


        if (!filename) {

            filename =
                `report-${reportId}`;

        }


        const blobUrl =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement("a");


        link.href =
            blobUrl;


        link.download =
            filename;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        setTimeout(() => {

            window.URL.revokeObjectURL(
                blobUrl
            );

        }, 1000);


        showToast(
            "Report downloaded successfully."
        );

    }

    catch (error) {

        console.error(
            "Download error:",
            error
        );


        showToast(
            error.message ||
            "Unable to download report."
        );

    }

}


/* ==========================================================
   VIEW EXISTING REPORT
   ========================================================== */

async function viewExistingReport(
    reportId
) {

    if (!reportId) {

        showToast(
            "Invalid report ID."
        );

        return;

    }


    try {

        /*
         * Use the same FastAPI download endpoint.
         */

        const response =
            await apiFetch(
                `${API}/api/admin/reports/${encodeURIComponent(reportId)}/download`
            );


        const blob =
            await response.blob();


        const blobUrl =
            window.URL.createObjectURL(
                blob
            );


        const newWindow =
            window.open(
                blobUrl,
                "_blank"
            );


        /*
         * Browser may block window.open.
         */

        if (!newWindow) {

            showToast(
                "Please allow pop-ups to view the report."
            );

            window.URL.revokeObjectURL(
                blobUrl
            );

            return;

        }


        /*
         * Give browser time to load blob.
         */

        setTimeout(() => {

            window.URL.revokeObjectURL(
                blobUrl
            );

        }, 60000);

    }

    catch (error) {

        console.error(
            "View report error:",
            error
        );


        showToast(
            error.message ||
            "Unable to open report."
        );

    }

}


/* ==========================================================
   CUSTOM REPORT
   ========================================================== */

function createCustomReport() {

    showToast(
        "Custom report builder will open here."
    );

}


/* ==========================================================
   EDIT SCHEDULE
   ========================================================== */

function editSchedule(
    reportId
) {

    showToast(
        `Edit schedule ${reportId}`
    );

}


/* ==========================================================
   TOGGLE SCHEDULE
   ========================================================== */

function toggleSchedule(
    reportId
) {

    showToast(
        `Schedule ${reportId} updated.`
    );

}


/* ==========================================================
   FORMAT DATE
   ========================================================== */

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

        return String(value);

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


/* ==========================================================
   FORMAT RECIPIENTS
   ========================================================== */

function formatRecipients(value) {

    if (!value) {

        return "-";

    }


    if (Array.isArray(value)) {

        return value.join(", ");

    }


    if (
        typeof value === "object"
    ) {

        try {

            return JSON.stringify(
                value
            );

        }

        catch {

            return "-";

        }

    }


    return String(value);

}


/* ==========================================================
   GET FILENAME FROM CONTENT-DISPOSITION
   ========================================================== */

function getFilenameFromResponse(
    response
) {

    const disposition =
        response.headers.get(
            "Content-Disposition"
        );


    if (!disposition) {

        return null;

    }


    /*
     * Handles:
     *
     * filename="abc.pdf"
     *
     * filename=abc.pdf
     *
     * filename*=UTF-8''abc.pdf
     */

    const utfMatch =
        disposition.match(
            /filename\*=UTF-8''([^;]+)/i
        );


    if (utfMatch) {

        try {

            return decodeURIComponent(
                utfMatch[1]
            );

        }

        catch {

            return utfMatch[1];

        }

    }


    const filenameMatch =
        disposition.match(
            /filename="?([^"]+)"?/i
        );


    if (filenameMatch) {

        return filenameMatch[1];

    }


    return null;

}


/* ==========================================================
   ESCAPE HTML
   ========================================================== */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* ==========================================================
   SEARCH
   ========================================================== */

function setupSearch() {

    const input =
        document.getElementById(
            "searchInput"
        );


    if (!input) {

        return;

    }


    input.addEventListener(
        "input",
        function () {

            const search =
                this.value
                    .trim()
                    .toLowerCase();


            const rows =
                document.querySelectorAll(
                    "#recentReportsTable tr"
                );


            rows.forEach(row => {

                const text =
                    (
                        row.textContent ||
                        ""
                    )
                        .toLowerCase();


                row.style.display =
                    text.includes(search)
                        ? ""
                        : "none";

            });

        }
    );

}


/* ==========================================================
   ADMIN PROFILE
   ========================================================== */

function openAdminProfile() {

    window.location.href =
        "/admin/profile";

}


/* ============================================================
   HELPER: SET TEXT
   ============================================================ */

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value ?? "";

    }

}


/* ==========================================================
   UPDATE HEADER
   ========================================================== */

function updateHeader(user) {

    user =
        user || {};


    const name =
        user.name ||
        user.full_name ||
        user.username ||
        "Admin User";


    const email =
        user.email ||
        "";


    const role =
        user.role ||
        "Administrator";


    setText(
        "headerAdminName",
        name
    );


    setText(
        "headerAdminRole",
        role
    );


    setText(
        "sidebarAdminName",
        name
    );


    setText(
        "sidebarAdminEmail",
        email
    );

}


/* ==========================================================
   LOAD ADMIN PROFILE
   ========================================================== */

async function loadAdminProfile() {

    try {

        const response =
            await apiFetch(
                `${API}/adminprofile`
            );


        const data =
            await response.json();


        console.log(
            "Admin profile:",
            data
        );


        updateHeader(data);

    }

    catch (error) {

        console.error(
            "Unable to load admin profile:",
            error
        );

    }

}


/* ==========================================================
   INITIALIZE
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "Initializing Reports & Export Module..."
        );


        setupSearch();


        /*
         * Load independently.
         *
         * A failure in one section should not
         * prevent the others from loading.
         */

        await Promise.allSettled([

            loadAdminProfile(),

            loadDashboard(),

            loadRecentReports(),

            loadScheduledReports()

        ]);

    }
);