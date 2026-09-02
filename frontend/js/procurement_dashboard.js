const API_BASE_URL = "http://127.0.0.1:8000";
let ordersDonutChartInstance = null;

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    const role = getUserRole();
    if (role !== "Admin" && role !== "Procurement Manager") {
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

        // 1. KPI Summary Cards
        document.getElementById("totalOrders").textContent = Number(data.total_orders || 0).toLocaleString();
        document.getElementById("totalVendorsSub").textContent = `${data.total_vendors || 0} Registered Suppliers`;
        document.getElementById("activeOrdersVal").textContent = Number(data.active_orders || 0).toLocaleString();
        document.getElementById("pendingOrdersVal").textContent = Number(data.pending_orders || 0).toLocaleString();
        document.getElementById("onTimeRate").textContent = `${data.on_time_delivery_rate || 0}%`;
        document.getElementById("avgReliabilitySub").textContent = `Avg Reliability: ${data.avg_reliability || 0}`;

        // 2. Budget vs Spend Section
        const budget = data.budget || {};
        const allocated = budget.allocated_budget || 0;
        const actual = budget.actual_spend || 0;
        const remaining = budget.remaining_budget || 0;
        const utilPct = budget.budget_utilization_pct || 0;

        document.getElementById("allocatedBudgetVal").textContent = `₹${allocated.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("actualSpendVal").textContent = `₹${actual.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("remainingBudgetVal").textContent = `₹${remaining.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("budgetUtilBadge").textContent = `${utilPct}% Utilized`;
        document.getElementById("budgetProgressPct").textContent = `${utilPct}%`;
        
        const progressBar = document.getElementById("budgetProgressBar");
        if (progressBar) {
            progressBar.style.width = `${Math.min(utilPct, 100)}%`;
        }

        // 3. Procurement Insights
        if (data.insights) {
            document.getElementById("velocityInsight").textContent = 
                `Average supplier delivery turnaround is ${data.insights.avg_delivery_days} days across fulfillments.`;
            document.getElementById("pendingRequisitionsInsight").textContent = 
                `${data.pending_orders} purchase order requisitions require procurement clearance.`;
            document.getElementById("topSupplierInsight").textContent = 
                `Top-performing supplier partner is "${data.insights.top_supplier_name}" with score ${data.insights.top_supplier_score}%.`;
        }

        // 4. Render Orders Donut Chart
        if (data.po_distribution) {
            renderOrdersDonutChart(data.po_distribution);
        }

        // 5. Render Scorecard Table
        renderScorecard(data.scorecard || []);

        // 6. Render Recent Orders Table
        renderRecentOrders(data.recent_orders || []);

    } catch (error) {
        console.error("Error loading procurement dashboard stats:", error);
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
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state-wrapper">No supplier scorecard data found.</td></tr>`;
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

        tbody.innerHTML += `
            <tr>
                <td>#${vendor.vendor_id}</td>
                <td style="font-weight: 600;">${escapeHTML(vendor.vendor_name)}</td>
                <td>${vendor.total_orders ?? 0}</td>
                <td>${vendor.completed_orders ?? 0}</td>
                <td>${Number(vendor.on_time_rate || 0).toFixed(1)}%</td>
                <td>${Number(vendor.quality_score || 0).toFixed(1)}%</td>
                <td><span class="badge ${relClass}" style="font-weight: 600;">${reliability.toFixed(1)}</span></td>
                <td><span class="badge ${riskClass}">${escapeHTML(risk)}</span></td>
            </tr>
        `;
    });
}

function renderRecentOrders(recentOrders) {
    const tbody = document.getElementById("purchaseOrdersBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (recentOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state-wrapper">No recent purchase orders found.</td></tr>`;
        return;
    }

    recentOrders.forEach(order => {
        const status = order.status || "Pending";
        let statusClass = "badge-warning";
        const stLower = status.toLowerCase();
        if (stLower === "completed" || stLower === "delivered" || stLower === "complete") statusClass = "badge-active";
        else if (stLower === "cancelled" || stLower === "rejected") statusClass = "badge-poor";
        else if (stLower === "processing" || stLower === "in-transit") statusClass = "badge-active";

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">#${order.id}</td>
                <td style="font-weight: 600;">${escapeHTML(order.vendor_name)}</td>
                <td>${escapeHTML(order.product_name || 'Item Requisition')}</td>
                <td style="font-weight: 600;">₹${Number(order.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${order.order_date || 'N/A'}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(status)}</span></td>
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

