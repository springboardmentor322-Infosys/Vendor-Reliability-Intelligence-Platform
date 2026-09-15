/* ==========================================================
   VENDORIQ
   CONTRACT & COMPLIANCE
   JAVASCRIPT
========================================================== */

"use strict";

/* ==========================================================
   API
========================================================== */

const API = "http://127.0.0.1:8000";


/* ==========================================================
   STATE
========================================================== */

let currentVendorId = null;

let allContracts = [];
let filteredContracts = [];

let currentPage = 1;
const pageLimit = 20;

let editingContractNumber = null;

let dashboardData = null;


/* ==========================================================
   DOM HELPERS
========================================================== */

function $(id) {
    return document.getElementById(id);
}


/* ==========================================================
   TOKEN
========================================================== */

function getToken() {

    const keys = [
        "access_token",
        "accessToken",
        "token",
        "vendor_token",
        "vendorToken",
        "jwt_token"
    ];

    for (const key of keys) {

        const localValue = localStorage.getItem(key);

        if (localValue) {
            return localValue;
        }

        const sessionValue = sessionStorage.getItem(key);

        if (sessionValue) {
            return sessionValue;
        }
    }

    return null;
}


/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(
    endpoint,
    options = {}
) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {

        const response = await fetch(
            `${API}${endpoint}`,
            {
                ...options,
                headers
            }
        );

        console.log(
            "API STATUS:",
            response.status,
            endpoint
        );

        if (response.status === 401) {

            console.warn(
                "Unauthorized. Redirecting to vendor login."
            );

            localStorage.removeItem("access_token");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("token");

            sessionStorage.removeItem("access_token");
            sessionStorage.removeItem("accessToken");
            sessionStorage.removeItem("token");

            window.location.href = "/login";

            return null;
        }

        const contentType =
            response.headers.get("content-type") || "";

        let data;

        if (contentType.includes("application/json")) {

            data = await response.json();

        } else {

            const text = await response.text();

            data = text;
        }

        if (!response.ok) {

            console.error(
                "API ERROR:",
                response.status,
                data
            );

            const message =
                typeof data === "object"
                    ? (
                        data.detail ||
                        data.message ||
                        "API request failed"
                    )
                    : data;

            throw new Error(
                message || "API request failed"
            );
        }

        return data;

    } catch (error) {

        console.error(
            "API FETCH ERROR:",
            endpoint,
            error
        );

        throw error;
    }
}


/* ==========================================================
   JWT DECODER
========================================================== */

function decodeJWT(token) {

    try {

        if (!token) {
            return null;
        }

        const parts = token.split(".");

        if (parts.length !== 3) {
            return null;
        }

        const payload = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const decoded =
            decodeURIComponent(
                atob(payload)
                    .split("")
                    .map(
                        c =>
                            "%" +
                            (
                                "00" +
                                c.charCodeAt(0).toString(16)
                            ).slice(-2)
                    )
                    .join("")
            );

        return JSON.parse(decoded);

    } catch (error) {

        console.warn(
            "Unable to decode JWT:",
            error
        );

        return null;
    }
}


/* ==========================================================
   FIND VENDOR ID
========================================================== */

function getStoredVendorId() {

    const keys = [
        "vendor_id",
        "vendorId",
        "currentVendorId",
        "current_vendor_id",
        "VENDOR_ID"
    ];

    for (const key of keys) {

        const localValue =
            localStorage.getItem(key);

        if (localValue) {
            return localValue;
        }

        const sessionValue =
            sessionStorage.getItem(key);

        if (sessionValue) {
            return sessionValue;
        }
    }

    return null;
}


/* ==========================================================
   GET VENDOR ID FROM TOKEN / STORAGE
========================================================== */

function resolveVendorId() {

    /* ------------------------------------------------------
       1. localStorage / sessionStorage
    ------------------------------------------------------ */

    const storedVendorId =
        getStoredVendorId();

    if (storedVendorId) {

        console.log(
            "Vendor ID from storage:",
            storedVendorId
        );

        return storedVendorId;
    }


    /* ------------------------------------------------------
       2. JWT
    ------------------------------------------------------ */

    const token = getToken();

    const payload =
        decodeJWT(token);

    if (payload) {

        const vendorId =
            payload.vendor_id ||
            payload.vendorId ||
            payload.vendor ||
            payload.sub;

        if (vendorId) {

            console.log(
                "Vendor ID from JWT:",
                vendorId
            );

            return vendorId;
        }
    }


    /* ------------------------------------------------------
       3. URL query parameter
       Example:
       /VendorContract?vendor_id=VND0000001
    ------------------------------------------------------ */

    const params =
        new URLSearchParams(
            window.location.search
        );

    const queryVendorId =
        params.get("vendor_id") ||
        params.get("vendorId");

    if (queryVendorId) {

        console.log(
            "Vendor ID from URL:",
            queryVendorId
        );

        return queryVendorId;
    }


    return null;
}


/* ==========================================================
   ALERT
========================================================== */

function showAlert(
    message,
    type = "success"
) {

    const alertBox = $("alertBox");

    if (!alertBox) {
        return;
    }

    alertBox.className =
        `alert-box ${type}`;

    alertBox.textContent =
        message;

    alertBox.classList.remove(
        "hidden"
    );

    clearTimeout(
        window.__alertTimer
    );

    window.__alertTimer =
        setTimeout(
            () => {
                alertBox.classList.add(
                    "hidden"
                );
            },
            4000
        );
}


/* ==========================================================
   FORMAT DATE
========================================================== */

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
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* ==========================================================
   FORMAT CURRENCY
========================================================== */

function formatCurrency(value) {

    const amount =
        Number(value || 0);

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(amount);
}


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ==========================================================
   STATUS CLASS
========================================================== */

function getStatusClass(status) {

    const value =
        String(status || "")
            .toLowerCase()
            .trim();

    if (value === "active") {
        return "active";
    }

    if (
        value === "draft"
    ) {
        return "draft";
    }

    if (
        value === "expired"
    ) {
        return "expired";
    }

    if (
        value === "cancelled" ||
        value === "canceled"
    ) {
        return "cancelled";
    }

    if (
        value === "approved"
    ) {
        return "approved";
    }

    if (
        value === "completed"
    ) {
        return "completed";
    }

    return "";
}


/* ==========================================================
   DAYS LEFT
========================================================== */

function calculateDaysLeft(
    contract
) {

    if (
        contract.days_left !== undefined &&
        contract.days_left !== null
    ) {

        return Number(
            contract.days_left
        );
    }

    if (!contract.expiry_date) {
        return null;
    }

    const expiry =
        new Date(
            contract.expiry_date
        );

    if (Number.isNaN(expiry.getTime())) {
        return null;
    }

    const today =
        new Date();

    today.setHours(
        0, 0, 0, 0
    );

    expiry.setHours(
        0, 0, 0, 0
    );

    return Math.ceil(
        (
            expiry - today
        ) /
        (
            1000 *
            60 *
            60 *
            24
        )
    );
}


/* ==========================================================
   LOAD DASHBOARD
========================================================== */

async function loadDashboard() {

    try {

        if (!currentVendorId) {

            currentVendorId =
                resolveVendorId();
        }

        if (!currentVendorId) {

            showAlert(
                "Vendor ID could not be determined.",
                "error"
            );

            console.error(
                "Vendor ID not available."
            );

            return;
        }

        console.log(
            "Loading dashboard for vendor:",
            currentVendorId
        );

        const data =
            await apiFetch(
                `/api/vendor/contracts/dashboard/${encodeURIComponent(currentVendorId)}`
            );

        if (!data) {
            return;
        }

        dashboardData = data;

        console.log(
            "Dashboard data:",
            data
        );

        updateVendorInfo(
            data.vendor
        );

        updateSummary(
            data.summary
        );

        updateContractOverview(
            data.status_distribution
        );

        updateCompliance(
            data.compliance_score,
            data.compliance_distribution
        );

        renderExpiringContracts(
            data.expiring_contracts || []
        );

        renderDocumentation(
            data.contracts || []
        );

        renderActivities(
            data.recent_activities || []
        );

        renderExpiryNotifications(
            data.contracts || []
        );

        renderCertificationSection(
            data.contracts || []
        );

    } catch (error) {

        console.error(
            "Dashboard loading failed:",
            error
        );

        showAlert(
            error.message ||
            "Unable to load contract dashboard.",
            "error"
        );
    }
}


/* ==========================================================
   UPDATE VENDOR INFO
========================================================== */

function updateVendorInfo(vendor) {

    if (!vendor) {
        return;
    }

    const vendorName =
        vendor.vendor_name ||
        "Vendor";

    const vendorId =
        vendor.vendor_id ||
        "Vendor ID";


    if ($("sidebarVendorName")) {

        $("sidebarVendorName")
            .textContent =
            vendorName;
    }

    if ($("sidebarVendorId")) {

        $("sidebarVendorId")
            .textContent =
            vendorId;
    }

    if ($("headerVendorName")) {

        $("headerVendorName")
            .textContent =
            vendorName;
    }
}


/* ==========================================================
   UPDATE SUMMARY
========================================================== */

function updateSummary(summary) {

    if (!summary) {
        return;
    }

    $("activeContracts").textContent =
        summary.active_contracts || 0;

    $("expiringContracts").textContent =
        summary.expiring_contracts || 0;

    $("expiredContracts").textContent =
        summary.expired_contracts || 0;

    $("complianceScore").textContent =
        `${Number(
            summary.compliance_score || 0
        ).toFixed(0)}%`;

    $("compliantContracts").textContent =
        dashboardData
            ?.compliance_distribution
            ?.Compliant || 0;

    const contracts =
        dashboardData?.contracts || [];

    const totalValue =
        contracts.reduce(
            (
                total,
                contract
            ) => {

                return total +
                    Number(
                        contract.contract_value || 0
                    );
            },
            0
        );

    $("contractValue").textContent =
        formatCurrency(
            totalValue
        );

    $("totalContracts").textContent =
        summary.total_contracts || 0;


    /* Compliance text */

    const score =
        Number(
            summary.compliance_score || 0
        );

    let text =
        "Needs attention";

    if (score >= 90) {
        text = "Excellent compliance";
    } else if (score >= 75) {
        text = "Good compliance";
    } else if (score >= 50) {
        text = "Moderate compliance";
    }

    $("complianceText").textContent =
        text;
}


/* ==========================================================
   CONTRACT DONUT
========================================================== */

function updateContractOverview(
    distribution
) {

    if (!distribution) {
        return;
    }

    const total =
        Object.values(
            distribution
        ).reduce(
            (
                sum,
                value
            ) =>
                sum +
                Number(value || 0),
            0
        );

    const donut =
        $("contractDonut");

    const legend =
        $("contractLegend");

    if (!donut || !legend) {
        return;
    }

    if (total === 0) {

        donut.style.background =
            "conic-gradient(#e5e7eb 0deg 360deg)";

        legend.innerHTML =
            `<div class="legend-item" style = "font-size:9px;">
                <span>No contracts</span>
                <strong>0</strong>
            </div>`;

        return;
    }

    const colors = [
        "#16a34a",
        "#f59e0b",
        "#dc2626",
        "#64748b"
    ];

    const entries = [
        ["Active", distribution.Active || 0],
        ["Expiring Soon", distribution["Expiring Soon"] || 0],
        ["Expired", distribution.Expired || 0],
        ["Draft", distribution.Draft || 0]
    ];

    let currentDegree = 0;

    const segments = [];

    entries.forEach(
        (
            [label, value],
            index
        ) => {

            const degrees =
                (
                    Number(value) /
                    total
                ) * 360;

            const start =
                currentDegree;

            const end =
                currentDegree +
                degrees;

            segments.push(
                `${colors[index]} ${start}deg ${end}deg`
            );

            currentDegree = end;
        }
    );

    donut.style.background =
        `conic-gradient(${segments.join(", ")})`;

    legend.innerHTML =
        entries.map(
            (
                [label, value],
                index
            ) => {

                return `
                    <div class="legend-item">
                        <span>
                            <i
                                style="
                                    display:inline-block;
                                    width:10px;
                                    height:10px;
                                    border-radius:50%;
                                    background:${colors[index]};
                                    margin-right:7px;
                                    font-size:9px;
                                "
                            ></i>
                            ${escapeHTML(label)}
                        </span>

                        <strong>
                            ${value}
                        </strong>
                    </div>
                `;
            }
        ).join("");
}


/* ==========================================================
   COMPLIANCE
========================================================== */

function updateCompliance(
    score,
    distribution
) {

    const numericScore =
        Math.max(
            0,
            Math.min(
                100,
                Number(score || 0)
            )
        );

    $("gaugeScore").textContent =
        `${numericScore.toFixed(0)}%`;

    const gauge =
        $("gaugeProgress");

    if (gauge) {

        /*
         * Approximate half-circle length.
         * SVG path length can be adjusted using
         * stroke-dasharray.
         */

        const radius = 90;

        const arcLength =
            Math.PI * radius;

        gauge.style.strokeDasharray =
            `${arcLength}`;

        gauge.style.strokeDashoffset =
            `${arcLength * (1 - numericScore / 100)}`;
    }


    if (!distribution) {
        return;
    }

    const list =
        $("complianceList");

    if (!list) {
        return;
    }

    const items = [
        {
            label: "Compliant",
            value: distribution.Compliant || 0
        },
        {
            label: "Expiring Soon",
            value: distribution["Expiring Soon"] || 0
        },
        {
            label: "Non-Compliant",
            value: distribution["Non-Compliant"] || 0
        },
        {
            label: "Pending",
            value: distribution.Pending || 0
        }
    ];

    const total =
        items.reduce(
            (
                sum,
                item
            ) =>
                sum +
                Number(item.value),
            0
        );

    list.innerHTML =
        items.map(
            item => {

                const percentage =
                    total > 0
                        ? (
                            Number(item.value) /
                            total
                        ) * 100
                        : 0;

                return `
                    <div class="compliance-item">

                        <div class="compliance-item-header">

                            <span>
                                ${escapeHTML(item.label)}
                            </span>

                            <strong>
                                ${item.value}
                            </strong>

                        </div>

                        <div class="progress-bar">

                            <div
                                class="progress-fill"
                                style="width:${percentage}%"
                            ></div>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* ==========================================================
   EXPIRING CONTRACTS
========================================================== */

function renderExpiringContracts(
    contracts
) {

    const table =
        $("expiringTable");

    const empty =
        $("emptyExpiring");

    if (!table) {
        return;
    }

    table.innerHTML = "";

    if (!contracts.length) {

        if (empty) {
            empty.classList.remove(
                "hidden"
            );
        }

        return;
    }

    if (empty) {
        empty.classList.add(
            "hidden"
        );
    }

    contracts.forEach(
        contract => {

            const daysLeft =
                calculateDaysLeft(
                    contract
                );

            let daysText =
                "—";

            if (daysLeft !== null) {

                if (daysLeft < 0) {
                    daysText =
                        `${Math.abs(daysLeft)} days overdue`;
                } else {
                    daysText =
                        `${daysLeft} days`;
                }
            }

            const tr =
                document.createElement("tr");

            tr.innerHTML = `

                <td>
                    ${escapeHTML(
                        contract.contract_number ||
                        contract.id ||
                        "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        contract.contract_name ||
                        contract.name ||
                        "Contract"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        contract.vendor_id ||
                        currentVendorId ||
                        "—"
                    )}
                </td>

                <td>
                    ${formatDate(
                        contract.expiry_date
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        daysText
                    )}
                </td>

                <td>
                    <span class="status-badge ${getStatusClass(
                        contract.status
                    )}">
                        ${escapeHTML(
                            contract.status ||
                            "Active"
                        )}
                    </span>
                </td>

                <td>
                    ${actionButtons(
                        contract
                    )}
                </td>
            `;

            table.appendChild(tr);
        }
    );
}


/* ==========================================================
   ACTION BUTTONS
========================================================== */

function actionButtons(
    contract
) {

    const contractNumber =
        contract.contract_number ||
        contract.id;

    return `
        <div class="action-buttons">

            <button
                type="button"
                title="View"
                onclick="viewContract('${escapeJS(contractNumber)}')"
            >
                <i class="fa-regular fa-eye"></i>
            </button>

            <button
                type="button"
                title="Edit"
                onclick="editContract('${escapeJS(contractNumber)}')"
            >
                <i class="fa-regular fa-pen-to-square"></i>
            </button>

            <button
                type="button"
                title="Delete"
                onclick="deleteContract('${escapeJS(contractNumber)}')"
            >
                <i class="fa-regular fa-trash-can"></i>
            </button>

        </div>
    `;
}


/* ==========================================================
   ESCAPE JAVASCRIPT STRING
========================================================== */

function escapeJS(value) {

    return String(
        value ?? ""
    )
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}


/* ==========================================================
   DOCUMENTATION TABLE
========================================================== */

function renderDocumentation(
    contracts
) {

    const table =
        $("documentationTable");

    if (!table) {
        return;
    }

    table.innerHTML = "";

    contracts
        .slice(0, 10)
        .forEach(
            contract => {

                const tr =
                    document.createElement("tr");

                tr.innerHTML = `

                    <td>
                        ${escapeHTML(
                            contract.contract_number ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            contract.compliance_status ||
                            "Pending"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            contract.expiry_date
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            contract.risk_level ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            contract.renewal_status ||
                            "—"
                        )}
                    </td>

                    <td>
                        <span class="status-badge ${getStatusClass(
                            contract.status
                        )}">
                            ${escapeHTML(
                                contract.status ||
                                "—"
                            )}
                        </span>
                    </td>

                    <td>
                        ${actionButtons(
                            contract
                        )}
                    </td>
                `;

                table.appendChild(tr);
            }
        );
}


/* ==========================================================
   ACTIVITIES
========================================================== */

function renderActivities(
    activities
) {

    const container =
        $("activityList");

    if (!container) {
        return;
    }

    if (!activities.length) {

        container.innerHTML =
            `
                <div class="empty-state">
                    No recent contract activities.
                </div>
            `;

        return;
    }

    container.innerHTML =
        activities.map(
            activity => {

                return `
                    <div class="activity-item">

                        <div class="activity-icon ${escapeHTML(
                            activity.activity_type || ""
                        )}">
                            <i class="fa-solid fa-file-contract"></i>
                        </div>

                        <div class="activity-content">

                            <strong style="font-size:12px;">
                                ${escapeHTML(
                                    activity.contract_number ||
                                    "Contract"
                                )}
                            </strong>

                            <p style="font-size:10px;">
                                ${escapeHTML(
                                    activity.message ||
                                    ""
                                )}
                            </p>

                            <small style="font-size:9px;">
                                ${formatDate(
                                    activity.date
                                )}
                            </small>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* ==========================================================
   EXPIRY NOTIFICATIONS
========================================================== */

function renderExpiryNotifications(
    contracts
) {

    const container =
        $("expiryNotifications");

    if (!container) {
        return;
    }

    const expiring =
        contracts
            .map(
                contract => ({
                    ...contract,
                    calculatedDays:
                        calculateDaysLeft(contract)
                })
            )
            .filter(
                contract =>
                    contract.calculatedDays !== null &&
                    contract.calculatedDays >= 0 &&
                    contract.calculatedDays <= 30
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.calculatedDays -
                    b.calculatedDays
            )
            .slice(0, 5);

    if (!expiring.length) {

        container.innerHTML =
            `
                <div class="empty-state">
                    No contract expiry alerts.
                </div>
            `;

        return;
    }

    container.innerHTML =
        expiring.map(
            contract => {

                return `
                    <div class="notification-item">

                        <div class="notification-icon" style="color:red;">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </div>

                        <div>

                            <strong style="font-size:12px;">
                                ${escapeHTML(
                                    contract.contract_number ||
                                    "Contract"
                                )}
                            </strong>

                            <p style="font-size:9px;">
                                Expires in
                                ${contract.calculatedDays}
                                day${contract.calculatedDays === 1 ? "" : "s"}.
                            </p>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


/* ==========================================================
   CERTIFICATION SECTION
==========================================================

   No certification API was supplied in the backend.
   Therefore this section displays compliance information
   available from the contract API instead of inventing
   certification data.
========================================================== */

function renderCertificationSection(
    contracts
) {

    const container =
        $("certificationList");

    if (!container) {
        return;
    }

    if (!contracts.length) {

        container.innerHTML =
            `
                <div class="empty-state">
                    No contract compliance records available.
                </div>
            `;

        return;
    }

    container.innerHTML =
        contracts
            .slice(0, 5)
            .map(
                contract => {

                    return `
                        <div class="certification-item">

                            <div class="certification-icon" style="color:blue;">
                                <i class="fa-solid fa-check"></i>
                            </div>

                            <div>

                                <strong style="font-size:12px;">
                                    ${escapeHTML(
                                        contract.contract_number ||
                                        "Contract"
                                    )}
                                </strong>

                                <small style="font-size:9px;">
                                    ${escapeHTML(
                                        contract.compliance_status ||
                                        "Pending"
                                    )}
                                </small>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* ==========================================================
   LOAD ALL CONTRACTS
========================================================== */

async function loadAllContracts(
    page = 1
) {

    try {

        currentPage =
            page;

        const params =
            new URLSearchParams();

        params.set(
            "vendor_id",
            currentVendorId
        );

        params.set(
            "page",
            currentPage
        );

        params.set(
            "limit",
            pageLimit
        );

        const search =
            $("globalSearch")?.value?.trim();

        if (search) {

            params.set(
                "search",
                search
            );
        }

        const data =
            await apiFetch(
                `/api/vendor/contracts/?${params.toString()}`
            );

        if (!data) {
            return;
        }

        allContracts =
            Array.isArray(data.contracts)
                ? data.contracts
                : [];

        filteredContracts =
            [...allContracts];

        renderDocumentation(
            allContracts
        );

        renderExpiringContracts(
            allContracts.filter(
                contract => {

                    const days =
                        calculateDaysLeft(
                            contract
                        );

                    return (
                        days !== null &&
                        days >= 0 &&
                        days <= 30
                    );
                }
            )
        );

        renderActivitiesFromContracts(
            allContracts
        );

        console.log(
            "Contracts loaded:",
            data
        );

    } catch (error) {

        console.error(
            "Unable to load contracts:",
            error
        );

        showAlert(
            error.message ||
            "Unable to load contracts.",
            "error"
        );
    }
}


/* ==========================================================
   ACTIVITIES FROM CONTRACT LIST
========================================================== */

function renderActivitiesFromContracts(
    contracts
) {

    const activities =
        contracts
            .slice(0, 10)
            .map(
                contract => {

                    const days =
                        calculateDaysLeft(
                            contract
                        );

                    let type =
                        "active";

                    let message =
                        `Contract ${contract.contract_number || ""} is active.`;

                    if (
                        days !== null &&
                        days < 0
                    ) {

                        type =
                            "expired";

                        message =
                            `Contract ${contract.contract_number || ""} has expired.`;

                    } else if (
                        days !== null &&
                        days <= 30
                    ) {

                        type =
                            "warning";

                        message =
                            `Contract ${contract.contract_number || ""} is expiring soon.`;
                    }

                    return {
                        contract_id:
                            contract.id,
                        contract_number:
                            contract.contract_number,
                        activity_type:
                            type,
                        message,
                        date:
                            contract.expiry_date
                    };
                }
            );

    renderActivities(
        activities
    );
}


/* ==========================================================
   FILTER STATUS
========================================================== */

async function filterStatus(
    status
) {

    try {

        const params =
            new URLSearchParams();

        params.set(
            "vendor_id",
            currentVendorId
        );

        params.set(
            "status",
            status
        );

        params.set(
            "page",
            1
        );

        params.set(
            "limit",
            pageLimit
        );

        const data =
            await apiFetch(
                `/api/vendor/contracts/?${params.toString()}`
            );

        if (!data) {
            return;
        }

        allContracts =
            data.contracts || [];

        filteredContracts =
            [...allContracts];

        renderDocumentation(
            allContracts
        );

        renderExpiringContracts(
            allContracts
        );

        renderActivitiesFromContracts(
            allContracts
        );

        document
            .querySelector(
                ".bottom-grid"
            )
            ?.scrollIntoView({
                behavior: "smooth"
            });

    } catch (error) {

        console.error(
            "Status filter failed:",
            error
        );

        showAlert(
            error.message ||
            "Unable to filter contracts.",
            "error"
        );
    }
}


/* ==========================================================
   VIEW CONTRACT
========================================================== */

async function viewContract(
    contractId
) {

    try {

        const data =
            await apiFetch(
                `/api/vendor/contracts/${encodeURIComponent(contractId)}`
            );

        if (!data) {
            return;
        }

        const contract =
            data.contract || data;

        openEditModal(
            contract,
            true
        );

    } catch (error) {

        console.error(
            "Unable to load contract:",
            error
        );

        showAlert(
            error.message ||
            "Unable to load contract.",
            "error"
        );
    }
}


/* ==========================================================
   EDIT CONTRACT
========================================================== */

async function editContract(
    contractId
) {

    try {

        const data =
            await apiFetch(
                `/api/vendor/contracts/${encodeURIComponent(contractId)}`
            );

        if (!data) {
            return;
        }

        const contract =
            data.contract || data;

        openEditModal(
            contract,
            false
        );

    } catch (error) {

        console.error(
            "Unable to load contract:",
            error
        );

        showAlert(
            error.message ||
            "Unable to load contract.",
            "error"
        );
    }
}


/* ==========================================================
   OPEN CREATE MODAL
========================================================== */

function openCreateModal() {

    editingContractNumber =
        null;

    $("modalTitle").textContent =
        "Add Contract";

    $("contractForm").reset();

    $("contractId").value =
        "";

    $("vendorId").value =
        currentVendorId || "";

    $("vendorId").readOnly =
        true;

    /*
     * Contract number is generated by backend.
     */

    $("contractNumber").value =
        "";

    $("contractNumber").placeholder =
        "Generated automatically";

    $("contractNumber").readOnly =
        true;

    $("contractModal")
        .classList
        .remove("hidden");
}


/* ==========================================================
   OPEN EDIT MODAL
========================================================== */

function openEditModal(
    contract,
    readonly = false
) {

    editingContractNumber =
        contract.contract_number;

    $("modalTitle").textContent =
        readonly
            ? "View Contract"
            : "Edit Contract";

    $("contractId").value =
        contract.contract_number || "";

    $("contractNumber").value =
        contract.contract_number || "";

    $("vendorId").value =
        contract.vendor_id ||
        currentVendorId ||
        "";

    $("contractStatus").value =
        contract.status ||
        "Active";

    $("contractValueInput").value =
        contract.contract_value ??
        "";

    $("expiryDate").value =
        normalizeDateInput(
            contract.expiry_date
        );

    $("renewalDate").value =
        normalizeDateInput(
            contract.renewal_date
        );

    $("complianceStatus").value =
        contract.compliance_status ||
        "";

    $("riskLevel").value =
        contract.risk_level ||
        "";

    $("renewalStatus").value =
        contract.renewal_status ||
        "";

    $("vendorId").readOnly =
        readonly;

    $("contractNumber").readOnly =
        readonly;

    $("contractStatus").disabled =
        readonly;

    $("contractValueInput").readOnly =
        readonly;

    $("expiryDate").readOnly =
        readonly;

    $("renewalDate").readOnly =
        readonly;

    $("complianceStatus").disabled =
        readonly;

    $("riskLevel").disabled =
        readonly;

    $("renewalStatus").disabled =
        readonly;

    const submitButton =
        $("contractForm")
            ?.querySelector(
                'button[type="submit"]'
            );

    if (submitButton) {

        submitButton.style.display =
            readonly
                ? "none"
                : "";
    }

    $("contractModal")
        .classList
        .remove("hidden");
}


/* ==========================================================
   NORMALIZE DATE INPUT
========================================================== */

function normalizeDateInput(
    value
) {

    if (!value) {
        return "";
    }

    if (
        typeof value === "string" &&
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
        .split("T")[0];
}


/* ==========================================================
   CLOSE MODAL
========================================================== */

function closeModal() {

    const modal =
        $("contractModal");

    if (!modal) {
        return;
    }

    modal
        .classList
        .add("hidden");

    const form =
        $("contractForm");

    if (form) {
        form.reset();
    }

    editingContractNumber =
        null;

    $("contractNumber").readOnly =
        false;

    $("vendorId").readOnly =
        false;

    $("contractStatus").disabled =
        false;

    $("contractValueInput").readOnly =
        false;

    $("expiryDate").readOnly =
        false;

    $("renewalDate").readOnly =
        false;

    $("complianceStatus").disabled =
        false;

    $("riskLevel").disabled =
        false;

    $("renewalStatus").disabled =
        false;

    const submitButton =
        $("contractForm")
            ?.querySelector(
                'button[type="submit"]'
            );

    if (submitButton) {
        submitButton.style.display =
            "";
    }
}


/* ==========================================================
   CREATE / UPDATE FORM
========================================================== */

async function submitContractForm(
    event
) {

    event.preventDefault();

    try {

        const isEdit =
            Boolean(
                editingContractNumber
            );


        /* --------------------------------------------------
           VALIDATION
        -------------------------------------------------- */

        const vendorId =
            $("vendorId")
                .value
                .trim();

        if (!vendorId) {

            showAlert(
                "Vendor ID is required.",
                "error"
            );

            return;
        }


        /* --------------------------------------------------
           PAYLOAD
        -------------------------------------------------- */

        const payload = {

            vendor_id:
                vendorId,

            status:
                $("contractStatus").value,

            expiry_date:
                $("expiryDate").value ||
                null,

            renewal_date:
                $("renewalDate").value ||
                null,

            contract_value:
                $("contractValueInput").value
                    ? Number(
                        $("contractValueInput").value
                    )
                    : null,

            compliance_status:
                $("complianceStatus").value ||
                null,

            risk_level:
                $("riskLevel").value ||
                null,

            renewal_status:
                $("renewalStatus").value ||
                null
        };


        /* --------------------------------------------------
           CREATE
        -------------------------------------------------- */

        if (!isEdit) {

            /*
             * Backend generates:
             *
             * CON-{vendor_id}-{year}-000001
             */

            const data =
                await apiFetch(
                    "/api/vendor/contract/",
                    {
                        method: "POST",
                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );

            if (!data) {
                return;
            }

            showAlert(
                data.message ||
                "Contract created successfully.",
                "success"
            );

        }


        /* --------------------------------------------------
           UPDATE
        -------------------------------------------------- */

        else {

            const updatePayload =
                { ...payload };

            /*
             * Do not send vendor_id when it
             * has not changed.
             */

            const data =
                await apiFetch(
                    `/api/vendor/contracts/${encodeURIComponent(editingContractNumber)}`,
                    {
                        method: "PUT",
                        body:
                            JSON.stringify(
                                updatePayload
                            )
                    }
                );

            if (!data) {
                return;
            }

            showAlert(
                data.message ||
                "Contract updated successfully.",
                "success"
            );
        }


        /* --------------------------------------------------
           CLOSE + REFRESH
        -------------------------------------------------- */

        closeModal();

        await loadDashboard();

    } catch (error) {

        console.error(
            "Contract save failed:",
            error
        );

        showAlert(
            error.message ||
            "Unable to save contract.",
            "error"
        );
    }
}


/* ==========================================================
   DELETE CONTRACT
========================================================== */

async function deleteContract(
    contractId
) {

    if (!contractId) {
        return;
    }

    const confirmed =
        window.confirm(
            `Delete contract ${contractId}?`
        );

    if (!confirmed) {
        return;
    }

    try {

        const data =
            await apiFetch(
                `/api/vendor/contracts/${encodeURIComponent(contractId)}`,
                {
                    method: "DELETE"
                }
            );

        if (!data) {
            return;
        }

        showAlert(
            data.message ||
            "Contract deleted successfully.",
            "success"
        );

        await loadDashboard();

    } catch (error) {

        console.error(
            "Delete contract failed:",
            error
        );

        showAlert(
            error.message ||
            "Unable to delete contract.",
            "error"
        );
    }
}


/* ==========================================================
   SEARCH
========================================================== */

let searchTimer = null;

function initializeSearch() {

    const searchInput =
        $("globalSearch");

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );

            searchTimer =
                setTimeout(
                    () => {

                        loadAllContracts(
                            1
                        );

                    },
                    350
                );
        }
    );
}


/* ==========================================================
   FORM INITIALIZATION
========================================================== */

function initializeForm() {

    const form =
        $("contractForm");

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        submitContractForm
    );
}


/* ==========================================================
   MODAL OUTSIDE CLICK
========================================================== */

function initializeModal() {

    const modal =
        $("contractModal");

    if (!modal) {
        return;
    }

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeModal();
            }
        }
    );
}


/* ==========================================================
   KEYBOARD ESC
========================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeModal();
        }
    }
);


/* ==========================================================
   GLOBAL SEARCH
========================================================== */

function initializeGlobalSearch() {

    initializeSearch();
}


/* ==========================================================
   INITIALIZE PAGE
========================================================== */

async function initializePage() {

    console.log(
        "================================================"
    );

    console.log(
        "VENDOR CONTRACT COMPLIANCE"
    );

    console.log(
        "Initializing page..."
    );

    console.log(
        "================================================"
    );


    /* ------------------------------------------------------
       Resolve vendor ID
    ------------------------------------------------------ */

    currentVendorId =
        resolveVendorId();

    console.log(
        "CURRENT VENDOR ID:",
        currentVendorId
    );


    if (!currentVendorId) {

        showAlert(
            "Vendor ID not found. Please login again.",
            "error"
        );

        return;
    }


    /* ------------------------------------------------------
       Initialize UI
    ------------------------------------------------------ */

    initializeForm();

    initializeModal();

    initializeGlobalSearch();


    /* ------------------------------------------------------
       Load dashboard
    ------------------------------------------------------ */

    await loadDashboard();


    /* ------------------------------------------------------
       Load contracts
    ------------------------------------------------------ */

    await loadAllContracts(
        1
    );

    console.log(
        "Contract page initialized."
    );
}


/* ==========================================================
   PAGE LOAD
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializePage
);


/* ==========================================================
   GLOBAL FUNCTIONS
   Required by inline onclick="" in HTML
========================================================== */

window.openCreateModal =
    openCreateModal;

window.closeModal =
    closeModal;

window.filterStatus =
    filterStatus;

window.loadAllContracts =
    loadAllContracts;

window.viewContract =
    viewContract;

window.editContract =
    editContract;

window.deleteContract =
    deleteContract;