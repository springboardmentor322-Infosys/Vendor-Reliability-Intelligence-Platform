const API_BASE =
    "http://127.0.0.1:8000/api/orders-shipments";


let dashboardData = null;

let ordersTrendChart = null;

let ordersStatusChart = null;

let shipmentsStatusChart = null;

let shipmentMap = null;


/* =========================================================
   FETCH DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_BASE}/dashboard`
        );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        dashboardData =
            await response.json();

        updateKPIs();

        renderOrdersTrend();

        renderOrdersStatus();

        renderShipmentsStatus();

        renderRecentOrders();

        renderRecentShipments();

        renderTransitShipments();

        updateNotificationCount();

        updateMap();

    }
    catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        showError(
            "Unable to load dashboard data."
        );
    }
}


/* =========================================================
   KPIs
========================================================= */

function updateKPIs() {

    const kpi =
        dashboardData.kpis;

    setText(
        "totalOrders",
        formatNumber(kpi.total_orders)
    );

    setText(
        "deliveredOrders",
        formatNumber(
            kpi.delivered_orders
        )
    );

    setText(
        "inTransitShipments",
        formatNumber(
            kpi.in_transit_shipments
        )
    );

    setText(
        "pendingOrders",
        formatNumber(
            kpi.pending_orders
        )
    );

    setText(
        "cancelledOrders",
        formatNumber(
            kpi.cancelled_orders
        )
    );
}


/* =========================================================
   ORDERS TREND
========================================================= */

function renderOrdersTrend() {

    const trend =
        dashboardData.order_trend;

    const canvas =
        document.getElementById(
            "ordersTrendChart"
        );

    if (ordersTrendChart) {

        ordersTrendChart.destroy();

    }

    ordersTrendChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: trend.labels,

                    datasets: [

                        {
                            label:
                                "Total Orders",

                            data:
                                trend.total_orders,

                            borderWidth: 2,

                            tension: .35,

                            pointRadius: 2
                        },

                        {
                            label:
                                "Delivered Orders",

                            data:
                                trend.delivered_orders,

                            borderWidth: 2,

                            tension: .35,

                            pointRadius: 2
                        },

                        {
                            label:
                                "Cancelled Orders",

                            data:
                                trend.cancelled_orders,

                            borderWidth: 2,

                            tension: .35,

                            pointRadius: 2
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        mode: "index",

                        intersect: false
                    },

                    plugins: {

                        legend: {

                            position: "top",

                            labels: {

                                boxWidth: 8,

                                font: {
                                    size: 10
                                }
                            }
                        }

                    },

                    scales: {

                        x: {

                            ticks: {
                                font: {
                                    size: 9
                                },

                                maxTicksLimit: 7
                            },

                            grid: {
                                display: false
                            }
                        },

                        y: {

                            beginAtZero: true,

                            ticks: {
                                font: {
                                    size: 9
                                }
                            }
                        }

                    }

                }

            }
        );
}


/* =========================================================
   ORDERS STATUS
========================================================= */

function renderOrdersStatus() {

    const data =
        dashboardData.orders_by_status;

    const labels =
        data.map(item => item.status);

    const values =
        data.map(item => item.count);

    const canvas =
        document.getElementById(
            "ordersStatusChart"
        );

    if (ordersStatusChart) {

        ordersStatusChart.destroy();

    }

    ordersStatusChart =
        createDonutChart(
            canvas,
            labels,
            values
        );

    const total =
        values.reduce(
            (a, b) => a + b,
            0
        );

    document.querySelector(
        "#ordersStatusCenter strong"
    ).textContent =
        formatNumber(total);

    renderLegend(
        "ordersStatusLegend",
        data
    );
}


/* =========================================================
   SHIPMENTS STATUS
========================================================= */

function renderShipmentsStatus() {

    const data =
        dashboardData.shipments_by_status;

    const labels =
        data.map(item => item.status);

    const values =
        data.map(item => item.count);

    const canvas =
        document.getElementById(
            "shipmentsStatusChart"
        );

    if (shipmentsStatusChart) {

        shipmentsStatusChart.destroy();

    }

    shipmentsStatusChart =
        createDonutChart(
            canvas,
            labels,
            values
        );

    const total =
        values.reduce(
            (a, b) => a + b,
            0
        );

    document.querySelector(
        "#shipmentsStatusCenter strong"
    ).textContent =
        formatNumber(total);

    renderLegend(
        "shipmentsStatusLegend",
        data
    );
}


/* =========================================================
   DONUT CHART
========================================================= */

function createDonutChart(
    canvas,
    labels,
    values
) {

    return new Chart(
        canvas,
        {

            type: "doughnut",

            data: {

                labels,

                datasets: [
                    {
                        data: values,

                        borderWidth: 2
                    }
                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: "70%",

                plugins: {

                    legend: {
                        display: false
                    }

                }

            }

        }
    );
}


/* =========================================================
   LEGEND
========================================================= */

function renderLegend(
    elementId,
    items
) {

    const element =
        document.getElementById(
            elementId
        );

    element.innerHTML = "";

    items.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "legend-row";

            row.innerHTML = `

                <div class="legend-name">

                    <span
                        class="legend-dot"
                        style="
                            background:
                            ${getChartColor(index)};
                        "
                    ></span>

                    <span>
                        ${escapeHtml(
                            item.status
                        )}
                    </span>

                </div>

                <strong>
                    ${formatNumber(
                        item.count
                    )}
                </strong>

            `;

            element.appendChild(row);
        }
    );
}


function getChartColor(index) {

    const colors = [
        "#2463eb",
        "#10a85b",
        "#f97316",
        "#6d28d9",
        "#f5b400",
        "#94a3b8",
        "#ef4444"
    ];

    return colors[
        index % colors.length
    ];
}


/* =========================================================
   RECENT ORDERS
========================================================= */

function renderRecentOrders() {

    const tbody =
        document.getElementById(
            "recentOrdersBody"
        );

    tbody.innerHTML = "";

    dashboardData.recent_orders
        .forEach(order => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    <span
                        class="order-link"
                        onclick="viewOrder(${order.id})"
                    >
                        ${escapeHtml(
                            order.order_number
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        order.customer_name
                    )}
                </td>

                <td>
                    ${formatDate(
                        order.order_date
                    )}
                </td>

                <td>
                    ${statusBadge(
                        order.status
                    )}
                </td>

                <td>
                    ₹${formatNumber(
                        order.amount
                    )}
                </td>

                <td>
                    ${formatDate(
                        order.expected_delivery
                    )}
                </td>

            `;

            tbody.appendChild(row);

        });
}


/* =========================================================
   RECENT SHIPMENTS
========================================================= */

function renderRecentShipments() {

    const tbody =
        document.getElementById(
            "recentShipmentsBody"
        );

    tbody.innerHTML = "";

    dashboardData.recent_shipments
        .forEach(shipment => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    <span
                        class="order-link"
                    >
                        ${escapeHtml(
                            shipment.shipment_number
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        shipment.order_number ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        shipment.carrier ||
                        "-"
                    )}
                </td>

                <td>
                    ${statusBadge(
                        shipment.status
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        shipment.current_location ||
                        shipment.destination ||
                        "-"
                    )}
                </td>

                <td>
                    ${formatDate(
                        shipment.expected_delivery
                    )}
                </td>

            `;

            tbody.appendChild(row);

        });
}


/* =========================================================
   TRANSIT TABLE
========================================================= */

function renderTransitShipments() {

    const tbody =
        document.getElementById(
            "transitBody"
        );

    tbody.innerHTML = "";

    dashboardData.in_transit_shipments
        .forEach(shipment => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    <span class="order-link">
                        ${escapeHtml(
                            shipment.shipment_number
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        shipment.order_number ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        shipment.origin ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        shipment.destination ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        shipment.carrier ||
                        "-"
                    )}
                </td>

                <td>
                    ${statusBadge(
                        shipment.status
                    )}
                </td>

                <td>
                    ${formatDate(
                        shipment.expected_delivery
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        shipment.tracking_number ||
                        "-"
                    )}
                </td>

            `;

            tbody.appendChild(row);

        });
}


/* =========================================================
   MAP
========================================================= */

function initializeMap() {

    shipmentMap =
        L.map(
            "shipmentMap"
        ).setView(
            [22.5, 78.9],
            5
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {

            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap"

        }
    ).addTo(
        shipmentMap
    );
}


function updateMap() {

    if (!shipmentMap) {

        initializeMap();

    }


    const shipments =
        dashboardData.in_transit_shipments;


    if (!shipments.length) {

        return;
    }


    const shipment =
        shipments.find(
            item =>
                item.current_latitude !== null &&
                item.current_longitude !== null
        );


    if (!shipment) {

        return;
    }


    const origin = [

        shipment.origin_latitude,

        shipment.origin_longitude

    ];


    const current = [

        shipment.current_latitude,

        shipment.current_longitude

    ];


    const destination = [

        shipment.destination_latitude,

        shipment.destination_longitude

    ];


    const validPoints = [

        origin,
        current,
        destination

    ].filter(
        point =>
            point[0] !== null &&
            point[1] !== null
    );


    if (!validPoints.length) {

        return;
    }


    validPoints.forEach(
        point => {

            L.marker(point)
                .addTo(shipmentMap);

        }
    );


    if (validPoints.length > 1) {

        L.polyline(
            validPoints,
            {
                weight: 4,
                dashArray: "8,8"
            }
        ).addTo(
            shipmentMap
        );

    }


    shipmentMap.fitBounds(
        L.latLngBounds(
            validPoints
        ),
        {
            padding: [20, 20]
        }
    );
}


/* =========================================================
   SEARCH
========================================================= */

let searchTimer = null;


document
    .getElementById("globalSearch")
    .addEventListener(
        "input",
        function () {

            clearTimeout(
                searchTimer
            );

            const keyword =
                this.value.trim();

            if (!keyword) {

                renderRecentOrders();

                return;
            }


            searchTimer =
                setTimeout(
                    () =>
                        searchOrders(
                            keyword
                        ),
                    300
                );

        }
    );


async function searchOrders(
    keyword
) {

    try {

        const response =
            await fetch(
                `${API_BASE}/search?q=${encodeURIComponent(keyword)}`
            );

        if (!response.ok) {

            throw new Error(
                "Search failed"
            );
        }

        const orders =
            await response.json();

        renderOrderSearchResults(
            orders
        );

    }
    catch (error) {

        console.error(error);

    }
}


function renderOrderSearchResults(
    orders
) {

    const tbody =
        document.getElementById(
            "recentOrdersBody"
        );

    tbody.innerHTML = "";

    if (!orders.length) {

        tbody.innerHTML = `

            <tr>

                <td colspan="6">
                    No matching orders found.
                </td>

            </tr>

        `;

        return;
    }


    orders.forEach(
        order => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        order.order_number
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        order.customer_name
                    )}
                </td>

                <td>
                    ${formatDate(
                        order.order_date
                    )}
                </td>

                <td>
                    ${statusBadge(
                        order.status
                    )}
                </td>

                <td>
                    ₹${formatNumber(
                        order.amount
                    )}
                </td>

                <td>
                    ${formatDate(
                        order.expected_delivery
                    )}
                </td>

            `;

            tbody.appendChild(row);

        }
    );
}


/* =========================================================
   DATE/TIME
========================================================= */

function updateDateTime() {

    const now =
        new Date();


    document.getElementById(
        "currentDate"
    ).textContent =
        now.toLocaleDateString(
            "en-IN",
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
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}


setInterval(
    updateDateTime,
    1000
);

updateDateTime();


/* =========================================================
   NOTIFICATIONS
========================================================= */

function updateNotificationCount() {

    const count =
        dashboardData.unread_notifications;

    setText(
        "notificationCount",
        count
    );
}


/* =========================================================
   VIEW ORDER
========================================================= */

async function viewOrder(
    orderId
) {

    try {

        const response =
            await fetch(
                `${API_BASE}/orders/${orderId}`
            );

        const order =
            await response.json();

        alert(
            `Order: ${order.order_number}\n` +
            `Customer: ${order.customer_name}\n` +
            `Status: ${order.status}\n` +
            `Amount: ₹${formatNumber(order.amount)}`
        );

    }
    catch (error) {

        console.error(error);

    }
}


/* =========================================================
   STATUS BADGE
========================================================= */

function statusBadge(
    status
) {

    const className =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    return `

        <span
            class="status ${className}"
        >
            ${escapeHtml(status)}
        </span>

    `;
}


/* =========================================================
   HELPERS
========================================================= */

function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-IN"
    );
}


function formatDate(
    value
) {

    if (!value) {

        return "-";

    }

    const date =
        new Date(value);

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


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


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


function showError(
    message
) {

    console.error(
        message
    );

}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

    }
);


/* =========================================================
   AUTO REFRESH
========================================================= */

setInterval(
    loadDashboard,
    30000
);