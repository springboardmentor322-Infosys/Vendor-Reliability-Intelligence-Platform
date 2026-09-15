/* ==========================================================
   VENDORIQ SETTINGS
========================================================== */

const API_BASE = "";

let currentSettings = null;


/* ==========================================================
   TOKEN
========================================================== */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token")
    );
}


/* ==========================================================
   API
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

        headers.Authorization =
            `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {

        localStorage.removeItem("access_token");
        localStorage.removeItem("token");

        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("token");

        window.location.href =
            "/login";

        return null;
    }

    const text = await response.text();

    let data = {};

    try {

        data = text
            ? JSON.parse(text)
            : {};

    } catch {

        data = {
            detail: text
        };
    }

    if (!response.ok) {

        throw new Error(
            data.detail ||
            "Request failed"
        );
    }

    return data;
}


/* ==========================================================
   INITIALIZATION
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initialize();

    }
);


async function initialize() {

    updateClock();

    setInterval(
        updateClock,
        1000
    );

    setupTabs();

    setupThemeSelector();

    setupButtons();

    setupSearch();

    try {

        await loadSettings();

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Unable to load settings"
        );
    }
}


/* ==========================================================
   CLOCK
========================================================== */

function updateClock() {

    const now = new Date();

    const dateElement =
        document.getElementById(
            "currentDate"
        );

    const timeElement =
        document.getElementById(
            "currentTime"
        );

    if (!dateElement || !timeElement)
        return;

    dateElement.textContent =
        now.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "2-digit",
                year: "numeric"
            }
        );

    timeElement.textContent =
        now.toLocaleTimeString(
            "en-US",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}


/* ==========================================================
   TABS
========================================================== */

function setupTabs() {

    const tabs =
        document.querySelectorAll(
            ".tab"
        );

    tabs.forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                tabs.forEach(item =>
                    item.classList.remove(
                        "active"
                    )
                );

                tab.classList.add(
                    "active"
                );

                const selected =
                    tab.dataset.tab;

                if (
                    selected !==
                    "general"
                ) {

                    showToast(
                        `${tab.textContent.trim()} section`
                    );

                }

            }
        );

    });
}


/* ==========================================================
   LOAD SETTINGS
========================================================== */

async function loadSettings() {

    const data =
        await apiFetch(
            "/api/settings"
        );

    if (!data)
        return;

    currentSettings = data;

    populateUser(
        data.user
    );

    populateCompany(
        data.company
    );

    populateBusiness(
        data.business
    );

    populatePreferences(
        data.system,
        data.preferences
    );

    populateSecurity(
        data.system
    );

    populateNotifications(
        data.notifications
    );

    populateData(
        data.system
    );

    populateOther(
        data.system
    );

    renderIntegrations(
        data.integrations || []
    );
}


/* ==========================================================
   USER
========================================================== */

function populateUser(user) {

    if (!user)
        return;

    const name =
        document.getElementById(
            "sidebarName"
        );

    const role =
        document.getElementById(
            "sidebarRole"
        );

    if (name)
        name.textContent =
            user.name || "User";

    if (role)
        role.textContent =
            user.role || "User";
}


/* ==========================================================
   COMPANY
========================================================== */

function populateCompany(company) {

    if (!company)
        return;

    setValue(
        "companyName",
        company.company_name
    );

    setValue(
        "companyId",
        company.company_id
    );

    setValue(
        "industry",
        company.industry
    );

    setText(
        "companyAddressDisplay",
        company.address || "--"
    );

    setText(
        "companyPhone",
        company.phone || "--"
    );

    setText(
        "companyEmail",
        company.email || "--"
    );

    setText(
        "companyWebsite",
        company.website || "--"
    );
}


/* ==========================================================
   BUSINESS
========================================================== */

function populateBusiness(
    business
) {

    if (!business)
        return;

    setValue(
        "financialYear",
        business.financial_year_start
    );

    setValue(
        "paymentTerms",
        business.default_payment_terms
    );

    setChecked(
        "taxCalculation",
        business.tax_calculation
    );

    setChecked(
        "multiCurrency",
        business.multi_currency
    );

    loadBusinessReferences(
        business
    );
}


async function loadBusinessReferences(
    business
) {

    try {

        const warehouseSelect =
            document.getElementById(
                "defaultWarehouse"
            );

        const supplierSelect =
            document.getElementById(
                "defaultSupplier"
            );

        if (warehouseSelect) {

            warehouseSelect.innerHTML =
                `<option value="">
                    Select warehouse
                </option>`;

            const warehouses =
                await apiFetch(
                    "/api/warehouses"
                );

            if (Array.isArray(warehouses)) {

                warehouses.forEach(
                    warehouse => {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            warehouse.id;

                        option.textContent =
                            `${warehouse.warehouse_name} - ${warehouse.warehouse_code}`;

                        if (
                            warehouse.id ===
                            business.default_warehouse_id
                        ) {

                            option.selected =
                                true;
                        }

                        warehouseSelect.appendChild(
                            option
                        );

                    }
                );
            }
        }


        if (supplierSelect) {

            supplierSelect.innerHTML =
                `<option value="">
                    Select supplier
                </option>`;

            const vendors =
                await apiFetch(
                    "/api/vendors"
                );

            if (Array.isArray(vendors)) {

                vendors.forEach(
                    vendor => {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            vendor.vendor_id;

                        option.textContent =
                            vendor.vendor_name;

                        if (
                            vendor.vendor_id ===
                            business.default_supplier_id
                        ) {

                            option.selected =
                                true;
                        }

                        supplierSelect.appendChild(
                            option
                        );

                    }
                );
            }
        }

    } catch (error) {

        console.warn(
            "Reference data unavailable:",
            error
        );
    }
}


/* ==========================================================
   PREFERENCES
========================================================== */

function populatePreferences(
    system,
    preferences
) {

    if (!system)
        return;

    setValue(
        "dateFormat",
        system.date_format
    );

    setValue(
        "timeFormat",
        system.time_format
    );

    setValue(
        "numberFormat",
        preferences?.number_format ||
        system.number_format
    );

    setValue(
        "measurementUnit",
        preferences?.measurement_unit ||
        system.measurement_unit
    );

    setValue(
        "defaultDashboard",
        preferences?.default_dashboard ||
        system.default_dashboard
    );

    setValue(
        "itemsPerPage",
        system.items_per_page
    );

    setValue(
        "currency",
        system.currency
    );

    const theme =
        preferences?.theme ||
        "Light";

    document
        .querySelectorAll(
            ".theme-option"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.theme ===
                theme
            );

        });
}


/* ==========================================================
   SECURITY
========================================================== */

function populateSecurity(
    system
) {

    if (!system)
        return;

    setChecked(
        "twoFactor",
        system.two_factor_authentication
    );

    setValue(
        "sessionTimeout",
        system.session_timeout
    );

    setValue(
        "loginAttempts",
        system.max_login_attempts
    );
}


/* ==========================================================
   NOTIFICATIONS
========================================================== */

function populateNotifications(
    notification
) {

    if (!notification)
        return;

    setChecked(
        "orderUpdates",
        notification.po_updates
    );

    setChecked(
        "shipmentUpdates",
        notification.po_updates
    );

    setChecked(
        "inventoryAlerts",
        notification.email_enabled
    );

    setChecked(
        "supplierNotifications",
        notification.vendor_registration
    );

    setChecked(
        "systemAlerts",
        notification.contract_expiration
    );

    setChecked(
        "weeklyReports",
        notification.email_enabled
    );
}


/* ==========================================================
   DATA
========================================================== */

function populateData(system) {

    if (!system)
        return;

    setValue(
        "backupFrequency",
        system.backup_frequency
    );

    setValue(
        "backupTime",
        system.backup_time
    );

    setValue(
        "dataRetention",
        system.data_retention_period
    );

    setChecked(
        "autoBackup",
        system.automatic_backups
    );
}


/* ==========================================================
   OTHER
========================================================== */

function populateOther(system) {

    if (!system)
        return;

    setChecked(
        "maintenanceMode",
        system.maintenance_mode
    );

    setChecked(
        "systemUpdates",
        system.system_updates_enabled
    );

    setChecked(
        "betaFeatures",
        system.beta_features_enabled
    );
}


/* ==========================================================
   INTEGRATIONS
========================================================== */

function renderIntegrations(
    integrations
) {

    const container =
        document.getElementById(
            "integrationsContainer"
        );

    if (!container)
        return;

    container.innerHTML = "";

    if (!integrations.length) {

        container.innerHTML =
            `<div class="empty">
                No integrations configured.
            </div>`;

        return;
    }

    integrations.forEach(
        integration => {

            const connected =
                integration.status ===
                "Connected";

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "integration-row";

            row.innerHTML = `

                <div class="integration-icon">

                    <i class="fa-solid fa-plug"></i>

                </div>

                <div class="integration-details">

                    <strong>
                        ${escapeHtml(
                            integration.integration_name
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            integration.provider_name
                        )}
                    </small>

                </div>

                <span class="
                    integration-status
                    ${connected ? "" : "disconnected"}
                ">

                    ${escapeHtml(
                        integration.status
                    )}

                </span>

                <button
                    class="secondary-button integration-toggle"
                    data-id="${integration.id}"
                >

                    ${connected
                        ? "Manage"
                        : "Connect"}

                </button>

            `;

            container.appendChild(
                row
            );
        }
    );

    document
        .querySelectorAll(
            ".integration-toggle"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    toggleIntegration(
                        button.dataset.id
                    );

                }
            );

        });
}


/* ==========================================================
   TOGGLE INTEGRATION
========================================================== */

async function toggleIntegration(
    id
) {

    try {

        await apiFetch(
            `/api/settings/integrations/${id}/toggle`,
            {
                method: "POST"
            }
        );

        await loadSettings();

        showToast(
            "Integration updated"
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ==========================================================
   BUTTONS
========================================================== */

function setupButtons() {

    document
        .getElementById("saveCompany")
        ?.addEventListener(
            "click",
            saveCompany
        );

    document
        .getElementById("saveBusiness")
        ?.addEventListener(
            "click",
            saveBusiness
        );

    document
        .getElementById("savePreferences")
        ?.addEventListener(
            "click",
            savePreferences
        );

    document
        .getElementById("saveSecurity")
        ?.addEventListener(
            "click",
            saveSecurity
        );

    document
        .getElementById("saveOther")
        ?.addEventListener(
            "click",
            saveOther
        );

    document
        .getElementById("runBackup")
        ?.addEventListener(
            "click",
            runBackup
        );

    document
        .getElementById("resetSettings")
        ?.addEventListener(
            "click",
            resetSettings
        );

    document
        .getElementById("deleteAccount")
        ?.addEventListener(
            "click",
            deleteAccount
        );
}


/* ==========================================================
   SAVE COMPANY
========================================================== */

async function saveCompany() {

    const payload = {

        company_name:
            getValue("companyName"),

        company_id:
            getValue("companyId"),

        industry:
            getValue("industry"),

        address:
            currentSettings?.company?.address ||
            "",

        phone:
            currentSettings?.company?.phone ||
            "",

        email:
            currentSettings?.company?.email ||
            "",

        website:
            currentSettings?.company?.website ||
            ""

    };

    try {

        await apiFetch(
            "/api/settings/company",
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        await loadSettings();

        showToast(
            "Company information saved"
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ==========================================================
   SAVE BUSINESS
========================================================== */

async function saveBusiness() {

    const payload = {

        financial_year_start:
            getValue("financialYear"),

        default_warehouse_id:
            numberOrNull(
                getValue("defaultWarehouse")
            ),

        default_supplier_id:
            getValue("defaultSupplier") ||
            null,

        default_payment_terms:
            getValue("paymentTerms"),

        tax_calculation:
            getChecked("taxCalculation"),

        multi_currency:
            getChecked("multiCurrency")

    };

    try {

        await apiFetch(
            "/api/settings/business",
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        showToast(
            "Business settings saved"
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ==========================================================
   SAVE PREFERENCES
========================================================== */

async function savePreferences() {

    const theme =
        document.querySelector(
            ".theme-option.active"
        )?.dataset.theme ||
        "Light";

    const payload = {

        date_format:
            getValue("dateFormat"),

        time_format:
            getValue("timeFormat"),

        number_format:
            getValue("numberFormat"),

        measurement_unit:
            getValue("measurementUnit"),

        default_dashboard:
            getValue("defaultDashboard"),

        items_per_page:
            Number(
                getValue("itemsPerPage")
            ),

        currency:
            getValue("currency"),

        theme:
            theme

    };

    try {

        await apiFetch(
            "/api/settings/preferences",
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        showToast(
            "Preferences saved"
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ==========================================================
   SAVE SECURITY
========================================================== */

async function saveSecurity() {

    const payload = {

        two_factor_authentication:
            getChecked("twoFactor"),

        password_complexity:
            true,

        password_expiry:
            "90 Days",

        session_timeout:
            getValue("sessionTimeout"),

        max_login_attempts:
            Number(
                getValue("loginAttempts")
            )

    };

    try {

        await apiFetch(
            "/api/settings/security",
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        showToast(
            "Security settings saved"
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ==========================================================
   SAVE OTHER
========================================================== */

async function saveOther() {

    const payload = {

        maintenance_mode:
            getChecked("maintenanceMode"),

        system_updates_enabled:
            getChecked("systemUpdates"),

        beta_features_enabled:
            getChecked("betaFeatures")

    };

    try {

        await apiFetch(
            "/api/settings/other",
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        showToast(
            "Other settings saved"
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ==========================================================
   BACKUP
========================================================== */

async function runBackup() {

    if (
        !confirm(
            "Start a manual backup?"
        )
    ) {
        return;
    }

    try {

        const result =
            await apiFetch(
                "/api/settings/backup",
                {
                    method: "POST"
                }
            );

        showToast(
            result.message ||
            "Backup queued"
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ==========================================================
   RESET
========================================================== */

async function resetSettings() {

    if (
        !confirm(
            "Reset all system settings to their defaults?"
        )
    ) {
        return;
    }

    try {

        await apiFetch(
            "/api/settings/reset",
            {
                method: "POST"
            }
        );

        await loadSettings();

        showToast(
            "Settings reset successfully"
        );

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ==========================================================
   DELETE ACCOUNT
========================================================== */

async function deleteAccount() {

    const confirmation =
        prompt(
            "Type DELETE to permanently delete your account:"
        );

    if (
        confirmation !==
        "DELETE"
    ) {
        return;
    }

    try {

        await apiFetch(
            "/api/settings/account",
            {
                method: "DELETE"
            }
        );

        localStorage.clear();
        sessionStorage.clear();

        window.location.href =
            "/login";

    } catch (error) {

        showToast(
            error.message
        );
    }
}


/* ==========================================================
   THEME SELECTOR
========================================================== */

function setupThemeSelector() {

    document
        .querySelectorAll(
            ".theme-option"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".theme-option"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );

                    button.classList.add(
                        "active"
                    );

                    applyTheme(
                        button.dataset.theme
                    );

                }
            );

        });
}


function applyTheme(theme) {

    if (theme === "Dark") {

        document.body.classList.add(
            "dark-mode"
        );

    } else if (
        theme === "System"
    ) {

        const dark =
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

        document.body.classList.toggle(
            "dark-mode",
            dark
        );

    } else {

        document.body.classList.remove(
            "dark-mode"
        );
    }
}


function toggleTheme() {

    const current =
        document.body.classList.contains(
            "dark-mode"
        );

    applyTheme(
        current
            ? "Light"
            : "Dark"
    );
}


/* ==========================================================
   SEARCH
========================================================== */

function setupSearch() {

    const input =
        document.getElementById(
            "settingsSearch"
        );

    if (!input)
        return;

    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();

            document
                .querySelectorAll(
                    ".card"
                )
                .forEach(card => {

                    const text =
                        card.textContent
                            .toLowerCase();

                    card.style.display =
                        !query ||
                        text.includes(query)
                            ? ""
                            : "none";

                });

        }
    );
}


/* ==========================================================
   HELPERS
========================================================== */

function getValue(id) {

    return document
        .getElementById(id)
        ?.value || "";
}


function setValue(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element && value !== null &&
        value !== undefined) {

        element.value = value;
    }
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element)
        element.textContent =
            value;
}


function getChecked(id) {

    return Boolean(
        document
            .getElementById(id)
            ?.checked
    );
}


function setChecked(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element)
        element.checked =
            Boolean(value);
}


function numberOrNull(value) {

    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {

        return null;
    }

    return Number(value);
}


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast)
        return;

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
        2500
    );
}


function escapeHtml(value) {

    return String(value ?? "")
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


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}