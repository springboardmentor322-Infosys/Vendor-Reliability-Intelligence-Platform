/* ============================================================
   FINANCIAL REPORTS
   ============================================================ */

const API_BASE = "http://127.0.0.1:8000";

let reportsTrendChart = null;
let categoryChart = null;

let currentPage = 1;
const pageLimit = 5;


/* ============================================================
   AUTHENTICATION
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
    );
}


async function apiFetch(
    endpoint,
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
        `${API_BASE}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {

        console.error(
            "Authentication failed."
        );

        window.location.href =
            "/login";

        throw new Error(
            "Not authenticated"
        );
    }

    if (!response.ok) {

        let message =
            "Request failed";

        try {

            const data =
                await response.json();

            message =
                data.detail ||
                data.message ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response;
}


/* ============================================================
   DATE HELPERS
============================================================ */

function formatDateInput(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function initializeDates() {

    const today =
        new Date();

    const firstDay =
        new Date(
            today.getFullYear(),
            0,
            1
        );

    document.getElementById(
        "fromDate"
    ).value =
        formatDateInput(firstDay);

    document.getElementById(
        "toDate"
    ).value =
        formatDateInput(today);
}


/* ============================================================
   LOAD REPORT DASHBOARD
============================================================ */

async function loadFinancialReports() {

    try {

        const fromDate =
            document.getElementById(
                "fromDate"
            ).value;

        const toDate =
            document.getElementById(
                "toDate"
            ).value;

        const search =
            document.getElementById(
                "reportSearch"
            ).value.trim();


        const params =
            new URLSearchParams();

        if (fromDate) {
            params.set(
                "from_date",
                fromDate
            );
        }

        if (toDate) {
            params.set(
                "to_date",
                toDate
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
            "limit",
            pageLimit
        );


        const response =
            await apiFetch(
                `/api/admin/reports/page?${params.toString()}`
            );


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                "Unable to load report dashboard"
            );
        }


        updateKPIs(
            data.kpis
        );

        updateTrendChart(
            data.trend
        );

        updateCategoryChart(
            data.categories
        );

        renderRecentReports(
            data.recent_reports
        );

        renderPagination(
            data.pagination
        );

        updateSummary(
            data.kpis
        );


    } catch (error) {

        console.error(
            "Financial reports error:",
            error
        );

        showTableError(
            error.message
        );
    }
}


/* ============================================================
   UPDATE KPI CARDS
============================================================ */

function updateKPIs(kpis) {

    setText(
        "totalReports",
        formatNumber(
            kpis.total_reports
        )
    );

    setText(
        "reportsViewed",
        formatNumber(
            kpis.reports_viewed
        )
    );

    setText(
        "reportsDownloaded",
        formatNumber(
            kpis.reports_downloaded
        )
    );

    setText(
        "scheduledReports",
        formatNumber(
            kpis.scheduled_reports
        )
    );

    setText(
        "reportAccuracy",
        `${Number(
            kpis.report_accuracy || 0
        ).toFixed(1)}%`
    );

    setText(
        "dataSources",
        formatNumber(
            kpis.data_sources
        )
    );


    setText(
        "totalReportsChange",
        "Live database data"
    );

    setText(
        "reportsViewedChange",
        "Live database data"
    );

    setText(
        "reportsDownloadedChange",
        "Live database data"
    );

    setText(
        "scheduledReportsChange",
        "Active schedules"
    );
}


/* ============================================================
   SUMMARY
============================================================ */

function updateSummary(kpis) {

    setText(
        "summaryGenerated",
        formatNumber(
            kpis.total_reports
        )
    );

    setText(
        "summaryViewed",
        formatNumber(
            kpis.reports_viewed
        )
    );

    setText(
        "summaryDownloaded",
        formatNumber(
            kpis.reports_downloaded
        )
    );

    setText(
        "summaryScheduled",
        formatNumber(
            kpis.scheduled_reports
        )
    );

    setText(
        "summaryFailed",
        formatNumber(
            kpis.failed_reports
        )
    );
}


/* ============================================================
   TREND CHART
============================================================ */

function updateTrendChart(trend) {

    const canvas =
        document.getElementById(
            "reportsTrendChart"
        );

    if (!canvas) {
        return;
    }


    if (reportsTrendChart) {

        reportsTrendChart.destroy();

        reportsTrendChart = null;
    }


    reportsTrendChart =
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
                                "Reports Generated",

                            data:
                                trend.generated || [],

                            borderColor:
                                "#0969e8",

                            backgroundColor:
                                "rgba(9,105,232,0.08)",

                            fill: true,

                            tension: 0.35,

                            pointRadius: 3,

                            pointHoverRadius: 5
                        },

                        {
                            label:
                                "Reports Downloaded",

                            data:
                                trend.downloaded || [],

                            borderColor:
                                "#10a765",

                            backgroundColor:
                                "rgba(16,167,101,0.04)",

                            fill: false,

                            tension: 0.35,

                            pointRadius: 3,

                            pointHoverRadius: 5
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                        intersect: false,
                        mode: "index"
                    },

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {
                            backgroundColor:
                                "#071c43",

                            padding: 10,

                            titleFont: {
                                size: 11
                            },

                            bodyFont: {
                                size: 10
                            }
                        }
                    },

                    scales: {

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {
                                font: {
                                    size: 9
                                },

                                color:
                                    "#61718e"
                            }
                        },

                        y: {

                            beginAtZero: true,

                            grid: {
                                color:
                                    "#edf1f6"
                            },

                            ticks: {

                                font: {
                                    size: 9
                                },

                                color:
                                    "#61718e",

                                precision: 0
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   CATEGORY CHART
============================================================ */

function updateCategoryChart(
    categories
) {

    const canvas =
        document.getElementById(
            "categoryChart"
        );

    if (!canvas) {
        return;
    }


    if (categoryChart) {

        categoryChart.destroy();

        categoryChart = null;
    }


    const labels =
        categories.map(
            item => item.category
        );

    const values =
        categories.map(
            item => item.count
        );


    const categoryColors = [
        "#0969e8",
        "#10a765",
        "#f7941d",
        "#7b3fe4",
        "#d92442",
        "#aeb8c8"
    ];


    const total =
        values.reduce(
            (sum, value) =>
                sum + Number(value || 0),
            0
        );


    setText(
        "categoryTotal",
        formatNumber(total)
    );


    categoryChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels,

                    datasets: [
                        {
                            data: values,

                            backgroundColor:
                                categoryColors,

                            borderWidth: 2,

                            borderColor: "#ffffff"
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

                                        const value =
                                            context.raw;

                                        const percentage =
                                            total
                                                ? (
                                                    value /
                                                    total *
                                                    100
                                                ).toFixed(1)
                                                : 0;

                                        return (
                                            ` ${value} reports ` +
                                            `(${percentage}%)`
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );


    renderCategoryLegend(
        categories,
        categoryColors
    );
}


/* ============================================================
   CATEGORY LEGEND
============================================================ */

function renderCategoryLegend(
    categories,
    colors
) {

    const container =
        document.getElementById(
            "categoryLegend"
        );

    container.innerHTML = "";


    categories.forEach(
        (category, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "category-legend-item";


            const color =
                document.createElement(
                    "span"
                );

            color.className =
                "category-color";

            color.style.background =
                colors[
                    index %
                    colors.length
                ];


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "category-name";

            name.textContent =
                category.category;


            const count =
                document.createElement(
                    "span"
                );

            count.className =
                "category-count";

            count.textContent =
                `${category.count} ` +
                `(${category.percent}%)`;


            row.appendChild(color);

            row.appendChild(name);

            row.appendChild(count);

            container.appendChild(row);
        }
    );
}


/* ============================================================
   RECENT REPORTS
============================================================ */

function renderRecentReports(
    reports
) {

    const tbody =
        document.getElementById(
            "recentReportsBody"
        );

    tbody.innerHTML = "";


    if (
        !reports ||
        reports.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-cell"
                >
                    <i class="fa-regular fa-file-lines"></i>
                    No reports found.
                </td>
            </tr>
        `;

        return;
    }


    reports.forEach(
        report => {

            const tr =
                document.createElement(
                    "tr"
                );


            const generatedDate =
                formatDate(
                    report.generated_at
                );


            const format =
                String(
                    report.format || ""
                ).toUpperCase();


            const formatHtml =
                getFormatHtml(
                    format
                );


            const status =
                String(
                    report.status ||
                    "Completed"
                ).toLowerCase();


            const statusClass =
                getStatusClass(
                    status
                );


            tr.innerHTML = `

                <td>
                    ${escapeHtml(
                        report.report_name ||
                        "Untitled Report"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        report.category ||
                        "-"
                    )}
                </td>

                <td>
                    ${generatedDate}
                </td>

                <td>
                    ${escapeHtml(
                        report.generated_by ||
                        "System"
                    )}
                </td>

                <td>
                    ${formatHtml}
                </td>

                <td>
                    <span
                        class="status-badge ${statusClass}"
                    >
                        ${escapeHtml(
                            capitalize(status)
                        )}
                    </span>
                </td>

                <td>

                    <button
                        class="action-button"
                        title="Download report"
                        data-report-id="${report.id}"
                        data-report-format="${format}"
                    >
                        <i class="fa-solid fa-download"></i>
                    </button>

                </td>
            `;


            const downloadButton =
                tr.querySelector(
                    ".action-button"
                );


            downloadButton.addEventListener(
                "click",
                function() {

                    downloadReport(
                        report.id,
                        format
                    );
                }
            );


            tbody.appendChild(tr);
        }
    );
}


/* ============================================================
   FORMAT
============================================================ */

function getFormatHtml(format) {

    if (format.includes("PDF")) {

        return `
            <span class="format-icon pdf">
                <i class="fa-solid fa-file-pdf"></i>
                PDF
            </span>
        `;
    }


    if (
        format.includes("EXCEL") ||
        format.includes("XLS")
    ) {

        return `
            <span class="format-icon excel">
                <i class="fa-solid fa-file-excel"></i>
                Excel
            </span>
        `;
    }


    if (format.includes("CSV")) {

        return `
            <span class="format-icon csv">
                <i class="fa-solid fa-file-csv"></i>
                CSV
            </span>
        `;
    }


    return `
        <span class="format-icon">
            <i class="fa-regular fa-file"></i>
            ${escapeHtml(format || "File")}
        </span>
    `;
}


/* ============================================================
   STATUS
============================================================ */

function getStatusClass(status) {

    if (
        status === "completed" ||
        status === "complete"
    ) {
        return "completed";
    }

    if (
        status === "failed" ||
        status === "error"
    ) {
        return "failed";
    }

    return "pending";
}


/* ============================================================
   PAGINATION
============================================================ */

function renderPagination(
    pagination
) {

    const container =
        document.getElementById(
            "pagination"
        );

    container.innerHTML = "";


    const current =
        pagination.page || 1;

    const pages =
        pagination.pages || 1;

    const total =
        pagination.total || 0;

    const limit =
        pagination.limit || pageLimit;


    let start =
        total === 0
            ? 0
            : ((current - 1) * limit) + 1;

    let end =
        Math.min(
            current * limit,
            total
        );


    setText(
        "paginationInfo",
        `Showing ${start} to ${end} of ${total} reports`
    );


    const previous =
        createPageButton(
            '<i class="fa-solid fa-chevron-left"></i>',
            current - 1,
            current <= 1
        );


    container.appendChild(
        previous
    );


    const maxButtons = 5;

    let first =
        Math.max(
            1,
            current - 2
        );

    let last =
        Math.min(
            pages,
            first + maxButtons - 1
        );


    if (
        last - first <
        maxButtons - 1
    ) {

        first =
            Math.max(
                1,
                last - maxButtons + 1
            );
    }


    for (
        let i = first;
        i <= last;
        i++
    ) {

        const button =
            createPageButton(
                i,
                i,
                false,
                i === current
            );

        container.appendChild(
            button
        );
    }


    const next =
        createPageButton(
            '<i class="fa-solid fa-chevron-right"></i>',
            current + 1,
            current >= pages
        );


    container.appendChild(
        next
    );
}


function createPageButton(
    label,
    page,
    disabled = false,
    active = false
) {

    const button =
        document.createElement(
            "button"
        );

    button.innerHTML =
        label;

    button.disabled =
        disabled;

    if (active) {
        button.classList.add(
            "active"
        );
    }


    button.addEventListener(
        "click",
        function() {

            if (disabled) {
                return;
            }

            currentPage =
                page;

            loadFinancialReports();
        }
    );


    return button;
}


/* ============================================================
   DOWNLOAD REPORT
============================================================ */

async function downloadReport(
    reportId,
    format
) {

    try {

        /*
         * Existing backend endpoint:
         *
         * GET
         * /api/admin/reports/{report_id}/download
         */

        const response =
            await apiFetch(
                `/api/admin/reports/${reportId}/download`
            );


        const blob =
            await response.blob();


        let filename =
            `report-${reportId}`;


        const disposition =
            response.headers.get(
                "Content-Disposition"
            );


        if (disposition) {

            const match =
                disposition.match(
                    /filename="?([^"]+)"?/
                );

            if (match) {
                filename =
                    match[1];
            }
        }


        const url =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            filename;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
            url
        );


        await loadFinancialReports();

    } catch (error) {

        console.error(
            "Download failed:",
            error
        );

        alert(
            "Unable to download report."
        );
    }
}


/* ============================================================
   GENERATE REPORT
============================================================ */

async function generateReport(
    reportType,
    format
) {

    let endpoint =
        `/api/admin/reports/export/${format}/${reportType}`;


    try {

        const response =
            await apiFetch(
                endpoint
            );


        const blob =
            await response.blob();


        let filename =
            `${reportType}.${format}`;


        const disposition =
            response.headers.get(
                "Content-Disposition"
            );


        if (disposition) {

            const match =
                disposition.match(
                    /filename="?([^"]+)"?/
                );

            if (match) {
                filename =
                    match[1];
            }
        }


        const url =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );

        link.href =
            url;

        link.download =
            filename;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
            url
        );


        closeModal(
            "createReportModal"
        );


        await loadFinancialReports();


    } catch (error) {

        console.error(
            "Report generation failed:",
            error
        );

        alert(
            `Unable to generate report: ${error.message}`
        );
    }
}


/* ============================================================
   CREATE REPORT FORM
============================================================ */

function initializeCreateReportForm() {

    const form =
        document.getElementById(
            "createReportForm"
        );


    form.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const reportType =
                document.getElementById(
                    "reportType"
                ).value;


            const format =
                document.getElementById(
                    "exportFormat"
                ).value;


            if (!reportType) {

                alert(
                    "Please select a report type."
                );

                return;
            }


            await generateReport(
                reportType,
                format
            );
        }
    );
}


/* ============================================================
   SCHEDULE REPORT
============================================================ */

async function createSchedule(
    event
) {

    event.preventDefault();


    const reportName =
        document.getElementById(
            "scheduleReportName"
        ).value.trim();


    const schedule =
        document.getElementById(
            "scheduleFrequency"
        ).value;


    const recipients =
        document.getElementById(
            "scheduleRecipients"
        ).value.trim();


    const format =
        document.getElementById(
            "scheduleFormat"
        ).value;


    if (!reportName) {

        alert(
            "Please enter a report name."
        );

        return;
    }


    try {

        const response =
            await apiFetch(
                "/api/admin/reports/scheduled",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        report_name:
                            reportName,

                        schedule:
                            schedule,

                        next_run:
                            null,

                        recipients:
                            recipients,

                        format:
                            format,

                        status:
                            "Active",

                        is_active:
                            true
                    })
                }
            );


        await response.json();


        closeModal(
            "scheduleReportModal"
        );


        document.getElementById(
            "scheduleReportForm"
        ).reset();


        await loadFinancialReports();


        alert(
            "Report schedule created successfully."
        );


    } catch (error) {

        console.error(
            "Schedule creation failed:",
            error
        );

        alert(
            `Unable to create schedule: ${error.message}`
        );
    }
}


/* ============================================================
   MODALS
============================================================ */

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {
        modal.classList.add(
            "show"
        );
    }
}


function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {
        modal.classList.remove(
            "show"
        );
    }
}


function initializeModals() {

    document
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function() {

                        const modal =
                            button.closest(
                                ".modal-overlay"
                            );

                        if (modal) {

                            modal.classList.remove(
                                "show"
                            );
                        }
                    }
                );
            }
        );


    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(
            modal => {

                modal.addEventListener(
                    "click",
                    function(event) {

                        if (
                            event.target ===
                            modal
                        ) {

                            modal.classList.remove(
                                "show"
                            );
                        }
                    }
                );
            }
        );
}


/* ============================================================
   SEARCH
============================================================ */

function initializeSearch() {

    const input =
        document.getElementById(
            "reportSearch"
        );


    let timer;


    input.addEventListener(
        "input",
        function() {

            clearTimeout(timer);


            timer =
                setTimeout(
                    function() {

                        currentPage = 1;

                        loadFinancialReports();

                    },
                    350
                );
        }
    );


    const globalSearch =
        document.getElementById(
            "globalSearch"
        );


    globalSearch.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                document.getElementById(
                    "reportSearch"
                ).value =
                    globalSearch.value;

                currentPage = 1;

                loadFinancialReports();
            }
        }
    );
}


/* ============================================================
   BUTTONS
============================================================ */

function initializeButtons() {

    document
        .getElementById(
            "refreshButton"
        )
        .addEventListener(
            "click",
            function() {

                currentPage = 1;

                loadFinancialReports();
            }
        );


    document
        .getElementById(
            "createReportButton"
        )
        .addEventListener(
            "click",
            function() {

                openModal(
                    "createReportModal"
                );
            }
        );


    document
        .getElementById(
            "scheduleReportButton"
        )
        .addEventListener(
            "click",
            function() {

                openModal(
                    "scheduleReportModal"
                );
            }
        );


    document
        .getElementById(
            "scheduleReportForm"
        )
        .addEventListener(
            "submit",
            createSchedule
        );


    document
        .getElementById(
            "viewAllReports"
        )
        .addEventListener(
            "click",
            function() {

                document
                    .getElementById(
                        "reportSearch"
                    )
                    .focus();
            }
        );


    document
        .getElementById(
            "reportBuilderButton"
        )
        .addEventListener(
            "click",
            function() {

                alert(
                    "Report Builder can be connected to your report builder page."
                );
            }
        );


    document
        .getElementById(
            "exportDataButton"
        )
        .addEventListener(
            "click",
            function() {

                openModal(
                    "createReportModal"
                );
            }
        );


    document
        .getElementById(
            "viewSourcesLink"
        )
        .addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                window.location.href =
                    "/DataManagement";
            }
        );
}


/* ============================================================
   UTILITY
============================================================ */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value;
    }
}


function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );
}


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
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


function capitalize(value) {

    if (!value) {
        return "";
    }

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function showTableError(
    message
) {

    const tbody =
        document.getElementById(
            "recentReportsBody"
        );

    tbody.innerHTML = `

        <tr>

            <td
                colspan="7"
                class="empty-cell"
            >

                <i
                    class="fa-solid
                    fa-triangle-exclamation"
                ></i>

                ${escapeHtml(
                    message ||
                    "Unable to load reports."
                )}

            </td>

        </tr>

    `;
}


/* ============================================================
   DATE CHANGE
============================================================ */

function initializeDateFilters() {

    document
        .getElementById(
            "fromDate"
        )
        .addEventListener(
            "change",
            function() {

                currentPage = 1;

                loadFinancialReports();
            }
        );


    document
        .getElementById(
            "toDate"
        )
        .addEventListener(
            "change",
            function() {

                currentPage = 1;

                loadFinancialReports();
            }
        );
}


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        initializeDates();

        initializeCreateReportForm();

        initializeModals();

        initializeSearch();

        initializeButtons();

        initializeDateFilters();


        try {

            await loadFinancialReports();

        } catch (error) {

            console.error(
                error
            );
        }

    }
);