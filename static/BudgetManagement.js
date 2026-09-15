const API_BASE = window.location.origin;

let budgetActualChart = null;
let utilizationChart = null;

let dashboardData = null;


/* =========================================================
   API
========================================================= */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token")
    );
}


async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (
        options.body &&
        !(options.body instanceof FormData)
    ) {
        headers["Content-Type"] =
            "application/json";
    }

    if (token) {
        headers["Authorization"] =
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

        console.error(
            "Budget Management: unauthorized"
        );

        throw new Error(
            "Authentication required."
        );
    }

    const text =
        await response.text();

    let data = {};

    try {
        data = text
            ? JSON.parse(text)
            : {};
    } catch {
        data = {
            detail: text
        };
    }

    if (!response.ok) {

        throw new Error(
            data.detail ||
            `HTTP ${response.status}`
        );
    }

    return data;
}


/* =========================================================
   MONEY
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

    return Number(value || 0);
}


function percent(
    value,
    total
) {

    if (!total) {
        return 0;
    }

    return (
        number(value) /
        number(total)
    ) * 100;
}


/* =========================================================
   CURRENT FY
========================================================= */

function currentFinancialYear() {

    const today = new Date();

    const startYear =
        today.getMonth() >= 3
            ? today.getFullYear()
            : today.getFullYear() - 1;

    return startYear;
}


function fyLabel(year) {

    return `FY ${year}-${String(
        year + 1
    ).slice(-2)}`;
}


/* =========================================================
   LOAD
========================================================= */

async function loadDashboard() {

    const year =
        document.getElementById(
            "yearFilter"
        ).value;

    const url =
        year
            ? `${API_BASE}/api/finance/budget-management?year=${year}`
            : `${API_BASE}/api/finance/budget-management`;

    try {

        showLoading();

        dashboardData =
            await apiFetch(url);

        renderDashboard(
            dashboardData
        );

    } catch (error) {

        console.error(
            "Budget Management load error:",
            error
        );

        showError(
            error.message
        );

    } finally {

        hideLoading();
    }
}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function renderDashboard(data) {

    const kpis =
        data.kpis || {};

    const summary =
        data.summary || {};

    const departments =
        data.departments || [];

    const activities =
        data.activities || [];

    const totalBudget =
        number(kpis.total_budget);

    const allocated =
        number(kpis.total_allocated);

    const spent =
        number(kpis.total_spent);

    const remaining =
        number(kpis.remaining_budget);

    const overBudget =
        number(kpis.over_budget);

    const utilization =
        number(kpis.utilization);

    /* -----------------------------------------
       KPI
    ----------------------------------------- */

    setText(
        "totalBudget",
        money(totalBudget)
    );

    setText(
        "totalAllocated",
        money(allocated)
    );

    setText(
        "totalSpent",
        money(spent)
    );

    setText(
        "remainingBudget",
        money(remaining)
    );

    setText(
        "overBudget",
        money(overBudget)
    );

    const allocatedPercent =
        percent(
            allocated,
            totalBudget
        );

    const spentPercent =
        percent(
            spent,
            totalBudget
        );

    const remainingPercent =
        percent(
            remaining,
            totalBudget
        );

    setText(
        "allocatedPercent",
        allocatedPercent.toFixed(2)
    );

    setText(
        "spentPercent",
        spentPercent.toFixed(2)
    );

    setText(
        "remainingPercent",
        remainingPercent.toFixed(2)
    );

    setText(
        "fyText",
        fyLabel(data.year)
    );

    document
        .getElementById(
            "allocatedProgress"
        )
        .style.width =
        `${Math.min(
            allocatedPercent,
            100
        )}%`;

    document
        .getElementById(
            "spentProgress"
        )
        .style.width =
        `${Math.min(
            spentPercent,
            100
        )}%`;

    document
        .getElementById(
            "remainingProgress"
        )
        .style.width =
        `${Math.min(
            remainingPercent,
            100
        )}%`;


    const overCount =
        departments.filter(
            item =>
                number(item.actual) >
                number(item.budget)
        ).length;

    setText(
        "overBudgetDepartments",
        `${overCount} Departments`
    );


    /* -----------------------------------------
       SUMMARY
    ----------------------------------------- */

    setText(
        "totalDepartments",
        summary.total_departments || 0
    );

    setText(
        "activeBudgets",
        summary.active_budgets || 0
    );

    setText(
        "completedBudgets",
        summary.completed_budgets || 0
    );

    setText(
        "pendingApproval",
        summary.pending_approval || 0
    );


    /* -----------------------------------------
       UTILIZATION
    ----------------------------------------- */

    setText(
        "utilizationValue",
        `${utilization.toFixed(2)}%`
    );

    setText(
        "legendSpent",
        `${money(spent)} (${utilization.toFixed(2)}%)`
    );

    setText(
        "legendRemaining",
        `${money(remaining)} (${remainingPercent.toFixed(2)}%)`
    );


    /* -----------------------------------------
       TABLE
    ----------------------------------------- */

    renderDepartments(
        departments
    );


    /* -----------------------------------------
       ACTIVITIES
    ----------------------------------------- */

    renderActivities(
        activities
    );


    /* -----------------------------------------
       CHARTS
    ----------------------------------------- */

    renderBudgetChart(
        departments
    );

    renderUtilizationChart(
        spent,
        remaining
    );
}


/* =========================================================
   DEPARTMENT TABLE
========================================================= */

function renderDepartments(
    departments
) {

    const tbody =
        document.getElementById(
            "departmentTable"
        );

    const tfoot =
        document.getElementById(
            "departmentTotal"
        );

    tbody.innerHTML = "";
    tfoot.innerHTML = "";

    let totalBudget = 0;
    let totalAllocated = 0;
    let totalActual = 0;

    departments.forEach(
        department => {

            const budget =
                number(department.budget);

            const allocated =
                number(
                    department.allocated
                );

            const actual =
                number(department.actual);

            const utilization =
                number(
                    department.utilization
                );

            totalBudget += budget;
            totalAllocated += allocated;
            totalActual += actual;

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td>
                    ${escapeHtml(
                        department.department
                    )}
                </td>

                <td>
                    ${formatIndian(budget)}
                </td>

                <td>
                    ${formatIndian(allocated)}
                </td>

                <td>
                    ${formatIndian(actual)}
                </td>

                <td>
                    ${utilization.toFixed(2)}%
                </td>

                <td>
                    ${statusBadge(
                        department.status
                    )}
                </td>
            `;

            tbody.appendChild(tr);
        }
    );

    const totalUtilization =
        totalBudget > 0
            ? (
                totalActual /
                totalBudget
            ) * 100
            : 0;

    tfoot.innerHTML = `
        <tr>

            <td>Total</td>

            <td>
                ${formatIndian(totalBudget)}
            </td>

            <td>
                ${formatIndian(totalAllocated)}
            </td>

            <td>
                ${formatIndian(totalActual)}
            </td>

            <td>
                ${totalUtilization.toFixed(2)}%
            </td>

            <td></td>

        </tr>
    `;
}


/* =========================================================
   STATUS
========================================================= */

function statusBadge(
    status
) {

    const normalized =
        String(status || "")
            .toLowerCase();

    let className =
        "on-track";

    if (
        normalized.includes(
            "over"
        )
    ) {
        className = "over";

    } else if (
        normalized.includes(
            "pending"
        )
    ) {
        className = "pending";

    } else if (
        normalized.includes(
            "completed"
        )
    ) {
        className = "completed";
    }

    return `
        <span class="status ${className}">
            ${escapeHtml(status || "On Track")}
        </span>
    `;
}


/* =========================================================
   ACTIVITIES
========================================================= */

function renderActivities(
    activities
) {

    const container =
        document.getElementById(
            "activitiesList"
        );

    container.innerHTML = "";

    if (!activities.length) {

        container.innerHTML = `
            <div class="empty">
                No recent budget activities.
            </div>
        `;

        return;
    }

    activities.forEach(
        activity => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "activity";

            const amount =
                number(
                    activity.amount
                );

            const date =
                activity.date
                    ? formatDate(
                        activity.date
                    )
                    : "";

            div.innerHTML = `

                <div class="activity-icon">

                    <i class="fa-solid fa-file-invoice-dollar"></i>

                </div>

                <div class="activity-content">

                    <div class="activity-title">
                        ${escapeHtml(
                            activity.title
                        )}
                    </div>

                    <div class="activity-desc">
                        ${escapeHtml(
                            activity.description
                        )}
                    </div>

                </div>

                <div class="activity-right">

                    <strong>
                        ${amount
                            ? money(amount)
                            : ""}
                    </strong>

                    <span>
                        ${date}
                    </span>

                </div>
            `;

            container.appendChild(div);
        }
    );
}


/* =========================================================
   BUDGET CHART
========================================================= */

function renderBudgetChart(
    departments
) {

    const labels =
        departments.map(
            item => item.department
        );

    const budgetValues =
        departments.map(
            item => number(item.budget)
        );

    const actualValues =
        departments.map(
            item => number(item.actual)
        );

    const canvas =
        document.getElementById(
            "budgetActualChart"
        );

    if (budgetActualChart) {
        budgetActualChart.destroy();
    }

    budgetActualChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {
                            label: "Budget",
                            data: budgetValues,
                            backgroundColor:
                                "#1769d3",
                            borderRadius: 2
                        },

                        {
                            label: "Actual",
                            data: actualValues,
                            backgroundColor:
                                "#18a65b",
                            borderRadius: 2
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

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

                        y: {

                            beginAtZero: true,

                            ticks: {
                                font: {
                                    size: 9
                                },

                                callback: value =>
                                    `₹${formatCompact(
                                        value
                                    )}`
                            },

                            grid: {
                                color:
                                    "#edf1f5"
                            }
                        },

                        x: {

                            ticks: {
                                font: {
                                    size: 8
                                }
                            },

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
   DONUT
========================================================= */

function renderUtilizationChart(
    spent,
    remaining
) {

    const canvas =
        document.getElementById(
            "utilizationChart"
        );

    if (utilizationChart) {
        utilizationChart.destroy();
    }

    utilizationChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: [
                        "Spent",
                        "Remaining"
                    ],

                    datasets: [
                        {
                            data: [
                                spent,
                                remaining
                            ],

                            backgroundColor: [
                                "#18b866",
                                "#e2e7ee"
                            ],

                            borderWidth: 0
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "68%",

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
   CREATE BUDGET
========================================================= */

async function createBudget(
    event
) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    const payload = {

        department:
            formData.get(
                "department"
            ),

        budget:
            number(
                formData.get(
                    "budget"
                )
            ),

        allocated:
            number(
                formData.get(
                    "allocated"
                )
            ),

        year:
            Number(
                formData.get(
                    "year"
                )
            ),

        status:
            formData.get(
                "status"
            )
    };

    try {

        await apiFetch(
            `${API_BASE}/api/finance/budget-management`,
            {
                method: "POST",
                body: JSON.stringify(
                    payload
                )
            }
        );

        closeModal(
            "budgetModal"
        );

        form.reset();

        await loadDashboard();

        alert(
            "Budget created successfully."
        );

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================================
   INITIALIZE YEARS
========================================================= */

function initializeYears() {

    const current =
        currentFinancialYear();

    const select =
        document.getElementById(
            "yearFilter"
        );

    select.innerHTML = "";

    for (
        let year = current + 1;
        year >= current - 4;
        year--
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value = year;

        option.textContent =
            fyLabel(year);

        if (
            year === current
        ) {
            option.selected = true;
        }

        select.appendChild(option);
    }

    document.getElementById(
        "budgetYear"
    ).value = current;
}


/* =========================================================
   AUTH USER
========================================================= */

async function loadCurrentUser() {

    try {

        const user =
            await apiFetch(
                `${API_BASE}/api/finance/profile`
            );

        setText(
            "sidebarName",
            user.name || "Finance Officer"
        );

        setText(
            "headerName",
            user.name || "Finance Officer"
        );

        setText(
            "sidebarRole",
            user.role || "Finance Officer"
        );

        setText(
            "headerRole",
            user.role || "Finance Officer"
        );

    } catch (error) {

        console.warn(
            "Unable to load current user:",
            error.message
        );
    }
}


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    document
        .getElementById(
            "yearFilter"
        )
        .addEventListener(
            "change",
            loadDashboard
        );

    document
        .getElementById(
            "refreshBtn"
        )
        .addEventListener(
            "click",
            loadDashboard
        );

    document
        .getElementById(
            "createBudgetBtn"
        )
        .addEventListener(
            "click",
            () =>
                openModal(
                    "budgetModal"
                )
        );

    document
        .getElementById(
            "budgetForm"
        )
        .addEventListener(
            "submit",
            createBudget
        );

    document
        .querySelectorAll(
            ".close-modal"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        closeModal(
                            button.dataset.close
                        )
                );
            }
        );

    document
        .getElementById(
            "exportBtn"
        )
        .addEventListener(
            "click",
            exportBudgetData
        );

    document
        .getElementById(
            "allocateBudgetBtn"
        )
        .addEventListener(
            "click",
            allocatePrompt
        );

    document
        .getElementById(
            "transferBudgetBtn"
        )
        .addEventListener(
            "click",
            transferPrompt
        );
}


/* =========================================================
   ALLOCATION UI
========================================================= */

async function allocatePrompt() {

    if (
        !dashboardData ||
        !dashboardData.departments.length
    ) {
        alert(
            "No budgets are available."
        );

        return;
    }

    const names =
        dashboardData.departments
            .map(
                item =>
                    `${item.id} - ${item.department}`
            )
            .join("\n");

    const id =
        prompt(
            `Enter Budget ID:\n\n${names}`
        );

    if (!id) {
        return;
    }

    const amount =
        Number(
            prompt(
                "Enter allocation amount:"
            )
        );

    if (
        !amount ||
        amount <= 0
    ) {
        return;
    }

    try {

        await apiFetch(
            `${API_BASE}/api/finance/budget-management/${id}/allocate`,
            {
                method: "POST",

                body: JSON.stringify({
                    budget_id: Number(id),
                    amount
                })
            }
        );

        await loadDashboard();

        alert(
            "Budget allocated successfully."
        );

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================================
   TRANSFER UI
========================================================= */

async function transferPrompt() {

    if (
        !dashboardData ||
        dashboardData.departments.length < 2
    ) {

        alert(
            "At least two budgets are required."
        );

        return;
    }

    const names =
        dashboardData.departments
            .map(
                item =>
                    `${item.id} - ${item.department}`
            )
            .join("\n");

    const from =
        prompt(
            `Source Budget ID:\n\n${names}`
        );

    if (!from) {
        return;
    }

    const to =
        prompt(
            `Destination Budget ID:\n\n${names}`
        );

    if (!to) {
        return;
    }

    const amount =
        Number(
            prompt(
                "Transfer amount:"
            )
        );

    if (
        !amount ||
        amount <= 0
    ) {
        return;
    }

    try {

        await apiFetch(
            `${API_BASE}/api/finance/budget-management/transfer`,
            {
                method: "POST",

                body: JSON.stringify({
                    from_budget_id:
                        Number(from),

                    to_budget_id:
                        Number(to),

                    amount
                })
            }
        );

        await loadDashboard();

        alert(
            "Budget transferred successfully."
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

async function exportBudgetData() {

    const year =
        document.getElementById(
            "yearFilter"
        ).value;

    const rows =
        dashboardData?.departments ||
        [];

    if (!rows.length) {

        alert(
            "No budget data to export."
        );

        return;
    }

    const header = [
        "Department",
        "Budget",
        "Allocated",
        "Spent",
        "Remaining",
        "Utilization",
        "Status"
    ];

    const csv = [
        header.join(",")
    ];

    rows.forEach(
        row => {

            csv.push(
                [
                    csvEscape(
                        row.department
                    ),

                    row.budget,

                    row.allocated,

                    row.actual,

                    row.remaining,

                    row.utilization,

                    csvEscape(
                        row.status
                    )

                ].join(",")
            );
        }
    );

    const blob =
        new Blob(
            [
                csv.join("\n")
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );

    const url = URL.createObjectURL(blob);

    const a = document.createElement( "a" );

    a.href = url;

    a.download =
        `budget-management-${year}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}


/* =========================================================
   HELPERS
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value ?? "";
    }
}


function formatIndian(
    value
) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            maximumFractionDigits: 0
        }
    ).format(
        number(value)
    );
}


function formatCompact(
    value
) {

    const n =
        number(value);

    if (n >= 10000000) {
        return (
            n / 10000000
        ).toFixed(1) + "Cr";
    }

    if (n >= 100000) {
        return (
            n / 100000
        ).toFixed(1) + "L";
    }

    if (n >= 1000) {
        return (
            n / 1000
        ).toFixed(1) + "K";
    }

    return n;
}


function formatDate(
    value
) {

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


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function csvEscape(
    value
) {

    return `"${String(
        value ?? ""
    ).replaceAll(
        '"',
        '""'
    )}"`;
}


function openModal(
    id
) {

    document
        .getElementById(id)
        .classList.add(
            "show"
        );
}


function closeModal(
    id
) {

    document
        .getElementById(id)
        .classList.remove(
            "show"
        );
}


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


function showError(
    message
) {

    console.error(
        message
    );
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeYears();

        setupEvents();

        await loadCurrentUser();

        await loadDashboard();

    }
);