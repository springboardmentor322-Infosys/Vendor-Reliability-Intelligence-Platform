/**
 * VendorIQ – Administrator Control Center Controller
 * Powers live dashboard statistics, interactive governance alerts,
 * operational breakdowns, dynamic Chart.js visualizations,
 * enterprise user management (approvals, role changes, activations),
 * RBAC permissions matrix, and system health telemetry.
 */

const API_BASE_URL = "http://127.0.0.1:8000";

// Chart instances
let platformTrendChartInstance = null;
let usersRoleChartInstance = null;
let vendorRiskChartInstance = null;
let poStatusChartInstance = null;

// Global state
let vendorsList = [];
let searchDebounceTimer = null;
let currentTab = "pending";
let editingUser = null;

document.addEventListener("DOMContentLoaded", () => {
    initAdminPortal();
});

async function initAdminPortal() {
    wireCardClicks();
    await loadVendors();
    await loadAdminStats();
    await loadPendingUsers();
    await loadAdminUsersDirectory();
    await loadPermissionsMatrix();
}

/**
 * Format raw numbers to localized Indian currency (₹)
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
    const num = Number(amount);
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Wire interactive click events for KPI cards and banner shortcuts
 */
function wireCardClicks() {
    const cardUsers = document.getElementById("kpiCardUsers");
    if (cardUsers) {
        cardUsers.addEventListener("click", () => {
            switchUserTab("all");
            document.getElementById("user-management")?.scrollIntoView({ behavior: "smooth" });
        });
    }

    const cardVendors = document.getElementById("kpiCardVendors");
    if (cardVendors) {
        cardVendors.addEventListener("click", () => {
            window.location.href = "vendors.html";
        });
    }

    const cardOrders = document.getElementById("kpiCardOrders");
    if (cardOrders) {
        cardOrders.addEventListener("click", () => {
            window.location.href = "purchase-orders.html";
        });
    }

    const cardFinance = document.getElementById("kpiCardFinance");
    if (cardFinance) {
        cardFinance.addEventListener("click", () => {
            window.location.href = "invoices.html";
        });
    }

    const cardContracts = document.getElementById("kpiCardContracts");
    if (cardContracts) {
        cardContracts.addEventListener("click", () => {
            window.location.href = "contracts.html";
        });
    }

    const cardReliability = document.getElementById("kpiCardReliability");
    if (cardReliability) {
        cardReliability.addEventListener("click", () => {
            window.location.href = "vendor-reliability.html";
        });
    }
}

/**
 * 1. Load comprehensive Administrator metrics from FastAPI + PostgreSQL
 */
async function loadAdminStats() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/dashboard/admin-stats`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            console.error("Admin stats fetch failed with status:", response.status);
            return;
        }

        const data = await response.json();

        // Welcome Header
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
        const elWelcome = document.getElementById("adminWelcomeTitle");
        if (elWelcome) {
            const userName = getUserName() || "Administrator";
            elWelcome.innerHTML = `${greeting}, ${escapeHTML(userName)} 👋`;
        }

        // 1. Top 6 KPI Cards
        setElText("totalUsersCount", data.total_users || 0);
        setElText("usersSubtext", `${data.active_users || data.approved_users || 0} Active · ${data.pending_users || 0} Pending`);

        setElText("totalVendorsCount", Number(data.total_vendors || 0).toLocaleString());
        setElText("vendorsSubtext", `${data.active_vendors || 0} Active · ${data.high_risk_vendors || 0} High Risk`);

        setElText("totalPOsCount", Number(data.unique_orders || data.total_purchase_orders || 0).toLocaleString());
        setElText("posSubtext", `Unique Orders (${Number(data.dataset_transaction_rows || 0).toLocaleString()} Items)`);

        setElText("platformValuation", formatCurrency(data.total_procurement_spending || data.total_valuation || 0));
        setElText("financeSubtext", `Total Transaction Volume`);

        setElText("totalContractsCount", Number(data.total_contracts || 0).toLocaleString());
        const contExpiringPart = data.expiring_contracts ? ` · ${data.expiring_contracts} Expiring` : '';
        setElText("contractsSubtext", `${data.active_contracts || 0} Active${contExpiringPart} · ${data.expired_contracts || 0} Expired`);

        setElText("platformReliability", `${data.average_reliability || 0}%`);
        setElText("reliabilitySubtext", `Standardized Ecosystem Avg`);

        // 2. Governance Alerts
        renderGovernanceAlerts(data.governance_alerts || []);

        // 3. Operational Breakdowns
        // Procurement
        setElText("procUniqueOrders", Number(data.unique_orders || 0).toLocaleString());
        setElText("procDatasetRows", Number(data.dataset_transaction_rows || 0).toLocaleString());
        setElText("procAppOrders", Number(data.app_purchase_orders || 0).toLocaleString());
        setElText("procActiveOrders", Number(data.active_purchase_orders || 0).toLocaleString());
        setElText("procCompletedOrders", Number(data.completed_purchase_orders || 0).toLocaleString());
        const delayedSub = data.delayed_item_rows ? ` (${Number(data.delayed_item_rows).toLocaleString()} rows)` : '';
        setElText("procDelayedOrders", `${Number(data.delayed_purchase_orders || 0).toLocaleString()}${delayedSub}`);

        // Financials
        setElText("finTotalSpend", formatCurrency(data.total_procurement_spending || 0));
        setElText("finTotalInvoiced", formatCurrency(data.total_invoice_amount || 0));
        setElText("finPaidAmount", formatCurrency(data.paid_amount || 0));
        setElText("finPendingAmount", formatCurrency(data.pending_payment_amount || 0));
        setElText("finOverdueAmount", formatCurrency(data.overdue_payment_amount || 0));
        setElText("finOverdueCount", `${Number(data.overdue_invoices_count || 0).toLocaleString()} Invoices`);

        // Contracts & Compliance
        setElText("contTotal", Number(data.total_contracts || 0).toLocaleString());
        setElText("contActive", Number(data.active_contracts || 0).toLocaleString());
        setElText("contExpiring", Number(data.expiring_contracts || 0).toLocaleString());
        setElText("contExpired", Number(data.expired_contracts || 0).toLocaleString());
        setElText("contIssues", Number(data.compliance_issues || 0).toLocaleString());
        setElText("contPendingDocs", Number(data.pending_compliance_docs || 0).toLocaleString());

        // 4. Render 4 Dynamic Charts
        if (data.activity_trend) renderPlatformTrendChart(data.activity_trend);
        if (data.users_by_role) renderUsersRoleChart(data.users_by_role);
        if (data.vendor_risk_distribution) renderVendorRiskChart(data.vendor_risk_distribution);
        if (data.po_status_distribution) renderPoStatusChart(data.po_status_distribution);

        // 5. System Health Telemetry
        if (data.system_health) {
            setElText("apiLatencyVal", `${data.system_health.api_latency_ms || 0} ms`);
            setElText("dbRecordsVal", `${Number(data.system_health.total_records_tracked || 0).toLocaleString()} Rows Indexed`);
            setElText("dbConnectionVal", `${data.system_health.db_connection || 'Connected'} (${data.system_health.db_ping_ms || 0} ms ping)`);
            setElText("jwtSecurityVal", data.system_health.jwt_security || "HS256 Bearer Token Active");
            setElText("backendEngineVal", data.system_health.db_engine || "PostgreSQL 18 & FastAPI Async");
            setElText("serverStatusVal", data.system_health.fastapi_status || "Operational");

            const badgeEl = document.getElementById("systemHealthOverallBadge");
            if (badgeEl) {
                const status = data.system_health.status || "Healthy";
                badgeEl.textContent = status;
                badgeEl.className = status === "Healthy" ? "kpi-trend positive" : (status === "Moderate" ? "kpi-trend neutral" : "kpi-trend negative");
            }
        }

        // Live Sync Timestamp
        setElText("adminLastSync", `Synchronized at ${new Date().toLocaleTimeString()}`);

        // 6. Platform Insights
        if (data.insights) {
            setElText("topCategoryInsight", `Top merchandise sales category is "${data.insights.top_category || 'General'}". Highest transaction volume across historical operations.`);
            setElText("highRiskVendorsInsight", `${data.insights.high_risk_vendors_count || 0} supplier(s) scored below 60% reliability index. Risk mitigation and proactive audit required.`);
            setElText("contractsInsight", `${data.total_contracts || 0} total legal SLA agreements tracked (${data.active_contracts || 0} active, ${data.expired_contracts || 0} expired).`);
        }

        // 7. Recent System Activities Audit Trail
        renderRecentActivities(data.recent_activities || []);

    } catch (error) {
        console.error("Error loading Admin dashboard statistics:", error);
        setElText("adminLastSync", "Sync failed. Check backend connection.");
        if (typeof showToast === "function") {
            showToast(`Dashboard synchronization error: ${error.message}`, "error");
        }
    }
}

/**
 * Helper to safely set element text content
 */
function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

/**
 * 2. Render 6 Interactive Platform Governance Alert Cards
 */
function renderGovernanceAlerts(alerts) {
    const container = document.getElementById("governanceAlertsContainer");
    if (!container) return;

    if (!alerts || alerts.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-secondary);">
                ✓ All platform governance parameters are within normal thresholds. Zero active warnings.
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    alerts.forEach(alert => {
        let badgeClass = "badge-neutral";
        let cardBorderClass = "";
        if (alert.severity === "critical") {
            badgeClass = "badge-poor";
            cardBorderClass = "alert-critical";
        } else if (alert.severity === "warning") {
            badgeClass = "badge-pending";
            cardBorderClass = "alert-warning";
        }

        const card = document.createElement("div");
        card.className = `governance-alert-card clickable-alert ${cardBorderClass}`;
        card.onclick = () => handleAlertClick(alert.target_url);
        card.innerHTML = `
            <div class="governance-alert-header">
                <span class="governance-alert-title">${escapeHTML(alert.title)}</span>
                <span class="badge ${badgeClass}">${alert.count}</span>
            </div>
            <div class="governance-alert-sub">${escapeHTML(alert.subtext)}</div>
            <div class="governance-alert-action">Inspect Records →</div>
        `;
        container.appendChild(card);
    });

    const statusBadge = document.getElementById("governanceStatusBadge");
    if (statusBadge) {
        statusBadge.textContent = `Live Telemetry (${alerts.length} Monitored)`;
    }
}

function handleAlertClick(url) {
    if (!url) return;
    if (url.startsWith("#")) {
        const targetId = url.substring(1);
        if (targetId === "user-management") {
            switchUserTab("pending");
        }
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    } else {
        window.location.href = url;
    }
}

/**
 * 3. Render Chart 1: Monthly Procurement Activity & Spending Trend (Line Chart)
 */
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
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, font: { size: 11, weight: '600' } }
                },
                tooltip: {
                    padding: 10,
                    backgroundColor: '#0f172a',
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 1) {
                                return ` Valuation: ₹${Number(context.raw).toLocaleString('en-IN')}`;
                            }
                            return ` ${context.dataset.label}: ${context.raw} orders`;
                        }
                    }
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

/**
 * 4. Render Chart 2: Users by Canonical Role (Donut Chart)
 */
function renderUsersRoleChart(roleData) {
    const ctx = document.getElementById("usersRoleChart");
    if (!ctx) return;

    if (usersRoleChartInstance) {
        usersRoleChartInstance.destroy();
    }

    const labels = roleData.map(r => r.role);
    const counts = roleData.map(r => r.count);
    const totalUsers = counts.reduce((a, b) => a + b, 0);

    const totalBadge = document.getElementById("totalUsersBadge");
    if (totalBadge) {
        totalBadge.textContent = `${totalUsers} Accounts`;
    }

    const roleColors = {
        'Administrator': '#4f46e5',
        'Admin': '#4f46e5',
        'Procurement Manager': '#06b6d4',
        'Supply Chain Manager': '#10b981',
        'Finance Officer': '#f59e0b',
        'Auditor': '#8b5cf6',
        'Vendor': '#ec4899',
        'Unassigned': '#94a3b8'
    };

    const colors = labels.map(l => roleColors[l] || '#64748b');

    usersRoleChartInstance = new Chart(ctx, {
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
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, font: { size: 11, weight: '500' }, padding: 10 }
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

/**
 * 5. Render Chart 3: Vendor Risk Distribution (Bar Chart with 80/60 Rule)
 */
function renderVendorRiskChart(riskData) {
    const ctx = document.getElementById("vendorRiskChart");
    if (!ctx) return;

    if (vendorRiskChartInstance) {
        vendorRiskChartInstance.destroy();
    }

    const labels = riskData.map(item => item.label);
    const counts = riskData.map(item => item.count);
    const colors = riskData.map(item => item.color || '#4f46e5');
    const totalVendors = counts.reduce((a, b) => a + b, 0);

    const badge = document.getElementById("vendorRiskTotalBadge");
    if (badge) {
        badge.textContent = `${totalVendors} Suppliers`;
    }

    vendorRiskChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Suppliers',
                data: counts,
                backgroundColor: colors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const pct = totalVendors > 0 ? ((context.raw / totalVendors) * 100).toFixed(1) : 0;
                            return ` ${context.raw} suppliers (${pct}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11, weight: '600' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: { precision: 0, font: { size: 10 } }
                }
            }
        }
    });
}

/**
 * 6. Render Chart 4: Purchase Order Status Distribution (Donut Chart)
 */
function renderPoStatusChart(statusData) {
    const ctx = document.getElementById("poStatusChart");
    if (!ctx) return;

    if (poStatusChartInstance) {
        poStatusChartInstance.destroy();
    }

    const labels = statusData.map(s => s.status);
    const counts = statusData.map(s => s.count);

    const colorMap = {
        'Pending': '#f59e0b',
        'Completed': '#10b981',
        'Delivered': '#06b6d4',
        'Cancelled / Fraud': '#64748b',
        'Approved': '#3b82f6',
        'Ordered / Processing': '#8b5cf6'
    };
    const defaultColors = ['#f59e0b', '#10b981', '#06b6d4', '#64748b', '#3b82f6', '#8b5cf6'];
    const colors = labels.map((l, i) => colorMap[l] || defaultColors[i % defaultColors.length]);

    poStatusChartInstance = new Chart(ctx, {
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
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, font: { size: 11, weight: '500' }, padding: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${Number(context.raw).toLocaleString()} orders`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * 7. Render Recent System Activities from audit_logs
 */
function renderRecentActivities(activities) {
    const tbody = document.getElementById("systemActivitiesBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!activities || activities.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state-wrapper" style="text-align: center; padding: 24px; color: var(--text-secondary);">No recent system activity recorded in PostgreSQL.</td></tr>`;
        return;
    }

    activities.forEach(act => {
        let badgeClass = "badge-neutral";
        const actionUpper = (act.action || "").toUpperCase();
        if (actionUpper.includes("CREATE") || actionUpper.includes("REGISTER") || actionUpper.includes("APPROVED")) {
            badgeClass = "badge-active";
        } else if (actionUpper.includes("UPDATE") || actionUpper.includes("LOGIN") || actionUpper.includes("ROLE")) {
            badgeClass = "badge-pending";
        } else if (actionUpper.includes("DELETE") || actionUpper.includes("REJECT") || actionUpper.includes("DEACTIVATE")) {
            badgeClass = "badge-poor";
        }

        tbody.innerHTML += `
            <tr>
                <td>#${act.id}</td>
                <td style="font-weight: 600;">${escapeHTML(act.user_email || act.user_name)}</td>
                <td><span class="badge ${badgeClass}">${escapeHTML(act.action)}</span></td>
                <td style="font-weight: 500;">${escapeHTML(act.entity_type)}</td>
                <td style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(act.details)}">
                    ${escapeHTML(act.details)}
                </td>
                <td style="color: var(--text-secondary); font-size: 12px;">${escapeHTML(act.timestamp)}</td>
            </tr>
        `;
    });
}

/**
 * 8. Load Vendor list for dropdown mappings
 */
async function loadVendors() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/vendors`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        vendorsList = await response.json();
    } catch (error) {
        console.error("Error loading vendors list:", error);
    }
}

/**
 * 9. Tab Switching for User Management
 */
function switchUserTab(tab) {
    currentTab = tab;
    const btnPending = document.getElementById("tabBtnPending");
    const btnAll = document.getElementById("tabBtnAllUsers");
    const contentPending = document.getElementById("tabContentPending");
    const contentAll = document.getElementById("tabContentAllUsers");

    if (tab === "pending") {
        btnPending?.classList.add("active");
        btnAll?.classList.remove("active");
        if (contentPending) contentPending.style.display = "block";
        if (contentAll) contentAll.style.display = "none";
        loadPendingUsers();
    } else {
        btnPending?.classList.remove("active");
        btnAll?.classList.add("active");
        if (contentPending) contentPending.style.display = "none";
        if (contentAll) contentAll.style.display = "block";
        loadAdminUsersDirectory();
    }
}

/**
 * 10. Load Pending Users Queue
 */
async function loadPendingUsers() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/pending-users`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);
        const users = await response.json();

        // Update badges
        const badge1 = document.getElementById("pendingTabBadge");
        if (badge1) badge1.textContent = users.length;

        const tbody = document.getElementById("pendingTableBody");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 32px; color: var(--text-secondary);">
                        <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
                        <strong>Approval queue clear</strong><br>
                        All user registration requests have been reviewed and approved.
                    </td>
                </tr>
            `;
            return;
        }

        let vendorOptions = '<option value="">-- Choose Linked Vendor Company --</option>';
        vendorsList.forEach(v => {
            vendorOptions += `<option value="${v.id}">${escapeHTML(v.vendor_name)} (ID: ${v.id})</option>`;
        });

        users.forEach(u => {
            tbody.innerHTML += `
                <tr data-id="${u.id}">
                    <td>#${u.id}</td>
                    <td style="font-weight: 600;">${escapeHTML(u.name)}</td>
                    <td>${escapeHTML(u.email)}</td>
                    <td>
                        <select class="filter-select" id="pendingRoleSelect${u.id}" onchange="handlePendingRoleChange(${u.id})" style="padding: 6px 10px; font-size: 12px; width: 100%; max-width: 200px;">
                            <option value="Vendor" selected>Vendor</option>
                            <option value="Procurement Manager">Procurement Manager</option>
                            <option value="Supply Chain Manager">Supply Chain Manager</option>
                            <option value="Finance Officer">Finance Officer</option>
                            <option value="Auditor">Auditor</option>
                            <option value="Administrator">Administrator</option>
                        </select>
                        <select class="filter-select" id="pendingVendorSelect${u.id}" style="display: block; margin-top: 6px; padding: 6px 10px; font-size: 12px; width: 100%; max-width: 200px;">
                            ${vendorOptions}
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-primary" onclick="confirmApproveUser(${u.id}, '${escapeHTML(u.name)}')" style="padding: 6px 12px; font-size: 12px; margin-right: 6px;">
                            Approve
                        </button>
                        <button class="btn btn-danger" onclick="confirmRejectUser(${u.id}, '${escapeHTML(u.name)}')" style="padding: 6px 12px; font-size: 12px;">
                            Reject
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error loading pending users queue:", error);
    }
}

function handlePendingRoleChange(userId) {
    const roleSelect = document.getElementById(`pendingRoleSelect${userId}`);
    const vendorSelect = document.getElementById(`pendingVendorSelect${userId}`);
    if (roleSelect && vendorSelect) {
        vendorSelect.style.display = roleSelect.value === "Vendor" ? "block" : "none";
    }
}

async function confirmApproveUser(userId, userName) {
    const roleSelect = document.getElementById(`pendingRoleSelect${userId}`);
    const vendorSelect = document.getElementById(`pendingVendorSelect${userId}`);
    const role = roleSelect ? roleSelect.value : "Vendor";
    const vendorId = vendorSelect ? vendorSelect.value : "";

    if (role === "Vendor" && !vendorId) {
        showToast("Vendor accounts must be linked to a registered vendor company.", "warning");
        return;
    }

    const confirmed = confirm(`Are you sure you want to APPROVE user "${userName}" as "${role}"?`);
    if (!confirmed) return;

    try {
        const token = getToken();
        const formData = new FormData();
        formData.append("role", role);
        if (role === "Vendor" && vendorId) {
            formData.append("vendor_id", vendorId);
        }

        const response = await fetch(`${API_BASE_URL}/approve-user/${userId}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "User approved successfully.", "success");
            await loadPendingUsers();
            await loadAdminUsersDirectory();
            await loadAdminStats();
        } else {
            showToast(result.error || result.detail || "Approval failed.", "error");
        }
    } catch (error) {
        console.error("Error approving user:", error);
        showToast("Server connection error.", "error");
    }
}

async function confirmRejectUser(userId, userName) {
    const confirmed = confirm(`Are you sure you want to REJECT registration request for "${userName}"?`);
    if (!confirmed) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/reject-user/${userId}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "User rejected successfully.", "success");
            await loadPendingUsers();
            await loadAdminUsersDirectory();
            await loadAdminStats();
        } else {
            showToast(result.error || result.detail || "Rejection failed.", "error");
        }
    } catch (error) {
        console.error("Error rejecting user:", error);
        showToast("Server connection error.", "error");
    }
}

/**
 * 11. All Users Directory (Full Search, Filter, Pagination, Actions)
 */
function debounceUserSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        loadAdminUsersDirectory();
    }, 350);
}

function resetUserFilters() {
    const searchInput = document.getElementById("userSearchInput");
    const roleFilter = document.getElementById("userRoleFilter");
    const statusFilter = document.getElementById("userStatusFilter");

    if (searchInput) searchInput.value = "";
    if (roleFilter) roleFilter.value = "All";
    if (statusFilter) statusFilter.value = "All";

    loadAdminUsersDirectory();
}

async function loadAdminUsersDirectory() {
    const tbody = document.getElementById("allUsersTableBody");
    if (!tbody) return;

    const searchInput = document.getElementById("userSearchInput");
    const roleFilter = document.getElementById("userRoleFilter");
    const statusFilter = document.getElementById("userStatusFilter");

    const query = searchInput ? searchInput.value.trim() : "";
    const role = roleFilter ? roleFilter.value : "All";
    const status = statusFilter ? statusFilter.value : "All";

    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (role && role !== "All") params.append("role", role);
    if (status && status !== "All") params.append("status", status);

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/admin/users?${params.toString()}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // Update tab badge
        const badge = document.getElementById("allUsersTabBadge");
        if (badge) badge.textContent = data.total_count || data.users.length;

        tbody.innerHTML = "";

        if (!data.users || data.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state-wrapper" style="text-align: center; padding: 24px;">
                        <div style="font-size: 20px; margin-bottom: 6px;">🔍</div>
                        No platform users match the specified search or filter criteria.
                    </td>
                </tr>
            `;
            return;
        }

        data.users.forEach(u => {
            let statusBadge = "badge-neutral";
            const sLower = (u.status || "").toLowerCase();
            if (sLower === "approved" || sLower === "active") statusBadge = "badge-active";
            else if (sLower === "pending") statusBadge = "badge-pending";
            else if (sLower === "deactivated" || sLower === "inactive" || sLower === "rejected") statusBadge = "badge-poor";

            // Determine activation button
            let statusActionBtn = "";
            const isApproved = sLower === "approved" || sLower === "active";
            const isDeactivated = sLower === "deactivated" || sLower === "inactive" || sLower === "rejected";

            if (isApproved) {
                statusActionBtn = `
                    <button class="btn btn-danger" onclick="toggleUserStatus(${u.id}, 'Deactivated', '${escapeHTML(u.name)}')" style="padding: 5px 10px; font-size: 11px;">
                        Deactivate
                    </button>
                `;
            } else if (isDeactivated) {
                statusActionBtn = `
                    <button class="btn btn-secondary" onclick="toggleUserStatus(${u.id}, 'Approved', '${escapeHTML(u.name)}')" style="padding: 5px 10px; font-size: 11px; color: var(--success-color); border-color: var(--success-color);">
                        Activate
                    </button>
                `;
            }

            const vendorDisplay = u.vendor_name && u.vendor_name !== "N/A" 
                ? `${escapeHTML(u.vendor_name)} (ID: ${u.vendor_id})` 
                : '<span style="color: var(--text-secondary); opacity: 0.6;">—</span>';

            tbody.innerHTML += `
                <tr>
                    <td>#${u.id}</td>
                    <td style="font-weight: 600;">${escapeHTML(u.name)}</td>
                    <td>${escapeHTML(u.email)}</td>
                    <td><span class="badge badge-neutral" style="font-weight: 600;">${escapeHTML(u.role)}</span></td>
                    <td><span class="badge ${statusBadge}">${escapeHTML(u.status)}</span></td>
                    <td style="font-size: 12px;">${vendorDisplay}</td>
                    <td style="color: var(--text-secondary); font-size: 12px;">${escapeHTML(u.created_at)}</td>
                    <td style="color: var(--text-secondary); font-size: 12px;">${escapeHTML(u.last_login)}</td>
                    <td>
                        <div style="display: flex; gap: 6px; flex-wrap: nowrap;">
                            <button class="btn btn-secondary" onclick="openEditRoleModal(${JSON.stringify(u).replace(/"/g, '&quot;')})" style="padding: 5px 10px; font-size: 11px;" title="Change Role & Link Vendor">
                                Role / Link
                            </button>
                            ${statusActionBtn}
                            <button class="btn btn-secondary" onclick="openUserDetailsModal(${u.id})" style="padding: 5px 10px; font-size: 11px;" title="View Complete Profile">
                                Details
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error loading admin users directory:", error);
    }
}

/**
 * 12. Toggle User Status (Activate / Deactivate)
 */
async function toggleUserStatus(userId, targetStatus, userName) {
    const actionWord = targetStatus === "Approved" ? "ACTIVATING" : "DEACTIVATING";
    const warnWord = targetStatus === "Deactivated" ? "They will be blocked from logging into VendorIQ." : "They will regain system access.";
    const confirmed = confirm(`Are you sure you want to proceed with ${actionWord} account for "${userName}"?\n${warnWord}`);
    if (!confirmed) return;

    try {
        const token = getToken();
        const formData = new FormData();
        formData.append("status", targetStatus);

        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.message || `User status updated to ${targetStatus}.`, "success");
            await loadAdminUsersDirectory();
            await loadAdminStats();
        } else {
            showToast(result.detail || "Status update failed.", "error");
        }
    } catch (error) {
        console.error("Error updating user status:", error);
        showToast("Server connection error.", "error");
    }
}

/**
 * 13. Edit User Role Modal
 */
function openEditRoleModal(user) {
    editingUser = user;
    document.getElementById("editUserId").value = user.id;
    document.getElementById("editUserNameDisplay").textContent = `${user.name} (${user.email})`;

    const roleSelect = document.getElementById("modalRoleSelect");
    if (roleSelect) roleSelect.value = user.role;

    const vendorGroup = document.getElementById("modalVendorGroup");
    const vendorSelect = document.getElementById("modalVendorSelect");

    if (vendorSelect) {
        vendorSelect.innerHTML = '<option value="">-- Select Registered Vendor Company --</option>';
        vendorsList.forEach(v => {
            const isSelected = user.vendor_id && Number(user.vendor_id) === Number(v.id);
            vendorSelect.innerHTML += `<option value="${v.id}" ${isSelected ? 'selected' : ''}>${escapeHTML(v.vendor_name)} (ID: ${v.id})</option>`;
        });
    }

    if (vendorGroup) {
        vendorGroup.style.display = user.role === "Vendor" ? "block" : "none";
    }

    const modal = document.getElementById("editRoleModal");
    if (modal) modal.classList.add("active");
}

function handleModalRoleChange() {
    const role = document.getElementById("modalRoleSelect").value;
    const vendorGroup = document.getElementById("modalVendorGroup");
    if (vendorGroup) {
        vendorGroup.style.display = role === "Vendor" ? "block" : "none";
    }
}

function closeEditRoleModal() {
    const modal = document.getElementById("editRoleModal");
    if (modal) modal.classList.remove("active");
    editingUser = null;
}

async function submitEditUserRole() {
    const userId = document.getElementById("editUserId").value;
    const role = document.getElementById("modalRoleSelect").value;
    const vendorSelect = document.getElementById("modalVendorSelect");
    const vendorId = vendorSelect ? vendorSelect.value : "";

    if (role === "Vendor" && !vendorId) {
        showToast("Vendor accounts must be mapped to a registered vendor company.", "warning");
        return;
    }

    const confirmed = confirm(`Confirm role change to "${role}" for this user?`);
    if (!confirmed) return;

    try {
        const token = getToken();
        const formData = new FormData();
        formData.append("role", role);
        if (role === "Vendor" && vendorId) {
            formData.append("vendor_id", vendorId);
        }

        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "Role updated successfully.", "success");
            closeEditRoleModal();
            await loadAdminUsersDirectory();
            await loadAdminStats();
        } else {
            showToast(result.detail || "Failed to update role.", "error");
        }
    } catch (error) {
        console.error("Error submitting role update:", error);
        showToast("Server connection error.", "error");
    }
}

/**
 * 14. View User Profile Details Modal
 */
async function openUserDetailsModal(userId) {
    const modal = document.getElementById("userDetailsModal");
    const body = document.getElementById("userDetailsModalBody");
    if (modal) modal.classList.add("active");
    if (body) {
        body.innerHTML = `
            <div class="loading-spinner-wrapper" style="padding: 24px;">
                <div class="spinner"></div>
                <p>Loading profile details...</p>
            </div>
        `;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const user = await response.json();

        if (body) {
            body.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px;">
                    <div><strong>User ID:</strong> #${user.id}</div>
                    <div><strong>Status:</strong> <span class="badge ${user.status === 'Approved' ? 'badge-active' : 'badge-pending'}">${escapeHTML(user.status)}</span></div>
                    <div><strong>Full Name:</strong> ${escapeHTML(user.name)}</div>
                    <div><strong>Assigned Role:</strong> <span class="badge badge-neutral">${escapeHTML(user.role)}</span></div>
                    <div style="grid-column: 1 / -1;"><strong>Email:</strong> ${escapeHTML(user.email)}</div>
                    <div><strong>Phone:</strong> ${escapeHTML(user.phone || '—')}</div>
                    <div><strong>First / Last Name:</strong> ${escapeHTML((user.first_name || '') + ' ' + (user.last_name || '')).trim() || '—'}</div>
                    <div style="grid-column: 1 / -1; border-top: 1px solid var(--border-color); padding-top: 10px;">
                        <strong>Linked Vendor Company:</strong> ${user.vendor_name ? `${escapeHTML(user.vendor_name)} (ID: ${user.vendor_id})` : 'None / Not Applicable'}
                    </div>
                    <div><strong>Account Created:</strong> ${escapeHTML(user.created_at)}</div>
                    <div><strong>Last Login Timestamp:</strong> ${escapeHTML(user.last_login)}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error loading user profile details:", error);
        if (body) {
            body.innerHTML = `<div style="color: var(--danger-color); padding: 16px;">Failed to load user profile.</div>`;
        }
    }
}

function closeUserDetailsModal() {
    const modal = document.getElementById("userDetailsModal");
    if (modal) modal.classList.remove("active");
}

/**
 * 15. Load RBAC Permissions Matrix
 */
async function loadPermissionsMatrix() {
    const tbody = document.getElementById("permissionsMatrixBody");
    if (!tbody) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/admin/roles-permissions`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const resData = await response.json();
        const matrix = Array.isArray(resData) ? resData : (resData.permissions_matrix || []);

        tbody.innerHTML = "";
        matrix.forEach(row => {
            const checkAccess = val => {
                if (val.toLowerCase().includes("full") || val.toLowerCase().includes("operations") || val.toLowerCase().includes("control") || val.toLowerCase().includes("executive")) {
                    return `<span style="color: var(--success-color); font-weight: 700;">✓ Full</span>`;
                } else if (val.toLowerCase().includes("read") || val.toLowerCase().includes("review") || val.toLowerCase().includes("limited") || val.toLowerCase().includes("operational")) {
                    return `<span style="color: var(--primary-color); font-weight: 600;">✓ Scope</span>`;
                } else {
                    return `<span style="color: var(--text-secondary); opacity: 0.4;">—</span>`;
                }
            };

            tbody.innerHTML += `
                <tr>
                    <td style="font-weight: 700; color: var(--text-color);">${escapeHTML(row.role)}</td>
                    <td style="font-size: 12px; color: var(--text-secondary); max-width: 220px;">${escapeHTML(row.scope)}</td>
                    <td><span class="badge badge-neutral" style="font-size: 11px;">${escapeHTML(row.dashboard)}</span></td>
                    <td>${checkAccess(row.user_management)}</td>
                    <td>${checkAccess(row.vendor_management)}</td>
                    <td>${checkAccess(row.procurement)}</td>
                    <td>${checkAccess(row.contracts)}</td>
                    <td>${checkAccess(row.invoices_payments)}</td>
                    <td>${checkAccess(row.audit_logs)}</td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error loading permissions matrix:", error);
    }
}

/**
 * HTML Escaper
 */
function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

// Make modal functions accessible to inline onclick handlers
window.switchUserTab = switchUserTab;
window.debounceUserSearch = debounceUserSearch;
window.resetUserFilters = resetUserFilters;
window.loadAdminUsersDirectory = loadAdminUsersDirectory;
window.handlePendingRoleChange = handlePendingRoleChange;
window.confirmApproveUser = confirmApproveUser;
window.confirmRejectUser = confirmRejectUser;
window.toggleUserStatus = toggleUserStatus;
window.openEditRoleModal = openEditRoleModal;
window.closeEditRoleModal = closeEditRoleModal;
window.handleModalRoleChange = handleModalRoleChange;
window.submitEditUserRole = submitEditUserRole;
window.openUserDetailsModal = openUserDetailsModal;
window.closeUserDetailsModal = closeUserDetailsModal;
window.handleAlertClick = handleAlertClick;