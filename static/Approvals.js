const API_BASE = "";

let currentPage = 1;
let pageSize = 10;
let currentTab = "mine";
let selectedWorkflowId = null;


/* ============================================================
   AUTH
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        ""
    );
}


async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers
        }
    );

    if (!response.ok) {

        const text = await response.text();

        throw new Error(
            `HTTP ${response.status}: ${text}`
        );
    }

    return response.json();
}


async function getJSON(url, options = {}) {
    return await apiFetch(url, options);
}


/* ============================================================
   HELPERS
============================================================ */

function money(value) {

    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0
        }
    ).format(Number(value || 0));
}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   SUMMARY
============================================================ */

async function loadSummary() {

    const start =
        document.getElementById(
            "startDate"
        ).value;

    const end =
        document.getElementById(
            "endDate"
        ).value;

    const params = new URLSearchParams();

    if (start) {
        params.set("start_date", start);
    }

    if (end) {
        params.set("end_date", end);
    }

    try {

        const data = await apiFetch(
            `/api/approvals/summary?${params}`
        );

        document.getElementById(
            "pendingCount"
        ).textContent =
            data.pending_my_approval ?? 0;

        document.getElementById(
            "requestedCount"
        ).textContent =
            data.requested ?? 0;

        document.getElementById(
            "approvedCount"
        ).textContent =
            data.approved ?? 0;

        document.getElementById(
            "rejectedCount"
        ).textContent =
            data.rejected ?? 0;

        document.getElementById(
            "escalatedCount"
        ).textContent =
            data.escalated ?? 0;

        document.getElementById(
            "completedCount"
        ).textContent =
            data.completed ?? 0;

    } catch (error) {

        console.error(
            "Approval summary error:",
            error
        );
    }
}


/* ============================================================
   LOAD APPROVALS
============================================================ */

async function loadApprovals() {

    const params =
        new URLSearchParams();

    const search =
        document.getElementById(
            "searchInput"
        ).value.trim();

    const type =
        document.getElementById(
            "typeFilter"
        ).value;

    const department =
        document.getElementById(
            "departmentFilter"
        ).value;

    const priority =
        document.getElementById(
            "priorityFilter"
        ).value;

    const status =
        document.getElementById(
            "statusFilter"
        ).value;

    const start =
        document.getElementById(
            "startDate"
        ).value;

    const end =
        document.getElementById(
            "endDate"
        ).value;

    params.set(
        "page",
        currentPage
    );

    params.set(
        "page_size",
        pageSize
    );

    params.set(
        "tab",
        currentTab
    );

    if (search) {
        params.set(
            "search",
            search
        );
    }

    if (type !== "All") {
        params.set(
            "reference_type",
            type
        );
    }

    if (department !== "All") {
        params.set(
            "department",
            department
        );
    }

    if (priority !== "All") {
        params.set(
            "priority",
            priority
        );
    }

    if (status !== "All") {
        params.set(
            "status",
            status
        );
    }

    if (start) {
        params.set(
            "start_date",
            start
        );
    }

    if (end) {
        params.set(
            "end_date",
            end
        );
    }

    try {

        const data = await apiFetch(
            `/api/approvals?${params}`
        );

        renderApprovals(
            data.approvals || []
        );

        updatePagination(
            data.total || 0,
            data.total_pages || 1
        );

    } catch (error) {

        console.error(
            "Approval list error:",
            error
        );

        document.getElementById(
            "approvalTableBody"
        ).innerHTML = `
            <tr>
                <td colspan="9"
                    style="text-align:center;padding:40px;color:#d33">
                    Unable to load approvals.
                </td>
            </tr>
        `;
    }
}


/* ============================================================
   RENDER TABLE
============================================================ */

function renderApprovals(rows) {

    const body =
        document.getElementById(
            "approvalTableBody"
        );

    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td colspan="9"
                    style="text-align:center;padding:45px">
                    No approvals found.
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        rows.map(row => {

            const typeLabel =
                row.reference_type === "PO"
                    ? "Purchase Order"
                    : "Procurement Request";

            const icon =
                row.reference_type === "PO"
                    ? "🛒"
                    : "▤";

            const priority =
                String(
                    row.priority || "Medium"
                ).toLowerCase();

            return `
                <tr
                    data-id="${row.id}"
                    onclick="selectWorkflow(${row.id})"
                >

                    <td>
                        <input
                            type="checkbox"
                            class="row-check"
                            value="${row.id}"
                            onclick="event.stopPropagation()"
                        >
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(
                                row.reference_number
                            )}
                        </strong>

                        <small>
                            ${typeLabel}
                        </small>
                    </td>

                    <td>
                        <div class="type-icon">
                            ${icon}
                        </div>
                    </td>

                    <td class="title-cell">

                        <strong>
                            ${escapeHtml(
                                row.title ||
                                row.reference_number
                            )}
                        </strong>

                        <small>
                            ${escapeHtml(
                                row.department || ""
                            )}
                        </small>

                    </td>

                    <td>
                        ${escapeHtml(
                            row.requested_by || "-"
                        )}
                    </td>

                    <td>
                        <strong>
                            ${money(row.amount)}
                        </strong>
                    </td>

                    <td>
                        <span
                            class="priority ${priority}"
                        >
                            ${escapeHtml(
                                row.priority || "Medium"
                            )}
                        </span>
                    </td>

                    <td>
                        ${formatDate(
                            row.created_at
                        )}
                    </td>

                    <td>

                        <div
                            class="action-buttons"
                            onclick="event.stopPropagation()"
                        >

                            <button
                                title="View"
                                onclick="selectWorkflow(${row.id})"
                            >
                                ◉
                            </button>

                            <button
                                title="More"
                            >
                                ⋮
                            </button>

                        </div>

                    </td>

                </tr>
            `;

        }).join("");
}


/* ============================================================
   WORKFLOW
============================================================ */

async function selectWorkflow(id) {

    selectedWorkflowId = id;

    try {

        const data = await apiFetch(
            `/api/approvals/${id}`
        );

        renderWorkflow(data);

    } catch (error) {

        console.error(
            "Workflow error:",
            error
        );
    }
}


function renderWorkflow(data) {

    const workflow =
        data.workflow;

    const steps =
        data.steps || [];

    const content =
        document.getElementById(
            "workflowContent"
        );

    content.innerHTML = `

        <div class="workflow-card">

            <div class="reference">
                ${escapeHtml(
                    workflow.reference_number
                )}

                <span class="priority high">
                    ${escapeHtml(
                        workflow.priority
                    )} Priority
                </span>
            </div>

            <div class="title">
                ${escapeHtml(
                    workflow.title ||
                    workflow.reference_number
                )}
            </div>

            <div class="workflow-meta">

                <span>
                    Requested by
                    ${escapeHtml(
                        workflow.requested_by || "-"
                    )}
                    •
                    ${escapeHtml(
                        workflow.department || "-"
                    )}
                </span>

                <span class="workflow-amount">
                    ${money(
                        workflow.amount
                    )}
                </span>

            </div>

        </div>

        ${steps.map(step => {

            const isCurrent =
                step.step_order ===
                workflow.current_step &&
                step.status === "Pending";

            const isCompleted =
                step.status === "Approved";

            return `

                <div class="
                    workflow-step
                    ${isCurrent ? "current" : ""}
                    ${isCompleted ? "completed" : ""}
                ">

                    <div class="step-number">
                        ${
                            isCompleted
                                ? "✓"
                                : step.step_order
                        }
                    </div>

                    <strong>
                        ${escapeHtml(
                            step.step_name
                        )}

                        ${
                            isCurrent
                                ? " • Current Step"
                                : ""
                        }
                    </strong>

                    <small>
                        ${
                            step.approver_name
                                ? escapeHtml(
                                    step.approver_name
                                  )
                                : "Unassigned"
                        }

                        ${
                            step.status
                                ? " • " +
                                  escapeHtml(
                                      step.status
                                  )
                                : ""
                        }
                    </small>

                    ${
                        isCurrent
                            ? `
                                <div class="step-actions">

                                    <button
                                        class="approve"
                                        onclick="makeDecision(
                                            'Approved'
                                        )"
                                    >
                                        ✓ Approve
                                    </button>

                                    <button
                                        class="reject"
                                        onclick="makeDecision(
                                            'Rejected'
                                        )"
                                    >
                                        × Reject
                                    </button>

                                </div>
                            `
                            : ""
                    }

                </div>
            `;

        }).join("")}

        <div class="workflow-card">

            <small>
                Workflow status:
            </small>

            <strong>
                ${escapeHtml(
                    workflow.status
                )}
            </strong>

        </div>
    `;
}


/* ============================================================
   DECISION
============================================================ */

async function makeDecision(status) {

    if (!selectedWorkflowId) {

        alert(
            "Please select an approval."
        );

        return;
    }

    let comments = "";

    if (status === "Rejected") {

        comments =
            prompt(
                "Enter rejection reason:"
            ) || "";

        if (!comments.trim()) {

            alert(
                "A rejection reason is required."
            );

            return;
        }
    }

    if (
        !confirm(
            `Are you sure you want to ${status.toLowerCase()} this approval?`
        )
    ) {
        return;
    }

    try {

        await apiFetch(
            `/api/approvals/${selectedWorkflowId}/decision`,
            {
                method: "POST",

                body: JSON.stringify({
                    status,
                    comments
                })
            }
        );

        await Promise.all([
            loadSummary(),
            loadApprovals()
        ]);

        await selectWorkflow(
            selectedWorkflowId
        );

    } catch (error) {

        console.error(
            "Approval decision error:",
            error
        );

        alert(
            error.message
        );
    }
}


/* ============================================================
   PAGINATION
============================================================ */

function updatePagination(
    total,
    totalPages
) {

    const start =
        total === 0
            ? 0
            : ((currentPage - 1) * pageSize) + 1;

    const end =
        Math.min(
            currentPage * pageSize,
            total
        );

    document.getElementById(
        "resultInfo"
    ).textContent =
        `Showing ${start}-${end} of ${total} approvals`;

    document.getElementById(
        "prevPage"
    ).disabled =
        currentPage <= 1;

    document.getElementById(
        "nextPage"
    ).disabled =
        currentPage >= totalPages;
}


/* ============================================================
   DEPARTMENTS
============================================================ */

async function loadDepartments() {

    try {

        const data =
            await apiFetch(
                "/api/procurement-requests/departments"
            );

        const select =
            document.getElementById(
                "departmentFilter"
            );

        data.forEach(department => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                department;

            option.textContent =
                department;

            select.appendChild(
                option
            );
        });

    } catch (error) {

        console.error(
            "Department loading error:",
            error
        );
    }
}


/* ============================================================
   RESET
============================================================ */

function resetFilters() {

    document.getElementById(
        "searchInput"
    ).value = "";

    document.getElementById(
        "typeFilter"
    ).value = "All";

    document.getElementById(
        "departmentFilter"
    ).value = "All";

    document.getElementById(
        "priorityFilter"
    ).value = "All";

    document.getElementById(
        "statusFilter"
    ).value = "All";

    document.getElementById(
        "startDate"
    ).value = "";

    document.getElementById(
        "endDate"
    ).value = "";

    currentPage = 1;

    loadSummary();
    loadApprovals();
}


/* ============================================================
   EVENTS
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        document.querySelectorAll(
            ".tab"
        ).forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".tab"
                        )
                        .forEach(
                            t =>
                                t.classList.remove(
                                    "active"
                                )
                        );

                    tab.classList.add(
                        "active"
                    );

                    currentTab =
                        tab.dataset.tab;

                    currentPage = 1;

                    loadApprovals();
                }
            );
        });


        document.getElementById(
            "searchInput"
        ).addEventListener(
            "input",
            debounce(
                () => {
                    currentPage = 1;
                    loadApprovals();
                },
                350
            )
        );


        [
            "typeFilter",
            "departmentFilter",
            "priorityFilter",
            "statusFilter",
            "startDate",
            "endDate"
        ].forEach(id => {

            document.getElementById(
                id
            ).addEventListener(
                "change",
                () => {

                    currentPage = 1;

                    loadSummary();
                    loadApprovals();
                }
            );
        });


        document.getElementById(
            "resetBtn"
        ).addEventListener(
            "click",
            resetFilters
        );


        document.getElementById(
            "pageSize"
        ).addEventListener(
            "change",
            event => {

                pageSize =
                    Number(
                        event.target.value
                    );

                currentPage = 1;

                loadApprovals();
            }
        );


        document.getElementById(
            "prevPage"
        ).addEventListener(
            "click",
            () => {

                if (currentPage > 1) {

                    currentPage--;

                    loadApprovals();
                }
            }
        );


        document.getElementById(
            "nextPage"
        ).addEventListener(
            "click",
            () => {

                currentPage++;

                loadApprovals();
            }
        );


        await loadDepartments();

        await loadSummary();

        await loadApprovals();

        await loadProfile();
    }
);


/* ============================================================
   DEBOUNCE
============================================================ */

function debounce(
    callback,
    delay
) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(
            () => callback(...args),
            delay
        );
    };
}

function openProfile(){
    window.location.href = "/ProcurementProfile";
}

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;
    }
}

function loadUser(user){

    const name = user.name || "Manager";

    setText( "sidebarUser", name );

    setText( "topUser", name );

}

async function loadProfile(){

    try{
        const data = await getJSON("/api/procurement/profile/me");

        console.log("Manager Profile:",data);

        loadUser(data.user);
    }

    catch(error){
        console.error("Unable to load manager profile:",error);
    }
}