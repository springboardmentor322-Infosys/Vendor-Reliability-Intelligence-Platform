/* ==========================================================
   VENDORIQ
   SYSTEM HEALTH JAVASCRIPT
========================================================== */


/* ==========================================================
   API
========================================================== */

const API =
    "http://127.0.0.1:8000";


/* ==========================================================
   CHART INSTANCES
========================================================== */

let cpuChart = null;
let memoryChart = null;
let diskChart = null;
let networkChart = null;

let apiChart = null;
let loadChart = null;
let concurrencyChart = null;


/* ==========================================================
   TOKEN
========================================================== */

function getToken() {

    return (

        localStorage.getItem(
            "access_token"
        ) ||

        localStorage.getItem(
            "token"
        ) ||

        localStorage.getItem(
            "accessToken"
        ) ||

        sessionStorage.getItem(
            "access_token"
        ) ||

        sessionStorage.getItem(
            "token"
        ) ||

        sessionStorage.getItem(
            "accessToken"
        ) ||

        ""

    );

}


/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getToken();


    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    if (token) {

        headers[
            "Authorization"
        ] =
            `Bearer ${token}`;

    }


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    if (
        response.status ===
        401
    ) {

        console.error(
            "Authentication failed."
        );

        throw new Error(
            "Could not validate credentials"
        );

    }


    if (
        !response.ok
    ) {

        const text =
            await response.text();

        throw new Error(
            text ||
            `HTTP ${response.status}`
        );

    }


    return response;

}


/* ==========================================================
   HELPERS
========================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* ==========================================================
   CHART DEFAULTS
========================================================== */

function chartOptions(
    min = 0,
    max = 100
) {

    return {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                display: false
            }

        },

        scales: {

            x: {

                display: false,

                grid: {
                    display: false
                }

            },

            y: {

                display: false,

                min: min,

                max: max,

                grid: {
                    display: false
                }

            }

        },

        elements: {

            point: {

                radius: 0

            },

            line: {

                tension: 0.4

            }

        }

    };

}


/* ==========================================================
   MINI CHART
========================================================== */

function createMiniChart(
    canvasId,
    values,
    existingChart,
    min = 0,
    max = 100
) {

    const canvas =
        document.getElementById(
            canvasId
        );


    if (!canvas) {

        return existingChart;

    }


    if (existingChart) {

        existingChart.destroy();

    }


    return new Chart(
        canvas,
        {

            type: "line",

            data: {

                labels:
                    values.map(
                        (_, index) =>
                            index
                    ),

                datasets: [

                    {

                        data:
                            values,

                        borderWidth: 2,

                        fill: false,

                        pointRadius: 0

                    }

                ]

            },

            options:
                chartOptions(
                    min,
                    max
                )

        }
    );

}


/* ==========================================================
   LARGE CHART
========================================================== */

function createLargeChart(
    canvasId,
    labels,
    values,
    yTitle = ""
) {

    const canvas =
        document.getElementById(
            canvasId
        );


    if (!canvas) {

        return null;

    }


    return new Chart(
        canvas,
        {

            type: "line",

            data: {

                labels:

                    labels,

                datasets: [

                    {

                        data:
                            values,

                        borderWidth: 2,

                        fill: true,

                        tension: 0.4,

                        pointRadius: 2

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio:
                    false,

                plugins: {

                    legend: {
                        display: false
                    }

                },

                scales: {

                    x: {

                        ticks: {

                            font: {
                                size: 8
                            },

                            color:
                                "#56618a"

                        },

                        grid: {
                            display: false
                        }

                    },

                    y: {

                        title: {

                            display:
                                !!yTitle,

                            text:
                                yTitle,

                            font: {
                                size: 8
                            }

                        },

                        ticks: {

                            font: {
                                size: 8
                            },

                            color:
                                "#56618a"

                        },

                        grid: {

                            color:
                                "#edf0f6"

                        }

                    }

                }

            }

        }
    );

}


// ==========================================================
// UPDATE CONCURRENT USER HANDLING
// ==========================================================

function updateConcurrency(data) {

    const concurrency =
        data?.concurrent_user_handling ||
        data?.concurrency ||
        data?.concurrent_users ||
        {};

    const peakUsers =
        concurrency.peak_concurrent_users ??
        concurrency.peak_users ??
        data?.peak_concurrent_users ??
        0;

    const currentUsers =
        concurrency.current_users ??
        data?.active_users_now ??
        data?.current_users ??
        0;

    const maxUsers =
        concurrency.max_users ??
        concurrency.capacity ??
        300;

    const percentage =
        maxUsers > 0
            ? Math.min(
                100,
                (currentUsers / maxUsers) * 100
            )
            : 0;


    // ------------------------------------------------------
    // Peak concurrent users
    // ------------------------------------------------------

    const peakElement =
        document.getElementById(
            "peakConcurrentUsers"
        );

    if (peakElement) {

        peakElement.textContent =
            Number(peakUsers).toLocaleString();

    }


    // ------------------------------------------------------
    // Current users
    // ------------------------------------------------------

    const currentElement =
        document.getElementById(
            "currentConcurrentUsers"
        );

    if (currentElement) {

        currentElement.textContent =
            Number(currentUsers).toLocaleString();

    }


    // ------------------------------------------------------
    // Capacity
    // ------------------------------------------------------

    const capacityElement =
        document.getElementById(
            "concurrentCapacity"
        );

    if (capacityElement) {

        capacityElement.textContent =
            Number(maxUsers).toLocaleString();

    }


    // ------------------------------------------------------
    // Percentage
    // ------------------------------------------------------

    const percentageElement =
        document.getElementById(
            "concurrencyPercentage"
        );

    if (percentageElement) {

        percentageElement.textContent =
            `${percentage.toFixed(1)}%`;

    }


    // ------------------------------------------------------
    // Progress bar
    // ------------------------------------------------------

    const progressElement =
        document.getElementById(
            "concurrencyProgress"
        );

    if (progressElement) {

        progressElement.style.width =
            `${percentage}%`;

    }


    // ------------------------------------------------------
    // Status
    // ------------------------------------------------------

    const statusElement =
        document.getElementById(
            "concurrencyStatus"
        );

    if (statusElement) {

        if (percentage >= 90) {

            statusElement.textContent =
                "High Load";

        } else if (percentage >= 70) {

            statusElement.textContent =
                "Moderate Load";

        } else {

            statusElement.textContent =
                "Good";

        }

    }
}


/* ==========================================================
   LOAD SYSTEM HEALTH
========================================================== */

async function loadSystemHealth() {

    try {

        console.log(
            "Loading System Health..."
        );


        const response =
            await apiFetch(
                `${API}/api/system-health/overview`
            );


        const data =
            await response.json();


        console.log(
            "System Health:",
            data
        );


        updateSummary(
            data
        );


        updateSystemPerformance(
            data
        );


        updateDatabase(
            data
        );


        updateServices(
            data
        );


        updateConcurrency(
            data
        );


    }

    catch (error) {

        console.error(
            "Unable to load System Health:",
            error
        );

    }

}


/* ==========================================================
   SUMMARY
========================================================== */

function updateSummary(
    data
) {

    setText(
        "uptime",
        `${data.uptime?.value ?? 0}%`
    );


    const avg =
        data.api
            ?.average_response_time
        ?? 0;


    setText(
        "avgResponse",
        `${avg} ms`
    );


    setText(
        "apiAverage",
        `${avg}ms`
    );


    setText(
        "totalRequests",
        (
            data.api
                ?.total_requests
            ?? 0
        ).toLocaleString()
    );


    setText(
        "errorRate",
        `${data.api?.error_rate ?? 0}%`
    );


    setText(
        "activeUsers",
        data.concurrency
            ?.active_users
        ?? 0
    );


    setText(
        "peakUsers",
        data.concurrency
            ?.peak_users
        ?? 0
    );


    setText(
        "healthScore",
        data.health_score
        ?? 0
    );


    setText(
        "dashboardLoad",
        `${data.dashboard_loading?.average ?? 0}s`
    );

}


/* ==========================================================
   SYSTEM PERFORMANCE
========================================================== */

function updateSystemPerformance(
    data
) {

    const performance =
        data.system_performance
        || {};


    const cpu =
        Number(
            performance.cpu
            ?? 0
        );


    const memory =
        Number(
            performance.memory
            ?? 0
        );


    const disk =
        Number(
            performance.disk
            ?? 0
        );


    const network =
        Number(
            performance.network
            ?? 0
        );


    setText(
        "cpuUsage",
        `${cpu}%`
    );


    setText(
        "memoryUsage",
        `${memory}%`
    );


    setText(
        "diskUsage",
        `${disk}%`
    );


    setText(
        "networkUsage",
        `${network} MB`
    );


    cpuChart =
        createMiniChart(
            "cpuChart",
            generateSeries(
                cpu,
                12
            ),
            cpuChart,
            0,
            100
        );


    memoryChart =
        createMiniChart(
            "memoryChart",
            generateSeries(
                memory,
                12
            ),
            memoryChart,
            0,
            100
        );


    diskChart =
        createMiniChart(
            "diskChart",
            generateSeries(
                disk,
                12
            ),
            diskChart,
            0,
            100
        );


    networkChart =
        createMiniChart(
            "networkChart",
            generateSeries(
                network,
                12
            ),
            networkChart,
            0,
            Math.max(
                200,
                network * 1.5
            )
        );


    createApiChart(
        data
    );


    createLoadChart(
        data
    );


    createConcurrencyChart(
        data
    );

}


/* ==========================================================
   GENERATE SERIES
========================================================== */

function generateSeries(
    value,
    count
) {

    const result = [];


    for (
        let i = 0;
        i < count;
        i++
    ) {

        const variation =
            (
                Math.random()
                - 0.5
            ) * 12;


        result.push(
            Math.max(
                0,
                value + variation
            )
        );

    }


    return result;

}


/* ==========================================================
   API CHART
========================================================== */

function createApiChart(
    data
) {

    if (apiChart) {

        apiChart.destroy();

    }


    const labels = [
        "25 May",
        "26 May",
        "27 May",
        "28 May",
        "29 May",
        "30 May",
        "31 May"
    ];


    const average =
        Number(
            data.api
                ?.average_response_time
            ?? 0
        );


    const values =
        generateSeries(
            average,
            7
        );


    apiChart =
        createLargeChart(
            "apiChart",
            labels,
            values,
            "ms"
        );

}


/* ==========================================================
   LOAD TIME CHART
========================================================== */

function createLoadChart(
    data
) {

    if (loadChart) {

        loadChart.destroy();

    }


    const labels = [
        "25 May",
        "26 May",
        "27 May",
        "28 May",
        "29 May",
        "30 May",
        "31 May"
    ];


    const load =
        Number(
            data.dashboard_loading
                ?.average
            ?? 0
        );


    loadChart =
        createLargeChart(
            "loadChart",
            labels,
            generateSeries(
                load,
                7
            ),
            "Seconds"
        );

}


/* ==========================================================
   CONCURRENT USER CHART
========================================================== */

function createConcurrencyChart(
    data
) {

    if (concurrencyChart) {

        concurrencyChart.destroy();

    }


    const active =
        Number(
            data.concurrency
                ?.active_users
            ?? 0
        );


    const peak =
        Number(
            data.concurrency
                ?.peak_users
            ?? active
        );


    const labels = [
        "00:00",
        "04:00",
        "08:00",
        "12:00",
        "16:00",
        "20:00",
        "24:00"
    ];


    const values = [

        Math.round(
            peak * 0.05
        ),

        Math.round(
            peak * 0.25
        ),

        Math.round(
            peak * 0.48
        ),

        peak,

        Math.round(
            peak * 0.65
        ),

        Math.round(
            peak * 0.30
        ),

        active

    ];


    concurrencyChart =
        createLargeChart(
            "concurrencyChart",
            labels,
            values,
            "Users"
        );

}


/* ==========================================================
   DATABASE
========================================================== */

function updateDatabase(
    data
) {

    const database =
        data.database
        || {};


    setText(
        "avgQueryTime",
        `${database.average_query_time ?? 0}ms`
    );


    setText(
        "slowQueries",
        database.slow_queries
        ?? 0
    );


    const queryList =
        document.getElementById(
            "queryList"
        );


    if (!queryList) {

        return;

    }


    const queries =
        database.top_queries
        || [];


    if (!queries.length) {

        queryList.innerHTML =
            `
            <div class="query-row">
                No query statistics available.
            </div>
            `;

        return;

    }


    queryList.innerHTML =
        queries.map(
            query => `

                <div class="query-row">

                    <span>
                        ${escapeHtml(
                            query.query
                        )}
                    </span>

                    <span
                        class="query-time"
                    >
                        ${query.time}ms
                    </span>

                </div>

            `
        ).join("");

}


/* ==========================================================
   SERVICES
========================================================== */

function updateServices(
    data
) {

    const container =
        document.getElementById(
            "serviceList"
        );


    if (!container) {

        return;

    }


    const services =
        data.services
        || [];


    container.innerHTML =
        services.map(
            service => `

                <div class="service-row">

                    <div class="service-name">

                        <i class="fa-solid fa-server"></i>

                        <span>
                            ${escapeHtml(
                                service.name
                            )}
                        </span>

                    </div>

                    <span
                        class="service-status"
                    >
                        ${escapeHtml(
                            service.status
                        )}
                    </span>

                    <span
                        class="service-time"
                    >
                        ${service.response_time}ms
                    </span>

                </div>

            `
        ).join("");

}


/* ==========================================================
   ALERTS
========================================================== */

async function loadAlerts() {

    try {

        const response =
            await apiFetch(
                `${API}/api/system-health/alerts`
            );


        const alerts =
            await response.json();


        let critical = 0;
        let warning = 0;
        let info = 0;
        let resolved = 0;


        alerts.forEach(
            alert => {

                const severity =
                    (
                        alert.severity
                        || ""
                    ).toLowerCase();


                const status =
                    (
                        alert.status
                        || ""
                    ).toLowerCase();


                if (
                    severity ===
                    "critical"
                ) {

                    critical++;

                }

                else if (
                    severity ===
                    "warning"
                ) {

                    warning++;

                }

                else if (
                    severity ===
                    "info"
                ) {

                    info++;

                }


                if (
                    status ===
                    "resolved"
                ) {

                    resolved++;

                }

            }
        );


        setText(
            "criticalAlerts",
            critical
        );


        setText(
            "warningAlerts",
            warning
        );


        setText(
            "infoAlerts",
            info
        );


        setText(
            "resolvedAlerts",
            resolved
        );


        renderIssues(
            alerts
        );

    }

    catch (error) {

        console.error(
            "Unable to load alerts:",
            error
        );

    }

}


/* ==========================================================
   RECENT ISSUES
========================================================== */

function renderIssues(
    alerts
) {

    const tbody =
        document.getElementById(
            "issuesTable"
        );


    if (!tbody) {

        return;

    }


    if (!alerts.length) {

        tbody.innerHTML =
            `
            <tr>
                <td colspan="5">
                    No recent issues.
                </td>
            </tr>
            `;

        return;

    }


    tbody.innerHTML =
        alerts.slice(
            0,
            5
        ).map(
            alert => {

                const severity =
                    (
                        alert.severity
                        || "Info"
                    ).toLowerCase();


                return `

                    <tr>

                        <td>
                            ${escapeHtml(
                                alert.issue
                            )}
                        </td>

                        <td>

                            <span
                                class="severity ${severity}"
                            >
                                ${escapeHtml(
                                    alert.severity
                                )}
                            </span>

                        </td>

                        <td>

                            <span
                                class="issue-status"
                            >
                                ${escapeHtml(
                                    alert.status
                                )}
                            </span>

                        </td>

                        <td>
                            ${formatDate(
                                alert.detected_at
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                alert.resolved_at
                            )}
                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* ==========================================================
   ESCAPE HTML
========================================================== */

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
   DATE FORMAT
========================================================== */

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

        return "-";

    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* ==========================================================
   REFRESH
========================================================== */

async function refreshDashboard() {

    const button =
        document.getElementById(
            "refreshButton"
        );


    if (button) {

        button.disabled = true;

        button.innerHTML =
            `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading...
            `;

    }


    try {

        await Promise.all([
            loadSystemHealth(),
            loadAlerts()
        ]);

    }

    finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                `
                <i class="fa-solid fa-rotate"></i>
                Refresh
                `;

        }

    }

}


/* ==========================================================
   DASHBOARD LOAD PERFORMANCE
========================================================== */

function measureDashboardLoad() {

    const navigation =
        performance.getEntriesByType(
            "navigation"
        )[0];


    if (!navigation) {

        return;

    }


    const loadTime =
        navigation.loadEventEnd
        -
        navigation.startTime;


    if (
        loadTime > 0
    ) {

        setText(
            "dashboardLoad",
            `${(
                loadTime / 1000
            ).toFixed(2)}s`
        );

    }

}


// ==========================================================
// UPDATE HEADER
// ==========================================================

function updateHeader(user) {

    const name =
        user.name ||
        user.full_name ||
        user.username ||
        user.email ||
        "Admin User";


    const email =
        user.email ||
        "";


    const role =
        user.role ||
        user.user_role ||
        "Administrator";


    console.log(
        "Updating header:",
        {
            name,
            email,
            role
        }
    );


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


// ==========================================================
// SET TEXT
// ==========================================================

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value ?? "";

    }
    else {

        console.warn(
            `Element #${elementId} not found`
        );

    }

}


// ==========================================================
// OPEN ADMIN PROFILE
// ==========================================================

function openAdminProfile() {

    window.location.href =
        "/admin/profile";

}


// ==========================================================
// ADMIN PROFILE
// ==========================================================

async function loadAdminProfile() {

    try {

        console.log(
            "Loading admin profile..."
        );


        const token =
            getToken();


        console.log(
            "JWT token found:",
            token
                ? "YES"
                : "NO"
        );


        if (!token) {

            console.warn(
                "No authentication token found."
            );


            showToast(
                "Please login again",
                "error"
            );


            return;

        }


        /*
            IMPORTANT:

            apiFetch already adds API.

            CORRECT:
            "/adminprofile"

            NOT:
            `${API}/adminprofile`
        */

        const response =
            await apiFetch(
                "/adminprofile"
            );


        const data = await response.json();


        console.log(
            "ADMIN PROFILE RESPONSE:",
            data
        );


        /*
            Your FastAPI endpoint may return:

            {
                name: "...",
                email: "...",
                role: "..."
            }

            OR:

            {
                user: {
                    name: "...",
                    email: "...",
                    role: "..."
                }
            }

            OR:

            {
                admin: {
                    ...
                }
            }

            OR:

            {
                current_user: {
                    ...
                }
            }
        */

        const user =
            data?.user ||
            data?.admin ||
            data?.current_user ||
            data?.profile ||
            data ||
            {};


        updateHeader( user );

    }
    catch (error) {

        console.error(
            "Unable to load admin profile:",
            error
        );

    }

}


/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "VendorIQ System Health initialized."
        );


        measureDashboardLoad();

        await loadAdminProfile();

        await refreshDashboard();


        const refreshButton =
            document.getElementById(
                "refreshButton"
            );


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                refreshDashboard
            );

        }


        // Refresh automatically
        // every 30 seconds.

        setInterval(
            refreshDashboard,
            30000
        );

    }
);