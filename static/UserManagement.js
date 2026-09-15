const API = "http://127.0.0.1:8000";


// ======================================================
// GLOBAL VARIABLES
// ======================================================

let currentPage = 1;

const limit = 8;

let totalPages = 1;

let redirectingToLogin = false;


// ======================================================
// AUTHENTICATION
// ======================================================

function getAuthToken() {

    const possibleTokens = [

        localStorage.getItem("access_token"),

        localStorage.getItem("token"),

        localStorage.getItem("accessToken"),

        sessionStorage.getItem("access_token"),

        sessionStorage.getItem("token"),

        sessionStorage.getItem("accessToken")

    ];


    for (const token of possibleTokens) {

        if (
            token &&
            String(token).trim() !== ""
        ) {

            return String(token).trim();

        }

    }


    return null;

}


// ======================================================
// SAVE TOKEN
// ======================================================

function saveAuthToken(token) {

    if (!token) {

        return;

    }


    localStorage.setItem(
        "access_token",
        token
    );

}


// ======================================================
// CLEAR AUTHENTICATION
// ======================================================

function clearAuthToken() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "accessToken"
    );

    sessionStorage.removeItem(
        "access_token"
    );

    sessionStorage.removeItem(
        "token"
    );

    sessionStorage.removeItem(
        "accessToken"
    );

}


// ======================================================
// REDIRECT TO LOGIN
// ======================================================

function redirectToLogin() {

    if (redirectingToLogin) {

        return;

    }


    redirectingToLogin = true;


    clearAuthToken();


    alert(
        "Your session has expired or you are not authenticated. Please log in again."
    );


    window.location.href =
        "/login";

}


// ======================================================
// AUTHENTICATED API REQUEST
// ======================================================

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getAuthToken();


    if (!token) {

        console.error(
            "No authentication token found."
        );


        redirectToLogin();


        throw new Error(
            "Not authenticated. Please log in again."
        );

    }


    const requestOptions = {
        ...options
    };


    const headers = {

        ...(options.headers || {})

    };


    // ==================================================
    // CONTENT TYPE
    // ==================================================

    if (
        options.body &&
        !headers["Content-Type"] &&
        !headers["content-type"]
    ) {

        headers["Content-Type"] =
            "application/json";

    }


    // ==================================================
    // ACCEPT JSON
    // ==================================================

    if (
        !headers["Accept"] &&
        !headers["accept"]
    ) {

        headers["Accept"] =
            "application/json";

    }


    // ==================================================
    // JWT
    // ==================================================

    headers["Authorization"] =
        `Bearer ${token}`;


    requestOptions.headers =
        headers;


    console.log(
        "API Request:",
        options.method || "GET",
        url,
        "Authenticated"
    );


    const response =
        await fetch(
            url,
            requestOptions
        );


    // ==================================================
    // 401
    // ==================================================

    if (
        response.status === 401
    ) {

        console.error(
            "401 Unauthorized:",
            url
        );


        redirectToLogin();


        throw new Error(
            "Not authenticated. Please log in again."
        );

    }


    return response;

}


// ======================================================
// PARSE API RESPONSE
// ======================================================

async function parseResponse(
    response
) {

    const text =
        await response.text();


    let data;


    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    }

    catch {

        data =
            text;

    }


    if (!response.ok) {

        let message;


        if (
            data &&
            typeof data === "object"
        ) {

            message =
                data.detail ||
                data.message ||
                JSON.stringify(data);

        }

        else {

            message =
                data ||
                `HTTP ${response.status}`;

        }


        throw new Error(
            `HTTP ${response.status}: ${message}`
        );

    }


    return data;

}


async function loadCurrentUser() {

    try {

        const response = await apiFetch(
            `${API}/api/auth/me`,
            {
                method: "GET"
            }
        );

        const data = await parseResponse(response);

        updateHeader(data);

    } catch (error) {

        console.error(
            "Current user loading error:",
            error
        );

    }
}


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "User Management page loaded."
        );


        const token =
            getAuthToken();


        if (!token) {

            console.error(
                "No JWT token found."
            );


            redirectToLogin();


            return;

        }


        console.log(
            "JWT token found."
        );


        updateHeaderFromStorage();
        
        loadCurrentUser();

        loadStats();

        loadUsers();

        setupSearch();

        setupGlobalSearch();

    }
);


// ======================================================
// LOAD USER INFORMATION FROM LOCAL STORAGE
// ======================================================

function updateHeaderFromStorage() {

    let user = null;


    const possibleUserKeys = [

        "currentUser",

        "user",

        "loggedInUser",

        "adminUser"

    ];


    for (
        const key of possibleUserKeys
    ) {

        const stored =
            localStorage.getItem(key) ||
            sessionStorage.getItem(key);


        if (!stored) {

            continue;

        }


        try {

            user =
                JSON.parse(
                    stored
                );


            if (user) {

                break;

            }

        }

        catch {

            console.warn(
                `Unable to parse ${key}`
            );

        }

    }


    if (user) {

        updateHeader(
            user
        );

    }

}


// ======================================================
// LOAD STATISTICS
// ======================================================

async function loadStats() {

    try {

        const response =
            await apiFetch(
                `${API}/api/admin/users/stats`,
                {
                    method: "GET"
                }
            );


        const data =
            await parseResponse(
                response
            );


        console.log(
            "User statistics:",
            data
        );


        // ==================================================
        // SUPPORT MULTIPLE RESPONSE FORMATS
        // ==================================================

        const total =
            data.total_users ??
            data.total ??
            data.statistics?.total_users ??
            0;


        const active =
            data.active_users ??
            data.active ??
            data.statistics?.active_users ??
            0;


        const inactive =
            data.inactive_users ??
            data.inactive ??
            data.statistics?.inactive_users ??
            0;


        const newUsers =
            data.new_this_month ??
            data.new_users ??
            data.statistics?.new_this_month ??
            0;


        // ==================================================
        // UPDATE CARDS
        // ==================================================

        setText(
            "totalUsers",
            total
        );


        setText(
            "activeUsers",
            active
        );


        setText(
            "inactiveUsers",
            inactive
        );


        setText(
            "newUsers",
            newUsers
        );

    }

    catch (error) {

        console.error(
            "Statistics error:",
            error
        );

    }

}


// ======================================================
// LOAD USERS
// ======================================================

async function loadUsers() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    const roleFilter =
        document.getElementById(
            "roleFilter"
        );


    const statusFilter =
        document.getElementById(
            "statusFilter"
        );


    const search =
        searchInput
            ? searchInput.value.trim()
            : "";


    const role =
        roleFilter
            ? roleFilter.value
            : "";


    const status =
        statusFilter
            ? statusFilter.value
            : "";


    const params =
        new URLSearchParams();


    // ==================================================
    // SEARCH
    // ==================================================

    if (search) {

        params.append(
            "search",
            search
        );

    }


    // ==================================================
    // ROLE
    // ==================================================

    if (
        role &&
        role !== "All Roles"
    ) {

        params.append(
            "role",
            role
        );

    }


    // ==================================================
    // STATUS
    // ==================================================

    if (
        status &&
        status !== "All Statuses"
    ) {

        params.append(
            "status",
            status
        );

    }


    // ==================================================
    // PAGINATION
    // ==================================================

    params.append(
        "page",
        currentPage
    );


    params.append(
        "limit",
        limit
    );


    // ==================================================
    // LOADING
    // ==================================================

    const tbody =
        document.getElementById(
            "usersTableBody"
        );


    if (tbody) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="loading"
                >

                    <i
                        class="fa-solid fa-spinner fa-spin"
                    ></i>

                    Loading users...

                </td>

            </tr>

        `;

    }


    try {

        const url =
            `${API}/api/admin/userpage?${params.toString()}`;


        console.log(
            "Loading users:",
            url
        );


        const response =
            await apiFetch(
                url,
                {
                    method: "GET"
                }
            );


        const data =
            await parseResponse(
                response
            );


        console.log(
            "Users API response:",
            data
        );


        // ==================================================
        // SUPPORT DIFFERENT API RESPONSE STRUCTURES
        // ==================================================

        const users =
            Array.isArray(data)
                ? data
                : (
                    data.users ||
                    data.data ||
                    []
                );


        const total =
            Number(
                data.total ??
                data.count ??
                users.length
            );


        const page =
            Number(
                data.page ??
                currentPage
            );


        const pages =
            Number(
                data.pages ??
                Math.ceil(
                    total / limit
                )
            ) || 1;


        const responseLimit =
            Number(
                data.limit ??
                limit
            );


        totalPages =
            pages;


        currentPage =
            page;


        displayUsers(
            users
        );


        updatePagination({

            total: total,

            page: page,

            pages: pages,

            limit: responseLimit

        });

    }

    catch (error) {

        console.error(
            "User loading error:",
            error
        );


        if (tbody) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="empty"
                    >

                        <i
                            class="fa-solid fa-circle-exclamation"
                        ></i>

                        Unable to load users.

                    </td>

                </tr>

            `;

        }

    }

}


// ======================================================
// DISPLAY USERS
// ======================================================

function displayUsers(
    users
) {

    const tbody =
        document.getElementById(
            "usersTableBody"
        );


    if (!tbody) {

        return;

    }


    if (
        !Array.isArray(users) ||
        users.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty"
                >

                    <i
                        class="fa-solid fa-users-slash"
                    ></i>

                    No users found.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        users.map(
            function (user) {

                // ==========================================
                // NAME
                // ==========================================

                const userName =
                    user.name ||
                    user.full_name ||
                    user.fullName ||
                    user.username ||
                    "Unknown User";


                // ==========================================
                // INITIALS
                // ==========================================

                const initials =
                    getInitials(
                        userName
                    );


                // ==========================================
                // AVATAR
                // ==========================================

                const avatarColor =
                    getAvatarColor(
                        user.id
                    );


                // ==========================================
                // LAST LOGIN
                // ==========================================

                const lastLogin =
                    formatDate(
                        user.last_login ||
                        user.lastLogin
                    );


                // ==========================================
                // CREATED
                // ==========================================

                const createdDate =
                    formatDate(
                        user.created_at ||
                        user.createdAt
                    );


                // ==========================================
                // STATUS
                // ==========================================

                const status =
                    normalizeStatus(
                        user.status,
                        user.active
                    );


                const statusClass =
                    status.toLowerCase() === "active"
                        ? "active"
                        : "inactive";


                // ==========================================
                // ROLE
                // ==========================================

                const role =
                    formatRole(
                        user.role
                    );


                // ==========================================
                // MOBILE
                // ==========================================

                const mobile =
                    user.mobile ||
                    user.phone ||
                    user.mobile_number ||
                    "-";


                // ==========================================
                // ID
                // ==========================================

                const userId =
                    Number(
                        user.id
                    );


                return `

                    <tr>

                        <!-- USER -->

                        <td>

                            <div class="user-cell">

                                <div
                                    class="user-avatar"
                                    style="background:${avatarColor}"
                                >

                                    ${escapeHtml(
                                        initials
                                    )}

                                </div>

                                <div>

                                    <div class="user-name">

                                        ${escapeHtml(
                                            userName
                                        )}

                                    </div>

                                    <div class="user-email">

                                        ${escapeHtml(
                                            user.email || "-"
                                        )}

                                    </div>

                                </div>

                            </div>

                        </td>


                        <!-- ROLE -->

                        <td>

                            <span class="role-badge">

                                ${escapeHtml(
                                    role
                                )}

                            </span>

                        </td>


                        <!-- MOBILE -->

                        <td>

                            ${escapeHtml(
                                mobile
                            )}

                        </td>


                        <!-- STATUS -->

                        <td>

                            <span
                                class="status-badge ${statusClass}"
                            >

                                ${escapeHtml(
                                    status
                                )}

                            </span>

                        </td>


                        <!-- LAST LOGIN -->

                        <td>

                            ${escapeHtml(
                                lastLogin
                            )}

                        </td>


                        <!-- CREATED -->

                        <td>

                            ${escapeHtml(
                                createdDate
                            )}

                        </td>


                        <!-- ACTIONS -->

                        <td>

                            <div class="action-buttons">

                                <button
                                    type="button"
                                    class="view-btn"
                                    onclick="viewUser(${userId})"
                                    title="View User"
                                >

                                    <i
                                        class="fa-solid fa-eye"
                                    ></i>

                                </button>


                                <button
                                    type="button"
                                    class="edit-btn"
                                    onclick="editUser(${userId})"
                                    title="Edit User"
                                >

                                    <i
                                        class="fa-solid fa-pen"
                                    ></i>

                                </button>


                                <button
                                    type="button"
                                    class="delete-btn"
                                    onclick="deleteUser(${userId})"
                                    title="Delete User"
                                >

                                    <i
                                        class="fa-solid fa-trash"
                                    ></i>

                                </button>

                            </div>

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


// ======================================================
// FORMAT ROLE
// ======================================================

function formatRole(
    role
) {

    if (!role) {

        return "-";

    }


    const roleMap = {

        "SUPER_ADMIN":
            "Super Admin",

        "ADMIN":
            "Admin",

        "PROCUREMENT_MANAGER":
            "Procurement Manager",

        "FINANCE_OFFICER":
            "Finance Officer",

        "VIEWER":
            "Viewer",

        "VENDOR":
            "Vendor"

    };


    const normalized =
        String(role)
            .trim()
            .toUpperCase();


    if (
        roleMap[normalized]
    ) {

        return roleMap[normalized];

    }


    return String(role)
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /\w\S*/g,
            function (word) {

                return (
                    word.charAt(0).toUpperCase() +
                    word.substring(1).toLowerCase()
                );

            }
        );

}


// ======================================================
// NORMALIZE STATUS
// ======================================================

function normalizeStatus(
    status,
    active
) {

    if (status) {

        const normalized =
            String(status)
                .trim()
                .toLowerCase();


        if (
            normalized === "active"
        ) {

            return "Active";

        }


        if (
            normalized === "inactive"
        ) {

            return "Inactive";

        }


        return String(status);

    }


    if (
        active === true ||
        active === 1 ||
        active === "true"
    ) {

        return "Active";

    }


    return "Inactive";

}


// ======================================================
// INITIALS
// ======================================================

function getInitials(
    name
) {

    if (!name) {

        return "U";

    }


    const words =
        String(name)
            .trim()
            .split(/\s+/);


    if (
        words.length === 1
    ) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (

        words[0].charAt(0) +

        words[
            words.length - 1
        ].charAt(0)

    ).toUpperCase();

}


// ======================================================
// AVATAR COLOR
// ======================================================

function getAvatarColor(
    id
) {

    const colors = [

        "#6331e8",

        "#13ae68",

        "#f2780c",

        "#2676df",

        "#e94768"

    ];


    const numericId =
        Number(id) || 0;


    return colors[
        Math.abs(
            numericId
        ) % colors.length
    ];

}


// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(
    dateString
) {

    if (!dateString) {

        return "Never";

    }


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Never";

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


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value);


    return div.innerHTML;

}


// ======================================================
// SEARCH
// ======================================================

function setupSearch() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (!searchInput) {

        return;

    }


    let timer = null;


    searchInput.addEventListener(
        "input",
        function () {

            clearTimeout(
                timer
            );


            timer =
                setTimeout(
                    function () {

                        currentPage = 1;

                        loadUsers();

                    },
                    400
                );

        }
    );

}


// ======================================================
// GLOBAL SEARCH
// ======================================================

function setupGlobalSearch() {

    const globalSearch =
        document.getElementById(
            "globalSearch"
        );


    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (
        !globalSearch ||
        !searchInput
    ) {

        return;

    }


    globalSearch.addEventListener(
        "input",
        function () {

            searchInput.value =
                this.value;


            currentPage = 1;


            loadUsers();

        }
    );

}


// ======================================================
// PAGINATION
// ======================================================

function updatePagination(
    data
) {

    const total =
        Number(
            data.total
        ) || 0;


    const page =
        Number(
            data.page
        ) || 1;


    const pageLimit =
        Number(
            data.limit
        ) || limit;


    const pages =
        Number(
            data.pages
        ) || 1;


    totalPages =
        pages;


    // ==================================================
    // SHOWING
    // ==================================================

    const start =
        total === 0
            ? 0
            : (
                (page - 1) *
                pageLimit
            ) + 1;


    const end =
        Math.min(
            page * pageLimit,
            total
        );


    const paginationInfo =
        document.getElementById(
            "paginationInfo"
        );


    if (paginationInfo) {

        paginationInfo.textContent =
            total === 0

                ? "Showing 0 users"

                : `Showing ${start} to ${end} of ${total} users`;

    }


    // ==================================================
    // PAGE NUMBERS
    // ==================================================

    const pageNumbers =
        document.getElementById(
            "pageNumbers"
        );


    if (!pageNumbers) {

        return;

    }


    pageNumbers.innerHTML =
        "";


    if (pages <= 1) {

        updatePaginationButtons(
            page,
            pages
        );

        return;

    }


    const pagesToShow = [];


    for (
        let i = 1;
        i <= pages;
        i++
    ) {

        if (
            i <= 3 ||
            i === pages ||
            Math.abs(
                i - page
            ) <= 1
        ) {

            pagesToShow.push(
                i
            );

        }

    }


    const uniquePages =
        [
            ...new Set(
                pagesToShow
            )
        ].sort(
            (a, b) =>
                a - b
        );


    let previous =
        null;


    uniquePages.forEach(
        function (pageNumber) {

            if (
                previous !== null &&
                pageNumber - previous > 1
            ) {

                const dots =
                    document.createElement(
                        "span"
                    );


                dots.className =
                    "pagination-dots";


                dots.textContent =
                    "...";


                pageNumbers.appendChild(
                    dots
                );

            }


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.textContent =
                pageNumber;


            if (
                pageNumber === page
            ) {

                button.classList.add(
                    "current"
                );

            }


            button.onclick =
                function () {

                    currentPage =
                        pageNumber;


                    loadUsers();

                };


            pageNumbers.appendChild(
                button
            );


            previous =
                pageNumber;

        }
    );


    updatePaginationButtons(
        page,
        pages
    );

}


// ======================================================
// PAGINATION BUTTONS
// ======================================================

function updatePaginationButtons(
    page,
    pages
) {

    const previousButton =
        document.getElementById(
            "previousPage"
        );


    if (previousButton) {

        previousButton.disabled =
            page <= 1;

    }


    const nextButton =
        document.getElementById(
            "nextPage"
        );


    if (nextButton) {

        nextButton.disabled =
            page >= pages;

    }

}


// ======================================================
// PREVIOUS PAGE
// ======================================================

function previousPage() {

    if (
        currentPage > 1
    ) {

        currentPage--;

        loadUsers();

    }

}


// ======================================================
// NEXT PAGE
// ======================================================

function nextPage() {

    if (
        currentPage < totalPages
    ) {

        currentPage++;

        loadUsers();

    }

}


// ======================================================
// REFRESH
// ======================================================

function refreshUsers() {

    currentPage = 1;


    loadStats();

    loadUsers();

}


// ======================================================
// ADD NEW USER
// ======================================================

function openUserRegistration() {

    window.location.href =
        "/register";

}


// ======================================================
// EDIT USER
// ======================================================

function editUser(
    id
) {

    if (!id) {

        alert(
            "Invalid user ID."
        );

        return;

    }


    window.location.href =
        `/UserEdit?user_id=${encodeURIComponent(id)}`;

}


// ======================================================
// VIEW USER
// ======================================================

async function viewUser(
    id
) {

    if (!id) {

        alert(
            "Invalid user ID."
        );

        return;

    }


    try {

        const response =
            await apiFetch(
                `${API}/api/admin/users/${encodeURIComponent(id)}`,
                {
                    method: "GET"
                }
            );


        const result =
            await parseResponse(
                response
            );


        const user =
            result.user ||
            result;


        const role =
            formatRole(
                user.role
            );


        const status =
            normalizeStatus(
                user.status,
                user.active
            );


        alert(

            "USER DETAILS\n\n" +

            `Name: ${
                user.name ||
                user.full_name ||
                user.username ||
                "-"
            }\n` +

            `Email: ${
                user.email || "-"
            }\n` +

            `Mobile: ${
                user.mobile ||
                user.phone ||
                "-"
            }\n` +

            `Gender: ${
                user.gender || "-"
            }\n` +

            `Role: ${
                role
            }\n` +

            `Status: ${
                status
            }\n` +

            `Created: ${
                formatDate(
                    user.created_at
                )
            }`

        );

    }

    catch (error) {

        console.error(
            "View user error:",
            error
        );


        alert(
            error.message ||
            "Unable to load user details."
        );

    }

}


// ======================================================
// TOGGLE STATUS
// ======================================================

async function toggleStatus(
    id
) {

    if (!id) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `${API}/api/admin/users/${encodeURIComponent(id)}/status`,
                {
                    method: "PATCH"
                }
            );


        const data =
            await parseResponse(
                response
            );


        console.log(
            "Status update:",
            data
        );


        alert(
            "User status updated successfully."
        );


        await loadStats();

        await loadUsers();

    }

    catch (error) {

        console.error(
            "Status update error:",
            error
        );


        alert(
            error.message ||
            "Unable to change user status."
        );

    }

}


// ======================================================
// THREE DOT MENU
// ======================================================

async function userMenu(
    id
) {

    if (!id) {

        return;

    }


    const choice =
        prompt(

            "Select an action:\n\n" +

            "1 - Activate / Deactivate\n\n" +

            "2 - Delete\n\n" +

            "Enter 1 or 2:"

        );


    if (
        choice === "1"
    ) {

        await toggleStatus(
            id
        );

    }

    else if (
        choice === "2"
    ) {

        await deleteUser(
            id
        );

    }

}


// ======================================================
// DELETE USER
// ======================================================

async function deleteUser(
    id
) {

    if (!id) {

        return;

    }


    const confirmed =
        confirm(

            "Are you sure you want to delete this user?\n\n" +

            "This action cannot be undone."

        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `${API}/api/admin/users/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await parseResponse(
                response
            );


        console.log(
            "Delete response:",
            data
        );


        alert(
            "User deleted successfully."
        );


        const rows =
            document.querySelectorAll(
                "#usersTableBody tr"
            );


        if (
            currentPage > 1 &&
            rows.length <= 1
        ) {

            currentPage--;

        }


        await loadStats();

        await loadUsers();

    }

    catch (error) {

        console.error(
            "Delete user error:",
            error
        );


        alert(
            error.message ||
            "Unable to delete user."
        );

    }

}


// ======================================================
// EXPORT USERS
// ======================================================

async function exportUsers() {

    try {

        const response =
            await apiFetch(
                `${API}/api/admin/userpage?limit=10000&page=1`,
                {
                    method: "GET"
                }
            );


        const data =
            await parseResponse(
                response
            );


        const users =
            Array.isArray(data)
                ? data
                : (
                    data.users ||
                    []
                );


        if (
            users.length === 0
        ) {

            alert(
                "There are no users to export."
            );

            return;

        }


        let csv =
            "Name,Email,Role,Mobile,Status,Created On\n";


        users.forEach(
            function (user) {

                const name =
                    csvEscape(
                        user.name ||
                        user.full_name ||
                        user.username ||
                        ""
                    );


                const email =
                    csvEscape(
                        user.email ||
                        ""
                    );


                const role =
                    csvEscape(
                        formatRole(
                            user.role
                        )
                    );


                const mobile =
                    csvEscape(
                        user.mobile ||
                        user.phone ||
                        ""
                    );


                const status =
                    csvEscape(
                        normalizeStatus(
                            user.status,
                            user.active
                        )
                    );


                const created =
                    csvEscape(
                        formatDate(
                            user.created_at
                        )
                    );


                csv +=
                    `"${name}",` +
                    `"${email}",` +
                    `"${role}",` +
                    `"${mobile}",` +
                    `"${status}",` +
                    `"${created}"\n`;

            }
        );


        const blob =
            new Blob(
                [csv],
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


        link.href =
            url;


        link.download =
            "VendorIQ_Users.csv";


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        URL.revokeObjectURL(
            url
        );

    }

    catch (error) {

        console.error(
            "Export error:",
            error
        );


        alert(
            error.message ||
            "Unable to export users."
        );

    }

}


// ======================================================
// CSV ESCAPE
// ======================================================

function csvEscape(
    value
) {

    return String(
        value
    )
        .replaceAll(
            '"',
            '""'
        );

}


// ======================================================
// UPDATE HEADER
// ======================================================

function updateHeader(
    user
) {

    if (!user) {

        return;

    }


    const name =
        user.name ||
        user.full_name ||
        user.fullName ||
        user.username ||
        "Admin User";


    const email =
        user.email ||
        "";


    const role =
        formatRole(
            user.role ||
            "ADMIN"
        );


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


// ======================================================
// SAFE TEXT
// ======================================================

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        return;

    }


    element.textContent =
        value !== null &&
        value !== undefined
            ? String(value)
            : "";

}


// ============================================================
// ADMIN PROFILE
// ============================================================

function openAdminProfile() {

    window.location.href =
        "/admin/profile";

}