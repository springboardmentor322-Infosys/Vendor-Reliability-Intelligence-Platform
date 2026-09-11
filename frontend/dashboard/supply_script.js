// supply_script.js
const API_BASE = "http://127.0.0.1:8000";

let chartInstances = {};
let activeChatVendor = null;
let lastKnownSupplyMessageCounts = {};
let globalInspectionInvoicesCache = [];

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
  } else if (tabId === 'reliability-risk') {
    loadReliabilityRiskData();
  } else if (tabId === 'analytics') {
    loadAnalyticsCharts();
  } else if (tabId === 'communication-view') {
    if (activeChatVendor) {
      localStorage.setItem(`supply_unread_${activeChatVendor}`, "0");
    }
    loadCommunicationVendors();
    loadSupplyChainMessages();
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
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding: 2rem;">No purchase orders found.</td></tr>';
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
  if (s.includes("reject") || s.includes("fail") || s.includes("return")) return "status-rejected";
  if (s.includes("transit") || s.includes("process")) return "status-in-progress";
  return "status-pending";
}

async function loadInspectionOrders(isBackground = false) {
  try {
    const [invRes, poRes] = await Promise.all([
      fetchWithRetry(`${API_BASE}/api/v1/invoices`),
      fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`)
    ]);

    if (!invRes.ok || !poRes.ok) return;

    const invoices = await invRes.json();
    const purchaseOrders = await poRes.json();
    globalInspectionInvoicesCache = invoices;

    const tbody = document.getElementById('inspection-tbody');
    const returnedTbody = document.getElementById('returned-items-tbody');
    
    const poStatusMap = {};
    const poMap = {};
    purchaseOrders.forEach(po => {
      poStatusMap[po.invoice_no] = po.production_status || po.order_status;
      poMap[po.invoice_no] = po;
    });

    const validInvoices = invoices.filter(inv => {
      const s = (inv.status || "").toLowerCase();
      const orderStatus = (inv.order_status || "").toLowerCase();
      return !s.includes("reject") && !orderStatus.includes("reject") && !orderStatus.includes("returned");
    });

    const returnedInvoices = invoices.filter(inv => {
      const s = (inv.status || "").toLowerCase();
      const orderStatus = (inv.order_status || "").toLowerCase();
      return s.includes("reject") || orderStatus.includes("reject") || orderStatus.includes("returned") || inv.inspection_status === 'Fault';
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
    });

    const pendingQC = document.getElementById('dash-pending-qc');
    const passedQC = document.getElementById('dash-passed-qc');
    const failedQC = document.getElementById('dash-failed-qc');

    if (pendingQC) pendingQC.innerText = pendingCount;
    if (passedQC) passedQC.innerText = passedCount;
    if (failedQC) failedQC.innerText = failedCount;

    if (returnedTbody) {
      returnedTbody.innerHTML = '';
      if (returnedInvoices.length === 0) {
        returnedTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">No returned orders found.</td></tr>';
      } else {
        returnedInvoices.forEach(inv => {
          const poObj = poMap[inv.invoice_no] || {};
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>#${inv.invoice_no}</td>
            <td>${inv.vendor_name}</td>
            <td>${inv.product_name}</td>
            <td>${inv.quantity}</td>
            <td>${inv.department}</td>
            <td>${poObj.expiry_date || 'N/A'}</td>
            <td><span class="status-badge status-rejected">High Risk / Returned</span></td>
          `;
          returnedTbody.appendChild(row);
        });
      }
    }

    if (tbody && (!isBackground || tbody.querySelectorAll('tr').length <= 1)) {
      tbody.innerHTML = '';
      if (validInvoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">No orders available for inspection.</td></tr>';
      } else {
        validInvoices.forEach(inv => {
          const inspectionStatus = inv.inspection_status || inv.quality_status || 'In Progress';
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
              <button class="btn" style="background: #ef4444; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-left: 4px;" onclick="openReturnModal(${inv.id}, '${inv.invoice_no}')"><i class="fa-solid fa-rotate-left"></i> Return</button>
            </td>
          `;
          tbody.appendChild(row);
        });
      }
    }

    loadNotifications();
  } catch (err) {
    console.error("Error loading inspection table and metrics:", err);
  }
}

function openReturnModal(invoiceId, invoiceNo) {
  const inv = globalInspectionInvoicesCache.find(i => i.id == invoiceId || i.invoice_no === invoiceNo);
  if (!inv) {
    alert("Invoice details not found.");
    return;
  }

  document.getElementById("return-modal-invoice-id").value = inv.id;
  document.getElementById("return-modal-invNo").textContent = `#${inv.invoice_no}`;
  document.getElementById("return-modal-vendor").textContent = inv.vendor_name;
  document.getElementById("return-modal-product").textContent = inv.product_name;
  document.getElementById("return-modal-total-qty").textContent = inv.quantity;
  document.getElementById("return-modal-dept").textContent = inv.department;
  document.getElementById("return-modal-defects").value = 1;
  document.getElementById("return-modal-reason").value = "";

  const modal = document.getElementById("returnModal");
  if (modal) modal.style.display = "flex";
}

function closeReturnModal() {
  const modal = document.getElementById("returnModal");
  if (modal) modal.style.display = "none";
}

async function submitReturnOrder() {
  const invoiceId = document.getElementById("return-modal-invoice-id").value;
  const defectCount = parseInt(document.getElementById("return-modal-defects").value, 10) || 0;
  
  const inv = globalInspectionInvoicesCache.find(i => i.id == invoiceId);
  if (!inv) {
    alert("Target invoice reference not found.");
    return;
  }

  if (defectCount <= 0) {
    alert("Please enter a valid number of defect items.");
    return;
  }

  try {
    await fetchWithRetry(`${API_BASE}/api/v1/invoices/${invoiceId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'Rejected',
        order_status: 'Returned',
        inspection_status: 'Failed'
      })
    });

    const newInvoiceNo = `${inv.invoice_no}-R${Math.floor(100 + Math.random() * 900)}`;
    const unitPrice = Number(inv.amount || 0) / Number(inv.quantity || 1);
    const replacementAmount = Number((unitPrice * defectCount).toFixed(2));

    const newPoPayload = {
      invoice_no: newInvoiceNo,
      vendor_name: inv.vendor_name,
      product_name: `${inv.product_name} (Replacement)`,
      quantity: defectCount,
      department: inv.department,
      total_value: replacementAmount,
      order_status: 'Pending',
      inspection_status: 'In Progress',
      creation_date: new Date().toISOString().split('T')[0],
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const res = await fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPoPayload)
    });

    if (res.ok) {
      alert(`Return processed. Replacement PO #${newInvoiceNo} has been successfully created and sent to ${inv.vendor_name} for normal acceptance.`);
      closeReturnModal();
      await loadInspectionOrders(false);
      await loadPurchaseOrdersFromDB();
    } else {
      alert("Failed to create replacement purchase order on server.");
    }
  } catch (err) {
    console.error("Error submitting return order:", err);
    alert("Network error while processing return.");
  }
}

async function loadReliabilityRiskData(isBackground = false) {
  try {
    const [vendorRes, poRes] = await Promise.all([
      fetchWithRetry(`${API_BASE}/api/v1/vendors`),
      fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`)
    ]);

    if (!vendorRes.ok || !poRes.ok) return;
    const vendors = await vendorRes.json();
    const orders = await poRes.json();

    const reliabilityTbody = document.getElementById('reliability-tbody');
    if (!reliabilityTbody) return;

    let totalScoreSum = 0;
    let highRiskCount = 0;

    vendors.forEach(v => {
      const score = Number(v.reliability_score ?? 85);
      totalScoreSum += score;
      if (score < 75) highRiskCount++;
    });

    const avgScore = vendors.length > 0 ? Math.round(totalScoreSum / vendors.length) : 85;

    const onTimeElem = document.getElementById('rel-ontime-rate');
    const resolutionElem = document.getElementById('rel-resolution-time');
    const delayedElem = document.getElementById('rel-delayed-count');
    const highRiskElem = document.getElementById('rel-high-risk-count');
    const dashOnTimeElem = document.getElementById('dash-ontime-rate');
    const dashHighRiskElem = document.getElementById('dash-high-risk-count');

    if (onTimeElem) onTimeElem.innerText = `${avgScore}%`;
    if (resolutionElem) resolutionElem.innerText = `1.2 Days`;
    if (delayedElem) delayedElem.innerText = orders.filter(po => (po.production_status || po.order_status || "").toLowerCase().includes("delay")).length;
    if (highRiskElem) highRiskElem.innerText = highRiskCount;
    if (dashOnTimeElem) dashOnTimeElem.innerText = `${avgScore}%`;
    if (dashHighRiskElem) dashHighRiskElem.innerText = highRiskCount;

    if (!isBackground || reliabilityTbody.querySelectorAll('tr').length <= 1) {
      if (vendors.length === 0) {
        reliabilityTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">No vendors found in database.</td></tr>';
      } else {
        reliabilityTbody.innerHTML = '';
        vendors.forEach(v => {
          // Render exact database scores and risk tiers directly for all registered vendors
          const score = Number(v.reliability_score ?? 85);
          const qualityText = score >= 90 ? 'Excellent' : (score >= 75 ? 'Good' : 'Poor');
          const riskTier = v.risk_tier || (score < 75 ? "High Risk" : (score < 90 ? "Medium Risk" : "Low Risk"));
          const riskColor = score < 75 ? "#dc2626" : (score < 90 ? "#d97706" : "#059669");

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${v.vendor_name}</td>
            <td>${v.category || 'General'}</td>
            <td>${score >= 75 ? '98%' : '82%'}</td>
            <td>${qualityText}</td>
            <td>${score}%</td>
            <td><span style="color: ${riskColor}; font-weight: 700;">${score}%</span></td>
            <td><span style="color: ${riskColor}; font-weight: 800;">${riskTier}</span></td>
          `;
          reliabilityTbody.appendChild(row);
        });
      }
    }
  } catch (err) {
    console.error("Error loading reliability & risk data:", err);
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
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border);">
          <i class="fa-solid fa-cart-shopping text-blue" style="font-size: 1.5rem;"></i>
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 800;">New Purchase Order Created</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted);">PO #${po.invoice_no || po.id} created for ${po.vendor_name || po.vendor} (${po.product_name}).</p>
          </div>
        </div>
      `;
    });

    invoices.forEach(inv => {
      const status = (inv.order_status || inv.delivery_status || inv.status || "").toLowerCase();
      if (status.includes("deliver") || status.includes("complet") || status.includes("approve")) {
        notificationsHTML += `
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border);">
            <i class="fa-solid fa-circle-check text-green" style="font-size: 1.5rem;"></i>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 800;">Order Delivered</h4>
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
    const [poRes, vendorRes] = await Promise.all([
      fetchWithRetry(`${API_BASE}/api/v1/purchase-orders`),
      fetchWithRetry(`${API_BASE}/api/v1/vendors`)
    ]);
    if (!poRes.ok || !vendorRes.ok) return;
    const purchaseOrders = await poRes.json();
    const vendors = await vendorRes.json();

    Object.keys(chartInstances).forEach(id => {
      if (chartInstances[id]) chartInstances[id].destroy();
    });
    chartInstances = {};

    const deptSpend = {};
    purchaseOrders.forEach(po => {
      const dept = po.department || 'General';
      deptSpend[dept] = (deptSpend[dept] || 0) + Number(po.total_value || 0);
    });

    const deptCtx = document.getElementById('generalDeptChart')?.getContext('2d');
    if (deptCtx) {
      chartInstances['generalDeptChart'] = new Chart(deptCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(deptSpend),
          datasets: [{
            label: 'Spend ($)',
            data: Object.values(deptSpend),
            backgroundColor: '#8b5cf6',
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    const statusCount = {};
    purchaseOrders.forEach(po => {
      const status = po.order_status || po.production_status || 'Pending';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const statusCtx = document.getElementById('generalStatusChart')?.getContext('2d');
    if (statusCtx) {
      chartInstances['generalStatusChart'] = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statusCount),
          datasets: [{
            data: Object.values(statusCount),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
          }
        }
      });
    }

    const categoryCount = {};
    vendors.forEach(v => {
      const cat = v.category || 'General';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const prodCtx = document.getElementById('generalProductChart')?.getContext('2d');
    if (prodCtx) {
      chartInstances['generalProductChart'] = new Chart(prodCtx, {
        type: 'pie',
        data: {
          labels: Object.keys(categoryCount),
          datasets: [{
            data: Object.values(categoryCount),
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
          }
        }
      });
    }

    const riskCount = { "Low Risk": 0, "Medium Risk": 0, "High Risk": 0 };
    vendors.forEach(v => {
      const score = Number(v.reliability_score || 85);
      let tier = "Low Risk";
      if (score < 75) tier = "High Risk";
      else if (score < 90) tier = "Medium Risk";
      
      if (riskCount[tier] !== undefined) {
        riskCount[tier]++;
      }
    });

    const riskCtx = document.getElementById('generalRiskChart')?.getContext('2d');
    if (riskCtx) {
      chartInstances['generalRiskChart'] = new Chart(riskCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(riskCount),
          datasets: [{
            data: Object.values(riskCount),
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
          }
        }
      });
    }

    const vendorSpend = {};
    purchaseOrders.forEach(po => {
      const vendor = po.vendor_name || po.vendor || 'Unknown';
      vendorSpend[vendor] = (vendorSpend[vendor] || 0) + Number(po.total_value || 0);
    });

    const sortedVendors = Object.entries(vendorSpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const vendorCtx = document.getElementById('generalTopVendorsChart')?.getContext('2d');
    if (vendorCtx) {
      chartInstances['generalTopVendorsChart'] = new Chart(vendorCtx, {
        type: 'bar',
        data: {
          labels: sortedVendors.map(v => v[0]),
          datasets: [{
            label: 'Total Spend ($)',
            data: sortedVendors.map(v => v[1]),
            backgroundColor: '#3b82f6',
            borderRadius: 8
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
            y: { grid: { display: false } }
          }
        }
      });
    }

  } catch (err) {
    console.error("Error loading general analytics charts:", err);
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
      await loadInspectionOrders(false);
    } else {
      alert("Failed to update inspection status.");
    }
  } catch (err) {
    console.error("Inspection update error:", err);
    alert("Server error while updating inspection.");
  }
}

async function loadCommunicationVendors() {
  const listContainer = document.getElementById("vendor-channels-list");
  if (!listContainer) return;

  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/vendors`);
    if (!res.ok) return;
    const vendors = await res.json();

    if (vendors.length === 0) {
      listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">No vendors found.</p>';
      return;
    }

    vendors.forEach(v => {
      const name = v.vendor_name;
      if (!name) return;

      const storageKey = `supply_chain_chat_${name}`;
      const messages = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const totalMsgs = messages.length;

      if (lastKnownSupplyMessageCounts[name] === undefined) {
        lastKnownSupplyMessageCounts[name] = totalMsgs;
      } else if (totalMsgs > lastKnownSupplyMessageCounts[name]) {
        const diff = totalMsgs - lastKnownSupplyMessageCounts[name];
        lastKnownSupplyMessageCounts[name] = totalMsgs;

        if (activeChatVendor !== name) {
          const unreadKey = `supply_unread_${name}`;
          let currentUnread = parseInt(localStorage.getItem(unreadKey) || "0", 10);
          localStorage.setItem(unreadKey, currentUnread + diff);
        }
      }
    });

    renderVendorChannelList(vendors);
  } catch (err) {
    console.error("Failed to load communication vendors:", err);
  }
}

function renderVendorChannelList(vendors) {
  const listContainer = document.getElementById("vendor-channels-list");
  if (!listContainer) return;

  const searchTerm = (document.getElementById("vendor-search-input")?.value || "").toLowerCase();
  const filtered = vendors.filter(v => (v.vendor_name || "").toLowerCase().includes(searchTerm));

  if (filtered.length === 0) {
    listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">No matching vendors found.</p>';
    return;
  }

  listContainer.innerHTML = filtered.map(v => {
    const name = v.vendor_name || 'Unknown Vendor';
    const category = v.category || 'General';
    const isSelected = activeChatVendor === name;
    const bgStyle = isSelected ? 'background: rgba(139, 92, 246, 0.2); border-color: rgba(139, 92, 246, 0.5);' : 'background: rgba(255, 255, 255, 0.05); border-color: var(--border);';

    const unreadKey = `supply_unread_${name}`;
    const unreadCount = parseInt(localStorage.getItem(unreadKey) || "0", 10);
    const badgeHTML = (unreadCount > 0 && !isSelected) ? `<span style="background: #ef4444; color: white; border-radius: 50px; padding: 2px 8px; font-size: 10px; font-weight: 700;">${unreadCount > 9 ? '9+' : unreadCount}</span>` : '';

    return `
      <div onclick="selectVendorChat('${name.replace(/'/g, "\\'")}')" style="${bgStyle} padding: 12px 14px; border-radius: 12px; border: 1px solid; cursor: pointer; transition: all 0.2s ease; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="display: block; color: var(--text-dark); font-size: 0.9rem; margin-bottom: 2px;">${name}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Category: ${category}</span>
        </div>
        ${badgeHTML}
      </div>
    `;
  }).join('');
}

function filterVendorChannels() {
  fetchWithRetry(`${API_BASE}/api/v1/vendors`)
    .then(res => res.json())
    .then(vendors => renderVendorChannelList(vendors))
    .catch(() => {});
}

function selectVendorChat(vendorName) {
  activeChatVendor = vendorName;
  
  localStorage.setItem(`supply_unread_${vendorName}`, "0");
  
  const titleEl = document.getElementById("active-chat-vendor-title");
  const subEl = document.getElementById("active-chat-vendor-sub");
  if (titleEl) titleEl.textContent = `Chat with ${vendorName}`;
  if (subEl) subEl.textContent = `Direct secure communication stream`;

  loadSupplyChainMessages();
  loadCommunicationVendors();
}

function clearSupplyChainChat() {
  if (!activeChatVendor) {
    alert("Please select a vendor channel first.");
    return;
  }
  
  if (confirm(`Are you sure you want to clear the chat history with ${activeChatVendor}?`)) {
    const storageKey = `supply_chain_chat_${activeChatVendor}`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`vendor_chat_${activeChatVendor}_Supply Chain Manager`);
    localStorage.setItem(`supply_unread_${activeChatVendor}`, "0");

    loadSupplyChainMessages();
    loadCommunicationVendors();
  }
}

function loadSupplyChainMessages() {
  const container = document.getElementById("supply-chat-container");
  if (!container) return;

  if (!activeChatVendor) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 2rem;">
        <i class="fa-regular fa-comments" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p style="font-size: 0.9rem;">Please select a vendor from the right panel to view and send messages.</p>
      </div>
    `;
    return;
  }

  const storageKey = `supply_chain_chat_${activeChatVendor}`;
  const savedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");

  let historyHTML = `
    <div style="display: flex; flex-direction: column; align-items: flex-start; max-width: 80%;">
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; padding-left: 4px;">System Desk • Secure Channel</div>
      <div style="background: rgba(255, 255, 255, 0.15); border: 1px solid var(--border); padding: 12px 16px; border-radius: 16px; border-top-left-radius: 4px; font-size: 0.9rem; color: var(--text-dark); line-height: 1.5;">
        Started secure conversation thread with <strong>${activeChatVendor}</strong>.
      </div>
    </div>
  `;

  savedMessages.forEach(msg => {
    const timeFormatted = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (msg.sender === 'manager') {
      historyHTML += `
        <div style="display: flex; flex-direction: column; align-items: flex-end; align-self: flex-end; max-width: 80%;">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; padding-right: 4px;">Supply Chain Manager • ${timeFormatted}</div>
          <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.85), rgba(236, 72, 153, 0.85)); color: #ffffff; padding: 12px 16px; border-radius: 16px; border-top-right-radius: 4px; font-size: 0.9rem; line-height: 1.5; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);">
            ${escapeHtml(msg.text)}
          </div>
        </div>
      `;
    } else {
      historyHTML += `
        <div style="display: flex; flex-direction: column; align-items: flex-start; max-width: 80%;">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; padding-left: 4px;">${activeChatVendor} • ${timeFormatted}</div>
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

function sendSupplyChainMessage(event) {
  if (event) event.preventDefault();
  if (!activeChatVendor) {
    alert("Please select a vendor from the right panel first.");
    return;
  }

  const inputEl = document.getElementById("supply-chat-input");
  if (!inputEl) return;

  const text = inputEl.value.trim();
  if (!text) return;

  const newMsg = { sender: 'manager', text, timestamp: Date.now() };
  const storageKey = `supply_chain_chat_${activeChatVendor}`;
  let savedMessages = JSON.parse(localStorage.getItem(storageKey) || "[]");
  savedMessages.push(newMsg);
  localStorage.setItem(storageKey, JSON.stringify(savedMessages));

  const vendorChatKey = `vendor_chat_${activeChatVendor}_Supply Chain Manager`;
  let vendorChatHistory = JSON.parse(localStorage.getItem(vendorChatKey) || "[]");
  vendorChatHistory.push({ sender: 'role', senderName: 'Supply Chain Manager', text, timestamp: Date.now() });
  localStorage.setItem(vendorChatKey, JSON.stringify(vendorChatHistory));

  lastKnownSupplyMessageCounts[activeChatVendor] = savedMessages.length;

  inputEl.value = "";
  loadSupplyChainMessages();
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
      alert("Account session expired or revoked.");
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = '../login/index.html';
    }
  } catch (err) {
    console.error("Session verification failed:", err);
  }
}

function handleLogout(event) {
  if (event) event.preventDefault();
  sessionStorage.clear();
  localStorage.clear();
  window.location.href = '../login/index.html';
}

window.addEventListener('DOMContentLoaded', () => {
  checkActiveSession();
  loadPurchaseOrdersFromDB();
  loadInspectionOrders(false);
  loadReliabilityRiskData(false);
  loadAnalyticsCharts();

  setInterval(() => {
    loadInspectionOrders(true);
    loadPurchaseOrdersFromDB();
    loadReliabilityRiskData(true);
    const commView = document.getElementById('communication-view');
    if (commView && commView.classList.contains('active')) {
      loadSupplyChainMessages();
      loadCommunicationVendors();
    }
  }, 5000);
});

setInterval(() => {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (currentUserId) {
    fetch(`${API_BASE}/users/verify/${currentUserId}`).catch(() => {});
  }
}, 3000);
