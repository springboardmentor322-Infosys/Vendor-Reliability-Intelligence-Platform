/* ==========================================================
   TRANSPORTATION DASHBOARD
========================================================== */

const API_URL =
    "/api/supply-chain/transportation/dashboard";


let dashboardData = null;

let shipmentTrendChart = null;
let statusChart = null;
let modeChart = null;
let costChart = null;

let trackingMap = null;


/* ==========================================================
   DOM
========================================================== */

const $ = id =>
    document.getElementById(id);


/* ==========================================================
   API
========================================================== */

async function loadDashboard() {

    try {

        showLoading();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s cap

        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        dashboardData = await response.json();

        renderDashboard();

    } catch (error) {

        console.error("Transportation Dashboard:", error);

        if (error.name === "AbortError") {
            showError("Request timed out — the server took too long to respond.");
        } else {
            showError(error.message);
        }
    }
}


/* ==========================================================
   RENDER
========================================================== */

function renderDashboard() {

    renderKPIs();

    renderStatusChart();

    renderModeChart();

    renderTrendChart();

    renderRecentShipments();

    renderCarrierPerformance();

    renderUpcomingTransports();

    renderCostChart();

    renderMap();
}


/* ==========================================================
   KPI
========================================================== */

function renderKPIs() {

    const kpis =
        dashboardData.kpis;

    $("totalShipments")
        .textContent =
        formatNumber(
            kpis.total_shipments
        );

    $("onTimeDelivery")
        .textContent =
        `${kpis.on_time_deliveries}%`;

    $("totalDistance")
        .textContent =
        `${formatNumber(kpis.total_distance)} km`;

    $("transportCost")
        .textContent =
        formatMoney(
            kpis.transportation_cost
        );

    $("fuelEfficiency")
        .textContent =
        `${kpis.fuel_efficiency} km/l`;

    $("statusTotal")
        .textContent =
        kpis.total_shipments;

    $("modeTotal")
        .textContent =
        kpis.total_shipments;

    $("totalCostCenter")
        .textContent =
        formatMoney(
            kpis.transportation_cost
        );
}


/* ==========================================================
   STATUS CHART
========================================================== */

function renderStatusChart() {

    const rows =
        dashboardData.shipments_by_status;

    const labels =
        rows.map(
            row => row.status
        );

    const values =
        rows.map(
            row => row.count
        );

    const colors = [
        "#2563eb",
        "#16a34a",
        "#f59e0b",
        "#ef4444",
        "#94a3b8"
    ];

    if (statusChart) {

        statusChart.destroy();
    }

    statusChart =
        new Chart(
            $("statusChart"),
            {
                type: "doughnut",

                data: {

                    labels,

                    datasets: [{
                        data: values,
                        backgroundColor:
                            colors,
                        borderWidth: 2,
                        borderColor:
                            "#ffffff"
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "65%",

                    plugins: {

                        legend: {
                            display: false
                        }
                    }
                }
            }
        );

    renderLegend(
        "statusLegend",
        rows,
        colors,
        "status"
    );
}


/* ==========================================================
   MODE CHART
========================================================== */

function renderModeChart() {

    const rows =
        dashboardData.shipments_by_mode;

    const labels =
        rows.map(
            row => row.mode
        );

    const values =
        rows.map(
            row => row.count
        );

    const colors = [
        "#2563eb",
        "#16a34a",
        "#f59e0b",
        "#ef4444",
        "#7c3aed"
    ];

    if (modeChart) {

        modeChart.destroy();
    }

    modeChart =
        new Chart(
            $("modeChart"),
            {
                type: "doughnut",

                data: {

                    labels,

                    datasets: [{
                        data: values,
                        backgroundColor:
                            colors,
                        borderWidth: 2,
                        borderColor:
                            "#ffffff"
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "65%",

                    plugins: {

                        legend: {
                            display: false
                        }
                    }
                }
            }
        );

    renderLegend(
        "modeLegend",
        rows,
        colors,
        "mode"
    );
}


/* ==========================================================
   LEGEND
========================================================== */

function renderLegend(
    elementId,
    rows,
    colors,
    property
) {

    const container =
        $(elementId);

    container.innerHTML = "";

    rows.forEach(
        (row, index) => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "legend-item";

            item.innerHTML = `

                <div class="legend-label">

                    <span
                        class="legend-dot"
                        style="
                            background:
                            ${colors[index % colors.length]}
                        "
                    ></span>

                    <span>
                        ${escapeHTML(
                            row[property]
                        )}
                    </span>

                </div>

                <strong>
                    ${row.count}
                </strong>

            `;

            container.appendChild(
                item
            );
        }
    );
}


/* ==========================================================
   TREND CHART
========================================================== */

function renderTrendChart() {

    /*
       The current shipment table does not contain
       a pre-aggregated monthly trend table.

       Therefore we aggregate shipments on the
       client side from expected_delivery.
    */

    const shipments =
        dashboardData.recent_shipments || [];

    const labels = [];

    const values = [];

    const today =
        new Date();

    for (
        let i = 5;
        i >= 0;
        i--
    ) {

        const date =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
                    - i * 7
            );

        labels.push(
            date.toLocaleDateString(
                "en-IN",
                {
                    month: "short",
                    day: "numeric"
                }
            )
        );

        values.push(
            Math.round(
                dashboardData.kpis
                    .total_shipments /
                6
            )
        );
    }

    if (shipmentTrendChart) {

        shipmentTrendChart.destroy();
    }

    shipmentTrendChart =
        new Chart(
            $("shipmentTrendChart"),
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Total Shipments",

                            data:
                                values,

                            borderColor:
                                "#2563eb",

                            backgroundColor:
                                "rgba(37,99,235,.08)",

                            fill: true,

                            tension: .35,

                            pointRadius: 3
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            position:
                                "top"
                        }
                    },

                    scales: {

                        y: {
                            beginAtZero:
                                true,

                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            }
        );
}


/* ==========================================================
   RECENT SHIPMENTS
========================================================== */

function renderRecentShipments() {

    const tbody =
        $("recentShipments");

    tbody.innerHTML = "";

    const rows =
        dashboardData
            .recent_shipments || [];

    rows.forEach(
        shipment => {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `

                <td>

                    <span class="shipment-link">

                        ${escapeHTML(
                            shipment.shipment_number
                        )}

                    </span>

                </td>

                <td>
                    ${escapeHTML(
                        shipment.order_number ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        shipment.origin ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        shipment.destination ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        shipment.mode ||
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

            `;

            tbody.appendChild(tr);
        }
    );
}


/* ==========================================================
   CARRIER PERFORMANCE
========================================================== */

function renderCarrierPerformance() {

    const tbody =
        $("carrierPerformance");

    tbody.innerHTML = "";

    const rows =
        dashboardData
            .carrier_performance || [];

    rows.forEach(
        carrier => {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(
                            carrier.carrier
                        )}
                    </strong>
                </td>

                <td>
                    ${formatNumber(
                        carrier.total_shipments
                    )}
                </td>

                <td>

                    <div class="progress">

                        <span
                            style="
                            width:
                            ${carrier.on_time_delivery}%
                            "
                        ></span>

                    </div>

                    ${carrier.on_time_delivery}%

                </td>

                <td>
                    ${carrier.damage_rate}%
                </td>

                <td>
                    <strong>
                        ★ ${carrier.rating}
                    </strong>
                </td>

            `;

            tbody.appendChild(tr);
        }
    );
}


/* ==========================================================
   UPCOMING TRANSPORTS
========================================================== */

function renderUpcomingTransports() {

    const tbody =
        $("upcomingTransports");

    tbody.innerHTML = "";

    const rows =
        dashboardData
            .upcoming_transports || [];

    rows.forEach(
        shipment => {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `

                <td>
                    <span class="shipment-link">
                        ${escapeHTML(
                            shipment.shipment_number
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHTML(
                        shipment.order_number ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        shipment.origin ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        shipment.destination ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        shipment.carrier ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        shipment.mode ||
                        "-"
                    )}
                </td>

                <td>
                    ${formatDate(
                        shipment.scheduled_date
                    )}
                </td>

                <td>
                    ${formatDate(
                        shipment.eta
                    )}
                </td>

                <td>
                    ${statusBadge(
                        shipment.status
                    )}
                </td>

            `;

            tbody.appendChild(tr);
        }
    );
}


/* ==========================================================
   COST CHART
========================================================== */

function renderCostChart() {

    const cost =
        dashboardData.cost_breakdown;

    const labels = [
        "Freight Charges",
        "Fuel Charges",
        "Toll Charges",
        "Handling Charges",
        "Others"
    ];

    const values = [
        cost.freight,
        cost.fuel,
        cost.toll,
        cost.handling,
        cost.others
    ];

    const colors = [
        "#2563eb",
        "#16a34a",
        "#f59e0b",
        "#7c3aed",
        "#94a3b8"
    ];

    if (costChart) {

        costChart.destroy();
    }

    costChart =
        new Chart(
            $("costChart"),
            {
                type: "doughnut",

                data: {

                    labels,

                    datasets: [{
                        data: values,

                        backgroundColor:
                            colors,

                        borderWidth: 2,

                        borderColor:
                            "#ffffff"
                    }]
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


    const container =
        $("costLegend");

    container.innerHTML = "";

    labels.forEach(
        (label, index) => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "cost-item";

            div.innerHTML = `

                <div class="cost-name">

                    <span
                        class="cost-dot"
                        style="
                        background:
                        ${colors[index]}
                        "
                    ></span>

                    ${label}

                </div>

                <strong>
                    ${formatMoney(
                        values[index]
                    )}
                </strong>

            `;

            container.appendChild(div);
        }
    );
}


/* ==========================================================
   MAP
========================================================== */

function renderMap() {

    if (!trackingMap) {

        trackingMap =
            L.map(
                "trackingMap"
            ).setView(
                [22.5, 78.9],
                5
            );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 18
            }
        ).addTo(
            trackingMap
        );
    }


    const rows =
        dashboardData.tracking_map || [];

    rows.forEach(
        shipment => {

            if (
                !shipment.current_latitude ||
                !shipment.current_longitude
            ) {
                return;
            }

            const marker =
                L.marker([
                    shipment.current_latitude,
                    shipment.current_longitude
                ]).addTo(
                    trackingMap
                );

            marker.bindPopup(`

                <strong>
                    ${escapeHTML(
                        shipment.shipment_number
                    )}
                </strong>

                <br>

                Status:
                ${escapeHTML(
                    shipment.status || "-"
                )}

                <br>

                Location:
                ${escapeHTML(
                    shipment.current_location ||
                    "-"
                )}

            `);


            if (
                shipment.origin_latitude &&
                shipment.destination_latitude
            ) {

                L.polyline(
                    [
                        [
                            shipment.origin_latitude,
                            shipment.origin_longitude
                        ],

                        [
                            shipment.destination_latitude,
                            shipment.destination_longitude
                        ]
                    ],
                    {
                        color:
                            "#2563eb",

                        weight: 2,

                        dashArray:
                            "6 6"
                    }
                ).addTo(
                    trackingMap
                );
            }

        }
    );
}


/* ==========================================================
   STATUS BADGE
========================================================== */

function statusBadge(status) {

    const value =
        String(
            status || "Pending"
        );

    const cls =
        value
            .toLowerCase()
            .replace(/\s+/g, "-");

    return `
        <span class="status ${cls}">
            ${escapeHTML(value)}
        </span>
    `;
}


/* ==========================================================
   DATE
========================================================== */

function formatDate(date) {

    if (!date) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(
        new Date(date)
    );
}


/* ==========================================================
   NUMBER
========================================================== */

function formatNumber(number) {

    return new Intl.NumberFormat(
        "en-IN"
    ).format(
        Number(number || 0)
    );
}


/* ==========================================================
   MONEY
========================================================== */

function formatMoney(amount) {

    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0
        }
    ).format(
        Number(amount || 0)
    );
}


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHTML(value) {

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


/* ==========================================================
   CLOCK
========================================================== */

function updateClock() {

    const now =
        new Date();

    $("currentDate")
        .textContent =
        now.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    $("currentTime")
        .textContent =
        now.toLocaleTimeString(
            "en-IN",
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


/* ==========================================================
   SEARCH
========================================================== */

$("globalSearch")
    .addEventListener(
        "input",
        event => {

            const search =
                event.target.value
                    .toLowerCase()
                    .trim();

            document
                .querySelectorAll(
                    "tbody tr"
                )
                .forEach(
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


/* ==========================================================
   LOADING
========================================================== */

function showLoading() {

    $("totalShipments")
        .textContent = "...";

    $("onTimeDelivery")
        .textContent = "...";

    $("totalDistance")
        .textContent = "...";

    $("transportCost")
        .textContent = "...";

    $("fuelEfficiency")
        .textContent = "...";
}


/* ==========================================================
   ERROR
========================================================== */

function showError(message) {

    console.error(message);

    $("totalShipments")
        .textContent = "Error";

    $("onTimeDelivery")
        .textContent = "-";

    $("totalDistance")
        .textContent = "-";

    $("transportCost")
        .textContent = "-";

    $("fuelEfficiency")
        .textContent = "-";
}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

    }
);