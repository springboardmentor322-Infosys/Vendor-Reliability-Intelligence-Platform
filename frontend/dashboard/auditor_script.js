// auditor_script.js
const API_BASE = "http://127.0.0.1:8000";

// Dynamic Cache for Budget Data synced with Finance Dash
let budgetData = {
    "Software Development": { total: 150000, allocated: 120000, spent: 0 },
    "HR": { total: 50000, allocated: 40000, spent: 0 },
    "Network": { total: 80000, allocated: 65000, spent: 0 },
    "Cyber Security": { total: 100000, allocated: 90000, spent: 0 },
    "Finance": { total: 90000, allocated: 75000, spent: 0 },
    "Management": { total: 120000, allocated: 100000, spent: 0 }
};

function loadLocalBudgetData() {
    const savedBudgets = localStorage.getItem('finance_budget_data');
    if (savedBudgets) {
        try {
            budgetData = JSON.parse(savedBudgets);
        } catch (e) {
            console.error("Error parsing saved budget data from localStorage", e);
        }
    }
}
loadLocalBudgetData();

// --- 1. SESSION VERIFICATION & LOGOUT ---

async function verifyAuditorSession() {
    const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");

    // Redirects to the main index.html page in the login folder if the session doesn't exist
    if (!currentUserId) {
        window.location.href = "../login/index.html";
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/users/verify/${currentUserId}`);
        if (!res.ok) {
            alert("Your account has been removed or revoked by an administrator.");
            sessionStorage.clear();
            localStorage.clear();
            // Redirects to the index.html page if the session verification fails
            window.location.href = "../login/index.html"; 
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
    // Route logout back to index.html in the login folder
    window.location.href = '../login/index.html'; 
}

function formatCurrency(amount) {
    return '$' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    if (viewId === 'view-audit-logs' || viewId === 'view-overview') {
        loadAuditLogs();
        if (viewId === 'view-overview') {
            fetchBudgetDataFromFinance();
            loadComplianceData();
        }
    } else if (viewId === 'view-budget') {
        fetchBudgetDataFromFinance();
    } else if (viewId === 'view-vendor-orders') {
        loadVendorOrders();
    } else if (viewId === 'view-compliance') {
        loadComplianceData();
    }
}

async function fetchBudgetDataFromFinance() {
    loadLocalBudgetData();
    renderBudgetTable();
}

async function loadAuditLogs() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/audit-logs`);
        if (!res.ok) return;
        const data = await res.json();
        const logs = Array.isArray(data) ? data : (data.logs || data.data || []);

        const tbody = document.getElementById('audit-tbody');
        const overviewTbody = document.getElementById('overview-recent-logs-tbody');
        
        if (tbody) tbody.innerHTML = '';
        if (overviewTbody) overviewTbody.innerHTML = '';

        if (logs.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">No system audit logs found.</td></tr>';
            if (overviewTbody) overviewTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">No recent logs.</td></tr>';
            return;
        }

        // Full table processing
        logs.forEach(log => {
            if (tbody) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${log.timestamp || log.created_at || 'N/A'}</td>
                    <td>${log.event_type || log.action || 'System Action'}</td>
                    <td>${log.description || log.details || 'No description provided'}</td>
                    <td><span class="badge ${getStatusBadgeClass(log.status)}">${log.status || 'Recorded'}</span></td>
                `;
                tbody.appendChild(row);
            }
        });

        // Overview mini-table processing
        if (overviewTbody) {
            const recentLogs = logs.slice(0, 5);
            recentLogs.forEach(log => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">${log.timestamp || log.created_at || 'N/A'}</td>
                    <td style="padding: 0.5rem; font-size: 0.85rem; font-weight: 500;">${log.event_type || log.action || 'System Action'}</td>
                    <td style="padding: 0.5rem;"><span class="badge ${getStatusBadgeClass(log.status)}" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;">${log.status || 'Recorded'}</span></td>
                `;
                overviewTbody.appendChild(row);
            });
        }

        const totalLogsEl = document.getElementById('dash-total-logs');
        if (totalLogsEl) totalLogsEl.innerText = logs.length;

    } catch (err) {
        console.error("Error loading audit logs:", err);
    }
}

async function loadVendorOrders() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/vendor-orders`);
        if (!res.ok) return;
        const data = await res.json();
        const orders = Array.isArray(data) ? data : (data.orders || data.data || []);

        const tbody = document.getElementById('vendor-orders-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No vendor orders found.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id || order.order_id || 'N/A'}</td>
                <td>${order.vendor_name || order.vendor || 'Unknown Vendor'}</td>
                <td>${order.items || order.description || 'N/A'}</td>
                <td>${formatCurrency(order.total_cost || order.cost || 0)}</td>
                <td><code>${order.transaction_id || 'N/A'}</code></td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading vendor orders:", err);
    }
}

function getStatusBadgeClass(status) {
    if (!status) return "badge-verified";
    const s = status.toLowerCase();
    if (s.includes('flag') || s.includes('error') || s.includes('fail')) return "badge-flagged";
    if (s.includes('warn') || s.includes('pending')) return "badge-pending";
    return "badge-verified";
}

function exportAuditLogsCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Timestamp,Event Type,Description,Status\r\n";
    const rows = document.querySelectorAll("#audit-tbody tr");
    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length >= 4) {
            const data = [`"${cols[0].innerText}"`, `"${cols[1].innerText}"`, `"${cols[2].innerText}"`, `"${cols[3].innerText}"`];
            csvContent += data.join(",") + "\r\n";
        }
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "system_audit_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportVendorOrdersCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Order ID,Vendor Name,Items,Total Cost,Transaction ID\r\n";
    const rows = document.querySelectorAll("#vendor-orders-tbody tr");
    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length >= 5) {
            const data = [`"${cols[0].innerText}"`, `"${cols[1].innerText}"`, `"${cols[2].innerText}"`, `"${cols[3].innerText}"`, `"${cols[4].innerText}"`];
            csvContent += data.join(",") + "\r\n";
        }
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vendor_orders_audit_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderBudgetTable() {
    const tbody = document.getElementById('budget-tbody');
    const tfoot = document.getElementById('budget-tfoot');
    const summaryContainer = document.getElementById('overview-budget-summary');

    let grandTotalBudget = 0;
    let grandAllocated = 0;
    let grandSpent = 0;

    if (tbody) tbody.innerHTML = '';
    if (tfoot) tfoot.innerHTML = '';

    for (const [dept, data] of Object.entries(budgetData)) {
        const remaining = data.allocated - data.spent;
        grandTotalBudget += data.total;
        grandAllocated += data.allocated;
        grandSpent += data.spent;

        if (tbody) {
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
    }

    const grandRemaining = grandAllocated - grandSpent;

    if (tfoot) {
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

    // Update Overview Tab Budget Summary
    if (summaryContainer) {
        const percentSpent = grandAllocated > 0 ? Math.min(100, Math.round((grandSpent / grandAllocated) * 100)) : 0;
        const progressBarColor = percentSpent > 90 ? 'var(--danger)' : (percentSpent > 75 ? 'var(--warning)' : 'var(--success)');
        
        summaryContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 600; margin-bottom: 0.8rem;">
                <span style="color: var(--text-dark);">Total Allocated: ${formatCurrency(grandAllocated)}</span>
                <span style="color: ${progressBarColor};">${percentSpent}% Spent</span>
            </div>
            <div style="width: 100%; height: 12px; background-color: #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 1rem;">
                <div style="width: ${percentSpent}%; height: 100%; background-color: ${progressBarColor}; transition: width 0.4s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
                <span>Spent: <strong>${formatCurrency(grandSpent)}</strong></span>
                <span>Remaining: <strong>${formatCurrency(grandRemaining)}</strong></span>
            </div>
        `;
    }
}

function extractBudgetReport() {
    let csvContent = "data:text/csv;charset=utf-8,Department,Total Budget,Allocated Amount,Spent Amount,Remaining Balance\r\n";
    for (const [dept, data] of Object.entries(budgetData)) {
        const remaining = data.allocated - data.spent;
        const row = [`"${dept}"`, data.total, data.allocated, data.spent, remaining].join(",");
        csvContent += row + "\r\n";
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "budget_allocation_audit_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 8. COMPLIANCE DATA FETCHING & RENDERING ---
async function loadComplianceData() {
    try {
        const [vendorsRes, invRes, poRes] = await Promise.all([
            fetch(`${API_BASE}/api/v1/vendors`),
            fetch(`${API_BASE}/api/v1/invoices`),
            fetch(`${API_BASE}/api/v1/purchase-orders`)
        ]);
        
        const vendors = vendorsRes.ok ? await vendorsRes.json() : [];
        const invoices = invRes.ok ? await invRes.json() : [];
        const orders = poRes.ok ? await poRes.json() : [];
        
        let violations = [];
        let frameworks = [];
        const today = new Date().toISOString().split('T')[0];

        // 0. Dynamically calculate Vendor Scores
        let vendorScoresMap = {};
        orders.forEach(po => {
            if((po.order_status || "").toLowerCase().includes("reject")) return;
            
            let baseScore = 100;
            const targetQty = po.quantity || 1;
            const producedQty = po.completed_units || 0;
            if (targetQty > 0 && producedQty < targetQty) {
                baseScore -= Math.round(((targetQty - producedQty) / targetQty) * 30);
            }
            const statusLower = (po.production_status || po.order_status || "").toLowerCase();
            if (statusLower.includes("delay") || statusLower.includes("pending")) baseScore -= 15;
            else if (statusLower.includes("cancel")) baseScore -= 40;
            
            if (po.expiry_date) {
                const expiryDate = new Date(po.expiry_date.split('T')[0]);
                const diffDays = Math.round((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) baseScore -= 35;
                else if (diffDays <= 7) baseScore -= 15;
                else if (diffDays <= 30) baseScore -= 5;
            }
            
            const finalScore = Math.max(0, Math.min(100, baseScore));
            const vName = (po.vendor_name || "").trim().toLowerCase();
            if (!vendorScoresMap[vName]) vendorScoresMap[vName] = [];
            vendorScoresMap[vName].push(finalScore);
        });

        // 1. Check Vendor Risk Standard
        let highRiskVendorNames = [];
        vendors.forEach(v => {
            const vName = v.vendor_name || v.fullname || v.username || 'Unknown Vendor';
            const vKey = vName.trim().toLowerCase();
            
            let score = v.reliability_score || 100;
            if (vendorScoresMap[vKey] && vendorScoresMap[vKey].length > 0) {
                const sum = vendorScoresMap[vKey].reduce((a, b) => a + b, 0);
                score = Math.round(sum / vendorScoresMap[vKey].length);
            }

            if (score < 75) {
                highRiskVendorNames.push(vName);
                violations.push({
                    time: today,
                    category: 'Vendor Risk',
                    desc: `Vendor ${vName} dropped to High Risk (${score}%)`,
                    result: 'Failed'
                });
            }
        });

        let vendorScopeText = 'External Suppliers';
        if (highRiskVendorNames.length > 0) {
            vendorScopeText = `<span style="color: var(--danger); font-weight: 600;">High Risk: ${highRiskVendorNames.join(', ')}</span>`;
        }

        frameworks.push({
            name: 'Vendor Reliability Governance',
            scope: vendorScopeText,
            date: today,
            lead: 'Procurement Manager',
            status: highRiskVendorNames.length === 0 ? 'Passed' : 'Review Required'
        });

        // 2. Check Quality Control Standard
        let pendingQCCount = 0;
        const activeInvoices = invoices.filter(inv => {
            const s = (inv.status || "").toLowerCase();
            const os = (inv.order_status || "").toLowerCase();
            return !s.includes("reject") && !os.includes("reject");
        });

        activeInvoices.forEach(inv => {
            const qcStatus = inv.inspection_status || inv.quality_status || 'In Progress';
            const isFinished = qcStatus.toLowerCase().includes('check') || 
                               qcStatus.toLowerCase().includes('pass') || 
                               qcStatus.toLowerCase().includes('fault') || 
                               qcStatus.toLowerCase().includes('fail');
            
            if (!isFinished) {
                pendingQCCount++;
                violations.push({
                    time: today,
                    category: 'Quality Assurance',
                    desc: `Invoice #${inv.invoice_no} is awaiting quality inspection.`,
                    result: 'Pending Review'
                });
            }
        });

        frameworks.push({
            name: 'ISO Quality Assurance',
            scope: 'Supply Chain Deliveries',
            date: today,
            lead: 'Supply Chain Manager',
            status: pendingQCCount === 0 ? 'Passed' : 'Review Required'
        });

        // 3. Check Financial Allocation Governance
        let overBudgetCount = 0;
        for (const [dept, data] of Object.entries(budgetData)) {
            if (data.spent > data.allocated) {
                overBudgetCount++;
                violations.push({
                    time: today,
                    category: 'Financial Governance',
                    desc: `${dept} exceeded allocated budget by ${formatCurrency(data.spent - data.allocated)}.`,
                    result: 'Failed'
                });
            }
        }
        frameworks.push({
            name: 'Internal Financial Controls',
            scope: 'Department Budgets',
            date: today,
            lead: 'Finance Officer',
            status: overBudgetCount === 0 ? 'Passed' : 'Review Required'
        });

        // Update KPIs
        const passedCount = frameworks.filter(f => f.status === 'Passed').length;
        const reviewRequiredCount = frameworks.filter(f => f.status === 'Review Required').length;

        if(document.getElementById('comp-kpi-active')) document.getElementById('comp-kpi-active').innerText = frameworks.length;
        if(document.getElementById('comp-kpi-passed')) document.getElementById('comp-kpi-passed').innerText = passedCount;
        if(document.getElementById('comp-kpi-violations')) document.getElementById('comp-kpi-violations').innerText = violations.length;

        // Set Flagged Events to the number of frameworks requiring review
        const flaggedEventsEl = document.getElementById('dash-flagged-events');
        if (flaggedEventsEl) flaggedEventsEl.innerText = reviewRequiredCount;

        // Calculate and Update Compliance Rating percentage in Overview tab
        const compRatingEl = document.getElementById('dash-compliance-rating');
        if (compRatingEl) {
            const rating = frameworks.length > 0 ? Math.round((passedCount / frameworks.length) * 100) : 100;
            compRatingEl.innerText = `${rating}%`;
            compRatingEl.style.color = rating === 100 ? 'var(--text-dark)' : 'var(--danger)';
        }

        // Render Frameworks Table
        const compTbody = document.getElementById('compliance-tbody');
        if(compTbody) {
            compTbody.innerHTML = '';
            frameworks.forEach(f => {
                const badgeClass = f.status === 'Passed' ? 'badge-verified' : 'badge-flagged';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${f.name}</strong></td>
                    <td>${f.scope}</td>
                    <td>${f.date}</td>
                    <td>${f.lead}</td>
                    <td><span class="badge ${badgeClass}">${f.status}</span></td>
                `;
                compTbody.appendChild(row);
            });
        }

        // Render Violations Table
        const logsTbody = document.getElementById('compliance-logs-tbody');
        if(logsTbody) {
            logsTbody.innerHTML = '';
            if (violations.length === 0) {
                logsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:2rem;">No control violations detected.</td></tr>';
            } else {
                violations.forEach(v => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${v.time}</td>
                        <td>${v.category}</td>
                        <td>${v.desc}</td>
                        <td><span class="badge badge-flagged">${v.result}</span></td>
                    `;
                    logsTbody.appendChild(row);
                });
            }
        }
    } catch (err) {
        console.error("Error loading compliance data:", err);
    }
}

function exportComplianceCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Standard,Scope,Last Audit Date,Assigned Lead,Status\r\n";
    const rows = document.querySelectorAll("#compliance-tbody tr");
    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length >= 5) {
            const data = [`"${cols[0].innerText}"`, `"${cols[1].innerText}"`, `"${cols[2].innerText}"`, `"${cols[3].innerText}"`, `"${cols[4].innerText}"`];
            csvContent += data.join(",") + "\r\n";
        }
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "compliance_framework_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.addEventListener('DOMContentLoaded', () => {
    verifyAuditorSession();
    loadAuditLogs();
    fetchBudgetDataFromFinance();
    loadComplianceData(); // Ensure compliance rating calculates immediately on load
});

window.addEventListener('storage', (event) => {
    if (event.key === 'finance_budget_data') {
        loadLocalBudgetData();
        const budgetTab = document.getElementById('view-budget');
        if (budgetTab && budgetTab.style.display !== 'none') {
            renderBudgetTable();
        }
        const compTab = document.getElementById('view-compliance');
        if (compTab && compTab.style.display !== 'none') {
            loadComplianceData();
        }
    }
});

setInterval(() => {
    loadLocalBudgetData();
    
    // Always refresh budget layout for the overview summary
    renderBudgetTable();
    
    // Always refresh compliance to update the overview rating
    loadComplianceData(); 

    const activeTabId = document.querySelector('.tab-content[style="display: block;"]')?.id;
    if (activeTabId === 'view-audit-logs' || activeTabId === 'view-overview') {
        loadAuditLogs();
    }
}, 3000);

// Validate user actively
setInterval(() => {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (currentUserId) {
    fetch(`${API_BASE}/users/verify/${currentUserId}`).catch(() => {});
  }
}, 3000);