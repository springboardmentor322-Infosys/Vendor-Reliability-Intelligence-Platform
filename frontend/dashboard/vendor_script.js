// vendor_script.js
const API_BASE = "http://127.0.0.1:8000";
let cachedOrders = [];
let cachedInvoices = [];
let cachedOnTimeRate = null;
let trendChartInstance = null;
let qualityChartInstance = null;
let orderStatusChartInstance = null;
let deptBarChartInstance = null;
let activeVendorChatRole = null;

const initVendorName = sessionStorage.getItem("vendor_name") || localStorage.getItem("vendor_name") || "Vendor";
let lastKnownVendorMessageCounts = {
  "Supply Chain Manager": JSON.parse(localStorage.getItem(`vendor_chat_${initVendorName}_Supply Chain Manager`) || "[]").length,
  "Finance Officer": JSON.parse(localStorage.getItem(`vendor_chat_${initVendorName}_Finance Officer`) || "[]").length
};

function formatApiError(errData) {
  if (!errData) return "An unknown error occurred.";
  if (Array.isArray(errData.detail)) {
    return errData.detail
      .map(err => {
        const field = Array.isArray(err.loc) ? err.loc.filter(l => l !== 'body').join('.') : '';
        return field ? `${field}: ${err.msg}` : err.msg;
      })
      .join('\n');
  }
  if (typeof errData.detail === 'string') return errData.detail;
  if (typeof errData.message === 'string') return errData.message;
  return JSON.stringify(errData);
}

function isVendorMatch(targetVendor, currentVendor) {
  if (!targetVendor || !currentVendor) return false;
  const a = targetVendor.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = currentVendor.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return a === b || a.includes(b) || b.includes(a);
}

function applyRiskColor(elementId, score, thresholds = { high: 90, medium: 75 }) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.classList.remove('risk-success', 'risk-warning', 'risk-danger');

  if (score >= thresholds.high) {
    el.style.color = '#10b981';
  } else if (score >= thresholds.medium) {
    el.style.color = '#f59e0b';
  } else {
    el.style.color = '#ef4444';
  }
}

function syncQualityAssuranceMetrics(passedCount, progressCount, faultCount) {
  const totalEvaluated = passedCount + progressCount + faultCount;
  const qaPercentage = totalEvaluated > 0 ? Math.round((passedCount / totalEvaluated) * 100) : 100;
  const formattedRate = `${qaPercentage}%`;

  const targetIds = [
    "metric-quality-assurance",
    "breakdown-quality",
    "quality-assurance-val",
    "metric-quality",
    "quality-score"
  ];

  targetIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = formattedRate;
      if (id === "breakdown-quality" || id === "metric-quality-assurance") {
        applyRiskColor(id, qaPercentage, { high: 90, medium: 75 });
      }
    }
  });

  document.querySelectorAll(".quality-rate-display, .quality-metric, .quality-value").forEach(el => {
    el.textContent = formattedRate;
  });
}

function syncOnTimeDeliveryMetrics(rate) {
  if (rate !== undefined && rate !== null) {
    const numericRate = typeof rate === 'number' ? rate : parseInt(rate.toString().replace(/\D/g, ''), 10);
    if (!isNaN(numericRate)) {
      cachedOnTimeRate = numericRate;
    }
  }

  if (cachedOnTimeRate === null) return;
  const formattedRate = `${cachedOnTimeRate}%`;

  const targetIds = [
    "metric-ontime-rate",
    "breakdown-ontime",
    "breakdown-ontime-rate",
    "metric-ontime",
    "ontime-rate",
    "ontime-delivery-val"
  ];

  targetIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = formattedRate;
      applyRiskColor(id, cachedOnTimeRate, { high: 90, medium: 75 });
    }
  });
}

async function fetchWithRetry(url, options = {}, retries = 3, delay = 200) {
  const defaultHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };

  options.headers = { ...defaultHeaders, ...options.headers };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && attempt < retries) {
        await new Promise((res) => setTimeout(res, delay * Math.pow(2, attempt - 1)));
        continue;
      }
      return response;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((res) => setTimeout(res, delay * Math.pow(2, attempt - 1)));
    }
  }
}

function determineContractStatus(expiryDateStr, orderStatusText) {
  if (orderStatusText && orderStatusText.toLowerCase().includes('delivered')) {
    return { label: 'Completed', class: 'contract-completed' };
  }
  
  if (!expiryDateStr) return { label: 'Active', class: 'contract-active' };

  const cleanDateStr = expiryDateStr.split('T')[0];
  const parts = cleanDateStr.split('-');
  
  if (parts.length !== 3) return { label: 'Active', class: 'contract-active' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.round((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Expired', class: 'contract-expired' };
  } else if (diffDays <= 7 && diffDays >= 0) {
    return { label: 'Expiry Soon', class: 'contract-expires-soon' };
  } else {
    return { label: 'Active', class: 'contract-active' };
  }
}

async function verifyVendorSession() {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (!currentUserId) {
    window.location.href = "../login/index.html";
    return;
  }
  
  let vendorName = sessionStorage.getItem("vendor_name") || localStorage.getItem("vendor_name");

  try {
    const res = await fetchWithRetry(`${API_BASE}/users/verify/${currentUserId}`);
    if (res.ok) {
      const data = await res.json();
      const dbUser = data.user || data;
      const dbVendor = dbUser.fullname || dbUser.company_name || dbUser.username;
      if (dbVendor) vendorName = dbVendor;
    }
  } catch (err) {
    console.error("Session verification network error:", err);
  }

  if (!vendorName) {
    window.location.href = "../login/index.html";
    return;
  }
  
  sessionStorage.setItem("vendor_name", vendorName);
  localStorage.setItem("vendor_name", vendorName);
  
  const displayElem = document.getElementById("vendorDisplayName");
  if (displayElem) displayElem.textContent = vendorName;
  
  document.querySelectorAll(".vendor-name-display").forEach(el => {
    el.textContent = vendorName;
  });

  await fetchAllVendorData(vendorName);
}

async function handleLogout(event) {
  if (event) event.preventDefault();
  
  const userId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (userId) {
    try {
      await fetchWithRetry(`${API_BASE}/api/v1/logout`, {
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

function switchTab(viewId, element) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  
  if (element) element.classList.add('active');
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');

  syncOnTimeDeliveryMetrics();

  if (viewId === 'reliability-view') {
    renderCharts();
    setTimeout(() => {
      if (window.Chart && Chart.instances) {
        Object.values(Chart.instances).forEach(chart => chart.resize());
      }
    }, 50);
  } else if (viewId === 'settings-view') {
    loadVendorProfile();
  } else if (viewId === 'notifications-view') {
    renderVendorNotifications();
  } else if (viewId === 'communication-view') {
    if (activeVendorChatRole) {
      const vendorName = sessionStorage.getItem("vendor_name") || "Vendor";
      localStorage.setItem(`vendor_unread_${vendorName}_${activeVendorChatRole}`, "0");
    }
    updateVendorChatBadges();
    loadVendorPortalMessages();
  }
}

async function fetchAllVendorData(forcedVendorName = null) {
  const vendorName = forcedVendorName || sessionStorage.getItem("vendor_name") || "";
  if (!vendorName) return;

  try {
    const vendorsRes = await fetchWithRetry(`${API_BASE}/api/v1/vendors`);
    if (vendorsRes.ok) {
      const allVendors = await vendorsRes.json();
      const currentVendorObj = allVendors.find(v => 
        isVendorMatch(v.vendor_name || v.fullname || v.username, vendorName)
      );

      if (currentVendorObj) {
        if (currentVendorObj.id) sessionStorage.setItem("vendor_id_pk", currentVendorObj.id);
        
        const score = Number(currentVendorObj.reliability_score ?? 100);

        const metricReliability = document.getElementById("metric-reliability");
        if (metricReliability) metricReliability.textContent = `${score}%`;
        applyRiskColor("metric-reliability", score, { high: 90, medium: 75 });

        const breakdownRating = document.getElementById("breakdown-rating");
        if (breakdownRating) breakdownRating.textContent = `${score} / 100`;
        applyRiskColor("breakdown-rating", score, { high: 90, medium: 75 });

        const vendorOnTime = currentVendorObj.on_time_rate ?? currentVendorObj.on_time_delivery ?? score;
        if (vendorOnTime !== undefined && vendorOnTime !== null) {
          syncOnTimeDeliveryMetrics(vendorOnTime);
        }
      }
    }

    let allOrders = [];
    let poRes = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`);
    if (poRes.ok) {
      allOrders = await poRes.json();
    }

    const localPOs = JSON.parse(localStorage.getItem('supply_custom_replacement_pos') || '[]');
    const existingIds = new Set(allOrders.map(o => o.invoice_no));
    localPOs.forEach(lpo => {
      if (!existingIds.has(lpo.invoice_no)) {
        allOrders.push(lpo);
      }
    });

    cachedOrders = allOrders.filter(o => isVendorMatch(o.vendor_name, vendorName));

    let invRes = await fetchWithRetry(`${API_BASE}/api/v1/invoices`);
    if (invRes.ok) {
      const allInvoices = await invRes.json();
      cachedInvoices = allInvoices.filter(inv => isVendorMatch(inv.vendor_name, vendorName));
    }

    renderDashboardData();
    renderPurchaseOrders();
    renderContractsData();
    renderTransactionsData();
    renderCharts();
    updateVendorChatBadges();
    
    const notifView = document.getElementById('notifications-view');
    if (notifView && notifView.classList.contains('active')) {
      renderVendorNotifications();
    }
  } catch (err) {
    console.error("Error loading vendor data from DB:", err);
  }
}

function renderDashboardData() {
  const pendingOrders = cachedOrders.filter(po => {
    const s = (po.order_status || "").toLowerCase();
    return s.includes("accepted by f.o") || s.includes("accepted by fo") || s === "pending" || s.includes("awaiting");
  });

  const activeOrders = cachedOrders.filter(po => {
    const status = (po.order_status || "").toLowerCase().trim();
    const prodStatus = (po.production_status || "").toLowerCase().trim();

    if (
      status === "pending" ||
      status.includes("pending") ||
      status.includes("awaiting") ||
      status.includes("accepted by f.o") ||
      status.includes("accepted by fo") ||
      status.includes("rejected") || 
      status.includes("returned") ||
      prodStatus.includes("rejected") ||
      prodStatus.includes("returned")
    ) {
      return false;
    }

    return (
      status.includes("accepted by vendor") ||
      status.includes("in production") ||
      status.includes("in transit") ||
      status.includes("delivered") ||
      prodStatus.length > 0
    );
  });

  const onTimePercentage = cachedOnTimeRate !== null ? cachedOnTimeRate : 92;

  const pendingTxns = cachedInvoices.filter(inv => {
    const isRejected = (inv.status && (inv.status.toLowerCase().includes("rejected") || inv.status.toLowerCase().includes("returned"))) ||
                       (inv.order_status && (inv.order_status.toLowerCase().includes("rejected") || inv.order_status.toLowerCase().includes("returned")));
    
    const matchingPO = cachedOrders.find(po => po.invoice_no === inv.invoice_no);
    const poStatus = matchingPO ? (matchingPO.order_status || "").toLowerCase() : "";
    const isAcceptedByBoth = poStatus.includes("accepted by vendor") || poStatus.includes("production") || poStatus.includes("delivered") || poStatus.includes("transit");

    return !isRejected && (isAcceptedByBoth || !matchingPO) && (inv.payment_status === "Unpaid" || !inv.payment_status);
  });

  const activeContractMetric = document.getElementById("metric-active-contracts");
  if (activeContractMetric) activeContractMetric.textContent = activeOrders.length;
  
  const pendingTxnMetric = document.getElementById("metric-pending-txns");
  if (pendingTxnMetric) pendingTxnMetric.textContent = pendingTxns.length;

  syncOnTimeDeliveryMetrics(onTimePercentage);

  const tbody = document.getElementById("pending-orders-body");
  if (!tbody) return;

  tbody.textContent = ''; 

  if (pendingOrders.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No pending order requests awaiting acceptance.</td></tr>';
    return;
  }

  pendingOrders.forEach(po => {
    const tr = document.createElement("tr");
    tr.id = `row-${po.invoice_no}`;
    tr.innerHTML = `
      <td><strong>#${po.invoice_no}</strong></td>
      <td>${po.vendor_name}</td>
      <td>${po.department}</td>
      <td>${po.product_name}</td>
      <td>${po.creation_date}</td>
      <td>${po.expiry_date}</td>
      <td>${po.quantity}</td>
      <td>$${Number(po.total_value || 0).toFixed(2)}</td>
      <td>
        <div class="action-btn-group">
          <button class="btn-accept" onclick="handleVendorAcceptance(${po.id || 1}, 'Accepted by Vendor')">Accept</button>
          <button class="btn-reject" onclick="handleVendorAcceptance(${po.id || 1}, 'Rejected by Vendor')">Reject</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleVendorAcceptance(poId, newStatus) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders/${poId}/status?status=${encodeURIComponent(newStatus)}`, {
      method: 'PUT'
    });
    if (res.ok) {
      alert(`Order status updated to ${newStatus}!`);
      await fetchAllVendorData();
    } else {
      const errData = await res.json().catch(() => ({}));
      alert(`Failed to update order status:\n${formatApiError(errData)}`);
    }
  } catch (err) {
    console.error("Failed to update status:", err);
  }
}

async function reinitiateProduction(poId, invoiceNo) {
  if (!confirm(`Do you want to re-initiate production for PO #${invoiceNo}? This will move the order back to active fulfillment.`)) {
    return;
  }

  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders/${poId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_units: 0, production_status: 'In Production' })
    });

    if (res.ok) {
      alert(`PO #${invoiceNo} has been re-initiated into production.`);
      await fetchAllVendorData();
    } else {
      alert("Failed to re-initiate production.");
    }
  } catch (err) {
    console.error("Error re-initiating production:", err);
    alert("Network error while updating production status.");
  }
}

function renderVendorNotifications() {
  const container = document.getElementById('vendor-notifications-container');
  if (!container) return;

  let allNotifications = [];
  let savedTimestamps = JSON.parse(localStorage.getItem('vendor_notification_timestamps') || '{}');
  let registryUpdated = false;

  cachedOrders.forEach((po) => {
    const status = (po.order_status || "").toLowerCase();
    const invNo = po.invoice_no;

    if (status.includes("accepted by f.o") || status.includes("accepted by fo") || status === "pending") {
      const assignKey = `vendor_notif_${invNo}_received`;
      if (!savedTimestamps[assignKey]) {
        let assignedTime = Date.now();
        if (po.creation_date) {
          const parsedDate = new Date(po.creation_date);
          if (!isNaN(parsedDate.getTime())) {
            const now = new Date();
            parsedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
            assignedTime = parsedDate.getTime();
          }
        }
        savedTimestamps[assignKey] = assignedTime;
        registryUpdated = true;
      }
      const assignTime = savedTimestamps[assignKey];
      const assignFormatted = new Date(assignTime).toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      allNotifications.push({
        timestamp: assignTime,
        html: `
          <div class="notification-item" style="display: flex; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border-color); align-items: flex-start;">
            <div class="notification-icon" style="background: rgba(30, 98, 193, 0.2); color: #1e62c1; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fa-solid fa-cart-shopping"></i></div>
            <div class="notification-body" style="flex: 1;">
              <div class="notification-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 600; color: var(--text-main); font-size: 14px;">New Order Received: #${invNo}</span>
                <span class="notification-time" style="font-size: 12px; color: var(--text-muted);"><i class="fa-regular fa-clock"></i> ${assignFormatted}</span>
              </div>
              <div class="notification-desc" style="font-size: 13px; color: var(--text-body);">Product: ${po.product_name} | Quantity: ${po.quantity} | Total Value: $${Number(po.total_value || 0).toFixed(2)}</div>
            </div>
          </div>
        `
      });
    }
  });

  cachedInvoices.forEach((inv) => {
    const payStatus = (inv.payment_status || "").toLowerCase();
    const invNo = inv.invoice_no;

    if (payStatus === "paid") {
      const payKey = `vendor_notif_${invNo}_paid`;
      if (!savedTimestamps[payKey]) {
        let paymentTime = Date.now();
        if (inv.payment_date) {
          const parsedPay = new Date(inv.payment_date);
          if (!isNaN(parsedPay.getTime())) {
            paymentTime = parsedPay.getTime();
          }
        }
        savedTimestamps[payKey] = paymentTime;
        registryUpdated = true;
      }
      const payTime = savedTimestamps[payKey];
      const payFormatted = new Date(payTime).toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      allNotifications.push({
        timestamp: payTime,
        html: `
          <div class="notification-item" style="display: flex; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border-color); align-items: flex-start;">
            <div class="notification-icon" style="background: rgba(34, 84, 61, 0.2); color: #22543d; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fa-solid fa-receipt"></i></div>
            <div class="notification-body" style="flex: 1;">
              <div class="notification-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 600; color: var(--text-main); font-size: 14px;">Payment Received from F.O.: #${invNo}</span>
                <span class="notification-time" style="font-size: 12px; color: var(--text-muted);"><i class="fa-regular fa-clock"></i> ${payFormatted}</span>
              </div>
              <div class="notification-desc" style="font-size: 13px; color: var(--text-body);">Amount Paid: $${Number(inv.amount || 0).toFixed(2)} | Transaction ID: ${inv.transaction_id || 'N/A'}</div>
            </div>
          </div>
        `
      });
    }
  });

  if (registryUpdated) {
    localStorage.setItem('vendor_notification_timestamps', JSON.stringify(savedTimestamps));
  }

  allNotifications.sort((a, b) => b.timestamp - a.timestamp);

  if (allNotifications.length === 0) {
    container.innerHTML = '<div style="text-align:center; color: var(--text-muted); padding: 2rem;">No new order or payment notifications available.</div>';
  } else {
    container.innerHTML = allNotifications.map(n => n.html).join('');
  }
}

function renderPurchaseOrders() {
  const tbody = document.getElementById("po-table-body");
  if (!tbody) return;

  tbody.textContent = ''; 

  const activeOrders = cachedOrders.filter(po => {
    const orderStatus = (po.order_status || "").toLowerCase().trim();
    const prodStatus = (po.production_status || "").toLowerCase().trim();

    if (orderStatus.includes("rejected") || orderStatus.includes("returned") || prodStatus.includes("rejected") || prodStatus.includes("returned")) {
      return false;
    }

    return true;
  });

  if (activeOrders.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="10">No active purchase orders found for your vendor profile.</td></tr>';
    return;
  }

  activeOrders.forEach(po => {
    const tr = document.createElement("tr");
    const currentStatus = po.production_status || po.order_status || "In Production";
    const statusClass = getStatusClass(currentStatus);
    const completedUnits = po.completed_units !== undefined && po.completed_units !== null ? po.completed_units : 0;

    tr.innerHTML = `
      <td><strong>#${po.invoice_no}</strong></td>
      <td>${po.vendor_name}</td>
      <td>${po.department}</td>
      <td>${po.product_name}</td>
      <td>${po.creation_date}</td>
      <td>${po.expiry_date}</td>
      <td>${completedUnits} / ${po.quantity}</td>
      <td>$${Number(po.total_value || 0).toFixed(2)}</td>
      <td><span class="status ${statusClass}">${currentStatus}</span></td>
      <td>
        <button class="btn-action" onclick="openEditModal(${po.id || 1})"><i class="fa-solid fa-pen-to-square"></i> Edit Progress</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function exportPurchaseOrders() {
  const activeOrders = cachedOrders.filter(po => {
    const orderStatus = (po.order_status || "").toLowerCase().trim();
    const prodStatus = (po.production_status || "").toLowerCase().trim();

    if (orderStatus.includes("rejected") || orderStatus.includes("returned") || prodStatus.includes("rejected") || prodStatus.includes("returned")) {
      return false;
    }

    return true;
  });

  if (activeOrders.length === 0) {
    alert("No purchase orders available to export.");
    return;
  }

  const headers = ["PO Ref", "Vendor", "Dept", "Product", "Creation", "Expiry", "Units Completed", "Total Value", "Status"];
  const rows = activeOrders.map(po => {
    const completedUnits = po.completed_units !== undefined && po.completed_units !== null ? po.completed_units : 0;
    const status = po.production_status || po.order_status || "In Production";
    
    return [
      `"#${po.invoice_no || ''}"`,
      `"${(po.vendor_name || "").replace(/"/g, '""')}"`,
      `"${(po.department || "").replace(/"/g, '""')}"`,
      `"${(po.product_name || "").replace(/"/g, '""')}"`,
      `"${po.creation_date || ''}"`,
      `"${po.expiry_date || ''}"`,
      `"${completedUnits} / ${po.quantity || 0}"`,
      `"$${Number(po.total_value || 0).toFixed(2)}"`,
      `"${status.replace(/"/g, '""')}"`
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "active_purchase_orders.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportTransactions() {
  if (!cachedInvoices || cachedInvoices.length === 0) {
    alert("No payment transactions available to export.");
    return;
  }

  const headers = ["PO Ref", "Vendor", "Product", "Payment Status", "Transaction ID"];
  const rows = cachedInvoices.map(inv => {
    const paymentStatus = inv.payment_status || 'Unpaid';
    const txnId = inv.transaction_id || 'N/A';
    
    return [
      `"#${inv.invoice_no || ''}"`,
      `"${(inv.vendor_name || "").replace(/"/g, '""')}"`,
      `"${(inv.product_name || "").replace(/"/g, '""')}"`,
      `"${paymentStatus.replace(/"/g, '""')}"`,
      `"${txnId.replace(/"/g, '""')}"`
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "payment_transactions.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getStatusClass(status) {
  if (!status) return 'in-production';
  const s = status.toLowerCase();
  if (s.includes('delivered')) return 'delivered';
  if (s.includes('delay')) return 'delayed';
  if (s.includes('transit')) return 'in-transit';
  if (s.includes('ready')) return 'ready-dispatch';
  if (s.includes('quality')) return 'quality-check';
  if (s.includes('accepted') || s.includes('approved')) return 'active';
  if (s.includes('reject')) return 'rejected';
  if (s.includes('return')) return 'returned';
  return 'in-production';
}

function openEditModal(poId) {
  const po = cachedOrders.find(o => o.id === poId);
  if (!po) return;

  document.getElementById("modal-po-id").value = po.id;
  document.getElementById("modal-invNo").textContent = `#${po.invoice_no}`;
  document.getElementById("modal-amount").textContent = `$${Number(po.total_value || 0).toFixed(2)}`;
  document.getElementById("modal-company").textContent = po.vendor_name;
  document.getElementById("modal-dept").textContent = po.department;
  document.getElementById("modal-product").textContent = po.product_name;
  document.getElementById("modal-orderDate").textContent = po.creation_date;
  document.getElementById("modal-expiryDate").textContent = po.expiry_date;
  document.getElementById("modal-total-units").textContent = po.quantity;
  document.getElementById("modal-input-completed").value = po.completed_units || 0;
  document.getElementById("modal-select-status").value = po.production_status || po.order_status || "In Production";

  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "flex";
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "none";
}

async function saveOrderChangesDB() {
  const poId = document.getElementById("modal-po-id").value;
  const newCompleted = parseInt(document.getElementById('modal-input-completed').value, 10) || 0;
  const newStatus = document.getElementById('modal-select-status').value;

  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders/${poId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_units: newCompleted, production_status: newStatus })
    });

    if (res.ok) {
      alert("Progress saved successfully!");
      closeEditModal();
      await fetchAllVendorData();
    } else {
      const errData = await res.json().catch(() => ({}));
      alert(`Failed to update progress:\n${formatApiError(errData)}`);
    }
  } catch (err) {
    console.error("Error saving progress:", err);
  }
}

function renderContractsData() {
  const activeTbody = document.getElementById("active-contracts-body");
  const completedTbody = document.getElementById("completed-contracts-body");
  const expiredTbody = document.getElementById("expired-contracts-body");
  const rejectedTbody = document.getElementById("rejected-contracts-body");

  const validOrders = cachedOrders.filter(o => {
    const s = (o.order_status || "").toLowerCase();
    const ps = (o.production_status || "").toLowerCase();
    return !s.includes("rejected") && !s.includes("returned") && !ps.includes("rejected") && !ps.includes("returned");
  });
  
  const rejectedOrders = cachedOrders.filter(o => {
    const s = (o.order_status || "").toLowerCase();
    const ps = (o.production_status || "").toLowerCase();
    return s.includes("rejected") || s.includes("returned") || ps.includes("rejected") || ps.includes("returned");
  });

  let activeList = [];
  let completedList = [];
  let expiredList = [];

  validOrders.forEach(o => {
    const currentStatusText = o.production_status || o.order_status;
    const statusObj = determineContractStatus(o.expiry_date, currentStatusText);
    
    if (statusObj.label === 'Completed') {
      completedList.push({ order: o, status: statusObj });
    } else if (statusObj.label === 'Expired') {
      expiredList.push({ order: o, status: statusObj });
    } else {
      activeList.push({ order: o, status: statusObj });
    }
  });

  if (activeTbody) {
    activeTbody.innerHTML = activeList.length === 0 
      ? '<tr class="empty-row"><td colspan="8">No active contracts found for your account.</td></tr>' 
      : activeList.map(item => `
        <tr>
          <td><strong>#${item.order.invoice_no}</strong></td>
          <td>${item.order.vendor_name}</td>
          <td>${item.order.product_name}</td>
          <td>${item.order.creation_date}</td>
          <td>${item.order.expiry_date}</td>
          <td>$${Number(item.order.total_value || 0).toFixed(2)}</td>
          <td><span class="${item.status.class}">${item.status.label}</span></td>
          <td><button class="btn-action" onclick="showContractDetails('${item.order.invoice_no}')">Details</button></td>
        </tr>`).join('');
  }

  if (completedTbody) {
    completedTbody.innerHTML = completedList.length === 0 
      ? '<tr class="empty-row"><td colspan="8">No completed contracts recorded.</td></tr>' 
      : completedList.map(item => `
        <tr>
          <td><strong>#${item.order.invoice_no}</strong></td>
          <td>${item.order.vendor_name}</td>
          <td>${item.order.product_name}</td>
          <td>${item.order.creation_date}</td>
          <td>${item.order.expiry_date}</td>
          <td>$${Number(item.order.total_value || 0).toFixed(2)}</td>
          <td><span class="${item.status.class}">${item.status.label}</span></td>
          <td><button class="btn-action" onclick="showContractDetails('${item.order.invoice_no}')">Details</button></td>
        </tr>`).join('');
  }

  if (expiredTbody) {
    expiredTbody.innerHTML = expiredList.length === 0 
      ? '<tr class="empty-row"><td colspan="8">No expired contracts recorded.</td></tr>' 
      : expiredList.map(item => `
        <tr>
          <td><strong>#${item.order.invoice_no}</strong></td>
          <td>${item.order.vendor_name}</td>
          <td>${item.order.product_name}</td>
          <td>${item.order.creation_date}</td>
          <td>${item.order.expiry_date}</td>
          <td>$${Number(item.order.total_value || 0).toFixed(2)}</td>
          <td><span class="${item.status.class}">${item.status.label}</span></td>
          <td><button class="btn-action" onclick="showContractDetails('${item.order.invoice_no}')">Details</button></td>
        </tr>`).join('');
  }

  if (rejectedTbody) {
    rejectedTbody.innerHTML = rejectedOrders.length === 0 
      ? '<tr class="empty-row"><td colspan="8">No rejected or returned contracts recorded.</td></tr>' 
      : rejectedOrders.map(o => {
        const orderStatusText = (o.order_status || "").toLowerCase();
        const prodStatusText = (o.production_status || "").toLowerCase();
        const isReturned = orderStatusText.includes("returned") || prodStatusText.includes("returned");
        
        const statusLabel = isReturned ? "Returned" : "Rejected";
        const badgeClass = isReturned ? "status returned" : "status rejected";

        return `
        <tr>
          <td><strong>#${o.invoice_no}</strong></td>
          <td>${o.vendor_name}</td>
          <td>${o.product_name}</td>
          <td>${o.creation_date}</td>
          <td>${o.expiry_date}</td>
          <td>$${Number(o.total_value || 0).toFixed(2)}</td>
          <td><span class="${badgeClass}">${statusLabel}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn-action" onclick="showContractDetails('${o.invoice_no}')">Details</button>
              ${isReturned ? `<button class="btn-accept" style="padding: 6px 12px; font-size: 11px;" onclick="reinitiateProduction(${o.id || 1}, '${o.invoice_no}')">Re-initiate</button>` : ''}
            </div>
          </td>
        </tr>`;
      }).join('');
  }
}

function showContractDetails(invNo) {
  const order = cachedOrders.find(o => o.invoice_no === invNo);
  if (!order) return;

  document.getElementById("contract-modal-invno").textContent = `#${order.invoice_no}`;
  document.getElementById("contract-modal-amount").textContent = `$${Number(order.total_value || 0).toFixed(2)}`;
  document.getElementById("contract-modal-company").textContent = order.vendor_name;
  document.getElementById("contract-modal-dept").textContent = order.department;
  document.getElementById("contract-modal-units").textContent = order.quantity;
  document.getElementById("contract-modal-status").textContent = order.production_status || order.order_status;
  document.getElementById("contract-modal-product").textContent = order.product_name;
  document.getElementById("contract-modal-date").textContent = order.creation_date;
  document.getElementById("contract-modal-expiry").textContent = order.expiry_date;

  document.getElementById("contractDetailsModal").style.display = "flex";
}

function closeContractDetailsModal() {
  document.getElementById("contractDetailsModal").style.display = "none";
}

function renderTransactionsData() {
  const tbody = document.getElementById("transactions-table-body");
  if (!tbody) return;

  tbody.textContent = ''; 

  tbody.innerHTML = cachedInvoices.length === 0 
    ? '<tr class="empty-row"><td colspan="6">No payment transactions available for accepted orders.</td></tr>'
    : cachedInvoices.map(inv => `
      <tr>
        <td><strong>#${inv.invoice_no}</strong></td>
        <td>${inv.vendor_name}</td>
        <td>${inv.product_name}</td>
        <td><span class="status ${inv.payment_status === 'Paid' ? 'payment-received' : 'payment-pending'}">${inv.payment_status || 'Unpaid'}</span></td>
        <td><strong style="font-family: monospace; color: #2b6cb0;">${inv.transaction_id || 'N/A'}</strong></td>
        <td><button class="btn-action" onclick="showTransactionDetails('${inv.invoice_no}')"><i class="fa-solid fa-eye"></i> Details</button></td>
      </tr>`).join('');
}

function showTransactionDetails(invNo) {
  const inv = cachedInvoices.find(i => i.invoice_no === invNo);
  if (!inv) return;

  document.getElementById("txn-modal-id").textContent = inv.transaction_id || "PENDING PAYMENT";
  document.getElementById("txn-modal-amount").textContent = `$${Number(inv.amount || 0).toFixed(2)}`;
  document.getElementById("txn-modal-time").textContent = inv.payment_date || new Date().toLocaleString();
  document.getElementById("txn-modal-sender").textContent = "Finance Department";
  document.getElementById("txn-modal-receiver").textContent = inv.vendor_name;

  document.getElementById("transactionDetailsModal").style.display = "flex";
}

function closeTransactionDetailsModal() {
  document.getElementById("transactionDetailsModal").style.display = "none";
}

async function loadVendorProfile() {
  const vendorName = sessionStorage.getItem("vendor_name");
  if (document.getElementById("setting-vendor-name")) {
    document.getElementById("setting-vendor-name").value = vendorName || "";
  }

  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/vendors`);
    if (!res.ok) return;
    const vendors = await res.json();

    const currentVendor = vendors.find(v => isVendorMatch(v.vendor_name, vendorName));

    if (currentVendor) {
      if (currentVendor.id) sessionStorage.getItem("vendor_id_pk", currentVendor.id);
      if (document.getElementById("setting-contact-email")) {
        document.getElementById("setting-contact-email").value = currentVendor.email || "";
      }
      if (document.getElementById("setting-contact-phone")) {
        document.getElementById("setting-contact-phone").value = currentVendor.phone || "";
      }
      if (document.getElementById("setting-active-status")) {
        document.getElementById("setting-active-status").value = currentVendor.status || "Accepting Orders";
      }
      if (document.getElementById("setting-vendor-category")) {
        document.getElementById("setting-vendor-category").value = currentVendor.category || "IT Vendors";
      }
    }
  } catch (err) {
    console.error("Error loading vendor profile details from DB:", err);
  }
}

async function saveProfileSettings(e) {
  if (e) e.preventDefault();
  
  const vendorId = sessionStorage.getItem("vendor_id_pk");
  const vendorName = document.getElementById("setting-vendor-name")?.value || sessionStorage.getItem("vendor_name");
  const email = document.getElementById("setting-contact-email")?.value || "";
  const phone = document.getElementById("setting-contact-phone")?.value || "";
  const status = document.getElementById("setting-active-status")?.value || "";
  const category = document.getElementById("setting-vendor-category")?.value || "";

  const payload = {
    vendor_name: vendorName,
    email: email,
    phone: phone,
    status: status,
    category: category
  };

  try {
    const endpoint = vendorId ? `${API_BASE}/api/v1/vendors/${vendorId}` : `${API_BASE}/api/v1/vendors/profile`;

    let res = await fetchWithRetry(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 404 && vendorId) {
      res = await fetchWithRetry(`${API_BASE}/api/v1/vendors/${vendorId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      if (vendorName) {
        sessionStorage.setItem("vendor_name", vendorName);
        localStorage.setItem("vendor_name", vendorName);
      }
      alert("Vendor profile settings saved successfully!");
      await fetchAllVendorData();
    } else {
      const errData = await res.json().catch(() => ({}));
      alert(`Validation Error:\n${formatApiError(errData)}`);
    }
  } catch (err) {
    console.error("Error saving profile settings:", err);
    alert("Network error while saving settings.");
  }
}

// --- Vendor Communication Portal Role-Based Chat Handlers with Unread Badges ---
function selectVendorChatRole(roleName) {
  activeVendorChatRole = roleName;
  
  const vendorName = sessionStorage.getItem("vendor_name") || "Vendor";
  localStorage.setItem(`vendor_unread_${vendorName}_${roleName}`, "0");
  const storageKey = `vendor_chat_${vendorName}_${roleName}`;
  const messages = JSON.parse(localStorage.getItem(storageKey) || "[]");
  lastKnownVendorMessageCounts[roleName] = messages.length;

  updateVendorChatBadges();

  const titleEl = document.getElementById("vendor-active-chat-title");
  const subEl = document.getElementById("vendor-active-chat-sub");
  if (titleEl) titleEl.textContent = `Chat with ${roleName}`;
  if (subEl) subEl.textContent = `Direct secure communication channel`;

  const supplyCard = document.getElementById("contact-supply-chain");
  const financeCard = document.getElementById("contact-finance-officer");

  if (supplyCard && financeCard) {
    if (roleName === 'Supply Chain Manager') {
      supplyCard.style.background = 'rgba(139, 92, 246, 0.2)';
      supplyCard.style.borderColor = '#8b5cf6';
      financeCard.style.background = 'var(--input-bg)';
      financeCard.style.borderColor = 'var(--border-color)';
    } else {
      financeCard.style.background = 'rgba(16, 185, 129, 0.2)';
      financeCard.style.borderColor = '#10b981';
      supplyCard.style.background = 'var(--input-bg)';
      supplyCard.style.borderColor = 'var(--border-color)';
    }
  }

  loadVendorPortalMessages();
}

function updateVendorChatBadges() {
  const vendorName = sessionStorage.getItem("vendor_name") || "Vendor";
  const roles = ["Supply Chain Manager", "Finance Officer"];

  roles.forEach(roleName => {
    const storageKey = `vendor_chat_${vendorName}_${roleName}`;
    const messages = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const totalMsgs = messages.length;

    if (totalMsgs > lastKnownVendorMessageCounts[roleName]) {
      const diff = totalMsgs - lastKnownVendorMessageCounts[roleName];
      lastKnownVendorMessageCounts[roleName] = totalMsgs;

      if (activeVendorChatRole !== roleName) {
        const unreadKey = `vendor_unread_${vendorName}_${roleName}`;
        let currentUnread = parseInt(localStorage.getItem(unreadKey) || "0", 10);
        localStorage.setItem(unreadKey, currentUnread + diff);
      }
    }
  });

  const supplyUnread = parseInt(localStorage.getItem(`vendor_unread_${vendorName}_Supply Chain Manager`) || "0", 10);
  const financeUnread = parseInt(localStorage.getItem(`vendor_unread_${vendorName}_Finance Officer`) || "0", 10);

  const supplyBadge = document.getElementById("badge-supply-chain");
  const financeBadge = document.getElementById("badge-finance-officer");

  if (supplyBadge) {
    if (supplyUnread > 0 && activeVendorChatRole !== 'Supply Chain Manager') {
      supplyBadge.style.display = 'inline-block';
      supplyBadge.textContent = supplyUnread > 9 ? '9+' : supplyUnread;
    } else {
      supplyBadge.style.display = 'none';
    }
  }

  if (financeBadge) {
    if (financeUnread > 0 && activeVendorChatRole !== 'Finance Officer') {
      financeBadge.style.display = 'inline-block';
      financeBadge.textContent = financeUnread > 9 ? '9+' : financeUnread;
    } else {
      financeBadge.style.display = 'none';
    }
  }
}

function clearVendorChat() {
  if (!activeVendorChatRole) {
    alert("Please select a department contact first.");
    return;
  }
  
  const vendorName = sessionStorage.getItem("vendor_name") || "Vendor";
  if (confirm(`Are you sure you want to clear the chat history with ${activeVendorChatRole}?`)) {
    const storageKey = `vendor_chat_${vendorName}_${activeVendorChatRole}`;
    localStorage.removeItem(storageKey);

    if (activeVendorChatRole === 'Supply Chain Manager') {
      localStorage.removeItem(`supply_chain_chat_${vendorName}`);
    } else if (activeVendorChatRole === 'Finance Officer') {
      localStorage.removeItem(`finance_chain_chat_${vendorName}`);
    }

    localStorage.setItem(`vendor_unread_${vendorName}_${activeVendorChatRole}`, "0");
    lastKnownVendorMessageCounts[activeVendorChatRole] = 0;
    loadVendorPortalMessages();
    updateVendorChatBadges();
  }
}

function loadVendorPortalMessages() {
  const container = document.getElementById("vendor-chat-messages-container");
  if (!container) return;

  if (!activeVendorChatRole) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 2rem;">
        <i class="fa-regular fa-comments" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p style="font-size: 14px;">Please select either Supply Chain Manager or Finance Officer from the right panel.</p>
      </div>
    `;
    return;
  }

  const vendorName = sessionStorage.getItem("vendor_name") || "Vendor";
  const storageKey = `vendor_chat_${vendorName}_${activeVendorChatRole}`;
  const savedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");

  let historyHTML = `
    <div style="display: flex; flex-direction: column; align-items: flex-start; max-width: 80%;">
      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; padding-left: 4px;">System Desk • Secure Channel</div>
      <div style="background: var(--input-bg); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: 16px; border-top-left-radius: 4px; font-size: 14px; color: var(--text-main); line-height: 1.5;">
        Secure conversation started with <strong>${activeVendorChatRole}</strong>.
      </div>
    </div>
  `;

  savedMessages.forEach(msg => {
    const timeFormatted = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (msg.sender === 'vendor') {
      historyHTML += `
        <div style="display: flex; flex-direction: column; align-items: flex-end; align-self: flex-end; max-width: 80%;">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; padding-right: 4px;">You • ${timeFormatted}</div>
          <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.85), rgba(236, 72, 153, 0.85)); color: #ffffff; padding: 12px 16px; border-radius: 16px; border-top-right-radius: 4px; font-size: 14px; line-height: 1.5; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);">
            ${escapeHtml(msg.text)}
          </div>
        </div>
      `;
    } else {
      historyHTML += `
        <div style="display: flex; flex-direction: column; align-items: flex-start; max-width: 80%;">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; padding-left: 4px;">${activeVendorChatRole} • ${timeFormatted}</div>
          <div style="background: var(--input-bg); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: 16px; border-top-left-radius: 4px; font-size: 14px; color: var(--text-main); line-height: 1.5;">
            ${escapeHtml(msg.text)}
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = historyHTML;
  container.scrollTop = container.scrollHeight;
}

function sendVendorPortalMessage(event) {
  if (event) event.preventDefault();
  if (!activeVendorChatRole) {
    alert("Please select a department contact (Supply Chain Manager or Finance Officer) first.");
    return;
  }

  const inputEl = document.getElementById("vendor-chat-input-message");
  if (!inputEl) return;

  const text = inputEl.value.trim();
  if (!text) return;

  const vendorName = sessionStorage.getItem("vendor_name") || "Vendor";
  const storageKey = `vendor_chat_${vendorName}_${activeVendorChatRole}`;
  let savedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");

  const newMsg = { sender: 'vendor', text, timestamp: Date.now() };
  savedMessages.push(newMsg);
  localStorage.setItem(storageKey, JSON.stringify(savedMessages));

  if (activeVendorChatRole === 'Supply Chain Manager') {
    const supplyKey = `supply_chain_chat_${vendorName}`;
    let supplyChatHistory = JSON.parse(localStorage.getItem(supplyKey) || "[]");
    supplyChatHistory.push({ sender: 'vendor', senderName: vendorName, text, timestamp: Date.now() });
    localStorage.setItem(supplyKey, JSON.stringify(supplyChatHistory));
  } else if (activeVendorChatRole === 'Finance Officer') {
    const financeKey = `finance_chain_chat_${vendorName}`;
    let financeChatHistory = JSON.parse(localStorage.getItem(financeKey) || "[]");
    financeChatHistory.push({ sender: 'vendor', senderName: vendorName, text, timestamp: Date.now() });
    localStorage.setItem(financeKey, JSON.stringify(financeChatHistory));
  }

  lastKnownVendorMessageCounts[activeVendorChatRole] = savedMessages.length;

  inputEl.value = "";
  loadVendorPortalMessages();
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function updateDynamicAnalytics() {
  if (!cachedOrders || cachedOrders.length === 0) return;

  let totalOrders = cachedOrders.length;
  let onTimeCount = 0;
  let totalAcceptanceDelayHours = 0;
  let acceptedOrdersCount = 0;

  cachedOrders.forEach(po => {
    if (po.expiry_date) {
      const expiry = new Date(po.expiry_date.split('T')[0]);
      const checkDate = po.actual_delivery_date ? new Date(po.actual_delivery_date.split('T')[0]) : new Date();
      if (checkDate <= expiry) {
        onTimeCount++;
      }
    } else {
      onTimeCount++;
    }

    if (po.creation_date) {
      const created = new Date(po.creation_date);
      if (!isNaN(created.getTime())) {
        totalAcceptanceDelayHours += 2.4;
        acceptedOrdersCount++;
      }
    }
  });

  const slaRate = Math.round((onTimeCount / totalOrders) * 100);
  const avgHours = acceptedOrdersCount > 0 ? (totalAcceptanceDelayHours / acceptedOrdersCount).toFixed(1) : "1.5";

  const slaTextEl = document.getElementById("dyn-sla-rate");
  const slaBarEl = document.getElementById("dyn-sla-bar");
  const responseEl = document.getElementById("dyn-response-time");

  if (slaTextEl) {
    slaTextEl.textContent = `${slaRate}%`;
    if (slaRate >= 90) slaTextEl.style.color = '#10b981';
    else if (slaRate >= 75) slaTextEl.style.color = '#f59e0b';
    else slaTextEl.style.color = '#ef4444';
  }

  if (slaBarEl) {
    slaBarEl.style.width = `${slaRate}%`;
    slaBarEl.style.background = slaRate >= 90 ? '#10b981' : (slaRate >= 75 ? '#f59e0b' : '#ef4444');
  }

  if (responseEl) {
    responseEl.textContent = `${avgHours} hours avg.`;
  }

  const currentMetricText = document.getElementById("metric-reliability")?.textContent || "94%";
  const activeScore = parseInt(currentMetricText.replace(/\D/g, ''), 10) || 94;

  const benchOnTimeEl = document.getElementById("dyn-benchmark-ontime");
  const benchRelEl = document.getElementById("dyn-benchmark-reliability");
  const benchBadgeEl = document.getElementById("benchmark-status-badge");

  if (benchOnTimeEl) {
    benchOnTimeEl.textContent = `${slaRate}%`;
    benchOnTimeEl.style.color = slaRate >= 82 ? '#10b981' : '#ef4444';
  }

  if (benchRelEl) {
    benchRelEl.textContent = `${activeScore}%`;
    benchRelEl.style.color = activeScore >= 88 ? '#10b981' : '#ef4444';
  }

  if (benchBadgeEl) {
    if (slaRate >= 82 && activeScore >= 88) {
      benchBadgeEl.textContent = "Performing Above Category Average";
      benchBadgeEl.style.background = "rgba(16, 185, 129, 0.15)";
      benchBadgeEl.style.color = "#10b981";
      benchBadgeEl.style.borderColor = "rgba(16, 185, 129, 0.3)";
    } else {
      benchBadgeEl.textContent = "Meeting Category Benchmarks";
      benchBadgeEl.style.background = "rgba(59, 130, 246, 0.15)";
      benchBadgeEl.style.color = "#3b82f6";
      benchBadgeEl.style.borderColor = "rgba(59, 130, 246, 0.3)";
    }
  }
}

function renderCharts() {
  syncOnTimeDeliveryMetrics();

  const trendCtx = document.getElementById('performanceTrendChart')?.getContext('2d');
  const qualityCtx = document.getElementById('qualityPieChart')?.getContext('2d');
  const orderStatusCtx = document.getElementById('orderStatusColumnChart')?.getContext('2d');
  const deptBarCtx = document.getElementById('deptVolumeBarChart')?.getContext('2d');

  const currentMetricText = document.getElementById("metric-reliability")?.textContent || "94%";
  const activeScore = parseInt(currentMetricText.replace(/\D/g, ''), 10) || 94;

  const reliabilityValues = [
    activeScore - 4, 
    activeScore - 2, 
    activeScore - 3, 
    activeScore - 1, 
    activeScore, 
    activeScore
  ];

  if (trendCtx) {
    if (trendChartInstance) {
      trendChartInstance.data.datasets[0].data = reliabilityValues;
      trendChartInstance.update();
    } else {
      trendChartInstance = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
          datasets: [{ 
            label: 'Reliability Score (%)', 
            data: reliabilityValues, 
            borderColor: '#8b5cf6', 
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          animation: false,
          plugins: { legend: { display: true, position: 'top' } }
        }
      });
    }
  }

  let passedCount = 0;
  let progressCount = 0;
  let faultCount = 0;

  cachedInvoices.forEach(inv => {
    const status = (inv.inspection_status || inv.quality_status || "").toLowerCase();
    if (status.includes('check') || status.includes('pass')) {
      passedCount++;
    } else if (status.includes('fault') || status.includes('fail')) {
      faultCount++;
    } else {
      progressCount++;
    }
  });

  if (passedCount === 0 && progressCount === 0 && faultCount === 0) {
    passedCount = cachedOrders.length > 0 ? cachedOrders.length : 1;
  }

  syncQualityAssuranceMetrics(passedCount, progressCount, faultCount);

  if (qualityCtx) {
    if (qualityChartInstance) {
      qualityChartInstance.data.datasets[0].data = [passedCount, progressCount, faultCount];
      qualityChartInstance.update();
    } else {
      qualityChartInstance = new Chart(qualityCtx, {
        type: 'doughnut',
        data: { 
          labels: ['Passed Quality', 'In Progress', 'Defect Flagged'], 
          datasets: [{ 
            data: [passedCount, progressCount, faultCount], 
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] 
          }] 
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          animation: false,
          plugins: { legend: { display: true, position: 'bottom' } }
        }
      });
    }
  }

  let deliveredOrders = 0;
  let inProductionOrders = 0;
  let transitOrders = 0;
  let pendingOrdersCount = 0;

  cachedOrders.forEach(po => {
    const status = (po.production_status || po.order_status || "").toLowerCase();
    if (status.includes('delivered')) deliveredOrders++;
    else if (status.includes('transit')) transitOrders++;
    else if (status.includes('pending') || status.includes('awaiting')) pendingOrdersCount++;
    else inProductionOrders++;
  });

  if (orderStatusCtx) {
    if (orderStatusChartInstance) {
      orderStatusChartInstance.data.datasets[0].data = [deliveredOrders, inProductionOrders, transitOrders, pendingOrdersCount];
      orderStatusChartInstance.update();
    } else {
      orderStatusChartInstance = new Chart(orderStatusCtx, {
        type: 'bar',
        data: {
          labels: ['Delivered', 'In Production', 'In Transit', 'Pending'],
          datasets: [{
            label: 'Orders Count',
            data: [deliveredOrders, inProductionOrders, transitOrders, pendingOrdersCount],
            backgroundColor: '#3b82f6',
            borderRadius: 6
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          animation: false,
          plugins: { legend: { display: true, position: 'top' } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }
  }

  const deptCounts = {};
  cachedOrders.forEach(po => {
    const dept = po.department || 'General';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const deptLabels = Object.keys(deptCounts).length > 0 ? Object.keys(deptCounts) : ['No Departments'];
  const deptDataValues = Object.keys(deptCounts).length > 0 ? Object.values(deptCounts) : [0];

  const isDarkMode = document.body.classList.contains('dark-mode');
  const radarGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
  const radarTextColor = isDarkMode ? '#94a3b8' : '#64748b';

  if (deptBarCtx) {
    if (deptBarChartInstance) {
      deptBarChartInstance.data.labels = deptLabels;
      deptBarChartInstance.data.datasets[0].data = deptDataValues;
      deptBarChartInstance.options.scales.r.grid.color = radarGridColor;
      deptBarChartInstance.options.scales.r.angleLines.color = radarGridColor;
      deptBarChartInstance.options.scales.r.pointLabels.color = radarTextColor;
      deptBarChartInstance.update();
    } else {
      deptBarChartInstance = new Chart(deptBarCtx, {
        type: 'radar',
        data: {
          labels: deptLabels,
          datasets: [{
            label: 'Order Volumes by Department',
            data: deptDataValues,
            backgroundColor: 'rgba(139, 92, 246, 0.25)',
            borderColor: '#8b5cf6',
            pointBackgroundColor: '#8b5cf6',
            pointBorderColor: '#ffffff',
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#8b5cf6',
            borderWidth: 2
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          animation: false,
          plugins: { 
            legend: { 
              display: true, 
              position: 'top',
              labels: { boxWidth: 12, padding: 16, color: isDarkMode ? '#f8fafc' : '#0f172a' }
            } 
          },
          scales: { 
            r: { 
              beginAtZero: true,
              ticks: { precision: 0, backdropColor: 'transparent', color: radarTextColor },
              pointLabels: { font: { size: 12, weight: '600' }, color: radarTextColor },
              grid: { color: radarGridColor },
              angleLines: { color: radarGridColor }
            } 
          }
        }
      });
    }
  }

  updateDynamicAnalytics();
}

window.addEventListener('DOMContentLoaded', () => {
  verifyVendorSession();
});

setInterval(() => {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (currentUserId) {
    fetchWithRetry(`${API_BASE}/users/verify/${currentUserId}`).catch(() => {});
  }
}, 3000);

window.addEventListener('beforeunload', () => {
  const userId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (userId) {
    fetchWithRetry(`${API_BASE}/api/v1/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: parseInt(userId) }),
      keepalive: true
    }).catch(() => {});
  }
});

setInterval(() => {
  const vName = sessionStorage.getItem("vendor_name");
  if (vName) {
    fetchAllVendorData(vName).then(() => {
      const reliabilityView = document.getElementById("reliability-view");
      if (reliabilityView && reliabilityView.classList.contains("active")) {
        renderCharts();
      }
      const notifView = document.getElementById("notifications-view");
      if (notifView && notifView.classList.contains("active")) {
        renderVendorNotifications();
      }
      const commView = document.getElementById("communication-view");
      if (commView && commView.classList.contains("active")) {
        loadVendorPortalMessages();
        updateVendorChatBadges();
      }
    }).catch(err => console.error("Vendor background poll error:", err));
  }
}, 3000);
