/* ==========================================================
   PROCUREMENT OVERVIEW
   VendorIQ
========================================================== */

const API = "http://127.0.0.1:8000";

let spendChart = null;


/* ==========================================================
   AUTHENTICATION
========================================================== */

function getAuthToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        null
    );
}


/* ==========================================================
   API REQUEST
========================================================== */

async function apiFetch(url, options = {}) {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        null;


    // ========================================================
    // BUILD URL
    // ========================================================

    const requestUrl =
        url.startsWith("http://") ||
        url.startsWith("https://")
            ? url
            : `${API}${url}`;


    console.log(
        "API REQUEST:",
        requestUrl
    );


    console.log(
        "AUTH TOKEN EXISTS:",
        !!token
    );


    // ========================================================
    // HEADERS
    // ========================================================

    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    // ========================================================
    // AUTHORIZATION
    // ========================================================

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

    }


    // ========================================================
    // FETCH
    // ========================================================

    const response =
        await fetch(
            requestUrl,
            {
                ...options,
                headers
            }
        );


    // ========================================================
    // 401
    // ========================================================

    if (response.status === 401) {

        console.error(
            "401 Unauthorized"
        );

        throw new Error(
            "Could not validate credentials"
        );
    }


    // ========================================================
    // OTHER ERRORS
    // ========================================================

    if (!response.ok) {

        const text =
            await response.text();

        console.error(
            `API ${response.status}:`,
            text
        );

        throw new Error(
            text ||
            `API ${response.status}`
        );
    }


    // ========================================================
    // JSON
    // ========================================================

    return await response.json();
}


/* ==========================================================
   MONEY FORMAT
========================================================== */

function money(value) {

    value =
        Number(value || 0);


    return "$" +
        value.toLocaleString(
            "en-US",
            {
                maximumFractionDigits: 0
            }
        );

}


/* ==========================================================
   COMPACT MONEY
========================================================== */

function compactMoney(value) {

    value =
        Number(value || 0);


    if (value >= 1000000000) {

        return "$" +
            (value / 1000000000)
                .toFixed(2) +
            "B";

    }


    if (value >= 1000000) {

        return "$" +
            (value / 1000000)
                .toFixed(2) +
            "M";

    }


    if (value >= 1000) {

        return "$" +
            (value / 1000)
                .toFixed(1) +
            "K";

    }


    return money(value);

}


/* ==========================================================
   NUMBER FORMAT
========================================================== */

function number(value) {

    return Number(value || 0)
        .toLocaleString("en-US");

}


/* ==========================================================
   PERCENTAGE
========================================================== */

function percentage(value) {

    return Number(value || 0)
        .toFixed(1) + "%";

}


/* ==========================================================
   DATE FORMAT
========================================================== */

function formatDate(value) {

    if (!value) {

        return "-";

    }


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {

        return value;

    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* ==========================================================
   HTML ESCAPE
========================================================== */

function escapeHTML(value) {

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


/* ==========================================================
   STATUS CLASS
========================================================== */

function getStatusClass(status) {

    return String(status || "")
        .trim()
        .replace(/\s+/g, "");

}


/* ==========================================================
   GET DATE FILTERS
========================================================== */

function getDateFilters() {

    const fromDate =
        document.getElementById(
            "fromDate"
        )?.value;


    const toDate =
        document.getElementById(
            "toDate"
        )?.value;


    return {
        fromDate,
        toDate
    };

}


/* ==========================================================
   LOAD PROCUREMENT DATA
========================================================== */

async function loadProcurementOverview() {

    try {

        showLoadingState();


        const {
            fromDate,
            toDate
        } = getDateFilters();


        if (!fromDate || !toDate) {

            throw new Error(
                "Please select both dates."
            );

        }


        const url =
            `${API}/api/procurement/overview?from_date=${fromDate}&to_date=${toDate}`;

        console.log(
            "Loading Procurement Overview:",
            url
        );

        const data =
            await apiFetch(url);


        console.log(
            "Procurement Overview data:",
            data
        );


        renderDashboard(data);


        hideLoadingState();

    }

    catch (error) {

        console.error(
            "Procurement Overview loading error:",
            error
        );


        hideLoadingState();


        showError(
            error.message
        );

    }

}


/* ==========================================================
   RENDER COMPLETE DASHBOARD
========================================================== */

function renderDashboard(data) {

    if (!data) {

        return;

    }


    renderKPIs(
        data.kpis || {}
    );


    renderCategoryChart(
        data.categories || []
    );


    renderSpendTrend(
        data.spend_trend || []
    );


    renderBusinessUnits(
        data.business_units || []
    );


    renderPOStatus(
        data.status_distribution || []
    );


    renderRecentPurchaseOrders(
        data.recent_orders || []
    );


    renderTopVendors(
        data.top_vendors || []
    );


    renderContracts(
        data.active_contracts_list || []
    );

}


/* ==========================================================
   KPI CARDS
========================================================== */

function renderKPIs(kpis) {


    const totalSpend =
        document.getElementById(
            "totalSpend"
        );


    const lastSpend =
        document.getElementById(
            "lastSpend"
        );


    const totalPO =
        document.getElementById(
            "totalPO"
        );


    const lastPO =
        document.getElementById(
            "lastPO"
        );


    const activeContracts =
        document.getElementById(
            "activeContracts"
        );


    const lastContracts =
        document.getElementById(
            "lastContracts"
        );


    const avgPO =
        document.getElementById(
            "avgPO"
        );


    const savings =
        document.getElementById(
            "savings"
        );


    const onTime =
        document.getElementById(
            "onTime"
        );


    const spendChange =
        document.getElementById(
            "spendChange"
        );


    if (totalSpend) {

        totalSpend.textContent =
            compactMoney(
                kpis.total_spend
            );

    }


    if (lastSpend) {

        lastSpend.textContent =
            compactMoney(
                kpis.last_year_spend
            );

    }


    if (totalPO) {

        totalPO.textContent =
            number(
                kpis.total_purchase_orders
            );

    }


    if (lastPO) {

        lastPO.textContent =
            number(
                kpis.last_year_purchase_orders
            );

    }


    if (activeContracts) {

        activeContracts.textContent =
            number(
                kpis.active_contracts
            );

    }


    if (lastContracts) {

        lastContracts.textContent =
            number(
                kpis.last_year_contracts
            );

    }


    if (avgPO) {

        avgPO.textContent =
            money(
                kpis.average_po_value
            );

    }


    if (savings) {

        savings.textContent =
            compactMoney(
                kpis.savings
            );

    }


    if (onTime) {

        onTime.textContent =
            percentage(
                kpis.on_time_delivery
            );

    }


    if (spendChange) {

        const current =
            Number(
                kpis.total_spend || 0
            );


        const previous =
            Number(
                kpis.last_year_spend || 0
            );


        if (previous > 0) {

            const change =
                (
                    (current - previous) /
                    previous
                ) * 100;


            spendChange.textContent =
                `${change >= 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}%`;

        }

    }


    const donutTotal =
        document.getElementById(
            "donutTotal"
        );


    if (donutTotal) {

        donutTotal.textContent =
            compactMoney(
                kpis.total_spend
            );

    }


    const statusTotal =
        document.getElementById(
            "statusTotal"
        );


    if (statusTotal) {

        statusTotal.textContent =
            number(
                kpis.total_purchase_orders
            );

    }

}


/* ==========================================================
   CATEGORY DONUT
========================================================== */

function renderCategoryChart(categories) {

    const donut =
        document.getElementById(
            "categoryDonut"
        );


    const legend =
        document.getElementById(
            "categoryLegend"
        );


    if (!donut || !legend) {

        return;

    }


    if (!categories.length) {

        legend.innerHTML =
            `<div>No category data available.</div>`;

        return;

    }


    const colors = [
        "#5e27ed",
        "#4778ec",
        "#36b57a",
        "#ff9d0a",
        "#c97924",
        "#bfc2ca"
    ];


    let current =
        0;


    const segments =
        categories.map(
            (item, index) => {

                const percent =
                    Number(
                        item.percent || 0
                    );


                const start =
                    current;


                const end =
                    current + percent;


                current =
                    end;


                return {
                    color:
                        colors[
                            index %
                            colors.length
                        ],

                    start,

                    end
                };

            }
        );


    donut.style.background =
        `conic-gradient(${
            segments.map(
                segment =>
                    `${segment.color} ${segment.start}% ${segment.end}%`
            ).join(", ")
        })`;


    legend.innerHTML =
        categories.map(
            (item, index) => {

                const color =
                    colors[
                        index %
                        colors.length
                    ];


                return `

                    <div>

                        <span>

                            <i
                                class="dot"
                                style="
                                    background:${color};
                                "
                            ></i>

                            ${escapeHTML(
                                item.category
                            )}

                        </span>


                        <b>

                            ${compactMoney(
                                item.amount
                            )}

                            <small>
                                (${percentage(
                                    item.percent
                                )})
                            </small>

                        </b>

                    </div>

                `;

            }
        ).join("");

}


/* ==========================================================
   SPEND TREND CHART
========================================================== */

function renderSpendTrend(items) {

    const canvas =
        document.getElementById(
            "spendChart"
        );


    if (!canvas) {

        return;

    }


    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;

    }


    if (spendChart) {

        spendChart.destroy();

        spendChart =
            null;

    }


    const labels =
        items.map(
            item =>
                item.month
        );


    const values =
        items.map(
            item =>
                Number(
                    item.amount || 0
                )
        );


    spendChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Spend (USD)",

                            data:
                                values,

                            borderColor:
                                "#5e27ed",

                            backgroundColor:
                                "rgba(94,39,237,0.10)",

                            borderWidth:
                                2,

                            fill:
                                true,

                            tension:
                                0.35,

                            pointRadius:
                                3,

                            pointHoverRadius:
                                5

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        intersect:
                            false,

                        mode:
                            "index"

                    },


                    plugins: {

                        legend: {

                            display:
                                true,

                            labels: {

                                boxWidth:
                                    18,

                                font: {

                                    size:
                                        9

                                }

                            }

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        return (
                                            " Spend: " +
                                            money(
                                                context.raw
                                            )
                                        );

                                    }

                            }

                        }

                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                font: {

                                    size:
                                        8

                                },

                                callback:
                                    function(
                                        value
                                    ) {

                                        return compactMoney(
                                            value
                                        );

                                    }

                            }

                        },


                        x: {

                            ticks: {

                                font: {

                                    size:
                                        8

                                }

                            }

                        }

                    }

                }

            }
        );

}


/* ==========================================================
   BUSINESS UNIT BARS
========================================================== */

function renderBusinessUnits(units) {

    const container =
        document.getElementById(
            "businessUnits"
        );


    if (!container) {

        return;

    }


    if (!units.length) {

        container.innerHTML =
            `<div>No business unit data available.</div>`;

        return;

    }


    const colors = [
        "#5e27ed",
        "#4778ec",
        "#36b57a",
        "#ff9d0a",
        "#52bec9"
    ];


    const max =
        Math.max(
            ...units.map(
                item =>
                    Number(
                        item.amount || 0
                    )
            ),
            1
        );


    container.innerHTML =
        units.map(
            (item, index) => {

                const amount =
                    Number(
                        item.amount || 0
                    );


                const width =
                    (
                        amount /
                        max
                    ) * 100;


                return `

                    <div class="bar-row">

                        <span>
                            ${escapeHTML(
                                item.unit
                            )}
                        </span>


                        <div class="bar-bg">

                            <div
                                class="bar-fill"
                                style="
                                    width:${width}%;
                                    background:${colors[
                                        index %
                                        colors.length
                                    ]};
                                "
                            ></div>

                        </div>


                        <b>
                            ${compactMoney(
                                amount
                            )}
                        </b>

                    </div>

                `;

            }
        ).join("");

}


/* ==========================================================
   PO STATUS DISTRIBUTION
========================================================== */

function renderPOStatus(statuses) {

    const donut =
        document.getElementById(
            "statusDonut"
        );


    const legend =
        document.getElementById(
            "statusLegend"
        );


    if (!donut || !legend) {

        return;

    }


    if (!statuses.length) {

        legend.innerHTML =
            `<div>No PO status data available.</div>`;

        return;

    }


    const colors = [
        "#31b875",
        "#4a7ff0",
        "#ff9f0c",
        "#6d45ed",
        "#ed5360"
    ];


    let start =
        0;


    const segments =
        statuses.map(
            (item, index) => {

                const percent =
                    Number(
                        item.percent || 0
                    );


                const segment = {

                    color:
                        colors[
                            index %
                            colors.length
                        ],

                    start,

                    end:
                        start + percent

                };


                start =
                    segment.end;


                return segment;

            }
        );


    donut.style.background =
        `conic-gradient(${
            segments.map(
                segment =>
                    `${segment.color} ${segment.start}% ${segment.end}%`
            ).join(", ")
        })`;


    legend.innerHTML =
        statuses.map(
            (item, index) => {

                const color =
                    colors[
                        index %
                        colors.length
                    ];


                return `

                    <div>

                        <span>

                            <i
                                class="dot"
                                style="
                                    background:${color};
                                "
                            ></i>

                            ${escapeHTML(
                                item.status
                            )}

                        </span>


                        <b>

                            ${number(
                                item.count
                            )}

                            <small>
                                (${percentage(
                                    item.percent
                                )})
                            </small>

                        </b>

                    </div>

                `;

            }
        ).join("");

}


/* ==========================================================
   RECENT PURCHASE ORDERS
========================================================== */

function renderRecentPurchaseOrders(orders) {

    const table =
        document.getElementById(
            "poTable"
        );


    if (!table) {

        return;

    }


    if (!orders.length) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;"
                >
                    No purchase orders found.
                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        orders.map(
            order => {

                const status =
                    escapeHTML(
                        order.status ||
                        "Pending"
                    );


                return `

                    <tr>

                        <td>
                            ${escapeHTML(
                                order.po_number
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                order.vendor
                            )}
                        </td>


                        <td>
                            ${money(
                                order.amount
                            )}
                        </td>


                        <td>

                            <span
                                class="
                                    pill
                                    ${getStatusClass(
                                        order.status
                                    )}
                                "
                            >
                                ${status}
                            </span>

                        </td>


                        <td>
                            ${formatDate(
                                order.order_date
                            )}
                        </td>


                        <td>
                            ${formatDate(
                                order.delivery_date
                            )}
                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* ==========================================================
   TOP SPENDING VENDORS
========================================================== */

function renderTopVendors(vendors) {

    const table =
        document.getElementById(
            "vendorTable"
        );


    if (!table) {

        return;

    }


    if (!vendors.length) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="3"
                    style="text-align:center;"
                >
                    No vendor spending data available.
                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        vendors.map(
            vendor => {

                return `

                    <tr>

                        <td>

                            <span
                                style="
                                    color:#6a2ce8;
                                    margin-right:5px;
                                "
                            >
                                <i
                                    class="
                                        fa-regular
                                        fa-building
                                    "
                                ></i>
                            </span>

                            ${escapeHTML(
                                vendor.vendor
                            )}

                        </td>


                        <td>
                            ${compactMoney(
                                vendor.spend
                            )}
                        </td>


                        <td>
                            ${percentage(
                                vendor.percent
                            )}
                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* ==========================================================
   ACTIVE CONTRACTS
========================================================== */

function renderContracts(contracts) {

    const table =
        document.getElementById(
            "contractTable"
        );


    if (!table) {

        return;

    }


    if (!contracts.length) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="text-align:center;"
                >
                    No active contracts found.
                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        contracts.map(
            contract => {

                const score =
                    Number(
                        contract.performance_score ||
                        0
                    );


                const utilization =
                    Number(
                        contract.utilized_percent ||
                        0
                    );


                const lowClass =
                    score < 80
                        ? "low"
                        : "";


                return `

                    <tr>

                        <td>
                            ${escapeHTML(
                                contract.contract_number
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                contract.vendor
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                contract.category ||
                                "-"
                            )}
                        </td>


                        <td>
                            ${formatDate(
                                contract.start_date
                            )}
                        </td>


                        <td>
                            ${formatDate(
                                contract.end_date
                            )}
                        </td>


                        <td>
                            ${money(
                                contract.contract_value
                            )}
                        </td>


                        <td>

                            ${money(
                                contract.utilized
                            )}

                            <span
                                style="
                                    color:#777f9b;
                                "
                            >
                                (${utilization.toFixed(1)}%)
                            </span>

                        </td>


                        <td>

                            <span
                                class="
                                    pill
                                    ${getStatusClass(
                                        contract.status
                                    )}
                                "
                            >
                                ${escapeHTML(
                                    contract.status ||
                                    "Active"
                                )}
                            </span>

                        </td>


                        <td>

                            <div
                                class="
                                    score
                                    ${lowClass}
                                "
                            >

                                <i>

                                    <b
                                        style="
                                            width:${Math.min(
                                                Math.max(
                                                    score,
                                                    0
                                                ),
                                                100
                                            )}%;
                                        "
                                    ></b>

                                </i>


                                ${score.toFixed(0)}%

                            </div>

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* ==========================================================
   LOADING STATE
========================================================== */

function showLoadingState() {

    const refreshBtn =
        document.getElementById(
            "refreshBtn"
        );


    if (!refreshBtn) {

        return;

    }


    refreshBtn.disabled =
        true;


    refreshBtn.innerHTML = `

        <i
            class="
                fa-solid
                fa-spinner
                fa-spin
            "
        ></i>

        Loading...

    `;

}


/* ==========================================================
   HIDE LOADING STATE
========================================================== */

function hideLoadingState() {

    const refreshBtn =
        document.getElementById(
            "refreshBtn"
        );


    if (!refreshBtn) {

        return;

    }


    refreshBtn.disabled =
        false;


    refreshBtn.innerHTML = `

        <i
            class="fa-solid fa-rotate"
        ></i>

        Refresh

    `;

}


/* ==========================================================
   ERROR MESSAGE
========================================================== */

function showError(message) {

    console.error(
        message
    );


    const old =
        document.getElementById(
            "procurementError"
        );


    if (old) {

        old.remove();

    }


    const error =
        document.createElement(
            "div"
        );


    error.id =
        "procurementError";


    error.style.cssText = `

        position:fixed;

        top:20px;

        right:20px;

        z-index:9999;

        max-width:420px;

        padding:14px 18px;

        border-radius:8px;

        background:#fff0f1;

        border:1px solid #ffb7c0;

        color:#c9283d;

        box-shadow:
            0 5px 20px
            rgba(0,0,0,.12);

        font-size:12px;

    `;


    error.innerHTML = `

        <strong>
            Procurement Overview Error
        </strong>

        <br>

        ${escapeHTML(
            message
        )}

    `;


    document.body.appendChild(
        error
    );


    setTimeout(
        () => {

            error.remove();

        },
        7000
    );

}


/* ==========================================================
   GLOBAL SEARCH
========================================================== */

function setupGlobalSearch() {

    const search =
        document.getElementById(
            "globalSearch"
        );


    if (!search) {

        return;

    }


    search.addEventListener(
        "input",
        function () {

            const query =
                this.value
                    .trim()
                    .toLowerCase();


            if (!query) {

                clearSearchHighlight();

                return;

            }


            searchDashboard(
                query
            );

        }
    );

}


/* ==========================================================
   SEARCH DASHBOARD
========================================================== */

function searchDashboard(query) {

    const rows =
        document.querySelectorAll(
            "tbody tr"
        );


    rows.forEach(
        row => {

            const text =
                row.textContent
                    .toLowerCase();


            row.style.display =
                text.includes(query)
                    ? ""
                    : "none";

        }
    );

}


/* ==========================================================
   CLEAR SEARCH
========================================================== */

function clearSearchHighlight() {

    const rows =
        document.querySelectorAll(
            "tbody tr"
        );


    rows.forEach(
        row => {

            row.style.display =
                "";

        }
    );

}


/* ==========================================================
   REFRESH BUTTON
========================================================== */

function setupRefresh() {

    const button =
        document.getElementById(
            "refreshBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        async function () {

            await loadProcurementOverview();

        }
    );

}


/* ==========================================================
   DATE FILTER
========================================================== */

function setupDateFilters() {

    const fromDate =
        document.getElementById(
            "fromDate"
        );


    const toDate =
        document.getElementById(
            "toDate"
        );


    if (fromDate) {

        fromDate.addEventListener(
            "change",
            loadProcurementOverview
        );

    }


    if (toDate) {

        toDate.addEventListener(
            "change",
            loadProcurementOverview
        );

    }

}


/* ==========================================================
   HEADER USER
========================================================== */

async function loadCurrentUser() {

    const name =
        document.getElementById(
            "headerName"
        );


    if (!name) {

        return;

    }


    try {

        const token =
            getAuthToken();


        if (!token) {

            return;

        }


        /*
         * Change this endpoint if your existing
         * project uses another profile endpoint.
         */

        const response =
            await apiFetch(
                `${API}/api/auth/me`
            );


        if (response) {

            name.textContent =
                response.full_name ||
                response.name ||
                response.username ||
                response.email ||
                "Admin User";

        }

    }

    catch (error) {

        /*
         * Do not stop the dashboard if the
         * profile endpoint is unavailable.
         */

        console.warn(
            "Current user could not be loaded:",
            error.message
        );

    }

}


/* ==========================================================
   NOTIFICATION COUNT
========================================================== */

async function loadNotificationCount() {

    const badge =
        document.getElementById(
            "notificationCount"
        );


    if (!badge) {

        return;

    }


    try {

        /*
         * Change this URL only if your existing
         * notification API has another route.
         */

        const data =
            await apiFetch(
                `/api/procurementoverview/notifications/count`
            );


        const count =
            Number(
                data.count ??
                data.unread_count ??
                0
            );


        badge.textContent =
            count;

    }

    catch (error) {

        /*
         * Keep the dashboard working if the
         * notification API is not available.
         */

        console.warn(
            "Notification count could not be loaded:",
            error.message
        );

    }

}


function openAdminProfile() {

    window.location.href =
        "/admin/profile";

}


function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {

        element.textContent =
            value ?? "";

    }
}


function updateHeader(user) {

    const name =
        user.name || "Admin User";

    const email =
        user.email || "";

    const role =
        user.role || "Administrator";


    setText(
        "headerName",
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


async function loadAdminProfile() {

    try {

        const data =
            await apiFetch(
                "/api/auth/me"
            );

        console.log(
            "Current user:",
            data
        );

        const user =
            data.user ||
            data.admin ||
            data.current_user ||
            data;

        updateHeader(user);

    }
    catch (error) {

        console.error(
            "Current user could not be loaded:",
            error
        );

    }
}


/* ==========================================================
   INITIALIZE DASHBOARD
========================================================== */

async function initializeProcurementOverview() {

    console.log(
        "Initializing Procurement Overview..."
    );

    try {

        await loadAdminProfile();

        await Promise.allSettled([
            loadProcurementOverview(),
            loadNotificationCount()
        ]);

    }
    catch (error) {

        console.error(
            "Procurement Overview initialization error:",
            error
        );

    }
}


/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeProcurementOverview
);