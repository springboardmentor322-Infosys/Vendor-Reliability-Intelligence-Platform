const API = window.location.origin;


/* =========================================================
   AUTH
========================================================= */

function getAuthToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        ""
    );
}


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(
    url,
    options = {}
) {

    const token = getAuthToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }

    if (
        options.body &&
        !(
            options.body instanceof FormData
        )
    ) {

        headers["Content-Type"] =
            "application/json";
    }

    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {

        console.error(
            "Unauthorized API request"
        );
    }

    if (!response.ok) {

        let message =
            "Request failed.";

        try {

            const error =
                await response.json();

            message =
                error.detail ||
                message;

        } catch {}

        throw new Error(
            message
        );
    }

    return response;
}


/* =========================================================
   BUILD QUERY
========================================================= */

function buildQuery() {

    const params =
        new URLSearchParams();

    const fromDate =
        document.getElementById(
            "fromDate"
        ).value;

    const toDate =
        document.getElementById(
            "toDate"
        ).value;

    const category =
        document.getElementById(
            "categoryFilter"
        ).value;

    const vendor =
        document.getElementById(
            "vendorFilter"
        ).value;

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

    if (category) {

        params.set(
            "category",
            category
        );
    }

    if (vendor) {

        params.set(
            "vendor_id",
            vendor
        );
    }

    return params.toString();
}


/* =========================================================
   LOAD FILTERS
========================================================= */

async function loadFilters() {

    try {

        const response =
            await apiRequest(
                `${API}/api/admin/performance/filters`
            );

        const data =
            await response.json();

        const categorySelect =
            document.getElementById(
                "categoryFilter"
            );

        const vendorSelect =
            document.getElementById(
                "vendorFilter"
            );


        categorySelect.innerHTML = `
            <option value="">
                All Categories
            </option>
        `;

        data.categories.forEach(
            category => {

                categorySelect.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHtml(category)}">
                        ${escapeHtml(category)}
                    </option>
                    `
                );

            }
        );


        vendorSelect.innerHTML = `
            <option value="">
                All Vendors
            </option>
        `;

        data.vendors.forEach(
            vendor => {

                vendorSelect.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHtml(vendor.vendor_id)}">
                        ${escapeHtml(vendor.vendor_name)}
                    </option>
                    `
                );

            }
        );

    } catch (error) {

        console.error(
            "Filter loading failed:",
            error
        );
    }
}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadPerformanceReport() {

    try {

        const query =
            buildQuery();

        const url =
            `${API}/api/admin/performance/dashboard` +
            (
                query
                    ? `?${query}`
                    : ""
            );

        const response =
            await apiRequest(url);

        const data =
            await response.json();

        renderDashboard(
            data
        );

    } catch (error) {

        console.error(
            "Performance report error:",
            error
        );

        showError(
            error.message
        );
    }
}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function renderDashboard(
    data
) {

    const kpi =
        data.kpis || {};


    document.getElementById(
        "overallScore"
    ).textContent =
        number(
            kpi.overall_score
        );


    document.getElementById(
        "onTimeDelivery"
    ).textContent =
        `${number(kpi.on_time_delivery)}%`;


    document.getElementById(
        "qualityScore"
    ).textContent =
        (
            Number(
                kpi.quality_score || 0
            ) / 20
        ).toFixed(1);


    document.getElementById(
        "orderFulfillment"
    ).textContent =
        `${number(kpi.order_fulfillment)}%`;


    document.getElementById(
        "responseTime"
    ).textContent =
        number(
            kpi.response_time
        );


    document.getElementById(
        "issueResolution"
    ).textContent =
        number(
            kpi.issue_resolution_time
        );


    document.getElementById(
        "donutScore"
    ).innerHTML =
        `${number(kpi.overall_score)}
         <small>/100</small>`;


    document.getElementById(
        "vendorCount"
    ).innerHTML =
        `${data.vendors.length}
         <small>Vendors</small>`;


    renderTrendChart(
        data.performance_trend
    );


    renderBreakdownChart(
        data.score_breakdown,
        kpi.overall_score
    );


    renderDistributionChart(
        data.score_distribution,
        data.vendors.length
    );


    renderVendorTable(
        data.vendors
    );


    renderCategoryPerformance(
        data.categories
    );


    renderInsights(
        data.insights
    );
}


/* =========================================================
   TREND CHART
========================================================= */

let trendChart = null;

function renderTrendChart(
    trend
) {

    const canvas =
        document.getElementById(
            "trendChart"
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

                    labels:
                        trend.labels,

                    datasets: [

                        {
                            label:
                                "On-Time Delivery",

                            data:
                                trend.delivery,

                            borderColor:
                                "#14b86b",

                            backgroundColor:
                                "transparent",

                            tension:
                                0.35
                        },

                        {
                            label:
                                "Quality",

                            data:
                                trend.quality
                                    .map(
                                        value =>
                                            value === null
                                                ? null
                                                : value
                                    ),

                            borderColor:
                                "#216df4",

                            backgroundColor:
                                "transparent",

                            tension:
                                0.35
                        },

                        {
                            label:
                                "Order Fulfillment",

                            data:
                                trend.fulfillment,

                            borderColor:
                                "#7b42ee",

                            backgroundColor:
                                "transparent",

                            tension:
                                0.35
                        },

                        {
                            label:
                                "Overall Score",

                            data:
                                trend.overall,

                            borderColor:
                                "#f6a623",

                            backgroundColor:
                                "transparent",

                            tension:
                                0.35
                        }

                    ]
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

                            min: 0,

                            max: 100
                        }
                    }
                }
            }
        );
}


/* =========================================================
   BREAKDOWN CHART
========================================================= */

let breakdownChart = null;

function renderBreakdownChart(
    breakdown,
    overall
) {

    const canvas =
        document.getElementById(
            "breakdownChart"
        );

    if (breakdownChart) {

        breakdownChart.destroy();
    }

    breakdownChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels:
                        breakdown.map(
                            x => x.metric
                        ),

                    datasets: [
                        {
                            data:
                                breakdown.map(
                                    x => x.weight
                                ),

                            backgroundColor: [
                                "#14b86b",
                                "#216df4",
                                "#f6a623",
                                "#7b42ee",
                                "#a8b2c7"
                            ],

                            borderWidth: 0
                        }
                    ]
                },

                options: {

                    cutout: "65%",

                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        );
}


/* =========================================================
   DISTRIBUTION CHART
========================================================= */

let distributionChart = null;

function renderDistributionChart(
    distribution,
    count
) {

    const canvas =
        document.getElementById(
            "distributionChart"
        );

    if (distributionChart) {

        distributionChart.destroy();
    }

    distributionChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels:
                        distribution.map(
                            x => x.label
                        ),

                    datasets: [

                        {
                            data:
                                distribution.map(
                                    x => x.value
                                ),

                            backgroundColor: [
                                "#14b86b",
                                "#216df4",
                                "#f6a623",
                                "#ef4c4c"
                            ],

                            borderWidth: 0
                        }
                    ]
                },

                options: {

                    cutout: "65%",

                    plugins: {

                        legend: {
                            display: false
                        }
                    }
                }
            }
        );


    const list =
        document.getElementById(
            "distributionList"
        );

    list.innerHTML = "";

    distribution.forEach(
        item => {

            const percent =
                count
                    ? (
                        item.value /
                        count *
                        100
                    ).toFixed(1)
                    : "0.0";

            list.insertAdjacentHTML(
                "beforeend",
                `
                <div class="score-item">

                    <span>
                        ${escapeHtml(item.label)}
                    </span>

                    <span class="value">
                        ${item.value}
                        (${percent}%)
                    </span>

                </div>
                `
            );
        }
    );
}


/* =========================================================
   BREAKDOWN LIST
========================================================= */

function renderBreakdownList(
    breakdown
) {

    const list =
        document.getElementById(
            "scoreBreakdown"
        );

    list.innerHTML = "";

    breakdown.forEach(
        item => {

            list.insertAdjacentHTML(
                "beforeend",
                `
                <div class="score-item">

                    <span>
                        ${escapeHtml(item.metric)}
                    </span>

                    <span class="value">
                        ${escapeHtml(item.display)}
                        (${item.weight}%)
                    </span>

                </div>
                `
            );

        }
    );
}


/* =========================================================
   VENDOR TABLE
========================================================= */

function renderVendorTable(
    vendors
) {

    const tbody =
        document.getElementById(
            "vendorTable"
        );

    tbody.innerHTML = "";

    vendors
        .slice(0, 10)
        .forEach(
            vendor => {

                let trendClass =
                    "trend-flat";

                let trendSymbol =
                    "→";

                if (
                    vendor.trend === "up"
                ) {

                    trendClass =
                        "trend-up";

                    trendSymbol =
                        "↑";
                }

                if (
                    vendor.trend === "down"
                ) {

                    trendClass =
                        "trend-down";

                    trendSymbol =
                        "↓";
                }

                tbody.insertAdjacentHTML(
                    "beforeend",
                    `
                    <tr>

                        <td>

                            <span class="vendor-name">
                                ${escapeHtml(
                                    vendor.vendor_name
                                )}
                            </span>

                            <span class="vendor-id">
                                ${escapeHtml(
                                    vendor.vendor_id
                                )}
                            </span>

                        </td>

                        <td>
                            <span class="score-pill">
                                ${number(
                                    vendor.overall_score
                                )}
                            </span>
                        </td>

                        <td>
                            ${number(
                                vendor.on_time_delivery
                            )}%
                        </td>

                        <td>
                            ${(
                                Number(
                                    vendor.quality_score
                                ) / 20
                            ).toFixed(1)}
                            / 5
                        </td>

                        <td>
                            ${number(
                                vendor.order_fulfillment
                            )}%
                        </td>

                        <td>
                            ${number(
                                vendor.response_time
                            )} hrs
                        </td>

                        <td
                            class="${trendClass}"
                        >
                            ${trendSymbol}
                        </td>

                        <td>

                            <button
                                class="action-button"
                                onclick="viewVendor(
                                    '${escapeHtml(
                                        vendor.vendor_id
                                    )}'
                                )"
                            >
                                View Report
                            </button>

                        </td>

                    </tr>
                    `
                );

            }
        );
}


/* =========================================================
   CATEGORY
========================================================= */

function renderCategoryPerformance(
    categories
) {

    const container =
        document.getElementById(
            "categoryPerformance"
        );

    container.innerHTML = "";

    categories.forEach(
        category => {

            container.insertAdjacentHTML(
                "beforeend",
                `
                <div class="category-row">

                    <div class="category-title">
                        ${escapeHtml(
                            category.category
                        )}
                    </div>

                    ${metric(
                        "On-Time Delivery",
                        category.on_time_delivery
                    )}

                    ${metric(
                        "Quality Score",
                        category.quality_score
                    )}

                    ${metric(
                        "Order Fulfillment",
                        category.order_fulfillment
                    )}

                    ${metric(
                        "Overall Score",
                        category.overall_score
                    )}

                </div>
                `
            );

        }
    );
}


function metric(
    label,
    value
) {

    return `
        <div>

            <div class="metric-label">

                <span>
                    ${label}
                </span>

                <strong>
                    ${number(value)}
                </strong>

            </div>

            <div class="metric-bar">

                <div
                    style="width:${Math.min(
                        100,
                        Number(value || 0)
                    )}%"
                ></div>

            </div>

        </div>
    `;
}


/* =========================================================
   INSIGHTS
========================================================= */

function renderInsights(
    insights
) {

    const container =
        document.getElementById(
            "insights"
        );

    container.innerHTML = "";

    insights.forEach(
        insight => {

            let icon = "●";

            if (
                insight.type ===
                "success"
            ) {
                icon = "✓";
            }

            if (
                insight.type ===
                "warning"
            ) {
                icon = "!";
            }

            container.insertAdjacentHTML(
                "beforeend",
                `
                <div class="insight">

                    <div class="insight-icon">
                        ${icon}
                    </div>

                    <div>

                        <strong>
                            ${escapeHtml(
                                insight.title
                            )}
                        </strong>

                        <p>
                            ${escapeHtml(
                                insight.message
                            )}
                        </p>

                    </div>

                </div>
                `
            );

        }
    );
}


/* =========================================================
   EXPORT PDF
========================================================= */

async function exportPDF() {

    const query =
        buildQuery();

    const url =
        `${API}/api/admin/reports/export/pdf/vendor-performance` +
        (
            query
                ? `?${query}`
                : ""
        );

    try {

        const response =
            await apiRequest(url);

        const blob =
            await response.blob();

        downloadBlob(
            blob,
            "vendor-performance-report.pdf"
        );

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================================
   EXPORT EXCEL
========================================================= */

async function exportExcel() {

    const query =
        buildQuery();

    const url =
        `${API}/api/admin/reports/export/excel/vendor-performance` +
        (
            query
                ? `?${query}`
                : ""
        );

    try {

        const response =
            await apiRequest(url);

        const blob =
            await response.blob();

        downloadBlob(
            blob,
            "vendor-performance-report.xlsx"
        );

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================================
   DOWNLOAD BLOB
========================================================= */

function downloadBlob(
    blob,
    filename
) {

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
}


/* =========================================================
   SCHEDULE MODAL
========================================================= */

function openScheduleModal() {

    document
        .getElementById(
            "scheduleModal"
        )
        .classList.remove(
            "hidden"
        );
}


function closeScheduleModal() {

    document
        .getElementById(
            "scheduleModal"
        )
        .classList.add(
            "hidden"
        );
}


async function saveSchedule() {

    const data = {

        report_name:
            document.getElementById(
                "scheduleName"
            ).value,

        schedule:
            document.getElementById(
                "scheduleType"
            ).value,

        recipients:
            document.getElementById(
                "scheduleRecipients"
            ).value,

        format:
            document.getElementById(
                "scheduleFormat"
            ).value,

        status: "Active",

        is_active: true

    };

    try {

        await apiRequest(
            `${API}/api/admin/reports/scheduled`,
            {
                method: "POST",
                body: JSON.stringify(data)
            }
        );

        alert(
            "Report schedule saved successfully."
        );

        closeScheduleModal();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================================
   HELPERS
========================================================= */

function number(
    value
) {

    return Number(
        value || 0
    ).toFixed(1);
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


function showError(
    message
) {

    console.error(
        message
    );
}


async function loadVendorProfile() {

    try {

        const token = getAuthToken();

        if (!token) {
            throw new Error(
                "Authentication token missing."
            );
        }


        /* =====================================================
           DECODE JWT
        ===================================================== */

        const parts = token.split(".");

        if (parts.length !== 3) {

            throw new Error(
                "Invalid JWT token."
            );
        }


        const base64Payload =
            parts[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");


        const payload =
            JSON.parse(
                atob(base64Payload)
            );


        console.log(
            "JWT payload:",
            payload
        );


        /* =====================================================
           GET VENDOR ID
        ===================================================== */

        const vendorId =
            payload.vendor_id ||
            payload.vendorId ||
            payload.vendor_id_string ||
            payload.sub;


        if (!vendorId) {

            throw new Error(
                "Vendor ID not found inside JWT token."
            );
        }


        console.log(
            "Vendor ID from JWT:",
            vendorId
        );


        /* =====================================================
           SAVE GLOBAL VENDOR ID
        ===================================================== */

        currentVendorId =
            vendorId;


        /* =====================================================
           LOAD VENDOR PROFILE
        ===================================================== */

        const response =
            await apiRequest(
                `${API}/api/vendor/profile/${encodeURIComponent(vendorId)}`
            );


        const data =
            await response.json();


        console.log(
            "Vendor profile response:",
            data
        );


        /* =====================================================
           EXTRACT VENDOR
        ===================================================== */

        const vendor =
            data?.vendor ||
            data;


        if (!vendor) {

            throw new Error(
                "Vendor profile was not returned."
            );
        }


        currentVendor =
            vendor;


        /* =====================================================
           FINAL VENDOR ID
        ===================================================== */

        currentVendorId =
            vendor.vendor_id ||
            vendor.vendorId ||
            vendor.id ||
            vendorId;


        /* =====================================================
           VENDOR NAME
        ===================================================== */

        const vendorName =
            vendor.vendor_name ||
            vendor.company_name ||
            vendor.name ||
            "Vendor";


        /* =====================================================
           SIDEBAR VENDOR NAME
        ===================================================== */

        const sidebarName =
            document.getElementById(
                "sidebarVendorName"
            );


        if (sidebarName) {

            sidebarName.textContent =
                vendorName;
        }


        /* =====================================================
           HEADER VENDOR NAME
        ===================================================== */

        const headerName =
            document.getElementById(
                "headerVendorName"
            );


        if (headerName) {

            headerName.textContent =
                vendorName;
        }


        /* =====================================================
           SIDEBAR VENDOR ID
        ===================================================== */

        const sidebarId =
            document.getElementById(
                "sidebarVendorId"
            );


        if (sidebarId) {

            sidebarId.textContent =
                currentVendorId;
        }


        /* =====================================================
           HEADER VENDOR ID
        ===================================================== */

        const headerVendorId =
            document.getElementById(
                "headerVendorId"
            );


        if (headerVendorId) {

            headerVendorId.textContent =
                currentVendorId;
        }


        /* =====================================================
           LOG
        ===================================================== */

        console.log(
            "Final Vendor ID:",
            currentVendorId
        );


        return currentVendorId;


    } catch (error) {

        console.error(
            "Unable to load vendor profile:",
            error
        );

        throw error;
    }
}


/* =========================================================
   EVENTS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadFilters();

        await loadPerformanceReport();

        await loadVendorProfile();

        document
            .getElementById(
                "applyFilters"
            )
            .addEventListener(
                "click",
                loadPerformanceReport
            );


        document
            .getElementById(
                "exportButton"
            )
            .addEventListener(
                "click",
                exportPDF
            );


        document
            .getElementById(
                "downloadExcel"
            )
            .addEventListener(
                "click",
                exportExcel
            );


        document
            .getElementById(
                "scheduleButton"
            )
            .addEventListener(
                "click",
                openScheduleModal
            );


        document
            .getElementById(
                "scheduleMonthly"
            )
            .addEventListener(
                "click",
                openScheduleModal
            );


        document
            .getElementById(
                "closeModal"
            )
            .addEventListener(
                "click",
                closeScheduleModal
            );


        document
            .getElementById(
                "saveSchedule"
            )
            .addEventListener(
                "click",
                saveSchedule
            );

    }
);