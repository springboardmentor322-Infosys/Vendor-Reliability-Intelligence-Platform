/* ==========================================================
   VENDORIQ
   NOTIFICATIONS MODULE
   ========================================================== */


const API = "http://127.0.0.1:8000";

let currentPage = 1;

let pageLimit = 10;

let selectedCategory = "All";

let currentNotifications = [];



/* ==========================================================
   AUTH TOKEN
========================================================== */

function getToken() {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        "";

    console.log(
        "JWT token found:",
        token ? "YES" : "NO"
    );

    return token.trim();
}



/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(
    endpoint,
    options = {}
) {

    const token = getToken();

    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };

    /*
     * Only add Content-Type when a body exists.
     * GET requests don't need it.
     */
    if (options.body) {
        headers["Content-Type"] =
            "application/json";
    }

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    console.log(
        "API REQUEST:",
        `${API}${endpoint}`
    );

    console.log(
        "Authorization:",
        token
            ? "Bearer <TOKEN PRESENT>"
            : "NO TOKEN"
    );


    const response =
        await fetch(
            `${API}${endpoint}`,
            {
                ...options,
                headers
            }
        );


    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    let data = null;


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            data =
                await response.json();

        } catch (error) {

            data = null;

        }

    } else {

        try {

            data =
                await response.text();

        } catch (error) {

            data = null;

        }
    }


    console.log(
        "API STATUS:",
        response.status
    );


    if (!response.ok) {

        console.error(
            "API ERROR:",
            data
        );


        let message =
            `HTTP ${response.status}`;


        if (
            data &&
            typeof data === "object"
        ) {

            if (
                typeof data.detail ===
                "string"
            ) {

                message =
                    data.detail;

            } else if (
                data.detail
            ) {

                message =
                    JSON.stringify(
                        data.detail
                    );
            }

        }


        throw new Error(
            message
        );
    }


    return data;
}



/* ==========================================================
   SAFE TEXT
========================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value ?? "";
    }
}



/* ==========================================================
   FORMAT DATE
========================================================== */

function formatDate(
    dateString
) {

    if (!dateString) {
        return "-";
    }


    const date =
        new Date(dateString);


    if (Number.isNaN(
        date.getTime()
    )) {

        return dateString;
    }


    const datePart =
        date.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );


    const timePart =
        date.toLocaleTimeString(
            "en-US",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    return `
        ${datePart}
        <br>
        <small>${timePart}</small>
    `;
}



/* ==========================================================
   CATEGORY ICON
========================================================== */

function getNotificationIcon(
    notification
) {

    const category =
        (
            notification.category ||
            ""
        ).toLowerCase();


    if (
        category.includes("procurement")
    ) {

        return `
            <div class="notification-icon orange">
                <i class="fa-solid fa-cart-shopping"></i>
            </div>
        `;
    }


    if (
        category.includes("delivery")
    ) {

        return `
            <div class="notification-icon orange">
                <i class="fa-solid fa-truck"></i>
            </div>
        `;
    }


    if (
        category.includes("vendor")
    ) {

        return `
            <div class="notification-icon green">
                <i class="fa-solid fa-user-check"></i>
            </div>
        `;
    }


    if (
        category.includes("contract")
    ) {

        return `
            <div class="notification-icon purple">
                <i class="fa-regular fa-calendar"></i>
            </div>
        `;
    }


    if (
        category.includes("compliance")
    ) {

        return `
            <div class="notification-icon blue">
                <i class="fa-solid fa-shield-halved"></i>
            </div>
        `;
    }


    if (
        category.includes("sms")
    ) {

        return `
            <div class="notification-icon green">
                <i class="fa-regular fa-message"></i>
            </div>
        `;
    }


    return `
        <div class="notification-icon blue">
            <i class="fa-regular fa-envelope"></i>
        </div>
    `;
}



/* ==========================================================
   CATEGORY CLASS
========================================================== */

function getCategoryClass(
    category
) {

    const value =
        (
            category || ""
        ).toLowerCase();


    if (value.includes("delivery"))
        return "delivery";

    if (value.includes("vendor"))
        return "vendor";

    if (value.includes("contract"))
        return "contract";

    if (value.includes("compliance"))
        return "compliance";

    if (value.includes("email"))
        return "email";

    if (value.includes("sms"))
        return "sms";


    return "category";
}



/* ==========================================================
   PRIORITY CLASS
========================================================== */

function getPriorityClass(
    priority
) {

    const value =
        (
            priority || ""
        ).toLowerCase();


    if (value === "high")
        return "priority-high";

    if (value === "medium")
        return "priority-medium";


    return "priority-low";
}



/* ==========================================================
   CHANNEL ICONS
========================================================== */

function getChannelIcons(
    channel
) {

    const value =
        (
            channel || ""
        ).toLowerCase();


    let html = "";


    if (
        value.includes("email")
        ||
        value.includes("in-app")
        ||
        value.includes("all")
    ) {

        html += `
            <span class="channel-icon">
                <i class="fa-regular fa-envelope"></i>
            </span>
        `;
    }


    if (
        value.includes("sms")
        ||
        value.includes("all")
    ) {

        html += `
            <span class="channel-icon sms">
                <i class="fa-regular fa-message"></i>
            </span>
        `;
    }


    if (!html) {

        html = `
            <span class="channel-icon">
                <i class="fa-regular fa-bell"></i>
            </span>
        `;
    }


    return `
        <div class="channel-icons">
            ${html}
        </div>
    `;
}



/* ==========================================================
   RENDER TABLE
========================================================== */

function renderNotifications(
    notifications
) {

    const tbody =
        document.getElementById(
            "notificationTableBody"
        );


    if (!tbody) return;


    currentNotifications =
        notifications || [];


    if (
        currentNotifications.length === 0
    ) {

        tbody.innerHTML = `
            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:40px;
                    "
                >

                    <i
                        class="fa-regular fa-bell-slash"
                        style="
                            font-size:28px;
                            color:#9aa2bd;
                            display:block;
                            margin-bottom:10px;
                        "
                    ></i>

                    No notifications found.

                </td>

            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        currentNotifications
            .map(
                notification => {

                    const status =
                        notification.status ||
                        "Unread";


                    const statusClass =
                        status.toLowerCase() ===
                        "read"
                            ? "read"
                            : "unread";


                    return `
                        <tr>

                            <td>
                                <input
                                    type="checkbox"
                                    class="notification-checkbox"
                                    value="${notification.id}"
                                >
                            </td>


                            <td>

                                <div
                                    class="notification-cell"
                                >

                                    ${getNotificationIcon(
                                        notification
                                    )}

                                    <div
                                        class="notification-content"
                                    >

                                        <strong>
                                            ${escapeHtml(
                                                notification.title
                                            )}
                                        </strong>

                                        <small>
                                            ${escapeHtml(
                                                notification.message ||
                                                ""
                                            )}
                                        </small>

                                    </div>

                                </div>

                            </td>


                            <td>

                                <span
                                    class="
                                        badge
                                        ${getCategoryClass(
                                            notification.category
                                        )}
                                    "
                                >

                                    ${escapeHtml(
                                        notification.category
                                    )}

                                </span>

                            </td>


                            <td>

                                <span
                                    class="
                                        badge
                                        ${getPriorityClass(
                                            notification.priority
                                        )}
                                    "
                                >

                                    ${escapeHtml(
                                        notification.priority
                                    )}

                                </span>

                            </td>


                            <td>

                                ${getChannelIcons(
                                    notification.channel
                                )}

                            </td>


                            <td>

                                ${formatDate(
                                    notification.created_at
                                )}

                            </td>


                            <td>

                                <span
                                    class="
                                        status
                                        ${statusClass}
                                    "
                                >

                                    ${
                                        status ===
                                        "Read"
                                            ? "● Read"
                                            : "● Unread"
                                    }

                                </span>

                            </td>


                            <td>

                                <button
                                    class="action-btn"
                                    onclick="
                                        showNotificationActions(
                                            ${notification.id}
                                        )
                                    "
                                >

                                    <i
                                        class="fa-solid fa-ellipsis-vertical"
                                    ></i>

                                </button>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}



/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHtml(
    value
) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}



/* ==========================================================
   LOAD NOTIFICATIONS
========================================================== */

async function loadNotifications() {

    try {

        const search =
            document.getElementById(
                "notificationSearch"
            )?.value || "";


        const priority =
            document.getElementById(
                "filterPriority"
            )?.value || "All";


        const channel =
            document.getElementById(
                "filterChannel"
            )?.value || "All";


        const status =
            document.getElementById(
                "filterStatus"
            )?.value || "All";


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
            selectedCategory &&
            selectedCategory !== "All"
        ) {

            params.set(
                "category",
                selectedCategory
            );
        }


        if (
            priority !== "All"
        ) {

            params.set(
                "priority",
                priority
            );
        }


        if (
            channel !== "All"
        ) {

            params.set(
                "channel",
                channel
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


        const data =
            await apiFetch(
                `/api/notifications?${params.toString()}`
            );


        renderNotifications(
            data.items
        );


        renderPagination(
            data
        );


    } catch (error) {

        console.error(
            "Unable to load notifications:",
            error
        );


        showError(
            "Unable to load notifications. Check the FastAPI server."
        );
    }
}



/* ==========================================================
   LOAD STATISTICS
========================================================== */

async function loadNotificationStats() {

    try {

        const data =
            await apiFetch(
                "/api/notifications/statistics"
            );


        setText(
            "totalNotifications",
            data.total_notifications
        );


        setText(
            "unreadNotifications",
            data.unread_notifications
        );


        setText(
            "highPriorityAlerts",
            data.high_priority_alerts
        );


        setText(
            "emailSent",
            data.email_sent
        );


        setText(
            "smsSent",
            data.sms_sent
        );


        setText(
            "actionRequired",
            data.action_required
        );


        setText(
            "sidebarNotificationCount",
            data.unread_notifications
        );


        setText(
            "tabAllCount",
            data.total_notifications
        );


        updateChannelStats(
            data
        );


    } catch (error) {

        console.error(
            "Unable to load notification statistics:",
            error
        );
    }
}


/* ==========================================================
   QUICK ACTIONS
========================================================== */

function openNotificationSettings() {

    window.location.href =
        "/NotificationSettings";

}


function openEmailTemplates() {

    window.location.href =
        "/EmailTemplates";

}


function openSmsTemplates() {

    window.location.href =
        "/SMSTemplates";

}


function openNotificationLogs() {

    window.location.href =
        "/NotificationLogs";

}


/* ==========================================================
   REFRESH
========================================================== */

async function refreshNotificationPage() {

    const button =
        document.querySelector(
            ".refresh-btn"
        );

    if (button) {
        button.disabled = true;
    }


    try {

        await Promise.all([
            loadNotifications(),
            loadNotificationStats()
        ]);


        if (
            typeof loadCategoryCounts ===
            "function"
        ) {
            await loadCategoryCounts();
        }


    } finally {

        if (button) {
            button.disabled = false;
        }

    }

}


/* ==========================================================
   CHANNEL STATISTICS
========================================================== */

function updateChannelStats(
    data
) {

    const total =
        Number(
            data.total_notifications
        ) || 0;


    const email =
        Number(
            data.email_sent
        ) || 0;


    const sms =
        Number(
            data.sms_sent
        ) || 0;


    const inApp =
        Math.max(
            total - email - sms,
            0
        );


    setText(
        "emailChannelCount",
        `${email} (${percentage(email, total)}%)`
    );


    setText(
        "smsChannelCount",
        `${sms} (${percentage(sms, total)}%)`
    );


    setText(
        "inAppChannelCount",
        `${inApp} (${percentage(inApp, total)}%)`
    );


    const emailProgress =
        document.getElementById(
            "emailProgress"
        );


    const smsProgress =
        document.getElementById(
            "smsProgress"
        );


    const inAppProgress =
        document.getElementById(
            "inAppProgress"
        );


    if (emailProgress) {

        emailProgress.style.width =
            `${percentage(email, total)}%`;
    }


    if (smsProgress) {

        smsProgress.style.width =
            `${percentage(sms, total)}%`;
    }


    if (inAppProgress) {

        inAppProgress.style.width =
            `${percentage(inApp, total)}%`;
    }
}



/* ==========================================================
   PERCENTAGE
========================================================== */

function percentage(
    value,
    total
) {

    if (!total) return 0;

    return Math.round(
        (value / total) * 100
    );
}



/* ==========================================================
   PAGINATION
========================================================== */

function renderPagination(
    data
) {

    const info =
        document.getElementById(
            "paginationInfo"
        );


    const buttons =
        document.getElementById(
            "pageButtons"
        );


    if (!info || !buttons)
        return;


    const total =
        Number(data.total) || 0;


    const page =
        Number(data.page) || 1;


    const limit =
        Number(data.limit) || pageLimit;


    const totalPages =
        Number(data.total_pages) || 1;


    const start =
        total === 0
            ? 0
            : ((page - 1) * limit) + 1;


    const end =
        Math.min(
            page * limit,
            total
        );


    info.textContent =
        `Showing ${start} to ${end} of ${total} entries`;


    buttons.innerHTML = "";


    // Previous

    const previous =
        document.createElement(
            "button"
        );


    previous.innerHTML =
        `<i class="fa-solid fa-chevron-left"></i>`;


    previous.disabled =
        page <= 1;


    previous.onclick = () => {

        if (currentPage > 1) {

            currentPage--;

            loadNotifications();
        }
    };


    buttons.appendChild(
        previous
    );


    // Page numbers

    const maxVisible =
        5;


    let startPage =
        Math.max(
            1,
            page - 2
        );


    let endPage =
        Math.min(
            totalPages,
            startPage + maxVisible - 1
        );


    if (
        endPage - startPage + 1
        <
        maxVisible
    ) {

        startPage =
            Math.max(
                1,
                endPage - maxVisible + 1
            );
    }


    for (
        let i = startPage;
        i <= endPage;
        i++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.textContent = i;


        if (i === page) {

            button.classList.add(
                "active"
            );
        }


        button.onclick = () => {

            currentPage = i;

            loadNotifications();
        };


        buttons.appendChild(
            button
        );
    }


    // Next

    const next =
        document.createElement(
            "button"
        );


    next.innerHTML =
        `<i class="fa-solid fa-chevron-right"></i>`;


    next.disabled =
        page >= totalPages;


    next.onclick = () => {

        if (
            currentPage <
            totalPages
        ) {

            currentPage++;

            loadNotifications();
        }
    };


    buttons.appendChild(
        next
    );
}



/* ==========================================================
   MARK ONE AS READ
========================================================== */

async function markAsRead(
    notificationId
) {

    try {

        await apiFetch(
            `/api/notifications/${notificationId}/read`,
            {
                method: "PUT"
            }
        );


        await loadNotifications();

        await loadNotificationStats();


        if (
            typeof loadCategoryCounts ===
            "function"
        ) {

            await loadCategoryCounts();

        }


    } catch (error) {

        console.error(
            "Unable to mark notification as read:",
            error
        );

        alert(
            "Unable to mark notification as read."
        );

    }

}


/* ==========================================================
   MARK ALL AS READ
========================================================== */

async function markAllAsRead() {

    const confirmed = confirm(
        "Are you sure you want to mark all notifications as read?"
    );

    if (!confirmed) {
        return;
    }

    try {

        await apiFetch(
            "/api/notifications/read-all",
            {
                method: "PUT"
            }
        );

        /* Reload table */
        await loadNotifications();

        /* Reload statistics */
        await loadNotificationStats();

        /* Reload category counts */
        if (typeof loadCategoryCounts === "function") {
            await loadCategoryCounts();
        }

        alert(
            "All notifications have been marked as read."
        );

    } catch (error) {

        console.error(
            "Unable to mark all notifications as read:",
            error
        );

        alert(
            "Unable to mark all notifications as read."
        );

    }
}



/* ==========================================================
   NOTIFICATION ACTIONS
========================================================== */

async function showNotificationActions(
    notificationId
) {

    const notification =
        currentNotifications.find(
            item =>
                Number(item.id) ===
                Number(notificationId)
        );


    if (!notification) {
        return;
    }


    /* Already read */

    if (
        notification.status === "Read"
    ) {

        alert(
            "This notification is already marked as read."
        );

        return;
    }


    /* Unread */

    const confirmed = confirm(
        `Mark "${notification.title}" as read?`
    );


    if (!confirmed) {
        return;
    }


    await markAsRead(
        notificationId
    );

}



/* ==========================================================
   APPLY FILTERS
========================================================== */

function applyFilters() {

    const category =
        document.getElementById(
            "filterCategory"
        );

    const priority =
        document.getElementById(
            "filterPriority"
        );

    const channel =
        document.getElementById(
            "filterChannel"
        );

    const status =
        document.getElementById(
            "filterStatus"
        );

    selectedCategory =
        category?.value || "All";

    currentPage = 1;

    /* Synchronize category tabs */

    document
        .querySelectorAll(".category-tab")
        .forEach(tab => {

            const tabCategory =
                tab.dataset.category || "All";

            tab.classList.toggle(
                "active",
                tabCategory === selectedCategory
            );

        });

    loadNotifications();
}



/* ==========================================================
   RESET FILTERS
========================================================== */

function resetFilters() {

    const search =
        document.getElementById(
            "notificationSearch"
        );

    const category =
        document.getElementById(
            "filterCategory"
        );

    const priority =
        document.getElementById(
            "filterPriority"
        );

    const channel =
        document.getElementById(
            "filterChannel"
        );

    const status =
        document.getElementById(
            "filterStatus"
        );


    if (search) {
        search.value = "";
    }

    if (category) {
        category.value = "All";
    }

    if (priority) {
        priority.value = "All";
    }

    if (channel) {
        channel.value = "All";
    }

    if (status) {
        status.value = "All";
    }


    selectedCategory = "All";

    currentPage = 1;


    /* Activate All Notifications */

    document
        .querySelectorAll(".category-tab")
        .forEach(tab => {

            tab.classList.toggle(
                "active",
                tab.dataset.category === "All"
            );

        });


    loadNotifications();

}



/* ==========================================================
   CATEGORY TABS
========================================================== */

function setupCategoryTabs() {

    const tabs = document.querySelectorAll(".category-tab");

    if (!tabs.length) {
        return;
    }

    tabs.forEach(tab => {

        tab.addEventListener("click", async function () {

            /* Remove active from all tabs */
            tabs.forEach(item => { item.classList.remove("active"); });

            /* Add active to clicked tab */
            this.classList.add("active");

            /* Get selected category */
            selectedCategory = this.dataset.category || "All";

            /* Synchronize right-side category filter */
            const categorySelect = document.getElementById("filterCategory");

            if (categorySelect) {
                categorySelect.value = selectedCategory;
            }

            /* Go back to first page */
            currentPage = 1;

            /* Load filtered notifications */
            await loadNotifications();

        });

    });
}


/* ==========================================================
   CATEGORY COUNTS
========================================================== */

async function loadCategoryCounts() {

    try {

        const data = await apiFetch(
            "/api/notifications/category-counts"
        );

        setText(
            "tabAllCount",
            data.all || 0
        );

        setText(
            "tabProcurementCount",
            data.procurement_alerts || 0
        );

        setText(
            "tabDeliveryCount",
            data.delivery_delays || 0
        );

        setText(
            "tabVendorCount",
            data.vendor_approvals || 0
        );

        setText(
            "tabContractCount",
            data.contract_expiry || 0
        );

        setText(
            "tabComplianceCount",
            data.compliance || 0
        );

        setText(
            "tabEmailCount",
            data.email || 0
        );

        setText(
            "tabSmsCount",
            data.sms || 0
        );

    } catch (error) {

        console.error(
            "Unable to load category counts:",
            error
        );

    }

}


/* ==========================================================
   PAGE LIMIT
========================================================== */

function changePageLimit() {

    pageLimit =
        Number(
            document.getElementById(
                "pageLimit"
            ).value
        ) || 10;


    currentPage = 1;


    loadNotifications();
}



/* ==========================================================
   SEARCH DEBOUNCE
========================================================== */

let searchTimer;


function setupSearch() {

    const search =
        document.getElementById(
            "notificationSearch"
        );


    if (!search)
        return;


    search.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    () => {

                        currentPage = 1;

                        loadNotifications();

                    },
                    400
                );
        }
    );
}



/* ==========================================================
   ADMIN PROFILE
========================================================== */

async function loadAdminProfile() {

    try {

        const data =
            await apiFetch(
                "/adminprofile"
            );


        const user =
            data?.user ||
            data?.current_user ||
            data?.admin ||
            data ||
            {};


        const name =
            user.name ||
            user.full_name ||
            "Admin User";


        const email =
            user.email ||
            "admin@vendoriq.com";


        const role =
            user.role ||
            "Super Administrator";


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


    } catch (error) {

        console.error(
            "Unable to load admin profile:",
            error
        );

    }
}



/* ==========================================================
   SELECT ALL
========================================================== */

function setupSelectAll() {

    const selectAll =
        document.getElementById("selectAll");

    if (!selectAll) {
        return;
    }


    selectAll.addEventListener(
        "change",
        function () {

            const checkboxes =
                document.querySelectorAll(
                    ".notification-checkbox"
                );

            checkboxes.forEach(
                checkbox => {

                    checkbox.checked =
                        this.checked;

                }
            );

        }
    );

}



/* ==========================================================
   ERROR MESSAGE
========================================================== */

function showError(
    message
) {

    const tbody =
        document.getElementById(
            "notificationTableBody"
        );


    if (!tbody)
        return;


    tbody.innerHTML = `
        <tr>

            <td
                colspan="8"
                style="
                    text-align:center;
                    padding:35px;
                    color:#ef4444;
                "
            >

                <i
                    class="fa-solid fa-triangle-exclamation"
                    style="
                        font-size:25px;
                        display:block;
                        margin-bottom:10px;
                    "
                ></i>

                ${escapeHtml(message)}

            </td>

        </tr>
    `;
}



/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Notifications page initialized"
        );


        /* Category buttons */
        setupCategoryTabs();


        /* Search */
        setupSearch();


        /* Select all */
        setupSelectAll();


        /* Admin profile */
        await loadAdminProfile();


        /* Statistics */
        await loadNotificationStats();


        /* Notifications */
        await loadNotifications();


        /* Category counts */
        if (
            typeof loadCategoryCounts ===
            "function"
        ) {

            await loadCategoryCounts();

        }

    }
);