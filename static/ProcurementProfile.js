/* ============================================================
   PROCUREMENT MANAGER PROFILE
   ProcurementProfile.js
   Matches Procurement Profile HTML
   ============================================================ */

"use strict";

/* ============================================================
   CONFIGURATION
============================================================ */

const API_BASE = "http://127.0.0.1:8000";

const PROFILE_API =
    `${API_BASE}/api/procurement/profile`;

let profileData = null;


/* ============================================================
   API HELPER
============================================================ */

async function apiFetch(url, options = {}) {

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token");

    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };

    if (
        options.body &&
        !(options.body instanceof FormData)
    ) {
        headers["Content-Type"] =
            "application/json";
    }

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    const response = await fetch(
        url,
        {
            ...options,
            headers,
            credentials: "include"
        }
    );

    let data = null;

    try {
        data = await response.json();
    } catch (_) {
        data = null;
    }

    if (!response.ok) {

        let message =
            data?.detail ||
            data?.message ||
            `HTTP ${response.status}`;

        if (Array.isArray(data?.detail)) {

            message =
                data.detail
                    .map(item =>
                        item.msg ||
                        "Validation error"
                    )
                    .join(", ");
        }

        if (response.status === 401) {

            console.error(
                "Authentication failed:",
                data
            );

            throw new Error(
                "Not authenticated. Please log in again."
            );
        }

        throw new Error(message);
    }

    return data;
}


/* ============================================================
   DOM HELPER
============================================================ */

function $(id) {
    return document.getElementById(id);
}


/* ============================================================
   VALUE HELPERS
============================================================ */

function valueOrEmpty(value) {

    return (
        value === null ||
        value === undefined
    )
        ? ""
        : value;
}


function setText(id, value, fallback = "—") {

    const element = $(id);

    if (!element) return;

    element.textContent =
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
            ? value
            : fallback;
}


function setValue(id, value) {

    const element = $(id);

    if (!element) return;

    element.value =
        valueOrEmpty(value);
}


function getValue(id) {

    const element = $(id);

    if (!element) {
        return "";
    }

    return element.value.trim();
}


function getIntegerValue(id) {

    const value =
        getValue(id);

    if (!value) {
        return null;
    }

    const number =
        Number(value);

    return Number.isInteger(number)
        ? number
        : null;
}


/* ============================================================
   DATE FORMAT
============================================================ */

function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


function formatDateTime(value) {

    if (!value) {
        return "Not available";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(
        "en-IN",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


function normalizeDateInput(value) {

    if (!value) {
        return "";
    }

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return value;
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date
        .toISOString()
        .substring(0, 10);
}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   TOAST / MESSAGE
============================================================ */

function showMessage(
    message,
    type = "success"
) {

    const toast =
        $("toast");

    const toastMessage =
        $("toastMessage");

    if (!toast || !toastMessage) {

        alert(message);

        return;
    }

    toastMessage.textContent =
        message;

    const icon =
        toast.querySelector("i");

    if (icon) {

        icon.className =
            type === "error"
                ? "fa-solid fa-circle-exclamation"
                : "fa-solid fa-circle-check";
    }

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3500);
}


/* ============================================================
   LOAD PROFILE
============================================================ */

async function loadProfile() {

    try {

        const data =
            await apiFetch(
                `${PROFILE_API}/me`
            );

        if (!data?.success) {

            throw new Error(
                "Unable to load profile."
            );
        }

        profileData =
            data;

        populateProfile(
            data.user
        );

        populatePreferences(
            data.preferences
        );

        renderSkills(
            data.skills || []
        );

        populateSkillsEditor(
            data.skills || []
        );

        updateProfileCompletion(
            data.user
        );

        return data;

    } catch (error) {

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to load profile.",
            "error"
        );

        throw error;
    }
}


/* ============================================================
   POPULATE PROFILE
============================================================ */

function populateProfile(user) {

    if (!user) return;


    /* --------------------------------------------------------
       BASIC HEADER
    -------------------------------------------------------- */

    setText(
        "sidebarUserName",
        user.name
    );

    setText(
        "sidebarUserRole",
        user.role ||
        "Procurement Manager"
    );

    setText(
        "topUserName",
        user.name
    );

    setText(
        "topUserRole",
        user.role ||
        "Procurement Manager"
    );


    /* --------------------------------------------------------
       PROFILE HEADER
    -------------------------------------------------------- */

    setText(
        "profileName",
        user.name
    );

    setText(
        "profileRole",
        user.role ||
        "Procurement Manager"
    );

    setText(
        "profileEmail",
        user.email
    );

    setText(
        "profileMobile",
        user.mobile
    );

    setText(
        "profileLocation",
        user.location
    );

    setText(
        "profileEmployeeId",
        user.employee_id
    );

    setText(
        "memberSince",
        formatDate(
            user.date_of_joining
        )
    );


    /* --------------------------------------------------------
       WORK SUMMARY
    -------------------------------------------------------- */

    setText(
        "summaryDepartment",
        user.department
    );

    setText(
        "summaryManager",
        user.reporting_manager_name ||
        user.manager_name ||
        "Head of Procurement"
    );

    setText(
        "summaryJoiningDate",
        formatDate(
            user.date_of_joining
        )
    );

    setText(
        "summaryLastLogin",
        formatDateTime(
            user.last_login
        )
    );

    setText(
        "summaryTimezone",
        user.timezone ||
        "(GMT+05:30) India Standard Time"
    );


    /* --------------------------------------------------------
       PERSONAL INFORMATION
    -------------------------------------------------------- */

    setText(
        "personalName",
        user.name
    );

    setText(
        "personalEmail",
        user.email
    );

    setText(
        "personalMobile",
        user.mobile
    );

    setText(
        "personalAlternateEmail",
        user.alternate_email
    );

    setText(
        "personalDob",
        formatDate(
            user.date_of_birth
        )
    );

    setText(
        "personalGender",
        user.gender
    );

    setText(
        "personalNationality",
        user.nationality
    );

    setText(
        "personalLanguages",
        Array.isArray(user.languages)
            ? user.languages.join(", ")
            : user.languages
    );

    setText(
        "personalAddress",
        user.address
    );

    setText(
        "aboutMe",
        user.about_me
    );


    /* --------------------------------------------------------
       WORK INFORMATION
    -------------------------------------------------------- */

    setText(
        "workJobTitle",
        user.job_title
    );

    setText(
        "workJoiningDate",
        formatDate(
            user.date_of_joining
        )
    );

    setText(
        "workDepartment",
        user.department
    );

    setText(
        "workLocation",
        user.location
    );

    setText(
        "workManager",
        user.reporting_manager_name ||
        user.manager_name
    );

    setText(
        "workTeamSize",
        user.team_size
    );

    setText(
        "workEmployeeId",
        user.employee_id
    );

    setText(
        "workPhone",
        user.work_phone ||
        user.mobile
    );

    setText(
        "workEmploymentType",
        user.employment_type ||
        "Full-time"
    );

    setText(
        "workBusinessUnit",
        user.business_unit ||
        "Global Operations"
    );


    /* --------------------------------------------------------
       BOTTOM WORK CARD
    -------------------------------------------------------- */

    setText(
        "miniJobTitle",
        user.job_title
    );

    setText(
        "miniJoiningDate",
        formatDate(
            user.date_of_joining
        )
    );

    setText(
        "miniDepartment",
        user.department
    );

    setText(
        "miniLocation",
        user.location
    );

    setText(
        "miniManager",
        user.reporting_manager_name ||
        user.manager_name
    );

    setText(
        "miniTeamSize",
        user.team_size
    );

    setText(
        "miniEmployeeId",
        user.employee_id
    );

    setText(
        "miniBusinessUnit",
        user.business_unit ||
        "Global Operations"
    );


    /* --------------------------------------------------------
       EDIT PROFILE FORM
    -------------------------------------------------------- */

    setValue(
        "editName",
        user.name
    );

    setValue(
        "editEmail",
        user.email
    );

    setValue(
        "editAlternateEmail",
        user.alternate_email
    );

    setValue(
        "editMobile",
        user.mobile
    );

    setValue(
        "editGender",
        user.gender
    );

    setValue(
        "editDob",
        normalizeDateInput(
            user.date_of_birth
        )
    );

    setValue(
        "editNationality",
        user.nationality
    );

    setValue(
        "editLanguages",
        Array.isArray(user.languages)
            ? user.languages.join(", ")
            : user.languages
    );

    setValue(
        "editDepartment",
        user.department
    );

    setValue(
        "editJobTitle",
        user.job_title
    );

    setValue(
        "editLocation",
        user.location
    );

    setValue(
        "editJoiningDate",
        normalizeDateInput(
            user.date_of_joining
        )
    );

    setValue(
        "editAddress",
        user.address
    );

    setValue(
        "editAboutMe",
        user.about_me
    );


    /* --------------------------------------------------------
       PROFILE IMAGE
    -------------------------------------------------------- */

    updateProfileImage(
        user.profile_image,
        user.name
    );


    /* --------------------------------------------------------
       SECURITY
    -------------------------------------------------------- */

    updateCheckbox(
        "twoFactorToggle",
        user.two_factor_enabled
    );

    updateCheckbox(
        "loginNotificationToggle",
        user.login_email_notifications
    );

    updateSecurityLabels(
        user
    );
}


/* ============================================================
   SECURITY LABELS
============================================================ */

function updateSecurityLabels(user) {

    const twoFactorStatus =
        $("twoFactorStatus");

    if (twoFactorStatus) {

        twoFactorStatus.textContent =
            user.two_factor_enabled
                ? "Enabled"
                : "Disabled";

        twoFactorStatus.classList.toggle(
            "enabled",
            Boolean(user.two_factor_enabled)
        );
    }


    const loginStatus =
        $("loginNotificationStatus");

    if (loginStatus) {

        loginStatus.textContent =
            user.login_email_notifications
                ? "Enabled"
                : "Disabled";

        loginStatus.classList.toggle(
            "enabled",
            Boolean(
                user.login_email_notifications
            )
        );
    }


    setText(
        "passwordChangedAt",
        formatDateTime(
            user.password_changed_at
        )
    );

    setText(
        "miniPasswordChanged",
        formatDateTime(
            user.password_changed_at
        )
    );
}


/* ============================================================
   CHECKBOX
============================================================ */

function updateCheckbox(
    id,
    value
) {

    const element =
        $(id);

    if (!element) return;

    element.checked =
        Boolean(value);
}


/* ============================================================
   PROFILE IMAGE
============================================================ */

function updateProfileImage(
    imagePath,
    name
) {

    const image =
        $("profileImage");

    const initials =
        $("profileInitials");

    const topAvatar =
        $("topAvatar");

    const sidebarAvatar =
        $("sidebarAvatar");


    const imageURL =
        imagePath
            ? (
                imagePath.startsWith("http")
                    ? imagePath
                    : `${API_BASE}${imagePath}`
            )
            : null;


    if (image && imageURL) {

        image.src =
            imageURL;

        image.style.display =
            "block";

        if (initials) {
            initials.style.display =
                "none";
        }

        image.onerror = () => {

            image.style.display =
                "none";

            if (initials) {

                initials.style.display =
                    "flex";

                initials.textContent =
                    getInitials(name);
            }
        };

    } else {

        if (image) {
            image.style.display =
                "none";
        }

        if (initials) {

            initials.style.display =
                "flex";

            initials.textContent =
                getInitials(name);
        }
    }


    const initialText =
        getInitials(name);

    if (topAvatar) {

        if (!imageURL) {
            topAvatar.innerHTML =
                escapeHTML(initialText);
        }
    }

    if (sidebarAvatar) {

        if (!imageURL) {
            sidebarAvatar.innerHTML =
                escapeHTML(initialText);
        }
    }
}


/* ============================================================
   INITIALS
============================================================ */

function getInitials(name) {

    if (!name) {
        return "?";
    }

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word =>
            word.charAt(0)
        )
        .join("")
        .toUpperCase();
}


/* ============================================================
   PROFILE COMPLETION
============================================================ */

function updateProfileCompletion(user) {

    let percentage =
        Number(
            user?.profile_completion
        );

    if (
        Number.isNaN(percentage)
    ) {

        const fields = [
            user?.name,
            user?.email,
            user?.mobile,
            user?.alternate_email,
            user?.date_of_birth,
            user?.gender,
            user?.nationality,
            user?.languages,
            user?.address,
            user?.about_me,
            user?.department,
            user?.job_title,
            user?.location,
            user?.date_of_joining
        ];

        const filled =
            fields.filter(
                value =>
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ""
            ).length;

        percentage =
            Math.round(
                (filled / fields.length) * 100
            );
    }


    percentage =
        Math.max(
            0,
            Math.min(
                100,
                percentage
            )
        );


    setText(
        "completionPercent",
        `${percentage}%`
    );


    const ring =
        $("completionRing");

    if (ring) {

        const radius = 43;

        const circumference =
            2 * Math.PI * radius;

        ring.style.strokeDasharray =
            `${circumference}`;

        ring.style.strokeDashoffset =
            `${circumference -
                (percentage / 100) *
                circumference}`;
    }
}


/* ============================================================
   PREFERENCES
============================================================ */

function populatePreferences(
    preferences
) {

    if (!preferences) return;

    setValue(
        "prefLanguage",
        preferences.language
    );

    setValue(
        "prefTimezone",
        preferences.timezone
    );

    setValue(
        "prefDateFormat",
        preferences.date_format
    );

    setValue(
        "prefTimeFormat",
        preferences.time_format
    );

    setValue(
        "prefCurrency",
        preferences.currency
    );

    setValue(
        "prefTheme",
        preferences.theme
    );
}


/* ============================================================
   OPEN EDIT PROFILE
============================================================ */

async function openEditProfile() {

    /*
     * Refresh manager list only if backend supports it.
     * The supplied HTML does not contain a manager edit field,
     * so no manager request is required.
     */

    if (!profileData) {

        await loadProfile();
    }

    const modal =
        $("editModal");

    if (!modal) return;

    modal.classList.add("active");

    modal.style.display =
        "flex";
}


/* ============================================================
   SAVE PROFILE
============================================================ */

async function saveProfile(
    event
) {

    if (event) {
        event.preventDefault();
    }


    const name =
        getValue("editName");

    const email =
        getValue("editEmail");


    if (!name) {

        showMessage(
            "Full name is required.",
            "error"
        );

        return;
    }


    if (!email) {

        showMessage(
            "Email address is required.",
            "error"
        );

        return;
    }


    const payload = {

        name: name,

        email: email,

        alternate_email:
            getValue(
                "editAlternateEmail"
            ) || null,

        mobile:
            getValue(
                "editMobile"
            ) || null,

        gender:
            getValue(
                "editGender"
            ) || null,

        date_of_birth:
            getValue(
                "editDob"
            ) || null,

        nationality:
            getValue(
                "editNationality"
            ) || null,

        languages:
            getValue(
                "editLanguages"
            ) || null,

        department:
            getValue(
                "editDepartment"
            ) || null,

        job_title:
            getValue(
                "editJobTitle"
            ) || null,

        location:
            getValue(
                "editLocation"
            ) || null,

        date_of_joining:
            getValue(
                "editJoiningDate"
            ) || null,

        address:
            getValue(
                "editAddress"
            ) || null,

        about_me:
            getValue(
                "editAboutMe"
            ) || null
    };


    const saveButton =
        document.querySelector(
            '#profileForm button[type="submit"]'
        );


    try {

        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.dataset.originalText =
                saveButton.innerHTML;

            saveButton.innerHTML =
                `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Saving...
                `;
        }


        console.log(
            "Updating procurement profile:",
            payload
        );


        const data =
            await apiFetch(
                `${PROFILE_API}/me`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );


        if (
            data?.success === false
        ) {

            throw new Error(
                data.message ||
                "Profile update failed."
            );
        }


        showMessage(
            data?.message ||
            "Profile updated successfully.",
            "success"
        );


        /*
         * Reload profile from PostgreSQL
         * so every part of the page displays
         * the saved values.
         */

        await loadProfile();


        closeModal(
            "editModal"
        );


    } catch (error) {

        console.error(
            "SAVE PROFILE ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to update profile.",
            "error"
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.innerHTML =
                saveButton.dataset.originalText ||
                `
                <i class="fa-solid fa-check"></i>
                Save Changes
                `;
        }
    }
}


/* ============================================================
   PASSWORD
============================================================ */

async function changePassword(
    event
) {

    if (event) {
        event.preventDefault();
    }


    const currentPassword =
        getValue("currentPassword");

    const newPassword =
        getValue("newPassword");

    const confirmPassword =
        getValue("confirmPassword");


    if (!currentPassword) {

        showMessage(
            "Enter your current password.",
            "error"
        );

        return;
    }


    if (!newPassword) {

        showMessage(
            "Enter a new password.",
            "error"
        );

        return;
    }


    if (newPassword.length < 8) {

        showMessage(
            "Password must contain at least 8 characters.",
            "error"
        );

        return;
    }


    if (
        !/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword)
    ) {

        showMessage(
            "Password must contain uppercase, lowercase and number.",
            "error"
        );

        return;
    }


    if (
        newPassword !==
        confirmPassword
    ) {

        showMessage(
            "New passwords do not match.",
            "error"
        );

        return;
    }


    try {

        const data =
            await apiFetch(
                `${PROFILE_API}/password`,
                {
                    method: "PUT",

                    body: JSON.stringify({

                        current_password:
                            currentPassword,

                        new_password:
                            newPassword,

                        confirm_password:
                            confirmPassword
                    })
                }
            );


        showMessage(
            data?.message ||
            "Password updated successfully.",
            "success"
        );


        clearPasswordFields();

        closeModal(
            "passwordModal"
        );


    } catch (error) {

        console.error(
            "PASSWORD ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to change password.",
            "error"
        );
    }
}


/* ============================================================
   CLEAR PASSWORD
============================================================ */

function clearPasswordFields() {

    setValue(
        "currentPassword",
        ""
    );

    setValue(
        "newPassword",
        ""
    );

    setValue(
        "confirmPassword",
        ""
    );
}


/* ============================================================
   PASSWORD TOGGLES
============================================================ */

function setupPasswordToggles() {

    document
        .querySelectorAll(
            "[data-password-toggle]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        $(button.dataset.passwordToggle);

                    if (!target) return;

                    if (
                        target.type ===
                        "password"
                    ) {

                        target.type =
                            "text";

                        button.innerHTML =
                            '<i class="fa-solid fa-eye-slash"></i>';

                    } else {

                        target.type =
                            "password";

                        button.innerHTML =
                            '<i class="fa-solid fa-eye"></i>';
                    }
                }
            );
        });
}


/* ============================================================
   TWO FACTOR
============================================================ */

async function updateTwoFactor(
    enabled
) {

    const checkbox =
        $("twoFactorToggle");

    try {

        await apiFetch(
            `${PROFILE_API}/security/2fa`,
            {
                method: "PUT",

                body: JSON.stringify({
                    enabled:
                        Boolean(enabled)
                })
            }
        );

        showMessage(
            enabled
                ? "Two-factor authentication enabled."
                : "Two-factor authentication disabled.",
            "success"
        );

        if (profileData?.user) {

            profileData.user.two_factor_enabled =
                Boolean(enabled);
        }

        updateSecurityLabels(
            profileData?.user || {}
        );

    } catch (error) {

        console.error(
            "2FA ERROR:",
            error
        );

        if (checkbox) {
            checkbox.checked =
                !enabled;
        }

        showMessage(
            error.message ||
            "Unable to update 2FA.",
            "error"
        );
    }
}


/* ============================================================
   LOGIN NOTIFICATIONS
============================================================ */

async function updateLoginNotifications(
    enabled
) {

    const checkbox =
        $("loginNotificationToggle");

    try {

        await apiFetch(
            `${PROFILE_API}/security/login-notifications`,
            {
                method: "PUT",

                body: JSON.stringify({
                    enabled:
                        Boolean(enabled)
                })
            }
        );

        showMessage(
            enabled
                ? "Login notifications enabled."
                : "Login notifications disabled.",
            "success"
        );

        if (profileData?.user) {

            profileData.user.login_email_notifications =
                Boolean(enabled);
        }

        updateSecurityLabels(
            profileData?.user || {}
        );

    } catch (error) {

        console.error(
            "LOGIN NOTIFICATION ERROR:",
            error
        );

        if (checkbox) {
            checkbox.checked =
                !enabled;
        }

        showMessage(
            error.message ||
            "Unable to update login notifications.",
            "error"
        );
    }
}


/* ============================================================
   ACTIVITY
============================================================ */

async function loadActivity(
    limit = 10
) {

    try {

        const data =
            await apiFetch(
                `${PROFILE_API}/activity?limit=${limit}`
            );

        renderActivity(
            data?.items || []
        );

        renderRecentActivity(
            data?.items || []
        );

        return data;

    } catch (error) {

        console.error(
            "ACTIVITY ERROR:",
            error
        );

        renderActivity([]);
        renderRecentActivity([]);
    }
}


/* ============================================================
   RENDER ACTIVITY
============================================================ */

function renderActivity(
    items
) {

    const container =
        $("activityList");

    if (!container) return;


    if (!items.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                <i class="fa-regular fa-clock"></i>
                <p style="font-size:10px;">No recent activity.</p>
            </div>
            `;

        return;
    }


    container.innerHTML =
        items.map(item => {

            return `
                <div class="activity-item">

                    <div class="activity-icon">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>

                    <div class="activity-content">

                        <div class="activity-title">
                            ${escapeHTML(
                                item.description ||
                                item.action ||
                                "Activity"
                            )}
                        </div>

                        <div class="activity-meta">

                            ${escapeHTML(
                                item.action || ""
                            )}

                            ${
                                item.created_at
                                    ? ` • ${escapeHTML(
                                        formatDateTime(
                                            item.created_at
                                        )
                                    )}`
                                    : ""
                            }

                        </div>

                    </div>

                </div>
            `;

        }).join("");
}


/* ============================================================
   RECENT ACTIVITY
============================================================ */

function renderRecentActivity(
    items
) {

    const container =
        $("recentActivityList");

    if (!container) return;


    const recent =
        items.slice(0, 5);


    if (!recent.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                <p>No recent activity.</p>
            </div>
            `;

        return;
    }


    container.innerHTML =
        recent.map(item => {

            return `
                <div class="recent-activity-item">

                    <div class="recent-activity-icon" style="font-size:10px;">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>

                    <div>

                        <strong style="font-size:12px;">
                            ${escapeHTML(
                                item.description ||
                                item.action ||
                                "Activity"
                            )}
                        </strong>

                        <small style="font-size:9px;">
                            ${escapeHTML(
                                formatDateTime(
                                    item.created_at
                                )
                            )}
                        </small>

                    </div>

                </div>
            `;

        }).join("");
}


/* ============================================================
   SKILLS
============================================================ */

function renderSkills(
    skills
) {

    const container =
        $("skillsList");

    if (!container) return;


    if (!skills.length) {

        container.innerHTML =
            `
            <div class="empty-state">

                <i class="fa-solid fa-star"></i>

                <p>
                    No skills added yet.
                </p>

            </div>
            `;

        return;
    }


    container.innerHTML =
        skills.map(skill => {

            const proficiency =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            skill.proficiency || 0
                        )
                    )
                );


            return `
                <div class="skill-item">

                    <div class="skill-header">

                        <span class="skill-name">
                            ${escapeHTML(
                                skill.skill_name
                            )}
                        </span>

                        <span class="skill-percent">
                            ${proficiency}%
                        </span>

                    </div>

                    <div class="skill-progress">

                        <div
                            class="skill-progress-fill"
                            style="width:${proficiency}%"
                        ></div>

                    </div>

                </div>
            `;

        }).join("");
}


/* ============================================================
   SKILLS EDITOR
============================================================ */

function populateSkillsEditor(
    skills
) {

    const container =
        $("skillEditor");

    if (!container) return;


    container.innerHTML = "";


    if (!skills?.length) {

        addSkillRow();

        return;
    }


    skills.forEach(skill => {

        addSkillRow(
            skill.skill_name,
            skill.proficiency
        );
    });
}


/* ============================================================
   ADD SKILL ROW
============================================================ */

function addSkillRow(
    name = "",
    proficiency = 0
) {

    const container =
        $("skillEditor");

    if (!container) return;


    const row =
        document.createElement(
            "div"
        );

    row.className =
        "skill-row";


    row.innerHTML =
        `
        <input
            type="text"
            data-skill-name
            value="${escapeHTML(name)}"
            placeholder="Skill name"
        >

        <input
            type="number"
            data-skill-proficiency
            value="${Number(proficiency) || 0}"
            min="0"
            max="100"
            placeholder="0-100"
        >

        <button
            type="button"
            class="remove-skill-btn"
            title="Remove skill"
        >
            <i class="fa-solid fa-trash"></i>
        </button>
        `;


    const removeButton =
        row.querySelector(
            ".remove-skill-btn"
        );


    removeButton.addEventListener(
        "click",
        () => {

            row.remove();
        }
    );


    container.appendChild(
        row
    );
}


/* ============================================================
   SAVE SKILLS
============================================================ */

async function saveSkills() {

    const rows =
        document.querySelectorAll(
            "#skillEditor .skill-row"
        );

    const skills = [];


    rows.forEach(row => {

        const nameInput =
            row.querySelector(
                "[data-skill-name]"
            );

        const proficiencyInput =
            row.querySelector(
                "[data-skill-proficiency]"
            );


        if (!nameInput) return;


        const name =
            nameInput.value.trim();


        if (!name) return;


        let proficiency =
            Number(
                proficiencyInput?.value || 0
            );


        if (Number.isNaN(proficiency)) {
            proficiency = 0;
        }


        proficiency =
            Math.max(
                0,
                Math.min(
                    100,
                    proficiency
                )
            );


        skills.push({
            skill_name: name,
            proficiency: proficiency
        });
    });


    const saveButton =
        $("saveSkillsButton");


    try {

        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.innerHTML =
                `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Saving...
                `;
        }


        const data =
            await apiFetch(
                `${PROFILE_API}/skills`,
                {
                    method: "PUT",

                    body: JSON.stringify({
                        skills: skills
                    })
                }
            );


        showMessage(
            data?.message ||
            "Skills updated successfully.",
            "success"
        );


        await loadProfile();


        closeModal(
            "skillsModal"
        );


    } catch (error) {

        console.error(
            "SAVE SKILLS ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to update skills.",
            "error"
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.innerHTML =
                `
                Save Skills
                `;
        }
    }
}


/* ============================================================
   SESSIONS
============================================================ */

async function loadSessions() {

    try {

        const data =
            await apiFetch(
                `${PROFILE_API}/sessions`
            );


        renderSessions(
            data?.items || []
        );


        const count =
            data?.active_count || 0;


        setText(
            "sessionCount",
            `${count} Active`
        );


        setText(
            "miniSessionCount",
            `${count} Active`
        );


        return data;

    } catch (error) {

        console.error(
            "SESSIONS ERROR:",
            error
        );

        const container =
            $("sessionsList");

        if (container) {

            container.innerHTML =
                `
                <div class="empty-state">
                    <p>
                        Unable to load sessions.
                    </p>
                </div>
                `;
        }
    }
}


/* ============================================================
   RENDER SESSIONS
============================================================ */

function renderSessions(
    sessions
) {

    const container =
        $("sessionsList");

    if (!container) return;


    if (!sessions.length) {

        container.innerHTML =
            `
            <div class="empty-state">

                <i class="fa-solid fa-laptop"></i>

                <p>
                    No login sessions found.
                </p>

            </div>
            `;

        return;
    }


    container.innerHTML =
        sessions.map(session => {

            const current =
                Boolean(
                    session.is_current
                );


            return `
                <div
                    class="session-item
                    ${current
                        ? "current-session"
                        : ""}"
                >

                    <div class="session-icon">

                        <i class="fa-solid
                            ${getDeviceIcon(
                                session.device
                            )}">
                        </i>

                    </div>


                    <div class="session-info">

                        <div class="session-device">

                            ${escapeHTML(
                                session.device ||
                                "Unknown device"
                            )}

                            ${
                                current
                                    ? `
                                    <span class="current-badge">
                                        Current
                                    </span>
                                    `
                                    : ""
                            }

                        </div>


                        <div class="session-details">

                            ${escapeHTML(
                                session.browser ||
                                "Unknown browser"
                            )}

                            ${
                                session.location
                                    ? ` • ${escapeHTML(
                                        session.location
                                    )}`
                                    : ""
                            }

                        </div>


                        <div class="session-last-active">

                            Last active:
                            ${escapeHTML(
                                formatDateTime(
                                    session.last_active
                                )
                            )}

                        </div>

                    </div>


                    ${
                        !current
                            ? `
                            <button
                                type="button"
                                class="revoke-session-btn"
                                data-session-id="${escapeHTML(
                                    session.id
                                )}"
                            >
                                Revoke
                            </button>
                            `
                            : ""
                    }

                </div>
            `;

        }).join("");


    container
        .querySelectorAll(
            ".revoke-session-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    revokeSession(
                        button.dataset.sessionId
                    );
                }
            );
        });
}


/* ============================================================
   DEVICE ICON
============================================================ */

function getDeviceIcon(
    device
) {

    const text =
        String(device || "")
            .toLowerCase();


    if (
        text.includes("phone") ||
        text.includes("mobile") ||
        text.includes("android") ||
        text.includes("iphone")
    ) {
        return "fa-mobile-screen";
    }


    if (
        text.includes("tablet")
    ) {
        return "fa-tablet-screen-button";
    }


    if (
        text.includes("mac")
    ) {
        return "fa-laptop";
    }


    return "fa-desktop";
}


/* ============================================================
   REVOKE SESSION
============================================================ */

async function revokeSession(
    sessionId
) {

    if (!sessionId) return;


    if (
        !window.confirm(
            "Are you sure you want to revoke this session?"
        )
    ) {
        return;
    }


    try {

        const data =
            await apiFetch(
                `${PROFILE_API}/sessions/${sessionId}`,
                {
                    method: "DELETE"
                }
            );


        showMessage(
            data?.message ||
            "Session revoked successfully.",
            "success"
        );


        await loadSessions();


    } catch (error) {

        console.error(
            "REVOKE SESSION ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to revoke session.",
            "error"
        );
    }
}


/* ============================================================
   REVOKE OTHER SESSIONS
============================================================ */

async function revokeOtherSessions() {

    if (
        !window.confirm(
            "This will sign out all other devices. Continue?"
        )
    ) {
        return;
    }


    try {

        const data =
            await apiFetch(
                `${PROFILE_API}/sessions`,
                {
                    method: "DELETE"
                }
            );


        showMessage(
            data?.message ||
            "Other sessions revoked.",
            "success"
        );


        await loadSessions();


    } catch (error) {

        console.error(
            "REVOKE OTHER SESSIONS ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to revoke other sessions.",
            "error"
        );
    }
}


/* ============================================================
   PREFERENCES SAVE
============================================================ */

async function savePreferences(
    event
) {

    if (event) {
        event.preventDefault();
    }


    const payload = {

        language:
            getValue("prefLanguage") ||
            null,

        timezone:
            getValue("prefTimezone") ||
            null,

        date_format:
            getValue("prefDateFormat") ||
            null,

        time_format:
            getValue("prefTimeFormat") ||
            null,

        currency:
            getValue("prefCurrency") ||
            null,

        theme:
            getValue("prefTheme") ||
            null
    };


    try {

        const data =
            await apiFetch(
                `${PROFILE_API}/preferences`,
                {
                    method: "PUT",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        showMessage(
            data?.message ||
            "Preferences updated successfully.",
            "success"
        );


        if (
            profileData &&
            data?.preferences
        ) {

            profileData.preferences =
                data.preferences;
        }


        applyTheme(
            data?.preferences?.theme ||
            payload.theme
        );


    } catch (error) {

        console.error(
            "PREFERENCES ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to save preferences.",
            "error"
        );
    }
}


/* ============================================================
   APPLY THEME
============================================================ */

function applyTheme(
    theme
) {

    if (!theme) return;


    const normalized =
        String(theme)
            .toLowerCase();


    if (normalized === "dark") {

        document.body.classList.add(
            "dark-theme"
        );

    } else if (
        normalized === "light"
    ) {

        document.body.classList.remove(
            "dark-theme"
        );
    }
}


/* ============================================================
   PROFILE PHOTO
============================================================ */

async function uploadProfilePhoto(
    file
) {

    if (!file) return;


    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (
        !allowedTypes.includes(
            file.type
        )
    ) {

        showMessage(
            "Only JPG, PNG and WEBP images are allowed.",
            "error"
        );

        return;
    }


    if (
        file.size >
        5 * 1024 * 1024
    ) {

        showMessage(
            "Profile image must be smaller than 5 MB.",
            "error"
        );

        return;
    }


    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    try {

        const data =
            await apiFetch(
                `${PROFILE_API}/photo`,
                {
                    method: "POST",
                    body: formData
                }
            );


        if (profileData?.user) {

            profileData.user.profile_image =
                data.profile_image;
        }


        updateProfileImage(
            data.profile_image,
            profileData?.user?.name
        );


        showMessage(
            data?.message ||
            "Profile photo uploaded successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "PHOTO UPLOAD ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to upload profile photo.",
            "error"
        );
    }
}


/* ============================================================
   MODAL
============================================================ */

function openModal(
    id
) {

    const modal =
        $(id);

    if (!modal) return;


    modal.classList.add(
        "active"
    );

    modal.style.display =
        "flex";
}


function closeModal(
    id
) {

    const modal =
        $(id);

    if (!modal) return;


    modal.classList.remove(
        "active"
    );

    modal.style.display =
        "none";
}


/* ============================================================
   MODAL SETUP
============================================================ */

function setupModals() {

    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    closeModal(
                        button.dataset.close
                    );
                }
            );
        });


    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(overlay => {

            overlay.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        overlay
                    ) {

                        closeModal(
                            overlay.id
                        );
                    }
                }
            );
        });


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                document
                    .querySelectorAll(
                        ".modal-overlay.active"
                    )
                    .forEach(modal => {

                        closeModal(
                            modal.id
                        );
                    });
            }
        }
    );
}


/* ============================================================
   EVENT SETUP
============================================================ */

function setupEvents() {


    /* --------------------------------------------------------
       EDIT PROFILE
    -------------------------------------------------------- */

    const editButton =
        $("editProfileButton");

    if (editButton) {

        editButton.addEventListener(
            "click",
            openEditProfile
        );
    }


    /* --------------------------------------------------------
       QUICK EDIT PROFILE
    -------------------------------------------------------- */

    const quickEdit =
        $("quickEditProfile");

    if (quickEdit) {

        quickEdit.addEventListener(
            "click",
            openEditProfile
        );
    }


    /* --------------------------------------------------------
       IMPROVE PROFILE
    -------------------------------------------------------- */

    const improve =
        $("improveProfileButton");

    if (improve) {

        improve.addEventListener(
            "click",
            openEditProfile
        );
    }


    /* --------------------------------------------------------
       EDIT FORM
    -------------------------------------------------------- */

    const profileForm =
        $("profileForm");

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            saveProfile
        );
    }


    /* --------------------------------------------------------
       PASSWORD BUTTONS
    -------------------------------------------------------- */

    [
        "changePasswordButton",
        "changePasswordButton2",
        "quickChangePassword"
    ].forEach(id => {

        const button =
            $(id);

        if (button) {

            button.addEventListener(
                "click",
                () => {

                    openModal(
                        "passwordModal"
                    );
                }
            );
        }
    });


    /* --------------------------------------------------------
       PASSWORD FORM
    -------------------------------------------------------- */

    const passwordForm =
        $("passwordForm");

    if (passwordForm) {

        passwordForm.addEventListener(
            "submit",
            changePassword
        );
    }


    /* --------------------------------------------------------
       2FA
    -------------------------------------------------------- */

    const twoFactor =
        $("twoFactorToggle");

    if (twoFactor) {

        twoFactor.addEventListener(
            "change",
            () => {

                updateTwoFactor(
                    twoFactor.checked
                );
            }
        );
    }


    /* --------------------------------------------------------
       LOGIN NOTIFICATIONS
    -------------------------------------------------------- */

    const loginNotifications =
        $("loginNotificationToggle");

    if (loginNotifications) {

        loginNotifications.addEventListener(
            "change",
            () => {

                updateLoginNotifications(
                    loginNotifications.checked
                );
            }
        );
    }


    /* --------------------------------------------------------
       PREFERENCES FORM
    -------------------------------------------------------- */

    const preferencesForm =
        $("preferencesForm");

    if (preferencesForm) {

        preferencesForm.addEventListener(
            "submit",
            savePreferences
        );
    }


    /* --------------------------------------------------------
       SKILLS MODAL
    -------------------------------------------------------- */

    const viewSkills =
        $("viewSkillsButton");

    if (viewSkills) {

        viewSkills.addEventListener(
            "click",
            () => {

                populateSkillsEditor(
                    profileData?.skills || []
                );

                openModal(
                    "skillsModal"
                );
            }
        );
    }


    /* --------------------------------------------------------
       ADD SKILL
    -------------------------------------------------------- */

    const addSkill =
        $("addSkillButton");

    if (addSkill) {

        addSkill.addEventListener(
            "click",
            () => addSkillRow()
        );
    }


    /* --------------------------------------------------------
       SAVE SKILLS
    -------------------------------------------------------- */

    const saveSkillsButton =
        $("saveSkillsButton");

    if (saveSkillsButton) {

        saveSkillsButton.addEventListener(
            "click",
            saveSkills
        );
    }


    /* --------------------------------------------------------
       PROFILE PHOTO
    -------------------------------------------------------- */

    const photoButton =
        $("photoButton");

    const photoInput =
        $("photoInput");


    if (photoButton && photoInput) {

        photoButton.addEventListener(
            "click",
            () => {

                photoInput.click();
            }
        );


        photoInput.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0];

                if (file) {

                    uploadProfilePhoto(
                        file
                    );
                }
            }
        );
    }


    /* --------------------------------------------------------
       MANAGE SESSIONS
    -------------------------------------------------------- */

    [
        "viewSessionsButton",
        "miniViewHistory",
        "quickManageSessions"
    ].forEach(id => {

        const button =
            $(id);

        if (!button) return;


        button.addEventListener(
            "click",
            async () => {

                /*
                 * Security tab is not included
                 * as a visible tab button in
                 * the supplied HTML.
                 *
                 * Open security modal/section
                 * if available.
                 */

                const security =
                    $("tab-security");

                if (security) {

                    document
                        .querySelectorAll(
                            ".tab-content"
                        )
                        .forEach(
                            section =>
                                section.classList.remove(
                                    "active"
                                )
                        );

                    security.classList.add(
                        "active"
                    );
                }


                await loadSessions();
            }
        );
    });


    /* --------------------------------------------------------
       REFRESH ACTIVITY
    -------------------------------------------------------- */

    const refreshActivity =
        $("refreshActivity");

    if (refreshActivity) {

        refreshActivity.addEventListener(
            "click",
            () => loadActivity(10)
        );
    }


    /* --------------------------------------------------------
       VIEW ALL ACTIVITY
    -------------------------------------------------------- */

    const viewAllActivity =
        $("viewAllActivity");

    if (viewAllActivity) {

        viewAllActivity.addEventListener(
            "click",
            () => {

                const activity =
                    $("tab-activity");

                if (activity) {

                    document
                        .querySelectorAll(
                            ".tab-content"
                        )
                        .forEach(
                            section =>
                                section.classList.remove(
                                    "active"
                                )
                        );

                    activity.classList.add(
                        "active"
                    );
                }

                loadActivity(50);
            }
        );
    }


    /* --------------------------------------------------------
       DOWNLOAD PROFILE
    -------------------------------------------------------- */

    const downloadProfile =
        $("downloadProfile");

    if (downloadProfile) {

        downloadProfile.addEventListener(
            "click",
            downloadProfileData
        );
    }


    /* --------------------------------------------------------
       EXPORT DATA
    -------------------------------------------------------- */

    const exportData =
        $("exportData");

    if (exportData) {

        exportData.addEventListener(
            "click",
            exportUserData
        );
    }
}


/* ============================================================
   DOWNLOAD PROFILE
============================================================ */

function downloadProfileData() {

    if (!profileData?.user) {

        showMessage(
            "Profile data is not available.",
            "error"
        );

        return;
    }


    const user =
        profileData.user;


    const text =
        `
VendorIQ - Procurement Manager Profile
========================================

Name: ${user.name || ""}
Email: ${user.email || ""}
Mobile: ${user.mobile || ""}
Employee ID: ${user.employee_id || ""}
Department: ${user.department || ""}
Job Title: ${user.job_title || ""}
Location: ${user.location || ""}
Date of Joining: ${formatDate(user.date_of_joining)}
Nationality: ${user.nationality || ""}
Languages: ${user.languages || ""}
Address: ${user.address || ""}

About Me
--------
${user.about_me || ""}
`;


    const blob =
        new Blob(
            [text],
            {
                type:
                    "text/plain;charset=utf-8"
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
        "VendorIQ-Profile.txt";

    link.click();


    URL.revokeObjectURL(
        url
    );
}


/* ============================================================
   EXPORT DATA
============================================================ */

function exportUserData() {

    if (!profileData) {

        showMessage(
            "Profile data is not available.",
            "error"
        );

        return;
    }


    const blob =
        new Blob(
            [
                JSON.stringify(
                    profileData,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
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
        "VendorIQ-Profile-Data.json";

    link.click();


    URL.revokeObjectURL(
        url
    );


    showMessage(
        "Profile data exported successfully.",
        "success"
    );
}


/* ============================================================
   INITIALIZATION
============================================================ */

async function initializeProfile() {

    try {

        setupEvents();

        setupModals();

        setupPasswordToggles();


        const data =
            await loadProfile();


        await loadActivity(10);

        await loadSessions();


        applyTheme(
            data?.preferences?.theme
        );


        console.log(
            "Procurement profile initialized successfully."
        );


    } catch (error) {

        console.error(
            "PROFILE INITIALIZATION ERROR:",
            error
        );
    }
}


/* ============================================================
   DOM READY
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeProfile
    );

} else {

    initializeProfile();
}


/* ============================================================
   GLOBAL EXPORTS
============================================================ */

window.ProcurementProfile = {

    loadProfile,

    saveProfile,

    changePassword,

    updateTwoFactor,

    updateLoginNotifications,

    loadActivity,

    loadSessions,

    revokeSession,

    revokeOtherSessions,

    savePreferences,

    uploadProfilePhoto,

    saveSkills,

    addSkillRow,

    openModal,

    closeModal
};