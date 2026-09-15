const API = "http://127.0.0.1:8000";

let currentPage = 1;

const pageLimit = 8;

let currentCategory = "All";

let currentNotifications = [];


/* =========================================================
   AUTH
========================================================= */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        ""
    );

}


/* =========================================================
   API
========================================================= */

async function apiFetch(
    endpoint,
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

    const response =
        await fetch(
            `${API}${endpoint}`,
            {
                ...options,
                headers
            }
        );

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const data =
                await response.json();

            message =
                data.detail ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


/* =========================================================
   LOAD NOTIFICATIONS
========================================================= */

async function loadNotifications(
    page = currentPage
) {

    currentPage = page;

    const search =
        document
            .getElementById(
                "notificationSearch"
            )
            .value
            .trim();

    const status =
        document
            .getElementById(
                "statusFilter"
            )
            .value;

    const params =
        new URLSearchParams();

    params.set(
        "page",
        page
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
        currentCategory !== "All"
    ) {

        params.set(
            "category",
            currentCategory
        );

    }

    if (
        status !== "All"
    ) {

        params.set(
            "status",
            status
        );

    }

    try {

        const data =
            await apiFetch(
                `/api/vendor/notifications?${params}`
            );

        currentNotifications =
            data.items || [];

        renderNotifications(
            currentNotifications
        );

        renderPagination(
            data
        );

        document.getElementById(
            "showingText"
        ).textContent =
            `Showing ${
                currentNotifications.length
            } of ${
                data.total
            } notifications`;

    } catch (error) {

        console.error(
            "Unable to load notifications:",
            error
        );

        document.getElementById(
            "notificationTableBody"
        ).innerHTML = `
            <tr>
                <td colspan="6"
                    style="text-align:center;padding:40px">
                    Unable to load notifications.
                </td>
            </tr>
        `;

    }

}


/* =========================================================
   RENDER NOTIFICATIONS
========================================================= */

function renderNotifications(
    notifications
) {

    const tbody =
        document.getElementById(
            "notificationTableBody"
        );

    tbody.innerHTML = "";

    if (!notifications.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    style="text-align:center;padding:45px">
                    No notifications found.
                </td>
            </tr>
        `;

        return;
    }


    notifications.forEach(
        notification => {

            const tr =
                document.createElement(
                    "tr"
                );

            if (
                notification.status ===
                "Unread"
            ) {

                tr.classList.add(
                    "unread-row"
                );

            }


            tr.innerHTML = `

                <td>

                    <div class="notification-name">

                        ${getIcon(notification)}

                        <div>

                            <div class="notification-title">
                                ${escapeHtml(
                                    notification.title
                                )}
                            </div>

                            <div class="notification-ref">
                                ${escapeHtml(
                                    notification.reference_id ||
                                    ""
                                )}
                            </div>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="category-pill">

                        ${formatCategory(
                            notification.category
                        )}

                    </span>

                </td>


                <td>

                    <div class="message">

                        ${escapeHtml(
                            notification.message ||
                            ""
                        )}

                    </div>

                </td>


                <td>

                    ${formatDate(
                        notification.created_at
                    )}

                </td>


                <td>

                    <span
                        class="status-pill ${
                            notification.status ===
                            "Unread"
                                ? "unread"
                                : "read"
                        }"
                    >

                        ${notification.status}

                    </span>

                </td>


                <td>

                    <button
                        class="action-btn"
                        onclick="notificationAction(
                            ${notification.id}
                        )"
                    >

                        <i class="fa-solid fa-ellipsis"></i>

                    </button>

                </td>

            `;

            tbody.appendChild(tr);

        }
    );

}


/* =========================================================
   ICON
========================================================= */

function getIcon(
    notification
) {

    const category =
        (
            notification.category ||
            ""
        ).toLowerCase();

    let icon =
        "fa-bell";

    if (
        category.includes(
            "procurement"
        )
    ) {

        icon =
            "fa-cart-shopping";

    } else if (
        category.includes(
            "delivery"
        )
    ) {

        icon =
            "fa-truck";

    } else if (
        category.includes(
            "vendor"
        )
    ) {

        icon =
            "fa-user-check";

    } else if (
        category.includes(
            "contract"
        )
    ) {

        icon =
            "fa-file-lines";

    } else if (
        category.includes(
            "compliance"
        )
    ) {

        icon =
            "fa-shield-halved";

    }

    return `
        <div class="notification-icon purple">
            <i class="fa-solid ${icon}"></i>
        </div>
    `;

}


/* =========================================================
   CATEGORY
========================================================= */

function formatCategory(
    category
) {

    const map = {

        Procurement:
            "Procurement Alerts",

        Delivery:
            "Delivery Delays",

        Vendor:
            "Vendor Approvals",

        Contract:
            "Contract Expiry",

        Compliance:
            "Compliance",

        System:
            "System"

    };

    return (
        map[category] ||
        category ||
        "System"
    );

}


/* =========================================================
   DATE
========================================================= */

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

        return value;

    }

    return `
        ${date.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        )}

        <br>

        <small>
            ${date.toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )}
        </small>
    `;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value ?? "";

    return div.innerHTML;

}


/* =========================================================
   STATISTICS
========================================================= */

async function loadStatistics() {

    try {

        const data =
            await apiFetch(
                "/api/vendor/notifications/stats"
            );

        setText(
            "allCount",
            data.all_notifications
        );

        setText(
            "allUnread",
            data.unread_notifications
        );

        setText(
            "procurementCount",
            data.procurement_alerts
        );

        setText(
            "procurementUnread",
            data.procurement_unread
        );

        setText(
            "deliveryCount",
            data.delivery_delays
        );

        setText(
            "deliveryUnread",
            data.delivery_unread
        );

        setText(
            "vendorCount",
            data.vendor_approvals
        );

        setText(
            "vendorUnread",
            data.vendor_unread
        );

        setText(
            "contractCount",
            data.contract_expiry
        );

        setText(
            "contractUnread",
            data.contract_unread
        );

        setText(
            "complianceCount",
            data.compliance
        );

        setText(
            "complianceUnread",
            data.compliance_unread
        );

        setText(
            "sidebarUnread",
            data.unread_notifications
        );

    } catch (error) {

        console.error(
            "Statistics error:",
            error
        );

    }

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value ?? 0;

    }

}


/* =========================================================
   MARK ONE READ
========================================================= */

async function markAsRead(
    id
) {

    await apiFetch(
        `/api/vendor/notifications/${id}/read`,
        {
            method: "PUT"
        }
    );

    await loadNotifications();

    await loadStatistics();

}


/* =========================================================
   MARK ALL READ
========================================================= */

async function markAllAsRead() {

    try {

        await apiFetch(
            "/api/vendor/notifications/read-all",
            {
                method: "PUT"
            }
        );

        await loadNotifications();

        await loadStatistics();

    } catch (error) {

        console.error(
            error
        );

        alert(
            "Unable to mark notifications as read."
        );

    }

}


/* =========================================================
   ACTION MENU
========================================================= */

async function notificationAction(
    id
) {

    const notification =
        currentNotifications.find(
            item =>
                Number(item.id) ===
                Number(id)
        );

    if (!notification) {
        return;
    }

    if (
        notification.status ===
        "Unread"
    ) {

        const confirmed =
            confirm(
                `Mark "${notification.title}" as read?`
            );

        if (!confirmed) {
            return;
        }

        await markAsRead(id);

        return;
    }

    const action =
        confirm(
            "Mark this notification as unread?"
        );

    if (!action) {
        return;
    }

    await apiFetch(
        `/api/vendor/notifications/${id}/unread`,
        {
            method: "PUT"
        }
    );

    await loadNotifications();

    await loadStatistics();

}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(
    data
) {

    const container =
        document.getElementById(
            "pagination"
        );

    container.innerHTML = "";

    const totalPages =
        data.total_pages || 1;


    const previous =
        document.createElement(
            "button"
        );

    previous.innerHTML =
        '<i class="fa-solid fa-chevron-left"></i>';

    previous.disabled =
        data.page <= 1;

    previous.onclick = () => {

        if (data.page > 1) {

            loadNotifications(
                data.page - 1
            );

        }

    };

    container.appendChild(
        previous
    );


    for (
        let page = 1;
        page <= totalPages && page <= 5;
        page++
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.textContent =
            page;

        if (
            page === data.page
        ) {

            button.classList.add(
                "active"
            );

        }

        button.onclick = () =>
            loadNotifications(
                page
            );

        container.appendChild(
            button
        );

    }


    const next =
        document.createElement(
            "button"
        );

    next.innerHTML =
        '<i class="fa-solid fa-chevron-right"></i>';

    next.disabled =
        data.page >= totalPages;

    next.onclick = () => {

        if (
            data.page <
            totalPages
        ) {

            loadNotifications(
                data.page + 1
            );

        }

    };

    container.appendChild(
        next
    );

}


/* =========================================================
   SETTINGS
========================================================= */

async function loadSettings() {

    try {

        const settings =
            await apiFetch(
                "/api/vendor/notifications/settings"
            );

        document.getElementById(
            "procurementAlerts"
        ).checked =
            settings.procurement_alerts;

        document.getElementById(
            "deliveryDelayNotifications"
        ).checked =
            settings.delivery_delay_notifications;

        document.getElementById(
            "vendorApprovalNotifications"
        ).checked =
            settings.vendor_approval_notifications;

        document.getElementById(
            "contractExpiryAlerts"
        ).checked =
            settings.contract_expiry_alerts;

        document.getElementById(
            "complianceNotifications"
        ).checked =
            settings.compliance_notifications;

        document.getElementById(
            "emailNotifications"
        ).checked =
            settings.email_notifications;

        document.getElementById(
            "smsNotifications"
        ).checked =
            settings.sms_notifications;

    } catch (error) {

        console.error(
            "Unable to load settings:",
            error
        );

    }

}


/* =========================================================
   SAVE SETTINGS
========================================================= */

async function saveSettings() {

    const data = {

        procurement_alerts:
            document.getElementById(
                "procurementAlerts"
            ).checked,

        delivery_delay_notifications:
            document.getElementById(
                "deliveryDelayNotifications"
            ).checked,

        vendor_approval_notifications:
            document.getElementById(
                "vendorApprovalNotifications"
            ).checked,

        contract_expiry_alerts:
            document.getElementById(
                "contractExpiryAlerts"
            ).checked,

        compliance_notifications:
            document.getElementById(
                "complianceNotifications"
            ).checked,

        email_notifications:
            document.getElementById(
                "emailNotifications"
            ).checked,

        sms_notifications:
            document.getElementById(
                "smsNotifications"
            ).checked

    };


    try {

        await apiFetch(
            "/api/vendor/notifications/settings",
            {
                method: "PUT",
                body: JSON.stringify(data)
            }
        );

        alert(
            "Notification preferences saved."
        );

    } catch (error) {

        console.error(
            error
        );

        alert(
            "Unable to save notification preferences."
        );

    }

}


/* =========================================================
   CATEGORY TABS
========================================================= */

document
    .querySelectorAll(
        ".category-tab"
    )
    .forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".category-tab"
                    )
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );

                tab.classList.add(
                    "active"
                );

                currentCategory =
                    tab.dataset.category;

                currentPage = 1;

                loadNotifications();

            }
        );

    });


/* =========================================================
   CATEGORY FILTER
========================================================= */

document
    .getElementById(
        "categoryFilter"
    )
    .addEventListener(
        "change",
        event => {

            currentCategory =
                event.target.value;

            currentPage = 1;

            loadNotifications();

        }
    );


/* =========================================================
   STATUS FILTER
========================================================= */

document
    .getElementById(
        "statusFilter"
    )
    .addEventListener(
        "change",
        () => {

            currentPage = 1;

            loadNotifications();

        }
    );


/* =========================================================
   SEARCH
========================================================= */

document
    .getElementById(
        "notificationSearch"
    )
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                currentPage = 1;

                loadNotifications();

            }

        }
    );


/* =========================================================
   TOP SEARCH
========================================================= */

document
    .getElementById(
        "topSearch"
    )
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                document.getElementById(
                    "notificationSearch"
                ).value =
                    event.target.value;

                currentPage = 1;

                loadNotifications();

            }

        }
    );


/* =========================================================
   MARK ALL
========================================================= */

document
    .getElementById(
        "markAllReadBtn"
    )
    .addEventListener(
        "click",
        markAllAsRead
    );


/* =========================================================
   FILTER BUTTON
========================================================= */

document
    .getElementById(
        "filterBtn"
    )
    .addEventListener(
        "click",
        () => {

            currentPage = 1;

            loadNotifications();

        }
    );


/* =========================================================
   SETTINGS CHANGE
========================================================= */

[
    "procurementAlerts",
    "deliveryDelayNotifications",
    "vendorApprovalNotifications",
    "contractExpiryAlerts",
    "complianceNotifications",
    "emailNotifications",
    "smsNotifications"
].forEach(id => {

    document
        .getElementById(id)
        .addEventListener(
            "change",
            saveSettings
        );

});


/* =========================================================
   RECENT ACTIVITY
========================================================= */

function renderRecentActivity() {

    const container =
        document.getElementById(
            "recentActivity"
        );

    container.innerHTML = "";

    currentNotifications
        .slice(0, 4)
        .forEach(notification => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "activity";

            div.innerHTML = `

                <div class="activity-icon">

                    <i class="fa-solid fa-check"></i>

                </div>

                <div>

                    <strong>
                        ${escapeHtml(
                            notification.title
                        )}
                    </strong>

                    <small>
                        ${formatDate(
                            notification.created_at
                        ).replace(
                            "<br>",
                            " "
                        )}
                    </small>

                </div>

            `;

            container.appendChild(
                div
            );

        });

}


/* =========================================================
   LOGOUT
========================================================= */

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

    sessionStorage.removeItem(
        "access_token"
    );

    sessionStorage.removeItem(
        "token"
    );

    sessionStorage.removeItem(
        "jwt_token"
    );

    window.location.href =
        "/login";

}


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

    await loadStatistics();

    await loadNotifications();

    await loadSettings();

    renderRecentActivity();

    await loadVendorProfile();

}


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


/* =========================================================
   LOAD VENDOR PROFILE
========================================================= */

async function loadVendorProfile() {

    /*
     * Get vendor ID from browser storage first.
     * Do NOT use getElementById() as the vendor ID.
     */
    const vendorId =
        sessionStorage.getItem("vendor_id") ||
        sessionStorage.getItem("vendorId") ||
        sessionStorage.getItem("vendorID") ||
        localStorage.getItem("vendor_id") ||
        localStorage.getItem("vendorId") ||
        localStorage.getItem("vendorID") ||
        "";

    if (!vendorId) {

        console.warn(
            "Vendor ID not found in sessionStorage/localStorage."
        );

        return;
    }


    /*
     * Safety check:
     * Prevent HTML elements from accidentally becoming
     * the vendor ID.
     */
    if (
        typeof vendorId !== "string" ||
        vendorId === "[object HTMLSpanElement]" ||
        vendorId === "[object HTMLDivElement]" ||
        vendorId.includes("[object HTML")
    ) {

        console.error(
            "Invalid vendor ID:",
            vendorId
        );

        return;
    }


    console.log(
        "Loading vendor profile for:",
        vendorId
    );


    try {

        /*
         * apiFetch() already parses response.json(),
         * so the returned value is the vendor object itself.
         */
        const vendorData =
            await apiFetch(
                `/api/vendor/profile/${encodeURIComponent(vendorId)}`,
                {
                    method: "GET"
                }
            );


        console.log(
            "Vendor profile:",
            vendorData
        );


        const name =
            vendorData.vendor_name ||
            vendorData.company_name ||
            vendorData.name ||
            "Vendor";


        const headerName =
            document.getElementById(
                "headerVendorName"
            );


        const sidebarName =
            document.getElementById(
                "vendorName"
            );

        const vendorID = document.getElementById("vendorID");


        if (headerName) {

            headerName.textContent =
                name;

        }


        if (sidebarName) {

            sidebarName.textContent =
                name;

        }

        if(vendorID) {
            vendorID.textContent = vendorId;
        }


    } catch (error) {

        console.error(
            "Vendor profile error:",
            error
        );

    }

}