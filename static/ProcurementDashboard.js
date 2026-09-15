// ==========================================================
// PROCUREMENT MANAGER DASHBOARD
// ==========================================================


// ==========================================================
// API
// ==========================================================

const API = "http://127.0.0.1:8000";


// ==========================================================
// GLOBAL CHARTS
// ==========================================================

let procurementChart = null;
let spendChart = null;
let categoryChart = null;
let deliveryChart = null;


// ==========================================================
// GET JSON - AUTHENTICATED API REQUEST
// ==========================================================

async function getJSON(url, options = {}) {

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token");

    console.log("======================================");
    console.log("API REQUEST:", url);
    console.log("TOKEN EXISTS:", !!token);

    if (!token) {

        console.error("No JWT token found.");

        window.location.href = "/login";

        throw new Error("Not authenticated");
    }

    console.log(
        "TOKEN PREFIX:",
        token.substring(0, 20) + "..."
    );

    const headers = {
        "Accept": "application/json",
        ...(options.headers || {}),
        "Authorization": `Bearer ${token}`
    };

    try {

        const response = await fetch(url, {
            ...options,
            method: options.method || "GET",
            headers: headers,
            credentials: "include"
        });

        console.log(
            "RESPONSE:",
            response.status,
            response.statusText
        );

        if (response.status === 401) {

            let detail = "Not authenticated";

            try {

                const errorData =
                    await response.json();

                detail =
                    errorData.detail ||
                    detail;

            } catch (_) {}

            console.error(
                "401 AUTHENTICATION ERROR:",
                detail
            );

            console.error(
                "URL:",
                url
            );

            /*
             * IMPORTANT:
             * Do not immediately delete the token here while debugging.
             * The token may be valid but rejected because of a backend
             * authentication/dependency mismatch.
             */

            throw new Error(
                `API 401: ${detail}`
            );
        }

        if (response.status === 403) {

            let detail = "Permission denied";

            try {

                const errorData =
                    await response.json();

                detail =
                    errorData.detail ||
                    detail;

            } catch (_) {}

            console.error(
                "403:",
                detail
            );

            throw new Error(
                `API 403: ${detail}`
            );
        }

        if (!response.ok) {

            let detail =
                `HTTP ${response.status}`;

            try {

                const errorData =
                    await response.json();

                detail =
                    errorData.detail ||
                    JSON.stringify(errorData);

            } catch (_) {

                try {
                    detail =
                        await response.text();
                } catch (_) {}
            }

            throw new Error(
                `API ${response.status}: ${detail}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "getJSON failed:",
            error
        );

        throw error;
    }
}


// ==========================================================
// FORMAT MONEY
// ==========================================================

function formatMoney(value) {

    value = Number(value || 0);

    if (value >= 1000000) {

        return "$" +
            (
                value / 1000000
            ).toFixed(2) +
            "M";
    }

    if (value >= 1000) {

        return "$" +
            (
                value / 1000
            ).toFixed(0) +
            "K";
    }

    return "$" +
        value.toLocaleString();
}


// ==========================================================
// STATUS CLASS
// ==========================================================

function statusClass(status) {

    return String(status || "")
        .toLowerCase()
        .replace(/\s+/g, "-");
}


// ==========================================================
// LOAD LOGGED-IN USER
// ==========================================================

function loadUser(user) {

    user = user || {};


    const userName =
        user.name ||
        user.fullname ||
        "Procurement Manager";

    
    // ======================================================
    // USER ROLE
    // ======================================================

    const userRole =
        user.role ||
        "Procurement Manager";


    // ------------------------------------------------------
    // HEADER USER NAME
    // ------------------------------------------------------

    const headerUserName =
        document.getElementById(
            "headerUserName"
        );

    if (headerUserName) {

        headerUserName.textContent =
            userName;
    }


    // ------------------------------------------------------
    // HEADER ROLE
    // ------------------------------------------------------

    const headerUserRole =
        document.getElementById(
            "headerUserRole"
        );

    if (headerUserRole) {

        headerUserRole.textContent =
            user.role ||
            "Procurement Manager";
    }


    // ------------------------------------------------------ 
    // DISPLAY USER NAME
    // ------------------------------------------------------ 
 
    const headUserName = document.getElementById( "headUserName" ); 
    
    if (headUserName) { 
        
        headUserName.textContent = userName;
    
    } 
    
    
    // ------------------------------------------------------ 
    // DISPLAY USER ROLE 
    // ------------------------------------------------------ 
    
    const headUserRole = document.getElementById( "headUserRole" ); 
    if (headUserRole) { 
        
        headUserRole.textContent = userRole; 
    
    }


}


// ==========================================================
// LOAD DASHBOARD
// ==========================================================

async function loadDashboard() {

    try {

        console.log("======================================");
        console.log("Loading Procurement Manager Dashboard");
        console.log("======================================");

        const data = await getJSON(
            `${API}/api/procurement/dashboard`
        );

        console.log("FULL DASHBOARD RESPONSE:");
        console.log(data);

        // --------------------------------------------------
        // Validate response
        // --------------------------------------------------

        if (!data) {
            throw new Error("Dashboard API returned empty response");
        }

        if (data.success !== true) {
            throw new Error(
                data.detail ||
                "Dashboard API returned unsuccessful response"
            );
        }


        // ==================================================
        // USER
        // ==================================================

        loadUser(
            data.user || {}
        );


        // ==================================================
        // KPI
        // Backend returns:
        // data.kpis
        // ==================================================

        loadKPIs(
            data.kpis || {}
        );


        // ==================================================
        // PROCUREMENT OVERVIEW
        // Backend returns:
        // data.procurement_overview
        // ==================================================

        loadProcurementOverview(
            data.procurement_overview || {}
        );


        // ==================================================
        // PURCHASE ORDERS
        // Backend returns:
        // data.purchase_orders
        // ==================================================

        loadPurchaseOrders(
            Array.isArray(data.purchase_orders)
                ? data.purchase_orders
                : []
        );


        // ==================================================
        // VENDOR PERFORMANCE
        // Backend returns:
        // data.vendor_performance
        // ==================================================

        loadVendorPerformance(
            Array.isArray(data.vendor_performance)
                ? data.vendor_performance
                : []
        );


        // ==================================================
        // DELIVERY
        // Backend returns:
        // data.delivery
        // ==================================================

        loadDelivery(
            data.delivery || {}
        );


        // ==================================================
        // NOTIFICATIONS
        // ==================================================

        loadNotifications(
            Array.isArray(data.notifications)
                ? data.notifications
                : []
        );


        // ==================================================
        // MESSAGES
        // ==================================================

        loadMessages(
            Array.isArray(data.messages)
                ? data.messages
                : []
        );


        // ==================================================
        // MONTHLY SPEND
        // ==================================================

        createSpendChart(
            Array.isArray(data.monthly)
                ? data.monthly
                : []
        );


        // ==================================================
        // SPEND BY CATEGORY
        // ==================================================

        createCategoryChart(
            Array.isArray(data.categories)
                ? data.categories
                : []
        );


        // ==================================================
        // DELIVERY MONTHLY
        //
        // Backend:
        // data.delivery.monthly
        // ==================================================

        createDeliveryChart(
            data.delivery &&
            Array.isArray(data.delivery.monthly)
                ? data.delivery.monthly
                : []
        );


        console.log(
            "Procurement Manager Dashboard loaded successfully."
        );


    } catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "PROCUREMENT DASHBOARD ERROR:",
            error
        );

        console.error(
            "======================================"
        );

        showError(
            error.message || "Failed to load dashboard"
        );
    }
}


// ==========================================================
// KPI
// ==========================================================

function loadKPIs(kpis) {

    kpis = kpis || {};


    // ======================================================
    // TOTAL SPEND
    // ======================================================

    const totalSpend =
        document.getElementById("totalSpend");

    if (totalSpend) {

        totalSpend.textContent =
            formatMoney(
                kpis.total_spend || 0
            );
    }


    // ======================================================
    // COST SPEND
    // ======================================================

    const costSpend =
        document.getElementById("costSpend");

    if (costSpend) {

        costSpend.textContent =
            formatMoney(
                kpis.total_spend || 0
            );
    }


    // ======================================================
    // TOTAL PURCHASE ORDERS
    // ======================================================

    const activePOs =
        document.getElementById("activePOs");

    if (activePOs) {

        activePOs.textContent =
            Number(kpis.total_pos || 0);
    }


    // ======================================================
    // PENDING APPROVALS
    // ======================================================

    const pendingApprovals =
        document.getElementById("pendingApprovals");

    if (pendingApprovals) {

        pendingApprovals.textContent =
            Number(kpis.pending_approvals || 0);
    }


    // ======================================================
    // ON-TIME DELIVERY
    // ======================================================

    const deliveryRate =
        Number(
            kpis.on_time_delivery || 0
        );


    const onTimeDelivery =
        document.getElementById("onTimeDelivery");

    if (onTimeDelivery) {

        onTimeDelivery.textContent =
            `${deliveryRate.toFixed(1)}%`;
    }


    const deliveryOnTime =
        document.getElementById("deliveryOnTime");

    if (deliveryOnTime) {

        deliveryOnTime.textContent =
            `${deliveryRate.toFixed(1)}%`;
    }


    // ======================================================
    // SUPPLIERS
    // ======================================================

    const suppliers =
        document.getElementById("suppliers");

    if (suppliers) {

        suppliers.textContent =
            Number(kpis.suppliers || 0);
    }


    // ======================================================
    // OPTIONAL VENDOR AVERAGE
    // ======================================================

    const vendorAverage =
        document.getElementById("vendorAverageScore");

    if (vendorAverage) {

        vendorAverage.textContent =
            `${Number(
                kpis.vendor_average || 0
            ).toFixed(1)}`;
    }
}


// ==========================================================
// PROCUREMENT OVERVIEW
// ==========================================================

function loadProcurementOverview(data) {

    data = data || {};


    const labels = [
        "Pending",
        "In Transit",
        "Partial",
        "Delivered",
        "Cancelled"
    ];


    const values = [
        Number(data.pending || 0),
        Number(data.in_transit || 0),
        Number(data.partial || 0),
        Number(data.delivered || 0),
        Number(data.cancelled || 0)
    ];


    const total =
        values.reduce(
            (a, b) => a + b,
            0
        );


    // ======================================================
    // CENTER TOTAL
    // ======================================================

    const totalPOCenter =
        document.getElementById(
            "totalPOCenter"
        );

    if (totalPOCenter) {

        totalPOCenter.textContent =
            total;
    }


    // ======================================================
    // LEGEND
    // ======================================================

    const colors = [
        "#ff9f1c",
        "#3985f5",
        "#25aaa9",
        "#21a564",
        "#ef3d3d"
    ];


    const legend =
        document.getElementById(
            "procurementLegend"
        );


    if (legend) {

        legend.innerHTML = "";


        labels.forEach(
            (label, index) => {

                const percentage =
                    total > 0
                        ? (
                            values[index] /
                            total *
                            100
                        ).toFixed(1)
                        : "0.0";


                legend.innerHTML += `

                    <div class="legend-row">

                        <span
                            class="legend-dot"
                            style="
                                background:
                                ${colors[index]}
                            "
                        ></span>

                        <span>
                            ${label}
                        </span>

                        <strong>
                            ${values[index]}
                            (${percentage}%)
                        </strong>

                    </div>

                `;
            }
        );
    }


    // ======================================================
    // CHART
    // ======================================================

    const ctx =
        document.getElementById(
            "procurementChart"
        );


    if (!ctx) {
        return;
    }


    if (procurementChart) {

        procurementChart.destroy();

        procurementChart = null;
    }


    procurementChart =
        new Chart(
            ctx,
            {

                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            data: values,

                            backgroundColor:
                                colors,

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


// ==========================================================
// PURCHASE ORDERS
// ==========================================================

function loadPurchaseOrders(orders) {

    const tbody =
        document.getElementById(
            "purchaseOrderTable"
        );


    if (!tbody) {

        return;
    }


    tbody.innerHTML = "";


    if (
        !Array.isArray(orders) ||
        orders.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        padding:20px;
                    "
                >
                    No purchase orders found
                </td>

            </tr>

        `;

        return;
    }


    orders.forEach(
        po => {

            tbody.innerHTML += `

                <tr>

                    <td>
                        ${po.po_number || "-"}
                    </td>

                    <td>
                        ${po.vendor || "-"}
                    </td>

                    <td>
                        ${formatMoney(
                            po.amount
                        )}
                    </td>

                    <td>

                        <span
                            class="
                                status
                                ${statusClass(
                                    po.status
                                )}
                            "
                        >
                            ${po.status || "-"}
                        </span>

                    </td>

                    <td>
                        ${
                            po.expected_delivery ||
                            po.actual_delivery ||
                            "-"
                        }
                    </td>

                </tr>

            `;
        }
    );
}


// ==========================================================
// VENDOR PERFORMANCE
// ==========================================================

function loadVendorPerformance(vendors) {

    const tbody =
        document.getElementById(
            "vendorTable"
        );


    if (!tbody) {

        return;
    }


    tbody.innerHTML = "";


    if (
        !Array.isArray(vendors) ||
        vendors.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:20px;
                    "
                >
                    No vendor performance data
                </td>

            </tr>

        `;

        return;
    }


    vendors.forEach(
        vendor => {

            const trend =
                vendor.trend || "flat";


            const trendIcon =
                trend === "up"
                    ? "↑"
                    : trend === "down"
                        ? "↓"
                        : "→";


            const trendColor =
                trend === "up"
                    ? "#15a45b"
                    : trend === "down"
                        ? "#ef4040"
                        : "#777";


            tbody.innerHTML += `

                <tr>

                    <td>
                        ${vendor.vendor || "-"}
                    </td>

                    <td>
                        ${vendor.quality || 0}
                    </td>

                    <td>
                        ${vendor.delivery || 0}
                    </td>

                    <td>
                        ${vendor.service || 0}
                    </td>

                    <td>

                        <strong>
                            ${vendor.score || 0}
                        </strong>

                    </td>

                    <td>

                        <span
                            style="
                                color:${trendColor};
                                font-size:16px;
                            "
                        >
                            ${trendIcon}
                        </span>

                    </td>

                </tr>

            `;
        }
    );
}


// ==========================================================
// DELIVERY
// ==========================================================

function loadDelivery(delivery) {

    delivery = delivery || {};


    const onTime =
        Number(
            delivery.on_time || 0
        );


    // Store globally for KPI
    window.dashboardDeliveryRate =
        onTime;


    // ------------------------------------------------------
    // ON-TIME
    // ------------------------------------------------------

    const deliveryOnTime =
        document.getElementById(
            "deliveryOnTime"
        );

    if (deliveryOnTime) {

        deliveryOnTime.textContent =
            `${onTime}%`;
    }


    const onTimeDelivery =
        document.getElementById(
            "onTimeDelivery"
        );

    if (onTimeDelivery) {

        onTimeDelivery.textContent =
            `${onTime}%`;
    }


    // ------------------------------------------------------
    // TOTAL DELIVERIES
    // ------------------------------------------------------

    const totalDeliveries =
        document.getElementById(
            "totalDeliveries"
        );

    if (totalDeliveries) {

        totalDeliveries.textContent =
            delivery.total_deliveries || 0;
    }


    // ------------------------------------------------------
    // DELAYED
    // ------------------------------------------------------

    const delayed =
        document.getElementById(
            "delayedDeliveries"
        );

    if (delayed) {

        delayed.textContent =
            `${delivery.delayed || 0}%`;
    }


    // ------------------------------------------------------
    // AVERAGE DELAY
    // ------------------------------------------------------

    const avgDelay =
        document.getElementById(
            "averageDelay"
        );

    if (avgDelay) {

        avgDelay.textContent =
            `${delivery.avg_delay || 0} days`;
    }
}


// ==========================================================
// SPEND CHART
// ==========================================================

function createSpendChart(monthly) {

    const ctx =
        document.getElementById(
            "spendChart"
        );


    if (!ctx) {

        return;
    }


    if (spendChart) {

        spendChart.destroy();
    }


    if (
        !Array.isArray(monthly) ||
        monthly.length === 0
    ) {

        monthly = [];
    }


    const labels =
        monthly.map(
            item =>
                item.month || ""
        );


    const actual =
        monthly.map(
            item =>
                Number(
                    item.actual_spend || 0
                )
        );


    const budget =
        monthly.map(
            item =>
                Number(
                    item.budget || 0
                )
        );


    spendChart =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Actual Spend",

                            data: actual,

                            borderColor:
                                "#4826e4",

                            backgroundColor:
                                "rgba(72,38,228,.08)",

                            fill: true,

                            tension: .4,

                            pointRadius: 3

                        },

                        {

                            label:
                                "Budget",

                            data: budget,

                            borderColor:
                                "#17a268",

                            backgroundColor:
                                "transparent",

                            tension: .4,

                            pointRadius: 3

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {

                                boxWidth: 7,

                                font: {
                                    size: 8
                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                font: {
                                    size: 8
                                }

                            }

                        },

                        x: {

                            ticks: {

                                font: {
                                    size: 8
                                }

                            }

                        }

                    }

                }

            }
        );
}


// ==========================================================
// CATEGORY CHART
// ==========================================================

function createCategoryChart(categories) {

    const ctx =
        document.getElementById(
            "categoryChart"
        );


    if (!ctx) {

        return;
    }


    if (categoryChart) {

        categoryChart.destroy();
    }


    if (
        !Array.isArray(categories) ||
        categories.length === 0
    ) {

        categories = [];
    }


    const labels =
        categories.map(
            item =>
                item.category || "Other"
        );


    const values =
        categories.map(
            item =>
                Number(
                    item.spend || 0
                )
        );


    categoryChart =
        new Chart(
            ctx,
            {

                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            data: values,

                            backgroundColor: [

                                "#6331d9",
                                "#3985f5",
                                "#21a564",
                                "#ff8d18",
                                "#ef4040",
                                "#25aaa9",
                                "#9b59b6",
                                "#34495e"

                            ],

                            borderWidth: 2,

                            borderColor:
                                "#ffffff"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "60%",

                    plugins: {

                        legend: {

                            position:
                                "right",

                            labels: {

                                font: {
                                    size: 8
                                },

                                boxWidth: 7

                            }

                        }

                    }

                }

            }
        );
}


// ==========================================================
// DELIVERY CHART
// ==========================================================

function createDeliveryChart(monthly) {

    const ctx =
        document.getElementById(
            "deliveryChart"
        );


    if (!ctx) {

        return;
    }


    if (deliveryChart) {

        deliveryChart.destroy();
    }


    if (
        !Array.isArray(monthly) ||
        monthly.length === 0
    ) {

        monthly = [];
    }


    const labels =
        monthly.map(
            item =>
                item.month || ""
        );


    const onTime =
        monthly.map(
            item =>
                Number(
                    item.on_time_pct || 0
                )
        );


    const delayed =
        monthly.map(
            item =>
                Number(
                    item.delayed_pct || 0
                )
        );


    deliveryChart =
        new Chart(
            ctx,
            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "On-Time Delivery (%)",

                            data: onTime,

                            backgroundColor:
                                "#20a663"

                        },

                        {

                            label:
                                "Delayed Delivery (%)",

                            data: delayed,

                            backgroundColor:
                                "#ef4040"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            max: 100,

                            ticks: {

                                font: {
                                    size: 8
                                }

                            }

                        },

                        x: {

                            ticks: {

                                font: {
                                    size: 8
                                }

                            }

                        }

                    },

                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {

                                boxWidth: 7,

                                font: {
                                    size: 8
                                }

                            }

                        }

                    }

                }

            }
        );
}


// ==========================================================
// NOTIFICATIONS
// ==========================================================

function loadNotifications(notifications) {

    const container =
        document.getElementById(
            "notifications"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    // IMPORTANT:
    // Prevent "notifications.forEach is not a function"

    if (
        !Array.isArray(notifications) ||
        notifications.length === 0
    ) {

        container.innerHTML = `

            <div class="activity">

                <i
                    class="
                        fa-regular
                        fa-bell
                    "
                ></i>

                <span>
                    No recent notifications
                </span>

            </div>

        `;

        return;
    }


    notifications.forEach(
        item => {

            container.innerHTML += `

                <div class="activity">

                    <i
                        class="
                            fa-regular
                            fa-bell
                        "
                    ></i>

                    <span>
                        ${item.message || ""}
                    </span>

                </div>

            `;
        }
    );
}


// ==========================================================
// MESSAGES
// ==========================================================

function loadMessages(messages) {

    const container =
        document.getElementById(
            "messages"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    if (
        !Array.isArray(messages) ||
        messages.length === 0
    ) {

        container.innerHTML = `

            <div class="activity">

                <i
                    class="
                        fa-regular
                        fa-envelope
                    "
                ></i>

                <span>
                    No recent messages
                </span>

            </div>

        `;

        return;
    }


    messages.forEach(
        item => {

            container.innerHTML += `

                <div class="activity">

                    <i
                        class="
                            fa-regular
                            fa-envelope
                        "
                    ></i>

                    <span>

                        <strong>
                            From:
                        </strong>

                        ${item.sender || "-"}

                        <br>

                        ${item.subject || ""}

                    </span>

                </div>

            `;
        }
    );
}


// ==========================================================
// NOTIFICATION COUNT
// ==========================================================

async function loadNotificationCount() {

    try {

        const data =
            await getJSON(
                `${API}/api/procurement/notifications/count`
            );


        const count =
            document.getElementById(
                "notificationCount"
            );


        if (count) {

            count.textContent =
                Number(
                    data.count || 0
                );
        }


    } catch (error) {

        console.error(
            "Notification count error:",
            error
        );
    }
}


// ==========================================================
// MESSAGE COUNT
// ==========================================================

async function loadMessageCount() {

    try {

        const data =
            await getJSON(
                `${API}/api/procurement/messages/count`
            );


        const count =
            document.getElementById(
                "messageCount"
            );


        if (count) {

            count.textContent =
                Number(
                    data.count || 0
                );
        }


    } catch (error) {

        console.error(
            "Message count error:",
            error
        );
    }
}


// ==========================================================
// ERROR
// ==========================================================

function showError(message) {

    console.error(
        "Dashboard error:",
        message
    );
}


// ==========================================================
// REFRESH BUTTON
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const refreshButton =
            document.getElementById(
                "refreshButton"
            );


        if (!refreshButton) {

            return;
        }


        refreshButton.addEventListener(
            "click",
            async () => {

                refreshButton.innerHTML = `

                    <i
                        class="
                            fa-solid
                            fa-spinner
                            fa-spin
                        "
                    ></i>

                    Loading...

                `;


                try {

                    await loadDashboard();

                    await loadNotificationCount();

                    await loadMessageCount();

                } finally {

                    refreshButton.innerHTML = `

                        <i
                            class="
                                fa-solid
                                fa-rotate
                            "
                        ></i>

                        Refresh

                    `;
                }

            }
        );

    }
);


// ==========================================================
// SEARCH PURCHASE ORDERS
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const searchInput =
            document.getElementById(
                "searchInput"
            );


        if (!searchInput) {

            return;
        }


        searchInput.addEventListener(
            "input",
            function () {

                const search =
                    this.value
                        .toLowerCase()
                        .trim();


                const rows =
                    document.querySelectorAll(
                        "#purchaseOrderTable tr"
                    );


                rows.forEach(
                    row => {

                        row.style.display =
                            row.textContent
                                .toLowerCase()
                                .includes(search)
                                ? ""
                                : "none";

                    }
                );

            }
        );

    }
);


// ==========================================================
// INITIALIZE DASHBOARD
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Initializing Procurement Manager Dashboard..."
        );


        await loadDashboard();

        await loadNotificationCount();

        await loadMessageCount();

    }
);


function openProfile(){
    window.location.href="/ProcurementProfile";
}