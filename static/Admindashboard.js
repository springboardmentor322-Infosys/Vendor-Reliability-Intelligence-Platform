// ============================================================
// VENDORIQ - ADMIN DASHBOARD JAVASCRIPT
// ============================================================
// MATCHED TO:
//
// routers.py
// crud.py
//
// MAIN ENDPOINT:
//
// GET /admin/Dashboard
//
// RESPONSE:
//
// {
//     "success": true,
//     "dashboard": "admin",
//     "user": {...},
//     "summary": {...},
//     "vendor_analytics": {...},
//     "procurement": {...},
//     "compliance": {...},
//     "invoice_overview": {...},
//     "pending_vendor_registrations": [...]
// }
//
// ============================================================


// ============================================================
// API CONFIGURATION
// ============================================================

const API = "http://127.0.0.1:8000";


// ============================================================
// CHART INSTANCES
// ============================================================

let reliabilityChartInstance = null;
let complianceChartInstance = null;
let procurementChartInstance = null;


// ============================================================
// AUTH TOKEN
// ============================================================

function getAuthToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        null
    );
}


// ============================================================
// AUTH HEADERS
// ============================================================

function getAuthHeaders() {

    const token = getAuthToken();

    const headers = {
        "Accept": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}


// ============================================================
// JSON GET REQUEST
// ============================================================

async function getJSON(url) {

    console.log("GET:", url);

    const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders()
    });

    const contentType =
        response.headers.get("content-type") || "";

    const text =
        await response.text();

    let data = null;

    if (text) {

        try {

            data = JSON.parse(text);

        } catch (error) {

            console.error(
                "Invalid JSON response:",
                text.substring(0, 1000)
            );
        }
    }


    // ========================================================
    // AUTHENTICATION
    // ========================================================

    if (response.status === 401) {

        throw new Error(
            "401 Unauthorized: Please login again."
        );
    }


    // ========================================================
    // AUTHORIZATION
    // ========================================================

    if (response.status === 403) {

        throw new Error(
            data?.detail ||
            "403 Forbidden: Admin access required."
        );
    }


    // ========================================================
    // OTHER API ERRORS
    // ========================================================

    if (!response.ok) {

        throw new Error(
            data?.detail ||
            `API ${response.status}: ${response.statusText}`
        );
    }


    // ========================================================
    // JSON VALIDATION
    // ========================================================

    if (
        !contentType.includes("application/json")
    ) {

        throw new Error(
            "API did not return JSON."
        );
    }


    return data;
}


// ============================================================
// PUT REQUEST
// ============================================================

async function putJSON(url) {

    console.log("PUT:", url);

    const token =
        getAuthToken();

    const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    };

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }


    const response =
        await fetch(
            url,
            {
                method: "PUT",
                headers: headers
            }
        );


    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    const text =
        await response.text();


    let data = null;


    if (text) {

        try {

            data =
                JSON.parse(text);

        } catch (error) {

            console.error(
                "Invalid PUT response:",
                text
            );
        }
    }


    if (response.status === 401) {

        throw new Error(
            "401 Unauthorized: Please login again."
        );
    }


    if (response.status === 403) {

        throw new Error(
            data?.detail ||
            "403 Forbidden: Admin access required."
        );
    }


    if (!response.ok) {

        throw new Error(
            data?.detail ||
            `API ${response.status}: ${response.statusText}`
        );
    }


    if (
        text &&
        !contentType.includes(
            "application/json"
        )
    ) {

        console.warn(
            "PUT endpoint did not return JSON."
        );
    }


    return data;
}


// ============================================================
// SAFE OBJECT
// ============================================================

function safeObject(value) {

    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    ) {

        return value;
    }

    return {};
}


// ============================================================
// SAFE ARRAY
// ============================================================

function safeArray(value) {

    return Array.isArray(value)
        ? value
        : [];
}


// ============================================================
// SET TEXT
// ============================================================

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        value ?? 0;
}


// ============================================================
// NUMBER FORMAT
// ============================================================

function numberFormat(value) {

    const number =
        Number(value) || 0;

    return number.toLocaleString();
}


// ============================================================
// MONEY FORMAT
// ============================================================

function money(value) {

    const number =
        Number(value) || 0;


    if (number >= 1000000000) {

        return (
            "$" +
            (number / 1000000000).toFixed(2) +
            "B"
        );
    }


    if (number >= 1000000) {

        return (
            "$" +
            (number / 1000000).toFixed(2) +
            "M"
        );
    }


    if (number >= 1000) {

        return (
            "$" +
            (number / 1000).toFixed(1) +
            "K"
        );
    }


    return (
        "$" +
        number.toLocaleString()
    );
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// ATTRIBUTE ESCAPE
// ============================================================

function escapeAttribute(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(value) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return String(value);
    }


    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


// ============================================================
// ============================================================
// MAIN DASHBOARD
// ============================================================
// ============================================================

async function loadDashboard() {

    try {

        const data =
            await getJSON(
                `${API}/admin/Dashboard`
            );


        console.log(
            "=========================================="
        );

        console.log(
            "VENDORIQ ADMIN DASHBOARD RESPONSE"
        );

        console.log(
            data
        );

        console.log(
            "=========================================="
        );


        // ====================================================
        // SUCCESS VALIDATION
        // ====================================================

        if (!data) {

            throw new Error(
                "Empty dashboard response."
            );
        }


        if (data.success === false) {

            throw new Error(
                "Admin dashboard request failed."
            );
        }


        // ====================================================
        // USER
        // ====================================================

        updateHeader(
            data.user
        );


        // ====================================================
        // EXACT BACKEND OBJECTS
        // ====================================================

        const summary =
            safeObject(
                data.summary
            );


        const vendorAnalytics =
            safeObject(
                data.vendor_analytics
            );


        const procurement =
            safeObject(
                data.procurement
            );


        const compliance =
            safeObject(
                data.compliance
            );


        const invoiceOverview =
            safeObject(
                data.invoice_overview
            );


        const pendingVendors =
            safeArray(
                data.pending_vendor_registrations
            );


        // ====================================================
        // LOAD SUMMARY
        // ====================================================

        loadSummary(
            summary
        );


        // ====================================================
        // LOAD VENDOR ANALYTICS
        // ====================================================

        loadVendorAnalytics(
            vendorAnalytics
        );


        // ====================================================
        // LOAD PROCUREMENT
        // ====================================================

        loadProcurement(
            procurement
        );


        // ====================================================
        // LOAD COMPLIANCE
        // ====================================================

        loadCompliance(
            compliance
        );


        // ====================================================
        // LOAD INVOICES
        // ====================================================

        loadInvoiceOverview(
            invoiceOverview
        );


        // ====================================================
        // LOAD PENDING VENDORS
        // ====================================================

        renderPendingVendors(
            pendingVendors
        );


        // ====================================================
        // ACTIVITY
        // ====================================================
        //
        // activity is currently commented out in routers.py.
        //
        // Therefore we intentionally don't call any activity API.
        // ====================================================

        renderNoActivity();


        console.log(
            "Admin dashboard loaded successfully."
        );


    }
    catch (error) {

        console.error(
            "Admin Dashboard loading error:",
            error
        );


        handleDashboardError(
            error
        );
    }
}


// ============================================================
// ============================================================
// SUMMARY
// ============================================================
// ============================================================

function loadSummary(
    summary
) {

    summary =
        safeObject(summary);


    // ========================================================
    // USERS
    // ========================================================

    const users =
        safeObject(
            summary.users
        );


    const totalUsers =
        Number(
            users.total_users
        ) || 0;


    const activeUsers =
        Number(
            users.active_users
        ) || 0;


    setText(
        "totalUsers",
        numberFormat(totalUsers)
    );


    setText(
        "usersSmall",
        numberFormat(totalUsers)
    );


    setText(
        "activeUsers",
        numberFormat(activeUsers)
    );


    setText(
        "activeUserCount",
        numberFormat(activeUsers)
    );


    // ========================================================
    // VENDORS
    // ========================================================

    const vendors =
        safeObject(
            summary.vendors
        );


    const totalVendors =
        Number(
            vendors.total_vendors
        ) || 0;


    setText(
        "totalVendors",
        numberFormat(totalVendors)
    );


    setText(
        "vendorCount",
        numberFormat(totalVendors)
    );


    // ========================================================
    // PURCHASE ORDERS
    // ========================================================

    const purchaseOrders =
        safeObject(
            summary.purchase_orders
        );


    const totalOrders =
        Number(
            purchaseOrders.total_purchase_orders
        ) || 0;


    setText(
        "totalOrders",
        numberFormat(totalOrders)
    );


    // ========================================================
    // TOTAL SPEND
    // ========================================================

    const totalSpend =
        Number(
            purchaseOrders.total_spend
        ) || 0;


    setText(
        "totalSpend",
        money(totalSpend)
    );


    // ========================================================
    // CONTRACTS
    // ========================================================

    const contracts =
        safeObject(
            summary.contracts
        );


    const activeContracts =
        Number(
            contracts.active_contracts
        ) || 0;


    setText(
        "activeContracts",
        numberFormat(activeContracts)
    );


    // ========================================================
    // COMPLIANCE SCORE
    // ========================================================

    const complianceScore =
        Number(
            contracts.compliance_score
        ) || 0;


    setText(
        "complianceScore",
        `${complianceScore.toFixed(1)}%`
    );
}


// ============================================================
// ============================================================
// VENDOR ANALYTICS
// ============================================================
// ============================================================

function loadVendorAnalytics(
    vendorAnalytics
) {

    vendorAnalytics =
        safeObject(
            vendorAnalytics
        );


    // ========================================================
    // IMPORTANT
    // ========================================================
    //
    // crud.vendor_dashboard(database)
    //
    // returns:
    //
    // {
    //     "vendors": [...],
    //     "average_reliability": ...
    // }
    //
    // It does NOT return the reliability distribution.
    //
    // Therefore the distribution chart cannot honestly be
    // populated from this endpoint.
    // ========================================================


    const vendors =
        safeArray(
            vendorAnalytics.vendors
        );


    renderTopVendors(
        vendors
    );


    // ========================================================
    // AVERAGE RELIABILITY
    // ========================================================

    const averageReliability =
        Number(
            vendorAnalytics.average_reliability
        ) || 0;


    // If HTML has an average reliability element,
    // update it safely.

    setText(
        "averageReliability",
        `${averageReliability.toFixed(2)}`
    );


    // ========================================================
    // RELIABILITY DISTRIBUTION
    // ========================================================
    //
    // The current /admin/Dashboard endpoint does not return:
    //
    // excellent
    // good
    // average
    // poor
    // critical
    //
    // so do NOT fabricate values.
    // ========================================================

    clearReliabilityDistribution();
}


// ============================================================
// ============================================================
// TOP VENDORS
// ============================================================
// ============================================================

function renderTopVendors(
    vendors
) {

    const tbody =
        document.getElementById(
            "topVendors"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (
        !Array.isArray(vendors) ||
        vendors.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    No vendor data available.
                </td>
            </tr>
        `;

        return;
    }


    vendors
        .slice(0, 5)
        .forEach(
            vendor => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const name =
                    vendor.vendor_name ??
                    "-";


                const category =
                    vendor.category ??
                    "-";


                const score =
                    Number(
                        vendor.reliability_score
                    ) || 0;


                const trend =
                    String(
                        vendor.trend ??
                        "up"
                    )
                    .trim()
                    .toLowerCase();


                let symbol =
                    "→";


                let trendClass =
                    "trend-flat";


                if (
                    trend === "up" ||
                    trend === "increase" ||
                    trend === "increasing"
                ) {

                    symbol = "↑";

                    trendClass =
                        "trend-up";
                }


                else if (
                    trend === "down" ||
                    trend === "decrease" ||
                    trend === "decreasing"
                ) {

                    symbol = "↓";

                    trendClass =
                        "trend-down";
                }


                row.innerHTML = `
                    <td>
                        ${escapeHTML(name)}
                    </td>

                    <td>
                        ${escapeHTML(category)}
                    </td>

                    <td class="score">
                        ${score}/100
                    </td>

                    <td class="${trendClass}">
                        ${symbol}
                    </td>
                `;


                tbody.appendChild(
                    row
                );
            }
        );
}


// ============================================================
// CLEAR RELIABILITY DISTRIBUTION
// ============================================================

function clearReliabilityDistribution() {

    setText(
        "excellent",
        0
    );

    setText(
        "good",
        0
    );

    setText(
        "average",
        0
    );

    setText(
        "poor",
        0
    );

    setText(
        "critical",
        0
    );


    const canvas =
        document.getElementById(
            "reliabilityChart"
        );


    if (!canvas) {
        return;
    }


    if (
        reliabilityChartInstance
    ) {

        reliabilityChartInstance.destroy();

        reliabilityChartInstance =
            null;
    }
}


// ============================================================
// ============================================================
// CONTRACT / COMPLIANCE ANALYTICS
// ============================================================
// ============================================================

function loadCompliance(
    compliance
) {

    compliance =
        safeObject(
            compliance
        );


    // ========================================================
    // EXACT CRUD FIELDS
    // ========================================================

    const totalContracts =
        Number(
            compliance.total_contracts
        ) || 0;


    const activeContracts =
        Number(
            compliance.active_contracts
        ) || 0;


    const expiredContracts =
        Number(
            compliance.expired_contracts
        ) || 0;


    const expiringContracts =
        Number(
            compliance.expiring_contracts
        ) || 0;


    const complianceScore =
        Number(
            compliance.compliance_score
        ) || 0;


    // ========================================================
    // EXISTING HTML KPI IDs
    // ========================================================

    setText(
        "complianceScore",
        `${complianceScore.toFixed(1)}%`
    );


    setText(
        "activeContracts",
        numberFormat(activeContracts)
    );


    setText(
        "expiringContracts",
        numberFormat(expiringContracts)
    );


    setText(
        "expiredContracts",
        numberFormat(expiredContracts)
    );


    // ========================================================
    // ADDITIONAL OPTIONAL HTML IDS
    // ========================================================

    setText(
        "totalContracts",
        numberFormat(totalContracts)
    );


    setText(
        "pendingContracts",
        0
    );


    // ========================================================
    // CONTRACT STATUS DISTRIBUTION
    // ========================================================

    const distribution =
        safeObject(
            compliance.status_distribution
        );


    renderComplianceChart(
        distribution
    );
}


// ============================================================
// ============================================================
// COMPLIANCE CHART
// ============================================================
// ============================================================

function renderComplianceChart(
    distribution
) {

    const canvas =
        document.getElementById(
            "complianceChart"
        );


    if (!canvas) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;
    }


    // ========================================================
    // status_distribution comes from:
    //
    // contract_status_distribution(database)
    //
    // We don't assume its exact keys blindly.
    // ========================================================

    const labels =
        Object.keys(
            distribution
        );


    const values =
        labels.map(
            key =>
                Number(
                    distribution[key]
                ) || 0
        );


    if (
        labels.length === 0
    ) {

        if (
            complianceChartInstance
        ) {

            complianceChartInstance.destroy();

            complianceChartInstance =
                null;
        }

        return;
    }


    if (
        complianceChartInstance
    ) {

        complianceChartInstance.destroy();

        complianceChartInstance =
            null;
    }


    complianceChartInstance =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#19a86f",
                                "#4384ee",
                                "#ffad0e",
                                "#f04444",
                                "#8b5cf6",
                                "#26aa8b"
                            ],

                            borderWidth: 3,

                            borderColor:
                                "#ffffff"
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "62%",

                    plugins: {

                        legend: {
                            display: false
                        }
                    }
                }
            }
        );
}


// ============================================================
// ============================================================
// PROCUREMENT
// ============================================================
// ============================================================

function loadProcurement(
    procurement
) {

    procurement =
        safeObject(
            procurement
        );


    // ========================================================
    // PROCUREMENT KPI VALUES
    // ========================================================

    const totalPurchaseOrders =
        Number(
            procurement.total_purchase_orders
        ) || 0;


    const totalSpend =
        Number(
            procurement.total_spend
        ) || 0;


    const averageOrderValue =
        Number(
            procurement.average_order_value
        ) || 0;


    const currentMonthSpend =
        Number(
            procurement.current_month_spend
        ) || 0;


    // ========================================================
    // OPTIONAL HTML ELEMENTS
    // ========================================================

    setText(
        "totalOrders",
        numberFormat(totalPurchaseOrders)
    );


    setText(
        "totalSpend",
        money(totalSpend)
    );


    setText(
        "averageOrderValue",
        money(averageOrderValue)
    );


    setText(
        "currentMonthSpend",
        money(currentMonthSpend)
    );


    // ========================================================
    // PURCHASE ORDER STATUS
    // ========================================================

    const status =
        safeObject(
            procurement.status
        );


    setText(
        "deliveredOrders",
        numberFormat(
            status["Delivered"] || 0
        )
    );


    setText(
        "pendingOrders",
        numberFormat(
            status["Pending"] || 0
        )
    );


    setText(
        "inTransitOrders",
        numberFormat(
            status["In Transit"] || 0
        )
    );


    setText(
        "partialOrders",
        numberFormat(
            status["Partial"] || 0
        )
    );


    setText(
        "cancelledOrders",
        numberFormat(
            status["Cancelled"] || 0
        )
    );


    // ========================================================
    // MONTHLY SPEND CHART
    // ========================================================

    const monthlySpend =
        safeArray(
            procurement.monthly_spend
        );


    renderProcurementChart(
        monthlySpend
    );


    // ========================================================
    // TOP PURCHASE ORDERS
    // ========================================================

    renderPurchaseOrders(
        procurement.top_orders
    );
}


// ============================================================
// ============================================================
// PROCUREMENT CHART
// ============================================================
// ============================================================

function renderProcurementChart(
    monthlySpend
) {

    const canvas =
        document.getElementById(
            "procurementChart"
        );


    if (!canvas) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;
    }


    monthlySpend =
        safeArray(
            monthlySpend
        );


    // ========================================================
    // CRUD FORMAT:
    //
    // [
    //     {
    //         "month": "Jan",
    //         "month_number": 1,
    //         "total_spend": 50000
    //     }
    // ]
    // ========================================================

    const labels =
        monthlySpend.map(
            item =>
                item.month ??
                String(
                    item.month_number ?? ""
                )
        );


    const values =
        monthlySpend.map(
            item =>
                Number(
                    item.total_spend
                ) || 0
        );


    if (
        procurementChartInstance
    ) {

        procurementChartInstance.destroy();

        procurementChartInstance =
            null;
    }


    if (
        labels.length === 0
    ) {

        return;
    }


    procurementChartInstance =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels: labels,

                    datasets: [
                        {
                            label: "Monthly Spend",

                            data: values,

                            borderColor:
                                "#5227df",

                            backgroundColor:
                                "rgba(82,39,223,.08)",

                            borderWidth: 2,

                            pointRadius: 3,

                            tension: 0.35,

                            fill: true
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
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        return (
                                            "Spend: " +
                                            money(
                                                context.raw
                                            )
                                        );
                                    }
                            }
                        }
                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return money(
                                            value
                                        );
                                    }
                            },

                            grid: {

                                color:
                                    "#eef0f6"
                            }
                        },

                        x: {

                            grid: {

                                display:
                                    false
                            }
                        }
                    }
                }
            }
        );
}


// ============================================================
// ============================================================
// TOP PURCHASE ORDERS
// ============================================================
// ============================================================

function renderPurchaseOrders(
    orders
) {

    const tbody =
        document.getElementById(
            "purchaseOrders"
        );


    if (!tbody) {
        return;
    }


    orders =
        safeArray(
            orders
        );


    tbody.innerHTML = "";


    if (
        orders.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    No purchase orders available.
                </td>
            </tr>
        `;

        return;
    }


    orders
        .slice(0, 10)
        .forEach(
            order => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const poNumber =
                    order.po_number ??
                    "-";


                const vendor =
                    order.vendor ??
                    order.vendor_id ??
                    "-";


                const amount =
                    Number(
                        order.amount
                    ) || 0;


                const status =
                    String(
                        order.status ??
                        "Pending"
                    );


                const statusClass =
                    getOrderStatusClass(
                        status
                    );


                // top_orders does not contain
                // order_date or delivery_date.
                //
                // Therefore don't invent them.

                row.innerHTML = `
                    <td>
                        ${escapeHTML(poNumber)}
                    </td>

                    <td>
                        ${escapeHTML(vendor)}
                    </td>

                    <td>
                        ${money(amount)}
                    </td>

                    <td>
                        <span
                            class="status ${statusClass}"
                        >
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>
                        -
                    </td>

                    <td>
                        -
                    </td>
                `;


                tbody.appendChild(
                    row
                );
            }
        );
}


// ============================================================
// ORDER STATUS CLASS
// ============================================================

function getOrderStatusClass(
    status
) {

    const value =
        String(
            status ?? ""
        )
        .toLowerCase();


    if (
        value.includes("deliver")
    ) {

        return "delivered";
    }


    if (
        value.includes("transit")
    ) {

        return "transit";
    }


    if (
        value.includes("partial")
    ) {

        return "partial";
    }


    if (
        value.includes("cancel")
    ) {

        return "cancelled";
    }


    if (
        value.includes("approv")
    ) {

        return "approved";
    }


    return "pending";
}


// ============================================================
// ============================================================
// INVOICE OVERVIEW
// ============================================================
// ============================================================

function loadInvoiceOverview(
    invoiceOverview
) {

    invoiceOverview =
        safeObject(
            invoiceOverview
        );


    // ========================================================
    // EXACT CRUD FIELDS
    // ========================================================

    const total =
        Number(
            invoiceOverview.total_invoices
        ) || 0;


    const paid =
        Number(
            invoiceOverview.paid_invoices
        ) || 0;


    const pending =
        Number(
            invoiceOverview.pending_invoices
        ) || 0;


    const overdue =
        Number(
            invoiceOverview.overdue_invoices
        ) || 0;


    // ========================================================
    // COUNTS
    // ========================================================

    setText(
        "invoiceTotal",
        numberFormat(total)
    );


    setText(
        "invoicePaid",
        numberFormat(paid)
    );


    setText(
        "invoicePending",
        numberFormat(pending)
    );


    setText(
        "invoiceOverdue",
        numberFormat(overdue)
    );


    // ========================================================
    // AMOUNTS
    // ========================================================

    setText(
        "invoiceTotalAmount",
        money(
            invoiceOverview.total_amount
        )
    );


    setText(
        "invoicePaidAmount",
        money(
            invoiceOverview.paid_amount
        )
    );


    setText(
        "invoicePendingAmount",
        money(
            invoiceOverview.pending_amount
        )
    );


    setText(
        "invoiceOverdueAmount",
        money(
            invoiceOverview.overdue_amount
        )
    );


    // ========================================================
    // RECENT INVOICES
    // ========================================================

    renderRecentInvoices(
        invoiceOverview.recent_invoices
    );
}


// ============================================================
// ============================================================
// RECENT INVOICES
// ============================================================
// ============================================================

function renderRecentInvoices(
    invoices
) {

    const tbody =
        document.getElementById(
            "invoiceTableBody"
        );


    if (!tbody) {
        return;
    }


    invoices =
        safeArray(
            invoices
        );


    tbody.innerHTML = "";


    if (
        invoices.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    No recent invoices available.
                </td>
            </tr>
        `;

        return;
    }


    invoices
        .slice(0, 5)
        .forEach(
            invoice => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const invoiceNumber =
                    invoice.invoice_number ??
                    "-";


                const amount =
                    Number(
                        invoice.amount
                    ) || 0;


                const status =
                    String(
                        invoice.status ??
                        "Pending"
                    );


                const vendorId =
                    invoice.vendor_id ??
                    "-";


                row.innerHTML = `
                    <td>
                        ${escapeHTML(
                            invoiceNumber
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            String(vendorId)
                        )}
                    </td>

                    <td>
                        ${money(amount)}
                    </td>

                    <td>
                        <span
                            class="status ${getInvoiceStatusClass(status)}"
                        >
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(
                                invoice.invoice_date
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            String(
                                invoice.id ??
                                "-"
                            )
                        )}
                    </td>
                `;


                tbody.appendChild(
                    row
                );
            }
        );
}


// ============================================================
// INVOICE STATUS CLASS
// ============================================================

function getInvoiceStatusClass(
    status
) {

    const value =
        String(
            status ?? ""
        )
        .toLowerCase();


    if (
        value === "paid"
    ) {

        return "delivered";
    }


    if (
        value === "overdue"
    ) {

        return "cancelled";
    }


    return "pending";
}


// ============================================================
// ============================================================
// PENDING VENDORS
// ============================================================
// ============================================================

function renderPendingVendors(
    vendors
) {

    const tbody =
        document.getElementById(
            "pendingVendorTableBody"
        );


    const count =
        document.getElementById(
            "pendingVendorCount"
        );


    if (!tbody) {

        console.warn(
            "pendingVendorTableBody not found."
        );

        return;
    }


    vendors =
        safeArray(
            vendors
        );


    // ========================================================
    // COUNT
    // ========================================================

    if (count) {

        count.textContent =
            `${vendors.length} Pending`;
    }


    tbody.innerHTML = "";


    if (
        vendors.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="loading-cell"
                >
                    No pending vendor approvals.
                </td>
            </tr>
        `;

        return;
    }


    // ========================================================
    // RENDER
    // ========================================================

    vendors.forEach(
        vendor => {

            const row =
                document.createElement(
                    "tr"
                );


            const vendorId =
                vendor.vendor_id ??
                "-";


            const vendorName =
                vendor.vendor_name ??
                "-";


            const country =
                vendor.country ??
                "-";


            const email =
                vendor.email ??
                "-";


            const phone =
                vendor.phone ??
                "-";


            const businessType =
                vendor.business_type ??
                "-";


            const status =
                vendor.status ??
                "Pending";


            row.innerHTML = `
                <td>
                    ${escapeHTML(vendorId)}
                </td>

                <td>
                    ${escapeHTML(vendorName)}
                </td>

                <td>
                    ${escapeHTML(country)}
                </td>

                <td>
                    ${escapeHTML(email)}
                </td>

                <td>
                    ${escapeHTML(phone)}
                </td>

                <td>
                    ${escapeHTML(businessType)}
                </td>

                <td>
                    <span class="status pending">
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>

                    <button
                        type="button"
                        class="approve-btn"
                        onclick="approveVendor('${escapeAttribute(vendorId)}')"
                    >
                        Approve
                    </button>

                    <button
                        type="button"
                        class="reject-btn"
                        onclick="rejectVendor('${escapeAttribute(vendorId)}')"
                    >
                        Reject
                    </button>

                </td>
            `;


            tbody.appendChild(
                row
            );
        }
    );
}


// ============================================================
// ============================================================
// OPTIONAL SEPARATE PENDING VENDOR API
// ============================================================
// ============================================================
// Your main /admin/Dashboard already includes the pending list.
//
// This function is retained only if another part of your HTML
// explicitly needs the separate endpoint.
// ============================================================

async function loadPendingVendors() {

    try {

        const data =
            await getJSON(
                `${API}/api/admin/vendor-registrations`
            );


        renderPendingVendors(
            data
        );


    }
    catch (error) {

        console.error(
            "Pending vendor loading error:",
            error
        );


        const tbody =
            document.getElementById(
                "pendingVendorTableBody"
            );


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="loading-cell"
                    >
                        Failed to load pending vendor approvals.
                    </td>
                </tr>
            `;
        }
    }
}


// ============================================================
// ============================================================
// APPROVE VENDOR
// ============================================================
// ============================================================

async function approveVendor(
    vendorId
) {

    if (!vendorId) {

        alert(
            "Vendor ID is missing."
        );

        return;
    }


    const confirmed =
        confirm(
            `Approve vendor ${vendorId}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const result =
            await putJSON(
                `${API}/api/admin/vendor-registrations/${encodeURIComponent(vendorId)}/approve`
            );


        console.log(
            "Approve response:",
            result
        );


        alert(
            result?.message ||
            "Vendor approved successfully."
        );


        // ====================================================
        // Refresh entire dashboard.
        // ====================================================

        await loadDashboard();


    }
    catch (error) {

        console.error(
            "Approve vendor error:",
            error
        );


        if (
            error.message.includes(
                "401"
            )
        ) {

            logoutAdmin();

            return;
        }


        alert(
            error.message ||
            "Failed to approve vendor."
        );
    }
}


// ============================================================
// ============================================================
// REJECT VENDOR
// ============================================================
// ============================================================

async function rejectVendor(
    vendorId
) {

    if (!vendorId) {

        alert(
            "Vendor ID is missing."
        );

        return;
    }


    const confirmed =
        confirm(
            `Reject vendor ${vendorId}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const result =
            await putJSON(
                `${API}/api/admin/vendor-registrations/${encodeURIComponent(vendorId)}/reject`
            );


        console.log(
            "Reject response:",
            result
        );


        alert(
            result?.message ||
            "Vendor rejected successfully."
        );


        // ====================================================
        // Refresh entire dashboard.
        // ====================================================

        await loadDashboard();


    }
    catch (error) {

        console.error(
            "Reject vendor error:",
            error
        );


        if (
            error.message.includes(
                "401"
            )
        ) {

            logoutAdmin();

            return;
        }


        alert(
            error.message ||
            "Failed to reject vendor."
        );
    }
}


// ============================================================
// ============================================================
// ERROR HANDLER
// ============================================================
// ============================================================

function handleDashboardError(
    error
) {

    const message =
        error?.message ||
        "Unable to load Admin Dashboard.";


    console.error(
        "Dashboard error:",
        message
    );


    // ========================================================
    // 401
    // ========================================================

    if (
        message.includes("401") ||
        message
            .toLowerCase()
            .includes("unauthorized")
    ) {

        alert(
            "Your session has expired. Please login again."
        );


        logoutAdmin();

        return;
    }


    // ========================================================
    // 403
    // ========================================================

    if (
        message.includes("403") ||
        message
            .toLowerCase()
            .includes("forbidden")
    ) {

        alert(
            "Admin authorization is required to access this dashboard."
        );

        return;
    }


    // ========================================================
    // GENERAL ERROR
    // ========================================================

    console.error(
        "VendorIQ Admin Dashboard could not be loaded:",
        message
    );
}


// ============================================================
// ============================================================
// REFRESH DASHBOARD
// ============================================================
// ============================================================

async function refreshDashboard() {

    console.log(
        "Refreshing Admin Dashboard..."
    );


    const refreshButton =
        document.querySelector(
            ".refresh"
        );


    if (refreshButton) {

        refreshButton.disabled =
            true;

        refreshButton.classList.add(
            "loading"
        );
    }


    try {

        await loadDashboard();


        console.log(
            "Dashboard refreshed successfully."
        );


    }
    catch (error) {

        console.error(
            "Dashboard refresh error:",
            error
        );


    }
    finally {

        if (refreshButton) {

            refreshButton.disabled =
                false;

            refreshButton.classList.remove(
                "loading"
            );
        }
    }
}


// ============================================================
// ============================================================
// ADMIN PROFILE
// ============================================================
// ============================================================

function openAdminProfile() {

    window.location.href =
        "/admin/profile";
}


// ============================================================
// ============================================================
// LOGOUT
// ============================================================
// ============================================================

function logoutAdmin() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "token"
    );


    sessionStorage.removeItem(
        "access_token"
    );

    sessionStorage.removeItem(
        "token"
    );


    window.location.href =
        "/login";
}


// ============================================================
// ============================================================
// UPDATE HEADER
// ============================================================
// ============================================================

function updateHeader(
    user
) {

    user =
        safeObject(
            user
        );


    const name =
        user.name ||
        user.fullname ||
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


// ============================================================
// ============================================================
// INITIALIZATION
// ============================================================
// ============================================================

async function initializeDashboard() {

    console.log(
        "=========================================="
    );

    console.log(
        "VendorIQ Admin Dashboard"
    );

    console.log(
        "Using /admin/Dashboard"
    );

    console.log(
        "=========================================="
    );


    // ========================================================
    // IMPORTANT
    // ========================================================
    //
    // Only ONE request is needed because the backend already
    // includes pending_vendor_registrations.
    //
    // ========================================================

    await loadDashboard();


    console.log(
        "=========================================="
    );

    console.log(
        "Admin Dashboard initialization complete"
    );

    console.log(
        "=========================================="
    );
}


// ============================================================
// ============================================================
// DOM READY
// ============================================================
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const refreshButton =
            document.querySelector(
                ".refresh"
            );


        if (refreshButton) {

            refreshButton.onclick =
                function(event) {

                    if (event) {
                        event.preventDefault();
                    }

                    refreshDashboard();
                };
        }


        initializeDashboard();
    }
);


// ============================================================
// ============================================================
// GLOBAL FUNCTIONS
// ============================================================
// ============================================================
// Required if your HTML uses onclick="..."
// ============================================================

window.loadDashboard =
    loadDashboard;


window.refreshDashboard =
    refreshDashboard;


window.loadPendingVendors =
    loadPendingVendors;


window.approveVendor =
    approveVendor;


window.rejectVendor =
    rejectVendor;


window.openAdminProfile =
    openAdminProfile;


window.logoutAdmin =
    logoutAdmin;