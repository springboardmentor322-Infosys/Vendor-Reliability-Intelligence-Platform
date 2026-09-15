"use strict";

/* ============================================================
   CONFIGURATION
============================================================ */

const API_BASE = "http://127.0.0.1:8000";

const DASHBOARD_URL =
    `${API_BASE}/api/finance/officer-dashboard`;

const PROFILE_URL =
    `${API_BASE}/api/finance/profile`;


/* ============================================================
   TOKEN
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        ""
    );
}


/* ============================================================
   AUTHENTICATED FETCH
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }

    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "jwt_token"
        );

        window.location.href =
            "/login";

        throw new Error(
            "Not authenticated"
        );
    }

    if (response.status === 403) {

        throw new Error(
            "Finance Officer access required"
        );
    }

    if (!response.ok) {

        let message =
            `Request failed: ${response.status}`;

        try {

            const data =
                await response.json();

            message =
                data.detail ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


/* ============================================================
   CHART REFERENCES
============================================================ */

let cashFlowChart = null;

let expenseCategoryChart = null;

let budgetActualChart = null;


/* ============================================================
   FORMAT MONEY
============================================================ */

function formatMoney(
    value
) {

    const amount =
        Number(value || 0);

    return (
        "₹ " +
        amount.toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        )
    );
}


/* ============================================================
   FORMAT DATE
============================================================ */

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

        return value;
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


/* ============================================================
   SET TEXT
============================================================ */

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


/* ============================================================
   LOAD PROFILE
============================================================ */

async function loadProfile() {

    try {

        const profile =
            await apiFetch(
                PROFILE_URL
            );

        const name =
            profile.name ||
            profile.fullname ||
            profile.username ||
            "Finance Officer";

        setText(
            "profileName",
            name
        );

        setText(
            "sidebarUserName",
            name
        );

        setText(
            "welcomeText",
            `Welcome back, ${name}! Here's what's happening with your finances today.`
        );

    } catch (error) {

        console.error(
            "Unable to load finance profile:",
            error
        );
    }
}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadDashboard() {

    showLoading();

    try {

        const data =
            await apiFetch(
                DASHBOARD_URL
            );

        console.log(
            "Finance dashboard:",
            data
        );

        renderKPIs(
            data.kpis
        );

        renderCashFlow(
            data.cash_flow
        );

        renderExpenseCategories(
            data.expense_categories
        );

        renderBudgetActual(
            data.budget_vs_actual
        );

        renderTransactions(
            data.recent_transactions
        );

        renderAlerts(
            data.alerts
        );

    } catch (error) {

        console.error(
            "Finance dashboard error:",
            error
        );

        showDashboardError(
            error.message
        );
    }
}


/* ============================================================
   KPI
============================================================ */

function renderKPIs(
    kpis
) {

    if (!kpis) {

        return;
    }

    setText(
        "totalBudget",
        formatMoney(
            kpis.total_budget
        )
    );

    setText(
        "totalExpenses",
        formatMoney(
            kpis.total_expenses
        )
    );

    setText(
        "totalRevenue",
        formatMoney(
            kpis.total_revenue
        )
    );

    setText(
        "budgetUtilization",
        `${Number(
            kpis.budget_utilization || 0
        ).toFixed(1)}%`
    );

    setText(
        "pendingApprovals",
        Number(
            kpis.pending_approvals || 0
        ).toLocaleString(
            "en-IN"
        )
    );

    setText(
        "approvalBadge",
        Number(
            kpis.pending_approvals || 0
        )
    );
}


/* ============================================================
   CASH FLOW CHART
============================================================ */

function renderCashFlow(
    data
) {

    const canvas =
        document.getElementById(
            "cashFlowChart"
        );

    if (!canvas) {

        return;
    }

    if (cashFlowChart) {

        cashFlowChart.destroy();
    }

    const labels =
        data?.months || [];

    const revenue =
        data?.revenue || [];

    const expenditure =
        data?.expenditure || [];

    const net =
        data?.net_cash_flow || [];

    cashFlowChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Revenue",

                            data:
                                revenue,

                            borderColor:
                                "#2fa568",

                            backgroundColor:
                                "rgba(47,165,104,.08)",

                            tension:
                                0.35,

                            fill:
                                false,

                            pointRadius:
                                3
                        },

                        {
                            label:
                                "Expenditure",

                            data:
                                expenditure,

                            borderColor:
                                "#ec4755",

                            backgroundColor:
                                "rgba(236,71,85,.08)",

                            tension:
                                0.35,

                            fill:
                                false,

                            pointRadius:
                                3
                        },

                        {
                            label:
                                "Net Cash Flow",

                            data:
                                net,

                            borderColor:
                                "#2867c5",

                            backgroundColor:
                                "rgba(40,103,197,.08)",

                            tension:
                                0.35,

                            fill:
                                false,

                            pointRadius:
                                3
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

                            beginAtZero:
                                true,

                            ticks: {

                                font: {
                                    size: 9
                                },

                                callback:
                                    function(value) {

                                        return (
                                            "₹ " +
                                            Number(
                                                value
                                            ).toLocaleString(
                                                "en-IN"
                                            )
                                        );
                                    }
                            },

                            grid: {
                                color:
                                    "#edf0f5"
                            }

                        },

                        x: {

                            ticks: {

                                font: {
                                    size: 9
                                }

                            },

                            grid: {
                                color:
                                    "#f0f2f6"
                            }

                        }

                    }

                }

            }
        );
}


/* ============================================================
   EXPENSE CATEGORY
============================================================ */

function renderExpenseCategories(
    categories
) {

    const canvas =
        document.getElementById(
            "expenseCategoryChart"
        );

    const legend =
        document.getElementById(
            "expenseLegend"
        );

    if (!canvas) {

        return;
    }

    if (expenseCategoryChart) {

        expenseCategoryChart.destroy();
    }

    const rows =
        categories || [];

    const labels =
        rows.map(
            item =>
                item.category
        );

    const values =
        rows.map(
            item =>
                Number(
                    item.amount || 0
                )
        );

    const total =
        values.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );

    setText(
        "expenseCenterValue",
        formatMoney(total)
    );

    expenseCategoryChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels,

                    datasets: [

                        {
                            data: values,

                            backgroundColor: [
                                "#2867c5",
                                "#2fa568",
                                "#f5a126",
                                "#9651bd",
                                "#ae385f",
                                "#aeb7c5",
                                "#54a6a6",
                                "#7e83ca"
                            ],

                            borderWidth:
                                2,

                            borderColor:
                                "#ffffff"
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout:
                        "62%",

                    plugins: {

                        legend: {
                            display: false
                        }

                    }

                }

            }
        );


    if (legend) {

        legend.innerHTML = "";

        const colors = [
            "#2867c5",
            "#2fa568",
            "#f5a126",
            "#9651bd",
            "#ae385f",
            "#aeb7c5",
            "#54a6a6",
            "#7e83ca"
        ];

        rows.forEach(
            (
                item,
                index
            ) => {

                const amount =
                    Number(
                        item.amount || 0
                    );

                const percentage =
                    total > 0
                        ? (
                            amount /
                            total *
                            100
                        )
                        : 0;

                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    "expense-legend-item";

                row.innerHTML = `

                    <span class="expense-label">

                        <i
                            class="expense-dot"
                            style="
                                background:
                                ${colors[
                                    index %
                                    colors.length
                                ]};
                            "
                        ></i>

                        ${escapeHtml(
                            item.category
                        )}

                    </span>

                    <strong>
                        ${percentage.toFixed(1)}%
                    </strong>

                `;

                legend.appendChild(
                    row
                );
            }
        );
    }
}


/* ============================================================
   BUDGET VS ACTUAL
============================================================ */

function renderBudgetActual(
    rows
) {

    const canvas =
        document.getElementById(
            "budgetActualChart"
        );

    if (!canvas) {

        return;
    }

    if (budgetActualChart) {

        budgetActualChart.destroy();
    }

    const data =
        rows || [];

    budgetActualChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels:
                        data.map(
                            item =>
                                item.department
                        ),

                    datasets: [

                        {
                            label:
                                "Budget",

                            data:
                                data.map(
                                    item =>
                                        Number(
                                            item.budget ||
                                            0
                                        )
                                ),

                            backgroundColor:
                                "#2867c5",

                            borderRadius:
                                3
                        },

                        {
                            label:
                                "Actual",

                            data:
                                data.map(
                                    item =>
                                        Number(
                                            item.actual ||
                                            0
                                        )
                                ),

                            backgroundColor:
                                "#2fa568",

                            borderRadius:
                                3
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
                                "top",

                            align:
                                "center",

                            labels: {

                                boxWidth:
                                    7,

                                boxHeight:
                                    7,

                                font: {
                                    size: 9
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
                                    size: 9
                                },

                                callback:
                                    function(value) {

                                        return (
                                            "₹ " +
                                            Number(
                                                value
                                            ).toLocaleString(
                                                "en-IN"
                                            )
                                        );
                                    }

                            },

                            grid: {
                                color:
                                    "#edf0f5"
                            }

                        },

                        x: {

                            ticks: {

                                font: {
                                    size: 8
                                }

                            },

                            grid: {
                                display:
                                    false
                            }

                        }

                    }

                }

            }
        );
}


/* ============================================================
   TRANSACTIONS
============================================================ */

function renderTransactions(
    transactions
) {

    const container =
        document.getElementById(
            "transactionList"
        );

    if (!container) {

        return;
    }

    container.innerHTML = "";

    const rows =
        transactions || [];

    if (!rows.length) {

        container.innerHTML = `
            <div class="empty-state">
                No recent transactions found.
            </div>
        `;

        return;
    }

    rows.forEach(
        transaction => {

            const type =
                transaction.display_type ===
                "revenue"
                    ? "revenue"
                    : "expense";

            const icon =
                type === "revenue"
                    ? "fa-arrow-down"
                    : "fa-cart-shopping";

            const sign =
                type === "revenue"
                    ? "+"
                    : "-";

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "transaction-item";

            element.innerHTML = `

                <div
                    class="transaction-icon ${type}"
                >

                    <i
                        class="fa-solid ${icon}"
                    ></i>

                </div>

                <div class="transaction-info">

                    <strong>
                        ${escapeHtml(
                            transaction.title
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            transaction.category ||
                            transaction.transaction_type ||
                            "Transaction"
                        )}
                    </span>

                </div>

                <div class="transaction-right">

                    <span
                        class="transaction-amount ${type}"
                    >
                        ${sign}
                        ${formatMoney(
                            transaction.amount
                        )}
                    </span>

                    <span class="transaction-date">
                        ${formatDate(
                            transaction.date
                        )}
                    </span>

                </div>

            `;

            container.appendChild(
                element
            );
        }
    );
}


/* ============================================================
   ALERTS
============================================================ */

function renderAlerts(
    alerts
) {

    const container =
        document.getElementById(
            "alertList"
        );

    if (!container) {

        return;
    }

    container.innerHTML = "";

    const rows =
        alerts || [];

    setText(
        "notificationBadge",
        rows.length
    );

    setText(
        "topNotificationBadge",
        rows.length
    );

    if (!rows.length) {

        container.innerHTML = `
            <div class="empty-state">
                No alerts or notifications.
            </div>
        `;

        return;
    }

    rows.forEach(
        alert => {

            const severity =
                String(
                    alert.severity ||
                    "info"
                )
                .toLowerCase();

            let className =
                "info";

            let icon =
                "fa-circle-info";

            if (
                severity.includes(
                    "high"
                ) ||
                severity.includes(
                    "critical"
                ) ||
                severity.includes(
                    "danger"
                )
            ) {

                className =
                    "high";

                icon =
                    "fa-triangle-exclamation";

            } else if (
                severity.includes(
                    "medium"
                ) ||
                severity.includes(
                    "warning"
                )
            ) {

                className =
                    "medium";

                icon =
                    "fa-triangle-exclamation";
            }

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "alert-item";

            element.innerHTML = `

                <div
                    class="alert-icon ${className}"
                >

                    <i
                        class="fa-solid ${icon}"
                    ></i>

                </div>

                <div class="alert-info">

                    <strong>
                        ${escapeHtml(
                            alert.title
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            alert.description
                        )}
                    </span>

                </div>

                <span class="alert-time">
                    ${escapeHtml(
                        alert.time ||
                        ""
                    )}
                </span>

            `;

            container.appendChild(
                element
            );
        }
    );
}


/* ============================================================
   HTML ESCAPE
============================================================ */

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


/* ============================================================
   LOADING
============================================================ */

function showLoading() {

    setText(
        "totalBudget",
        "Loading..."
    );

    setText(
        "totalExpenses",
        "Loading..."
    );

    setText(
        "totalRevenue",
        "Loading..."
    );

    setText(
        "budgetUtilization",
        "..."
    );

    setText(
        "pendingApprovals",
        "..."
    );
}


/* ============================================================
   ERROR
============================================================ */

function showDashboardError(
    message
) {

    console.error(
        message
    );

    setText(
        "totalBudget",
        "₹ 0"
    );

    setText(
        "totalExpenses",
        "₹ 0"
    );

    setText(
        "totalRevenue",
        "₹ 0"
    );

    setText(
        "budgetUtilization",
        "0%"
    );

    setText(
        "pendingApprovals",
        "0"
    );
}


/* ============================================================
   QUICK ACTIONS
============================================================ */

function initializeQuickActions() {

    document
        .querySelectorAll(
            ".quick-actions button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const url =
                            button.dataset.url;

                        if (url) {

                            window.location.href =
                                url;
                        }
                    }
                );
            }
        );
}


/* ============================================================
   REFRESH
============================================================ */

function initializeRefresh() {

    const button =
        document.getElementById(
            "refreshBtn"
        );

    if (!button) {

        return;
    }

    button.addEventListener(
        "click",
        async () => {

            const icon =
                button.querySelector(
                    "i"
                );

            if (icon) {

                icon.classList.add(
                    "fa-spin"
                );
            }

            await loadDashboard();

            if (icon) {

                icon.classList.remove(
                    "fa-spin"
                );
            }
        }
    );
}


/* ============================================================
   VIEW ALL
============================================================ */

function initializeNavigation() {

    const transactions =
        document.getElementById(
            "viewTransactions"
        );

    if (transactions) {

        transactions.addEventListener(
            "click",
            () => {

                window.location.href =
                    "/finance/transactions";
            }
        );
    }


    const alerts =
        document.getElementById(
            "viewAlerts"
        );

    if (alerts) {

        alerts.addEventListener(
            "click",
            () => {

                window.location.href =
                    "/finance/notifications";
            }
        );
    }


    const profile =
        document.getElementById(
            "profileButton"
        );

    if (profile) {

        profile.addEventListener(
            "click",
            () => {

                window.location.href =
                    "/finance/profile";
            }
        );
    }

}


/* ============================================================
   INITIALIZE
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeQuickActions();

        initializeRefresh();

        initializeNavigation();

        await loadProfile();

        await loadDashboard();

    }
);