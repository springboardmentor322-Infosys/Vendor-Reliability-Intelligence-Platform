const API_BASE_URL = "http://127.0.0.1:8000";
let allInvoices = [];

document.addEventListener("DOMContentLoaded", initInvoices);

async function initInvoices() {
    await loadInvoices();
    
    // Bind event delegation for mark as paid button clicks
    const tbody = document.querySelector("#invoiceTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
    }
}

let currentPage = 1;
const limit = 20;

function setupPaginationDOM() {
    const tableCard = document.querySelector(".table-card");
    if (!tableCard) return;
    
    if (document.getElementById("paginationContainer")) return;
    
    const pagDiv = document.createElement("div");
    pagDiv.id = "paginationContainer";
    pagDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 12px 16px; border-top: 1px solid var(--border-color); background-color: var(--card-bg);";
    
    pagDiv.innerHTML = `
        <div id="paginationInfo" style="font-size: 13px; color: var(--text-secondary);">Showing 0-0 of 0 invoices</div>
        <div style="display: flex; gap: 8px;">
            <button id="prevPageBtn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px;">Previous</button>
            <button id="nextPageBtn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px;">Next</button>
        </div>
    `;
    
    tableCard.appendChild(pagDiv);
    
    document.getElementById("prevPageBtn").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadInvoices();
        }
    });
    
    document.getElementById("nextPageBtn").addEventListener("click", () => {
        currentPage++;
        loadInvoices();
    });
}

function updatePaginationControls(totalCount) {
    setupPaginationDOM();
    
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const info = document.getElementById("paginationInfo");
    
    if (!prevBtn || !nextBtn || !info) return;
    
    const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
    const endIdx = Math.min(currentPage * limit, totalCount);
    
    info.textContent = `Showing ${startIdx}-${endIdx} of ${totalCount} invoices`;
    
    prevBtn.disabled = (currentPage === 1);
    prevBtn.style.opacity = prevBtn.disabled ? "0.5" : "1";
    prevBtn.style.cursor = prevBtn.disabled ? "not-allowed" : "pointer";
    
    const hasNext = (currentPage * limit < totalCount);
    nextBtn.disabled = !hasNext;
    nextBtn.style.opacity = nextBtn.disabled ? "0.5" : "1";
    nextBtn.style.cursor = nextBtn.disabled ? "not-allowed" : "pointer";
}

async function loadInvoices() {
    try {
        const statusVal = document.getElementById("statusFilter").value;
        const searchVal = document.getElementById("searchFilter").value.trim();
        
        let url = `${API_BASE_URL}/invoices?page=${currentPage}&limit=${limit}&paginate=true`;
        if (statusVal !== "all") {
            url += `&status=${encodeURIComponent(statusVal)}`;
        }
        if (searchVal !== "") {
            url += `&search=${encodeURIComponent(searchVal)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Invoices API Error: ${response.status}`);
        }
        const data = await response.json();
        
        allInvoices = Array.isArray(data.invoices) ? data.invoices : [];
        
        // Update KPIs using server aggregates
        document.getElementById("kpiTotalInvoices").textContent = data.kpi_total || 0;
        document.getElementById("kpiPaidInvoices").textContent = data.kpi_paid || 0;
        document.getElementById("kpiPendingInvoices").textContent = data.kpi_pending || 0;
        document.getElementById("kpiLedgerValue").textContent = `₹${(data.kpi_sum || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        // Render table
        renderInvoices(allInvoices);
        
        // Update pagination controls
        updatePaginationControls(data.total_count);
    } catch (error) {
        console.error("Error fetching invoices:", error);
        const tbody = document.querySelector("#invoiceTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error: Unable to load billing invoices. Please check connection.</td></tr>`;
        }
    }
}

function filterInvoices() {
    currentPage = 1;
    loadInvoices();
}

function renderInvoices(invoicesList) {
    const tbody = document.querySelector("#invoiceTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (invoicesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state-wrapper">
            <div class="empty-state-icon">📄</div>
            <div class="empty-state-title">No billing invoices found</div>
            <p>Modify search filters or keywords.</p>
        </td></tr>`;
        return;
    }

    const userRole = getUserRole();
    const canPay = userRole === "Admin" || userRole === "Finance Officer";

    invoicesList.forEach(invoice => {
        const statusClass = invoice.payment_status === "Paid" ? "badge-active" : "badge-pending";
        const formattedAmount = `₹${Number(invoice.invoice_amount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        let actionContent = "-";
        if (invoice.payment_status === "Pending" && canPay) {
            actionContent = `<button class="btn btn-primary" data-action="pay" data-id="${invoice.id}" style="padding: 6px 12px; font-size: 11px;">Mark Paid</button>`;
        } else if (invoice.payment_status === "Paid") {
            actionContent = `<span style="color: var(--success-color); font-weight: 600;">Paid</span>`;
        }

        tbody.innerHTML += `
        <tr data-id="${invoice.id}">
            <td style="font-weight: 600;">${escapeHTML(invoice.invoice_number)}</td>
            <td style="font-weight: 500;">${escapeHTML(invoice.vendor_name)}</td>
            <td>#${invoice.po_id}</td>
            <td>${invoice.invoice_date || "N/A"}</td>
            <td>${invoice.due_date || "N/A"}</td>
            <td style="font-weight: 600; text-align: right;">${formattedAmount}</td>
            <td><span class="badge ${statusClass}">${invoice.payment_status}</span></td>
            <td>${invoice.payment_date || "-"}</td>
            <td>${actionContent}</td>
        </tr>
        `;
    });
}

function handleTableClick(event) {
    const btn = event.target.closest("button");
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);
    
    if (action === "pay") {
        markAsPaid(id);
    }
}

async function markAsPaid(invoiceId) {
    const confirmPay = confirm("Are you sure you want to mark this invoice as Paid? This will record the payment transaction in PostgreSQL.");
    if (!confirmPay) return;

    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/pay`, {
            method: "PUT"
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Invoice status updated to Paid.", "success");
            await loadInvoices();
        } else {
            showToast(result.detail || "Failed to submit invoice payment.", "error");
        }
    } catch (error) {
        console.error("Error marking invoice as paid:", error);
        showToast("Error executing payment submission.", "error");
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
