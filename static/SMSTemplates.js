/* ==========================================================
   VENDORIQ
   SMS TEMPLATES MODULE
   ========================================================== */

const API = "http://127.0.0.1:8000";

let smsTemplates = [];

let editingSMSId = null;
let deletingSMSId = null;
let isSaving = false;


/* ==========================================================
   GET JWT TOKEN
   ========================================================== */

function getToken() {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        sessionStorage.getItem("accessToken") ||
        "";

    console.log(
        "JWT token found:",
        token ? "YES" : "NO"
    );

    return token;
}


/* ==========================================================
   API FETCH
   ========================================================== */

async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        "Accept": "application/json"
    };


    /*
     * Add Content-Type only when sending JSON
     */

    if (options.body) {

        headers["Content-Type"] =
            "application/json";
    }


    /*
     * IMPORTANT:
     * Send JWT exactly as:
     *
     * Authorization: Bearer <token>
     */

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

    } else {

        console.error(
            "No JWT token available."
        );

    }


    console.log(
        "API REQUEST:",
        url
    );

    console.log(
        "Authorization:",
        token
            ? "Bearer <TOKEN PRESENT>"
            : "MISSING"
    );


    let response;


    try {

        response = await fetch(
            url,
            {
                ...options,
                headers
            }
        );

    } catch (error) {

        console.error(
            "Network error:",
            error
        );

        throw new Error(
            "Unable to connect to FastAPI server."
        );

    }


    console.log(
        "API STATUS:",
        response.status
    );


    /* ======================================================
       401
    ====================================================== */

    if (response.status === 401) {

        let errorData = {};

        try {

            errorData =
                await response.json();

        } catch {

            errorData = {};

        }


        console.error(
            "AUTHENTICATION ERROR:",
            errorData
        );


        /*
         * Clear potentially expired token
         */

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "jwt_token"
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
            "jwt_token"
        );

        sessionStorage.removeItem(
            "accessToken"
        );


        throw new Error(
            errorData.detail ||
            "Could not validate credentials. Please log in again."
        );

    }


    /* ======================================================
       OTHER ERRORS
    ====================================================== */

    if (!response.ok) {

        let errorData = {};

        try {

            errorData =
                await response.json();

        } catch {

            errorData = {};

        }


        console.error(
            "API ERROR:",
            errorData
        );


        let detail =
            errorData.detail ||
            `HTTP ${response.status}`;


        if (Array.isArray(detail)) {

            detail =
                detail
                    .map(
                        item =>
                            item.msg ||
                            JSON.stringify(item)
                    )
                    .join(", ");

        }


        throw new Error(detail);

    }


    return response;
}


/* ==========================================================
   PAGE INITIALIZATION
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeSMSPage();

    }
);


/* ==========================================================
   INITIALIZE
   ========================================================== */

function initializeSMSPage() {

    document
        .getElementById("newTemplateBtn")
        ?.addEventListener(
            "click",
            openNewSMS
        );


    document
        .getElementById("emptyCreateBtn")
        ?.addEventListener(
            "click",
            openNewSMS
        );


    document
        .getElementById("closeModalBtn")
        ?.addEventListener(
            "click",
            closeSMSModal
        );


    document
        .getElementById("cancelBtn")
        ?.addEventListener(
            "click",
            closeSMSModal
        );


    document
        .getElementById("templateForm")
        ?.addEventListener(
            "submit",
            saveSMS
        );


    document
        .getElementById("searchInput")
        ?.addEventListener(
            "input",
            filterSMS
        );


    document
        .getElementById("statusFilter")
        ?.addEventListener(
            "change",
            filterSMS
        );


    document
        .getElementById("cancelDeleteBtn")
        ?.addEventListener(
            "click",
            closeDeleteModal
        );


    document
        .getElementById("confirmDeleteBtn")
        ?.addEventListener(
            "click",
            confirmDelete
        );


    loadSMS();

}


/* ==========================================================
   LOAD SMS TEMPLATES
   ========================================================== */

async function loadSMS() {

    showLoading(true);


    try {

        const response =
            await apiFetch(
                `${API}/api/notifications/sms-templates`,
                {
                    method: "GET"
                }
            );


        const data =
            await response.json();


        console.log(
            "SMS API RESPONSE:",
            data
        );


        /*
         * Supports:
         *
         * [
         *   {...}
         * ]
         *
         * OR
         *
         * {
         *   templates: [...]
         * }
         */

        smsTemplates =
            Array.isArray(data)
                ? data
                : (
                    data.templates ||
                    data.data ||
                    []
                );


        renderSMS();


    } catch (error) {

        console.error(
            "Unable to load SMS templates:",
            error
        );


        showToast(
            error.message ||
            "Unable to load SMS templates.",
            "error"
        );


    } finally {

        showLoading(false);

    }

}


/* ==========================================================
   RENDER SMS
   ========================================================== */

function renderSMS() {
    const tbody = document.getElementById("smsTable");

    if (!tbody) {
        console.error("Missing #smsTable in HTML");
        return;
    }

    tbody.innerHTML = "";

    const filtered = getFilteredSMS();

    filtered.forEach(template => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHtml(template.template_name || "-")}</td>
            <td>${escapeHtml(template.message || template.body || "-")}</td>
            <td>${escapeHtml(template.status || "Active")}</td>
            <td class="actions-cell">
                <button class="edit"
                        onclick="openEditSMS(${template.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="delete"
                        onclick="openDeleteModal(${template.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}


/* ==========================================================
   FILTER
   ========================================================== */

function getFilteredSMS() {

    const search =
        (
            document
                .getElementById(
                    "searchInput"
                )
                ?.value ||
            ""
        )
        .toLowerCase()
        .trim();


    const status =
        document
            .getElementById(
                "statusFilter"
            )
            ?.value ||
        "all";


    return smsTemplates.filter(
        template => {

            const name =
                (
                    template.template_name ||
                    ""
                ).toLowerCase();


            const message =
                (
                    template.message ||
                    template.body ||
                    ""
                ).toLowerCase();


            const searchMatch =
                !search ||
                name.includes(search) ||
                message.includes(search);


            const statusMatch =
                status === "all" ||
                template.status === status;


            return (
                searchMatch &&
                statusMatch
            );

        }
    );

}


function filterSMS() {

    renderSMS();

}


/* ==========================================================
   NEW SMS
   ========================================================== */

function openSMSModal() {
    openNewSMS();
}


function openNewSMS() {

    editingSMSId = null;

    const modal =
        document.getElementById("templateModal");

    if (!modal) {
        console.error(
            "ERROR: #templateModal was not found in SMSTemplates.html"
        );
        return;
    }

    const modalTitle =
        document.getElementById("modalTitle");

    if (modalTitle) {
        modalTitle.textContent =
            "Create SMS Template";
    }

    const form =
        document.getElementById("templateForm");

    if (form) {
        form.reset();
    }

    const status =
        document.getElementById("templateStatus");

    if (status) {
        status.value = "Active";
    }

    modal.classList.add("show");
}


function closeSMSModal() {

    const modal =
        document.getElementById("templateModal");

    if (modal) {
        modal.classList.remove("show");
    }

    editingSMSId = null;
}


/* ==========================================================
   EDIT SMS
   ========================================================== */

function openEditSMS(id) {

    const template =
        smsTemplates.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!template) {

        showToast(
            "SMS template not found.",
            "error"
        );

        return;

    }


    editingSMSId =
        template.id;


    document
        .getElementById(
            "modalTitle"
        )
        .textContent =
        "Edit SMS Template";


    document
        .getElementById(
            "templateName"
        )
        .value =
        template.template_name ||
        "";


    document
        .getElementById(
            "templateBody"
        )
        .value =
        template.message ||
        template.body ||
        "";


    document
        .getElementById(
            "templateStatus"
        )
        .value =
        template.status ||
        "Active";


    document
        .getElementById(
            "templateModal"
        )
        .classList.add(
            "show"
        );

}


/* ==========================================================
   CLOSE MODAL
   ========================================================== */

function closeSMSModal() {

    document
        .getElementById(
            "templateModal"
        )
        ?.classList.remove(
            "show"
        );


    editingSMSId = null;

}


/* ==========================================================
   SAVE SMS
   ========================================================== */

async function saveSMS(event) {

    event.preventDefault();


    if (isSaving) {

        return;

    }


    const templateName =
        document
            .getElementById(
                "templateName"
            )
            .value
            .trim();


    const message =
        document
            .getElementById(
                "templateBody"
            )
            .value
            .trim();


    const status =
        document
            .getElementById(
                "templateStatus"
            )
            .value;


    if (!templateName) {

        showToast(
            "Template name is required.",
            "error"
        );

        return;

    }


    if (!message) {

        showToast(
            "SMS message is required.",
            "error"
        );

        return;

    }


    const payload = {

        template_name:
            templateName,

        message:
            message,

        status:
            status

    };


    isSaving = true;


    try {

        let url =
            `${API}/api/notifications/sms-templates`;


        let method =
            "POST";


        if (editingSMSId) {

            url +=
                `/${editingSMSId}`;

            method =
                "PUT";

        }


        const response =
            await apiFetch(
                url,
                {
                    method: method,

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const saved =
            await response.json();


        if (editingSMSId) {

            const index =
                smsTemplates.findIndex(
                    item =>
                        Number(item.id) ===
                        Number(editingSMSId)
                );


            if (index !== -1) {

                smsTemplates[index] =
                    saved;

            }


            showToast(
                "SMS template updated successfully.",
                "success"
            );

        } else {

            smsTemplates.unshift(
                saved
            );


            showToast(
                "SMS template created successfully.",
                "success"
            );

        }


        closeSMSModal();

        renderSMS();


    } catch (error) {

        console.error(
            "Unable to save SMS template:",
            error
        );


        showToast(
            error.message,
            "error"
        );

    } finally {

        isSaving = false;

    }

}


/* ==========================================================
   DELETE
   ========================================================== */

function openDeleteModal(id) {

    deletingSMSId =
        id;


    document
        .getElementById(
            "deleteModal"
        )
        ?.classList.add(
            "show"
        );

}


function closeDeleteModal() {

    document
        .getElementById(
            "deleteModal"
        )
        ?.classList.remove(
            "show"
        );


    deletingSMSId = null;

}


async function confirmDelete() {

    if (!deletingSMSId) {

        return;

    }


    try {

        await apiFetch(
            `${API}/api/notifications/sms-templates/${deletingSMSId}`,
            {
                method: "DELETE"
            }
        );


        smsTemplates =
            smsTemplates.filter(
                item =>
                    Number(item.id) !==
                    Number(deletingSMSId)
            );


        closeDeleteModal();

        renderSMS();


        showToast(
            "SMS template deleted successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Unable to delete SMS template:",
            error
        );


        showToast(
            error.message,
            "error"
        );

    }

}


/* ==========================================================
   LOADING
   ========================================================== */

function showLoading(loading) {

    const element =
        document.getElementById(
            "loadingState"
        );


    if (!element) {

        return;

    }


    element.style.display =
        loading
            ? "flex"
            : "none";

}


/* ==========================================================
   DATE
   ========================================================== */

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
   HTML ESCAPE
   ========================================================== */

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


/* ==========================================================
   TOAST
   ========================================================== */

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        return;

    }


    toast.textContent =
        message;


    toast.className =
        `toast ${type} show`;


    clearTimeout(
        window.toastTimer
    );


    window.toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );

}


/* ==========================================================
   NOTIFICATIONS DROPDOWN
========================================================== */

function toggleNotificationMenu(event) {

    event.stopPropagation();

    const menu =
        document.querySelector(
            ".notification-menu"
        );

    if (!menu) {
        return;
    }

    menu.classList.toggle("open");
}


/* ==========================================================
   KEEP NOTIFICATION MENU OPEN
========================================================== */

function initializeNotificationDropdown() {

    const currentPath =
        window.location.pathname.toLowerCase();


    const notificationPages = [
        "/notifications",
        "/notificationsettings",
        "/emailtemplates",
        "/smstemplates",
        "/notificationlogs"
    ];


    const isNotificationPage =
        notificationPages.includes(
            currentPath
        );


    const menu =
        document.querySelector(
            ".notification-menu"
        );


    if (
        menu &&
        isNotificationPage
    ) {

        menu.classList.add(
            "open"
        );

    }


    /* Highlight current submenu */

    const submenuLinks =
        document.querySelectorAll(
            ".notification-submenu-item"
        );


    submenuLinks.forEach(
        link => {

            const linkPath =
                new URL(
                    link.href,
                    window.location.origin
                ).pathname
                .toLowerCase();


            if (
                linkPath ===
                currentPath
            ) {

                link.classList.add(
                    "active"
                );

            }

        }
    );

}


/* ==========================================================
   INITIALIZE DROPDOWN
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeNotificationDropdown
);


/* ==========================================================
   GLOBAL DROPDOWN FUNCTION
========================================================== */

window.toggleNotificationMenu =
    toggleNotificationMenu;


function openSMSModal() {
    openNewSMS();
}


/* ==========================================================
   GLOBAL FUNCTIONS
   ========================================================== */

window.openSMSModal = 
    openSMSModal;

window.openNewSMS =
    openNewSMS;

window.openEditSMS =
    openEditSMS;

window.openDeleteModal =
    openDeleteModal;

window.closeSMSModal = 
    closeSMSModal;

window.closeDeleteModal =
    closeDeleteModal;

window.confirmDelete =
    confirmDelete;

window.loadSMS =
    loadSMS;