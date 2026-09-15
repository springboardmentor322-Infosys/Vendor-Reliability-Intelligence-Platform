"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE = "http://127.0.0.1:8000";

const AP_ENDPOINT =
    `${API_BASE}/api/finance/accounts-payable/dashboard`;

let currentPage = 1;
let pageSize = 5;

let trendChart = null;
let agingChart = null;


/* =========================================================
   AUTH
========================================================= */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token") ||
        ""
    );
}


/* =========================================================
   API
========================================================= */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
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
            "Authentication required."
        );

        return null;
    }

    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `HTTP ${response.status}: ${text}`
        );
    }

    return response.json();
}


/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(value) {

    const number =
        Number(value || 0);

    return (
        "₹ " +
        number.toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        )
    );
}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

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


/* =========================================================
   DEFAULT DATES
========================================================= */

function setDefaultDates() {

    const today =
        new Date();

    const sevenDaysAgo =
        new Date(today);

    sevenDaysAgo.setDate(
        today.getDate() - 7
    );

    document.getElementById(
        "fromDate"
    ).value =
        sevenDaysAgo
            .toISOString()
            .slice(0, 10);

    document.getElementById(
        "toDate"
    ).value =
        today
            .toISOString()
            .slice(0, 10);
}


/* =========================================================
   BUILD URL
========================================================= */

function buildDashboardUrl() {

    const params =
        new URLSearchParams();

    const from =
        document.getElementById(
            "fromDate"
        ).value;

    const to =
        document.getElementById(
            "toDate"
        ).value;

    const search =
        document.getElementById(
            "globalSearch"
        ).value.trim();

    if (from) {
        params.set(
            "from_date",
            from
        );
    }

    if (to) {
        params.set(
            "to_date",
            to
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

    return (
        AP_ENDPOINT +
        "?" +
        params.toString()
    );
}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        showLoading();

        const data =
            await apiFetch(
                buildDashboardUrl()
            );

        if (!data) {
            return;
        }

        renderKPIs(
            data.kpis
        );

        renderTrend(
            data.trend
        );

        renderAging(
            data.aging
        );

        renderTopVendors(
            data.top_vendors
        );

        renderBills(
            data.recent_bills,
            data.pagination
        );

        renderPaymentSummary(
            data.payment_summary
        );

        renderOverdue(
            data.overdue_count,
            data.overdue_amount
        );

    } catch (error) {

        console.error(
            "Accounts Payable Load Error:",
            error
        );

        showError(
            error.message
        );
    }
}


/* =========================================================
   KPI
========================================================= */

function renderKPIs(kpis) {

    document.getElementById(
        "totalPayable"
    ).textContent =
        formatCurrency(
            kpis.total_payable
        );

    document.getElementById(
        "overdueAmount"
    ).textContent =
        formatCurrency(
            kpis.overdue_amount
        );

    document.getElementById(
        "dueSoon"
    ).textContent =
        formatCurrency(
            kpis.due_within_7_days
        );

    document.getElementById(
        "paidThisMonth"
    ).textContent =
        formatCurrency(
            kpis.paid_this_month
        );

    document.getElementById(
        "pendingBills"
    ).textContent =
        Number(
            kpis.pending_bills || 0
        ).toLocaleString(
            "en-IN"
        );
}


/* =========================================================
   TREND CHART
========================================================= */

function renderTrend(data) {

    const canvas =
        document.getElementById(
            "payablesTrendChart"
        );

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
                        data.months || [],

                    datasets: [

                        {
                            label:
                                "Total Payable",

                            data:
                                data.total_payable || [],

                            borderWidth: 2,

                            tension: .35,

                            pointRadius: 3,

                            fill: false
                        },

                        {
                            label:
                                "Paid Amount",

                            data:
                                data.paid_amount || [],

                            borderWidth: 2,

                            tension: .35,

                            pointRadius: 3,

                            fill: false
                        }

                    ]
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

                            beginAtZero: true,

                            ticks: {

                                font: {
                                    size: 9
                                },

                                callback:
                                    function(value) {

                                        return (
                                            "₹" +
                                            Number(
                                                value
                                            ) / 1000 +
                                            "L"
                                        );
                                    }
                            }
                        },

                        x: {

                            ticks: {
                                font: {
                                    size: 9
                                }
                            }
                        }

                    }
                }
            }
        );
}


/* =========================================================
   AGEING
========================================================= */

function renderAging(items) {

    const canvas =
        document.getElementById(
            "agingChart"
        );

    const legend =
        document.getElementById(
            "agingLegend"
        );

    if (!canvas) {
        return;
    }

    const labels =
        items.map(
            item => item.label
        );

    const values =
        items.map(
            item => item.amount
        );

    const total =
        values.reduce(
            (sum, value) =>
                sum + Number(value || 0),
            0
        );

    document.getElementById(
        "agingTotal"
    ).textContent =
        formatCurrency(total);

    if (agingChart) {
        agingChart.destroy();
    }

    agingChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels,

                    datasets: [
                        {
                            data: values,
                            borderWidth: 2
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "62%",

                    plugins: {

                        legend: {
                            display: false
                        }
                    }
                }
            }
        );

    legend.innerHTML = "";

    items.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "age-item";

            div.innerHTML = `
                <div class="age-item-header">
                    <span>${escapeHtml(item.label)}</span>
                    <strong>${Number(item.percentage || 0).toFixed(1)}%</strong>
                </div>

                <small>
                    ${formatCurrency(item.amount)}
                </small>

                <div class="age-bar">
                    <span style="width:${Math.min(Number(item.percentage || 0), 100)}%"></span>
                </div>
            `;

            legend.appendChild(div);
        }
    );
}


/* =========================================================
   TOP VENDORS
========================================================= */

function renderTopVendors(vendors) {

    const container =
        document.getElementById(
            "topVendors"
        );

    container.innerHTML = "";

    if (!vendors || vendors.length === 0) {

        container.innerHTML =
            `<div class="empty" style="font-size:10px;">
                No outstanding vendors
            </div>`;

        return;
    }

    vendors.forEach(
        vendor => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "vendor-item";

            div.innerHTML = `

                <div class="rank">
                    ${vendor.rank}
                </div>

                <div class="vendor-details">

                    <strong>
                        ${escapeHtml(vendor.vendor)}
                    </strong>

                    <div class="vendor-bar">
                        <span
                            style="width:${Math.min(Number(vendor.percentage || 0), 100)}%"
                        ></span>
                    </div>

                </div>

                <div class="vendor-amount">
                    ${formatCurrency(vendor.amount)}
                </div>
            `;

            container.appendChild(div);
        }
    );
}


/* =========================================================
   RECENT BILLS
========================================================= */

function renderBills(
    bills,
    pagination
) {

    const tbody =
        document.getElementById(
            "billsBody"
        );

    tbody.innerHTML = "";

    if (!bills || bills.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    No bills found
                </td>
            </tr>
        `;

        renderPagination(
            pagination
        );

        return;
    }

    bills.forEach(
        bill => {

            const tr =
                document.createElement(
                    "tr"
                );

            const status =
                String(
                    bill.status || "Pending"
                );

            const statusClass =
                status
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        "-"
                    );

            tr.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(bill.invoice_no)}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(bill.vendor)}
                </td>

                <td>
                    ${formatDate(bill.bill_date)}
                </td>

                <td>
                    ${formatDate(bill.due_date)}
                </td>

                <td>
                    ${formatCurrency(bill.amount)}
                </td>

                <td>
                    <span class="status ${statusClass}">
                        ${escapeHtml(status)}
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        }
    );

    const total =
        Number(
            pagination?.total || 0
        );

    const start =
        total === 0
            ? 0
            : (
                (pagination.page - 1)
                * pagination.page_size
            ) + 1;

    const end =
        Math.min(
            pagination.page *
            pagination.page_size,
            total
        );

    document.getElementById(
        "billInfo"
    ).textContent =
        `Showing ${start} to ${end} of ${total} bills`;

    renderPagination(
        pagination
    );
}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(
    pagination
) {

    const container =
        document.getElementById(
            "paginationButtons"
        );

    container.innerHTML = "";

    const pages =
        Number(
            pagination?.pages || 1
        );

    if (pages <= 1) {
        return;
    }

    for (
        let page = 1;
        page <= pages;
        page++
    ) {

        if (
            page > 5 &&
            page !== pages
        ) {
            if (page === 6) {
                container.innerHTML +=
                    `<span>...</span>`;
            }

            continue;
        }

        const button =
            document.createElement(
                "button"
            );

        button.textContent =
            page;

        if (
            page === Number(
                pagination.page
            )
        ) {
            button.classList.add(
                "active"
            );
        }

        button.onclick =
            () => {

                currentPage =
                    page;

                loadDashboard();
            };

        container.appendChild(
            button
        );
    }
}


/* =========================================================
   PAYMENT SUMMARY
========================================================= */

function renderPaymentSummary(
    summary
) {

    document.getElementById(
        "summaryPayments"
    ).textContent =
        formatCurrency(
            summary.total_payments_made
        );

    document.getElementById(
        "summaryBills"
    ).textContent =
        Number(
            summary.total_bills_paid || 0
        ).toLocaleString(
            "en-IN"
        );

    document.getElementById(
        "summaryDays"
    ).textContent =
        `${Number(
            summary.average_payment_days || 0
        ).toFixed(0)} Days`;

    document.getElementById(
        "summaryEarly"
    ).textContent =
        formatCurrency(
            summary.early_payments
        );

    document.getElementById(
        "summaryDiscount"
    ).textContent =
        formatCurrency(
            summary.discounts_taken
        );
}


/* =========================================================
   OVERDUE
========================================================= */

function renderOverdue(
    count,
    amount
) {

    document.getElementById(
        "overdueMessage"
    ).textContent =
        `You have ${Number(count || 0).toLocaleString("en-IN")} overdue bills totaling ${formatCurrency(amount)}.`;
}


/* =========================================================
   USER PROFILE
========================================================= */

async function loadProfile() {

    try {

        const profile =
            await apiFetch(
                `${API_BASE}/api/finance/profile`
            );

        if (!profile) {
            return;
        }

        const name =
            profile.name ||
            "Finance Officer";

        document.getElementById(
            "profileName"
        ).textContent =
            name;

        document.getElementById(
            "sideName"
        ).textContent =
            name;

    } catch (error) {

        console.warn(
            "Profile load failed:",
            error
        );
    }
}


/* =========================================================
   SEARCH
========================================================= */

let searchTimer = null;

document.getElementById(
    "globalSearch"
).addEventListener(
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


/* =========================================================
   DATE FILTER
========================================================= */

document.getElementById(
    "applyFilter"
).addEventListener(
    "click",
    () => {

        currentPage = 1;

        loadDashboard();
    }
);


/* =========================================================
   LOADING
========================================================= */

function showLoading() {

    document.getElementById(
        "billsBody"
    ).innerHTML = `
        <tr>
            <td colspan="6">
                Loading Accounts Payable data...
            </td>
        </tr>
    `;
}


/* =========================================================
   ERROR
========================================================= */

function showError(message) {

    document.getElementById(
        "billsBody"
    ).innerHTML = `
        <tr>
            <td colspan="6">
                Unable to load Accounts Payable data.
            </td>
        </tr>
    `;

    console.error(message);
}


/* =========================================================
   ESCAPE HTML
========================================================= */

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


/* =========================================================
   QUICK ACTIONS
   ========================================================= */

function createBill() {
    window.location.href = "/AccountsPayable/CreateBill";
}


function recordPayment() {
    window.location.href = "/AccountsPayable/RecordPayment";
}


function viewVendorPayments() {
    window.location.href = "/AccountsPayable/VendorPayments";
}


function viewPendingBills() {

    const statusFilter =
        document.getElementById("statusFilter");

    if (statusFilter) {
        statusFilter.value = "Pending";

        statusFilter.dispatchEvent(
            new Event("change")
        );
    }

    document
        .querySelector(".bills-panel")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}


function viewOverdueBills() {

    const statusFilter =
        document.getElementById("statusFilter");

    if (statusFilter) {
        statusFilter.value = "Overdue";

        statusFilter.dispatchEvent(
            new Event("change")
        );
    }

    document
        .querySelector(".bills-panel")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}


function exportPayablesReport() {

    if (typeof exportReport === "function") {
        exportReport();
        return;
    }

    const rows =
        document.querySelectorAll(
            ".bills-panel table tbody tr"
        );

    let csv = [];

    csv.push([
        "Invoice",
        "Vendor",
        "Due Date",
        "Amount",
        "Status"
    ].join(","));

    rows.forEach(row => {

        const cells =
            row.querySelectorAll("td");

        if (cells.length >= 5) {

            csv.push([
                `"${cells[0].innerText.trim()}"`,
                `"${cells[1].innerText.trim()}"`,
                `"${cells[2].innerText.trim()}"`,
                `"${cells[3].innerText.trim()}"`,
                `"${cells[4].innerText.trim()}"`
            ].join(","));
        }

    });

    const blob =
        new Blob(
            [csv.join("\n")],
            { type: "text/csv;charset=utf-8;" }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "accounts_payable_report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setDefaultDates();

        await loadProfile();

        await loadDashboard();

    }
);