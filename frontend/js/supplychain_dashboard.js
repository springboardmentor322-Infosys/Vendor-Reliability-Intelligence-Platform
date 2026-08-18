const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    const role = getUserRole();
    if (role !== "Admin" && role !== "Supply Chain Manager") {
        console.warn("Unauthorized role accessed supplychain_dashboard:", role);
        return;
    }

    await loadSummary();
    await loadRecentDeliveries();
    await loadAlerts();
    await loadTrend();
}

async function loadSummary() {
    try {
        const response = await fetch(`${API_BASE_URL}/deliveries/summary`);
        if (!response.ok) {
            throw new Error(`Summary API Error: ${response.status}`);
        }
        const data = await response.json();

        document.getElementById("totalDeliveries").textContent = Number(data.total_deliveries).toLocaleString();
        document.getElementById("onTimeRate").textContent = `${data.delivery_performance_rate}%`;
        document.getElementById("delayedDeliveries").textContent = Number(data.delayed_deliveries).toLocaleString();
        document.getElementById("averageDelay").textContent = `${data.average_delay} days`;
        document.getElementById("atRiskVendors").textContent = Number(data.at_risk_vendors).toLocaleString();
    } catch (error) {
        console.error("Error loading summary KPIs:", error);
    }
}

async function loadRecentDeliveries() {
    try {
        const response = await fetch(`${API_BASE_URL}/deliveries/recent`);
        if (!response.ok) {
            throw new Error(`Recent Deliveries API Error: ${response.status}`);
        }
        const data = await response.json();
        
        const tbody = document.querySelector("#recentDeliveriesTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state-wrapper">No recent deliveries found.</td></tr>`;
            return;
        }

        data.forEach(delivery => {
            const row = document.createElement("tr");
            
            const delayText = delivery.delay_days > 0 ? `${delivery.delay_days} days` : "0 days";
            const isLate = delivery.status.toLowerCase().includes("late");
            const statusClass = isLate ? "badge-poor" : "badge-active";
            
            row.innerHTML = `
                <td>#${delivery.delivery_id}</td>
                <td style="font-weight: 600;">${escapeHTML(delivery.vendor_name)}</td>
                <td>${escapeHTML(delivery.product_name)}</td>
                <td>${delivery.expected_date}</td>
                <td>${delivery.actual_date}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(delivery.status)}</span></td>
                <td style="font-weight: 600; color: ${isLate ? 'var(--danger-color)' : 'var(--success-color)'};">${delayText}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading recent deliveries:", error);
        const tbody = document.querySelector("#recentDeliveriesTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger-color); text-align: center; padding: 20px;">Error loading recent deliveries.</td></tr>`;
        }
    }
}

async function loadAlerts() {
    try {
        const response = await fetch(`${API_BASE_URL}/deliveries/alerts`);
        if (!response.ok) {
            throw new Error(`Alerts API Error: ${response.status}`);
        }
        const data = await response.json();
        
        const container = document.getElementById("alertsContainer");
        if (!container) return;
        container.innerHTML = "";
        
        if (data.length === 0) {
            container.innerHTML = `<p style="color: var(--success-color); font-weight: 600; padding: 15px;">✓ No active late delivery alerts at this time.</p>`;
            return;
        }

        data.forEach(alert => {
            const div = document.createElement("div");
            div.className = "alert-item";
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);";
            
            div.innerHTML = `
                <div class="alert-info">
                    <strong style="color: var(--text-primary);">Delivery #${alert.delivery_id}</strong> - 
                    Vendor: <span style="font-weight: 600; color: var(--primary-color);">${escapeHTML(alert.vendor_name)}</span> | 
                    Product: <span>${escapeHTML(alert.product_name)}</span>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">
                        Actual: ${alert.date} (${escapeHTML(alert.status)})
                    </div>
                </div>
                <div class="alert-delay" style="background-color: var(--danger-light); color: var(--danger-color); font-weight: 600; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    +${alert.delay_days}d late
                </div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error("Error loading alerts:", error);
        const container = document.getElementById("alertsContainer");
        if (container) {
            container.innerHTML = `<p style="color: var(--danger-color); font-weight: 600; padding: 15px;">Error loading delivery alerts.</p>`;
        }
    }
}

async function loadTrend() {
    try {
        const response = await fetch(`${API_BASE_URL}/deliveries/trend`);
        if (!response.ok) {
            throw new Error(`Trend API Error: ${response.status}`);
        }
        const data = await response.json();
        
        const tbody = document.querySelector("#trendTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state-wrapper">No trend data available.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td style="font-weight: 600;">${item.month}</td>
                <td>${Number(item.total_deliveries).toLocaleString()}</td>
                <td style="color: var(--success-color); font-weight: 600;">${Number(item.on_time_deliveries).toLocaleString()}</td>
                <td style="color: var(--danger-color); font-weight: 600;">${Number(item.delayed_deliveries).toLocaleString()}</td>
                <td style="font-weight: 700; color: var(--primary-color);">${item.performance_rate}%</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading monthly trend:", error);
        const tbody = document.querySelector("#trendTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="color: var(--danger-color); text-align: center; padding: 20px;">Error loading trend data.</td></tr>`;
        }
    }
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
