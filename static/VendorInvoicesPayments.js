"use strict";


/* ============================================================
   VENDORIQ
   INVOICES & PAYMENTS
============================================================ */


/* ============================================================
   API CONFIGURATION
============================================================ */

const API = "http://127.0.0.1:8000";


const API_ENDPOINTS = {

    invoices:
        "/api/vendor/invoices",

    payments:
        "/api/vendor/payments",

    profile:
        "/api/vendor/profile"

};


/* ============================================================
   GLOBAL DATA
============================================================ */

let dashboardData = null;

let invoiceChart = null;

let paymentChart = null;

let paymentStatusChart = null;


/* ============================================================
   AUTHENTICATION
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        localStorage.getItem("accessToken") ||
        null
    );
}


/* ============================================================
   VENDOR ID
============================================================ */

function getVendorId() {

    return (
        localStorage.getItem("vendor_id") ||
        localStorage.getItem("vendorId") ||
        localStorage.getItem("vendorID") ||
        null
    );
}


/* ============================================================
   SET VENDOR ID
============================================================ */

function setVendorId(vendorId) {

    if (!vendorId) {
        return;
    }

    localStorage.setItem(
        "vendor_id",
        vendorId
    );

    localStorage.setItem(
        "vendorId",
        vendorId
    );
}


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})
    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }


    console.log(
        "API REQUEST:",
        options.method || "GET",
        url
    );


    let response;


    try {

        response =
            await fetch(
                url,
                {
                    ...options,
                    headers
                }
            );

    }
    catch (networkError) {

        console.error(
            "NETWORK ERROR:",
            networkError
        );

        throw new Error(
            "Unable to connect to FastAPI server."
        );
    }


    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    let data;


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            data =
                await response.json();

        }
        catch {

            data = null;
        }

    }
    else {

        try {

            data =
                await response.text();

        }
        catch {

            data = null;
        }
    }


    console.log(
        "API STATUS:",
        response.status,
        url
    );


    if (!response.ok) {

        if (response.status === 401) {

            console.error(
                "401 Unauthorized"
            );

            throw new Error(
                "Authentication required. Please login again."
            );
        }


        if (response.status === 403) {

            console.error(
                "403 Forbidden"
            );

            throw new Error(
                "You are not authorized to access this resource."
            );
        }


        if (response.status === 404) {

            console.error(
                "404 Not Found:",
                url
            );

            throw new Error(
                "API endpoint not found."
            );
        }


        if (response.status === 422) {

            console.error(
                "422 Validation Error:",
                data
            );

            throw new Error(
                "Invalid request data."
            );
        }


        if (response.status >= 500) {

            console.error(
                "500 Server Error:",
                data
            );

            throw new Error(
                "Server error. Please check FastAPI."
            );
        }


        const detail =
            typeof data === "object"
                ? (
                    data?.detail ||
                    data?.message
                )
                : data;


        throw new Error(
            detail ||
            `API request failed: ${response.status}`
        );
    }


    return data;
}


/* ============================================================
   SAFE ELEMENT
============================================================ */

function getElement(id) {

    return document.getElementById(id);
}


/* ============================================================
   SAFE EVENT LISTENER
============================================================ */

function addClickListener(
    id,
    handler
) {

    const element =
        getElement(id);


    if (!element) {

        console.warn(
            `Optional element #${id} was not found.`
        );

        return;
    }


    element.addEventListener(
        "click",
        handler
    );
}


/* ============================================================
   SAFE INPUT LISTENER
============================================================ */

function addInputListener(
    id,
    handler
) {

    const element =
        getElement(id);


    if (!element) {

        console.warn(
            `Optional input #${id} was not found.`
        );

        return;
    }


    element.addEventListener(
        "input",
        handler
    );
}


/* ============================================================
   HTML ESCAPE
============================================================ */

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


/* ============================================================
   FORMAT CURRENCY
============================================================ */

function formatCurrency(
    value
) {

    const amount =
        Number(value || 0);


    return amount.toLocaleString(
        "en-US",
        {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(
    value
) {

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

        return "-";
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
   FORMAT SHORT DATE
============================================================ */

function formatShortDate(
    value
) {

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

        return "-";
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
   STATUS CLASS
============================================================ */

function statusClass(
    status
) {

    const normalized =
        String(
            status || ""
        )
        .trim()
        .toLowerCase();


    if (
        normalized === "paid" ||
        normalized === "completed"
    ) {

        return "paid";
    }


    if (
        normalized === "pending"
    ) {

        return "pending";
    }


    if (
        normalized === "overdue"
    ) {

        return "overdue";
    }


    if (
        normalized === "draft"
    ) {

        return "draft";
    }


    return normalized
        .replace(/\s+/g, "-");
}


/* ============================================================
   GET INITIALS
============================================================ */

function getInitials(
    name
) {

    if (!name) {

        return "V";
    }


    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {

        return "V";
    }


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


/* ============================================================
   FIND PROFILE VALUE
============================================================ */

function findProfileValue(
    profile,
    keys,
    fallback = ""
) {

    if (!profile) {

        return fallback;
    }


    for (
        const key of keys
    ) {

        if (
            profile[key] !== undefined &&
            profile[key] !== null &&
            profile[key] !== ""
        ) {

            return profile[key];
        }
    }


    return fallback;
}


/* ============================================================
   LOAD VENDOR PROFILE
============================================================ */

async function loadVendorProfile() {

    let vendorId =
        getVendorId();


    /*
        If vendor_id does not exist,
        try to read it from the JWT.
    */

    if (!vendorId) {

        vendorId =
            getVendorIdFromToken();
    }


    if (!vendorId) {

        console.warn(
            "Vendor ID not found."
        );

        setDefaultProfile();

        return null;
    }


    setVendorId(
        vendorId
    );


    const url =
        `${API}${API_ENDPOINTS.profile}` +
        `/${encodeURIComponent(vendorId)}`;


    try {

        const profile =
            await apiFetch(url);


        console.log(
            "VENDOR PROFILE:",
            profile
        );


        updateVendorProfile(
            profile
        );


        return profile;

    }
    catch (error) {

        console.error(
            "Unable to load vendor profile:",
            error
        );


        /*
            Keep the page working even if
            profile endpoint is unavailable.
        */

        setDefaultProfile();


        return null;
    }
}


/* ============================================================
   GET VENDOR ID FROM JWT
============================================================ */

function getVendorIdFromToken() {

    const token =
        getToken();


    if (!token) {

        return null;
    }


    try {

        const parts =
            token.split(".");


        if (
            parts.length !== 3
        ) {

            return null;
        }


        const payload =
            JSON.parse(
                atob(
                    parts[1]
                        .replace(/-/g, "+")
                        .replace(/_/g, "/")
                )
            );


        console.log(
            "JWT PAYLOAD:",
            payload
        );


        return (
            payload.vendor_id ||
            payload.vendorId ||
            payload.vendorID ||
            null
        );

    }
    catch (error) {

        console.warn(
            "Unable to decode JWT:",
            error
        );


        return null;
    }
}


/* ============================================================
   UPDATE VENDOR PROFILE
============================================================ */

function updateVendorProfile(
    profile
) {

    if (!profile) {

        setDefaultProfile();

        return;
    }


    /*
        Support different response formats:

        {
            vendor_id: "...",
            vendor_name: "..."
        }

        OR

        {
            vendor: {
                vendor_id: "...",
                vendor_name: "..."
            }
        }
    */

    const vendor =
        profile.vendor ||
        profile.data ||
        profile;


    const vendorName =
        findProfileValue(
            vendor,
            [
                "vendor_name",
                "vendorName",
                "name",
                "company_name",
                "companyName"
            ],
            "Vendor"
        );


    const vendorId =
        findProfileValue(
            vendor,
            [
                "vendor_id",
                "vendorId",
                "vendorID",
                "id"
            ],
            getVendorId() || ""
        );


    const contactPerson =
        findProfileValue(
            vendor,
            [
                "contact_person",
                "contactPerson"
            ],
            ""
        );


    const avatarText =
        getInitials(
            vendorName
        );


    setVendorId(
        vendorId
    );


    /*
        Sidebar vendor name
    */

    const sidebarName =
        getElement(
            "vendorName"
        );


    if (sidebarName) {

        sidebarName.textContent =
            vendorName;
    }


    /*
        Sidebar vendor ID
    */

    const sidebarId =
        getElement(
            "vendorId"
        );


    if (sidebarId) {

        sidebarId.textContent =
            `Vendor ID: ${vendorId}`;
    }


    /*
        Header profile name
    */

    const headerProfileNames =
        document.querySelectorAll(
            ".profile strong"
        );


    headerProfileNames.forEach(
        element => {

            element.textContent =
                vendorName;
        }
    );


    /*
        Header profile role
    */

    const headerProfileRole =
        document.querySelector(
            ".profile small"
        );


    if (headerProfileRole) {

        headerProfileRole.textContent =
            contactPerson ||
            "Vendor";
    }


    /*
        Update avatar letters
    */

    const avatars =
        document.querySelectorAll(
            ".avatar"
        );


    avatars.forEach(
        avatar => {

            if (
                !avatar.classList.contains(
                    "brand-logo"
                )
            ) {

                avatar.textContent =
                    avatarText;
            }
        }
    );


    /*
        Optional additional profile
        fields if they exist in HTML.
    */

    updateTextIfExists(
        "profileVendorName",
        vendorName
    );


    updateTextIfExists(
        "profileVendorId",
        vendorId
    );


    updateTextIfExists(
        "profileContactPerson",
        contactPerson
    );
}


/* ============================================================
   DEFAULT PROFILE
============================================================ */

function setDefaultProfile() {

    const vendorName =
        "Vendor";


    const vendorId =
        getVendorId() ||
        "Not Available";


    const sidebarName =
        getElement(
            "vendorName"
        );


    if (sidebarName) {

        sidebarName.textContent =
            vendorName;
    }


    const sidebarId =
        getElement(
            "vendorId"
        );


    if (sidebarId) {

        sidebarId.textContent =
            `Vendor ID: ${vendorId}`;
    }


    const headerNames =
        document.querySelectorAll(
            ".profile strong"
        );


    headerNames.forEach(
        element => {

            element.textContent =
                vendorName;
        }
    );


    const avatars =
        document.querySelectorAll(
            ".avatar"
        );


    avatars.forEach(
        avatar => {

            if (
                !avatar.classList.contains(
                    "brand-logo"
                )
            ) {

                avatar.textContent =
                    "V";
            }
        }
    );
}


/* ============================================================
   UPDATE TEXT IF EXISTS
============================================================ */

function updateTextIfExists(
    id,
    value
) {

    const element =
        getElement(id);


    if (element) {

        element.textContent =
            value ?? "";
    }
}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadDashboard() {

    const vendorId =
        getVendorId();


    if (!vendorId) {

        console.error(
            "Vendor ID is missing."
        );

        showDashboardError(
            "Vendor ID is missing. Please login again."
        );

        return;
    }


    const url =
        `${API}/api/vendor/invoices/dashboard/${encodeURIComponent(vendorId)}`;


    try {

        const data =
            await apiFetch(url);


        console.log(
            "INVOICE DASHBOARD:",
            data
        );


        dashboardData =
            data;


        updateSummary(
            data
        );


        renderInvoiceChart(
            data.status_summary
        );


        renderPaymentStatusChart(
            data.status_summary
        );


        renderPaymentChart(
            data.monthly_payments
        );


        renderRecentInvoices(
            data.recent_invoices
        );


        renderUpcomingPayments(
            data.upcoming_payments
        );


        renderPaymentHistory(
            data.payment_history
        );


        updateInvoiceTotalCenter(
            data.status_summary
        );

    }
    catch (error) {

        console.error(
            "Unable to load invoice dashboard:",
            error
        );


        showDashboardError(
            error.message
        );
    }
}


/* ============================================================
   UPDATE SUMMARY
============================================================ */

function updateSummary(
    data
) {

    if (!data) {

        return;
    }


    updateTextIfExists(
        "totalInvoices",
        data.total_invoices ?? 0
    );


    updateTextIfExists(
        "totalPaid",
        formatCurrency(
            data.total_paid
        )
    );


    updateTextIfExists(
        "pendingPayments",
        formatCurrency(
            data.pending_payments
        )
    );


    updateTextIfExists(
        "overdueAmount",
        formatCurrency(
            data.overdue_amount
        )
    );


    updateTextIfExists(
        "avgPaymentTime",
        `${Math.round(
            Number(
                data.average_payment_time || 0
            )
        )} Days`
    );
}


/* ============================================================
   INVOICE CHART
============================================================ */

function renderInvoiceChart(
    summary
) {

    const canvas =
        getElement(
            "invoiceChart"
        );


    if (!canvas) {

        console.warn(
            "#invoiceChart not found."
        );

        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;
    }


    if (invoiceChart) {

        invoiceChart.destroy();

        invoiceChart = null;
    }


    summary =
        summary || {};


    const values = [

        Number(
            summary.paid || 0
        ),

        Number(
            summary.pending || 0
        ),

        Number(
            summary.overdue || 0
        ),

        Number(
            summary.draft || 0
        )
    ];


    invoiceChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: [
                        "Paid",
                        "Pending",
                        "Overdue",
                        "Draft"
                    ],

                    datasets: [
                        {
                            data: values,

                            borderWidth: 3,

                            hoverOffset: 5
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "65%",

                    plugins: {

                        legend: {

                            position:
                                "right",

                            labels: {

                                usePointStyle:
                                    true,

                                boxWidth: 8,

                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   PAYMENT STATUS CHART
============================================================ */

function renderPaymentStatusChart(
    summary
) {

    const canvas =
        getElement(
            "paymentStatusChart"
        );


    if (!canvas) {

        console.warn(
            "#paymentStatusChart not found."
        );

        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;
    }


    if (paymentStatusChart) {

        paymentStatusChart.destroy();

        paymentStatusChart = null;
    }


    summary =
        summary || {};


    paymentStatusChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: [
                        "Paid",
                        "Pending",
                        "Overdue",
                        "Draft"
                    ],

                    datasets: [
                        {
                            data: [

                                Number(
                                    summary.paid || 0
                                ),

                                Number(
                                    summary.pending || 0
                                ),

                                Number(
                                    summary.overdue || 0
                                ),

                                Number(
                                    summary.draft || 0
                                )

                            ],

                            borderWidth: 3,

                            hoverOffset: 5
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "65%",

                    plugins: {

                        legend: {

                            position:
                                "right",

                            labels: {

                                usePointStyle:
                                    true,

                                boxWidth: 8,

                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   PAYMENT MONTHLY CHART
============================================================ */

function renderPaymentChart(
    monthlyData
) {

    const canvas =
        getElement(
            "paymentChart"
        );


    if (!canvas) {

        console.warn(
            "#paymentChart not found."
        );

        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;
    }


    if (paymentChart) {

        paymentChart.destroy();

        paymentChart = null;
    }


    monthlyData =
        Array.isArray(
            monthlyData
        )
            ? monthlyData
            : [];


    const labels =
        monthlyData.map(
            item =>
                item.month || ""
        );


    const paid =
        monthlyData.map(
            item =>
                Number(
                    item.paid_amount || 0
                )
        );


    const pending =
        monthlyData.map(
            item =>
                Number(
                    item.pending_amount || 0
                )
        );


    paymentChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Paid Amount",

                            data: paid,

                            borderRadius: 4
                        },

                        {
                            label:
                                "Pending Amount",

                            data: pending,

                            borderRadius: 4
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

                                callback:
                                    function(value) {

                                        return formatCompactCurrency(
                                            value
                                        );
                                    }
                            }
                        }

                    },

                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {

                                usePointStyle:
                                    true,

                                boxWidth: 8,

                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   COMPACT CURRENCY
============================================================ */

function formatCompactCurrency(
    value
) {

    const amount =
        Number(value || 0);


    if (
        amount >= 1000000
    ) {

        return (
            "$" +
            (
                amount /
                1000000
            ).toFixed(1) +
            "M"
        );
    }


    if (
        amount >= 1000
    ) {

        return (
            "$" +
            (
                amount /
                1000
            ).toFixed(0) +
            "K"
        );
    }


    return "$" + amount;
}


/* ============================================================
   CENTER TEXT INFORMATION
============================================================ */

function updateInvoiceTotalCenter(
    summary
) {

    /*
        Chart.js does not automatically display
        center text. This function is intentionally
        separate so you can add a custom plugin later.

        The dashboard still displays Total Invoices
        correctly in the stat card.
    */
}


/* ============================================================
   RECENT INVOICES
============================================================ */

function renderRecentInvoices(
    invoices
) {

    const tbody =
        getElement(
            "invoiceTableBody"
        );


    if (!tbody) {

        console.warn(
            "#invoiceTableBody not found."
        );

        return;
    }


    tbody.innerHTML = "";


    if (
        !Array.isArray(
            invoices
        ) ||
        invoices.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center;"
                >
                    No invoices found.

                </td>

            </tr>

        `;

        return;
    }


    invoices.forEach(
        invoice => {

            const row =
                document.createElement(
                    "tr"
                );


            /*
                Your current backend may return
                only po_id.

                If you later return po_number,
                this automatically uses it.
            */

            const poNumber =
                invoice.po_number ||
                invoice.purchase_order_number ||
                (
                    invoice.po_id
                        ? `PO-${invoice.po_id}`
                        : "-"
                );


            row.innerHTML = `

                <td>

                    <strong>
                        ${escapeHtml(
                            invoice.invoice_number
                        )}
                    </strong>

                </td>


                <td>

                    ${escapeHtml(
                        poNumber
                    )}

                </td>


                <td>

                    ${formatDate(
                        invoice.invoice_date
                    )}

                </td>


                <td>

                    ${formatDate(
                        invoice.due_date
                    )}

                </td>


                <td>

                    ${formatCurrency(
                        invoice.amount
                    )}

                </td>


                <td>

                    <span
                        class="status
                        ${statusClass(
                            invoice.status
                        )}"
                    >

                        ${escapeHtml(
                            invoice.status ||
                            "Pending"
                        )}

                    </span>

                </td>


                <td>

                    <button
                        type="button"
                        class="action-btn"
                        title="View Invoice"
                        data-invoice-id="${invoice.id}"
                        data-action="view-invoice"
                    >

                        <i
                            class="fa-regular fa-eye"
                        ></i>

                    </button>


                    <button
                        type="button"
                        class="action-btn"
                        title="Download Invoice"
                        data-invoice-id="${invoice.id}"
                        data-action="download-invoice"
                    >

                        <i
                            class="fa-solid fa-download"
                        ></i>

                    </button>

                </td>

            `;


            tbody.appendChild(
                row
            );
        }
    );
}


/* ============================================================
   UPCOMING PAYMENTS
============================================================ */

function renderUpcomingPayments(
    invoices
) {

    const container =
        getElement(
            "upcomingPayments"
        );


    if (!container) {

        console.warn(
            "#upcomingPayments not found."
        );

        return;
    }


    container.innerHTML = "";


    if (
        !Array.isArray(
            invoices
        ) ||
        invoices.length === 0
    ) {

        container.innerHTML = `

            <div
                style="
                    padding:20px;
                    text-align:center;
                    color:#6d7890;
                "
            >

                No upcoming payments.

            </div>

        `;

        return;
    }


    invoices.forEach(
        invoice => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "upcoming-item";


            const poNumber =
                invoice.po_number ||
                invoice.purchase_order_number ||
                (
                    invoice.po_id
                        ? `PO-${invoice.po_id}`
                        : "-"
                );


            item.innerHTML = `

                <div class="calendar-icon">

                    <i
                        class="fa-regular
                        fa-calendar-days"
                    ></i>

                </div>


                <div>

                    <strong>

                        ${escapeHtml(
                            invoice.invoice_number
                        )}

                    </strong>


                    <small>

                        ${escapeHtml(
                            poNumber
                        )}

                    </small>

                </div>


                <div>

                    <span
                        class="upcoming-label"
                    >
                        Due on
                    </span>


                    <strong>

                        ${formatShortDate(
                            invoice.due_date
                        )}

                    </strong>

                </div>


                <div>

                    <span
                        class="upcoming-label"
                    >
                        Amount
                    </span>


                    <strong
                        class="upcoming-amount"
                    >

                        ${formatCurrency(
                            invoice.amount
                        )}

                    </strong>


                    <span
                        class="status
                        ${statusClass(
                            invoice.status
                        )}"
                    >

                        ${escapeHtml(
                            invoice.status ||
                            "Pending"
                        )}

                    </span>

                </div>

            `;


            container.appendChild(
                item
            );
        }
    );
}


/* ============================================================
   PAYMENT HISTORY
============================================================ */

function renderPaymentHistory(
    payments
) {

    const tbody =
        getElement(
            "paymentHistoryBody"
        );


    if (!tbody) {

        console.warn(
            "#paymentHistoryBody not found."
        );

        return;
    }


    tbody.innerHTML = "";


    if (
        !Array.isArray(
            payments
        ) ||
        payments.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="text-align:center;"
                >
                    No payment history.

                </td>

            </tr>

        `;

        return;
    }


    payments.forEach(
        payment => {

            const row =
                document.createElement(
                    "tr"
                );


            const paymentStatus =
                String(
                    payment.status ||
                    ""
                ).toLowerCase();


            const cssStatus =
                paymentStatus ===
                "completed"
                    ? "paid"
                    : statusClass(
                        payment.status
                    );


            row.innerHTML = `

                <td>

                    ${formatDate(
                        payment.payment_date
                    )}

                </td>


                <td>

                    INV-${escapeHtml(
                        payment.invoice_id
                    )}

                </td>


                <td>

                    ${escapeHtml(
                        payment.payment_method ||
                        "-"
                    )}

                </td>


                <td>

                    ${formatCurrency(
                        payment.amount
                    )}

                </td>


                <td>

                    <span
                        class="status ${cssStatus}"
                    >

                        ${escapeHtml(
                            payment.status ||
                            "Completed"
                        )}

                    </span>

                </td>

            `;


            tbody.appendChild(
                row
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

    const vendorId =
        getVendorId();


    if (!vendorId) {

        alert(
            "Vendor ID is missing. Please login again."
        );

        return;
    }


    if (!invoiceId) {

        alert(
            "Invoice ID is missing."
        );

        return;
    }


    const url =
        `${API}${API_ENDPOINTS.invoices}` +
        `/${encodeURIComponent(invoiceId)}` +
        `?vendor_id=${encodeURIComponent(vendorId)}`;


    try {

        const invoice =
            await apiFetch(url);


        console.log(
            "INVOICE DETAILS:",
            invoice
        );


        /*
            Replace this alert later with
            your Invoice Details modal/page.
        */

        const invoiceNumber =
            invoice.invoice_number ||
            `INV-${invoice.id}`;


        const amount =
            formatCurrency(
                invoice.amount
            );


        const status =
            invoice.status ||
            "Pending";


        alert(

            `Invoice Details\n\n` +

            `Invoice: ${invoiceNumber}\n` +

            `Amount: ${amount}\n` +

            `Status: ${status}\n` +

            `Invoice Date: ${formatDate(
                invoice.invoice_date
            )}\n` +

            `Due Date: ${formatDate(
                invoice.due_date
            )}`

        );

    }
    catch (error) {

        console.error(
            "Unable to load invoice:",
            error
        );


        alert(
            error.message ||
            "Unable to load invoice."
        );
    }
}


/* ============================================================
   DOWNLOAD INVOICE
============================================================ */

async function downloadInvoice(invoiceId) {

    const vendorId = getVendorId();

    if (!vendorId) {
        alert("Vendor ID is missing.");
        return;
    }

    if (!invoiceId) {
        alert("Invoice ID is missing.");
        return;
    }

    const url =
        `${API}/api/vendor/invoices/${encodeURIComponent(invoiceId)}/download` +
        `?vendor_id=${encodeURIComponent(vendorId)}`;

    try {

        const token = getToken();

        const headers = {};

        if (token) {
            headers.Authorization =
                `Bearer ${token}`;
        }

        const response =
            await fetch(url, {
                headers
            });

        if (!response.ok) {
            throw new Error(
                `Unable to download invoice (${response.status})`
            );
        }

        const blob =
            await response.blob();

        const downloadUrl =
            window.URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href =
            downloadUrl;

        link.download =
            `Invoice-${invoiceId}.pdf`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
            downloadUrl
        );

    }
    catch (error) {

        console.error(
            "Invoice download error:",
            error
        );

        alert(
            error.message
        );
    }
}


/* ============================================================
   SEARCH INVOICES
============================================================ */

function initializeSearch() {

    addInputListener(
        "searchInput",
        function () {

            const search =
                String(
                    this.value || ""
                )
                .toLowerCase()
                .trim();


            const rows =
                document.querySelectorAll(
                    "#invoiceTableBody tr"
                );


            rows.forEach(
                row => {

                    const text =
                        row.textContent
                            .toLowerCase();


                    row.style.display =
                        text.includes(search)
                            ? ""
                            : "none";
                }
            );
        }
    );
}


/* ============================================================
   VIEW ALL INVOICES
============================================================ */

function goToInvoices() {

    window.location.href =
        "/VendorInvoices";
}


/* ============================================================
   VIEW PAYMENT HISTORY
============================================================ */

function goToPaymentHistory() {

    window.location.href =
        "/vendor/payment-history";
}


/* ============================================================
   VIEW UPCOMING PAYMENTS
============================================================ */

function goToUpcomingPayments() {

    window.location.href =
        "/vendor/upcomingpayments";
}


/* ============================================================
   LOGOUT
============================================================ */

function logout() {

    /*
        Remove all possible authentication keys.
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

    localStorage.removeItem(
        "accessToken"
    );


    /*
        Remove vendor identifiers.
    */

    localStorage.removeItem(
        "vendor_id"
    );

    localStorage.removeItem(
        "vendorId"
    );

    localStorage.removeItem(
        "vendorID"
    );


    window.location.href =
        "/login";
}


/* ============================================================
   UPLOAD INVOICE
============================================================ */

function uploadInvoice() {

    window.location.href =
        "/vendor/upload-invoice";
}


/* ============================================================
   DOWNLOAD STATEMENT
============================================================ */

function downloadStatement() {

    console.log(
        "Download statement requested"
    );


    /*
        Add your FastAPI endpoint here later.

        Example:

        GET
        /api/vendor/payments/statement
    */

    alert(
        "Statement download endpoint is not configured yet."
    );
}


/* ============================================================
   HELP & SUPPORT
============================================================ */

function openHelpSupport() {

    window.location.href =
        "HelpSupport.html";
}


/* ============================================================
   MANAGE PAYMENT METHODS
============================================================ */

function managePaymentMethods() {

    window.location.href =
        "/vendor/payment-methods";
}


/* ============================================================
   QUICK ACTIONS
============================================================ */

function initializeQuickActions() {

    addClickListener(
        "uploadInvoiceBtn",
        uploadInvoice
    );


    addClickListener(
        "downloadStatementBtn",
        downloadStatement
    );


    addClickListener(
        "paymentHistoryBtn",
        goToPaymentHistory
    );


    addClickListener(
        "helpSupportBtn",
        openHelpSupport
    );


    /*
        Your original HTML has:

        <button class="manage-btn">
            Manage Methods →
        </button>

        It does not have an ID.

        Therefore use querySelector safely.
    */

    const manageButton =
        document.querySelector(
            ".manage-btn"
        );


    if (manageButton) {

        manageButton.addEventListener(
            "click",
            managePaymentMethods
        );
    }
}


/* ============================================================
   TABLE ACTION DELEGATION
============================================================ */

function initializeInvoiceActions() {

    const tbody =
        getElement(
            "invoiceTableBody"
        );


    if (!tbody) {

        return;
    }


    tbody.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {

                return;
            }


            const action =
                button.dataset.action;


            const invoiceId =
                button.dataset.invoiceId;


            if (!invoiceId) {

                console.warn(
                    "Invoice ID missing."
                );

                return;
            }


            if (
                action ===
                "view-invoice"
            ) {

                viewInvoice(
                    invoiceId
                );

                return;
            }


            if (
                action ===
                "download-invoice"
            ) {

                downloadInvoice(
                    invoiceId
                );

                return;
            }

        }
    );
}


/* ============================================================
   NAVIGATION EVENTS
============================================================ */

function initializeNavigation() {

    addClickListener(
        "viewInvoicesBtn",
        goToInvoices
    );


    addClickListener(
        "allInvoicesBtn",
        goToInvoices
    );


    addClickListener(
        "viewPaymentsBtn",
        goToPaymentHistory
    );


    addClickListener(
        "historyBtn",
        goToPaymentHistory
    );


    addClickListener(
        "upcomingBtn",
        goToUpcomingPayments
    );


    addClickListener(
        "logoutBtn",
        function(event) {

            event.preventDefault();

            logout();
        }
    );
}


/* ============================================================
   YEAR SELECT
============================================================ */

function initializeYearSelect() {

    const select =
        getElement(
            "yearSelect"
        );


    if (!select) {

        return;
    }


    /*
        Replace "This Year" with actual
        current year if required.
    */

    const currentYear =
        new Date().getFullYear();


    /*
        Avoid duplicate options.
    */

    const existingValues =
        Array.from(
            select.options
        ).map(
            option =>
                option.value ||
                option.textContent
        );


    if (
        !existingValues.includes(
            String(currentYear)
        )
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            String(currentYear);


        option.textContent =
            String(currentYear);


        select.appendChild(
            option
        );
    }


    select.addEventListener(
        "change",
        function() {

            const selected =
                this.value;


            if (
                selected ===
                "This Year"
            ) {

                loadDashboard();

                return;
            }


            loadDashboardForYear(
                selected
            );
        }
    );
}


/* ============================================================
   LOAD DASHBOARD FOR YEAR
============================================================ */

async function loadDashboardForYear(
    year
) {

    const vendorId =
        getVendorId();


    if (!vendorId) {

        return;
    }


    const url =
        `${API}${API_ENDPOINTS.dashboard}` +
        `?vendor_id=${encodeURIComponent(vendorId)}` +
        `&year=${encodeURIComponent(year)}`;


    try {

        const data =
            await apiFetch(url);


        dashboardData =
            data;


        renderPaymentChart(
            data.monthly_payments
        );

    }
    catch (error) {

        console.error(
            "Unable to load selected year:",
            error
        );
    }
}


/* ============================================================
   DASHBOARD ERROR
============================================================ */

function showDashboardError(
    message
) {

    const tbody =
        getElement(
            "invoiceTableBody"
        );


    if (tbody) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        color:#d93025;
                        padding:20px;
                    "
                >

                    ${escapeHtml(
                        message ||
                        "Unable to load invoices."
                    )}

                </td>

            </tr>

        `;
    }


    const upcoming =
        getElement(
            "upcomingPayments"
        );


    if (upcoming) {

        upcoming.innerHTML = `

            <div
                style="
                    padding:20px;
                    text-align:center;
                    color:#d93025;
                "
            >

                Unable to load upcoming payments.

            </div>

        `;
    }


    const history =
        getElement(
            "paymentHistoryBody"
        );


    if (history) {

        history.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        color:#d93025;
                    "
                >

                    Unable to load payment history.

                </td>

            </tr>

        `;
    }
}


/* ============================================================
   CHECK AUTHENTICATION
============================================================ */

function checkAuthentication() {

    const token = getToken();

    if (!token) {

        console.warn(
            "Authentication token not found."
        );

        window.location.href = "/login";

        return false;
    }

    return true;
}


/* ============================================================
   LOAD EVERYTHING
============================================================ */

async function initializePage() {

    console.log(
        "VendorIQ Invoices & Payments"
    );

    const authenticated =
        checkAuthentication();

    if (!authenticated) {
        return;
    }

    await loadVendorProfile();

    await loadDashboard();

    initializeSearch();
    initializeNavigation();
    initializeQuickActions();
    initializeInvoiceActions();
    initializeYearSelect();

    console.log(
        "VendorIQ Invoices & Payments initialized."
    );
}


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializePage
);


/* ============================================================
   GLOBAL FUNCTIONS
============================================================ */

window.viewInvoice =
    viewInvoice;


window.downloadInvoice =
    downloadInvoice;


window.loadDashboard =
    loadDashboard;


window.loadVendorProfile =
    loadVendorProfile;


window.logout =
    logout;