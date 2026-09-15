/* ==========================================================
   VendorIQ
   Invoices & Payments
========================================================== */


const API = "http://127.0.0.1:8000";


let currentPage = 1;

const pageLimit = 8;

let totalPages = 1;

let trendChart = null;

let paymentChart = null;


/* ==========================================================
   DATE RANGE FILTER
========================================================== */

const dashboardStartDate =
    document.getElementById("dashboardStartDate");

const dashboardEndDate =
    document.getElementById("dashboardEndDate");

const invoiceStartDate =
    document.getElementById("invoiceStartDate");

const invoiceEndDate =
    document.getElementById("invoiceEndDate");


function getDateInputValue(id) {
    const element = document.getElementById(id);

    return element
        ? element.value
        : "";
}


function isValidDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
        return false;
    }

    return startDate <= endDate;
}


function getSelectedDateRange() {
    const startDate =
        getDateInputValue("dashboardStartDate");

    const endDate =
        getDateInputValue("dashboardEndDate");

    return {
        start_date: startDate,
        end_date: endDate
    };
}


function setDateInputValue(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.value = value;
    }
}


function syncDateInputs(startDate, endDate) {
    if (!isValidDateRange(startDate, endDate)) {
        alert("Start date cannot be later than end date.");
        return false;
    }

    setDateInputValue(
        "dashboardStartDate",
        startDate
    );

    setDateInputValue(
        "dashboardEndDate",
        endDate
    );

    setDateInputValue(
        "invoiceStartDate",
        startDate
    );

    setDateInputValue(
        "invoiceEndDate",
        endDate
    );

    return true;
}


function handleDateChange(startInput, endInput) {
    if (!startInput || !endInput) {
        return;
    }

    const startDate =
        startInput.value;

    const endDate =
        endInput.value;

    if (!isValidDateRange(startDate, endDate)) {
        alert("Start date cannot be later than end date.");
        return;
    }

    syncDateInputs(
        startDate,
        endDate
    );

    currentPage = 1;

    loadDashboard();
    loadInvoices();
}


function bindDateRangeEvents() {
    const dashboardStart =
        document.getElementById("dashboardStartDate");

    const dashboardEnd =
        document.getElementById("dashboardEndDate");

    const invoiceStart =
        document.getElementById("invoiceStartDate");

    const invoiceEnd =
        document.getElementById("invoiceEndDate");


    if (dashboardStart && dashboardEnd) {
        dashboardStart.addEventListener(
            "change",
            function () {
                handleDateChange(
                    dashboardStart,
                    dashboardEnd
                );
            }
        );

        dashboardEnd.addEventListener(
            "change",
            function () {
                handleDateChange(
                    dashboardStart,
                    dashboardEnd
                );
            }
        );
    }


    if (invoiceStart && invoiceEnd) {
        invoiceStart.addEventListener(
            "change",
            function () {
                handleDateChange(
                    invoiceStart,
                    invoiceEnd
                );
            }
        );

        invoiceEnd.addEventListener(
            "change",
            function () {
                handleDateChange(
                    invoiceStart,
                    invoiceEnd
                );
            }
        );
    }
}


/* ==========================================================
   AUTHENTICATION
========================================================== */

function getAuthToken() {

    return (

        localStorage.getItem("access_token") ||

        localStorage.getItem("token") ||

        localStorage.getItem("accessToken") ||

        sessionStorage.getItem("access_token") ||

        sessionStorage.getItem("token") ||

        sessionStorage.getItem("accessToken") ||

        null

    );

}


/* ==========================================================
   API REQUEST
========================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getAuthToken();


    const headers = {

        "Accept":
            "application/json",

        ...(options.headers || {})

    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    const responseText =
        await response.text();


    if (!response.ok) {

        throw new Error(
            `API ${response.status}: ${responseText}`
        );

    }


    if (
        !contentType.includes(
            "application/json"
        )
    ) {

        throw new Error(
            "API did not return JSON."
        );

    }


    return JSON.parse(
        responseText
    );

}


/* ==========================================================
   MONEY FORMAT
========================================================== */

function money(value) {

    value =
        Number(value || 0);


    if (
        Math.abs(value) >=
        1000000
    ) {

        return "$" +
            (
                value / 1000000
            ).toFixed(2) +
            "M";

    }


    if (
        Math.abs(value) >=
        1000
    ) {

        return "$" +
            (
                value / 1000
            ).toFixed(1) +
            "K";

    }


    return "$" +
        value.toLocaleString(
            "en-US",
            {
                maximumFractionDigits: 0
            }
        );

}


/* ==========================================================
   EXACT MONEY
========================================================== */

function exactMoney(value) {

    return "$" +
        Number(value || 0)
            .toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            );

}


/* ==========================================================
   LOAD DASHBOARD
========================================================== */

async function loadDashboard() {
    try {
        const dateRange =
            getSelectedDateRange();

        const params =
            new URLSearchParams();


        if (
            dateRange.start_date &&
            dateRange.end_date
        ) {
            params.set(
                "start_date",
                dateRange.start_date
            );

            params.set(
                "end_date",
                dateRange.end_date
            );
        }


        const queryString =
            params.toString();

        const endpoint =
            queryString
                ? `${API}/api/admin/invoices/dashboard?${queryString}`
                : `${API}/api/admin/invoices/dashboard`;


        const data =
            await apiFetch(endpoint);


        updateKPIs(
            data.kpis || {}
        );

        updatePaymentDistribution(
            data.payment_distribution || {}
        );

        updateTrends(
            data.trends || []
        );

        updateTopVendors(
            data.top_vendors || []
        );

        updateAging(
            data.aging || {}
        );
    }

    catch (error) {
        console.error(
            "Invoice dashboard error:",
            error
        );
    }
}


/* ==========================================================
   UPDATE KPI
========================================================== */

function updateKPIs(kpis) {

    document.getElementById(
        "totalInvoices"
    ).textContent =
        Number(
            kpis.total_invoices || 0
        ).toLocaleString();


    document.getElementById(
        "totalInvoiceAmount"
    ).textContent =
        money(
            kpis.total_invoice_amount
        );


    document.getElementById(
        "paidAmount"
    ).textContent =
        money(
            kpis.paid_amount
        );


    document.getElementById(
        "pendingAmount"
    ).textContent =
        money(
            kpis.pending_amount
        );


    document.getElementById(
        "overdueAmount"
    ).textContent =
        money(
            kpis.overdue_amount
        );


    document.getElementById(
        "onTimeRate"
    ).textContent =
        `${Number(
            kpis.on_time_payment_rate || 0
        ).toFixed(1)}%`;


    document.getElementById(
        "summaryInvoice"
    ).textContent =
        exactMoney(
            kpis.total_invoice_amount
        );


    document.getElementById(
        "summaryPaid"
    ).textContent =
        exactMoney(
            kpis.paid_amount
        );


    document.getElementById(
        "summaryPending"
    ).textContent =
        exactMoney(
            kpis.pending_amount
        );


    document.getElementById(
        "summaryOverdue"
    ).textContent =
        exactMoney(
            kpis.overdue_amount
        );

}


/* ==========================================================
   PAYMENT DISTRIBUTION
========================================================== */

function updatePaymentDistribution(
    distribution
) {

    const paid =
        Number(
            distribution.paid || 0
        );


    const pending =
        Number(
            distribution.pending || 0
        );


    const overdue =
        Number(
            distribution.overdue || 0
        );


    const total =
        paid +
        pending +
        overdue;


    document.getElementById(
        "paidCount"
    ).textContent =
        paid.toLocaleString();


    document.getElementById(
        "pendingCount"
    ).textContent =
        pending.toLocaleString();


    document.getElementById(
        "overdueCount"
    ).textContent =
        overdue.toLocaleString();


    document.getElementById(
        "donutTotal"
    ).textContent =
        total.toLocaleString();


    createPaymentChart(
        paid,
        pending,
        overdue
    );

}


/* ==========================================================
   PAYMENT CHART
========================================================== */

function createPaymentChart(
    paid,
    pending,
    overdue
) {

    const canvas =
        document.getElementById(
            "paymentChart"
        );


    if (paymentChart) {

        paymentChart.destroy();

    }


    paymentChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Paid",
                        "Pending",
                        "Overdue"
                    ],

                    datasets: [

                        {

                            data: [
                                paid,
                                pending,
                                overdue
                            ],

                            backgroundColor: [
                                "#20ae74",
                                "#f39a21",
                                "#f34a4a"
                            ],

                            borderWidth: 0

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

}


/* ==========================================================
   TREND CHART
========================================================== */

function updateTrends(
    trends
) {

    const labels =
        trends.map(
            item => item.month
        );


    const invoiceAmounts =
        trends.map(
            item =>
                Number(
                    item.invoice_amount || 0
                )
        );


    const paidAmounts =
        trends.map(
            item =>
                Number(
                    item.paid_amount || 0
                )
        );


    const pendingAmounts =
        trends.map(
            item =>
                Number(
                    item.pending_amount || 0
                )
        );


    const overdueAmounts =
        trends.map(
            item =>
                Number(
                    item.overdue_amount || 0
                )
        );


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

                    labels,

                    datasets: [

                        {

                            label:
                                "Invoice Amount",

                            data:
                                invoiceAmounts,

                            borderColor:
                                "#4235f0",

                            backgroundColor:
                                "transparent",

                            borderWidth: 2,

                            pointRadius: 3,

                            tension: .35

                        },


                        {

                            label:
                                "Paid Amount",

                            data:
                                paidAmounts,

                            borderColor:
                                "#18a978",

                            backgroundColor:
                                "transparent",

                            borderWidth: 2,

                            pointRadius: 3,

                            tension: .35

                        },


                        {

                            label:
                                "Pending Amount",

                            data:
                                pendingAmounts,

                            borderColor:
                                "#f1911c",

                            backgroundColor:
                                "transparent",

                            borderWidth: 2,

                            pointRadius: 3,

                            tension: .35

                        },


                        {

                            label:
                                "Overdue Amount",

                            data:
                                overdueAmounts,

                            borderColor:
                                "#f13f43",

                            backgroundColor:
                                "transparent",

                            borderWidth: 2,

                            pointRadius: 3,

                            tension: .35

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        mode: "index",

                        intersect: false

                    },

                    plugins: {

                        legend: {

                            display: true,

                            position: "top",

                            align: "start",

                            labels: {

                                boxWidth: 10,

                                boxHeight: 2,

                                usePointStyle: true,

                                pointStyle: "line",

                                font: {
                                    size: 8
                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                font: {
                                    size: 8
                                },

                                callback: function(value) {

                                    if (
                                        value >=
                                        1000000
                                    ) {

                                        return "$" +
                                            (
                                                value /
                                                1000000
                                            ).toFixed(1) +
                                            "M";

                                    }


                                    if (
                                        value >=
                                        1000
                                    ) {

                                        return "$" +
                                            (
                                                value /
                                                1000
                                            ).toFixed(0) +
                                            "K";

                                    }


                                    return "$" +
                                        value;

                                }

                            },

                            grid: {

                                color:
                                    "#edf0f5"

                            }

                        },

                        x: {

                            ticks: {

                                font: {
                                    size: 8
                                }

                            },

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            }
        );

}


/* ==========================================================
   TOP VENDORS
========================================================== */

function updateTopVendors(
    vendors
) {

    const container =
        document.getElementById(
            "topVendors"
        );


    if (
        !vendors ||
        vendors.length === 0
    ) {

        container.innerHTML =
            `<div class="empty">
                No vendor data available.
             </div>`;

        return;

    }


    container.innerHTML =
        vendors.map(
            vendor => `

                <div class="vendor-row">

                    <span>
                        ${escapeHTML(
                            vendor.vendor
                        )}
                    </span>

                    <strong>
                        ${exactMoney(
                            vendor.amount
                        )}
                    </strong>

                </div>

            `
        ).join("");

}


/* ==========================================================
   AGING
========================================================== */

function updateAging(
    aging
) {

    document.getElementById(
        "aging0"
    ).textContent =
        exactMoney(
            aging["0_30"]
        );


    document.getElementById(
        "aging31"
    ).textContent =
        exactMoney(
            aging["31_60"]
        );


    document.getElementById(
        "aging61"
    ).textContent =
        exactMoney(
            aging["61_90"]
        );


    document.getElementById(
        "aging90"
    ).textContent =
        exactMoney(
            aging["90_plus"]
        );

}


/* ==========================================================
   LOAD INVOICES
========================================================== */

async function loadInvoices() {
    try {
        const searchElement =
            document.getElementById("invoiceSearch");

        const statusElement =
            document.getElementById("statusFilter");


        const search =
            searchElement
                ? searchElement.value.trim()
                : "";


        const status =
            statusElement
                ? statusElement.value
                : "";


        const params =
            new URLSearchParams();


        params.set(
            "page",
            currentPage
        );

        params.set(
            "limit",
            pageLimit
        );


        if (search) {
            params.set(
                "search",
                search
            );
        }


        if (
            status &&
            status !== "all"
        ) {
            params.set(
                "status",
                status
            );
        }


        const dateRange =
            getSelectedDateRange();


        if (
            dateRange.start_date &&
            dateRange.end_date
        ) {
            params.set(
                "start_date",
                dateRange.start_date
            );

            params.set(
                "end_date",
                dateRange.end_date
            );
        }


        const data =
            await apiFetch(
                `${API}/api/admin/invoices?${params.toString()}`
            );


        renderInvoices(
            data.items || []
        );

        updatePagination(
            data.pagination || {}
        );
    }

    catch (error) {
        console.error(
            "Invoice loading error:",
            error
        );


        const tableBody =
            document.getElementById(
                "invoiceTableBody"
            );


        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        style="text-align:center"
                    >
                        Unable to load invoices.
                    </td>
                </tr>
            `;
        }
    }
}


/* ==========================================================
   RENDER INVOICES
========================================================== */

function renderInvoices(
    invoices
) {

    const tbody =
        document.getElementById(
            "invoiceTableBody"
        );


    if (
        !invoices ||
        invoices.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="10"
                    style="text-align:center"
                >

                    No invoices found.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        invoices.map(
            invoice => {

                const statusClass =
                    String(
                        invoice.status
                    )
                    .toLowerCase();


                let paymentClass =
                    "pending";


                return `

                    <tr>

                        <td>

                            <strong>
                                ${escapeHTML(
                                    invoice.invoice_number
                                )}
                            </strong>

                        </td>


                        <td>
                            ${escapeHTML(
                                invoice.po_number
                            )}
                        </td>


                        <td>
                            ${invoice.invoice_date}
                        </td>


                        <td>
                            ${invoice.due_date}
                        </td>


                        <td>
                            ${exactMoney(
                                invoice.amount
                            )}
                        </td>


                        <td>
                            ${exactMoney(
                                invoice.paid_amount
                            )}
                        </td>


                        <td>

                            <span
                                class="status ${statusClass}"
                            >

                                ${escapeHTML(
                                    invoice.status
                                )}

                            </span>

                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="action-button"
                                    title="View"
                                    onclick="viewInvoice(${invoice.id})"
                                >

                                    <i class="fa-regular fa-eye"></i>

                                </button>


                                <button
                                    class="action-button"
                                    title="Mark Paid"
                                    onclick="markInvoicePaid(${invoice.id})"
                                >

                                    <i class="fa-solid fa-download"></i>

                                </button>


                                <button
                                    class="action-button"
                                    title="More"
                                    onclick="invoiceMenu(${invoice.id})"
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


/* ==========================================================
   PAGINATION
========================================================== */

function updatePagination(
    pagination
) {

    totalPages =
        Number(
            pagination.pages || 1
        );


    document.getElementById(
        "tableInfo"
    ).textContent =

        `Showing ${
            pagination.total === 0
                ? 0
                : ((currentPage - 1) *
                   pageLimit) + 1
        } to ${
            Math.min(
                currentPage *
                pageLimit,
                pagination.total
            )
        } of ${
            pagination.total
        } entries`;


    const container =
        document.getElementById(
            "paginationButtons"
        );


    container.innerHTML = "";


    const start =
        Math.max(
            1,
            currentPage - 2
        );


    const end =
        Math.min(
            totalPages,
            currentPage + 2
        );


    for (
        let i = start;
        i <= end;
        i++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "page-number";


        if (
            i === currentPage
        ) {

            button.classList.add(
                "active"
            );

        }


        button.textContent =
            i;


        button.onclick =
            () => {

                currentPage = i;

                loadInvoices();

            };


        container.appendChild(
            button
        );

    }


    document.getElementById(
        "previousButton"
    ).disabled =
        currentPage <= 1;


    document.getElementById(
        "nextButton"
    ).disabled =
        currentPage >= totalPages;

}


/* ==========================================================
   PREVIOUS PAGE
========================================================== */

function previousPage() {

    if (
        currentPage > 1
    ) {

        currentPage--;

        loadInvoices();

    }

}


/* ==========================================================
   NEXT PAGE
========================================================== */

function nextPage() {

    if (
        currentPage <
        totalPages
    ) {

        currentPage++;

        loadInvoices();

    }

}


/* ==========================================================
   VIEW INVOICE
========================================================== */

async function viewInvoice(
    invoiceId
) {

    try {

        const invoice =
            await apiFetch(
                `${API}/api/admin/invoices/${invoiceId}`
            );


        alert(

            `Invoice: ${invoice.invoice_number}\n\n` +

            `PO: ${invoice.po_number}\n` +

            `Amount: ${exactMoney(
                invoice.amount
            )}\n` +

            `Paid: ${exactMoney(
                invoice.paid_amount
            )}\n` +

            `Status: ${invoice.status}\n`

        );

    }

    catch (error) {

        console.error(
            error
        );

        alert(
            "Unable to load invoice."
        );

    }

}


/* ==========================================================
   MARK PAID
========================================================== */

async function markInvoicePaid(
    invoiceId
) {

    const confirmed =
        confirm(
            "Mark this invoice as Paid?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await apiFetch(
            `${API}/api/admin/invoices/${invoiceId}/status`,
            {

                method: "PUT",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(
                        {
                            status: "Paid"
                        }
                    )

            }
        );


        await loadDashboard();

        await loadInvoices();


        alert(
            "Invoice marked as Paid."
        );

    }

    catch (error) {

        console.error(
            error
        );

        alert(
            "Unable to update invoice."
        );

    }

}


/* ==========================================================
   CREATE INVOICE
========================================================== */

function createInvoice() {

    alert(
        "Use your existing Admin Add Invoice page here."
    );

}


/* ==========================================================
   RECORD PAYMENT
========================================================== */

function recordPayment() {

    const invoiceId =
        prompt(
            "Enter Invoice ID to record payment:"
        );


    if (!invoiceId) {

        return;

    }


    markInvoicePaid(
        Number(invoiceId)
    );

}


/* ==========================================================
   IMPORT INVOICES
========================================================== */

function importInvoices() {

    const input =
        document.createElement(
            "input"
        );


    input.type =
        "file";


    input.accept =
        ".csv";


    input.onchange =
        function() {

            const file =
                this.files[0];


            if (!file) {

                return;

            }


            alert(
                `Selected file: ${file.name}\n\n` +
                "CSV import endpoint can be connected here."
            );

        };


    input.click();

}


/* ==========================================================
   EXPORT
========================================================== */

async function exportInvoices() {

    try {

        const data =
            await apiFetch(
                `${API}/api/admin/invoices?limit=100`
            );


        let csv =
            "Invoice Number,PO Number,Invoice Date,Due Date,Amount,Paid Amount,Status,\n";


        data.items.forEach(
            invoice => {

                csv += [

                    invoice.invoice_number,

                    invoice.po_number,

                    invoice.invoice_date,

                    invoice.due_date,

                    invoice.amount,

                    invoice.paid_amount,

                    invoice.status,

                ].map(
                    value =>
                        `"${String(
                            value
                        ).replace(
                            /"/g,
                            '""'
                        )}"`
                ).join(",") + "\n";

            }
        );


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
            "invoices-report.csv";


        link.click();


        URL.revokeObjectURL(
            url
        );

    }

    catch (error) {

        console.error(
            error
        );

        alert(
            "Unable to export invoices."
        );

    }

}


/* ==========================================================
   INVOICE MENU
========================================================== */

function invoiceMenu(
    invoiceId
) {

    const choice =
        prompt(
            "Enter action:\n\n" +
            "1 = View Invoice\n" +
            "2 = Mark Paid"
        );


    if (choice === "1") {

        viewInvoice(
            invoiceId
        );

    }

    else if (choice === "2") {

        markInvoicePaid(
            invoiceId
        );

    }

}


/* ==========================================================
   SEARCH
========================================================== */

let searchTimer;


document.getElementById(
    "invoiceSearch"
).addEventListener(
    "input",
    function() {

        clearTimeout(
            searchTimer
        );


        searchTimer =
            setTimeout(
                function() {

                    currentPage = 1;

                    loadInvoices();

                },
                400
            );

    }
);


/* ==========================================================
   STATUS FILTER
========================================================== */

document.getElementById(
    "statusFilter"
).addEventListener(
    "change",
    function() {

        currentPage = 1;

        loadInvoices();

    }
);


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHTML(
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


function openAdminProfile() {

    window.location.href =
        "/admin/profile";

}


// ============================================================
// HELPER: SET TEXT
// ============================================================

function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {

        element.textContent =
            value ?? "";

    }
}


function updateHeader(user) {

    const name =
        user.name || "Admin User";

    const email =
        user.email || "";

    const role =
        user.role || "Administrator";


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


async function loadAdminProfile() {

    try {

        const data = await apiFetch(
            `${API}/adminprofile`
        );

        console.log(
            "Admin profile:",
            data
        );

        // If API returns:
        // { name, email, role }
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
   INITIALIZATION
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        bindDateRangeEvents();

        loadDashboard();

        loadInvoices();
    }
);