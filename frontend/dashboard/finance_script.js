// finance_script.js
const API_BASE = "http://127.0.0.1:8000";

let vendorRowCount = 0;
let deptBarChartInstance = null;
let vendorShareChartInstance = null;
let activeFinanceChatVendor = null;
let lastKnownFinanceMessageCounts = {};
let globalVendorTotalsCache = {};

const defaultBudgetData = {
    "Software Development": { total: 150000, allocated: 120000, spent: 0 },
    "HR": { total: 50000, allocated: 40000, spent: 0 },
    "Network": { total: 80000, allocated: 65000, spent: 0 },
    "Cyber Security": { total: 100000, allocated: 90000, spent: 0 },
    "Finance": { total: 90000, allocated: 75000, spent: 0 },
    "Management": { total: 120000, allocated: 100000, spent: 0 }
};

let budgetData = defaultBudgetData;
const savedBudgets = localStorage.getItem('finance_budget_data');
if (savedBudgets) {
    try {
        budgetData = JSON.parse(savedBudgets);
    } catch (e) {
        console.error("Error parsing saved budget data", e);
    }
}

async function verifyFinanceSession() {
    const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
    if (!currentUserId) {
        window.location.href = "../login/index.html";
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/users/verify/${currentUserId}`);
        if (!res.ok) {
            alert("Your account status is invalid or has been revoked.");
            handleLogout();
        }
    } catch (err) {
        console.error("Session verification failed:", err);
    }
}

async function handleLogout(event) {
    if (event) event.preventDefault();
    
    const userId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
    if (userId) {
        try {
            await fetch(`${API_BASE}/api/v1/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: parseInt(userId) })
            });
        } catch (err) {
            console.error("Logout notification failed:", err);
        }
    }

    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '../login/index.html';
}

function formatCurrency(amount) {
    return '$' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getOrderStatusBadgeClass(status) {
    if (!status) return "badge-transit";
    const s = status.toLowerCase();
    if (s.includes("delivered")) return "badge-delivered";
    if (s.includes("delay")) return "badge-rejected";
    if (s.includes("transit")) return "badge-transit";
    if (s.includes("ready")) return "badge-pending";
    if (s.includes("quality")) return "badge-quality-progress";
    if (s.includes("production")) return "badge-pending";
    return "badge-transit";
}

function switchTab(event, viewId) {
    if (event) event.preventDefault();

    document.querySelectorAll('.tab-content').forEach(view => {
        view.style.display = 'none';
    });

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.remove('active');
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = 'block';
    }

    const tabName = viewId.replace('view-', '');
    const navItem = document.getElementById(`nav-${tabName}`);
    if (navItem) navItem.classList.add('active');

    if (viewId === 'view-analytics') {
        renderAnalyticsView();
    } else if (viewId === 'view-settings') {
        renderSettingsBudgetControls();
    } else if (viewId === 'view-budget') {
        renderBudgetTable();
    } else if (viewId === 'view-communication') {
        if (activeFinanceChatVendor) {
            localStorage.setItem(`finance_unread_${activeFinanceChatVendor}`, "0");
        }
        loadFinanceCommunicationVendors();
        loadFinanceMessages();
    }
}

async function loadInvoicesFromDB() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/invoices`);
        if (!res.ok) return;
        const rawInvoices = await res.json();
        const invoices = Array.isArray(rawInvoices) ? rawInvoices : (rawInvoices.data || rawInvoices.invoices || []);

        let purchaseOrders = [];
        try {
            const poRes = await fetch(`${API_BASE}/api/v1/purchase-orders`);
            if (poRes.ok) {
                const poData = await poRes.json();
                purchaseOrders = Array.isArray(poData) ? poData : (poData.data || poData.purchase_orders || []);
            }
        } catch (poErr) {
            console.error("Failed to fetch PO status sync:", poErr);
        }

        const poStatusMap = {};
        purchaseOrders.forEach(po => {
            poStatusMap[po.invoice_no] = po.production_status || po.order_status;
        });

        const pendingInvoices = invoices.filter(inv => {
            const s = (inv.status || "").toLowerCase();
            return s === 'pending';
        });

        const approvedInvoices = invoices.filter(inv => {
            const s = (inv.status || "").toLowerCase();
            const orderStatus = (inv.order_status || "").toLowerCase();
            const isRejected = s.includes('reject') || orderStatus.includes('reject');

            return !isRejected && (
                s === 'approved' || 
                s.includes('accepted') || 
                s.includes('production') || 
                s.includes('delivered') ||
                orderStatus.includes('accepted') || 
                orderStatus.includes('production') || 
                orderStatus.includes('delivered')
            );
        });

        const rejectedInvoices = invoices.filter(inv => {
            const s = (inv.status || "").toLowerCase();
            const orderStatus = (inv.order_status || "").toLowerCase();
            return s.includes('reject') || orderStatus.includes('reject');
        });

        for (const dept in budgetData) {
            budgetData[dept].spent = 0;
        }

        approvedInvoices.forEach(inv => {
            if (budgetData[inv.department]) {
                budgetData[inv.department].spent += Number(inv.amount || 0);
            }
        });

        localStorage.setItem('finance_budget_data', JSON.stringify(budgetData));

        const pendingTbody = document.getElementById('invoice-tbody');
        if (pendingTbody) {
            pendingTbody.innerHTML = '';
            if (pendingInvoices.length === 0) {
                pendingTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 2rem;">No pending invoices for approval.</td></tr>';
            } else {
                pendingInvoices.forEach(inv => {
                    const row = document.createElement('tr');
                    row.id = `row-INV-${inv.id}`;
                    row.innerHTML = `
                        <td>#${inv.invoice_no}</td>
                        <td>${inv.vendor_name}</td>
                        <td>${inv.product_name}</td>
                        <td>${inv.department}</td>
                        <td>${inv.quantity}</td>
                        <td>${formatCurrency(inv.amount)}</td>
                        <td><span class="badge badge-pending">Pending</span></td>
                        <td>
                            <button class="btn btn-primary btn-action" onclick="approveInvoiceDB(${inv.id})">Approve</button>
                            <button class="btn btn-action" style="background:#ef4444; color:white;" onclick="rejectInvoiceDB(${inv.id})">Reject</button>
                        </td>
                    `;
                    pendingTbody.appendChild(row);
                });
            }
        }

        const approvedTbody = document.getElementById('approved-invoices-tbody');
        if (approvedTbody) {
            const staticMsg = document.getElementById('empty-approved-msg');
            if (staticMsg) staticMsg.remove();

            approvedTbody.innerHTML = '';
            if (approvedInvoices.length === 0) {
                approvedTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No approved invoices found.</td></tr>';
            } else {
                approvedInvoices.forEach(inv => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>#${inv.invoice_no}</td>
                        <td>${inv.vendor_name}</td>
                        <td>${inv.product_name}</td>
                        <td>${inv.department}</td>
                        <td>${inv.quantity}</td>
                        <td>${formatCurrency(inv.amount)}</td>
                        <td><span class="badge badge-approved">Approved</span></td>
                    `;
                    approvedTbody.appendChild(row);
                });
            }
        }

        const rejectedTbody = document.getElementById('rejected-invoices-tbody');
        if (rejectedTbody) {
            const staticRejectedMsg = document.getElementById('empty-rejected-msg');
            if (staticRejectedMsg) staticRejectedMsg.remove();

            rejectedTbody.innerHTML = '';
            if (rejectedInvoices.length === 0) {
                rejectedTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No rejected invoices found.</td></tr>';
            } else {
                rejectedInvoices.forEach(inv => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>#${inv.invoice_no}</td>
                        <td>${inv.vendor_name}</td>
                        <td>${inv.product_name}</td>
                        <td>${inv.department}</td>
                        <td>${inv.quantity}</td>
                        <td>${formatCurrency(inv.amount)}</td>
                        <td><span class="badge badge-rejected">Rejected</span></td>
                    `;
                    rejectedTbody.appendChild(row);
                });
            }
        }

        const vendorTbody = document.getElementById('vendor-tbody');
        if (vendorTbody) {
            const staticVendorMsg = document.getElementById('empty-vendor-msg');
            if (staticVendorMsg) staticVendorMsg.remove();

            vendorTbody.innerHTML = '';
            if (approvedInvoices.length === 0) {
                vendorTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No approved vendor orders. Approve an invoice in the Dashboard tab to populate this list.</td></tr>';
            } else {
                approvedInvoices.forEach(inv => {
                    const payCellId = `pay-cell-${inv.id}`;
                    const txCellId = `tx-cell-${inv.id}`;

                    const currentOrderStatus = poStatusMap[inv.invoice_no] || inv.order_status || inv.delivery_status || 'In Production';
                    const orderBadgeClass = getOrderStatusBadgeClass(currentOrderStatus);

                    const inspectionStatus = inv.inspection_status || inv.quality_status || 'In Progress';
                    const paymentStatus = inv.payment_status || 'Unpaid';

                    let canPay = true;
                    if (inspectionStatus === 'Checked' || inspectionStatus === 'Passed') {
                        canPay = true;
                    } else if (inspectionStatus === 'Fault' || inspectionStatus === 'Failed') {
                        canPay = false;
                    }

                    let paymentHTML = '';
                    if (paymentStatus === 'Paid') {
                        paymentHTML = '<span class="badge badge-paid"><i class="fa-solid fa-check"></i> Paid</span>';
                    } else if (canPay) {
                        paymentHTML = `<button class="btn btn-pay" onclick="processPayment('${payCellId}', '${txCellId}', ${inv.id})">Pay</button>`;
                    } else {
                        paymentHTML = `<button class="btn btn-disabled" disabled title="Requires Delivery & Inspection Checked">Pay</button>`;
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>#${inv.invoice_no}</strong></td>
                        <td>${inv.vendor_name}</td>
                        <td>${inv.product_name}</td>
                        <td><span class="badge ${orderBadgeClass}">${currentOrderStatus}</span></td>
                        <td>${inspectionStatus}</td>
                        <td id="${payCellId}">${paymentHTML}</td>
                        <td id="${txCellId}" style="color: var(--text-muted); font-family: monospace;">${inv.transaction_id || '-'}</td>
                    `;
                    vendorTbody.appendChild(row);
                });
            }
        }

        updateDashboardKPIs(pendingInvoices, approvedInvoices, rejectedInvoices);
        renderBudgetTable();

    } catch (err) {
        console.error("Error loading invoices from database:", err);
    }
}

function updateDashboardKPIs(pending, approved, rejected) {
    const totalSpend = approved.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const spendEl = document.getElementById('total-spend');
    const pendingEl = document.getElementById('pending-count');
    const approvedEl = document.getElementById('approved-count');
    const rejectedEl = document.getElementById('rejected-count');

    if (spendEl) spendEl.innerText = formatCurrency(totalSpend);
    if (pendingEl) pendingEl.innerText = pending.length;
    if (approvedEl) approvedEl.innerText = approved.length;
    if (rejectedEl) rejectedEl.innerText = rejected.length;
}

async function approveInvoiceDB(invoiceId) {
    try {
        const res = await fetch(`${API_BASE}/api/v1/invoices/${invoiceId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                status: 'Approved',
                order_status: 'In Production',
                inspection_status: 'In Progress'
            })
        });

        if (res.ok) {
            await loadInvoicesFromDB();
        } else {
            alert("Failed to approve invoice.");
        }
    } catch (err) {
        alert("Error connecting to server.");
    }
}

async function rejectInvoiceDB(invoiceId) {
    try {
        const res = await fetch(`${API_BASE}/api/v1/invoices/${invoiceId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Rejected' })
        });

        if (res.ok) {
            await loadInvoicesFromDB();
        } else {
            alert("Failed to reject invoice.");
        }
    } catch (err) {
        alert("Error connecting to server.");
    }
}

async function processPayment(payCellId, txCellId, invId) {
    const payCell = document.getElementById(payCellId);
    const txCell = document.getElementById(txCellId);

    const randomTxId = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);

    if (payCell) payCell.innerHTML = '<span class="badge badge-paid"><i class="fa-solid fa-check"></i> Paid</span>';
    if (txCell) txCell.innerText = randomTxId;

    try {
        const res = await fetch(`${API_BASE}/api/v1/invoices/${invId}/pay`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payment_status: 'Paid',
                transaction_id: randomTxId
            })
        });

        if (res.ok) {
            await loadInvoicesFromDB();
        } else {
            alert("Failed to save payment status to database.");
            await loadInvoicesFromDB();
        }
    } catch (err) {
        console.error("Payment API Error:", err);
        alert("Error connecting to server while processing payment.");
        await loadInvoicesFromDB();
    }
}

function renderBudgetTable() {
    const tbody = document.getElementById('budget-tbody');
    const tfoot = document.getElementById('budget-tfoot');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    let grandTotalBudget = 0;
    let grandAllocated = 0;
    let grandSpent = 0;

    for (const [dept, data] of Object.entries(budgetData)) {
        const remaining = data.allocated - data.spent;
        
        grandTotalBudget += data.total;
        grandAllocated += data.allocated;
        grandSpent += data.spent;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dept}</td>
            <td>${formatCurrency(data.total)}</td>
            <td>${formatCurrency(data.allocated)}</td>
            <td>${formatCurrency(data.spent)}</td>
            <td style="color: ${remaining < 0 ? 'var(--danger)' : 'inherit'}; font-weight: ${remaining < 0 ? '600' : 'normal'}">${formatCurrency(remaining)}</td>
        `;
        tbody.appendChild(row);
    }

    const grandRemaining = grandAllocated - grandSpent;
    const footRow = document.createElement('tr');
    footRow.innerHTML = `
        <td>Grand Total</td>
        <td>${formatCurrency(grandTotalBudget)}</td>
        <td>${formatCurrency(grandAllocated)}</td>
        <td>${formatCurrency(grandSpent)}</td>
        <td style="color: ${grandRemaining < 0 ? 'var(--danger)' : 'inherit'}">${formatCurrency(grandRemaining)}</td>
    `;
    tfoot.appendChild(footRow);
}

function extractBudgetReport() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Department,Total Budget,Allocated Amount,Spent Amount,Remaining Balance\r\n";

    for (const [dept, data] of Object.entries(budgetData)) {
        const remaining = data.allocated - data.spent;
        const row = [
            `"${dept}"`,
            data.total,
            data.allocated,
            data.spent,
            remaining
        ].join(",");
        csvContent += row + "\r\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "budget_allocation_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function extractVendorOrdersReport() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/invoices`);
        if (!res.ok) return;
        const rawData = await res.json();
        let invoices = Array.isArray(rawData) ? rawData : (rawData.data || rawData.invoices || []);

        let csvRows = [];
        csvRows.push(["Inv No", "Vendor", "Product Name", "Order Status", "Inspection", "Payment", "Transaction ID"].join(","));

        invoices.forEach((inv, index) => {
            const row = [
                `"#${inv.invoice_no || index}"`,
                `"${(inv.vendor_name || "").replace(/"/g, '""')}"`,
                `"${(inv.product_name || "").replace(/"/g, '""')}"`,
                `"${inv.order_status || 'In Production'}"`,
                `"${inv.inspection_status || 'In Progress'}"`,
                `"${inv.payment_status || 'Unpaid'}"`,
                `"${inv.transaction_id || '-'}"`
            ];
            csvRows.push(row.join(","));
        });

        const csvString = csvRows.join("\r\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "vendor_orders_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Error exporting report:", err);
    }
}

function renderSettingsBudgetControls() {
    const tbody = document.getElementById('settings-budget-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    for (const [dept, data] of Object.entries(budgetData)) {
        const remaining = data.allocated - data.spent;
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td style="font-weight: 600;">${dept}</td>
            <td>
                <input type="number" class="input-inline" value="${data.total}" onchange="updateDepartmentBudget('${dept}', 'total', this.value)">
            </td>
            <td>
                <input type="number" class="input-inline" value="${data.allocated}" onchange="updateDepartmentBudget('${dept}', 'allocated', this.value)">
            </td>
            <td style="color: var(--text-muted);">${formatCurrency(data.spent)}</td>
            <td style="color: ${remaining < 0 ? 'var(--danger)' : 'inherit'}; font-weight: 600;">
                ${formatCurrency(remaining)}
            </td>
        `;
        tbody.appendChild(row);
    }
}

function updateDepartmentBudget(dept, field, value) {
    const numVal = parseFloat(value) || 0;
    if (budgetData[dept]) {
        budgetData[dept][field] = numVal;
        localStorage.setItem('finance_budget_data', JSON.stringify(budgetData));
        renderBudgetTable();
        renderSettingsBudgetControls();
    }
}

// --- Finance Communication Chat Handlers with Global Multi-Vendor Unread Tracking ---
async function loadFinanceCommunicationVendors() {
    const listContainer = document.getElementById("finance-vendor-channels-list");
    if (!listContainer) return;

    try {
        const res = await fetch(`${API_BASE}/api/v1/vendors`);
        if (!res.ok) return;
        const vendors = await res.json();

        if (vendors.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">No vendors found.</p>';
            return;
        }

        vendors.forEach(v => {
            const name = v.vendor_name;
            if (!name) return;

            const storageKey = `finance_chain_chat_${name}`;
            const messages = JSON.parse(localStorage.getItem(storageKey) || "[]");
            const totalMsgs = messages.length;

            if (lastKnownFinanceMessageCounts[name] === undefined) {
                lastKnownFinanceMessageCounts[name] = totalMsgs;
            } else if (totalMsgs > lastKnownFinanceMessageCounts[name]) {
                const diff = totalMsgs - lastKnownFinanceMessageCounts[name];
                lastKnownFinanceMessageCounts[name] = totalMsgs;

                if (activeFinanceChatVendor !== name) {
                    const unreadKey = `finance_unread_${name}`;
                    let currentUnread = parseInt(localStorage.getItem(unreadKey) || "0", 10);
                    localStorage.setItem(unreadKey, currentUnread + diff);
                }
            }
        });

        renderFinanceVendorChannelList(vendors);
    } catch (err) {
        console.error("Failed to load communication vendors for finance:", err);
    }
}

function renderFinanceVendorChannelList(vendors) {
    const listContainer = document.getElementById("finance-vendor-channels-list");
    if (!listContainer) return;

    const searchTerm = (document.getElementById("finance-vendor-search-input")?.value || "").toLowerCase();
    const filtered = vendors.filter(v => (v.vendor_name || "").toLowerCase().includes(searchTerm));

    if (filtered.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">No matching vendors found.</p>';
        return;
    }

    listContainer.innerHTML = filtered.map(v => {
        const name = v.vendor_name || 'Unknown Vendor';
        const category = v.category || 'General';
        const isSelected = activeFinanceChatVendor === name;
        const bgStyle = isSelected ? 'background: rgba(139, 92, 246, 0.2); border-color: rgba(139, 92, 246, 0.5);' : 'background: rgba(255, 255, 255, 0.05); border-color: var(--border);';

        const unreadKey = `finance_unread_${name}`;
        const unreadCount = parseInt(localStorage.getItem(unreadKey) || "0", 10);
        const badgeHTML = (unreadCount > 0 && !isSelected) ? `<span style="background: #ef4444; color: white; border-radius: 50px; padding: 2px 8px; font-size: 10px; font-weight: 700;">${unreadCount > 9 ? '9+' : unreadCount}</span>` : '';

        return `
            <div onclick="selectFinanceVendorChat('${name.replace(/'/g, "\\'")}')" style="${bgStyle} padding: 12px 14px; border-radius: 12px; border: 1px solid; cursor: pointer; transition: all 0.2s ease; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="display: block; color: var(--text-dark); font-size: 0.9rem; margin-bottom: 2px;">${name}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">Category: ${category}</span>
                </div>
                ${badgeHTML}
            </div>
        `;
    }).join('');
}

function filterFinanceVendorChannels() {
    fetch(`${API_BASE}/api/v1/vendors`)
        .then(res => res.json())
        .then(vendors => renderFinanceVendorChannelList(vendors))
        .catch(() => {});
}

function selectFinanceVendorChat(vendorName) {
    activeFinanceChatVendor = vendorName;
    
    // Clear unread count when chat is opened
    localStorage.setItem(`finance_unread_${vendorName}`, "0");
    
    const titleEl = document.getElementById("finance-active-chat-vendor-title");
    const subEl = document.getElementById("finance-active-chat-vendor-sub");
    if (titleEl) titleEl.textContent = `Chat with ${vendorName}`;
    if (subEl) subEl.textContent = `Direct secure financial stream`;

    loadFinanceMessages();
    loadFinanceCommunicationVendors();
}

function clearFinanceChat() {
    if (!activeFinanceChatVendor) {
        alert("Please select a vendor channel first.");
        return;
    }
    
    if (confirm(`Are you sure you want to clear the chat history with ${activeFinanceChatVendor}?`)) {
        const storageKey = `finance_chain_chat_${activeFinanceChatVendor}`;
        localStorage.removeItem(storageKey);
        localStorage.removeItem(`vendor_chat_${activeFinanceChatVendor}_Finance Officer`);
        localStorage.setItem(`finance_unread_${activeFinanceChatVendor}`, "0");

        loadFinanceMessages();
        loadFinanceCommunicationVendors();
    }
}

function loadFinanceMessages() {
    const container = document.getElementById("finance-chat-container");
    if (!container) return;

    if (!activeFinanceChatVendor) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 2rem;">
                <i class="fa-regular fa-comments" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 0.9rem;">Please select a vendor from the right panel to view and send financial messages.</p>
            </div>
        `;
        return;
    }

    const storageKey = `finance_chain_chat_${activeFinanceChatVendor}`;
    const savedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");

    let historyHTML = `
        <div style="display: flex; flex-direction: column; align-items: flex-start; max-width: 80%;">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; padding-left: 4px;">System Desk • Secure Channel</div>
            <div style="background: rgba(255, 255, 255, 0.15); border: 1px solid var(--border); padding: 12px 16px; border-radius: 16px; border-top-left-radius: 4px; font-size: 0.9rem; color: var(--text-dark); line-height: 1.5;">
                Started secure financial conversation thread with <strong>${activeFinanceChatVendor}</strong>.
            </div>
        </div>
    `;

    savedMessages.forEach(msg => {
        const timeFormatted = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (msg.sender === 'finance') {
            historyHTML += `
                <div style="display: flex; flex-direction: column; align-items: flex-end; align-self: flex-end; max-width: 80%;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; padding-right: 4px;">Finance Officer • ${timeFormatted}</div>
                    <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.85), rgba(236, 72, 153, 0.85)); color: #ffffff; padding: 12px 16px; border-radius: 16px; border-top-right-radius: 4px; font-size: 0.9rem; line-height: 1.5; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);">
                        ${escapeHtml(msg.text)}
                    </div>
                </div>
            `;
        } else {
            historyHTML += `
                <div style="display: flex; flex-direction: column; align-items: flex-start; max-width: 80%;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; padding-left: 4px;">${activeFinanceChatVendor} • ${timeFormatted}</div>
                    <div style="background: rgba(255, 255, 255, 0.15); border: 1px solid var(--border); padding: 12px 16px; border-radius: 16px; border-top-left-radius: 4px; font-size: 0.9rem; color: var(--text-dark); line-height: 1.5;">
                        ${escapeHtml(msg.text)}
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = historyHTML;
    container.scrollTop = container.scrollHeight;
}

function sendFinanceMessage(event) {
    if (event) event.preventDefault();
    if (!activeFinanceChatVendor) {
        alert("Please select a vendor from the right panel first.");
        return;
    }

    const inputEl = document.getElementById("finance-chat-input");
    if (!inputEl) return;

    const text = inputEl.value.trim();
    if (!text) return;

    const newMsg = { sender: 'finance', text, timestamp: Date.now() };
    const storageKey = `finance_chain_chat_${activeFinanceChatVendor}`;
    let savedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");
    savedMessages.push(newMsg);
    localStorage.setItem(storageKey, JSON.stringify(savedMessages));

    const vendorChatKey = `vendor_chat_${activeFinanceChatVendor}_Finance Officer`;
    let vendorChatHistory = JSON.parse(localStorage.getItem(vendorChatKey) || "[]");
    vendorChatHistory.push({ sender: 'role', senderName: 'Finance Officer', text, timestamp: Date.now() });
    localStorage.setItem(vendorChatKey, JSON.stringify(vendorChatHistory));

    lastKnownFinanceMessageCounts[activeFinanceChatVendor] = savedMessages.length;

    inputEl.value = "";
    loadFinanceMessages();
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function renderAnalyticsView() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/invoices`);
        if (!res.ok) return;
        const rawInvoices = await res.json();
        const invoices = Array.isArray(rawInvoices) ? rawInvoices : (rawInvoices.data || rawInvoices.invoices || []);
        
        const approved = invoices.filter(inv => {
            const s = (inv.status || "").toLowerCase();
            const orderStatus = (inv.order_status || "").toLowerCase();
            const isRejected = s.includes('reject') || orderStatus.includes('reject');

            return !isRejected && (
                s === 'approved' || 
                s.includes('accepted') || 
                s.includes('production') || 
                s.includes('delivered') ||
                orderStatus.includes('accepted') || 
                orderStatus.includes('production') || 
                orderStatus.includes('delivered')
            );
        });

        const totalSpend = approved.reduce((sum, i) => sum + Number(i.amount || 0), 0);
        const avgSpend = approved.length > 0 ? (totalSpend / approved.length) : 0;

        document.getElementById('analytics-total-spend').innerText = formatCurrency(totalSpend);
        document.getElementById('analytics-avg-spend').innerText = formatCurrency(avgSpend);

        const deptTotals = {};
        const vendorTotals = {};

        approved.forEach(item => {
            const amt = Number(item.amount || 0);
            deptTotals[item.department] = (deptTotals[item.department] || 0) + amt;
            vendorTotals[item.vendor_name] = (vendorTotals[item.vendor_name] || 0) + amt;
        });

        let topDept = 'N/A';
        let topDeptVal = 0;
        for (const [dept, val] of Object.entries(deptTotals)) {
            if (val > topDeptVal) {
                topDeptVal = val;
                topDept = dept;
            }
        }
        document.getElementById('analytics-top-dept').innerText = topDept;
        document.getElementById('analytics-top-dept-val').innerText = formatCurrency(topDeptVal);

        let topVendor = 'N/A';
        let topVendorVal = 0;
        for (const [vendor, val] of Object.entries(vendorTotals)) {
            if (val > topVendorVal) {
                topVendorVal = val;
                topVendor = vendor;
            }
        }
        document.getElementById('analytics-top-vendor').innerText = topVendor;
        document.getElementById('analytics-top-vendor-val').innerText = formatCurrency(topVendorVal);

        const chartContainer = document.getElementById('analytics-budget-chart');
        chartContainer.innerHTML = '';

        for (const [dept, data] of Object.entries(budgetData)) {
            const maxScale = Math.max(data.total * 1.2, 1);
            const spent = data.spent;
            const allocated = data.allocated;
            const total = data.total;

            const blueSpent = Math.min(spent, allocated);
            const blueWidth = (blueSpent / maxScale) * 100;

            const orangeSpent = spent > allocated ? Math.min(spent - allocated, total - allocated) : 0;
            const orangeWidth = (orangeSpent / maxScale) * 100;

            const redSpent = spent > total ? (spent - total) : 0;
            const redWidth = (redSpent / maxScale) * 100;

            const card = document.createElement('div');
            card.className = 'dept-bar-card';
            card.innerHTML = `
                <div class="dept-title-row">
                    <span>${dept}</span>
                    <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">
                        Spent: <span style="font-weight:700; color: var(--text-dark);">${formatCurrency(data.spent)}</span> | 
                        Allocated: ${formatCurrency(data.allocated)} | 
                        Total: ${formatCurrency(data.total)}
                    </span>
                </div>
                <div class="segmented-bar-container">
                    <div class="segment segment-blue" style="width: ${blueWidth > 0 ? blueWidth : 0}%;"></div>
                    <div class="segment segment-orange" style="width: ${orangeWidth > 0 ? orangeWidth : 0}%;"></div>
                    <div class="segment segment-red" style="width: ${redWidth > 0 ? redWidth : 0}%;"></div>
                </div>
            `;
            chartContainer.appendChild(card);
        }

        globalVendorTotalsCache = vendorTotals;
        renderAnalyticsVendorList(globalVendorTotalsCache, totalSpend);

        const deptLabels = Object.keys(budgetData);
        const spentData = deptLabels.map(dept => budgetData[dept].spent);
        const allocatedData = deptLabels.map(dept => budgetData[dept].allocated);

        const deptCtx = document.getElementById('deptSpendBarChart').getContext('2d');
        if (deptBarChartInstance) deptBarChartInstance.destroy();

        deptBarChartInstance = new Chart(deptCtx, {
            type: 'bar',
            data: {
                labels: deptLabels,
                datasets: [
                    {
                        label: 'Actual Spend ($)',
                        data: spentData,
                        backgroundColor: 'rgba(139, 92, 246, 0.85)',
                        borderColor: 'rgba(139, 92, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Allocated Budget ($)',
                        data: allocatedData,
                        backgroundColor: 'rgba(56, 189, 248, 0.5)',
                        borderColor: 'rgba(56, 189, 248, 1)',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-dark').trim(),
                            font: { family: 'Inter', weight: '600' }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-muted').trim() },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-muted').trim() },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });

        const vendorLabels = Object.keys(vendorTotals);
        const vendorValues = Object.values(vendorTotals);

        const vendorCtx = document.getElementById('vendorShareDoughnutChart').getContext('2d');
        if (vendorShareChartInstance) vendorShareChartInstance.destroy();

        vendorShareChartInstance = new Chart(vendorCtx, {
            type: 'doughnut',
            data: {
                labels: vendorLabels.length > 0 ? vendorLabels : ['No Data'],
                datasets: [{
                    data: vendorValues.length > 0 ? vendorValues : [1],
                    backgroundColor: [
                        'rgba(139, 92, 246, 0.85)',
                        'rgba(236, 72, 153, 0.85)',
                        'rgba(56, 189, 248, 0.85)',
                        'rgba(16, 185, 129, 0.85)',
                        'rgba(245, 158, 11, 0.85)',
                        'rgba(239, 68, 68, 0.85)'
                    ],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-dark').trim(),
                            font: { family: 'Inter', weight: '600' }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error("Error rendering analytics:", err);
    }
}

function renderAnalyticsVendorList(vendorTotalsObj, totalSpend) {
    const vendorList = document.getElementById('analytics-vendor-scroll-container');
    if (!vendorList) return;

    const searchTerm = (document.getElementById('analytics-vendor-search')?.value || "").toLowerCase();
    const filteredEntries = Object.entries(vendorTotalsObj).filter(([vendor]) => 
        vendor.toLowerCase().includes(searchTerm)
    );

    vendorList.innerHTML = '';

    if (filteredEntries.length === 0) {
        vendorList.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 2rem;">No matching vendors found.</p>';
        return;
    }

    filteredEntries.forEach(([vendor, val]) => {
        const percentage = totalSpend > 0 ? ((val / totalSpend) * 100).toFixed(1) : 0;
        const item = document.createElement('div');
        item.style.marginBottom = '1.2rem';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items: flex-start; gap: 12px; font-size:0.85rem; font-weight:600; margin-bottom: 2px;">
                <span style="word-break: break-word; flex: 1;">${vendor}</span>
                <span style="white-space: nowrap; text-align: right;">${formatCurrency(val)} (${percentage}%)</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
            </div>
        `;
        vendorList.appendChild(item);
    });
}

function filterAnalyticsVendorAllocations() {
    const totalSpendEl = document.getElementById('analytics-total-spend');
    let totalSpend = 0;
    if (totalSpendEl) {
        totalSpend = parseFloat(totalSpendEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
    }
    renderAnalyticsVendorList(globalVendorTotalsCache, totalSpend);
}

window.addEventListener('DOMContentLoaded', () => {
    verifyFinanceSession();
    loadInvoicesFromDB();

    const savedTheme = localStorage.getItem('finance_portal_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
        if (themeText) themeText.textContent = 'Light Mode';
    }
});

setInterval(() => {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (currentUserId) {
    fetch(`${API_BASE}/users/verify/${currentUserId}`).catch(() => {});
  }
}, 3000);

window.addEventListener('beforeunload', () => {
  const userId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (userId) {
    fetch(`${API_BASE}/api/v1/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: parseInt(userId) }),
      keepalive: true
    }).catch(() => {});
  }
});

setInterval(() => {
  loadInvoicesFromDB().catch(err => console.error("Finance poll error:", err));
  const commView = document.getElementById('view-communication');
  if (commView && commView.style.display !== 'none') {
      loadFinanceMessages();
      loadFinanceCommunicationVendors();
  }
}, 3000);
