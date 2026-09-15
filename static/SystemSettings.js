/* ==========================================================
   VENDORIQ
   SYSTEM SETTINGS JAVASCRIPT
========================================================== */

"use strict";


/* ==========================================================
   API
========================================================== */

const API = "http://127.0.0.1:8000";


/* ==========================================================
   STATE
========================================================== */

let currentTab = "general";


/* ==========================================================
   AUTH TOKEN
========================================================== */

function getToken() {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
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

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();


    const headers = {
        "Content-Type": "application/json",
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
            : "NO TOKEN"
    );


    const response =
        await fetch(
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


    /* ======================================================
       401
    ====================================================== */

    if (response.status === 401) {

        console.error(
            "Authentication failed for:",
            url
        );

        throw new Error(
            "Could not validate credentials"
        );
    }


    /* ======================================================
       OTHER ERRORS
    ====================================================== */

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;


        try {

            const error =
                await response.json();


            if (error?.detail) {

                message =
                    typeof error.detail === "string"
                        ? error.detail
                        : JSON.stringify(
                            error.detail
                        );
            }

        } catch {

            // Response was not JSON

        }


        throw new Error(
            message
        );
    }


    return response;
}


/* ==========================================================
   DOM HELPER
========================================================== */

function getElement(id) {

    return document.getElementById(id);

}


/* ==========================================================
   SET VALUE
========================================================== */

function setValue(
    id,
    value
) {

    const element =
        getElement(id);


    if (!element) {

        console.warn(
            `Element not found: ${id}`
        );

        return;
    }


    if (
        element.type === "checkbox"
    ) {

        element.checked =
            Boolean(value);

    } else {

        element.value =
            value ?? "";

    }

}


/* ==========================================================
   TAB SWITCHING
========================================================== */

function initializeSettingsTabs() {

    const buttons =
        document.querySelectorAll(
            ".settings-nav"
        );


    const tabs =
        document.querySelectorAll(
            ".settings-tab"
        );


    if (
        buttons.length === 0 ||
        tabs.length === 0
    ) {

        console.warn(
            "Settings tabs were not found."
        );

        return;
    }


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const target =
                        button.dataset.tab;


                    if (!target) {

                        return;
                    }


                    activateTab(target);


                    history.replaceState(
                        null,
                        "",
                        `#${target}`
                    );

                }
            );

        }
    );


    /* ======================================================
       OPEN TAB FROM URL HASH
    ====================================================== */

    const hash =
        window.location.hash
            .replace("#", "");


    if (
        hash &&
        getElement(hash) &&
        document.querySelector(
            `.settings-nav[data-tab="${hash}"]`
        )
    ) {

        activateTab(hash);

    } else {

        activateTab("general");

    }

}


/* ==========================================================
   ACTIVATE TAB
========================================================== */

function activateTab(
    tabName
) {

    const buttons =
        document.querySelectorAll(
            ".settings-nav"
        );


    const tabs =
        document.querySelectorAll(
            ".settings-tab"
        );


    buttons.forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.tab === tabName
            );

        }
    );


    tabs.forEach(
        tab => {

            tab.classList.toggle(
                "active",
                tab.id === tabName
            );

        }
    );


    currentTab =
        tabName;

}


/* ==========================================================
   LOAD SETTINGS
========================================================== */

async function loadSettings() {

    try {

        console.log(
            "Loading system settings..."
        );


        const response =
            await apiFetch(
                `${API}/api/system-settings`
            );


        const data =
            await response.json();


        console.log(
            "System settings:",
            data
        );


        populateSettings(
            data
        );


    } catch (error) {

        console.error(
            "Unable to load system settings:",
            error
        );


        showToast(
            error.message ||
            "Unable to load settings",
            "error"
        );

    }

}


/* ==========================================================
   POPULATE SETTINGS
========================================================== */

function populateSettings(
    data
) {

    if (!data) {

        return;
    }


    /* ======================================================
       GENERAL
    ====================================================== */

    setValue(
        "platform_name",
        data.platform_name
    );

    setValue(
        "platform_tagline",
        data.platform_tagline
    );

    setValue(
        "default_language",
        data.default_language
    );

    setValue(
        "default_timezone",
        data.default_timezone
    );

    setValue(
        "date_format",
        data.date_format
    );

    setValue(
        "time_format",
        data.time_format
    );

    setValue(
        "items_per_page",
        data.items_per_page
    );

    setValue(
        "currency",
        data.currency
    );


    /* ======================================================
       USER & ACCESS
    ====================================================== */

    setValue(
        "allow_user_registration",
        data.allow_user_registration
    );

    setValue(
        "require_email_verification",
        data.require_email_verification
    );

    setValue(
        "password_minimum_length",
        data.password_minimum_length
    );

    setValue(
        "session_timeout",
        data.session_timeout
    );


    /* ======================================================
       SECURITY
    ====================================================== */

    setValue(
        "password_complexity",
        data.password_complexity
    );

    setValue(
        "password_expiry",
        data.password_expiry
    );

    setValue(
        "max_login_attempts",
        data.max_login_attempts
    );

    setValue(
        "two_factor_authentication",
        data.two_factor_authentication
    );


    /* ======================================================
       NOTIFICATIONS
    ====================================================== */

    setValue(
        "in_app_notifications",
        data.in_app_notifications
    );

    setValue(
        "email_notifications",
        data.email_notifications
    );

    setValue(
        "sms_notifications",
        data.sms_notifications
    );

    setValue(
        "digest_frequency",
        data.digest_frequency
    );


    /* ======================================================
       EMAIL
    ====================================================== */

    setValue(
        "smtp_host",
        data.smtp_host
    );

    setValue(
        "smtp_port",
        data.smtp_port
    );

    setValue(
        "from_email",
        data.from_email
    );

    setValue(
        "from_name",
        data.from_name
    );


    /* ======================================================
       DATA & STORAGE
    ====================================================== */

    setValue(
        "data_retention_period",
        data.data_retention_period
    );

    setValue(
        "file_storage_limit",
        data.file_storage_limit
    );


    /* ======================================================
       BACKUP
    ====================================================== */

    setValue(
        "automatic_backups",
        data.automatic_backups
    );

    setValue(
        "backup_frequency",
        data.backup_frequency
    );

    setValue(
        "backup_time",
        data.backup_time
    );

}


/* ==========================================================
   COLLECT SETTINGS
========================================================== */

function collectSettings() {

    return {

        /* ==================================================
           GENERAL
        ================================================== */

        platform_name:
            getElement(
                "platform_name"
            )?.value || "",


        platform_tagline:
            getElement(
                "platform_tagline"
            )?.value || "",


        default_language:
            getElement(
                "default_language"
            )?.value || "",


        default_timezone:
            getElement(
                "default_timezone"
            )?.value || "",


        date_format:
            getElement(
                "date_format"
            )?.value || "",


        time_format:
            getElement(
                "time_format"
            )?.value || "",


        items_per_page:
            Number(
                getElement(
                    "items_per_page"
                )?.value || 10
            ),


        currency:
            getElement(
                "currency"
            )?.value || "",


        /* ==================================================
           USER & ACCESS
        ================================================== */

        allow_user_registration:
            Boolean(
                getElement(
                    "allow_user_registration"
                )?.checked
            ),


        require_email_verification:
            Boolean(
                getElement(
                    "require_email_verification"
                )?.checked
            ),


        password_minimum_length:
            Number(
                getElement(
                    "password_minimum_length"
                )?.value || 8
            ),


        session_timeout:
            getElement(
                "session_timeout"
            )?.value || "",


        /* ==================================================
           SECURITY
        ================================================== */

        password_complexity:
            Boolean(
                getElement(
                    "password_complexity"
                )?.checked
            ),


        password_expiry:
            getElement(
                "password_expiry"
            )?.value || "",


        max_login_attempts:
            Number(
                getElement(
                    "max_login_attempts"
                )?.value || 5
            ),


        two_factor_authentication:
            Boolean(
                getElement(
                    "two_factor_authentication"
                )?.checked
            ),


        /* ==================================================
           NOTIFICATIONS
        ================================================== */

        in_app_notifications:
            Boolean(
                getElement(
                    "in_app_notifications"
                )?.checked
            ),


        email_notifications:
            Boolean(
                getElement(
                    "email_notifications"
                )?.checked
            ),


        sms_notifications:
            Boolean(
                getElement(
                    "sms_notifications"
                )?.checked
            ),


        digest_frequency:
            getElement(
                "digest_frequency"
            )?.value || "",


        /* ==================================================
           EMAIL
        ================================================== */

        smtp_host:
            getElement(
                "smtp_host"
            )?.value || "",


        smtp_port:
            Number(
                getElement(
                    "smtp_port"
                )?.value || 587
            ),


        from_email:
            getElement(
                "from_email"
            )?.value || "",


        from_name:
            getElement(
                "from_name"
            )?.value || "",


        /* ==================================================
           DATA & STORAGE

           IMPORTANT:
           Both are VARCHAR in PostgreSQL.
        ================================================== */

        data_retention_period:
            getElement(
                "data_retention_period"
            )?.value || "",


        file_storage_limit:
            getElement(
                "file_storage_limit"
            )?.value || "",


        /* ==================================================
           BACKUP
        ================================================== */

        automatic_backups:
            Boolean(
                getElement(
                    "automatic_backups"
                )?.checked
            ),


        backup_frequency:
            getElement(
                "backup_frequency"
            )?.value || "",


        backup_time:
            getElement(
                "backup_time"
            )?.value || ""

    };

}


/* ==========================================================
   SAVE SETTINGS
========================================================== */

async function saveSettings() {

    const buttons =
        document.querySelectorAll(
            ".save-button"
        );


    try {

        buttons.forEach(
            button => {

                button.disabled =
                    true;

                button.innerHTML =
                    `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Saving...
                    `;

            }
        );


        const settings =
            collectSettings();


        console.log(
            "Saving settings:",
            settings
        );


        const response =
            await apiFetch(
                `${API}/api/system-settings`,
                {
                    method: "PUT",
                    body:
                        JSON.stringify(
                            settings
                        )
                }
            );


        const result =
            await response.json();


        console.log(
            "Save result:",
            result
        );


        showToast(
            result.message ||
            "Settings saved successfully"
        );


    } catch (error) {

        console.error(
            "Unable to save settings:",
            error
        );


        showToast(
            error.message ||
            "Unable to save settings",
            "error"
        );

    } finally {

        buttons.forEach(
            button => {

                button.disabled =
                    false;

                button.innerHTML =
                    `
                    <i class="fa-solid fa-check"></i>
                    Save Changes
                    `;

            }
        );

    }

}


/* ==========================================================
   ADMIN PROFILE
========================================================== */

async function loadAdminProfile() {

    try {

        const response =
            await apiFetch(
                `${API}/adminprofile`
            );


        const data =
            await response.json();


        console.log(
            "Admin profile:",
            data
        );


        const user =
            data?.user ||
            data?.current_user ||
            data?.admin ||
            data ||
            {};


        const name =
            user.name ||
            user.full_name ||
            "Admin User";


        const email =
            user.email ||
            "admin@vendoriq.com";


        const role =
            user.role ||
            "Administrator";


        const headerName =
            getElement(
                "headerAdminName"
            );


        const headerRole =
            getElement(
                "headerAdminRole"
            );


        const sidebarName =
            getElement(
                "sidebarAdminName"
            );


        const sidebarEmail =
            getElement(
                "sidebarAdminEmail"
            );


        if (headerName) {

            headerName.textContent =
                name;

        }


        if (headerRole) {

            headerRole.textContent =
                role;

        }


        if (sidebarName) {

            sidebarName.textContent =
                name;

        }


        if (sidebarEmail) {

            sidebarEmail.textContent =
                email;

        }

    } catch (error) {

        console.warn(
            "Unable to load admin profile:",
            error
        );

        /*
         * Do not show an error toast here.
         *
         * System Settings should still load even if
         * /adminprofile returns 401.
         */

    }

}


/* ==========================================================
   TEST EMAIL
========================================================== */

async function testEmail() {

    try {

        console.log(
            "Testing email configuration..."
        );


        const response =
            await apiFetch(
                `${API}/api/system-settings/test-email`,
                {
                    method: "POST"
                }
            );


        const result =
            await response.json();


        console.log(
            "Test email result:",
            result
        );


        showToast(
            result.message ||
            "Test email sent successfully"
        );


    } catch (error) {

        console.error(
            "Test email error:",
            error
        );


        showToast(
            error.message ||
            "Unable to send test email",
            "error"
        );

    }

}


/* ==========================================================
   BACKUP DATABASE
========================================================== */

async function backupDatabase() {

    const confirmed =
        window.confirm(
            "Do you want to create a database backup now?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await apiFetch(
                `${API}/api/system-settings/backup`,
                {
                    method: "POST"
                }
            );


        const result =
            await response.json();


        showToast(
            result.message ||
            "Database backup started"
        );


    } catch (error) {

        console.error(
            "Backup error:",
            error
        );


        showToast(
            error.message ||
            "Backup failed",
            "error"
        );

    }

}


/* ==========================================================
   RESTORE DATABASE
========================================================== */

function restoreDatabase() {

    const confirmed =
        window.confirm(
            "WARNING: Restoring a database may overwrite current data. Continue?"
        );


    if (!confirmed) {

        return;

    }


    showToast(
        "Restore request submitted"
    );

}


/* ==========================================================
   AUDIT LOGS
========================================================== */

async function loadAuditLogs() {

    const body =
        getElement(
            "auditLogBody"
        );


    if (!body) {

        return;

    }


    body.innerHTML =
        `
        <div class="audit-loading">
            Loading audit logs...
        </div>
        `;


    try {

        const response =
            await apiFetch(
                `${API}/api/system-settings/audit-logs`
            );


        const logs =
            await response.json();


        if (
            !Array.isArray(logs) ||
            logs.length === 0
        ) {

            body.innerHTML =
                `
                <div class="audit-loading">
                    No audit logs found.
                </div>
                `;

            return;

        }


        body.innerHTML =
            logs.map(
                log => {

                    return `
                    <div class="audit-row">

                        <span>
                            ${escapeHtml(
                                log.user_name ||
                                "System"
                            )}
                        </span>

                        <span>
                            ${escapeHtml(
                                log.action ||
                                "-"
                            )}
                        </span>

                        <span>
                            ${escapeHtml(
                                log.created_at ||
                                "-"
                            )}
                        </span>

                        <span>

                            <span class="status connected">

                                ${escapeHtml(
                                    log.status ||
                                    "Success"
                                )}

                            </span>

                        </span>

                    </div>
                    `;

                }
            ).join("");


    } catch (error) {

        console.error(
            "Unable to load audit logs:",
            error
        );


        body.innerHTML =
            `
            <div class="audit-loading">
                Unable to load audit logs.
            </div>
            `;

    }

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

let toastTimer;


function showToast(
    message,
    type = "success"
) {

    const toast =
        getElement(
            "toast"
        );


    const toastMessage =
        getElement(
            "toastMessage"
        );


    const toastIcon =
        getElement(
            "toastIcon"
        );


    if (!toast) {

        console.warn(
            "Toast element not found."
        );

        return;

    }


    if (toastMessage) {

        toastMessage.textContent =
            message;

    }


    if (toastIcon) {

        if (type === "error") {

            toastIcon.className =
                "fa-solid fa-circle-exclamation";

            toastIcon.style.color =
                "#ff6676";

        } else {

            toastIcon.className =
                "fa-solid fa-check";

            toastIcon.style.color =
                "#37d48a";

        }

    }


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
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
   INITIALIZATION
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "VendorIQ System Settings initialized"
        );


        /* --------------------------------------------------
           Initialize tabs
        -------------------------------------------------- */

        initializeSettingsTabs();


        /* --------------------------------------------------
           Load profile and settings independently.
           
           A 401 from /adminprofile will NOT stop
           system settings from loading.
        -------------------------------------------------- */

        await Promise.allSettled([

            loadAdminProfile(),

            loadSettings()

        ]);

    }
);


function openAdminProfile(){
    window.location.href = "/admin/profile";
}