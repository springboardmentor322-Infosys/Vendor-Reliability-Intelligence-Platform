const API_BASE_URL = "http://127.0.0.1:8000";
let supplierDistChartInstance = null;
let shippingModesChartInstance = null;

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    const role = getUserRole();
    if (role !== "Admin" && role !== "Supply Chain Manager") {
        console.warn("Unauthorized role accessed supplychain_dashboard:", role);
        return;
    }

    await loadSupplyChainStats();
}

async function loadSupplyChainStats() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/dashboard/supplychain-stats`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            throw new Error(`Supply Chain stats API Error: ${response.status}`);
        }
        
        const data = await response.json();

        // 1. KPI Cards
        document.getElementById("totalSuppliersVal").textContent = Number(data.total_suppliers || 0).toLocaleString();
        document.getElementById("atRiskSub").textContent = `${data.at_risk_suppliers || 0} At-Risk Suppliers (<60% SLA)`;
        document.getElementById("activePOsVal").textContent = Number(data.active_orders || 0).toLocaleString();
        document.getElementById("delayedDeliveries").textContent = Number(data.delayed_deliveries || 0).toLocaleString();
        document.getElementById("avgDelaySub").textContent = `Avg Latency: ${data.average_delay_days || 0} Days`;
        document.getElementById("onTimeRate").textContent = `${data.on_time_rate || 0}%`;

        // 2. Supply Chain Insights
        if (data.insights) {
            document.getElementById("topShippingModeInsight").textContent = 
                `"${data.insights.dominant_shipping_mode}" is primary freight class representing ${data.insights.dominant_mode_pct}% of dispatches.`;
            document.getElementById("delayImpactInsight").textContent = 
                `Average fulfillment delay is ${data.average_delay_days} days on late orders with ₹${(data.insights.delayed_order_value || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})} transit value at risk.`;
            document.getElementById("atRiskSuppliersInsight").textContent = 
                `${data.at_risk_suppliers} suppliers flagged with delivery SLA scores below critical benchmark.`;
        }

        // 3. Render Supplier Performance Distribution Chart
        if (data.supplier_performance_dist) {
            renderSupplierDistChart(data.supplier_performance_dist);
        }

        // 4. Render Shipping Modes Chart
        if (data.shipping_modes && data.shipping_modes.length > 0) {
            renderShippingModesChart(data.shipping_modes);
        }

        // 5. Render Late Risk Alerts
        renderAlerts(data.late_risk_alerts || []);

        // 6. Render Recent Shipments Log
        renderRecentShipments(data.recent_shipments || []);

    } catch (error) {
        console.error("Error loading supply chain stats:", error);
    }
}

function renderSupplierDistChart(dist) {
    const ctx = document.getElementById("supplierDistChart");
    if (!ctx) return;

    if (supplierDistChartInstance) {
        supplierDistChartInstance.destroy();
    }

    const labels = ["Excellent (>85%)", "Good (70-85%)", "Average (60-70%)", "At-Risk (<60%)"];
    const counts = [
        dist.excellent || 0,
        dist.good || 0,
        dist.average || 0,
        dist.at_risk || 0
    ];

    const total = counts.reduce((a, b) => a + b, 0);
    const badge = document.getElementById("performanceTierBadge");
    if (badge) {
        badge.textContent = `${total} Total Suppliers`;
    }

    const colors = [
        "#10b981", // Excellent (Green)
        "#3b82f6", // Good (Blue)
        "#f59e0b", // Average (Amber)
        "#ef4444"  // At-Risk (Red)
    ];

    supplierDistChartInstance = new Chart(ctx, {
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
                            return ` ${context.label}: ${context.raw} supplier(s)`;
                        }
                    }
                }
            }
        }
    });
}

function renderShippingModesChart(shippingModes) {
    const ctx = document.getElementById("shippingModesChart");
    if (!ctx) return;

    if (shippingModesChartInstance) {
        shippingModesChartInstance.destroy();
    }

    const labels = shippingModes.map(m => m.mode);
    const counts = shippingModes.map(m => m.count);

    shippingModesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Shipment Volume',
                data: counts,
                backgroundColor: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b'],
                borderRadius: 6,
                barPercentage: 0.6
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
                            return ` Volume: ${Number(context.raw || 0).toLocaleString()} orders`;
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
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}

function renderAlerts(alerts) {
    const container = document.getElementById("alertsContainer");
    const badge = document.getElementById("alertsCountBadge");
    if (badge) badge.textContent = `${alerts.length} Active Alerts`;
    if (!container) return;
    container.innerHTML = "";

    if (alerts.length === 0) {
        container.innerHTML = `<p style="color: var(--success-color); font-weight: 600; padding: 15px;">✓ No active late delivery alerts at this time.</p>`;
        return;
    }

    alerts.forEach(alert => {
        const div = document.createElement("div");
        div.className = "alert-item";
        div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px;";
        
        div.innerHTML = `
            <div>
                <div style="font-weight: 600; font-size: 13px; color: #991b1b;">
                    Delivery #${alert.delivery_id} - ${escapeHTML(alert.vendor_name)}
                </div>
                <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                    Product: ${escapeHTML(alert.product_name)} | ${alert.date}
                </div>
            </div>
            <div style="background-color: var(--danger-bg); color: var(--danger-text); font-weight: 700; padding: 4px 8px; border-radius: 6px; font-size: 11px;">
                +${alert.delay_days}d late
            </div>
        `;
        container.appendChild(div);
    });
}

function renderRecentShipments(shipments) {
    const tbody = document.getElementById("recentDeliveriesBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (shipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state-wrapper">No recent logistics shipments found.</td></tr>`;
        return;
    }

    shipments.forEach(delivery => {
        const delayDays = delivery.delay_days || 0;
        const delayText = delayDays > 0 ? `+${delayDays} days late` : "On Time";
        const isLate = delayDays > 0;
        const statusClass = isLate ? "badge-poor" : "badge-active";
        
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">#${delivery.delivery_id}</td>
                <td style="font-weight: 600;">${escapeHTML(delivery.vendor_name)}</td>
                <td>${escapeHTML(delivery.region || 'Regional')}</td>
                <td><span class="badge badge-neutral">${escapeHTML(delivery.shipping_mode)}</span></td>
                <td>${delivery.expected_date || 'N/A'}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(delivery.status)}</span></td>
                <td style="font-weight: 600; color: ${isLate ? 'var(--danger-color)' : 'var(--success-color)'};">${delayText}</td>
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

