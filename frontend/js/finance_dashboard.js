const API_BASE_URL = "http://127.0.0.1:8000";
let spendCategoryChartInstance = null;
let cashFlowChartInstance = null;

document.addEventListener("DOMContentLoaded", loadFinanceDashboard);

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
        
        // 1. KPI Summary Cards
        document.getElementById("totalSpendVal").innerText = `₹${(data.total_spend || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("totalInvoicesSub").innerText = `${Number(data.total_invoices || 0).toLocaleString()} Invoices Recorded`;
        
        document.getElementById("paidAmountVal").innerText = `₹${(data.paid_invoices_amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("paidCountSub").innerText = `${Number(data.paid_invoices_count || 0).toLocaleString()} Paid Invoices`;
        
        document.getElementById("pendingAmountVal").innerText = `₹${(data.pending_payments_amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById("pendingCountSub").innerText = `${Number(data.pending_payments_count || 0).toLocaleString()} Pending Approval`;
        
        document.getElementById("budgetUtilVal").innerText = `${data.budget_utilization_pct || 0}%`;
        document.getElementById("budgetSub").innerText = `Allocated ₹${(data.allocated_budget || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

        // 2. Finance Insights
        if (data.insights) {
            document.getElementById("topCategorySpendInsight").innerText = 
                `Top spending category is "${data.insights.top_category_name}" with ₹${(data.insights.top_category_spend || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})} YTD spend.`;
            document.getElementById("pendingLiabilityInsight").innerText = 
                `Pending payment obligations represent ${data.insights.pending_liability_pct}% of total billed transactions.`;
            document.getElementById("settlementInsight").innerText = 
                `Invoice clearance rate is at ${data.insights.payment_settlement_rate}% of all logged accounts payable.`;
        }

        // 3. Render Spend by Category Donut Chart
        if (data.spend_by_category && data.spend_by_category.length > 0) {
            renderSpendCategoryChart(data.spend_by_category);
        }

        // 4. Render Cash Flow Chart
        if (data.cash_flow && data.cash_flow.length > 0) {
            renderCashFlowChart(data.cash_flow);
        }

        // 5. Render Recent Invoices
        renderRecentInvoices(data.recent_invoices || []);

    } catch (err) {
        console.error("Error fetching finance stats:", err);
    }
}

function renderSpendCategoryChart(categories) {
    const ctx = document.getElementById("spendCategoryChart");
    if (!ctx) return;

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
                            return ` ₹${Number(val).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
                        }
                    }
                }
            }
        }
    });
}

function renderCashFlowChart(cashFlowData) {
    const ctx = document.getElementById("cashFlowChart");
    if (!ctx) return;

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
                            return ` ${context.dataset.label}: ₹${Number(context.raw || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
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

function renderRecentInvoices(invoices) {
    const tbody = document.getElementById("invoiceTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state-wrapper">No invoices recorded.</td></tr>`;
        return;
    }
    
    invoices.forEach(inv => {
        const isPending = (inv.status || "").toLowerCase() === "pending";
        const badgeClass = isPending ? "badge-pending" : "badge-active";
        
        let actionBtn = `<span style="color: var(--success-color); font-weight: 600;">✓ Paid</span>`;
        if (isPending) {
            actionBtn = `<button class="btn btn-primary" onclick="markInvoicePaid(${inv.id})" style="padding: 5px 10px; font-size: 11px;">Mark Paid</button>`;
        }
            
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">${escapeHTML(inv.invoice_number)}</td>
                <td>#${inv.po_id || 'N/A'}</td>
                <td style="font-weight: 600;">${escapeHTML(inv.vendor_name || 'N/A')}</td>
                <td>${escapeHTML(inv.product_name || 'N/A')}</td>
                <td style="font-weight: 600;">₹${(inv.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${inv.due_date || 'N/A'}</td>
                <td><span class="badge ${badgeClass}">${escapeHTML(inv.status)}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

async function markInvoicePaid(id) {
    if (!confirm("Are you sure you want to mark this invoice as Paid?")) {
        return;
    }
    
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/${id}/pay`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast("Invoice marked as Paid successfully.", "success");
            await loadFinanceDashboard();
        } else {
            showToast(result.detail || "Failed to update invoice payment.", "error");
        }
    } catch (err) {
        console.error("Error during pay request:", err);
        showToast("Network error. Please try again.", "error");
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

