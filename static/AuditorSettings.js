// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE = "http://127.0.0.1:8000";

let settingsData = null;

let originalProfileData = null;


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEventListeners();

        await loadSettingsDashboard();

    }
);


// ============================================================
// TOKEN
// ============================================================

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token")
    );

}


// ============================================================
// API FETCH
// ============================================================

async function apiFetch(
    endpoint,
    options = {}
) {

    const token = getToken();

    const headers = {

        ...(options.headers || {}),

        "Content-Type":
            "application/json"
    };


    if (token) {

        headers[
            "Authorization"
        ] = `Bearer ${token}`;

    }


    const response = await fetch(

        `${API_BASE}${endpoint}`,

        {
            ...options,
            headers
        }

    );


    if (response.status === 401) {

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token"
        );

        throw new Error(
            "Session expired. Please login again."
        );

    }


    let data;

    try {

        data =
            await response.json();

    }

    catch {

        data = {};

    }


    if (!response.ok) {

        let message =
            "Something went wrong";

        if (typeof data.detail === "string") {

            message = data.detail;

        }

        else if (data.detail) {

            message =
                JSON.stringify(
                    data.detail
                );

        }

        throw new Error(message);

    }


    return data;

}


// ============================================================
// LOAD DASHBOARD
// ============================================================

async function loadSettingsDashboard() {

    try {

        const data =
            await apiFetch(
                "/api/auditor/settings/dashboard"
            );


        settingsData = data;


        populateProfile(
            data.profile
        );


        populatePreferences(
            data.preferences
        );


        populateSecurity(
            data.security
        );


        renderActivities(
            data.activities
        );

    }

    catch (error) {

        console.error(
            "Settings loading error:",
            error
        );

        showToast(
            error.message
        );

    }

}


// ============================================================
// POPULATE PROFILE
// ============================================================

function populateProfile(profile) {

    document.getElementById(
        "fullName"
    ).value =
        profile.name || "";


    document.getElementById(
        "employeeId"
    ).value =
        profile.employee_id || "";


    document.getElementById(
        "email"
    ).value =
        profile.email || "";


    document.getElementById(
        "phone"
    ).value =
        profile.mobile || "";


    document.getElementById(
        "jobTitle"
    ).value =
        profile.job_title || "";


    document.getElementById(
        "department"
    ).value =
        profile.department || "";


    document.getElementById(
        "manager"
    ).value =
        profile.manager || "";


    document.getElementById(
        "aboutMe"
    ).value =
        profile.about_me || "";


    if (profile.date_of_joining) {

        document.getElementById(
            "dateOfJoining"
        ).value =
            profile.date_of_joining;

    }


    if (profile.profile_image) {

        document.getElementById(
            "profileImage"
        ).src =
            profile.profile_image;


        document.getElementById(
            "sidebarProfileImage"
        ).src =
            profile.profile_image;


        document.getElementById(
            "headerProfileImage"
        ).src =
            profile.profile_image;

    }


    document.getElementById(
        "sidebarName"
    ).textContent =
        profile.name || "User";


    document.getElementById(
        "headerName"
    ).textContent =
        profile.name || "User";


    document.getElementById(
        "sidebarRole"
    ).textContent =
        profile.role || "Auditor";


    document.getElementById(
        "headerRole"
    ).textContent =
        profile.role || "Auditor";


    originalProfileData = {

        fullName:
            profile.name || "",

        employeeId:
            profile.employee_id || "",

        email:
            profile.email || "",

        phone:
            profile.mobile || "",

        jobTitle:
            profile.job_title || "",

        department:
            profile.department || "",

        manager:
            profile.manager || "",

        dateOfJoining:
            profile.date_of_joining || "",

        aboutMe:
            profile.about_me || ""

    };

}


// ============================================================
// PREFERENCES
// ============================================================

function populatePreferences(
    preferences
) {

    const theme =
        document.getElementById(
            "theme"
        );

    const dateFormat =
        document.getElementById(
            "dateFormat"
        );

    const timeFormat =
        document.getElementById(
            "timeFormat"
        );


    setSelectValue(
        theme,
        preferences.theme
    );


    setSelectValue(
        dateFormat,
        preferences.date_format
    );


    setSelectValue(
        timeFormat,
        preferences.time_format
    );


    const timezone =
        document.getElementById(
            "timezone"
        );

    const language =
        document.getElementById(
            "language"
        );


    if (preferences.timezone) {

        ensureSelectOption(
            timezone,
            preferences.timezone
        );

        timezone.value =
            preferences.timezone;

    }


    if (preferences.language) {

        ensureSelectOption(
            language,
            preferences.language
        );

        language.value =
            preferences.language;

    }

}


// ============================================================
// SELECT HELPERS
// ============================================================

function setSelectValue(
    element,
    value
) {

    if (!value) return;

    ensureSelectOption(
        element,
        value
    );

    element.value = value;

}


function ensureSelectOption(
    select,
    value
) {

    const exists =
        Array.from(
            select.options
        ).some(
            option =>
                option.value === value
        );


    if (!exists) {

        const option =
            document.createElement(
                "option"
            );

        option.value = value;

        option.textContent = value;

        select.appendChild(option);

    }

}


// ============================================================
// SECURITY
// ============================================================

function populateSecurity(
    security
) {

    document.getElementById(
        "activeSessions"
    ).textContent =
        security.active_sessions || 0;


    document.getElementById(
        "twoFactorStatus"
    ).textContent =
        security.two_factor_enabled
            ? "Enabled"
            : "Disabled";


    document.getElementById(
        "twoFactorToggle"
    ).checked =
        security.two_factor_enabled;


    document.getElementById(
        "passwordUpdated"
    ).textContent =
        security.password_changed_at
            ? formatDate(
                security.password_changed_at
            )
            : "Not available";

}


// ============================================================
// ACTIVITIES
// ============================================================

function renderActivities(
    activities
) {

    const table =
        document.getElementById(
            "activityTable"
        );


    table.innerHTML = "";


    if (
        !activities ||
        activities.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    No recent account activity found.
                </td>
            </tr>
        `;

        return;

    }


    activities.forEach(
        activity => {

            const row =
                document.createElement("tr");


            const statusClass =
                activity.status === "Success"
                    ? "status-success"
                    : "status-info";


            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        activity.activity || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        activity.location || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        activity.device || "-"
                    )}
                </td>

                <td>
                    ${formatDateTime(
                        activity.date_time
                    )}
                </td>

                <td>
                    <span class="${statusClass}">
                        ${escapeHtml(
                            activity.status || "Info"
                        )}
                    </span>
                </td>

            `;


            table.appendChild(row);

        }
    );

}


// ============================================================
// ENABLE EDIT
// ============================================================

function enableProfileEditing() {

    const fields = [

        "fullName",
        "employeeId",
        "email",
        "phone",
        "jobTitle",
        "department",
        "dateOfJoining",
        "timezone",
        "language",
        "aboutMe"

    ];


    fields.forEach(
        id => {

            document.getElementById(
                id
            ).disabled = false;

        }
    );


    document.getElementById(
        "profileActions"
    ).classList.add(
        "show"
    );

}


// ============================================================
// DISABLE EDIT
// ============================================================

function disableProfileEditing() {

    const fields = [

        "fullName",
        "employeeId",
        "email",
        "phone",
        "jobTitle",
        "department",
        "dateOfJoining",
        "timezone",
        "language",
        "aboutMe"

    ];


    fields.forEach(
        id => {

            document.getElementById(
                id
            ).disabled = true;

        }
    );


    document.getElementById(
        "profileActions"
    ).classList.remove(
        "show"
    );

}


// ============================================================
// SAVE PROFILE
// ============================================================

async function saveProfile(
    event
) {

    event.preventDefault();


    const payload = {

        name:
            document.getElementById(
                "fullName"
            ).value.trim(),

        employee_id:
            document.getElementById(
                "employeeId"
            ).value.trim() || null,

        email:
            document.getElementById(
                "email"
            ).value.trim(),

        mobile:
            document.getElementById(
                "phone"
            ).value.trim() || null,

        job_title:
            document.getElementById(
                "jobTitle"
            ).value.trim() || null,

        department:
            document.getElementById(
                "department"
            ).value.trim() || null,

        date_of_joining:
            document.getElementById(
                "dateOfJoining"
            ).value || null,

        timezone:
            document.getElementById(
                "timezone"
            ).value,

        language:
            document.getElementById(
                "language"
            ).value,

        about_me:
            document.getElementById(
                "aboutMe"
            ).value.trim() || null

    };


    if (!payload.name) {

        showToast(
            "Full name is required"
        );

        return;

    }


    try {

        const result =
            await apiFetch(

                "/api/auditor/settings/profile",

                {

                    method: "PUT",

                    body:
                        JSON.stringify(
                            payload
                        )

                }

            );


        showToast(
            result.message ||
            "Profile updated successfully"
        );


        disableProfileEditing();


        await loadSettingsDashboard();

    }

    catch (error) {

        console.error(error);

        showToast(
            error.message
        );

    }

}


// ============================================================
// CANCEL EDIT
// ============================================================

function cancelProfileEdit() {

    if (!originalProfileData) {

        disableProfileEditing();

        return;

    }


    document.getElementById(
        "fullName"
    ).value =
        originalProfileData.fullName;


    document.getElementById(
        "employeeId"
    ).value =
        originalProfileData.employeeId;


    document.getElementById(
        "email"
    ).value =
        originalProfileData.email;


    document.getElementById(
        "phone"
    ).value =
        originalProfileData.phone;


    document.getElementById(
        "jobTitle"
    ).value =
        originalProfileData.jobTitle;


    document.getElementById(
        "department"
    ).value =
        originalProfileData.department;


    document.getElementById(
        "dateOfJoining"
    ).value =
        originalProfileData.dateOfJoining;


    document.getElementById(
        "aboutMe"
    ).value =
        originalProfileData.aboutMe;


    disableProfileEditing();

}


// ============================================================
// SAVE PREFERENCES
// ============================================================

async function savePreferences() {

    const payload = {

        theme:
            document.getElementById(
                "theme"
            ).value,

        date_format:
            document.getElementById(
                "dateFormat"
            ).value,

        time_format:
            document.getElementById(
                "timeFormat"
            ).value,

        timezone:
            document.getElementById(
                "timezone"
            ).value,

        language:
            document.getElementById(
                "language"
            ).value

    };


    try {

        const result =
            await apiFetch(

                "/api/auditor/settings/preferences",

                {

                    method: "PUT",

                    body:
                        JSON.stringify(
                            payload
                        )

                }

            );


        showToast(
            result.message ||
            "Preferences saved successfully"
        );


        applyTheme(
            payload.theme
        );

    }

    catch (error) {

        showToast(
            error.message
        );

    }

}


// ============================================================
// APPLY THEME
// ============================================================

function applyTheme(
    theme
) {

    if (theme === "Dark") {

        document.body.classList.add(
            "dark-theme"
        );

    }

    else {

        document.body.classList.remove(
            "dark-theme"
        );

    }

}


// ============================================================
// CHANGE PASSWORD
// ============================================================

async function changePassword(
    event
) {

    event.preventDefault();


    const currentPassword =
        document.getElementById(
            "currentPassword"
        ).value;


    const newPassword =
        document.getElementById(
            "newPassword"
        ).value;


    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        ).value;


    if (
        newPassword !==
        confirmPassword
    ) {

        showToast(
            "New passwords do not match"
        );

        return;

    }


    try {

        const result =
            await apiFetch(

                "/api/auditor/settings/password",

                {

                    method: "PUT",

                    body:
                        JSON.stringify({

                            current_password:
                                currentPassword,

                            new_password:
                                newPassword,

                            confirm_password:
                                confirmPassword

                        })

                }

            );


        showToast(
            result.message
        );


        closePasswordModal();


        document.getElementById(
            "passwordForm"
        ).reset();


        await loadSettingsDashboard();

    }

    catch (error) {

        showToast(
            error.message
        );

    }

}


// ============================================================
// SAVE TWO FACTOR
// ============================================================

async function saveTwoFactor() {

    const enabled =
        document.getElementById(
            "twoFactorToggle"
        ).checked;


    try {

        const result =
            await apiFetch(

                "/api/auditor/settings/two-factor",

                {

                    method: "PUT",

                    body:
                        JSON.stringify({
                            enabled
                        })

                }

            );


        showToast(
            result.message
        );


        closeTwoFactorModal();


        await loadSettingsDashboard();

    }

    catch (error) {

        showToast(
            error.message
        );

    }

}


// ============================================================
// MODALS
// ============================================================

function openPasswordModal() {

    document.getElementById(
        "passwordModal"
    ).classList.add(
        "show"
    );

}


function closePasswordModal() {

    document.getElementById(
        "passwordModal"
    ).classList.remove(
        "show"
    );

}


function openTwoFactorModal() {

    document.getElementById(
        "twoFactorModal"
    ).classList.add(
        "show"
    );

}


function closeTwoFactorModal() {

    document.getElementById(
        "twoFactorModal"
    ).classList.remove(
        "show"
    );

}


// ============================================================
// PROFILE IMAGE PREVIEW
// ============================================================

function previewProfileImage(
    event
) {

    const file =
        event.target.files[0];


    if (!file) return;


    const reader =
        new FileReader();


    reader.onload =
        function(e) {

            document.getElementById(
                "profileImage"
            ).src =
                e.target.result;

        };


    reader.readAsDataURL(
        file
    );

}


// ============================================================
// SAFE EVENT LISTENER HELPER
// ============================================================

function addClickListener(id, handler) {

    const element = document.getElementById(id);

    if (!element) {
        console.warn(
            `Element #${id} not found in HTML`
        );
        return;
    }

    element.addEventListener(
        "click",
        handler
    );
}


function addSubmitListener(id, handler) {

    const element = document.getElementById(id);

    if (!element) {
        console.warn(
            `Element #${id} not found in HTML`
        );
        return;
    }

    element.addEventListener(
        "submit",
        handler
    );
}


function addChangeListener(id, handler) {

    const element = document.getElementById(id);

    if (!element) {
        console.warn(
            `Element #${id} not found in HTML`
        );
        return;
    }

    element.addEventListener(
        "change",
        handler
    );
}


// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {

    // --------------------------------------------------------
    // PROFILE
    // --------------------------------------------------------

    addClickListener(
        "editProfileBtn",
        enableProfileEditing
    );

    addClickListener(
        "quickEditProfile",
        enableProfileEditing
    );

    addClickListener(
        "cancelEditBtn",
        cancelProfileEdit
    );

    addSubmitListener(
        "profileForm",
        saveProfile
    );


    // --------------------------------------------------------
    // PREFERENCES
    // --------------------------------------------------------

    addClickListener(
        "savePreferencesBtn",
        savePreferences
    );


    // --------------------------------------------------------
    // PASSWORD
    // --------------------------------------------------------

    addClickListener(
        "quickChangePassword",
        openPasswordModal
    );

    addSubmitListener(
        "passwordForm",
        changePassword
    );


    const closePasswordButton =
        document.querySelector(
            ".close-modal"
        );

    if (closePasswordButton) {

        closePasswordButton.addEventListener(
            "click",
            closePasswordModal
        );

    }


    // --------------------------------------------------------
    // TWO FACTOR
    // --------------------------------------------------------

    addClickListener(
        "quickTwoFactor",
        openTwoFactorModal
    );

    addClickListener(
        "viewSecurityBtn",
        openTwoFactorModal
    );


    const closeTwoFactorButton =
        document.querySelector(
            ".close-twofactor"
        );

    if (closeTwoFactorButton) {

        closeTwoFactorButton.addEventListener(
            "click",
            closeTwoFactorModal
        );

    }


    addClickListener(
        "saveTwoFactor",
        saveTwoFactor
    );


    // --------------------------------------------------------
    // PROFILE IMAGE
    // --------------------------------------------------------

    addChangeListener(
        "profileImageInput",
        previewProfileImage
    );


    // --------------------------------------------------------
    // EMAIL PREFERENCES
    // --------------------------------------------------------

    addClickListener(
        "emailPreferencesBtn",
        openEmailPreferences
    );


    const closeEmailButton =
        document.querySelector(
            ".close-email-preferences"
        );

    if (closeEmailButton) {

        closeEmailButton.addEventListener(
            "click",
            closeEmailPreferences
        );

    }


    addClickListener(
        "saveEmailPreferences",
        saveEmailPreferences
    );


    // --------------------------------------------------------
    // NOTIFICATION SETTINGS
    // --------------------------------------------------------

    addClickListener(
        "notificationSettings",
        openNotificationSettings
    );


    const closeNotificationButton =
        document.querySelector(
            ".close-notification-settings"
        );

    if (closeNotificationButton) {

        closeNotificationButton.addEventListener(
            "click",
            closeNotificationSettings
        );

    }


    addClickListener(
        "saveNotificationSettings",
        saveNotificationSettings
    );


    // --------------------------------------------------------
    // CLOSE MODAL WHEN CLICKING OUTSIDE
    // --------------------------------------------------------

    document.querySelectorAll(
        ".modal"
    ).forEach(
        modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {

                        modal.classList.remove(
                            "show"
                        );

                    }

                }
            );

        }
    );

}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
    value
) {

    if (!value) return "-";


    const date =
        new Date(value);


    return date.toLocaleDateString(
        "en-IN",

        {

            day: "2-digit",

            month: "short",

            year: "numeric"

        }

    );

}


function formatDateTime(
    value
) {

    if (!value) return "-";


    const date =
        new Date(value);


    return date.toLocaleString(
        "en-IN",

        {

            day: "2-digit",

            month: "short",

            year: "numeric",

            hour: "2-digit",

            minute: "2-digit"

        }

    );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value;

    return div.innerHTML;

}


// ============================================================
// TOAST
// ============================================================

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(

        () => {

            toast.classList.remove(
                "show"
            );

        },

        3500

    );

}


// ============================================================
// EMAIL PREFERENCES
// ============================================================

function openEmailPreferences() {

    const modal =
        document.getElementById(
            "emailPreferencesModal"
        );

    if (modal) {
        modal.classList.add("show");
    }

}


function closeEmailPreferences() {

    const modal =
        document.getElementById(
            "emailPreferencesModal"
        );

    if (modal) {
        modal.classList.remove("show");
    }

}


async function saveEmailPreferences() {

    const payload = {

        audit_reminders:
            document.getElementById(
                "emailAuditReminders"
            ).checked,

        audit_assignments:
            document.getElementById(
                "emailAuditAssignments"
            ).checked,

        finding_notifications:
            document.getElementById(
                "emailFindingNotifications"
            ).checked,

        report_notifications:
            document.getElementById(
                "emailReportNotifications"
            ).checked

    };


    try {

        /*
         * Use this when your FastAPI endpoint exists:
         *
         * const result = await apiFetch(
         *     "/api/auditor/settings/email-preferences",
         *     {
         *         method: "PUT",
         *         body: JSON.stringify(payload)
         *     }
         * );
         */

        const result = await apiFetch(
            "/api/auditor/settings/email-preferences",
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        showToast(
            result.message ||
            "Email preferences saved successfully"
        );

        closeEmailPreferences();

    }

    catch (error) {

        console.error(
            "Email preferences error:",
            error
        );

        showToast(
            error.message
        );

    }

}


// ============================================================
// NOTIFICATION SETTINGS
// ============================================================

function openNotificationSettings() {

    const modal =
        document.getElementById(
            "notificationSettingsModal"
        );

    if (modal) {
        modal.classList.add("show");
    }

}


function closeNotificationSettings() {

    const modal =
        document.getElementById(
            "notificationSettingsModal"
        );

    if (modal) {
        modal.classList.remove("show");
    }

}


async function saveNotificationSettings() {

    const payload = {

        audit_assignments:
            document.getElementById(
                "notifyAuditAssignments"
            ).checked,

        findings:
            document.getElementById(
                "notifyFindings"
            ).checked,

        compliance:
            document.getElementById(
                "notifyCompliance"
            ).checked,

        system:
            document.getElementById(
                "notifySystem"
            ).checked

    };


    try {

        /*
         * Use this when your FastAPI endpoint exists:
         *
         * const result = await apiFetch(
         *     "/api/auditor/settings/notifications",
         *     {
         *         method: "PUT",
         *         body: JSON.stringify(payload)
         *     }
         * );
         */

        const result = await apiFetch(
            "/api/auditor/settings/notifications",
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        showToast(
            result.message ||
            "Notification settings saved successfully"
        );

        closeNotificationSettings();

    }

    catch (error) {

        console.error(
            "Notification settings error:",
            error
        );

        showToast(
            error.message
        );

    }

}

function openHelp(){
    window.location.href="/AuditorHelp"
}