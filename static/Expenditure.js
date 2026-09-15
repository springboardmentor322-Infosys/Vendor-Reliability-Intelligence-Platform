"use strict";

const API_BASE = window.location.origin;

let trendChart = null;
let categoryChart = null;


/* =========================================================
   AUTH
========================================================= */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("finance_access_token") ||
        localStorage.getItem("token") ||
        ""
    );
}


/* =========================================================
   API
========================================================= */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {

        headers.Authorization =
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

        if (response.status === 401) {

            console.error(
                "Finance authentication failed."
            );

        }

        throw new Error(message);
    }

    return response.json();
}


/* =========================================================
   FORMAT
========================================================= */

function money(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(
        Number(value || 0)
    );
}


function number(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            maximumFractionDigits: 0
        }
    ).format(
        Number(value || 0)
    );
}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {

    try {

        const user =
            await apiFetch(
                `${API_BASE}/api/finance/profile`
            );

        const name =
            user.name ||
            "Finance Officer";

        const sidebar =
            document.getElementById(
                "sidebarName"
            );

        const header =
            document.getElementById(
                "headerName"
            );

        if (sidebar) {
            sidebar.textContent = name;
        }

        if (header) {
            header.textContent = name;
        }

    } catch (error) {

        console.warn(
            "Profile could not be loaded:",
            error.message
        );
    }
}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadExpenditures() {

    const year =
        document.getElementById(
            "yearFilter"
        ).value;

    try {

        setLoading(true);

        const data =
            await apiFetch(
                `${API_BASE}/api/finance/expenditures?year=${year}`
            );

        renderKPIs(data);

        renderTrend(data);

        renderCategories(data);

        renderOverview(data);

        renderRecent(data);

        renderApprovals(data);

    } catch (error) {

        console.error(
            "Expenditures load error:",
            error
        );

        showError(
            error.message
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   KPI
========================================================= */

function renderKPIs(data) {

    document.getElementById(
        "totalExpenditure"
    ).textContent =
        money(data.total_expenditure);


    document.getElementById(
        "thisMonth"
    ).textContent =
        money(data.this_month);


    document.getElementById(
        "averageMonthly"
    ).textContent =
        money(data.average_monthly_expense);


    document.getElementById(
        "totalTransactions"
    ).textContent =
        number(data.total_transactions);


    const utilization =
        Number(
            data.budget_utilization || 0
        );

    document.getElementById(
        "budgetUtilization"
    ).textContent =
        `${utilization.toFixed(2)}%`;


    document.getElementById(
        "budgetProgress"
    ).style.width =
        `${Math.min(
            utilization,
            100
        )}%`;


    document.getElementById(
        "donutTotal"
    ).textContent =
        money(
            data.total_expenditure
        );


    const now =
        new Date();

    document.getElementById(
        "currentMonth"
    ).textContent =
        now.toLocaleString(
            "en-US",
            {
                month: "long"
            }
        );
}


/* =========================================================
   TREND CHART
========================================================= */

function renderTrend(data) {

    const canvas =
        document.getElementById(
            "trendChart"
        );

    if (!canvas) return;

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels:
                        data.trend_months,

                    datasets: [

                        {
                            label:
                                "This Year",

                            data:
                                data.this_year_trend,

                            borderColor:
                                "#1677ee",

                            backgroundColor:
                                "rgba(22,119,238,.08)",

                            tension: .35,

                            fill: false,

                            pointRadius: 3
                        },

                        {
                            label:
                                "Last Year",

                            data:
                                data.last_year_trend,

                            borderColor:
                                "#18a765",

                            backgroundColor:
                                "rgba(24,167,101,.08)",

                            tension: .35,

                            fill: false,

                            pointRadius: 3
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
                            align: "center"
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            `${context.dataset.label}: ` +
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

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return (
                                            "₹" +
                                            Number(
                                                value
                                            ).toLocaleString(
                                                "en-IN"
                                            )
                                        );
                                    }
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
   CATEGORY CHART
========================================================= */

function renderCategories(data) {

    const categories =
        data.categories || [];

    const canvas =
        document.getElementById(
            "categoryChart"
        );

    if (!canvas) return;

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels:
                        categories.map(
                            item =>
                                item.category
                        ),

                    datasets: [

                        {
                            data:
                                categories.map(
                                    item =>
                                        item.amount
                                ),

                            backgroundColor: [
                                "#1677ee",
                                "#18a765",
                                "#f59e0b",
                                "#7c3aed",
                                "#e83e5b",
                                "#94a3b8",
                                "#0ea5e9",
                                "#8b5cf6",
                                "#14b8a6",
                                "#64748b"
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

                    cutout: "62%",

                    plugins: {

                        legend: {
                            display: false
                        }

                    }
                }
            }
        );


    const legend =
        document.getElementById(
            "categoryLegend"
        );

    legend.innerHTML = "";


    const colors = [
        "#1677ee",
        "#18a765",
        "#f59e0b",
        "#7c3aed",
        "#e83e5b",
        "#94a3b8",
        "#0ea5e9",
        "#8b5cf6",
        "#14b8a6",
        "#64748b"
    ];


    categories.forEach(
        (item, index) => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "legend-item";

            div.innerHTML = `

                <span
                    class="legend-dot"
                    style="
                        background:${colors[index % colors.length]}
                    "
                ></span>

                <span>
                    ${escapeHtml(
                        item.category
                    )}
                </span>

                <strong class="legend-value">
                    ${Number(
                        item.percentage || 0
                    ).toFixed(1)}%
                </strong>
            `;

            legend.appendChild(div);
        }
    );


    renderTopCategories(
        categories
    );
}


/* =========================================================
   TOP CATEGORIES
========================================================= */

function renderTopCategories(
    categories
) {

    const container =
        document.getElementById(
            "topCategories"
        );

    container.innerHTML = "";


    categories
        .slice(0, 6)
        .forEach(
            (item, index) => {

                const div =
                    document.createElement(
                        "div"
                    );

                div.className =
                    "top-item";

                div.innerHTML = `

                    <div class="top-icon">
                        <i class="fa-solid fa-wallet"></i>
                    </div>

                    <div>

                        <div class="top-name">
                            ${escapeHtml(
                                item.category
                            )}
                        </div>

                        <div class="top-percent">
                            ${Number(
                                item.percentage || 0
                            ).toFixed(1)}%
                        </div>

                    </div>

                    <div class="top-amount">
                        ${money(
                            item.amount
                        )}
                    </div>
                `;

                container.appendChild(
                    div
                );
            }
        );
}


/* =========================================================
   OVERVIEW
========================================================= */

function renderOverview(data) {

    const tbody =
        document.getElementById(
            "overviewBody"
        );

    tbody.innerHTML = "";


    const rows =
        data.overview || [];


    if (!rows.length) {

        tbody.innerHTML = `

            <tr>
                <td colspan="6">
                    No expenditure data available.
                </td>
            </tr>

        `;

        return;
    }


    rows.forEach(
        row => {

            const tr =
                document.createElement(
                    "tr"
                );

            const statusClass =
                row.status ===
                "Under Budget"
                    ? "status-under"
                    : "status-over";


            tr.innerHTML = `

                <td>
                    ${escapeHtml(
                        row.category
                    )}
                </td>

                <td>
                    ${money(row.budget)}
                </td>

                <td>
                    ${money(row.actual)}
                </td>

                <td>
                    ${money(row.variance)}
                </td>

                <td>
                    ${Number(
                        row.variance_percent || 0
                    ).toFixed(2)}%
                </td>

                <td>
                    <span
                        class="status ${statusClass}"
                    >
                        ${escapeHtml(
                            row.status
                        )}
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        }
    );
}


/* =========================================================
   RECENT
========================================================= */

function renderRecent(data) {

    const container =
        document.getElementById(
            "recentList"
        );

    container.innerHTML = "";


    const rows =
        data.recent_expenditures || [];


    if (!rows.length) {

        container.innerHTML = `
            <div class="recent-item">
                No recent expenditures.
            </div>
        `;

        return;
    }


    rows.forEach(
        row => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "recent-item";


            const status =
                row.status ||
                "Pending";


            div.innerHTML = `

                <div class="recent-icon">

                    <i
                        class="fa-solid fa-receipt"
                    ></i>

                </div>

                <div class="recent-info">

                    <div class="recent-title">

                        ${escapeHtml(
                            row.title
                        )}

                    </div>

                    <div class="recent-meta">

                        ${escapeHtml(
                            row.category
                        )}

                        ${row.department
                            ? " • " +
                              escapeHtml(
                                  row.department
                              )
                            : ""}

                        •
                        ${formatDate(
                            row.date
                        )}

                    </div>

                </div>

                <div class="recent-right">

                    <div class="recent-amount">

                        ${money(
                            row.amount
                        )}

                    </div>

                    <span class="recent-status">

                        ${escapeHtml(
                            status
                        )}

                    </span>

                </div>
            `;


            container.appendChild(
                div
            );
        }
    );
}


/* =========================================================
   APPROVALS
========================================================= */

function renderApprovals(data) {

    const badge =
        document.getElementById(
            "approvalBadge"
        );

    if (badge) {

        badge.textContent =
            data.pending_approvals || 0;

    }
}


/* =========================================================
   ADD EXPENSE
========================================================= */

function openExpenseModal() {

    document.getElementById(
        "expenseModal"
    ).classList.remove(
        "hidden"
    );
}


function closeExpenseModal() {

    document.getElementById(
        "expenseModal"
    ).classList.add(
        "hidden"
    );
}


/* =========================================================
   CREATE EXPENSE
========================================================= */

async function createExpense(
    event
) {

    event.preventDefault();


    const payload = {

        transaction_date:
            document.getElementById(
                "expenseDate"
            ).value,

        category:
            document.getElementById(
                "expenseCategory"
            ).value.trim(),

        department:
            document.getElementById(
                "expenseDepartment"
            ).value.trim() || null,

        amount:
            Number(
                document.getElementById(
                    "expenseAmount"
                ).value
            ),

        status:
            document.getElementById(
                "expenseStatus"
            ).value
    };


    try {

        await apiFetch(
            `${API_BASE}/api/finance/expenditures`,
            {
                method: "POST",
                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

        closeExpenseModal();

        document.getElementById(
            "expenseForm"
        ).reset();

        await loadExpenditures();

        alert(
            "Expense created successfully."
        );

    } catch (error) {

        console.error(
            "Create expense error:",
            error
        );

        alert(
            error.message
        );
    }
}


/* =========================================================
   ADD POST ROUTE FOR CREATE
========================================================= */

async function saveExpenseDirectly(
    event
) {

    event.preventDefault();

    const payload = {

        transaction_date:
            document.getElementById(
                "expenseDate"
            ).value,

        category:
            document.getElementById(
                "expenseCategory"
            ).value.trim(),

        department:
            document.getElementById(
                "expenseDepartment"
            ).value.trim() || null,

        amount:
            Number(
                document.getElementById(
                    "expenseAmount"
                ).value
            ),

        status:
            document.getElementById(
                "expenseStatus"
            ).value
    };


    try {

        await apiFetch(
            `${API_BASE}/api/finance/expenditures`,
            {
                method: "POST",
                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

        closeExpenseModal();

        document.getElementById(
            "expenseForm"
        ).reset();

        await loadExpenditures();

        alert(
            "Expense added successfully."
        );

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================================
   EXPORT
========================================================= */

async function exportExpenses() {

    const year =
        document.getElementById(
            "yearFilter"
        ).value;

    const token =
        getToken();


    try {

        const response =
            await fetch(
                `${API_BASE}/api/finance/expenditures/export?year=${year}`,
                {
                    headers: token
                        ? {
                            Authorization:
                                `Bearer ${token}`
                        }
                        : {}
                }
            );


        if (!response.ok) {

            throw new Error(
                `Export failed: HTTP ${response.status}`
            );
        }


        const blob =
            await response.blob();


        const url =
            URL.createObjectURL(
                blob
            );


        const a =
            document.createElement(
                "a"
            );

        a.href = url;

        a.download =
            `expenses-${year}.csv`;

        document.body.appendChild(a);

        a.click();

        a.remove();

        URL.revokeObjectURL(url);

    } catch (error) {

        console.error(
            error
        );

        alert(
            error.message
        );
    }
}


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {

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


function escapeHtml(value) {

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


function setLoading(
    loading
) {

    document.body.classList.toggle(
        "loading",
        loading
    );
}


function showError(
    message
) {

    console.error(
        "Dashboard error:",
        message
    );
}


/* =========================================================
   EVENTS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const year =
            document.getElementById(
                "yearFilter"
            );

        const currentYear =
            new Date().getFullYear();


        if (year) {

            if (
                !Array.from(
                    year.options
                ).some(
                    option =>
                        Number(
                            option.value
                        ) === currentYear
                )
            ) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    currentYear;

                option.textContent =
                    currentYear;

                year.prepend(
                    option
                );
            }

            year.value =
                currentYear;
        }


        year?.addEventListener(
            "change",
            loadExpenditures
        );


        document.getElementById(
            "addExpenseBtn"
        )?.addEventListener(
            "click",
            openExpenseModal
        );


        document.getElementById(
            "quickAddExpense"
        )?.addEventListener(
            "click",
            openExpenseModal
        );


        document.getElementById(
            "closeModal"
        )?.addEventListener(
            "click",
            closeExpenseModal
        );


        document.getElementById(
            "expenseForm"
        )?.addEventListener(
            "submit",
            saveExpenseDirectly
        );


        document.getElementById(
            "exportExpenses"
        )?.addEventListener(
            "click",
            exportExpenses
        );


        document.getElementById(
            "uploadReceipt"
        )?.addEventListener(
            "click",
            function() {

                alert(
                    "Receipt upload requires the FinanceExpenseAttachment table and upload API."
                );

            }
        );


        document.getElementById(
            "recurringExpenses"
        )?.addEventListener(
            "click",
            function() {

                alert(
                    "Recurring expenses require the FinanceRecurringExpense table."
                );

            }
        );


        document.getElementById(
            "approveExpenses"
        )?.addEventListener(
            "click",
            function() {

                window.location.href =
                    "/FinancerApprovals";

            }
        );


        document.getElementById(
            "expenseReport"
        )?.addEventListener(
            "click",
            function() {

                window.location.href =
                    "/FinancialReports";

            }
        );


        await loadProfile();

        await loadExpenditures();

    }
);