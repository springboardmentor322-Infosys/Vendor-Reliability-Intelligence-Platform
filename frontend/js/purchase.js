const API_BASE_URL = "http://127.0.0.1:8000";
let allPurchaseOrders = [];
let poStatusChart = null;
let currentSourceFilter = "application"; // "application" (default for Procurement Manager) | "historical" | "all"

function isApplicationPO(po) {
    if (!po) return false;
    if (po.is_application_order !== undefined && po.is_application_order !== null) {
        return Boolean(po.is_application_order);
    }
    if (po.is_app_po !== undefined && po.is_app_po !== null) {
        return Boolean(po.is_app_po);
    }
    if (po.source_type) {
        return po.source_type.toLowerCase().includes("application");
    }
    if (po.data_source) {
        return po.data_source.toLowerCase().includes("application");
    }
    return Boolean(po.id >= 180520 || (po.po_number && String(po.po_number).includes("2026")));
}

function setSourceFilter(source) {
    currentSourceFilter = source;
    syncSourceFilterUI(source);
    currentPage = 1;
    loadPurchaseOrders();
}

function syncSourceFilterUI(source) {
    const btnApp = document.getElementById("btnSourceApp");
    const btnHist = document.getElementById("btnSourceHist");
    const btnAll = document.getElementById("btnSourceAll");
    const selSource = document.getElementById("filterPOSource");
    const subheading = document.getElementById("tableSubheading");

    if (btnApp) {
        btnApp.className = `btn btn-sm ${source === 'application' ? 'btn-primary active' : 'btn-secondary'}`;
    }
    if (btnHist) {
        btnHist.className = `btn btn-sm ${source === 'historical' ? 'btn-primary active' : 'btn-secondary'}`;
    }
    if (btnAll) {
        btnAll.className = `btn btn-sm ${source === 'all' ? 'btn-primary active' : 'btn-secondary'}`;
    }
    if (selSource) {
        selSource.value = source;
    }
    if (subheading) {
        const role = typeof getUserRole === "function" ? getUserRole() : null;
        if (role === "Finance Officer") {
            if (source === 'application') {
                subheading.textContent = "Showing Application Purchase Orders with linked invoice amounts and payment statuses.";
            } else if (source === 'historical') {
                subheading.textContent = "Showing Historical DataCo Supply Chain records with procurement financial audit details.";
            } else {
                subheading.textContent = "Showing All Records with Application Purchase Orders prioritized first.";
            }
        } else {
            if (source === 'application') {
                subheading.textContent = "Showing Application Purchase Orders first for active procurement workflows. Historical records are isolated.";
            } else if (source === 'historical') {
                subheading.textContent = "Showing Historical DataCo Supply Chain records. Newly created workflow orders are kept separate.";
            } else {
                subheading.textContent = "Showing All Records with Application Purchase Orders prioritized first.";
            }
        }
    }
}

// Initialize form and calculate totals
document.addEventListener("DOMContentLoaded", () => {
    const role = getUserRole();
    const isVendor = (role === "Vendor");
    const isFinanceOfficer = (role === "Finance Officer");

    if (isVendor || isFinanceOfficer) {
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

    if (isFinanceOfficer) {
        const pageHeaderDesc = document.querySelector("body > div:first-child p");
        if (pageHeaderDesc) {
            pageHeaderDesc.textContent = "Record advance payments, track operational fulfillment, and release final settlements upon order completion.";
        }
        const tableTitle = document.querySelector(".table-header-title h3");
        if (tableTitle) {
            tableTitle.textContent = "Purchase Orders Financial Disbursement Ledger";
        }
        const thead = document.querySelector("#purchaseTable thead");
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>PO Number</th>
                    <th>Supplier Partner</th>
                    <th>Product Specification</th>
                    <th>Total Amount</th>
                    <th>Advance %</th>
                    <th>Advance Paid</th>
                    <th>Remaining Due</th>
                    <th>PO Status</th>
                    <th>Payment Status</th>
                    <th>Advance Date</th>
                    <th>Final Date</th>
                    <th>Actions</th>
                </tr>
            `;
            thead.dataset.financeConfigured = "true";
        }
    }

    if (!isVendor && !isFinanceOfficer) {
        document.getElementById("purchaseForm").addEventListener("submit", addPurchaseOrder);
        document.getElementById("quantity").addEventListener("input", calculateTotal);
        document.getElementById("unit_price").addEventListener("input", calculateTotal);
    }
    
    // Bind search and filter
    document.getElementById("searchPOs").addEventListener("input", filterAndRenderTable);
    document.getElementById("filterPOStatus").addEventListener("change", filterAndRenderTable);

    // Source Filter Toggle & Select Bindings
    const urlParams = new URLSearchParams(window.location.search);
    const sourceParam = urlParams.get("source");
    if (sourceParam && ["application", "historical", "all"].includes(sourceParam.toLowerCase())) {
        currentSourceFilter = sourceParam.toLowerCase();
    } else {
        // By default, show Application Purchase Orders first for Procurement Manager workflows
        currentSourceFilter = "application";
    }
    syncSourceFilterUI(currentSourceFilter);

    const btnApp = document.getElementById("btnSourceApp");
    const btnHist = document.getElementById("btnSourceHist");
    const btnAll = document.getElementById("btnSourceAll");
    const selSource = document.getElementById("filterPOSource");

    if (btnApp) btnApp.addEventListener("click", () => setSourceFilter("application"));
    if (btnHist) btnHist.addEventListener("click", () => setSourceFilter("historical"));
    if (btnAll) btnAll.addEventListener("click", () => setSourceFilter("all"));
    if (selSource) selSource.addEventListener("change", (e) => setSourceFilter(e.target.value));
    
    // Bind table action click handler using event delegation
    const tbody = document.querySelector("#purchaseTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
    }
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("order_date").value = today;

    // Check URL parameters for status filter
    const statusParam = urlParams.get("status");
    if (statusParam) {
        const filterSelect = document.getElementById("filterPOStatus");
        if (filterSelect) {
            const rawStatus = statusParam.trim().toLowerCase();
            const statusMap = {
                "pending": "Pending",
                "pending approval": "Pending",
                "approved": "Approved",
                "ordered": "Ordered",
                "in-transit": "In-Transit",
                "in transit": "In-Transit",
                "delivered": "Delivered",
                "completed": "Completed",
                "delayed": "Delayed",
                "overdue": "Delayed",
                "cancelled": "Cancelled"
            };
            const mappedStatus = statusMap[rawStatus] || statusParam;
            for (let opt of filterSelect.options) {
                if (opt.value.toLowerCase() === mappedStatus.toLowerCase() || opt.text.toLowerCase().includes(rawStatus)) {
                    filterSelect.value = opt.value;
                    break;
                }
            }
        }
        // If status is provided without explicit source, default to "all" so results from both application and ledger appear
        if (!sourceParam) {
            currentSourceFilter = "all";
            syncSourceFilterUI(currentSourceFilter);
        }
    }
    
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
    formData.append("status", "Pending Approval");

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Purchase order registered successfully.", "success");
            document.getElementById("purchaseForm").reset();
            calculateTotal();
            const today = new Date().toISOString().split('T')[0];
            // Automatically show Application Purchase Orders so newly created workflow order is immediately visible
            setSourceFilter("application");
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
    
    if (currentSourceFilter === "application") {
        info.textContent = `Showing ${allPurchaseOrders.length} of ${allPurchaseOrders.length} Application Purchase Orders (isolated from historical ledger)`;
        prevBtn.disabled = true;
        prevBtn.style.opacity = "0.5";
        prevBtn.style.cursor = "not-allowed";
        nextBtn.disabled = true;
        nextBtn.style.opacity = "0.5";
        nextBtn.style.cursor = "not-allowed";
        return;
    }

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
        if (currentSourceFilter === "application") {
            // Retrieve full application batch (backend orders by is_app_po DESC so app orders are on page 1)
            url = `${API_BASE_URL}/purchase-orders?page=1&limit=100`;
        }
        if (searchVal) {
            url += `&search=${encodeURIComponent(searchVal)}`;
        }
        if (statusFilter) {
            url += `&status=${encodeURIComponent(statusFilter)}`;
        }

        const token = getToken();
        const response = await fetch(url, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            throw new Error(`POs API Error: ${response.status}`);
        }
        const data = await response.json();

        let rawOrders = Array.isArray(data.purchase_orders) ? data.purchase_orders : [];

        // Apply Source Filter and Ordering using existing source_type / is_application_order / is_app_po fields
        if (currentSourceFilter === "application") {
            allPurchaseOrders = rawOrders.filter(po => isApplicationPO(po));
            allPurchaseOrders.sort((a, b) => b.id - a.id);
        } else if (currentSourceFilter === "historical") {
            allPurchaseOrders = rawOrders.filter(po => !isApplicationPO(po));
        } else {
            allPurchaseOrders = [...rawOrders];
            allPurchaseOrders.sort((a, b) => {
                const aApp = isApplicationPO(a);
                const bApp = isApplicationPO(b);
                if (aApp !== bApp) return bApp ? 1 : -1;
                return b.id - a.id;
            });
        }
        
        // Update KPIs
        calculateKPIs(data);

        // Render table
        renderTableRows();

        // Render chart
        renderStatusChart(data.status_counts);
        
        // Render pagination controls
        const totalItemsCount = (currentSourceFilter === "application") ? allPurchaseOrders.length : data.total_count;
        updatePaginationControls(totalItemsCount);

    } catch (error) {
        console.error("Load POs error:", error);
        const tbody = document.querySelector("#purchaseTable tbody");
        if (tbody) {
            const role = typeof getUserRole === "function" ? getUserRole() : null;
            const colSpan = (role === "Finance Officer") ? 13 : (role === "Vendor") ? 10 : 11;
            tbody.innerHTML = `<tr><td colspan="${colSpan}" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error loading purchase orders: ${error.message}</td></tr>`;
        }
    }
}

function calculateKPIs(data) {
    document.getElementById("kpiTotalPOs").textContent = Number(data.kpi_total || 0).toLocaleString();
    const elSub = document.getElementById("kpiTotalSub");
    if (elSub && data.kpi_unique_orders) {
        elSub.textContent = `${Number(data.kpi_unique_orders).toLocaleString()} unique orders (${Number(data.kpi_total).toLocaleString()} line items)`;
    }
    document.getElementById("kpiPendingPOs").textContent = Number(data.kpi_pending || 0).toLocaleString();
    document.getElementById("kpiCompletedPOs").textContent = Number(data.kpi_completed || 0).toLocaleString();
    document.getElementById("kpiDeliveredPOs").textContent = Number(data.kpi_delivered || 0).toLocaleString();
}

function getInvoiceBadgeClass(status) {
    if (!status) return "badge-neutral";
    const s = String(status).trim().toLowerCase();
    if (s === "approved" || s === "paid" || s === "completed") return "badge-active";
    if (s === "pending" || s === "pending review" || s === "pending approval") return "badge-pending";
    if (s === "rejected" || s === "cancelled" || s === "canceled" || s === "fraud") return "badge-poor";
    return "badge-info";
}

function getPaymentBadgeClass(status) {
    if (!status) return "badge-neutral";
    const s = String(status).trim().toLowerCase();
    if (s === "paid" || s === "settled" || s === "completed") return "badge-active";
    if (s === "pending" || s === "unpaid" || s === "processing") return "badge-pending";
    if (s === "partially paid" || s === "partial") return "badge-warning";
    if (s === "overdue" || s === "rejected" || s === "failed") return "badge-poor";
    return "badge-neutral";
}

function renderTableRows() {
    const role = getUserRole();
    const isVendor = (role === "Vendor");
    const isFinanceOfficer = (role === "Finance Officer");

    if (isFinanceOfficer) {
        const thead = document.querySelector("#purchaseTable thead");
        if (thead && !thead.dataset.financeConfigured) {
            thead.innerHTML = `
                <tr>
                    <th>PO Number</th>
                    <th>Supplier Partner</th>
                    <th>Product Specification</th>
                    <th>Total Amount</th>
                    <th>Advance %</th>
                    <th>Advance Paid</th>
                    <th>Remaining Due</th>
                    <th>PO Status</th>
                    <th>Payment Status</th>
                    <th>Advance Date</th>
                    <th>Final Date</th>
                    <th>Actions</th>
                </tr>
            `;
            thead.dataset.financeConfigured = "true";
        }
    } else {
        const actionsHeader = Array.from(document.querySelectorAll("#purchaseTable thead th")).find(th => th.textContent.trim() === "Actions");
        if (actionsHeader) {
            actionsHeader.style.display = "";
        }
    }

    const tbody = document.querySelector("#purchaseTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const totalCols = isFinanceOfficer ? 12 : (isVendor ? 10 : 11);

    if (allPurchaseOrders.length === 0) {
        const filterName = currentSourceFilter === 'application' ? 'Application' : currentSourceFilter === 'historical' ? 'Historical DataCo' : '';
        tbody.innerHTML = `<tr><td colspan="${totalCols}" class="empty-state-wrapper">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No ${filterName} purchase orders found</div>
            <p>Try switching the source toggle or refining your filter keywords.</p>
        </td></tr>`;
        return;
    }

    allPurchaseOrders.forEach(po => {
        let statusClass = "badge-neutral";
        const statusClean = (po.status || "").trim();
        const statusLower = statusClean.toLowerCase();
        
        if (statusLower === "pending" || statusLower === "pending approval") statusClass = "badge-pending";
        else if (statusLower === "approved") statusClass = "badge-active";
        else if (statusLower === "ordered" || statusLower === "processing") statusClass = "badge-info";
        else if (statusLower === "in-transit" || statusLower === "in transit") statusClass = "badge-warning";
        else if (statusLower === "delivered") statusClass = "badge-active";
        else if (statusLower === "completed") statusClass = "badge-active";
        else if (statusLower === "fraud" || statusLower === "rejected") statusClass = "badge-poor";

        const poBadge = po.po_number || `PO-${po.id}`;
        const vDisplay = (po.vendor_name || `Vendor-${po.vendor_id}`).replace(/^Derived Vendor Proxy\s+/i, "Vendor-");

        if (isFinanceOfficer) {
            const totVal = Number(po.total_amount || 0);
            const paidVal = Number(po.paid_amount || 0);
            const remVal = (po.remaining_amount !== undefined && po.remaining_amount !== null)
                ? Number(po.remaining_amount)
                : Math.max(0, totVal - paidVal);

            const advPctVal = Number(po.advance_percentage || 0);
            const advPctDisplay = advPctVal > 0 ? `${advPctVal.toFixed(1)}%` : "-";

            const advAmtVal = Number(po.advance_amount || 0);
            const advAmtDisplay = advAmtVal > 0
                ? `<span style="color: #059669; font-weight: 600;">₹${advAmtVal.toFixed(2)}</span>`
                : `<span style="color: var(--text-secondary);">-</span>`;

            const remAmtDisplay = remVal > 0
                ? `<span style="color: #d97706; font-weight: 700;">₹${remVal.toFixed(2)}</span>`
                : `<span style="color: #059669; font-weight: 600;">₹0.00</span>`;

            const payStatus = po.payment_status || "Unpaid";
            const payBadgeClass = getPaymentBadgeClass(payStatus);

            const advDateDisplay = po.advance_payment_date ? po.advance_payment_date.split('T')[0] : "-";
            const finDateDisplay = po.final_payment_date ? po.final_payment_date.split('T')[0] : "-";

            let actionHtml = `<button class="btn btn-secondary" data-action="slip" style="padding: 4px 8px; font-size: 11px; white-space: nowrap;" title="Download Official Order Slip">📄 Slip</button>`;

            const isPayUnpaid = (payStatus.toLowerCase() === "unpaid" || (advAmtVal === 0 && paidVal === 0));
            const isPayPartial = (payStatus.toLowerCase() === "partially paid" || (paidVal > 0 && remVal > 0));
            const isPayFull = (payStatus.toLowerCase() === "fully paid" || (paidVal >= totVal && totVal > 0 && remVal <= 0));

            if (isPayUnpaid && totVal > 0) {
                actionHtml = `<div style="display: flex; gap: 4px; align-items: center;">
                    <button class="btn btn-primary" data-action="advance-payment" style="padding: 4px 8px; font-size: 11px; background: #059669; border-color: #059669; white-space: nowrap;" title="Record 25% Advance Payment">💳 Advance</button>
                    ${actionHtml}
                </div>`;
            } else if (isPayPartial) {
                if (statusLower === "completed") {
                    actionHtml = `<div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn btn-primary" data-action="final-payment" style="padding: 4px 8px; font-size: 11px; background: #2563eb; border-color: #2563eb; white-space: nowrap;" title="Order Completed: Record Final Settlement Disbursement">💰 Final Pay</button>
                        ${actionHtml}
                    </div>`;
                } else {
                    actionHtml = `<div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px; opacity: 0.75; cursor: not-allowed; white-space: nowrap;" onclick="alert('Final payment locked: Order must reach \'Completed\' status before final disbursement can be released.\\n\\nCurrent PO Status: ${escapeHTML(po.status)}')" title="Final payment is locked until order reaches 'Completed' status">⏳ Pending</button>
                        ${actionHtml}
                    </div>`;
                }
            } else if (isPayFull) {
                actionHtml = `<div style="display: flex; gap: 4px; align-items: center;">
                    <span class="badge badge-active" style="font-size: 10px; white-space: nowrap;">✓ Paid Full</span>
                    ${actionHtml}
                </div>`;
            }

            tbody.innerHTML += `
            <tr data-id="${po.id}">
                <td style="font-weight: 600;">${escapeHTML(poBadge)}</td>
                <td style="font-weight: 600;" title="Vendor ID #${po.vendor_id}">${escapeHTML(vDisplay)}</td>
                <td>${escapeHTML(po.product_name || 'N/A')}</td>
                <td style="font-weight: 600;">₹${totVal.toFixed(2)}</td>
                <td>${advPctDisplay}</td>
                <td>${advAmtDisplay}</td>
                <td>${remAmtDisplay}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(po.status || 'Pending')}</span></td>
                <td><span class="badge ${payBadgeClass}">${escapeHTML(payStatus)}</span></td>
                <td>${advDateDisplay}</td>
                <td>${finDateDisplay}</td>
                <td>${actionHtml}</td>
            </tr>
            `;
            return;
        }

        const isApp = isApplicationPO(po);
        const sourceBadge = isApp 
            ? `<span class="badge badge-info" style="font-size: 10px; font-weight: 600; padding: 2px 6px; white-space: nowrap;" title="Created via Application Procurement Workflow">Application PO</span>` 
            : `<span class="badge badge-neutral" style="font-size: 10px; padding: 2px 6px; white-space: nowrap;" title="Historical DataCo Dataset Record">Historical DataCo</span>`;

        const isPricingIncomplete = isApp && (Number(po.unit_price || 0) <= 0 || Number(po.total_amount || 0) <= 0);
        const priceDisplay = isPricingIncomplete
            ? `<span style="color: var(--danger-color); font-weight: 600;">₹0.00</span> <span class="badge badge-poor" style="font-size: 9px; padding: 1px 4px;" title="Pricing Incomplete">Incomplete</span>`
            : `₹${Number(po.unit_price || 0).toFixed(2)}`;
        const totalDisplay = isPricingIncomplete
            ? `<span style="color: var(--danger-color); font-weight: 600;">₹0.00</span>`
            : `₹${Number(po.total_amount || 0).toFixed(2)}`;

        let actionTdHtml = "";
        if (!isVendor) {
            let workflowBtn = "";
            if (statusLower === "pending" || statusLower === "pending approval") {
                workflowBtn = `<button class="btn btn-primary" data-action="status" data-target="Approved" style="padding: 5px 8px; font-size: 11px;">✓ Approve</button>`;
            } else if (statusLower === "approved") {
                workflowBtn = `<button class="btn btn-primary" data-action="status" data-target="Ordered" style="padding: 5px 8px; font-size: 11px;">📦 Order</button>`;
            } else if (statusLower === "ordered") {
                workflowBtn = `<button class="btn btn-primary" data-action="status" data-target="In-Transit" style="padding: 5px 8px; font-size: 11px;">🚚 Ship</button>`;
            } else if (statusLower === "in-transit" || statusLower === "in transit") {
                workflowBtn = `<button class="btn btn-primary" data-action="status" data-target="Delivered" style="padding: 5px 8px; font-size: 11px; background: #059669; border-color: #059669;">📍 Delivered</button>`;
            } else if (statusLower === "delivered" || statusLower === "completed") {
                if (po.invoice_number) {
                    workflowBtn = `<span class="badge badge-active" style="font-size: 10px;" title="Invoice generated">${escapeHTML(po.invoice_number)}</span>`;
                } else if (role === "Finance Officer" || role === "Admin" || role === "Administrator") {
                    workflowBtn = `<button class="btn btn-primary" data-action="create-invoice" style="padding: 5px 8px; font-size: 11px; background: #2563eb; border-color: #2563eb;" title="Finance Officer: Verify details and create invoice">🧾 Create Invoice</button>`;
                } else if (role === "Procurement Manager") {
                    workflowBtn = `<span class="badge badge-neutral" style="font-size: 10px;" title="Delivered - Awaiting Finance Review & Invoice Creation">Awaiting Finance Invoice</span>`;
                }
            }

            const showEditDelete = (role === "Admin" || role === "Administrator" || role === "Procurement Manager");
            const editBtnText = isPricingIncomplete ? "✏️ Price" : "Edit";
            const editBtnClass = isPricingIncomplete ? "btn btn-primary" : "btn btn-secondary";
            const editBtnStyle = isPricingIncomplete ? "padding: 5px 8px; font-size: 11px; background: #d97706; border-color: #d97706;" : "padding: 5px 8px; font-size: 11px;";
            const editBtnHtml = showEditDelete ? `<button class="${editBtnClass}" data-action="edit" style="${editBtnStyle}" title="${isPricingIncomplete ? 'Complete pricing for this purchase order' : 'Edit purchase order details'}">${editBtnText}</button>` : '';
            const deleteBtnHtml = (showEditDelete && isApplicationPO(po)) ? `<button class="btn btn-danger" data-action="delete" style="padding: 5px 8px; font-size: 11px;">✕</button>` : '';

            actionTdHtml = `
            <td>
                <div style="display: flex; gap: 4px; align-items: center;">
                    ${workflowBtn}
                    ${editBtnHtml}
                    ${deleteBtnHtml}
                    <button class="btn btn-secondary" data-action="slip" style="padding: 5px 8px; font-size: 11px;" title="Download Official Order Slip">📄 Slip</button>
                </div>
            </td>`;
        } else {
            actionTdHtml = `
            <td>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <button class="btn btn-secondary" data-action="slip" style="padding: 5px 8px; font-size: 11px;" title="Download Official Order Slip">📄 Slip</button>
                </div>
            </td>`;
        }

        tbody.innerHTML += `
        <tr data-id="${po.id}">
            <td style="font-weight: 600;">${escapeHTML(poBadge)}</td>
            <td>${sourceBadge}</td>
            <td style="font-weight: 600;" title="Vendor ID #${po.vendor_id}">${escapeHTML(vDisplay)}</td>
            <td>${escapeHTML(po.product_name)}</td>
            <td>${Number(po.quantity || 0).toLocaleString()}</td>
            <td>${priceDisplay}</td>
            <td style="font-weight: 600;">${totalDisplay}</td>
            <td>${escapeHTML(po.order_date || 'N/A')}</td>
            <td>${escapeHTML(po.expected_delivery || 'N/A')}</td>
            <td><span class="badge ${statusClass}">${escapeHTML(po.status)}</span></td>
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
    const role = getUserRole();
    const btn = event.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const tr = btn.closest("tr");
    const id = parseInt(tr.dataset.id);
    const po = allPurchaseOrders.find(o => o.id === id);

    if (!po) return;

    if (action === "slip") {
        downloadOrderSlip(id);
        return;
    }

    if (action === "advance-payment") {
        openAdvancePaymentModal(id);
        return;
    }

    if (action === "final-payment") {
        openFinalPaymentModal(id);
        return;
    }

    // RBAC: Finance Officer is authorized to record payments and create invoices, not edit/delete or change PO workflow status
    if (role === "Finance Officer") {
        if (action === "create-invoice") {
            createInvoiceFromPO(id, po);
        }
        return;
    }

    // RBAC: Procurement Manager cannot create invoices or record payments
    if (role === "Procurement Manager" && (action === "create-invoice" || action === "advance-payment" || action === "final-payment")) {
        showToast("Permission Denied: Only Finance Officers are authorized to manage payments and invoices.", "error");
        return;
    }

    if (action === "edit") {
        editPurchase(po);
    } else if (action === "status") {
        const target = btn.dataset.target || null;
        updateOrderStatus(id, target);
    } else if (action === "create-invoice") {
        createInvoiceFromPO(id, po);
    } else if (action === "delete") {
        deletePurchase(id);
    }
}

async function createInvoiceFromPO(poId, po) {
    const role = getUserRole();
    if (role === "Procurement Manager") {
        showToast("Permission Denied: Only Finance Officers are authorized to create invoices.", "error");
        return;
    }
    const poNum = po.po_number || `PO-${poId}`;
    const qty = Number(po.quantity || 1).toLocaleString();
    const price = Number(po.unit_price || 0).toFixed(2);
    const total = Number(po.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const vendor = po.vendor_name || `Vendor-${po.vendor_id}`;

    const confirmCreate = confirm(
        `[Finance Officer Invoice Creation & Verification]\n\n` +
        `Purchase Order: ${poNum}\n` +
        `Supplier Partner: ${vendor}\n` +
        `Product Specification: ${po.product_name}\n` +
        `Quantity: ${qty} units\n` +
        `Unit Price: ₹${price}\n` +
        `Total PO Valuation: ₹${total}\n` +
        `Delivery Status: ${po.status}\n\n` +
        `Do you confirm the PO pricing verification and authorize generating this billing invoice?`
    );
    if (!confirmCreate) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invoices/create-from-po/${poId}`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();
        if (response.ok) {
            showToast(`Invoice ${result.invoice_number} created successfully by Finance Officer!`, "success");
            loadPurchaseOrders();
        } else {
            showToast(result.detail || result.error || "Failed to generate invoice.", "error");
        }
    } catch (e) {
        console.error("Create invoice error:", e);
        showToast("Error generating invoice from Purchase Order.", "error");
    }
}

async function editPurchase(po) {
    const isPricingIncomplete = isApplicationPO(po) && (Number(po.unit_price || 0) <= 0 || Number(po.total_amount || 0) <= 0);
    const promptPrefix = isPricingIncomplete ? "[Complete Pricing] " : "";

    const vendor_id = prompt(`${promptPrefix}Enter Vendor ID:`, po.vendor_id);
    if (vendor_id === null) return;

    const product_name = prompt(`${promptPrefix}Enter Product Name:`, po.product_name);
    if (product_name === null) return;

    const quantity_str = prompt(`${promptPrefix}Enter Quantity:`, po.quantity);
    if (quantity_str === null) return;
    const quantity = parseInt(quantity_str, 10);
    if (isNaN(quantity) || quantity <= 0) {
        showToast("Quantity must be a positive number greater than zero.", "warning");
        return;
    }

    const unit_price_str = prompt(`${promptPrefix}Enter Unit Price (₹):`, po.unit_price > 0 ? Number(po.unit_price).toFixed(2) : "");
    if (unit_price_str === null) return;
    const unit_price = parseFloat(unit_price_str);
    if (isNaN(unit_price) || unit_price <= 0) {
        showToast("Unit Price must be greater than ₹0.00.", "warning");
        return;
    }

    const calculated_total = (quantity * unit_price).toFixed(2);

    const order_date = prompt("Enter Order Date (YYYY-MM-DD):", po.order_date || new Date().toISOString().split('T')[0]);
    if (order_date === null) return;

    const expected_delivery = prompt("Enter Expected Delivery Date (YYYY-MM-DD):", po.expected_delivery || new Date().toISOString().split('T')[0]);
    if (expected_delivery === null) return;

    const status = prompt("Enter Status:", po.status || "Pending");
    if (status === null) return;

    const formData = new FormData();
    formData.append("vendor_id", vendor_id);
    formData.append("product_name", product_name);
    formData.append("quantity", quantity);
    formData.append("unit_price", unit_price);
    formData.append("total_amount", calculated_total);
    formData.append("order_date", order_date);
    formData.append("expected_delivery", expected_delivery);
    formData.append("status", status);

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${po.id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
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
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
            method: "DELETE",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
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

async function updateOrderStatus(id, targetStatus) {
    const promptMsg = targetStatus ? `Advance Purchase Order status to '${targetStatus}'?` : "Move purchase order to next workflow status?";
    const confirmUpdate = confirm(promptMsg);
    if (!confirmUpdate) return;

    try {
        const token = getToken();
        const formData = new FormData();
        if (targetStatus) formData.append("status", targetStatus);

        const response = await fetch(`${API_BASE_URL}/purchase-orders/status/${id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "Workflow status updated!", "success");
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
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/vendors`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const vendors = await response.json();
        const vendorSelect = document.getElementById("vendor_id");

        if (vendorSelect && Array.isArray(vendors)) {
            vendorSelect.innerHTML = `<option value="">Select Vendor</option>`;
            vendors.forEach(vendor => {
                const vName = (vendor.vendor_name || "").replace(/^Derived Vendor Proxy\s+/i, "Vendor-");
                vendorSelect.innerHTML += `<option value="${vendor.id}">${escapeHTML(vName)}</option>`;
            });
        }
    } catch (e) {
        console.error("Load select vendors error:", e);
    }
}

function renderStatusChart(counts) {
    if (poStatusChart) poStatusChart.destroy();
    if (!counts) counts = {};

    const canvas = document.getElementById("poStatusChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
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

// ==================================================
// ADVANCE PAYMENT MODAL HANDLERS
// ==================================================
let currentAdvPO = null;

function openAdvancePaymentModal(poId) {
    const po = allPurchaseOrders.find(o => o.id === poId);
    if (!po) return;
    currentAdvPO = po;

    const elId = document.getElementById("advPoId");
    if (elId) elId.value = po.id;
    const elNum = document.getElementById("advPoNumberDisplay");
    if (elNum) elNum.textContent = po.po_number || `PO-${po.id}`;
    const elVen = document.getElementById("advVendorNameDisplay");
    if (elVen) elVen.textContent = (po.vendor_name || `Vendor #${po.vendor_id}`).replace(/^Derived Vendor Proxy\s+/i, "Vendor-");
    const elTot = document.getElementById("advTotalAmountDisplay");
    if (elTot) elTot.textContent = `₹${Number(po.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const inputPct = document.getElementById("advPercentageInput");
    if (inputPct) inputPct.value = "25";

    updateAdvanceCalculation();

    const modal = document.getElementById("advancePaymentModal");
    if (modal) modal.style.display = "flex";
}

function closeAdvancePaymentModal() {
    const modal = document.getElementById("advancePaymentModal");
    if (modal) modal.style.display = "none";
    currentAdvPO = null;
}

function updateAdvanceCalculation() {
    if (!currentAdvPO) return;
    const total = Number(currentAdvPO.total_amount || 0);
    const inputPct = document.getElementById("advPercentageInput");
    let pct = parseFloat(inputPct ? inputPct.value : 25) || 0;
    if (pct < 1) pct = 1;
    if (pct > 100) pct = 100;

    const advAmt = (total * (pct / 100.0));
    const remAmt = Math.max(0, total - advAmt);

    const elAdv = document.getElementById("advAmountDisplay");
    const elRem = document.getElementById("advRemainingDisplay");
    if (elAdv) elAdv.textContent = `₹${advAmt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elRem) elRem.textContent = `₹${remAmt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

async function submitAdvancePayment(event) {
    event.preventDefault();
    if (!currentAdvPO) return;

    const poId = currentAdvPO.id;
    const pct = parseFloat(document.getElementById("advPercentageInput").value) || 25;
    const method = document.getElementById("advPaymentMethod").value;

    const btn = document.getElementById("btnSubmitAdvance");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Recording...";
    }

    try {
        const formData = new FormData();
        formData.append("advance_percentage", pct);
        formData.append("payment_method", method);

        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/advance-payment`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            showToast(data.message || "Advance payment recorded successfully!", "success");
            closeAdvancePaymentModal();
            await loadPurchaseOrders();
        } else {
            showToast(data.detail || "Failed to record advance payment.", "error");
        }
    } catch (err) {
        console.error("Advance payment error:", err);
        showToast("Network error. Please try again.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Confirm Advance Payment";
        }
    }
}

// ==================================================
// FINAL PAYMENT MODAL HANDLERS
// ==================================================
let currentFinalPO = null;

function openFinalPaymentModal(poId) {
    const po = allPurchaseOrders.find(o => o.id === poId);
    if (!po) return;
    currentFinalPO = po;

    const elId = document.getElementById("finalPoId");
    if (elId) elId.value = po.id;
    const elNum = document.getElementById("finalPoNumberDisplay");
    if (elNum) elNum.textContent = po.po_number || `PO-${po.id}`;
    const elVen = document.getElementById("finalVendorNameDisplay");
    if (elVen) elVen.textContent = (po.vendor_name || `Vendor #${po.vendor_id}`).replace(/^Derived Vendor Proxy\s+/i, "Vendor-");
    const elStat = document.getElementById("finalPoStatusDisplay");
    if (elStat) elStat.textContent = po.status || "Completed";

    const tot = Number(po.total_amount || 0);
    const paid = Number(po.paid_amount || 0);
    const rem = (po.remaining_amount !== undefined && po.remaining_amount !== null)
        ? Number(po.remaining_amount)
        : Math.max(0, tot - paid);

    const elTot = document.getElementById("finalTotalAmountDisplay");
    if (elTot) elTot.textContent = `₹${tot.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const elPaid = document.getElementById("finalAdvancePaidDisplay");
    if (elPaid) elPaid.textContent = `₹${paid.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const elRem = document.getElementById("finalRemainingDueDisplay");
    if (elRem) elRem.textContent = `₹${rem.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const modal = document.getElementById("finalPaymentModal");
    if (modal) modal.style.display = "flex";
}

function closeFinalPaymentModal() {
    const modal = document.getElementById("finalPaymentModal");
    if (modal) modal.style.display = "none";
    currentFinalPO = null;
}

async function submitFinalPayment(event) {
    event.preventDefault();
    if (!currentFinalPO) return;

    const poId = currentFinalPO.id;
    const method = document.getElementById("finalPaymentMethod").value;

    const btn = document.getElementById("btnSubmitFinal");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Disbursing...";
    }

    try {
        const formData = new FormData();
        formData.append("payment_method", method);

        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/final-payment`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            showToast(data.message || "Final settlement payment recorded successfully!", "success");
            closeFinalPaymentModal();
            await loadPurchaseOrders();
        } else {
            showToast(data.detail || "Failed to record final payment.", "error");
        }
    } catch (err) {
        console.error("Final payment error:", err);
        showToast("Network error. Please try again.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Disburse Final Payment";
        }
    }
}