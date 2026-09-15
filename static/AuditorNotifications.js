const API_BASE = "http://127.0.0.1:8000";


let currentTab = "All";

let currentPage = 1;

let pageSize = 10;

let totalPages = 1;

let categoryChart = null;

let searchTimer = null;


// ============================================================
// TOKEN
// ============================================================

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token")
    );

}


// ============================================================
// API FETCH
// ============================================================

async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (
        options.body &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(

        `${API_BASE}${url}`,

        {
            ...options,
            headers
        }

    );


    if (response.status === 401) {

        localStorage.removeItem("access_token");
        localStorage.removeItem("token");

        window.location.href = "/login";

        throw new Error("Session expired.");

    }


    const contentType =
        response.headers.get("content-type") || "";


    let data;


    if (
        contentType.includes("application/json")
    ) {

        data = await response.json();

    } else {

        const text = await response.text();

        throw new Error(
            text || "Server returned an invalid response."
        );

    }


    if (!response.ok) {

        throw new Error(
            data.detail ||
            data.message ||
            "Request failed."
        );

    }


    return data;

}


// ============================================================
// ICON
// ============================================================

function getNotificationIcon(category) {

    const value =
        (category || "").toLowerCase();


    if (value.includes("assignment")) {
        return {
            icon: "fa-clipboard-check",
            className: "icon-assignment"
        };
    }


    if (value.includes("issue")) {
        return {
            icon: "fa-triangle-exclamation",
            className: "icon-issue"
        };
    }


    if (value.includes("completion")) {
        return {
            icon: "fa-circle-check",
            className: "icon-completion"
        };
    }


    if (value.includes("document")) {
        return {
            icon: "fa-file-lines",
            className: "icon-document"
        };
    }


    if (value.includes("reminder")) {
        return {
            icon: "fa-bell",
            className: "icon-reminder"
        };
    }


    if (value.includes("mention")) {
        return {
            icon: "fa-user",
            className: "icon-mention"
        };
    }


    if (value.includes("compliance")) {
        return {
            icon: "fa-shield-halved",
            className: "icon-compliance"
        };
    }


    if (value.includes("report")) {
        return {
            icon: "fa-file-chart-column",
            className: "icon-report"
        };
    }


    if (value.includes("planning")) {
        return {
            icon: "fa-chart-line",
            className: "icon-planning"
        };
    }


    return {
        icon: "fa-bell",
        className: "icon-reminder"
    };

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    return new Intl.DateTimeFormat(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    ).format(date);

}


// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(dateString) {

    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    return new Intl.DateTimeFormat(
        "en-US",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)

        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ============================================================
// LOAD NOTIFICATIONS
// ============================================================

async function loadNotifications() {

    const list =
        document.getElementById(
            "notificationList"
        );


    list.innerHTML = `

        <div class="loading">

            <i class="fa-solid fa-spinner fa-spin"></i>

            Loading notifications...

        </div>

    `;


    try {

        const search =
            document
                .getElementById(
                    "notificationSearch"
                )
                .value
                .trim();


        let url =
            `/api/auditor/notifications?tab=${encodeURIComponent(currentTab)}&page=${currentPage}&limit=${pageSize}`;


        if (search) {

            url +=
                `&search=${encodeURIComponent(search)}`;

        }


        const data =
            await apiFetch(url);


        renderNotifications(
            data.items || []
        );


        const pagination =
            data.pagination || {};


        totalPages =
            pagination.total_pages || 1;


        renderPagination(
            pagination
        );


    } catch (error) {

        console.error(
            "Notification loading error:",
            error
        );


        list.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-circle-exclamation"></i>

                <p>
                    ${escapeHtml(error.message)}
                </p>

            </div>

        `;

    }

}


// ============================================================
// RENDER NOTIFICATIONS
// ============================================================

function renderNotifications(items) {

    const list =
        document.getElementById(
            "notificationList"
        );


    if (!items.length) {

        list.innerHTML = `

            <div class="empty-state">

                <i class="fa-regular fa-bell"></i>

                <h3 style="font-size: 14px; margin-top: 5px;">
                    No notifications found
                </h3>

                <p style="font-size: 11px; margin-top: 5px;">
                    There are no notifications in this category.
                </p>

            </div>

        `;

        return;

    }


    list.innerHTML =
        items
            .map(notification => {

                const icon =
                    getNotificationIcon(
                        notification.category
                    );


                const isUnread =
                    notification.status === "Unread";


                return `

                    <div
                        class="notification-item"
                        data-id="${notification.id}"
                    >

                        <div
                            class="${
                                isUnread
                                    ? "unread-dot"
                                    : "read-dot"
                            }"
                        ></div>


                        <div
                            class="notification-icon ${icon.className}"
                        >

                            <i
                                class="fa-solid ${icon.icon}"
                            ></i>

                        </div>


                        <div class="notification-content">

                            <h4>
                                ${escapeHtml(notification.title)}
                            </h4>

                            <p>
                                ${escapeHtml(notification.message)}
                            </p>

                            <div class="notification-date">

                                <i class="fa-regular fa-calendar"></i>

                                ${formatDate(notification.created_at)}

                                &nbsp;•&nbsp;

                                ${formatTime(notification.created_at)}

                            </div>

                        </div>


                        <span class="category-pill">

                            ${escapeHtml(
                                notification.category
                            )}

                        </span>


                        <span class="notification-time">

                            ${formatTime(
                                notification.created_at
                            )}

                        </span>


                        <button
                            class="more-btn"
                            onclick="markNotificationRead(${notification.id})"
                            title="Mark as read"
                        >

                            <i
                                class="fa-solid fa-ellipsis-vertical"
                            ></i>

                        </button>

                    </div>

                `;

            })
            .join("");

}


// ============================================================
// LOAD SUMMARY
// ============================================================

async function loadSummary() {

    try {

        const data =
            await apiFetch(
                "/api/auditor/notifications/summary"
            );


        document.getElementById(
            "summaryAll"
        ).textContent = data.all || 0;


        document.getElementById(
            "summaryUnread"
        ).textContent = data.unread || 0;


        document.getElementById(
            "summaryImportant"
        ).textContent = data.important || 0;


        document.getElementById(
            "summaryMentions"
        ).textContent = data.mentions || 0;


        document.getElementById(
            "unreadTabCount"
        ).textContent = data.unread || 0;


        document.getElementById(
            "sidebarUnreadCount"
        ).textContent = data.unread || 0;


        document.getElementById(
            "topUnreadCount"
        ).textContent = data.unread || 0;


    } catch (error) {

        console.error(
            "Summary error:",
            error
        );

    }

}


// ============================================================
// CATEGORY CHART
// ============================================================

async function loadCategoryChart() {

    try {

        const categories =
            await apiFetch(
                "/api/auditor/notifications/category-counts"
            );


        const labels =
            categories.map(
                item => item.category
            );


        const values =
            categories.map(
                item => item.count
            );


        const canvas =
            document.getElementById(
                "categoryChart"
            );


        if (categoryChart) {

            categoryChart.destroy();

        }


        categoryChart =
            new Chart(
                canvas,
                {
                    type: "doughnut",

                    data: {

                        labels,

                        datasets: [
                            {
                                data: values,

                                backgroundColor: [
                                    "#2962d8",
                                    "#ef4444",
                                    "#20a567",
                                    "#8b5bd5",
                                    "#4ba3c7",
                                    "#f2a73b",
                                    "#26a0a7",
                                    "#64748b",
                                    "#a855f7"
                                ],

                                borderWidth: 0
                            }
                        ]

                    },

                    options: {

                        cutout: "58%",

                        plugins: {

                            legend: {
                                display: false
                            }

                        }

                    }

                }
            );


        renderCategoryLegend(
            categories
        );


    } catch (error) {

        console.error(
            "Category chart error:",
            error
        );

    }

}


// ============================================================
// CATEGORY LEGEND
// ============================================================

function renderCategoryLegend(categories) {

    const legend =
        document.getElementById(
            "categoryLegend"
        );


    const colors = [

        "#2962d8",
        "#ef4444",
        "#20a567",
        "#8b5bd5",
        "#4ba3c7",
        "#f2a73b",
        "#26a0a7",
        "#64748b",
        "#a855f7"

    ];


    legend.innerHTML =
        categories
            .map((item, index) => `

                <div class="legend-item">

                    <div class="legend-left">

                        <span
                            class="legend-dot"
                            style="
                                background:
                                ${colors[index % colors.length]}
                            "
                        ></span>

                        <span>
                            ${escapeHtml(item.category)}
                        </span>

                    </div>

                    <strong>
                        ${item.count}
                    </strong>

                </div>

            `)
            .join("");

}


// ============================================================
// MARK SINGLE AS READ
// ============================================================

async function markNotificationRead(
    notificationId
) {

    try {

        await apiFetch(

            `/api/auditor/notifications/${notificationId}/read`,

            {
                method: "PUT"
            }

        );


        await refreshPageData();


    } catch (error) {

        console.error(
            "Mark read error:",
            error
        );

    }

}


// Make available to HTML onclick
window.markNotificationRead =
    markNotificationRead;


// ============================================================
// MARK ALL AS READ
// ============================================================

async function markAllAsRead() {

    try {

        await apiFetch(

            "/api/auditor/notifications/read-all",

            {
                method: "PUT"
            }

        );


        await refreshPageData();


    } catch (error) {

        alert(
            error.message
        );

    }

}


// ============================================================
// LOAD PREFERENCES
// ============================================================

async function loadPreferences() {

    try {

        const preferences =
            await apiFetch(
                "/api/auditor/notifications/preferences"
            );


        document.getElementById(
            "emailNotifications"
        ).checked =
            preferences.email_notifications;


        document.getElementById(
            "inAppNotifications"
        ).checked =
            preferences.in_app_notifications;


        document.getElementById(
            "smsNotifications"
        ).checked =
            preferences.sms_notifications;


        document.getElementById(
            "importantAlerts"
        ).checked =
            preferences.important_alerts;


        document.getElementById(
            "auditReminders"
        ).checked =
            preferences.audit_reminders;


    } catch (error) {

        console.error(
            "Preference loading error:",
            error
        );

    }

}


// ============================================================
// SAVE PREFERENCES
// ============================================================

async function savePreferences() {

    const payload = {

        email_notifications:
            document.getElementById(
                "emailNotifications"
            ).checked,


        in_app_notifications:
            document.getElementById(
                "inAppNotifications"
            ).checked,


        sms_notifications:
            document.getElementById(
                "smsNotifications"
            ).checked,


        important_alerts:
            document.getElementById(
                "importantAlerts"
            ).checked,


        audit_reminders:
            document.getElementById(
                "auditReminders"
            ).checked

    };


    try {

        await apiFetch(

            "/api/auditor/notifications/preferences",

            {
                method: "PUT",

                body:
                    JSON.stringify(payload)
            }

        );

    } catch (error) {

        console.error(
            "Preference save error:",
            error
        );

    }

}


// ============================================================
// PAGINATION
// ============================================================

function renderPagination(pagination) {

    const page =
        pagination.page || 1;


    const total =
        pagination.total || 0;


    const limit =
        pagination.limit || pageSize;


    const start =
        total === 0
            ? 0
            : ((page - 1) * limit) + 1;


    const end =
        Math.min(
            page * limit,
            total
        );


    document.getElementById(
        "paginationInfo"
    ).textContent =
        `Showing ${start} to ${end} of ${total} notifications`;


    const pageNumbers =
        document.getElementById(
            "pageNumbers"
        );


    pageNumbers.innerHTML = "";


    const maxVisible =
        Math.min(
            totalPages,
            5
        );


    for (
        let i = 1;
        i <= maxVisible;
        i++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "page-number" +
            (
                i === currentPage
                    ? " active"
                    : ""
            );


        button.textContent = i;


        button.addEventListener(
            "click",
            () => {

                currentPage = i;

                loadNotifications();

            }
        );


        pageNumbers.appendChild(
            button
        );

    }


    document.getElementById(
        "prevPage"
    ).disabled =
        currentPage <= 1;


    document.getElementById(
        "nextPage"
    ).disabled =
        currentPage >= totalPages;

}


// ============================================================
// USER PROFILE
// ============================================================

async function loadUserProfile() {

    try {

        const user =
            await apiFetch(
                "/api/auth/me"
            );


        document.getElementById(
            "sidebarUserName"
        ).textContent =
            user.name || "Auditor";


        document.getElementById(
            "sidebarUserRole"
        ).textContent =
            user.role || "Auditor";


        document.getElementById(
            "topUserName"
        ).textContent =
            user.name || "Auditor";


        document.getElementById(
            "topUserRole"
        ).textContent =
            user.role || "Auditor";


    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

    }

}


// ============================================================
// REFRESH
// ============================================================

async function refreshPageData() {

    await Promise.all([

        loadNotifications(),

        loadSummary(),

        loadCategoryChart()

    ]);

}


// ============================================================
// EVENTS
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {


        // Tabs

        document
            .querySelectorAll(
                ".tab-btn"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".tab-btn"
                            )
                            .forEach(
                                btn =>
                                    btn.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        currentTab =
                            button.dataset.tab;


                        currentPage = 1;


                        loadNotifications();

                    }
                );

            });


        // Filter panel

        document
            .getElementById(
                "filterBtn"
            )
            .addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "filterPanel"
                        )
                        .classList.toggle(
                            "show"
                        );

                }
            );


        // Apply filter

        document
            .getElementById(
                "applyFilterBtn"
            )
            .addEventListener(
                "click",
                () => {

                    currentPage = 1;

                    loadNotifications();

                }
            );


        // Mark all

        document
            .getElementById(
                "markAllReadBtn"
            )
            .addEventListener(
                "click",
                markAllAsRead
            );


        // Page size

        document
            .getElementById(
                "pageSize"
            )
            .addEventListener(
                "change",
                event => {

                    pageSize =
                        Number(
                            event.target.value
                        );


                    currentPage = 1;


                    loadNotifications();

                }
            );


        // Previous

        document
            .getElementById(
                "prevPage"
            )
            .addEventListener(
                "click",
                () => {

                    if (currentPage > 1) {

                        currentPage--;

                        loadNotifications();

                    }

                }
            );


        // Next

        document
            .getElementById(
                "nextPage"
            )
            .addEventListener(
                "click",
                () => {

                    if (
                        currentPage < totalPages
                    ) {

                        currentPage++;

                        loadNotifications();

                    }

                }
            );


        // Search

        document
            .getElementById(
                "notificationSearch"
            )
            .addEventListener(
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


        // Preferences

        const preferenceInputs = [

            "emailNotifications",

            "inAppNotifications",

            "smsNotifications",

            "importantAlerts",

            "auditReminders"

        ];


        preferenceInputs.forEach(id => {

            document
                .getElementById(id)
                .addEventListener(
                    "change",
                    savePreferences
                );

        });


        // Initial loading

        await Promise.all([

            loadUserProfile(),

            loadNotifications(),

            loadSummary(),

            loadCategoryChart(),

            loadPreferences()

        ]);

    }
);