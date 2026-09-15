const API_BASE = "http://127.0.0.1:8000";

let performanceChart;
let statusChart;
let spendChart;

let suppliers = [];

let currentPage = 1;

const pageSize = 5;


/* ==========================================================
   API HELPER
========================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        }
    );

    if (!response.ok) {

        let message = "API request failed";

        try {
            const data = await response.json();
            message = data.detail || message;
        } catch {}

        throw new Error(message);
    }

    return response.json();
}


/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEvents();

        updateDateTime();

        setInterval(
            updateDateTime,
            30000
        );

        await loadDashboard();

        await loadSuppliers();

    }
);


/* ==========================================================
   LOAD DASHBOARD
========================================================== */

async function loadDashboard() {

    try {

        const data =
            await apiFetch(
                "/api/suppliers/dashboard"
            );

        updateKPIs(data.kpis);

        populateFilters(data.filters);

        renderPerformanceChart(
            data.performance
        );

        renderStatusChart(
            data.status
        );

        renderTopSuppliers(
            data.top_suppliers
        );

        renderRegions(
            data.regions
        );

        renderSpendChart(
            data.spend
        );

        renderAssessments(
            data.assessments
        );

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

        alert(
            "Unable to load supplier dashboard. " +
            "Make sure FastAPI and PostgreSQL are running."
        );

    }

}


/* ==========================================================
   LOAD SUPPLIERS
========================================================== */

async function loadSuppliers() {

    try {

        const params =
            new URLSearchParams();

        const search =
            document
                .getElementById("directorySearch")
                .value
                .trim();

        const category =
            document
                .getElementById("directoryCategory")
                .value;

        if (search) {
            params.set(
                "search",
                search
            );
        }

        if (category) {
            params.set(
                "category",
                category
            );
        }

        params.set(
            "page",
            currentPage
        );

        params.set(
            "page_size",
            pageSize
        );

        const data =
            await apiFetch(
                `/api/suppliers?${params.toString()}`
            );

        suppliers =
            data.suppliers || [];

        renderSupplierTable(
            data
        );

    } catch (error) {

        console.error(
            "Supplier loading error:",
            error
        );

    }

}


/* ==========================================================
   KPI
========================================================== */

function updateKPIs(kpis) {

    document.getElementById(
        "totalSuppliers"
    ).textContent =
        kpis.total;

    document.getElementById(
        "activeSuppliers"
    ).textContent =
        kpis.active;

    document.getElementById(
        "riskSuppliers"
    ).textContent =
        kpis.at_risk;

    document.getElementById(
        "newSuppliers"
    ).textContent =
        kpis.new_this_month;

    document.getElementById(
        "totalSpend"
    ).textContent =
        formatCurrency(
            kpis.total_spend
        );

    document.getElementById(
        "totalTrend"
    ).textContent =
        `${kpis.total_trend}%`;

    document.getElementById(
        "activeTrend"
    ).textContent =
        `${kpis.active_trend}%`;

    document.getElementById(
        "riskTrend"
    ).textContent =
        `${kpis.risk_trend}%`;

    document.getElementById(
        "newTrend"
    ).textContent =
        `${kpis.new_trend}%`;

    document.getElementById(
        "spendTrend"
    ).textContent =
        `${kpis.spend_trend}%`;

}


/* ==========================================================
   FILTERS
========================================================== */

function populateFilters(filters) {

    fillSelect(
        "categoryFilter",
        filters.categories
    );

    fillSelect(
        "directoryCategory",
        filters.categories
    );

    const yearSelect =
        document.getElementById(
            "yearFilter"
        );

    yearSelect.innerHTML =
        `<option value="">This Year</option>`;

    filters.years.forEach(
        year => {

            const option =
                document.createElement(
                    "option"
                );

            option.value = year;
            option.textContent = year;

            yearSelect.appendChild(
                option
            );

        }
    );

}


function fillSelect(
    id,
    values
) {

    const select =
        document.getElementById(id);

    const defaultText =
        select.options[0]?.text ||
        "All";

    select.innerHTML =
        `<option value="">${defaultText}</option>`;

    values.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );

            option.value = value;
            option.textContent = value;

            select.appendChild(
                option
            );

        }
    );

}


/* ==========================================================
   PERFORMANCE CHART
========================================================== */

function renderPerformanceChart(data) {

    const ctx =
        document
            .getElementById(
                "performanceChart"
            )
            .getContext("2d");

    if (performanceChart) {
        performanceChart.destroy();
    }

    performanceChart =
        new Chart(
            ctx,
            {
                type: "line",

                data: {

                    labels:
                        data.labels,

                    datasets: [

                        {
                            label:
                                "On-Time Delivery (%)",

                            data:
                                data.on_time,

                            borderColor:
                                "#1769e8",

                            backgroundColor:
                                "transparent",

                            tension: .35,

                            pointRadius: 3
                        },

                        {
                            label:
                                "Quality Score (%)",

                            data:
                                data.quality,

                            borderColor:
                                "#12ad67",

                            backgroundColor:
                                "transparent",

                            tension: .35,

                            pointRadius: 3
                        },

                        {
                            label:
                                "Compliance (%)",

                            data:
                                data.compliance,

                            borderColor:
                                "#6933db",

                            backgroundColor:
                                "transparent",

                            tension: .35,

                            pointRadius: 3
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
                                    size: 9
                                }
                            }
                        },

                        x: {
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


/* ==========================================================
   STATUS CHART
========================================================== */

function renderStatusChart(data) {

    const ctx =
        document
            .getElementById(
                "statusChart"
            )
            .getContext("2d");

    if (statusChart) {
        statusChart.destroy();
    }

    statusChart =
        new Chart(
            ctx,
            {
                type: "doughnut",

                data: {

                    labels:
                        data.map(
                            x => x.status
                        ),

                    datasets: [
                        {
                            data:
                                data.map(
                                    x => x.count
                                ),

                            backgroundColor: [
                                "#12ad67",
                                "#f59e0b",
                                "#e53935",
                                "#9ca7b7"
                            ],

                            borderWidth: 0
                        }
                    ]

                },

                options: {

                    cutout: "72%",

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            display: false
                        }
                    }

                }

            }
        );


    const total =
        data.reduce(
            (sum, item) =>
                sum + item.count,
            0
        );

    document.getElementById(
        "statusTotal"
    ).textContent = total;


    const legend =
        document.getElementById(
            "statusLegend"
        );

    legend.innerHTML = "";

    data.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "status-row";

            row.innerHTML = `

                <span class="status-name">

                    <span
                        class="status-dot"
                        style="
                            background:
                            ${[
                                "#12ad67",
                                "#f59e0b",
                                "#e53935",
                                "#9ca7b7"
                            ][index]};
                        "
                    ></span>

                    ${escapeHtml(item.status)}

                </span>

                <span>
                    ${item.count}
                    (${item.percentage}%)
                </span>

            `;

            legend.appendChild(row);

        }
    );

}


/* ==========================================================
   TOP SUPPLIERS
========================================================== */

function renderTopSuppliers(data) {

    const container =
        document.getElementById(
            "topSuppliers"
        );

    container.innerHTML = "";

    data.forEach(
        supplier => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "top-supplier";

            const trendClass =
                supplier.trend >= 0
                    ? "trend-up"
                    : "trend-down";

            const trendSymbol =
                supplier.trend >= 0
                    ? "↑"
                    : "↓";

            item.innerHTML = `

                <div class="supplier-mini-icon">
                    <i class="fa-solid fa-building"></i>
                </div>

                <div>
                    <strong>
                        ${escapeHtml(
                            supplier.vendor_name
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            supplier.category || "-"
                        )}
                    </small>
                </div>

                <div class="rating">

                    <strong>
                        ${supplier.score.toFixed(1)}
                    </strong>

                    <div class="stars">
                        ${renderStars(
                            supplier.score
                        )}
                    </div>

                </div>

                <div class="${trendClass}">
                    ${trendSymbol}
                    ${Math.abs(
                        supplier.trend
                    ).toFixed(1)}
                </div>

            `;

            container.appendChild(item);

        }
    );

}


/* ==========================================================
   REGION DISTRIBUTION
========================================================== */

function renderRegions(data) {

    const container =
        document.getElementById(
            "regionDistribution"
        );

    container.innerHTML = "";

    const total =
        data.reduce(
            (sum, item) =>
                sum + item.count,
            0
        );

    data.forEach(
        item => {

            const percentage =
                total
                    ? (
                        item.count /
                        total *
                        100
                    ).toFixed(1)
                    : 0;

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "region-item";

            row.innerHTML = `

                <span>
                    ${escapeHtml(
                        item.region
                    )}
                </span>

                <span>
                    ${item.count}
                    (${percentage}%)
                </span>

            `;

            container.appendChild(row);

        }
    );

}


/* ==========================================================
   SPEND CHART
========================================================== */

function renderSpendChart(data) {

    const ctx =
        document
            .getElementById(
                "spendChart"
            )
            .getContext("2d");

    if (spendChart) {
        spendChart.destroy();
    }

    const colors = [
        "#1769e8",
        "#12ad67",
        "#f59e0b",
        "#6933db",
        "#13a6b7"
    ];

    spendChart =
        new Chart(
            ctx,
            {
                type: "doughnut",

                data: {

                    labels:
                        data.map(
                            x => x.category
                        ),

                    datasets: [
                        {
                            data:
                                data.map(
                                    x => x.amount
                                ),

                            backgroundColor:
                                colors,

                            borderWidth: 2,

                            borderColor: "#fff"
                        }
                    ]

                },

                options: {

                    cutout: "68%",

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            display: false
                        }
                    }

                }

            }
        );


    const total =
        data.reduce(
            (sum, item) =>
                sum + Number(item.amount),
            0
        );

    document.getElementById(
        "spendCenter"
    ).textContent =
        formatCurrency(total);


    const legend =
        document.getElementById(
            "spendLegend"
        );

    legend.innerHTML = "";

    data.forEach(
        (item, index) => {

            const percentage =
                total
                    ? (
                        item.amount /
                        total *
                        100
                    ).toFixed(1)
                    : 0;

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "spend-item";

            div.innerHTML = `

                <div>

                    <span class="spend-name">

                        <span
                            class="spend-dot"
                            style="
                                background:
                                ${colors[index % colors.length]};
                            "
                        ></span>

                        ${escapeHtml(
                            item.category
                        )}

                    </span>

                    <span>
                        ${formatCurrency(
                            item.amount
                        )}
                    </span>

                </div>

                <small>
                    ${percentage}%
                </small>

            `;

            legend.appendChild(div);

        }
    );

}


/* ==========================================================
   ASSESSMENTS
========================================================== */

function renderAssessments(data) {

    const tbody =
        document.getElementById(
            "assessmentBody"
        );

    tbody.innerHTML = "";

    data.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );

            const statusClass =
                item.status
                    .toLowerCase()
                    .includes("excellent")
                    ? "excellent"
                    : "good";

            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        item.vendor_name
                    )}
                </td>

                <td>
                    ${formatDate(
                        item.assessment_date
                    )}
                </td>

                <td>
                    ${Number(
                        item.score
                    ).toFixed(1)}
                </td>

                <td>
                    <span
                        class="
                            assessment-status
                            ${statusClass}
                        "
                    >
                        ${escapeHtml(
                            item.status
                        )}
                    </span>
                </td>

            `;

            tbody.appendChild(row);

        }
    );

}


/* ==========================================================
   SUPPLIER TABLE
========================================================== */

function renderSupplierTable(data) {

    const tbody =
        document.getElementById(
            "supplierTableBody"
        );

    tbody.innerHTML = "";

    data.suppliers.forEach(
        supplier => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            supplier.vendor_name
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        supplier.category || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        supplier.region ||
                        supplier.country ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        supplier.contact_person ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        supplier.email
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        supplier.phone || "-"
                    )}
                </td>

                <td>

                    ${supplier.on_time_delivery}% 

                    <span class="delivery-progress">

                        <span
                            style="
                                width:
                                ${Math.min(
                                    supplier.on_time_delivery,
                                    100
                                )}%
                            "
                        ></span>

                    </span>

                </td>

                <td class="quality">

                    ${Number(
                        supplier.quality_score
                    ).toFixed(1)}

                    ★

                </td>

                <td>

                    <span class="status-badge">
                        ${escapeHtml(
                            supplier.status
                        )}
                    </span>

                </td>

                <td>

                    <strong>
                        ${Number(
                            supplier.performance_score
                        ).toFixed(1)}
                    </strong>

                </td>

                <td>

                    <div class="action-buttons">

                        <button
                            title="View"
                            onclick="
                                viewSupplier(
                                    '${supplier.vendor_id}'
                                )
                            "
                        >
                            <i class="fa-regular fa-eye"></i>
                        </button>

                        <button
                            title="Edit"
                            onclick="
                                editSupplier(
                                    '${supplier.vendor_id}'
                                )
                            "
                        >
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>

                        <button
                            title="Delete"
                            onclick="
                                deleteSupplier(
                                    '${supplier.vendor_id}'
                                )
                            "
                        >
                            <i class="fa-solid fa-ellipsis"></i>
                        </button>

                    </div>

                </td>

            `;

            tbody.appendChild(row);

        }
    );


    document.getElementById(
        "tableSummary"
    ).textContent =
        `Showing ${
            data.suppliers.length
        } of ${
            data.total
        } suppliers`;

    renderPagination(
        data.total
    );

}


/* ==========================================================
   PAGINATION
========================================================== */

function renderPagination(total) {

    const container =
        document.getElementById(
            "pagination"
        );

    container.innerHTML = "";

    const pages =
        Math.ceil(
            total / pageSize
        );

    if (pages <= 1) {
        return;
    }

    for (
        let page = 1;
        page <= pages;
        page++
    ) {

        if (
            page > 5 &&
            page !== pages
        ) {

            if (
                !container.querySelector(
                    ".ellipsis"
                )
            ) {

                const span =
                    document.createElement(
                        "span"
                    );

                span.className =
                    "ellipsis";

                span.textContent =
                    "...";

                container.appendChild(
                    span
                );

            }

            continue;
        }

        const button =
            document.createElement(
                "button"
            );

        button.className =
            "page-button";

        if (
            page === currentPage
        ) {
            button.classList.add(
                "active"
            );
        }

        button.textContent =
            page;

        button.onclick =
            async () => {

                currentPage =
                    page;

                await loadSuppliers();

            };

        container.appendChild(
            button
        );

    }

}


/* ==========================================================
   EVENTS
========================================================== */

function setupEvents() {

    const getElement = (id) => {

        const element = document.getElementById(id);

        if (!element) {
            console.error(
                `❌ HTML element not found: #${id}`
            );
        }

        return element;
    };


    const globalSearch =
        getElement("globalSearch");

    const directorySearch =
        getElement("directorySearch");

    const directoryCategory =
        getElement("directoryCategory");

    const categoryFilter =
        getElement("categoryFilter");

    const yearFilter =
        getElement("yearFilter");

    const addSupplierButton =
        getElement("addSupplierButton");

    const closeModal =
        getElement("closeModal");

    const cancelModal =
        getElement("cancelModal");

    const supplierModal =
        getElement("supplierModal");

    const supplierForm =
        getElement("supplierForm");

    const exportButton =
        getElement("exportButton");


    if (globalSearch) {

        globalSearch.addEventListener(
            "input",
            debounce(
                async event => {

                    if (directorySearch) {

                        directorySearch.value =
                            event.target.value;

                    }

                    currentPage = 1;

                    await loadSuppliers();

                },
                350
            )
        );

    }


    if (directorySearch) {

        directorySearch.addEventListener(
            "input",
            debounce(
                async () => {

                    currentPage = 1;

                    await loadSuppliers();

                },
                350
            )
        );

    }


    if (directoryCategory) {

        directoryCategory.addEventListener(
            "change",
            async () => {

                currentPage = 1;

                await loadSuppliers();

            }
        );

    }

    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            async () => {

                await loadDashboard();

            }
        );

    }


    if (yearFilter) {

        yearFilter.addEventListener(
            "change",
            async () => {

                await loadDashboard();

            }
        );

    }


    if (addSupplierButton) {

        addSupplierButton.addEventListener(
            "click",
            openModal
        );

    }


    if (closeModal) {

        closeModal.addEventListener(
            "click",
            closeModal
        );

    }


    if (cancelModal) {

        cancelModal.addEventListener(
            "click",
            closeModal
        );

    }


    if (supplierModal) {

        supplierModal.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "supplierModal"
                ) {

                    closeModal();

                }

            }
        );

    }


    if (supplierForm) {

        supplierForm.addEventListener(
            "submit",
            addSupplier
        );

    }


    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportSuppliers
        );

    }

}


/* ==========================================================
   ADD SUPPLIER
========================================================== */

async function addSupplier(event) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    const payload =
        Object.fromEntries(
            formData.entries()
        );

    try {

        await apiFetch(
            "/api/suppliers",
            {
                method: "POST",
                body: JSON.stringify(
                    payload
                )
            }
        );

        alert(
            "Supplier added successfully."
        );

        form.reset();

        closeModal();

        currentPage = 1;

        await loadDashboard();

        await loadSuppliers();

    } catch (error) {

        alert(
            error.message
        );

    }

}


/* ==========================================================
   SUPPLIER ACTIONS
========================================================== */

async function viewSupplier(
    vendorId
) {

    try {

        const supplier =
            await apiFetch(
                `/api/suppliers/${vendorId}`
            );

        alert(
            `Supplier: ${
                supplier.vendor_name
            }\n\n` +

            `Category: ${
                supplier.category || "-"
            }\n` +

            `Region: ${
                supplier.region || "-"
            }\n` +

            `Email: ${
                supplier.email
            }\n` +

            `Phone: ${
                supplier.phone || "-"
            }\n` +

            `Performance: ${
                supplier.performance_score
            }`
        );

    } catch (error) {

        alert(
            error.message
        );

    }

}


function editSupplier(vendorId) {

    alert(
        `Edit supplier ${vendorId} can be connected to your supplier edit form.`
    );

}


async function deleteSupplier(vendorId) {

    if (
        !confirm(
            "Delete this supplier?"
        )
    ) {
        return;
    }

    try {

        await apiFetch(
            `/api/suppliers/${vendorId}`,
            {
                method: "DELETE"
            }
        );

        await loadDashboard();

        await loadSuppliers();

    } catch (error) {

        alert(
            error.message
        );

    }

}


/* ==========================================================
   EXPORT
========================================================== */

async function exportSuppliers() {

    try {

        const data =
            await apiFetch(
                "/api/suppliers/export"
            );

        if (
            !data.suppliers.length
        ) {
            alert(
                "No suppliers to export."
            );

            return;
        }

        const headers =
            Object.keys(
                data.suppliers[0]
            );

        const csv = [

            headers.join(","),

            ...data.suppliers.map(
                row =>
                    headers.map(
                        key =>
                            `"${String(
                                row[key] ?? ""
                            ).replace(
                                /"/g,
                                '""'
                            )}"`
                    ).join(",")
            )

        ].join("\n");

        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            "suppliers.csv";

        link.click();

        URL.revokeObjectURL(
            url
        );

    } catch (error) {

        alert(
            error.message
        );

    }

}


/* ==========================================================
   MODAL
========================================================== */

function openModal() {

    document
        .getElementById(
            "supplierModal"
        )
        .classList.add(
            "show"
        );

}


function closeModal() {

    document
        .getElementById(
            "supplierModal"
        )
        .classList.remove(
            "show"
        );

}


/* ==========================================================
   UTILITIES
========================================================== */

function formatCurrency(
    value
) {

    const amount =
        Number(value || 0);

    if (
        Math.abs(amount) >=
        1000000
    ) {

        return `$${(
            amount / 1000000
        ).toFixed(2)}M`;

    }

    if (
        Math.abs(amount) >=
        1000
    ) {

        return `$${(
            amount / 1000
        ).toFixed(1)}K`;

    }

    return `$${amount.toFixed(2)}`;

}


function formatDate(
    value
) {

    if (!value) {
        return "-";
    }

    return new Date(
        value
    ).toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}


function renderStars(
    score
) {

    const rounded =
        Math.round(score);

    return "★".repeat(
        Math.min(5, rounded)
    );

}


function debounce(
    callback,
    delay
) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer =
            setTimeout(
                () => callback(...args),
                delay
            );

    };

}


function escapeHtml(
    value
) {

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


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


/* ==========================================================
   DATE / TIME
========================================================== */

function updateDateTime() {

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