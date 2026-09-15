const API = "http://127.0.0.1:8000";


// ==========================================================
// AUTHENTICATION
// ==========================================================

function getAuthToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken") ||
        null
    );

}


// ==========================================================
// API FETCH
// ==========================================================

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getAuthToken();


    const requestOptions = {

        ...options,

        headers: {

            "Accept":
                "application/json",

            ...(options.headers || {})

        }

    };


    if (token) {

        requestOptions.headers.Authorization =
            `Bearer ${token}`;

    }


    const response =
        await fetch(
            url,
            requestOptions
        );


    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    if (!response.ok) {

        const errorText =
            await response.text();


        throw new Error(
            `API ${response.status}: ${errorText}`
        );

    }


    if (
        !contentType.includes(
            "application/json"
        )
    ) {

        throw new Error(
            "FastAPI did not return JSON."
        );

    }


    return response.json();

}


// ==========================================================
// LOAD DASHBOARD
// ==========================================================

async function loadDashboard() {

    try {

        hideError();

        const data =
            await apiFetch(
                `${API}/api/admin/contracts/dashboard`
            );

        if (!data || typeof data !== "object") {
            throw new Error(
                "Invalid dashboard response."
            );
        }

        updateKPIs(
            data.kpis || {}
        );

        updateRepository(
            Array.isArray(data.repository)
                ? data.repository
                : []
        );

        updateRenewals(
            data.renewals || {}
        );

        updateCompliance(
            data.compliance || {}
        );

        updateExpiryNotifications(
            Array.isArray(data.expiry_notifications)
                ? data.expiry_notifications
                : []
        );

        updateNotificationCount(
            data.kpis?.notification_count || 0
        );

    }
    catch (error) {

        console.error(
            "Contract & Compliance loading error:",
            error
        );

        showError(
            error?.message ||
            "Unable to load dashboard data."
        );
    }
}


// ==========================================================
// UPDATE KPI
// ==========================================================

function updateKPIs(
    kpis
) {

    document.getElementById(
        "totalContracts"
    ).textContent =
        number(
            kpis.total_contracts
        );


    document.getElementById(
        "activeContracts"
    ).textContent =
        number(
            kpis.active_contracts
        );


    document.getElementById(
        "expiringSoon"
    ).textContent =
        number(
            kpis.expiring_soon
        );


    document.getElementById(
        "expiredContracts"
    ).textContent =
        number(
            kpis.expired_contracts
        );


    const score =
        Number(
            kpis.compliance_score || 0
        );


    document.getElementById(
        "complianceScore"
    ).textContent =
        `${score.toFixed(0)}%`;


    document.getElementById(
        "highRiskContracts"
    ).textContent =
        number(
            kpis.high_risk_contracts
        );

}


// ==========================================================
// CONTRACT REPOSITORY
// ==========================================================

function updateRepository(
    contracts
) {

    const table =
        document.getElementById(
            "contractTable"
        );


    table.innerHTML = "";


    if (
        !contracts ||
        contracts.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center"
                >

                    No contracts found.

                </td>

            </tr>

        `;

        return;

    }


    contracts.forEach(
        contract => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        contract.contract_number
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        contract.vendor_name
                    )}
                </td>

                <td>
                    ${formatMoney(
                        contract.contract_value
                    )}
                </td>

                <td>
                    ${formatDate(
                        contract.expiry_date
                    )}
                </td>

                <td>

                    ${complianceBadge(
                        contract.compliance_status
                    )}

                </td>

                <td>

                    ${statusBadge(
                        contract.contract_status
                    )}

                </td>

            `;


            table.appendChild(
                row
            );

        }
    );

}


// ==========================================================
// RENEWALS
// ==========================================================

function updateRenewals(
    data
) {

    document.getElementById(
        "renewalTotal"
    ).textContent =
        number(
            data.total
        );


    document.getElementById(
        "renewal30"
    ).textContent =
        number(
            data.zero_to_thirty
        );


    document.getElementById(
        "renewal60"
    ).textContent =
        number(
            data.thirty_one_to_sixty
        );


    document.getElementById(
        "renewal90"
    ).textContent =
        number(
            data.sixty_one_to_ninety
        );


    const list =
        document.getElementById(
            "renewalList"
        );


    list.innerHTML = "";


    if (
        !data.items ||
        data.items.length === 0
    ) {

        list.innerHTML = `

            <div class="renewal-item">

                <span>
                    No upcoming renewals
                </span>

            </div>

        `;

        return;

    }


    data.items.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "renewal-item";


            div.innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(
                            item.contract_number
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            item.vendor_name
                        )}
                    </small>

                </div>

                <div>

                    <strong>
                        ${item.days_left} days
                    </strong>

                    <small>
                        ${formatDate(
                            item.renewal_date
                        )}
                    </small>

                </div>

            `;


            list.appendChild(
                div
            );

        }
    );

}


// ==========================================================
// COMPLIANCE
// ==========================================================

// ==========================================================
// COMPLIANCE MONITORING
// ==========================================================

function updateCompliance(data = {}) {

    // ------------------------------------------------------
    // SAFE SCORE
    // ------------------------------------------------------

    let score = Number(data.score);

    if (!Number.isFinite(score)) {
        score = 0;
    }

    // Keep score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // ------------------------------------------------------
    // UPDATE SCORE
    // ------------------------------------------------------

    const gaugeScore =
        document.getElementById("gaugeScore");

    if (gaugeScore) {
        gaugeScore.textContent =
            `${score.toFixed(0)}%`;
    }

    // ------------------------------------------------------
    // UPDATE COUNTS
    // ------------------------------------------------------

    const compliantCount =
        document.getElementById("compliantCount");

    if (compliantCount) {
        compliantCount.textContent =
            number(data.compliant);
    }

    const riskCount =
        document.getElementById("riskCount");

    if (riskCount) {
        riskCount.textContent =
            number(data.at_risk);
    }

    const nonCompliantCount =
        document.getElementById("nonCompliantCount");

    if (nonCompliantCount) {
        nonCompliantCount.textContent =
            number(data.non_compliant);
    }

    // ------------------------------------------------------
    // UPDATE SEMICIRCLE GAUGE
    // ------------------------------------------------------

    const gauge =
        document.getElementById("complianceGauge");

    if (!gauge) {
        return;
    }

    /*
        The CSS gauge is a semicircle.

        Therefore we calculate the score across
        180 degrees instead of 360 degrees.
    */

    const degrees =
        (score / 100) * 180;

    gauge.style.background = `
        conic-gradient(
            from 270deg at 50% 100%,
            #22c55e 0deg,
            #22c55e ${degrees}deg,
            #1e293b ${degrees}deg,
            #1e293b 180deg,
            transparent 180deg,
            transparent 360deg
        )
    `;

    // ------------------------------------------------------
    // DYNAMIC GAUGE GLOW
    // ------------------------------------------------------

    let glowColor =
        "rgba(34, 197, 94, 0.18)";

    if (score < 50) {
        glowColor =
            "rgba(239, 68, 68, 0.20)";
    }
    else if (score < 75) {
        glowColor =
            "rgba(245, 158, 11, 0.20)";
    }

    gauge.style.filter =
        `drop-shadow(0 0 15px ${glowColor})`;
}


// ==========================================================
// EXPIRY NOTIFICATIONS
// ==========================================================

function updateExpiryNotifications(
    notifications
) {

    const table =
        document.getElementById(
            "expiryTable"
        );


    table.innerHTML = "";


    if (
        !notifications ||
        notifications.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center"
                >

                    No contracts are expiring
                    within the next 90 days.

                </td>

            </tr>

        `;

        return;

    }


    notifications.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        item.contract_number
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.vendor_name
                    )}
                </td>

                <td>
                    ${formatDate(
                        item.expiry_date
                    )}
                </td>

                <td>
                    ${item.days_left}
                </td>

                <td>

                    ${alertBadge(
                        item.alert_level
                    )}

                </td>

                <td>

                    ${riskBadge(
                        item.risk_level
                    )}

                </td>

                <td>

                    ${statusBadge(
                        item.status
                    )}

                </td>

            `;


            table.appendChild(
                row
            );

        }
    );

}


// ==========================================================
// NOTIFICATION COUNT
// ==========================================================

function updateNotificationCount(
    count
) {

    const value =
        number(count);


    document.getElementById(
        "notificationBadge"
    ).textContent =
        value;


    document.getElementById(
        "topNotificationCount"
    ).textContent =
        value;

}


// ==========================================================
// STATUS BADGE
// ==========================================================

function statusBadge(
    status
) {

    if (!status) {

        return `
            <span class="badge badge-blue">
                N/A
            </span>
        `;

    }


    const value =
        String(status)
            .toLowerCase();


    let css =
        "badge-blue";


    if (
        value === "active"
    ) {

        css =
            "badge-green";

    }

    else if (
        value === "expired"
    ) {

        css =
            "badge-red";

    }

    else if (
        value.includes("pending")
    ) {

        css =
            "badge-orange";

    }


    return `

        <span class="badge ${css}">

            ${escapeHTML(status)}

        </span>

    `;

}


// ==========================================================
// COMPLIANCE BADGE
// ==========================================================

function complianceBadge(
    status
) {

    if (!status) {

        return `
            <span class="badge badge-blue">
                N/A
            </span>
        `;

    }


    const value =
        String(status)
            .toLowerCase();


    let css =
        "badge-blue";


    if (
        value === "compliant"
    ) {

        css =
            "badge-green";

    }

    else if (
        value.includes("risk")
    ) {

        css =
            "badge-orange";

    }

    else if (
        value.includes("non")
    ) {

        css =
            "badge-red";

    }


    return `

        <span class="badge ${css}">

            ${escapeHTML(status)}

        </span>

    `;

}


// ==========================================================
// ALERT BADGE
// ==========================================================

function alertBadge(
    level
) {

    if (!level) {

        return "";

    }


    const value =
        String(level)
            .toLowerCase();


    let css =
        "badge-green";


    if (
        value === "high"
    ) {

        css =
            "badge-red";

    }

    else if (
        value === "medium"
    ) {

        css =
            "badge-orange";

    }


    return `

        <span class="badge ${css}">

            ${escapeHTML(level)}

        </span>

    `;

}


// ==========================================================
// RISK BADGE
// ==========================================================

function riskBadge(
    risk
) {

    if (!risk) {

        return `
            <span class="badge badge-blue">
                N/A
            </span>
        `;

    }


    const value =
        String(risk)
            .toLowerCase();


    let css =
        "badge-green";


    if (
        value === "high"
    ) {

        css =
            "badge-red";

    }

    else if (
        value === "medium"
    ) {

        css =
            "badge-orange";

    }


    return `

        <span class="badge ${css}">

            ${escapeHTML(risk)}

        </span>

    `;

}


// ==========================================================
// FORMAT MONEY
// ==========================================================

function formatMoney(
    value
) {

    const numberValue =
        Number(value || 0);


    if (numberValue === 0) {

        return "$0";

    }


    return "$" +
        numberValue.toLocaleString(
            "en-US",
            {
                maximumFractionDigits: 0
            }
        );

}


// ==========================================================
// FORMAT NUMBER
// ==========================================================

function number(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );

}


// ==========================================================
// FORMAT DATE
// ==========================================================

function formatDate(
    value
) {

    if (!value) {

        return "N/A";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "N/A";

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


// ==========================================================
// ESCAPE HTML
// ==========================================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
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


// ==========================================================
// SEARCH
// ==========================================================

function setupSearch() {

    const input =
        document.getElementById("searchInput");

    if (!input) {
        console.warn(
            "searchInput element not found."
        );
        return;
    }

    input.addEventListener(
        "input",
        function () {

            const query =
                this.value
                    .toLowerCase()
                    .trim();

            const rows =
                document.querySelectorAll(
                    "#contractTable tr"
                );

            rows.forEach(row => {

                const text =
                    row.textContent
                        .toLowerCase();

                row.style.display =
                    text.includes(query)
                        ? ""
                        : "none";
            });
        }
    );
}


// ==========================================================
// ERROR
// ==========================================================

function showError(
    message
) {

    const element =
        document.getElementById(
            "errorMessage"
        );


    element.style.display =
        "block";


    element.textContent =
        `Unable to load Contract & Compliance data: ${message}`;

}


function hideError() {

    const element =
        document.getElementById(
            "errorMessage"
        );


    element.style.display =
        "none";

}


function openAdminProfile() {

    window.location.href =
        "/admin/profile";

}


// ============================================================
// HELPER: SET TEXT
// ============================================================

function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {

        element.textContent =
            value ?? "";

    }
}


function updateHeader(user) {

    const name =
        user.name || "Admin User";

    const email =
        user.email || "";

    const role =
        user.role || "Administrator";


    setText(
        "headerAdminName",
        name
    );

    setText(
        "headerAdminRole",
        role
    );


    setText(
        "sidebarAdminName",
        name
    );

    setText(
        "sidebarAdminEmail",
        email
    );
}


async function loadAdminProfile() {

    try {

        const data = await apiFetch(
            `${API}/adminprofile`
        );

        console.log(
            "Admin profile:",
            data
        );

        // If API returns:
        // { name, email, role }
        updateHeader(data);

    }
    catch (error) {

        console.error(
            "Unable to load admin profile:",
            error
        );

    }
}


// ==========================================================
// INITIALIZATION
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadAdminProfile();

        loadDashboard();

        setupSearch();

        const refreshButton =
            document.getElementById(
                "refreshButton"
            );

        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                function () {

                    refreshButton.disabled = true;

                    loadDashboard()
                        .finally(() => {

                            refreshButton.disabled =
                                false;

                        });
                }
            );
        }

    }
);