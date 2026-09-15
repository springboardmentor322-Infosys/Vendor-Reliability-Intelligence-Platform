/* ==========================================================
   VENDORIQ - VENDOR DASHBOARD JAVASCRIPT
   FastAPI + PostgreSQL Integration
========================================================== */

"use strict";


/* ==========================================================
   API CONFIGURATION
========================================================== */

const API = "http://127.0.0.1:8000";

const DASHBOARD_REFRESH_INTERVAL = 60000;

let performanceChart = null;
let contractChart = null;

let dashboardData = null;

let dashboardRefreshTimer = null;

let dashboardInitialized = false;


/* ==========================================================
   AUTH TOKEN
========================================================== */

function getAuthToken() {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("jwt_token");

    if (!token) {
        return null;
    }

    return String(token).trim();
}


/* ==========================================================
   JWT PAYLOAD
========================================================== */

function getJWTPayload() {

    const token = getAuthToken();

    if (!token) {
        return null;
    }

    try {

        const parts =
            token.split(".");

        if (parts.length !== 3) {
            return null;
        }

        let base64 =
            parts[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

        while (base64.length % 4 !== 0) {
            base64 += "=";
        }

        const json =
            decodeURIComponent(
                atob(base64)
                    .split("")
                    .map(
                        character =>
                            "%" +
                            (
                                "00" +
                                character
                                    .charCodeAt(0)
                                    .toString(16)
                            ).slice(-2)
                    )
                    .join("")
            );

        return JSON.parse(json);

    } catch (error) {

        console.warn(
            "Unable to decode JWT payload:",
            error
        );

        return null;
    }
}


/* ==========================================================
   VENDOR ID
   JWT IS THE PRIMARY SOURCE
========================================================== */

function getVendorId() {

    /*
       -------------------------------------------------------
       1. FIRST: Read vendor ID from JWT
       -------------------------------------------------------
       The JWT belongs to the currently authenticated session,
       so it should take priority over old browser storage.
    */

    const payload = getJWTPayload();

    if (payload) {

        const tokenVendorId =
            payload.vendor_id ||
            payload.vendorId ||
            payload.vendor_db_id ||
            payload.vendor ||
            null;

        if (
            tokenVendorId !== undefined &&
            tokenVendorId !== null &&
            String(tokenVendorId).trim()
        ) {

            const value =
                String(tokenVendorId).trim();

            /*
               Keep browser storage synchronized
               with the authenticated vendor.
            */

            localStorage.setItem(
                "vendor_id",
                value
            );

            sessionStorage.setItem(
                "vendor_id",
                value
            );

            /*
               Remove possible stale alternative keys.
            */

            localStorage.removeItem("vendorId");
            sessionStorage.removeItem("vendorId");

            console.log(
                "Vendor ID from JWT:",
                value
            );

            return value;
        }
    }


    /*
       -------------------------------------------------------
       2. FALLBACK: Browser storage
       -------------------------------------------------------
       Only use storage if the JWT does not contain
       a vendor ID.
    */

    const storedValue =
        localStorage.getItem("vendor_id") ||
        localStorage.getItem("vendorId") ||
        sessionStorage.getItem("vendor_id") ||
        sessionStorage.getItem("vendorId");


    if (
        storedValue &&
        String(storedValue).trim()
    ) {

        const value =
            String(storedValue).trim();

        console.log(
            "Vendor ID from browser storage:",
            value
        );

        return value;
    }


    /*
       -------------------------------------------------------
       3. Nothing found
       -------------------------------------------------------
    */

    console.warn(
        "Vendor ID could not be determined."
    );

    return null;
}


/* ==========================================================
   USER ID
========================================================== */

function getUserId() {

    const value =
        localStorage.getItem("user_id") ||
        localStorage.getItem("userId") ||
        sessionStorage.getItem("user_id") ||
        sessionStorage.getItem("userId");

    if (!value) {
        return null;
    }

    return String(value).trim();
}


/* ==========================================================
   AUTHORIZATION CHECK
========================================================== */

function hasAuthentication() {

    return Boolean(
        getAuthToken()
    );
}


/* ==========================================================
   API URL
========================================================== */

function buildApiUrl(
    path
) {

    if (!path) {
        return API;
    }


    if (
        path.startsWith("http://") ||
        path.startsWith("https://")
    ) {

        return path;
    }


    if (!path.startsWith("/")) {
        path = "/" + path;
    }


    return API + path;
}


/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(
    endpoint,
    options = {}
) {

    const token =
        getAuthToken();


    const requestHeaders = {
        Accept: "application/json",
        ...(options.headers || {})
    };


    /*
       Only add Content-Type when
       there is a request body.
    */

    if (
        options.body &&
        !requestHeaders["Content-Type"]
    ) {

        requestHeaders["Content-Type"] =
            "application/json";
    }


    if (token) {

        requestHeaders["Authorization"] =
            `Bearer ${token}`;
    }


    const url =
        buildApiUrl(endpoint);


    console.log(
        "API REQUEST:",
        options.method || "GET",
        url
    );


    if (token) {

        console.log(
            "Authorization: Bearer [TOKEN PRESENT]"
        );

    } else {

        console.warn(
            "Authorization token not found."
        );
    }


    let response;


    try {

        response =
            await fetch(
                url,
                {
                    ...options,
                    headers: requestHeaders
                }
            );

    } catch (networkError) {

        console.error(
            "Network error:",
            networkError
        );

        throw new Error(
            "Unable to connect to the FastAPI server. Make sure the backend is running."
        );
    }


    const text =
        await response.text();


    let data = null;


    if (text) {

        try {

            data =
                JSON.parse(text);

        } catch (parseError) {

            data = text;
        }
    }


    console.log(
        "API STATUS:",
        response.status,
        url
    );


    if (!response.ok) {

        let message =
            `Request failed with status ${response.status}.`;


        if (data) {

            if (
                typeof data === "string"
            ) {

                message =
                    data;

            }
            else if (
                data.detail
            ) {

                if (
                    Array.isArray(
                        data.detail
                    )
                ) {

                    message =
                        data.detail
                            .map(
                                item => {

                                    if (
                                        typeof item === "string"
                                    ) {

                                        return item;
                                    }

                                    return (
                                        item.msg ||
                                        JSON.stringify(item)
                                    );
                                }
                            )
                            .join("; ");

                } else {

                    message =
                        String(
                            data.detail
                        );
                }

            }
            else if (
                data.message
            ) {

                message =
                    String(
                        data.message
                    );
            }
        }


        if (response.status === 401) {

            message =
                "Authentication failed. Please login again.";

        }
        else if (
            response.status === 403
        ) {

            message =
                data?.detail ||
                "You do not have permission to access this dashboard.";

        }
        else if (
            response.status === 404
        ) {

            message =
                data?.detail ||
                "Dashboard API endpoint was not found.";

        }
        else if (
            response.status === 422
        ) {

            message =
                data?.detail
                    ? (
                        Array.isArray(data.detail)
                            ? data.detail
                                .map(
                                    item =>
                                        item.msg ||
                                        JSON.stringify(item)
                                )
                                .join("; ")
                            : String(data.detail)
                    )
                    : "Invalid request.";

        }
        else if (
            response.status >= 500
        ) {

            message =
                data?.detail ||
                "Server error occurred while loading the dashboard.";
        }


        const error =
            new Error(message);

        error.status =
            response.status;

        error.data =
            data;

        throw error;
    }


    return data;
}


/* ==========================================================
   HELPER
========================================================== */

function firstDefined(
    object,
    keys,
    defaultValue = null
) {

    if (
        object === null ||
        object === undefined
    ) {

        return defaultValue;
    }


    for (
        const key of keys
    ) {

        if (
            object[key] !== undefined &&
            object[key] !== null
        ) {

            return object[key];
        }
    }


    return defaultValue;
}


/* ==========================================================
   NUMBER VALUE
========================================================== */

function numberValue(
    value,
    fallback = 0
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return fallback;
    }


    const number =
        Number(
            value
        );


    return Number.isFinite(number)
        ? number
        : fallback;
}


/* ==========================================================
   MONEY FORMAT
========================================================== */

function formatMoney(
    value,
    currency = "₹"
) {

    const number =
        numberValue(
            value
        );


    return (
        currency +
        number.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )
    );
}


/* ==========================================================
   DATE FORMAT
========================================================== */

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return escapeHTML(
            value
        );
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


/* ==========================================================
   SET TEXT
========================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        element.textContent =
            "—";

    } else {

        element.textContent =
            String(value);
    }
}


/* ==========================================================
   SET WIDTH
========================================================== */

function setWidth(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    const safeValue =
        Math.max(
            0,
            Math.min(
                100,
                numberValue(
                    value
                )
            )
        );


    element.style.width =
        `${safeValue}%`;
}


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)
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


/* ==========================================================
   ESCAPE ATTRIBUTE
========================================================== */

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );
}


/* ==========================================================
   DASHBOARD API
========================================================== */

async function loadDashboard() {

    const vendorId =
        getVendorId();


    if (!vendorId) {

        throw new Error(
            "Vendor ID not found. Please login again."
        );
    }


    /*
       Primary endpoint:

       GET
       /api/vendor/{vendor_id}/dashboard
    */

    const url =
        `${API}/api/vendor/${encodeURIComponent(vendorId)}/dashboard`;


    console.log(
        "Loading vendor dashboard:",
        url
    );


    const data =
        await apiFetch(
            url
        );


    if (
        !data ||
        typeof data !== "object"
    ) {

        throw new Error(
            "Invalid dashboard response received from server."
        );
    }


    dashboardData =
        data;


    console.log(
        "Vendor dashboard response:",
        data
    );


    populateDashboard(
        data
    );


    return data;
}


/* ==========================================================
   POPULATE DASHBOARD
========================================================== */

function populateDashboard(data) {

    if (!data || typeof data !== "object") {

        console.error(
            "Invalid dashboard response:",
            data
        );

        return;
    }


    console.log(
        "Processing dashboard response:",
        data
    );


    /* ------------------------------------------------------
       ACTUAL FASTAPI RESPONSE STRUCTURE
    ------------------------------------------------------ */

    const vendor =
        data.vendor ||
        {};


    const summary =
        data.summary ||
        {};


    const performance =
        data.performance ||
        {};


    const contracts =
        data.contracts ||
        {};


    const invoices =
        data.invoices ||
        {};


    const account =
        data.account ||
        {};


    /* ------------------------------------------------------
       VENDOR
    ------------------------------------------------------ */

    populateVendor({
        ...vendor,
        ...account
    });


    /* ------------------------------------------------------
       STATISTICS
    ------------------------------------------------------ */

    populateStatistics(
        summary,
        performance,
        invoices
    );


    /* ------------------------------------------------------
       PURCHASE ORDERS
    ------------------------------------------------------ */

    populateOrders(
        data.purchase_orders || []
    );


    /* ------------------------------------------------------
       CONTRACT ALERTS
    ------------------------------------------------------ */

    populateAlerts(
        data.alerts || []
    );


    /* ------------------------------------------------------
       NOTIFICATIONS
    ------------------------------------------------------ */

    populateNotifications(
        data.notifications || []
    );


    /* ------------------------------------------------------
       DOCUMENTS
    ------------------------------------------------------ */

    populateDocuments(
        data.documents || []
    );


    /* ------------------------------------------------------
       CONTRACTS
    ------------------------------------------------------ */

    populateContracts(
        contracts
    );


    /* ------------------------------------------------------
       PERFORMANCE TREND
       
       Your current API does NOT return performance_trend.
       Therefore an empty array is passed.
    ------------------------------------------------------ */

    populatePerformanceChart(
        data.performance_trend ||
        data.performanceTrend ||
        data.trend ||
        []
    );


    console.log(
        "Vendor dashboard populated successfully."
    );
}



/* ==========================================================
   NORMALIZE ARRAY
========================================================== */

function normalizeArray(
    value
) {

    if (Array.isArray(value)) {
        return value;
    }


    if (
        value &&
        Array.isArray(value.items)
    ) {

        return value.items;
    }


    if (
        value &&
        Array.isArray(value.results)
    ) {

        return value.results;
    }


    return [];
}


/* ==========================================================
   VENDOR INFORMATION
========================================================== */

function populateVendor(vendor) {

    vendor =
        vendor || {};


    const vendorId =
        firstDefined(
            vendor,
            [
                "vendor_id",
                "vendorId",
                "id"
            ],
            getVendorId() || "—"
        );


    const companyName =
        firstDefined(
            vendor,
            [
                "vendor_name",
                "company_name",
                "companyName",
                "name"
            ],
            "Vendor"
        );


    const status =
        firstDefined(
            vendor,
            [
                "status",
                "vendor_status",
                "vendorStatus"
            ],
            "Active"
        );


    const contact =
        firstDefined(
            vendor,
            [
                "primary_contact",
                "contact_person",
                "primaryContact",
                "contactName"
            ],
            "—"
        );


    const email =
        firstDefined(
            vendor,
            [
                "email",
                "contact_email",
                "contactEmail"
            ],
            "—"
        );


    const phone =
        firstDefined(
            vendor,
            [
                "phone",
                "contact_phone",
                "contactPhone"
            ],
            "—"
        );


    /* ------------------------------------------------------
       SIDEBAR
    ------------------------------------------------------ */

    setText(
        "sidebarCompany",
        companyName
    );


    setText(
        "sidebarVendorId",
        vendorId
    );


    /* ------------------------------------------------------
       HEADER
    ------------------------------------------------------ */

    setText(
        "headerCompany",
        companyName
    );


    setText(
        "vendorId",
        vendorId
    );


    /* ------------------------------------------------------
       CONTACT INFORMATION
    ------------------------------------------------------ */

    setText(
        "primaryContact",
        contact
    );


    setText(
        "contactEmail",
        email
    );


    setText(
        "contactPhone",
        phone
    );


    /* ------------------------------------------------------
       STATUS
    ------------------------------------------------------ */

    const statusElement =
        document.getElementById(
            "sidebarStatus"
        );


    if (statusElement) {

        statusElement.innerHTML =
            `
                <i class="fa-solid fa-circle"></i>
                ${escapeHTML(status)}
            `;
    }
}


/* ==========================================================
   STATISTICS
========================================================== */

function populateStatistics(
    summary,
    performance,
    invoices
) {

    summary =
        summary || {};


    performance =
        performance || {};


    invoices =
        invoices || {};


    /* ======================================================
       RELIABILITY SCORE
    ====================================================== */

    const reliability =
        numberValue(
            summary.reliability_score,
            0
        );


    setText(
        "reliability",
        Math.round(
            reliability
        )
    );


    setText(
        "gaugeScore",
        Math.round(
            reliability
        )
    );


    const reliabilityLabel =
        getReliabilityLabel(
            reliability
        );


    setText(
        "reliabilityLabel",
        reliabilityLabel
    );


    setText(
        "gaugeLabel",
        reliabilityLabel
    );


    updateGauge(
        reliability
    );


    /* ======================================================
       TOTAL PURCHASE ORDERS
    ====================================================== */

    const totalOrders =
        numberValue(
            summary.total_purchase_orders,
            0
        );


    setText(
        "totalOrders",
        totalOrders
    );


    /* ======================================================
       ON-TIME DELIVERY
    ====================================================== */

    const deliveryRate =
        numberValue(
            summary.on_time_delivery,
            0
        );


    setText(
        "deliveryRate",
        `${deliveryRate.toFixed(1)}%`
    );


    setText(
        "onTimeDeliveryRate",
        `${deliveryRate.toFixed(1)}%`
    );


    setWidth(
        "onTimeDeliveryBar",
        deliveryRate
    );


    /* ======================================================
       QUALITY
    ====================================================== */

    const quality =
        numberValue(
            summary.quality_rating,
            numberValue(
                performance.quality_score,
                0
            )
        );


    setText(
        "qualityRating",
        quality.toFixed(1)
    );


    setText(
        "qualityPerformance",
        `${quality.toFixed(1)} / 5`
    );


    /*
       Convert 0-5 quality score
       into 0-100 percentage.
    */

    const qualityPercent =
        Math.max(
            0,
            Math.min(
                100,
                quality * 20
            )
        );


    setWidth(
        "qualityPerformanceBar",
        qualityPercent
    );


    setText(
        "qualityPerformanceRate",
        `${qualityPercent.toFixed(0)}%`
    );


    /* ======================================================
       TOTAL INVOICED
    ====================================================== */

    const totalInvoiced =
        numberValue(
            summary.total_invoiced,
            numberValue(
                invoices.total_amount,
                0
            )
        );


    setText(
        "totalInvoiced",
        formatMoney(
            totalInvoiced
        )
    );


    /* ======================================================
       PENDING PAYMENTS
    ====================================================== */

    const pendingPayments =
        numberValue(
            summary.pending_payments,
            numberValue(
                invoices.pending_amount,
                0
            )
        );


    setText(
        "pendingPayments",
        formatMoney(
            pendingPayments
        )
    );


    /* ======================================================
       PENDING INVOICE COUNT
    ====================================================== */

    const pendingInvoices =
        numberValue(
            summary.pending_invoice_count,
            invoices.pending || 0
        );


    setText(
        "pendingInvoiceCount",
        `${pendingInvoices} Invoice${
            pendingInvoices === 1
                ? ""
                : "s"
        }`
    );


    /* ======================================================
       ON-TIME DELIVERIES
    ====================================================== */

    const onTimeDeliveries =
        numberValue(
            performance.on_time_deliveries,
            0
        );


    setText(
        "onTimeDeliveries",
        onTimeDeliveries
    );


    /* ======================================================
       DELAYED DELIVERIES
    ====================================================== */

    const delayedDeliveries =
        numberValue(
            performance.delayed_deliveries,
            summary.delayed_orders || 0
        );


    setText(
        "delayedDeliveries",
        delayedDeliveries
    );


    /* ======================================================
       RESPONSE TIME
    ====================================================== */

    const responseTime =
        numberValue(
            performance.response_time_hours,
            0
        );


    setText(
        "responseTime",
        `${responseTime} hrs`
    );


    /* ======================================================
       ISSUE RESOLUTION
    ====================================================== */

    const issueResolution =
        numberValue(
            performance.issue_resolution_days,
            0
        );


    setText(
        "issueResolutionTime",
        `${issueResolution} days`
    );


    /* ======================================================
       ORDER COMPLETION RATE
    ====================================================== */

    const completionRate =
        numberValue(
            performance.order_completion_rate,
            summary.order_completion_rate || 0
        );


    setText(
        "orderCompletionRate",
        `${completionRate.toFixed(1)}%`
    );


    /* ======================================================
       DELAY RATE
    ====================================================== */

    let delayedRate = 0;


    const totalDeliveryOrders =
        onTimeDeliveries +
        delayedDeliveries;


    if (
        totalDeliveryOrders > 0
    ) {

        delayedRate =
            (
                delayedDeliveries /
                totalDeliveryOrders
            ) *
            100;

    } else if (
        deliveryRate > 0
    ) {

        delayedRate =
            Math.max(
                100 -
                deliveryRate,
                0
            );
    }


    setText(
        "delayedDeliveryRate",
        `${delayedRate.toFixed(1)}%`
    );


    setWidth(
        "delayedDeliveryBar",
        delayedRate
    );


    /* ======================================================
       RESPONSE PERFORMANCE BAR
    ====================================================== */

    const responsePercentage =
        responseTime <= 0
            ? 0
            : Math.max(
                0,
                Math.min(
                    100,
                    100 -
                    (
                        responseTime * 4
                    )
                )
            );


    setWidth(
        "responseTimeBar",
        responsePercentage
    );


    setText(
        "responseTimeRate",
        `${responsePercentage.toFixed(0)}%`
    );


    /* ======================================================
       ISSUE RESOLUTION BAR
    ====================================================== */

    const resolutionPercentage =
        issueResolution <= 0
            ? 0
            : Math.max(
                0,
                Math.min(
                    100,
                    100 -
                    (
                        issueResolution * 10
                    )
                )
            );


    setWidth(
        "issueResolutionBar",
        resolutionPercentage
    );


    setText(
        "issueResolutionRate",
        `${resolutionPercentage.toFixed(0)}%`
    );


    /* ======================================================
       ORDER COMPLETION BAR
    ====================================================== */

    setWidth(
        "orderCompletionBar",
        completionRate
    );


    /* ======================================================
       EXTRA SUMMARY VALUES
       
       These IDs will only update if they exist
       in your HTML.
    ====================================================== */

    setText(
        "deliveredOrders",
        summary.delivered_orders || 0
    );


    setText(
        "delayedOrders",
        summary.delayed_orders || 0
    );


    setText(
        "inTransitOrders",
        summary.in_transit_orders || 0
    );


    setText(
        "pendingOrders",
        summary.pending_orders || 0
    );
}


/* ==========================================================
   RELIABILITY LABEL
========================================================== */

function getReliabilityLabel(
    score
) {

    score =
        numberValue(
            score
        );


    if (score >= 90) {
        return "Excellent Reliability";
    }


    if (score >= 75) {
        return "High Reliability";
    }


    if (score >= 60) {
        return "Moderate Reliability";
    }


    if (score >= 40) {
        return "Low Reliability";
    }


    return "Poor Reliability";
}


/* ==========================================================
   GAUGE
========================================================== */

function updateGauge(
    score
) {

    const needle =
        document.getElementById(
            "gaugeNeedle"
        );


    if (!needle) {
        return;
    }


    const safeScore =
        Math.max(
            0,
            Math.min(
                100,
                numberValue(
                    score
                )
            )
        );


    /*
       Convert 0-100 into
       -90 to +90 degrees.
    */

    const angle =
        -90 +
        (
            safeScore * 1.8
        );


    needle.style.transform =
        `rotate(${angle}deg)`;


    needle.style.transformOrigin =
        "center bottom";
}


/* ==========================================================
   PURCHASE ORDERS
========================================================== */

function populateOrders(
    orders
) {

    const table =
        document.getElementById(
            "ordersTable"
        );


    if (!table) {
        return;
    }


    const normalizedOrders =
        normalizeArray(
            orders
        );


    if (
        normalizedOrders.length === 0
    ) {

        table.innerHTML =
            `
                <tr class="no-orders-row">
                    <td colspan="5"
                        style="text-align:center;">
                        No purchase orders found.
                    </td>
                </tr>
            `;

        return;
    }


    table.innerHTML =
        normalizedOrders
            .slice(0, 6)
            .map(
                order => {

                    if (
                        !order ||
                        typeof order !== "object"
                    ) {

                        return "";
                    }


                    const poNumber =
                        firstDefined(
                            order,
                            [
                                "po_number",
                                "purchase_order_number",
                                "poNumber",
                                "number"
                            ],
                            "—"
                        );


                    const item =
                        firstDefined(
                            order,
                            [
                                "item",
                                "item_service",
                                "description",
                                "product",
                                "item_name"
                            ],
                            "—"
                        );


                    const status =
                        firstDefined(
                            order,
                            [
                                "status",
                                "order_status"
                            ],
                            "Pending"
                        );


                    const orderDate =
                        firstDefined(
                            order,
                            [
                                "order_date",
                                "created_at",
                                "orderDate"
                            ],
                            null
                        );


                    const deliveryDate =
                        firstDefined(
                            order,
                            [
                                "actual_delivery",
                                "delivery_date",
                                "expected_delivery",
                                "deliveryDate"
                            ],
                            null
                        );


                    return `
                        <tr>

                            <td>
                                ${escapeHTML(poNumber)}
                            </td>

                            <td>
                                ${escapeHTML(item)}
                            </td>

                            <td>
                                <span class="${getStatusClass(status)}">
                                    ${escapeHTML(status)}
                                </span>
                            </td>

                            <td>
                                ${formatDate(orderDate)}
                            </td>

                            <td>
                                ${formatDate(deliveryDate)}
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


/* ==========================================================
   STATUS CLASS
========================================================== */

function getStatusClass(
    status
) {

    const normalized =
        String(
            status || ""
        )
            .toLowerCase()
            .trim();


    if (
        normalized.includes("deliver") ||
        normalized.includes("complete")
    ) {

        return "status-badge status-delivered";
    }


    if (
        normalized.includes("transit") ||
        normalized.includes("shipping") ||
        normalized.includes("ordered")
    ) {

        return "status-badge status-transit";
    }


    if (
        normalized.includes("pending") ||
        normalized.includes("waiting") ||
        normalized.includes("approval")
    ) {

        return "status-badge status-pending";
    }


    if (
        normalized.includes("cancel") ||
        normalized.includes("reject")
    ) {

        return "status-badge status-cancelled";
    }


    if (
        normalized.includes("approved")
    ) {

        return "status-badge status-approved";
    }


    return "status-badge status-default";
}


/* ==========================================================
   CONTRACT ALERTS
========================================================== */

function populateAlerts(
    alerts
) {

    const container =
        document.getElementById(
            "alertsContainer"
        );


    if (!container) {
        return;
    }


    const normalizedAlerts =
        normalizeArray(
            alerts
        );


    if (
        normalizedAlerts.length === 0
    ) {

        container.innerHTML =
            `
                <div class="empty-state">
                    No contract alerts.
                </div>
            `;

        return;
    }


    container.innerHTML =
        normalizedAlerts
            .slice(0, 4)
            .map(
                alert => {

                    const type =
                        String(
                            firstDefined(
                                alert,
                                [
                                    "type",
                                    "severity",
                                    "priority"
                                ],
                                "warning"
                            )
                        )
                            .toLowerCase();


                    const title =
                        firstDefined(
                            alert,
                            [
                                "message",
                                "title",
                                "alert_message"
                            ],
                            "Contract alert"
                        );


                    const date =
                        firstDefined(
                            alert,
                            [
                                "due_date",
                                "expiry_date",
                                "renewal_date"
                            ],
                            null
                        );


                    const danger =
                        type.includes("danger") ||
                        type.includes("critical") ||
                        type.includes("expired");


                    return `
                        <div class="alert-item">

                            <div class="alert-icon ${
                                danger
                                    ? "danger"
                                    : "warning"
                            }">

                                <i class="fa-solid ${
                                    danger
                                        ? "fa-triangle-exclamation"
                                        : "fa-exclamation"
                                }"></i>

                            </div>

                            <div class="alert-content">

                                <strong>
                                    ${escapeHTML(title)}
                                </strong>

                                ${
                                    date
                                        ? `
                                            <small>
                                                Due date:
                                                ${formatDate(date)}
                                            </small>
                                          `
                                        : ""
                                }

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* ==========================================================
   NOTIFICATIONS
========================================================== */

function populateNotifications(
    notifications
) {

    const container =
        document.getElementById(
            "notificationsContainer"
        );


    if (!container) {
        return;
    }


    const normalizedNotifications =
        normalizeArray(
            notifications
        );


    if (
        normalizedNotifications.length === 0
    ) {

        container.innerHTML =
            `
                <div class="empty-state">
                    No notifications.
                </div>
            `;

        updateNotificationCount(
            0
        );

        return;
    }


    /*
       Count unread notifications
       when status information exists.
    */

    const unreadCount =
        normalizedNotifications.filter(
            notification => {

                const status =
                    String(
                        firstDefined(
                            notification,
                            [
                                "status"
                            ],
                            ""
                        )
                    )
                        .toLowerCase();


                return (
                    !status ||
                    status === "unread" ||
                    status === "new"
                );
            }
        ).length;


    updateNotificationCount(
        unreadCount
    );


    container.innerHTML =
        normalizedNotifications
            .slice(0, 5)
            .map(
                notification => {

                    const message =
                        firstDefined(
                            notification,
                            [
                                "message",
                                "title",
                                "notification"
                            ],
                            "New notification"
                        );


                    const time =
                        firstDefined(
                            notification,
                            [
                                "created_at",
                                "time",
                                "timestamp"
                            ],
                            null
                        );


                    return `
                        <div class="notification-item">

                            <div class="notification-icon">

                                <i class="fa-regular fa-bell"></i>

                            </div>

                            <div class="notification-text">

                                <strong>
                                    ${escapeHTML(message)}
                                </strong>

                            </div>

                            <span class="notification-time">
                                ${formatRelativeTime(time)}
                            </span>

                        </div>
                    `;
                }
            )
            .join("");
}


/* ==========================================================
   NOTIFICATION COUNT
========================================================== */

function updateNotificationCount(
    count
) {

    const safeCount =
        Math.max(
            0,
            numberValue(
                count
            )
        );


    document
        .querySelectorAll(
            ".notification-count"
        )
        .forEach(
            element => {

                element.textContent =
                    safeCount;
            }
        );
}


/* ==========================================================
   DOCUMENTS
========================================================== */

function populateDocuments(
    documents
) {

    const container =
        document.getElementById(
            "documentsContainer"
        );


    if (!container) {
        return;
    }


    const normalizedDocuments =
        normalizeArray(
            documents
        );


    if (
        normalizedDocuments.length === 0
    ) {

        container.innerHTML =
            `
                <div class="empty-state">
                    No documents found.
                </div>
            `;

        return;
    }


    container.innerHTML =
        normalizedDocuments
            .slice(0, 5)
            .map(
                documentItem => {

                    const name =
                        firstDefined(
                            documentItem,
                            [
                                "document_name",
                                "name",
                                "title",
                                "filename",
                                "file_name"
                            ],
                            "Document"
                        );


                    const uploaded =
                        firstDefined(
                            documentItem,
                            [
                                "uploaded_at",
                                "created_at",
                                "upload_date"
                            ],
                            null
                        );


                    const url =
                        firstDefined(
                            documentItem,
                            [
                                "file_url",
                                "url",
                                "file_path"
                            ],
                            "#"
                        );


                    const safeUrl =
                        String(
                            url || "#"
                        );


                    return `
                        <div class="document-item">

                            <div class="document-icon">

                                <i class="fa-regular fa-file"></i>

                            </div>

                            <div class="document-info">

                                <strong>
                                    ${escapeHTML(name)}
                                </strong>

                                <small>
                                    Uploaded
                                    ${formatDate(uploaded)}
                                </small>

                            </div>

                            <a
                                href="${escapeAttribute(safeUrl)}"
                                class="document-download"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download">

                                <i class="fa-solid fa-download"></i>

                            </a>

                        </div>
                    `;
                }
            )
            .join("");
}


/* ==========================================================
   CONTRACT STATUS
========================================================== */

function populateContracts(
    contracts
) {

    /*
       Support:

       {
          active: 5,
          expiring: 2,
          expired: 1,
          draft: 1
       }

       or:

       {
          statistics: {...}
       }
    */

    if (
        Array.isArray(
            contracts
        )
    ) {

        contracts =
            convertContractArrayToStats(
                contracts
            );
    }


    if (
        contracts &&
        contracts.statistics
    ) {

        contracts =
            contracts.statistics;
    }


    contracts =
        contracts || {};


    const active =
        numberValue(
            firstDefined(
                contracts,
                [
                    "active",
                    "active_contracts",
                    "activeContracts"
                ],
                0
            )
        );


    const expiring =
        numberValue(
            firstDefined(
                contracts,
                [
                    "expiring",
                    "expiring_soon",
                    "expiring_contracts",
                    "expiringContracts"
                ],
                0
            )
        );


    const expired =
        numberValue(
            firstDefined(
                contracts,
                [
                    "expired",
                    "expired_contracts",
                    "expiredContracts"
                ],
                0
            )
        );


    const draft =
        numberValue(
            firstDefined(
                contracts,
                [
                    "draft",
                    "draft_contracts",
                    "draftContracts"
                ],
                0
            )
        );


    let total =
        numberValue(
            firstDefined(
                contracts,
                [
                    "total",
                    "total_contracts",
                    "totalContracts"
                ],
                0
            )
        );


    const calculatedTotal =
        active +
        expiring +
        expired +
        draft;


    if (
        total <= 0 &&
        calculatedTotal > 0
    ) {

        total =
            calculatedTotal;
    }


    setText(
        "totalContracts",
        total
    );


    setText(
        "activeContracts",
        active
    );


    setText(
        "expiringContracts",
        expiring
    );


    setText(
        "expiredContracts",
        expired
    );


    setText(
        "draftContracts",
        draft
    );


    const percentages =
        calculatePercentages(
            [
                active,
                expiring,
                expired,
                draft
            ],
            total
        );


    setText(
        "activeContractPercent",
        `(${percentages[0]}%)`
    );


    setText(
        "expiringContractPercent",
        `(${percentages[1]}%)`
    );


    setText(
        "expiredContractPercent",
        `(${percentages[2]}%)`
    );


    setText(
        "draftContractPercent",
        `(${percentages[3]}%)`
    );


    createContractChart(
        [
            active,
            expiring,
            expired,
            draft
        ]
    );
}


/* ==========================================================
   CONVERT CONTRACT ARRAY
========================================================== */

function convertContractArrayToStats(
    contracts
) {

    const stats = {
        active: 0,
        expiring: 0,
        expired: 0,
        draft: 0
    };


    contracts.forEach(
        contract => {

            const status =
                String(
                    firstDefined(
                        contract,
                        [
                            "status",
                            "contract_status"
                        ],
                        ""
                    )
                )
                    .toLowerCase()
                    .trim();


            if (
                status.includes("active")
            ) {

                stats.active++;

            }
            else if (
                status.includes("expir")
            ) {

                stats.expiring++;

            }
            else if (
                status.includes("expired")
            ) {

                stats.expired++;

            }
            else if (
                status.includes("draft")
            ) {

                stats.draft++;
            }
        }
    );


    stats.total =
        contracts.length;


    return stats;
}


/* ==========================================================
   CALCULATE PERCENTAGES
========================================================== */

function calculatePercentages(
    values,
    total
) {

    if (
        !total ||
        total <= 0
    ) {

        return values.map(
            () => "0.0"
        );
    }


    return values.map(
        value =>
            (
                numberValue(value) /
                total *
                100
            ).toFixed(1)
    );
}


/* ==========================================================
   CONTRACT CHART
========================================================== */

function createContractChart(
    values
) {

    const canvas =
        document.getElementById(
            "contractChart"
        );


    if (!canvas) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        console.error(
            "Chart.js is not loaded. Add Chart.js before this JavaScript file."
        );

        return;
    }


    if (contractChart) {

        contractChart.destroy();

        contractChart =
            null;
    }


    contractChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: [
                        "Active",
                        "Expiring Soon",
                        "Expired",
                        "Draft"
                    ],

                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#18ad70",
                                "#f0c328",
                                "#ee4a52",
                                "#aab4c7"
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
                        },

                        tooltip: {
                            enabled: true
                        }
                    }
                }
            }
        );
}


/* ==========================================================
   PERFORMANCE TREND
========================================================== */

function populatePerformanceChart(
    trend
) {

    const canvas =
        document.getElementById(
            "performanceChart"
        );


    if (!canvas) {
        return;
    }


    const normalizedTrend =
        normalizeArray(
            trend
        );


    let labels = [];
    let reliability = [];
    let delivery = [];
    let quality = [];


    normalizedTrend.forEach(
        item => {

            if (
                !item ||
                typeof item !== "object"
            ) {

                return;
            }


            labels.push(
                firstDefined(
                    item,
                    [
                        "month",
                        "label",
                        "period",
                        "date"
                    ],
                    ""
                )
            );


            reliability.push(
                numberValue(
                    firstDefined(
                        item,
                        [
                            "reliability_score",
                            "reliability",
                            "reliabilityScore"
                        ],
                        0
                    )
                )
            );


            delivery.push(
                numberValue(
                    firstDefined(
                        item,
                        [
                            "on_time_delivery",
                            "delivery_rate",
                            "on_time_delivery_rate",
                            "deliveryRate"
                        ],
                        0
                    )
                )
            );


            const qualityValue =
                numberValue(
                    firstDefined(
                        item,
                        [
                            "quality_score",
                            "quality",
                            "qualityScore"
                        ],
                        0
                    )
                );


            /*
               If quality is already a percentage,
               don't multiply by 20.
            */

            quality.push(
                qualityValue <= 5
                    ? qualityValue * 20
                    : qualityValue
            );
        }
    );


    /*
       If no trend is returned,
       generate six empty months.
    */

    if (
        labels.length === 0
    ) {

        const now =
            new Date();


        for (
            let i = 5;
            i >= 0;
            i--
        ) {

            const date =
                new Date(
                    now.getFullYear(),
                    now.getMonth() - i,
                    1
                );


            labels.push(
                date.toLocaleDateString(
                    "en-US",
                    {
                        month: "short",
                        year: "numeric"
                    }
                )
            );


            reliability.push(
                0
            );


            delivery.push(
                0
            );


            quality.push(
                0
            );
        }
    }


    createPerformanceChart(
        labels,
        reliability,
        delivery,
        quality
    );
}


/* ==========================================================
   PERFORMANCE CHART
========================================================== */

function createPerformanceChart(
    labels,
    reliability,
    delivery,
    quality
) {

    const canvas =
        document.getElementById(
            "performanceChart"
        );


    if (!canvas) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        console.error(
            "Chart.js is not loaded. Add Chart.js before this JavaScript file."
        );

        return;
    }


    if (performanceChart) {

        performanceChart.destroy();

        performanceChart =
            null;
    }


    performanceChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Reliability Score (/100)",

                            data:
                                reliability,

                            borderColor:
                                "#176df3",

                            backgroundColor:
                                "rgba(23,109,243,0.08)",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 2.5,

                            pointHoverRadius: 5,

                            fill: false
                        },

                        {
                            label:
                                "On-Time Delivery (%)",

                            data:
                                delivery,

                            borderColor:
                                "#16ad70",

                            backgroundColor:
                                "rgba(22,173,112,0.08)",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 2.5,

                            pointHoverRadius: 5,

                            fill: false
                        },

                        {
                            label:
                                "Quality Score (%)",

                            data:
                                quality,

                            borderColor:
                                "#7547ee",

                            backgroundColor:
                                "rgba(117,71,238,0.08)",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 2.5,

                            pointHoverRadius: 5,

                            fill: false
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

                            position: "bottom",

                            labels: {

                                boxWidth: 7,

                                boxHeight: 7,

                                usePointStyle: true,

                                pointStyle: "circle",

                                padding: 12,

                                font: {
                                    size: 8
                                }
                            }
                        },

                        tooltip: {

                            backgroundColor:
                                "#17264f",

                            padding: 9,

                            titleFont: {
                                size: 9
                            },

                            bodyFont: {
                                size: 8
                            }
                        }
                    },

                    scales: {

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {

                                color:
                                    "#65728d",

                                font: {
                                    size: 8
                                }
                            }
                        },

                        y: {

                            beginAtZero: true,

                            max: 100,

                            ticks: {

                                stepSize: 25,

                                color:
                                    "#65728d",

                                font: {
                                    size: 8
                                }
                            },

                            grid: {

                                color:
                                    "#edf0f5"
                            }
                        }
                    }
                }
            }
        );
}


/* ==========================================================
   RELATIVE TIME
========================================================== */

function formatRelativeTime(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return escapeHTML(
            value
        );
    }


    const difference =
        Date.now() -
        date.getTime();


    /*
       Future timestamps.
    */

    if (difference < 0) {
        return "Just now";
    }


    const minutes =
        Math.floor(
            difference / 60000
        );


    if (minutes < 1) {
        return "Just now";
    }


    if (minutes < 60) {

        return `${minutes} min ago`;
    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return `${hours} hr ago`;
    }


    const days =
        Math.floor(
            hours / 24
        );


    if (days < 7) {

        return (
            `${days} day` +
            `${days === 1 ? "" : "s"} ago`
        );
    }


    return formatDate(
        value
    );
}


/* ==========================================================
   PERFORMANCE PERIOD
========================================================== */

function setupPerformancePeriod() {

    const select =
        document.getElementById(
            "performancePeriod"
        );


    if (!select) {
        return;
    }


    /*
       Prevent duplicate event listeners.
    */

    if (
        select.dataset.initialized === "true"
    ) {

        return;
    }


    select.dataset.initialized =
        "true";


    select.addEventListener(
        "change",
        async function () {

            const months =
                Math.max(
                    1,
                    Number(
                        this.value
                    ) || 6
                );


            try {

                await loadPerformanceTrend(
                    months
                );

            } catch (error) {

                console.error(
                    "Performance trend error:",
                    error
                );

                showToast(
                    "Unable to load performance trend.",
                    true
                );
            }
        }
    );
}


/* ==========================================================
   LOAD PERFORMANCE TREND
========================================================== */

async function loadPerformanceTrend(
    months = 6
) {

    const vendorId =
        getVendorId();


    if (!vendorId) {

        console.warn(
            "Vendor ID unavailable for performance trend."
        );

        return;
    }


    const safeMonths =
        Math.max(
            1,
            Math.min(
                24,
                Number(months) || 6
            )
        );


    const url =
        `${API}/api/vendor/${encodeURIComponent(vendorId)}/performance-trend?months=${safeMonths}`;


    try {

        const data =
            await apiFetch(
                url
            );


        const trend =
            data?.performance_trend ||
            data?.performanceTrend ||
            data?.trend ||
            data?.items ||
            data ||
            [];


        populatePerformanceChart(
            trend
        );

    } catch (error) {

        /*
           Optional endpoint:
           Do not break the main dashboard.
        */

        console.warn(
            "Performance trend unavailable:",
            error.message
        );
    }
}


/* ==========================================================
   LOGOUT
========================================================== */

function setupLogout() {

    const logoutLinks =
        document.querySelectorAll(
            'a[href="/login"], a[href="/login"], a[href="/vendor-login"]'
        );


    if (
        logoutLinks.length === 0
    ) {

        return;
    }


    logoutLinks.forEach(
        logout => {

            if (
                logout.dataset.logoutInitialized === "true"
            ) {

                return;
            }


            logout.dataset.logoutInitialized =
                "true";


            logout.addEventListener(
                "click",
                function () {

                    clearAuthentication();
                }
            );
        }
    );
}


/* ==========================================================
   CLEAR AUTHENTICATION
========================================================== */

function clearAuthentication() {

    const keys = [

        "access_token",
        "token",
        "accessToken",
        "jwt_token",

        "vendor_id",
        "vendorId",

        "user_id",
        "userId"
    ];


    keys.forEach(
        key => {

            localStorage.removeItem(
                key
            );

            sessionStorage.removeItem(
                key
            );
        }
    );
}


/* ==========================================================
   SEARCH
========================================================== */

function setupSearch() {

    const input =
        document.querySelector(
            ".search-box input"
        );


    if (!input) {
        return;
    }


    if (
        input.dataset.searchInitialized === "true"
    ) {

        return;
    }


    input.dataset.searchInitialized =
        "true";


    input.addEventListener(
        "input",
        function () {

            const query =
                this.value
                    .toLowerCase()
                    .trim();


            const rows =
                document.querySelectorAll(
                    ".orders-panel tbody tr"
                );


            rows.forEach(
                row => {

                    if (
                        row.classList.contains(
                            "no-orders-row"
                        )
                    ) {

                        return;
                    }


                    const text =
                        row.textContent
                            .toLowerCase();


                    row.style.display =
                        !query ||
                        text.includes(query)
                            ? ""
                            : "none";
                }
            );
        }
    );
}


/* ==========================================================
   TOAST
========================================================== */

function showToast(
    message,
    isError = false
) {

    let toast =
        document.querySelector(
            ".dashboard-toast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.className =
            "dashboard-toast";


        document.body.appendChild(
            toast
        );
    }


    toast.textContent =
        String(
            message || ""
        );


    toast.classList.toggle(
        "error",
        Boolean(
            isError
        )
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );
        }
    );


    clearTimeout(
        toast._hideTimer
    );


    toast._hideTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            4000
        );
}


/* ==========================================================
   HANDLE AUTH ERROR
========================================================== */

function handleAuthenticationError(
    error
) {

    if (
        error &&
        (
            error.status === 401 ||
            error.status === 403
        )
    ) {

        clearAuthentication();


        showToast(
            "Your session has expired. Please login again.",
            true
        );


        setTimeout(
            () => {

                window.location.href =
                    "/login";

            },
            1500
        );


        return true;
    }


    return false;
}


/* ==========================================================
   INITIALIZE DASHBOARD
========================================================== */

async function initializeDashboard() {

    if (
        dashboardInitialized
    ) {

        return;
    }


    dashboardInitialized =
        true;


    console.log(
        "Initializing VendorIQ Vendor Dashboard..."
    );


    /*
       Check authentication.
    */

    if (
        !hasAuthentication()
    ) {

        showToast(
            "Authentication token not found. Please login again.",
            true
        );


        setTimeout(
            () => {

                window.location.href =
                    "/login";

            },
            1200
        );


        return;
    }


    const vendorId =
        getVendorId();


    console.log(
        "Vendor ID:",
        vendorId
    );


    if (!vendorId) {

        showToast(
            "Vendor ID not found. Please login again.",
            true
        );


        return;
    }


    /*
       Setup UI event handlers
       before API request.
    */

    setupPerformancePeriod();

    setupLogout();

    setupSearch();


    try {

        await loadDashboard();


        /*
           Remove any previous
           refresh timer.
        */

        if (
            dashboardRefreshTimer
        ) {

            clearInterval(
                dashboardRefreshTimer
            );
        }


        /*
           Refresh dashboard every 60 seconds.
        */

        dashboardRefreshTimer =
            setInterval(
                async function () {

                    try {

                        await loadDashboard();

                    } catch (error) {

                        console.error(
                            "Dashboard refresh error:",
                            error
                        );


                        if (
                            handleAuthenticationError(
                                error
                            )
                        ) {

                            return;
                        }
                    }

                },
                DASHBOARD_REFRESH_INTERVAL
            );


    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );


        if (
            handleAuthenticationError(
                error
            )
        ) {

            return;
        }


        showToast(
            error.message ||
            "Unable to load vendor dashboard.",
            true
        );
    }
}


/* ==========================================================
   CLEANUP
========================================================== */

window.addEventListener(
    "beforeunload",
    function () {

        if (
            dashboardRefreshTimer
        ) {

            clearInterval(
                dashboardRefreshTimer
            );

            dashboardRefreshTimer =
                null;
        }


        if (
            performanceChart
        ) {

            performanceChart.destroy();

            performanceChart =
                null;
        }


        if (
            contractChart
        ) {

            contractChart.destroy();

            contractChart =
                null;
        }
    }
);


/* ==========================================================
   START
========================================================== */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

} else {

    initializeDashboard();
}