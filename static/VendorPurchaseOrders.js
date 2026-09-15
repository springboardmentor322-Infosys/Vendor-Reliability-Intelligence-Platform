/* ==========================================================
   VENDORIQ
   PURCHASE ORDERS JAVASCRIPT
   ========================================================== */

const API = "http://127.0.0.1:8000";


/* ==========================================================
   STATE
   ========================================================== */

let allOrders = [];
let filteredOrders = [];

let currentPage = 1;
let pageLimit = 10;

let orderChart = null;

/*
 * IMPORTANT:
 * This is populated from the DATABASE through:
 *
 * GET /api/vendor/profile
 *
 * Never hard-code the vendor ID here.
 */
let currentVendor = null;
let currentVendorId = null;


/* ==========================================================
   TOKEN
   ========================================================== */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt_token") ||

        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("jwt_token") ||

        ""
    );
}


/* ==========================================================
   CLEAR AUTH
   ========================================================== */

function clearAuthentication() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("jwt_token");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("jwt_token");
}


/* ==========================================================
   AUTHENTICATION
   ========================================================== */

function requireToken() {

    const token = getToken();

    if (!token) {

        console.warn(
            "Authentication token not found."
        );

        window.location.href = "/login";

        return null;
    }

    return token;
}


/* ==========================================================
   API FETCH
   ========================================================== */

async function apiFetch(
    endpoint,
    options = {}
) {

    const token = requireToken();

    if (!token) {

        throw new Error(
            "Authentication token missing."
        );
    }


    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    headers["Authorization"] =
        `Bearer ${token}`;


    console.log(
        "API REQUEST:",
        `${API}${endpoint}`
    );


    const response =
        await fetch(
            `${API}${endpoint}`,
            {
                ...options,
                headers
            }
        );


    console.log(
        "API STATUS:",
        response.status,
        endpoint
    );


    let data = null;


    const contentType =
        response.headers.get(
            "content-type"
        );


    if (
        contentType &&
        contentType.includes(
            "application/json"
        )
    ) {

        data =
            await response.json();

    } else {

        data =
            await response.text();

    }


    /* ------------------------------------------------------
       UNAUTHORIZED
       ------------------------------------------------------ */

    if (
        response.status === 401
    ) {

        console.warn(
            "Authentication expired."
        );

        clearAuthentication();

        window.location.href =
            "/login";

        throw new Error(
            "Unauthorized."
        );
    }


    /* ------------------------------------------------------
       OTHER API ERRORS
       ------------------------------------------------------ */

    if (!response.ok) {

        let message =
            data?.detail ||
            data?.message ||
            "Request failed.";


        if (
            Array.isArray(message)
        ) {

            message =
                message
                    .map(
                        item =>
                            item.msg ||
                            JSON.stringify(item)
                    )
                    .join(", ");
        }


        throw new Error(
            typeof message === "string"
                ? message
                : JSON.stringify(message)
        );
    }


    return data;
}


/* ==========================================================
   ELEMENT HELPER
   ========================================================== */

function $(id) {

    return document.getElementById(id);

}


/* ==========================================================
   FORMAT MONEY
   ========================================================== */

function formatMoney(amount) {

    const number =
        Number(amount || 0);


    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2
        }
    ).format(number);

}


/* ==========================================================
   FORMAT DATE
   ========================================================== */

function formatDate(date) {

    if (!date) {

        return "—";

    }


    const parsed =
        new Date(date);


    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {

        return "—";

    }


    return parsed.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* ==========================================================
   ESCAPE HTML
   ========================================================== */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ==========================================================
   NORMALIZE STATUS
   ========================================================== */

function normalizeStatus(status) {

    return String(status || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(
            /^./,
            char => char.toUpperCase()
        );

}


/* ==========================================================
   GET STATUS CLASS
   ========================================================== */

function getStatusClass(status) {

    switch (status) {

        case "Delivered":
            return "status-delivered";

        case "In Transit":
            return "status-transit";

        case "Pending":
            return "status-pending";

        case "Cancelled":
            return "status-cancelled";

        case "Approved":
            return "status-approved";

        case "Ordered":
            return "status-ordered";

        case "Completed":
            return "status-completed";

        default:
            return "status-pending";
    }

}


/* ==========================================================
   PERCENTAGE
   ========================================================== */

function percentage(
    value,
    total
) {

    if (!total) {

        return "0%";

    }


    return (
        (value / total) * 100
    ).toFixed(1) + "%";

}


/* ==========================================================
   ==========================================================
   LOAD LOGGED-IN VENDOR FROM DATABASE
   ==========================================================
   ==========================================================

   IMPORTANT:

   The browser does NOT generate the vendor ID.

   The backend identifies the logged-in vendor from
   the JWT token and retrieves the vendor record from
   PostgreSQL.

   Expected backend response example:

   {
       "vendor_id": "VEN001",
       "vendor_name": "ABC Supplies",
       "company_name": "ABC Pvt Ltd",
       "phone": "9876543210"
   }

   OR:

   {
       "vendor": {
           "vendor_id": "VEN001",
           "vendor_name": "ABC Supplies"
       }
   }

   ========================================================== */

async function loadVendorProfile() {

    try {

        const token = getToken();

        if (!token) {
            throw new Error("Authentication token missing.");
        }

        /*
         * Decode JWT payload
         *
         * This does NOT verify the token.
         * The backend still performs the actual authentication.
         */

        const parts = token.split(".");

        if (parts.length !== 3) {
            throw new Error("Invalid JWT token.");
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
            "JWT payload:",
            payload
        );


        /*
         * Try possible vendor ID fields.
         *
         * Use the one that your login endpoint actually
         * puts into the JWT.
         */

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


        /*
         * Save globally.
         */

        currentVendorId =
            vendorId;


        /*
         * IMPORTANT:
         *
         * This is a template literal.
         *
         * DO NOT use:
         *
         * "/api/vendor/profile/{vendor_id}"
         *
         */

        const data =
            await apiFetch(
                `/api/vendor/profile/${encodeURIComponent(vendorId)}`
            );


        console.log(
            "Vendor profile response:",
            data
        );


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


        /*
         * Use database vendor_id if returned.
         */

        currentVendorId =
            vendor.vendor_id ||
            vendor.vendorId ||
            vendor.id ||
            vendorId;


        /*
         * Vendor name
         */

        const vendorName =
            vendor.vendor_name ||
            vendor.company_name ||
            vendor.name ||
            "Vendor";


        /*
         * Sidebar vendor name
         */

        const sidebarName =
            $("sidebarVendorName");

        if (sidebarName) {

            sidebarName.textContent =
                vendorName;

        }


        /*
         * Header vendor name
         */

        const headerName =
            $("headerVendorName");

        if (headerName) {

            headerName.textContent =
                vendorName;

        }


        /*
         * Sidebar vendor ID
         */

        const sidebarId =
            $("sidebarVendorId");

        if (sidebarId) {

            sidebarId.textContent =
                currentVendorId;

        }


        /*
         * Optional header vendor ID
         */

        const headerVendorId =
            $("headerVendorId");

        if (headerVendorId) {

            headerVendorId.textContent =
                currentVendorId;

        }


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


/* ==========================================================
   NORMALIZE ORDER
   ========================================================== */

function normalizeOrder(order) {

    return {

        id:
            order.id,

        po_number:
            order.po_number ||
            order.poNumber ||
            "-",

        vendor_id:
            order.vendor_id ||
            order.vendorId ||
            currentVendorId ||
            "",

        ordered_by:
            order.ordered_by ||
            order.orderedBy ||
            "Unknown",

        amount:
            Number(
                order.amount ||
                order.total_amount ||
                order.order_amount ||
                0
            ),

        status:
            order.status ||
            "Pending",

        order_date:
            order.order_date ||
            order.orderDate ||
            null,

        expected_delivery:
            order.expected_delivery ||
            order.expected_delivery_date ||
            order.delivery_date ||
            null,

        actual_delivery:
            order.actual_delivery ||
            order.actual_delivery_date ||
            null,

        category:
            order.category ||
            null

    };
}


/* ==========================================================
   ==========================================================
   LOAD PURCHASE ORDERS
   ==========================================================
   ========================================================== */

async function loadPurchaseOrders() {

    const tbody = $("ordersTableBody");

    if (!tbody) {
        console.error("ordersTableBody not found.");
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading purchase orders...
            </td>
        </tr>
    `;

    try {

        if (!currentVendorId) {
            throw new Error("Vendor ID is not available.");
        }

        console.log(
            "Loading purchase orders for vendor:",
            currentVendorId
        );

        const data = await apiFetch(
            `/api/vendor/purchase-orders?vendor_id=${encodeURIComponent(currentVendorId)}`
        );

        console.log(
            "Purchase orders response:",
            data
        );

        let orders = [];

        /*
         * FastAPI response:
         *
         * {
         *   success: true,
         *   items: [...]
         * }
         */

        if (Array.isArray(data?.items)) {

            orders = data.items;

        }
        else if (Array.isArray(data?.orders)) {

            orders = data.orders;

        }
        else if (Array.isArray(data?.purchase_orders)) {

            orders = data.purchase_orders;

        }
        else if (Array.isArray(data?.purchaseOrders)) {

            orders = data.purchaseOrders;

        }
        else if (Array.isArray(data)) {

            orders = data;

        }

        console.log(
            "Orders extracted from API:",
            orders
        );

        allOrders = orders.map(normalizeOrder);

        /*
         * Do NOT filter again here if the backend
         * has already filtered by vendor_id.
         */

        filteredOrders = [...allOrders];

        currentPage = 1;

        updateStatistics();
        updateQuickFilters();
        renderTable();
        updateChart();

        console.log(
            "Purchase orders displayed:",
            allOrders.length
        );

    }
    catch (error) {

        console.error(
            "Unable to load purchase orders:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Unable to load purchase orders.
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}


/* ==========================================================
   UPDATE STATISTICS
   ========================================================== */

function updateStatistics() {

    const total =
        allOrders.length;


    const delivered =
        allOrders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "Delivered"
        ).length;


    const transit =
        allOrders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "In Transit"
        ).length;


    const pending =
        allOrders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "Pending"
        ).length;


    const cancelled =
        allOrders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "Cancelled"
        ).length;


    const totalValue =
        allOrders.reduce(
            (
                sum,
                order
            ) => {

                return (
                    sum +
                    Number(
                        order.amount || 0
                    )
                );

            },
            0
        );


    setText(
        "totalOrders",
        total
    );

    setText(
        "deliveredOrders",
        delivered
    );

    setText(
        "transitOrders",
        transit
    );

    setText(
        "pendingOrders",
        pending
    );

    setText(
        "cancelledOrders",
        cancelled
    );

    setText(
        "totalOrderValue",
        formatMoney(
            totalValue
        )
    );


    setText(
        "deliveredPercent",
        percentage(
            delivered,
            total
        )
    );

    setText(
        "transitPercent",
        percentage(
            transit,
            total
        )
    );

    setText(
        "pendingPercent",
        percentage(
            pending,
            total
        )
    );

    setText(
        "cancelledPercent",
        percentage(
            cancelled,
            total
        )
    );


    setText(
        "chartTotal",
        total
    );


    setText(
        "legendDelivered",
        delivered
    );

    setText(
        "legendTransit",
        transit
    );

    setText(
        "legendPending",
        pending
    );

    setText(
        "legendCancelled",
        cancelled
    );

}


/* ==========================================================
   SAFE TEXT UPDATE
   ========================================================== */

function setText(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* ==========================================================
   UPDATE QUICK FILTERS
   ========================================================== */

function updateQuickFilters() {

    setText(
        "quickAll",
        allOrders.length
    );

    setText(
        "quickDelivered",
        countStatus("Delivered")
    );

    setText(
        "quickTransit",
        countStatus("In Transit")
    );

    setText(
        "quickPending",
        countStatus("Pending")
    );

    setText(
        "quickCancelled",
        countStatus("Cancelled")
    );

}


/* ==========================================================
   COUNT STATUS
   ========================================================== */

function countStatus(status) {

    return allOrders.filter(
        order =>
            normalizeStatus(
                order.status
            ) === status
    ).length;

}


/* ==========================================================
   RENDER TABLE
   ========================================================== */

function renderTable() {

    const tbody =
        $("ordersTableBody");


    if (!tbody) {

        return;

    }


    const start =
        (
            currentPage - 1
        ) *
        pageLimit;


    const end =
        start +
        pageLimit;


    const pageOrders =
        filteredOrders.slice(
            start,
            end
        );


    if (
        pageOrders.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="loading"
                >

                    <i class="fa-solid fa-inbox"></i>

                    No purchase orders found.

                </td>

            </tr>

        `;


        updatePagination();

        return;

    }


    tbody.innerHTML =
        pageOrders
            .map(
                createOrderRow
            )
            .join("");


    updatePagination();

}


/* ==========================================================
   CREATE TABLE ROW
   ========================================================== */

/* ==========================================================
   CREATE TABLE ROW
   ========================================================== */

function createOrderRow(order) {

    const status =
        normalizeStatus(
            order.status
        );

    const statusClass =
        getStatusClass(
            status
        );

    const isDelivered =
        status === "Delivered";

    const isCancelled =
        status === "Cancelled";

    return `
        <tr>

            <!-- PURCHASE ORDER ID -->
            <td>
                <span class="po-number">
                    ${escapeHtml(
                        order.po_number ||
                        `PO-${order.id}`
                    )}
                </span>
            </td>


            <!-- ORDERED BY -->
            <td>
                <span class="date-text">
                    ${escapeHtml(
                        order.ordered_by ||
                        "Unknown"
                    )}
                </span>
            </td>


            <!-- ORDER DATE -->
            <td>
                <span class="date-text">
                    ${formatDate(
                        order.order_date
                    )}
                </span>
            </td>


            <!-- EXPECTED DELIVERY -->
            <td>
                <span class="date-text">
                    ${formatDate(
                        order.expected_delivery
                    )}
                </span>
            </td>


            <!-- STATUS -->
            <td>
                <span
                    class="
                        status
                        ${statusClass}
                    "
                >
                    <i class="status-dot"></i>

                    ${escapeHtml(
                        status
                    )}
                </span>
            </td>


            <!-- AMOUNT -->
            <td>
                <span class="amount">
                    ${formatMoney(
                        order.amount
                    )}
                </span>
            </td>


            <!-- ACTIONS -->
            <td>

                <div class="action-buttons">

                    <!-- VIEW / DOWNLOAD PDF -->
                    <button
                        type="button"
                        class="action-btn"
                        title="Download Purchase Order PDF"
                        onclick="downloadPurchaseOrderPDF(${Number(order.id)})"
                    >
                        <i class="fa-regular fa-eye"></i>
                    </button>


                    <!-- MARK AS DELIVERED -->
                    ${
                        isDelivered || isCancelled
                        ? ""
                        : `
                            <button
                                type="button"
                                class="action-btn delivery-action-btn"
                                title="Mark as Delivered"
                                onclick="markAsDelivered(${Number(order.id)})"
                            >
                                <i class="fa-solid fa-truck"></i>
                            </button>
                        `
                    }

                </div>

            </td>

        </tr>
    `;
}


/* ==========================================================
   FILTER ORDERS
   ========================================================== */

function applyFilters() {

    const searchElement =
        $("searchInput");


    const globalSearchElement =
        $("globalSearch");


    const statusElement =
        $("statusFilter");


    const startDateElement =
        $("startDate");


    const endDateElement =
        $("endDate");


    const search =
        searchElement?.value
            ?.trim()
            .toLowerCase() || "";


    const globalSearch =
        globalSearchElement?.value
            ?.trim()
            .toLowerCase() || "";


    const status =
        statusElement?.value ||
        "All";


    const startDate =
        startDateElement?.value ||
        "";


    const endDate =
        endDateElement?.value ||
        "";


    const combinedSearch =
        search ||
        globalSearch;


    filteredOrders =
        allOrders.filter(
            order => {

                const po =
                    String(
                        order.po_number || ""
                    ).toLowerCase();


                const orderStatus =
                    normalizeStatus(
                        order.status
                    );


                const category =
                    String(
                        order.category || ""
                    ).toLowerCase();


                const vendorId =
                    String(
                        order.vendor_id || ""
                    ).toLowerCase();


                const matchesSearch =
                    !combinedSearch ||

                    po.includes(
                        combinedSearch
                    ) ||

                    orderStatus
                        .toLowerCase()
                        .includes(
                            combinedSearch
                        ) ||

                    category.includes(
                        combinedSearch
                    ) ||

                    vendorId.includes(
                        combinedSearch
                    );


                const matchesStatus =
                    status === "All" ||
                    orderStatus === status;


                let matchesDate = true;


                if (
                    order.order_date
                ) {

                    const date =
                        String(
                            order.order_date
                        ).substring(
                            0,
                            10
                        );


                    if (
                        startDate &&
                        date < startDate
                    ) {

                        matchesDate =
                            false;

                    }


                    if (
                        endDate &&
                        date > endDate
                    ) {

                        matchesDate =
                            false;

                    }

                }


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesDate
                );

            }
        );


    currentPage =
        1;


    renderTable();

}


/* ==========================================================
   RESET FILTERS
   ========================================================== */

function resetFilters() {

    if ($("searchInput")) {

        $("searchInput").value =
            "";

    }


    if ($("globalSearch")) {

        $("globalSearch").value =
            "";

    }


    if ($("statusFilter")) {

        $("statusFilter").value =
            "All";

    }


    if ($("startDate")) {

        $("startDate").value =
            "";

    }


    if ($("endDate")) {

        $("endDate").value =
            "";

    }


    document
        .querySelectorAll(
            ".quick-filter"
        )
        .forEach(
            button =>
                button.classList.remove(
                    "active"
                )
        );


    document
        .querySelector(
            '.quick-filter[data-status="All"]'
        )
        ?.classList.add(
            "active"
        );


    filteredOrders =
        [...allOrders];


    currentPage =
        1;


    renderTable();

}


/* ==========================================================
   PAGINATION
   ========================================================== */

function updatePagination() {

    const total =
        filteredOrders.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                pageLimit
            )
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    const start =
        total === 0
            ? 0
            : (
                (
                    currentPage - 1
                ) *
                pageLimit
            ) + 1;


    const end =
        Math.min(
            currentPage *
            pageLimit,
            total
        );


    setText(
        "paginationInfo",
        `Showing ${start}-${end} of ${total} entries`
    );


    const previous =
        $("previousPage");


    if (previous) {

        previous.disabled =
            currentPage <= 1;

    }


    const next =
        $("nextPage");


    if (next) {

        next.disabled =
            currentPage >=
            totalPages;

    }


    renderPageNumbers(
        totalPages
    );

}


/* ==========================================================
   PAGE NUMBERS
   ========================================================== */

function renderPageNumbers(
    totalPages
) {

    const container =
        $("pageNumbers");


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    const maxPages =
        Math.min(
            totalPages,
            5
        );


    let start =
        Math.max(
            1,
            currentPage - 2
        );


    let end =
        Math.min(
            totalPages,
            start + maxPages - 1
        );


    if (
        end - start <
        maxPages - 1
    ) {

        start =
            Math.max(
                1,
                end - maxPages + 1
            );

    }


    for (
        let page = start;
        page <= end;
        page++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "page-number";


        if (
            page === currentPage
        ) {

            button.classList.add(
                "active"
            );

        }


        button.textContent =
            page;


        button.addEventListener(
            "click",
            () => {

                currentPage =
                    page;

                renderTable();

            }
        );


        container.appendChild(
            button
        );

    }

}


/* ==========================================================
   CHART
   ========================================================== */

function updateChart() {

    const canvas =
        $("orderChart");


    if (!canvas) {

        return;

    }


    const delivered =
        countStatus(
            "Delivered"
        );


    const transit =
        countStatus(
            "In Transit"
        );


    const pending =
        countStatus(
            "Pending"
        );


    const cancelled =
        countStatus(
            "Cancelled"
        );


    if (orderChart) {

        orderChart.destroy();

    }


    /*
     * Chart.js must be loaded in HTML before this JS.
     */

    if (
        typeof Chart === "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;

    }


    orderChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Delivered",
                        "In Transit",
                        "Pending",
                        "Cancelled"
                    ],

                    datasets: [

                        {

                            data: [

                                delivered,
                                transit,
                                pending,
                                cancelled

                            ],

                            backgroundColor: [

                                "#16a765",
                                "#2563eb",
                                "#f59e0b",
                                "#ef4444"

                            ],

                            borderWidth: 0,

                            spacing: 3

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "72%",

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        `${context.label}: ${context.raw}`

                            }

                        }

                    }

                }

            }
        );

}


/* ==========================================================
   DOWNLOAD PURCHASE ORDER PDF
   ========================================================== */

async function downloadPurchaseOrderPDF(orderId) {

    if (!orderId) {

        alert(
            "Invalid purchase order."
        );

        return;
    }

    if (!currentVendorId) {

        alert(
            "Vendor ID is not available."
        );

        return;
    }

    try {

        const token =
            requireToken();

        if (!token) {
            return;
        }


        const url =
            `${API}/api/vendor/purchase-orders/${encodeURIComponent(orderId)}/pdf` +
            `?vendor_id=${encodeURIComponent(currentVendorId)}`;


        console.log(
            "Downloading Purchase Order PDF:",
            url
        );


        const response =
            await fetch(
                url,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (
            response.status === 401
        ) {

            clearAuthentication();

            window.location.href =
                "/login";

            return;
        }


        if (!response.ok) {

            let message =
                "Unable to download purchase order PDF.";

            try {

                const errorData =
                    await response.json();

                message =
                    errorData?.detail ||
                    errorData?.message ||
                    message;

            } catch (_) {
                // Ignore JSON parsing failure
            }

            throw new Error(
                message
            );
        }


        const blob =
            await response.blob();


        if (
            !blob ||
            blob.size === 0
        ) {

            throw new Error(
                "The PDF returned by the server is empty."
            );
        }


        const downloadUrl =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            downloadUrl;


        const order =
            allOrders.find(
                item =>
                    Number(item.id) ===
                    Number(orderId)
            );


        link.download =
            `${order?.po_number || `PO-${orderId}`}.pdf`;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        window.URL.revokeObjectURL(
            downloadUrl
        );


        console.log(
            "Purchase Order PDF downloaded:",
            orderId
        );

    }
    catch (error) {

        console.error(
            "Purchase Order PDF download error:",
            error
        );

        alert(
            error.message ||
            "Unable to download purchase order PDF."
        );
    }
}


/* ==========================================================
   MARK PURCHASE ORDER AS DELIVERED
   ========================================================== */

async function markAsDelivered(orderId) {

    if (!orderId) {

        alert(
            "Invalid purchase order."
        );

        return;
    }


    if (!currentVendorId) {

        alert(
            "Vendor ID is not available."
        );

        return;
    }


    const order =
        allOrders.find(
            item =>
                Number(item.id) ===
                Number(orderId)
        );


    if (!order) {

        alert(
            "Purchase order could not be found."
        );

        return;
    }


    const status =
        normalizeStatus(
            order.status
        );


    if (
        status === "Delivered"
    ) {

        alert(
            "This purchase order is already marked as delivered."
        );

        return;
    }


    if (
        status === "Cancelled"
    ) {

        alert(
            "A cancelled purchase order cannot be marked as delivered."
        );

        return;
    }


    const confirmed =
        window.confirm(
            `Mark ${order.po_number || `PO-${orderId}`} as delivered?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const token =
            requireToken();

        if (!token) {
            return;
        }


        const url =
            `${API}/api/vendor/purchase-orders/${encodeURIComponent(orderId)}/delivered` +
            `?vendor_id=${encodeURIComponent(currentVendorId)}`;


        const response =
            await fetch(
                url,
                {
                    method: "PATCH",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        let data = null;


        const contentType =
            response.headers.get(
                "content-type"
            );


        if (
            contentType &&
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();
        }


        if (
            response.status === 401
        ) {

            clearAuthentication();

            window.location.href =
                "/login";

            return;
        }


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                "Unable to mark purchase order as delivered."
            );
        }


        console.log(
            "Purchase order delivered:",
            data
        );


        // ------------------------------------------------------
        // UPDATE LOCAL RECORD
        // ------------------------------------------------------

        const index =
            allOrders.findIndex(
                item =>
                    Number(item.id) ===
                    Number(orderId)
            );


        if (index !== -1) {

            allOrders[index].status =
                "Delivered";

            allOrders[index].actual_delivery =
                data.actual_delivery ||
                new Date()
                    .toISOString()
                    .substring(
                        0,
                        10
                    );
        }


        // Keep filtered list synchronized
        filteredOrders =
            [...allOrders];


        // Re-apply current filters
        applyFilters();


        updateStatistics();

        updateQuickFilters();

        updateChart();


        alert(
            "Purchase order marked as delivered successfully."
        );

    }
    catch (error) {

        console.error(
            "Mark delivered error:",
            error
        );

        alert(
            error.message ||
            "Unable to mark purchase order as delivered."
        );
    }
}


/* ==========================================================
   CLOSE MODAL
   ========================================================== */

function closeModal() {

    const modal =
        $("orderModal");


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


/* ==========================================================
   EXPORT CSV
   ========================================================== */

function exportOrders() {

    if (
        filteredOrders.length === 0
    ) {

        alert(
            "There are no purchase orders to export."
        );

        return;

    }


    const headers = [

        "PO Number",
        "Vendor ID",
        "Order Date",
        "Expected Delivery",
        "Actual Delivery",
        "Status",
        "Amount",
        "Category"

    ];


    const rows =
        filteredOrders.map(
            order => [

                order.po_number,

                order.vendor_id ||
                currentVendorId ||
                "",

                order.order_date ||
                "",

                order.expected_delivery ||
                "",

                order.actual_delivery ||
                "",

                order.status,

                order.amount,

                order.category ||
                ""

            ]
        );


    const csv = [

        headers,
        ...rows

    ]
        .map(
            row =>
                row
                    .map(
                        value =>
                            `"${String(value)
                                .replace(
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
        `VendorIQ_Purchase_Orders_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}


/* ==========================================================
   LOGOUT
   ========================================================== */

function logout() {

    clearAuthentication();

    currentVendor =
        null;

    currentVendorId =
        null;

    allOrders = [];

    filteredOrders = [];


    window.location.href =
        "/login";

}


/* ==========================================================
   EVENT LISTENERS
   ========================================================== */

function initializeEvents() {

    const searchInput =
        $("searchInput");


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );

    }


    const globalSearch =
        $("globalSearch");


    if (globalSearch) {

        globalSearch.addEventListener(
            "input",
            () => {

                if (searchInput) {

                    searchInput.value =
                        globalSearch.value;

                }

                applyFilters();

            }
        );

    }


    const statusFilter =
        $("statusFilter");


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    const startDate =
        $("startDate");


    if (startDate) {

        startDate.addEventListener(
            "change",
            applyFilters
        );

    }


    const endDate =
        $("endDate");


    if (endDate) {

        endDate.addEventListener(
            "change",
            applyFilters
        );

    }


    const resetBtn =
        $("resetBtn");


    if (resetBtn) {

        resetBtn.addEventListener(
            "click",
            resetFilters
        );

    }


    const exportBtn =
        $("exportBtn");


    if (exportBtn) {

        exportBtn.addEventListener(
            "click",
            exportOrders
        );

    }


    const pageLimitElement =
        $("pageLimit");


    if (pageLimitElement) {

        pageLimitElement.addEventListener(
            "change",
            event => {

                pageLimit =
                    Number(
                        event.target.value
                    ) || 10;

                currentPage =
                    1;

                renderTable();

            }
        );

    }


    const previousPage =
        $("previousPage");


    if (previousPage) {

        previousPage.addEventListener(
            "click",
            () => {

                if (
                    currentPage > 1
                ) {

                    currentPage--;

                    renderTable();

                }

            }
        );

    }


    const nextPage =
        $("nextPage");


    if (nextPage) {

        nextPage.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        filteredOrders.length /
                        pageLimit
                    );


                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;

                    renderTable();

                }

            }
        );

    }


    const modalClose =
        $("modalClose");


    if (modalClose) {

        modalClose.addEventListener(
            "click",
            closeModal
        );

    }


    const orderModal =
        $("orderModal");


    if (orderModal) {

        orderModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    orderModal
                ) {

                    closeModal();

                }

            }
        );

    }


    const logoutBtn =
        $("logoutBtn");


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                logout();

            }
        );

    }


    /*
     * QUICK FILTERS
     */

    document
        .querySelectorAll(
            ".quick-filter"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".quick-filter"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        const status =
                            button.dataset.status;


                        if (
                            statusFilter
                        ) {

                            statusFilter.value =
                                status;

                        }


                        applyFilters();

                    }
                );

            }
        );

}


/* ==========================================================
   INITIALIZE
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "VendorIQ Purchase Orders initializing..."
        );


        try {

            /*
             * STEP 1
             *
             * Verify JWT exists.
             */

            if (!requireToken()) {

                return;

            }


            /*
             * STEP 2
             *
             * Initialize UI events.
             */

            initializeEvents();


            /*
             * STEP 3
             *
             * Get vendor ID from DATABASE.
             *
             * This MUST happen before loading
             * purchase orders.
             */

            await loadVendorProfile();


            /*
             * STEP 4
             *
             * Now load purchase orders.
             */

            await loadPurchaseOrders();


            console.log(
                "VendorIQ initialized successfully."
            );


            console.log(
                "Authenticated Vendor ID:",
                currentVendorId
            );


        } catch (error) {

            console.error(
                "Purchase Orders initialization error:",
                error
            );

        }

    }
);