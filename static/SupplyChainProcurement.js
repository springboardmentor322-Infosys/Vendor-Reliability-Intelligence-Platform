const API_BASE =
    "http://127.0.0.1:8000";

const DASHBOARD_API =
    `${API_BASE}/api/supplychain/procurement/dashboard`;

const PR_API =
    `${API_BASE}/api/supplychain/procurement/requisitions`;


let poChart = null;
let spendChart = null;

let dashboardData = null;


/* ======================================================
   API HELPER
====================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {
                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                },

                ...options
            }
        );

    if (!response.ok) {

        let message =
            "API request failed";

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


/* ======================================================
   LOAD DASHBOARD
====================================================== */

async function loadDashboard() {

    try {

        showLoading();

        dashboardData =
            await apiFetch(
                DASHBOARD_API
            );

        renderStatistics(
            dashboardData
        );

        renderPOChart(
            dashboardData.po_status
        );

        renderRecentPOs(
            dashboardData.recent_purchase_orders
        );

        renderApprovals(
            dashboardData.pending_approvals_list
        );

        renderSpendChart(
            dashboardData.monthly_spend
        );

        renderCategories(
            dashboardData.categories
        );

        renderRequisitions(
            dashboardData.requisitions
        );

    } catch (error) {

        console.error(error);

        showToast(
            error.message
        );

    }

}


/* ======================================================
   STATISTICS
====================================================== */

function renderStatistics(data) {

    document.getElementById(
        "totalPRs"
    ).textContent =
        Number(
            data.total_prs
        ).toLocaleString();


    document.getElementById(
        "totalPOValue"
    ).textContent =
        formatCurrency(
            data.total_po_value
        );


    document.getElementById(
        "approvedPOs"
    ).textContent =
        Number(
            data.approved_pos
        ).toLocaleString();


    document.getElementById(
        "pendingApprovals"
    ).textContent =
        Number(
            data.pending_approvals
        ).toLocaleString();


    const totalPOs =
        data.po_status.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.count
                ),
            0
        );

    document.getElementById(
        "totalPOCount"
    ).textContent =
        totalPOs;


    const totalSpend =
        data.monthly_spend.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.amount
                ),
            0
        );

    document.getElementById(
        "totalSpend"
    ).textContent =
        formatCurrency(
            totalSpend
        );

}


/* ======================================================
   PO DONUT
====================================================== */

function renderPOChart(
    statusData
) {

    const canvas =
        document.getElementById(
            "poChart"
        );

    if (!canvas) return;


    const labels =
        statusData.map(
            item =>
                item.status
        );


    const values =
        statusData.map(
            item =>
                item.count
        );


    const colors = [
        "#2468df",
        "#16ad68",
        "#f5a623",
        "#32b8c0",
        "#7444df",
        "#e64b4b"
    ];


    if (poChart) {

        poChart.destroy();

    }


    poChart =
        new Chart(
            canvas,
            {

                type:
                    "doughnut",

                data: {

                    labels,

                    datasets: [{

                        data:
                            values,

                        backgroundColor:
                            colors,

                        borderWidth:
                            3,

                        borderColor:
                            "#ffffff"
                    }]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    cutout:
                        "68%",

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
            "poLegend"
        );

    legend.innerHTML = "";


    statusData.forEach(
        (
            item,
            index
        ) => {

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
                        background:
                        ${colors[index % colors.length]}
                    "
                ></span>

                <span>
                    ${escapeHTML(item.status)}
                    ${item.count}
                </span>

            `;

            legend.appendChild(
                div
            );

        }
    );

}


/* ======================================================
   RECENT POS
====================================================== */

function renderRecentPOs(
    orders
) {

    const tbody =
        document.getElementById(
            "recentPOBody"
        );

    tbody.innerHTML = "";


    orders.forEach(
        po => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        po.po_number
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        po.pr_number || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        po.vendor
                    )}
                </td>

                <td>
                    ${formatDate(
                        po.order_date
                    )}
                </td>

                <td>
                    ${statusBadge(
                        po.status
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        po.amount
                    )}
                </td>

            `;

            tbody.appendChild(
                row
            );

        }
    );

}


/* ======================================================
   APPROVALS
====================================================== */

function renderApprovals(
    approvals
) {

    const container =
        document.getElementById(
            "pendingApprovalList"
        );

    container.innerHTML = "";


    if (
        !approvals ||
        approvals.length === 0
    ) {

        container.innerHTML = `
            <div class="empty">
                No pending approvals
            </div>
        `;

        return;

    }


    approvals.forEach(
        pr => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "approval-item";

            item.innerHTML = `

                <div class="approval-icon">

                    <i
                        class="fa-solid
                        fa-file-circle-exclamation"
                    ></i>

                </div>

                <div class="approval-main">

                    <strong>
                        ${escapeHTML(
                            pr.pr_number
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            pr.category || "Procurement"
                        )}
                    </span>

                    <small>
                        ${formatDate(
                            pr.created_at
                        )}
                    </small>

                </div>

                <div class="approval-value">

                    ${formatCurrency(
                        pr.amount
                    )}

                </div>

            `;

            container.appendChild(
                item
            );

        }
    );

}


/* ======================================================
   SPEND CHART
====================================================== */

function renderSpendChart(
    monthlyData
) {

    const canvas =
        document.getElementById(
            "spendChart"
        );

    if (!canvas) return;


    const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];


    const values =
        new Array(12).fill(0);


    monthlyData.forEach(
        item => {

            const month =
                Number(
                    item.month
                );

            if (
                month >= 1 &&
                month <= 12
            ) {

                values[
                    month - 1
                ] =
                    Number(
                        item.amount
                    );

            }

        }
    );


    if (spendChart) {

        spendChart.destroy();

    }


    spendChart =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels:
                        monthNames,

                    datasets: [{

                        label:
                            "Spend",

                        data:
                            values,

                        backgroundColor:
                            "#3478e5",

                        borderRadius:
                            2

                    }]

                },

                options: {

                    responsive:
                        true,

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

                                callback:
                                    value =>
                                        formatShortCurrency(
                                            value
                                        )

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


/* ======================================================
   CATEGORIES
====================================================== */

function renderCategories(
    categories
) {

    const container =
        document.getElementById(
            "categoryList"
        );

    container.innerHTML = "";


    if (
        !categories ||
        categories.length === 0
    ) {

        container.innerHTML =
            "<p>No category data available.</p>";

        return;

    }


    const max =
        Math.max(
            ...categories.map(
                item =>
                    Number(
                        item.amount
                    )
            )
        );


    categories.forEach(
        item => {

            const percent =
                max > 0
                    ? (
                        Number(
                            item.amount
                        )
                        / max
                    ) * 100
                    : 0;


            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "category-row";

            row.innerHTML = `

                <span class="category-name">
                    ${escapeHTML(
                        item.category
                    )}
                </span>

                <div class="progress">

                    <div
                        class="progress-bar"
                        style="
                            width:
                            ${percent}%
                        "
                    ></div>

                </div>

                <span class="category-value">
                    ${formatCurrency(
                        item.amount
                    )}
                </span>

            `;

            container.appendChild(
                row
            );

        }
    );

}


/* ======================================================
   REQUISITIONS
====================================================== */

function renderRequisitions(
    requisitions
) {

    const tbody =
        document.getElementById(
            "requisitionBody"
        );

    tbody.innerHTML = "";


    requisitions.forEach(
        pr => {

            const row =
                document.createElement(
                    "tr"
                );

            row.dataset.search =
                `
                ${pr.pr_number}
                ${pr.requester}
                ${pr.department}
                ${pr.status}
                ${pr.priority}
                `.toLowerCase();


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(
                            pr.pr_number
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        pr.requester || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        pr.department || "-"
                    )}
                </td>

                <td>
                    ${formatDate(
                        pr.pr_date
                    )}
                </td>

                <td>
                    ${formatDate(
                        pr.required_date
                    )}
                </td>

                <td>
                    ${priorityBadge(
                        pr.priority
                    )}
                </td>

                <td>
                    ${statusBadge(
                        pr.status
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        pr.total_value
                    )}
                </td>

                <td>

                    <button
                        class="action-button"
                        onclick="
                            viewPR(${pr.id})
                        "
                    >
                        <i
                            class="fa-regular
                            fa-eye"
                        ></i>
                    </button>

                    <button
                        class="action-button"
                        onclick="
                            approvePR(${pr.id})
                        "
                    >
                        <i
                            class="fa-regular
                            fa-pen-to-square"
                        ></i>
                    </button>

                    <button
                        class="action-button"
                        onclick="
                            showPRMenu(${pr.id})
                        "
                    >
                        <i
                            class="fa-solid
                            fa-ellipsis"
                        ></i>
                    </button>

                </td>

            `;

            tbody.appendChild(
                row
            );

        }
    );

}


/* ======================================================
   CREATE PR
====================================================== */

async function createPR(event) {

    event.preventDefault();


    const data = {

        requester:
            document.getElementById(
                "requester"
            ).value,

        department:
            document.getElementById(
                "department"
            ).value,

        category:
            document.getElementById(
                "category"
            ).value,

        amount:
            Number(
                document.getElementById(
                    "amount"
                ).value
            ),

        required_date:
            document.getElementById(
                "requiredDate"
            ).value,

        priority:
            document.getElementById(
                "priority"
            ).value,

        description:
            document.getElementById(
                "description"
            ).value

    };


    try {

        await apiFetch(
            PR_API,
            {

                method:
                    "POST",

                body:
                    JSON.stringify(
                        data
                    )

            }
        );


        closePRModal();

        document.getElementById(
            "prForm"
        ).reset();


        showToast(
            "Purchase requisition created successfully"
        );


        await loadDashboard();

    } catch (error) {

        console.error(error);

        showToast(
            error.message
        );

    }

}


/* ======================================================
   APPROVE PR
====================================================== */

async function approvePR(
    prId
) {

    if (
        !confirm(
            "Approve this purchase requisition?"
        )
    ) {

        return;

    }


    try {

        await apiFetch(
            `${PR_API}/${prId}/status?status=Approved`,
            {
                method:
                    "PATCH"
            }
        );


        showToast(
            "Purchase requisition approved"
        );


        await loadDashboard();

    } catch (error) {

        showToast(
            error.message
        );

    }

}


/* ======================================================
   SEARCH
====================================================== */

function searchDashboard() {

    const value =
        document.getElementById(
            "searchInput"
        ).value
        .trim()
        .toLowerCase();


    document
        .querySelectorAll(
            "#requisitionBody tr"
        )
        .forEach(
            row => {

                const text =
                    row.dataset.search ||
                    row.innerText
                        .toLowerCase();


                row.style.display =
                    !value ||
                    text.includes(value)
                        ? ""
                        : "none";

            }
        );

}


/* ======================================================
   MODAL
====================================================== */

function openPRModal() {

    document
        .getElementById(
            "prModal"
        )
        .classList.add(
            "show"
        );

}


function closePRModal() {

    document
        .getElementById(
            "prModal"
        )
        .classList.remove(
            "show"
        );

}


/* ======================================================
   SIDEBAR
====================================================== */

function toggleSidebar() {

    document
        .querySelector(
            ".sidebar"
        )
        .classList.toggle(
            "open"
        );

}


/* ======================================================
   PENDING APPROVALS
====================================================== */

function loadPendingApprovals() {

    const element =
        document.getElementById(
            "pendingApprovalList"
        );

    element.scrollIntoView({
        behavior:
            "smooth"
    });

}


/* ======================================================
   UPLOAD PR
====================================================== */

function uploadPR() {

    showToast(
        "PR upload module can be connected to /api/supplychain/procurement/upload"
    );

}


/* ======================================================
   VIEW PR
====================================================== */

function viewPR(id) {

    showToast(
        `Opening PR #${id}`
    );

}


/* ======================================================
   MENU
====================================================== */

function showPRMenu(id) {

    showToast(
        `Actions for PR #${id}`
    );

}


/* ======================================================
   STATUS BADGE
====================================================== */

function statusBadge(
    status
) {

    if (!status) {

        return `
            <span class="status">
                -
            </span>
        `;

    }


    const normalized =
        status
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    let cls = "pending";


    if (
        normalized.includes(
            "approved"
        )
    ) {

        cls = "approved";

    } else if (
        normalized.includes(
            "draft"
        )
    ) {

        cls = "draft";

    } else if (
        normalized.includes(
            "received"
        )
    ) {

        cls = "received";

    } else if (
        normalized.includes(
            "completed"
        )
    ) {

        cls = "completed";

    }


    return `

        <span
            class="status ${cls}"
        >
            ${escapeHTML(status)}
        </span>

    `;

}


/* ======================================================
   PRIORITY BADGE
====================================================== */

function priorityBadge(
    priority
) {

    const value =
        String(
            priority || "Medium"
        );

    const cls =
        value.toLowerCase();


    return `

        <span
            class="priority ${cls}"
        >
            ${escapeHTML(value)}
        </span>

    `;

}


/* ======================================================
   CURRENCY
====================================================== */

function formatCurrency(
    value
) {

    const number =
        Number(value || 0);


    if (
        Math.abs(number) >= 1000000
    ) {

        return `$${(
            number / 1000000
        ).toFixed(2)}M`;

    }


    if (
        Math.abs(number) >= 1000
    ) {

        return `$${(
            number / 1000
        ).toFixed(1)}K`;

    }


    return `$${number.toLocaleString(
        "en-US",
        {
            maximumFractionDigits:
                0
        }
    )}`;

}


function formatShortCurrency(
    value
) {

    const number =
        Number(value || 0);


    if (
        number >= 1000000
    ) {

        return `$${(
            number / 1000000
        ).toFixed(1)}M`;

    }


    if (
        number >= 1000
    ) {

        return `$${(
            number / 1000
        ).toFixed(0)}K`;

    }


    return `$${number}`;

}


/* ======================================================
   DATE
====================================================== */

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
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}


/* ======================================================
   ESCAPE HTML
====================================================== */

function escapeHTML(
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


/* ======================================================
   TOAST
====================================================== */

let toastTimer = null;


function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


/* ======================================================
   LOADING
====================================================== */

function showLoading() {

    document.getElementById(
        "totalPRs"
    ).textContent = "...";

    document.getElementById(
        "totalPOValue"
    ).textContent = "...";

    document.getElementById(
        "approvedPOs"
    ).textContent = "...";

    document.getElementById(
        "pendingApprovals"
    ).textContent = "...";

}


/* ======================================================
   CURRENT DATE/TIME
====================================================== */

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
                hour:
                    "numeric",

                minute:
                    "2-digit"
            }
        );
}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


/* ======================================================
   INITIALIZE
====================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateDateTime();

        setInterval(
            updateDateTime,
            30000
        );

        loadDashboard();

    }
);