const API_BASE =
    "http://127.0.0.1:8000";

let inventoryValueChart = null;
let categoryChart = null;


// =========================================================
// API
// =========================================================

async function apiFetch(
    endpoint,
    options = {}
) {

    const response =
        await fetch(
            `${API_BASE}${endpoint}`,
            {
                ...options,
                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );

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


// =========================================================
// FORMAT
// =========================================================

function formatCurrency(value) {

    const number =
        Number(value || 0);

    if (number >= 1000000) {

        return `$${(
            number / 1000000
        ).toFixed(2)}M`;
    }

    if (number >= 1000) {

        return `$${(
            number / 1000
        ).toFixed(0)}K`;
    }

    return `$${number.toFixed(0)}`;
}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString();
}


// =========================================================
// DATE / TIME
// =========================================================

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
                day: "2-digit",
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


// =========================================================
// LOAD DASHBOARD
// =========================================================

async function loadDashboard() {

    try {

        const data =
            await apiFetch(
                "/api/inventory/dashboard"
            );

        console.log(
            "FULL DASHBOARD:",
            data
        );

        console.log(
            "CATEGORIES:",
            data.categories
        );

        renderKPIs(
            data.kpis || {}
        );

        renderHealth(
            data.health || {}
        );

        renderCategories(
            data.categories || []
        );

        renderLocations(
            data.locations || []
        );

        renderLowStock(
            data.low_stock_items || []
        );

        renderMovements(
            data.recent_movements || []
        );

        renderCategoryCards(
            data.category_cards || []
        );

        await loadInventoryChart();

    } catch (error) {

        console.error(
            "Inventory dashboard error:",
            error
        );

        alert(
            "Unable to load inventory dashboard: " +
            error.message
        );
    }
}


// =========================================================
// KPI
// =========================================================

function renderKPIs(kpis) {

    document.getElementById(
        "totalInventoryValue"
    ).textContent =
        formatCurrency(
            kpis.total_inventory_value
        );

    document.getElementById(
        "totalItems"
    ).textContent =
        formatNumber(
            kpis.total_items
        );

    document.getElementById(
        "lowStockItems"
    ).textContent =
        formatNumber(
            kpis.low_stock_items
        );

    document.getElementById(
        "outOfStockItems"
    ).textContent =
        formatNumber(
            kpis.out_of_stock_items
        );

    document.getElementById(
        "inventoryTurnover"
    ).textContent =
        `${kpis.inventory_turnover || 0}x`;
}


// =========================================================
// HEALTH
// =========================================================

function renderHealth(health) {

    document.getElementById(
        "healthPercentage"
    ).textContent =
        `${health.percentage}%`;

    document.getElementById(
        "healthyCount"
    ).textContent =
        formatNumber(
            health.healthy
        );

    document.getElementById(
        "healthLow"
    ).textContent =
        formatNumber(
            health.low_stock
        );

    document.getElementById(
        "atRisk"
    ).textContent =
        formatNumber(
            health.at_risk
        );

    document.getElementById(
        "healthOut"
    ).textContent =
        formatNumber(
            health.out_of_stock
        );
}


/* ==========================================================
   INVENTORY BY CATEGORY
   ========================================================== */

function renderCategories(categories = []) {

    const canvas =
        document.getElementById("categoryChart");

    if (!canvas) {
        console.warn("categoryChart canvas not found.");
        return;
    }

    // Destroy previous chart
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }

    // Make sure categories is an array
    if (!Array.isArray(categories)) {
        console.warn(
            "Categories is not an array:",
            categories
        );
        return;
    }

    if (categories.length === 0) {

        console.log(
            "No inventory category data available."
        );

        const totalElement =
            document.getElementById(
                "categoryTotal"
            );

        if (totalElement) {
            totalElement.textContent = "$0";
        }

        const legend =
            document.getElementById(
                "categoryLegend"
            );

        if (legend) {
            legend.innerHTML = `
                <div class="empty-chart-state">
                    <i class="fa-solid fa-box-open" style="font-size:12px;"></i>
                    <p style="font-size:9px;">No category data available</p>
                </div>
            `;
        }

        return;
    }

    // --------------------------------------------------
    // API fields from FastAPI
    // --------------------------------------------------

    const labels =
        categories.map(
            item =>
                item.category ||
                "Uncategorized"
        );

    const values =
        categories.map(
            item =>
                Number(item.value || 0)
        );

    const itemCounts =
        categories.map(
            item =>
                Number(item.items || 0)
        );

    // --------------------------------------------------
    // Total
    // --------------------------------------------------

    const totalValue =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );

    // --------------------------------------------------
    // Center total
    // --------------------------------------------------

    const totalElement =
        document.getElementById(
            "categoryTotal"
        );

    if (totalElement) {

        totalElement.textContent =
            formatCurrency(totalValue);
    }

    // --------------------------------------------------
    // Doughnut chart
    // --------------------------------------------------

    categoryChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [
                        {
                            data: values,

                            backgroundColor: [
                                "#2878e7",
                                "#18b779",
                                "#ffb21a",
                                "#ff6b35",
                                "#7048ed",
                                "#e63946",
                                "#00a6a6",
                                "#8e44ad"
                            ],

                            borderColor:
                                "#ffffff",

                            borderWidth: 3,

                            hoverOffset: 6
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "62%",

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        const index =
                                            context.dataIndex;

                                        const value =
                                            values[index];

                                        const count =
                                            itemCounts[index];

                                        const percentage =
                                            totalValue > 0
                                                ? (
                                                    value /
                                                    totalValue *
                                                    100
                                                ).toFixed(1)
                                                : 0;

                                        return [
                                            labels[index],
                                            `Value: ${formatCurrency(value)}`,
                                            `Items: ${formatNumber(count)}`,
                                            `Share: ${percentage}%`
                                        ];
                                    }
                            }
                        }
                    }
                }
            }
        );

    // --------------------------------------------------
    // Legend
    // --------------------------------------------------

    renderCategoryLegend(
        categories,
        values,
        totalValue
    );
}


function renderCategoryLegend(
    categories = [],
    values = [],
    totalValue = 0
) {

    const container =
        document.getElementById(
            "categoryLegend"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const colors = [
        "#2878e7",
        "#18b779",
        "#ffb21a",
        "#ff6b35",
        "#7048ed",
        "#e63946",
        "#00a6a6",
        "#8e44ad"
    ];

    categories.forEach(
        (item, index) => {

            const name =
                item.category ||
                "Uncategorized";

            const value =
                Number(
                    item.value || 0
                );

            const percentage =
                totalValue > 0
                    ? (
                        value /
                        totalValue *
                        100
                    ).toFixed(1)
                    : 0;

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "category-legend-item";

            row.innerHTML = `
                <div class="category-legend-left">

                    <span
                        class="category-dot"
                        style="
                            background:
                            ${colors[
                                index %
                                colors.length
                            ]}; font-size:10px;
                        "
                    ></span>

                    <span class="category-name" style="font-size:10px;">
                        ${escapeHtml(name)}
                    </span>

                </div>

                <div class="category-legend-value">

                    <strong style="font-size:12px;">
                        ${percentage}%
                    </strong>

                    <small style="font-size:9px;">
                        ${formatCurrency(value)}
                    </small>

                </div>
            `;

            container.appendChild(row);
        }
    );
}


// =========================================================
// LOCATION TABLE
// =========================================================

function renderLocations(
    locations
) {

    const tbody =
        document.getElementById(
            "locationTable"
        );

    tbody.innerHTML = "";

    if (!locations.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    No location data available
                </td>
            </tr>
        `;

        return;
    }

    locations.forEach(
        location => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    ${location.location}
                </td>

                <td>
                    ${formatCurrency(
                        location.total_value
                    )}
                </td>

                <td>
                    ${formatNumber(
                        location.total_items
                    )}
                </td>

                <td>
                    ${location.low_stock}
                </td>

                <td>
                    ${location.out_of_stock}
                </td>

                <td>
                    --
                </td>

            `;

            tbody.appendChild(row);
        }
    );
}


// =========================================================
// LOW STOCK
// =========================================================

function renderLowStock(
    items
) {

    const tbody =
        document.getElementById(
            "lowStockTable"
        );

    tbody.innerHTML = "";

    if (!items.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    No low stock items
                </td>
            </tr>
        `;

        return;
    }

    items.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    <strong>
                        ${item.item_name}
                    </strong>
                </td>

                <td>
                    ${item.category || "-"}
                </td>

                <td>
                    ${formatNumber(
                        item.current_stock
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.reorder_point
                    )}
                </td>

                <td>
                    <span class="status low">
                        Low Stock
                    </span>
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}


// =========================================================
// CATEGORY CARDS
// =========================================================

function renderCategoryCards(categories = []) {

    const container =
        document.getElementById("categoryCards");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    categories
        .slice(0, 5)
        .forEach(category => {

            const value = Number(
                category.total_value ??
                category.inventory_value ??
                category.value ??
                0
            );

            const items = Number(
                category.total_items ??
                category.item_count ??
                category.items ??
                category.quantity ??
                0
            );

            const percentage = Number(
                category.percentage ?? 0
            );

            const name =
                category.category ||
                category.category_name ||
                category.name ||
                "Unknown";

            const card =
                document.createElement("div");

            card.className =
                "category-card";

            card.innerHTML = `
                <span>
                    ${escapeHtml(name)}
                </span>

                <strong>
                    ${formatCurrency(value)}
                </strong>

                <small>
                    ${formatNumber(items)} Items
                </small>

                <small class="trend">
                    ↑ ${percentage}%
                </small>
            `;

            container.appendChild(card);
        });
}


// =========================================================
// MOVEMENTS
// =========================================================

function renderMovements(
    movements
) {

    const tbody =
        document.getElementById(
            "movementTable"
        );

    tbody.innerHTML = "";

    if (!movements.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    No inventory movements found
                </td>
            </tr>
        `;

        return;
    }

    movements.forEach(
        movement => {

            const date =
                movement.date
                    ? new Date(
                        movement.date
                    ).toLocaleDateString(
                        "en-US",
                        {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                        }
                    )
                    : "-";

            const type =
                movement.type
                    .toLowerCase();

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    ${date}
                </td>

                <td>
                    ${movement.item}
                </td>

                <td>
                    <span
                        class="status ${type}"
                    >
                        ${movement.type}
                    </span>
                </td>

                <td>
                    ${
                        movement.type
                            .toLowerCase()
                            === "issue"
                            ? "-"
                            : "+"
                    }${formatNumber(
                        movement.quantity
                    )}
                </td>

                <td>
                    ${movement.location}
                </td>

            `;

            tbody.appendChild(row);
        }
    );
}


// =========================================================
// INVENTORY VALUE CHART
// =========================================================

async function loadInventoryChart() {

    /*
     * The existing dashboard endpoint does not yet expose
     * historical snapshot data.
     *
     * We therefore use the snapshot endpoint below once
     * InventorySnapshot records are populated.
     */

    try {

        const response =
            await apiFetch(
                "/api/inventory/snapshots?days=30"
            );

        renderInventoryChart(
            response
        );

    } catch (error) {

        console.warn(
            "Snapshot endpoint unavailable:",
            error
        );

        renderInventoryChart([]);
    }
}


function renderInventoryChart(
    snapshots
) {

    const canvas =
        document.getElementById(
            "inventoryValueChart"
        );

    if (inventoryValueChart) {
        inventoryValueChart.destroy();
    }

    const labels =
        snapshots.map(
            item => item.date
        );

    const values =
        snapshots.map(
            item => item.value
        );

    inventoryValueChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {
                    labels: labels,

                    datasets: [
                        {
                            label:
                                "Inventory Value",

                            data: values,

                            borderColor:
                                "#236ce5",

                            backgroundColor:
                                "rgba(35,108,229,.10)",

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
                            display: false
                        }
                    },

                    scales: {

                        y: {
                            beginAtZero: true,

                            ticks: {
                                callback:
                                    function(value) {

                                        return formatCurrency(
                                            value
                                        );
                                    }
                            }
                        }

                    }
                }
            }
        );
}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


// =========================================================
// SEARCH
// =========================================================

let searchTimer = null;

document.addEventListener("DOMContentLoaded", () => {

    // Search
    const searchInput =
        document.getElementById("searchInput");

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                clearTimeout(searchTimer);

                searchTimer = setTimeout(
                    async () => {

                        const value =
                            this.value.trim();

                        if (!value) {
                            loadDashboard();
                            return;
                        }

                        try {

                            const items =
                                await apiFetch(
                                    `/api/inventory/items?search=${encodeURIComponent(value)}`
                                );

                            console.log(
                                "Search results:",
                                items
                            );

                        } catch (error) {

                            console.error(error);
                        }

                    },
                    300
                );
            }
        );
    }


    // Refresh
    const refreshButton =
        document.getElementById("refreshButton");

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function () {

                this.disabled = true;

                this.innerHTML =
                    `<i class="fa-solid fa-spinner fa-spin"></i> Refreshing`;

                await loadDashboard();

                this.disabled = false;

                this.innerHTML =
                    `<i class="fa-solid fa-rotate"></i> Refresh`;
            }
        );
    }


    // Initial dashboard load
    loadDashboard();
});