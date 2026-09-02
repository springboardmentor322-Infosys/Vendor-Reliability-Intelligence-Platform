const API_BASE_URL = "http://127.0.0.1:8000";
let complianceDonutChartInstance = null;

document.addEventListener("DOMContentLoaded", loadAuditorDashboard);

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

        // 1. KPI Summary Cards
        document.getElementById("totalLogs").innerText = Number(data.total_logs || 0).toLocaleString();
        document.getElementById("complianceRateVal").innerText = `${data.compliance_rate || 0}%`;
        document.getElementById("highRiskFindingsVal").innerText = data.findings ? data.findings.length : 0;
        document.getElementById("controlsAssessedVal").innerText = `${data.controls ? data.controls.length : 5}/5`;
        document.getElementById("avgQualityScoreSub").innerText = `Quality Avg: ${data.insights.avg_quality_score || 0}%`;
        document.getElementById("complianceRateBadge").innerText = `${data.compliance_rate || 0}% Overall Compliance`;
        document.getElementById("checklistProgressBadge").innerText = `${data.checklist_progress || 0}% Verified`;

        // 2. Insights
        document.getElementById("findingsInsight").innerText = 
            `Found ${data.findings.length} high-risk findings across suppliers with critical delivery or quality SLA variance.`;
        document.getElementById("qualityInsight").innerText = 
            `Platform material quality average is ${data.insights.avg_quality_score}%. ${data.insights.failed_inspections_count} inspections flagged for review.`;
        document.getElementById("contractAuditInsight").innerText = 
            `${data.insights.expiring_contracts_count} contract agreements are due for periodic compliance review.`;

        // 3. Render Large Compliance Donut Chart
        if (data.compliance_breakdown) {
            renderComplianceDonut(data.compliance_breakdown);
        }

        // 4. Render Checklist Controls
        renderChecklistControls(data.controls || []);

        // 5. Render Audit Findings Table
        renderAuditFindings(data.findings || []);

        // 6. Render Audit Trail
        renderAuditTrail(data.audit_trail || []);

    } catch (err) {
        console.error("Error loading Auditor dashboard:", err);
    }
}

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

function renderChecklistControls(controls) {
    const container = document.getElementById("controlsListContainer");
    if (!container) return;
    container.innerHTML = "";

    controls.forEach(ctrl => {
        let badgeClass = "badge-active";
        if (ctrl.status === "Warning" || ctrl.status === "Action Required") badgeClass = "badge-poor";

        const div = document.createElement("div");
        div.style.cssText = "padding: 8px 0; border-bottom: 1px solid var(--border-color);";
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 13px; font-weight: 600; color: var(--text-color);">${escapeHTML(ctrl.name)}</span>
                <span class="badge ${badgeClass}">${escapeHTML(ctrl.status)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-secondary); margin-bottom: 4px;">
                <span>Compliance Level</span>
                <span style="font-weight: 600; color: var(--text-color);">${ctrl.completion}%</span>
            </div>
            <div class="progress-meter" style="height: 6px; margin-top: 2px;">
                <div class="progress-meter-fill" style="width: ${ctrl.completion}%;"></div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderAuditFindings(findings) {
    const tbody = document.getElementById("findingsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (findings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state-wrapper">✓ No critical compliance findings identified.</td></tr>`;
        return;
    }

    findings.forEach(f => {
        let riskClass = "badge-poor";
        if (f.risk_level === "Medium") riskClass = "badge-warning";
        else if (f.risk_level === "Low") riskClass = "badge-active";

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">${escapeHTML(f.id)}</td>
                <td style="font-weight: 500;">${escapeHTML(f.area)}</td>
                <td style="font-weight: 600;">${escapeHTML(f.vendor)}</td>
                <td><span class="badge ${riskClass}">${escapeHTML(f.risk_level)} Risk</span></td>
                <td><span class="badge badge-pending">${escapeHTML(f.status)}</span></td>
                <td style="color: var(--text-secondary); font-size: 12px;">${escapeHTML(f.identified_date)}</td>
            </tr>
        `;
    });
}

function renderAuditTrail(logs) {
    const tbody = document.getElementById("auditTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state-wrapper">No audit logs recorded.</td></tr>`;
        return;
    }

    logs.forEach(log => {
        const action = (log.action || "").toUpperCase();
        let badgeClass = "badge-neutral";
        if (action === "CREATE" || action === "REGISTER") badgeClass = "badge-active";
        else if (action === "UPDATE" || action === "LOGIN") badgeClass = "badge-pending";
        else if (action === "DELETE") badgeClass = "badge-poor";

        tbody.innerHTML += `
            <tr>
                <td>#${log.id}</td>
                <td style="font-weight: 500;">${escapeHTML(log.user_email || 'System')}</td>
                <td>${escapeHTML(log.role || 'N/A')}</td>
                <td><span class="badge ${badgeClass}">${escapeHTML(log.action)}</span></td>
                <td style="font-weight: 600;">${escapeHTML(log.entity || 'N/A')}</td>
                <td style="max-width: 250px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${escapeHTML(log.details)}">
                    ${escapeHTML(log.details || 'N/A')}
                </td>
                <td style="color: var(--text-secondary); font-size: 12px;">${escapeHTML(log.created_at || 'N/A')}</td>
            </tr>
        `;
    });
}

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

