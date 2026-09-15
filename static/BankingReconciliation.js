const API_BASE = "http://127.0.0.1:8000";

let cashFlowChart = null;
let reconciliationChart = null;


/* =========================================================
   API
========================================================= */

async function apiFetch(url, options = {}) {

    const token =
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        localStorage.getItem("jwt_token");

    console.log("API REQUEST:", url);
    console.log("JWT EXISTS:", !!token);

    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers
    });

    console.log(
        "API RESPONSE:",
        response.status,
        url
    );

    if (response.status === 401) {

        console.error(
            "401 Unauthorized:",
            url
        );

        /*
         * Do NOT immediately delete the token while debugging.
         * Otherwise you lose the token that may help identify
         * the authentication problem.
         */

        let detail = "Not authenticated";

        try {
            const data = await response.json();

            console.error(
                "Backend authentication response:",
                data
            );

            detail =
                data.detail ||
                data.message ||
                detail;

        } catch (error) {
            console.error(
                "Could not parse 401 response"
            );
        }

        throw new Error(detail);
    }

    if (!response.ok) {

        let detail = "";

        try {

            const data =
                await response.json();

            detail =
                data.detail ||
                data.message ||
                "";

        } catch (_) {}

        throw new Error(
            detail ||
            `HTTP ${response.status}`
        );
    }

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {
        return await response.json();
    }

    return {};
}


/* =========================================================
   CURRENCY
========================================================= */

function formatINR(value) {

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


/* =========================================================
   DATE
========================================================= */

function getDefaultDates() {

    const today = new Date();

    const start = new Date(today);

    start.setDate(
        today.getDate() - 7
    );

    return {
        from:
            start.toISOString()
                .slice(0, 10),

        to:
            today.toISOString()
                .slice(0, 10)
    };
}


function setDefaultDates() {

    const dates = getDefaultDates();

    document.getElementById(
        "fromDate"
    ).value = dates.from;

    document.getElementById(
        "toDate"
    ).value = dates.to;
}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {

    try {

        const profile = await apiFetch(
            `${API_BASE}/api/finance/profile`
        );

        const name =
            profile.name ||
            profile.full_name ||
            "Rajesh Kumar";

        const role =
            profile.role ||
            "Finance Officer";

        document.getElementById(
            "profileName"
        ).textContent = name;

        document.getElementById(
            "sidebarName"
        ).textContent = name;

        document.getElementById(
            "profileRole"
        ).textContent = role;

        document.getElementById(
            "sidebarRole"
        ).textContent = role;

        if (profile.profile_image) {

            document.getElementById(
                "profileAvatar"
            ).src = profile.profile_image;

            document.getElementById(
                "sidebarAvatar"
            ).src = profile.profile_image;
        }

    } catch (error) {

        console.warn(
            "Profile could not be loaded:",
            error
        );
    }
}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    const fromDate =
        document.getElementById(
            "fromDate"
        ).value;

    const toDate =
        document.getElementById(
            "toDate"
        ).value;

    const params =
        new URLSearchParams();

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

    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/finance/banking-reconciliation?${params.toString()}`
            );

        renderKPIs(data);
        renderCashFlow(data);
        renderReconciliation(data);
        renderOverview(data);
        renderBankAccounts(data);
        renderRecentReconciliations(data);
        renderSummary(data);

    } catch (error) {

        console.error(
            "BANKING DASHBOARD ERROR:",
            error
        );

        showError(
            error.message
        );
    }
}


/* =========================================================
   KPIs
========================================================= */

function renderKPIs(data) {

    const kpis =
        data.kpis || {};

    const total =
        Number(
            kpis.total_bank_balance || 0
        );

    const reconciled =
        Number(
            kpis.reconciled_balance || 0
        );

    const unreconciled =
        Number(
            kpis.unreconciled_balance || 0
        );

    const rate =
        Number(
            kpis.reconciliation_rate || 0
        );

    document.getElementById(
        "totalBankBalance"
    ).textContent =
        formatINR(total);

    document.getElementById(
        "reconciledBalance"
    ).textContent =
        formatINR(reconciled);

    document.getElementById(
        "unreconciledBalance"
    ).textContent =
        formatINR(unreconciled);

    document.getElementById(
        "transactionCount"
    ).textContent =
        Number(
            kpis.transactions_this_month || 0
        ).toLocaleString("en-IN");

    document.getElementById(
        "reconciliationRate"
    ).textContent =
        `${rate.toFixed(2)}%`;

    document.getElementById(
        "reconciledPercent"
    ).textContent =
        `${rate.toFixed(2)}% of Total Balance`;

    const unreconciledRate =
        total
            ? (
                unreconciled /
                total *
                100
            )
            : 0;

    document.getElementById(
        "unreconciledPercent"
    ).textContent =
        `${unreconciledRate.toFixed(2)}% of Total Balance`;

    document.getElementById(
        "accountCount"
    ).textContent =
        `Across ${kpis.account_count || 0} Accounts`;

    document.getElementById(
        "reconciliationProgress"
    ).style.width =
        `${Math.min(rate, 100)}%`;
}


/* =========================================================
   CASH FLOW CHART
========================================================= */

function renderCashFlow(data) {

    const flow =
        data.cash_flow || {};

    const labels =
        flow.labels || [];

    const moneyIn =
        flow.money_in || [];

    const moneyOut =
        flow.money_out || [];

    const netFlow =
        flow.net_flow || [];

    const ctx =
        document.getElementById(
            "cashFlowChart"
        );

    if (cashFlowChart) {
        cashFlowChart.destroy();
    }

    cashFlowChart =
        new Chart(
            ctx,
            {
                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {
                            label: "Money In (₹)",
                            data: moneyIn,
                            backgroundColor:
                                "#176be5",
                            borderRadius: 3
                        },

                        {
                            label: "Money Out (₹)",
                            data: moneyOut,
                            backgroundColor:
                                "#15a85b",
                            borderRadius: 3
                        },

                        {
                            label: "Net Flow (₹)",
                            data: netFlow,
                            type: "line",
                            borderColor:
                                "#f59b16",
                            backgroundColor:
                                "#f59b16",
                            borderWidth: 2,
                            pointRadius: 3,
                            tension: .35
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
                                boxWidth: 9,
                                font: {
                                    size: 10
                                }
                            }
                        }

                    },

                    scales: {

                        x: {
                            grid: {
                                color: "#edf0f5"
                            },
                            ticks: {
                                font: {
                                    size: 9
                                }
                            }
                        },

                        y: {

                            grid: {
                                color: "#edf0f5"
                            },

                            ticks: {
                                font: {
                                    size: 9
                                },

                                callback:
                                    value =>
                                        `₹${Number(value).toLocaleString("en-IN")}`
                            }

                        }

                    }

                }

            }
        );
}


/* =========================================================
   RECONCILIATION DONUT
========================================================= */

function renderReconciliation(data) {

    const status =
        data.reconciliation_status
        || {};

    const values =
        status.values || [0, 0];

    const labels =
        status.labels
        || [
            "Reconciled",
            "Unreconciled"
        ];

    const reconciled =
        Number(values[0] || 0);

    const unreconciled =
        Number(values[1] || 0);

    const total =
        reconciled +
        unreconciled;

    const percentage =
        total
            ? reconciled / total * 100
            : 0;

    document.getElementById(
        "donutPercentage"
    ).textContent =
        `${percentage.toFixed(2)}%`;

    const ctx =
        document.getElementById(
            "reconciliationChart"
        );

    if (reconciliationChart) {
        reconciliationChart.destroy();
    }

    reconciliationChart =
        new Chart(
            ctx,
            {
                type: "doughnut",

                data: {

                    labels,

                    datasets: [
                        {
                            data: values,
                            backgroundColor: [
                                "#13a85a",
                                "#e3e8ef"
                            ],
                            borderWidth: 0,
                            cutout: "67%"
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
                    }

                }

            }
        );

    document.getElementById(
        "reconciliationLegend"
    ).innerHTML = `

        <div class="legend-row">

            <div class="legend-left">

                <span
                    class="legend-dot"
                    style="background:#13a85a"
                ></span>

                <span>Reconciled</span>

            </div>

            <strong>
                ${formatINR(reconciled)}
                (${percentage.toFixed(2)}%)
            </strong>

        </div>

        <div class="legend-row">

            <div class="legend-left">

                <span
                    class="legend-dot"
                    style="background:#e3e8ef"
                ></span>

                <span>Unreconciled</span>

            </div>

            <strong>
                ${formatINR(unreconciled)}
                (${(100 - percentage).toFixed(2)}%)
            </strong>

        </div>

    `;
}


/* =========================================================
   OVERVIEW
========================================================= */

function renderOverview(data) {

    const overview =
        data.reconciliation_overview
        || {};

    document.getElementById(
        "totalStatements"
    ).textContent =
        overview.total_statements || 0;

    document.getElementById(
        "reconciledStatements"
    ).textContent =
        overview.reconciled || 0;

    document.getElementById(
        "inProgressStatements"
    ).textContent =
        overview.in_progress || 0;

    document.getElementById(
        "pendingStatements"
    ).textContent =
        overview.pending || 0;

    document.getElementById(
        "failedStatements"
    ).textContent =
        overview.failed || 0;
}


/* =========================================================
   BANK ACCOUNTS
========================================================= */

function renderBankAccounts(data) {

    const accounts =
        data.bank_accounts || [];

    const tbody =
        document.getElementById(
            "bankAccountsBody"
        );

    tbody.innerHTML = "";

    let totalBalance = 0;
    let totalReconciled = 0;

    accounts.forEach(
        account => {

            totalBalance +=
                Number(
                    account.balance || 0
                );

            totalReconciled +=
                Number(
                    account.reconciled_balance || 0
                );

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                    <a
                        href="#"
                        style="color:#1264e8;font-weight:600"
                    >
                        ${escapeHtml(
                            account.account_name
                        )}
                    </a>
                </td>

                <td>
                    ${maskAccount(
                        account.account_number
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        account.bank_name
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        account.account_type
                    )}
                </td>

                <td>
                    ${formatINR(
                        account.balance
                    )}
                </td>

                <td>
                    ${formatINR(
                        account.reconciled_balance
                    )}
                </td>

                <td>
                    <span class="status status-reconciled">
                        ${escapeHtml(
                            account.status
                        )}
                    </span>
                </td>
            `;

            tbody.appendChild(row);
        }
    );

    document.getElementById(
        "tableTotalBalance"
    ).textContent =
        formatINR(totalBalance);

    document.getElementById(
        "tableReconciledBalance"
    ).textContent =
        formatINR(totalReconciled);
}


/* =========================================================
   RECENT RECONCILIATIONS
========================================================= */

function renderRecentReconciliations(data) {

    const rows =
        data.recent_reconciliations
        || [];

    const tbody =
        document.getElementById(
            "recentReconciliationsBody"
        );

    tbody.innerHTML = "";

    rows.forEach(
        row => {

            const tr =
                document.createElement("tr");

            const status =
                String(
                    row.status || ""
                ).toLowerCase();

            let statusClass =
                "status-pending";

            if (
                status === "reconciled"
            ) {
                statusClass =
                    "status-reconciled";
            }
            else if (
                status.includes("progress")
            ) {
                statusClass =
                    "status-progress";
            }
            else if (
                status === "failed"
            ) {
                statusClass =
                    "status-failed";
            }

            const difference =
                Number(
                    row.difference || 0
                );

            tr.innerHTML = `

                <td>
                    <a
                        href="#"
                        style="color:#1264e8;font-weight:600"
                    >
                        ${escapeHtml(
                            row.account
                        )}
                    </a>
                </td>

                <td>
                    ${formatDate(
                        row.statement_date
                    )}
                </td>

                <td>
                    ${formatDate(
                        row.reconciled_on
                    )}
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

                <td
                    class="${
                        difference === 0
                            ? "difference-zero"
                            : "difference-positive"
                    }"
                >
                    ${formatINR(
                        difference
                    )}
                </td>

            `;

            tbody.appendChild(tr);
        }
    );
}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(data) {

    const summary =
        data.reconciliation_summary
        || {};

    document.getElementById(
        "endingBankBalance"
    ).textContent =
        formatINR(
            summary.ending_balance
        );

    document.getElementById(
        "endingBooksBalance"
    ).textContent =
        formatINR(
            summary.ending_balance_books
        );

    document.getElementById(
        "endingDifference"
    ).textContent =
        formatINR(
            summary.difference
        );
}


/* =========================================================
   HELPERS
========================================================= */

function maskAccount(account) {

    if (!account) {
        return "XXXX XXXX";
    }

    const value =
        String(account);

    if (value.length <= 4) {
        return value;
    }

    return (
        "XXXX XXXX " +
        value.slice(-4)
    );
}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    )) {
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
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   QUICK ACTIONS
========================================================= */

function uploadStatement() {

    window.location.href =
        "/bank-statements/upload";
}

function matchTransactions() {

    window.location.href =
        "/bank-transactions/match";
}

function reconcileAccount() {

    window.location.href =
        "/bank-reconciliation";
}

function manualJournal() {

    window.location.href =
        "/manual-journal";
}

function bankRegister() {

    window.location.href =
        "/bank-accounts";
}

function reconciliationReport() {

    window.location.href =
        "/reports/reconciliation";
}


/* =========================================================
   ERROR
========================================================= */

function showError(message) {

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
    async () => {

        setDefaultDates();

        document.getElementById(
            "applyDate"
        ).addEventListener(
            "click",
            loadDashboard
        );

        document.getElementById(
            "globalSearch"
        ).addEventListener(
            "input",
            function () {

                const value =
                    this.value
                    .trim()
                    .toLowerCase();

                document
                    .querySelectorAll(
                        "#bankAccountsBody tr, #recentReconciliationsBody tr"
                    )
                    .forEach(
                        row => {

                            row.style.display =
                                row.textContent
                                    .toLowerCase()
                                    .includes(value)
                                    ? ""
                                    : "none";
                        }
                    );
            }
        );

        await loadProfile();

        await loadDashboard();
    }
);