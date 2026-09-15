/* ==========================================================
   VENDORIQ
   EMAIL TEMPLATES MODULE
   ========================================================== */

const API = "http://127.0.0.1:8000";


let templates = [];

let editingTemplateId = null;

let deletingTemplateId = null;

let isSaving = false;


/* ==========================================================
   TOKEN
   ========================================================== */

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


/* ==========================================================
   API FETCH
   ========================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();


    const headers = {

        "Accept": "application/json",

        ...(options.body
            ? {
                "Content-Type":
                    "application/json"
            }
            : {}),

        ...(options.headers || {})

    };


    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

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

        response =
            await fetch(
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


    if (!response.ok) {

        let errorData;


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


        if (
            response.status === 401
        ) {

            throw new Error(
                "Could not validate credentials. Please log in again."
            );

        }


        if (
            response.status === 403
        ) {

            throw new Error(
                "You do not have permission to perform this action."
            );

        }


        if (
            response.status === 404
        ) {

            throw new Error(
                "Email template API endpoint was not found."
            );

        }


        if (
            response.status === 422
        ) {

            let detail =
                errorData.detail ||
                "Invalid request data.";


            if (
                Array.isArray(detail)
            ) {

                detail =
                    detail
                        .map(
                            item =>
                                item.msg ||
                                JSON.stringify(item)
                        )
                        .join(", ");

            }


            throw new Error(
                detail
            );

        }


        throw new Error(
            errorData.detail ||
            `HTTP ${response.status}`
        );

    }


    return response;

}


/* ==========================================================
   DOM READY
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializePage();

    }
);


/* ==========================================================
   INITIALIZE
   ========================================================== */

function initializePage() {

    document
        .getElementById(
            "newTemplateBtn"
        )
        ?.addEventListener(
            "click",
            openNewTemplate
        );


    document
        .getElementById(
            "emptyCreateBtn"
        )
        ?.addEventListener(
            "click",
            openNewTemplate
        );


    document
        .getElementById(
            "closeModalBtn"
        )
        ?.addEventListener(
            "click",
            closeTemplateModal
        );


    document
        .getElementById(
            "cancelBtn"
        )
        ?.addEventListener(
            "click",
            closeTemplateModal
        );


    document
        .getElementById(
            "templateForm"
        )
        ?.addEventListener(
            "submit",
            saveTemplate
        );


    document
        .getElementById(
            "cancelDeleteBtn"
        )
        ?.addEventListener(
            "click",
            closeDeleteModal
        );


    document
        .getElementById(
            "confirmDeleteBtn"
        )
        ?.addEventListener(
            "click",
            confirmDelete
        );


    document
        .getElementById(
            "searchInput"
        )
        ?.addEventListener(
            "input",
            filterTemplates
        );


    document
        .getElementById(
            "statusFilter"
        )
        ?.addEventListener(
            "change",
            filterTemplates
        );


    document
        .getElementById(
            "templateModal"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "templateModal"
                ) {

                    closeTemplateModal();

                }

            }
        );


    document
        .getElementById(
            "deleteModal"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "deleteModal"
                ) {

                    closeDeleteModal();

                }

            }
        );


    loadTemplates();

}


/* ==========================================================
   LOAD TEMPLATES
   ========================================================== */

async function loadTemplates() {

    showLoading(true);


    try {

        const response =
            await apiFetch(
                `${API}/api/notifications/email-templates`,
                {
                    method: "GET"
                }
            );


        const data =
            await response.json();


        /*
         * Supports either:
         *
         * [...]
         *
         * or:
         *
         * {
         *    templates: [...]
         * }
         */

        templates =
            Array.isArray(data)
                ? data
                : (
                    data.templates ||
                    data.data ||
                    []
                );


        console.log(
            "Email templates:",
            templates
        );


        renderTemplates();


    } catch (error) {

        console.error(
            "Unable to load email templates:",
            error
        );


        showToast(
            error.message ||
            "Unable to load email templates.",
            "error"
        );


        templates = [];

        renderTemplates();

    } finally {

        showLoading(false);

    }

}


/* ==========================================================
   RENDER
   ========================================================== */

function renderTemplates() {

    const tbody =
        document.getElementById(
            "templatesTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    const filtered =
        getFilteredTemplates();


    if (
        templates.length === 0
    ) {

        document
            .getElementById(
                "templatesCard"
            )
            .style.display = "none";


        document
            .getElementById(
                "emptyState"
            )
            .style.display = "flex";


        return;

    }


    if (
        filtered.length === 0
    ) {

        document
            .getElementById(
                "templatesCard"
            )
            .style.display = "none";


        document
            .getElementById(
                "emptyState"
            )
            .style.display = "flex";


        document
            .querySelector(
                "#emptyState h2"
            ).textContent =
            "No matching templates found";


        document
            .querySelector(
                "#emptyState p"
            ).textContent =
            "Try changing your search or status filter.";


        return;

    }


    document
        .getElementById(
            "emptyState"
        )
        .style.display = "none";


    document
        .getElementById(
            "templatesCard"
        )
        .style.display = "block";


    filtered.forEach(
        template => {

            const row =
                document.createElement(
                    "tr"
                );


            const status =
                template.status ||
                "Active";


            const statusClass =
                status === "Active"
                    ? "status-active"
                    : "status-inactive";


            row.innerHTML = `

                <td>
                    <div class="template-name">
                        ${escapeHtml(
                            template.template_name ||
                            "-"
                        )}
                    </div>
                </td>

                <td>
                    <div class="template-subject">
                        ${escapeHtml(
                            template.subject ||
                            "-"
                        )}
                    </div>
                </td>

                <td>

                    <span
                        class="status-badge ${statusClass}"
                    >
                        ${escapeHtml(status)}
                    </span>

                </td>

                <td>
                    ${formatDate(
                        template.created_at
                    )}
                </td>

                <td>
                    ${formatDate(
                        template.updated_at
                    )}
                </td>

                <td>

                    <div class="actions">

                        <button
                            class="action-btn edit-btn"
                            type="button"
                            title="Edit"
                            onclick="openEditTemplate(${template.id})"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>


                        <button
                            class="action-btn delete-action-btn"
                            type="button"
                            title="Delete"
                            onclick="openDeleteModal(${template.id})"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


/* ==========================================================
   FILTER
   ========================================================== */

function getFilteredTemplates() {

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


    return templates.filter(
        template => {

            const name =
                (
                    template.template_name ||
                    ""
                ).toLowerCase();


            const subject =
                (
                    template.subject ||
                    ""
                ).toLowerCase();


            const matchesSearch =
                !search ||
                name.includes(search) ||
                subject.includes(search);


            const matchesStatus =
                status === "all" ||
                template.status === status;


            return (
                matchesSearch &&
                matchesStatus
            );

        }
    );

}


function filterTemplates() {

    /*
     * Restore the normal empty state text
     * before rendering.
     */

    const title =
        document.querySelector(
            "#emptyState h2"
        );


    const description =
        document.querySelector(
            "#emptyState p"
        );


    if (title) {

        title.textContent =
            "No email templates found";

    }


    if (description) {

        description.textContent =
            "Create your first email template.";

    }


    renderTemplates();

}


/* ==========================================================
   OPEN NEW TEMPLATE
   ========================================================== */

function openNewTemplate() {

    editingTemplateId = null;


    document
        .getElementById(
            "modalTitle"
        )
        .textContent =
        "New Email Template";


    document
        .getElementById(
            "templateForm"
        )
        .reset();


    document
        .getElementById(
            "templateStatus"
        )
        .value =
        "Active";


    document
        .getElementById(
            "templateId"
        )
        .value =
        "";


    document
        .getElementById(
            "templateModal"
        )
        .classList.add(
            "show"
        );


    setTimeout(
        () => {

            document
                .getElementById(
                    "templateName"
                )
                ?.focus();

        },
        100
    );

}


/* ==========================================================
   OPEN EDIT
   ========================================================== */

function openEditTemplate(id) {

    const template =
        templates.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!template) {

        showToast(
            "Template not found.",
            "error"
        );

        return;

    }


    editingTemplateId =
        template.id;


    document
        .getElementById(
            "modalTitle"
        )
        .textContent =
        "Edit Email Template";


    document
        .getElementById(
            "templateId"
        )
        .value =
        template.id;


    document
        .getElementById(
            "templateName"
        )
        .value =
        template.template_name ||
        "";


    document
        .getElementById(
            "templateSubject"
        )
        .value =
        template.subject ||
        "";


    document
        .getElementById(
            "templateBody"
        )
        .value =
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
   CLOSE TEMPLATE MODAL
   ========================================================== */

function closeTemplateModal() {

    document
        .getElementById(
            "templateModal"
        )
        .classList.remove(
            "show"
        );


    editingTemplateId = null;


    document
        .getElementById(
            "templateForm"
        )
        ?.reset();

}


/* ==========================================================
   SAVE TEMPLATE
   ========================================================== */

async function saveTemplate(
    event
) {

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


    const subject =
        document
            .getElementById(
                "templateSubject"
            )
            .value
            .trim();


    const body =
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


    if (!subject) {

        showToast(
            "Email subject is required.",
            "error"
        );

        return;

    }


    if (!body) {

        showToast(
            "Email body is required.",
            "error"
        );

        return;

    }


    const payload = {

        template_name:
            templateName,

        subject:
            subject,

        body:
            body,

        status:
            status

    };


    isSaving = true;


    const button =
        document
            .getElementById(
                "saveTemplateBtn"
            );


    const originalText =
        button.innerHTML;


    button.disabled = true;


    button.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Saving...

    `;


    try {

        let url =
            `${API}/api/notifications/email-templates`;


        let method =
            "POST";


        if (
            editingTemplateId
        ) {

            url +=
                `/${editingTemplateId}`;

            method =
                "PUT";

        }


        const response =
            await apiFetch(
                url,
                {
                    method,
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const savedTemplate =
            await response.json();


        console.log(
            "Saved template:",
            savedTemplate
        );


        if (
            editingTemplateId
        ) {

            const index =
                templates.findIndex(
                    item =>
                        Number(item.id) ===
                        Number(editingTemplateId)
                );


            if (index !== -1) {

                templates[index] =
                    savedTemplate;

            }


            showToast(
                "Email template updated successfully.",
                "success"
            );

        } else {

            templates.unshift(
                savedTemplate
            );


            showToast(
                "Email template created successfully.",
                "success"
            );

        }


        closeTemplateModal();

        renderTemplates();


    } catch (error) {

        console.error(
            "Unable to save template:",
            error
        );


        showToast(
            error.message ||
            "Unable to save email template.",
            "error"
        );

    } finally {

        isSaving = false;

        button.disabled = false;

        button.innerHTML =
            originalText;

    }

}


/* ==========================================================
   DELETE MODAL
   ========================================================== */

function openDeleteModal(id) {

    deletingTemplateId =
        id;


    document
        .getElementById(
            "deleteModal"
        )
        .classList.add(
            "show"
        );

}


function closeDeleteModal() {

    document
        .getElementById(
            "deleteModal"
        )
        .classList.remove(
            "show"
        );


    deletingTemplateId = null;

}


/* ==========================================================
   CONFIRM DELETE
   ========================================================== */

async function confirmDelete() {

    if (!deletingTemplateId) {
        return;
    }


    const button =
        document
            .getElementById(
                "confirmDeleteBtn"
            );


    const originalText =
        button.innerHTML;


    button.disabled = true;


    button.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Deleting...

    `;


    try {

        await apiFetch(
            `${API}/api/notifications/email-templates/${deletingTemplateId}`,
            {
                method: "DELETE"
            }
        );


        templates =
            templates.filter(
                item =>
                    Number(item.id) !==
                    Number(deletingTemplateId)
            );


        closeDeleteModal();

        renderTemplates();


        showToast(
            "Email template deleted successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Unable to delete template:",
            error
        );


        showToast(
            error.message ||
            "Unable to delete email template.",
            "error"
        );

    } finally {

        button.disabled = false;

        button.innerHTML =
            originalText;

    }

}


/* ==========================================================
   LOADING
   ========================================================== */

function showLoading(
    loading
) {

    const loadingState =
        document.getElementById(
            "loadingState"
        );


    if (!loadingState) {
        return;
    }


    loadingState.style.display =
        loading
            ? "flex"
            : "none";

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
   HTML ESCAPE
   ========================================================== */

function escapeHtml(
    value
) {

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
            3000
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


/* ==========================================================
   GLOBAL FUNCTIONS
   ========================================================== */

window.openNewTemplate =
    openNewTemplate;

window.openEditTemplate =
    openEditTemplate;

window.openDeleteModal =
    openDeleteModal;

window.closeDeleteModal =
    closeDeleteModal;

window.confirmDelete =
    confirmDelete;

window.loadTemplates =
    loadTemplates;