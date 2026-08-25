const API_BASE = "http://127.0.0.1:8000";
let cachedOrders = [];
let cachedInvoices = [];
let cachedOnTimeRate = null; // Persistent store for synced delivery metric
let trendChartInstance = null;
let qualityChartInstance = null;

// --- Helper: Format API/FastAPI Pydantic Error Objects into Readable Strings ---
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

// --- Helper: Flexible String Matcher to Prevent Empty Data Matches ---
function isVendorMatch(targetVendor, currentVendor) {
  if (!targetVendor || !currentVendor) return false;
  const a = targetVendor.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = currentVendor.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return a === b || a.includes(b) || b.includes(a);
}

// --- Helper: Centralized Quality Assurance Metric Synchronizer ---
function syncQualityAssuranceMetrics(passedCount, progressCount, faultCount) {
  const totalEvaluated = passedCount + progressCount + faultCount;
  const qaPercentage = totalEvaluated > 0 ? Math.round((passedCount / totalEvaluated) * 100) : 100;
  const formattedRate = `${qaPercentage}%`;
  const subtextText = `${faultCount} Defect Flag${faultCount === 1 ? '' : 's'}`;

  // 1. Direct ID updates
  const targetIds = [
    "metric-quality-assurance",
    "breakdown-quality",
    "quality-assurance-val",
    "metric-quality",
    "quality-score"
  ];

  targetIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = formattedRate;
  });

  // 2. Class selector updates
  document.querySelectorAll(".quality-rate-display, .quality-metric, .quality-value").forEach(el => {
    el.textContent = formattedRate;
  });

  // 3. Smart DOM traversal fallback (searches any card header labeled "Quality Assurance")
  const labels = document.querySelectorAll("h1, h2, h3, h4, h5, h6, div, span, p, label, .subtext, .metric-label");
  labels.forEach(el => {
    const txt = el.textContent ? el.textContent.trim().toLowerCase() : "";
    if (txt === "quality assurance" || txt.startsWith("quality assurance")) {
      const cardContainer = el.closest(".metric-card, .card, .stat-card, div") || el.parentElement;
      if (cardContainer) {
        // Find main percentage metric display text element within this card
        const valEl = cardContainer.querySelector(".metric-value, .value, .number, h2, h3, strong") ||
          Array.from(cardContainer.querySelectorAll("div, span, p, h2, h3")).find(node => 
            node !== el && (node.textContent.includes("%") || /^\d+/.test(node.textContent.trim()))
          );

        if (valEl) {
          valEl.textContent = formattedRate;
        }

        // Find subtext element to update defect count
        const subEl = cardContainer.querySelector(".subtext, .card-subtext, p, span.sub") ||
          Array.from(cardContainer.querySelectorAll("div, span, p")).find(node => 
            node !== el && node !== valEl && node.textContent.toLowerCase().includes("defect")
          );

        if (subEl) {
          subEl.textContent = subtextText;
        }
      }
    }
  });
}

// --- Helper: Centralized & Bulletproof On-Time Delivery Rate Synchronizer ---
function syncOnTimeDeliveryMetrics(rate) {
  if (rate !== undefined && rate !== null) {
    const numericRate = typeof rate === 'number' ? rate : parseInt(rate.toString().replace(/\D/g, ''), 10);
    if (!isNaN(numericRate)) {
      cachedOnTimeRate = numericRate;
    }
  }

  if (cachedOnTimeRate === null) return;
  const formattedRate = `${cachedOnTimeRate}%`;

  // 1. Direct ID updates
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
    if (el) el.textContent = formattedRate;
  });

  // 2. Class selector updates
  document.querySelectorAll(".ontime-rate-display, .ontime-metric, .ontime-value").forEach(el => {
    el.textContent = formattedRate;
  });

  // 3. Smart DOM traversal fallback (searches any card header labeled "On-Time Delivery")
  const labels = document.querySelectorAll("h1, h2, h3, h4, h5, h6, div, span, p, label, .subtext, .metric-label");
  labels.forEach(el => {
    const txt = el.textContent ? el.textContent.trim().toLowerCase() : "";
    if (txt === "on-time delivery" || txt === "on-time delivery rate" || txt.startsWith("on-time delivery")) {
      const cardContainer = el.closest(".metric-card, .card, .stat-card, div") || el.parentElement;
      if (cardContainer) {
        const valEl = cardContainer.querySelector(".metric-value, .value, .number, h2, h3, strong") ||
          Array.from(cardContainer.querySelectorAll("div, span, p, h2, h3")).find(node => 
            node !== el && (node.textContent.includes("%") || /^\d+/.test(node.textContent.trim()))
          );

        if (valEl) {
          valEl.textContent = formattedRate;
        }
      }
    }
  });
}

// --- Utility: Robust Fetch with Exponential Backoff & Cache Busting ---
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
    console.warn("No user_id found in storage. Redirecting to login.");
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
      if (dbVendor) {
        vendorName = dbVendor;
      }
    } else {
      console.warn("User verification failed with status:", res.status);
    }
  } catch (err) {
    console.error("Session verification network error (Is backend running?):", err);
  }

  if (!vendorName) {
    console.warn("Vendor name could not be resolved. Redirecting to login.");
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

  // Re-sync metrics on tab switch
  syncOnTimeDeliveryMetrics();

  if (viewId === 'reliability-view') {
    renderCharts();
  } else if (viewId === 'settings-view') {
    loadVendorProfile();
  } else if (viewId === 'notifications-view') {
    renderVendorNotifications();
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
        if (currentVendorObj.id) {
          sessionStorage.setItem("vendor_id_pk", currentVendorObj.id);
        }
        const rawScore = currentVendorObj.reliability_score ?? currentVendorObj.risk_level ?? 94;
        const numericMatch = rawScore.toString().match(/\d+/);
        let score = numericMatch ? parseInt(numericMatch[0], 10) : 94;

        const metricReliability = document.getElementById("metric-reliability");
        if (metricReliability) metricReliability.textContent = `${score}%`;

        const breakdownRating = document.getElementById("breakdown-rating");
        if (breakdownRating) breakdownRating.textContent = `${score} / 100`;

        const vendorOnTime = currentVendorObj.on_time_rate ?? currentVendorObj.on_time_delivery;
        if (vendorOnTime !== undefined && vendorOnTime !== null) {
          syncOnTimeDeliveryMetrics(vendorOnTime);
        }

        const tierText = score >= 90 ? "Top Tier Performance" : (score >= 80 ? "Medium Risk Performance" : "Standard Performance");
        
        const reliabilityCard = metricReliability?.closest('.metric-card');
        if (reliabilityCard) {
          const sub = reliabilityCard.querySelector('.subtext');
          if (sub) sub.textContent = tierText;
        }

        const breakdownCard = breakdownRating?.closest('.metric-card');
        if (breakdownCard) {
          const sub = breakdownCard.querySelector('.subtext');
          if (sub) sub.textContent = score >= 90 ? "Grade: Excellent" : "Grade: Standard";
        }
      }
    }

    let poRes = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`);
    if (poRes.ok) {
      const allOrders = await poRes.json();
      cachedOrders = allOrders.filter(o => isVendorMatch(o.vendor_name, vendorName));
    } else {
      console.warn("Failed to fetch purchase orders. Status:", poRes.status);
    }

    let invRes = await fetchWithRetry(`${API_BASE}/api/v1/invoices`);
    if (invRes.ok) {
      const allInvoices = await invRes.json();
      cachedInvoices = allInvoices.filter(inv => isVendorMatch(inv.vendor_name, vendorName));
    } else {
      console.warn("Failed to fetch invoices. Status:", invRes.status);
    }

    renderDashboardData();
    renderPurchaseOrders();
    renderContractsData();
    renderTransactionsData();
    renderCharts();
    
    const notifView = document.getElementById('notifications-view');
    if (notifView && notifView.classList.contains('active')) {
      renderVendorNotifications();
    }
  } catch (err) {
    console.error("Error loading vendor data from DB (Check if backend server is active):", err);
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
      prodStatus.includes("rejected")
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

  // --- CONTRACT TIMELINE-BASED ON-TIME DELIVERY CALCULATION ---
  let totalScorePoints = 0;
  let evaluatedOrdersCount = 0;

  const targetOrders = cachedOrders.filter(po => {
    const status = (po.order_status || "").toLowerCase();
    const prodStatus = (po.production_status || "").toLowerCase();
    return !status.includes("rejected") && !prodStatus.includes("rejected");
  });

  if (targetOrders.length > 0) {
    targetOrders.forEach(po => {
      if (!po.expiry_date) {
        totalScorePoints += 100;
        evaluatedOrdersCount++;
        return;
      }

      const expiry = new Date(po.expiry_date.split('T')[0]);
      const checkDate = po.actual_delivery_date 
        ? new Date(po.actual_delivery_date.split('T')[0]) 
        : new Date();

      expiry.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((expiry - checkDate) / (1000 * 60 * 60 * 24));

      if (diffDays > 7) {
        totalScorePoints += 100;
      } else if (diffDays >= 0 && diffDays <= 7) {
        totalScorePoints += 70;
      } else {
        totalScorePoints += 30;
      }
      evaluatedOrdersCount++;
    });
  }

  const onTimePercentage = evaluatedOrdersCount > 0 
    ? Math.round(totalScorePoints / evaluatedOrdersCount) 
    : 0;

  const pendingTxns = cachedInvoices.filter(inv => {
    const isRejected = (inv.status && inv.status.toLowerCase().includes("rejected")) ||
                       (inv.order_status && inv.order_status.toLowerCase().includes("rejected"));
    
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
          <button class="btn-accept" onclick="handleVendorAcceptance(${po.id}, 'Accepted by Vendor')">Accept</button>
          <button class="btn-reject" onclick="handleVendorAcceptance(${po.id}, 'Rejected by Vendor')">Reject</button>
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
          <div class="notification-item" style="display: flex; gap: 16px; padding: 14px 0; border-bottom: 1px solid #edf2f7; align-items: flex-start;">
            <div class="notification-icon" style="background: #e2eeff; color: #1e62c1; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fa-solid fa-cart-shopping"></i></div>
            <div class="notification-body" style="flex: 1;">
              <div class="notification-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #2d3748; font-size: 14px;">New Order Received: #${invNo}</span>
                <span class="notification-time" style="font-size: 12px; color: #718096;"><i class="fa-regular fa-clock"></i> ${assignFormatted}</span>
              </div>
              <div class="notification-desc" style="font-size: 13px; color: #4a5568;">Product: ${po.product_name} | Quantity: ${po.quantity} | Total Value: $${Number(po.total_value || 0).toFixed(2)}</div>
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
          <div class="notification-item" style="display: flex; gap: 16px; padding: 14px 0; border-bottom: 1px solid #edf2f7; align-items: flex-start;">
            <div class="notification-icon" style="background: #c6f6d5; color: #22543d; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fa-solid fa-receipt"></i></div>
            <div class="notification-body" style="flex: 1;">
              <div class="notification-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #2d3748; font-size: 14px;">Payment Received from F.O.: #${invNo}</span>
                <span class="notification-time" style="font-size: 12px; color: #718096;"><i class="fa-regular fa-clock"></i> ${payFormatted}</span>
              </div>
              <div class="notification-desc" style="font-size: 13px; color: #4a5568;">Amount Paid: $${Number(inv.amount || 0).toFixed(2)} | Transaction ID: ${inv.transaction_id || 'N/A'}</div>
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
    container.innerHTML = '<div style="text-align:center; color: #718096; padding: 2rem;">No new order or payment notifications available.</div>';
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

    if (
      orderStatus === "pending" ||
      orderStatus.includes("pending") ||
      orderStatus.includes("awaiting") ||
      orderStatus.includes("accepted by f.o") ||
      orderStatus.includes("accepted by fo")
    ) {
      return false;
    }

    if (orderStatus.includes("rejected") || prodStatus.includes("rejected")) {
      return false;
    }

    const isAccepted =
      orderStatus.includes("accepted by vendor") ||
      orderStatus.includes("in production") ||
      orderStatus.includes("in transit") ||
      orderStatus.includes("delivered") ||
      prodStatus.length > 0;

    return isAccepted;
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
        <button class="btn-action" onclick="openEditModal(${po.id})"><i class="fa-solid fa-pen-to-square"></i> Edit Progress</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Export Active Purchase Orders to CSV ---
function exportPurchaseOrders() {
  const activeOrders = cachedOrders.filter(po => {
    const orderStatus = (po.order_status || "").toLowerCase().trim();
    const prodStatus = (po.production_status || "").toLowerCase().trim();

    if (
      orderStatus === "pending" ||
      orderStatus.includes("pending") ||
      orderStatus.includes("awaiting") ||
      orderStatus.includes("accepted by f.o") ||
      orderStatus.includes("accepted by fo") ||
      orderStatus.includes("rejected") || 
      prodStatus.includes("rejected")
    ) {
      return false;
    }

    return (
      orderStatus.includes("accepted by vendor") ||
      orderStatus.includes("in production") ||
      orderStatus.includes("in transit") ||
      orderStatus.includes("delivered") ||
      prodStatus.length > 0
    );
  });

  const ordersToExport = activeOrders.length > 0 ? activeOrders : cachedOrders.filter(po => {
    const orderStatus = (po.order_status || "").toLowerCase().trim();
    return !orderStatus.includes("rejected");
  });

  if (ordersToExport.length === 0) {
    alert("No purchase orders available to export.");
    return;
  }

  const headers = ["PO Ref", "Vendor", "Dept", "Product", "Creation", "Expiry", "Units Completed", "Total Value", "Status"];
  const rows = ordersToExport.map(po => {
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

// --- Export Payment Transactions to CSV ---
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

  const validOrders = cachedOrders.filter(o => !o.order_status.toLowerCase().includes("rejected"));
  const rejectedOrders = cachedOrders.filter(o => 
    (o.order_status && o.order_status.toLowerCase().includes("rejected")) || 
    (o.production_status && o.production_status.toLowerCase().includes("rejected"))
  );

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
      ? '<tr class="empty-row"><td colspan="8">No rejected contracts recorded.</td></tr>' 
      : rejectedOrders.map(o => `
        <tr>
          <td><strong>#${o.invoice_no}</strong></td>
          <td>${o.vendor_name}</td>
          <td>${o.product_name}</td>
          <td>${o.creation_date}</td>
          <td>${o.expiry_date}</td>
          <td>$${Number(o.total_value || 0).toFixed(2)}</td>
          <td><span class="status rejected">Rejected</span></td>
          <td><button class="btn-action" onclick="showContractDetails('${o.invoice_no}')">Details</button></td>
        </tr>`).join('');
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
      if (currentVendor.id) {
        sessionStorage.setItem("vendor_id_pk", currentVendor.id);
      }
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

function renderCharts() {
  syncOnTimeDeliveryMetrics();

  const trendCtx = document.getElementById('performanceTrendChart')?.getContext('2d');
  const qualityCtx = document.getElementById('qualityPieChart')?.getContext('2d');

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
            borderColor: '#1e62c1', 
            backgroundColor: 'rgba(30, 98, 193, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false }
      });
    }
  }

  // --- ORDER QUALITY RATIO COUNTS ---
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

  // Synchronize Quality Assurance percentage card with the chart counts
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
            backgroundColor: ['#38a169', '#d69e2e', '#e53e3e'] 
          }] 
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false }
      });
    }
  }
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
    }).catch(err => console.error("Vendor background poll error:", err));
  }
}, 3000);