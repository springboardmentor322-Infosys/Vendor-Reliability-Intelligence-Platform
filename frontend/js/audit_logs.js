const API_BASE_URL = "http://127.0.0.1:8000";
document.addEventListener("DOMContentLoaded", initAuditLogs);

let allLogs = [];

async function initAuditLogs() {
    const role = getUserRole();
    if (role !== "Admin" && role !== "Administrator" && role !== "Auditor") {
        console.warn("Unauthorized role accessed audit_logs page:", role);
        return;
    }
    await loadAuditLogs();
}

async function loadAuditLogs() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/audit-logs`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            throw new Error(`Audit Logs API Error: ${response.status}`);
        }
        allLogs = await response.json();

        // Check URL parameters for action or entity filters
        const urlParams = new URLSearchParams(window.location.search);
        const actionParam = urlParams.get("action");
        if (actionParam) {
            const actionSelect = document.getElementById("filterAction");
            if (actionSelect) {
                for (let opt of actionSelect.options) {
                    if (opt.value.toLowerCase() === actionParam.toLowerCase()) {
                        actionSelect.value = opt.value;
                        break;
                    }
                }
            }
        }
        const entityParam = urlParams.get("entity");
        if (entityParam) {
            const entitySelect = document.getElementById("filterEntity");
            if (entitySelect) {
                for (let opt of entitySelect.options) {
                    if (opt.value.toLowerCase() === entityParam.toLowerCase()) {
                        entitySelect.value = opt.value;
                        break;
                    }
                }
            }
        }

        if (actionParam || entityParam) {
            filterLogs();
        } else {
            renderAuditLogs(allLogs);
        }
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        const tbody = document.querySelector("#auditTable tbody");
        tbody.innerHTML = `<tr><td colspan="10" style="color: #dc3545; font-weight: bold;">Error loading system logs. Please check your connection.</td></tr>`;
    }
}

function renderAuditLogs(logsList) {
    const tbody = document.querySelector("#auditTable tbody");
    tbody.innerHTML = "";

    if (logsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="color: #666; font-style: italic;">No matching audit logs found.</td></tr>`;
        return;
    }

    logsList.forEach(log => {
        const row = document.createElement("tr");

        let actionClass = "badge-neutral";
        if (log.action === "DELETE") {
            actionClass = "badge-poor";
        } else if (log.action === "CREATE") {
            actionClass = "badge-active";
        } else if (log.action === "UPDATE") {
            actionClass = "badge-pending";
        } else if (log.action === "LOGIN" || log.action === "REGISTER") {
            actionClass = "badge-info";
        }

        row.innerHTML = `
            <td>${log.id}</td>
            <td style="font-weight: 500;">${escapeHTML(log.user_name) || "System"}</td>
            <td>${escapeHTML(log.user_email) || "-"}</td>
            <td><span class="badge badge-info" style="font-size: 11px;">${escapeHTML(log.user_role) || "System"}</span></td>
            <td><span class="badge ${actionClass}">${escapeHTML(log.action)}</span></td>
            <td style="font-weight: 600;">${escapeHTML(log.entity_type)}</td>
            <td>${escapeHTML(log.entity_id) || "-"}</td>
            <td>${log.created_at}</td>
            <td style="max-width: 300px; word-wrap: break-word; text-align: left; color: var(--text-secondary);">${escapeHTML(log.details)}</td>
            <td>${log.ip_address || "N/A"}</td>
        `;

        tbody.appendChild(row);
    });
}

function filterLogs() {
    const userVal = document.getElementById("searchUser").value.toLowerCase().trim();
    const actionVal = document.getElementById("filterAction").value;
    const entityVal = document.getElementById("filterEntity").value;
    const dateVal = document.getElementById("filterDate").value; // Format: YYYY-MM-DD

    let filtered = allLogs;

    // Filter by User Email
    if (userVal !== "") {
        filtered = filtered.filter(log => 
            log.user_email && log.user_email.toLowerCase().includes(userVal)
        );
    }

    // Filter by Action
    if (actionVal !== "all") {
        filtered = filtered.filter(log => log.action === actionVal);
    }

    // Filter by Entity Type
    if (entityVal !== "all") {
        filtered = filtered.filter(log => log.entity_type === entityVal);
    }

    // Filter by Date
    if (dateVal !== "") {
        filtered = filtered.filter(log => {
            if (!log.created_at) return false;
            // log.created_at is usually YYYY-MM-DD HH:MM:SS
            const logDatePart = log.created_at.split(" ")[0];
            return logDatePart === dateVal;
        });
    }

    renderAuditLogs(filtered);
}

function clearFilters() {
    document.getElementById("searchUser").value = "";
    document.getElementById("filterAction").value = "all";
    document.getElementById("filterEntity").value = "all";
    document.getElementById("filterDate").value = "";
    renderAuditLogs(allLogs);
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
