"use strict";

const API_BASE = "http://127.0.0.1:8000";

let auditPlanChart = null;
let riskCategoryChart = null;


/* =========================================================
   AUTH
========================================================= */

function getToken() {

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("jwt_token");

    if (!token) {
        console.warn("No authentication token found.");
        return null;
    }

    return token.trim();
}


/* =========================================================
   API
========================================================= */

async function apiFetch(url, options = {}) {

    const token = getToken();

    if (!token) {
        throw new Error(
            "Authentication token not found. Please log in again."
        );
    }

    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    /*
     * Do not force Content-Type for GET requests.
     * Only send it when a request actually has a body.
     */
    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    headers.Authorization = `Bearer ${token}`;

    console.log("API Request:", `${API_BASE}${url}`);
    console.log("Authorization token found:", !!token);

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers,
            credentials: "include"
        }
    );

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const data =
                await response.json();

            message =
                data.detail ||
                data.message ||
                message;

        } catch (_) {}

        if (response.status === 401) {

            console.error(
                "401 Unauthorized:",
                `${API_BASE}${url}`
            );

            console.error(
                "Token exists:",
                !!token
            );

            /*
             * Do not automatically remove the token here
             * while debugging. We want to know whether the
             * backend is rejecting the token.
             */
        }

        throw new Error(message);
    }

    /*
     * Some successful endpoints may return 204.
     */
    if (response.status === 204) {
        return null;
    }

    return response.json();
}


/* =========================================================
   USER
   ========================================================= */

async function loadCurrentUser() {

    try {

        const user =
            await apiFetch(
                "/api/auditor/settings/profile"
            );

        const name =
            user.name ||
            user.full_name ||
            user.username ||
            "Auditor";

        const role =
            user.role ||
            "Auditor";

        document.getElementById(
            "headerUserName"
        ).textContent = name;

        document.getElementById(
            "sidebarUserName"
        ).textContent = name;

        document.getElementById(
            "headerUserRole"
        ).textContent = role;

        document.getElementById(
            "sidebarUserRole"
        ).textContent = role;

    } catch (error) {

        console.warn(
            "Unable to load current user:",
            error
        );

    }
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

    try {

        const data =
            await apiFetch(
                "/api/auditor/planning-risk/dashboard"
            );

        renderKPIs(
            data.kpis
        );

        renderAuditPlanChart(
            data.audit_plan_overview
        );

        renderRiskHeatMap(
            data.risk_heat_map
        );

        renderRiskCategoryChart(
            data.risk_categories
        );

        renderAuditPlans(
            data.audit_plans
        );

        renderTopRisks(
            data.top_risks
        );

        renderTreatments(
            data.risk_treatments
        );

    } catch (error) {

        console.error(
            "Planning & Risk dashboard error:",
            error
        );

        showError(
            error.message
        );
    }
}


/* =========================================================
   KPI
   ========================================================= */

function renderKPIs(kpis) {

    document.getElementById(
        "auditPlansKpi"
    ).textContent =
        kpis.audit_plans ?? 0;

    document.getElementById(
        "identifiedRisksKpi"
    ).textContent =
        kpis.identified_risks ?? 0;

    document.getElementById(
        "highRisksKpi"
    ).textContent =
        kpis.high_risks ?? 0;

    document.getElementById(
        "riskTreatmentsKpi"
    ).textContent =
        kpis.risk_treatments ?? 0;

    document.getElementById(
        "riskAcceptanceKpi"
    ).textContent =
        kpis.risk_acceptance ?? 0;
}


/* =========================================================
   AUDIT PLAN DONUT
   ========================================================= */

function renderAuditPlanChart(data) {

    const ctx =
        document.getElementById(
            "auditPlanChart"
        );

    if (!ctx) return;

    if (auditPlanChart) {
        auditPlanChart.destroy();
    }

    auditPlanChart =
        new Chart(ctx, {

            type: "doughnut",

            data: {

                labels: [
                    "Completed",
                    "In Progress",
                    "Not Started",
                    "On Hold"
                ],

                datasets: [{
                    data: [
                        data.completed || 0,
                        data.in_progress || 0,
                        data.not_started || 0,
                        data.on_hold || 0
                    ],

                    backgroundColor: [
                        "#7137d9",
                        "#21b66f",
                        "#1470ec",
                        "#9b5de5"
                    ],

                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: "64%",

                plugins: {

                    legend: {
                        position: "right",

                        labels: {
                            boxWidth: 10,
                            padding: 12,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
}


/* =========================================================
   HEAT MAP
   ========================================================= */

function renderRiskHeatMap(matrix) {

    const container =
        document.getElementById(
            "riskHeatMap"
        );

    if (!container) return;

    container.innerHTML = "";

    const values = [
        ...(matrix[0] || []),
        ...(matrix[1] || []),
        ...(matrix[2] || [])
    ];

    values.forEach(
        value => {

            const cell =
                document.createElement(
                    "div"
                );

            cell.className =
                "heat-cell";

            const index =
                values.indexOf(value);

            /*
             * Matrix order:
             *
             * High:
             * Low, Medium, High
             *
             * Medium:
             * Low, Medium, High
             *
             * Low:
             * Low, Medium, High
             */

            if (index === 2 ||
                index === 5 ||
                index === 6) {

                cell.classList.add(
                    "heat-high"
                );

            } else if (
                index === 1 ||
                index === 4 ||
                index === 7
            ) {

                cell.classList.add(
                    "heat-medium"
                );

            } else {

                cell.classList.add(
                    "heat-low"
                );
            }

            cell.textContent =
                value || 0;

            container.appendChild(
                cell
            );
        }
    );

    const high =
        (matrix[0]?.[2] || 0) +
        (matrix[1]?.[2] || 0) +
        (matrix[0]?.[1] || 0);

    const medium =
        (matrix[1]?.[1] || 0) +
        (matrix[2]?.[1] || 0) +
        (matrix[2]?.[2] || 0);

    const low =
        (matrix[2]?.[0] || 0) +
        (matrix[1]?.[0] || 0) +
        (matrix[0]?.[0] || 0);

    document.getElementById(
        "highHeatCount"
    ).textContent = high;

    document.getElementById(
        "mediumHeatCount"
    ).textContent = medium;

    document.getElementById(
        "lowHeatCount"
    ).textContent = low;
}


/* =========================================================
   CATEGORY DONUT
   ========================================================= */

function renderRiskCategoryChart(
    categories
) {

    const ctx =
        document.getElementById(
            "riskCategoryChart"
        );

    if (!ctx) return;

    if (riskCategoryChart) {
        riskCategoryChart.destroy();
    }

    const labels =
        categories.map(
            item => item.category
        );

    const values =
        categories.map(
            item => item.count
        );

    const colors = [
        "#1470ec",
        "#21b66f",
        "#f59a18",
        "#7137d9",
        "#2da9d6",
        "#ef4444"
    ];

    riskCategoryChart =
        new Chart(ctx, {

            type: "doughnut",

            data: {

                labels,

                datasets: [{

                    data: values,

                    backgroundColor:
                        colors.slice(
                            0,
                            values.length
                        ),

                    borderColor: "#ffffff",

                    borderWidth: 2
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: "64%",

                plugins: {

                    legend: {

                        position: "right",

                        labels: {
                            boxWidth: 10,
                            padding: 9,
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
}


/* =========================================================
   AUDIT PLANS TABLE
   ========================================================= */

function renderAuditPlans(
    plans
) {

    const tbody =
        document.getElementById(
            "auditPlansTable"
        );

    tbody.innerHTML = "";

    if (!plans?.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    No audit plans available.
                </td>
            </tr>
        `;

        return;
    }

    plans.forEach(
        plan => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            plan.title
                        )}
                    </strong>

                    <div style="
                        color:#7b8ca4;
                        margin-top:3px;
                    ">
                        ${escapeHtml(
                            plan.audit_number
                        )}
                    </div>
                </td>

                <td>
                    ${escapeHtml(
                        plan.audit_type
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        plan.period || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        plan.owner || "-"
                    )}
                </td>

                <td>
                    ${statusBadge(
                        plan.status
                    )}
                </td>

                <td>

                    <div style="
                        display:flex;
                        align-items:center;
                        gap:6px;
                    ">

                        <div style="
                            width:55px;
                            height:5px;
                            background:#e8edf3;
                            border-radius:10px;
                            overflow:hidden;
                        ">

                            <div style="
                                width:${Math.min(
                                    100,
                                    Math.max(
                                        0,
                                        Number(
                                            plan.progress || 0
                                        )
                                    )
                                )}%;
                                height:100%;
                                background:#f4b51b;
                            "></div>

                        </div>

                        <span>
                            ${Number(
                                plan.progress || 0
                            )}%
                        </span>

                    </div>

                </td>

                <td>
                    ${formatDate(
                        plan.due_date
                    )}
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}


/* =========================================================
   RISKS TABLE
   ========================================================= */

function renderTopRisks(
    risks
) {

    const tbody =
        document.getElementById(
            "topRisksTable"
        );

    tbody.innerHTML = "";

    if (!risks?.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    No risks available.
                </td>
            </tr>
        `;

        return;
    }

    risks.forEach(
        risk => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            risk.risk_title
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        risk.category
                    )}
                </td>

                <td>
                    ${impactBadge(
                        risk.impact
                    )}
                </td>

                <td>
                    ${impactBadge(
                        risk.likelihood
                    )}
                </td>

                <td>
                    ${scoreBadge(
                        risk.risk_score
                    )}
                </td>

                <td>
                    ${riskStatusBadge(
                        risk.status
                    )}
                </td>

                <td>

                    <button
                        class="action-button"
                        title="View risk"
                        onclick="viewRisk(${risk.id})"
                    >
                        <i class="fa-regular fa-eye"></i>
                    </button>

                </td>
            `;

            tbody.appendChild(row);
        }
    );
}


/* =========================================================
   TREATMENTS
   ========================================================= */

function renderTreatments(
    treatments
) {

    document.getElementById(
        "avoidCount"
    ).textContent =
        treatments.Avoid || 0;

    document.getElementById(
        "reduceCount"
    ).textContent =
        treatments.Reduce || 0;

    document.getElementById(
        "transferCount"
    ).textContent =
        treatments.Transfer || 0;

    document.getElementById(
        "acceptCount"
    ).textContent =
        treatments.Accept || 0;

    document.getElementById(
        "pendingTreatmentCount"
    ).textContent =
        treatments[
            "Pending Decision"
        ] || 0;
}


/* =========================================================
   BADGES
   ========================================================= */

function statusBadge(
    status
) {

    const value =
        String(
            status || ""
        );

    let cls =
        "status-start";

    if (value === "In Progress") {
        cls = "status-progress";
    }

    if (value === "Completed") {
        cls = "status-completed";
    }

    if (value === "On Hold") {
        cls = "status-hold";
    }

    return `
        <span class="status-badge ${cls}">
            ${escapeHtml(value)}
        </span>
    `;
}


function impactBadge(
    value
) {

    const normalized =
        String(
            value || "Medium"
        );

    const cls =
        normalized === "High"
            ? "impact-high"
            : normalized === "Low"
                ? "impact-low"
                : "impact-medium";

    return `
        <span class="impact-badge ${cls}">
            ${escapeHtml(
                normalized
            )}
        </span>
    `;
}


function scoreBadge(
    score
) {

    const number =
        Number(score || 0);

    const cls =
        number >= 7
            ? "score-high"
            : number >= 4
                ? "score-medium"
                : "score-low";

    return `
        <span class="score-badge ${cls}">
            ${number}
        </span>
    `;
}


function riskStatusBadge(
    status
) {

    const value =
        String(
            status || ""
        );

    let cls =
        "status-start";

    if (
        value === "In Treatment"
    ) {
        cls = "status-progress";
    }

    if (
        value === "Accepted" ||
        value === "Closed"
    ) {
        cls = "status-completed";
    }

    return `
        <span class="status-badge ${cls}">
            ${escapeHtml(value)}
        </span>
    `;
}


/* =========================================================
   NEW PLAN MODAL
   ========================================================= */

function setupPlanModal() {

    const modal =
        document.getElementById(
            "planModal"
        );

    const open =
        document.getElementById(
            "newPlanButton"
        );

    const close =
        document.getElementById(
            "closePlanModal"
        );

    const cancel =
        document.getElementById(
            "cancelPlan"
        );

    open.addEventListener(
        "click",
        () => {
            modal.classList.add(
                "show"
            );
        }
    );

    close.addEventListener(
        "click",
        () => {
            modal.classList.remove(
                "show"
            );
        }
    );

    cancel.addEventListener(
        "click",
        () => {
            modal.classList.remove(
                "show"
            );
        }
    );

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


/* =========================================================
   CREATE PLAN
   ========================================================= */

async function submitPlan(
    event
) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    const data = {

        title:
            formData.get("title"),

        audit_type:
            formData.get("audit_type"),

        entity_name:
            formData.get("entity_name") ||
            null,

        start_date:
            formData.get("start_date") ||
            null,

        end_date:
            formData.get("end_date") ||
            null,

        status:
            formData.get("status"),

        risk_level:
            formData.get("risk_level"),

        description:
            formData.get("description") ||
            null,

        progress: 0,

        compliance_score: 0
    };

    try {

        await apiFetch(
            "/api/auditor/audit-plans",
            {
                method: "POST",

                body:
                    JSON.stringify(data)
            }
        );

        alert(
            "Audit plan created successfully."
        );

        form.reset();

        document.getElementById(
            "planModal"
        ).classList.remove(
            "show"
        );

        await loadDashboard();

    } catch (error) {

        console.error(
            "Create plan error:",
            error
        );

        alert(
            `Unable to create audit plan: ${error.message}`
        );
    }
}


/* =========================================================
   VIEW RISK
   ========================================================= */

function viewRisk(
    riskId
) {

    window.location.href =
        `/IssuesFindings.html?risk_id=${riskId}`;
}


/* =========================================================
   MATRIX BUTTON
   ========================================================= */

function setupMatrixButton() {

    const button =
        document.getElementById(
            "matrixButton"
        );

    button.addEventListener(
        "click",
        () => {

            document.getElementById(
                "riskMatrixPanel"
            ).scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        }
    );
}


/* =========================================================
   UTILITIES
   ========================================================= */

function formatDate(
    value
) {

    if (!value) return "-";

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "2-digit",
            year: "numeric"
        }
    );
}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function showError(
    message
) {

    console.error(
        message
    );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupPlanModal();

        setupMatrixButton();

        document.getElementById(
            "planForm"
        ).addEventListener(
            "submit",
            submitPlan
        );

        await loadCurrentUser();

        await loadDashboard();

    }
);