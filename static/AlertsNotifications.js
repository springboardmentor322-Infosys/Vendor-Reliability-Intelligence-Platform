const API_BASE = "http://127.0.0.1:8000";

const API = `${API_BASE}/api/alerts`;


// ============================================================
// AUTH TOKEN
// ============================================================

function getToken() {
    const token =
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        localStorage.getItem("authToken");

    console.log("JWT token found:", !!token);

    return token || "";
}


// ============================================================
// CURRENT USER
// ============================================================

function getUserId() {

    const value =
        sessionStorage.getItem("user_id");

    return value
        ? Number(value)
        : null;
}


// ============================================================
// FETCH HELPER
// ============================================================

async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        "Accept": "application/json",
        ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    console.log("=================================");
    console.log("API REQUEST:", url);
    console.log("TOKEN EXISTS:", !!token);
    console.log("AUTH HEADER:", token ? "Bearer ********" : "MISSING");
    console.log("=================================");

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {

        const errorText = await response.text();

        console.error("❌ 401 Unauthorized");
        console.error("URL:", url);
        console.error("Response:", errorText);
        console.error("Token exists:", !!token);

        throw new Error(
            "Authentication failed. JWT token is missing or invalid."
        );
    }

    if (!response.ok) {

        const errorText = await response.text();

        throw new Error(
            errorText ||
            `API request failed with status ${response.status}`
        );
    }

    return response.json();
}


// ============================================================
// LOAD DASHBOARD
// ============================================================

async function loadDashboard() {

    try {

        const userId =
            getUserId();

        let url =
            `${API}/dashboard`;

        if (userId) {

            url +=
                `?user_id=${userId}`;
        }

        const data =
            await apiFetch(url);

        if (!data) return;

        renderSummary(
            data.summary
        );

        renderCategories(
            data.categories
        );

        renderActivity(
            data.recent_activity
        );

        renderRules(
            data.alert_rules
        );

        renderAlerts(
            data.alerts
        );

        renderPreferences(
            data.notification_preferences
        );

    }
    catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        showError(
            "Unable to load alerts from server."
        );
    }
}


// ============================================================
// SUMMARY
// ============================================================

function renderSummary(summary) {

    document.getElementById(
        "criticalCount"
    ).textContent =
        summary.critical_alerts ?? 0;

    document.getElementById(
        "highCount"
    ).textContent =
        summary.high_priority ?? 0;

    document.getElementById(
        "infoCount"
    ).textContent =
        summary.informational ?? 0;

    document.getElementById(
        "resolvedCount"
    ).textContent =
        summary.resolved_today ?? 0;

    document.getElementById(
        "snoozedCount"
    ).textContent =
        summary.snoozed_alerts ?? 0;
}


// ============================================================
// ALERTS
// ============================================================

let allAlerts = [];


function renderAlerts(alerts) {

    allAlerts = alerts || [];

    applyAlertFilters();
}


function applyAlertFilters() {

    const search =
        document.getElementById(
            "alertSearch"
        ).value
        .trim()
        .toLowerCase();

    const category =
        document.getElementById(
            "categoryFilter"
        ).value;

    const priority =
        document.getElementById(
            "priorityFilter"
        ).value;

    let filtered =
        [...allAlerts];

    if (search) {

        filtered =
            filtered.filter(
                alert =>
                    `${alert.title} ${alert.message || ""} ${alert.reference_id || ""}`
                        .toLowerCase()
                        .includes(search)
            );
    }

    if (
        category &&
        category !== "All"
    ) {

        filtered =
            filtered.filter(
                alert =>
                    alert.category === category
            );
    }

    if (
        priority &&
        priority !== "All"
    ) {

        filtered =
            filtered.filter(
                alert =>
                    alert.priority === priority
            );
    }

    renderAlertRows(
        filtered
    );
}


function renderAlertRows(alerts) {

    const tbody =
        document.getElementById(
            "alertsTable"
        );

    tbody.innerHTML = "";

    if (!alerts.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7"
                    style="text-align:center;padding:25px">
                    No alerts found
                </td>
            </tr>
        `;

        return;
    }

    alerts.forEach(
        alert => {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `

                <td>

                    <div class="alert-title">
                        ${escapeHtml(alert.title)}
                    </div>

                    <span class="alert-message">
                        ${escapeHtml(alert.message || "")}
                    </span>

                </td>

                <td>
                    ${escapeHtml(alert.category || "-")}
                </td>

                <td>
                    ${escapeHtml(
                        alert.reference_id ||
                        alert.source ||
                        "-"
                    )}
                </td>

                <td>
                    ${priorityBadge(
                        alert.priority
                    )}
                </td>

                <td>
                    ${formatDateTime(
                        alert.created_at
                    )}
                </td>

                <td>
                    ${statusBadge(
                        alert.status
                    )}
                </td>

                <td>

                    <button
                        class="action-btn"
                        data-id="${alert.id}"
                        onclick="showAlertActions(${alert.id})"
                    >
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>

                </td>
            `;

            tbody.appendChild(tr);
        }
    );
}


// ============================================================
// PRIORITY BADGE
// ============================================================

function priorityBadge(priority) {

    let cls =
        "priority-info";

    if (priority === "Critical") {

        cls =
            "priority-critical";
    }
    else if (priority === "High") {

        cls =
            "priority-high";
    }

    return `
        <span class="priority ${cls}">
            ${escapeHtml(priority || "Medium")}
        </span>
    `;
}


// ============================================================
// STATUS BADGE
// ============================================================

function statusBadge(status) {

    let cls =
        "status-new";

    if (status === "In Progress") {

        cls =
            "status-progress";
    }
    else if (status === "Resolved") {

        cls =
            "status-resolved";
    }
    else if (status === "Snoozed") {

        cls =
            "status-snoozed";
    }

    return `
        <span class="status ${cls}">
            ${escapeHtml(status || "New")}
        </span>
    `;
}


// ============================================================
// ALERT ACTIONS
// ============================================================

async function showAlertActions(
    alertId
) {

    const choice =
        prompt(
            "Enter action:\n\n" +
            "1 = In Progress\n" +
            "2 = Resolve\n" +
            "3 = Snooze"
        );

    if (!choice) return;

    try {

        if (choice === "1") {

            await apiFetch(
                `${API}/${alertId}/progress`,
                {
                    method: "PATCH"
                }
            );
        }

        if (choice === "2") {

            const userId =
                getUserId();

            let url =
                `${API}/${alertId}/resolve`;

            if (userId) {

                url +=
                    `?user_id=${userId}`;
            }

            await apiFetch(
                url,
                {
                    method: "PATCH"
                }
            );
        }

        if (choice === "3") {

            await apiFetch(
                `${API}/${alertId}/snooze?minutes=60`,
                {
                    method: "PATCH"
                }
            );
        }

        await loadDashboard();

    }
    catch (error) {

        console.error(error);

        alert(
            "Unable to update alert."
        );
    }
}


// ============================================================
// CATEGORIES
// ============================================================

function renderCategories(
    categories
) {

    const list =
        document.getElementById(
            "categoryList"
        );

    const filter =
        document.getElementById(
            "categoryFilter"
        );

    list.innerHTML = "";

    filter.innerHTML = `
        <option value="All">
            All Categories
        </option>
    `;

    categories.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "category-item";

            div.innerHTML = `

                <div class="category-icon">
                    <i class="fa-solid fa-layer-group"></i>
                </div>

                <span class="category-name">
                    ${escapeHtml(item.category)}
                </span>

                <span class="category-count">
                    ${item.count}
                </span>
            `;

            list.appendChild(div);


            const option =
                document.createElement(
                    "option"
                );

            option.value =
                item.category;

            option.textContent =
                item.category;

            filter.appendChild(
                option
            );
        }
    );
}


// ============================================================
// ACTIVITY
// ============================================================

function renderActivity(
    activities
) {

    const list =
        document.getElementById(
            "activityList"
        );

    list.innerHTML = "";

    activities.forEach(
        activity => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "activity-item";

            div.innerHTML = `

                <div class="activity-icon">

                    <i class="fa-solid fa-circle-info"></i>

                </div>

                <div class="activity-content">

                    <strong>
                        ${escapeHtml(
                            activity.activity_type ||
                            "Activity"
                        )}
                    </strong>

                    <p>
                        ${escapeHtml(
                            activity.message || ""
                        )}
                    </p>

                </div>

                <span class="activity-time">
                    ${formatRelativeTime(
                        activity.created_at
                    )}
                </span>

            `;

            list.appendChild(div);
        }
    );
}


// ============================================================
// RULES
// ============================================================

function renderRules(
    rules
) {

    const tbody =
        document.getElementById(
            "rulesTable"
        );

    tbody.innerHTML = "";

    rules.forEach(
        rule => {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(rule.rule_name)}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(rule.category)}
                </td>

                <td>
                    ${escapeHtml(rule.condition)}
                </td>

                <td>
                    ${priorityBadge(rule.priority)}
                </td>

                <td>
                    ${statusBadge(rule.status)}
                </td>

                <td>
                    <button class="action-btn">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        }
    );
}


// ============================================================
// PREFERENCES
// ============================================================

function renderPreferences(
    settings
) {

    if (!settings) return;

    document.getElementById(
        "emailToggle"
    ).checked =
        Boolean(
            settings.email_enabled
        );

    document.getElementById(
        "smsToggle"
    ).checked =
        Boolean(
            settings.sms_enabled
        );

    document.getElementById(
        "browserToggle"
    ).checked =
        Boolean(
            settings.browser_notifications
        );

    document.getElementById(
        "soundToggle"
    ).checked =
        Boolean(
            settings.notification_sound
        );
}


// ============================================================
// SAVE PREFERENCES
// ============================================================

async function savePreferences() {

    const userId =
        getUserId();

    if (!userId) {

        console.warn(
            "No user_id found in localStorage."
        );

        return;
    }

    const payload = {

        email_enabled:
            document.getElementById(
                "emailToggle"
            ).checked,

        sms_enabled:
            document.getElementById(
                "smsToggle"
            ).checked,

        browser_notifications:
            document.getElementById(
                "browserToggle"
            ).checked,

        notification_sound:
            document.getElementById(
                "soundToggle"
            ).checked
    };

    try {

        await apiFetch(
            `${API}/settings/${userId}`,
            {
                method: "PUT",
                body: JSON.stringify(
                    payload
                )
            }
        );

    }
    catch (error) {

        console.error(
            "Settings update failed:",
            error
        );
    }
}


// ============================================================
// MARK ALL AS READ
// ============================================================

async function markAllAsRead() {

    try {

        await apiFetch(
            `${API}/notifications/read-all`,
            {
                method: "PATCH"
            }
        );

        await loadDashboard();

    }
    catch (error) {

        console.error(error);
    }
}


// ============================================================
// SEARCH
// ============================================================

document
    .getElementById("alertSearch")
    .addEventListener(
        "input",
        applyAlertFilters
    );

document
    .getElementById("categoryFilter")
    .addEventListener(
        "change",
        applyAlertFilters
    );

document
    .getElementById("priorityFilter")
    .addEventListener(
        "change",
        applyAlertFilters
    );


// ============================================================
// TABS
// ============================================================

document
    .querySelectorAll(".tab")
    .forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".tab")
                        .forEach(
                            t =>
                                t.classList.remove(
                                    "active"
                                )
                        );

                    tab.classList.add(
                        "active"
                    );

                    const priority =
                        tab.dataset.priority;

                    document.getElementById(
                        "priorityFilter"
                    ).value =
                        priority;

                    applyAlertFilters();
                }
            );
        }
    );


// ============================================================
// PREFERENCE EVENTS
// ============================================================

[
    "emailToggle",
    "smsToggle",
    "browserToggle",
    "soundToggle"
]
.forEach(
    id => {

        document
            .getElementById(id)
            .addEventListener(
                "change",
                savePreferences
            );
    }
);


// ============================================================
// MARK ALL
// ============================================================

document
    .getElementById("markAllBtn")
    .addEventListener(
        "click",
        markAllAsRead
    );


// ============================================================
// DATE / TIME
// ============================================================

function updateClock() {

    const now =
        new Date();

    document.getElementById(
        "currentDate"
    ).textContent =
        now.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );

    document.getElementById(
        "currentTime"
    ).textContent =
        now.toLocaleTimeString(
            "en-US",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}

setInterval(
    updateClock,
    1000
);

updateClock();


// ============================================================
// UTILITIES
// ============================================================

function formatDateTime(
    value
) {

    if (!value) return "-";

    const date =
        new Date(value);

    return date.toLocaleString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function formatRelativeTime(
    value
) {

    if (!value) return "";

    const date =
        new Date(value);

    const diff =
        Date.now() -
        date.getTime();

    const minutes =
        Math.floor(
            diff / 60000
        );

    if (minutes < 1)
        return "Just now";

    if (minutes < 60)
        return `${minutes}m ago`;

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24)
        return `${hours}h ago`;

    return `${Math.floor(hours / 24)}d ago`;
}


function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function showError(
    message
) {

    console.error(
        message
    );
}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


// ============================================================
// INITIAL LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

        // Refresh every 30 seconds.
        setInterval(
            loadDashboard,
            30000
        );
    }
);