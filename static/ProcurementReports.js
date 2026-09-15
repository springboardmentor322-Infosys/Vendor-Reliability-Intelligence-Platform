const API_BASE = "http://127.0.0.1:8000";

let spendTrendChart = null;
let categoryChart = null;
let budgetChart = null;

let reportData = null;


function getToken() {
    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
    );
}

async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            credentials: "include",
            headers
        }
    );

    if (!response.ok) {

        let message = `HTTP ${response.status}`;

        try {
            const error = await response.json();

            if (typeof error.detail === "string") {
                message = error.detail;
            } else if (Array.isArray(error.detail)) {
                message = error.detail
                    .map(item =>
                        `${item.loc ? item.loc.join(".") : ""}: ${item.msg}`
                    )
                    .join("\n");
            } else if (error.detail) {
                message = JSON.stringify(error.detail);
            }

        } catch (e) {}

        throw new Error(message);
    }

    return response.json();
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeDates();
        initializeEvents();

        await loadUser();
        await loadReports();

    }
);


// ============================================================
// DEFAULT DATES
// ============================================================

function initializeDates() {

    const today = new Date();

    const firstDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    document.getElementById(
        "fromDate"
    ).value = formatInputDate(firstDay);

    document.getElementById(
        "toDate"
    ).value = formatInputDate(today);
}


function formatInputDate(date) {

    return date.toISOString().split("T")[0];

}


// ============================================================
// EVENTS
// ============================================================

function initializeEvents() {

    document
        .getElementById("fromDate")
        .addEventListener(
            "change",
            loadReports
        );

    document
        .getElementById("toDate")
        .addEventListener(
            "change",
            loadReports
        );


    document
        .getElementById("exportButton")
        .addEventListener(
            "click",
            exportReport
        );


    document
        .getElementById("scheduleButton")
        .addEventListener(
            "click",
            () => {
                document
                    .getElementById("scheduleModal")
                    .classList.add("show");
            }
        );


    document
        .getElementById("closeModal")
        .addEventListener(
            "click",
            closeScheduleModal
        );


    document
        .getElementById("saveSchedule")
        .addEventListener(
            "click",
            saveSchedule
        );


    document
        .querySelectorAll(".tab")
        .forEach(
            tab => {

                tab.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(".tab")
                            .forEach(
                                x =>
                                    x.classList.remove(
                                        "active"
                                    )
                            );

                        tab.classList.add(
                            "active"
                        );

                        handleTab(
                            tab.dataset.tab
                        );
                    }
                );

            }
        );

}


// ============================================================
// LOAD USER
// ============================================================

async function loadUser() {

    try {

        const data = await apiFetch(
            "/api/procurement/profile/me"
        );

        const name =
            data.user.name || "James Anderson";

        const role =
            data.user.role || "Procurement Manager";

        document.getElementById(
            "headerUserName"
        ).textContent = name;

        document.getElementById(
            "headerUserRole"
        ).textContent = role;

        document.getElementById(
            "sidebarUserName"
        ).textContent = name;

        document.getElementById(
            "sidebarUserRole"
        ).textContent = role;

    } catch (error) {

        console.warn(
            "Could not load current user:",
            error
        );

    }
}


function openProfile(){
    window.location.href="/ProcurementProfile";
}


// ============================================================
// LOAD REPORTS
// ============================================================

async function loadReports() {

    try {

        showLoading();

        const fromDate =
            document.getElementById(
                "fromDate"
            ).value;

        const toDate =
            document.getElementById(
                "toDate"
            ).value;


        const params =
            new URLSearchParams();


        if (fromDate) {

            params.append(
                "from_date",
                fromDate
            );

        }


        if (toDate) {

            params.append(
                "to_date",
                toDate
            );

        }


        // ====================================================
        // AUTHENTICATED API REQUEST
        // ====================================================

        reportData =
            await apiFetch(
                `/api/reports/dashboard?${params.toString()}`
            );


        // ====================================================
        // RENDER REPORT
        // ====================================================

        renderDashboard(
            reportData
        );


    } catch (error) {

        console.error(
            "Reports loading failed:",
            error
        );

        showError(
            error.message
        );

    }

}


// ============================================================
// RENDER
// ============================================================

function renderDashboard(data) {

    renderKPIs(
        data.kpis
    );

    renderSpendTrend(
        data.spend_trend
    );

    renderCategories(
        data.spend_by_category
    );

    renderTopVendors(
        data.top_vendors
    );

    renderDepartments(
        data.department_spend
    );

    renderMonthlySummary(
        data.monthly_summary
    );

    renderBudgetChart(
        data.spend_trend
    );

    renderRecentReports(
        data.recent_reports
    );

}


// ============================================================
// KPI
// ============================================================

function renderKPIs(kpis) {

    document.getElementById(
        "totalSpend"
    ).textContent =
        money(kpis.total_spend);


    document.getElementById(
        "totalPOs"
    ).textContent =
        Number(kpis.total_pos || 0)
            .toLocaleString();


    document.getElementById(
        "avgPOValue"
    ).textContent =
        money(kpis.average_po_value);


    document.getElementById(
        "onTimeDelivery"
    ).textContent =
        `${Number(
            kpis.on_time_delivery || 0
        ).toFixed(1)}%`;


    document.getElementById(
        "savingsYTD"
    ).textContent =
        money(kpis.savings_ytd);


    document.getElementById(
        "invoiceCycle"
    ).textContent =
        `${Number(
            kpis.invoice_cycle_time || 0
        ).toFixed(1)} Days`;

}


// ============================================================
// SPEND TREND
// ============================================================

function renderSpendTrend(rows) {

    const labels =
        rows.map(
            row => row.month
        );

    const actual =
        rows.map(
            row => row.actual
        );

    const budget =
        rows.map(
            row => row.budget
        );


    const ctx =
        document
            .getElementById(
                "spendTrendChart"
            );


    if (spendTrendChart) {
        spendTrendChart.destroy();
    }


    spendTrendChart =
        new Chart(
            ctx,
            {
                type: "line",

                data: {
                    labels,

                    datasets: [

                        {
                            label:
                                "Actual Spend",

                            data:
                                actual,

                            borderColor:
                                "#4b20e2",

                            backgroundColor:
                                "rgba(75,32,226,.08)",

                            tension: .35,

                            fill: true,

                            pointRadius: 3
                        },

                        {
                            label:
                                "Budget",

                            data:
                                budget,

                            borderColor:
                                "#0a9e5a",

                            backgroundColor:
                                "transparent",

                            tension: .35,

                            pointRadius: 3
                        }

                    ]
                },

                options: chartOptions()

            }
        );

}


// ============================================================
// CATEGORY
// ============================================================

function renderCategories(rows) {

    const list =
        document.getElementById(
            "categoryList"
        );

    list.innerHTML = "";


    const total =
        rows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                Number(row.amount || 0),
            0
        );


    document.getElementById(
        "categoryTotal"
    ).textContent =
        money(total);


    rows.forEach(
        (
            row,
            index
        ) => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "category-item";

            item.innerHTML = `

                <span
                    class="category-dot"
                    style="
                        background:${getCategoryColor(index)}
                    "
                ></span>

                <div>
                    <strong>
                        ${escapeHtml(
                            row.category
                        )}
                    </strong>

                    <span>
                        ${Number(
                            row.percent || 0
                        ).toFixed(1)}%
                    </span>
                </div>

                <div class="category-value">
                    ${money(row.amount)}
                </div>

            `;

            list.appendChild(
                item
            );

        }
    );


    const ctx =
        document
            .getElementById(
                "categoryChart"
            );


    if (categoryChart) {
        categoryChart.destroy();
    }


    categoryChart =
        new Chart(
            ctx,
            {
                type: "doughnut",

                data: {

                    labels:
                        rows.map(
                            x => x.category
                        ),

                    datasets: [
                        {
                            data:
                                rows.map(
                                    x =>
                                        x.amount
                                ),

                            backgroundColor: [
                                "#4b20e2",
                                "#1675df",
                                "#16a66a",
                                "#ef781d",
                                "#ed3146",
                                "#7a53e8",
                                "#5a78c7"
                            ],

                            borderWidth: 0
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "70%",
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }

            }
        );

}


function getCategoryColor(index) {

    const colors = [
        "#4b20e2",
        "#1675df",
        "#16a66a",
        "#ef781d",
        "#ed3146",
        "#7a53e8",
        "#5a78c7"
    ];

    return colors[
        index % colors.length
    ];

}


// ============================================================
// TOP VENDORS
// ============================================================

function renderTopVendors(rows) {

    const container =
        document.getElementById(
            "topVendors"
        );

    container.innerHTML = "";


    rows.forEach(
        row => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "table-row";

            div.innerHTML = `

                <span class="vendor-name">
                    ${escapeHtml(
                        row.vendor
                    )}
                </span>

                <span>
                    ${money(
                        row.spend
                    )}
                </span>

                <span>
                    ${Number(
                        row.percent || 0
                    ).toFixed(1)}%
                </span>

            `;

            container.appendChild(
                div
            );

        }
    );

}


// ============================================================
// DEPARTMENTS
// ============================================================

function renderDepartments(rows) {

    const container =
        document.getElementById(
            "departmentList"
        );

    container.innerHTML = "";


    const max =
        Math.max(
            ...rows.map(
                row =>
                    Number(
                        row.amount || 0
                    )
            ),
            1
        );


    rows.forEach(
        (
            row,
            index
        ) => {

            const percentage =
                (
                    Number(
                        row.amount || 0
                    ) /
                    max
                ) * 100;


            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "department-row";

            div.innerHTML = `

                <div class="department-label">

                    <span>
                        ${escapeHtml(
                            row.department
                        )}
                    </span>

                    <strong>
                        ${money(
                            row.amount
                        )}
                    </strong>

                </div>

                <div
                    class="department-progress"
                >
                    <div
                        style="
                            width:${percentage}%;
                            background:${getCategoryColor(index)}
                        "
                    ></div>
                </div>

            `;

            container.appendChild(
                div
            );

        }
    );

}


// ============================================================
// MONTHLY SUMMARY
// ============================================================

function renderMonthlySummary(rows) {

    const container =
        document.getElementById(
            "monthlySummary"
        );

    container.innerHTML = "";


    rows.forEach(
        row => {

            const variance =
                Number(
                    row.variance || 0
                );

            const varianceClass =
                variance <= 0
                    ? "variance-positive"
                    : "variance-negative";


            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "table-row monthly-row";

            div.innerHTML = `

                <span>
                    ${escapeHtml(
                        row.month
                    )}
                </span>

                <span>
                    ${money(
                        row.actual
                    )}
                </span>

                <span>
                    ${money(
                        row.budget
                    )}
                </span>

                <span
                    class="${varianceClass}"
                >
                    ${money(
                        Math.abs(
                            variance
                        )
                    )}
                </span>

                <span
                    class="${varianceClass}"
                >
                    ${Number(
                        row.variance_percent ||
                        0
                    ).toFixed(1)}%
                </span>

            `;

            container.appendChild(
                div
            );

        }
    );

}


// ============================================================
// BUDGET CHART
// ============================================================

function renderBudgetChart(rows) {

    const ctx =
        document
            .getElementById(
                "budgetChart"
            );


    if (budgetChart) {
        budgetChart.destroy();
    }


    budgetChart =
        new Chart(
            ctx,
            {
                type: "bar",

                data: {

                    labels:
                        rows.map(
                            x => x.month
                        ),

                    datasets: [

                        {
                            label:
                                "Actual Spend",

                            data:
                                rows.map(
                                    x =>
                                        x.actual
                                ),

                            backgroundColor:
                                "#4b20e2",

                            borderRadius: 4
                        },

                        {
                            label:
                                "Budget",

                            data:
                                rows.map(
                                    x =>
                                        x.budget
                                ),

                            backgroundColor:
                                "#16a66a",

                            borderRadius: 4
                        }

                    ]
                },

                options: chartOptions()

            }
        );

}


// ============================================================
// RECENT REPORTS
// ============================================================

function renderRecentReports(rows) {

    const container =
        document.getElementById(
            "recentReports"
        );

    container.innerHTML = "";


    rows.forEach(
        row => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "recent-report";


            const generated =
                row.generated_at
                    ? new Date(
                        row.generated_at
                    ).toLocaleString()
                    : "Not available";


            div.innerHTML = `

                <div class="recent-report-icon">
                    <i class="fa-regular fa-file-lines"></i>
                </div>

                <div>

                    <strong>
                        ${escapeHtml(
                            row.report_name
                        )}
                    </strong>

                    <small>
                        ${generated}
                    </small>

                </div>

                <button
                    class="download-report"
                    onclick="
                        downloadReport(
                            ${row.id}
                        )
                    "
                >
                    <i
                        class="fa-solid fa-download"
                    ></i>
                </button>

            `;

            container.appendChild(
                div
            );

        }
    );

}


// ============================================================
// REPORT DOWNLOAD
// ============================================================

async function downloadReport(id) {

    window.open(
        `${API_BASE}/api/admin/reports/${id}/download`,
        "_blank"
    );

}


// ============================================================
// EXPORT
// ============================================================

function exportReport() {

    if (!reportData) {
        return;
    }


    const rows = [
        [
            "Month",
            "Actual Spend",
            "Budget",
            "Variance",
            "Variance %"
        ]
    ];


    reportData.monthly_summary
        .forEach(
            row => {

                rows.push([
                    row.month,
                    row.actual,
                    row.budget,
                    row.variance,
                    row.variance_percent
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
                                `"${String(
                                    value
                                ).replace(
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
                type: "text/csv;charset=utf-8;"
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

    link.href = url;

    link.download =
        "procurement-report.csv";

    link.click();

    URL.revokeObjectURL(
        url
    );

}


// ============================================================
// SCHEDULE
// ============================================================

async function saveSchedule() {

    const name =
        document.getElementById(
            "scheduleName"
        ).value.trim();

    const frequency =
        document.getElementById(
            "scheduleFrequency"
        ).value;

    const format =
        document.getElementById(
            "scheduleFormat"
        ).value;

    const recipients =
        document.getElementById(
            "scheduleRecipients"
        ).value.trim();


    if (!name) {

        alert(
            "Enter a report name."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/api/admin/reports/scheduled`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({

                        report_name:
                            name,

                        schedule:
                            frequency,

                        next_run:
                            null,

                        recipients:
                            recipients || null,

                        format:
                            format,

                        status:
                            "Active",

                        is_active:
                            true

                    })
                }
            );


        if (!response.ok) {

            const error =
                await response
                    .json()
                    .catch(
                        () => ({})
                    );

            throw new Error(
                error.detail ||
                `HTTP ${response.status}`
            );

        }


        alert(
            "Report scheduled successfully."
        );


        closeScheduleModal();

    } catch (error) {

        console.error(error);

        alert(
            `Unable to schedule report: ${error.message}`
        );

    }

}


function closeScheduleModal() {

    document
        .getElementById(
            "scheduleModal"
        )
        .classList.remove(
            "show"
        );

}


// ============================================================
// TABS
// ============================================================

function handleTab(tab) {

    if (!reportData) {
        return;
    }


    switch (tab) {

        case "spend":
            break;

        case "purchase":
            window.location.href =
                "/PurchaseOrders";
            break;

        case "vendors":
            window.location.href =
                "/Vendors";
            break;

        case "delivery":
            window.location.href =
                "/OrderTracking";
            break;

        case "invoices":
            window.location.href =
                "/Invoices";
            break;

        case "compliance":
            window.location.href =
                "/Reports";
            break;

    }

}


// ============================================================
// CHART OPTIONS
// ============================================================

function chartOptions() {

    return {

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
                callbacks: {

                    label:
                        context =>
                            `${context.dataset.label}: ${money(
                                context.raw
                            )}`

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
                    }
                }
            },

            y: {

                beginAtZero: true,

                grid: {
                    color:
                        "#edf0f6"
                },

                ticks: {

                    font: {
                        size: 9
                    },

                    callback:
                        value =>
                            compactMoney(
                                value
                            )
                }

            }

        }

    };

}


// ============================================================
// HELPERS
// ============================================================

function money(value) {

    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0
        }
    ).format(
        Number(value || 0)
    );

}


function compactMoney(value) {

    const number =
        Number(value || 0);

    if (number >= 1000000) {
        return `$${(
            number / 1000000
        ).toFixed(1)}M`;
    }

    if (number >= 1000) {
        return `$${(
            number / 1000
        ).toFixed(0)}K`;
    }

    return `$${number}`;

}


function escapeHtml(value) {

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


function showLoading() {

    // Optional loading state.
}


function showError(message) {

    console.error(
        "Reports error:",
        message
    );

    alert(
        `Unable to load Reports: ${message}`
    );

}