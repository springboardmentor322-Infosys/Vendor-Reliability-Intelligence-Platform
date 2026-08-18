const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", loadAuditorDashboard);

async function loadAuditorDashboard() {
    try {
        // 1. Load Audit Logs
        const response = await fetch(`${API_BASE_URL}/audit-logs`);
        if (!response.ok) {
            throw new Error(`Audit logs load failed: ${response.status}`);
        }
        const logs = await response.json();
        
        // Aggregate statistics client-side
        const total = logs.length;
        const createCount = logs.filter(l => (l.action || "").toUpperCase() === "CREATE").length;
        const updateCount = logs.filter(l => (l.action || "").toUpperCase() === "UPDATE").length;
        const deleteCount = logs.filter(l => (l.action || "").toUpperCase() === "DELETE").length;
        
        document.getElementById("totalLogs").innerText = total;
        document.getElementById("createCount").innerText = createCount;
        document.getElementById("updateCount").innerText = updateCount;
        document.getElementById("deleteCount").innerText = deleteCount;
        
        // Render top 10 logs
        const tbody = document.getElementById("auditTableBody");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        const recentLogs = logs.slice(0, 10);
        
        if (recentLogs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state-wrapper">No audit logs recorded.</td></tr>`;
        } else {
            recentLogs.forEach(log => {
                const action = (log.action || "").toUpperCase();
                let badgeClass = "badge-neutral";
                if (action === "CREATE") badgeClass = "badge-active";
                else if (action === "UPDATE") badgeClass = "badge-pending";
                else if (action === "DELETE") badgeClass = "badge-poor";
                
                tbody.innerHTML += `
                    <tr>
                        <td>#${log.id}</td>
                        <td style="font-weight: 500;">${log.user_email || 'System'}</td>
                        <td>${log.user_role || 'N/A'}</td>
                        <td><span class="badge ${badgeClass}">${log.action}</span></td>
                        <td style="font-weight: 600;">${log.entity_type || 'N/A'}</td>
                        <td style="max-width: 250px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${log.details}">${log.details || 'N/A'}</td>
                        <td>${log.created_at || 'N/A'}</td>
                    </tr>
                `;
            });
        }

        // 2. Load Contract Compliance
        const contractResponse = await fetch(`${API_BASE_URL}/contract-monitoring`);
        if (contractResponse.ok) {
            const contracts = await contractResponse.json();
            const totalContracts = contracts.length;
            const activeContracts = contracts.filter(c => c.monitoring_status === "Active").length;
            const expiredOrExpiring = contracts.filter(c => c.monitoring_status === "Expired" || c.monitoring_status === "Expiring Soon" || c.monitoring_status === "Renewal Due Soon").length;
            const complianceRate = totalContracts > 0 ? (activeContracts / totalContracts) * 100 : 100;
            
            document.getElementById("contractCompliance").innerText = `${complianceRate.toFixed(1)}%`;
            document.getElementById("activeContractsCount").innerText = activeContracts;
            document.getElementById("expiredContractsCount").innerText = expiredOrExpiring;
        }

        // 3. Load Risk Alerts
        const alertResponse = await fetch(`${API_BASE_URL}/deliveries/alerts`);
        if (alertResponse.ok) {
            const alerts = await alertResponse.json();
            document.getElementById("pendingRiskAlerts").innerText = alerts.length;
        }

    } catch (err) {
        console.error("Error loading Auditor dashboard:", err);
        const tbody = document.getElementById("auditTableBody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger-color); text-align: center; padding: 20px;">Failed to load audit logs.</td></tr>`;
        }
    }
}
