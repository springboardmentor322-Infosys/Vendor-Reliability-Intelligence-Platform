const API_BASE_URL = "http://127.0.0.1:8000";
let spendCategoryChartInstance = null;
let cashFlowChartInstance = null;

document.addEventListener("DOMContentLoaded", loadFinanceDashboard);

function formatCurrencyINR(val, decimals = 0) {
    if (val === null || val === undefined || isNaN(val)) return "₹0";
    const num = Number(val);
    return "₹" + num.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

async function loadFinanceDashboard() {
    await fetchFinanceStats();
}

async function fetchFinanceStats() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/dashboard/finance-stats`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            throw new Error(`Finance stats API failed: ${response.status}`);
        }
        
        const data = await response.json();

        // Dynamic Greeting
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
        const elWelcome = document.getElementById("finWelcomeTitle");
        if (elWelcome) {
            elWelcome.innerHTML = `${greeting}, ${getUserName()} 👋`;
        }
        
        // 1. KPI Summary Cards
        const totalSpend = data.total_spend || 0;
        const paidAmount = data.paid_invoices_amount || 0;
        const pendingAmount = data.pending_payments_amount || 0;
        const allocatedBudget = data.allocated_budget || 0;
        const usedBudget = data.used_budget || 0;
        const budgetUtil = data.budget_utilization_pct || 0;
        const budgetDept = data.budget_department || "Procurement";
        const budgetFY = data.budget_financial_year || "FY 26-27";

        document.getElementById("totalSpendVal").innerText = formatCurrencyINR(totalSpend);
        document.getElementById("totalInvoicesSub").innerText = `${Number(data.total_invoices || 0).toLocaleString()} Invoices Recorded`;
        
        document.getElementById("paidAmountVal").innerText = formatCurrencyINR(paidAmount);
        document.getElementById("paidCountSub").innerText = `${Number(data.paid_invoices_count || 0).toLocaleString()} Paid Invoices`;
        
        document.getElementById("pendingAmountVal").innerText = formatCurrencyINR(pendingAmount);
        const histOverdue = Number(data.historical_overdue_count || 0).toLocaleString();
        document.getElementById("pendingCountSub").innerText = `${Number(data.pending_payments_count || 0).toLocaleString()} Pending (${histOverdue} Historical Archive)`;
        
        if (allocatedBudget > 0) {
            document.getElementById("budgetUtilVal").innerText = `${budgetUtil}%`;
            document.getElementById("budgetSub").innerText = `Used ${formatCurrencyINR(usedBudget)} of ${formatCurrencyINR(allocatedBudget)} (${budgetDept} ${budgetFY})`;
        } else {
            document.getElementById("budgetUtilVal").innerText = "N/A";
            document.getElementById("budgetSub").innerText = "No budget allocation configured";
        }

        // Populate Attention Required Section
        const elPendingAmt = document.getElementById("finFocusPendingAmt");
        if (elPendingAmt) elPendingAmt.innerText = formatCurrencyINR(pendingAmount);
        const elPaidAmt = document.getElementById("finFocusPaidAmt");
        if (elPaidAmt) elPaidAmt.innerText = formatCurrencyINR(paidAmount);
        const elBudgetUtil = document.getElementById("finFocusBudgetUtil");
        if (elBudgetUtil) {
            if (allocatedBudget > 0) {
                elBudgetUtil.innerText = `${budgetUtil}% (${formatCurrencyINR(usedBudget)} / ${formatCurrencyINR(allocatedBudget)})`;
            } else {
                elBudgetUtil.innerText = "No budget configured";
            }
        }
        const elTotalSpend = document.getElementById("finFocusTotalSpend");
        if (elTotalSpend) elTotalSpend.innerText = formatCurrencyINR(totalSpend);

        // 2. Finance Insights
        if (data.insights) {
            const topCat = data.insights.top_category_name || "N/A";
            const topSpend = formatCurrencyINR(data.insights.top_category_spend || 0);
            document.getElementById("topCategorySpendInsight").innerText = 
                topCat !== "N/A"
                    ? `Top spending category is "${topCat}" with ${topSpend} YTD spend.`
                    : "No category spend records available.";

            document.getElementById("pendingLiabilityInsight").innerText = 
                `Pending payment obligations represent ${data.insights.pending_liability_pct || 0}% of total billed transactions.`;
            document.getElementById("settlementInsight").innerText = 
                `Invoice clearance rate is at ${data.insights.payment_settlement_rate || 0}% of all logged accounts payable.`;
        }

        // 3. Render Spend by Category Donut Chart
        renderSpendCategoryChart(data.spend_by_category || []);

        // 4. Render Cash Flow Chart
        renderCashFlowChart(data.cash_flow || []);

        // 5. Render Awaiting Purchase Orders (Delivered POs ready for Finance Invoice Creation)
        renderAwaitingPurchaseOrders(data.pos_awaiting_invoice || []);
        const elAwaitingBadge = document.getElementById("awaitingPoCountBadge");
        if (elAwaitingBadge) {
            const awaitingCount = Number(data.pos_awaiting_invoice_count || 0);
            elAwaitingBadge.innerText = `${awaitingCount} Pending`;
            elAwaitingBadge.className = awaitingCount > 0 ? "badge badge-warning" : "badge badge-active";
        }

        // 6. Render Recent Invoices
        renderRecentInvoices(data.recent_invoices || []);

    } catch (err) {
        console.error("Error fetching finance stats:", err);
    }
}

function renderSpendCategoryChart(categories) {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js library is not loaded.");
        return;
    }
    const container = document.getElementById("spendCategoryContainer") || document.getElementById("spendCategoryChart")?.parentElement;
    if (!container) return;

    if (!categories || categories.length === 0) {
        if (spendCategoryChartInstance) {
            spendCategoryChartInstance.destroy();
            spendCategoryChartInstance = null;
        }
        container.innerHTML = `<p style="color: var(--text-secondary); font-size: 13px; text-align: center; margin: auto;">No category spend records available.</p>`;
        return;
    }

    let ctx = document.getElementById("spendCategoryChart");
    if (!ctx) {
        container.innerHTML = `<canvas id="spendCategoryChart"></canvas>`;
        ctx = document.getElementById("spendCategoryChart");
    }

    if (spendCategoryChartInstance) {
        spendCategoryChartInstance.destroy();
    }

    const labels = categories.map(c => c.category);
    const amounts = categories.map(c => c.amount);

    const colors = [
        "#4f46e5", // Indigo
        "#06b6d4", // Cyan
        "#10b981", // Emerald
        "#f59e0b", // Amber
        "#8b5cf6"  // Purple
    ];

    spendCategoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: amounts,
                backgroundColor: colors.slice(0, labels.length),
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
                            const val = context.raw || 0;
                            return ` ${formatCurrencyINR(val)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderCashFlowChart(cashFlowData) {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js library is not loaded.");
        return;
    }
    const container = document.getElementById("cashFlowContainer") || document.getElementById("cashFlowChart")?.parentElement;
    if (!container) return;

    if (!cashFlowData || cashFlowData.length === 0) {
        if (cashFlowChartInstance) {
            cashFlowChartInstance.destroy();
            cashFlowChartInstance = null;
        }
        container.innerHTML = `<p style="color: var(--text-secondary); font-size: 13px; text-align: center; margin: auto;">No monthly cash flow transaction records available.</p>`;
        return;
    }

    let ctx = document.getElementById("cashFlowChart");
    if (!ctx) {
        container.innerHTML = `<canvas id="cashFlowChart"></canvas>`;
        ctx = document.getElementById("cashFlowChart");
    }

    if (cashFlowChartInstance) {
        cashFlowChartInstance.destroy();
    }

    const labels = cashFlowData.map(c => c.month);
    const outflows = cashFlowData.map(c => c.outflow);
    const inflows = cashFlowData.map(c => c.inflow);

    cashFlowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Disbursements (Outflow)',
                    data: outflows,
                    backgroundColor: '#4f46e5',
                    borderRadius: 6,
                    barPercentage: 0.6
                },
                {
                    label: 'Operating Return (Inflow)',
                    data: inflows,
                    backgroundColor: '#10b981',
                    borderRadius: 6,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11, weight: '600' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${formatCurrencyINR(context.raw || 0)}`;
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
                    ticks: { 
                        font: { size: 10 },
                        callback: function(value) {
                            return '₹' + (value / 100000).toFixed(0) + 'L';
                        }
                    }
                }
            }
        }
    });
}

function renderAwaitingPurchaseOrders(awaitingPos) {
    const tbody = document.getElementById("awaitingPoTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!awaitingPos || awaitingPos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state-wrapper" style="text-align: center; padding: 24px; color: var(--text-secondary);">✅ All delivered purchase orders have had invoices generated. No pending POs.</td></tr>`;
        return;
    }

    awaitingPos.forEach(po => {
        const payStatus = po.payment_status || "Unpaid";
        const payBadgeClass = getPaymentBadgeClass(payStatus);

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">${escapeHTML(po.po_number || '#' + po.id)}</td>
                <td style="font-weight: 600;">${escapeHTML(po.vendor_name || 'Vendor #' + po.vendor_id)}</td>
                <td>${escapeHTML(po.product_name || 'Item')}</td>
                <td>${Number(po.quantity || 1).toLocaleString()}</td>
                <td>${formatCurrencyINR(po.unit_price, 2)}</td>
                <td style="font-weight: 700; color: var(--primary-color);">${formatCurrencyINR(po.total_amount, 2)}</td>
                <td><span class="badge badge-active">${escapeHTML(po.status || 'Delivered')}</span></td>
                <td><span class="badge ${payBadgeClass}">${escapeHTML(payStatus)}</span></td>
                <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn btn-primary" onclick="createInvoiceFromFinanceDashboard(${po.id}, '${escapeHTML(po.po_number || 'PO-' + po.id)}', ${po.total_amount})" style="padding: 4px 8px; font-size: 11px; white-space: nowrap;">
                            🧾 Create Invoice
                        </button>
                        <button class="btn btn-secondary" onclick="downloadOrderSlip(${po.id})" style="padding: 4px 8px; font-size: 11px; white-space: nowrap;" title="Download Purchase Order Slip">
                            📄 Slip
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

async function createInvoiceFromFinanceDashboard(poId, poNumber, totalAmount) {
    const confirmMsg = `Perform PO ↔ Invoice Verification & Create Invoice for ${poNumber || '#' + poId}?\n\n` +
        `• Verified Order Amount: ${formatCurrencyINR(totalAmount, 2)}\n` +
        `• Role Requirement: Exclusively Finance Officer\n` +
        `• Current User: ${getUserName()} (${getUserRole()})\n` +
        `• Operational Delivery: Confirmed Delivered\n\n` +
        `Click OK to verify and generate this invoice.`;
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
            await loadFinanceDashboard();
            if (result.invoice_id) {
                openInvoiceReviewModal(result.invoice_id);
            }
        } else {
            showToast(result.detail || "Failed to create invoice.", "error");
        }
    } catch (err) {
        console.error("Error generating invoice from dashboard:", err);
        showToast("Network error. Please try again.", "error");
    }
}

function renderRecentInvoices(invoices) {
    const tbody = document.getElementById("invoiceTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state-wrapper">No invoices recorded in database.</td></tr>`;
        return;
    }
    
    invoices.forEach(inv => {
        const payStatus = (inv.payment_status || inv.status || "").trim();
        const reviewStatus = (inv.review_status || "").trim();
        const pLower = payStatus.toLowerCase();
        const rLower = reviewStatus.toLowerCase();
        const isPartial = (pLower === "partially paid" || pLower === "partially_paid");
        const totalAmt = Number(inv.amount || 0);
        const paidAmt = Number(inv.paid_amount || 0);
        const remAmt = (inv.remaining_amount !== undefined && inv.remaining_amount !== null)
            ? Number(inv.remaining_amount)
            : (pLower === "paid" ? 0 : totalAmt);
        
        let statusBadge = "";
        let actionBtn = "";

        if (pLower === "paid") {
            statusBadge = `<span class="badge badge-active">Paid</span>`;
            actionBtn = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button class="btn btn-secondary" onclick="openInvoiceReviewModal(${inv.id})" style="padding: 4px 8px; font-size: 11px;" title="View Complete Transaction">🔍 View Details</button>
                    <span style="color: var(--success-color); font-weight: 600; font-size: 12px;">✓ Settled</span>
                </div>
            `;
        } else if (rLower === "rejected" || pLower === "rejected") {
            statusBadge = `<span class="badge badge-poor">Rejected</span>`;
            actionBtn = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button class="btn btn-secondary" onclick="openInvoiceReviewModal(${inv.id})" style="padding: 4px 8px; font-size: 11px;" title="View Transaction">🔍 View Details</button>
                    <span style="color: var(--danger-color); font-size: 11px; font-weight: 600;">Blocked</span>
                </div>
            `;
        } else if (rLower === "approved") {
            // Eligible invoice cleared by Finance Review
            if (isPartial) {
                statusBadge = `<span class="badge badge-warning">Partially Paid</span>`;
                actionBtn = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button class="btn btn-secondary" onclick="openInvoiceReviewModal(${inv.id})" style="padding: 4px 8px; font-size: 11px;" title="Review Details">🔍 Review</button>
                        <button class="btn btn-primary" onclick="markInvoicePaid(${inv.id}, ${remAmt}, true)" style="padding: 4px 10px; font-size: 11px; background: #059669; border-color: #059669;" title="Pay Remaining 75% (${formatCurrencyINR(remAmt, 2)})">💰 Pay Remaining</button>
                    </div>
                `;
            } else {
                statusBadge = `<span class="badge badge-pending">Approved</span>`;
                actionBtn = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button class="btn btn-secondary" onclick="openInvoiceReviewModal(${inv.id})" style="padding: 4px 8px; font-size: 11px;" title="Review Details">🔍 Review</button>
                        <button class="btn btn-primary" onclick="markInvoicePaid(${inv.id}, ${remAmt}, false)" style="padding: 4px 10px; font-size: 11px; background: #059669; border-color: #059669;" title="Pay Full Amount (${formatCurrencyINR(remAmt, 2)})">💳 Pay Full</button>
                    </div>
                `;
            }
        } else {
            // Pending Review (Finance approval required before payment)
            if (isPartial) {
                statusBadge = `<span class="badge badge-warning">Partially Paid</span>`;
            } else {
                statusBadge = `<span class="badge badge-warning">Pending Review</span>`;
            }
            actionBtn = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button class="btn btn-primary" onclick="openInvoiceReviewModal(${inv.id})" style="padding: 4px 9px; font-size: 11px;" title="Review Vendor, Purchase Order, and Invoice Details">🔍 Review Invoice</button>
                    <button class="btn btn-secondary" onclick="approveInvoiceInline(${inv.id}, '${escapeHTML(inv.invoice_number)}')" style="padding: 4px 8px; font-size: 11px;" title="Approve for Payment">✓ Approve</button>
                </div>
            `;
        }
            
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">${escapeHTML(inv.invoice_number)}</td>
                <td>#${inv.po_id || 'N/A'}</td>
                <td style="font-weight: 600;">${escapeHTML(inv.vendor_name || 'N/A')}</td>
                <td>${escapeHTML(inv.product_name || 'N/A')}</td>
                <td style="font-weight: 600;">
                    ${formatCurrencyINR(totalAmt, 2)}
                    ${isPartial ? `<div style="font-size: 11px; color: var(--text-secondary); font-weight: normal; margin-top: 2px; line-height: 1.25;">Paid: ${formatCurrencyINR(paidAmt, 2)}<br/>Rem: <strong style="color: var(--primary-color);">${formatCurrencyINR(remAmt, 2)}</strong></div>` : ''}
                </td>
                <td>${inv.due_date || 'N/A'}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

// ==================================================
// INVOICE REVIEW MODAL WORKFLOW
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
        const del = data.delivery || {};

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

        // PO status badge
        const poStatLower = (po.status || "").toLowerCase();
        let poBadgeClass = "badge-neutral";
        if (poStatLower === "completed" || poStatLower === "delivered") poBadgeClass = "badge-active";
        else if (poStatLower === "approved" || poStatLower === "ordered" || poStatLower === "in-transit") poBadgeClass = "badge-pending";
        else if (poStatLower === "cancelled" || poStatLower === "canceled") poBadgeClass = "badge-poor";

        // Vendor Risk Badge
        const vRisk = v.risk_level || "Low Risk";
        let vRiskClass = "badge-active";
        if (vRisk === "High Risk" || vRisk === "Critical Risk") vRiskClass = "badge-poor";
        else if (vRisk === "Medium Risk") vRiskClass = "badge-warning";

        // Pricing consistency check
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

        // Render sections in modal body
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

        // Configure Footer Buttons according to approval & payment state
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
                    <button type="button" class="btn btn-secondary" onclick="verifyPoInvoiceMatch(${inv.id})">🔍 Verify PO ↔ Invoice</button>
                    <button type="button" class="btn btn-secondary" onclick="closeInvoiceReviewModal()">Close</button>
                    <button type="button" class="btn btn-primary" onclick="markPaidFromModal(${inv.id}, ${remAmt}, ${isPartial})" style="background: #059669; border-color: #059669;">${payButtonText}</button>
                `;
            } else {
                // Pending Review
                footer.innerHTML = `
                    <button type="button" class="btn btn-secondary" onclick="verifyPoInvoiceMatch(${inv.id})">🔍 Verify PO ↔ Invoice</button>
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
            await loadFinanceDashboard();
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
            await loadFinanceDashboard();
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
            showToast(result.message || "Invoice payment processed successfully.", "success");
            await openInvoiceReviewModal(id);
            await loadFinanceDashboard();
        } else {
            showToast(result.detail || "Failed to update invoice payment.", "error");
        }
    } catch (err) {
        console.error("Error paying invoice from modal:", err);
        showToast("Network error. Please try again.", "error");
    }
}

async function approveInvoiceInline(id, invoiceNumber) {
    if (!confirm(`Approve invoice ${invoiceNumber || '#' + id} for payment clearance?`)) {
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
            await loadFinanceDashboard();
        } else {
            showToast(result.detail || "Failed to approve invoice.", "error");
        }
    } catch (err) {
        console.error("Error during approve request:", err);
        showToast("Network error. Please try again.", "error");
    }
}

async function markInvoicePaid(id, amount, isPartial) {
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
            showToast(result.message || "Invoice payment processed successfully.", "success");
            await loadFinanceDashboard();
        } else {
            showToast(result.detail || "Failed to update invoice payment.", "error");
        }
    } catch (err) {
        console.error("Error during pay request:", err);
        showToast("Network error. Please try again.", "error");
    }
}

async function verifyPoInvoiceMatch(id) {
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

// Global modal dismiss listeners
window.addEventListener("click", function(event) {
    const modal = document.getElementById("invoiceReviewModal");
    if (modal && event.target === modal) {
        closeInvoiceReviewModal();
    }
});

window.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeInvoiceReviewModal();
    }
});


