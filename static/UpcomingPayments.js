"use strict";


/* ============================================================
   VENDORIQ
   UPCOMING PAYMENTS
============================================================ */


/* ============================================================
   API CONFIGURATION
============================================================ */

const API_BASE =
    "http://127.0.0.1:8000";


const API_ENDPOINTS = {

    dashboard:
        "/api/vendor/invoices/dashboard",

    invoices:
        "/api/vendor/invoices",

    paymentMethods:
        "/api/vendor/payments/methods"

};


/* ============================================================
   STATE
============================================================ */

let vendorId = null;

let dashboardData = null;

let invoices = [];

let paymentMethods = [];

let currentCalendarDate =
    new Date();


/* ============================================================
   DOM
============================================================ */

const $ = selector =>
    document.querySelector(selector);


const $$ = selector =>
    document.querySelectorAll(selector);


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializePage
);


async function initializePage() {

    try {

        vendorId =
            getVendorId();

        if (!vendorId) {

            throw new Error(
                "Vendor ID not found. Please login again."
            );

        }


        setupEventListeners();


        populateCalendarMonthSelector();


        await loadDashboard();


        await loadInvoices();


        await loadPaymentMethods();


        renderCalendar();


        hideLoading();

    }

    catch (error) {

        console.error(
            "Initialization error:",
            error
        );

        showError(
            error.message ||
            "Unable to load payment information."
        );

        hideLoading();

    }

}


/* ============================================================
   GET VENDOR ID
============================================================ */

function getVendorId() {

    const possibleKeys = [

        "vendor_id",

        "vendorId",

        "vendorID",

        "current_vendor_id"

    ];


    for (const key of possibleKeys) {

        const value =
            localStorage.getItem(key);

        if (value) {

            return value;

        }

    }


    /*
     * Development fallback.
     *
     * Remove this fallback when your login
     * always stores vendor_id in localStorage.
     */

    return "VND0000001";

}


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token");


    const headers = {

        "Content-Type":
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


    if (!response.ok) {

        let detail =
            `HTTP ${response.status}`;

        try {

            const errorData =
                await response.json();

            if (errorData.detail) {

                detail =
                    errorData.detail;

            }

        }

        catch (_) {

            // Ignore JSON parsing failure

        }


        throw new Error(detail);

    }


    return response.json();

}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadDashboard() {

    const year =
        new Date().getFullYear();


    const url =
        `${API_BASE}` +
        `/api/vendor/invoices/dashboard/${encodeURIComponent(vendorId)}` +
        `?year=${year}`;


    console.log(
        "Loading dashboard:",
        url
    );


    dashboardData =
        await apiFetch(url);


    console.log(
        "Dashboard response:",
        dashboardData
    );


    updateVendorInformation();


    updateSummaryCards();


    renderNextPayments();


    renderPaymentSchedule();


    updatePaymentAlerts();


    updateCalendarFromDashboard();

}


/* ============================================================
   LOAD INVOICES
============================================================ */

async function loadInvoices() {

    const url =
        `${API_BASE}` +
        `${API_ENDPOINTS.invoices}` +
        `?vendor_id=${encodeURIComponent(vendorId)}` +
        `&skip=0&limit=100`;


    invoices =
        await apiFetch(url)
            .then(
                data =>
                    data.invoices || []
            );


    console.log(
        "Invoices:",
        invoices
    );


    renderPaymentSchedule();

    updatePaymentMethodFilter();

}


/* ============================================================
   LOAD PAYMENT METHODS
============================================================ */

async function loadPaymentMethods() {

    const url =
        `${API_BASE}` +
        `${API_ENDPOINTS.paymentMethods}` +
        `?vendor_id=${encodeURIComponent(vendorId)}`;


    paymentMethods =
        await apiFetch(url);


    console.log(
        "Payment methods:",
        paymentMethods
    );


    renderPaymentMethods();

    updatePaymentMethodFilter();

}


/* ============================================================
   VENDOR INFORMATION
============================================================ */

function updateVendorInformation() {

    /*
     * Your dashboard endpoint currently does not return
     * vendor_name.
     *
     * Therefore this keeps the existing displayed name.
     *
     * If your login stores vendor_name, use it here.
     */

    const vendorName =
        localStorage.getItem(
            "vendor_name"
        ) ||
        localStorage.getItem(
            "vendorName"
        ) ||
        "TechBuild Solutions";


    $("#headerVendorName")
        .textContent =
        vendorName;


    $("#sidebarVendorName")
        .textContent =
        vendorName;


    $("#sidebarVendorId")
        .textContent =
        `Vendor ID: ${vendorId}`;

}


/* ============================================================
   SUMMARY CARDS
============================================================ */

function updateSummaryCards() {

    if (!dashboardData) {

        return;

    }


    const upcoming =
        dashboardData.upcoming_payments ||
        [];


    const today =
        startOfDay(
            new Date()
        );


    const weekEnd =
        addDays(
            today,
            7
        );


    const dueThisWeek =
        upcoming.filter(
            invoice => {

                if (!invoice.due_date) {

                    return false;

                }


                const due =
                    parseDate(
                        invoice.due_date
                    );


                return (
                    due >= today &&
                    due <= weekEnd
                );

            }
        );


    const dueThisWeekAmount =
        dueThisWeek.reduce(
            (
                total,
                invoice
            ) =>
                total +
                Number(
                    invoice.amount || 0
                ),
            0
        );


    const scheduled =
        upcoming.filter(
            invoice =>
                normalizeStatus(
                    invoice.status
                ) ===
                "scheduled"
        );


    const scheduledAmount =
        scheduled.reduce(
            (
                total,
                invoice
            ) =>
                total +
                Number(
                    invoice.amount || 0
                ),
            0
        );


    const overdue =
        invoices.filter(
            invoice => {

                if (
                    normalizeStatus(
                        invoice.status
                    ) === "overdue"
                ) {

                    return true;

                }


                if (!invoice.due_date) {

                    return false;

                }


                return (
                    parseDate(
                        invoice.due_date
                    ) <
                    today &&
                    normalizeStatus(
                        invoice.status
                    ) !== "paid"
                );

            }
        );


    const overdueAmount =
        overdue.reduce(
            (
                total,
                invoice
            ) =>
                total +
                Number(
                    invoice.amount || 0
                ),
            0
        );


    $("#upcomingCount")
        .textContent =
        upcoming.length;


    $("#dueThisWeek")
        .textContent =
        formatCurrency(
            dueThisWeekAmount
        );


    $("#dueThisWeekCount")
        .textContent =
        `${dueThisWeek.length} invoice${dueThisWeek.length === 1 ? "" : "s"}`;


    $("#scheduledAmount")
        .textContent =
        formatCurrency(
            scheduledAmount
        );


    $("#scheduledCount")
        .textContent =
        `${scheduled.length} payment${scheduled.length === 1 ? "" : "s"} scheduled`;


    $("#attentionAmount")
        .textContent =
        formatCurrency(
            overdueAmount
        );


    $("#attentionCount")
        .textContent =
        `${overdue.length} payment${overdue.length === 1 ? "" : "s"} overdue`;

}


/* ============================================================
   NEXT PAYMENTS
============================================================ */

function renderNextPayments() {

    const container =
        $("#nextPayments");


    const upcoming =
        dashboardData?.upcoming_payments ||
        [];


    if (!upcoming.length) {

        container.innerHTML = `
            <div class="empty-state">
                No upcoming payments.
            </div>
        `;

        return;

    }


    container.innerHTML =
        upcoming
            .slice(0, 5)
            .map(
                invoice =>
                    createNextPaymentHTML(
                        invoice
                    )
            )
            .join("");

}


/* ============================================================
   NEXT PAYMENT HTML
============================================================ */

function createNextPaymentHTML(
    invoice
) {

    const dueDate =
        invoice.due_date
            ? parseDate(
                invoice.due_date
            )
            : null;


    const day =
        dueDate
            ? String(
                dueDate.getDate()
            ).padStart(
                2,
                "0"
            )
            : "--";


    const month =
        dueDate
            ? dueDate
                .toLocaleString(
                    "en-US",
                    {
                        month: "short"
                    }
                )
            : "";


    const status =
        normalizeStatus(
            invoice.status
        );


    const statusClass =
        getStatusClass(
            status
        );


    const dueText =
        getDueText(
            dueDate
        );


    return `

        <div
            class="next-payment"
            data-invoice-id="${invoice.id}"
        >

            <div
                class="payment-date
                ${status === "pending" ? "orange" : ""}"
            >

                <strong>
                    ${day}
                </strong>

                <span>
                    ${month}
                </span>

            </div>


            <div class="next-payment-info">

                <strong>
                    ${escapeHTML(
                        invoice.invoice_number ||
                        "-"
                    )}
                </strong>

                <span>
                    ${invoice.po_number
                        ? escapeHTML(
                            invoice.po_number
                        )
                        : invoice.po_id
                            ? `PO-${invoice.po_id}`
                            : "No PO"}
                </span>

            </div>


            <div class="next-payment-amount">

                <strong>
                    ${formatCurrency(
                        invoice.amount
                    )}
                </strong>

                <small>
                    ${dueText}
                </small>

            </div>


            <span
                class="status-badge
                ${statusClass}"
            >
                ${capitalize(
                    invoice.status ||
                    "Pending"
                )}
            </span>

        </div>

    `;

}


/* ============================================================
   PAYMENT TABLE
============================================================ */

function renderPaymentSchedule() {

    const tbody =
        $("#paymentTableBody");


    if (!tbody) {

        return;

    }


    let data =
        invoices.length
            ? invoices
            : (
                dashboardData?.upcoming_payments ||
                []
            );


    const search =
        ($("#invoiceSearch")?.value || "")
            .trim()
            .toLowerCase();


    const status =
        $("#statusFilter")?.value ||
        "all";


    const method =
        $("#methodFilter")?.value ||
        "all";


    data =
        data.filter(
            invoice => {

                const invoiceNumber =
                    String(
                        invoice.invoice_number ||
                        ""
                    ).toLowerCase();


                const poNumber =
                    String(
                        invoice.po_number ||
                        invoice.po_id ||
                        ""
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    invoiceNumber.includes(
                        search
                    ) ||
                    poNumber.includes(
                        search
                    );


                const normalizedInvoiceStatus =
                    normalizeStatus(
                        invoice.status
                    );


                const matchesStatus =
                    status === "all" ||
                    normalizedInvoiceStatus ===
                    normalizeStatus(status);


                /*
                 * Invoices do not currently contain
                 * payment_method in your InvoiceResponse.
                 *
                 * Therefore method filtering is only
                 * applied when payment_method exists.
                 */

                const invoiceMethod =
                    invoice.payment_method ||
                    "";


                const matchesMethod =
                    method === "all" ||
                    !invoiceMethod ||
                    invoiceMethod === method;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesMethod
                );

            }
        );


    $("#paymentCount")
        .textContent =
        `${data.length} payment${data.length === 1 ? "" : "s"}`;


    if (!data.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="text-align:center;padding:30px"
                >
                    No payment records found.
                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        data
            .map(
                invoice =>
                    createTableRow(
                        invoice
                    )
            )
            .join("");


    bindTableActions();

}


/* ============================================================
   TABLE ROW
============================================================ */

function createTableRow(
    invoice
) {

    const status =
        normalizeStatus(
            invoice.status
        );


    const dueDate =
        invoice.due_date
            ? parseDate(
                invoice.due_date
            )
            : null;


    const invoiceDate =
        invoice.invoice_date
            ? parseDate(
                invoice.invoice_date
            )
            : null;


    const paymentMethod =
        invoice.payment_method ||
        getDefaultPaymentMethodName();


    let dueWarning = "";


    if (dueDate) {

        const today =
            startOfDay(
                new Date()
            );


        if (
            dueDate < today &&
            status !== "paid"
        ) {

            const days =
                differenceInDays(
                    today,
                    dueDate
                );


            dueWarning =
                `<span class="due-warning">
                    ${days} day${days === 1 ? "" : "s"} overdue
                </span>`;

        }

        else if (
            dueDate >= today &&
            differenceInDays(
                dueDate,
                today
            ) <= 7
        ) {

            const days =
                differenceInDays(
                    dueDate,
                    today
                );


            dueWarning =
                `<span class="due-warning">
                    ${days === 0
                        ? "Due today"
                        : `Due in ${days} days`}
                </span>`;

        }

    }


    return `

        <tr>

            <td>
                <strong>
                    ${escapeHTML(
                        invoice.invoice_number ||
                        "-"
                    )}
                </strong>
            </td>


            <td>

                ${invoice.po_number
                    ? escapeHTML(
                        invoice.po_number
                    )
                    : invoice.po_id
                        ? `PO-${invoice.po_id}`
                        : "-"}

            </td>


            <td>

                ${
                    invoiceDate
                        ? formatDate(
                            invoiceDate
                        )
                        : "-"
                }

            </td>


            <td>

                ${
                    dueDate
                        ? formatDate(
                            dueDate
                        )
                        : "-"
                }

                ${dueWarning}

            </td>


            <td class="amount">

                ${formatCurrency(
                    invoice.amount
                )}

            </td>


            <td>

                ${escapeHTML(
                    paymentMethod
                )}

            </td>


            <td>

                <span
                    class="status-badge
                    ${getStatusClass(status)}"
                >
                    ${capitalize(
                        invoice.status ||
                        "Pending"
                    )}
                </span>

            </td>


            <td>

                <div class="actions">

                    <button
                        class="action-button"
                        data-action="view"
                        data-id="${invoice.id}"
                        title="View Invoice"
                    >

                        <i class="fa-regular fa-eye"></i>

                    </button>


                    <button
                        class="action-button"
                        data-action="download"
                        data-id="${invoice.id}"
                        title="Download"
                    >

                        <i class="fa-solid fa-download"></i>

                    </button>

                </div>

            </td>

        </tr>

    `;

}


/* ============================================================
   TABLE ACTIONS
============================================================ */

function bindTableActions() {

    $$(".action-button")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const action =
                            button.dataset.action;


                        const id =
                            button.dataset.id;


                        if (
                            action === "view"
                        ) {

                            await viewInvoice(
                                id
                            );

                        }


                        if (
                            action === "download"
                        ) {

                            downloadInvoice(
                                id
                            );

                        }

                    }
                );

            }
        );

}


/* ============================================================
   VIEW INVOICE
============================================================ */

async function viewInvoice(
    invoiceId
) {

    try {

        const url =
            `${API_BASE}` +
            `${API_ENDPOINTS.invoices}` +
            `/${invoiceId}` +
            `?vendor_id=${encodeURIComponent(vendorId)}`;


        const invoice =
            await apiFetch(url);


        showInvoiceModal(
            invoice
        );

    }

    catch (error) {

        console.error(
            "Invoice error:",
            error
        );

        alert(
            error.message ||
            "Unable to load invoice."
        );

    }

}


/* ============================================================
   MODAL
============================================================ */

function showInvoiceModal(
    invoice
) {

    const details =
        $("#invoiceDetails");


    details.innerHTML = `

        <div class="detail-grid">

            <div class="detail-item">

                <span>
                    Invoice Number
                </span>

                <strong>
                    ${escapeHTML(
                        invoice.invoice_number ||
                        "-"
                    )}
                </strong>

            </div>


            <div class="detail-item">

                <span>
                    Status
                </span>

                <strong>
                    ${escapeHTML(
                        invoice.status ||
                        "-"
                    )}
                </strong>

            </div>


            <div class="detail-item">

                <span>
                    Amount
                </span>

                <strong>
                    ${formatCurrency(
                        invoice.amount
                    )}
                </strong>

            </div>


            <div class="detail-item">

                <span>
                    PO Number
                </span>

                <strong>
                    ${
                        invoice.po_number ||
                        invoice.po_id ||
                        "-"
                    }
                </strong>

            </div>


            <div class="detail-item">

                <span>
                    Invoice Date
                </span>

                <strong>
                    ${
                        invoice.invoice_date
                            ? formatDate(
                                parseDate(
                                    invoice.invoice_date
                                )
                            )
                            : "-"
                    }
                </strong>

            </div>


            <div class="detail-item">

                <span>
                    Due Date
                </span>

                <strong>
                    ${
                        invoice.due_date
                            ? formatDate(
                                parseDate(
                                    invoice.due_date
                                )
                            )
                            : "-"
                    }
                </strong>

            </div>

        </div>

    `;


    $("#invoiceModal")
        .classList
        .remove("hidden");

}


/* ============================================================
   PAYMENT METHODS
============================================================ */

function renderPaymentMethods() {

    const container =
        $("#paymentMethods");


    if (!paymentMethods.length) {

        container.innerHTML = `

            <div class="empty-state">

                No payment methods configured.

            </div>

        `;

        return;

    }


    /*
     * Group methods by method_type
     */

    const grouped = {};


    paymentMethods.forEach(
        method => {

            const type =
                method.method_type ||
                "Other";


            grouped[type] =
                (
                    grouped[type] ||
                    0
                ) + 1;

        }
    );


    container.innerHTML =
        Object.entries(
            grouped
        )
        .map(
            (
                [type, count]
            ) => `

                <div class="payment-method">

                    <div class="method-icon">

                        <i class="${getPaymentMethodIcon(type)}"></i>

                    </div>


                    <div class="method-info">

                        <strong>
                            ${escapeHTML(type)}
                        </strong>

                        <span>
                            ${getDefaultMethodAccount(type)}
                        </span>

                    </div>


                    <span class="method-count">
                        ${count}
                    </span>

                </div>

            `
        )
        .join("");

}


/* ============================================================
   PAYMENT METHOD FILTER
============================================================ */

function updatePaymentMethodFilter() {

    const select =
        $("#methodFilter");


    if (!select) {

        return;

    }


    const existing =
        new Set(
            [
                ...select.options
            ]
            .map(
                option =>
                    option.value
            )
        );


    paymentMethods.forEach(
        method => {

            const type =
                method.method_type;


            if (
                !type ||
                existing.has(type)
            ) {

                return;

            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                type;


            option.textContent =
                type;


            select.appendChild(
                option
            );


            existing.add(type);

        }
    );

}


/* ============================================================
   PAYMENT ALERTS
============================================================ */

function updatePaymentAlerts() {

    const today =
        startOfDay(
            new Date()
        );


    const weekEnd =
        addDays(
            today,
            7
        );


    const allInvoices =
        invoices.length
            ? invoices
            : (
                dashboardData?.upcoming_payments ||
                []
            );


    const overdue =
        allInvoices.filter(
            invoice => {

                if (
                    normalizeStatus(
                        invoice.status
                    ) === "overdue"
                ) {

                    return true;

                }


                if (!invoice.due_date) {

                    return false;

                }


                return (
                    parseDate(
                        invoice.due_date
                    ) < today &&
                    normalizeStatus(
                        invoice.status
                    ) !== "paid"
                );

            }
        );


    const dueWeek =
        allInvoices.filter(
            invoice => {

                if (!invoice.due_date) {

                    return false;

                }


                const due =
                    parseDate(
                        invoice.due_date
                    );


                return (
                    due >= today &&
                    due <= weekEnd &&
                    normalizeStatus(
                        invoice.status
                    ) !== "paid"
                );

            }
        );


    const scheduled =
        allInvoices.filter(
            invoice =>
                normalizeStatus(
                    invoice.status
                ) === "scheduled"
        );


    $("#overdueAlertCount")
        .textContent =
        overdue.length;


    $("#weekAlertCount")
        .textContent =
        dueWeek.length;


    $("#scheduledAlertCount")
        .textContent =
        scheduled.length;


    updateSideSchedule(
        scheduled,
        allInvoices
    );

}


/* ============================================================
   SIDE SCHEDULE
============================================================ */

function updateSideSchedule(
    scheduled,
    allInvoices
) {

    const scheduledAmount =
        scheduled.reduce(
            (
                total,
                invoice
            ) =>
                total +
                Number(
                    invoice.amount || 0
                ),
            0
        );


    const pending =
        allInvoices.filter(
            invoice =>
                normalizeStatus(
                    invoice.status
                ) === "pending"
        );


    const pendingAmount =
        pending.reduce(
            (
                total,
                invoice
            ) =>
                total +
                Number(
                    invoice.amount || 0
                ),
            0
        );


    const total =
        scheduledAmount +
        pendingAmount;


    const count =
        allInvoices.length;


    const progress =
        count
            ? Math.round(
                (
                    scheduled.length /
                    count
                ) * 100
            )
            : 0;


    $("#scheduledProgressText")
        .textContent =
        `${scheduled.length} / ${count}`;


    $("#scheduledProgress")
        .style.width =
        `${progress}%`;


    $("#sideScheduled")
        .textContent =
        formatCurrency(
            scheduledAmount
        );


    $("#sidePending")
        .textContent =
        formatCurrency(
            pendingAmount
        );


    $("#sideTotal")
        .textContent =
        formatCurrency(
            total
        );

}


/* ============================================================
   CALENDAR
============================================================ */

function populateCalendarMonthSelector() {

    const select =
        $("#calendarMonthSelect");


    select.innerHTML = "";


    for (
        let month = 0;
        month < 12;
        month++
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            month;


        option.textContent =
            new Date(
                2000,
                month,
                1
            )
            .toLocaleString(
                "en-US",
                {
                    month: "long"
                }
            );


        select.appendChild(
            option
        );

    }


    select.value =
        currentCalendarDate.getMonth();


    select.addEventListener(
        "change",
        () => {

            currentCalendarDate.setMonth(
                Number(
                    select.value
                )
            );

            renderCalendar();

        }
    );

}


/* ============================================================
   RENDER CALENDAR
============================================================ */

function renderCalendar() {

    const calendar =
        $("#calendar");


    const year =
        currentCalendarDate.getFullYear();


    const month =
        currentCalendarDate.getMonth();


    $("#calendarMonth")
        .textContent =
        new Date(
            year,
            month,
            1
        )
        .toLocaleString(
            "en-US",
            {
                month: "long",
                year: "numeric"
            }
        );


    const weekdays = [
        "SUN",
        "MON",
        "TUE",
        "WED",
        "THU",
        "FRI",
        "SAT"
    ];


    let html = "";


    weekdays.forEach(
        day => {

            html += `
                <div class="calendar-cell calendar-weekday">
                    ${day}
                </div>
            `;

        }
    );


    const firstDay =
        new Date(
            year,
            month,
            1
        )
        .getDay();


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        )
        .getDate();


    const previousDays =
        new Date(
            year,
            month,
            0
        )
        .getDate();


    const today =
        new Date();


    /*
     * Previous month days
     */

    for (
        let i = firstDay - 1;
        i >= 0;
        i--
    ) {

        html += `
            <div class="calendar-cell">
                <span class="calendar-date muted">
                    ${previousDays - i}
                </span>
            </div>
        `;

    }


    /*
     * Current month
     */

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            new Date(
                year,
                month,
                day
            );


        const isToday =
            date.getFullYear() ===
                today.getFullYear() &&
            date.getMonth() ===
                today.getMonth() &&
            date.getDate() ===
                today.getDate();


        const payments =
            getCalendarPayments(
                date
            );


        let paymentHTML = "";


        payments
            .slice(0, 2)
            .forEach(
                payment => {

                    const status =
                        normalizeStatus(
                            payment.status
                        );


                    const colorClass =
                        status === "overdue"
                            ? "overdue"
                            : status === "pending"
                                ? "pending"
                                : "scheduled";


                    paymentHTML += `

                        <div class="calendar-payment">

                            <i
                                class="dot ${colorClass}"
                            ></i>

                            <span>
                                ${formatCompactCurrency(
                                    payment.amount
                                )}
                            </span>

                        </div>

                    `;

                }
            );


        html += `

            <div
                class="calendar-cell"
                title="${payments.length} payment(s)"
            >

                <span
                    class="calendar-date
                    ${isToday ? "today" : ""}"
                >
                    ${day}
                </span>

                ${paymentHTML}

            </div>

        `;

    }


    /*
     * Fill remaining cells.
     */

    const totalCells =
        firstDay +
        daysInMonth;


    const remaining =
        (
            Math.ceil(
                totalCells / 7
            ) * 7
        ) -
        totalCells;


    for (
        let day = 1;
        day <= remaining;
        day++
    ) {

        html += `
            <div class="calendar-cell">
                <span class="calendar-date muted">
                    ${day}
                </span>
            </div>
        `;

    }


    calendar.innerHTML =
        html;

}


/* ============================================================
   CALENDAR DATA
============================================================ */

function getCalendarPayments(
    targetDate
) {

    const all =
        invoices.length
            ? invoices
            : (
                dashboardData?.upcoming_payments ||
                []
            );


    return all.filter(
        invoice => {

            if (!invoice.due_date) {

                return false;

            }


            const due =
                parseDate(
                    invoice.due_date
                );


            return (
                due.getFullYear() ===
                    targetDate.getFullYear() &&
                due.getMonth() ===
                    targetDate.getMonth() &&
                due.getDate() ===
                    targetDate.getDate()
            );

        }
    );

}


/* ============================================================
   UPDATE CALENDAR
============================================================ */

function updateCalendarFromDashboard() {

    renderCalendar();

}


/* ============================================================
   MONTH NAVIGATION
============================================================ */

$("#previousMonth")
    ?.addEventListener(
        "click",
        () => {

            currentCalendarDate.setMonth(
                currentCalendarDate.getMonth() - 1
            );

            $("#calendarMonthSelect")
                .value =
                currentCalendarDate.getMonth();

            renderCalendar();

        }
    );


$("#nextMonth")
    ?.addEventListener(
        "click",
        () => {

            currentCalendarDate.setMonth(
                currentCalendarDate.getMonth() + 1
            );

            $("#calendarMonthSelect")
                .value =
                currentCalendarDate.getMonth();

            renderCalendar();

        }
    );


/* ============================================================
   EVENT LISTENERS
============================================================ */

function setupEventListeners() {

    $("#invoiceSearch")
        ?.addEventListener(
            "input",
            renderPaymentSchedule
        );


    $("#statusFilter")
        ?.addEventListener(
            "change",
            renderPaymentSchedule
        );


    $("#methodFilter")
        ?.addEventListener(
            "change",
            renderPaymentSchedule
        );


    $("#retryButton")
        ?.addEventListener(
            "click",
            async () => {

                hideError();

                showLoading();

                try {

                    await loadDashboard();

                    await loadInvoices();

                    await loadPaymentMethods();

                    hideLoading();

                }

                catch (error) {

                    showError(
                        error.message
                    );

                    hideLoading();

                }

            }
        );


    $("#closeModal")
        ?.addEventListener(
            "click",
            closeModal
        );


    $("#invoiceModal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "invoiceModal"
                ) {

                    closeModal();

                }

            }
        );


    $("#viewAllButton")
        ?.addEventListener(
            "click",
            () => {

                document
                    .querySelector(
                        ".schedule-panel"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });

            }
        );


    $("#managePaymentMethods")
        ?.addEventListener(
            "click",
            () => {

                window.location.href="/vendor/payment-methods"

            }
        );


    $("#exportButton")
        ?.addEventListener(
            "click",
            exportPayments
        );


    $("#logoutButton")
        ?.addEventListener(
            "click",
            logout
        );

}


/* ============================================================
   EXPORT
============================================================ */

function exportPayments() {

    const rows = [];


    rows.push(
        [
            "Invoice No.",
            "PO Number",
            "Invoice Date",
            "Due Date",
            "Amount",
            "Status"
        ]
    );


    invoices.forEach(
        invoice => {

            rows.push(
                [
                    invoice.invoice_number || "",
                    invoice.po_number ||
                        invoice.po_id ||
                        "",
                    invoice.invoice_date || "",
                    invoice.due_date || "",
                    invoice.amount || 0,
                    invoice.status || ""
                ]
            );

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
        `vendor-payments-${vendorId}.csv`;


    link.click();


    URL.revokeObjectURL(
        url
    );

}


/* ============================================================
   DOWNLOAD INVOICE
============================================================ */

function downloadInvoice(
    invoiceId
) {

    /*
     * Your current backend does not have
     * a PDF/download endpoint.
     *
     * This opens the invoice API response
     * so the user can inspect/save it.
     */

    const url =
        `${API_BASE}` +
        `${API_ENDPOINTS.invoices}` +
        `/${invoiceId}` +
        `?vendor_id=${encodeURIComponent(vendorId)}`;


    window.open(
        url,
        "_blank"
    );

}


/* ============================================================
   CLOSE MODAL
============================================================ */

function closeModal() {

    $("#invoiceModal")
        ?.classList
        .add("hidden");

}


/* ============================================================
   LOGOUT
============================================================ */

function logout() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "jwt_token"
    );

    localStorage.removeItem(
        "vendor_id"
    );

    localStorage.removeItem(
        "vendorId"
    );


    window.location.href =
        "/login";

}


/* ============================================================
   STATUS HELPERS
============================================================ */

function normalizeStatus(
    status
) {

    return String(
        status || ""
    )
    .trim()
    .toLowerCase();

}


function getStatusClass(
    status
) {

    switch (
        normalizeStatus(status)
    ) {

        case "scheduled":
            return "status-scheduled";

        case "pending":
            return "status-pending";

        case "processing":
            return "status-processing";

        case "overdue":
            return "status-overdue";

        default:
            return "status-pending";

    }

}


/* ============================================================
   DUE TEXT
============================================================ */

function getDueText(
    dueDate
) {

    if (!dueDate) {

        return "No due date";

    }


    const today =
        startOfDay(
            new Date()
        );


    const days =
        differenceInDays(
            dueDate,
            today
        );


    if (days < 0) {

        return `${Math.abs(days)} days overdue`;

    }


    if (days === 0) {

        return "Due today";

    }


    if (days === 1) {

        return "Due tomorrow";

    }


    return `Due in ${days} days`;

}


/* ============================================================
   PAYMENT METHOD ICON
============================================================ */

function getPaymentMethodIcon(
    type
) {

    const value =
        normalizeStatus(
            type
        );


    if (
        value.includes("bank")
    ) {

        return "fa-solid fa-building-columns";

    }


    if (
        value.includes("ach")
    ) {

        return "fa-solid fa-money-check-dollar";

    }


    if (
        value.includes("wire")
    ) {

        return "fa-solid fa-money-bill-transfer";

    }


    if (
        value.includes("card")
    ) {

        return "fa-regular fa-credit-card";

    }


    return "fa-solid fa-wallet";

}


/* ============================================================
   DEFAULT METHOD
============================================================ */

function getDefaultPaymentMethodName() {

    const defaultMethod =
        paymentMethods.find(
            method =>
                method.is_default
        );


    return (
        defaultMethod?.method_type ||
        "Not specified"
    );

}


function getDefaultMethodAccount(
    type
) {

    const method =
        paymentMethods.find(
            item =>
                item.method_type === type
        );


    if (!method) {

        return "Payment method";

    }


    if (method.bank_name) {

        return method.bank_name;

    }


    if (method.account_number) {

        const number =
            String(
                method.account_number
            );


        return (
            "•••• " +
            number.slice(-4)
        );

    }


    return "Configured";

}


/* ============================================================
   DATE HELPERS
============================================================ */

function parseDate(
    value
) {

    if (value instanceof Date) {

        return value;

    }


    /*
     * Avoid timezone shifting for
     * YYYY-MM-DD values.
     */

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        const [
            year,
            month,
            day
        ] =
            value
                .split("-")
                .map(Number);


        return new Date(
            year,
            month - 1,
            day
        );

    }


    return new Date(value);

}


function startOfDay(
    date
) {

    const result =
        new Date(date);


    result.setHours(
        0,
        0,
        0,
        0
    );


    return result;

}


function addDays(
    date,
    days
) {

    const result =
        new Date(date);


    result.setDate(
        result.getDate() + days
    );


    return result;

}


function differenceInDays(
    first,
    second
) {

    const a =
        startOfDay(first)
            .getTime();


    const b =
        startOfDay(second)
            .getTime();


    return Math.round(
        (
            a - b
        ) /
        (
            1000 *
            60 *
            60 *
            24
        )
    );

}


/* ============================================================
   FORMATTERS
============================================================ */

function formatCurrency(
    amount
) {

    const value =
        Number(amount || 0);


    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(value);

}


function formatCompactCurrency(
    amount
) {

    const value =
        Number(amount || 0);


    if (value >= 100000) {

        return (
            "₹" +
            (
                value / 100000
            )
            .toFixed(1) +
            "L"
        );

    }


    if (value >= 1000) {

        return (
            "₹" +
            (
                value / 1000
            )
            .toFixed(1) +
            "K"
        );

    }


    return (
        "₹" +
        value.toFixed(0)
    );

}


function formatDate(
    date
) {

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
   GENERAL HELPERS
============================================================ */

function capitalize(
    value
) {

    const string =
        String(value || "");


    return (
        string.charAt(0).toUpperCase() +
        string.slice(1).toLowerCase()
    );

}


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


/* ============================================================
   LOADING / ERROR
============================================================ */

function showLoading() {

    $("#loadingOverlay")
        ?.classList
        .remove("hidden");

}


function hideLoading() {

    $("#loadingOverlay")
        ?.classList
        .add("hidden");

}


function showError(
    message
) {

    $("#errorText")
        .textContent =
        message;


    $("#errorMessage")
        ?.classList
        .remove("hidden");

}


function hideError() {

    $("#errorMessage")
        ?.classList
        .add("hidden");

}