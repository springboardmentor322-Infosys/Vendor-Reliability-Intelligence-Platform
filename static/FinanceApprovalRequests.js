const API_BASE = "http://127.0.0.1:8000";

let allRequests = [];


/* =========================================================
   GET AUTH TOKEN
========================================================= */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        null
    );
}


/* =========================================================
   API REQUEST HELPER
========================================================= */

async function apiFetch(endpoint, options = {}) {

    const token = getToken();

    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
            ...options,
            headers: headers,
            credentials: "include"
        }
    );


    if (!response.ok) {

        let errorMessage =
            `Request failed with status ${response.status}`;

        try {

            const errorData =
                await response.json();

            errorMessage =
                errorData.detail ||
                errorData.message ||
                JSON.stringify(errorData);

        } catch {

            try {

                errorMessage =
                    await response.text();

            } catch {

                // Keep default error message
            }
        }

        throw new Error(errorMessage);
    }


    return await response.json();
}


/* =========================================================
   LOAD APPROVAL REQUESTS
========================================================= */

async function loadRequests() {

    const table =
        document.getElementById("requestsTable");


    if (!table) {

        console.error(
            "requestsTable element not found."
        );

        return;
    }


    try {

        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Loading approval requests...
                </td>
            </tr>
        `;


        /*
        Dedicated Approval Requests API
        */

        const data = await apiFetch(
            "/api/finance/approval-requests/my",
            {
                method: "GET"
            }
        );


        console.log(
            "Approval Requests Response:",
            data
        );


        /*
        Backend should return an array
        */

        if (Array.isArray(data)) {

            allRequests = data;

        } else if (
            data &&
            Array.isArray(data.requests)
        ) {

            allRequests = data.requests;

        } else {

            console.warn(
                "Invalid approval requests response:",
                data
            );

            allRequests = [];
        }


        renderRequests(allRequests);

        updateSummary(allRequests);


    } catch (error) {

        console.error(
            "Error loading approval requests:",
            error
        );


        allRequests = [];


        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px;">
                    Unable to load approval requests.
                    <br>
                    <small>
                        ${escapeHtml(error.message)}
                    </small>
                </td>
            </tr>
        `;


        updateSummary([]);
    }
}


/* =========================================================
   RENDER REQUEST TABLE
========================================================= */

function renderRequests(requests) {

    const table =
        document.getElementById("requestsTable");


    if (!table) {
        return;
    }


    if (
        !Array.isArray(requests) ||
        requests.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px;">
                    No approval requests found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        requests.map(request => {

            const requestId =
                request.request_id ||
                request.reference_number ||
                `APR-${request.id}`;


            const title =
                request.title ||
                "-";


            const requestType =
                request.request_type ||
                request.reference_type ||
                "-";


            const amount =
                Number(request.amount || 0);


            const createdAt =
                request.created_at;


            const status =
                request.status ||
                "Pending";


            const workflowId =
                request.id;


            return `
                <tr>

                    <td>
                        ${escapeHtml(requestId)}
                    </td>

                    <td>
                        ${escapeHtml(title)}
                    </td>

                    <td>
                        ${escapeHtml(requestType)}
                    </td>

                    <td>
                        ${formatCurrency(amount)}
                    </td>

                    <td>
                        ${formatDate(createdAt)}
                    </td>

                    <td>
                        <span class="status ${getStatusClass(status)}">
                            ${escapeHtml(status)}
                        </span>
                    </td>

                    <td>

                        <button
                            type="button"
                            class="view-btn"
                            data-id="${workflowId}"
                        >
                            View
                        </button>

                    </td>

                </tr>
            `;

        }).join("");


    const viewButtons =
        table.querySelectorAll(".view-btn");


    viewButtons.forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const id =
                    this.dataset.id;

                viewRequest(id);
            }
        );
    });
}


/* =========================================================
   UPDATE SUMMARY
========================================================= */

function updateSummary(requests) {

    if (!Array.isArray(requests)) {
        requests = [];
    }


    const total =
        requests.length;


    const pending =
        requests.filter(request =>
            normalizeStatus(request.status) ===
            "pending"
        ).length;


    const approved =
        requests.filter(request =>
            normalizeStatus(request.status) ===
            "approved"
        ).length;


    const rejected =
        requests.filter(request =>
            normalizeStatus(request.status) ===
            "rejected"
        ).length;


    const totalElement =
        document.getElementById("totalRequests");

    const pendingElement =
        document.getElementById("pendingRequests");

    const approvedElement =
        document.getElementById("approvedRequests");

    const rejectedElement =
        document.getElementById("rejectedRequests");


    if (totalElement) {
        totalElement.textContent = total;
    }


    if (pendingElement) {
        pendingElement.textContent = pending;
    }


    if (approvedElement) {
        approvedElement.textContent = approved;
    }


    if (rejectedElement) {
        rejectedElement.textContent = rejected;
    }
}


/* =========================================================
   APPLY SEARCH AND STATUS FILTER
========================================================= */

function applyFilters() {

    const searchInput =
        document.getElementById("searchInput");


    const statusFilter =
        document.getElementById("statusFilter");


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const selectedStatus =
        statusFilter
            ? statusFilter.value
                .trim()
                .toLowerCase()
            : "";


    const filteredRequests =
        allRequests.filter(request => {

            const searchableText = [

                request.request_id,
                request.id,
                request.title,
                request.request_type,
                request.reference_type

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            const requestStatus =
                normalizeStatus(
                    request.status ||
                    "Pending"
                );


            const matchesSearch =
                !search ||
                searchableText.includes(search);


            const matchesStatus =
                !selectedStatus ||
                selectedStatus === "all" ||
                requestStatus === selectedStatus;


            return (
                matchesSearch &&
                matchesStatus
            );
        });


    renderRequests(filteredRequests);
}


/* =========================================================
   VIEW REQUEST
========================================================= */

function viewRequest(id) {

    if (!id) {

        console.error(
            "Approval request ID is missing."
        );

        return;
    }


    window.location.href =
        `/FinanceApprovalRequestDetails?id=${encodeURIComponent(id)}`;
}


/* =========================================================
   CREATE NEW REQUEST
========================================================= */

function createNewRequest() {

    window.location.href =
        "/FinanceRequests";
}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(amount) {

    const numericAmount =
        Number(amount) || 0;


    return `₹${numericAmount.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    )}`;
}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {
        return "-";
    }


    const date =
        new Date(dateValue);


    if (Number.isNaN(date.getTime())) {
        return "-";
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
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(status) {

    return String(status || "")
        .trim()
        .toLowerCase();
}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    const normalized =
        normalizeStatus(status);


    if (normalized === "approved") {
        return "approved";
    }


    if (normalized === "rejected") {
        return "rejected";
    }


    if (
        normalized === "pending" ||
        normalized.includes("pending")
    ) {
        return "pending";
    }


    return normalized
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "-";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   INITIALIZE PAGE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        loadCurrentUser();
        loadRequests();


        const searchInput =
            document.getElementById("searchInput");

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                applyFilters
            );
        }


        const statusFilter =
            document.getElementById("statusFilter");

        if (statusFilter) {

            statusFilter.addEventListener(
                "change",
                applyFilters
            );
        }
    }
);


function setText(elementId, value) {

    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = value ?? "";
    }
}


/* --------------------------------------------------
   Load Current User
-------------------------------------------------- */
async function loadCurrentUser() {

    try {

        const user =
            await apiFetch(
                `/api/auth/me`
            );


        console.log(
            "Current user:",
            user
        );


        const name =
            user.name ||
            user.full_name ||
            user.username ||
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