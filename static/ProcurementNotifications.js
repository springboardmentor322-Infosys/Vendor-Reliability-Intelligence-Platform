/* ============================================================
   VendorIQ - Procurement Notifications
   ProcurementNotifications.js
============================================================ */


/* ============================================================
   API CONFIGURATION
============================================================ */

const API_BASE = "http://127.0.0.1:8000";


/* ============================================================
   STATE
============================================================ */

let currentPage = 1;
let pageSize = 10;

let selectedCategory = "All";
let selectedStatus = null;
let selectedPriority = "All";

let selectedNotification = null;

let notificationChart = null;

let initializationStarted = false;


/* ============================================================
   DOM HELPER
============================================================ */

function getElement(id) {

    return document.getElementById(id);
}


function setText(id, value) {

    const element = getElement(id);

    if (element) {
        element.textContent = value ?? "0";
    }
}


/* ============================================================
   AUTHENTICATION
============================================================ */

function getAuthToken() {

    const accessToken =
        sessionStorage.getItem("access_token");

    const token =
        localStorage.getItem("token");

    const jwtToken =
        localStorage.getItem("jwt_token");

    return (
        accessToken ||
        token ||
        jwtToken ||
        null
    );
}


function clearAuthTokens() {

    localStorage.removeItem("access_token");

    localStorage.removeItem("token");

    localStorage.removeItem("jwt_token");
}


/* ============================================================
   AUTHENTICATION ERROR
============================================================ */

function handleAuthenticationFailure() {

    console.error(
        "Authentication failed. JWT token is invalid, expired, or missing."
    );

    clearAuthTokens();

    const rows =
        getElement("notificationRows");

    if (rows) {

        rows.innerHTML = `
            <div class="empty-details">
                <i class="fa-solid fa-lock"></i>
                <p>Your session has expired. Please login again.</p>
            </div>
        `;
    }

    setText(
        "userName",
        "Procurement Manager"
    );

    setText(
        "topUserName",
        "Procurement Manager"
    );
}


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getAuthToken();

    if (!token) {

        console.error(
            "No authentication token found."
        );

        throw new Error(
            "Authentication required. Please login again."
        );
    }


    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})
    };


    headers.Authorization =
        `Bearer ${token}`;


    console.log(
        "API Request:",
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
                    headers,
                    credentials: "include"
                }
            );

    } catch (error) {

        console.error(
            "Network error:",
            error
        );

        throw new Error(
            "Unable to connect to the server."
        );
    }


    /* ========================================================
       401
    ======================================================== */

    if (response.status === 401) {

        handleAuthenticationFailure();

        throw new Error(
            "Could not validate credentials"
        );
    }


    /* ========================================================
       403
    ======================================================== */

    if (response.status === 403) {

        throw new Error(
            "You do not have permission to access this resource."
        );
    }


    /* ========================================================
       OTHER ERRORS
    ======================================================== */

    if (!response.ok) {

        let message =
            "Request failed";


        try {

            const data =
                await response.json();

            if (data.detail) {

                if (typeof data.detail === "string") {

                    message =
                        data.detail;

                } else {

                    message =
                        JSON.stringify(
                            data.detail
                        );
                }
            }

        } catch (error) {

            console.warn(
                "Unable to read server error response."
            );
        }


        throw new Error(
            message
        );
    }


    /* ========================================================
       EMPTY RESPONSE
    ======================================================== */

    if (response.status === 204) {
        return null;
    }


    return response.json();
}


/* ============================================================
   LOAD CURRENT USER
============================================================ */

async function loadCurrentUser() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/procurement/profile/me`
            );


        console.log(
            "Current Procurement User:",
            data.user
        );


        const name =
            data.user.name ||
            data.user.full_name ||
            data.user.username ||
            "Procurement Manager";


        setText(
            "userName",
            name
        );


        setText(
            "topUserName",
            name
        );


    } catch (error) {

        console.warn(
            "Unable to load current user:",
            error.message
        );

        throw error;
    }
}


/* ============================================================
   LOAD STATISTICS
============================================================ */

async function loadStatistics() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/procurement/notifications/statistics`
            );


        console.log(
            "Notification Statistics:",
            data
        );


        /* ====================================================
           TOTAL
        ==================================================== */

        setText(
            "totalCount",
            data.total || 0
        );


        setText(
            "totalUnread",
            data.unread || 0
        );


        setText(
            "sidebarUnread",
            data.unread || 0
        );


        setText(
            "topUnread",
            data.unread || 0
        );


        setText(
            "unreadTabCount",
            data.unread || 0
        );


        /* ====================================================
           CATEGORY COUNTS
        ==================================================== */

        const categories =
            data.categories || {};


        setText(
            "procurementCount",
            categories.procurement_alerts || 0
        );


        setText(
            "deliveryCount",
            categories.delivery_updates || 0
        );


        setText(
            "approvalCount",
            categories.approvals || 0
        );


        setText(
            "invoiceCount",
            categories.invoices_payments || 0
        );


        setText(
            "systemCount",
            categories.system_updates || 0
        );


        /* ====================================================
           UNREAD CATEGORY COUNTS
        ==================================================== */

        const unreadCategories =
            data.unread_categories ||
            data.categories_unread ||
            data.unread_by_category ||
            {};


        setText(
            "procurementUnread",
            unreadCategories.procurement_alerts || 0
        );


        setText(
            "deliveryUnread",
            unreadCategories.delivery_updates || 0
        );


        setText(
            "approvalUnread",
            unreadCategories.approvals || 0
        );


        setText(
            "invoiceUnread",
            unreadCategories.invoices_payments || 0
        );


        setText(
            "systemUnread",
            unreadCategories.system_updates || 0
        );


        return data;


    } catch (error) {

        console.error(
            "Statistics error:",
            error.message
        );

        throw error;
    }
}


/* ============================================================
   LOAD NOTIFICATIONS
============================================================ */

async function loadNotifications() {

    const searchInput =
        getElement("searchInput");


    const params =
        new URLSearchParams();


    params.set(
        "page",
        String(currentPage)
    );


    params.set(
        "limit",
        String(pageSize)
    );


    /* ========================================================
       SEARCH
    ======================================================== */

    if (searchInput) {

        const search =
            searchInput.value.trim();


        if (search) {

            params.set(
                "search",
                search
            );
        }
    }


    /* ========================================================
       CATEGORY
    ======================================================== */

    if (
        selectedCategory &&
        selectedCategory !== "All"
    ) {

        params.set(
            "category",
            selectedCategory
        );
    }


    /* ========================================================
       PRIORITY
    ======================================================== */

    if (
        selectedPriority &&
        selectedPriority !== "All"
    ) {

        params.set(
            "priority",
            selectedPriority
        );
    }


    /* ========================================================
       STATUS
    ======================================================== */

    if (selectedStatus) {

        params.set(
            "status",
            selectedStatus
        );
    }


    const url =
        `${API_BASE}/api/procurement/notifications?${params.toString()}`;


    try {

        const data =
            await apiFetch(
                url
            );


        console.log(
            "Notifications:",
            data
        );


        const items =
            Array.isArray(data)
                ? data
                : (
                    data.items ||
                    data.notifications ||
                    data.results ||
                    []
                );


        renderNotifications(
            items
        );


        renderPagination(
            data
        );


        updateSelectAllState();


        return data;


    } catch (error) {

        console.error(
            "Notification loading error:",
            error.message
        );


        const container =
            getElement(
                "notificationRows"
            );


        if (container) {

            container.innerHTML = `
                <div class="empty-details">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>${escapeHtml(error.message)}</p>
                </div>
            `;
        }


        throw error;
    }
}


/* ============================================================
   RENDER NOTIFICATIONS
============================================================ */

function renderNotifications(
    items
) {

    const container =
        getElement(
            "notificationRows"
        );


    if (!container) {
        return;
    }


    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-details">
                <i class="fa-regular fa-bell-slash"></i>
                <p>No notifications found</p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        items
            .map(
                notification =>
                    createNotificationRow(
                        notification
                    )
            )
            .join("");


    /* ========================================================
       ROW EVENTS
    ======================================================== */

    document
        .querySelectorAll(
            ".notification-row"
        )
        .forEach(
            row => {

                row.addEventListener(
                    "click",
                    function () {

                        const id =
                            Number(
                                this.dataset.id
                            );


                        if (
                            Number.isFinite(id)
                        ) {

                            openNotification(
                                id
                            );
                        }
                    }
                );
            }
        );


    updateSelectAllState();
}


/* ============================================================
   CREATE NOTIFICATION ROW
============================================================ */

function createNotificationRow(
    n
) {

    const id =
        n.id;


    const title =
        n.title ||
        "Notification";


    const message =
        n.message ||
        "";


    const category =
        n.category ||
        n.type ||
        "System Updates";


    const priority =
        n.priority ||
        "Low";


    const status =
        n.status ||
        "Read";


    const createdAt =
        n.created_at ||
        n.createdAt ||
        n.created_on ||
        n.date;


    const icon =
        getNotificationIcon(
            category
        );


    const iconClass =
        getNotificationIconClass(
            category
        );


    const priorityClass =
        `priority-${priority.toLowerCase()}`;


    const date =
        formatDate(
            createdAt
        );


    const relative =
        relativeTime(
            createdAt
        );


    const unreadClass =
        isUnreadStatus(status)
            ? "unread"
            : "";


    return `
        <div
            class="notification-row ${unreadClass}"
            data-id="${escapeHtml(id)}"
        >

            <div>
                <input
                    type="checkbox"
                    class="notification-checkbox"
                    data-id="${escapeHtml(id)}"
                    onclick="event.stopPropagation()"
                >
            </div>


            <div class="notification-main">

                <div
                    class="notification-icon ${iconClass}"
                >
                    <i class="${icon}"></i>
                </div>


                <div class="notification-text">

                    <strong>
                        ${escapeHtml(title)}
                    </strong>

                    <p>
                        ${escapeHtml(message)}
                    </p>

                </div>

            </div>


            <div>

                <span class="type-badge">
                    ${escapeHtml(category)}
                </span>

            </div>


            <div>

                <span
                    class="priority-badge ${priorityClass}"
                >
                    ${escapeHtml(priority)}
                </span>

            </div>


            <div class="date-cell">

                <strong>
                    ${escapeHtml(date)}
                </strong>

                <small>
                    ${escapeHtml(relative)}
                </small>

            </div>


            <div>

                <button
                    type="button"
                    class="row-menu"
                    onclick="
                        event.stopPropagation();
                        openNotification(${Number(id)});
                    "
                    aria-label="Open notification"
                >
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>

            </div>

        </div>
    `;
}


/* ============================================================
   NOTIFICATION STATUS
============================================================ */

function isUnreadStatus(
    status
) {

    if (!status) {
        return false;
    }


    return (
        String(status)
            .toLowerCase()
            .trim() === "unread"
    );
}


/* ============================================================
   OPEN NOTIFICATION
============================================================ */

async function openNotification(
    id
) {

    if (!id) {
        return;
    }


    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/procurement/notifications/${id}/details`
            );


        selectedNotification =
            data;


        renderDetails(
            data
        );


        if (
            isUnreadStatus(
                data.status
            )
        ) {

            await markAsRead(
                id,
                false
            );
        }


    } catch (error) {

        console.error(
            "Notification details error:",
            error.message
        );


        const details =
            getElement(
                "detailsContent"
            );


        if (details) {

            details.innerHTML = `
                <div class="empty-details">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>${escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }
}


/* ============================================================
   RENDER DETAILS
============================================================ */

function renderDetails(
    n
) {

    if (!n) {
        return;
    }


    const amount =
        n.amount !== undefined &&
        n.amount !== null
            ? formatCurrency(
                n.amount
            )
            : "-";


    const requestedOn =
        n.requested_on ||
        n.requestedAt ||
        n.created_at;


    const requestedOnFormatted =
        requestedOn
            ? formatDateTime(
                requestedOn
            )
            : "-";


    const title =
        n.title ||
        "Notification";


    const message =
        n.message ||
        "";


    const category =
        n.category ||
        n.type ||
        "-";


    const priority =
        n.priority ||
        "Low";


    const relatedTo =
        n.related_to ||
        n.relatedTo ||
        "-";


    const poNumber =
        n.po_number ||
        n.poNumber ||
        "-";


    const vendor =
        n.vendor ||
        n.vendor_name ||
        n.vendorName ||
        "-";


    const requestedBy =
        n.requested_by ||
        n.requestedBy ||
        "-";


    const details =
        getElement(
            "detailsContent"
        );


    if (!details) {
        return;
    }


    details.innerHTML = `

        <div class="detail-title">

            <div class="detail-icon">

                <i
                    class="${getNotificationIcon(category)}"
                ></i>

            </div>


            <div>

                <h4>
                    ${escapeHtml(title)}
                </h4>

                <span>
                    ${escapeHtml(priority)}
                    Priority
                </span>

            </div>

        </div>


        <p class="detail-message">

            ${escapeHtml(message)}

        </p>


        <div class="detail-grid">


            <div>

                <span>
                    Type
                </span>

                <strong>
                    ${escapeHtml(category)}
                </strong>

            </div>


            <div>

                <span>
                    Related To
                </span>

                <strong>
                    ${escapeHtml(relatedTo)}
                </strong>

            </div>


            <div>

                <span>
                    PO Number
                </span>

                <strong>
                    ${escapeHtml(poNumber)}
                </strong>

            </div>


            <div>

                <span>
                    Vendor
                </span>

                <strong>
                    ${escapeHtml(vendor)}
                </strong>

            </div>


            <div>

                <span>
                    Amount
                </span>

                <strong>
                    ${escapeHtml(amount)}
                </strong>

            </div>


            <div>

                <span>
                    Requested By
                </span>

                <strong>
                    ${escapeHtml(requestedBy)}
                </strong>

            </div>


            <div>

                <span>
                    Requested On
                </span>

                <strong>
                    ${escapeHtml(
                        requestedOnFormatted
                    )}
                </strong>

            </div>


        </div>


        <div class="detail-actions">

            <button
                type="button"
                class="primary"
                onclick="reviewNotification()"
            >
                Review & Approve
            </button>


            <button
                type="button"
                class="outline"
                onclick="viewPurchaseOrder()"
            >
                View Purchase Order

                <i
                    class="fa-solid fa-arrow-up-right-from-square"
                ></i>

            </button>

        </div>

    `;
}


/* ============================================================
   MARK ONE AS READ
============================================================ */

async function markAsRead(
    id,
    reload = true
) {

    if (!id) {
        return;
    }


    try {

        await apiFetch(
            `${API_BASE}/api/procurement/notifications/${id}/read`,
            {
                method: "PUT"
            }
        );


        if (reload) {

            await loadNotifications();
        }


        await loadStatistics();


    } catch (error) {

        console.error(
            "Mark as read error:",
            error.message
        );
    }
}


/* ============================================================
   MARK ALL AS READ
============================================================ */

async function markAllRead() {

    try {

        await apiFetch(
            `${API_BASE}/api/procurement/notifications/read-all`,
            {
                method: "PUT"
            }
        );


        await loadNotifications();

        await loadStatistics();


        /* ====================================================
           Remove unread styling
        ==================================================== */

        document
            .querySelectorAll(
                ".notification-row.unread"
            )
            .forEach(
                row => {

                    row.classList.remove(
                        "unread"
                    );
                }
            );


    } catch (error) {

        console.error(
            "Mark all read error:",
            error.message
        );


        alert(
            error.message
        );
    }
}


/* ============================================================
   PAGINATION
============================================================ */

function renderPagination(
    data
) {

    const total =
        Number(
            data?.total ??
            data?.count ??
            0
        );


    const page =
        Number(
            data?.page ??
            currentPage
        );


    const limit =
        Number(
            data?.limit ??
            data?.page_size ??
            pageSize
        );


    let totalPages =
        Number(
            data?.total_pages ??
            data?.pages ??
            0
        );


    if (!totalPages) {

        totalPages =
            total > 0
                ? Math.ceil(
                    total / limit
                )
                : 1;
    }


    const start =
        total === 0
            ? 0
            : (
                (page - 1) *
                limit
            ) + 1;


    const end =
        Math.min(
            page * limit,
            total
        );


    setText(
        "paginationInfo",
        total === 0
            ? "Showing 0 notifications"
            : `Showing ${start} to ${end} of ${total} notifications`
    );


    const previousButton =
        getElement(
            "previousPage"
        );


    if (previousButton) {

        previousButton.disabled =
            page <= 1;
    }


    const nextButton =
        getElement(
            "nextPage"
        );


    if (nextButton) {

        nextButton.disabled =
            page >= totalPages;
    }


    const pageNumbers =
        getElement(
            "pageNumbers"
        );


    if (!pageNumbers) {
        return;
    }


    let html = "";


    const maxVisiblePages = 5;


    let startPage =
        Math.max(
            1,
            page - 2
        );


    let endPage =
        Math.min(
            totalPages,
            startPage +
                maxVisiblePages -
                1
        );


    if (
        endPage - startPage + 1 <
        maxVisiblePages
    ) {

        startPage =
            Math.max(
                1,
                endPage -
                    maxVisiblePages +
                    1
            );
    }


    for (
        let i = startPage;
        i <= endPage;
        i++
    ) {

        html += `

            <span
                class="page-number ${
                    i === page
                        ? "active"
                        : ""
                }"
                onclick="goToPage(${i})"
            >
                ${i}
            </span>

        `;
    }


    pageNumbers.innerHTML =
        html;
}


/* ============================================================
   GO TO PAGE
============================================================ */

async function goToPage(
    page
) {

    if (page < 1) {
        return;
    }


    currentPage =
        page;


    try {

        await loadNotifications();

    } catch (error) {

        console.error(
            "Pagination error:",
            error.message
        );
    }
}


/* ============================================================
   NEXT PAGE
============================================================ */

async function nextPage() {

    const button =
        getElement(
            "nextPage"
        );


    if (
        button &&
        button.disabled
    ) {

        return;
    }


    currentPage++;


    try {

        await loadNotifications();

    } catch (error) {

        console.error(
            error
        );
    }
}


/* ============================================================
   PREVIOUS PAGE
============================================================ */

async function previousPage() {

    if (
        currentPage <= 1
    ) {

        return;
    }


    currentPage--;


    try {

        await loadNotifications();

    } catch (error) {

        console.error(
            error
        );
    }
}


/* ============================================================
   SELECT ALL
============================================================ */

function setupSelectAll() {

    const selectAll =
        getElement(
            "selectAll"
        );


    if (!selectAll) {
        return;
    }


    selectAll.addEventListener(
        "change",
        function () {

            const checked =
                this.checked;


            document
                .querySelectorAll(
                    ".notification-checkbox"
                )
                .forEach(
                    checkbox => {

                        checkbox.checked =
                            checked;
                    }
                );
        }
    );
}


/* ============================================================
   UPDATE SELECT ALL
============================================================ */

function updateSelectAllState() {

    const selectAll =
        getElement(
            "selectAll"
        );


    if (!selectAll) {
        return;
    }


    const checkboxes =
        document.querySelectorAll(
            ".notification-checkbox"
        );


    if (
        checkboxes.length === 0
    ) {

        selectAll.checked =
            false;

        selectAll.indeterminate =
            false;

        return;
    }


    const checkedCount =
        document.querySelectorAll(
            ".notification-checkbox:checked"
        ).length;


    selectAll.checked =
        checkedCount ===
        checkboxes.length;


    selectAll.indeterminate =
        checkedCount > 0 &&
        checkedCount < checkboxes.length;
}


/* ============================================================
   CHART
============================================================ */

function renderChart(
    stats
) {

    const canvas =
        getElement(
            "notificationChart"
        );


    if (!canvas) {
        return;
    }


    const categories =
        stats?.categories ||
        {};


    const values = [

        Number(
            categories.procurement_alerts ||
            0
        ),

        Number(
            categories.delivery_updates ||
            0
        ),

        Number(
            categories.approvals ||
            0
        ),

        Number(
            categories.invoices_payments ||
            0
        ),

        Number(
            categories.system_updates ||
            0
        )

    ];


    const labels = [

        "Procurement Alerts",

        "Delivery Updates",

        "Approvals",

        "Invoices & Payments",

        "System Updates"

    ];


    if (
        typeof Chart === "undefined"
    ) {

        console.warn(
            "Chart.js is not loaded."
        );

        return;
    }


    if (
        notificationChart
    ) {

        notificationChart.destroy();
    }


    notificationChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [
                        {
                            data: values,

                            borderWidth: 2,

                            borderColor:
                                "#ffffff"
                        }
                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "67%",


                    plugins: {

                        legend: {
                            display: false
                        }

                    }

                }

            }
        );


    renderSummaryLegend(
        labels,
        values
    );
}


/* ============================================================
   SUMMARY LEGEND
============================================================ */

function renderSummaryLegend(
    labels,
    values
) {

    const legend =
        getElement(
            "summaryLegend"
        );


    if (!legend) {
        return;
    }


    legend.innerHTML =
        labels
            .map(
                (
                    label,
                    index
                ) => {

                    return `

                        <div class="legend-row">

                            <span
                                class="legend-dot"
                            ></span>

                            <span>
                                ${escapeHtml(label)}
                            </span>

                            <strong>
                                ${values[index]}
                            </strong>

                        </div>

                    `;
                }
            )
            .join("");
}


/* ============================================================
   NOTIFICATION ICON
============================================================ */

function getNotificationIcon(
    category
) {

    switch (
        String(
            category || ""
        )
            .trim()
    ) {

        case "Procurement Alerts":

            return "fa-solid fa-clipboard-list";


        case "Delivery Updates":

            return "fa-solid fa-truck";


        case "Approvals":

            return "fa-regular fa-square-check";


        case "Invoices & Payments":

            return "fa-regular fa-file-lines";


        case "System Updates":

            return "fa-solid fa-circle-info";


        default:

            return "fa-regular fa-bell";
    }
}


/* ============================================================
   NOTIFICATION ICON CLASS
============================================================ */

function getNotificationIconClass(
    category
) {

    switch (
        String(
            category || ""
        )
            .trim()
    ) {

        case "Procurement Alerts":

            return "orange";


        case "Delivery Updates":

            return "green";


        case "Approvals":

            return "blue";


        case "Invoices & Payments":

            return "pink";


        case "System Updates":

            return "violet";


        default:

            return "purple";
    }
}


/* ============================================================
   DATE FORMAT
============================================================ */

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(
            value
        );


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
   DATE + TIME FORMAT
============================================================ */

function formatDateTime(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";
    }


    return date.toLocaleString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* ============================================================
   RELATIVE TIME
============================================================ */

function relativeTime(
    value
) {

    if (!value) {
        return "";
    }


    const timestamp =
        new Date(
            value
        ).getTime();


    if (
        Number.isNaN(timestamp)
    ) {

        return "";
    }


    const diff =
        Date.now() -
        timestamp;


    if (diff < 0) {

        return "Just now";
    }


    const minutes =
        Math.floor(
            diff / 60000
        );


    if (
        minutes < 1
    ) {

        return "Just now";
    }


    if (
        minutes < 60
    ) {

        return `${minutes} minute${
            minutes === 1
                ? ""
                : "s"
        } ago`;
    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (
        hours < 24
    ) {

        return `${hours} hour${
            hours === 1
                ? ""
                : "s"
        } ago`;
    }


    const days =
        Math.floor(
            hours / 24
        );


    if (
        days === 1
    ) {

        return "Yesterday";
    }


    return `${days} days ago`;
}


/* ============================================================
   CURRENCY
============================================================ */

function formatCurrency(
    value
) {

    const number =
        Number(
            value
        );


    if (
        Number.isNaN(
            number
        )
    ) {

        return "$0.00";
    }


    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD"
        }
    ).format(
        number
    );
}


/* ============================================================
   ESCAPE HTML
============================================================ */

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


/* ============================================================
   REVIEW NOTIFICATION
============================================================ */

function reviewNotification() {

    if (
        !selectedNotification
    ) {

        return;
    }


    const poNumber =
        selectedNotification.po_number ||
        selectedNotification.poNumber ||
        null;


    if (poNumber) {

        window.location.href =
            `/ProcurementApprovals?po_number=${
                encodeURIComponent(
                    poNumber
                )
            }`;

    } else {

        window.location.href =
            "/ProcurementApprovals";
    }
}


/* ============================================================
   VIEW PURCHASE ORDER
============================================================ */

function viewPurchaseOrder() {

    if (
        !selectedNotification
    ) {

        window.location.href =
            "/ProcurementPurchaseOrder";

        return;
    }


    const poNumber =
        selectedNotification.po_number ||
        selectedNotification.poNumber ||
        null;


    if (!poNumber) {

        window.location.href =
            "/ProcurementPurchaseOrder";

        return;
    }


    window.location.href =
        `/ProcurementPurchaseOrder?po_number=${
            encodeURIComponent(
                poNumber
            )
        }`;
}


/* ============================================================
   OPEN PROFILE
============================================================ */

function openProfile() {

    window.location.href =
        "/ProcurementProfile";
}


/* ============================================================
   SEARCH DEBOUNCE
============================================================ */

function debounce(
    callback,
    delay
) {

    let timer = null;


    return function (...args) {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => {

                    callback(
                        ...args
                    );

                },
                delay
            );
    };
}


/* ============================================================
   SEARCH
============================================================ */

function setupSearch() {

    const searchInput =
        getElement(
            "searchInput"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        debounce(
            async function () {

                currentPage =
                    1;


                try {

                    await loadNotifications();

                } catch (error) {

                    console.error(
                        error
                    );
                }

            },
            350
        )
    );
}


/* ============================================================
   FILTER BUTTON
============================================================ */

function setupFilterButton() {

    const filterButton =
        getElement(
            "filterBtn"
        );


    if (!filterButton) {
        return;
    }


    filterButton.addEventListener(
        "click",
        async function () {

            const typeFilter =
                getElement(
                    "typeFilter"
                );


            const priorityFilter =
                getElement(
                    "priorityFilter"
                );


            if (typeFilter) {

                selectedCategory =
                    typeFilter.value ||
                    "All";
            }


            if (priorityFilter) {

                selectedPriority =
                    priorityFilter.value ||
                    "All";
            }


            currentPage =
                1;


            try {

                await loadNotifications();

            } catch (error) {

                console.error(
                    "Filter error:",
                    error
                );
            }
        }
    );
}


/* ============================================================
   TYPE FILTER
============================================================ */

function setupTypeFilter() {

    const filter =
        getElement(
            "typeFilter"
        );


    if (!filter) {
        return;
    }


    filter.addEventListener(
        "change",
        async function () {

            selectedCategory =
                this.value ||
                "All";


            currentPage =
                1;


            /*
             * If a category is selected from the dropdown,
             * clear the Unread tab status.
             */

            selectedStatus =
                null;


            setActiveTabForCategory(
                selectedCategory
            );


            try {

                await loadNotifications();

            } catch (error) {

                console.error(
                    error
                );
            }
        }
    );
}


/* ============================================================
   PRIORITY FILTER
============================================================ */

function setupPriorityFilter() {

    const filter =
        getElement(
            "priorityFilter"
        );


    if (!filter) {
        return;
    }


    filter.addEventListener(
        "change",
        async function () {

            selectedPriority =
                this.value ||
                "All";


            currentPage =
                1;


            try {

                await loadNotifications();

            } catch (error) {

                console.error(
                    error
                );
            }
        }
    );
}


/* ============================================================
   TABS
============================================================ */

function setupTabs() {

    const tabs =
        document.querySelectorAll(
            ".tab"
        );


    tabs.forEach(
        tab => {

            tab.addEventListener(
                "click",
                async function () {

                    tabs.forEach(
                        t => {

                            t.classList.remove(
                                "active"
                            );

                        }
                    );


                    this.classList.add(
                        "active"
                    );


                    const category =
                        this.dataset.category ||
                        "All";


                    const status =
                        this.dataset.status ||
                        null;


                    selectedCategory =
                        category;


                    selectedStatus =
                        status;


                    currentPage =
                        1;


                    const typeFilter =
                        getElement(
                            "typeFilter"
                        );


                    /*
                     * Unread tab does not have a category.
                     */

                    if (
                        typeFilter &&
                        status === "Unread"
                    ) {

                        typeFilter.value =
                            "All";
                    }


                    if (
                        typeFilter &&
                        status !== "Unread"
                    ) {

                        typeFilter.value =
                            category;
                    }


                    try {

                        await loadNotifications();

                    } catch (error) {

                        console.error(
                            "Tab loading error:",
                            error
                        );
                    }
                }
            );
        }
    );
}


/* ============================================================
   SET ACTIVE TAB
============================================================ */

function setActiveTabForCategory(
    category
) {

    const tabs =
        document.querySelectorAll(
            ".tab"
        );


    tabs.forEach(
        tab => {

            const tabCategory =
                tab.dataset.category ||
                null;


            const tabStatus =
                tab.dataset.status ||
                null;


            if (
                !tabStatus &&
                tabCategory === category
            ) {

                tab.classList.add(
                    "active"
                );

            } else {

                tab.classList.remove(
                    "active"
                );
            }
        }
    );
}


/* ============================================================
   PAGE SIZE
============================================================ */

function setupPageSize() {

    const select =
        getElement(
            "pageSize"
        );


    if (!select) {
        return;
    }


    select.addEventListener(
        "change",
        async function () {

            const value =
                Number(
                    this.value
                );


            if (
                Number.isFinite(value) &&
                value > 0
            ) {

                pageSize =
                    value;
            }


            currentPage =
                1;


            try {

                await loadNotifications();

            } catch (error) {

                console.error(
                    error
                );
            }
        }
    );
}


/* ============================================================
   PAGINATION BUTTONS
============================================================ */

function setupPagination() {

    const previous =
        getElement(
            "previousPage"
        );


    if (previous) {

        previous.addEventListener(
            "click",
            previousPage
        );
    }


    const next =
        getElement(
            "nextPage"
        );


    if (next) {

        next.addEventListener(
            "click",
            nextPage
        );
    }
}


/* ============================================================
   CLOSE DETAILS
============================================================ */

function setupCloseDetails() {

    const closeButton =
        getElement(
            "closeDetails"
        );


    if (!closeButton) {
        return;
    }


    closeButton.addEventListener(
        "click",
        function () {

            selectedNotification =
                null;


            const details =
                getElement(
                    "detailsContent"
                );


            if (details) {

                details.innerHTML = `

                    <div class="empty-details">

                        <i
                            class="fa-regular fa-bell"
                        ></i>

                        <p>
                            Select a notification
                        </p>

                    </div>

                `;
            }
        }
    );
}


/* ============================================================
   SETTINGS BUTTON
============================================================ */

function setupSettingsButton() {

    const button =
        getElement(
            "settingsBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        function () {

            window.location.href =
                "/NotificationSettings";
        }
    );
}


/* ============================================================
   MARK ALL BUTTON
============================================================ */

function setupMarkAllButton() {

    const button =
        getElement(
            "markAllBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        markAllRead
    );
}


/* ============================================================
   GLOBAL SEARCH
============================================================ */

function setupGlobalSearch() {

    const globalSearch =
        document.querySelector(
            ".search-global input"
        );


    if (!globalSearch) {
        return;
    }


    globalSearch.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter"
            ) {

                const value =
                    this.value.trim();


                if (value) {

                    const searchInput =
                        getElement(
                            "searchInput"
                        );


                    if (searchInput) {

                        searchInput.value =
                            value;

                        searchInput.dispatchEvent(
                            new Event(
                                "input"
                            )
                        );
                    }
                }
            }
        }
    );
}


/* ============================================================
   SETUP ALL EVENTS
============================================================ */

function setupEvents() {

    setupMarkAllButton();

    setupSettingsButton();

    setupPagination();

    setupPageSize();

    setupSearch();

    setupFilterButton();

    setupTypeFilter();

    setupPriorityFilter();

    setupTabs();

    setupSelectAll();

    setupCloseDetails();

    setupGlobalSearch();
}


/* ============================================================
   INITIALIZE
============================================================ */

async function initializeNotifications() {

    /*
     * Prevent duplicate initialization.
     */

    if (
        initializationStarted
    ) {

        return;
    }


    initializationStarted =
        true;


    console.log(
        "Initializing Procurement Notifications..."
    );


    setupEvents();


    /*
     * Check authentication before
     * loading the page.
     */

    const token =
        getAuthToken();


    if (!token) {

        console.error(
            "No JWT token found."
        );


        handleAuthenticationFailure();


        return;
    }


    try {

        /*
         * 1. Current user
         */

        await loadCurrentUser();


        /*
         * 2. Notifications
         */

        await loadNotifications();


        /*
         * 3. Statistics
         */

        const statistics =
            await loadStatistics();


        /*
         * 4. Chart
         */

        renderChart(
            statistics
        );


        console.log(
            "Procurement Notifications initialized successfully."
        );


    } catch (error) {

        console.error(
            "Notification initialization failed:",
            error
        );


        /*
         * Authentication error:
         * do not repeatedly call APIs.
         */

        if (
            error.message ===
            "Could not validate credentials"
        ) {

            return;
        }
    }
}


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeNotifications
);


/* ============================================================
   GLOBAL FUNCTIONS
   Required by inline HTML onclick handlers
============================================================ */

window.openProfile =
    openProfile;

window.openNotification =
    openNotification;

window.markAsRead =
    markAsRead;

window.markAllRead =
    markAllRead;

window.goToPage =
    goToPage;

window.reviewNotification =
    reviewNotification;

window.viewPurchaseOrder =
    viewPurchaseOrder;
