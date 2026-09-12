const API_BASE_URL = "http://127.0.0.1:8000";
let ordersDonutChartInstance = null;
let deliveryTrendChartInstance = null;
let dashboardPoSource = 'application'; // 'application' (default) | 'historical' | 'all'
let cachedDashboardAppOrders = [];
let cachedDashboardHistOrders = [];

function isAppOrder(order) {
    if (!order) return false;
    if (order.is_application_order !== undefined && order.is_application_order !== null) {
        return Boolean(order.is_application_order);
    }
    if (order.is_app_po !== undefined && order.is_app_po !== null) {
        return Boolean(order.is_app_po);
    }
    if (order.source_type) {
        return order.source_type.toLowerCase().includes("application");
    }
    if (order.data_source) {
        return order.data_source.toLowerCase().includes("application");
    }
    return Boolean(order.id >= 180520 || (order.po_number && String(order.po_number).includes("2026")));
}

async function setDashboardPoSource(source) {
    dashboardPoSource = source;
    
    // Sync button classes
    const btnApp = document.getElementById("btnDashSourceApp");
    const btnHist = document.getElementById("btnDashSourceHist");
    const btnAll = document.getElementById("btnDashSourceAll");
    const sub = document.getElementById("recentOrdersSubheading");

    if (btnApp) btnApp.className = `btn btn-sm ${source === 'application' ? 'btn-primary active' : 'btn-secondary'}`;
    if (btnHist) btnHist.className = `btn btn-sm ${source === 'historical' ? 'btn-primary active' : 'btn-secondary'}`;
    if (btnAll) btnAll.className = `btn btn-sm ${source === 'all' ? 'btn-primary active' : 'btn-secondary'}`;

    if (sub) {
        if (source === 'application') {
            sub.textContent = "Application purchase orders created through procurement workflows. Click Inspect to review and manage.";
        } else if (source === 'historical') {
            sub.textContent = "Historical DataCo Supply Chain records. Showing historical transaction ledger.";
        } else {
            sub.textContent = "All purchase orders with Application Purchase Orders prioritized first.";
        }
    }

    if (source === 'application') {
        renderRecentOrders(cachedDashboardAppOrders);
    } else if (source === 'historical') {
        if (cachedDashboardHistOrders.length === 0) {
            await loadHistoricalDashboardOrders();
        } else {
            renderRecentOrders(cachedDashboardHistOrders);
        }
    } else {
        if (cachedDashboardHistOrders.length === 0) {
            await loadHistoricalDashboardOrders(false);
        }
        const combined = [...cachedDashboardAppOrders, ...cachedDashboardHistOrders];
        combined.sort((a, b) => {
            const aApp = isAppOrder(a);
            const bApp = isAppOrder(b);
            if (aApp !== bApp) return bApp ? 1 : -1;
            return b.id - a.id;
        });
        renderRecentOrders(combined);
    }
}

async function loadHistoricalDashboardOrders(render = true) {
    const tbody = document.getElementById("purchaseOrdersBody");
    if (render && tbody) {
        tbody.innerHTML = `<tr><td colspan="9" class="loading-spinner-wrapper"><div class="spinner"></div><p>Loading historical DataCo records...</p></td></tr>`;
    }
    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/purchase-orders?page=2&limit=10`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (res.ok) {
            const data = await res.json();
            const orders = Array.isArray(data.purchase_orders) ? data.purchase_orders : (Array.isArray(data) ? data : []);
            cachedDashboardHistOrders = orders.filter(o => !isAppOrder(o)).slice(0, 10);
            if (render) renderRecentOrders(cachedDashboardHistOrders);
        }
    } catch (e) {
        console.error("Error loading historical orders for dashboard:", e);
    }
}

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    const role = getUserRole();
    if (role !== "Admin" && role !== "Administrator" && role !== "Procurement Manager") {
        console.warn("Unauthorized role accessed procurement_dashboard:", role);
        return;
    }

    await loadProcurementStats();
}

async function loadProcurementStats() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/dashboard/procurement-stats`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            throw new Error(`Procurement stats API Error: ${response.status}`);
        }
        
        const data = await response.json();

        // Dynamic Greeting
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
        const elWelcome = document.getElementById("procWelcomeTitle");
        if (elWelcome) {
            elWelcome.innerHTML = `${greeting}, ${getUserName()} 👋`;
        }

        // 1. Top KPI Summary Cards
        document.getElementById("totalOrders").textContent = Number(data.historical_transactions ?? data.total_orders ?? 0).toLocaleString();
        document.getElementById("totalVendorsSub").textContent = `DataCo Line Items (65,761 Unique POs)`;
        document.getElementById("activeOrdersVal").textContent = Number(data.active_purchase_orders ?? data.active_orders ?? 0).toLocaleString();
        document.getElementById("pendingOrdersVal").textContent = Number(data.pending_requisitions ?? data.insights?.pending_requisitions ?? 0).toLocaleString();
        document.getElementById("onTimeRate").textContent = `${data.on_time_delivery_rate || 0}%`;
        document.getElementById("avgReliabilitySub").textContent = `Avg Supplier Score: ${data.avg_reliability || 0}%`;

        // 2. Section 1: Canonical 7-Stage Purchase Order Lifecycle Pipeline
        if (data.canonical_status_overview) {
            const appSt = data.canonical_status_overview.application || {};
            const ledSt = data.canonical_status_overview.ledger || {};

            renderCanonicalStage("stPendingApproval", "stSubPendingApproval", appSt.pending_approval || 0, ledSt.pending_approval || 0);
            renderCanonicalStage("stApproved", "stSubApproved", appSt.approved || 0, ledSt.approved || 0);
            renderCanonicalStage("stOrdered", "stSubOrdered", appSt.ordered || 0, ledSt.ordered || 0);
            renderCanonicalStage("stInTransit", "stSubInTransit", appSt.in_transit || 0, ledSt.in_transit || 0);
            renderCanonicalStage("stDelivered", "stSubDelivered", appSt.delivered || 0, ledSt.delivered || 0);
            renderCanonicalStage("stCompleted", "stSubCompleted", appSt.completed || 0, ledSt.completed || 0);
            renderCanonicalStage("stCancelled", "stSubCancelled", appSt.cancelled || 0, ledSt.cancelled || 0);
        }

        // 3. Section 2: Active Purchase Order Monitoring
        if (data.active_monitoring) {
            const act = data.active_monitoring;
            const elActTotal = document.getElementById("actTotalActive");
            if (elActTotal) elActTotal.textContent = `${act.total_active || 0} Orders`;
            const elActOrdTransit = document.getElementById("actOrderedInTransit");
            if (elActOrdTransit) elActOrdTransit.textContent = `${act.ordered_or_in_transit || 0} Active`;
            const elActDelayed = document.getElementById("actDelayed");
            if (elActDelayed) elActDelayed.textContent = `${act.delayed_deliveries || 0} Delayed`;
            const elActUpcoming = document.getElementById("actUpcoming");
            if (elActUpcoming) elActUpcoming.textContent = `${act.upcoming_deliveries || 0} Scheduled`;
        }

        // 4. Section 3: Pending Requisitions Action Panel
        renderPendingRequisitions(data.pending_requisitions_list || []);

        // 5. Section 4: Procurement Cost Analysis
        const cost = data.cost_analysis || {};
        const hasBudget = Boolean(cost.has_budget ?? (data.total_budget && data.total_budget > 0));
        const allocated = cost.budget_allocation !== null && cost.budget_allocation !== undefined ? Number(cost.budget_allocation) : (data.total_budget ? Number(data.total_budget) : null);
        const used = Number(cost.budget_utilized ?? data.actual_spend ?? 0);
        const remaining = cost.remaining_budget !== null && cost.remaining_budget !== undefined ? Number(cost.remaining_budget) : (allocated !== null ? Math.max(0, allocated - used) : null);
        const utilPct = Number(cost.budget_utilization_pct ?? data.budget_utilization_pct ?? 0);
        const entSpend = Number(cost.total_procurement_spending ?? data.total_procurement_spending ?? 0);
        const appSpend = Number(cost.application_procurement_spending ?? data.application_procurement_spending ?? 0);

        if (hasBudget && allocated !== null && allocated > 0) {
            document.getElementById("allocatedBudgetVal").textContent = `₹${allocated.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
            document.getElementById("actualSpendVal").textContent = `₹${used.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
            document.getElementById("remainingBudgetVal").textContent = `₹${remaining.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
            document.getElementById("budgetUtilBadge").textContent = `${utilPct}% Utilized`;
            document.getElementById("budgetProgressPct").textContent = `${utilPct}%`;
            const progressBar = document.getElementById("budgetProgressBar");
            if (progressBar) progressBar.style.width = `${Math.min(utilPct, 100)}%`;
        } else {
            document.getElementById("allocatedBudgetVal").textContent = "N/A";
            document.getElementById("actualSpendVal").textContent = `₹${used.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
            document.getElementById("remainingBudgetVal").textContent = "N/A";
            document.getElementById("budgetUtilBadge").textContent = "No Budget Configured";
            document.getElementById("budgetProgressPct").textContent = "Budget comparison unavailable — no budget records configured";
            const progressBar = document.getElementById("budgetProgressBar");
            if (progressBar) progressBar.style.width = "0%";
        }

        const elTotalSpend = document.getElementById("totalEnterpriseSpendVal");
        if (elTotalSpend) elTotalSpend.textContent = `₹${entSpend.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const elAppSpend = document.getElementById("appProcSpendVal");
        if (elAppSpend) elAppSpend.textContent = `₹${appSpend.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Render Donut Chart
        if (data.po_distribution) {
            renderOrdersDonutChart(data.po_distribution);
        }

        // 6. Section 5: Delivery Status Section
        if (data.delivery_status) {
            const del = data.delivery_status;
            const elInTransit = document.getElementById("delivInTransitVal");
            if (elInTransit) elInTransit.textContent = Number(del.in_transit_orders || 0).toLocaleString();
            const elOnTime = document.getElementById("delivOnTimeVal");
            if (elOnTime) elOnTime.textContent = Number(del.on_time_deliveries || 0).toLocaleString();
            const elOnTimeRateSub = document.getElementById("delivOnTimeRateSub");
            if (elOnTimeRateSub) elOnTimeRateSub.textContent = `${del.on_time_rate || data.on_time_delivery_rate || 0}% fulfillment rate`;
            const elDelayed = document.getElementById("delivDelayedVal");
            if (elDelayed) elDelayed.textContent = Number(del.delayed_deliveries || 0).toLocaleString();
            const elUpcoming = document.getElementById("delivUpcomingVal");
            if (elUpcoming) elUpcoming.textContent = Number(del.upcoming_deliveries || 0).toLocaleString();
        }
        await loadDeliveryTrendChart();

        // 7. Procurement Insights
        if (data.insights) {
            document.getElementById("velocityInsight").textContent = 
                `Average supplier delivery turnaround is ${data.insights.avg_delivery_days} days across fulfillments.`;
            document.getElementById("pendingRequisitionsInsight").textContent = 
                `${data.pending_requisitions ?? data.insights?.pending_requisitions ?? 0} purchase requisitions require procurement clearance.`;
            document.getElementById("topSupplierInsight").textContent = 
                `Top-performing supplier partner is "${data.insights.top_supplier_name}" with score ${data.insights.top_supplier_score}%.`;
        }

        // 8. Render Scorecard Table
        renderScorecard(data.scorecard || []);

        // 9. Cache and Render Application Purchase Orders Table
        cachedDashboardAppOrders = (data.recent_orders || []).map(o => ({
            ...o,
            is_application_order: true,
            is_app_po: true,
            source_type: "Application Purchase Orders"
        }));
        await setDashboardPoSource(dashboardPoSource);

    } catch (error) {
        console.error("Error loading procurement dashboard stats:", error);
    }
}

function renderCanonicalStage(valId, subId, appCount, ledgerCount) {
    const elVal = document.getElementById(valId);
    const elSub = document.getElementById(subId);
    if (elVal) elVal.textContent = Number(appCount).toLocaleString();
    if (elSub) elSub.textContent = `${Number(appCount).toLocaleString()} app / ${Number(ledgerCount).toLocaleString()} total`;
}

function renderPendingRequisitions(reqList) {
    const tbody = document.getElementById("pendingRequestsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(reqList) || reqList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state-wrapper" style="text-align: center; padding: 24px; color: var(--text-muted);">
            ✅ No pending requisitions awaiting procurement review.
        </td></tr>`;
        return;
    }

    reqList.forEach(req => {
        const vDisplay = (req.vendor_name || "").replace(/^Derived Vendor Proxy\s+/i, "Vendor-");
        const relScore = Number(req.vendor_reliability || 0);
        const relClass = relScore >= 75 ? "badge-active" : relScore >= 60 ? "badge-warning" : "badge-poor";

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">#${req.id}</td>
                <td style="font-weight: 500;">${escapeHTML(req.product_name)}</td>
                <td style="font-weight: 500;">${escapeHTML(vDisplay || "Unassigned")}</td>
                <td><span class="badge ${relClass}" style="font-size: 11px;">${relScore.toFixed(1)}%</span></td>
                <td>${req.quantity}</td>
                <td>${req.request_date || 'N/A'}</td>
                <td>${escapeHTML(req.requested_by)}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-primary" onclick="approveRequisitionInline(${req.id}, ${req.vendor_id || 'null'})" style="padding: 4px 8px; font-size: 11px;">✓ Approve</button>
                        <button class="btn btn-danger" onclick="rejectRequisitionInline(${req.id})" style="padding: 4px 8px; font-size: 11px;">✕ Reject</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

async function approveRequisitionInline(id, currentVendorId) {
    let vendorId = currentVendorId;
    if (!vendorId) {
        const input = prompt("This requisition has no supplier assigned.\nEnter Supplier Partner ID to assign based on reliability (e.g. 24, 37, 208):", "37");
        if (input === null) return;
        vendorId = parseInt(input.trim());
        if (!vendorId || isNaN(vendorId)) {
            alert("A valid Supplier ID is required to approve.");
            return;
        }
    } else {
        const confirmApprove = confirm(`Approve requisition #${id} with Supplier #${vendorId}?`);
        if (!confirmApprove) return;
    }

    try {
        const token = getToken();
        const formData = new FormData();
        if (vendorId) formData.append("vendor_id", vendorId);

        const response = await fetch(`${API_BASE_URL}/purchase-requests/approve/${id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            alert("Requisition approved successfully.");
            await loadProcurementStats();
        } else {
            alert(result.detail || result.error || "Approval failed.");
        }
    } catch (e) {
        console.error("Approve requisition error:", e);
        alert("Server error connecting to approve API.");
    }
}

async function rejectRequisitionInline(id) {
    const confirmReject = confirm(`Reject purchase requisition #${id}?`);
    if (!confirmReject) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-requests/reject/${id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const result = await response.json();
        if (response.ok) {
            alert("Requisition rejected.");
            await loadProcurementStats();
        } else {
            alert(result.detail || result.error || "Rejection failed.");
        }
    } catch (e) {
        console.error("Reject requisition error:", e);
    }
}

async function loadDeliveryTrendChart() {
    const ctx = document.getElementById("deliveryTrendChart");
    if (!ctx) return;

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/deliveries/trend`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!res.ok) return;
        const trendData = await res.json();
        if (!Array.isArray(trendData) || trendData.length === 0) return;

        if (deliveryTrendChartInstance) {
            deliveryTrendChartInstance.destroy();
        }

        // Take latest 12 months
        const recentTrend = trendData.slice(-12);
        const labels = recentTrend.map(d => d.month);
        const rates = recentTrend.map(d => d.performance_rate);

        deliveryTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'On-Time Fulfillment Rate (%)',
                    data: rates,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 30,
                        max: 100,
                        ticks: {
                            callback: function(v) { return v + '%'; },
                            font: { size: 10 }
                        },
                        grid: { color: 'rgba(226, 232, 240, 0.6)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return ` On-Time Rate: ${ctx.raw}%`;
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error loading delivery trend chart:", e);
    }
}

function renderOrdersDonutChart(dist) {
    const ctx = document.getElementById("ordersDonutChart");
    if (!ctx) return;

    if (ordersDonutChartInstance) {
        ordersDonutChartInstance.destroy();
    }

    const labels = ["Completed", "In Progress", "Pending", "Cancelled"];
    const counts = [
        dist.completed || 0,
        dist.in_progress || 0,
        dist.pending || 0,
        dist.cancelled || 0
    ];

    const total = counts.reduce((a, b) => a + b, 0);
    const completedPct = total > 0 ? ((counts[0] / total) * 100).toFixed(1) : 0;
    const badge = document.getElementById("completedRateBadge");
    if (badge) {
        badge.textContent = `${completedPct}% Completed`;
    }

    const colors = [
        "#10b981", // Completed (Green)
        "#3b82f6", // In Progress (Blue)
        "#f59e0b", // Pending (Amber)
        "#ef4444"  // Cancelled (Red)
    ];

    ordersDonutChartInstance = new Chart(ctx, {
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
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${Number(context.raw || 0).toLocaleString()} orders`;
                        }
                    }
                }
            }
        }
    });
}

function renderScorecard(scorecardList) {
    const tbody = document.getElementById("vendorPerformanceBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (scorecardList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state-wrapper">No supplier scorecard data found.</td></tr>`;
        return;
    }

    scorecardList.forEach(vendor => {
        const reliability = Number(vendor.reliability_score || 0);
        let relClass = "badge-active";
        if (reliability < 60) relClass = "badge-poor";
        else if (reliability < 75) relClass = "badge-warning";
        
        const risk = vendor.risk || "Low Risk";
        let riskClass = "badge-active";
        if (risk === "High Risk") riskClass = "badge-poor";
        else if (risk === "Medium Risk") riskClass = "badge-warning";

        const displayName = (vendor.vendor_name || "").replace(/^Derived Vendor Proxy\s+/i, "Vendor-");

        tbody.innerHTML += `
            <tr>
                <td>#${vendor.vendor_id}</td>
                <td style="font-weight: 600;">${escapeHTML(displayName)}</td>
                <td>${vendor.total_orders ?? 0}</td>
                <td>${vendor.completed_orders ?? 0}</td>
                <td>${Number(vendor.on_time_rate ?? vendor.delivery_rate ?? 0).toFixed(1)}%</td>
                <td>${Number(vendor.quality_score || 0).toFixed(1)}%</td>
                <td><span class="badge ${relClass}" style="font-weight: 600;">${reliability.toFixed(1)}</span></td>
                <td><span class="badge ${riskClass}">${escapeHTML(risk)}</span></td>
                <td>
                    <a href="vendor-performance.html?id=${vendor.vendor_id}" class="btn btn-secondary" style="padding: 3px 8px; font-size: 11px;">View Profile</a>
                </td>
            </tr>
        `;
    });
}

function renderRecentOrders(recentOrders) {
    const tbody = document.getElementById("purchaseOrdersBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(recentOrders) || recentOrders.length === 0) {
        const sourceName = dashboardPoSource === 'application' ? 'Application' : dashboardPoSource === 'historical' ? 'Historical DataCo' : '';
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state-wrapper" style="text-align: center; padding: 24px; color: var(--text-muted);">
            No ${sourceName} purchase orders found.
        </td></tr>`;
        return;
    }

    recentOrders.forEach(order => {
        const status = order.status || "Pending";
        let statusClass = "badge-warning";
        const stLower = status.toLowerCase();
        if (stLower === "completed" || stLower === "delivered" || stLower === "complete") statusClass = "badge-active";
        else if (stLower === "cancelled" || stLower === "rejected") statusClass = "badge-poor";
        else if (stLower === "processing" || stLower === "in-transit" || stLower === "ordered" || stLower === "approved") statusClass = "badge-active";

        const poCode = order.po_number || `#${order.id}`;
        const vendorDisplay = (order.vendor_name || "").replace(/^Derived Vendor Proxy\s+/i, "Vendor-");
        const isApp = isAppOrder(order);
        const sourceBadge = isApp 
            ? `<span class="badge badge-info" style="font-size: 10px; font-weight: 600; padding: 2px 6px; white-space: nowrap;" title="Application Workflow Order">Application PO</span>` 
            : `<span class="badge badge-neutral" style="font-size: 10px; padding: 2px 6px; white-space: nowrap;" title="Historical DataCo Dataset Record">Historical DataCo</span>`;

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600; cursor: pointer; color: var(--primary-color);" onclick="inspectPO(${order.id})">${escapeHTML(poCode)}</td>
                <td>${sourceBadge}</td>
                <td style="font-weight: 600;">${escapeHTML(vendorDisplay || "Registered Supplier")}</td>
                <td>${escapeHTML(order.product_name || 'Item Requisition')}</td>
                <td style="font-weight: 600;">₹${Number(order.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${order.order_date || 'N/A'}</td>
                <td>${order.expected_delivery || 'On Schedule'}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(status)}</span></td>
                <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn btn-primary" onclick="inspectPO(${order.id})" style="padding: 4px 8px; font-size: 11px;">Inspect</button>
                        <button class="btn btn-secondary" onclick="downloadOrderSlip(${order.id})" style="padding: 4px 8px; font-size: 11px;" title="Download Purchase Order Slip">📄 Slip</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// ==================================================
// PURCHASE ORDER DETAIL INSPECTION MODAL
// ==================================================
async function inspectPO(poId) {
    const modal = document.getElementById("poDetailModal");
    const body = document.getElementById("modalPoBody");
    const title = document.getElementById("modalPoTitle");
    const stBadge = document.getElementById("modalPoStatusBadge");
    const dsBadge = document.getElementById("modalDataSourceBadge");
    const footer = document.getElementById("modalPoFooter");

    if (!modal) return;
    modal.classList.add("active");
    body.innerHTML = `<div class="spinner" style="margin: 40px auto;"></div>`;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            body.innerHTML = `<div style="color: var(--danger-color); padding: 20px; text-align: center;">Error loading purchase order details (Status: ${response.status}).</div>`;
            return;
        }

        const po = await response.json();
        title.textContent = `Purchase Order ${po.po_number}`;
        
        const sLower = (po.status || "").toLowerCase();
        let sClass = "badge-warning";
        if (sLower === "completed" || sLower === "delivered") sClass = "badge-active";
        else if (sLower === "cancelled") sClass = "badge-poor";
        else if (sLower === "approved" || sLower === "ordered" || sLower === "in-transit") sClass = "badge-active";
        
        stBadge.className = `badge ${sClass}`;
        stBadge.textContent = po.status;

        dsBadge.textContent = po.data_source || "Application Workflow";
        dsBadge.style.background = po.is_app_po ? "#e0f2fe" : "#f1f5f9";
        dsBadge.style.color = po.is_app_po ? "#0369a1" : "#475569";

        // Vendor details
        const v = po.vendor || {};
        const vRel = Number(v.reliability_score || 0).toFixed(1);
        const vOnTime = Number(v.on_time_delivery_rate || 0).toFixed(1);
        const vQual = Number(v.quality_score || 0).toFixed(1);

        // Delivery details
        const del = po.delivery || {};
        const hasDel = Boolean(del.delivery_id);

        // Invoice details
        const inv = po.invoice || {};
        const hasInv = Boolean(inv.invoice_id);

        const isPricingIncomplete = Boolean(po.is_app_po && (Number(po.unit_price || 0) <= 0 || Number(po.total_amount || 0) <= 0));
        const priceSubtext = isPricingIncomplete
            ? `Qty: ${po.quantity} &times; ₹0.00 <span class="badge badge-poor" style="font-size: 10px; margin-left: 4px;">⚠️ Pricing Incomplete</span>`
            : `Qty: ${po.quantity} &times; ₹${Number(po.unit_price || 0).toFixed(2)}`;
        const totalDisplay = isPricingIncomplete
            ? `₹0.00 <span style="font-size: 11px; color: var(--danger-color); display: block; font-weight: 500;">Unit Price Required</span>`
            : `₹${Number(po.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        body.innerHTML = `
            <!-- Overview Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px;">
                <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Product / Item</div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-color); margin-top: 4px;">${escapeHTML(po.product_name)}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${priceSubtext}</div>
                </div>

                <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Total Purchase Value</div>
                    <div style="font-size: 18px; font-weight: 700; color: ${isPricingIncomplete ? 'var(--danger-color)' : 'var(--primary-color)'}; margin-top: 4px;">${totalDisplay}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">Order Date: ${po.order_date}</div>
                </div>

                <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Expected Delivery</div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-color); margin-top: 4px;">${po.expected_delivery}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">Status: <strong>${po.status}</strong></div>
                </div>
            </div>

            <!-- Supplier Performance & Scorecard Card -->
            <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; font-size: 13px; font-weight: 600;">🏢 Supplier Partner Scorecard</h4>
                    <span class="badge ${v.risk_tier === 'High Risk' ? 'badge-poor' : v.risk_tier === 'Medium Risk' ? 'badge-warning' : 'badge-active'}">${escapeHTML(v.risk_tier || 'Low Risk')}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; font-size: 12px;">
                    <div><span style="color: var(--text-muted);">Supplier:</span> <strong>${escapeHTML(v.name || 'Unassigned')}</strong></div>
                    <div><span style="color: var(--text-muted);">Reliability:</span> <strong style="color: var(--primary-color);">${vRel}%</strong></div>
                    <div><span style="color: var(--text-muted);">On-Time Rate:</span> <strong style="color: var(--success-color);">${vOnTime}%</strong></div>
                    <div><span style="color: var(--text-muted);">Quality Score:</span> <strong>${vQual}%</strong></div>
                </div>
            </div>

            <!-- Logistics & Delivery Status Card -->
            <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600;">🚚 Fulfillment & Delivery Tracking</h4>
                ${hasDel ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; font-size: 12px;">
                        <div><span style="color: var(--text-muted);">Delivery Status:</span> <strong>${escapeHTML(del.delivery_status)}</strong></div>
                        <div><span style="color: var(--text-muted);">Freight Mode:</span> <strong>${escapeHTML(del.shipping_mode)}</strong></div>
                        <div><span style="color: var(--text-muted);">Scheduled Transit:</span> <strong>${del.scheduled_days} days</strong></div>
                        <div><span style="color: var(--text-muted);">Actual Transit:</span> <strong>${del.actual_days} days</strong></div>
                        <div><span style="color: var(--text-muted);">Delay:</span> <strong style="color: ${del.delay_days > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">${del.delay_days} days</strong></div>
                        <div><span style="color: var(--text-muted);">Actual Delivery Date:</span> <strong>${del.actual_delivery_date || 'In Transit'}</strong></div>
                    </div>
                ` : `
                    <p style="margin: 0; font-size: 12px; color: var(--text-muted); font-style: italic;">
                        Carrier dispatch is pending. Once handed over to logistics carrier, real-time transit telemetry will appear here.
                    </p>
                `}
            </div>

            <!-- Associated Invoice Card -->
            <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600;">💳 Associated Settlement Invoice</h4>
                ${hasInv ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; font-size: 12px;">
                        <div><span style="color: var(--text-muted);">Invoice #:</span> <strong>${escapeHTML(inv.invoice_number)}</strong></div>
                        <div><span style="color: var(--text-muted);">Invoice Amount:</span> <strong>₹${inv.invoice_amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></div>
                        <div><span style="color: var(--text-muted);">Due Date:</span> <strong>${inv.due_date || 'N/A'}</strong></div>
                        <div><span style="color: var(--text-muted);">Payment Status:</span> <span class="badge ${inv.payment_status === 'Paid' ? 'badge-active' : 'badge-warning'}">${escapeHTML(inv.payment_status)}</span></div>
                    </div>
                ` : `
                    <p style="margin: 0; font-size: 12px; color: var(--text-muted); font-style: italic;">
                        No billing invoice issued for this purchase order yet. Settlement invoice will generate upon order clearance.
                    </p>
                `}
            </div>
        `;

        // Configure footer workflow action buttons
        footer.innerHTML = `<button type="button" class="btn btn-secondary" onclick="closePoModal()">Close</button>`;

        if (isPricingIncomplete) {
            const btnCompletePrice = document.createElement("button");
            btnCompletePrice.className = "btn btn-primary";
            btnCompletePrice.style.background = "#d97706";
            btnCompletePrice.style.borderColor = "#d97706";
            btnCompletePrice.textContent = "✏️ Complete Pricing";
            btnCompletePrice.onclick = () => completePoPricing(po.id, po.quantity, po.unit_price);
            footer.appendChild(btnCompletePrice);
        }

        if (po.is_app_po && Array.isArray(po.allowed_next_statuses) && po.allowed_next_statuses.length > 0) {
            po.allowed_next_statuses.forEach(targetSt => {
                const isCancel = targetSt.toLowerCase() === "cancelled";
                const btnClass = isCancel ? "btn-danger" : "btn-primary";
                const btn = document.createElement("button");
                btn.className = `btn ${btnClass}`;
                btn.textContent = `Advance to: ${targetSt}`;
                btn.onclick = () => updatePoStatusInline(po.id, targetSt);
                footer.appendChild(btn);
            });
        }

        const btnSlip = document.createElement("button");
        btnSlip.type = "button";
        btnSlip.className = "btn btn-secondary";
        btnSlip.innerHTML = "📄 Download Slip";
        btnSlip.title = "Download official business PDF slip for this Purchase Order";
        btnSlip.onclick = () => downloadOrderSlip(po.id);
        footer.appendChild(btnSlip);

        const btnAll = document.createElement("a");
        btnAll.href = `purchase-orders.html?search=${encodeURIComponent(po.po_number)}`;
        btnAll.className = "btn btn-secondary";
        btnAll.textContent = "View in Register";
        footer.appendChild(btnAll);

    } catch (e) {
        console.error("Error inspecting PO:", e);
        body.innerHTML = `<div style="color: var(--danger-color); padding: 20px; text-align: center;">Error connecting to API.</div>`;
    }
}

async function completePoPricing(poId, quantity, currentPrice) {
    const priceStr = prompt(`Enter valid Unit Price (₹) for Purchase Order #${poId} (Quantity: ${quantity}):`, currentPrice > 0 ? currentPrice : "");
    if (priceStr === null) return;
    const unitPrice = parseFloat(priceStr);
    if (isNaN(unitPrice) || unitPrice <= 0) {
        alert("Please enter a valid positive Unit Price greater than ₹0.00.");
        return;
    }

    try {
        const token = getToken();
        const poRes = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!poRes.ok) {
            alert("Failed to retrieve current purchase order details.");
            return;
        }
        const poData = await poRes.json();
        const calculatedTotal = (quantity * unitPrice).toFixed(2);
        const formData = new FormData();
        formData.append("vendor_id", poData.vendor.id || poData.vendor_id);
        formData.append("product_name", poData.product_name);
        formData.append("quantity", quantity);
        formData.append("unit_price", unitPrice);
        formData.append("total_amount", calculatedTotal);
        formData.append("order_date", poData.order_date || new Date().toISOString().split('T')[0]);
        formData.append("expected_delivery", poData.expected_delivery || new Date().toISOString().split('T')[0]);
        formData.append("status", poData.status);

        const updateRes = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });
        const result = await updateRes.json();
        if (updateRes.ok) {
            alert(`Pricing completed successfully!\nUnit Price: ₹${unitPrice.toFixed(2)}\nTotal Amount: ₹${calculatedTotal}`);
            inspectPO(poId);
            if (typeof loadProcurementStats === "function") loadProcurementStats();
        } else {
            alert(result.detail || result.error || "Failed to update PO pricing.");
        }
    } catch (err) {
        console.error("completePoPricing error:", err);
        alert("Server error updating pricing.");
    }
}

async function updatePoStatusInline(poId, targetStatus) {
    const confirmChange = confirm(`Transition Purchase Order #${poId} to '${targetStatus}'?`);
    if (!confirmChange) return;

    try {
        const token = getToken();
        const formData = new FormData();
        formData.append("status", targetStatus);

        const response = await fetch(`${API_BASE_URL}/purchase-orders/status/${poId}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message || `Purchase order updated to '${targetStatus}'.`);
            closePoModal();
            await loadProcurementStats();
        } else {
            alert(result.detail || result.error || "Status update failed.");
        }
    } catch (e) {
        console.error("Error updating PO status:", e);
        alert("Server error connecting to status update API.");
    }
}

function closePoModal() {
    const modal = document.getElementById("poDetailModal");
    if (modal) modal.classList.remove("active");
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

