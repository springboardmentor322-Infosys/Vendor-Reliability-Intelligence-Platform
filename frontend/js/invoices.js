const API_BASE_URL = "http://127.0.0.1:8000";
let allInvoices = [];
let currentPage = 1;
const limit = 20;

document.addEventListener("DOMContentLoaded", initInvoices);

async function initInvoices() {
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get("status");
    if (statusParam) {
        const filterSelect = document.getElementById("statusFilter");
        if (filterSelect) {
            const raw = statusParam.trim().toLowerCase();
            for (let opt of filterSelect.options) {
                if (opt.value.toLowerCase() === raw || opt.text.toLowerCase().includes(raw)) {
                    filterSelect.value = opt.value;
                    break;
                }
            }
        }
    }

    wireInvoicesKpiClicks();
    await loadInvoices();
    
    // Bind event delegation for table actions
    const tbody = document.querySelector("#invoiceTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
    }

    // Role-based visibility for Create Invoice from PO button (Finance / Admin only)
    const btnCreate = document.getElementById("btnCreateInvoiceFromPo");
    const role = getUserRole();
    if (btnCreate && (role === "Admin" || role === "Administrator" || role === "Finance Officer")) {
        btnCreate.style.display = "inline-flex";
    }
}

function wireInvoicesKpiClicks() {
    const cardTotal = document.getElementById("kpiTotalInvoices")?.closest(".kpi-card");
    if (cardTotal) {
        cardTotal.classList.add("clickable-card");
        cardTotal.title = "Click to show all invoices";
        cardTotal.onclick = () => {
            const sel = document.getElementById("statusFilter");
            if (sel) sel.value = "all";
            currentPage = 1;
            loadInvoices();
        };
    }
    const cardPaid = document.getElementById("kpiPaidInvoices")?.closest(".kpi-card");
    if (cardPaid) {
        cardPaid.classList.add("clickable-card");
        cardPaid.title = "Click to filter Paid invoices";
        cardPaid.onclick = () => {
            const sel = document.getElementById("statusFilter");
            if (sel) sel.value = "Paid";
            currentPage = 1;
            loadInvoices();
        };
    }
    const cardPending = document.getElementById("kpiPendingInvoices")?.closest(".kpi-card");
    if (cardPending) {
        cardPending.classList.add("clickable-card");
        cardPending.title = "Click to filter Pending invoices";
        cardPending.onclick = () => {
            const sel = document.getElementById("statusFilter");
            if (sel) sel.value = "Pending";
            currentPage = 1;
            loadInvoices();
        };
    }
    const cardSpend = document.getElementById("kpiLedgerValue")?.closest(".kpi-card");
    if (cardSpend) {
        cardSpend.classList.add("clickable-card");
        cardSpend.title = "Click to view invoice ledger";
        cardSpend.onclick = () => {
            document.querySelector(".table-card")?.scrollIntoView({ behavior: "smooth" });
        };
    }
}

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

        const token = getToken();
        const response = await fetch(url, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            throw new Error(`Invoices API Error: ${response.status}`);
        }
        const data = await response.json();
        
        allInvoices = Array.isArray(data.invoices) ? data.invoices : [];
        
        // Update KPIs using server aggregates
        document.getElementById("kpiTotalInvoices").textContent = (data.kpi_total || 0).toLocaleString();
        document.getElementById("kpiPaidInvoices").textContent = (data.kpi_paid || 0).toLocaleString();
        document.getElementById("kpiPendingInvoices").textContent = (data.kpi_pending || 0).toLocaleString();
        document.getElementById("kpiLedgerValue").textContent = `₹${(data.kpi_sum || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        // Render table
        renderInvoices(allInvoices);
        
        // Update pagination controls
        updatePaginationControls(data.total_count);
    } catch (error) {
        console.error("Error fetching invoices:", error);
        const tbody = document.querySelector("#invoiceTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="12" style="color: var(--danger-color); text-align: center; padding: 20px;">
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
        tbody.innerHTML = `<tr><td colspan="12" class="empty-state-wrapper">
            <div class="empty-state-icon">📄</div>
            <div class="empty-state-title">No billing invoices found</div>
            <p>Modify search filters or keywords.</p>
        </td></tr>`;
        return;
    }

    const userRole = getUserRole();
    const isFinance = (userRole === "Admin" || userRole === "Administrator" || userRole === "Finance Officer");
    const todayStr = new Date().toISOString().split('T')[0];

    invoicesList.forEach(invoice => {
        const formattedInvoiceAmount = `₹${Number(invoice.invoice_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const formattedUnitPrice = `₹${Number(invoice.unit_price || 0).toFixed(2)}`;
        const formattedPoTotal = `₹${Number(invoice.po_total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const qty = Number(invoice.quantity || 1).toLocaleString();

        const rLower = (invoice.status || "").toLowerCase();
        const pLower = (invoice.payment_status || "").toLowerCase();
        const isPartial = (pLower === "partially paid" || pLower === "partially_paid");

        const invAmt = Number(invoice.invoice_amount || 0);
        const paidAmt = Number(invoice.paid_amount || 0);
        const remAmt = invoice.remaining_amount !== undefined && invoice.remaining_amount !== null
            ? Number(invoice.remaining_amount)
            : (pLower === "paid" ? 0 : invAmt);

        // Finance Review Status Badge
        let reviewBadge = "badge-pending";
        if (rLower === "approved") reviewBadge = "badge-active";
        else if (rLower === "rejected") reviewBadge = "badge-poor";
        else if (rLower === "paid") reviewBadge = "badge-active";

        // Payment Status Badge
        let payBadge = "badge-neutral";
        if (pLower === "paid") payBadge = "badge-active";
        else if (isPartial) payBadge = "badge-warning";
        else if (pLower === "pending") payBadge = "badge-pending";
        else if (pLower === "rejected") payBadge = "badge-poor";

        // Overdue status detection
        const isOverdue = Boolean(invoice.due_date && invoice.due_date < todayStr && pLower !== 'paid' && rLower !== 'rejected');
        const dueDateDisplay = invoice.due_date ? escapeHTML(invoice.due_date) : 'N/A';
        const dueDateHtml = isOverdue
            ? `<span>${dueDateDisplay}</span> <span class="badge badge-poor" style="font-size: 10px; margin-left: 4px;" title="Payment Overdue">Overdue</span>`
            : `<span>${dueDateDisplay}</span>`;

        // Strict Role-based Action buttons according to workflow
        let actionContent = "-";
        if (isFinance) {
            // 1. Paid invoices must never show payment/approval actions
            if (pLower === "paid") {
                actionContent = `
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <button class="btn btn-secondary" data-action="review" data-id="${invoice.id}" style="padding: 4px 8px; font-size: 11px;" title="View Complete Transaction">🔍 Details</button>
                        <span style="color: var(--success-color); font-size: 11px; font-weight: 600;">✓ Settled</span>
                    </div>
                `;
            // 2. Rejected invoices cannot be paid
            } else if (rLower === "rejected" || pLower === "rejected") {
                actionContent = `
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <button class="btn btn-secondary" data-action="review" data-id="${invoice.id}" style="padding: 4px 8px; font-size: 11px;" title="View Transaction">🔍 Details</button>
                        <span style="color: var(--danger-color); font-size: 11px; font-weight: 600;">Blocked</span>
                    </div>
                `;
            // 3. Approved invoices can be paid (Pay Remaining for partial, Pay Full for unpaid)
            } else if (rLower === "approved") {
                if (isPartial) {
                    actionContent = `
                        <div style="display: flex; gap: 4px;">
                            <button class="btn btn-secondary" data-action="review" data-id="${invoice.id}" style="padding: 4px 8px; font-size: 11px;" title="Review Details">🔍 Review</button>
                            <button class="btn btn-primary" data-action="pay" data-id="${invoice.id}" style="padding: 4px 8px; font-size: 11px; background: #059669; border-color: #059669;" title="Pay Remaining 75% (${formatCurrencyINR(remAmt, 2)})">💰 Pay Remaining</button>
                        </div>
                    `;
                } else {
                    actionContent = `
                        <div style="display: flex; gap: 4px;">
                            <button class="btn btn-secondary" data-action="review" data-id="${invoice.id}" style="padding: 4px 8px; font-size: 11px;" title="Review Details">🔍 Review</button>
                            <button class="btn btn-primary" data-action="pay" data-id="${invoice.id}" style="padding: 4px 8px; font-size: 11px; background: #059669; border-color: #059669;" title="Pay Full Amount (${formatCurrencyINR(remAmt, 2)})">💳 Pay Full</button>
                        </div>
                    `;
                }
            // 4. Pending review invoices can be approved or rejected
            } else if (rLower === "pending review" || rLower === "pending") {
                actionContent = `
                    <div style="display: flex; gap: 4px;">
                        <button class="btn btn-primary" data-action="review" data-id="${invoice.id}" style="padding: 4px 8px; font-size: 11px;" title="Review Vendor, PO, and Invoice Details">🔍 Review</button>
                        <button class="btn btn-secondary" data-action="approve" data-id="${invoice.id}" style="padding: 4px 8px; font-size: 11px;" title="Approve for Payment">✓ Approve</button>
                        <button class="btn btn-danger" data-action="reject" data-id="${invoice.id}" style="padding: 4px 8px; font-size: 11px;" title="Reject Invoice">✕</button>
                    </div>
                `;
            }
        } else {
            // Non-finance roles (Procurement Manager, Vendor, etc.) see read-only status
            if (pLower === "paid") {
                actionContent = `<span style="color: var(--success-color); font-size: 11px; font-weight: 600;">Paid</span>`;
            } else if (rLower === "rejected" || pLower === "rejected") {
                actionContent = `<span style="color: var(--danger-color); font-size: 11px;">Rejected</span>`;
            } else {
                actionContent = `<span style="color: var(--text-secondary); font-size: 11px;">In Finance Review</span>`;
            }
        }

        const vName = (invoice.vendor_name || `Vendor-${invoice.vendor_id}`).replace(/^Derived Vendor Proxy\s+/i, "Vendor-");
        const poRef = invoice.po_number || (invoice.po_id ? `PO-${invoice.po_id}` : "N/A");

        let payStatusDisplayHtml = `<span class="badge ${payBadge}">${escapeHTML(invoice.payment_status || 'Pending')}</span>`;
        if (isPartial) {
            payStatusDisplayHtml = `
                <span class="badge ${payBadge}">Partially Paid</span>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px; line-height: 1.25;">
                    <span>Paid: ${formatCurrencyINR(paidAmt, 2)}</span><br/>
                    <span>Rem: <strong style="color: var(--primary-color);">${formatCurrencyINR(remAmt, 2)}</strong></span>
                </div>
            `;
        }

        tbody.innerHTML += `
        <tr data-id="${invoice.id}">
            <td style="font-weight: 600;">${escapeHTML(invoice.invoice_number)}</td>
            <td style="font-weight: 600;">${escapeHTML(vName)}</td>
            <td style="font-weight: 500;">${escapeHTML(poRef)}</td>
            <td>${escapeHTML(invoice.product_name || 'N/A')}</td>
            <td>${qty}</td>
            <td>${formattedUnitPrice}</td>
            <td style="font-weight: 600;">${formattedPoTotal}</td>
            <td style="font-weight: 600; color: var(--primary-color);">${formattedInvoiceAmount}</td>
            <td>${dueDateHtml}</td>
            <td><span class="badge ${reviewBadge}">${escapeHTML(invoice.status || 'Pending Review')}</span></td>
            <td>${payStatusDisplayHtml}</td>
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
    if (!id) return;

    const invoice = allInvoices.find(i => i.id === id);

    if (action === "review") {
        openInvoiceReviewModal(id);
    } else if (action === "approve") {
        approveInvoice(id, invoice);
    } else if (action === "reject") {
        rejectInvoice(id, invoice);
    } else if (action === "pay") {
        payInvoice(id, invoice);
    }
}

async function approveInvoice(id, invoice) {
    const invNum = invoice ? invoice.invoice_number : `#${id}`;
    const confirmApprove = confirm(`Approve invoice ${invNum} for payment clearance?`);
    if (!confirmApprove) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/approve`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "Invoice approved successfully.", "success");
            loadInvoices();
        } else {
            showToast(result.detail || result.error || "Failed to approve invoice.", "error");
        }
    } catch (error) {
        console.error("Approve error:", error);
        showToast("Error processing invoice approval.", "error");
    }
}

async function rejectInvoice(id, invoice) {
    const invNum = invoice ? invoice.invoice_number : `#${id}`;
    const confirmReject = confirm(`Reject invoice ${invNum}? This will block payment clearance.`);
    if (!confirmReject) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/reject`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "Invoice rejected.", "warning");
            loadInvoices();
        } else {
            showToast(result.detail || result.error || "Failed to reject invoice.", "error");
        }
    } catch (error) {
        console.error("Reject error:", error);
        showToast("Error processing invoice rejection.", "error");
    }
}

async function payInvoice(id, invoice) {
    const invNum = invoice ? invoice.invoice_number : `#${id}`;
    const pStat = (invoice ? invoice.payment_status : "").toLowerCase();
    const isPartial = (pStat === "partially paid" || pStat === "partially_paid");
    const remAmt = invoice && invoice.remaining_amount !== undefined && invoice.remaining_amount !== null
        ? Number(invoice.remaining_amount)
        : Number(invoice ? invoice.invoice_amount : 0);

    const promptText = isPartial
        ? `Authorize and execute FINAL payment of ₹${remAmt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (Remaining 75%) for invoice ${invNum}? This will settle the invoice completely.`
        : `Authorize and execute disbursement payment of ₹${remAmt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} for invoice ${invNum}?`;

    const confirmPay = confirm(promptText);
    if (!confirmPay) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ amount: remAmt })
        });

        const result = await response.json();
        if (response.ok) {
            showToast(`Payment executed! Reference: ${result.payment_reference || 'Confirmed'}. Status: ${result.payment_status}`, "success");
            loadInvoices();
        } else {
            showToast(result.detail || result.error || "Payment execution failed.", "error");
        }
    } catch (error) {
        console.error("Payment error:", error);
        showToast("Error executing payment.", "error");
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

function formatCurrencyINR(val, decimals = 0) {
    if (val === null || val === undefined || isNaN(val)) return "₹0";
    const num = Number(val);
    return "₹" + num.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// ==================================================
// INVOICE REVIEW MODAL (Invoices Page)
// ==================================================
async function openInvoiceReviewModal(invoiceId) {
    const modal = document.getElementById("invoiceReviewModal");
    const body = document.getElementById("invoiceReviewModalBody");
    const title = document.getElementById("modalInvoiceTitle");
    const invBadge = document.getElementById("modalInvoiceStatusBadge");
    const payBadge = document.getElementById("modalPaymentStatusBadge");
    const footer = document.getElementById("invoiceReviewModalFooter");

    if (!modal) return;
    modal.classList.add("show", "active");
    modal.style.display = "flex";

    if (body) {
        body.innerHTML = `
            <div class="loading-spinner-wrapper" style="padding: 40px 20px; text-align: center;">
                <div class="spinner"></div>
                <p style="margin-top: 12px; color: var(--text-secondary); font-size: 13px;">Loading transaction details from PostgreSQL...</p>
            </div>
        `;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.detail || `Failed to load invoice details (HTTP ${response.status})`;
            if (body) {
                body.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: var(--danger-color);">
                        <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
                        <h4 style="margin: 0 0 6px 0;">Error Loading Invoice</h4>
                        <p style="font-size: 13px; color: var(--text-secondary);">${escapeHTML(errMsg)}</p>
                    </div>
                `;
            }
            if (footer) {
                footer.innerHTML = `<button type="button" class="btn btn-secondary" onclick="closeInvoiceReviewModal()">Close</button>`;
            }
            return;
        }

        const data = await response.json();
        const inv = data.invoice || {};
        const po = data.purchase_order || {};
        const v = data.vendor || {};

        if (title) {
            title.textContent = `Invoice Review: ${inv.invoice_number || '#' + inv.id}`;
        }

        const rLower = (inv.status || "").toLowerCase();
        const pLower = (inv.payment_status || "").toLowerCase();
        const isPartial = (pLower === "partially paid" || pLower === "partially_paid");
        const invAmt = Number(inv.invoice_amount || 0);
        const paidAmt = Number(inv.paid_amount || 0);
        const remAmt = (inv.remaining_amount !== undefined && inv.remaining_amount !== null)
            ? Number(inv.remaining_amount)
            : (pLower === "paid" ? 0 : invAmt);
        const advAmt = Number(inv.advance_amount || (isPartial ? paidAmt : 0));
        const advPct = Number(inv.advance_percentage || 25);

        let invBadgeClass = "badge-warning";
        if (rLower === "approved") invBadgeClass = "badge-pending";
        else if (rLower === "paid") invBadgeClass = "badge-active";
        else if (rLower === "rejected") invBadgeClass = "badge-poor";

        let payBadgeClass = "badge-neutral";
        if (pLower === "paid") payBadgeClass = "badge-active";
        else if (isPartial) payBadgeClass = "badge-warning";
        else if (pLower === "pending") payBadgeClass = "badge-warning";
        else if (pLower === "rejected") payBadgeClass = "badge-poor";

        if (invBadge) {
            invBadge.className = `badge ${invBadgeClass}`;
            invBadge.textContent = inv.status || "Pending Review";
        }
        if (payBadge) {
            payBadge.className = `badge ${payBadgeClass}`;
            payBadge.textContent = `Payment: ${inv.payment_status || 'Pending'}`;
        }

        const poStatLower = (po.status || "").toLowerCase();
        let poBadgeClass = "badge-neutral";
        if (poStatLower === "completed" || poStatLower === "delivered") poBadgeClass = "badge-active";
        else if (poStatLower === "approved" || poStatLower === "ordered" || poStatLower === "in-transit") poBadgeClass = "badge-pending";
        else if (poStatLower === "cancelled" || poStatLower === "canceled") poBadgeClass = "badge-poor";

        const vRisk = v.risk_level || "Low Risk";
        let vRiskClass = "badge-active";
        if (vRisk === "High Risk" || vRisk === "Critical Risk") vRiskClass = "badge-poor";
        else if (vRisk === "Medium Risk") vRiskClass = "badge-warning";

        const isConsistent = Boolean(po.pricing_consistent);
        const invMatch = Math.abs(Number(inv.invoice_amount || 0) - Number(po.total_amount || 0)) < 0.05;

        let pricingBannerHtml = "";
        if (isConsistent && invMatch) {
            pricingBannerHtml = `
                <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #065f46; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 18px;">✅</span>
                    <div>
                        <strong>Pricing Consistency Verified:</strong>
                        ${Number(po.quantity).toLocaleString()} units &times; ${formatCurrencyINR(po.unit_price, 2)} = <strong>${formatCurrencyINR(po.total_amount, 2)}</strong> (Matches Billed Invoice: ${formatCurrencyINR(inv.invoice_amount, 2)})
                    </div>
                </div>
            `;
        } else {
            pricingBannerHtml = `
                <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #991b1b; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 18px;">⚠️</span>
                    <div>
                        <strong>Pricing Discrepancy Flag:</strong>
                        Calculated PO valuation (${Number(po.quantity).toLocaleString()} &times; ${formatCurrencyINR(po.unit_price, 2)} = ${formatCurrencyINR(po.calculated_total, 2)}) does not match PO Total (${formatCurrencyINR(po.total_amount, 2)}) or Invoice Amount (${formatCurrencyINR(inv.invoice_amount, 2)}).
                    </div>
                </div>
            `;
        }

        // Render payment history if present
        let paymentHistoryHtml = "";
        if (data.payments_history && data.payments_history.length > 0) {
            paymentHistoryHtml = `
                <div style="margin-top: 14px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                    <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Payment Ledger History (${data.payments_history.length})</div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; font-size: 11.5px; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary); text-align: left;">
                                    <th style="padding: 4px;">Type</th>
                                    <th style="padding: 4px;">Reference</th>
                                    <th style="padding: 4px;">Amount</th>
                                    <th style="padding: 4px;">Date</th>
                                    <th style="padding: 4px;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.payments_history.map(p => `
                                    <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 4px; font-weight: 600;">${escapeHTML(p.payment_type || 'Payment')}</td>
                                        <td style="padding: 4px; font-family: monospace;">${escapeHTML(p.payment_reference || 'N/A')}</td>
                                        <td style="padding: 4px; font-weight: 600; color: var(--primary-color);">${formatCurrencyINR(p.amount, 2)}</td>
                                        <td style="padding: 4px;">${escapeHTML(p.payment_date || 'N/A')}</td>
                                        <td style="padding: 4px;"><span class="badge badge-active">${escapeHTML(p.status || 'Completed')}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        if (body) {
            body.innerHTML = `
                <!-- SECTION 1: INVOICE DETAILS -->
                <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: var(--text-color); display: flex; align-items: center; gap: 6px;">
                            <span>📄</span> SECTION 1 — INVOICE DETAILS
                        </h4>
                        <span class="badge ${invBadgeClass}">${escapeHTML(inv.status)}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 12.5px;">
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Invoice Number</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">${escapeHTML(inv.invoice_number)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Invoice Total Amount</div>
                            <div style="font-size: 16px; font-weight: 800; color: var(--primary-color); margin-top: 2px;">${formatCurrencyINR(invAmt, 2)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Advance Paid (${advPct}%)</div>
                            <div style="font-size: 14px; font-weight: 700; color: #059669; margin-top: 2px;">${formatCurrencyINR(advAmt, 2)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Total Paid Amount</div>
                            <div style="font-size: 14px; font-weight: 700; color: #059669; margin-top: 2px;">${formatCurrencyINR(paidAmt, 2)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Remaining Balance</div>
                            <div style="font-size: 15px; font-weight: 800; color: ${remAmt > 0 ? 'var(--primary-color)' : 'var(--success-color)'}; margin-top: 2px;">${formatCurrencyINR(remAmt, 2)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Invoice Date</div>
                            <div style="font-weight: 600; color: var(--text-color); margin-top: 2px;">${inv.invoice_date || 'N/A'}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Payment Due Date</div>
                            <div style="font-weight: 600; color: var(--text-color); margin-top: 2px;">${inv.due_date || 'N/A'}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Approval Status</div>
                            <div style="margin-top: 2px;"><span class="badge ${invBadgeClass}">${escapeHTML(inv.status)}</span></div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Payment Status</div>
                            <div style="margin-top: 2px;"><span class="badge ${payBadgeClass}">${escapeHTML(inv.payment_status)}</span> ${inv.payment_date ? `<small style="color: var(--text-secondary);">(${inv.payment_date})</small>` : ''}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Related PO Number</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">${escapeHTML(po.po_number)} (ID #${inv.po_id || 'N/A'})</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Created By (Finance Officer)</div>
                            <div style="font-weight: 700; color: var(--primary-color); margin-top: 2px;">
                                ${escapeHTML(inv.created_by_name || 'Finance Officer')}
                                <span style="font-size: 11px; font-weight: normal; color: var(--text-secondary);">(${escapeHTML(inv.created_by_role || 'Finance Officer')})</span>
                            </div>
                        </div>
                    </div>
                    ${paymentHistoryHtml}
                </div>

                <!-- SECTION 2: PURCHASE ORDER DETAILS -->
                <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: var(--text-color); display: flex; align-items: center; gap: 6px;">
                            <span>🛍️</span> SECTION 2 — PURCHASE ORDER DETAILS
                        </h4>
                        <span class="badge ${poBadgeClass}">${escapeHTML(po.status)}</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 12.5px; margin-bottom: 14px;">
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">PO Number</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">${escapeHTML(po.po_number)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Product / Item Name</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">${escapeHTML(po.product_name)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Order Quantity</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">${Number(po.quantity).toLocaleString()} Units</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Unit Price</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">${formatCurrencyINR(po.unit_price, 2)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Total Amount</div>
                            <div style="font-size: 15px; font-weight: 800; color: var(--primary-color); margin-top: 2px;">${formatCurrencyINR(po.total_amount, 2)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Purchase Order Status</div>
                            <div style="margin-top: 2px;"><span class="badge ${poBadgeClass}">${escapeHTML(po.status)}</span></div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Order Date</div>
                            <div style="font-weight: 600; color: var(--text-color); margin-top: 2px;">${po.order_date || 'N/A'}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Delivery Status</div>
                            <div style="font-weight: 600; color: var(--text-color); margin-top: 2px;">${escapeHTML(po.delivery_status || 'N/A')}</div>
                        </div>
                    </div>

                    <!-- Pricing Consistency Verification Banner -->
                    ${pricingBannerHtml}
                </div>

                <!-- SECTION 3: VENDOR DETAILS -->
                <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: var(--text-color); display: flex; align-items: center; gap: 6px;">
                            <span>🏢</span> SECTION 3 — VENDOR DETAILS & RELIABILITY
                        </h4>
                        <span class="badge ${vRiskClass}">${escapeHTML(v.risk_level || 'Low Risk')}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 12.5px;">
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Vendor Name</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">${escapeHTML(v.name)}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Vendor ID</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">#${v.id}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Account Status</div>
                            <div style="margin-top: 2px;"><span class="badge badge-active">${escapeHTML(v.status)}</span></div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Vendor Reliability Score</div>
                            <div style="font-size: 15px; font-weight: 800; color: var(--primary-color); margin-top: 2px;">${Number(v.reliability_score || 0).toFixed(1)}%</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Delivery Performance Rate</div>
                            <div style="font-weight: 700; color: var(--success-color); margin-top: 2px;">${Number(v.delivery_rate || 0).toFixed(1)}%</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Quality Score</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">${Number(v.quality_score || 0).toFixed(1)}%</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Total Orders</div>
                            <div style="font-weight: 700; color: var(--text-color); margin-top: 2px;">${Number(v.total_orders || 0).toLocaleString()} <small style="color: var(--text-secondary); font-weight: 400;">(${Number(v.completed_orders || 0).toLocaleString()} completed)</small></div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase; font-weight: 600;">Industry Category</div>
                            <div style="font-weight: 600; color: var(--text-color); margin-top: 2px;">${escapeHTML(v.category || 'General')}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (footer) {
            if (pLower === "paid") {
                footer.innerHTML = `
                    <span style="color: var(--success-color); font-size: 12px; font-weight: 600; margin-right: auto; display: flex; align-items: center; gap: 4px;">
                        <span>✅</span> Invoice fully settled and paid in ledger.
                    </span>
                    <button type="button" class="btn btn-secondary" onclick="closeInvoiceReviewModal()">Close</button>
                `;
            } else if (rLower === "rejected" || pLower === "rejected") {
                footer.innerHTML = `
                    <span style="color: var(--danger-color); font-size: 12px; font-weight: 600; margin-right: auto; display: flex; align-items: center; gap: 4px;">
                        <span>✕</span> Invoice was rejected during Finance Review. Payment blocked.
                    </span>
                    <button type="button" class="btn btn-secondary" onclick="closeInvoiceReviewModal()">Close</button>
                `;
            } else if (rLower === "approved") {
                const payButtonText = isPartial 
                    ? `💰 Final Payment (Pay Remaining ${formatCurrencyINR(remAmt, 2)})` 
                    : `💳 Pay Full (${formatCurrencyINR(remAmt, 2)})`;

                footer.innerHTML = `
                    <span style="color: var(--primary-color); font-size: 12px; font-weight: 600; margin-right: auto; display: flex; align-items: center; gap: 4px;">
                        <span>✓</span> Approved by Finance. Cleared for disbursement.
                    </span>
                    <button type="button" class="btn btn-secondary" onclick="verifyPoInvoiceMatchInInvoices(${inv.id})">🔍 Verify PO ↔ Invoice</button>
                    <button type="button" class="btn btn-secondary" onclick="closeInvoiceReviewModal()">Close</button>
                    <button type="button" class="btn btn-primary" onclick="markPaidFromModal(${inv.id}, ${remAmt}, ${isPartial})" style="background: #059669; border-color: #059669;">${payButtonText}</button>
                `;
            } else {
                footer.innerHTML = `
                    <button type="button" class="btn btn-secondary" onclick="verifyPoInvoiceMatchInInvoices(${inv.id})">🔍 Verify PO ↔ Invoice</button>
                    <button type="button" class="btn btn-secondary" onclick="closeInvoiceReviewModal()">Close</button>
                    <button type="button" class="btn btn-danger" onclick="rejectInvoiceFromModal(${inv.id}, '${escapeHTML(inv.invoice_number)}')" style="background: #dc2626; border-color: #dc2626; color: white;">✕ Reject Invoice</button>
                    <button type="button" class="btn btn-primary" onclick="approveInvoiceFromModal(${inv.id}, '${escapeHTML(inv.invoice_number)}')">✓ Approve Invoice</button>
                `;
            }
        }

    } catch (err) {
        console.error("Error opening invoice review modal:", err);
        if (body) {
            body.innerHTML = `
                <div style="padding: 30px; text-align: center; color: var(--danger-color);">
                    <h4>Network Error</h4>
                    <p style="font-size: 13px; color: var(--text-secondary);">Unable to connect to platform API. Please try again.</p>
                </div>
            `;
        }
    }
}

function closeInvoiceReviewModal() {
    const modal = document.getElementById("invoiceReviewModal");
    if (modal) {
        modal.classList.remove("show", "active");
        modal.style.display = "none";
    }
}

async function approveInvoiceFromModal(id, invoiceNumber) {
    if (!confirm(`Confirm approval for invoice ${invoiceNumber || '#' + id}? Once approved, it will be cleared for payment.`)) {
        return;
    }
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/approve`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "Invoice approved successfully.", "success");
            await openInvoiceReviewModal(id);
            loadInvoices();
        } else {
            showToast(result.detail || "Failed to approve invoice.", "error");
        }
    } catch (err) {
        console.error("Error approving invoice from modal:", err);
        showToast("Network error. Please try again.", "error");
    }
}

async function rejectInvoiceFromModal(id, invoiceNumber) {
    if (!confirm(`Are you sure you want to REJECT invoice ${invoiceNumber || '#' + id}? This will block disbursement payment.`)) {
        return;
    }
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/reject`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "Invoice rejected successfully.", "success");
            await openInvoiceReviewModal(id);
            loadInvoices();
        } else {
            showToast(result.detail || "Failed to reject invoice.", "error");
        }
    } catch (err) {
        console.error("Error rejecting invoice from modal:", err);
        showToast("Network error. Please try again.", "error");
    }
}

async function markPaidFromModal(id, amount, isPartial) {
    const promptMsg = isPartial
        ? `Authorize and execute FINAL payment of ₹${Number(amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (Remaining 75%) and settle this invoice?`
        : `Authorize and execute disbursement payment of ₹${Number(amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} and mark this invoice as Paid?`;

    if (!confirm(promptMsg)) {
        return;
    }
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ amount: amount })
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "Payment executed successfully.", "success");
            await openInvoiceReviewModal(id);
            loadInvoices();
        } else {
            showToast(result.detail || "Failed to update invoice payment.", "error");
        }
    } catch (err) {
        console.error("Error paying invoice from modal:", err);
        showToast("Network error. Please try again.", "error");
    }
}

// Global modal dismiss listeners
window.addEventListener("click", function(event) {
    const modal = document.getElementById("invoiceReviewModal");
    if (modal && event.target === modal) {
        closeInvoiceReviewModal();
    }
    const genModal = document.getElementById("generateInvoiceModal");
    if (genModal && event.target === genModal) {
        closeGenerateInvoiceModal();
    }
});

window.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeInvoiceReviewModal();
        closeGenerateInvoiceModal();
    }
});

// ==================================================
// GENERATE INVOICE FROM PO MODAL WORKFLOW (Finance Exclusive)
// ==================================================
async function openGenerateInvoiceModal() {
    const modal = document.getElementById("generateInvoiceModal");
    const tbody = document.getElementById("eligiblePoTableBody");
    if (!modal || !tbody) return;

    modal.classList.add("show", "active");
    modal.style.display = "flex";

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-spinner-wrapper" style="padding: 24px; text-align: center;">
                <div class="spinner"></div>
                <p style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">Querying delivered purchase orders eligible for invoice creation...</p>
            </td>
        </tr>
    `;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/eligible-pos`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="color: var(--danger-color); text-align: center; padding: 20px;">
                        ⚠️ ${escapeHTML(err.detail || 'Failed to load eligible purchase orders.')}
                    </td>
                </tr>
            `;
            return;
        }

        const eligiblePos = await response.json();
        tbody.innerHTML = "";

        if (!Array.isArray(eligiblePos) || eligiblePos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state-wrapper" style="text-align: center; padding: 30px; color: var(--text-secondary);">
                        <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
                        <h4 style="margin: 0 0 6px 0;">All Delivered Orders Invoiced</h4>
                        <p style="margin: 0; font-size: 13px;">There are currently no delivered purchase orders awaiting invoice creation.</p>
                    </td>
                </tr>
            `;
            return;
        }

        eligiblePos.forEach(po => {
            const poNum = escapeHTML(po.po_number || '#' + po.id);
            const vName = escapeHTML(po.vendor_name || 'Vendor #' + po.vendor_id);
            const pName = escapeHTML(po.product_name || 'Catalog Item');
            const qty = Number(po.quantity || 1).toLocaleString();
            const unitPrice = `₹${Number(po.unit_price || 0).toFixed(2)}`;
            const totalAmt = `₹${Number(po.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const delivStatus = escapeHTML(po.delivery_status || po.status || 'Delivered');

            tbody.innerHTML += `
                <tr>
                    <td style="font-weight: 600;">${poNum}</td>
                    <td style="font-weight: 600;">${vName}</td>
                    <td>${pName}</td>
                    <td>${qty}</td>
                    <td>${unitPrice}</td>
                    <td style="font-weight: 700; color: var(--primary-color);">${totalAmt}</td>
                    <td><span class="badge badge-active">${delivStatus}</span></td>
                    <td>
                        <button class="btn btn-primary" onclick="createInvoiceFromEligiblePo(${po.id}, '${poNum}', ${po.total_amount})" style="padding: 4px 10px; font-size: 11px; white-space: nowrap;">
                            🧾 Create Invoice
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading eligible POs:", err);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="color: var(--danger-color); text-align: center; padding: 20px;">
                    Connection error while loading eligible purchase orders.
                </td>
            </tr>
        `;
    }
}

function closeGenerateInvoiceModal() {
    const modal = document.getElementById("generateInvoiceModal");
    if (modal) {
        modal.classList.remove("show", "active");
        modal.style.display = "none";
    }
}

async function createInvoiceFromEligiblePo(poId, poNumber, totalAmount) {
    const confirmMsg = `Perform PO ↔ Invoice Verification & Create Invoice for ${poNumber}?\n\n` +
        `• Verified Order Amount: ₹${Number(totalAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}\n` +
        `• Role Requirement: Exclusively Finance Officer\n` +
        `• Current User: ${getUserName()} (${getUserRole()})\n` +
        `• Delivery Status: Confirmed Delivered\n\n` +
        `Click OK to proceed with invoice generation.`;
    if (!confirm(confirmMsg)) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/create-from-po/${poId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({})
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "Invoice generated successfully by Finance Officer.", "success");
            closeGenerateInvoiceModal();
            await loadInvoices();
            if (result.invoice_id) {
                openInvoiceReviewModal(result.invoice_id);
            }
        } else {
            showToast(result.detail || "Failed to create invoice.", "error");
        }
    } catch (err) {
        console.error("Error generating invoice from eligible PO:", err);
        showToast("Network error. Please try again.", "error");
    }
}

async function verifyPoInvoiceMatchInInvoices(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/verify`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const result = await response.json();
        if (response.ok) {
            alert(`✅ PO ↔ Invoice Verification Complete:\n\n` +
                  `• Invoice: ${result.invoice_number} (₹${Number(result.invoice_amount).toLocaleString('en-IN')})\n` +
                  `• Purchase Order: ${result.po_number} (₹${Number(result.po_total_amount).toLocaleString('en-IN')})\n` +
                  `• 3-Way Pricing Match: ${result.pricing_match ? 'VALID / MATCHED' : 'DISCREPANCY'}\n` +
                  `• Verified By: ${result.verified_by} (${result.verified_by_role})\n\n` +
                  `Reconciliation audit entry logged successfully.`);
            await openInvoiceReviewModal(id);
        } else {
            alert(`Verification Error: ${result.detail || 'Failed to verify PO-Invoice match'}`);
        }
    } catch (err) {
        console.error("Error verifying PO invoice match:", err);
        alert("Network error while verifying PO ↔ Invoice reconciliation.");
    }
}

