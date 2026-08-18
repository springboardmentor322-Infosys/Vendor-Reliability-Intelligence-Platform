const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    const role = getUserRole();
    if (role !== "Admin" && role !== "Procurement Manager") {
        console.warn("Unauthorized role accessed procurement_dashboard:", role);
        return;
    }

    await loadSummary();
    await loadVendorPerformance();
    await loadRecentOrders();
}

async function loadSummary() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/summary`);
        if (!response.ok) {
            throw new Error(`Summary API Error: ${response.status}`);
        }
        const data = await response.json();

        document.getElementById("totalVendors").textContent = Number(data.total_vendors || 0).toLocaleString();
        document.getElementById("totalOrders").textContent = Number(data.total_orders || 0).toLocaleString();
        document.getElementById("completedOrders").textContent = Number(data.completed_orders || 0).toLocaleString();
        document.getElementById("pendingOrders").textContent = Number(data.pending_orders || 0).toLocaleString();
        document.getElementById("onTimeRate").textContent = `${Number(data.on_time_delivery_percentage || 0).toFixed(1)}%`;
        document.getElementById("lateRate").textContent = `${Number(data.late_delivery_risk_pct || 0).toFixed(1)}%`;
        document.getElementById("avgReliability").textContent = Number(data.average_reliability || 0).toFixed(1);
    } catch (error) {
        console.error("Error loading procurement summary KPIs:", error);
    }
}

async function loadVendorPerformance() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendor-performance`);
        if (!response.ok) {
            throw new Error(`Performance API Error: ${response.status}`);
        }
        const data = await response.json();
        
        const tbody = document.querySelector("#vendorPerformanceTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="empty-state-wrapper">No vendor performance data found.</td></tr>`;
            return;
        }

        // Limit to top 15 vendors by reliability score for clean presentation
        const displayData = data.slice(0, 15);

        displayData.forEach(vendor => {
            const row = document.createElement("tr");
            
            const reliability = Number(vendor.reliability_score || 0);
            let relClass = "badge-active";
            if (reliability < 60) relClass = "badge-poor";
            else if (reliability < 75) relClass = "badge-warning";
            
            const risk = vendor.risk || "Unknown";
            let riskClass = "badge-active";
            if (risk === "High Risk") riskClass = "badge-poor";
            else if (risk === "Medium Risk") riskClass = "badge-warning";

            row.innerHTML = `
                <td>#${vendor.vendor_id}</td>
                <td style="font-weight: 600;">${escapeHTML(vendor.vendor_name)}</td>
                <td>${vendor.total_orders ?? 0}</td>
                <td>${vendor.completed_orders ?? 0}</td>
                <td>${vendor.pending_orders ?? 0}</td>
                <td>${Number(vendor.delivery_rate || 0).toFixed(1)}%</td>
                <td>${Number(vendor.quality_score || 0).toFixed(1)}%</td>
                <td><span class="badge ${relClass}" style="font-weight: 600;">${reliability.toFixed(1)}</span></td>
                <td><span class="badge ${riskClass}">${escapeHTML(risk)}</span></td>
                <td><span class="badge ${relClass}">${escapeHTML(vendor.performance || "N/A")}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading vendor scorecard:", error);
        const tbody = document.querySelector("#vendorPerformanceTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="color: var(--danger-color); text-align: center; padding: 20px;">Error loading supplier scorecard.</td></tr>`;
        }
    }
}

async function loadRecentOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders`);
        if (!response.ok) {
            throw new Error(`Orders API Error: ${response.status}`);
        }
        const data = await response.json();
        
        const tbody = document.querySelector("#purchaseOrdersTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state-wrapper">No recent purchase orders found.</td></tr>`;
            return;
        }

        // Render top 10 recent orders
        const recentOrders = data.slice(0, 10);

        recentOrders.forEach(order => {
            const row = document.createElement("tr");
            
            const status = order.status || "Pending";
            let statusClass = "badge-warning";
            if (status.toLowerCase() === "completed" || status.toLowerCase() === "delivered") statusClass = "badge-active";
            else if (status.toLowerCase() === "rejected" || status.toLowerCase() === "cancelled") statusClass = "badge-poor";

            row.innerHTML = `
                <td>#${order.id}</td>
                <td style="font-weight: 600;">${escapeHTML(order.vendor_name)}</td>
                <td>${escapeHTML(order.product_name)}</td>
                <td>${order.quantity}</td>
                <td style="font-weight: 600;">$${Number(order.total_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${order.order_date}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(status)}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading recent purchase orders:", error);
        const tbody = document.querySelector("#purchaseOrdersTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger-color); text-align: center; padding: 20px;">Error loading recent purchase orders.</td></tr>`;
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
