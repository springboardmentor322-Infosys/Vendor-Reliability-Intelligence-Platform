const API_BASE = "http://127.0.0.1:8000";



/* ============================================================
   AUTHENTICATION
============================================================ */

function getAccessToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
    );
}


/* ============================================================
   API HELPER
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getAccessToken();


    if (!token) {

        console.error(
            "No JWT access token found in localStorage."
        );

        throw new Error(
            "Not authenticated"
        );
    }


    const headers = {
        ...(options.headers || {}),

        "Authorization":
            `Bearer ${token}`
    };


    /*
     * Only set JSON Content-Type when the request
     * is not using FormData.
     */

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers["Content-Type"]
    ) {

        headers["Content-Type"] =
            "application/json";
    }


    const response =
        await fetch(
            url,
            {
                ...options,

                headers,

                credentials: "include"
            }
        );


    /* ========================================================
       401 UNAUTHORIZED
    ======================================================== */

    if (response.status === 401) {

        console.error(
            "401 Unauthorized:",
            url
        );


        /*
         * Remove stale tokens.
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


        throw new Error(
            "Session expired. Please login again."
        );
    }


    /* ========================================================
       READ RESPONSE
    ======================================================== */

    let data = null;

    try {

        data =
            await response.json();

    } catch (_) {

        data = null;

    }


    if (!response.ok) {

        const message =
            data?.detail ||
            data?.message ||
            `Request failed: ${response.status}`;


        throw new Error(
            message
        );
    }


    return data;
}


/* ============================================================
   DOM HELPERS
   ============================================================ */

function $(id) {

    return document.getElementById(id);
}


function showToast(message) {

    const toast = $("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);
}


/* ============================================================
   INITIAL LOAD
   ============================================================ */

async function loadSettings() {

    try {

        const data = await apiFetch(
            `${API_BASE}/api/settings`
        );

        renderUser(data.user);

        renderCompany(data.company);

        renderPreferences(data.preferences);

        renderSystem(data.system);

        renderNotifications(data.notifications);

        await loadSystemInfo();

    } catch (error) {

        console.error(
            "Unable to load settings:",
            error
        );

        showToast(
            error.message ||
            "Unable to load settings"
        );
    }
}


/* ============================================================
   USER
   ============================================================ */

function renderUser(user) {

    if (!user) return;

    if ($("headerUserName"))
        $("headerUserName").textContent =
            user.name || "-";

    if ($("headerUserRole"))
        $("headerUserRole").textContent =
            user.role || "-";

    if ($("profileName"))
        $("profileName").textContent =
            user.name || "-";

    if ($("profileRole"))
        $("profileRole").textContent =
            user.role || "-";

    if ($("profileEmail"))
        $("profileEmail").textContent =
            user.email || "-";

    if ($("sideUserName"))
        $("sideUserName").textContent =
            user.name || "-";

    if ($("sideUserRole"))
        $("sideUserRole").textContent =
            user.role || "-";

}


/* ============================================================
   COMPANY
   ============================================================ */

function renderCompany(company) {

    if (!company) return;

    $("organizationName").value =
        company.company_name || "";
}


/* ============================================================
   SYSTEM SETTINGS
   ============================================================ */

function renderSystem(system) {

    if (!system) return;

    $("timezone").value =
        system.default_timezone ||
        "(UTC+05:30) Asia/Kolkata";

    $("language").value =
        system.default_language ||
        "English (US)";

    $("currency").value =
        system.currency ||
        "USD - US Dollar";

    $("numberFormat").value =
        system.number_format ||
        "1,234.56";

    $("dateFormat").value =
        system.date_format ||
        "MM/DD/YYYY";

    $("itemsPerPage").value =
        String(
            system.items_per_page || 10
        );

    $("sessionTimeout").value =
        system.session_timeout ||
        "30 Minutes";
}


/* ============================================================
   USER PREFERENCES
   ============================================================ */

function renderPreferences(preferences) {

    if (!preferences) return;

    $("dashboardView").value =
        preferences.dashboard_view ||
        preferences.default_dashboard ||
        "Expanded View";

    $("startOfWeek").value =
        preferences.start_of_week ||
        "Monday";

    $("compactMode").checked =
        Boolean(
            preferences.compact_mode
        );

    $("autoAttach").checked =
        preferences.auto_attach_documents !== false;

    $("exportFormat").value =
        preferences.export_format ||
        "PDF";

    applyAppearance(
        preferences.primary_color ||
        "Purple"
    );

    applyFontSize(
        preferences.font_size ||
        "Medium"
    );

    applySidebarPosition(
        preferences.sidebar_position ||
        "Left"
    );

    $("darkMode").checked =
        String(
            preferences.theme || "Light"
        ).toLowerCase() === "dark";
}


/* ============================================================
   NOTIFICATIONS
   ============================================================ */

function renderNotifications(settings) {

    if (!settings) return;

    $("soundNotifications").checked =
        settings.notification_sound !== false;

    $("emailUpdates").checked =
        settings.email_enabled !== false;
}


/* ============================================================
   SYSTEM INFO
   ============================================================ */

async function loadSystemInfo() {

    try {

        const data = await apiFetch(
            `${API_BASE}/api/settings/system-info`
        );

        $("version").textContent =
            data.version || "-";

        $("environment").textContent =
            data.environment || "-";

        $("lastUpdated").textContent =
            data.last_updated || "-";

        $("databaseStatus").textContent =
            data.database || "-";

        $("serverStatus").textContent =
            data.server_status || "-";

    } catch (error) {

        console.error(
            "System info error:",
            error
        );
    }
}


/* ============================================================
   SAVE GENERAL SETTINGS
   ============================================================ */

async function saveSettings() {

    const payload = {

        organization_name:
            $("organizationName").value.trim(),

        timezone:
            $("timezone").value,

        language:
            $("language").value,

        currency:
            $("currency").value,

        number_format:
            $("numberFormat").value,

        date_format:
            $("dateFormat").value,

        items_per_page:
            Number(
                $("itemsPerPage").value
            ),

        start_of_week:
            $("startOfWeek").value,

        dashboard_view:
            $("dashboardView").value,

        sound_notifications:
            $("soundNotifications").checked,

        email_updates:
            $("emailUpdates").checked,

        dark_mode:
            $("darkMode").checked,

        compact_mode:
            $("compactMode").checked,

        auto_attach_documents:
            $("autoAttach").checked,

        session_timeout:
            $("sessionTimeout").value,

        export_format:
            $("exportFormat").value,

        primary_color:
            getSelectedColor(),

        sidebar_position:
            getSelectedPosition(),

        font_size:
            getSelectedFont()

    };

    try {

        await apiFetch(
            `${API_BASE}/api/settings/page`,
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        showToast(
            "Settings saved successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Failed to save settings"
        );
    }
}


/* ============================================================
   APPEARANCE
   ============================================================ */

function getSelectedColor() {

    const selected =
        document.querySelector(
            ".color.active"
        );

    return selected
        ? selected.dataset.color
        : "Purple";
}


function applyAppearance(color) {

    document
        .querySelectorAll(".color")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.color === color
            );

        });
}


function getSelectedPosition() {

    const selected =
        document.querySelector(
            ".segmented button.active"
        );

    return selected
        ? selected.dataset.position
        : "Left";
}


function applySidebarPosition(position) {

    document
        .querySelectorAll(
            ".segmented button"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.position === position
            );

        });
}


function getSelectedFont() {

    const selected =
        document.querySelector(
            ".font-options button.active"
        );

    return selected
        ? selected.dataset.font
        : "Medium";
}


function applyFontSize(font) {

    document
        .querySelectorAll(
            ".font-options button"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.font === font
            );

        });
}


/* ============================================================
   TABS
   ============================================================ */

function setupTabs() {

    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".tab")
                        .forEach(item => {

                            item.classList.remove(
                                "active"
                            );

                        });

                    document
                        .querySelectorAll(".tab-panel")
                        .forEach(panel => {

                            panel.classList.remove(
                                "active"
                            );

                        });

                    tab.classList.add(
                        "active"
                    );

                    const panel =
                        $(tab.dataset.tab);

                    if (panel) {

                        panel.classList.add(
                            "active"
                        );

                    }

                }
            );

        });
}


/* ============================================================
   APPEARANCE EVENTS
   ============================================================ */

function setupAppearance() {

    document
        .querySelectorAll(".color")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    applyAppearance(
                        button.dataset.color
                    );

                }
            );

        });


    document
        .querySelectorAll(
            ".segmented button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    applySidebarPosition(
                        button.dataset.position
                    );

                }
            );

        });


    document
        .querySelectorAll(
            ".font-options button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    applyFontSize(
                        button.dataset.font
                    );

                }
            );

        });
}


/* ============================================================
   BACKUP
   ============================================================ */

async function backupData() {

    try {

        const result = await apiFetch(
            `${API_BASE}/api/settings/backup`,
            {
                method: "POST"
            }
        );

        showToast(
            result.message ||
            "Backup request queued"
        );

    } catch (error) {

        showToast(
            error.message ||
            "Backup failed"
        );
    }
}


/* ============================================================
   CLEAR CACHE
   ============================================================ */

async function clearCache() {

    if (
        !confirm(
            "Are you sure you want to clear the application cache?"
        )
    ) {
        return;
    }

    try {

        const result = await apiFetch(
            `${API_BASE}/api/settings/clear-cache`,
            {
                method: "POST"
            }
        );

        showToast(
            result.message ||
            "Cache cleared"
        );

    } catch (error) {

        showToast(
            error.message ||
            "Unable to clear cache"
        );
    }
}


/* ============================================================
   RESET SETTINGS
   ============================================================ */

async function resetSettings() {

    if (
        !confirm(
            "Reset all settings to their defaults?"
        )
    ) {
        return;
    }

    try {

        const result = await apiFetch(
            `${API_BASE}/api/settings/reset`,
            {
                method: "POST"
            }
        );

        showToast(
            result.message ||
            "Settings reset"
        );

        await loadSettings();

    } catch (error) {

        showToast(
            error.message ||
            "Reset failed"
        );
    }
}


/* ============================================================
   PROFILE
   ============================================================ */

function openProfile() {

    window.location.href =
        "/profile";
}


/* ============================================================
   SECURITY
   ============================================================ */

function openPassword() {

    window.location.href =
        "/profile#password";
}


function openTwoFactor() {

    window.location.href =
        "/profile#security";
}


/* ============================================================
   UPDATE CHECK
   ============================================================ */

function checkUpdates() {

    showToast(
        "You are running the latest version"
    );
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

function setupEvents() {

    $("saveGeneral")
        ?.addEventListener(
            "click",
            saveSettings
        );

    $("backupData")
        ?.addEventListener(
            "click",
            backupData
        );

    $("clearCache")
        ?.addEventListener(
            "click",
            clearCache
        );

    $("resetSettings")
        ?.addEventListener(
            "click",
            resetSettings
        );

    $("viewProfile")
        ?.addEventListener(
            "click",
            openProfile
        );

    $("changePassword")
        ?.addEventListener(
            "click",
            openPassword
        );

    $("twoFactor")
        ?.addEventListener(
            "click",
            openTwoFactor
        );

    $("checkUpdates")
        ?.addEventListener(
            "click",
            checkUpdates
        );

    setupTabs();

    setupAppearance();
}


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEvents();

        await loadSettings();

    }
);


function openProfile(){
    window.location.href="/ProcurementProfile";
}