const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", loadFinanceDashboard);

async function loadFinanceDashboard() {
    await fetchSummary();
    await fetchRecentInvoices();
}

async function fetchSummary() {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/summary`);
        if (!response.ok) {
            throw new Error(`Summary API failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        document.getElementById("totalCount").innerText = data.total_count || 0;
        document.getElementById("totalAmount").innerText = `₹${(data.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById("pendingCount").innerText = data.pending_count || 0;
        document.getElementById("pendingAmount").innerText = `₹${(data.pending_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    } catch (err) {
        console.error("Error fetching summary:", err);
    }
}

async function fetchRecentInvoices() {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices?page=1&limit=10`);
        if (!response.ok) {
            throw new Error(`Invoices list failed: ${response.status}`);
        }
        
        const invoices = await response.json();
        const tbody = document.getElementById("invoiceTableBody");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (invoices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state-wrapper">No invoices recorded.</td></tr>`;
            return;
        }
        
        invoices.forEach(inv => {
            const isPending = (inv.payment_status || "").toLowerCase() === "pending";
            const badgeClass = isPending ? "badge-pending" : "badge-active";
            
            let actionBtn = `<span style="color: var(--success-color); font-weight: 600;">Paid</span>`;
            if (isPending) {
                actionBtn = `<button class="btn btn-primary" onclick="markInvoicePaid(${inv.id})" style="padding: 6px 12px; font-size: 11px;">Mark Paid</button>`;
            }
                
            tbody.innerHTML += `
                <tr>
                    <td>#${inv.id}</td>
                    <td>#${inv.po_id || 'N/A'}</td>
                    <td style="font-weight: 600;">${inv.vendor_name || 'N/A'}</td>
                    <td>${inv.product_name || 'N/A'}</td>
                    <td style="font-weight: 600;">₹${(inv.invoice_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td><span class="badge ${badgeClass}">${inv.payment_status}</span></td>
                    <td>${inv.due_date || 'N/A'}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error fetching recent invoices:", err);
        const tbody = document.getElementById("invoiceTableBody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="color: var(--danger-color); text-align: center; padding: 20px;">Failed to load invoices.</td></tr>`;
        }
    }
}

async function markInvoicePaid(id) {
    if (!confirm("Are you sure you want to mark this invoice as paid?")) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/pay`, {
            method: "PUT"
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast("Invoice marked as Paid successfully.", "success");
            loadFinanceDashboard();
        } else {
            showToast(result.detail || "Failed to update invoice payment.", "error");
        }
    } catch (err) {
        console.error("Error during pay request:", err);
        showToast("Network error. Please try again.", "error");
    }
}
