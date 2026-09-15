/* ==========================================================
   VENDORIQ
   DATA MANAGEMENT JAVASCRIPT
========================================================== */

const API = "http://127.0.0.1:8000";


// ==========================================================
// STATE
// ==========================================================

let allEntities = [];

let filteredEntities = [];

let currentPage = 1;

const entitiesPerPage = 10;

let currentModalEntity = null;


// ==========================================================
// TOKEN
// ==========================================================

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        sessionStorage.getItem("accessToken") ||
        ""
    );

}


// ==========================================================
// API FETCH
// ==========================================================

async function apiFetch(endpoint, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };


    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

    }


    /*
        IMPORTANT:

        Pass only the API path here.

        Correct:
        apiFetch("/adminprofile")

        Correct:
        apiFetch("/api/data-management/summary")

        Do NOT pass:
        apiFetch(`${API}/adminprofile`)
    */

    const url =
        endpoint.startsWith("http")
            ? endpoint
            : `${API}${endpoint}`;


    console.log(
        "API REQUEST:",
        url
    );


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    let data = null;


    try {

        data =
            await response.json();

    }
    catch {

        data = null;

    }


    console.log(
        "API STATUS:",
        response.status,
        url
    );


    if (!response.ok) {

        let errorMessage =
            `API error ${response.status}`;


        if (data?.detail) {

            if (Array.isArray(data.detail)) {

                errorMessage =
                    data.detail
                        .map(
                            item =>
                                item.msg ||
                                JSON.stringify(item)
                        )
                        .join(", ");

            }
            else {

                errorMessage =
                    data.detail;

            }

        }


        throw new Error(
            errorMessage
        );

    }


    return data;

}


// ==========================================================
// FORMAT NUMBER
// ==========================================================

function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString();

}


// ==========================================================
// FORMAT STORAGE
// ==========================================================

function formatGB(value) {

    return `${Number(
        value || 0
    ).toFixed(1)} GB`;

}


// ==========================================================
// ICON
// ==========================================================

function getIcon(icon) {

    const icons = {

        users:
            "fa-users",

        building:
            "fa-user-group",

        clipboard:
            "fa-file-invoice",

        contract:
            "fa-file-lines",

        invoice:
            "fa-credit-card",

        bell:
            "fa-bell",

        message:
            "fa-message",

        logs:
            "fa-list-check",

        folder:
            "fa-folder-open",

        shield:
            "fa-shield-halved"

    };


    return (
        icons[icon] ||
        "fa-database"
    );

}


// ==========================================================
// LOAD DASHBOARD
// ==========================================================

async function loadDashboard() {

    try {

        showTableLoading();


        const data =
            await apiFetch(
                "/api/data-management/summary"
            );


        console.log(
            "DATA MANAGEMENT:",
            data
        );


        updateSummary(
            data?.summary || {}
        );


        updateQuality(
            data?.quality || {}
        );


        updateStorage(
            data?.storage || {}
        );


        allEntities =
            data?.entities || [];


        filteredEntities =
            [...allEntities];


        currentPage = 1;


        renderEntities();


        await loadOperations();

    }
    catch (error) {

        console.error(
            "Unable to load Data Management:",
            error
        );


        showToast(
            error.message ||
            "Unable to load Data Management",
            "error"
        );

    }

}


// ==========================================================
// SUMMARY
// ==========================================================

function updateSummary(summary) {

    setText(
        "totalRecords",
        formatNumber(
            summary.total_records
        )
    );


    setText(
        "dataSources",
        formatNumber(
            summary.data_sources
        )
    );


    setText(
        "storageUsed",
        formatGB(
            summary.storage_used_gb
        )
    );


    setText(
        "qualityScore",
        `${Number(
            summary.quality_score || 0
        ).toFixed(0)}%`
    );


    setText(
        "duplicates",
        formatNumber(
            summary.duplicates
        )
    );


    setText(
        "lastBackup",
        summary.last_backup ||
        "Not configured"
    );

}


// ==========================================================
// QUALITY
// ==========================================================

function updateQuality(quality) {

    const score =
        Number(
            quality.score || 0
        );


    setText(
        "qualityScore",
        `${score.toFixed(0)}%`
    );


    setText(
        "donutScore",
        `${score.toFixed(0)}%`
    );


    setText(
        "validData",
        `${Number(
            quality.valid || 0
        ).toFixed(1)}%`
    );


    setText(
        "warningData",
        `${Number(
            quality.warning || 0
        ).toFixed(1)}%`
    );


    setText(
        "invalidData",
        `${Number(
            quality.invalid || 0
        ).toFixed(1)}%`
    );

}


// ==========================================================
// STORAGE
// ==========================================================

function updateStorage(storage) {

    const used =
        Number(
            storage.gb || 0
        );


    const limit =
        Number(
            storage.limit_gb || 200
        );


    const percentage =
        Math.min(
            100,
            (used / limit) * 100
        );


    setText(
        "storageLabel",
        `${used.toFixed(1)} GB used of ${limit} GB`
    );


    setText(
        "storagePercentage",
        `${percentage.toFixed(1)}%`
    );


    const progress =
        document.getElementById(
            "storageProgress"
        );


    if (progress) {

        progress.style.width =
            `${percentage}%`;

    }


    const breakdown =
        storage.breakdown || {};


    setText(
        "documentsStorage",
        formatGB(
            breakdown.documents
        )
    );


    setText(
        "logsStorage",
        formatGB(
            breakdown.logs
        )
    );


    setText(
        "databaseStorage",
        formatGB(
            breakdown.database
        )
    );

}


// ==========================================================
// TABLE LOADING
// ==========================================================

function showTableLoading() {

    const body =
        document.getElementById(
            "entityTableBody"
        );


    if (!body) {
        return;
    }


    body.innerHTML = `

        <tr>

            <td
                colspan="7"
                style="
                    text-align:center;
                    padding:30px;
                "
            >

                Loading PostgreSQL data...

            </td>

        </tr>

    `;

}


// ==========================================================
// RENDER ENTITIES
// ==========================================================

function renderEntities() {

    const body =
        document.getElementById(
            "entityTableBody"
        );


    if (!body) {
        return;
    }


    if (!filteredEntities.length) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >

                    No entities found

                </td>

            </tr>

        `;


        updatePagination(
            0,
            0,
            0
        );


        return;

    }


    const total =
        filteredEntities.length;


    const totalPages =
        Math.ceil(
            total /
            entitiesPerPage
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    const start =
        (
            currentPage - 1
        ) *
        entitiesPerPage;


    const end =
        Math.min(
            start +
            entitiesPerPage,
            total
        );


    const pageEntities =
        filteredEntities.slice(
            start,
            end
        );


    body.innerHTML =
        pageEntities
            .map(
                entity =>
                    createEntityRow(
                        entity
                    )
            )
            .join("");


    updatePagination(
        start + 1,
        end,
        total
    );

}


// ==========================================================
// ESCAPE HTML
// ==========================================================

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;

}


// ==========================================================
// ENTITY ROW
// ==========================================================

function createEntityRow(entity) {

    const icon =
        getIcon(
            entity.icon
        );


    const entityKey =
        String(
            entity.key || ""
        )
        .replace(
            /'/g,
            "\\'"
        );


    return `

        <tr>

            <td>

                <div class="entity-name">

                    <div class="
                        entity-icon
                        ${escapeHtml(
                            entity.color || "blue"
                        )}
                    ">

                        <i
                            class="fa-solid ${icon}"
                        ></i>

                    </div>

                    <span class="entity-title">

                        ${escapeHtml(
                            entity.name
                        )}

                    </span>

                </div>

            </td>


            <td>

                ${escapeHtml(
                    entity.description
                )}

            </td>


            <td>

                <strong>

                    ${formatNumber(
                        entity.records
                    )}

                </strong>

            </td>


            <td>

                ${escapeHtml(
                    entity.size
                )}

            </td>


            <td>

                ${escapeHtml(
                    entity.last_updated
                )}

            </td>


            <td>

                <span class="status">

                    ${escapeHtml(
                        entity.status ||
                        "Active"
                    )}

                </span>

            </td>


            <td>

                <div class="action-buttons">

                    <button
                        type="button"
                        class="action-button"
                        title="View records"
                        onclick="
                            viewEntity('${entityKey}')
                        "
                    >

                        <i
                            class="fa-regular fa-eye"
                        ></i>

                    </button>


                    <button
                        type="button"
                        class="action-button"
                        title="Download"
                        onclick="
                            downloadEntity('${entityKey}')
                        "
                    >

                        <i
                            class="fa-solid fa-download"
                        ></i>

                    </button>


                    <button
                        type="button"
                        class="action-button"
                        title="More"
                    >

                        <i
                            class="fa-solid fa-ellipsis-vertical"
                        ></i>

                    </button>

                </div>

            </td>

        </tr>

    `;

}


// ==========================================================
// PAGINATION
// ==========================================================

function updatePagination(
    start,
    end,
    total
) {

    const showing =
        document.getElementById(
            "showingText"
        );


    if (showing) {

        showing.textContent =
            total
                ? `Showing ${start} to ${end} of ${total} entities`
                : "Showing 0 to 0 of 0 entities";

    }


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                entitiesPerPage
            )
        );


    const previous =
        document.getElementById(
            "previousPage"
        );


    const next =
        document.getElementById(
            "nextPage"
        );


    if (previous) {

        previous.disabled =
            currentPage <= 1;

    }


    if (next) {

        next.disabled =
            currentPage >= totalPages;

    }


    updatePageButton(
        "pageOne",
        1,
        totalPages
    );


    updatePageButton(
        "pageTwo",
        2,
        totalPages
    );

}


// ==========================================================
// PAGE BUTTON
// ==========================================================

function updatePageButton(
    elementId,
    page,
    totalPages
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.style.display =
        page <= totalPages
            ? "block"
            : "none";


    element.textContent =
        page;


    element.classList.toggle(
        "active",
        currentPage === page
    );

}


// ==========================================================
// ENTITY SEARCH
// ==========================================================

function searchEntities(search) {

    search =
        String(
            search || ""
        )
        .trim()
        .toLowerCase();


    if (!search) {

        filteredEntities =
            [...allEntities];

    }
    else {

        filteredEntities =
            allEntities.filter(
                entity => {

                    const name =
                        String(
                            entity.name || ""
                        )
                        .toLowerCase();


                    const description =
                        String(
                            entity.description || ""
                        )
                        .toLowerCase();


                    return (
                        name.includes(search) ||
                        description.includes(search)
                    );

                }
            );

    }


    currentPage = 1;


    renderEntities();

}


// ==========================================================
// VIEW ENTITY
// ==========================================================

async function viewEntity(entityName) {

    const entity =
        allEntities.find(
            item =>
                item.key ===
                entityName
        );


    if (!entity) {

        showToast(
            "Entity not found",
            "error"
        );

        return;

    }


    currentModalEntity =
        entityName;


    setText(
        "modalTitle",
        entity.name
    );


    setText(
        "modalSubtitle",
        entity.description
    );


    const modalSearch =
        document.getElementById(
            "modalSearch"
        );


    if (modalSearch) {

        modalSearch.value = "";

    }


    const modal =
        document.getElementById(
            "dataModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

    }


    await loadEntityRecords();

}


// ==========================================================
// LOAD ENTITY RECORDS
// ==========================================================

async function loadEntityRecords() {

    if (!currentModalEntity) {
        return;
    }


    const searchElement =
        document.getElementById(
            "modalSearch"
        );


    const search =
        searchElement
            ? searchElement.value.trim()
            : "";


    try {

        const data =
            await apiFetch(
                `/api/data-management/entities/${encodeURIComponent(
                    currentModalEntity
                )}?page=1&limit=50&search=${encodeURIComponent(
                    search
                )}`
            );


        renderModalTable(
            data || {}
        );

    }
    catch (error) {

        console.error(
            "Unable to load entity records:",
            error
        );


        const body =
            document.getElementById(
                "modalTableBody"
            );


        if (body) {

            body.innerHTML = `

                <tr>

                    <td
                        colspan="20"
                        style="
                            text-align:center;
                            padding:25px;
                        "
                    >

                        ${escapeHtml(
                            error.message
                        )}

                    </td>

                </tr>

            `;

        }

    }

}


// ==========================================================
// MODAL TABLE
// ==========================================================

function renderModalTable(data) {

    const head =
        document.getElementById(
            "modalTableHead"
        );


    const body =
        document.getElementById(
            "modalTableBody"
        );


    if (!head || !body) {
        return;
    }


    const columns =
        data.columns || [];


    const rows =
        data.rows || [];


    if (!columns.length) {

        head.innerHTML = "";


        body.innerHTML = `

            <tr>

                <td
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >

                    No data found

                </td>

            </tr>

        `;


        return;

    }


    head.innerHTML = `

        <tr>

            ${columns
                .map(
                    column => `

                        <th>

                            ${escapeHtml(
                                column
                            )}

                        </th>

                    `
                )
                .join("")}

        </tr>

    `;


    if (!rows.length) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="${columns.length}"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >

                    No records found

                </td>

            </tr>

        `;


        return;

    }


    body.innerHTML =
        rows
            .map(
                row => `

                    <tr>

                        ${columns
                            .map(
                                column => `

                                    <td>

                                        ${escapeHtml(
                                            formatCell(
                                                row[column]
                                            )
                                        )}

                                    </td>

                                `
                            )
                            .join("")}

                    </tr>

                `
            )
            .join("");

}


// ==========================================================
// FORMAT CELL
// ==========================================================

function formatCell(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "-";

    }


    if (
        typeof value === "object"
    ) {

        try {

            return JSON.stringify(
                value
            );

        }
        catch {

            return String(
                value
            );

        }

    }


    return String(
        value
    );

}


// ==========================================================
// DOWNLOAD ENTITY
// ==========================================================

async function downloadEntity(entityName) {

    try {

        const token =
            getToken();


        const response =
            await fetch(
                `${API}/api/data-management/entities/${encodeURIComponent(
                    entityName
                )}?page=1&limit=100`,
                {
                    method: "GET",

                    headers: token
                        ? {
                            Authorization:
                                `Bearer ${token}`
                        }
                        : {}
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        }
        catch {

            data = null;

        }


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                "Unable to download data"
            );

        }


        const rows =
            data?.rows || [];


        if (!rows.length) {

            showToast(
                "No records available",
                "error"
            );

            return;

        }


        const columns =
            data.columns || [];


        let csv =
            columns
                .map(csvEscape)
                .join(",") +
            "\n";


        rows.forEach(
            row => {

                csv +=
                    columns
                        .map(
                            column =>
                                csvEscape(
                                    row[column]
                                )
                        )
                        .join(",") +
                    "\n";

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
            `${entityName}.csv`;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );


        showToast(
            "CSV export created",
            "success"
        );

    }
    catch (error) {

        console.error(
            "Download error:",
            error
        );


        showToast(
            error.message ||
            "Unable to download data",
            "error"
        );

    }

}


// ==========================================================
// CSV ESCAPE
// ==========================================================

function csvEscape(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    const stringValue =
        String(value);


    if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n") ||
        stringValue.includes("\r")
    ) {

        return `"${stringValue.replace(
            /"/g,
            '""'
        )}"`;

    }


    return stringValue;

}


// ==========================================================
// OPERATIONS
// ==========================================================

async function loadOperations() {

    try {

        const data =
            await apiFetch(
                "/api/data-management/operations"
            );


        const container =
            document.getElementById(
                "operationsList"
            );


        if (!container) {
            return;
        }


        const operations =
            data?.operations || [];


        if (!operations.length) {

            container.innerHTML = `

                <div
                    style="
                        padding:20px;
                        text-align:center;
                        color:#7d86a0;
                        font-size:9px;
                    "
                >

                    No recent data operations

                </div>

            `;


            return;

        }


        container.innerHTML =
            operations
                .map(
                    operation => `

                        <div class="operation">

                            <div class="operation-icon">

                                <i
                                    class="fa-solid fa-check"
                                ></i>

                            </div>

                            <div class="operation-message">

                                ${escapeHtml(
                                    operation.message
                                )}

                            </div>

                            <div class="operation-time">

                                ${escapeHtml(
                                    operation.created_at
                                )}

                            </div>

                        </div>

                    `
                )
                .join("");

    }
    catch (error) {

        console.error(
            "Operations:",
            error
        );

    }

}


// ==========================================================
// ADMIN PROFILE
// ==========================================================

async function loadAdminProfile() {

    try {

        console.log(
            "Loading admin profile..."
        );


        const token =
            getToken();


        console.log(
            "JWT token found:",
            token
                ? "YES"
                : "NO"
        );


        if (!token) {

            console.warn(
                "No authentication token found."
            );


            showToast(
                "Please login again",
                "error"
            );


            return;

        }


        /*
            IMPORTANT:

            apiFetch already adds API.

            CORRECT:
            "/adminprofile"

            NOT:
            `${API}/adminprofile`
        */

        const data =
            await apiFetch(
                "/adminprofile"
            );


        console.log(
            "ADMIN PROFILE RESPONSE:",
            data
        );


        /*
            Your FastAPI endpoint may return:

            {
                name: "...",
                email: "...",
                role: "..."
            }

            OR:

            {
                user: {
                    name: "...",
                    email: "...",
                    role: "..."
                }
            }

            OR:

            {
                admin: {
                    ...
                }
            }

            OR:

            {
                current_user: {
                    ...
                }
            }
        */

        const user =
            data?.user ||
            data?.admin ||
            data?.current_user ||
            data?.profile ||
            data ||
            {};


        updateHeader(
            user
        );

    }
    catch (error) {

        console.error(
            "Unable to load admin profile:",
            error
        );


        /*
            If profile fails, don't stop
            the Data Management dashboard.
        */

        updateHeader({
            name:
                "Admin User",

            email:
                "",

            role:
                "Administrator"
        });

    }

}


// ==========================================================
// UPDATE HEADER
// ==========================================================

function updateHeader(user) {

    user =
        user || {};


    const name =
        user.name ||
        user.full_name ||
        user.username ||
        user.email ||
        "Admin User";


    const email =
        user.email ||
        "";


    const role =
        user.role ||
        user.user_role ||
        "Administrator";


    console.log(
        "Updating header:",
        {
            name,
            email,
            role
        }
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


// ==========================================================
// SET TEXT
// ==========================================================

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
            value ?? "";

    }
    else {

        console.warn(
            `Element #${elementId} not found`
        );

    }

}


// ==========================================================
// OPEN ADMIN PROFILE
// ==========================================================

function openAdminProfile() {

    window.location.href =
        "/admin/profile";

}


// ==========================================================
// CLOSE MODAL
// ==========================================================

function closeModal() {

    const modal =
        document.getElementById(
            "dataModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }


    currentModalEntity =
        null;

}


// ==========================================================
// DEBOUNCE
// ==========================================================

function debounce(
    callback,
    delay
) {

    let timeout;


    return (...args) => {

        clearTimeout(
            timeout
        );


        timeout =
            setTimeout(
                () =>
                    callback(...args),
                delay
            );

    };

}


// ==========================================================
// TOAST
// ==========================================================

function showToast(
    message,
    type = "success"
) {

    const old =
        document.querySelector(
            ".toast"
        );


    if (old) {

        old.remove();

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast ${type}`;


    toast.textContent =
        message;


    Object.assign(
        toast.style,
        {
            position: "fixed",

            right: "25px",

            bottom: "25px",

            padding: "12px 16px",

            borderRadius: "8px",

            background:
                type === "error"
                    ? "#ef4444"
                    : "#16a56b",

            color: "white",

            fontSize: "12px",

            fontWeight: "600",

            zIndex: "9999",

            boxShadow:
                "0 10px 30px rgba(0,0,0,.15)"
        }
    );


    document.body.appendChild(
        toast
    );


    setTimeout(
        () => {

            if (toast.parentNode) {

                toast.remove();

            }

        },
        3000
    );

}


// ==========================================================
// INITIALIZE PAGE
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "VendorIQ Data Management initialized"
        );


        /*
            IMPORTANT:

            The callback is now async,
            so await works correctly.
        */

        await loadAdminProfile();


        await loadDashboard();


        // ==================================================
        // REFRESH
        // ==================================================

        const refreshBtn =
            document.getElementById(
                "refreshBtn"
            );


        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                async () => {

                    refreshBtn.disabled =
                        true;


                    try {

                        await loadDashboard();

                    }
                    finally {

                        refreshBtn.disabled =
                            false;

                    }

                }
            );

        }


        // ==================================================
        // ENTITY SEARCH
        // ==================================================

        const entitySearch =
            document.getElementById(
                "entitySearch"
            );


        if (entitySearch) {

            entitySearch.addEventListener(
                "input",
                event => {

                    searchEntities(
                        event.target.value
                    );

                }
            );

        }


        // ==================================================
        // PREVIOUS PAGE
        // ==================================================

        const previousPage =
            document.getElementById(
                "previousPage"
            );


        if (previousPage) {

            previousPage.addEventListener(
                "click",
                () => {

                    if (
                        currentPage > 1
                    ) {

                        currentPage--;

                        renderEntities();

                    }

                }
            );

        }


        // ==================================================
        // NEXT PAGE
        // ==================================================

        const nextPage =
            document.getElementById(
                "nextPage"
            );


        if (nextPage) {

            nextPage.addEventListener(
                "click",
                () => {

                    const totalPages =
                        Math.ceil(
                            filteredEntities.length /
                            entitiesPerPage
                        );


                    if (
                        currentPage <
                        totalPages
                    ) {

                        currentPage++;

                        renderEntities();

                    }

                }
            );

        }


        // ==================================================
        // PAGE ONE
        // ==================================================

        const pageOne =
            document.getElementById(
                "pageOne"
            );


        if (pageOne) {

            pageOne.addEventListener(
                "click",
                () => {

                    currentPage = 1;

                    renderEntities();

                }
            );

        }


        // ==================================================
        // PAGE TWO
        // ==================================================

        const pageTwo =
            document.getElementById(
                "pageTwo"
            );


        if (pageTwo) {

            pageTwo.addEventListener(
                "click",
                () => {

                    if (
                        filteredEntities.length >
                        entitiesPerPage
                    ) {

                        currentPage = 2;

                        renderEntities();

                    }

                }
            );

        }


        // ==================================================
        // MODAL CLOSE
        // ==================================================

        const modalClose =
            document.getElementById(
                "modalClose"
            );


        if (modalClose) {

            modalClose.addEventListener(
                "click",
                closeModal
            );

        }


        // ==================================================
        // MODAL BACKDROP
        // ==================================================

        const dataModal =
            document.getElementById(
                "dataModal"
            );


        if (dataModal) {

            dataModal.addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "dataModal"
                    ) {

                        closeModal();

                    }

                }
            );

        }


        // ==================================================
        // MODAL SEARCH
        // ==================================================

        const modalSearch =
            document.getElementById(
                "modalSearch"
            );


        if (modalSearch) {

            modalSearch.addEventListener(
                "input",
                debounce(
                    loadEntityRecords,
                    350
                )
            );

        }

    }
);


// ==========================================================
// ESC KEY
// ==========================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeModal();

        }

    }
);