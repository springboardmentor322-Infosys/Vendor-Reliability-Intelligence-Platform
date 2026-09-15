// ============================================================
// APPROVAL DELEGATION
// ============================================================

const API_BASE = "http://127.0.0.1:8000";


// ============================================================
// AUTHENTICATION
// ============================================================

function getAccessToken() {
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


// ============================================================
// API HELPER
// ============================================================

async function apiFetch(url, options = {}) {

    const token = getAccessToken();

    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    if (
        options.body &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include"
    });

    if (response.status === 401) {

        console.error("Authentication failed.");

        throw new Error(
            "Authentication required. Please log in again."
        );
    }

    return response;
}


// ============================================================
// SET TEXT
// ============================================================

function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {
        element.textContent = value ?? "";
    }
}


// ============================================================
// LOAD CURRENT USER
// ============================================================

async function loadCurrentUser() {

    try {

        const response = await apiFetch(
            `${API_BASE}/api/auth/me`,
            {
                method: "GET"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load user. HTTP ${response.status}`
            );
        }

        const user = await response.json();

        console.log(
            "Current user:",
            user
        );

        const name =
            user.name ||
            user.full_name ||
            user.username ||
            user.email ||
            "User";

        setText(
            "sidebarName",
            name
        );

    } catch (error) {

        console.warn(
            "Unable to load current user:",
            error.message
        );
    }
}


// ============================================================
// LOAD DELEGATIONS
// ============================================================

async function loadDelegations() {

    const table =
        document.getElementById(
            "delegationTable"
        );

    if (!table) {

        console.error(
            "delegationTable element not found."
        );

        return;
    }

    table.innerHTML = `
        <tr>
            <td colspan="6">
                Loading delegations...
            </td>
        </tr>
    `;

    try {

        const response = await apiFetch(
            `${API_BASE}/api/finance/approval-delegations`,
            {
                method: "GET"
            }
        );

        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                errorText ||
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(
            "Delegations API response:",
            data
        );

        const delegations =
            Array.isArray(data)
                ? data
                : data.delegations ||
                  data.items ||
                  data.data ||
                  [];

        renderDelegations(
            delegations
        );

    } catch (error) {

        console.error(
            "Delegation loading error:",
            error
        );

        table.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="error-message"
                >
                    Unable to load delegations.
                </td>
            </tr>
        `;
    }
}


// ============================================================
// RENDER DELEGATIONS
// ============================================================

function renderDelegations(data) {

    const table =
        document.getElementById(
            "delegationTable"
        );

    if (!table) {
        return;
    }

    if (!Array.isArray(data) || !data.length) {

        table.innerHTML = `
            <tr>
                <td colspan="6">
                    No active delegations.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML =
        data.map(item => {

            const status =
                item.status ||
                "Active";

            const normalizedStatus =
                String(status).toLowerCase();

            const statusClass =
                normalizedStatus.replace(
                    /\s+/g,
                    "-"
                );

            const isRevocable =
                normalizedStatus === "active" ||
                normalizedStatus === "scheduled";

            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            item.delegate_name ||
                            item.delegate?.name ||
                            item.delegate_user_name ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.approval_type ||
                            "All Approvals"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            item.start_date
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            item.end_date
                        )}
                    </td>

                    <td>
                        <span class="badge ${statusClass}">
                            ${escapeHtml(status)}
                        </span>
                    </td>

                    <td>
                        ${
                            isRevocable
                                ? `
                                    <button
                                        type="button"
                                        class="delete-btn"
                                        onclick="deleteDelegation('${String(item.id)}')"
                                    >
                                        Revoke
                                    </button>
                                `
                                : `
                                    <span>-</span>
                                `
                        }
                    </td>

                </tr>
            `;
        })
        .join("");
}


// ============================================================
// LOAD USERS
// ============================================================

async function loadUsers() {

    const select =
        document.getElementById(
            "delegateUser"
        );

    if (!select) {

        console.error(
            "delegateUser element not found."
        );

        return;
    }

    select.innerHTML = `
        <option value="">
            Loading users...
        </option>
    `;

    try {

        const response =
            await apiFetch(
                `${API_BASE}/api/finance/approval-delegations/users`,
                {
                    method: "GET"
                }
            );

        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                errorText ||
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(
            "Delegation users API response:",
            data
        );

        const users =
            Array.isArray(data)
                ? data
                : data.users ||
                  data.items ||
                  data.data ||
                  [];

        select.innerHTML = `
            <option value="">
                Select user
            </option>
        `;

        if (!users.length) {

            select.innerHTML = `
                <option value="">
                    No users available
                </option>
            `;

            return;
        }

        users.forEach(user => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                user.id ||
                user.user_id;

            option.textContent =
                `${user.name || user.full_name || user.username || "Unknown"} - ${
                    user.role || "User"
                }`;

            select.appendChild(
                option
            );
        });

    } catch (error) {

        console.error(
            "Unable to load delegation users:",
            error
        );

        select.innerHTML = `
            <option value="">
                Unable to load users
            </option>
        `;
    }
}


// ============================================================
// OPEN MODAL
// ============================================================

function openDelegationModal() {

    const modal =
        document.getElementById(
            "delegationModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.add(
        "show"
    );

    loadUsers();
}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeDelegationModal() {

    const modal =
        document.getElementById(
            "delegationModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "show"
    );

    const form =
        document.getElementById(
            "delegationForm"
        );

    if (form) {
        form.reset();
    }
}


// ============================================================
// CREATE DELEGATION
// ============================================================

async function createDelegation(event) {

    event.preventDefault();

    const delegateUser =
        document.getElementById(
            "delegateUser"
        );

    const approvalType =
        document.getElementById(
            "approvalType"
        );

    const startDate =
        document.getElementById(
            "startDate"
        );

    const endDate =
        document.getElementById(
            "endDate"
        );

    if (
        !delegateUser ||
        !approvalType ||
        !startDate ||
        !endDate
    ) {

        alert(
            "Delegation form elements are missing."
        );

        return;
    }

    if (!delegateUser.value) {

        alert(
            "Please select a delegate user."
        );

        return;
    }

    if (!startDate.value) {

        alert(
            "Please select a start date."
        );

        return;
    }

    if (!endDate.value) {

        alert(
            "Please select an end date."
        );

        return;
    }

    if (
        endDate.value <
        startDate.value
    ) {

        alert(
            "End date cannot be earlier than start date."
        );

        return;
    }


    const data = {

        delegate_user_id:
            Number(delegateUser.value),

        approval_type:
            approvalType.value ||
            "All Approvals",

        start_date:
            startDate.value,

        end_date:
            endDate.value
    };


    console.log(
        "Creating delegation:",
        data
    );


    try {

        const response =
            await apiFetch(
                `${API_BASE}/api/finance/approval-delegations`,
                {
                    method: "POST",

                    body:
                        JSON.stringify(data)
                }
            );

        if (!response.ok) {

            const errorText =
                await response.text();

            let message =
                "Unable to create delegation.";

            try {

                const errorData =
                    JSON.parse(errorText);

                if (errorData.detail) {

                    message =
                        Array.isArray(errorData.detail)
                            ? errorData.detail
                                .map(
                                    err =>
                                        err.msg ||
                                        JSON.stringify(err)
                                )
                                .join(", ")
                            : errorData.detail;
                }

            } catch (_) {

                if (errorText) {
                    message = errorText;
                }
            }

            throw new Error(message);
        }

        const result =
            await response.json();

        console.log(
            "Delegation created:",
            result
        );

        alert(
            "Delegation created successfully."
        );

        closeDelegationModal();

        await loadDelegations();

    } catch (error) {

        console.error(
            "Delegation creation error:",
            error
        );

        alert(
            error.message ||
            "Unable to create delegation."
        );
    }
}


// ============================================================
// DELETE / REVOKE DELEGATION
// ============================================================

async function deleteDelegation(id) {

    if (!id) {
        return;
    }

    const confirmed =
        confirm(
            "Are you sure you want to revoke this delegation?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const response =
            await apiFetch(
                `${API_BASE}/api/finance/approval-delegations/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {

            const errorText =
                await response.text();

            let message =
                "Unable to revoke delegation.";

            try {

                const errorData =
                    JSON.parse(errorText);

                if (errorData.detail) {
                    message =
                        errorData.detail;
                }

            } catch (_) {

                if (errorText) {
                    message = errorText;
                }
            }

            throw new Error(message);
        }

        let result = null;

        const contentType =
            response.headers.get(
                "content-type"
            );

        if (
            contentType &&
            contentType.includes(
                "application/json"
            )
        ) {
            result =
                await response.json();
        }

        console.log(
            "Delegation revoked:",
            result
        );

        alert(
            "Delegation revoked successfully."
        );

        await loadDelegations();

    } catch (error) {

        console.error(
            "Delegation revoke error:",
            error
        );

        alert(
            error.message ||
            "Unable to revoke delegation."
        );
    }
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(
            `${value}T00:00:00`
        );

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


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// INITIALIZE PAGE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const form =
            document.getElementById(
                "delegationForm"
            );

        if (form) {

            form.addEventListener(
                "submit",
                createDelegation
            );
        }

        loadDelegations();
        loadCurrentUser();
    }
);