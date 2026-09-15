/* ==========================================================
   VENDORIQ
   ADMIN FEEDBACK JAVASCRIPT
========================================================== */

 
/* ==========================================================
   API
========================================================== */

const API = "http://127.0.0.1:8000";


/* ==========================================================
   STATE
========================================================== */

let currentPage = 1;

let pageLimit = 10;

let totalPages = 1;

let totalFeedback = 0;

let currentFeedbackId = null;

let searchTimer = null;


/* ==========================================================
   DOM
========================================================== */

const searchInput =
    document.getElementById("searchInput");

const ratingFilter =
    document.getElementById("ratingFilter");

const categoryFilter =
    document.getElementById("categoryFilter");

const statusFilter =
    document.getElementById("statusFilter");

const feedbackTableBody =
    document.getElementById("feedbackTableBody");

const paginationInfo =
    document.getElementById("paginationInfo");

const pageNumber =
    document.getElementById("pageNumber");

const previousPage =
    document.getElementById("previousPage");

const nextPage =
    document.getElementById("nextPage");

const feedbackModal =
    document.getElementById("feedbackModal");


/* ==========================================================
   TOKEN
========================================================== */

function getToken() {

    const possibleKeys = [
        "access_token",
        "token",
        "jwt_token",
        "auth_token",
        "accessToken",
        "jwtToken"
    ];

    for (const key of possibleKeys) {

        const value =
            sessionStorage.getItem(key);

        if (
            value &&
            value.trim()
        ) {

            return value.trim();

        }

    }

    return null;

}


/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(endpoint, options = {}) {

    const token = getToken();

    if (!token) {
        showToast(
            "Please login again. Authentication token is missing.",
            "error"
        );
        throw new Error("Authentication token missing");
    }

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        "Authorization": `Bearer ${token}`
    };

    const response = await fetch(
        `${API}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    const contentType =
        response.headers.get("content-type");

    let data = null;

    if (
        contentType &&
        contentType.includes("application/json")
    ) {
        data = await response.json();
    }

    if (response.status === 401) {

        console.error("Authentication failed:", data);

        localStorage.removeItem("access_token");

        showToast(
            "Session expired. Please login again.",
            "error"
        );

        throw new Error("Unauthorized");
    }

    if (response.status === 403) {

        showToast(
            "You do not have permission to access Feedback.",
            "error"
        );

        throw new Error("Forbidden");
    }

    if (!response.ok) {

        throw new Error(
            data?.detail ||
            data?.message ||
            `Request failed (${response.status})`
        );
    }

    return data;
}


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

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
   INITIALIZATION
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEventListeners();

        await loadStatistics();

        await loadFeedback();

        await loadAdminProfile();

    }
);


/* ==========================================================
   EVENT LISTENERS
========================================================== */

function setupEventListeners() {


    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );

            searchTimer = setTimeout(
                () => {

                    currentPage = 1;

                    loadFeedback();

                },
                350
            );

        }
    );


    ratingFilter.addEventListener(
        "change",
        () => {

            currentPage = 1;

            loadFeedback();

        }
    );


    categoryFilter.addEventListener(
        "change",
        () => {

            currentPage = 1;

            loadFeedback();

        }
    );


    statusFilter.addEventListener(
        "change",
        () => {

            currentPage = 1;

            loadFeedback();

        }
    );


    document
        .getElementById("clearFilters")
        .addEventListener(
            "click",
            clearFilters
        );


    previousPage.addEventListener(
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                loadFeedback();

            }

        }
    );


    nextPage.addEventListener(
        "click",
        () => {

            if (
                currentPage < totalPages
            ) {

                currentPage++;

                loadFeedback();

            }

        }
    );


    document
        .getElementById("refreshButton")
        .addEventListener(
            "click",
            refreshDashboard
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
        .getElementById("saveFeedback")
        .addEventListener(
            "click",
            saveFeedback
        );


    document
        .getElementById("deleteFeedback")
        .addEventListener(
            "click",
            deleteCurrentFeedback
        );


    feedbackModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                feedbackModal
            ) {

                closeModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeModal();

            }

        }
    );

}


/* ==========================================================
   LOAD STATISTICS
========================================================== */

async function loadStatistics() {

    try {

        const data =
            await apiFetch(
                "/api/feedback/statistics"
            );


        document.getElementById(
            "totalFeedback"
        ).textContent =
            data.total_feedback ?? 0;


        document.getElementById(
            "averageRating"
        ).textContent =
            Number(
                data.average_rating ?? 0
            ).toFixed(1);


        document.getElementById(
            "positiveFeedback"
        ).textContent =
            data.positive_feedback ?? 0;


        document.getElementById(
            "pendingFeedback"
        ).textContent =
            data.pending_feedback ?? 0;

    }

    catch (error) {

        console.error(
            "Statistics error:",
            error
        );

        document.getElementById(
            "totalFeedback"
        ).textContent = "0";

        document.getElementById(
            "averageRating"
        ).textContent = "0.0";

        document.getElementById(
            "positiveFeedback"
        ).textContent = "0";

        document.getElementById(
            "pendingFeedback"
        ).textContent = "0";

    }

}


/* ==========================================================
   LOAD FEEDBACK
========================================================== */

async function loadFeedback() {

    feedbackTableBody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="loading-cell"
            >

                <i class="fa-solid fa-spinner fa-spin"></i>

                Loading feedback...

            </td>

        </tr>

    `;


    try {

        const params =
            new URLSearchParams();


        const search =
            searchInput.value.trim();


        if (search) {

            params.set(
                "search",
                search
            );

        }


        const rating =
            ratingFilter.value;


        if (
            rating &&
            rating !== "All"
        ) {

            params.set(
                "rating",
                rating
            );

        }


        const category =
            categoryFilter.value;


        if (
            category &&
            category !== "All"
        ) {

            params.set(
                "category",
                category
            );

        }


        const feedbackStatus =
            statusFilter.value;


        if (
            feedbackStatus &&
            feedbackStatus !== "All"
        ) {

            params.set(
                "status",
                feedbackStatus
            );

        }


        params.set(
            "page",
            currentPage
        );


        params.set(
            "limit",
            pageLimit
        );


        const data =
            await apiFetch(
                `/api/feedback?${params.toString()}`
            );


        totalFeedback =
            data.total ?? 0;


        totalPages =
            data.total_pages ?? 1;


        currentPage =
            data.page ?? currentPage;


        renderFeedback(
            data.items || []
        );


        updatePagination(
            data
        );

    }

    catch (error) {

        console.error(
            "Unable to load feedback:",
            error
        );


        feedbackTableBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="empty-cell"
                >

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    Unable to load feedback.

                </td>

            </tr>

        `;

        showToast(
            error.message ||
            "Unable to load feedback.",
            "error"
        );

    }

}


/* ==========================================================
   RENDER FEEDBACK
========================================================== */

function renderFeedback(items) {

    if (!items.length) {

        feedbackTableBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="empty-cell"
                >

                    <i class="fa-regular fa-comment-dots"></i>

                    <br><br>

                    No feedback found.

                </td>

            </tr>

        `;

        return;

    }


    feedbackTableBody.innerHTML =
        items.map(
            createFeedbackRow
        ).join("");

}


/* ==========================================================
   CREATE ROW
========================================================== */

function createFeedbackRow(
    feedback
) {

    const user =
        feedback.user || {};


    const name =
        user.name ||
        "Unknown User";


    const email =
        user.email ||
        "";


    const initial =
        getInitial(
            name
        );


    const stars =
        createStars(
            feedback.rating
        );


    const statusClass =
        String(
            feedback.status ||
            "Pending"
        )
        .toLowerCase();


    const date =
        formatDate(
            feedback.created_at
        );


    return `

        <tr>

            <td>

                <div class="user-cell">

                    <div class="user-cell-avatar">

                        ${escapeHtml(initial)}

                    </div>

                    <div class="user-cell-info">

                        <strong>
                            ${escapeHtml(name)}
                        </strong>

                        <span>
                            ${escapeHtml(email)}
                        </span>

                    </div>

                </div>

            </td>


            <td>

                <div class="rating">

                    ${stars}

                    <span class="rating-number">
                        ${feedback.rating}/5
                    </span>

                </div>

            </td>


            <td>

                <span class="category-badge">

                    ${escapeHtml(
                        feedback.category
                    )}

                </span>

            </td>


            <td>

                <div class="subject-cell">

                    ${escapeHtml(
                        feedback.subject
                    )}

                </div>

            </td>


            <td>

                <div
                    class="message-cell"
                    title="${escapeHtml(
                        feedback.message
                    )}"
                >

                    ${escapeHtml(
                        feedback.message
                    )}

                </div>

            </td>


            <td>

                <div class="date-cell">

                    ${date}

                </div>

            </td>


            <td>

                <span
                    class="status ${statusClass}"
                >

                    ${escapeHtml(
                        feedback.status
                    )}

                </span>

            </td>


            <td>

                <div class="action-buttons">

                    <button
                        class="action-button"
                        title="View"
                        onclick="openFeedback(${feedback.id})"
                    >

                        <i class="fa-regular fa-eye"></i>

                    </button>


                    <button
                        class="action-button delete"
                        title="Delete"
                        onclick="deleteFeedback(${feedback.id})"
                    >

                        <i class="fa-regular fa-trash-can"></i>

                    </button>

                </div>

            </td>

        </tr>

    `;

}


/* ==========================================================
   CREATE STARS
========================================================== */

function createStars(
    rating
) {

    let html = "";

    const numericRating =
        Number(rating) || 0;


    for (
        let i = 1;
        i <= 5;
        i++
    ) {

        if (
            i <= numericRating
        ) {

            html +=
                `<i class="fa-solid fa-star"></i>`;

        }

        else {

            html +=
                `<i class="fa-regular fa-star"></i>`;

        }

    }


    return html;

}


/* ==========================================================
   OPEN FEEDBACK
========================================================== */

async function openFeedback(
    feedbackId
) {

    currentFeedbackId =
        feedbackId;


    try {

        const feedback =
            await apiFetch(
                `/api/feedback/${feedbackId}`
            );


        populateModal(
            feedback
        );


        feedbackModal.classList.add(
            "show"
        );

    }

    catch (error) {

        console.error(
            "Feedback details error:",
            error
        );

        showToast(
            error.message ||
            "Unable to load feedback.",
            "error"
        );

    }

}


/* ==========================================================
   POPULATE MODAL
========================================================== */

function populateModal(
    feedback
) {

    const user =
        feedback.user || {};


    const name =
        user.name ||
        "Unknown User";


    const email =
        user.email ||
        "No email";


    const role =
        user.role ||
        "User";


    document.getElementById(
        "modalFeedbackId"
    ).textContent =
        `Feedback #${feedback.id}`;


    document.getElementById(
        "modalUserAvatar"
    ).textContent =
        getInitial(name);


    document.getElementById(
        "modalUserName"
    ).textContent =
        name;


    document.getElementById(
        "modalUserEmail"
    ).textContent =
        email;


    document.getElementById(
        "modalUserRole"
    ).textContent =
        role;


    document.getElementById(
        "modalRating"
    ).innerHTML =
        createStars(
            feedback.rating
        );


    document.getElementById(
        "modalCategory"
    ).textContent =
        feedback.category || "-";


    document.getElementById(
        "modalDate"
    ).textContent =
        formatDate(
            feedback.created_at
        );


    document.getElementById(
        "modalStatus"
    ).value =
        feedback.status || "Pending";


    document.getElementById(
        "modalSubject"
    ).textContent =
        feedback.subject || "-";


    document.getElementById(
        "modalMessage"
    ).textContent =
        feedback.message || "-";


    document.getElementById(
        "adminResponse"
    ).value =
        feedback.admin_response || "";

}


/* ==========================================================
   CLOSE MODAL
========================================================== */

function closeModal() {

    feedbackModal.classList.remove(
        "show"
    );

    currentFeedbackId = null;

}


/* ==========================================================
   SAVE FEEDBACK
========================================================== */

async function saveFeedback() {

    if (!currentFeedbackId) {

        return;

    }


    const saveButton =
        document.getElementById(
            "saveFeedback"
        );


    const status =
        document.getElementById(
            "modalStatus"
        ).value;


    const response =
        document.getElementById(
            "adminResponse"
        ).value.trim();


    saveButton.disabled = true;

    saveButton.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Saving...

    `;


    try {

        /* ----------------------------------------------
           UPDATE STATUS
        ---------------------------------------------- */

        await apiFetch(
            `/api/feedback/${currentFeedbackId}/status`,
            {
                method: "PUT",

                body: JSON.stringify({
                    status: status
                })
            }
        );


        /* ----------------------------------------------
           UPDATE RESPONSE
        ---------------------------------------------- */

        if (response) {

            await apiFetch(
                `/api/feedback/${currentFeedbackId}/response`,
                {
                    method: "POST",

                    body: JSON.stringify({
                        response: response
                    })
                }
            );

        }


        showToast(
            "Feedback updated successfully.",
            "success"
        );


        closeModal();


        await loadStatistics();

        await loadFeedback();

    }

    catch (error) {

        console.error(
            "Save feedback error:",
            error
        );

        showToast(
            error.message ||
            "Unable to save feedback.",
            "error"
        );

    }

    finally {

        saveButton.disabled = false;

        saveButton.innerHTML = `

            <i class="fa-solid fa-check"></i>

            Save Changes

        `;

    }

}


/* ==========================================================
   DELETE CURRENT FEEDBACK
========================================================== */

async function deleteCurrentFeedback() {

    if (!currentFeedbackId) {

        return;

    }


    await deleteFeedback(
        currentFeedbackId,
        true
    );

}


/* ==========================================================
   DELETE FEEDBACK
========================================================== */

async function deleteFeedback(
    feedbackId,
    closeAfter = false
) {

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this feedback?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await apiFetch(
            `/api/feedback/${feedbackId}`,
            {
                method: "DELETE"
            }
        );


        showToast(
            "Feedback deleted successfully.",
            "success"
        );


        if (
            closeAfter
        ) {

            closeModal();

        }


        await loadStatistics();

        await loadFeedback();

    }

    catch (error) {

        console.error(
            "Delete feedback error:",
            error
        );

        showToast(
            error.message ||
            "Unable to delete feedback.",
            "error"
        );

    }

}


/* ==========================================================
   CLEAR FILTERS
========================================================== */

function clearFilters() {

    searchInput.value = "";

    ratingFilter.value = "All";

    categoryFilter.value = "All";

    statusFilter.value = "All";

    currentPage = 1;

    loadFeedback();

}


/* ==========================================================
   PAGINATION
========================================================== */

function updatePagination(
    data
) {

    const total =
        data.total || 0;


    const page =
        data.page || 1;


    const limit =
        data.limit || pageLimit;


    const start =
        total === 0
            ? 0
            : ((page - 1) * limit) + 1;


    const end =
        Math.min(
            page * limit,
            total
        );


    paginationInfo.textContent =
        `Showing ${start}-${end} of ${total}`;


    pageNumber.textContent =
        page;


    previousPage.disabled =
        page <= 1;


    nextPage.disabled =
        page >= (
            data.total_pages || 1
        );

}


/* ==========================================================
   REFRESH
========================================================== */

async function refreshDashboard() {

    const button =
        document.getElementById(
            "refreshButton"
        );


    button.disabled = true;

    button.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i>`;


    try {

        await Promise.all([
            loadStatistics(),
            loadFeedback()
        ]);


        showToast(
            "Feedback refreshed.",
            "success"
        );

    }

    finally {

        button.disabled = false;

        button.innerHTML =
            `<i class="fa-solid fa-rotate"></i>`;

    }

}


/* ==========================================================
   DATE FORMAT
========================================================== */

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


/* ==========================================================
   INITIAL
========================================================== */

function getInitial(
    name
) {

    if (!name) {

        return "U";

    }


    return String(name)
        .trim()
        .charAt(0)
        .toUpperCase();

}


/* ==========================================================
   TOAST
========================================================== */

let toastTimer = null;


function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    const toastIcon =
        document.getElementById(
            "toastIcon"
        );


    toastMessage.textContent =
        message;


    toast.classList.remove(
        "success",
        "error"
    );


    toast.classList.add(
        type
    );


    if (
        type === "error"
    ) {

        toastIcon.className =
            "fa-solid fa-circle-exclamation";

    }

    else {

        toastIcon.className =
            "fa-solid fa-circle-check";

    }


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer = setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );

}


/* ==========================================================
   GLOBAL FUNCTIONS
========================================================== */

window.openFeedback =
    openFeedback;

window.deleteFeedback =
    deleteFeedback;


function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {

        element.textContent =
            value ?? "";

    }
}


function openAdminProfile() {

    window.location.href =
        "/admin/profile";

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

        const data = await apiFetch(
            "/adminprofile"
        );

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