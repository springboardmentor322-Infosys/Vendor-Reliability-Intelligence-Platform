/* ==========================================================
   VENDORIQ
   AUDIT LOGS
========================================================== */


const API = "http://127.0.0.1:8000";


let currentPage = 1;

let pageLimit = 10;

let totalPages = 1;

let currentLogs = [];


/* ==========================================================
   AUTH TOKEN
========================================================== */

function getToken() {

    return (

        localStorage.getItem("access_token") ||

        localStorage.getItem("token") ||

        localStorage.getItem("accessToken") ||

        sessionStorage.getItem("access_token") ||

        sessionStorage.getItem("token") ||

        sessionStorage.getItem("accessToken") ||

        ""

    );

}


/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();


    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    if (token) {

        headers[
            "Authorization"
        ] = `Bearer ${token}`;

    }


    console.log(
        "API REQUEST:",
        url
    );


    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );


    console.log(
        "API STATUS:",
        response.status
    );


    if (!response.ok) {

        let errorMessage =
            `HTTP ${response.status}`;

        try {

            const error =
                await response.json();

            errorMessage =
                error.detail ||
                JSON.stringify(error);

        } catch {

            const text =
                await response.text();

            if (text) {

                errorMessage = text;

            }

        }


        throw new Error(
            errorMessage
        );

    }


    return response;
}


/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        setupEvents();

        await loadAdminProfile();

        await loadFilters();

        await loadSummary();

        await loadAuditLogs();

    }
);


/* ==========================================================
   EVENTS
========================================================== */

function setupEvents() {


    document
        .getElementById("searchInput")
        .addEventListener(
            "input",
            debounce(
                function () {

                    currentPage = 1;

                    loadAuditLogs();

                },
                400
            )
        );


    document
        .getElementById("userFilter")
        .addEventListener(
            "change",
            function () {

                currentPage = 1;

                loadAuditLogs();

            }
        );


    document
        .getElementById("actionFilter")
        .addEventListener(
            "change",
            function () {

                currentPage = 1;

                loadAuditLogs();

            }
        );


    document
        .getElementById("statusFilter")
        .addEventListener(
            "change",
            function () {

                currentPage = 1;

                loadAuditLogs();

            }
        );


    document
        .getElementById("fromDate")
        .addEventListener(
            "change",
            function () {

                currentPage = 1;

                loadAuditLogs();

            }
        );


    document
        .getElementById("toDate")
        .addEventListener(
            "change",
            function () {

                currentPage = 1;

                loadAuditLogs();

            }
        );


    document
        .getElementById("pageLimit")
        .addEventListener(
            "change",
            function (event) {

                pageLimit =
                    Number(
                        event.target.value
                    );

                currentPage = 1;

                loadAuditLogs();

            }
        );


    document
        .getElementById("previousPage")
        .addEventListener(
            "click",
            function () {

                if (
                    currentPage > 1
                ) {

                    currentPage--;

                    loadAuditLogs();

                }

            }
        );


    document
        .getElementById("nextPage")
        .addEventListener(
            "click",
            function () {

                if (
                    currentPage < totalPages
                ) {

                    currentPage++;

                    loadAuditLogs();

                }

            }
        );


    document
        .getElementById("clearFilters")
        .addEventListener(
            "click",
            clearFilters
        );


    document
        .getElementById("filterButton")
        .addEventListener(
            "click",
            function () {

                document
                    .getElementById(
                        "searchInput"
                    )
                    .focus();

            }
        );


    document
        .getElementById("exportButton")
        .addEventListener(
            "click",
            exportCSV
        );


    document
        .getElementById("closeModal")
        .addEventListener(
            "click",
            closeModal
        );


    document
        .getElementById("detailsModal")
        .addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    this
                ) {

                    closeModal();

                }

            }
        );

}


/* ==========================================================
   LOAD SUMMARY
========================================================== */

async function loadSummary() {

    try {

        const response =
            await apiFetch(
                `${API}/api/admin/audit-logs/summary`
            );


        const data =
            await response.json();


        document
            .getElementById(
                "totalLogs"
            )
            .textContent =
            formatNumber(
                data.total_logs
            );


        document
            .getElementById(
                "totalUsers"
            )
            .textContent =
            formatNumber(
                data.users
            );


        document
            .getElementById(
                "totalActions"
            )
            .textContent =
            formatNumber(
                data.actions
            );


        document
            .getElementById(
                "criticalEvents"
            )
            .textContent =
            formatNumber(
                data.critical_events
            );


        document
            .getElementById(
                "failedEvents"
            )
            .textContent =
            formatNumber(
                data.failed_events
            );


        document
            .getElementById(
                "uniqueIPs"
            )
            .textContent =
            formatNumber(
                data.unique_ips
            );


    } catch (error) {

        console.error(
            "Unable to load audit summary:",
            error
        );

    }

}


/* ==========================================================
   LOAD FILTERS
========================================================== */

async function loadFilters() {

    try {

        const response =
            await apiFetch(
                `${API}/api/admin/audit-logs/filters`
            );


        const data =
            await response.json();


        populateSelect(
            "userFilter",
            "All Users",
            data.users || []
        );


        populateSelect(
            "actionFilter",
            "All Actions",
            data.actions || []
        );


        populateSelect(
            "statusFilter",
            "All Status",
            data.statuses || []
        );


    } catch (error) {

        console.error(
            "Unable to load filters:",
            error
        );

    }

}


/* ==========================================================
   POPULATE SELECT
========================================================== */

function populateSelect(
    elementId,
    defaultText,
    values
) {

    const select =
        document.getElementById(
            elementId
        );


    select.innerHTML = "";


    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value = "";

    defaultOption.textContent =
        defaultText;


    select.appendChild(
        defaultOption
    );


    values.forEach(
        function (value) {

            const option =
                document.createElement(
                    "option"
                );

            option.value = value;

            option.textContent = value;

            select.appendChild(
                option
            );

        }
    );

}


/* ==========================================================
   LOAD AUDIT LOGS
========================================================== */

async function loadAuditLogs() {

    try {

        showLoading();


        const params =
            new URLSearchParams();


        const search =
            document
                .getElementById(
                    "searchInput"
                )
                .value
                .trim();


        const user =
            document
                .getElementById(
                    "userFilter"
                )
                .value;


        const action =
            document
                .getElementById(
                    "actionFilter"
                )
                .value;


        const status =
            document
                .getElementById(
                    "statusFilter"
                )
                .value;


        const fromDate =
            document
                .getElementById(
                    "fromDate"
                )
                .value;


        const toDate =
            document
                .getElementById(
                    "toDate"
                )
                .value;


        if (search) {

            params.append(
                "search",
                search
            );

        }


        if (user) {

            params.append(
                "user",
                user
            );

        }


        if (action) {

            params.append(
                "action",
                action
            );

        }


        if (status) {

            params.append(
                "status",
                status
            );

        }


        if (fromDate) {

            params.append(
                "from_date",
                fromDate
            );

        }


        if (toDate) {

            params.append(
                "to_date",
                toDate
            );

        }


        params.append(
            "page",
            currentPage
        );


        params.append(
            "limit",
            pageLimit
        );


        const url =
            `${API}/api/admin/audit-logs?${params.toString()}`;


        const response =
            await apiFetch(url);


        const data =
            await response.json();


        currentLogs =
            data.items || [];


        totalPages =
            data.pagination?.pages || 1;


        renderAuditLogs(
            currentLogs
        );


        renderPagination(
            data.pagination
        );


    } catch (error) {

        console.error(
            "Unable to load audit logs:",
            error
        );


        showError(
            error.message
        );

    }

}


/* ==========================================================
   RENDER TABLE
========================================================== */

function renderAuditLogs(
    logs
) {

    const tbody =
        document.getElementById(
            "auditTableBody"
        );


    tbody.innerHTML = "";


    if (!logs.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="10"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#7a84a3;
                    "
                >

                    No audit logs found.

                </td>

            </tr>

        `;

        return;

    }


    logs.forEach(
        function (log) {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td class="expand-cell">

                    <i
                        class="fa-solid fa-chevron-right"
                    ></i>

                </td>


                <td>
                    ${formatDateTime(
                        log.created_at
                    )}
                </td>


                <td>

                    ${renderUser(
                        log
                    )}

                </td>


                <td>

                    ${renderRole(
                        log.role
                    )}

                </td>


                <td>

                    <div class="action-cell">

                        <strong>
                            ${escapeHtml(
                                log.action ||
                                "-"
                            )}
                        </strong>

                        <small>
                            ${escapeHtml(
                                log.description ||
                                "-"
                            )}
                        </small>

                    </div>

                </td>


                <td>
                    ${escapeHtml(
                        log.resource ||
                        "-"
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        log.resource_id ||
                        "—"
                    )}
                </td>


                <td>

                    ${renderStatus(
                        log.status
                    )}

                </td>


                <td>
                    ${escapeHtml(
                        log.ip_address ||
                        "-"
                    )}
                </td>


                <td>

                    <button
                        class="details-button"
                        onclick="viewAuditLog(${log.id})"
                        title="View details"
                    >

                        <i
                            class="fa-regular fa-eye"
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


/* ==========================================================
   USER
========================================================== */

function renderUser(log) {

    const role =
        (log.role || "")
        .toLowerCase();


    let avatarClass = "";


    if (
        role.includes("vendor")
    ) {

        avatarClass = "green";

    }
    else if (
        role.includes("finance")
    ) {

        avatarClass = "orange";

    }
    else if (
        role.includes("guest")
    ) {

        avatarClass = "gray";

    }


    const name =
        log.user_name ||
        "Unknown User";


    const email =
        log.user_email ||
        "Unknown";


    return `

        <div class="user-cell">

            <div
                class="user-avatar ${avatarClass}"
            >

                <i
                    class="fa-solid fa-user"
                ></i>

            </div>

            <div class="user-info">

                <strong>
                    ${escapeHtml(
                        email
                    )}
                </strong>

                <small>
                    ${escapeHtml(
                        name
                    )}
                </small>

            </div>

        </div>

    `;

}


/* ==========================================================
   ROLE
========================================================== */

function renderRole(
    role
) {

    if (!role) {

        return "-";

    }


    const lower =
        role.toLowerCase();


    let className =
        "role-guest";


    if (
        lower.includes(
            "admin"
        )
    ) {

        className =
            "role-admin";

    }
    else if (
        lower.includes(
            "procurement"
        )
    ) {

        className =
            "role-manager";

    }
    else if (
        lower.includes(
            "vendor"
        )
    ) {

        className =
            "role-vendor";

    }
    else if (
        lower.includes(
            "finance"
        )
    ) {

        className =
            "role-finance";

    }


    return `

        <span
            class="role-badge ${className}"
        >

            ${escapeHtml(role)}

        </span>

    `;

}


/* ==========================================================
   STATUS
========================================================== */

function renderStatus(
    status
) {

    const value =
        status ||
        "Success";


    const lower =
        value.toLowerCase();


    let className =
        "status-success";


    if (
        lower === "failed"
    ) {

        className =
            "status-failed";

    }
    else if (
        lower === "critical"
    ) {

        className =
            "status-critical";

    }


    return `

        <span
            class="status-badge ${className}"
        >

            ${escapeHtml(
                value
            )}

        </span>

    `;

}


/* ==========================================================
   PAGINATION
========================================================== */

function renderPagination(
    pagination
) {

    const total =
        pagination?.total || 0;


    const page =
        pagination?.page || 1;


    const limit =
        pagination?.limit || pageLimit;


    totalPages =
        pagination?.pages || 1;


    const start =
        total === 0
            ? 0
            : (
                (page - 1)
                * limit
            ) + 1;


    const end =
        Math.min(
            page * limit,
            total
        );


    document
        .getElementById(
            "paginationText"
        )
        .textContent =
        `Showing ${start} to ${end} of ${formatNumber(total)} logs`;


    document
        .getElementById(
            "previousPage"
        )
        .disabled =
        page <= 1;


    document
        .getElementById(
            "nextPage"
        )
        .disabled =
        page >= totalPages;


    const pageNumbers =
        document.getElementById(
            "pageNumbers"
        );


    pageNumbers.innerHTML = "";


    const pages =
        getPageNumbers(
            page,
            totalPages
        );


    pages.forEach(
        function (pageNumber) {

            if (
                pageNumber === "..."
            ) {

                const span =
                    document.createElement(
                        "span"
                    );

                span.textContent = "...";

                span.style.padding =
                    "0 5px";

                pageNumbers.appendChild(
                    span
                );

                return;

            }


            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "page-number";


            if (
                pageNumber === page
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.textContent =
                pageNumber;


            button.addEventListener(
                "click",
                function () {

                    currentPage =
                        pageNumber;

                    loadAuditLogs();

                }
            );


            pageNumbers.appendChild(
                button
            );

        }
    );

}


/* ==========================================================
   PAGE NUMBERS
========================================================== */

function getPageNumbers(
    current,
    total
) {

    if (total <= 5) {

        return Array.from(
            {
                length: total
            },
            (_, i) => i + 1
        );

    }


    if (current <= 3) {

        return [
            1,
            2,
            3,
            "...",
            total
        ];

    }


    if (
        current >=
        total - 2
    ) {

        return [
            1,
            "...",
            total - 2,
            total - 1,
            total
        ];

    }


    return [
        1,
        "...",
        current,
        "...",
        total
    ];

}


/* ==========================================================
   VIEW LOG
========================================================== */

async function viewAuditLog(
    logId
) {

    try {

        const response =
            await apiFetch(
                `${API}/api/admin/audit-logs/${logId}`
            );


        const log =
            await response.json();


        const content =
            document.getElementById(
                "modalContent"
            );


        content.innerHTML = `

            <div class="detail-grid">


                <div class="detail-item">

                    <label>
                        Log ID
                    </label>

                    <strong>
                        ${log.id}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>
                        Date & Time
                    </label>

                    <strong>
                        ${formatDateTime(
                            log.created_at
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>
                        User
                    </label>

                    <strong>
                        ${escapeHtml(
                            log.user_name ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>
                        Email
                    </label>

                    <strong>
                        ${escapeHtml(
                            log.user_email ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>
                        Role
                    </label>

                    <strong>
                        ${escapeHtml(
                            log.role ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>
                        Action
                    </label>

                    <strong>
                        ${escapeHtml(
                            log.action ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>
                        Resource
                    </label>

                    <strong>
                        ${escapeHtml(
                            log.resource ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>
                        Resource ID
                    </label>

                    <strong>
                        ${escapeHtml(
                            log.resource_id ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>
                        Status
                    </label>

                    <strong>
                        ${escapeHtml(
                            log.status ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <label>
                        IP Address
                    </label>

                    <strong>
                        ${escapeHtml(
                            log.ip_address ||
                            "-"
                        )}
                    </strong>

                </div>


            </div>


            <div class="detail-description">

                <label>
                    Description
                </label>

                <div>

                    ${escapeHtml(
                        log.description ||
                        "No description available."
                    )}

                </div>

            </div>


            <div class="detail-description">

                <label>
                    User Agent
                </label>

                <div>

                    ${escapeHtml(
                        log.user_agent ||
                        "-"
                    )}

                </div>

            </div>

        `;


        document
            .getElementById(
                "detailsModal"
            )
            .classList.add(
                "show"
            );


    } catch (error) {

        console.error(
            "Unable to load audit log:",
            error
        );

        alert(
            "Unable to load audit log details."
        );

    }

}


/* ==========================================================
   CLOSE MODAL
========================================================== */

function closeModal() {

    document
        .getElementById(
            "detailsModal"
        )
        .classList.remove(
            "show"
        );

}


/* ==========================================================
   CLEAR FILTERS
========================================================== */

function clearFilters() {

    document
        .getElementById(
            "searchInput"
        )
        .value = "";


    document
        .getElementById(
            "userFilter"
        )
        .value = "";


    document
        .getElementById(
            "actionFilter"
        )
        .value = "";


    document
        .getElementById(
            "statusFilter"
        )
        .value = "";


    currentPage = 1;


    loadAuditLogs();

}


/* ==========================================================
   EXPORT CSV
========================================================== */

async function exportCSV() {

    try {

        const params =
            new URLSearchParams();


        const search =
            document
                .getElementById(
                    "searchInput"
                )
                .value;


        const user =
            document
                .getElementById(
                    "userFilter"
                )
                .value;


        const action =
            document
                .getElementById(
                    "actionFilter"
                )
                .value;


        const status =
            document
                .getElementById(
                    "statusFilter"
                )
                .value;


        if (search) {

            params.append(
                "search",
                search
            );

        }


        if (user) {

            params.append(
                "user",
                user
            );

        }


        if (action) {

            params.append(
                "action",
                action
            );

        }


        if (status) {

            params.append(
                "status",
                status
            );

        }


        const response =
            await apiFetch(
                `${API}/api/admin/audit-logs/export/csv?${params}`
            );


        const blob =
            await response.blob();


        const url =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href = url;

        link.download =
            "audit_logs.csv";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        window.URL.revokeObjectURL(
            url
        );


    } catch (error) {

        console.error(
            "Export error:",
            error
        );


        alert(
            "Unable to export audit logs."
        );

    }

}


/* ==========================================================
   LOADING
========================================================== */

function showLoading() {

    const tbody =
        document.getElementById(
            "auditTableBody"
        );


    tbody.innerHTML = `

        <tr>

            <td
                colspan="10"
                style="
                    text-align:center;
                    padding:40px;
                "
            >

                Loading audit logs...

            </td>

        </tr>

    `;

}


/* ==========================================================
   ERROR
========================================================== */

function showError(
    message
) {

    const tbody =
        document.getElementById(
            "auditTableBody"
        );


    tbody.innerHTML = `

        <tr>

            <td
                colspan="10"
                style="
                    text-align:center;
                    padding:40px;
                    color:#e33445;
                "
            >

                ${escapeHtml(
                    message ||
                    "Unable to load audit logs."
                )}

            </td>

        </tr>

    `;

}


/* ==========================================================
   DATE
========================================================== */

function formatDateTime(
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


    return date.toLocaleString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );

}


/* ==========================================================
   NUMBER
========================================================== */

function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );

}


/* ==========================================================
   ESCAPE HTML
========================================================== */

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


/* ==========================================================
   DEBOUNCE
========================================================== */

function debounce(
    callback,
    delay
) {

    let timer;


    return function (...args) {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => callback(
                    ...args
                ),
                delay
            );

    };

}


function openAdminProfile(){
    window.location.href = "/admin/profile";
}


// ============================================================
// HELPER: SET TEXT
// ============================================================

function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {

        element.textContent =
            value ?? "";

    }
}


function updateHeader(user) {

    const name =
        user.name || "Admin User";

    const email =
        user.email || "";

    const role =
        user.role || "Administrator";


    setText(
        "headerAdminName",
        name
    );

    setText(
        "headerAdminRole",
        role
    );


    setText(
        "sidebarAdminName",
        name
    );

    setText(
        "sidebarAdminEmail",
        email
    );
}


async function loadAdminProfile() {

    try {

        const response = await apiFetch(
            `${API}/adminprofile`
        );

        const data = await response.json();

        console.log(
            "Admin profile:",
            data
        );

        // If API returns:
        // { name, email, role }

        updateHeader(data);

    }
    catch (error) {

        console.error(
            "Unable to load admin profile:",
            error
        );

    }
}