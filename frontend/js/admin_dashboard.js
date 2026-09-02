const API_BASE_URL = "http://127.0.0.1:8000";
let vendorsList = [];
let platformTrendChartInstance = null;
let usersRoleChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // Setup event delegation on tbody for approval queue
    const tbody = document.querySelector("#pendingTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
        tbody.addEventListener("change", handleTableChange);
    }
    
    initAdminPortal();
});

async function initAdminPortal() {
    await loadAdminStats();
    await loadVendors();
    await loadPendingUsers();
}

async function loadAdminStats() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/dashboard/admin-stats`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            console.error("Admin stats fetch failed:", response.status);
            return;
        }

        const data = await response.json();

        // 1. Top KPI Summary Cards
        document.getElementById("totalUsersCount").textContent = data.total_users || 0;
        document.getElementById("approvedUsersSub").textContent = `${data.approved_users || 0} Approved, ${data.pending_users || 0} Pending`;
        document.getElementById("totalVendorsCount").textContent = Number(data.total_vendors || 0).toLocaleString();
        document.getElementById("activePOsCount").textContent = Number(data.active_purchase_orders || 0).toLocaleString();
        document.getElementById("totalPOsSub").textContent = `${Number(data.total_purchase_orders || 0).toLocaleString()} Total Tracked`;
        document.getElementById("platformValuation").textContent = `₹${(data.total_valuation || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("platformReliability").textContent = `${data.average_reliability || 0}%`;

        // 2. Platform Overview Metrics
        document.getElementById("deptCount").textContent = data.departments_count || 12;
        document.getElementById("locationCount").textContent = data.locations_count || 52;
        document.getElementById("catCount").textContent = data.categories_count || 50;
        document.getElementById("workflowCount").textContent = data.workflows_count || 8;
        document.getElementById("totalUsersBadge").textContent = `${data.total_users || 0} User Accounts`;

        // 3. System Health
        if (data.system_health) {
            document.getElementById("apiLatencyVal").textContent = `${data.system_health.api_latency_ms} ms`;
            document.getElementById("dbRecordsVal").textContent = `${Number(data.system_health.total_records_tracked).toLocaleString()} Rows Indexed`;
        }

        // 4. Platform Insights
        if (data.insights) {
            document.getElementById("topCategoryInsight").textContent = 
                `Top volume sales category is "${data.insights.top_category}". High order turnover observed.`;
            document.getElementById("highRiskVendorsInsight").textContent = 
                `${data.insights.high_risk_vendors_count} suppliers flagged with reliability index < 60%. Risk mitigation recommended.`;
            document.getElementById("contractsInsight").textContent = 
                `${data.total_contracts} legal SLA contracts active with platform suppliers.`;
        }

        // 5. Render Activity Trend Chart (Line Chart)
        if (data.activity_trend && data.activity_trend.length > 0) {
            renderPlatformTrendChart(data.activity_trend);
        }

        // 6. Render Users by Role Chart (Donut Chart)
        if (data.users_by_role && data.users_by_role.length > 0) {
            renderUsersRoleChart(data.users_by_role);
        }

        // 7. Render Recent System Activities from audit_logs
        renderRecentActivities(data.recent_activities || []);

    } catch (error) {
        console.error("Error loading Admin stats:", error);
    }
}

function renderPlatformTrendChart(trendData) {
    const ctx = document.getElementById("platformTrendChart");
    if (!ctx) return;

    if (platformTrendChartInstance) {
        platformTrendChartInstance.destroy();
    }

    const labels = trendData.map(item => item.month);
    const orderCounts = trendData.map(item => item.orders);
    const volumes = trendData.map(item => item.volume);

    platformTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Purchase Orders',
                    data: orderCounts,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#4f46e5',
                    pointRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: 'Valuation (₹)',
                    data: volumes,
                    borderColor: '#10b981',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.35,
                    borderWidth: 2,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11, weight: '600' }
                    }
                },
                tooltip: {
                    padding: 10,
                    backgroundColor: '#0f172a'
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: { font: { size: 10 } }
                },
                y1: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

function renderUsersRoleChart(roleData) {
    const ctx = document.getElementById("usersRoleChart");
    if (!ctx) return;

    if (usersRoleChartInstance) {
        usersRoleChartInstance.destroy();
    }

    const labels = roleData.map(r => r.role);
    const counts = roleData.map(r => r.count);

    const colors = [
        '#4f46e5', // Admin / Purple-Blue
        '#06b6d4', // Procurement / Cyan
        '#10b981', // Supply Chain / Emerald
        '#f59e0b', // Finance / Amber
        '#8b5cf6', // Auditor / Violet
        '#ec4899', // Vendor / Pink
        '#94a3b8'  // Unassigned / Slate
    ];

    usersRoleChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors.slice(0, labels.length),
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
                            return ` ${context.label}: ${context.raw} user(s)`;
                        }
                    }
                }
            }
        }
    });
}

function renderRecentActivities(activities) {
    const tbody = document.getElementById("systemActivitiesBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (activities.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state-wrapper">No recent system activity recorded.</td></tr>`;
        return;
    }

    activities.forEach(act => {
        let badgeClass = "badge-neutral";
        const actionUpper = (act.action || "").toUpperCase();
        if (actionUpper === "CREATE" || actionUpper === "REGISTER") badgeClass = "badge-active";
        else if (actionUpper === "UPDATE" || actionUpper === "LOGIN") badgeClass = "badge-pending";
        else if (actionUpper === "DELETE") badgeClass = "badge-poor";

        tbody.innerHTML += `
            <tr>
                <td>#${act.id}</td>
                <td style="font-weight: 600;">${escapeHTML(act.user_email || act.user_name)}</td>
                <td><span class="badge ${badgeClass}">${escapeHTML(act.action)}</span></td>
                <td style="font-weight: 500;">${escapeHTML(act.entity_type)}</td>
                <td style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(act.details)}">
                    ${escapeHTML(act.details)}
                </td>
                <td style="color: var(--text-secondary); font-size: 12px;">${act.timestamp}</td>
            </tr>
        `;
    });
}

async function loadVendors() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendors`);
        if (!response.ok) {
            throw new Error(`Failed to load vendors (Status: ${response.status})`);
        }
        vendorsList = await response.json();
    } catch (error) {
        console.error("Error loading vendors dropdown:", error);
    }
}

async function loadPendingUsers() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/pending-users`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            throw new Error(`Failed to load pending users (Status: ${response.status})`);
        }

        const users = await response.json();
        const tbody = document.querySelector("#pendingTable tbody");
        const pendingBadge = document.getElementById("pendingQueueCountBadge");
        if (pendingBadge) {
            pendingBadge.textContent = `${users.length} Pending`;
        }

        if (!tbody) return;
        tbody.innerHTML = "";

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state-wrapper" style="text-align: center; padding: 30px; color: var(--text-secondary);">
                ✓ All user registrations are approved. No pending accounts in queue.
            </td></tr>`;
            return;
        }

        let vendorOptions = '<option value="">-- Choose Vendor Company --</option>';
        vendorsList.forEach(v => {
            vendorOptions += `<option value="${v.id}">${escapeHTML(v.vendor_name)} (ID: ${v.id})</option>`;
        });

        users.forEach(user => {
            tbody.innerHTML += `
            <tr data-id="${user.id}">
                <td>#${user.id}</td>
                <td style="font-weight: 600;">${escapeHTML(user.name)}</td>
                <td>${escapeHTML(user.email)}</td>
                <td>
                    <select class="role-select filter-select" data-id="${user.id}" style="padding: 6px 10px; font-size: 12px; width: 100%; max-width: 220px;">
                        <option value="Vendor" selected>Vendor</option>
                        <option value="Procurement Manager">Procurement Manager</option>
                        <option value="Finance Officer">Finance Officer</option>
                        <option value="Auditor">Auditor</option>
                        <option value="Supply Chain Manager">Supply Chain Manager</option>
                        <option value="Admin">Admin</option>
                    </select>
                    
                    <select class="vendor-select filter-select" id="vendorSelect${user.id}" style="display: block; margin-top: 6px; padding: 6px 10px; font-size: 12px; width: 100%; max-width: 220px;">
                        ${vendorOptions}
                    </select>
                </td>
                <td>
                    <button class="btn btn-primary" data-action="approve" data-id="${user.id}" style="padding: 6px 12px; font-size: 12px; margin-right: 6px;">
                        Approve
                    </button>
                    <button class="btn btn-danger" data-action="reject" data-id="${user.id}" style="padding: 6px 12px; font-size: 12px;">
                        Reject
                    </button>
                </td>
            </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading pending users:", error);
        const tbody = document.querySelector("#pendingTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="color: var(--danger-color); text-align: center; padding: 20px;">Error loading pending approval queue.</td></tr>`;
        }
    }
}

function handleTableChange(event) {
    const select = event.target.closest(".role-select");
    if (!select) return;

    const userId = select.dataset.id;
    const vendorSelect = document.getElementById(`vendorSelect${userId}`);
    if (vendorSelect) {
        if (select.value === "Vendor") {
            vendorSelect.style.display = "block";
        } else {
            vendorSelect.style.display = "none";
        }
    }
}

function handleTableClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    const userId = button.dataset.id;

    if (action === "approve") {
        approveUser(userId);
    } else if (action === "reject") {
        rejectUser(userId);
    }
}

async function approveUser(id) {
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (!tr) return;

    const roleSelect = tr.querySelector(".role-select");
    const role = roleSelect.value;
    const vendorSelect = document.getElementById(`vendorSelect${id}`);
    const vendorId = vendorSelect ? vendorSelect.value : "";

    if (role === "Vendor" && !vendorId) {
        showToast("Please select a vendor company to link with this Vendor account.", "warning");
        return;
    }

    const token = getToken();
    const formData = new FormData();
    formData.append("role", role);
    if (role === "Vendor") {
        formData.append("vendor_id", vendorId);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/approve-user/${id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || "User approved successfully.", "success");
            await loadPendingUsers();
            await loadAdminStats();
        } else {
            showToast(result.error || result.detail || "Approval failed.", "error");
        }
    } catch (error) {
        console.error("Approve request exception:", error);
        showToast("Server connection error.", "error");
    }
}

async function rejectUser(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/reject-user/${id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || "User rejected successfully.", "success");
            await loadPendingUsers();
            await loadAdminStats();
        } else {
            showToast(result.error || result.detail || "Rejection failed.", "error");
        }
    } catch (error) {
        console.error("Reject request exception:", error);
        showToast("Server connection error.", "error");
    }
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