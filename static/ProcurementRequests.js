"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE = "http://127.0.0.1:8000";

const API_URL =
    `${API_BASE}/api/procurement-requests`;


/* =========================================================
   STATE
========================================================= */

const state = {

    page: 1,

    pageSize: 10,

    totalPages: 1,

    total: 0,

    activeTab: "all"

};


/* =========================================================
   AUTH TOKEN
========================================================= */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
    );
}


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(
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
        await fetch(url, {
            ...options,
            headers
        });

    if (response.status === 401) {

        alert(
            "Your session has expired. Please login again."
        );

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
            "Unauthorized"
        );
    }

    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `HTTP ${response.status}: ${text}`
        );
    }

    return response.json();
}


async function getJSON(url, options = {}) {
    return await apiRequest(url, options);
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        bindEvents();

        await loadDepartments();

        await loadProfile();

        await Promise.all([
            loadStatistics(),
            loadRequests()
        ]);

    }
);


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

    document
        .getElementById("requestSearch")
        .addEventListener(
            "input",
            debounce(
                () => {
                    state.page = 1;
                    loadRequests();
                },
                350
            )
        );


    document
        .getElementById("statusFilter")
        .addEventListener(
            "change",
            refreshRequests
        );


    document
        .getElementById("departmentFilter")
        .addEventListener(
            "change",
            refreshRequests
        );


    document
        .getElementById("priorityFilter")
        .addEventListener(
            "change",
            refreshRequests
        );


    document
        .getElementById("startDate")
        .addEventListener(
            "change",
            refreshRequests
        );


    document
        .getElementById("endDate")
        .addEventListener(
            "change",
            refreshRequests
        );


    document
        .getElementById("resetBtn")
        .addEventListener(
            "click",
            resetFilters
        );


    document
        .getElementById("previousPage")
        .addEventListener(
            "click",
            () => {

                if (state.page > 1) {

                    state.page--;

                    loadRequests();

                }

            }
        );


    document
        .getElementById("nextPage")
        .addEventListener(
            "click",
            () => {

                if (
                    state.page <
                    state.totalPages
                ) {

                    state.page++;

                    loadRequests();

                }

            }
        );


    document
        .getElementById("pageSize")
        .addEventListener(
            "change",
            event => {

                state.pageSize =
                    Number(
                        event.target.value
                    );

                state.page = 1;

                loadRequests();

            }
        );


    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".tab")
                        .forEach(item =>
                            item.classList.remove(
                                "active"
                            )
                        );

                    tab.classList.add(
                        "active"
                    );

                    state.activeTab =
                        tab.dataset.tab;

                    state.page = 1;

                    loadRequests();

                }
            );

        });


    document
        .getElementById("newRequestBtn")
        .addEventListener(
            "click",
            openModal
        );


    document
        .getElementById("closeModal")
        .addEventListener(
            "click",
            closeModal
        );


    document
        .getElementById("cancelModal")
        .addEventListener(
            "click",
            closeModal
        );


    document
        .getElementById("requestForm")
        .addEventListener(
            "submit",
            createRequest
        );


    document
        .getElementById("exportBtn")
        .addEventListener(
            "click",
            exportRequests
        );

}


/* =========================================================
   REFRESH
========================================================= */

function refreshRequests() {

    state.page = 1;

    loadRequests();

}


/* =========================================================
   STATISTICS
========================================================= */

async function loadStatistics() {

    try {

        const params =
            buildFilterParams();

        const data =
            await apiRequest(
                `${API_URL}/statistics?${params}`
            );

        document.getElementById(
            "totalRequests"
        ).textContent =
            data.total || 0;

        document.getElementById(
            "draftRequests"
        ).textContent =
            data.draft || 0;

        document.getElementById(
            "pendingRequests"
        ).textContent =
            data.pending_approval || 0;

        document.getElementById(
            "approvedRequests"
        ).textContent =
            data.approved || 0;

        document.getElementById(
            "rejectedRequests"
        ).textContent =
            data.rejected || 0;

        document.getElementById(
            "completedRequests"
        ).textContent =
            data.completed || 0;

    } catch (error) {

        console.error(
            "Statistics error:",
            error
        );

    }

}


/* =========================================================
   REQUESTS
========================================================= */

async function loadRequests() {

    const tbody =
        document.getElementById(
            "requestsBody"
        );

    tbody.innerHTML = `
        <tr>
            <td
                colspan="10"
                class="loading"
            >
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading requests...
            </td>
        </tr>
    `;


    try {

        const params =
            buildFilterParams();

        params.set(
            "page",
            state.page
        );

        params.set(
            "page_size",
            state.pageSize
        );

        params.set(
            "tab",
            state.activeTab
        );


        const data =
            await apiRequest(
                `${API_URL}/?${params.toString()}`
            );


        state.total =
            data.total || 0;

        state.totalPages =
            data.total_pages || 1;


        renderRequests(
            data.requests || []
        );

        renderPagination();


    } catch (error) {

        console.error(
            "Procurement request error:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="empty"
                >
                    Unable to load procurement requests.
                </td>
            </tr>
        `;

    }

}


/* =========================================================
   BUILD FILTERS
========================================================= */

function buildFilterParams() {

    const params =
        new URLSearchParams();


    const search =
        document
            .getElementById(
                "requestSearch"
            )
            .value
            .trim();

    const status =
        document
            .getElementById(
                "statusFilter"
            )
            .value;

    const department =
        document
            .getElementById(
                "departmentFilter"
            )
            .value;

    const priority =
        document
            .getElementById(
                "priorityFilter"
            )
            .value;

    const startDate =
        document
            .getElementById(
                "startDate"
            )
            .value;

    const endDate =
        document
            .getElementById(
                "endDate"
            )
            .value;


    if (search) {
        params.set(
            "search",
            search
        );
    }

    if (status !== "All") {
        params.set(
            "status",
            status
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

    if (startDate) {
        params.set(
            "start_date",
            startDate
        );
    }

    if (endDate) {
        params.set(
            "end_date",
            endDate
        );
    }

    return params;
}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderRequests(requests) {

    const tbody =
        document.getElementById(
            "requestsBody"
        );


    if (!requests.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="empty"
                >
                    No procurement requests found.
                </td>
            </tr>
        `;

        updateResultCount();

        return;
    }


    tbody.innerHTML =
        requests
            .map(
                request =>
                    createRequestRow(
                        request
                    )
            )
            .join("");


    updateResultCount();

}


/* =========================================================
   REQUEST ROW
========================================================= */

function createRequestRow(request) {

    const requester =
        request.requester ||
        "Unknown";

    const initials =
        getInitials(
            requester
        );


    const title =
        request.title ||
        request.description ||
        "Procurement Request";


    const description =
        request.description || "";


    const statusClass =
        String(
            request.status || ""
        )
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        );


    const priorityClass =
        String(
            request.priority || "Medium"
        )
        .toLowerCase();


    return `
        <tr>

            <td>
                <span class="request-id">
                    ${escapeHTML(
                        request.request_number
                    )}
                </span>
            </td>


            <td>

                <div class="request-title">
                    ${escapeHTML(title)}
                </div>

                <div class="request-description">
                    ${escapeHTML(
                        truncate(
                            description,
                            45
                        )
                    )}
                </div>

            </td>


            <td>
                ${escapeHTML(
                    request.department ||
                    "-"
                )}
            </td>


            <td>

                <div class="requester">

                    <div class="user-avatar">
                        ${escapeHTML(initials)}
                    </div>

                    <span>
                        ${escapeHTML(requester)}
                    </span>

                </div>

            </td>


            <td>

                <span
                    class="priority ${priorityClass}"
                >
                    ${escapeHTML(
                        request.priority ||
                        "Medium"
                    )}
                </span>

            </td>


            <td>

                <span
                    class="status ${statusClass}"
                >
                    ${escapeHTML(
                        request.status ||
                        "Pending"
                    )}
                </span>

            </td>


            <td>
                ${formatDate(
                    request.created_at
                )}
            </td>


            <td>
                ${
                    request.required_date
                    ? formatDate(
                        request.required_date
                    )
                    : "-"
                }
            </td>


            <td>

                <span class="amount">
                    ${formatCurrency(
                        request.amount
                    )}
                </span>

            </td>


            <td>

                <div class="actions">

                    <button
                        class="action-button"
                        title="View"
                        onclick="viewRequest(
                            ${request.id}
                        )"
                    >
                        <i class="fa-regular fa-eye"></i>
                    </button>

                    <button
                        class="action-button"
                        title="More"
                        onclick="showRequestMenu(
                            ${request.id}
                        )"
                    >
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>

                </div>

            </td>

        </tr>
    `;
}


/* =========================================================
   DEPARTMENTS
========================================================= */

async function loadDepartments() {

    try {

        const departments =
            await apiRequest(
                `${API_URL}/departments`
            );

        const select =
            document.getElementById(
                "departmentFilter"
            );

        departments.forEach(
            department => {

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

            }
        );

    } catch (error) {

        console.error(
            "Department loading error:",
            error
        );

    }

}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination() {

    const container =
        document.getElementById(
            "pageNumbers"
        );

    container.innerHTML = "";


    let start =
        Math.max(
            1,
            state.page - 2
        );

    let end =
        Math.min(
            state.totalPages,
            start + 4
        );


    if (
        end - start < 4
    ) {

        start =
            Math.max(
                1,
                end - 4
            );

    }


    for (
        let i = start;
        i <= end;
        i++
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.className =
            "page-number";

        if (i === state.page) {
            button.classList.add(
                "active"
            );
        }

        button.textContent = i;

        button.addEventListener(
            "click",
            () => {

                state.page = i;

                loadRequests();

            }
        );

        container.appendChild(
            button
        );

    }


    document
        .getElementById(
            "previousPage"
        )
        .disabled =
            state.page <= 1;


    document
        .getElementById(
            "nextPage"
        )
        .disabled =
            state.page >=
            state.totalPages;

}


/* =========================================================
   RESULT COUNT
========================================================= */

function updateResultCount() {

    const element =
        document.getElementById(
            "resultCount"
        );


    if (!state.total) {

        element.textContent =
            "Showing 0 requests";

        return;
    }


    const first =
        (
            (state.page - 1)
            * state.pageSize
        ) + 1;


    const last =
        Math.min(
            state.page *
                state.pageSize,
            state.total
        );


    element.textContent =
        `Showing ${first} to ${last} of ${state.total} requests`;
}


/* =========================================================
   RESET
========================================================= */

function resetFilters() {

    document.getElementById(
        "requestSearch"
    ).value = "";

    document.getElementById(
        "statusFilter"
    ).value = "All";

    document.getElementById(
        "departmentFilter"
    ).value = "All";

    document.getElementById(
        "priorityFilter"
    ).value = "All";

    document.getElementById(
        "startDate"
    ).value = "";

    document.getElementById(
        "endDate"
    ).value = "";

    state.page = 1;

    loadStatistics();

    loadRequests();

}


/* =========================================================
   NEW REQUEST MODAL
========================================================= */

function openModal() {

    document
        .getElementById(
            "requestModal"
        )
        .classList.add(
            "show"
        );

}


function closeModal() {

    document
        .getElementById(
            "requestModal"
        )
        .classList.remove(
            "show"
        );

}


/* =========================================================
   CREATE REQUEST
========================================================= */

async function createRequest(event) {

    event.preventDefault();


    const payload = {

        title:
            document
                .getElementById(
                    "requestTitle"
                )
                .value
                .trim(),

        department:
            document
                .getElementById(
                    "requestDepartment"
                )
                .value
                .trim(),

        category:
            document
                .getElementById(
                    "requestCategory"
                )
                .value
                .trim(),

        priority:
            document
                .getElementById(
                    "requestPriority"
                )
                .value,

        amount:
            Number(
                document
                    .getElementById(
                        "requestAmount"
                    )
                    .value
            ) || 0,

        required_date:
            document
                .getElementById(
                    "requestRequiredDate"
                )
                .value || null,

        description:
            document
                .getElementById(
                    "requestDescription"
                )
                .value
                .trim()

    };


    try {

        await apiRequest(
            `${API_URL}/`,
            {
                method: "POST",
                body: JSON.stringify(
                    payload
                )
            }
        );


        closeModal();

        document
            .getElementById(
                "requestForm"
            )
            .reset();


        state.page = 1;

        await Promise.all([
            loadStatistics(),
            loadRequests()
        ]);


        alert(
            "Procurement request created successfully."
        );


    } catch (error) {

        console.error(
            "Create request error:",
            error
        );

        alert(
            "Unable to create procurement request."
        );

    }

}


/* =========================================================
   VIEW REQUEST
========================================================= */

async function viewRequest(id) {

    try {

        const request =
            await apiRequest(
                `${API_URL}/${id}`
            );


        const message = [

            `Request: ${request.request_number}`,

            `Title: ${
                request.title || "-"
            }`,

            `Requester: ${
                request.requester || "-"
            }`,

            `Department: ${
                request.department || "-"
            }`,

            `Priority: ${
                request.priority || "-"
            }`,

            `Status: ${
                request.status || "-"
            }`,

            `Estimated Cost: ${
                formatCurrency(
                    request.amount
                )
            }`,

            `Required By: ${
                request.required_date
                    ? formatDate(
                        request.required_date
                    )
                    : "-"
            }`

        ].join("\n");


        alert(message);

    } catch (error) {

        console.error(
            error
        );

    }

}


/* =========================================================
   ACTION MENU
========================================================= */

function showRequestMenu(id) {

    const action =
        prompt(
            "Enter action:\n\n" +
            "approve\n" +
            "reject\n" +
            "complete\n" +
            "cancel"
        );


    if (!action) {
        return;
    }


    const statusMap = {

        approve:
            "Approved",

        reject:
            "Rejected",

        complete:
            "Completed",

        cancel:
            "Cancelled"

    };


    const status =
        statusMap[
            action.toLowerCase()
        ];


    if (!status) {

        alert(
            "Invalid action."
        );

        return;
    }


    updateRequestStatus(
        id,
        status
    );

}


/* =========================================================
   UPDATE STATUS
========================================================= */

async function updateRequestStatus(
    id,
    status
) {

    let rejectionReason = null;


    if (status === "Rejected") {

        rejectionReason =
            prompt(
                "Enter rejection reason:"
            );

    }


    try {

        await apiRequest(
            `${API_URL}/${id}/status`,
            {
                method: "PATCH",

                body: JSON.stringify({

                    status,

                    rejection_reason:
                        rejectionReason

                })

            }
        );


        await Promise.all([
            loadStatistics(),
            loadRequests()
        ]);


    } catch (error) {

        console.error(
            "Status update error:",
            error
        );

        alert(
            "Unable to update request."
        );

    }

}


/* =========================================================
   EXPORT
========================================================= */

async function exportRequests() {

    try {

        const params =
            buildFilterParams();

        params.set(
            "page",
            "1"
        );

        params.set(
            "page_size",
            "100"
        );

        params.set(
            "tab",
            state.activeTab
        );


        const data =
            await apiRequest(
                `${API_URL}/?${params.toString()}`
            );


        const rows =
            data.requests || [];


        if (!rows.length) {

            alert(
                "No requests to export."
            );

            return;
        }


        const header = [

            "Request ID",
            "Title",
            "Department",
            "Requested By",
            "Priority",
            "Status",
            "Request Date",
            "Required By",
            "Estimated Cost"

        ];


        const csvRows = [
            header.join(",")
        ];


        rows.forEach(
            request => {

                csvRows.push(

                    [

                        request.request_number,

                        request.title || "",

                        request.department || "",

                        request.requester || "",

                        request.priority || "",

                        request.status || "",

                        formatDate(
                            request.created_at
                        ),

                        request.required_date
                            ? formatDate(
                                request.required_date
                            )
                            : "",

                        request.amount || 0

                    ]
                    .map(
                        value =>
                            `"${String(value)
                                .replace(
                                    /"/g,
                                    '""'
                                )}"`
                    )
                    .join(",")

                );

            }
        );


        const blob =
            new Blob(
                [
                    csvRows.join("\n")
                ],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            `procurement_requests_${
                new Date()
                    .toISOString()
                    .slice(0, 10)
            }.csv`;

        link.click();


        URL.revokeObjectURL(
            url
        );


    } catch (error) {

        console.error(
            "Export error:",
            error
        );

        alert(
            "Unable to export requests."
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
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function formatCurrency(value) {

    const number =
        Number(value || 0);

    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0
        }
    ).format(number);

}


function getInitials(name) {

    if (!name) {
        return "?";
    }

    return name
        .split(" ")
        .filter(Boolean)
        .map(
            word =>
                word[0]
        )
        .join("")
        .substring(0, 2)
        .toUpperCase();

}


function truncate(
    text,
    max
) {

    if (!text) {
        return "";
    }

    return text.length > max
        ? text.substring(0, max) + "..."
        : text;

}


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


function debounce(
    callback,
    delay
) {

    let timer;

    return function () {

        clearTimeout(timer);

        timer =
            setTimeout(
                callback,
                delay
            );

    };

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

function openProfile(){
    window.location.href="/ProcurementProfile";
}

function loadUser(user){

    const name = user.name || "Manager";

    const role = user.role || "Procurement Manager";

    setText( "sidebarName", name );

    setText( "sidebarRole", role );

    setText( "headerName", name );

    setText( "headerRole", role );

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