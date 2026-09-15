const API_BASE = "http://127.0.0.1:8000";


// ============================================================
// AUTHENTICATED API FETCH
// ============================================================

function getAccessToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        null
    );
}


async function apiFetch(url, options = {}) {

    const token = getAccessToken();


    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };


    // Add Authorization header if token exists
    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }


    const response = await fetch(url, {
        ...options,
        headers: headers,
        credentials: "include"
    });


    // Handle unauthorized user
    if (response.status === 401) {

        console.warn(
            "Session expired or unauthorized."
        );

        // Optional redirect
        // window.location.href = "/login";
    }


    return response;
}


// ============================================================
// SET TEXT
// ============================================================

function setText(elementId, value) {

    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = value ?? "";
    }
}


// ============================================================
// LOAD CURRENT USER
// ============================================================

async function loadCurrentUser() {

    try {

        const response = await apiFetch(
            `${API_BASE}/api/auth/me`,
            {
                method: "GET"
            }
        );


        // ----------------------------------------------------
        // Not authenticated
        // ----------------------------------------------------

        if (response.status === 401) {

            console.warn("User is not authenticated.");

            setText("sidebarName", "User");
            setText("sidebarRole", "Finance Officer");

            setText("headerName", "User");
            setText("headerRole", "Finance Officer");

            return;
        }


        // ----------------------------------------------------
        // Other errors
        // ----------------------------------------------------

        if (!response.ok) {

            const errorText = await response.text();

            throw new Error(
                `HTTP ${response.status}: ${errorText}`
            );
        }


        // ----------------------------------------------------
        // User data
        // ----------------------------------------------------

        const user = await response.json();

        console.log("Current user:", user);


        const name =
            user.name ||
            user.full_name ||
            user.username ||
            user.email ||
            "User";


        const role =
            user.role ||
            user.user_role ||
            "Finance Officer";


        setText("sidebarName", name);
        setText("sidebarRole", role);

        setText("headerName", name);
        setText("headerRole", role);


    } catch (error) {

        console.error(
            "Unable to load current user:",
            error
        );

        setText("sidebarName", "User");
        setText("sidebarRole", "Finance Officer");

        setText("headerName", "User");
        setText("headerRole", "Finance Officer");
    }
}


// ============================================================
// LOAD APPROVAL ACTIVITY
// ============================================================

async function loadActivity() {

    const params = new URLSearchParams();


    const searchElement =
        document.getElementById("search");

    const typeElement =
        document.getElementById("activityType");

    const fromDateElement =
        document.getElementById("fromDate");

    const toDateElement =
        document.getElementById("toDate");


    const search =
        searchElement?.value.trim() || "";

    const type =
        typeElement?.value || "";

    const fromDate =
        fromDateElement?.value || "";

    const toDate =
        toDateElement?.value || "";


    if (search) {
        params.append("search", search);
    }

    if (type) {
        params.append("activity_type", type);
    }

    if (fromDate) {
        params.append("from_date", fromDate);
    }

    if (toDate) {
        params.append("to_date", toDate);
    }


    try {

        const queryString =
            params.toString();

        const url =
            `${API_BASE}/api/finance/approval-activity` +
            (queryString ? `?${queryString}` : "");


        console.log(
            "Loading activity from:",
            url
        );


        // Use apiFetch for consistent authentication
        const response = await apiFetch(
            url,
            {
                method: "GET"
            }
        );


        if (response.status === 401) {

            throw new Error(
                "Unauthorized. Please login again."
            );
        }


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `HTTP ${response.status}: ${errorText}`
            );
        }


        const data =
            await response.json();


        console.log(
            "Approval activity response:",
            data
        );


        // Support multiple API response formats
        const activities =
            Array.isArray(data)
                ? data
                : data.activities ||
                  data.data ||
                  [];


        renderActivity(activities);


    } catch (error) {

        console.error(
            "Activity loading error:",
            error
        );

        const activityList =
            document.getElementById(
                "activityList"
            );

        if (activityList) {

            activityList.innerHTML = `
                <div class="loading">
                    Unable to load approval activity.
                </div>
            `;
        }

        setText(
            "activityCount",
            "0 activities"
        );
    }
}


// ============================================================
// RENDER ACTIVITY
// ============================================================

function renderActivity(data) {

    const list =
        document.getElementById(
            "activityList"
        );

    if (!list) {
        return;
    }


    if (!Array.isArray(data)) {

        console.warn(
            "Invalid activity data:",
            data
        );

        data = [];
    }


    setText(
        "activityCount",
        `${data.length} ${data.length === 1 ? "activity" : "activities"}`
    );


    if (!data.length) {

        list.innerHTML = `
            <div class="loading">
                No approval activity found.
            </div>
        `;

        return;
    }


    list.innerHTML = data.map(activity => `

        <div class="activity">

            <div class="activity-icon">

                <i class="fa-solid ${getActivityIcon(
                    activity.activity_type
                )}"></i>

            </div>


            <div class="activity-content">

                <strong>
                    ${escapeHtml(
                        activity.title ||
                        activity.activity_type ||
                        "Approval Activity"
                    )}
                </strong>

                <p>
                    ${escapeHtml(
                        activity.description ||
                        ""
                    )}
                </p>

            </div>


            <div class="activity-time">

                ${formatDateTime(
                    activity.created_at
                )}

            </div>

        </div>

    `).join("");
}


// ============================================================
// ACTIVITY ICON
// ============================================================

function getActivityIcon(type) {

    switch (
        String(type || "").toLowerCase()
    ) {

        case "submitted":
            return "fa-paper-plane";

        case "approved":
            return "fa-circle-check";

        case "rejected":
            return "fa-circle-xmark";

        case "delegated":
            return "fa-users";

        case "pending":
            return "fa-hourglass-half";

        case "cancelled":
            return "fa-ban";

        default:
            return "fa-clock";
    }
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDateTime(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// FILTER EVENTS
// ============================================================

function initializeActivityFilters() {

    const search =
        document.getElementById("search");

    const activityType =
        document.getElementById("activityType");

    const fromDate =
        document.getElementById("fromDate");

    const toDate =
        document.getElementById("toDate");


    if (search) {

        let timeout;

        search.addEventListener(
            "input",
            () => {

                clearTimeout(timeout);

                timeout = setTimeout(
                    loadActivity,
                    400
                );
            }
        );
    }


    if (activityType) {
        activityType.addEventListener(
            "change",
            loadActivity
        );
    }


    if (fromDate) {
        fromDate.addEventListener(
            "change",
            loadActivity
        );
    }


    if (toDate) {
        toDate.addEventListener(
            "change",
            loadActivity
        );
    }
}


// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadCurrentUser();

        await loadActivity();

        initializeActivityFilters();
    }
);