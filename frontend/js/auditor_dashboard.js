const API_BASE_URL = "http://127.0.0.1:8000";
let complianceDonutChartInstance = null;
let traceableEntitiesData = null;
let findingsCache = [];
let currentFindingsFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
    loadAuditorDashboard();
    setupClickableCards();
});

// Setup click handler for navigation cards
function setupClickableCards() {
    document.querySelectorAll(".clickable-card[data-href]").forEach(card => {
        card.addEventListener("click", (e) => {
            // Avoid triggering when clicking buttons or links inside the card
            if (e.target.closest("button") || e.target.closest("a") || e.target.closest("select") || e.target.closest("input")) {
                return;
            }
            const href = card.getAttribute("data-href");
            if (href) {
                if (href.startsWith("#")) {
                    const el = document.querySelector(href);
                    if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                } else {
                    window.location.href = href;
                }
            }
        });
    });
}

// ==================================================
// 1. MAIN AUDITOR DASHBOARD LOADER
// ==================================================
async function loadAuditorDashboard() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/dashboard/auditor-stats`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            throw new Error(`Auditor stats load failed: ${response.status}`);
        }

        const data = await response.json();

        // Dynamic Greeting
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
        const elWelcome = document.getElementById("auditWelcomeTitle");
        if (elWelcome) {
            elWelcome.innerHTML = `${greeting}, ${getUserName()} 👋`;
        }

        // 1. KPI Summary Cards
        const highRiskCount = data.findings_summary?.high_risk ?? (data.findings ? data.findings.length : 0);
        const totalLogsCount = Number(data.total_logs || 0);
        const compRate = data.compliance_rate ?? 0;
        const controlsCount = data.controls ? data.controls.length : 5;

        const elTotalLogs = document.getElementById("totalLogs");
        if (elTotalLogs) elTotalLogs.innerText = totalLogsCount.toLocaleString();

        const elCompRate = document.getElementById("complianceRateVal");
        if (elCompRate) elCompRate.innerText = `${compRate}%`;

        const elHighRisk = document.getElementById("highRiskFindingsVal");
        if (elHighRisk) elHighRisk.innerText = highRiskCount;

        const elControlsAssessed = document.getElementById("controlsAssessedVal");
        if (elControlsAssessed) elControlsAssessed.innerText = `${controlsCount}/5`;

        const elAvgQuality = document.getElementById("avgQualityScoreSub");
        if (elAvgQuality) elAvgQuality.innerText = `Quality Avg: ${data.insights?.avg_quality_score || 0}%`;

        const elCompBadge = document.getElementById("complianceRateBadge");
        if (elCompBadge) elCompBadge.innerText = `${compRate}% Overall Compliance`;

        const elChecklistBadge = document.getElementById("checklistProgressBadge");
        if (elChecklistBadge) elChecklistBadge.innerText = `${data.checklist_progress || 0}% Verified`;

        // 2. Populate Attention Required Section
        const elFocusHighRisk = document.getElementById("auditFocusHighRisk");
        if (elFocusHighRisk) elFocusHighRisk.innerText = `${highRiskCount} Findings Flagged`;

        const elFocusComp = document.getElementById("auditFocusCompliance");
        if (elFocusComp) elFocusComp.innerText = `${compRate}% SLA Pass`;

        const elFocusLogs = document.getElementById("auditFocusTotalLogs");
        if (elFocusLogs) elFocusLogs.innerText = `${totalLogsCount.toLocaleString()} Tracked Events`;

        const elFocusControls = document.getElementById("auditFocusControls");
        if (elFocusControls) elFocusControls.innerText = `${controlsCount} / 5 Assessed`;

        // 3. Insights
        const elFindInsight = document.getElementById("findingsInsight");
        if (elFindInsight) {
            elFindInsight.innerText = `Found ${highRiskCount} high-risk findings across suppliers with critical delivery or quality SLA variance.`;
        }

        const elQualInsight = document.getElementById("qualityInsight");
        if (elQualInsight) {
            elQualInsight.innerText = `Platform material quality average is ${data.insights?.avg_quality_score || 0}%. ${data.insights?.failed_inspections_count || 0} inspections flagged for review.`;
        }

        const elCntInsight = document.getElementById("contractAuditInsight");
        if (elCntInsight) {
            elCntInsight.innerText = `${data.insights?.expiring_contracts_count || 0} contract agreements are due for periodic compliance review.`;
        }

        // 4. Render Large Compliance Donut Chart
        if (data.compliance_breakdown) {
            renderComplianceDonut(data.compliance_breakdown);
        }

        // 5. Render Checklist Controls (Transparent metrics)
        renderChecklistControls(data.controls || []);

        // 6. Render Audit Trail
        renderAuditTrail(data.audit_trail || []);

        // 7. Initialize Traceable Entities dropdown
        loadTraceableEntities();

        // 8. Initialize Approval Verification Table
        loadApprovalVerification();

        // 9. Initialize Evidence & Certifications
        loadEvidenceAndCertifications();

        // 10. Initialize Audit Findings & Summary
        loadFindingsSummary();
        loadFindings("all");

    } catch (err) {
        console.error("Error loading Auditor dashboard:", err);
    }
}

// ==================================================
// 2. COMPLIANCE DONUT CHART
// ==================================================
function renderComplianceDonut(breakdown) {
    const ctx = document.getElementById("complianceDonutChart");
    if (!ctx) return;

    if (complianceDonutChartInstance) {
        complianceDonutChartInstance.destroy();
    }

    const labels = ["Compliant", "Partially Compliant", "Non-Compliant", "Not Assessed"];
    const counts = [
        breakdown.compliant || 0,
        breakdown.partially_compliant || 0,
        breakdown.non_compliant || 0,
        breakdown.not_assessed || 0
    ];

    const colors = [
        "#10b981", // Compliant (Green)
        "#f59e0b", // Partially Compliant (Amber)
        "#ef4444", // Non-Compliant (Red)
        "#94a3b8"  // Not Assessed (Slate)
    ];

    complianceDonutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11, weight: '500' },
                        padding: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw} partner(s)`;
                        }
                    }
                }
            }
        }
    });
}

// ==================================================
// 3. TRANSPARENT 5 CONTROLS WITH REAL SOURCE COUNTS
// ==================================================
function renderChecklistControls(controls) {
    const container = document.getElementById("controlsListContainer");
    if (!container) return;
    container.innerHTML = "";

    controls.forEach(ctrl => {
        let badgeClass = "badge-active";
        const statusLower = (ctrl.status || "").toLowerCase();
        if (statusLower.includes("warning") || statusLower.includes("action") || statusLower.includes("poor")) {
            badgeClass = "badge-poor";
        } else if (statusLower.includes("progress") || statusLower.includes("review") || statusLower.includes("needed")) {
            badgeClass = "badge-warning";
        } else if (statusLower.includes("verified") || statusLower.includes("reconciled") || statusLower.includes("passed")) {
            badgeClass = "badge-active";
        }

        const compliancePct = ctrl.compliance_level ?? ctrl.completion ?? 0;
        const assessed = ctrl.records_assessed ?? 0;
        const passed = ctrl.records_passed ?? 0;
        const failed = ctrl.records_failed ?? 0;

        let barColor = "var(--primary-color)";
        if (compliancePct < 50) barColor = "var(--danger-color)";
        else if (compliancePct < 75) barColor = "#f59e0b";
        else barColor = "#10b981";

        const div = document.createElement("div");
        div.style.cssText = "padding: 10px 12px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px;";
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 13px; font-weight: 600; color: var(--text-color);">${escapeHTML(ctrl.name)}</span>
                <span class="badge ${badgeClass}">${escapeHTML(ctrl.status)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">
                <span>Compliance Level</span>
                <span style="font-weight: 700; color: var(--text-color);">${compliancePct}%</span>
            </div>
            <div class="progress-meter" style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 2px;">
                <div style="height: 100%; width: ${compliancePct}%; background: ${barColor}; border-radius: 3px; transition: width 0.4s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary); margin-top: 6px; background: #f8fafc; padding: 4px 8px; border-radius: 4px;">
                <span>Assessed: <strong>${assessed.toLocaleString()}</strong></span>
                <span style="color: #10b981;">Passed: <strong>${passed.toLocaleString()}</strong></span>
                <span style="color: #ef4444;">Failed: <strong>${failed.toLocaleString()}</strong></span>
                <span>Rate: <strong>${compliancePct}%</strong></span>
            </div>
            <div style="font-size: 10.5px; color: var(--text-secondary); margin-top: 4px; font-style: italic;">
                Source basis: ${escapeHTML(ctrl.source_basis || 'Actual database operational records')}
            </div>
        `;
        container.appendChild(div);
    });
}

// ==================================================
// 4. FEATURE 1: END-TO-END TRANSACTION TRACEABILITY
// ==================================================
async function loadTraceableEntities() {
    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/audit/traceable-entities`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!res.ok) return;
        traceableEntitiesData = await res.json();
        populateQuickSelect();
    } catch (e) {
        console.warn("Could not load traceable entities:", e);
    }
}

function onTraceTypeChanged() {
    const input = document.getElementById("traceEntityIdInput");
    if (input) input.value = "";
    populateQuickSelect();
}

function populateQuickSelect() {
    const select = document.getElementById("traceQuickSelect");
    const typeSelect = document.getElementById("traceEntityType");
    if (!select || !typeSelect || !traceableEntitiesData) return;

    const selectedType = typeSelect.value;
    let listKey = "purchase_orders";
    if (selectedType === "purchase_request") listKey = "purchase_requests";
    else if (selectedType === "invoice") listKey = "invoices";
    else if (selectedType === "payment") listKey = "payments";
    else if (selectedType === "contract") listKey = "contracts";
    else if (selectedType === "vendor") listKey = "vendors";

    const items = traceableEntitiesData[listKey] || [];
    select.innerHTML = '<option value="">-- Choose from Database --</option>';

    items.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.innerText = item.label || `${item.reference || item.id}`;
        select.appendChild(opt);
    });
}

function onTraceQuickSelected() {
    const quickSelect = document.getElementById("traceQuickSelect");
    const input = document.getElementById("traceEntityIdInput");
    if (quickSelect && quickSelect.value) {
        input.value = quickSelect.value;
        executeTrace();
    }
}

async function executeTrace() {
    const typeSelect = document.getElementById("traceEntityType");
    const idInput = document.getElementById("traceEntityIdInput");
    const quickSelect = document.getElementById("traceQuickSelect");

    const entityType = typeSelect ? typeSelect.value : "purchase_order";
    let entityId = idInput ? idInput.value.trim() : "";
    if (!entityId && quickSelect && quickSelect.value) {
        entityId = quickSelect.value;
    }

    if (!entityId) {
        alert("Please enter or select an Entity ID / Reference code to trace.");
        return;
    }

    const wrapper = document.getElementById("traceResultsWrapper");
    const summaryBox = document.getElementById("traceSummaryBox");
    const timeline = document.getElementById("traceTimeline");

    if (wrapper) wrapper.style.display = "block";
    if (summaryBox) {
        summaryBox.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-secondary);"><div class="spinner" style="margin: 0 auto 8px auto;"></div>Reconstructing complete lifecycle for ${escapeHTML(entityType)} '${escapeHTML(entityId)}'...</div>`;
    }
    if (timeline) timeline.innerHTML = "";

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/audit/trace/${entityType}/${encodeURIComponent(entityId)}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `Trace lookup failed with status ${res.status}`);
        }

        const data = await res.json();
        renderTraceResults(data);

    } catch (err) {
        console.error("Trace execution failed:", err);
        if (summaryBox) {
            summaryBox.innerHTML = `
                <div style="padding: 16px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; color: #991b1b;">
                    <strong>Trace Reconstruction Error:</strong> ${escapeHTML(err.message)}
                </div>
            `;
        }
    }
}

function renderTraceResults(data) {
    const summaryBox = document.getElementById("traceSummaryBox");
    const timeline = document.getElementById("traceTimeline");
    const s = data.summary || {};
    const app = data.approval_verification || {};

    // 1. Render Summary Box with Approval Verification Banner
    let approvalBannerHtml = "";
    if (app.evidence_available) {
        approvalBannerHtml = `
            <div style="margin-top: 12px; padding: 10px 14px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; color: #065f46; font-size: 12.5px; display: flex; align-items: center; gap: 8px;">
                <span>✅</span>
                <div>
                    <strong>Approval Evidence Verified:</strong> Authorized by <strong>${escapeHTML(app.approved_by || 'Authorized User')}</strong> 
                    (${escapeHTML(app.approver_role || 'Manager')}) on <strong>${escapeHTML(app.approval_date || 'Audit Date')}</strong>.
                    <span style="margin-left: 6px; font-size: 11px; opacity: 0.85;">${escapeHTML(app.notice || '')}</span>
                </div>
            </div>
        `;
    } else {
        approvalBannerHtml = `
            <div style="margin-top: 12px; padding: 10px 14px; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; color: #92400e; font-size: 12.5px; display: flex; align-items: center; gap: 8px;">
                <span>⚠️</span>
                <div>
                    <strong>Approval Notice:</strong> ${escapeHTML(app.notice || 'Approval evidence not available in current records.')}
                    (Operational Status: <strong>${escapeHTML(app.approval_status || s.status || 'Not Recorded')}</strong>)
                </div>
            </div>
        `;
    }

    if (summaryBox) {
        summaryBox.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <h4 style="font-size: 15px; font-weight: 700; color: var(--text-color); margin: 0;">
                            ${escapeHTML(data.entity_type)}: ${escapeHTML(s.reference || s.entity_id || data.entity_id)}
                        </h4>
                        <span class="badge badge-active">${escapeHTML(s.status || s.payment_status || 'Audited')}</span>
                    </div>
                    <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        Primary Partner: <strong>${escapeHTML(s.vendor_name || 'N/A')}</strong> | Product/Service: <strong>${escapeHTML(s.product_name || s.contract_name || 'Standard Requisition')}</strong>
                    </p>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; color: var(--text-secondary); display: block;">Total Financial Value</span>
                    <span style="font-size: 16px; font-weight: 700; color: var(--primary-color);">
                        ₹${Number(s.total_amount || s.amount || s.contract_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 10px; font-size: 12px;">
                <div><span style="color: var(--text-secondary);">Created By:</span> <strong>${escapeHTML(s.created_by || s.processed_by || 'System')}</strong></div>
                <div><span style="color: var(--text-secondary);">Order / Start Date:</span> <strong>${escapeHTML(s.order_date || s.start_date || s.invoice_date || s.payment_date || 'N/A')}</strong></div>
                <div><span style="color: var(--text-secondary);">Delivery / End Date:</span> <strong>${escapeHTML(s.expected_delivery || s.end_date || 'N/A')}</strong></div>
                <div><span style="color: var(--text-secondary);">Timeline Events:</span> <strong>${data.total_events || 0} Chronological Steps</strong></div>
            </div>

            ${approvalBannerHtml}
        `;
    }

    // 2. Render Timeline Events
    if (timeline) {
        timeline.innerHTML = "";
        const events = data.timeline || [];

        if (events.length === 0) {
            timeline.innerHTML = `<div class="empty-state-box">No chronological events logged for this entity.</div>`;
            return;
        }

        events.forEach(ev => {
            let badgeClass = "badge-neutral";
            const actionUpper = (ev.action || "").toUpperCase();
            if (actionUpper.includes("CREATE") || actionUpper.includes("INITIATE")) badgeClass = "badge-active";
            else if (actionUpper.includes("APPROVE") || actionUpper.includes("VERIF")) badgeClass = "badge-active";
            else if (actionUpper.includes("REJECT") || actionUpper.includes("CANCEL") || actionUpper.includes("FAIL")) badgeClass = "badge-poor";
            else if (actionUpper.includes("PAY") || actionUpper.includes("SHIP") || actionUpper.includes("DISPATCH")) badgeClass = "badge-info";
            else badgeClass = "badge-pending";

            // Determine Step Icon
            let stepIcon = "📝";
            if (ev.entity_type === "PURCHASE_REQUEST") stepIcon = "📋";
            else if (ev.entity_type === "PURCHASE_ORDER") stepIcon = "🛒";
            else if (ev.entity_type === "INVOICE") stepIcon = "🧾";
            else if (ev.entity_type === "PAYMENT") stepIcon = "💳";
            else if (ev.entity_type === "CONTRACT") stepIcon = "📑";
            else if (ev.entity_type === "QUALITY_INSPECTION") stepIcon = "🔬";
            else if (ev.entity_type === "VENDOR") stepIcon = "🏢";

            const div = document.createElement("div");
            div.className = "timeline-item";
            div.innerHTML = `
                <div class="timeline-dot" style="display: flex; align-items: center; justify-content: center; font-size: 10px;">${stepIcon}</div>
                <div class="timeline-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 6px;">
                        <span style="font-size: 13px; font-weight: 700; color: var(--text-color);">
                            ${escapeHTML(ev.event_type || ev.action)}
                        </span>
                        <span style="font-size: 11.5px; color: var(--text-secondary);">${escapeHTML(ev.timestamp || 'N/A')}</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; margin-bottom: 6px; flex-wrap: wrap;">
                        <span>Actor: <strong>${escapeHTML(ev.user_name || 'System User')}</strong></span>
                        <span class="badge badge-info" style="font-size: 10px;">${escapeHTML(ev.user_role || 'System')}</span>
                        <span class="badge ${badgeClass}" style="font-size: 10px;">${escapeHTML(ev.action || '')}</span>
                        ${ev.related_entity ? `<span style="color: var(--text-secondary);">(${escapeHTML(ev.related_entity)})</span>` : ''}
                    </div>

                    ${ev.previous_value || ev.new_value ? `
                        <div style="font-size: 11.5px; margin-bottom: 6px; background: #f8fafc; padding: 4px 8px; border-radius: 4px; display: inline-block;">
                            State Change: <span style="text-decoration: line-through; color: var(--text-secondary);">${escapeHTML(ev.previous_value || 'None')}</span> ➔ <strong style="color: var(--primary-color);">${escapeHTML(ev.new_value || 'Updated')}</strong>
                        </div>
                    ` : ''}

                    <div style="font-size: 12px; color: var(--text-color); margin-top: 4px;">
                        ${escapeHTML(ev.details || '')}
                    </div>
                </div>
            `;
            timeline.appendChild(div);
        });
    }
}

// ==================================================
// 5. FEATURE 2: APPROVAL VERIFICATION
// ==================================================
async function loadApprovalVerification() {
    const tbody = document.getElementById("approvalTableBody");
    const filterSelect = document.getElementById("approvalEntityFilter");
    const entityType = filterSelect ? filterSelect.value : "all";

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="loading-spinner-wrapper">
                    <div class="spinner"></div>
                    <p>Loading approval verification ledger...</p>
                </td>
            </tr>
        `;
    }

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/audit/approval-verification?entity_type=${entityType}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error(`Approval verification query error: ${res.status}`);
        const items = await res.json();

        if (!tbody) return;
        tbody.innerHTML = "";

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="empty-state-box">No approval verification records available for selected filter.</td></tr>`;
            return;
        }

        items.forEach(item => {
            let statusBadge = "badge-pending";
            const st = (item.approval_status || "").toLowerCase();
            if (st.includes("approv") || st.includes("paid") || st.includes("completed")) statusBadge = "badge-active";
            else if (st.includes("reject") || st.includes("cancel")) statusBadge = "badge-poor";

            let evidenceColHtml = "";
            if (item.evidence_available) {
                evidenceColHtml = `
                    <span class="badge badge-active" style="font-size: 10px;">✓ Verified</span>
                    <div style="font-size: 10.5px; color: var(--text-secondary); margin-top: 2px;">${escapeHTML(item.notice)}</div>
                `;
            } else {
                evidenceColHtml = `
                    <span class="badge badge-poor" style="font-size: 10px;">⚠️ Unrecorded</span>
                    <div style="font-size: 10.5px; color: var(--danger-color); margin-top: 2px;">Approval evidence not available in current records.</div>
                `;
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <strong>${escapeHTML(item.reference || item.entity_id)}</strong>
                    <div style="font-size: 11px; color: var(--text-secondary); max-width: 180px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${escapeHTML(item.title || item.entity_type)}
                    </div>
                </td>
                <td style="font-weight: 500;">${escapeHTML(item.created_by || 'System')}</td>
                <td style="font-size: 11.5px; color: var(--text-secondary);">${escapeHTML(item.created_date || 'N/A')}</td>
                <td><span class="badge ${statusBadge}">${escapeHTML(item.approval_status || 'Pending')}</span></td>
                <td>
                    ${item.approved_by ? `<strong>${escapeHTML(item.approved_by)}</strong>` : `<span style="color: var(--text-secondary); font-style: italic;">Not Recorded</span>`}
                </td>
                <td style="font-size: 11.5px; color: var(--text-secondary);">
                    ${item.approval_date ? escapeHTML(item.approval_date) : '-'}
                </td>
                <td>
                    ${item.approver_role ? `<span class="badge badge-info" style="font-size: 10px;">${escapeHTML(item.approver_role)}</span>` : '-'}
                </td>
                <td style="font-size: 11.5px; color: var(--text-secondary);">${escapeHTML(item.previous_status || '-')}</td>
                <td style="font-weight: 600;">${escapeHTML(item.final_status || item.approval_status || '-')}</td>
                <td style="min-width: 180px;">${evidenceColHtml}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error loading approval verification:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="color: #dc3545; font-weight: bold; text-align: center; padding: 20px;">Failed to load approval verification ledger.</td></tr>`;
        }
    }
}

// ==================================================
// 6. FEATURE 3 & 4: AUDIT EVIDENCE & CERTIFICATIONS
// ==================================================
function switchEvidenceTab(tab) {
    const btnCerts = document.getElementById("tabBtnCerts");
    const btnDocs = document.getElementById("tabBtnDocs");
    const viewCerts = document.getElementById("certsViewWrapper");
    const viewDocs = document.getElementById("docsViewWrapper");

    if (tab === "certs") {
        btnCerts?.classList.add("active");
        btnDocs?.classList.remove("active");
        if (viewCerts) viewCerts.style.display = "block";
        if (viewDocs) viewDocs.style.display = "none";
    } else {
        btnDocs?.classList.add("active");
        btnCerts?.classList.remove("active");
        if (viewDocs) viewDocs.style.display = "block";
        if (viewCerts) viewCerts.style.display = "none";
    }
}

async function loadEvidenceAndCertifications() {
    const token = getToken();

    // 1. Load Certifications
    try {
        const certsTbody = document.getElementById("certsTableBody");
        const resCerts = await fetch(`${API_BASE_URL}/audit/certifications`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (resCerts.ok && certsTbody) {
            const certs = await resCerts.json();
            certsTbody.innerHTML = "";
            if (certs.length === 0) {
                certsTbody.innerHTML = `
                    <tr>
                        <td colspan="7">
                            <div class="empty-state-box">
                                📁 No certification records available for verification.
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                certs.forEach(c => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td style="font-weight: 600;">${escapeHTML(c.document_name)}</td>
                        <td><span class="badge badge-info">${escapeHTML(c.document_type)}</span></td>
                        <td>${escapeHTML(c.related_entity)}</td>
                        <td style="font-size: 11.5px; color: var(--text-secondary);">${escapeHTML(c.upload_date || 'N/A')}</td>
                        <td style="font-size: 11.5px; color: var(--text-secondary);">${escapeHTML(c.expiry_date || 'N/A')}</td>
                        <td><span class="badge ${c.current_status === 'Valid' ? 'badge-active' : 'badge-poor'}">${escapeHTML(c.current_status)}</span></td>
                        <td><span class="badge badge-neutral">${escapeHTML(c.verification_status)}</span></td>
                    `;
                    certsTbody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        console.warn("Certifications load error:", e);
    }

    // 2. Load Evidence Documents
    try {
        const docsTbody = document.getElementById("docsTableBody");
        const resDocs = await fetch(`${API_BASE_URL}/audit/evidence-documents`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (resDocs.ok && docsTbody) {
            const docs = await resDocs.json();
            docsTbody.innerHTML = "";
            if (docs.length === 0) {
                docsTbody.innerHTML = `
                    <tr>
                        <td colspan="7">
                            <div class="empty-state-box">
                                📁 No audit evidence documents uploaded in current records.
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                docs.forEach(d => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td style="font-weight: 600;">${escapeHTML(d.document_name)}</td>
                        <td><span class="badge badge-info">${escapeHTML(d.document_type)}</span></td>
                        <td>${escapeHTML(d.related_entity)}</td>
                        <td style="font-size: 11.5px; color: var(--text-secondary);">${escapeHTML(d.upload_date || 'N/A')}</td>
                        <td style="font-size: 11.5px; color: var(--text-secondary);">${escapeHTML(d.expiry_date || 'N/A')}</td>
                        <td><span class="badge ${d.current_status === 'Valid' ? 'badge-active' : 'badge-poor'}">${escapeHTML(d.current_status)}</span></td>
                        <td><span class="badge badge-neutral">${escapeHTML(d.verification_status)}</span></td>
                    `;
                    docsTbody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        console.warn("Evidence documents load error:", e);
    }
}

// ==================================================
// 7. FEATURE 5: UNRESOLVED AUDIT FINDINGS LIFECYCLE
// ==================================================
async function loadFindingsSummary() {
    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/audit/findings/summary`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!res.ok) return;
        const s = await res.json();

        const elAll = document.getElementById("countAllFindings");
        if (elAll) elAll.innerText = s.total_findings || 0;

        const elOpen = document.getElementById("countOpenFindings");
        if (elOpen) elOpen.innerText = s.open_findings || 0;

        const elUnres = document.getElementById("countUnresolvedFindings");
        if (elUnres) elUnres.innerText = s.unresolved_findings || 0;

        const elHigh = document.getElementById("countHighRiskFindings");
        if (elHigh) elHigh.innerText = s.high_risk_findings || 0;

        const elRes = document.getElementById("countResolvedFindings");
        if (elRes) elRes.innerText = s.resolved_findings || 0;

        const elHighRiskVal = document.getElementById("highRiskFindingsVal");
        if (elHighRiskVal) elHighRiskVal.innerText = s.high_risk_findings || 0;

        const elFocusHighRisk = document.getElementById("auditFocusHighRisk");
        if (elFocusHighRisk) elFocusHighRisk.innerText = `${s.high_risk_findings || 0} Findings Flagged`;

    } catch (e) {
        console.warn("Findings summary load error:", e);
    }
}

function filterFindings(filterMode) {
    currentFindingsFilter = filterMode;

    const tabBar = document.getElementById("findingsTabBar");
    if (tabBar) {
        const buttons = tabBar.querySelectorAll(".filter-tab-btn");
        buttons.forEach(btn => {
            const btnText = btn.innerText.toLowerCase();
            if (
                (filterMode === "all" && btnText.includes("all")) ||
                (filterMode === "open" && btnText.includes("open")) ||
                (filterMode === "unresolved" && btnText.includes("unresolved")) ||
                (filterMode === "high_risk" && btnText.includes("high-risk")) ||
                (filterMode === "resolved" && btnText.includes("resolved"))
            ) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    loadFindings(filterMode);
}

async function loadFindings(filterMode = "all") {
    const tbody = document.getElementById("findingsTableBody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-spinner-wrapper">
                    <div class="spinner"></div>
                    <p>Loading audit findings (${filterMode})...</p>
                </td>
            </tr>
        `;
    }

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/audit/findings?filter=${filterMode}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error(`Findings query error: ${res.status}`);
        findingsCache = await res.json();

        if (!tbody) return;
        tbody.innerHTML = "";

        if (findingsCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state-box">✓ No audit findings found in this category.</td></tr>`;
            return;
        }

        findingsCache.forEach(f => {
            let riskClass = "badge-poor";
            const rLevel = (f.risk_level || "").toLowerCase();
            if (rLevel === "medium") riskClass = "badge-warning";
            else if (rLevel === "low") riskClass = "badge-active";
            else if (rLevel === "critical") riskClass = "badge-poor";

            let statusClass = "badge-poor";
            const aStat = (f.audit_status || f.status || "").toLowerCase();
            if (aStat === "resolved" || aStat === "closed") statusClass = "badge-active";
            else if (aStat.includes("review")) statusClass = "badge-warning";
            else if (aStat.includes("action")) statusClass = "badge-poor";

            let resClass = "badge-warning";
            const rStat = (f.resolution_status || "").toLowerCase();
            if (rStat === "resolved") resClass = "badge-active";
            else if (rStat === "unresolved") resClass = "badge-poor";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--primary-color);">${escapeHTML(f.id)}</td>
                <td style="font-weight: 500;">${escapeHTML(f.area)}</td>
                <td style="font-weight: 600;">${escapeHTML(f.vendor)}</td>
                <td><span class="badge ${riskClass}">${escapeHTML(f.risk_level)} Risk</span></td>
                <td style="color: var(--text-secondary); font-size: 11.5px;">${escapeHTML(f.identified_date)}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(f.audit_status || f.status || 'Open')}</span></td>
                <td><span class="badge ${resClass}">${escapeHTML(f.resolution_status || 'Unresolved')}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="openFindingModal('${f.id}')" style="padding: 4px 10px; font-size: 11px; font-weight: 600;">
                        ⚖️ Review
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error loading findings:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="color: #dc3545; font-weight: bold; text-align: center; padding: 20px;">Failed to load audit findings.</td></tr>`;
        }
    }
}

// ==================================================
// 8. GOVERNANCE MODAL: REVIEW AUDIT FINDING
// ==================================================
function openFindingModal(findingId) {
    const finding = findingsCache.find(f => f.id === findingId);
    if (!finding) return;

    const modal = document.getElementById("findingModal");
    const modalId = document.getElementById("modalFindingId");
    const modalTitle = document.getElementById("modalFindingTitle");
    const modalDesc = document.getElementById("modalFindingDesc");
    const modalAuditStatus = document.getElementById("modalAuditStatus");
    const modalResStatus = document.getElementById("modalResolutionStatus");
    const modalNotes = document.getElementById("modalFindingNotes");

    if (modalId) modalId.value = finding.id;
    if (modalTitle) modalTitle.innerText = `Review Audit Finding: ${finding.id}`;
    if (modalDesc) {
        modalDesc.innerHTML = `
            <div style="font-size: 12px; margin-bottom: 4px;">
                <strong>Area:</strong> ${escapeHTML(finding.area)} | 
                <strong>Risk:</strong> <span style="font-weight: 700; color: ${finding.risk_level === 'Critical' || finding.risk_level === 'High' ? 'var(--danger-color)' : '#f59e0b'};">${escapeHTML(finding.risk_level)}</span> |
                <strong>Partner:</strong> ${escapeHTML(finding.vendor)}
            </div>
            <div style="font-size: 12.5px; color: var(--text-color); margin-top: 6px; line-height: 1.4;">
                ${escapeHTML(finding.description)}
            </div>
        `;
    }

    if (modalAuditStatus) modalAuditStatus.value = finding.audit_status || finding.status || "Open";
    if (modalResStatus) modalResStatus.value = finding.resolution_status || "Unresolved";
    if (modalNotes) modalNotes.value = finding.notes || "";

    if (modal) modal.style.display = "flex";
}

function closeFindingModal() {
    const modal = document.getElementById("findingModal");
    if (modal) modal.style.display = "none";
}

async function submitFindingUpdate(event) {
    event.preventDefault();
    const findingId = document.getElementById("modalFindingId").value;
    const auditStatus = document.getElementById("modalAuditStatus").value;
    const resStatus = document.getElementById("modalResolutionStatus").value;
    const notes = document.getElementById("modalFindingNotes").value;

    try {
        const token = getToken();
        const formData = new FormData();
        formData.append("audit_status", auditStatus);
        formData.append("resolution_status", resStatus);
        formData.append("notes", notes);

        const res = await fetch(`${API_BASE_URL}/audit/findings/${encodeURIComponent(findingId)}/status`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Update failed: ${res.status}`);
        }

        closeFindingModal();
        await loadFindingsSummary();
        await loadFindings(currentFindingsFilter);
        alert(`Audit finding ${findingId} updated successfully.`);

    } catch (err) {
        console.error("Error updating finding status:", err);
        alert(`Error updating audit finding: ${err.message}`);
    }
}

// ==================================================
// 9. AUDIT TRAIL PREVIEW
// ==================================================
function renderAuditTrail(logs) {
    const tbody = document.getElementById("auditTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state-box">No audit logs recorded.</td></tr>`;
        return;
    }

    logs.forEach(log => {
        const action = (log.action || "").toUpperCase();
        let badgeClass = "badge-neutral";
        if (action.includes("CREATE") || action.includes("REGISTER")) badgeClass = "badge-active";
        else if (action.includes("UPDATE") || action.includes("LOGIN")) badgeClass = "badge-pending";
        else if (action.includes("DELETE") || action.includes("REJECT")) badgeClass = "badge-poor";
        else if (action.includes("APPROVE")) badgeClass = "badge-active";

        tbody.innerHTML += `
            <tr>
                <td>#${log.id}</td>
                <td style="font-weight: 500;">${escapeHTML(log.user_email || 'System')}</td>
                <td><span class="badge badge-info" style="font-size: 10px;">${escapeHTML(log.role || 'System')}</span></td>
                <td><span class="badge ${badgeClass}">${escapeHTML(log.action)}</span></td>
                <td style="font-weight: 600;">${escapeHTML(log.entity || 'N/A')}</td>
                <td style="max-width: 280px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${escapeHTML(log.details)}">
                    ${escapeHTML(log.details || 'N/A')}
                </td>
                <td style="color: var(--text-secondary); font-size: 11.5px;">${escapeHTML(log.created_at || 'N/A')}</td>
            </tr>
        `;
    });
}

// ==================================================
// 10. UTILITY FUNCTIONS
// ==================================================
function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
