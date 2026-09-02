const API_BASE_URL = "http://127.0.0.1:8000";
let vendorMetricsChartInstance = null;

document.addEventListener("DOMContentLoaded", loadVendorDashboard);

async function loadVendorDashboard() {
    try {
        const token = getToken();
        if (!token) {
            window.location.replace("login.html");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/dashboard/vendor-stats`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`GET /dashboard/vendor-stats failed: ${response.status}`);
        }

        const data = await response.json();
        const profile = data.profile || {};
        const scores = data.scores || {};
        const invoices = data.invoices_summary || {};
        const orders = data.orders_summary || {};

        // 1. Header & Profile
        document.getElementById("welcomeHeader").innerText = `Welcome, ${profile.vendor_name || getUserName()}`;
        document.getElementById("vName").innerText = profile.vendor_name || 'N/A';
        document.getElementById("vCategory").innerText = profile.category || 'General Merchandise';
        document.getElementById("vEmail").innerText = profile.email || 'N/A';
        document.getElementById("vContact").innerText = profile.contact_name || 'Account Manager';
        document.getElementById("vCity").innerText = profile.city ? `${profile.city}, ${profile.state || ''}` : 'Regional Distribution';
        document.getElementById("vStatusBadge").innerText = profile.status || 'Active';
        document.getElementById("vRiskBadge").innerText = `${profile.risk_level || 'Low Risk'}`;

        // 2. KPI Cards
        const overallRel = Number(scores.overall_reliability || 0).toFixed(1);
        document.getElementById("reliabilityScore").innerText = `${overallRel}%`;
        document.getElementById("riskLevelSub").innerText = `${profile.risk_level || 'Tier 1'} Supplier Rating`;
        document.getElementById("deliveryRateVal").innerText = `${Number(scores.on_time_delivery || 0).toFixed(1)}%`;
        document.getElementById("qualityScoreVal").innerText = `${Number(scores.quality_score || 0).toFixed(1)}%`;
        document.getElementById("totalRevenueVal").innerText = `₹${(orders.total_revenue || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("activeOrdersSub").innerText = `${orders.active_orders || 0} Active Orders (${orders.total_orders || 0} Total)`;

        // 3. Invoices Summary
        document.getElementById("vTotalBilled").innerText = `₹${(invoices.total_billed || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("vTotalBilledCount").innerText = `${invoices.total_invoices || 0} total invoices`;
        document.getElementById("vPaidAmount").innerText = `₹${(invoices.paid_amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("vPaidCount").innerText = `${invoices.paid_invoices || 0} cleared invoices`;
        document.getElementById("vPendingAmount").innerText = `₹${(invoices.pending_amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("vPendingCount").innerText = `${invoices.pending_invoices || 0} pending payment`;

        // 4. Render Multi-Metric Chart
        renderMetricsChart(scores);

        // 5. Render AI Recommendations
        renderRecommendations(data.recommendations || []);

        // 6. Render Scoped Recent Orders
        renderVendorOrders(data.recent_orders || []);

    } catch (err) {
        console.error("Error loading Vendor dashboard:", err);
    }
}

function renderMetricsChart(scores) {
    const ctx = document.getElementById("vendorMetricsChart");
    if (!ctx) return;

    if (vendorMetricsChartInstance) {
        vendorMetricsChartInstance.destroy();
    }

    const labels = ["Delivery SLA", "Quality Score", "Communication", "Compliance", "Service SLA"];
    const values = [
        scores.on_time_delivery || 0,
        scores.quality_score || 0,
        scores.communication_score || 75,
        scores.compliance_score || 75,
        scores.service_score || 70
    ];

    const colors = [
        "#4f46e5", // Indigo
        "#10b981", // Emerald
        "#06b6d4", // Cyan
        "#8b5cf6", // Violet
        "#f59e0b"  // Amber
    ];

    vendorMetricsChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
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
                            return ` ${context.label}: ${Number(context.raw || 0).toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
}

function renderRecommendations(recommendations) {
    const container = document.getElementById("recommendationsContainer");
    if (!container) return;
    container.innerHTML = "";

    if (recommendations.length === 0) {
        container.innerHTML = `<div class="insight-card success">
            <div class="insight-icon">✅</div>
            <div class="insight-content">
                <h4>Exceptional Supplier Standards</h4>
                <p>All delivery SLAs, quality standards, and compliance criteria are fully satisfied.</p>
            </div>
        </div>`;
        return;
    }

    recommendations.forEach(rec => {
        let cardClass = "info";
        let icon = "💡";
        if (rec.type === "danger" || rec.title.toLowerCase().includes("risk")) {
            cardClass = "danger";
            icon = "⚠️";
        } else if (rec.type === "warning") {
            cardClass = "warning";
            icon = "⚡";
        } else if (rec.type === "success") {
            cardClass = "success";
            icon = "🌟";
        }

        const div = document.createElement("div");
        div.className = `insight-card ${cardClass}`;
        div.innerHTML = `
            <div class="insight-icon">${icon}</div>
            <div class="insight-content">
                <h4>${escapeHTML(rec.title)}</h4>
                <p>${escapeHTML(rec.detail)}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderVendorOrders(orders) {
    const tbody = document.getElementById("vendorOrdersBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state-wrapper">No purchase orders allocated to your company yet.</td></tr>`;
        return;
    }

    orders.forEach(order => {
        const status = order.status || "Pending";
        let statusClass = "badge-warning";
        const stLower = status.toLowerCase();
        if (stLower === "completed" || stLower === "delivered" || stLower === "complete") statusClass = "badge-active";
        else if (stLower === "cancelled" || stLower === "rejected") statusClass = "badge-poor";
        else if (stLower === "processing" || stLower === "in-transit") statusClass = "badge-active";

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">#${order.id}</td>
                <td>${escapeHTML(order.product_name || 'Standard Requisition')}</td>
                <td>${order.quantity} units</td>
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

