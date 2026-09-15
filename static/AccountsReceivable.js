/* =========================================================
   VendorIQ - Accounts Receivable Dashboard
   ========================================================= */

const API_BASE = "http://127.0.0.1:8000";

let trendChart = null;
let agingChart = null;

let currentPage = 1;
const PAGE_SIZE = 5;

let searchTimer = null;


/* =========================================================
   QUICK PANEL ROUTES
   ========================================================= */

const QUICK_ROUTES = {
    createInvoice: "/AccountsReceivable/CreateInvoice",
    recordPayment: "/AccountsPayable/RecordPayment",
    customerStatement: "/AccountsReceivable/CustomerStatements",
    overdue: "/AccountsReceivable/OverdueInvoices",
    agingReport: "/AccountsReceivable/Agingreport"
};


/* =========================================================
   AUTH
   ========================================================= */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        null
    );
}


/* =========================================================
   API FETCH
   ========================================================= */

async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        typeof options.body !== "string"
    ) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    /*
       IMPORTANT:
       Support both:

       apiFetch("/api/...")
       apiFetch("http://127.0.0.1:8000/api/...")

       This prevents:

       http://127.0.0.1:8000http://127.0.0.1:8000/...
    */

    const finalUrl =
        /^https?:\/\//i.test(url)
            ? url
            : `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;

    console.log("API Request:", finalUrl);

    const response = await fetch(
        finalUrl,
        {
            ...options,
            headers,
            credentials: "include"
        }
    );

    /*
       Handle errors
    */

    if (!response.ok) {

        let message = `HTTP ${response.status}`;

        try {

            const contentType =
                response.headers.get("content-type") || "";

            if (
                contentType.includes("application/json")
            ) {

                const error =
                    await response.json();

                if (Array.isArray(error.detail)) {

                    message =
                        error.detail
                            .map(item => {

                                if (
                                    typeof item === "string"
                                ) {
                                    return item;
                                }

                                return (
                                    item.msg ||
                                    JSON.stringify(item)
                                );

                            })
                            .join(", ");

                } else {

                    message =
                        error.detail ||
                        error.message ||
                        message;
                }

            } else {

                const text =
                    await response.text();

                if (text) {
                    message = text;
                }
            }

        } catch (_) {
            // Keep HTTP status message
        }


        if (response.status === 401) {

            message =
                "Authentication required. Please login again.";
        }


        if (response.status === 403) {

            message =
                "You do not have permission to access Accounts Receivable.";
        }


        throw new Error(message);
    }


    /*
       Return the actual Response object for
       file/blob downloads.

       This is required by exportReceivables().
    */

    return response;
}


/* =========================================================
   API JSON HELPER
   ========================================================= */

async function apiFetchJSON(url, options = {}) {

    const response =
        await apiFetch(
            url,
            options
        );

    const contentType =
        response.headers.get("content-type") || "";

    if (
        contentType.includes("application/json")
    ) {

        return await response.json();
    }

    return {};
}


/* =========================================================
   MONEY
   ========================================================= */

function money(value) {

    const number =
        Number(value || 0);

    return "₹ " +
        number.toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        );
}


/* =========================================================
   NUMBER
   ========================================================= */

function formatNumber(value) {

    return Number(value || 0)
        .toLocaleString("en-IN");
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(value) {

    if (!value) {
        return "-";
    }

    /*
       Handle YYYY-MM-DD without
       timezone conversion.
    */

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        const parts =
            value.split("-");

        const date =
            new Date(
                Number(parts[0]),
                Number(parts[1]) - 1,
                Number(parts[2])
            );

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* =========================================================
   DATE INPUT
   ========================================================= */

function toInputDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* =========================================================
   DEFAULT DATES
   ========================================================= */

function initializeDates() {

    const fromDate =
        document.getElementById(
            "fromDate"
        );

    const toDate =
        document.getElementById(
            "toDate"
        );

    if (
        !fromDate ||
        !toDate
    ) {
        return;
    }

    /*
       Don't overwrite dates if
       HTML already supplied values.
    */

    if (
        !fromDate.value ||
        !toDate.value
    ) {

        const now =
            new Date();

        const firstDay =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

        if (!fromDate.value) {

            fromDate.value =
                toInputDate(firstDay);
        }

        if (!toDate.value) {

            toDate.value =
                toInputDate(now);
        }
    }
}


/* =========================================================
   YEAR DROPDOWN
   ========================================================= */

function initializeYears() {

    const select =
        document.getElementById(
            "yearSelect"
        );

    if (!select) {
        return;
    }

    /*
       Preserve existing selected year
       if one exists.
    */

    const existingValue =
        select.value;

    select.innerHTML = "";

    const current =
        new Date().getFullYear();

    for (
        let year = current - 4;
        year <= current;
        year++
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            year;

        option.textContent =
            year;

        select.appendChild(
            option
        );
    }

    if (
        existingValue &&
        [...select.options].some(
            option =>
                option.value === existingValue
        )
    ) {

        select.value =
            existingValue;

    } else {

        select.value =
            String(current);
    }
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

    try {

        showLoadingState();

        const yearElement =
            document.getElementById(
                "yearSelect"
            );

        const fromElement =
            document.getElementById(
                "fromDate"
            );

        const toElement =
            document.getElementById(
                "toDate"
            );

        const year =
            yearElement?.value || "";

        const fromDate =
            fromElement?.value || "";

        const toDate =
            toElement?.value || "";

        const params =
            new URLSearchParams();

        if (year) {

            params.set(
                "year",
                year
            );
        }

        if (fromDate) {

            params.set(
                "from_date",
                fromDate
            );
        }

        if (toDate) {

            params.set(
                "to_date",
                toDate
            );
        }

        const query =
            params.toString();

        const endpoint =
            `/api/finance/accounts-receivable/dashboard` +
            (query
                ? `?${query}`
                : "");

        const data =
            await apiFetchJSON(
                endpoint
            );

        console.log(
            "Accounts Receivable dashboard:",
            data
        );

        renderKPIs(data);

        renderTrend(data);

        renderAging(data);

        renderTopCustomers(data);

        renderCollections(data);

        renderAlert(data);

        updateQuickPanel(data);

        await loadInvoices(1);

        hideLoadingState();

    } catch (error) {

        console.error(
            "Accounts Receivable load error:",
            error
        );

        hideLoadingState();

        showError(
            error.message
        );
    }
}


/* =========================================================
   LOADING STATE
   ========================================================= */

function showLoadingState() {

    const refresh =
        document.getElementById(
            "refreshBtn"
        );

    if (!refresh) {
        return;
    }

    refresh.disabled =
        true;

    refresh.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i>`;
}


function hideLoadingState() {

    const refresh =
        document.getElementById(
            "refreshBtn"
        );

    if (!refresh) {
        return;
    }

    refresh.disabled =
        false;

    refresh.innerHTML =
        `<i class="fa-solid fa-rotate"></i>`;
}


/* =========================================================
   KPI
   ========================================================= */

function renderKPIs(data = {}) {

    setText(
        "totalReceivables",
        money(
            data.total_receivables
        )
    );

    setText(
        "overdueAmount",
        money(
            data.overdue_amount
        )
    );

    setText(
        "dueWithin30",
        money(
            data.due_within_30
        )
    );

    setText(
        "collectedThisMonth",
        money(
            data.collected_this_month
        )
    );

    setText(
        "outstandingInvoices",
        formatNumber(
            data.outstanding_invoices
        )
    );

    setText(
        "agingTotal",
        money(
            data.aging?.total ||
            data.total_receivables ||
            0
        )
    );

    setText(
        "totalBilled",
        money(
            data.total_billed
        )
    );

    setText(
        "totalCollected",
        money(
            data.total_collected
        )
    );

    setText(
        "collectionRate",
        `${Number(
            data.collection_rate || 0
        ).toFixed(2)}%`
    );
}


/* =========================================================
   COLLECTION SUMMARY
   ========================================================= */

function renderCollections(data = {}) {

    const currentMonth =
        new Date().toLocaleDateString(
            "en-IN",
            {
                month: "long",
                year: "numeric"
            }
        );

    setText(
        "collectionMonth",
        `${currentMonth} Collections`
    );

    setText(
        "totalBilled",
        money(
            data.total_billed
        )
    );

    setText(
        "totalCollected",
        money(
            data.total_collected
        )
    );

    setText(
        "collectionRate",
        `${Number(
            data.collection_rate || 0
        ).toFixed(2)}%`
    );


    const averageDays =
        data.average_collection_days ??
        data.avg_collection_days ??
        data.collection_days ??
        0;

    setText(
        "averageCollectionDays",
        `${Number(
            averageDays || 0
        ).toFixed(0)} Days`
    );


    setText(
        "badDebt",
        money(
            data.bad_debt
        )
    );
}


/* =========================================================
   TREND CHART
   ========================================================= */

function renderTrend(data = {}) {

    const canvas =
        document.getElementById(
            "trendChart"
        );

    if (!canvas) {
        return;
    }

    if (trendChart) {

        trendChart.destroy();

        trendChart =
            null;
    }

    const trend =
        Array.isArray(data.trend)
            ? data.trend
            : [];

    const labels =
        trend.map(
            item =>
                item.month ||
                item.label ||
                ""
        );

    const receivables =
        trend.map(
            item =>
                Number(
                    item.receivables ||
                    item.total_receivables ||
                    0
                ) / 100000
        );

    const collected =
        trend.map(
            item =>
                Number(
                    item.collected ||
                    item.collected_amount ||
                    0
                ) / 100000
        );


    if (!labels.length) {

        const parent =
            canvas.parentElement;

        if (parent) {

            parent.classList.add(
                "chart-empty"
            );

            canvas.style.display =
                "none";

            parent.dataset.message =
                "No receivables trend data available.";
        }

        return;
    }


    canvas.style.display =
        "";

    const parent =
        canvas.parentElement;

    if (parent) {

        parent.classList.remove(
            "chart-empty"
        );

        delete parent.dataset.message;
    }


    trendChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Total Receivables",

                            data:
                                receivables,

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            fill: false
                        },

                        {
                            label:
                                "Collected Amount",

                            data:
                                collected,

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            fill: false
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    interaction: {
                        mode: "index",
                        intersect: false
                    },

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context => {

                                        return (
                                            `${context.dataset.label}: ` +
                                            `₹ ${(
                                                Number(
                                                    context.raw || 0
                                                ) * 100000
                                            ).toLocaleString(
                                                "en-IN"
                                            )}`
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

                                callback:
                                    value =>
                                        `${value}L`
                            }
                        },

                        x: {

                            grid: {
                                display: false
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   AGING CHART
   ========================================================= */

function renderAging(data = {}) {

    const canvas =
        document.getElementById(
            "agingChart"
        );

    if (!canvas) {
        return;
    }

    const aging =
        data.aging || {};

    const values = [

        Number(
            aging["0_30"] ||
            aging["0-30"] ||
            0
        ),

        Number(
            aging["31_60"] ||
            aging["31-60"] ||
            0
        ),

        Number(
            aging["61_90"] ||
            aging["61-90"] ||
            0
        ),

        Number(
            aging["91_120"] ||
            aging["91-120"] ||
            0
        ),

        Number(
            aging["120_plus"] ||
            aging["120+"] ||
            0
        )
    ];


    if (agingChart) {

        agingChart.destroy();

        agingChart =
            null;
    }


    agingChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: [
                        "0 - 30 Days",
                        "31 - 60 Days",
                        "61 - 90 Days",
                        "91 - 120 Days",
                        "120+ Days"
                    ],

                    datasets: [

                        {
                            data: values,

                            borderWidth: 2
                        }

                    ]
                },

                options: {

                    cutout: "64%",

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context => {

                                        return (
                                            `${context.label}: ` +
                                            money(
                                                context.raw
                                            )
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );


    renderAgingLegend(values);
}


/* =========================================================
   AGING LEGEND
   ========================================================= */

function renderAgingLegend(values) {

    const container =
        document.getElementById(
            "agingLegend"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const labels = [

        "0 - 30 Days",
        "31 - 60 Days",
        "61 - 90 Days",
        "91 - 120 Days",
        "120+ Days"
    ];

    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    values.forEach(
        (value, index) => {

            const percentage =
                total > 0
                    ? (
                        value /
                        total *
                        100
                    )
                    : 0;


            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "aging-item";


            div.innerHTML = `

                <div>

                    <span>

                        <i
                            class="aging-marker"
                            style="
                                background:
                                ${getChartColor(index)};
                            "
                        ></i>

                        ${labels[index]}

                    </span>

                    <strong>
                        ${money(value)}
                    </strong>

                </div>

                <small>
                    ${percentage.toFixed(1)}%
                </small>

            `;

            container.appendChild(
                div
            );
        }
    );
}


/* =========================================================
   CHART COLORS
   ========================================================= */

function getChartColor(index) {

    const colors = [

        "#126be7",
        "#11a763",
        "#f39118",
        "#e92835",
        "#7435c9"

    ];

    return colors[index] ||
        "#64748b";
}


/* =========================================================
   TOP CUSTOMERS
   ========================================================= */

function renderTopCustomers(data = {}) {

    const container =
        document.getElementById(
            "topCustomers"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const customers =
        Array.isArray(
            data.top_customers
        )
            ? data.top_customers
            : [];


    if (!customers.length) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-users"></i>

                <span>
                    No customer receivables found.
                </span>

            </div>

        `;

        return;
    }


    const max =
        Math.max(
            ...customers.map(
                customer =>
                    Number(
                        customer.amount || 0
                    )
            ),
            1
        );


    customers.forEach(
        (customer, index) => {

            const amount =
                Number(
                    customer.amount || 0
                );

            const percentage =
                amount /
                max *
                100;


            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "customer-item";


            div.innerHTML = `

                <div class="customer-row">

                    <div class="customer-name">

                        <span
                            class="customer-rank"
                        >
                            ${index + 1}
                        </span>

                        ${escapeHTML(
                            customer.customer_name ||
                            customer.name ||
                            "Unknown Customer"
                        )}

                    </div>

                    <span
                        class="customer-amount"
                    >
                        ${money(amount)}
                    </span>

                </div>

                <div
                    class="customer-progress"
                >

                    <span
                        style="
                            width:
                            ${Math.min(
                                percentage,
                                100
                            )}%;
                        "
                    ></span>

                </div>

            `;

            container.appendChild(
                div
            );
        }
    );
}


/* =========================================================
   ALERT
   ========================================================= */

function renderAlert(data = {}) {

    const overdue =
        Number(
            data.overdue_invoices ||
            data.overdue_count ||
            0
        );

    const amount =
        money(
            data.overdue_amount || 0
        );


    const message =
        document.getElementById(
            "overdueMessage"
        );

    if (!message) {
        return;
    }


    if (overdue === 0) {

        message.textContent =
            "No overdue invoices.";

        return;
    }


    message.textContent =
        `You have ${overdue} overdue invoices totaling ${amount}.`;
}


/* =========================================================
   QUICK PANEL COUNTER
   ========================================================= */

function updateQuickPanel(data = {}) {

    const count =
        document.getElementById(
            "overdueQuickCount"
        );

    if (!count) {
        return;
    }

    count.textContent =
        formatNumber(
            data.overdue_invoices ||
            data.overdue_count ||
            0
        );
}


/* =========================================================
   QUICK PANEL
   ========================================================= */

function setupQuickPanel() {

    console.log(
        "Initializing Accounts Receivable Quick Panel..."
    );


    /*
       CREATE NEW INVOICE
    */

    const createInvoiceBtn =
        document.getElementById(
            "createInvoiceBtn"
        );

    if (createInvoiceBtn) {

        createInvoiceBtn.type =
            "button";

        createInvoiceBtn.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                console.log(
                    "Quick Action: Create New Invoice"
                );

                window.location.href =
                    QUICK_ROUTES.createInvoice;
            }
        );
    }


    /*
       RECORD PAYMENT

       This remains connected to the
       existing Record Payment function.
    */

    const recordPaymentBtn =
        document.getElementById(
            "recordPaymentBtn"
        );

    if (recordPaymentBtn) {

        recordPaymentBtn.type =
            "button";

        recordPaymentBtn.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                console.log(
                    "Quick Action: Record Payment"
                );

                recordPayment();
            }
        );
    }


    /*
       CUSTOMER STATEMENT
    */

    const customerStatementBtn =
        document.getElementById(
            "customerStatementBtn"
        );

    if (customerStatementBtn) {

        customerStatementBtn.type =
            "button";

        customerStatementBtn.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                console.log(
                    "Quick Action: Customer Statement"
                );

                window.location.href =
                    QUICK_ROUTES.customerStatement;
            }
        );
    }


    /*
       FOLLOW UP OVERDUE
    */

    const followUpOverdueBtn =
        document.getElementById(
            "followUpOverdueBtn"
        );

    if (followUpOverdueBtn) {

        followUpOverdueBtn.type =
            "button";

        followUpOverdueBtn.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                console.log(
                    "Quick Action: Follow Up Overdue"
                );

                window.location.href =
                    QUICK_ROUTES.overdue;
            }
        );
    }


    /*
       AGING REPORT
    */

    const agingReportBtn =
        document.getElementById(
            "agingReportBtn"
        );

    if (agingReportBtn) {

        agingReportBtn.type =
            "button";

        agingReportBtn.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                console.log(
                    "Quick Action: Aging Report"
                );

                window.location.href =
                    QUICK_ROUTES.agingReport;
            }
        );
    }


    /*
       EXPORT RECEIVABLES
    */

    const exportBtn =
        document.getElementById(
            "exportBtn"
        );

    if (exportBtn) {

        exportBtn.type =
            "button";

        exportBtn.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                console.log(
                    "Quick Action: Export Receivables"
                );

                exportReceivables();
            }
        );
    }


    /*
       Log missing buttons.
       This makes debugging much easier.
    */

    const quickButtons = {

        createInvoiceBtn,
        recordPaymentBtn,
        customerStatementBtn,
        followUpOverdueBtn,
        agingReportBtn,
        exportBtn

    };


    Object.entries(
        quickButtons
    ).forEach(
        ([id, element]) => {

            if (!element) {

                console.warn(
                    `Quick Panel button not found: #${id}`
                );
            }
        }
    );


    console.log(
        "Accounts Receivable Quick Panel initialized."
    );
}


/* =========================================================
   LOAD INVOICES
   ========================================================= */

async function loadInvoices(
    page = 1
) {

    currentPage =
        Math.max(
            Number(page) || 1,
            1
        );


    const searchElement =
        document.getElementById(
            "globalSearch"
        );

    const search =
        searchElement
            ? searchElement.value.trim()
            : "";


    const params =
        new URLSearchParams();

    params.set(
        "page",
        currentPage
    );

    params.set(
        "page_size",
        PAGE_SIZE
    );


    if (search) {

        params.set(
            "search",
            search
        );
    }


    try {

        const data =
            await apiFetchJSON(
                `/api/finance/accounts-receivable/invoices?${params.toString()}`
            );


        console.log(
            "Accounts Receivable invoices:",
            data
        );


        renderInvoiceTable(
            data
        );

    } catch (error) {

        console.error(
            "Invoice load error:",
            error
        );

        renderInvoiceError(
            error.message
        );
    }
}


/* =========================================================
   INVOICE TABLE
   ========================================================= */

function renderInvoiceTable(data = {}) {

    const tbody =
        document.getElementById(
            "invoiceTable"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";


    const invoices =
        Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.invoices)
                ? data.invoices
                : [];


    if (!invoices.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
                    No invoices found.
                </td>

            </tr>

        `;


        updatePaginationInfo(
            0,
            data.total || 0
        );


        renderPagination(
            data.pages || 1,
            data.page || currentPage
        );

        return;
    }


    invoices.forEach(
        invoice => {

            const row =
                document.createElement(
                    "tr"
                );


            const status =
                String(
                    invoice.status || ""
                )
                    .toLowerCase()
                    .trim();


            let statusClass =
                "open";


            if (
                status === "overdue"
            ) {

                statusClass =
                    "overdue";

            } else if (
                status === "due soon" ||
                status === "due_soon" ||
                status === "due"
            ) {

                statusClass =
                    "due";

            } else if (
                status === "paid" ||
                status === "completed"
            ) {

                statusClass =
                    "paid";
            }


            const invoiceNumber =
                invoice.invoice_number ||
                invoice.invoice_no ||
                "-";


            const customer =
                invoice.customer_name ||
                invoice.customer ||
                "Unknown Customer";


            const invoiceDate =
                invoice.invoice_date ||
                invoice.date;


            const dueDate =
                invoice.due_date;


            const amount =
                invoice.amount || 0;


            const daysOutstanding =
                invoice.days_outstanding ||
                0;


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        invoiceNumber
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        customer
                    )}
                </td>

                <td>
                    ${formatDate(
                        invoiceDate
                    )}
                </td>

                <td>
                    ${formatDate(
                        dueDate
                    )}
                </td>

                <td>
                    ${money(
                        amount
                    )}
                </td>

                <td>

                    <span
                        class="status ${statusClass}"
                    >
                        ${escapeHTML(
                            invoice.status ||
                            "Open"
                        )}
                    </span>

                </td>

                <td>
                    ${formatNumber(
                        daysOutstanding
                    )}
                </td>

            `;


            tbody.appendChild(
                row
            );
        }
    );


    const total =
        Number(
            data.total ??
            data.total_count ??
            invoices.length
        );


    const pages =
        Number(
            data.pages ??
            data.total_pages ??
            Math.ceil(
                total /
                PAGE_SIZE
            )
        ) || 1;


    const page =
        Number(
            data.page ??
            currentPage
        );


    updatePaginationInfo(
        invoices.length,
        total
    );


    renderPagination(
        pages,
        page
    );
}


/* =========================================================
   PAGINATION INFO
   ========================================================= */

function updatePaginationInfo(
    visible,
    total
) {

    const info =
        document.getElementById(
            "paginationInfo"
        );

    if (!info) {
        return;
    }

    info.textContent =
        `Showing ${visible} of ${total} invoices`;
}


/* =========================================================
   PAGINATION
   ========================================================= */

function renderPagination(
    pages = 1,
    current = 1
) {

    const container =
        document.getElementById(
            "paginationButtons"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";


    pages =
        Math.max(
            Number(pages) || 1,
            1
        );


    current =
        Math.min(
            Math.max(
                Number(current) || 1,
                1
            ),
            pages
        );


    /*
       Previous
    */

    const previous =
        document.createElement(
            "button"
        );

    previous.type =
        "button";

    previous.innerHTML =
        "‹";

    previous.disabled =
        current <= 1;


    previous.addEventListener(
        "click",
        () =>
            loadInvoices(
                current - 1
            )
    );


    container.appendChild(
        previous
    );


    /*
       Page range
    */

    let start =
        Math.max(
            current - 2,
            1
        );


    let end =
        Math.min(
            start + 4,
            pages
        );


    if (
        end - start < 4
    ) {

        start =
            Math.max(
                end - 4,
                1
            );
    }


    /*
       First page
    */

    if (start > 1) {

        addPageButton(
            container,
            1,
            current
        );


        if (start > 2) {

            addEllipsis(
                container
            );
        }
    }


    /*
       Main pages
    */

    for (
        let page = start;
        page <= end;
        page++
    ) {

        addPageButton(
            container,
            page,
            current
        );
    }


    /*
       Last page
    */

    if (end < pages) {

        if (
            end < pages - 1
        ) {

            addEllipsis(
                container
            );
        }


        addPageButton(
            container,
            pages,
            current
        );
    }


    /*
       Next
    */

    const next =
        document.createElement(
            "button"
        );

    next.type =
        "button";

    next.innerHTML =
        "›";

    next.disabled =
        current >= pages;


    next.addEventListener(
        "click",
        () =>
            loadInvoices(
                current + 1
            )
    );


    container.appendChild(
        next
    );
}


/* =========================================================
   PAGE BUTTON
   ========================================================= */

function addPageButton(
    container,
    page,
    current
) {

    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.textContent =
        page;


    if (
        page === current
    ) {

        button.className =
            "active";
    }


    button.addEventListener(
        "click",
        () =>
            loadInvoices(
                page
            )
    );


    container.appendChild(
        button
    );
}


/* =========================================================
   PAGINATION ELLIPSIS
   ========================================================= */

function addEllipsis(
    container
) {

    const span =
        document.createElement(
            "span"
        );

    span.className =
        "pagination-ellipsis";

    span.textContent =
        "…";


    container.appendChild(
        span
    );
}


/* =========================================================
   INVOICE ERROR
   ========================================================= */

function renderInvoiceError(
    message
) {

    const tbody =
        document.getElementById(
            "invoiceTable"
        );

    if (!tbody) {
        return;
    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="7"
                style="
                    text-align:center;
                    padding:30px;
                "
            >

                <i
                    class="fa-solid fa-triangle-exclamation"
                ></i>

                Unable to load invoices:
                ${escapeHTML(message)}

            </td>

        </tr>

    `;
}


/* =========================================================
   CREATE INVOICE
   ========================================================= */

async function openCreateInvoice() {

    /*
       If you already have a dedicated
       CreateInvoice.html page, use it.

       This function is kept as a fallback
       for compatibility.
    */

    window.location.href =
        QUICK_ROUTES.createInvoice;
}


/* =========================================================
   RECORD PAYMENT
   ========================================================= */

async function recordPayment() {

    /*
       You already have a dedicated
       RecordPayment page.

       Therefore the Quick Panel should
       navigate there instead of opening
       the old prompt-based implementation.
    */

    window.location.href =
        QUICK_ROUTES.recordPayment;
}


/* =========================================================
   EXPORT RECEIVABLES
   ========================================================= */

async function exportReceivables() {

    const exportBtn =
        document.getElementById(
            "exportBtn"
        );


    try {

        if (exportBtn) {

            exportBtn.disabled =
                true;

            exportBtn.dataset.originalHTML =
                exportBtn.innerHTML;

            exportBtn.innerHTML =
                `<i class="fa-solid fa-spinner fa-spin"></i>
                 <span>
                    <strong>Exporting...</strong>
                    <small>Please wait</small>
                 </span>`;
        }


        const fromDate =
            document.getElementById(
                "fromDate"
            )?.value || "";


        const toDate =
            document.getElementById(
                "toDate"
            )?.value || "";


        const year =
            document.getElementById(
                "yearSelect"
            )?.value || "";


        const params =
            new URLSearchParams();


        if (fromDate) {

            params.append(
                "from_date",
                fromDate
            );
        }


        if (toDate) {

            params.append(
                "to_date",
                toDate
            );
        }


        if (year) {

            params.append(
                "year",
                year
            );
        }


        /*
           IMPORTANT:
           apiFetch() adds API_BASE.

           Therefore DO NOT put API_BASE here.
        */

        const endpoint =
            `/api/finance/accounts-receivable/export` +
            (
                params.toString()
                    ? `?${params.toString()}`
                    : ""
            );


        console.log(
            "Export endpoint:",
            endpoint
        );


        const response =
            await apiFetch(
                endpoint,
                {
                    method: "GET"
                }
            );


        /*
           The corrected apiFetch()
           returns the Response object.
        */

        const blob =
            await response.blob();


        if (
            !blob ||
            blob.size === 0
        ) {

            throw new Error(
                "Export returned an empty file."
            );
        }


        /*
           Determine filename from
           Content-Disposition if available.
        */

        let filename =
            "accounts_receivable.csv";


        const disposition =
            response.headers.get(
                "content-disposition"
            );


        if (disposition) {

            const match =
                disposition.match(
                    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
                );


            if (
                match &&
                match[1]
            ) {

                filename =
                    match[1]
                        .replace(
                            /['"]/g,
                            ""
                        );
            }
        }


        /*
           Download file.
        */

        const downloadUrl =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            downloadUrl;

        link.download =
            filename;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        window.URL.revokeObjectURL(
            downloadUrl
        );


        console.log(
            "Receivables export completed successfully."
        );


    } catch (error) {

        console.error(
            "Export error:",
            error
        );


        showError(
            `Unable to export receivables: ${error.message}`
        );


        alert(
            `Unable to export receivables.\n\n${error.message}`
        );


    } finally {

        if (exportBtn) {

            exportBtn.disabled =
                false;


            if (
                exportBtn.dataset.originalHTML
            ) {

                exportBtn.innerHTML =
                    exportBtn.dataset.originalHTML;
            }
        }
    }
}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    const search =
        document.getElementById(
            "globalSearch"
        );

    if (!search) {
        return;
    }


    search.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    () =>
                        loadInvoices(1),
                    350
                );
        }
    );


    /*
       Escape clears search.
    */

    search.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                search.value =
                    "";

                loadInvoices(1);
            }
        }
    );
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    /*
       Refresh
    */

    const refreshBtn =
        document.getElementById(
            "refreshBtn"
        );


    if (refreshBtn) {

        refreshBtn.type =
            "button";

        refreshBtn.addEventListener(
            "click",
            () =>
                loadDashboard()
        );
    }


    /*
       Year
    */

    const yearSelect =
        document.getElementById(
            "yearSelect"
        );


    if (yearSelect) {

        yearSelect.addEventListener(
            "change",
            () =>
                loadDashboard()
        );
    }


    /*
       From date
    */

    const fromDate =
        document.getElementById(
            "fromDate"
        );


    if (fromDate) {

        fromDate.addEventListener(
            "change",
            () =>
                loadDashboard()
        );
    }


    /*
       To date
    */

    const toDate =
        document.getElementById(
            "toDate"
        );


    if (toDate) {

        toDate.addEventListener(
            "change",
            () =>
                loadDashboard()
        );
    }


    /*
       Search
    */

    setupSearch();


    /*
       QUICK PANEL

       All Quick Panel buttons are
       initialized separately.
    */

    setupQuickPanel();
}


/* =========================================================
   HELPER - SET TEXT
   ========================================================= */

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


/* =========================================================
   HTML ESCAPE
   ========================================================= */

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


/* =========================================================
   ERROR
   ========================================================= */

function showError(
    message
) {

    const alert =
        document.getElementById(
            "overdueMessage"
        );


    if (!alert) {
        return;
    }


    alert.textContent =
        `Unable to load Accounts Receivable: ${message}`;
}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "VendorIQ Accounts Receivable initializing..."
        );


        initializeDates();

        initializeYears();

        setupEvents();


        /*
           Load dashboard data.
        */

        await loadDashboard();


        console.log(
            "VendorIQ Accounts Receivable initialized."
        );
    }
);