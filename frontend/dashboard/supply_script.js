const API_BASE = "http://127.0.0.1:8000";

let chartInstances = {};

function switchTab(tabId, element) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  if (element) element.classList.add('active');

  if (tabId === 'purchase-orders') {
    loadPurchaseOrdersFromDB();
  } else if (tabId === 'quality-inspection' || tabId === 'dashboard') {
    loadInspectionOrders();
  } else if (tabId === 'notifications') {
    loadNotifications();
  } else if (tabId === 'analytics') {
    loadAnalyticsCharts();
  }
}

async function fetchWithRetry(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.error("Network request failed:", error);
    throw error;
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
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888; padding: 2rem;">No purchase orders found.</td></tr>';
      } else {
        tableBody.innerHTML = '';
        orders.forEach(po => {
          const newRow = document.createElement('tr');
          newRow.innerHTML = `
            <td>#${po.invoice_no || po.id}</td>
            <td>${po.vendor_name || po.vendor}</td>
            <td>${po.product_name}</td>
            <td>${po.quantity}</td>
            <td>${po.department}</td>
            <td>${po.creation_date || 'N/A'}</td>
            <td>${po.expiry_date || 'N/A'}</td>
            <td>$${Number(po.total_value || 0).toFixed(2)}</td>
          `;
          tableBody.appendChild(newRow);
        });
      }
    }

    const activePoElem = document.getElementById('dash-active-pos');
    if (activePoElem && orders.length > 0) {
      activePoElem.innerText = orders.length;
    }
    
    loadNotifications();
  } catch (err) {
    console.error("Failed to load POs from database:", err);
  }
}

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

function exportInspectionOrdersExcel() {
  const table = document.getElementById('inspectionTable');
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll('tr');

  for (let i = 0; i < rows.length; i++) {
    let row = [], cols = rows[i].querySelectorAll('td, th');
    for (let j = 0; j < cols.length; j++) {
      if (j === cols.length - 1) continue; 
      let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ');
      data = data.replace(/"/g, '""');
      row.push('"' + data + '"');
    }
    csv.push(row.join(','));
  }

  const csvFile = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(csvFile);
  downloadLink.setAttribute('download', `Quality_Inspections_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

function getOrderStatusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("approve") || s.includes("delivered") || s.includes("completed")) return "status-approved";
  if (s.includes("reject") || s.includes("fail")) return "status-rejected";
  if (s.includes("transit") || s.includes("process")) return "status-in-progress";
  return "status-pending";
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
    const poStatusMap = {};
    purchaseOrders.forEach(po => {
      poStatusMap[po.invoice_no] = po.production_status || po.order_status;
    });

    if (tbody) {
      tbody.innerHTML = '';
    }

    const validInvoices = invoices.filter(inv => {
      const s = (inv.status || "").toLowerCase();
      const orderStatus = (inv.order_status || "").toLowerCase();
      return !s.includes("reject") && !orderStatus.includes("reject");
    });

    let pendingCount = 0;
    let passedCount = 0;
    let failedCount = 0;

    validInvoices.forEach(inv => {
      const inspectionStatus = inv.inspection_status || inv.quality_status || 'In Progress';

      if (inspectionStatus === 'Checked' || inspectionStatus === 'Passed') {
        passedCount++;
      } else if (inspectionStatus === 'Fault' || inspectionStatus === 'Failed') {
        failedCount++;
      } else {
        pendingCount++;
      }

      if (tbody) {
        const currentOrderStatus = poStatusMap[inv.invoice_no] || inv.order_status || inv.delivery_status || 'In Transit';
        const badgeClass = getOrderStatusBadgeClass(currentOrderStatus);

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
      }
    });

    if (tbody && validInvoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #718096; padding: 2rem;">No orders available for inspection.</td></tr>';
    }

    document.getElementById('dash-pending-qc').innerText = pendingCount;
    document.getElementById('dash-passed-qc').innerText = passedCount;
    document.getElementById('dash-failed-qc').innerText = failedCount;

    loadNotifications();
  } catch (err) {
    console.error("Error loading inspection table and metrics:", err);
  }
}

async function loadNotifications() {
  try {
    const [poRes, invRes] = await Promise.all([
      fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`),
      fetchWithRetry(`${API_BASE}/api/v1/invoices`)
    ]);

    if (!poRes.ok || !invRes.ok) return;

    const purchaseOrders = await poRes.json();
    const invoices = await invRes.json();
    const container = document.getElementById('notifications-container');
    if (!container) return;

    let notificationsHTML = '';

    purchaseOrders.slice(-5).reverse().forEach(po => {
      notificationsHTML += `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
          <i class="fa-solid fa-cart-shopping text-blue" style="font-size: 1.5rem;"></i>
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 600;">New Purchase Order Created</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted);">PO #${po.invoice_no || po.id} created for ${po.vendor_name || po.vendor} (${po.product_name}).</p>
          </div>
        </div>
      `;
    });

    invoices.forEach(inv => {
      const status = (inv.order_status || inv.delivery_status || inv.status || "").toLowerCase();
      if (status.includes("deliver") || status.includes("complet") || status.includes("approve")) {
        notificationsHTML += `
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
            <i class="fa-solid fa-circle-check text-green" style="font-size: 1.5rem;"></i>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 600;">Order Delivered</h4>
              <p style="font-size: 0.85rem; color: var(--text-muted);">Invoice #${inv.invoice_no} from ${inv.vendor_name} has been successfully delivered.</p>
            </div>
          </div>
        `;
      }
    });

    if (notificationsHTML === '') {
      notificationsHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No recent notifications.</p>';
    }

    container.innerHTML = notificationsHTML;
  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}

async function loadAnalyticsCharts() {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`);
    if (!res.ok) return;
    const purchaseOrders = await res.json();

    const container = document.getElementById('company-charts-container');
    if (!container) return;
    container.innerHTML = '';

    const vendorData = {};
    purchaseOrders.forEach(po => {
      const vendor = po.vendor_name || po.vendor || 'Unknown Vendor';
      if (!vendorData[vendor]) {
        vendorData[vendor] = { products: {}, totalSpend: 0 };
      }
      const prod = po.product_name || 'General';
      vendorData[vendor].products[prod] = (vendorData[vendor].products[prod] || 0) + Number(po.quantity || 1);
      vendorData[vendor].totalSpend += Number(po.total_value || 0);
    });

    Object.keys(chartInstances).forEach(id => {
      if (chartInstances[id]) chartInstances[id].destroy();
    });
    chartInstances = {};

    Object.keys(vendorData).forEach((vendor, index) => {
      const canvasId = `companyPie_${index}`;
      const card = document.createElement('div');
      card.className = 'content-card';
      card.innerHTML = `
        <h3 class="card-title mb-2">${vendor}</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px;">Total Spend: $${vendorData[vendor].totalSpend.toFixed(2)}</p>
        <div style="position: relative; height: 250px; width: 100%;">
          <canvas id="${canvasId}"></canvas>
        </div>
      `;
      container.appendChild(card);

      const prodMap = vendorData[vendor].products;
      const labels = Object.keys(prodMap);
      const dataValues = labels.map(l => prodMap[l]);

      const ctx = document.getElementById(canvasId).getContext('2d');
      chartInstances[canvasId] = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: dataValues,
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    });

    if (Object.keys(vendorData).length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1; padding: 2rem;">No company data available for charts.</p>';
    }

  } catch (err) {
    console.error("Error loading company analytics charts:", err);
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

async function checkActiveSession() {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");

  if (!currentUserId) {
    window.location.href = '../login/index.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/users/verify/${currentUserId}`);
    if (!res.ok) {
      alert("Your account has been removed or revoked by an administrator.");
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = '../login/index.html';
    }
  } catch (err) {
    console.error("Session verification failed:", err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  checkActiveSession();
  loadPurchaseOrdersFromDB();
  loadInspectionOrders();

  setInterval(() => {
    loadInspectionOrders();
    loadPurchaseOrdersFromDB();
  }, 5000);
});

setInterval(() => {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (currentUserId) {
    fetch(`${API_BASE}/users/verify/${currentUserId}`).catch(() => {});
  }
}, 3000);