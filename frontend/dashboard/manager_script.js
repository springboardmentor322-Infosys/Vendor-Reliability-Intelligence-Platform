const API_BASE = "http://127.0.0.1:8000";
let isSubmittingPO = false;
let globalVendorsCache = [];

let spendChartInstance = null;
let riskChartInstance = null;
let vendorChartInstance = null;
let deptChartInstance = null;

// --- Utility: Robust Fetch with Exponential Backoff ---
async function fetchWithRetry(url, options = {}, retries = 3, delay = 200) {
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

function getOrderStatusBadgeClass(status) {
  if (!status) return "status-in-production";
  const s = status.toLowerCase();
  if (s.includes("delivered")) return "status-delivered";
  if (s.includes("delay")) return "status-delay";
  if (s.includes("transit")) return "status-in-transit";
  if (s.includes("ready")) return "status-ready-dispatch";
  if (s.includes("quality")) return "status-quality-check";
  if (s.includes("production")) return "status-in-production";
  if (s.includes("pending")) return "status-pending";
  return "status-in-production";
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

function calculateOrderRiskScoreAndTier(po) {
  const producedQty = po.completed_units !== undefined && po.completed_units !== null ? po.completed_units : 0;
  const targetQty = po.quantity || 1;
  const currentOrderStatus = po.production_status || po.order_status || "In Production";

  let baseScore = 100;
  if (targetQty > 0 && producedQty < targetQty) {
    const shortageRatio = (targetQty - producedQty) / targetQty;
    baseScore -= Math.round(shortageRatio * 30);
  }
  
  const statusLower = currentOrderStatus.toLowerCase();
  if (statusLower.includes("delay") || statusLower.includes("pending")) {
    baseScore -= 15;
  } else if (statusLower.includes("cancel")) {
    baseScore -= 40;
  }

  if (po.expiry_date) {
    const cleanExpiry = po.expiry_date.split('T')[0];
    const expiryDate = new Date(cleanExpiry);
    const today = new Date();
    const diffDays = Math.round((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) baseScore -= 35;
    else if (diffDays <= 7) baseScore -= 15;
    else if (diffDays <= 30) baseScore -= 5;
  }

  const finalScore = Math.max(0, Math.min(100, baseScore));
  let riskTier = "Low Risk";
  let riskColor = "#2f855a";

  if (finalScore < 75) {
    riskTier = "High Risk";
    riskColor = "#e53e3e";
  } else if (finalScore < 90) {
    riskTier = "Medium Risk";
    riskColor = "#d69e2e";
  }

  return { finalScore, riskTier, riskColor };
}

async function verifyManagerSession() {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (!currentUserId) {
    window.location.href = "../login/index.html";
    return;
  }
  try {
    const res = await fetchWithRetry(`${API_BASE}/users/verify/${currentUserId}`);
    if (!res.ok) {
      alert("Your account status is invalid or has been revoked.");
      sessionStorage.clear();
      localStorage.clear();
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
      await fetchWithRetry(`${API_BASE}/api/v1/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userId) }),
        keepalive: true
      });
    } catch (err) {
      console.error("Logout notification failed:", err);
    }
  }

  sessionStorage.clear();
  localStorage.clear();
  window.location.href = '../login/index.html';
}

function switchTab(tabId, element) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  if (element) element.classList.add('active');

  if (tabId === 'vendor-management') {
    loadVendorsFromDB();
  } else if (tabId === 'contracts-risk' || tabId === 'dashboard') {
    syncContractsAndRisk();
  } else if (tabId === 'view-inspection') {
    loadInspectionOrders();
  } else if (tabId === 'analytics') {
    renderAnalyticsCharts();
    loadAnalyticsProcessingTime();
  } else if (tabId === 'notifications') {
    renderNotificationsView();
  }
}

// --- EXPORT PURCHASE ORDERS TO EXCEL (CSV) ---
function exportPurchaseOrdersExcel() {
  const table = document.getElementById('poTable');
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll('tr');

  for (let i = 0; i < rows.length; i++) {
    let row = [], cols = rows[i].querySelectorAll('td, th');
    
    for (let j = 0; j < cols.length; j++) {
      let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ');
      data = data.replace(/"/g, '""');
      row.push('"' + data + '"');
    }
    csv.push(row.join(','));
  }

  const csvFile = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(csvFile);
  downloadLink.setAttribute('download', `Purchase_Orders_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// --- EXPORT CONTRACTS & RISK TABLE TO EXCEL (CSV) ---
function exportContractsExcel() {
  const table = document.getElementById('contractsTable');
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll('tr');

  for (let i = 0; i < rows.length; i++) {
    let row = [], cols = rows[i].querySelectorAll('td, th');
    
    for (let j = 0; j < cols.length; j++) {
      let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ');
      data = data.replace(/"/g, '""');
      row.push('"' + data + '"');
    }
    csv.push(row.join(','));
  }

  const csvFile = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(csvFile);
  downloadLink.setAttribute('download', `Contracts_Risk_Evaluation_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

async function renderNotificationsView() {
  const container = document.getElementById('notifications-list-container');
  if (!container) return;

  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`);
    if (!res.ok) {
      container.innerHTML = '<div style="text-align:center; color: #e53e3e; padding: 2rem;">Failed to load notifications.</div>';
      return;
    }
    const orders = await res.json();
    let allNotifications = [];

    let savedTimestamps = JSON.parse(localStorage.getItem('procurement_notification_timestamps') || '{}');
    let registryUpdated = false;

    if (orders.length === 0) {
      container.innerHTML = '<div style="text-align:center; color: #718096; padding: 2rem;">No system notifications available.</div>';
      return;
    }

    orders.forEach((po) => {
      const status = po.order_status || "Pending";
      const invNo = po.invoice_no;

      const creationKey = `proc_notif_${invNo}_created`;
      if (!savedTimestamps[creationKey]) {
        savedTimestamps[creationKey] = po.creation_date ? new Date(po.creation_date + "T09:00:00").getTime() : Date.now();
        registryUpdated = true;
      }
      const creationTime = savedTimestamps[creationKey];
      const creationFormatted = new Date(creationTime).toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      allNotifications.push({
        timestamp: creationTime,
        html: `
          <div class="notification-item">
            <div class="notification-icon status-pending"><i class="fa-solid fa-cart-shopping"></i></div>
            <div class="notification-body">
              <div class="notification-title">
                <span>Purchase Order #${invNo} Created (${po.vendor_name}) - <span class="status-badge status-pending">New Order</span></span>
                <span class="notification-time"><i class="fa-regular fa-clock"></i> ${creationFormatted}</span>
              </div>
              <div class="notification-desc">Product: ${po.product_name} | Quantity: ${po.quantity} | Department: ${po.department} | Total Value: $${Number(po.total_value || 0).toFixed(2)}</div>
            </div>
          </div>
        `
      });

      if (!status.toLowerCase().includes("pending")) {
        let badgeClass = status.toLowerCase().includes("reject") ? "status-rejected-fo" : "status-accepted-fo";
        let displayStatus = status;

        if (status.includes("Accepted by Vendor")) {
          displayStatus = "Accepted by F.O. & Vendor (In Production)";
        }

        const approvalKey = `proc_notif_${invNo}_status_${status}`;
        if (!savedTimestamps[approvalKey]) {
          savedTimestamps[approvalKey] = Date.now(); 
          registryUpdated = true;
        }
        const approvalTime = savedTimestamps[approvalKey];
        const approvalFormatted = new Date(approvalTime).toLocaleString('en-US', { 
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        allNotifications.push({
          timestamp: approvalTime,
          html: `
            <div class="notification-item">
              <div class="notification-icon ${badgeClass}"><i class="fa-solid fa-circle-check"></i></div>
              <div class="notification-body">
                <div class="notification-title">
                  <span>Order Status Update: #${invNo} - <span class="status-badge ${badgeClass}">${displayStatus}</span></span>
                  <span class="notification-time"><i class="fa-regular fa-clock"></i> ${approvalFormatted}</span>
                </div>
                <div class="notification-desc">Vendor: ${po.vendor_name} | Department: ${po.department}</div>
              </div>
            </div>
          `
        });
      }

      const currentProgressStatus = po.production_status || po.order_status;
      const completedUnits = po.completed_units !== undefined && po.completed_units !== null ? po.completed_units : 0;

      if (currentProgressStatus && currentProgressStatus !== "Pending" && currentProgressStatus !== "Accepted by Vendor") {
        const liveBadgeClass = getOrderStatusBadgeClass(currentProgressStatus);
        
        const progressKey = `proc_notif_${invNo}_progress_${currentProgressStatus}_${completedUnits}`;
        if (!savedTimestamps[progressKey]) {
          savedTimestamps[progressKey] = Date.now(); 
          registryUpdated = true;
        }
        const progressTime = savedTimestamps[progressKey];
        const progressFormatted = new Date(progressTime).toLocaleString('en-US', { 
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        allNotifications.push({
          timestamp: progressTime,
          html: `
            <div class="notification-item">
              <div class="notification-icon ${liveBadgeClass}"><i class="fa-solid fa-truck-fast"></i></div>
              <div class="notification-body">
                <div class="notification-title">
                  <span>New Progress Logged: #${invNo} (${po.vendor_name})</span>
                  <span class="notification-time"><i class="fa-regular fa-clock"></i> ${progressFormatted}</span>
                </div>
                <div class="notification-desc">Milestone Reached: <span class="status-badge ${liveBadgeClass}">${currentProgressStatus}</span> | Units Finished: ${completedUnits}/${po.quantity}</div>
              </div>
            </div>
          `
        });
      }
    });

    if (registryUpdated) {
      localStorage.setItem('procurement_notification_timestamps', JSON.stringify(savedTimestamps));
    }

    allNotifications.sort((a, b) => b.timestamp - a.timestamp);
    container.innerHTML = allNotifications.map(n => n.html).join('');
  } catch (err) {
    console.error("Error generating separate procurement notifications:", err);
    container.innerHTML = '<div style="text-align:center; color: #e53e3e; padding: 2rem;">Error loading notifications.</div>';
  }
}

async function loadPurchaseOrdersFromDB() {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`);
    if (!res.ok) return;
    const orders = await res.json();

    const tableBody = document.getElementById('po-tbody');
    if (tableBody) {
      if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#888;">No purchase orders found in database.</td></tr>';
      } else {
        tableBody.innerHTML = '';
        orders.forEach(po => {
          const newRow = document.createElement('tr');
          
          let badgeClass = 'status-pending';
          const statusText = (po.order_status || '').toLowerCase();
          
          if (statusText.includes('accepted')) {
            badgeClass = 'status-accepted-fo';
          } else if (statusText.includes('reject')) {
            badgeClass = 'status-rejected-fo';
          } else if (statusText.includes('pending')) {
            badgeClass = 'status-pending';
          }

          newRow.innerHTML = `
            <td>#${po.invoice_no}</td>
            <td>${po.vendor_name}</td>
            <td>${po.product_name}</td>
            <td>${po.quantity}</td>
            <td>${po.department}</td>
            <td>${po.creation_date}</td>
            <td>${po.expiry_date}</td>
            <td>$${Number(po.total_value || 0).toFixed(2)}</td>
            <td><span class="status-badge ${badgeClass}">${po.order_status}</span></td>
          `;
          tableBody.appendChild(newRow);
        });
      }
    }

    const pendingTableBody = document.getElementById('dashboard-pending-tbody');
    if (pendingTableBody) {
      const pendingOrders = orders.filter(po => {
        const status = (po.order_status || '').toLowerCase();
        return status.includes('pending') || status.includes('accepted by f.o') || status.includes('accepted by fo');
      });

      if (pendingOrders.length === 0) {
        pendingTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888; padding: 2rem;">No pending orders found.</td></tr>';
      } else {
        pendingTableBody.innerHTML = '';
        pendingOrders.forEach(po => {
          const { finalScore, riskTier, riskColor } = calculateOrderRiskScoreAndTier(po);

          const newRow = document.createElement('tr');
          newRow.innerHTML = `
            <td>#${po.invoice_no}</td>
            <td>${po.vendor_name}</td>
            <td>${po.product_name}</td>
            <td>${po.quantity}</td>
            <td>${po.department}</td>
            <td>${po.expiry_date}</td>
            <td><span style="color: ${riskColor}; font-weight: 600;">${riskTier} (${finalScore}%)</span></td>
          `;
          pendingTableBody.appendChild(newRow);
        });
      }
    }

    updateDashboardMetrics(orders);
    syncContractsAndRisk();
  } catch (err) {
    console.error("Failed to load POs from database:", err);
  }
}

function updateDashboardMetrics(orders) {
  const activeOrders = orders.filter(po => !po.order_status.toLowerCase().includes("rejected") && !po.order_status.toLowerCase().includes("pending"));
  const pendingOrders = orders.filter(po => {
    const status = (po.order_status || '').toLowerCase();
    return status.includes('pending') || status.includes('accepted by f.o') || status.includes('accepted by fo');
  });
  const approvedContracts = orders.filter(po => po.order_status.toLowerCase().includes("accepted"));
  const rejectedOrders = orders.filter(po => po.order_status.toLowerCase().includes("rejected"));

  if (document.getElementById("kpiActiveOrders")) document.getElementById("kpiActiveOrders").textContent = activeOrders.length;
  if (document.getElementById("kpiPendingRequisitions")) document.getElementById("kpiPendingRequisitions").textContent = pendingOrders.length;
  if (document.getElementById("kpiApprovedContracts")) document.getElementById("kpiApprovedContracts").textContent = approvedContracts.length;
  if (document.getElementById("kpiRejectedRequisitions")) document.getElementById("kpiRejectedRequisitions").textContent = rejectedOrders.length;
}

function isCategoryMatch(vendorCategory, selectedCategory) {
  if (!selectedCategory || selectedCategory === "" || selectedCategory === "Select a Category") return true;
  if (!vendorCategory) return false;

  const vCat = vendorCategory.toLowerCase().trim();
  const sCat = selectedCategory.toLowerCase().trim();

  if (vCat === sCat) return true;

  if (sCat.includes("raw material")) {
    return vCat.includes("raw material") || vCat.includes("suppli") || vCat.includes("industrial");
  }
  if (sCat.includes("equipment")) {
    return vCat.includes("equipment");
  }
  if (sCat.includes("it")) {
    return vCat.includes("it") || vCat.includes("equipment") || vCat.includes("electronics");
  }
  if (sCat.includes("service")) {
    return vCat.includes("service") || vCat.includes("professional");
  }
  if (sCat.includes("logistics")) {
    return vCat.includes("logistics");
  }
  if (sCat.includes("maintenance")) {
    return vCat.includes("maintenance") || vCat.includes("facilities");
  }

  return vCat.includes(sCat) || sCat.includes(vCat);
}

async function loadVendorsIntoDropdown() {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/vendors`);
    if (!res.ok) return;
    globalVendorsCache = await res.json();
    populateVendorDropdown();
  } catch (err) {
    console.error("Failed to load vendors into dropdown from database:", err);
  }
}

function handleCategoryChange() {
  populateVendorDropdown();
}

function handleVendorChange() {}

function populateVendorDropdown() {
  const vendorSelect = document.getElementById('poVendor');
  const categorySelect = document.getElementById('poCategory');
  if (!vendorSelect) return;

  const selectedCategory = categorySelect ? categorySelect.value : '';

  vendorSelect.innerHTML = '<option value="">Select Vendor...</option>';

  const activeVendors = globalVendorsCache.filter(v => v.status === 'Accepting Orders');
  const matchingVendors = activeVendors.filter(v => isCategoryMatch(v.category, selectedCategory));

  matchingVendors.forEach(v => {
    const option = document.createElement('option');
    option.value = v.vendor_name;
    option.textContent = v.vendor_name;
    vendorSelect.appendChild(option);
  });
}

async function handleCreatePO(e) {
  e.preventDefault();

  if (isSubmittingPO) return;
  isSubmittingPO = true;

  const rawInvoiceNo = `INV-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
  const vendor = document.getElementById('poVendor').value;
  const productName = document.getElementById('poProductName').value;
  const quantity = parseInt(document.getElementById('poQuantity').value, 10) || 1;
  const department = document.getElementById('poDepartment').value;
  
  const creationDateInput = document.getElementById('poCreationDate').value;
  const expiryDateInput = document.getElementById('poContract').value;
  
  const creationDate = creationDateInput ? creationDateInput : new Date().toISOString().split('T')[0];
  const expiryDate = expiryDateInput ? expiryDateInput : new Date(Date.now() + 31536000000).toISOString().split('T')[0];
  
  const totalValue = parseFloat(document.getElementById('poTotalValue').value) || 0;

  if (!vendor || !productName) {
    alert("Please fill in Vendor Name and Product Name.");
    isSubmittingPO = false;
    return;
  }

  const exactCreationTimestamp = Date.now();
  let savedTimestamps = JSON.parse(localStorage.getItem('procurement_notification_timestamps') || '{}');
  savedTimestamps[`proc_notif_${rawInvoiceNo}_created`] = exactCreationTimestamp;
  localStorage.setItem('procurement_notification_timestamps', JSON.stringify(savedTimestamps));

  const payload = {
    invoice_no: rawInvoiceNo,
    vendor_name: vendor,
    product_name: productName,
    quantity: quantity,
    department: department,
    creation_date: creationDate,
    expiry_date: expiryDate,
    total_value: totalValue
  };

  try {
    const response = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response && response.ok) {
      alert("Purchase Order created successfully!");
      closeCreatePOModal();
      loadPurchaseOrdersFromDB();
    } else {
      const errData = await response.json().catch(() => ({}));
      alert("Server Error: " + (errData.detail ? JSON.stringify(errData.detail) : "Failed to create PO."));
    }
  } catch (err) {
    console.error("Network or fetch exception:", err);
    alert("Cannot connect to server. Please ensure FastAPI is running on port 8000.");
  } finally {
    isSubmittingPO = false;
  }
}

async function loadInspectionOrders() {
  try {
    const [invRes, poRes] = await Promise.all([
      fetchWithRetry(`${API_BASE}/api/v1/invoices`),
      fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`)
    ]);

    if (!invRes.ok || !poRes.ok) return;

    const invoices = await invRes.json();
    const purchaseOrders = await poRes.json();

    const tbody = document.getElementById('inspection-tbody');
    if (!tbody) return;

    const poStatusMap = {};
    purchaseOrders.forEach(po => {
      poStatusMap[po.invoice_no] = po.production_status || po.order_status;
    });

    tbody.innerHTML = '';

    const validInvoices = invoices.filter(inv => {
      const s = (inv.status || "").toLowerCase();
      const orderStatus = (inv.order_status || "").toLowerCase();
      return !s.includes("reject") && !orderStatus.includes("reject");
    });

    if (validInvoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #718096; padding: 2rem;">No orders available for inspection.</td></tr>';
      return;
    }

    validInvoices.forEach(inv => {
      const currentOrderStatus = poStatusMap[inv.invoice_no] || inv.order_status || inv.delivery_status || 'In Transit';
      const badgeClass = getOrderStatusBadgeClass(currentOrderStatus);
      const inspectionStatus = inv.inspection_status || inv.quality_status || 'In Progress';

      let inspectionBadge = '';
      if (inspectionStatus === 'Checked' || inspectionStatus === 'Passed') {
        inspectionBadge = '<span class="status-badge status-approved"><i class="fa-solid fa-circle-check"></i> Passed</span>';
      } else if (inspectionStatus === 'Fault' || inspectionStatus === 'Failed') {
        inspectionBadge = '<span class="status-badge status-rejected"><i class="fa-solid fa-triangle-exclamation"></i> Fault</span>';
      } else {
        inspectionBadge = '<span class="status-badge status-pending"><i class="fa-solid fa-spinner fa-spin"></i> In Progress</span>';
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>#${inv.invoice_no}</td>
        <td>${inv.vendor_name}</td>
        <td>${inv.product_name}</td>
        <td><span class="status-badge ${badgeClass}">${currentOrderStatus}</span></td>
        <td>${inspectionBadge}</td>
        <td>
          <button class="btn btn-accept" onclick="updateInspectionStatus(${inv.id}, 'Checked')"><i class="fa-solid fa-check"></i> Pass</button>
          <button class="btn btn-reject" onclick="updateInspectionStatus(${inv.id}, 'Fault')"><i class="fa-solid fa-xmark"></i> Fail</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading inspection table:", err);
  }
}

async function updateInspectionStatus(invId, newStatus) {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/invoices/${invId}/inspection`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspection_status: newStatus })
    });

    if (res.ok) {
      await loadInspectionOrders();
    } else {
      alert("Failed to update inspection status.");
    }
  } catch (err) {
    console.error("Inspection update error:", err);
    alert("Server error while updating inspection.");
  }
}

async function syncContractsAndRisk() {
  const contractsBody = document.getElementById('contracts-tbody');
  if (!contractsBody) return;

  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`);
    if (!res.ok) return;
    const orders = await res.json();

    const displayedOrders = orders.filter(po => {
      const status = (po.order_status || "").toLowerCase();
      const isRejected = status.includes("rejected");
      return !isRejected;
    });

    if (displayedOrders.length === 0) {
      contractsBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#718096; padding:2rem;">No contracts on record.</td></tr>';
      return;
    }

    contractsBody.innerHTML = '';
    displayedOrders.forEach(po => {
      const producedQty = po.completed_units !== undefined && po.completed_units !== null ? po.completed_units : 0;
      const targetQty = po.quantity || 1;
      const currentOrderStatus = po.production_status || po.order_status || "In Production";

      const badgeClass = getOrderStatusBadgeClass(currentOrderStatus);
      const contractStatusObj = determineContractStatus(po.expiry_date, currentOrderStatus);

      const { finalScore, riskTier, riskColor } = calculateOrderRiskScoreAndTier(po);

      const newRow = document.createElement('tr');
      newRow.innerHTML = `
        <td>#${po.invoice_no}</td>
        <td>${po.vendor_name}</td>
        <td>${po.product_name}</td>
        <td>${producedQty}/${targetQty}</td>
        <td><span class="${contractStatusObj.class}">${contractStatusObj.label}</span></td>
        <td>${po.expiry_date}</td>
        <td><span class="status-badge ${badgeClass}">${currentOrderStatus}</span></td>
        <td>${finalScore}%</td>
        <td><span style="color: ${riskColor}; font-weight: 600;">${riskTier}</span></td>
      `;
      contractsBody.appendChild(newRow);
    });
  } catch (err) {
    console.error("Failed to sync contracts and risk from database:", err);
  }
}

async function loadVendorsFromDB() {
  try {
    const [vendorRes, poRes] = await Promise.all([
      fetchWithRetry(`${API_BASE}/api/v1/vendors`),
      fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`)
    ]);

    if (!vendorRes.ok || !poRes.ok) return;
    const vendors = await vendorRes.json();
    const orders = await poRes.json();

    const vendorRiskMap = {};
    orders.forEach(po => {
      const status = (po.order_status || "").toLowerCase();
      const isRejected = status.includes("rejected");

      if (!isRejected) {
        const { finalScore } = calculateOrderRiskScoreAndTier(po);
        const vName = (po.vendor_name || "").trim().toLowerCase();
        if (!vendorRiskMap[vName]) {
          vendorRiskMap[vName] = [];
        }
        vendorRiskMap[vName].push(finalScore);
      }
    });

    const tbody = document.getElementById('vendor-tbody');
    if (!tbody) return;

    if (vendors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #718096; padding: 2rem;">No vendors registered in database.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    vendors.forEach(v => {
      const vKey = (v.vendor_name || "").trim().toLowerCase();
      let avgScore = v.reliability_score || 100;

      if (vendorRiskMap[vKey] && vendorRiskMap[vKey].length > 0) {
        const sum = vendorRiskMap[vKey].reduce((acc, score) => acc + score, 0);
        avgScore = Math.round(sum / vendorRiskMap[vKey].length);
      }

      let calculatedRiskTier = "Low Risk";
      let riskColor = "#2f855a";
      if (avgScore < 75) {
        calculatedRiskTier = "High Risk";
        riskColor = "#e53e3e";
      } else if (avgScore < 90) {
        calculatedRiskTier = "Medium Risk";
        riskColor = "#d69e2e";
      }

      const statusBadgeClass = v.status === 'Accepting Orders' ? 'status-approved' : 'status-rejected';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${v.vendor_name}</td>
        <td>${v.category || 'N/A'}</td>
        <td>${v.contact_person}</td>
        <td>${v.email}</td>
        <td><span style="color: ${riskColor}; font-weight: 600;">${calculatedRiskTier} (${avgScore}%)</span></td>
        <td><span class="status-badge ${statusBadgeClass}">${v.status}</span></td>
        <td>
          <button class="btn btn-secondary" onclick="showVendorDetails('${v.vendor_name}', '${v.category || 'N/A'}', '${v.contact_person}', '${v.email}', '${calculatedRiskTier} (${avgScore}%)', '${v.last_ordered_date || 'N/A'}', '${v.contract_ended_date || 'N/A'}')">Show</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading vendors from database:", err);
  }
}

async function renderAnalyticsCharts() {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`);
    if (!res.ok) return;
    const orders = await res.json();

    const acceptedOrders = orders.filter(po => {
      const status = (po.order_status || "").toLowerCase();
      return !status.includes("rejected");
    });

    const deliveredCount = acceptedOrders.filter(po => (po.production_status || po.order_status || "").toLowerCase().includes("delivered")).length;
    const onTimeRate = acceptedOrders.length > 0 ? Math.round((deliveredCount / acceptedOrders.length) * 100) : 0;
    
    if (document.getElementById('analyticsOnTimeRate')) document.getElementById('analyticsOnTimeRate').textContent = `${onTimeRate}%`;

    const vendorCounts = {};
    const deptCounts = {};
    const riskCounts = { "Low Risk": 0, "Medium Risk": 0, "High Risk": 0 };
    let totalValue = 0;

    acceptedOrders.forEach(po => {
      const v = po.vendor_name || "Unknown";
      const d = po.department || "Other";
      const val = Number(po.total_value || 0);

      vendorCounts[v] = (vendorCounts[v] || 0) + 1;
      deptCounts[d] = (deptCounts[d] || 0) + 1;
      totalValue += val;

      const { riskTier } = calculateOrderRiskScoreAndTier(po);
      riskCounts[riskTier] = (riskCounts[riskTier] || 0) + 1;
    });

    const spendCtx = document.getElementById('spendTrendChart')?.getContext('2d');
    if (spendCtx) {
      if (spendChartInstance) spendChartInstance.destroy();
      spendChartInstance = new Chart(spendCtx, {
        type: 'line',
        data: {
          labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
          datasets: [{
            label: 'Accepted Spend ($)',
            data: [15000, 22000, 18500, 31000, 28000, totalValue > 0 ? totalValue : 45000],
            borderColor: '#1a62bf',
            backgroundColor: 'rgba(26, 98, 191, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    const riskCtx = document.getElementById('riskDistributionChart')?.getContext('2d');
    if (riskCtx) {
      if (riskChartInstance) riskChartInstance.destroy();
      riskChartInstance = new Chart(riskCtx, {
        type: 'doughnut',
        data: {
          labels: ['Low Risk', 'Medium Risk', 'High Risk'],
          datasets: [{
            data: [riskCounts["Low Risk"], riskCounts["Medium Risk"], riskCounts["High Risk"]],
            backgroundColor: ['#38a169', '#d69e2e', '#e53e3e']
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }

    const vendorCtx = document.getElementById('vendorOrdersChart')?.getContext('2d');
    if (vendorCtx) {
      if (vendorChartInstance) vendorChartInstance.destroy();
      vendorChartInstance = new Chart(vendorCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(vendorCounts).length > 0 ? Object.keys(vendorCounts) : ['Acme Logistics', 'TechSupply Corp', 'Global Raw Materials'],
          datasets: [{
            label: 'Orders Count',
            data: Object.keys(vendorCounts).length > 0 ? Object.values(vendorCounts) : [3, 2, 1],
            backgroundColor: '#3182ce'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    const deptCtx = document.getElementById('deptOrdersChart')?.getContext('2d');
    if (deptCtx) {
      if (deptChartInstance) deptChartInstance.destroy();
      
      const departmentColors = {
        'Software Development': '#3182ce',
        'Network': '#38a169',
        'Finance': '#dd6b20',
        'HR': '#805ad5',
        'Management': '#d69e2e',
        'Cyber Security': '#e53e3e',
        'Other': '#718096'
      };

      const deptLabels = Object.keys(deptCounts).length > 0 ? Object.keys(deptCounts) : ['Management', 'Software Development', 'Finance', 'Network'];
      const deptBackgrounds = deptLabels.map(label => departmentColors[label] || '#4a5568');

      deptChartInstance = new Chart(deptCtx, {
        type: 'pie',
        data: {
          labels: deptLabels,
          datasets: [{
            data: Object.keys(deptCounts).length > 0 ? Object.values(deptCounts) : [2, 3, 1, 1],
            backgroundColor: deptBackgrounds
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 10
              }
            }
          }
        }
      });
    }

  } catch (err) {
    console.error("Error rendering analytics charts:", err);
  }
}

function openCreatePOModal() {
  document.getElementById('poCreationDate').value = new Date().toISOString().split('T')[0];
  
  const defaultExpiry = new Date();
  defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
  document.getElementById('poContract').value = defaultExpiry.toISOString().split('T')[0];

  loadVendorsIntoDropdown();
  document.getElementById('createPoModal').classList.add('active');
}

function closeCreatePOModal() {
  document.getElementById('createPoModal').classList.remove('active');
  document.getElementById('createPoForm').reset();
}

function showVendorDetails(vName, category, cPerson, email, rLevel, lOrdered, lContract) {
  if (document.getElementById('modalVendorName')) document.getElementById('modalVendorName').textContent = vName;
  if (document.getElementById('modalCategory')) document.getElementById('modalCategory').textContent = category;
  if (document.getElementById('modalContactPerson')) document.getElementById('modalContactPerson').textContent = cPerson;
  if (document.getElementById('modalEmail')) document.getElementById('modalEmail').textContent = email;
  if (document.getElementById('modalRiskLevel')) document.getElementById('modalRiskLevel').textContent = rLevel;
  if (document.getElementById('modalLastOrderedDate')) document.getElementById('modalLastOrderedDate').textContent = lOrdered;
  if (document.getElementById('modalLastContractEndedDate')) document.getElementById('modalLastContractEndedDate').textContent = lContract;

  const modal = document.getElementById('vendorModal');
  if (modal) modal.classList.add('active');
}

function closeVendorModal() {
  const modal = document.getElementById('vendorModal');
  if (modal) modal.classList.remove('active');
}

window.addEventListener('DOMContentLoaded', () => {
  verifyManagerSession();
  loadPurchaseOrdersFromDB();
  loadVendorsFromDB();
  loadVendorsIntoDropdown();
  loadInspectionOrders();
  renderAnalyticsCharts();
  loadAnalyticsProcessingTime();
});

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

async function loadAnalyticsProcessingTime() {
  try {
    const response = await fetchWithRetry(`${API_BASE}/api/v1/analytics/processing-time`);
    if (!response.ok) throw new Error("Failed to load processing time");
    
    const data = await response.json();
    
    const element = document.getElementById('avg-processing-time-value') || document.getElementById('analyticsAvgProcessingTime');
    if (element) {
      const daysValue = (typeof data === 'object' && data.avg_processing_days !== undefined) 
        ? data.avg_processing_days 
        : (parseFloat(data) || 0.1);
      element.innerText = `${daysValue} Days`;
    }
  } catch (error) {
    console.error("Error fetching analytics processing time:", error);
  }
}

setInterval(() => {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (currentUserId) {
    fetchWithRetry(`${API_BASE}/users/verify/${currentUserId}`).catch(() => {});
  }
  
  loadPurchaseOrdersFromDB();
  loadInspectionOrders();

  const vendorManagementTab = document.getElementById('vendor-management');
  if (vendorManagementTab && vendorManagementTab.classList.contains('active')) {
    loadVendorsFromDB();
  }

  const analyticsTab = document.getElementById('analytics');
  if (analyticsTab && analyticsTab.classList.contains('active')) {
    renderAnalyticsCharts();
    loadAnalyticsProcessingTime();
  }

  const notificationsTab = document.getElementById('notifications');
  if (notificationsTab && notificationsTab.classList.contains('active')) {
    renderNotificationsView();
  }
}, 3000);