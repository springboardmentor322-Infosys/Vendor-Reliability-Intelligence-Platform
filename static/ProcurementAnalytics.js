"use strict";

/* ============================================================
   API CONFIGURATION
============================================================ */

const API_BASE = window.location.origin;

let spendTrendChart = null;
let categoryChart = null;
let departmentChart = null;
let poStatusChart = null;
let agingChart = null;
let deliveryChart = null;
let supplierChart = null;
let savingsChart = null;


/* ============================================================
   AUTHENTICATION
============================================================ */

function getToken() {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        "";

    return token;
}


function clearStoredTokens() {

    const keys = [
        "access_token",
        "token",
        "jwt_token"
    ];

    keys.forEach(key => {

        localStorage.removeItem(key);
        sessionStorage.removeItem(key);

    });
}


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };


    /*
     * IMPORTANT:
     * Send JWT token to FastAPI.
     */
    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

    }


    const fetchOptions = {
        ...options,
        headers
    };


    const response =
        await fetch(
            url,
            fetchOptions
        );


    /*
     * Authentication failure
     */
    if (response.status === 401) {

        console.error(
            "API authentication failed:",
            url
        );

        throw new Error(
            "Not authenticated"
        );

    }


    /*
     * Forbidden
     */
    if (response.status === 403) {

        throw new Error(
            "You do not have permission to access this resource."
        );

    }


    /*
     * Other HTTP errors
     */
    if (!response.ok) {

        let message =
            `Request failed (${response.status})`;

        try {

            const data =
                await response.json();

            message =
                data.detail ||
                data.message ||
                message;

        }
        catch (error) {
            // Ignore JSON parsing failure
        }


        throw new Error(message);

    }


    /*
     * Empty response
     */
    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    if (
        !contentType.includes(
            "application/json"
        )
    ) {

        return {};

    }


    return response.json();

}


/*
 * Compatibility wrapper
 */
async function getJSON(
    url,
    options = {}
) {

    return apiFetch(
        url,
        options
    );

}


/* ============================================================
   PAGE INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "Procurement Analytics initializing..."
        );


        setDefaultDates();

        setupEvents();


        /*
         * Load profile independently.
         * A profile failure should not prevent
         * the analytics dashboard from loading.
         */
        await loadProfile();


        /*
         * Load filter data.
         */
        await loadFilterOptions();


        /*
         * Load dashboard.
         */
        await loadDashboard();

    }
);


/* ============================================================
   DEFAULT DATES
============================================================ */

function setDefaultDates() {

    const startDate =
        document.getElementById(
            "startDate"
        );

    const endDate =
        document.getElementById(
            "endDate"
        );


    if (!startDate || !endDate) {
        return;
    }


    /*
     * Current month.
     */
    const today =
        new Date();


    const firstDay =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );


    startDate.value =
        formatInputDate(
            firstDay
        );


    endDate.value =
        formatInputDate(
            today
        );

}


function formatInputDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* ============================================================
   PROFILE
============================================================ */

async function loadProfile() {

    try {

        const data =
            await getJSON(
                `${API_BASE}/api/procurement/profile/me`
            );


        console.log(
            "Manager Profile:",
            data
        );


        /*
         * Some APIs return:
         *
         * {
         *     user: {...}
         * }
         *
         * while others return:
         *
         * {
         *     name: "...",
         *     role: "..."
         * }
         */
        const user =
            data?.user ||
            data;


        loadUser(user);

    }
    catch (error) {

        console.warn(
            "Unable to load manager profile:",
            error
        );

    }

}


function loadUser(user) {

    if (!user) {
        return;
    }


    const name =
        user.name ||
        user.full_name ||
        user.username ||
        "James Anderson";


    const role =
        user.role ||
        user.job_title ||
        "Procurement Manager";


    setText(
        "sidebarName",
        name
    );


    setText(
        "sidebarRole",
        role
    );


    setText(
        "headerName",
        name
    );


    setText(
        "headerRole",
        role
    );

}


function openProfile() {

    window.location.href =
        "/ProcurementProfile";

}


/* ============================================================
   BUILD DASHBOARD QUERY
============================================================ */

function buildQuery() {

    const params =
        new URLSearchParams();


    const startDate =
        document.getElementById(
            "startDate"
        )?.value;


    const endDate =
        document.getElementById(
            "endDate"
        )?.value;


    const department =
        document.getElementById(
            "departmentFilter"
        )?.value;


    const category =
        document.getElementById(
            "categoryFilter"
        )?.value;


    const vendor =
        document.getElementById(
            "vendorFilter"
        )?.value;


    const location =
        document.getElementById(
            "locationFilter"
        )?.value;


    if (startDate) {

        params.set(
            "start_date",
            startDate
        );

    }


    if (endDate) {

        params.set(
            "end_date",
            endDate
        );

    }


    if (
        department &&
        department !== "All"
    ) {

        params.set(
            "department",
            department
        );

    }


    if (
        category &&
        category !== "All"
    ) {

        params.set(
            "category",
            category
        );

    }


    if (
        vendor &&
        vendor !== "All"
    ) {

        params.set(
            "vendor_id",
            vendor
        );

    }


    if (
        location &&
        location !== "All"
    ) {

        params.set(
            "location",
            location
        );

    }


    return params.toString();

}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadDashboard() {

    try {

        showLoading();


        const query =
            buildQuery();


        const url =
            `${API_BASE}/api/procurement/analytics/dashboard` +
            (query ? `?${query}` : "");


        console.log(
            "Loading analytics:",
            url
        );


        const data =
            await apiFetch(
                url
            );


        console.log(
            "Analytics response:",
            data
        );


        /*
         * Protect against incomplete API response.
         */
        if (!data) {

            throw new Error(
                "Analytics API returned an empty response."
            );

        }


        renderKPIs(
            data.kpis || {}
        );


        renderSpendTrend(
            data.spend_trend || {
                labels: [],
                actual: [],
                budget: []
            }
        );


        renderCategory(
            data.spend_by_category || []
        );


        renderDepartments(
            data.spend_by_department || []
        );


        renderVendors(
            data.top_vendors || []
        );


        renderPOStatus(
            data.po_status || []
        );


        renderInvoiceAging(
            data.invoice_aging || {}
        );


        renderDelivery(
            data.delivery_trend || {
                labels: [],
                values: []
            },
            data.kpis?.on_time_delivery || 0
        );


        renderSupplierDistribution(
            data.supplier_distribution || [],
            data.kpis?.supplier_performance || 0
        );


        renderSavings(
            data.savings_trend || {
                labels: [],
                values: []
            },
            data.kpis?.savings_ytd || 0
        );


        hideLoading();

    }
    catch (error) {

        console.error(
            "Analytics loading error:",
            error
        );


        hideLoading();


        /*
         * Do not redirect automatically on 401.
         * This makes debugging much easier.
         */
        showError(
            error.message
        );

    }

}


/* ============================================================
   KPI
============================================================ */

function renderKPIs(kpi) {

    setText(
        "totalSpend",
        money(
            kpi.total_spend
        )
    );


    setText(
        "totalPOs",
        Number(
            kpi.total_pos || 0
        ).toLocaleString()
    );


    setText(
        "avgPO",
        money(
            kpi.avg_po_value
        )
    );


    setText(
        "savings",
        money(
            kpi.savings_ytd
        )
    );


    setText(
        "onTimeDelivery",
        `${Number(
            kpi.on_time_delivery || 0
        ).toFixed(1)}%`
    );


    setText(
        "supplierPerformance",
        Number(
            kpi.supplier_performance || 0
        ).toFixed(2)
    );


    setText(
        "spendChange",
        percent(
            kpi.spend_change
        )
    );


    setText(
        "poChange",
        percent(
            kpi.po_change
        )
    );


    setText(
        "avgPOChange",
        percent(
            kpi.avg_po_change
        )
    );


    setText(
        "savingsChange",
        percent(
            kpi.savings_change
        )
    );


    setText(
        "deliveryChange",
        percent(
            kpi.delivery_change
        )
    );


    setText(
        "supplierChange",
        Number(
            kpi.supplier_change || 0
        ).toFixed(2)
    );

}


/* ============================================================
   SPEND TREND
============================================================ */

function renderSpendTrend(data) {

    const canvas =
        document.getElementById(
            "spendTrendChart"
        );


    if (!canvas) {
        return;
    }


    if (spendTrendChart) {

        spendTrendChart.destroy();

        spendTrendChart = null;

    }


    const labels =
        Array.isArray(data.labels)
            ? data.labels
            : [];


    const actual =
        Array.isArray(data.actual)
            ? data.actual
            : [];


    const budget =
        Array.isArray(data.budget)
            ? data.budget
            : [];


    spendTrendChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Actual Spend",

                            data:
                                actual,

                            borderColor:
                                "#4d20e7",

                            backgroundColor:
                                "rgba(77,32,231,.10)",

                            borderWidth: 2,

                            tension: .35,

                            fill: true,

                            pointRadius: 2
                        },

                        {
                            label:
                                "Budget",

                            data:
                                budget,

                            borderColor:
                                "#15986b",

                            backgroundColor:
                                "rgba(21,152,107,.05)",

                            borderWidth: 2,

                            tension: .35,

                            fill: true,

                            pointRadius: 2
                        }

                    ]

                },

                options:
                    chartOptions(true)

            }
        );

}


/* ============================================================
   CATEGORY
============================================================ */

function renderCategory(rows) {

    rows =
        Array.isArray(rows)
            ? rows
            : [];


    const labels =
        rows.map(
            row =>
                row.category || "Unknown"
        );


    const values =
        rows.map(
            row =>
                Number(
                    row.amount || 0
                )
        );


    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    setText(
        "categoryTotal",
        money(total)
    );


    const canvas =
        document.getElementById(
            "categoryChart"
        );


    if (!canvas) {
        return;
    }


    if (categoryChart) {

        categoryChart.destroy();

        categoryChart = null;

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

                            backgroundColor:
                                getChartColors(
                                    values.length
                                ),

                            borderWidth: 2,

                            borderColor: "#fff"
                        }

                    ]

                },

                options:
                    donutOptions()

            }
        );


    renderLegend(
        "categoryLegend",

        rows.map(
            row => ({

                name:
                    row.category ||
                    "Unknown",

                value:
                    money(
                        row.amount
                    )

            })
        )
    );

}


/* ============================================================
   DEPARTMENT
============================================================ */

function renderDepartments(rows) {

    rows =
        Array.isArray(rows)
            ? rows
            : [];


    const container =
        document.getElementById(
            "departmentList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!rows.length) {

        container.innerHTML =
            `<div class="empty-state" style="font-size:9px;">
                No department data available
             </div>`;

        return;
    }


    const max =
        Math.max(
            ...rows.map(
                row =>
                    Number(
                        row.amount || 0
                    )
            ),
            1
        );


    rows
        .slice(0, 6)
        .forEach(
            (row, index) => {

                const amount =
                    Number(
                        row.amount || 0
                    );


                const percentage =
                    (
                        amount / max
                    ) * 100;


                const element =
                    document.createElement(
                        "div"
                    );


                element.className =
                    "department-row";


                element.innerHTML = `

                    <span>
                        ${escapeHtml(
                            row.department ||
                            "Unknown"
                        )}
                    </span>

                    <div class="department-bar">

                        <span
                            style="
                                width:${percentage}%;
                                background:${getChartColor(index)};
                            "
                        ></span>

                    </div>

                    <strong>
                        ${money(amount)}
                    </strong>

                `;


                container.appendChild(
                    element
                );

            }
        );

}


/* ============================================================
   TOP VENDORS
============================================================ */

function renderVendors(rows) {

    rows =
        Array.isArray(rows)
            ? rows
            : [];


    const container =
        document.getElementById(
            "vendorRows"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!rows.length) {

        container.innerHTML =
            `<div class="empty-state">
                No vendor data available
             </div>`;

        return;
    }


    rows.forEach(
        row => {

            const vendorName =
                row.vendor_name ||
                row.vendor ||
                "Unknown Vendor";


            const initials =
                getInitials(
                    vendorName
                );


            const amount =
                Number(
                    row.amount ||
                    row.spend ||
                    0
                );


            const percentage =
                Number(
                    row.percentage ||
                    row.percent ||
                    0
                );


            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "vendor-row";


            element.innerHTML = `

                <div class="vendor-name">

                    <div class="vendor-avatar">
                        ${escapeHtml(
                            initials
                        )}
                    </div>

                    <span>
                        ${escapeHtml(
                            vendorName
                        )}
                    </span>

                </div>

                <strong>
                    ${fullMoney(amount)}
                </strong>

                <span>
                    ${percentage.toFixed(1)}%
                </span>

            `;


            container.appendChild(
                element
            );

        }
    );

}


/* ============================================================
   PO STATUS
============================================================ */

function renderPOStatus(rows) {

    rows =
        Array.isArray(rows)
            ? rows
            : [];


    const labels =
        rows.map(
            row =>
                row.status ||
                "Unknown"
        );


    const values =
        rows.map(
            row =>
                Number(
                    row.count || 0
                )
        );


    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    setText(
        "poTotal",
        total.toLocaleString()
    );


    const canvas =
        document.getElementById(
            "poStatusChart"
        );


    if (!canvas) {
        return;
    }


    if (poStatusChart) {

        poStatusChart.destroy();

        poStatusChart = null;

    }


    poStatusChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels,

                    datasets: [

                        {
                            data: values,

                            backgroundColor:
                                getChartColors(
                                    values.length
                                ),

                            borderWidth: 2,

                            borderColor: "#fff"
                        }

                    ]

                },

                options:
                    donutOptions()

            }
        );


    renderLegend(
        "poLegend",

        rows.map(
            row => ({

                name:
                    row.status ||
                    "Unknown",

                value:
                    `${row.count || 0} (${Number(
                        row.percentage || 0
                    ).toFixed(1)}%)`

            })
        )
    );

}


/* ============================================================
   INVOICE AGING
============================================================ */

function renderInvoiceAging(data) {

    data =
        data || {};


    const canvas =
        document.getElementById(
            "agingChart"
        );


    if (!canvas) {
        return;
    }


    if (agingChart) {

        agingChart.destroy();

        agingChart = null;

    }


    agingChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: [

                        "0 - 30 Days",
                        "31 - 60 Days",
                        "61 - 90 Days",
                        "90+ Days"

                    ],

                    datasets: [

                        {

                            label:
                                "Invoices",

                            data: [

                                Number(
                                    data.zero_30 || 0
                                ),

                                Number(
                                    data.thirty_one_60 || 0
                                ),

                                Number(
                                    data.sixty_one_90 || 0
                                ),

                                Number(
                                    data.ninety_plus || 0
                                )

                            ],

                            borderRadius: 4

                        }

                    ]

                },

                options:
                    chartOptions(false)

            }
        );

}


/* ============================================================
   DELIVERY
============================================================ */

function renderDelivery(
    data,
    score
) {

    data =
        data || {};


    setText(
        "deliveryScore",
        `${Number(
            score || 0
        ).toFixed(1)}%`
    );


    const canvas =
        document.getElementById(
            "deliveryChart"
        );


    if (!canvas) {
        return;
    }


    if (deliveryChart) {

        deliveryChart.destroy();

        deliveryChart = null;

    }


    deliveryChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels:
                        data.labels || [],

                    datasets: [

                        {

                            label:
                                "On-Time Delivery",

                            data:
                                data.values || [],

                            borderColor:
                                "#139765",

                            backgroundColor:
                                "rgba(19,151,101,.10)",

                            fill: true,

                            tension: .35,

                            borderWidth: 2,

                            pointRadius: 2

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        }

                    },

                    scales: {

                        y: {

                            min: 0,

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

                    }

                }

            }
        );

}


/* ============================================================
   SUPPLIER PERFORMANCE
============================================================ */

function renderSupplierDistribution(
    rows,
    average
) {

    rows =
        Array.isArray(rows)
            ? rows
            : [];


    setText(
        "supplierScore",
        Number(
            average || 0
        ).toFixed(2)
    );


    const labels =
        rows.map(
            row =>
                `${row.rating || 0} Star`
        );


    const values =
        rows.map(
            row =>
                Number(
                    row.count || 0
                )
        );


    const canvas =
        document.getElementById(
            "supplierChart"
        );


    if (!canvas) {
        return;
    }


    if (supplierChart) {

        supplierChart.destroy();

        supplierChart = null;

    }


    supplierChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels,

                    datasets: [

                        {

                            data: values,

                            backgroundColor:
                                getChartColors(
                                    values.length
                                ),

                            borderWidth: 2,

                            borderColor: "#fff"

                        }

                    ]

                },

                options:
                    donutOptions()

            }
        );


    renderLegend(
        "supplierLegend",

        rows.map(
            row => ({

                name:
                    `${row.rating || 0} Star`,

                value:
                    `${row.count || 0} (${Number(
                        row.percentage || 0
                    ).toFixed(1)}%)`

            })
        )
    );

}


/* ============================================================
   SAVINGS
============================================================ */

function renderSavings(
    data,
    total
) {

    data =
        data || {};


    setText(
        "savingTotal",
        money(total)
    );


    const canvas =
        document.getElementById(
            "savingsChart"
        );


    if (!canvas) {
        return;
    }


    if (savingsChart) {

        savingsChart.destroy();

        savingsChart = null;

    }


    savingsChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels:
                        data.labels || [],

                    datasets: [

                        {

                            label:
                                "Savings",

                            data:
                                data.values || [],

                            borderColor:
                                "#16864b",

                            backgroundColor:
                                "rgba(22,134,75,.12)",

                            fill: true,

                            tension: .35,

                            borderWidth: 2,

                            pointRadius: 2

                        }

                    ]

                },

                options:
                    chartOptions(false)

            }
        );

}


/* ============================================================
   FILTER OPTIONS
============================================================ */

async function loadFilterOptions() {

    try {

        console.log(
            "Loading analytics filter options..."
        );


        const results =
            await Promise.allSettled([

                apiFetch(
                    `${API_BASE}/api/procurement-requests/departments`
                ),

                apiFetch(
                    `${API_BASE}/api/purchase-orders/vendors`
                ),

                loadCategories(),

                loadLocations()

            ]);


        const departments =
            results[0].status === "fulfilled"
                ? normalizeArray(
                    results[0].value
                )
                : [];


        const vendors =
            results[1].status === "fulfilled"
                ? normalizeArray(
                    results[1].value
                )
                : [];


        const categories =
            results[2].status === "fulfilled"
                ? normalizeArray(
                    results[2].value
                )
                : [];


        const locations =
            results[3].status === "fulfilled"
                ? normalizeArray(
                    results[3].value
                )
                : [];


        populateSelect(
            "departmentFilter",
            departments,
            "All Departments"
        );


        populateVendorSelect(
            vendors
        );


        populateSelect(
            "categoryFilter",
            categories,
            "All Categories"
        );


        populateSelect(
            "locationFilter",
            locations,
            "All Locations"
        );


        console.log(
            "Analytics filters loaded."
        );

    }
    catch (error) {

        console.warn(
            "Filter loading warning:",
            error
        );

    }

}


/* ============================================================
   CATEGORIES
============================================================ */

async function loadCategories() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/purchase-orders/items`
            );


        if (!Array.isArray(data)) {

            throw new Error(
                "Invalid items response"
            );

        }


        return [
            ...new Set(

                data
                    .map(
                        item =>
                            item.category
                    )
                    .filter(
                        category =>
                            category &&
                            String(
                                category
                            ).trim()
                    )
                    .map(
                        category =>
                            String(
                                category
                            ).trim()
                    )

            )
        ];

    }
    catch (error) {

        console.warn(
            "Purchase-order items endpoint failed. Trying analytics categories endpoint.",
            error
        );


        try {

            const data =
                await apiFetch(
                    `${API_BASE}/api/procurement/analytics/categories`
                );


            if (!Array.isArray(data)) {
                return [];
            }


            return [
                ...new Set(

                    data
                        .map(
                            item =>
                                typeof item === "string"
                                    ? item
                                    : item.category
                        )
                        .filter(Boolean)

                )
            ];

        }
        catch (fallbackError) {

            console.warn(
                "Analytics categories endpoint also failed:",
                fallbackError
            );

            return [];

        }

    }

}


/* ============================================================
   LOCATIONS
============================================================ */

async function loadLocations() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/warehouses`
            );


        if (!Array.isArray(data)) {

            throw new Error(
                "Invalid warehouse response"
            );

        }


        return [
            ...new Set(

                data
                    .map(
                        item =>
                            item.location
                    )
                    .filter(
                        location =>
                            location &&
                            String(
                                location
                            ).trim()
                    )
                    .map(
                        location =>
                            String(
                                location
                            ).trim()
                    )

            )
        ];

    }
    catch (error) {

        console.warn(
            "Warehouse endpoint failed. Trying analytics locations endpoint.",
            error
        );


        try {

            const data =
                await apiFetch(
                    `${API_BASE}/api/procurement/analytics/locations`
                );


            if (!Array.isArray(data)) {
                return [];
            }


            return [
                ...new Set(

                    data
                        .map(
                            item =>
                                typeof item === "string"
                                    ? item
                                    : item.location
                        )
                        .filter(Boolean)

                )
            ];

        }
        catch (fallbackError) {

            console.warn(
                "Analytics locations endpoint also failed:",
                fallbackError
            );

            return [];

        }

    }

}


/* ============================================================
   SELECT HELPER
============================================================ */

/*
 * IMPORTANT FIX
 *
 * This function accepts either:
 *
 *     populateSelect("departmentFilter", values)
 *
 * OR:
 *
 *     populateSelect(
 *         document.getElementById("departmentFilter"),
 *         values
 *     )
 *
 * This prevents:
 *
 *     select.appendChild is not a function
 */

function populateSelect(
    selectOrId,
    values = [],
    defaultText = "All"
) {

    let select;


    if (
        typeof selectOrId ===
        "string"
    ) {

        select =
            document.getElementById(
                selectOrId
            );

    }
    else {

        select =
            selectOrId;

    }


    if (
        !select ||
        typeof select.appendChild !==
            "function"
    ) {

        console.warn(
            "populateSelect: invalid select element",
            selectOrId
        );

        return;

    }


    select.innerHTML = "";


    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value =
        "All";


    defaultOption.textContent =
        defaultText;


    defaultOption.selected =
        true;


    select.appendChild(
        defaultOption
    );


    /*
     * Normalize API responses.
     */
    values =
        normalizeArray(
            values
        );


    values.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(value);


            option.textContent =
                String(value);


            select.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   VENDOR SELECT
============================================================ */

function populateVendorSelect(
    vendors = []
) {

    const select =
        document.getElementById(
            "vendorFilter"
        );


    if (!select) {
        return;
    }


    /*
     * Keep "All Vendors".
     */
    select.innerHTML =
        `<option value="All">
            All Vendors
         </option>`;


    vendors =
        normalizeArray(
            vendors
        );


    vendors.forEach(
        vendor => {

            /*
             * Support different backend
             * response formats.
             */
            const vendorId =
                vendor.vendor_id ??
                vendor.id ??
                "";


            const vendorName =
                vendor.vendor_name ??
                vendor.name ??
                vendor.company_name ??
                `Vendor ${vendorId}`;


            if (!vendorId) {
                return;
            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(
                    vendorId
                );


            option.textContent =
                String(
                    vendorName
                );


            select.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   NORMALIZE API ARRAYS
============================================================ */

function normalizeArray(data) {

    /*
     * Direct array.
     */
    if (Array.isArray(data)) {
        return data;
    }


    /*
     * Common FastAPI response shapes:
     *
     * { items: [...] }
     * { data: [...] }
     * { results: [...] }
     * { departments: [...] }
     * { vendors: [...] }
     * { categories: [...] }
     * { locations: [...] }
     */

    if (
        data &&
        Array.isArray(data.items)
    ) {
        return data.items;
    }


    if (
        data &&
        Array.isArray(data.data)
    ) {
        return data.data;
    }


    if (
        data &&
        Array.isArray(data.results)
    ) {
        return data.results;
    }


    if (
        data &&
        Array.isArray(data.departments)
    ) {
        return data.departments;
    }


    if (
        data &&
        Array.isArray(data.vendors)
    ) {
        return data.vendors;
    }


    if (
        data &&
        Array.isArray(data.categories)
    ) {
        return data.categories;
    }


    if (
        data &&
        Array.isArray(data.locations)
    ) {
        return data.locations;
    }


    return [];

}


/* ============================================================
   FILTER / REFRESH EVENTS
============================================================ */

function setupEvents() {

    const refreshButton =
        document.getElementById(
            "refreshButton"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadDashboard
        );

    }


    const resetButton =
        document.getElementById(
            "resetFilters"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetFilters
        );

    }


    [
        "startDate",
        "endDate",
        "departmentFilter",
        "categoryFilter",
        "vendorFilter",
        "locationFilter"

    ].forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {
                return;
            }


            element.addEventListener(
                "change",
                debounce(
                    loadDashboard,
                    250
                )
            );

        }
    );


    /*
     * Analytics tabs.
     *
     * The supplied HTML does not have
     * data-tab attributes, so only handle
     * the visual active state here.
     */
    document
        .querySelectorAll(
            ".analytics-tabs .tab"
        )
        .forEach(
            tab => {

                tab.addEventListener(
                    "click",
                    function () {

                        document
                            .querySelectorAll(
                                ".analytics-tabs .tab"
                            )
                            .forEach(
                                item =>
                                    item.classList
                                        .remove(
                                            "active"
                                        )
                            );


                        this.classList.add(
                            "active"
                        );

                    }
                );

            }
        );

}


/* ============================================================
   RESET FILTERS
============================================================ */

function resetFilters() {

    const department =
        document.getElementById(
            "departmentFilter"
        );


    const category =
        document.getElementById(
            "categoryFilter"
        );


    const vendor =
        document.getElementById(
            "vendorFilter"
        );


    const location =
        document.getElementById(
            "locationFilter"
        );


    if (department) {
        department.value = "All";
    }


    if (category) {
        category.value = "All";
    }


    if (vendor) {
        vendor.value = "All";
    }


    if (location) {
        location.value = "All";
    }


    setDefaultDates();


    loadDashboard();

}


/* ============================================================
   CHART OPTIONS
============================================================ */

function chartOptions(
    showLegend = false
) {

    return {

        responsive: true,

        maintainAspectRatio: false,

        interaction: {

            intersect: false,

            mode: "index"

        },

        plugins: {

            legend: {

                display:
                    showLegend,

                labels: {

                    font: {
                        size: 9
                    }

                }

            },

            tooltip: {

                callbacks: {

                    label:
                        context =>

                            `${context.dataset.label || ""}: ${money(
                                context.raw
                            )}`

                }

            }

        },

        scales: {

            y: {

                beginAtZero: true,

                grid: {

                    color:
                        "#edf0f7"

                },

                ticks: {

                    font: {
                        size: 8
                    },

                    callback:
                        value =>
                            compactMoney(
                                value
                            )

                }

            },

            x: {

                grid: {

                    display: false

                },

                ticks: {

                    font: {
                        size: 8
                    }

                }

            }

        }

    };

}


/* ============================================================
   DONUT OPTIONS
============================================================ */

function donutOptions() {

    return {

        responsive: true,

        maintainAspectRatio: false,

        cutout: "68%",

        plugins: {

            legend: {

                display: false

            }

        }

    };

}


/* ============================================================
   LEGEND
============================================================ */

function renderLegend(
    elementId,
    rows
) {

    const container =
        document.getElementById(
            elementId
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!Array.isArray(rows)) {
        return;
    }


    rows.forEach(
        (row, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "legend-row";


            item.innerHTML = `

                <div class="legend-name">

                    <span
                        class="legend-color"
                        style="
                            background:${getChartColor(index)};
                        "
                    ></span>

                    <span>
                        ${escapeHtml(
                            row.name
                        )}
                    </span>

                </div>

                <span class="legend-value">
                    ${escapeHtml(
                        String(
                            row.value
                        )
                    )}
                </span>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* ============================================================
   COLORS
============================================================ */

function getChartColor(index) {

    const colors = [

        "#4d20e7",
        "#1682e8",
        "#15986b",
        "#f97316",
        "#ef3340",
        "#8b5cf6",
        "#0ea5e9",
        "#10b981"

    ];


    return colors[
        index % colors.length
    ];

}


function getChartColors(count) {

    const colors = [

        "#4d20e7",
        "#1682e8",
        "#15986b",
        "#f97316",
        "#ef3340",
        "#8b5cf6",
        "#0ea5e9",
        "#10b981"

    ];


    return Array.from(
        {
            length:
                Math.max(
                    count,
                    1
                )
        },
        (_, index) =>
            colors[
                index %
                colors.length
            ]
    );

}


/* ============================================================
   LOADING
============================================================ */

function showLoading() {

    document.body.classList.add(
        "loading"
    );

}


function hideLoading() {

    document.body.classList.remove(
        "loading"
    );

}


/* ============================================================
   ERROR
============================================================ */

function showError(message) {

    console.error(
        "Analytics:",
        message
    );


    /*
     * Do not repeatedly show alerts
     * for every filter endpoint.
     */
    if (
        message ===
        "Not authenticated"
    ) {

        console.warn(
            "Analytics requires a valid JWT access token."
        );


        /*
         * If your application has a dedicated
         * manager login route, you can redirect here.
         *
         * It is commented out deliberately while
         * debugging authentication.
         */
        // window.location.href = "/login";

        return;

    }


    alert(
        "Unable to load Analytics data.\n\n" +
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
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


function money(value) {

    const number =
        Number(
            value || 0
        );


    return new Intl.NumberFormat(
        "en-US",
        {

            style:
                "currency",

            currency:
                "USD",

            maximumFractionDigits:
                0

        }
    ).format(
        number
    );

}


function fullMoney(value) {

    return "$" +
        Number(
            value || 0
        ).toLocaleString(
            "en-US",
            {
                maximumFractionDigits: 0
            }
        );

}


function compactMoney(value) {

    const number =
        Number(
            value || 0
        );


    if (
        Math.abs(number) >=
        1000000
    ) {

        return "$" +
            (
                number /
                1000000
            ).toFixed(1) +
            "M";

    }


    if (
        Math.abs(number) >=
        1000
    ) {

        return "$" +
            (
                number /
                1000
            ).toFixed(0) +
            "K";

    }


    return "$" +
        number.toLocaleString(
            "en-US"
        );

}


function percent(value) {

    const number =
        Number(
            value || 0
        );


    return (
        number > 0
            ? "+"
            : ""
    ) +
    number.toFixed(1) +
    "%";

}


function getInitials(name) {

    return String(
        name || ""
    )
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(
            part =>
                part
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");

}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /[&<>"']/g,
            char => ({

                "&":
                    "&amp;",

                "<":
                    "&lt;",

                ">":
                    "&gt;",

                '"':
                    "&quot;",

                "'":
                    "&#039;"

            })[char]
        );

}


/* ============================================================
   DEBOUNCE
============================================================ */

function debounce(
    callback,
    delay
) {

    let timer;


    return function () {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => {
                    callback();
                },
                delay
            );

    };

}