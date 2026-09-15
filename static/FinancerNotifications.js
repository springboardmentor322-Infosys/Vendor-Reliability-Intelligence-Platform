"use strict";


/* ============================================================
   CONFIGURATION
============================================================ */

const API_BASE = "http://127.0.0.1:8000";

let categoryChart = null;

let dashboardData = null;


/* ============================================================
   AUTHENTICATION
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("finance_access_token") ||
        ""
    );
}


async function apiFetch(
    url,
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

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {

        console.error(
            "Authentication required."
        );

        return null;
    }

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const error =
                await response.json();

            message =
                error.detail ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


/* ============================================================
   USER PROFILE
============================================================ */

async function loadUserProfile() {

    try {

        const user =
            await apiFetch(
                "/api/finance/profile"
            );

        if (!user) {
            return;
        }

        setText(
            "sidebarUserName",
            user.name || "Finance Officer"
        );

        setText(
            "headerUserName",
            user.name || "Finance Officer"
        );

        setText(
            "sidebarUserRole",
            user.role || "Finance Officer"
        );

        setText(
            "headerUserRole",
            user.role || "Finance Officer"
        );

    } catch (error) {

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );
    }
}


/* ============================================================
   MAIN DATA
============================================================ */

async function loadDashboard() {

    const params =
        new URLSearchParams();

    const fromDate =
        document.getElementById(
            "fromDate"
        ).value;

    const toDate =
        document.getElementById(
            "toDate"
        ).value;

    const category =
        document.getElementById(
            "categoryFilter"
        ).value;

    const priority =
        document.getElementById(
            "priorityFilter"
        ).value;

    const search =
        document.getElementById(
            "globalSearch"
        ).value.trim();


    if (fromDate) {
        params.set(
            "from_date",
            fromDate
        );
    }

    if (toDate) {
        params.set(
            "to_date",
            toDate
        );
    }

    if (category !== "All") {
        params.set(
            "category",
            category
        );
    }

    if (priority !== "All") {
        params.set(
            "priority",
            priority
        );
    }

    if (search) {
        params.set(
            "search",
            search
        );
    }


    try {

        showLoadingState();

        const query =
            params.toString();

        dashboardData =
            await apiFetch(
                `/api/finance/alerts-notifications${
                    query
                        ? "?" + query
                        : ""
                }`
            );

        if (!dashboardData) {
            return;
        }

        renderSummary(
            dashboardData.summary
        );

        renderAlerts(
            dashboardData.alerts || []
        );

        renderNotifications(
            dashboardData.notifications || []
        );

        renderAnnouncements(
            dashboardData.announcements || []
        );

        renderCategoryChart(
            dashboardData.category_counts || {}
        );

        renderPreferences(
            dashboardData.preferences || {}
        );

        updateAttentionMessage(
            dashboardData.summary
        );

    } catch (error) {

        console.error(
            "DASHBOARD LOAD ERROR:",
            error
        );

        showError(
            "Unable to load Alerts & Notifications."
        );
    }
}


/* ============================================================
   SUMMARY
============================================================ */

function renderSummary(summary) {

    setText(
        "highPriority",
        summary.high_priority_alerts || 0
    );

    setText(
        "pendingNotifications",
        summary.pending_notifications || 0
    );

    setText(
        "resolvedToday",
        summary.resolved_today || 0
    );

    setText(
        "unreadMessages",
        summary.unread_messages || 0
    );

    setText(
        "systemAnnouncements",
        summary.system_announcements || 0
    );

    setText(
        "headerAlertCount",
        summary.pending_notifications || 0
    );

    setText(
        "notificationButton",
        ""
    );

    const badges =
        document.querySelectorAll(
            ".notification-count"
        );

    badges.forEach(
        badge =>
            badge.textContent =
                summary.pending_notifications || 0
    );
}


/* ============================================================
   ALERTS
============================================================ */

function renderAlerts(alerts) {

    const container =
        document.getElementById(
            "alertsList"
        );

    if (!alerts.length) {

        container.innerHTML = `
            <div class="loading">
                No alerts found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        alerts.map(
            alert => {

                const priority =
                    String(
                        alert.priority ||
                        "Low"
                    ).toLowerCase();

                const icon =
                    priority === "high"
                        ? "fa-triangle-exclamation"
                        : priority === "medium"
                            ? "fa-clock"
                            : "fa-circle-check";

                return `
                    <div
                        class="alert-row"
                        data-alert-id="${alert.id}"
                    >

                        <div
                            class="alert-icon ${priority}"
                        >
                            <i
                                class="fa-solid ${icon}"
                            ></i>
                        </div>

                        <div class="alert-details">

                            <div
                                class="alert-title-line"
                            >

                                <span
                                    class="alert-title"
                                >
                                    ${escapeHtml(
                                        alert.title
                                    )}
                                </span>

                                <span
                                    class="alert-time"
                                >
                                    ${formatRelativeTime(
                                        alert.created_at
                                    )}
                                </span>

                            </div>

                            <div
                                class="alert-message"
                            >
                                ${escapeHtml(
                                    alert.message
                                )}
                            </div>

                            <div
                                class="alert-tags"
                            >

                                <span
                                    class="priority-tag ${priority}"
                                >
                                    ${escapeHtml(
                                        alert.priority
                                    )}
                                </span>

                                <span
                                    class="category-tag"
                                >
                                    ${escapeHtml(
                                        alert.category
                                    )}
                                </span>

                            </div>

                        </div>

                        <span
                            class="alert-dot ${priority}"
                        ></span>

                    </div>
                `;
            }
        ).join("");


    container
        .querySelectorAll(
            ".alert-row"
        )
        .forEach(
            row => {

                row.addEventListener(
                    "click",
                    () => {

                        const id =
                            row.dataset.alertId;

                        const alert =
                            alerts.find(
                                item =>
                                    String(item.id) ===
                                    String(id)
                            );

                        if (alert) {
                            openAlertModal(
                                alert
                            );
                        }

                    }
                );

            }
        );
}


/* ============================================================
   NOTIFICATIONS
============================================================ */

function renderNotifications(
    notifications
) {

    const container =
        document.getElementById(
            "recentNotifications"
        );

    if (!notifications.length) {

        container.innerHTML = `
            <div class="loading">
                No notifications found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        notifications
            .slice(0, 5)
            .map(
                notification => {

                    const icon =
                        getNotificationIcon(
                            notification
                        );

                    return `
                        <div
                            class="simple-row"
                            data-notification-id="${notification.id}"
                        >

                            <div class="simple-icon">
                                <i
                                    class="fa-solid ${icon}"
                                ></i>
                            </div>

                            <div class="simple-body">

                                <strong>
                                    ${escapeHtml(
                                        notification.title
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        notification.message
                                    )}
                                </span>

                            </div>

                            <span
                                class="simple-time"
                            >
                                ${formatRelativeTime(
                                    notification.created_at
                                )}
                            </span>

                        </div>
                    `;
                }
            )
            .join("");


    container
        .querySelectorAll(
            ".simple-row"
        )
        .forEach(
            row => {

                row.addEventListener(
                    "click",
                    () => {

                        const id =
                            row.dataset.notificationId;

                        const item =
                            notifications.find(
                                notification =>
                                    String(
                                        notification.id
                                    ) === String(id)
                            );

                        if (item) {
                            openNotificationModal(
                                item
                            );
                        }
                    }
                );
            }
        );
}


/* ============================================================
   ANNOUNCEMENTS
============================================================ */

function renderAnnouncements(
    announcements
) {

    const container =
        document.getElementById(
            "announcementsList"
        );

    if (!announcements.length) {

        container.innerHTML = `
            <div class="loading">
                No system announcements.
            </div>
        `;

        return;
    }


    container.innerHTML =
        announcements
            .slice(0, 3)
            .map(
                announcement => {

                    return `
                        <div
                            class="simple-row"
                        >

                            <div class="simple-icon">
                                <i
                                    class="fa-solid fa-bullhorn"
                                ></i>
                            </div>

                            <div class="simple-body">

                                <strong>
                                    ${escapeHtml(
                                        announcement.title
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        announcement.message
                                    )}
                                </span>

                            </div>

                            <span
                                class="simple-time"
                            >
                                ${formatDate(
                                    announcement.published_at
                                )}
                            </span>

                        </div>
                    `;
                }
            )
            .join("");
}


/* ============================================================
   CATEGORY CHART
============================================================ */

function renderCategoryChart(
    categoryCounts
) {

    const labels = [
        "Budget Alerts",
        "Payment Alerts",
        "Approval Alerts",
        "Compliance Alerts",
        "System Alerts",
        "Others"
    ];

    const values =
        labels.map(
            label =>
                Number(
                    categoryCounts[label] || 0
                )
        );

    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );

    setText(
        "chartTotal",
        total
    );


    const legend =
        document.getElementById(
            "categoryLegend"
        );

    legend.innerHTML =
        labels.map(
            (label, index) => {

                return `
                    <div
                        class="legend-item"
                    >

                        <span
                            class="legend-color"
                            style="
                                background:
                                ${getChartColor(index)}
                            "
                        ></span>

                        <span>
                            ${label}
                        </span>

                        <span
                            class="legend-value"
                        >
                            ${values[index]}
                        </span>

                    </div>
                `;
            }
        ).join("");


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

                            borderWidth: 2,

                            borderColor:
                                "#ffffff"
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "65%",

                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        );
}


/* ============================================================
   PREFERENCES
============================================================ */

function renderPreferences(
    preferences
) {

    const container =
        document.getElementById(
            "preferencesList"
        );

    const items = [

        {
            key: "budget_alerts",
            title: "Budget Alerts",
            description:
                "Alerts for budget usage and limits",
            icon: "fa-calculator",
            color: "red"
        },

        {
            key: "payment_alerts",
            title: "Payment Alerts",
            description:
                "Payment due reminders",
            icon: "fa-clock",
            color: "orange"
        },

        {
            key: "approval_alerts",
            title: "Approval Alerts",
            description:
                "Request approval notifications",
            icon: "fa-file-invoice",
            color: "blue"
        },

        {
            key: "compliance_alerts",
            title: "Compliance Alerts",
            description:
                "Compliance and policy alerts",
            icon: "fa-clipboard-check",
            color: "green"
        },

        {
            key: "system_notifications",
            title: "System Notifications",
            description:
                "System updates and maintenance",
            icon: "fa-bullhorn",
            color: "purple"
        },

        {
            key: "email_notifications",
            title: "Email Notifications",
            description:
                "Receive alerts via email",
            icon: "fa-envelope",
            color: "email"
        },

        {
            key: "sms_notifications",
            title: "SMS Notifications",
            description:
                "Receive alerts via SMS",
            icon: "fa-mobile-screen",
            color: "sms"
        }

    ];


    container.innerHTML =
        items.map(
            item => {

                const enabled =
                    Boolean(
                        preferences[item.key]
                    );

                return `
                    <div
                        class="preference-row"
                    >

                        <div
                            class="preference-icon ${item.color}"
                        >
                            <i
                                class="fa-solid ${item.icon}"
                            ></i>
                        </div>

                        <div
                            class="preference-info"
                        >

                            <strong>
                                ${item.title}
                            </strong>

                            <span>
                                ${item.description}
                            </span>

                        </div>

                        <button
                            class="
                                switch
                                ${enabled ? "on" : ""}
                            "
                            data-preference="${item.key}"
                            aria-label="${item.title}"
                        ></button>

                    </div>
                `;
            }
        ).join("");


    container
        .querySelectorAll(
            ".switch"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        togglePreference(
                            button.dataset.preference,
                            !button.classList.contains(
                                "on"
                            )
                        )
                );

            }
        );
}


/* ============================================================
   UPDATE PREFERENCE
============================================================ */

async function togglePreference(
    key,
    value
) {

    try {

        const preferences =
            await apiFetch(
                "/api/finance/notification-preferences"
            );

        if (!preferences) {
            return;
        }

        preferences[key] =
            value;


        const updated =
            await apiFetch(
                "/api/finance/notification-preferences",
                {
                    method: "PUT",
                    body: JSON.stringify(
                        {
                            budget_alerts:
                                preferences.budget_alerts,

                            payment_alerts:
                                preferences.payment_alerts,

                            approval_alerts:
                                preferences.approval_alerts,

                            compliance_alerts:
                                preferences.compliance_alerts,

                            system_notifications:
                                preferences.system_notifications,

                            email_notifications:
                                preferences.email_notifications,

                            sms_notifications:
                                preferences.sms_notifications
                        }
                    )
                }
            );

        renderPreferences(
            updated
        );

    } catch (error) {

        console.error(
            "Preference update error:",
            error
        );

        alert(
            "Unable to update notification preference."
        );
    }
}


/* ============================================================
   MARK ALL READ
============================================================ */

async function markAllRead() {

    try {

        await apiFetch(
            "/api/finance/notifications/read-all",
            {
                method: "PUT"
            }
        );

        await loadDashboard();

    } catch (error) {

        console.error(
            "Mark all read error:",
            error
        );
    }
}


/* ============================================================
   MODAL
============================================================ */

function openNotificationModal(
    notification
) {

    setText(
        "modalTitle",
        notification.title
    );

    setText(
        "modalMessage",
        notification.message || ""
    );

    setText(
        "modalMeta",
        `${notification.category || ""} • ${
            notification.priority || ""
        } • ${
            formatDate(
                notification.created_at
            )
        }`
    );

    const action =
        document.getElementById(
            "modalAction"
        );

    action.onclick =
        async () => {

            await apiFetch(
                `/api/finance/notifications/${
                    notification.id
                }/read`,
                {
                    method: "PUT"
                }
            );

            closeModal();

            await loadDashboard();
        };

    document
        .getElementById(
            "notificationModal"
        )
        .classList.add("show");
}


function openAlertModal(
    alert
) {

    setText(
        "modalTitle",
        alert.title
    );

    setText(
        "modalMessage",
        alert.message || ""
    );

    setText(
        "modalMeta",
        `${alert.category || ""} • ${
            alert.priority || ""
        } • ${
            formatDate(
                alert.created_at
            )
        }`
    );

    document
        .getElementById(
            "modalAction"
        )
        .style.display =
            "none";

    document
        .getElementById(
            "notificationModal"
        )
        .classList.add("show");
}


function closeModal() {

    document
        .getElementById(
            "notificationModal"
        )
        .classList.remove("show");

    document
        .getElementById(
            "modalAction"
        )
        .style.display =
            "";
}


/* ============================================================
   ATTENTION MESSAGE
============================================================ */

function updateAttentionMessage(
    summary
) {

    const count =
        Number(
            summary.high_priority_alerts || 0
        );

    const message =
        count > 0
            ? `You have ${count} high priority alerts that need immediate attention.`
            : "You have no high priority alerts requiring immediate attention.";

    setText(
        "attentionMessage",
        message
    );
}


/* ============================================================
   HELPERS
============================================================ */

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


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(
    value
) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    )) {
        return value;
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatRelativeTime(
    value
) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    )) {
        return "";
    }

    const seconds =
        Math.floor(
            (
                Date.now() -
                date.getTime()
            ) / 1000
        );

    if (seconds < 60) {
        return `${seconds} sec ago`;
    }

    const minutes =
        Math.floor(
            seconds / 60
        );

    if (minutes < 60) {
        return `${minutes} min ago`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {
        return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const days =
        Math.floor(
            hours / 24
        );

    return `${days} day${days === 1 ? "" : "s"} ago`;
}


function getNotificationIcon(
    notification
) {

    const text =
        `${notification.notification_type || ""} ${
            notification.category || ""
        }`.toLowerCase();

    if (
        text.includes("payment") ||
        text.includes("invoice")
    ) {
        return "fa-clock";
    }

    if (
        text.includes("approval")
    ) {
        return "fa-circle-check";
    }

    if (
        text.includes("document")
    ) {
        return "fa-file";
    }

    if (
        text.includes("system")
    ) {
        return "fa-bullhorn";
    }

    return "fa-bell";
}


function getChartColor(index) {

    const colors = [
        "#0968e8",
        "#ff9800",
        "#0ba95a",
        "#7437d9",
        "#296de0",
        "#aeb8c8"
    ];

    return colors[index] ||
        colors[0];
}


function showLoadingState() {

    const alerts =
        document.getElementById(
            "alertsList"
        );

    if (alerts) {

        alerts.innerHTML = `
            <div class="loading">
                Loading alerts...
            </div>
        `;
    }
}


function showError(message) {

    const alerts =
        document.getElementById(
            "alertsList"
        );

    if (alerts) {

        alerts.innerHTML = `
            <div
                class="loading"
                style="color:#e92734"
            >
                ${escapeHtml(message)}
            </div>
        `;
    }
}


/* ============================================================
   EVENTS
============================================================ */

function setupEvents() {

    document
        .getElementById(
            "categoryFilter"
        )
        .addEventListener(
            "change",
            loadDashboard
        );

    document
        .getElementById(
            "priorityFilter"
        )
        .addEventListener(
            "change",
            loadDashboard
        );

    document
        .getElementById(
            "applyDateFilter"
        )
        .addEventListener(
            "click",
            loadDashboard
        );

    document
        .getElementById(
            "globalSearch"
        )
        .addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {
                    loadDashboard();
                }
            }
        );

    document
        .getElementById(
            "markAllRead"
        )
        .addEventListener(
            "click",
            markAllRead
        );

    document
        .getElementById(
            "viewHighPriority"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "priorityFilter"
                    )
                    .value =
                        "High";

                loadDashboard();
            }
        );

    document
        .getElementById(
            "modalClose"
        )
        .addEventListener(
            "click",
            closeModal
        );

    document
        .getElementById(
            "notificationModal"
        )
        .addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "notificationModal"
                ) {
                    closeModal();
                }
            }
        );

    document
        .getElementById(
            "settingsButton"
        )
        .addEventListener(
            "click",
            () => {
                window.location.href =
                    "/FinancerSettings";
            }
        );

    document
        .getElementById(
            "manageSettings"
        )
        .addEventListener(
            "click",
            () => {
                window.location.href =
                    "/FinancerSettings";
            }
        );
}


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEvents();

        await loadUserProfile();

        await loadDashboard();

        setInterval(
            loadDashboard,
            60000
        );
    }
);