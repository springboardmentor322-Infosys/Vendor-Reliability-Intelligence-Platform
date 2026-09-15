"use strict";


/* ============================================================
   CONFIGURATION
============================================================ */

const API_BASE = window.location.origin;


/* ============================================================
   GLOBAL STATE
============================================================ */

let settingsData = null;
let profileData = null;
let activeSettingsCategory = null;


/* ============================================================
   API HELPER
============================================================ */

async function apiFetch(
    endpoint,
    options = {}
) {

    const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {

        throw new Error(
            "Your session has expired. Please login again."
        );
    }

    let data = null;

    try {
        data = await response.json();
    } catch (_) {
        data = null;
    }

    if (!response.ok) {

        const detail =
            data?.detail ||
            data?.message ||
            `HTTP ${response.status}`;

        throw new Error(detail);
    }

    return data;
}


/* ============================================================
   DOM HELPERS
============================================================ */

function $(id) {
    return document.getElementById(id);
}


function setText(
    id,
    value,
    fallback = "-"
) {

    const element = $(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? fallback
            : value;
}


function boolText(value) {
    return value ? "Enabled" : "Disabled";
}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
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


/* ============================================================
   TOAST
============================================================ */

let toastTimer = null;

function showToast(
    message,
    success = true
) {

    const toast = $("toast");
    const text = $("toastMessage");

    if (!toast || !text) {
        return;
    }

    text.textContent = message;

    const icon =
        toast.querySelector("i");

    if (icon) {

        icon.className = success
            ? "fa-solid fa-circle-check"
            : "fa-solid fa-circle-exclamation";
    }

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(
        () => toast.classList.remove("show"),
        3000
    );
}


/* ============================================================
   LOAD ALL SETTINGS
============================================================ */

async function loadSettings() {

    try {

        const data =
            await apiFetch("/api/settings");

        settingsData = data;

        renderUser(data.user);

        renderProfileFromSettings(data);

        renderCompany(data.company);

        renderFinancial(
            data.system,
            data.business
        );

        renderNotifications(
            data.notifications
        );

        renderSecurity(
            data.system,
            data.user
        );

        renderPreferences(
            data.preferences,
            data.system
        );

        await loadUserSummary();

    } catch (error) {

        console.error(
            "SETTINGS LOAD ERROR:",
            error
        );

        showToast(
            error.message ||
            "Unable to load settings.",
            false
        );
    }
}


/* ============================================================
   USER
============================================================ */

function renderUser(user) {

    if (!user) {
        return;
    }

    setText(
        "sidebarName",
        user.name
    );

    setText(
        "sidebarRole",
        user.role
    );

    setText(
        "topName",
        user.name
    );

    setText(
        "topRole",
        user.role
    );
}


/* ============================================================
   PROFILE
============================================================ */

function renderProfileFromSettings(data) {

    const user = data.user;

    if (!user) {
        return;
    }

    profileData = user;

    setText(
        "profileName",
        user.name
    );

    setText(
        "profileRole",
        user.role
    );

    setText(
        "profileEmail",
        user.email
    );

    setText(
        "profilePhone",
        user.mobile
    );

    setText(
        "fullName",
        user.name
    );

    setText(
        "employeeId",
        user.employee_id
    );

    setText(
        "department",
        user.department
    );

    setText(
        "designation",
        user.job_title
    );

    setText(
        "reportingManager",
        user.reporting_manager_name
    );

    setText(
        "joiningDate",
        formatDate(user.date_of_joining)
    );


    const preferences =
        data.preferences || {};

    setText(
        "timezone",
        preferences.timezone ||
        "(UTC+05:30) Asia/Kolkata"
    );

    setText(
        "language",
        preferences.language ||
        "English (US)"
    );


    if (user.profile_image) {

        const image =
            user.profile_image.startsWith("http")
                ? user.profile_image
                : (
                    user.profile_image.startsWith("/")
                        ? user.profile_image
                        : `/static/${user.profile_image}`
                );

        setProfileImages(image);
    }
}


function setProfileImages(src) {

    const elements = [
        $("profileAvatar"),
        $("topAvatar"),
        $("sidebarAvatar")
    ];

    elements.forEach(
        element => {

            if (element) {
                element.src = src;
            }
        }
    );
}


/* ============================================================
   COMPANY
============================================================ */

function renderCompany(company) {

    if (!company) {
        return;
    }

    setText(
        "companyName",
        company.company_name
    );

    setText(
        "companyIndustry",
        company.industry
    );


    /*
       CompanyProfile currently does not contain
       company_size.

       Therefore don't display fake data.
    */

    setText(
        "companySize",
        company.company_size ||
        "Not configured"
    );
}


/* ============================================================
   FINANCIAL
============================================================ */

function renderFinancial(
    system,
    business
) {

    system = system || {};
    business = business || {};

    setText(
        "currency",
        system.currency
    );

    setText(
        "fiscalYear",
        business.financial_year_start
            ? `${business.financial_year_start} - March`
            : "-"
    );

    /*
       Your current BusinessSettings model does not
       have a GST percentage column.

       Don't hard-code 18%.
    */

    setText(
        "taxRate",
        business.tax_rate !== undefined
            ? `${business.tax_rate}%`
            : "Configured"
    );
}


/* ============================================================
   NOTIFICATIONS
============================================================ */

function renderNotifications(
    notifications
) {

    notifications =
        notifications || {};

    setText(
        "emailNotifications",
        boolText(
            notifications.email_enabled
        )
    );

    setText(
        "smsNotifications",
        boolText(
            notifications.sms_enabled
        )
    );

    setText(
        "inAppNotifications",
        boolText(
            notifications.browser_notifications
        )
    );
}


/* ============================================================
   SECURITY
============================================================ */

function renderSecurity(
    system,
    user
) {

    system = system || {};
    user = user || {};

    setText(
        "twoFactorStatus",
        boolText(
            user.two_factor_enabled ??
            system.two_factor_authentication
        )
    );

    setText(
        "sessionTimeout",
        system.session_timeout
    );

    setText(
        "loginAlerts",
        boolText(
            user.login_email_notifications
        )
    );
}


/* ============================================================
   PREFERENCES
============================================================ */

function renderPreferences(
    preferences,
    system
) {

    preferences =
        preferences || {};

    system =
        system || {};

    setText(
        "theme",
        preferences.theme
    );

    setText(
        "dateFormat",
        preferences.date_format ||
        system.date_format
    );

    setText(
        "numberFormat",
        preferences.number_format ||
        system.number_format
    );
}


/* ============================================================
   USER SUMMARY
============================================================ */

async function loadUserSummary() {

    try {

        /*
         * Do NOT call /api/users here.
         *
         * The backend currently does not expose GET /api/users,
         * which causes:
         *
         * GET /api/users -> 405 Method Not Allowed
         *
         * We already receive the current user from /api/settings.
         */

        const user = settingsData?.user;

        if (!user) {
            setText("totalUsers", "—");
            setText("activeUsers", "—");
            setText("userRoles", "—");
            return;
        }

        /*
         * If /api/settings provides total user statistics,
         * use them when available.
         */
        const summary =
            settingsData?.user_summary ||
            settingsData?.users_summary ||
            settingsData?.summary?.users ||
            null;

        if (summary) {

            setText(
                "totalUsers",
                summary.total ??
                summary.total_users ??
                "—"
            );

            setText(
                "activeUsers",
                summary.active ??
                summary.active_users ??
                "—"
            );

            setText(
                "userRoles",
                summary.roles ??
                summary.total_roles ??
                "—"
            );

            return;
        }

        /*
         * We only know about the currently logged-in user.
         * Don't pretend this represents the whole system.
         */
        setText("totalUsers", "—");
        setText("activeUsers", "—");
        setText("userRoles", "—");

    } catch (error) {

        console.warn(
            "USER SUMMARY:",
            error.message
        );

        setText("totalUsers", "—");
        setText("activeUsers", "—");
        setText("userRoles", "—");
    }
}


/* ============================================================
   PROFILE MODAL
============================================================ */

function openProfileModal() {

    if (!profileData) {
        return;
    }

    $("editName").value =
        profileData.name || "";

    $("editEmail").value =
        profileData.email || "";

    $("editAlternateEmail").value =
        profileData.alternate_email || "";

    $("editMobile").value =
        profileData.mobile || "";

    $("editDepartment").value =
        profileData.department || "";

    $("editJobTitle").value =
        profileData.job_title || "";

    $("editLocation").value =
        profileData.location || "";

    $("editJoiningDate").value =
        profileData.date_of_joining
            ? profileData.date_of_joining.substring(0, 10)
            : "";

    $("editAddress").value =
        profileData.address || "";

    $("profileModal")
        .classList.add("show");
}


async function saveProfile(event) {

    event.preventDefault();

    const payload = {

        name:
            $("editName").value.trim(),

        email:
            $("editEmail").value.trim(),

        alternate_email:
            $("editAlternateEmail").value.trim() ||
            null,

        mobile:
            $("editMobile").value.trim() ||
            null,

        department:
            $("editDepartment").value.trim() ||
            null,

        job_title:
            $("editJobTitle").value.trim() ||
            null,

        location:
            $("editLocation").value.trim() ||
            null,

        date_of_joining:
            $("editJoiningDate").value ||
            null,

        address:
            $("editAddress").value.trim() ||
            null,

        reporting_manager_id:
            profileData.reporting_manager_id || null
    };


    try {

        await apiFetch(
            "/api/profile/me",
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        closeModal("profileModal");

        showToast(
            "Profile updated successfully."
        );

        await loadSettings();

    } catch (error) {

        console.error(
            "PROFILE UPDATE:",
            error
        );

        showToast(
            error.message ||
            "Unable to update profile.",
            false
        );
    }
}


/* ============================================================
   PASSWORD
============================================================ */

async function changePassword(event) {

    event.preventDefault();

    const currentPassword =
        $("currentPassword").value;

    const newPassword =
        $("newPassword").value;

    const confirmPassword =
        $("confirmPassword").value;


    if (newPassword !== confirmPassword) {

        showToast(
            "New passwords do not match.",
            false
        );

        return;
    }


    try {

        await apiFetch(
            "/api/profile/password",
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


        $("passwordForm").reset();

        showToast(
            "Password updated successfully."
        );

    } catch (error) {

        showToast(
            error.message ||
            "Unable to update password.",
            false
        );
    }
}


/* ============================================================
   PASSWORD VISIBILITY
============================================================ */

function setupPasswordToggles() {

    document
        .querySelectorAll(".password-toggle")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        $(button.dataset.target);

                    if (!target) {
                        return;
                    }

                    target.type =
                        target.type === "password"
                            ? "text"
                            : "password";

                    const icon =
                        button.querySelector("i");

                    if (icon) {

                        icon.className =
                            target.type === "password"
                                ? "fa-regular fa-eye-slash"
                                : "fa-regular fa-eye";
                    }
                }
            );
        });
}


/* ============================================================
   CATEGORY NAVIGATION
============================================================ */

function setupCategoryNavigation() {

    document
        .querySelectorAll(".category-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".category-item")
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "selected"
                                )
                        );

                    button.classList.add(
                        "selected"
                    );

                    const category =
                        button.dataset.category;

                    if (category === "profile") {

                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });

                        return;
                    }

                    openSettingsCategory(
                        category
                    );
                }
            );
        });


    document
        .querySelectorAll(".manage-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openSettingsCategory(
                        button.dataset.category
                    );
                }
            );
        });
}


/* ============================================================
   SETTINGS CATEGORY MODALS
============================================================ */

function openSettingsCategory(category) {

    activeSettingsCategory =
        category;

    const title =
        $("settingsModalTitle");

    const description =
        $("settingsModalDescription");

    const content =
        $("settingsFormContent");


    if (!title || !content) {
        return;
    }


    const system =
        settingsData?.system || {};

    const company =
        settingsData?.company || {};

    const business =
        settingsData?.business || {};

    const preferences =
        settingsData?.preferences || {};

    const notifications =
        settingsData?.notifications || {};


    switch (category) {

        case "company":

            title.textContent =
                "Company Settings";

            description.textContent =
                "Manage your company information.";

            content.innerHTML =
                companyForm(company);

            break;


        case "financial":

            title.textContent =
                "Financial Settings";

            description.textContent =
                "Configure financial preferences.";

            content.innerHTML =
                financialForm(
                    business,
                    system
                );

            break;


        case "notifications":

            title.textContent =
                "Notification Settings";

            description.textContent =
                "Configure notification preferences.";

            content.innerHTML =
                notificationForm(
                    notifications
                );

            break;


        case "security":

            title.textContent =
                "Security Settings";

            description.textContent =
                "Manage system security settings.";

            content.innerHTML =
                securityForm(system);

            break;


        case "preferences":

            title.textContent =
                "Preferences";

            description.textContent =
                "Customize your application experience.";

            content.innerHTML =
                preferencesForm(
                    preferences,
                    system
                );

            break;


        case "integrations":

            title.textContent =
                "Integrations";

            description.textContent =
                "Manage connected integrations.";

            content.innerHTML =
                integrationsForm(
                    settingsData?.integrations || []
                );

            break;


        case "users":

            title.textContent =
                "Users & Permissions";

            description.textContent =
                "Manage application users and roles.";

            content.innerHTML =
                `
                <div class="setting-switch">
                    <span>
                        Open User Management
                    </span>

                    <button
                        type="button"
                        class="primary-btn"
                        id="openUsersButton"
                    >
                        Open
                    </button>
                </div>
                `;

            break;


        case "audit":

            title.textContent =
                "Audit Logs";

            description.textContent =
                "Review your recent system activity.";

            content.innerHTML =
                `
                <div id="auditLogContainer">
                    Loading activity...
                </div>
                `;

            loadAuditLogs();

            break;


        default:
            return;
    }


    $("settingsModal")
        .classList.add("show");
}


/* ============================================================
   COMPANY FORM
============================================================ */

function companyForm(company) {

    return `
        <div class="dynamic-grid">

            <div class="form-group">
                <label>Company Name</label>
                <input
                    id="settingCompanyName"
                    value="${escapeHtml(company.company_name || "")}"
                    required
                >
            </div>

            <div class="form-group">
                <label>Company ID</label>
                <input
                    id="settingCompanyId"
                    value="${escapeHtml(company.company_id || "")}"
                    required
                >
            </div>

            <div class="form-group">
                <label>Industry</label>
                <input
                    id="settingIndustry"
                    value="${escapeHtml(company.industry || "")}"
                >
            </div>

            <div class="form-group">
                <label>Phone</label>
                <input
                    id="settingCompanyPhone"
                    value="${escapeHtml(company.phone || "")}"
                >
            </div>

            <div class="form-group">
                <label>Email</label>
                <input
                    type="email"
                    id="settingCompanyEmail"
                    value="${escapeHtml(company.email || "")}"
                >
            </div>

            <div class="form-group">
                <label>Website</label>
                <input
                    id="settingWebsite"
                    value="${escapeHtml(company.website || "")}"
                >
            </div>

            <div class="form-group full">
                <label>Address</label>
                <textarea id="settingCompanyAddress">${escapeHtml(company.address || "")}</textarea>
            </div>

        </div>
    `;
}


/* ============================================================
   FINANCIAL FORM
============================================================ */

function financialForm(
    business,
    system
) {

    return `
        <div class="dynamic-grid">

            <div class="form-group">
                <label>Financial Year Start</label>
                <select id="settingFiscalYear">
                    ${option("January", business.financial_year_start)}
                    ${option("April", business.financial_year_start)}
                    ${option("July", business.financial_year_start)}
                    ${option("October", business.financial_year_start)}
                </select>
            </div>

            <div class="form-group">
                <label>Default Payment Terms</label>
                <input
                    id="settingPaymentTerms"
                    value="${escapeHtml(business.default_payment_terms || "Net 30 Days")}"
                >
            </div>

            <div class="form-group">
                <label>Currency</label>
                <input
                    id="settingCurrency"
                    value="${escapeHtml(system.currency || "")}"
                >
            </div>

            <div class="setting-switch">
                <span>Tax Calculation</span>

                <label class="switch">
                    <input
                        type="checkbox"
                        id="settingTaxCalculation"
                        ${business.tax_calculation ? "checked" : ""}
                    >
                    <span class="slider"></span>
                </label>
            </div>

            <div class="setting-switch">
                <span>Multi Currency</span>

                <label class="switch">
                    <input
                        type="checkbox"
                        id="settingMultiCurrency"
                        ${business.multi_currency ? "checked" : ""}
                    >
                    <span class="slider"></span>
                </label>
            </div>

        </div>
    `;
}


/* ============================================================
   NOTIFICATION FORM
============================================================ */

function notificationForm(settings) {

    return `
        <div class="dynamic-grid">

            ${notificationSwitch(
                "Email Notifications",
                "email_enabled",
                settings.email_enabled
            )}

            ${notificationSwitch(
                "Vendor Registration",
                "vendor_registration",
                settings.vendor_registration
            )}

            ${notificationSwitch(
                "Purchase Order Updates",
                "po_updates",
                settings.po_updates
            )}

            ${notificationSwitch(
                "Contract Expiration",
                "contract_expiration",
                settings.contract_expiration
            )}

            ${notificationSwitch(
                "SMS Notifications",
                "sms_enabled",
                settings.sms_enabled
            )}

            ${notificationSwitch(
                "Urgent SMS",
                "urgent_sms",
                settings.urgent_sms
            )}

            ${notificationSwitch(
                "Browser Notifications",
                "browser_notifications",
                settings.browser_notifications
            )}

            ${notificationSwitch(
                "Notification Sound",
                "notification_sound",
                settings.notification_sound
            )}

        </div>
    `;
}


function notificationSwitch(
    label,
    name,
    checked
) {

    return `
        <div class="setting-switch">

            <span>${escapeHtml(label)}</span>

            <label class="switch">

                <input
                    type="checkbox"
                    id="notification_${name}"
                    ${checked ? "checked" : ""}
                >

                <span class="slider"></span>

            </label>

        </div>
    `;
}


/* ============================================================
   SECURITY FORM
============================================================ */

function securityForm(system) {

    return `
        <div class="dynamic-grid">

            <div class="setting-switch">

                <span>
                    Two-Factor Authentication
                </span>

                <label class="switch">

                    <input
                        type="checkbox"
                        id="security_two_factor_authentication"
                        ${system.two_factor_authentication ? "checked" : ""}
                    >

                    <span class="slider"></span>

                </label>

            </div>


            <div class="setting-switch">

                <span>
                    Password Complexity
                </span>

                <label class="switch">

                    <input
                        type="checkbox"
                        id="security_password_complexity"
                        ${system.password_complexity ? "checked" : ""}
                    >

                    <span class="slider"></span>

                </label>

            </div>


            <div class="form-group">

                <label>Password Expiry</label>

                <select id="securityPasswordExpiry">

                    ${option(
                        "30 Days",
                        system.password_expiry
                    )}

                    ${option(
                        "60 Days",
                        system.password_expiry
                    )}

                    ${option(
                        "90 Days",
                        system.password_expiry
                    )}

                    ${option(
                        "Never",
                        system.password_expiry
                    )}

                </select>

            </div>


            <div class="form-group">

                <label>Session Timeout</label>

                <select id="securitySessionTimeout">

                    ${option(
                        "15 Minutes",
                        system.session_timeout
                    )}

                    ${option(
                        "30 Minutes",
                        system.session_timeout
                    )}

                    ${option(
                        "60 Minutes",
                        system.session_timeout
                    )}

                    ${option(
                        "120 Minutes",
                        system.session_timeout
                    )}

                </select>

            </div>


            <div class="form-group">

                <label>
                    Maximum Login Attempts
                </label>

                <input
                    type="number"
                    id="securityMaxAttempts"
                    min="1"
                    max="20"
                    value="${system.max_login_attempts || 5}"
                >

            </div>

        </div>
    `;
}


/* ============================================================
   PREFERENCES FORM
============================================================ */

function preferencesForm(
    preferences,
    system
) {

    return `
        <div class="dynamic-grid">

            <div class="form-group">
                <label>Language</label>

                <select id="prefLanguage">
                    ${option(
                        "English (US)",
                        preferences.language
                    )}
                    ${option(
                        "English (UK)",
                        preferences.language
                    )}
                </select>
            </div>

            <div class="form-group">
                <label>Time Zone</label>

                <input
                    id="prefTimezone"
                    value="${escapeHtml(
                        preferences.timezone ||
                        "(UTC+05:30) Asia/Kolkata"
                    )}"
                >
            </div>

            <div class="form-group">
                <label>Date Format</label>

                <select id="prefDateFormat">
                    ${option(
                        "MM/DD/YYYY",
                        preferences.date_format
                    )}
                    ${option(
                        "DD/MM/YYYY",
                        preferences.date_format
                    )}
                    ${option(
                        "DD MMM YYYY",
                        preferences.date_format
                    )}
                </select>
            </div>

            <div class="form-group">
                <label>Time Format</label>

                <select id="prefTimeFormat">
                    ${option(
                        "12 Hour (AM/PM)",
                        preferences.time_format
                    )}
                    ${option(
                        "24 Hour",
                        preferences.time_format
                    )}
                </select>
            </div>

            <div class="form-group">
                <label>Currency</label>

                <input
                    id="prefCurrency"
                    value="${escapeHtml(
                        preferences.currency ||
                        system.currency ||
                        ""
                    )}"
                >
            </div>

            <div class="form-group">
                <label>Theme</label>

                <select id="prefTheme">
                    ${option(
                        "Light",
                        preferences.theme
                    )}
                    ${option(
                        "Dark",
                        preferences.theme
                    )}
                    ${option(
                        "System",
                        preferences.theme
                    )}
                </select>
            </div>

            <div class="form-group">
                <label>Number Format</label>

                <input
                    id="prefNumberFormat"
                    value="${escapeHtml(
                        preferences.number_format ||
                        system.number_format ||
                        "1,234.56"
                    )}"
                >
            </div>

            <div class="form-group">
                <label>Measurement Unit</label>

                <input
                    id="prefMeasurementUnit"
                    value="${escapeHtml(
                        preferences.measurement_unit ||
                        system.measurement_unit ||
                        "Metric"
                    )}"
                >
            </div>

            <div class="form-group">
                <label>Default Dashboard</label>

                <input
                    id="prefDashboard"
                    value="${escapeHtml(
                        preferences.default_dashboard ||
                        system.default_dashboard ||
                        ""
                    )}"
                >
            </div>

            <div class="form-group">
                <label>Items Per Page</label>

                <input
                    type="number"
                    id="prefItemsPerPage"
                    min="1"
                    max="100"
                    value="${system.items_per_page || 10}"
                >
            </div>

        </div>
    `;
}


/* ============================================================
   INTEGRATIONS
============================================================ */

function integrationsForm(
    integrations
) {

    if (!integrations.length) {

        return `
            <div class="setting-switch">
                <span>
                    No integrations configured.
                </span>
            </div>
        `;
    }


    return integrations
        .map(
            integration => `
                <div class="setting-switch">

                    <span>
                        <strong>
                            ${escapeHtml(
                                integration.integration_name
                            )}
                        </strong>
                        <br>
                        ${escapeHtml(
                            integration.provider_name || ""
                        )}
                    </span>

                    <button
                        type="button"
                        class="primary-btn integration-toggle"
                        data-id="${integration.id}"
                    >
                        ${
                            integration.status === "Connected"
                                ? "Disconnect"
                                : "Connect"
                        }
                    </button>

                </div>
            `
        )
        .join("");
}


/* ============================================================
   AUDIT LOGS
============================================================ */

async function loadAuditLogs() {

    const container =
        $("auditLogContainer");

    if (!container) {
        return;
    }

    try {

        const response =
            await apiFetch(
                "/api/profile/activity?limit=10"
            );

        const items =
            response.items || [];

        if (!items.length) {

            container.innerHTML =
                `<p>No activity found.</p>`;

            return;
        }

        container.innerHTML =
            items
                .map(
                    item => `
                        <div
                            style="
                                border-bottom:1px solid #e7ebf1;
                                padding:12px 0;
                            "
                        >
                            <strong>
                                ${escapeHtml(
                                    item.action || ""
                                )}
                            </strong>

                            <div
                                style="
                                    margin-top:4px;
                                    color:#66728a;
                                    font-size:9px;
                                "
                            >
                                ${escapeHtml(
                                    item.description || ""
                                )}
                            </div>

                            <div
                                style="
                                    margin-top:5px;
                                    color:#8a95a7;
                                    font-size:8px;
                                "
                            >
                                ${formatDate(
                                    item.created_at
                                )}
                            </div>
                        </div>
                    `
                )
                .join("");

    } catch (error) {

        container.innerHTML =
            `<p>Unable to load audit logs.</p>`;
    }
}


/* ============================================================
   SAVE SETTINGS
============================================================ */

async function saveSettings(event) {

    event.preventDefault();

    try {

        switch (
            activeSettingsCategory
        ) {

            case "company":
                await saveCompany();
                break;

            case "financial":
                await saveFinancial();
                break;

            case "notifications":
                await saveNotifications();
                break;

            case "security":
                await saveSecurity();
                break;

            case "preferences":
                await savePreferences();
                break;

            default:
                return;
        }


        closeModal(
            "settingsModal"
        );

        showToast(
            "Settings saved successfully."
        );

        await loadSettings();

    } catch (error) {

        console.error(
            "SETTINGS SAVE:",
            error
        );

        showToast(
            error.message ||
            "Unable to save settings.",
            false
        );
    }
}


/* ============================================================
   SAVE COMPANY
============================================================ */

async function saveCompany() {

    const payload = {

        company_name:
            $("settingCompanyName").value.trim(),

        company_id:
            $("settingCompanyId").value.trim(),

        industry:
            $("settingIndustry").value.trim() ||
            null,

        phone:
            $("settingCompanyPhone").value.trim() ||
            null,

        email:
            $("settingCompanyEmail").value.trim() ||
            null,

        website:
            $("settingWebsite").value.trim() ||
            null,

        address:
            $("settingCompanyAddress").value.trim() ||
            null
    };


    await apiFetch(
        "/api/settings/company",
        {
            method: "PUT",
            body: JSON.stringify(payload)
        }
    );
}


/* ============================================================
   SAVE FINANCIAL
============================================================ */

async function saveFinancial() {

    const business =
        settingsData?.business || {};

    const payload = {

        financial_year_start:
            $("settingFiscalYear").value,

        default_warehouse_id:
            business.default_warehouse_id || null,

        default_supplier_id:
            business.default_supplier_id || null,

        default_payment_terms:
            $("settingPaymentTerms").value.trim(),

        tax_calculation:
            $("settingTaxCalculation").checked,

        multi_currency:
            $("settingMultiCurrency").checked
    };


    await apiFetch(
        "/api/settings/business",
        {
            method: "PUT",
            body: JSON.stringify(payload)
        }
    );
}


/* ============================================================
   SAVE NOTIFICATIONS
============================================================ */

async function saveNotifications() {

    const names = [
        "email_enabled",
        "vendor_registration",
        "po_updates",
        "contract_expiration",
        "sms_enabled",
        "urgent_sms",
        "browser_notifications",
        "notification_sound"
    ];

    const payload = {};

    names.forEach(
        name => {

            const element =
                $(`notification_${name}`);

            payload[name] =
                element
                    ? element.checked
                    : false;
        }
    );


    await apiFetch(
        "/api/settings/notifications",
        {
            method: "PUT",
            body: JSON.stringify(payload)
        }
    );
}


/* ============================================================
   SAVE SECURITY
============================================================ */

async function saveSecurity() {

    const payload = {

        two_factor_authentication:
            $("security_two_factor_authentication")
                .checked,

        password_complexity:
            $("security_password_complexity")
                .checked,

        password_expiry:
            $("securityPasswordExpiry").value,

        session_timeout:
            $("securitySessionTimeout").value,

        max_login_attempts:
            Number(
                $("securityMaxAttempts").value
            )
    };


    await apiFetch(
        "/api/settings/security",
        {
            method: "PUT",
            body: JSON.stringify(payload)
        }
    );
}


/* ============================================================
   SAVE PREFERENCES
============================================================ */

async function savePreferences() {

    const payload = {

        date_format:
            $("prefDateFormat").value,

        time_format:
            $("prefTimeFormat").value,

        number_format:
            $("prefNumberFormat").value,

        measurement_unit:
            $("prefMeasurementUnit").value,

        default_dashboard:
            $("prefDashboard").value,

        items_per_page:
            Number(
                $("prefItemsPerPage").value
            ),

        currency:
            $("prefCurrency").value,

        theme:
            $("prefTheme").value
    };


    await apiFetch(
        "/api/settings/preferences",
        {
            method: "PUT",
            body: JSON.stringify(payload)
        }
    );


    /*
       Also update profile-specific
       preferences such as language/timezone.
    */

    await apiFetch(
        "/api/profile/preferences",
        {
            method: "PUT",
            body: JSON.stringify({

                language:
                    $("prefLanguage").value,

                timezone:
                    $("prefTimezone").value,

                date_format:
                    $("prefDateFormat").value,

                time_format:
                    $("prefTimeFormat").value,

                currency:
                    $("prefCurrency").value,

                theme:
                    $("prefTheme").value
            })
        }
    );
}


/* ============================================================
   INTEGRATION TOGGLE
============================================================ */

document.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                ".integration-toggle"
            );

        if (!button) {
            return;
        }

        const id =
            button.dataset.id;

        try {

            await apiFetch(
                `/api/settings/integrations/${id}/toggle`,
                {
                    method: "POST"
                }
            );

            showToast(
                "Integration status updated."
            );

            await loadSettings();

            openSettingsCategory(
                "integrations"
            );

        } catch (error) {

            showToast(
                error.message ||
                "Unable to update integration.",
                false
            );
        }
    }
);


/* ============================================================
   PHOTO UPLOAD
============================================================ */

async function uploadProfilePhoto(
    event
) {

    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }


    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );


    const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");


    try {

        const response =
            await fetch(
                `${API_BASE}/api/profile/photo`,
                {
                    method: "POST",
                    headers: token
                        ? {
                            Authorization:
                                `Bearer ${token}`
                        }
                        : {},
                    body: formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to upload profile photo."
            );
        }


        if (data.profile_image) {

            setProfileImages(
                data.profile_image
            );
        }

        showToast(
            "Profile photo updated."
        );

    } catch (error) {

        showToast(
            error.message,
            false
        );
    }
}


/* ============================================================
   MODAL
============================================================ */

function closeModal(
    id
) {

    const modal =
        $(id);

    if (modal) {
        modal.classList.remove("show");
    }
}


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
        .querySelectorAll(".modal")
        .forEach(modal => {

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
        });
}


/* ============================================================
   HELPER FUNCTIONS
============================================================ */

function switchField(
    label,
    name,
    checked
) {

    return `
        <div class="setting-switch">

            <span>${label}</span>

            <label class="switch">

                <input
                    type="checkbox"
                    id="${name.startsWith("notification_")
                        ? name
                        : (
                            activeSettingsCategory === "security"
                                ? `security_${name}`
                                : `notification_${name}`
                        )}"
                    ${checked ? "checked" : ""}
                >

                <span class="slider"></span>

            </label>

        </div>
    `;
}


function option(
    value,
    selected
) {

    return `
        <option
            value="${escapeHtml(value)}"
            ${value === selected ? "selected" : ""}
        >
            ${escapeHtml(value)}
        </option>
    `;
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   EDIT PROFILE
============================================================ */

function setupProfileEvents() {

    $("editProfileBtn")
        ?.addEventListener(
            "click",
            openProfileModal
        );

    $("profileForm")
        ?.addEventListener(
            "submit",
            saveProfile
        );

    $("passwordForm")
        ?.addEventListener(
            "submit",
            changePassword
        );

    $("profilePhotoInput")
        ?.addEventListener(
            "change",
            uploadProfilePhoto
        );
}


/* ============================================================
   SETTINGS FORM
============================================================ */

function setupSettingsForm() {

    $("settingsForm")
        ?.addEventListener(
            "submit",
            saveSettings
        );
}


/* ============================================================
   GLOBAL SEARCH
============================================================ */

function setupSearch() {

    const search =
        $("globalSearch");

    if (!search) {
        return;
    }

    search.addEventListener(
        "input",
        () => {

            const value =
                search.value
                    .trim()
                    .toLowerCase();

            document
                .querySelectorAll(
                    ".summary-card, .category-item"
                )
                .forEach(element => {

                    const text =
                        element.textContent
                            .toLowerCase();

                    element.style.display =
                        !value ||
                        text.includes(value)
                            ? ""
                            : "none";
                });
        }
    );
}


/* ============================================================
   INITIALIZE
============================================================ */

async function initializeSettings() {

    setupPasswordToggles();

    setupCategoryNavigation();

    setupModals();

    setupProfileEvents();

    setupSettingsForm();

    setupSearch();

    await loadSettings();
}


document.addEventListener(
    "DOMContentLoaded",
    initializeSettings
);