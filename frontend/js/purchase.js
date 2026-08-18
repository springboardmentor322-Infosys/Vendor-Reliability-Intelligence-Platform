const API_BASE_URL = "http://127.0.0.1:8000";
let allPurchaseOrders = [];
let poStatusChart = null;

// Initialize form and calculate totals
document.addEventListener("DOMContentLoaded", () => {
    const role = getUserRole();
    const isVendor = (role === "Vendor");

    if (isVendor) {
        const formContainer = document.querySelector(".form-container");
        if (formContainer) {
            formContainer.style.display = "none";
            const gridContainer = formContainer.parentElement;
            if (gridContainer) {
                gridContainer.style.gridTemplateColumns = "1fr";
            }
        }
        const saveBtn = document.getElementById("save-po-btn");
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.display = "none";
        }
    }

    document.getElementById("purchaseForm").addEventListener("submit", addPurchaseOrder);
    document.getElementById("quantity").addEventListener("input", calculateTotal);
    document.getElementById("unit_price").addEventListener("input", calculateTotal);
    
    // Bind search and filter
    document.getElementById("searchPOs").addEventListener("input", filterAndRenderTable);
    document.getElementById("filterPOStatus").addEventListener("change", filterAndRenderTable);
    
    // Bind table action click handler using event delegation
    const tbody = document.querySelector("#purchaseTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
    }
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("order_date").value = today;
    
    loadPurchaseOrders();
    loadVendors();
});

function calculateTotal() {
    const qty = parseFloat(document.getElementById("quantity").value) || 0;
    const price = parseFloat(document.getElementById("unit_price").value) || 0;
    document.getElementById("total_amount").value = (qty * price).toFixed(2);
}

async function addPurchaseOrder(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("vendor_id", document.getElementById("vendor_id").value);
    formData.append("product_name", document.getElementById("product_name").value);
    formData.append("quantity", document.getElementById("quantity").value);
    formData.append("unit_price", document.getElementById("unit_price").value);
    formData.append("total_amount", document.getElementById("total_amount").value);
    formData.append("order_date", document.getElementById("order_date").value);
    formData.append("expected_delivery", document.getElementById("expected_delivery").value);
    formData.append("status", "Pending");

    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Purchase order registered successfully.", "success");
            document.getElementById("purchaseForm").reset();
            calculateTotal();
            // Reset date
            const today = new Date().toISOString().split('T')[0];
            document.getElementById("order_date").value = today;
            
            loadPurchaseOrders();
        } else {
            showToast(result.detail || "Error saving purchase order.", "error");
        }
    } catch (error) {
        console.error("Save PO error:", error);
        showToast("Unable to reach the server. Please try again.", "error");
    }
}

let currentPage = 1;
const limit = 20;

function setupPaginationDOM() {
    const tableCard = document.querySelector(".table-card");
    if (!tableCard) return;
    
    if (document.getElementById("paginationContainer")) return;
    
    const pagDiv = document.createElement("div");
    pagDiv.id = "paginationContainer";
    pagDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 12px 16px; border-top: 1px solid var(--border-color); background-color: var(--card-bg);";
    
    pagDiv.innerHTML = `
        <div id="paginationInfo" style="font-size: 13px; color: var(--text-secondary);">Showing 0-0 of 0 items</div>
        <div style="display: flex; gap: 8px;">
            <button id="prevPageBtn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px;">Previous</button>
            <button id="nextPageBtn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px;">Next</button>
        </div>
    `;
    
    tableCard.appendChild(pagDiv);
    
    document.getElementById("prevPageBtn").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadPurchaseOrders();
        }
    });
    
    document.getElementById("nextPageBtn").addEventListener("click", () => {
        currentPage++;
        loadPurchaseOrders();
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
    
    info.textContent = `Showing ${startIdx}-${endIdx} of ${totalCount} items`;
    
    prevBtn.disabled = (currentPage === 1);
    prevBtn.style.opacity = prevBtn.disabled ? "0.5" : "1";
    prevBtn.style.cursor = prevBtn.disabled ? "not-allowed" : "pointer";
    
    const hasNext = (currentPage * limit < totalCount);
    nextBtn.disabled = !hasNext;
    nextBtn.style.opacity = nextBtn.disabled ? "0.5" : "1";
    nextBtn.style.cursor = nextBtn.disabled ? "not-allowed" : "pointer";
}

async function loadPurchaseOrders() {
    try {
        const searchVal = document.getElementById("searchPOs").value;
        const statusFilter = document.getElementById("filterPOStatus").value;
        
        let url = `${API_BASE_URL}/purchase-orders?page=${currentPage}&limit=${limit}`;
        if (searchVal) {
            url += `&search=${encodeURIComponent(searchVal)}`;
        }
        if (statusFilter) {
            url += `&status=${encodeURIComponent(statusFilter)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`POs API Error: ${response.status}`);
        }
        const data = await response.json();

        allPurchaseOrders = Array.isArray(data.purchase_orders) ? data.purchase_orders : [];
        
        // Update KPIs
        calculateKPIs(data);

        // Render table
        renderTableRows();

        // Render chart
        renderStatusChart(data.status_counts);
        
        // Render pagination controls
        updatePaginationControls(data.total_count);

    } catch (error) {
        console.error("Load POs error:", error);
        const tbody = document.querySelector("#purchaseTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error loading purchase orders: ${error.message}</td></tr>`;
        }
    }
}

function calculateKPIs(data) {
    document.getElementById("kpiTotalPOs").textContent = data.kpi_total || 0;
    document.getElementById("kpiPendingPOs").textContent = data.kpi_pending || 0;
    document.getElementById("kpiCompletedPOs").textContent = data.kpi_completed || 0;
    document.getElementById("kpiDeliveredPOs").textContent = data.kpi_delivered || 0;
}

function renderTableRows() {
    const role = getUserRole();
    const isVendor = (role === "Vendor");

    const actionsHeader = Array.from(document.querySelectorAll("#purchaseTable thead th")).find(th => th.textContent.trim() === "Actions");
    if (actionsHeader) {
        actionsHeader.style.display = isVendor ? "none" : "";
    }

    const tbody = document.querySelector("#purchaseTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (allPurchaseOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isVendor ? 9 : 10}" class="empty-state-wrapper">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No purchase orders found</div>
            <p>Refine your search keywords or filters.</p>
        </td></tr>`;
        return;
    }

    allPurchaseOrders.forEach(po => {
        let statusClass = "badge-neutral";
        const statusLower = (po.status || "").toLowerCase();
        if (statusLower === "pending") statusClass = "badge-pending";
        else if (statusLower === "completed" || statusLower === "approved") statusClass = "badge-active";
        else if (statusLower === "delivered" || statusLower === "processing") statusClass = "badge-info";
        else if (statusLower === "fraud") statusClass = "badge-poor";

        let actionTdHtml = "";
        if (!isVendor) {
            actionTdHtml = `
            <td>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary" data-action="edit" style="padding: 6px 10px; font-size: 11px;">Edit</button>
                    <button class="btn btn-primary" data-action="status" style="padding: 6px 10px; font-size: 11px;">Next Status</button>
                    <button class="btn btn-danger" data-action="delete" style="padding: 6px 10px; font-size: 11px;">Delete</button>
                </div>
            </td>`;
        }

        tbody.innerHTML += `
        <tr data-id="${po.id}">
            <td>${po.id}</td>
            <td style="font-weight: 600;">${po.vendor_name}</td>
            <td>${po.product_name}</td>
            <td>${po.quantity}</td>
            <td>₹${po.unit_price.toFixed(2)}</td>
            <td style="font-weight: 600;">₹${po.total_amount.toFixed(2)}</td>
            <td>${po.order_date}</td>
            <td>${po.expected_delivery}</td>
            <td><span class="badge ${statusClass}">${po.status}</span></td>
            ${actionTdHtml}
        </tr>
        `;
    });
}

function filterAndRenderTable() {
    currentPage = 1;
    loadPurchaseOrders();
}

function handleTableClick(event) {
    const btn = event.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const tr = btn.closest("tr");
    const id = parseInt(tr.dataset.id);
    const po = allPurchaseOrders.find(o => o.id === id);

    if (!po) return;

    if (action === "edit") {
        editPurchase(po);
    } else if (action === "status") {
        updateOrderStatus(id);
    } else if (action === "delete") {
        deletePurchase(id);
    }
}

async function editPurchase(po) {
    const vendor_id = prompt("Enter Vendor ID", po.vendor_id);
    if (vendor_id === null) return;

    const product_name = prompt("Enter Product Name", po.product_name);
    if (product_name === null) return;

    const quantity = prompt("Enter Quantity", po.quantity);
    if (quantity === null) return;

    const unit_price = prompt("Enter Unit Price", po.unit_price);
    if (unit_price === null) return;

    const total_amount = prompt("Enter Total Amount", po.total_amount);
    if (total_amount === null) return;

    const order_date = prompt("Enter Order Date (YYYY-MM-DD)", po.order_date);
    if (order_date === null) return;

    const expected_delivery = prompt("Enter Expected Delivery Date (YYYY-MM-DD)", po.expected_delivery);
    if (expected_delivery === null) return;

    const status = prompt("Enter Status", po.status);
    if (status === null) return;

    const formData = new FormData();
    formData.append("vendor_id", vendor_id);
    formData.append("product_name", product_name);
    formData.append("quantity", quantity);
    formData.append("unit_price", unit_price);
    formData.append("total_amount", total_amount);
    formData.append("order_date", order_date);
    formData.append("expected_delivery", expected_delivery);
    formData.append("status", status);

    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${po.id}`, {
            method: "PUT",
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Purchase order details updated.", "success");
            loadPurchaseOrders();
        } else {
            showToast(result.detail || "Permission Denied: Unable to edit this PO.", "error");
        }
    } catch (e) {
        showToast("Error updating purchase order.", "error");
    }
}

async function deletePurchase(id) {
    const confirmDelete = confirm("Are you sure you want to delete this purchase order record?");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Purchase order successfully removed.", "success");
            loadPurchaseOrders();
        } else {
            showToast(result.detail || "Permission Denied: Unable to delete this PO.", "error");
        }
    } catch (e) {
        showToast("Error executing PO deletion.", "error");
    }
}

async function updateOrderStatus(id) {
    const confirmUpdate = confirm("Move purchase order to next workflow status?");
    if (!confirmUpdate) return;

    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders/status/${id}`, {
            method: "PUT"
        });

        const result = await response.json();
        if (response.ok) {
            showToast(`Workflow status updated!`, "success");
            loadPurchaseOrders();
        } else {
            showToast(result.detail || "Permission Denied: Unable to update PO status.", "error");
        }
    } catch (e) {
        showToast("Error changing PO status.", "error");
    }
}

async function loadVendors() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendors`);
        const vendors = await response.json();
        const vendorSelect = document.getElementById("vendor_id");

        if (vendorSelect) {
            vendorSelect.innerHTML = `<option value="">Select Vendor</option>`;
            vendors.forEach(vendor => {
                vendorSelect.innerHTML += `<option value="${vendor.id}">${vendor.vendor_name}</option>`;
            });
        }
    } catch (e) {
        console.error("Load select vendors error:", e);
    }
}

function renderStatusChart(counts) {
    if (poStatusChart) poStatusChart.destroy();
    if (!counts) counts = {};

    const ctx = document.getElementById("poStatusChart").getContext("2d");
    poStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#6b7280', '#ec4899', '#8b5cf6']
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