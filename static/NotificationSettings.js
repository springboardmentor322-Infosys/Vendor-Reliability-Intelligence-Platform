/* ==========================================================
   VENDORIQ
   NOTIFICATION SETTINGS MODULE
   ========================================================== */

const API = "http://127.0.0.1:8000";


/* ==========================================================
   GLOBAL STATE
   ========================================================== */

let originalSettings = null;

let isSaving = false;


/* ==========================================================
   AUTH TOKEN
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

    if (token) {

        console.log(
            "JWT token starts with:",
            token.substring(0, 30) + "..."
        );

    }

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


    console.log(
        "========================================"
    );

    console.log(
        "API REQUEST:",
        url
    );


    /* ------------------------------------------------------
       HEADERS
    ------------------------------------------------------ */

    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(options.headers || {})
    };


    /* ------------------------------------------------------
       JWT AUTHORIZATION
    ------------------------------------------------------ */

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

    }


    console.log(
        "Authorization:",
        headers["Authorization"]
            ? "Bearer <TOKEN PRESENT>"
            : "MISSING"
    );


    /* ------------------------------------------------------
       REQUEST
    ------------------------------------------------------ */

    let response;

    try {

        response = await fetch(
            url,
            {
                ...options,
                headers
            }
        );

    } catch (networkError) {

        console.error(
            "NETWORK ERROR:",
            networkError
        );

        throw new Error(
            "Unable to connect to the FastAPI server."
        );

    }


    console.log(
        "API STATUS:",
        response.status
    );


    /* ------------------------------------------------------
       RESPONSE
    ------------------------------------------------------ */

    if (!response.ok) {

        let errorData = null;

        try {

            errorData =
                await response.json();

        } catch {

            errorData = {
                detail:
                    `HTTP ${response.status}`
            };

        }


        console.error(
            "API ERROR:",
            errorData
        );


        /* --------------------------------------------------
           401
        -------------------------------------------------- */

        if (response.status === 401) {

            console.error(
                "Authentication failed."
            );


            throw new Error(
                "Could not validate credentials. Please log in again."
            );

        }


        /* --------------------------------------------------
           403
        -------------------------------------------------- */

        if (response.status === 403) {

            throw new Error(
                "You do not have permission to perform this action."
            );

        }


        /* --------------------------------------------------
           404
        -------------------------------------------------- */

        if (response.status === 404) {

            throw new Error(
                "Notification settings API endpoint was not found."
            );

        }


        /* --------------------------------------------------
           422
        -------------------------------------------------- */

        if (response.status === 422) {

            let detail =
                errorData?.detail ||
                "Invalid request data.";

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

            throw new Error(
                detail
            );

        }


        /* --------------------------------------------------
           500
        -------------------------------------------------- */

        if (response.status >= 500) {

            throw new Error(
                "Server error. Please check the FastAPI console."
            );

        }


        /* --------------------------------------------------
           GENERAL ERROR
        -------------------------------------------------- */

        let message =
            errorData?.detail ||
            `HTTP ${response.status}`;


        if (Array.isArray(message)) {

            message =
                message
                    .map(
                        item =>
                            item.msg ||
                            JSON.stringify(item)
                    )
                    .join(", ");

        }


        throw new Error(
            message
        );

    }


    console.log(
        "API REQUEST SUCCESS"
    );

    console.log(
        "========================================"
    );


    return response;
}


/* ==========================================================
   LOAD NOTIFICATION SETTINGS
   ========================================================== */

async function loadSettings() {

    console.log(
        "Loading notification settings..."
    );


    setLoadingState(true);


    try {

        const response =
            await apiFetch(
                `${API}/api/notifications/settings`,
                {
                    method: "GET"
                }
            );


        const data =
            await response.json();


        console.log(
            "Notification settings:",
            data
        );


        originalSettings =
            normalizeSettings(data);


        applySettings(
            originalSettings
        );


    } catch (error) {

        console.error(
            "Unable to load notification settings:",
            error
        );


        showToast(
            error.message ||
            "Unable to load notification settings.",
            "error"
        );


        /*
         * If credentials are invalid, send the user
         * back to the login page after a short delay.
         */

        if (
            error.message.includes(
                "Could not validate credentials"
            )
        ) {

            setTimeout(
                () => {

                    console.warn(
                        "Redirecting to login because JWT is invalid."
                    );

                    /*
                     * Change this path if your login page
                     * uses a different URL.
                     */

                    // window.location.href = "/login";

                },
                1500
            );

        }

    } finally {

        setLoadingState(false);

    }
}


/* ==========================================================
   NORMALIZE SETTINGS
   ========================================================== */

function normalizeSettings(data) {

    return {

        email_enabled:
            Boolean(
                data?.email_enabled ?? true
            ),


        vendor_registration:
            Boolean(
                data?.vendor_registration ?? true
            ),


        po_updates:
            Boolean(
                data?.po_updates ?? true
            ),


        contract_expiration:
            Boolean(
                data?.contract_expiration ?? true
            ),


        sms_enabled:
            Boolean(
                data?.sms_enabled ?? false
            ),


        urgent_sms:
            Boolean(
                data?.urgent_sms ?? true
            ),


        browser_notifications:
            Boolean(
                data?.browser_notifications ?? true
            ),


        notification_sound:
            Boolean(
                data?.notification_sound ?? true
            )

    };

}


/* ==========================================================
   APPLY SETTINGS TO HTML
   ========================================================== */

function applySettings(settings) {

    if (!settings) {
        return;
    }


    setCheckbox(
        "emailEnabled",
        settings.email_enabled
    );


    setCheckbox(
        "vendorRegistration",
        settings.vendor_registration
    );


    setCheckbox(
        "poUpdates",
        settings.po_updates
    );


    setCheckbox(
        "contractExpiration",
        settings.contract_expiration
    );


    setCheckbox(
        "smsEnabled",
        settings.sms_enabled
    );


    setCheckbox(
        "urgentSms",
        settings.urgent_sms
    );


    setCheckbox(
        "browserNotifications",
        settings.browser_notifications
    );


    setCheckbox(
        "notificationSound",
        settings.notification_sound
    );


    updateDependentControls();

}


/* ==========================================================
   SET CHECKBOX
   ========================================================== */

function setCheckbox(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {

        console.warn(
            `Element #${id} was not found.`
        );

        return;

    }


    element.checked =
        Boolean(value);

}


/* ==========================================================
   GET CHECKBOX VALUE
   ========================================================== */

function getCheckbox(id) {

    const element =
        document.getElementById(id);


    if (!element) {

        console.warn(
            `Element #${id} was not found.`
        );

        return false;

    }


    return element.checked;

}


/* ==========================================================
   COLLECT SETTINGS
   ========================================================== */

function collectSettings() {

    return {

        email_enabled:
            getCheckbox(
                "emailEnabled"
            ),


        vendor_registration:
            getCheckbox(
                "vendorRegistration"
            ),


        po_updates:
            getCheckbox(
                "poUpdates"
            ),


        contract_expiration:
            getCheckbox(
                "contractExpiration"
            ),


        sms_enabled:
            getCheckbox(
                "smsEnabled"
            ),


        urgent_sms:
            getCheckbox(
                "urgentSms"
            ),


        browser_notifications:
            getCheckbox(
                "browserNotifications"
            ),


        notification_sound:
            getCheckbox(
                "notificationSound"
            )

    };

}


/* ==========================================================
   SAVE SETTINGS
   ========================================================== */

async function saveSettings() {

    if (isSaving) {
        return;
    }


    const settings =
        collectSettings();


    console.log(
        "Saving notification settings:",
        settings
    );


    isSaving = true;


    setSaveButtonState(
        true
    );


    try {

        const response =
            await apiFetch(
                `${API}/api/notifications/settings`,
                {
                    method: "PUT",

                    body:
                        JSON.stringify(
                            settings
                        )
                }
            );


        const data =
            await response.json();


        console.log(
            "Settings saved:",
            data
        );


        originalSettings =
            normalizeSettings(data);


        applySettings(
            originalSettings
        );


        showToast(
            "Notification settings saved successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Unable to save notification settings:",
            error
        );


        showToast(
            error.message ||
            "Unable to save notification settings.",
            "error"
        );

    } finally {

        isSaving = false;

        setSaveButtonState(
            false
        );

    }

}


/* ==========================================================
   RESET SETTINGS
   ========================================================== */

function resetSettings() {

    if (!originalSettings) {

        loadSettings();

        return;

    }


    applySettings(
        originalSettings
    );


    showToast(
        "Changes have been reset.",
        "success"
    );

}


/* ==========================================================
   SET SAVE BUTTON STATE
   ========================================================== */

function setSaveButtonState(
    saving
) {

    const button =
        document.getElementById(
            "saveSettingsBtn"
        );


    if (!button) {
        return;
    }


    if (saving) {

        button.disabled = true;

        button.dataset.originalText =
            button.innerHTML;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
        `;

    } else {

        button.disabled = false;

        if (
            button.dataset.originalText
        ) {

            button.innerHTML =
                button.dataset.originalText;

        }

    }

}


/* ==========================================================
   LOADING STATE
   ========================================================== */

function setLoadingState(
    loading
) {

    const container =
        document.querySelector(
            ".settings-container"
        );


    if (
        container &&
        loading
    ) {

        container.classList.add(
            "loading"
        );

    } else if (container) {

        container.classList.remove(
            "loading"
        );

    }

}


/* ==========================================================
   DEPENDENT CONTROLS
   ========================================================== */

function updateDependentControls() {

    const emailEnabled =
        getCheckbox(
            "emailEnabled"
        );


    const smsEnabled =
        getCheckbox(
            "smsEnabled"
        );


    const vendorRegistration =
        document.getElementById(
            "vendorRegistration"
        );


    const poUpdates =
        document.getElementById(
            "poUpdates"
        );


    const contractExpiration =
        document.getElementById(
            "contractExpiration"
        );


    const urgentSms =
        document.getElementById(
            "urgentSms"
        );


    /*
     * Email dependent settings
     */

    const emailDependent = [
        vendorRegistration,
        poUpdates,
        contractExpiration
    ];


    emailDependent.forEach(
        element => {

            if (!element) {
                return;
            }

            element.disabled =
                !emailEnabled;

        }
    );


    /*
     * SMS dependent settings
     */

    if (urgentSms) {

        urgentSms.disabled =
            !smsEnabled;

    }

}


/* ==========================================================
   TOGGLE HANDLER
   ========================================================== */

function handleSettingChange() {

    updateDependentControls();

}


/* ==========================================================
   TOAST MESSAGE
   ========================================================== */

function showToast(
    message,
    type = "success"
) {

    let toast =
        document.getElementById(
            "toast"
        );


    /*
     * Create toast automatically if
     * it doesn't exist in HTML.
     */

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "toast";

        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    toast.className =
        `toast ${type}`;


    toast.style.display =
        "block";


    toast.style.opacity =
        "1";


    clearTimeout(
        window.notificationToastTimer
    );


    window.notificationToastTimer =
        setTimeout(
            () => {

                toast.style.opacity =
                    "0";


                setTimeout(
                    () => {

                        toast.style.display =
                            "none";

                    },
                    300
                );

            },
            3000
        );

}


/* ==========================================================
   LOGOUT
   ========================================================== */

function logout() {

    /*
     * Remove JWT tokens.
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


    /*
     * Change this URL if your login page
     * has a different route.
     */

    window.location.href =
        "/login";

}


/* ==========================================================
   ATTACH EVENT LISTENERS
   ========================================================== */

function initializeNotificationSettings() {

    console.log(
        "Initializing Notification Settings..."
    );


    /*
     * Save button
     */

    const saveButton =
        document.getElementById(
            "saveSettingsBtn"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveSettings
        );

    }


    /*
     * Reset button
     */

    const resetButton =
        document.getElementById(
            "resetSettingsBtn"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetSettings
        );

    }


    /*
     * Setting checkboxes
     */

    const checkboxIds = [

        "emailEnabled",

        "vendorRegistration",

        "poUpdates",

        "contractExpiration",

        "smsEnabled",

        "urgentSms",

        "browserNotifications",

        "notificationSound"

    ];


    checkboxIds.forEach(
        id => {

            const checkbox =
                document.getElementById(
                    id
                );


            if (checkbox) {

                checkbox.addEventListener(
                    "change",
                    handleSettingChange
                );

            }

        }
    );


    /*
     * Load data from FastAPI
     */

    loadSettings();

}


/* ==========================================================
   PAGE INITIALIZATION
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeNotificationSettings
);


/* ==========================================================
   GLOBAL FUNCTIONS
   ========================================================== */

window.loadSettings =
    loadSettings;

window.saveSettings =
    saveSettings;

window.resetSettings =
    resetSettings;

window.logout =
    logout;

window.openNotificationSettings =
    function () {

        window.location.href =
            "/NotificationSettings";

    };


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