"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000";


/* =========================================================
   VENDOR ID
========================================================= */

const vendorId =
    localStorage.getItem("vendor_id") ||
    sessionStorage.getItem("vendor_id");


/* =========================================================
   AUTH TOKEN
========================================================= */

function getAuthToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        ""
    );
}


/* =========================================================
   REQUEST HEADERS
========================================================= */

function getRequestHeaders(includeJSON = false) {

    const headers = {};

    if (includeJSON) {
        headers["Content-Type"] =
            "application/json";
    }

    const token = getAuthToken();

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    return headers;
}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "VendorIQ Settings initialized"
        );


        if (!vendorId) {

            showToast(
                "Vendor ID not found. Please login again.",
                "error"
            );

            return;
        }


        initializeTabs();

        initializeActionButtons();

        initializeModalEvents();

        initializeIntegrationButtons();

        initializeHelpButton();

        initializeCloseAccount();

        initializeSearch();

        loadSettings();

    }
);


/* =========================================================
   TABS
========================================================= */

function initializeTabs() {

    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    const section =
                        tab.dataset.section;

                    if (!section) {
                        return;
                    }

                    switchSection(section);

                }
            );

        });

}


function switchSection(sectionName) {

    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.classList.toggle(
                "active",
                tab.dataset.section ===
                sectionName
            );

        });


    document
        .querySelectorAll(".section")
        .forEach(section => {

            section.classList.remove(
                "active"
            );

        });


    const section =
        document.getElementById(
            sectionName
        );


    if (section) {

        section.classList.add(
            "active"
        );

    }

}


/* =========================================================
   ACTION BUTTONS
========================================================= */

function initializeActionButtons() {

    document
        .querySelectorAll(".outline-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const editType =
                        button.dataset.edit;

                    const section =
                        button.dataset.sectionLink;


                    if (
                        editType ===
                        "company"
                    ) {

                        openCompanyModal();

                        return;
                    }


                    if (
                        editType ===
                        "tax"
                    ) {

                        openTaxModal();

                        return;
                    }


                    if (
                        section ===
                        "notifications"
                    ) {

                        switchSection(
                            "notifications"
                        );

                        openNotificationModal();

                        return;
                    }


                    if (
                        section ===
                        "documents"
                    ) {

                        switchSection(
                            "documents"
                        );

                        openDocumentModal();

                        return;
                    }


                    if (
                        section ===
                        "security"
                    ) {

                        switchSection(
                            "security"
                        );

                        openSecurityModal();

                        return;
                    }


                    if (
                        section ===
                        "preferences"
                    ) {

                        switchSection(
                            "preferences"
                        );

                        openPreferencesModal();

                    }

                }
            );

        });

}


/* =========================================================
   MODAL
========================================================= */

let currentModalType = null;


function initializeModalEvents() {

    const modal =
        document.getElementById(
            "settingsModal"
        );

    const closeButton =
        document.getElementById(
            "closeModalBtn"
        );

    const cancelButton =
        document.getElementById(
            "cancelModalBtn"
        );

    const form =
        document.getElementById(
            "settingsForm"
        );


    closeButton?.addEventListener(
        "click",
        closeModal
    );


    cancelButton?.addEventListener(
        "click",
        closeModal
    );


    modal?.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                modal?.classList.contains(
                    "show"
                )
            ) {

                closeModal();

            }

        }
    );


    form?.addEventListener(
        "submit",
        saveModalSettings
    );

}


function showModal() {

    const modal =
        document.getElementById("settingsModal");

    if (!modal) return;

    modal.removeAttribute("inert");

    modal.setAttribute("aria-hidden", "false");

    modal.classList.add("show");

    document.body.classList.add("modal-open");
}


function closeModal() {

    const modal =
        document.getElementById("settingsModal");

    if (!modal) return;

    // Move focus away first
    if (
        document.activeElement &&
        modal.contains(document.activeElement)
    ) {
        document.activeElement.blur();
    }

    // Prevent focus while hidden
    modal.setAttribute("inert", "");

    // Hide from assistive technology
    modal.setAttribute("aria-hidden", "true");

    modal.classList.remove("show");

    document.body.classList.remove("modal-open");
}


function hideAllModalForms() {
    document.querySelectorAll(".modal-form-section").forEach(section => {

        section.classList.remove("active");

        section.querySelectorAll(
            "input, select, textarea, button"
        ).forEach(field => {
            field.disabled = true;
        });
    });
}


function activateModalForm(id) {

    hideAllModalForms();

    const section = document.getElementById(id);

    if (!section) {
        console.error(`Modal section not found: ${id}`);
        return;
    }

    section.classList.add("active");

    section.querySelectorAll(
        "input, select, textarea, button"
    ).forEach(field => {
        field.disabled = false;
    });
}


function setModalTitle(
    title,
    description
) {

    const titleElement =
        document.getElementById(
            "modalTitle"
        );

    const descriptionElement =
        document.getElementById(
            "modalDescription"
        );


    if (titleElement) {

        titleElement.textContent =
            title;

    }


    if (descriptionElement) {

        descriptionElement.textContent =
            description;

    }

}


/* =========================================================
   COMPANY MODAL
========================================================= */

function openCompanyModal() {

    currentModalType =
        "company";


    setModalTitle(
        "Edit Company Information",
        "Update your company details and contact information."
    );


    setInputValue(
        "editCompanyName",
        getText("companyName")
    );


    setInputValue(
        "editPhone",
        getText("phone")
    );


    setInputValue(
        "editWebsite",
        getText("website")
    );


    setInputValue(
        "editEmail",
        getText("email")
    );


    setInputValue(
        "editPrimaryContact",
        getText("primaryContact")
    );


    activateModalForm(
        "companyForm"
    );


    showModal();

}


/* =========================================================
   TAX MODAL
========================================================= */

function openTaxModal() {

    currentModalType =
        "tax";


    setModalTitle(
        "Business & Tax Details",
        "Update business registration and tax information."
    );


    setInputValue(
        "editBusinessType",
        getText("businessType")
    );


    setInputValue(
        "editGstVat",
        getText("gstVat")
    );


    setInputValue(
        "editTaxId",
        getText("taxId")
    );


    setInputValue(
        "editPanNumber",
        getText("panNumber")
    );


    activateModalForm(
        "taxForm"
    );


    showModal();

}


/* =========================================================
   NOTIFICATION MODAL
========================================================= */

function openNotificationModal() {

    currentModalType =
        "notifications";


    setModalTitle(
        "Notification Preferences",
        "Choose how you want to receive notifications and alerts."
    );


    const email =
        document.getElementById(
            "editEmailNotifications"
        );

    const system =
        document.getElementById(
            "editSystemNotifications"
        );

    const sms =
        document.getElementById(
            "editSmsNotifications"
        );


    if (email) {

        email.checked =
            getText(
                "emailNotifications"
            )
            .toLowerCase()
            .includes("enabled");

    }


    if (system) {

        system.checked =
            getText(
                "systemNotifications"
            )
            .toLowerCase()
            .includes("enabled");

    }


    if (sms) {

        sms.checked =
            getText(
                "smsNotifications"
            )
            .toLowerCase()
            .includes("enabled");

    }


    setInputValue(
        "editDigestFrequency",
        getText("digestFrequency")
    );


    activateModalForm(
        "notificationForm"
    );


    showModal();

}


/* =========================================================
   DOCUMENT MODAL
========================================================= */

function openDocumentModal() {

    currentModalType =
        "documents";


    setModalTitle(
        "Document Settings",
        "Manage document expiry alerts, file types and storage settings."
    );


    setInputValue(
        "editExpiryAlert",
        getText("expiryAlert")
    );


    setInputValue(
        "editFileTypes",
        getText("fileTypes")
    );


    setInputValue(
        "editMaxFileSize",
        getText("maxFileSize")
    );


    const autoReminder =
        document.getElementById(
            "editAutoReminder"
        );


    if (autoReminder) {

        autoReminder.checked =
            getText(
                "autoReminder"
            )
            .toLowerCase()
            .includes("enabled");

    }


    activateModalForm(
        "documentForm"
    );


    showModal();

}


/* =========================================================
   SECURITY MODAL
========================================================= */

function openSecurityModal() {

    currentModalType =
        "security";


    setModalTitle(
        "Security Settings",
        "Manage your password and two-factor authentication."
    );


    setInputValue(
        "currentPassword",
        ""
    );

    setInputValue(
        "newPassword",
        ""
    );

    setInputValue(
        "confirmPassword",
        ""
    );


    const twoFactor =
        document.getElementById(
            "editTwoFactor"
        );


    if (twoFactor) {

        twoFactor.checked =
            getText("twoFactor")
            .toLowerCase()
            .includes("enabled");

    }


    activateModalForm(
        "securityForm"
    );


    showModal();

}


/* =========================================================
   PREFERENCES MODAL
========================================================= */

function openPreferencesModal() {

    currentModalType =
        "preferences";


    setModalTitle(
        "Preferences",
        "Customize your VendorIQ experience."
    );


    setInputValue(
        "editLanguage",
        getText("language")
    );


    setInputValue(
        "editTimezone",
        getText("timezone")
    );


    setInputValue(
        "editDateFormat",
        getText("dateFormat")
    );


    setInputValue(
        "editCurrency",
        getText("currency")
    );


    activateModalForm(
        "preferencesForm"
    );


    showModal();

}


/* =========================================================
   SAVE MODAL
========================================================= */

async function saveModalSettings(
    event
) {

    event.preventDefault();


    if (!currentModalType) {

        closeModal();

        return;
    }


    const button =
        document.getElementById(
            "modalSaveBtn"
        );


    if (button) {

        button.disabled = true;

        button.innerHTML =
            `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
            `;

    }


    try {

        validateModal();


        switch (
            currentModalType
        ) {

            case "company":

                await saveCompanySettings();

                break;


            case "tax":

                await saveTaxSettings();

                break;


            case "notifications":

                await saveNotificationSettings();

                break;


            case "documents":

                await saveDocumentSettings();

                break;


            case "security":

                await saveSecuritySettings();

                break;


            case "preferences":

                await savePreferenceSettings();

                break;
        }


        showToast(
            "Settings saved successfully.",
            "success"
        );


        closeModal();


        await loadSettings();

    }
    catch (error) {

        console.error(
            "Save settings error:",
            error
        );


        showToast(
            error.message ||
            "Unable to save settings.",
            "error"
        );

    }
    finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                `
                <i class="fa-solid fa-floppy-disk"></i>
                Save Changes
                `;

        }

    }

}


/* =========================================================
   VALIDATION
========================================================= */

function validateModal() {

    const form =
        document.getElementById(
            "settingsForm"
        );


    if (!form) {
        return;
    }


    const activeSection =
        form.querySelector(
            ".modal-form-section.active"
        );


    if (!activeSection) {
        return;
    }


    const fields =
        activeSection.querySelectorAll(
            "input, select"
        );


    for (const field of fields) {

        if (
            field.type === "checkbox" ||
            field.disabled
        ) {
            continue;
        }


        if (
            field.required &&
            !field.value.trim()
        ) {

            showToast(
                `${getFieldLabel(field)} is required.`,
                "error"
            );


            field.focus();


            throw new Error(
                "Required field missing."
            );

        }


        if (
            field.type === "email" &&
            field.value.trim()
        ) {

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    field.value.trim()
                )
            ) {

                field.focus();

                throw new Error(
                    "Please enter a valid email address."
                );

            }

        }


        if (
            field.type === "url" &&
            field.value.trim()
        ) {

            try {

                new URL(
                    field.value.trim()
                );

            }
            catch {

                field.focus();

                throw new Error(
                    "Please enter a valid website URL."
                );

            }

        }

    }


    if (
        currentModalType ===
        "security"
    ) {

        const newPassword =
            getInputValue(
                "newPassword"
            );

        const confirmPassword =
            getInputValue(
                "confirmPassword"
            );


        if (
            newPassword &&
            newPassword !==
            confirmPassword
        ) {

            document
                .getElementById(
                    "confirmPassword"
                )
                ?.focus();


            throw new Error(
                "New password and confirm password do not match."
            );

        }

    }

}


/* =========================================================
   SAVE COMPANY
========================================================= */

async function saveCompanySettings() {

    const payload = {

        company_name:
            getInputValue(
                "editCompanyName"
            ),

        phone:
            getInputValue(
                "editPhone"
            ),

        website:
            getInputValue(
                "editWebsite"
            ),

        email:
            getInputValue(
                "editEmail"
            ),

        primary_contact:
            getInputValue(
                "editPrimaryContact"
            )

    };


    const response =
        await fetch(
            `${API_BASE_URL}/api/vendor/settings/company/${encodeURIComponent(vendorId)}`,
            {
                method: "PUT",

                headers:
                    getRequestHeaders(
                        true
                    ),

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    await ensureResponseOK(
        response
    );

}


/* =========================================================
   SAVE TAX
========================================================= */

async function saveTaxSettings() {

    const payload = {

        business_type:
            getInputValue(
                "editBusinessType"
            ),

        gst_vat:
            getInputValue(
                "editGstVat"
            ),

        tax_id:
            getInputValue(
                "editTaxId"
            ),

        pan_number:
            getInputValue(
                "editPanNumber"
            )

    };


    const response =
        await fetch(
            `${API_BASE_URL}/api/vendor/settings/tax/${encodeURIComponent(vendorId)}`,
            {
                method: "PUT",

                headers:
                    getRequestHeaders(
                        true
                    ),

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    await ensureResponseOK(
        response
    );

}


/* =========================================================
   SAVE NOTIFICATIONS
========================================================= */

async function saveNotificationSettings() {

    const payload = {

        email_notifications:
            getChecked(
                "editEmailNotifications"
            ),

        system_notifications:
            getChecked(
                "editSystemNotifications"
            ),

        sms_notifications:
            getChecked(
                "editSmsNotifications"
            ),

        digest_frequency:
            getInputValue(
                "editDigestFrequency"
            )

    };


    const response =
        await fetch(
            `${API_BASE_URL}/api/vendor/notification/settings/${encodeURIComponent(vendorId)}`,
            {
                method: "PUT",

                headers:
                    getRequestHeaders(
                        true
                    ),

                body:
                    JSON.stringify({
                        notifications:
                            payload
                    })
            }
        );


    await ensureResponseOK(
        response
    );

}


/* =========================================================
   SAVE DOCUMENTS
========================================================= */

async function saveDocumentSettings() {

    const expiryElement =
        document.getElementById("editExpiryAlert");

    const maxFileSizeElement =
        document.getElementById("editMaxFileSize");

    const fileTypesElement =
        document.getElementById("editFileTypes");

    const autoReminderElement =
        document.getElementById("editAutoReminder");


    // ---------------------------------------------------------
    // Check Vendor ID
    // ---------------------------------------------------------

    if (!vendorId) {
        throw new Error(
            "Vendor ID not found. Please login again."
        );
    }


    // ---------------------------------------------------------
    // Get values
    // ---------------------------------------------------------

    const expiryAlert =
        expiryElement
            ? expiryElement.value.trim()
            : "";

    const rawMaxFileSize =
        maxFileSizeElement
            ? maxFileSizeElement.value.trim()
            : "";

    const fileTypes =
        fileTypesElement
            ? fileTypesElement.value.trim()
            : "";

    const autoReminder =
        autoReminderElement
            ? autoReminderElement.checked
            : false;


    // ---------------------------------------------------------
    // Convert max file size to integer
    // ---------------------------------------------------------

    let maxFileSize = null;

    if (rawMaxFileSize !== "") {

        // Remove "MB" if the user entered something like "25 MB"
        const cleanedValue =
            rawMaxFileSize
                .replace(/MB/gi, "")
                .trim();

        const parsed =
            Number(cleanedValue);

        if (
            !Number.isFinite(parsed) ||
            !Number.isInteger(parsed) ||
            parsed <= 0
        ) {

            throw new Error(
                "Maximum file size must be a whole number in MB."
            );
        }

        maxFileSize = parsed;
    }


    // ---------------------------------------------------------
    // Build payload
    // ---------------------------------------------------------

    const payload = {
        expiry_alert: expiryAlert,
        max_file_size: maxFileSize,
        file_types: fileTypes,
        auto_reminder: autoReminder
    };


    // ---------------------------------------------------------
    // Debug
    // ---------------------------------------------------------

    console.log(
        "Vendor ID:",
        vendorId
    );

    console.log(
        "Document settings payload:",
        payload
    );

    console.log(
        "max_file_size:",
        maxFileSize,
        "type:",
        typeof maxFileSize
    );


    // ---------------------------------------------------------
    // API request
    // ---------------------------------------------------------

    const response =
        await fetch(
            `${API_BASE_URL}/api/vendor/settings/documents/${encodeURIComponent(vendorId)}`,
            {
                method: "PUT",

                headers:
                    getRequestHeaders(true),

                body:
                    JSON.stringify(payload)
            }
        );


    // ---------------------------------------------------------
    // Check response
    // ---------------------------------------------------------

    await ensureResponseOK(response);


    // ---------------------------------------------------------
    // Read response safely
    // ---------------------------------------------------------

    const contentType =
        response.headers.get("content-type") || "";

    if (
        contentType.includes("application/json")
    ) {

        const data =
            await response.json();

        console.log(
            "Document settings saved successfully:",
            data
        );

        return data;
    }


    return null;
}


/* =========================================================
   SAVE SECURITY
========================================================= */

async function saveSecuritySettings() {

    const currentPassword =
        getInputValue(
            "currentPassword"
        );

    const newPassword =
        getInputValue(
            "newPassword"
        );

    const confirmPassword =
        getInputValue(
            "confirmPassword"
        );


    if (
        newPassword &&
        newPassword !==
        confirmPassword
    ) {

        throw new Error(
            "New password and confirm password do not match."
        );

    }


    const payload = {

        two_factor_enabled:
            getChecked(
                "editTwoFactor"
            )

    };


    if (newPassword) {

        payload.current_password =
            currentPassword;

        payload.new_password =
            newPassword;

    }


    const response =
        await fetch(
            `${API_BASE_URL}/api/vendor/settings/security/${encodeURIComponent(vendorId)}`,
            {
                method: "PUT",

                headers:
                    getRequestHeaders(
                        true
                    ),

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    await ensureResponseOK(
        response
    );

}


/* =========================================================
   SAVE PREFERENCES
========================================================= */

async function savePreferenceSettings() {

    const payload = {

        language:
            getInputValue(
                "editLanguage"
            ),

        timezone:
            getInputValue(
                "editTimezone"
            ),

        date_format:
            getInputValue(
                "editDateFormat"
            ),

        currency:
            getInputValue(
                "editCurrency"
            )

    };


    const response =
        await fetch(
            `${API_BASE_URL}/api/vendor/settings/preferences/${encodeURIComponent(vendorId)}`,
            {
                method: "PUT",

                headers:
                    getRequestHeaders(
                        true
                    ),

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    await ensureResponseOK(
        response
    );

}


/* =========================================================
   LOAD SETTINGS
========================================================= */

async function loadSettings() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/vendor/settings/${encodeURIComponent(vendorId)}`,
                {
                    method: "GET",

                    headers:
                        getRequestHeaders()
                }
            );


        await ensureResponseOK(
            response
        );


        const data =
            await response.json();


        console.log(
            "Vendor settings:",
            data
        );


        populateSettings(
            data
        );

    }
    catch (error) {

        console.error(
            "Unable to load settings:",
            error
        );


        showToast(
            error.message ||
            "Unable to load vendor settings.",
            "error"
        );

    }

}


/* =========================================================
   POPULATE SETTINGS
========================================================= */

function populateSettings(data) {

    const vendor =
        data.vendor ||
        data ||
        {};


    /* COMPANY */

    setText(
        "companyName",
        vendor.company_name || "-"
    );

    setText(
        "phone",
        vendor.phone || "-"
    );

    setText(
        "vendorId",
        vendor.vendor_id || vendorId
    );

    setText(
        "website",
        vendor.website || "-"
    );

    setText(
        "email",
        vendor.email || "-"
    );

    setText(
        "primaryContact",
        vendor.primary_contact || "-"
    );


    /* TAX */

    setText(
        "businessType",
        vendor.business_type || "-"
    );

    setText(
        "gstVat",
        vendor.gst_vat || "-"
    );

    setText(
        "taxId",
        vendor.tax_id || "-"
    );

    setText(
        "panNumber",
        vendor.pan_number || "-"
    );


    /* NOTIFICATIONS */

    const notifications =
        data.notifications || {};


    const emailStatus =
        toEnabledDisabled(
            notifications.email_notifications
        );

    const systemStatus =
        toEnabledDisabled(
            notifications.system_notifications
        );

    const smsStatus =
        toEnabledDisabled(
            notifications.sms_notifications
        );


    setText(
        "emailNotifications",
        emailStatus
    );

    setText(
        "systemNotifications",
        systemStatus
    );

    setText(
        "smsNotifications",
        smsStatus
    );

    setText(
        "digestFrequency",
        notifications.digest_frequency ||
        "Daily"
    );


    setText(
        "notificationEmail",
        emailStatus
    );

    setText(
        "notificationSystem",
        systemStatus
    );

    setText(
        "notificationSms",
        smsStatus
    );

    setText(
        "notificationDigest",
        notifications.digest_frequency ||
        "Daily"
    );


    /* DOCUMENTS */

    const documents =
        data.documents || {};


    const expiry =
        documents.expiry_alert ||
        "30";

    const fileTypes =
        documents.file_types ||
        "PDF,DOC,DOCX,XLS,XLSX,PNG,JPG";

    const reminder =
        toEnabledDisabled(
            documents.auto_reminder
        );

    const maxFileSize =
        documents.max_file_size ||
        "25";


    setText(
        "expiryAlert",
        expiry
    );

    setText(
        "fileTypes",
        fileTypes
    );

    setText(
        "autoReminder",
        reminder
    );

    setText(
        "maxFileSize",
        maxFileSize
    );


    setText(
        "documentExpiry",
        expiry
    );

    setText(
        "documentTypes",
        fileTypes
    );

    setText(
        "documentReminder",
        reminder
    );

    setText(
        "documentMaxSize",
        maxFileSize
    );


    /* SECURITY */

    const security =
        data.security || {};


    const twoFactor =
        toEnabledDisabled(
            security.two_factor_enabled
        );


    setText(
        "passwordChanged",
        security.password_changed ||
        "-"
    );

    setText(
        "twoFactor",
        twoFactor
    );

    setText(
        "activeSessions",
        security.active_sessions ??
        1
    );


    setText(
        "securityPassword",
        security.password_changed ||
        "-"
    );

    setText(
        "securityTwoFactor",
        twoFactor
    );

    setText(
        "securitySessions",
        security.active_sessions ??
        1
    );


    /* PREFERENCES */

    const preferences =
        data.preferences || {};


    const language =
        preferences.language ||
        "English";

    const timezone =
        preferences.timezone ||
        "(UTC+05:30) Chennai, India";

    const dateFormat =
        preferences.date_format ||
        "DD MMM YYYY";

    const currency =
        preferences.currency ||
        "INR - Indian Rupee";


    setText(
        "language",
        language
    );

    setText(
        "timezone",
        timezone
    );

    setText(
        "dateFormat",
        dateFormat
    );

    setText(
        "currency",
        currency
    );


    setText(
        "preferenceLanguage",
        language
    );

    setText(
        "preferenceTimezone",
        timezone
    );

    setText(
        "preferenceDateFormat",
        dateFormat
    );

    setText(
        "preferenceCurrency",
        currency
    );


    /* PROFILE */

    setText(
        "overviewCompany",
        vendor.company_name || "-"
    );

    setText(
        "overviewVendorId",
        vendor.vendor_id || vendorId 
    );

    setText(
        "profileCompanyName",
        vendor.company_name || "-"
    );

    setText(
        "profileEmail",
        vendor.email || "-"
    );

    setText(
        "profilePhone",
        vendor.phone || "-"
    );

    setText(
        "profileVendorId",
        vendor.vendor_id || vendorId
    );

    setText(
        "profileContact",
        vendor.primary_contact || "-"
    );

    setText(
        "profileWebsite",
        vendor.website || "-"
    );


    /* SIDEBAR / TOPBAR */

    setText(
        "sideCompany",
        vendor.company_name || "-"
    );

    setText(
        "sideVendorId",
        `Vendor ID: ${
            vendor.vendor_id ||
            vendorId
        }`
    );

    setText(
        "topCompany",
        vendor.company_name || "-"
    );


    /* SYSTEM */

    const system =
        data.system || {};


    setText(
        "accountStatus",
        system.account_status ||
        "Active"
    );

    setText(
        "plan",
        system.plan ||
        "Standard"
    );

    setText(
        "storage",
        system.storage_used ||
        "0 GB"
    );

    setText(
        "storagePercent",
        `${clamp(
            Number(
                system.storage_percent || 0
            ),
            0,
            100
        )}% used`
    );

    setText(
        "lastLogin",
        system.last_login ||
        "-"
    );

    setText(
        "securityStatus",
        system.security_status ||
        "Secure"
    );


    const storageBar =
        document.getElementById(
            "storageBar"
        );


    if (storageBar) {

        storageBar.style.width =
            `${clamp(
                Number(
                    system.storage_percent || 0
                ),
                0,
                100
            )}%`;

    }


    updateStatusClass(
        "accountStatus"
    );

    updateStatusClass(
        "securityStatus"
    );

}


/* =========================================================
   STATUS
========================================================= */

function updateStatusClass(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    const value =
        element.textContent
            .trim()
            .toLowerCase();


    element.classList.remove(
        "success",
        "warning",
        "danger"
    );


    if (
        value.includes("active") ||
        value.includes("secure") ||
        value.includes("verified")
    ) {

        element.classList.add(
            "success"
        );

    }
    else if (
        value.includes("pending") ||
        value.includes("warning")
    ) {

        element.classList.add(
            "warning"
        );

    }
    else if (
        value.includes("inactive") ||
        value.includes("disabled") ||
        value.includes("danger")
    ) {

        element.classList.add(
            "danger"
        );

    }

}


/* =========================================================
   INTEGRATIONS
========================================================= */

function initializeIntegrationButtons() {

    document
        .querySelectorAll(
            ".integration-link"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const url =
                        button.dataset.url;

                    if (url) {

                        window.location.href =
                            url;

                    }

                }
            );

        });

}


/* =========================================================
   HELP
========================================================= */

function initializeHelpButton() {

    document
        .getElementById(
            "helpSupportBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                window.location.href =
                    "/VendorHelpSupport";

            }
        );

}


/* =========================================================
   CLOSE ACCOUNT
========================================================= */

function initializeCloseAccount() {

    document
        .getElementById(
            "closeAccountBtn"
        )
        ?.addEventListener(
            "click",
            closeVendorAccount
        );

}


async function closeVendorAccount() {

    const first =
        window.confirm(
            "Are you sure you want to close your vendor account?"
        );


    if (!first) {
        return;
    }


    const second =
        window.confirm(
            "This action may permanently disable access to VendorIQ. Continue?"
        );


    if (!second) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/vendor/account/${encodeURIComponent(vendorId)}`,
                {
                    method: "DELETE",

                    headers:
                        getRequestHeaders()
                }
            );


        await ensureResponseOK(
            response
        );


        localStorage.clear();

        sessionStorage.clear();


        window.location.href =
            "/login";

    }
    catch (error) {

        console.error(
            "Close account error:",
            error
        );


        showToast(
            error.message ||
            "Unable to close account.",
            "error"
        );

    }

}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {

    const search =
        document.getElementById(
            "globalSearch"
        );


    if (!search) {
        return;
    }


    search.addEventListener(
        "input",
        () => {

            const query =
                search.value
                    .trim()
                    .toLowerCase();


            if (!query) {
                return;
            }


            const sections =
                document.querySelectorAll(
                    ".section"
                );


            let foundSection = null;


            sections.forEach(
                section => {

                    if (
                        section.textContent
                            .toLowerCase()
                            .includes(query)
                    ) {

                        foundSection =
                            section.id;

                    }

                }
            );


            if (foundSection) {

                switchSection(
                    foundSection
                );

            }

        }
    );

}


/* =========================================================
   HELPERS
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.textContent =
        value ??
        "-";

}


function getText(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return "";
    }


    return element.textContent.trim();

}


function setInputValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    if (
        value === "-" ||
        value === null ||
        value === undefined
    ) {

        element.value = "";

        return;
    }


    element.value =
        value;

}


function getInputValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return "";
    }


    return element.value.trim();

}


function getChecked(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return false;
    }


    return element.checked;

}


function getFieldLabel(field) {

    const label =
        document.querySelector(
            `label[for="${field.id}"]`
        );


    return (
        label?.textContent.trim() ||
        field.name ||
        "This field"
    );

}


function toEnabledDisabled(
    value
) {

    if (
        value === true ||
        value === 1 ||
        value === "true" ||
        value === "True" ||
        value === "enabled" ||
        value === "Enabled"
    ) {

        return "Enabled";

    }

    else{
        return "Disabled";
    }

}


function clamp(
    value,
    min,
    max
) {

    return Math.min(
        Math.max(
            value,
            min
        ),
        max
    );

}


/* =========================================================
   API ERROR
========================================================= */

async function getApiError(
    response
) {

    try {

        const data =
            await response.json();


        return (
            data.detail ||
            data.message ||
            data.error ||
            `Request failed with status ${response.status}`
        );

    }
    catch {

        return (
            `Request failed with status ${response.status}`
        );

    }

}


/* =========================================================
   RESPONSE CHECK
========================================================= */

async function ensureResponseOK(
    response
) {

    if (response.ok) {
        return;
    }


    const error =
        await getApiError(
            response
        );


    if (
        response.status === 401
    ) {

        localStorage.removeItem(
            "access_token"
        );

        sessionStorage.removeItem(
            "access_token"
        );

        showToast(
            "Your session has expired. Please login again.",
            "error"
        );

    }


    throw new Error(
        error
    );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "settingsToast"
        );


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.className =
        `settings-toast ${type}`;


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );

        }
    );


    clearTimeout(
        window.vendorSettingsToastTimer
    );


    window.vendorSettingsToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );

}