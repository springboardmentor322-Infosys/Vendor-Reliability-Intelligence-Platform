"use strict";

const API_BASE = "http://127.0.0.1:8000";

let currentPage = 1;
let pageSize = 10;
let totalPages = 1;

let searchTimer = null;


/* =========================================================
   AUTH
========================================================= */

function getAuthHeaders() {

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("authToken");

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    return headers;
}


/* =========================================================
   API
========================================================= */

async function apiFetch(
    url,
    options = {}
) {

    const response = await fetch(
        API_BASE + url,
        {
            credentials: "include",

            ...options,

            headers: {
                ...getAuthHeaders(),
                ...(options.headers || {})
            }
        }
    );

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const data =
                await response.json();

            message =
                data.detail ||
                data.message ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "2-digit",
            year: "numeric"
        }
    );
}


function daysLeft(value) {

    if (!value) {
        return null;
    }

    const due =
        new Date(value);

    const today =
        new Date();

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return Math.ceil(
        (due - today) /
        (1000 * 60 * 60 * 24)
    );
}


function statusClass(status) {

    return String(status || "")
        .toLowerCase()
        .replaceAll(" ", "-");
}


function priorityClass(priority) {

    return String(priority || "")
        .toLowerCase();
}


/* =========================================================
   LOAD USER
========================================================= */

async function loadUser() {

    try {

        const user =
            await apiFetch(
                "/api/auth/me"
            );

        const name =
            user.name || "Auditor";

        const role =
            user.role || "Auditor";

        document.getElementById(
            "sidebarUserName"
        ).textContent = name;

        document.getElementById(
            "headerUserName"
        ).textContent = name;

        document.getElementById(
            "sidebarUserRole"
        ).textContent = role;

        document.getElementById(
            "headerUserRole"
        ).textContent = role;

    } catch (error) {

        console.warn(
            "Unable to load user profile:",
            error
        );
    }
}


/* =========================================================
   DASHBOARD KPI
========================================================= */

async function loadDashboard() {

    try {

        const data =
            await apiFetch(
                "/api/auditor/assignments/dashboard"
            );

        document.getElementById(
            "totalAssignments"
        ).textContent =
            data.total_assignments ?? 0;

        document.getElementById(
            "inProgress"
        ).textContent =
            data.in_progress ?? 0;

        document.getElementById(
            "pendingReview"
        ).textContent =
            data.pending_review ?? 0;

        document.getElementById(
            "completed"
        ).textContent =
            data.completed ?? 0;

    } catch (error) {

        console.error(
            "Dashboard load error:",
            error
        );
    }
}


/* =========================================================
   AUDITORS
========================================================= */

async function loadAuditors() {

    try {

        const data =
            await apiFetch(
                "/api/auditor/assignments/auditors"
            );

        const filter =
            document.getElementById(
                "auditorFilter"
            );

        const formSelect =
            document.getElementById(
                "auditorId"
            );

        filter.innerHTML =
            `<option value="">
                All Auditors
            </option>`;

        formSelect.innerHTML =
            `<option value="">
                Select auditor
            </option>`;

        (data.items || []).forEach(
            auditor => {

                const option1 =
                    document.createElement(
                        "option"
                    );

                option1.value =
                    auditor.id;

                option1.textContent =
                    auditor.name;

                filter.appendChild(
                    option1
                );


                const option2 =
                    document.createElement(
                        "option"
                    );

                option2.value =
                    auditor.id;

                option2.textContent =
                    auditor.name +
                    (
                        auditor.department
                            ? ` — ${auditor.department}`
                            : ""
                    );

                formSelect.appendChild(
                    option2
                );
            }
        );

    } catch (error) {

        console.error(
            "Auditor load error:",
            error
        );
    }
}


/* =========================================================
   BUILD QUERY
========================================================= */

function getQueryString() {

    const params =
        new URLSearchParams();

    const search =
        document.getElementById(
            "assignmentSearch"
        ).value.trim();

    const status =
        document.getElementById(
            "statusFilter"
        ).value;

    const priority =
        document.getElementById(
            "priorityFilter"
        ).value;

    const auditor =
        document.getElementById(
            "auditorFilter"
        ).value;

    const from =
        document.getElementById(
            "dateFrom"
        ).value;

    const to =
        document.getElementById(
            "dateTo"
        ).value;


    if (search) {
        params.set(
            "search",
            search
        );
    }

    if (status) {
        params.set(
            "status",
            status
        );
    }

    if (priority) {
        params.set(
            "priority",
            priority
        );
    }

    if (auditor) {
        params.set(
            "auditor_id",
            auditor
        );
    }

    if (from) {
        params.set(
            "due_date_from",
            from
        );
    }

    if (to) {
        params.set(
            "due_date_to",
            to
        );
    }

    params.set(
        "page",
        currentPage
    );

    params.set(
        "limit",
        pageSize
    );

    return params.toString();
}


/* =========================================================
   LOAD ASSIGNMENTS
========================================================= */

async function loadAssignments() {

    const tbody =
        document.getElementById(
            "assignmentTableBody"
        );

    tbody.innerHTML = `
        <tr>
            <td
                colspan="8"
                class="loading"
            >
                Loading assignments...
            </td>
        </tr>
    `;

    try {

        const query =
            getQueryString();

        const data =
            await apiFetch(
                `/api/auditor/assignments?${query}`
            );

        renderAssignments(
            data.items || []
        );

        totalPages =
            data.pages || 1;

        renderPagination(
            data.total || 0
        );

    } catch (error) {

        console.error(
            "Assignment load error:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="empty"
                >
                    Unable to load assignments.
                    <br>
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderAssignments(
    assignments
) {

    const tbody =
        document.getElementById(
            "assignmentTableBody"
        );

    if (!assignments.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="empty"
                >
                    No audit assignments found.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        assignments.map(
            assignment => {

                const days =
                    daysLeft(
                        assignment.due_date
                    );

                let daysText = "";

                let daysClass = "safe";

                if (days !== null) {

                    if (days < 0) {

                        daysText =
                            `${Math.abs(days)} days overdue`;

                        daysClass =
                            "danger";

                    } else if (days === 0) {

                        daysText =
                            "Due today";

                        daysClass =
                            "danger";

                    } else {

                        daysText =
                            `${days} days left`;

                        if (days <= 7) {
                            daysClass =
                                "danger";
                        } else if (days <= 14) {
                            daysClass =
                                "warning";
                        }
                    }
                }


                return `
                    <tr>

                        <td>

                            <div class="audit-name">

                                <div class="audit-icon">
                                    ${getAuditIcon(
                                        assignment.audit_type
                                    )}
                                </div>

                                <div>

                                    <div class="audit-title">
                                        ${escapeHtml(
                                            assignment.audit_title
                                        )}
                                    </div>

                                    <div class="audit-number">
                                        ${escapeHtml(
                                            assignment.audit_number
                                        )}
                                    </div>

                                </div>

                            </div>

                        </td>


                        <td>
                            ${escapeHtml(
                                assignment.audit_type
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                assignment.auditor_name ||
                                "Unassigned"
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                assignment.department ||
                                assignment.entity_name ||
                                "—"
                            )}
                        </td>


                        <td>

                            <div class="due-date">
                                ${formatDate(
                                    assignment.due_date
                                )}
                            </div>

                            ${
                                days !== null
                                    ? `
                                    <span
                                        class="days-left ${daysClass}"
                                    >
                                        ${daysText}
                                    </span>
                                    `
                                    : ""
                            }

                        </td>


                        <td>

                            <span
                                class="priority ${priorityClass(
                                    assignment.priority
                                )}"
                            >
                                ${escapeHtml(
                                    assignment.priority
                                )}
                            </span>

                        </td>


                        <td>

                            <span
                                class="status ${statusClass(
                                    assignment.status
                                )}"
                            >
                                ${escapeHtml(
                                    assignment.status
                                )}
                            </span>

                        </td>


                        <td>

                            <div class="action-buttons">

                                <button
                                    class="icon-button"
                                    title="View"
                                    onclick="viewAssignment(
                                        ${assignment.id}
                                    )"
                                >
                                    ◉
                                </button>


                                <div class="menu-wrapper">

                                    <button
                                        class="icon-button"
                                        title="More"
                                        onclick="toggleActionMenu(
                                            ${assignment.id}
                                        )"
                                    >
                                        ⋮
                                    </button>

                                    <div
                                        class="action-menu"
                                        id="menu-${assignment.id}"
                                    >

                                        <button
                                            onclick="updateStatus(
                                                ${assignment.id},
                                                'In Progress'
                                            )"
                                        >
                                            Mark In Progress
                                        </button>

                                        <button
                                            onclick="updateStatus(
                                                ${assignment.id},
                                                'Pending Review'
                                            )"
                                        >
                                            Send for Review
                                        </button>

                                        <button
                                            onclick="updateStatus(
                                                ${assignment.id},
                                                'Completed'
                                            )"
                                        >
                                            Mark Completed
                                        </button>

                                        <button
                                            onclick="deleteAssignment(
                                                ${assignment.id}
                                            )"
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>

                            </div>

                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


/* =========================================================
   AUDIT ICON
========================================================= */

function getAuditIcon(type) {

    const value =
        String(type || "")
            .toLowerCase();

    if (value.includes("financial")) {
        return "▤";
    }

    if (value.includes("compliance")) {
        return "✓";
    }

    if (value.includes("it")) {
        return "▣";
    }

    if (value.includes("vendor")) {
        return "♧";
    }

    return "▥";
}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(total) {

    const info =
        document.getElementById(
            "paginationInfo"
        );

    const pagination =
        document.getElementById(
            "pagination"
        );

    if (!total) {

        info.textContent =
            "Showing 0 entries";

        pagination.innerHTML = "";

        return;
    }


    const start =
        ((currentPage - 1) * pageSize) + 1;

    const end =
        Math.min(
            currentPage * pageSize,
            total
        );

    info.textContent =
        `Showing ${start} to ${end} of ${total} entries`;


    pagination.innerHTML = "";


    const previous =
        document.createElement(
            "button"
        );

    previous.textContent = "‹";

    previous.disabled =
        currentPage <= 1;

    previous.onclick = () => {

        if (currentPage > 1) {

            currentPage--;

            loadAssignments();
        }
    };

    pagination.appendChild(
        previous
    );


    const maxButtons = 5;

    let startPage =
        Math.max(
            1,
            currentPage - 2
        );

    let endPage =
        Math.min(
            totalPages,
            startPage + maxButtons - 1
        );

    if (
        endPage - startPage <
        maxButtons - 1
    ) {

        startPage =
            Math.max(
                1,
                endPage - maxButtons + 1
            );
    }


    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.textContent =
            page;

        if (
            page === currentPage
        ) {
            button.classList.add(
                "active"
            );
        }

        button.onclick = () => {

            currentPage = page;

            loadAssignments();
        };

        pagination.appendChild(
            button
        );
    }


    const next =
        document.createElement(
            "button"
        );

    next.textContent = "›";

    next.disabled =
        currentPage >= totalPages;

    next.onclick = () => {

        if (
            currentPage <
            totalPages
        ) {

            currentPage++;

            loadAssignments();
        }
    };

    pagination.appendChild(
        next
    );
}


/* =========================================================
   MODAL
========================================================= */

function openAssignmentModal() {

    document
        .getElementById(
            "assignmentModal"
        )
        .classList.add("show");
}


function closeAssignmentModal() {

    document
        .getElementById(
            "assignmentModal"
        )
        .classList.remove("show");
}


function openViewModal() {

    document
        .getElementById(
            "viewModal"
        )
        .classList.add("show");
}


function closeViewModal() {

    document
        .getElementById(
            "viewModal"
        )
        .classList.remove("show");
}


/* =========================================================
   CREATE ASSIGNMENT
========================================================= */

async function createAssignment(
    event
) {

    event.preventDefault();

    const payload = {

        title:
            document.getElementById(
                "auditTitle"
            ).value.trim(),

        audit_type:
            document.getElementById(
                "auditType"
            ).value,

        auditor_id:
            Number(
                document.getElementById(
                    "auditorId"
                ).value
            ),

        entity_name:
            document.getElementById(
                "entityName"
            ).value.trim() ||
            null,

        entity_type:
            document.getElementById(
                "entityType"
            ).value.trim() ||
            null,

        due_date:
            document.getElementById(
                "dueDate"
            ).value ||
            null,

        priority:
            document.getElementById(
                "priority"
            ).value,

        scheduled_date:
            document.getElementById(
                "scheduledDate"
            ).value
            ? new Date(
                document.getElementById(
                    "scheduledDate"
                ).value
            ).toISOString()
            : null,

        description:
            document.getElementById(
                "description"
            ).value.trim() ||
            null,

        status:
            "Not Started",

        progress:
            0,

        risk_level:
            "Medium",

        compliance_score:
            0
    };


    if (!payload.auditor_id) {

        alert(
            "Please select an auditor."
        );

        return;
    }


    try {

        await apiFetch(
            "/api/auditor/assignments",
            {
                method: "POST",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

        alert(
            "Audit assignment created successfully."
        );

        closeAssignmentModal();

        document
            .getElementById(
                "assignmentForm"
            )
            .reset();

        currentPage = 1;

        await Promise.all([
            loadDashboard(),
            loadAssignments()
        ]);

    } catch (error) {

        console.error(
            "Create assignment error:",
            error
        );

        alert(
            error.message
        );
    }
}


/* =========================================================
   VIEW
========================================================= */

async function viewAssignment(
    id
) {

    try {

        const data =
            await apiFetch(
                `/api/auditor/assignments/${id}`
            );

        document.getElementById(
            "viewTitle"
        ).textContent =
            data.audit_title ||
            "Audit Details";

        document.getElementById(
            "viewNumber"
        ).textContent =
            data.audit_number || "";


        document.getElementById(
            "viewContent"
        ).innerHTML = `

            <div class="detail-grid">

                <div class="detail-item">
                    <label>Audit Type</label>
                    <strong>
                        ${escapeHtml(
                            data.audit_type
                        )}
                    </strong>
                </div>

                <div class="detail-item">
                    <label>Assigned To</label>
                    <strong>
                        ${escapeHtml(
                            data.auditor_name
                        )}
                    </strong>
                </div>

                <div class="detail-item">
                    <label>Department</label>
                    <strong>
                        ${escapeHtml(
                            data.department || "—"
                        )}
                    </strong>
                </div>

                <div class="detail-item">
                    <label>Entity</label>
                    <strong>
                        ${escapeHtml(
                            data.entity_name || "—"
                        )}
                    </strong>
                </div>

                <div class="detail-item">
                    <label>Due Date</label>
                    <strong>
                        ${formatDate(
                            data.due_date
                        )}
                    </strong>
                </div>

                <div class="detail-item">
                    <label>Priority</label>
                    <strong>
                        ${escapeHtml(
                            data.priority
                        )}
                    </strong>
                </div>

                <div class="detail-item">
                    <label>Status</label>
                    <strong>
                        ${escapeHtml(
                            data.status
                        )}
                    </strong>
                </div>

                <div class="detail-item">
                    <label>Progress</label>
                    <strong>
                        ${Number(
                            data.progress || 0
                        )}%
                    </strong>
                </div>

                <div class="description-box">
                    <strong>Description</strong>
                    <br><br>
                    ${escapeHtml(
                        data.description ||
                        "No description provided."
                    )}
                </div>

            </div>
        `;

        openViewModal();

    } catch (error) {

        console.error(
            "View assignment error:",
            error
        );

        alert(
            error.message
        );
    }
}


/* =========================================================
   STATUS
========================================================= */

async function updateStatus(
    id,
    status
) {

    closeAllMenus();

    try {

        await apiFetch(
            `/api/auditor/assignments/${id}`,
            {
                method: "PATCH",

                body:
                    JSON.stringify({
                        status: status,

                        progress:
                            status === "Completed"
                                ? 100
                                : undefined
                    })
            }
        );

        await Promise.all([
            loadDashboard(),
            loadAssignments()
        ]);

    } catch (error) {

        console.error(
            "Status update error:",
            error
        );

        alert(
            error.message
        );
    }
}


/* =========================================================
   DELETE
========================================================= */

async function deleteAssignment(
    id
) {

    closeAllMenus();

    const confirmed =
        confirm(
            "Are you sure you want to delete this audit assignment?"
        );

    if (!confirmed) {
        return;
    }


    try {

        await apiFetch(
            `/api/auditor/assignments/${id}`,
            {
                method: "DELETE"
            }
        );

        await Promise.all([
            loadDashboard(),
            loadAssignments()
        ]);

    } catch (error) {

        console.error(
            "Delete assignment error:",
            error
        );

        alert(
            error.message
        );
    }
}


/* =========================================================
   ACTION MENU
========================================================= */

function toggleActionMenu(
    id
) {

    closeAllMenus();

    const menu =
        document.getElementById(
            `menu-${id}`
        );

    if (menu) {
        menu.classList.add(
            "show"
        );
    }
}


function closeAllMenus() {

    document
        .querySelectorAll(
            ".action-menu.show"
        )
        .forEach(
            menu =>
                menu.classList.remove(
                    "show"
                )
        );
}


/* =========================================================
   FILTER EVENTS
========================================================= */

function setupFilters() {

    const search =
        document.getElementById(
            "assignmentSearch"
        );

    search.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );

            searchTimer =
                setTimeout(
                    () => {

                        currentPage = 1;

                        loadAssignments();

                    },
                    350
                );
        }
    );


    [
        "statusFilter",
        "priorityFilter",
        "auditorFilter",
        "dateFrom",
        "dateTo"
    ].forEach(
        id => {

            document
                .getElementById(id)
                .addEventListener(
                    "change",
                    () => {

                        currentPage = 1;

                        loadAssignments();
                    }
                );
        }
    );


    document
        .getElementById(
            "clearFilters"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "assignmentSearch"
                    )
                    .value = "";

                document
                    .getElementById(
                        "statusFilter"
                    )
                    .value = "";

                document
                    .getElementById(
                        "priorityFilter"
                    )
                    .value = "";

                document
                    .getElementById(
                        "auditorFilter"
                    )
                    .value = "";

                document
                    .getElementById(
                        "dateFrom"
                    )
                    .value = "";

                document
                    .getElementById(
                        "dateTo"
                    )
                    .value = "";

                currentPage = 1;

                loadAssignments();
            }
        );


    document
        .getElementById(
            "pageSize"
        )
        .addEventListener(
            "change",
            event => {

                pageSize =
                    Number(
                        event.target.value
                    );

                currentPage = 1;

                loadAssignments();
            }
        );
}


/* =========================================================
   MODAL EVENTS
========================================================= */

function setupModal() {

    document
        .getElementById(
            "newAssignmentButton"
        )
        .addEventListener(
            "click",
            openAssignmentModal
        );

    document
        .getElementById(
            "closeModal"
        )
        .addEventListener(
            "click",
            closeAssignmentModal
        );

    document
        .getElementById(
            "cancelAssignment"
        )
        .addEventListener(
            "click",
            closeAssignmentModal
        );

    document
        .getElementById(
            "closeViewModal"
        )
        .addEventListener(
            "click",
            closeViewModal
        );


    document
        .getElementById(
            "assignmentForm"
        )
        .addEventListener(
            "submit",
            createAssignment
        );


    document
        .getElementById(
            "assignmentModal"
        )
        .addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "assignmentModal"
                ) {
                    closeAssignmentModal();
                }
            }
        );


    document
        .getElementById(
            "viewModal"
        )
        .addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "viewModal"
                ) {
                    closeViewModal();
                }
            }
        );
}


/* =========================================================
   GLOBAL CLICK
========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".menu-wrapper"
            )
        ) {
            closeAllMenus();
        }
    }
);


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializePage() {

    setupFilters();
    setupModal();

    await loadUser();

    await loadAuditors();

    await Promise.all([
        loadDashboard(),
        loadAssignments()
    ]);
}


document.addEventListener(
    "DOMContentLoaded",
    initializePage
);