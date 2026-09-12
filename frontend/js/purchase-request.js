const API_BASE_URL = "http://127.0.0.1:8000";
let allRequests = [];
let allVendors = [];

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("requestForm").addEventListener("submit", addPurchaseRequest);
    
    // Bind calculation listeners
    const qtyInput = document.getElementById("quantity");
    const priceInput = document.getElementById("unit_price");
    if (qtyInput) qtyInput.addEventListener("input", calculateEstimatedTotal);
    if (priceInput) priceInput.addEventListener("input", calculateEstimatedTotal);

    // Bind table clicks using event delegation
    const tbody = document.querySelector("#requestTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
    }
    
    // Set default date and auto-fill authenticated user
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById("request_date");
    if (dateInput) dateInput.value = today;

    const userField = document.getElementById("requested_by");
    if (userField) {
        userField.value = getUserName() || "Authorized Procurement User";
        userField.readOnly = true;
    }
    
    loadVendors();
    loadPurchaseRequests();
    calculateEstimatedTotal();
});

function calculateEstimatedTotal() {
    const qty = parseFloat(document.getElementById("quantity")?.value) || 0;
    const price = parseFloat(document.getElementById("unit_price")?.value) || 0;
    const totalField = document.getElementById("total_amount");
    if (totalField) {
        totalField.value = (qty * price).toFixed(2);
    }
}

async function loadVendors() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/vendors`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const vendors = await response.json();

        if (Array.isArray(vendors)) {
            allVendors = vendors;
            const vendorSelect = document.getElementById("vendor_id");
            if (vendorSelect) {
                vendorSelect.innerHTML = `<option value="">-- Optional: Assign During Review --</option>`;
                vendors.forEach(vendor => {
                    const vName = (vendor.vendor_name || "").replace(/^Derived Vendor Proxy\s+/i, "Vendor-");
                    vendorSelect.innerHTML += `<option value="${vendor.id}">${escapeHTML(vName)}</option>`;
                });
            }
        }
    } catch (error) {
        console.error("Load vendors error:", error);
    }
}

async function addPurchaseRequest(event) {
    event.preventDefault();

    const vendorSelect = document.getElementById("vendor_id");
    const vendor_id = vendorSelect ? vendorSelect.value : "";
    const product_name = document.getElementById("product_name").value.trim();
    const quantity = parseInt(document.getElementById("quantity").value, 10);
    const unit_price = parseFloat(document.getElementById("unit_price").value);
    const request_date = document.getElementById("request_date").value;

    if (!product_name || isNaN(quantity) || isNaN(unit_price) || !request_date) {
        showToast("Please fill in all required fields including Quantity and Unit Price.", "warning");
        return;
    }

    if (quantity <= 0) {
        showToast("Quantity must be a positive number greater than 0.", "warning");
        return;
    }

    if (unit_price <= 0) {
        showToast("Unit Price must be greater than ₹0.00.", "warning");
        return;
    }

    const calculated_total = (quantity * unit_price).toFixed(2);

    const formData = new FormData();
    if (vendor_id) formData.append("vendor_id", vendor_id);
    formData.append("product_name", product_name);
    formData.append("quantity", quantity);
    formData.append("unit_price", unit_price);
    formData.append("total_amount", calculated_total);
    formData.append("request_date", request_date);

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-requests`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Requisition submitted successfully (Status: Pending review).", "success");
            document.getElementById("requestForm").reset();
            calculateEstimatedTotal();
            
            // Reset date and user
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById("request_date");
            if (dateInput) dateInput.value = today;
            
            const userField = document.getElementById("requested_by");
            if (userField) {
                userField.value = getUserName() || "Authorized Procurement User";
                userField.readOnly = true;
            }
            
            await loadPurchaseRequests();
        } else {
            showToast(result.detail || result.error || "Error saving purchase request.", "error");
        }
    } catch (error) {
        console.error("Add request error:", error);
        showToast("Server connection error.", "error");
    }
}

async function loadPurchaseRequests() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-requests`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const requests = await response.json();

        allRequests = Array.isArray(requests) ? requests : [];

        const urlParams = new URLSearchParams(window.location.search);
        const statusParam = urlParams.get("status");
        let displayRequests = allRequests;
        if (statusParam) {
            displayRequests = allRequests.filter(r => (r.status || "").toLowerCase() === statusParam.toLowerCase());
            const tableTitle = document.querySelector(".table-header-title h3");
            if (tableTitle) {
                tableTitle.textContent = `Requisitions Register (${statusParam} Requisitions)`;
            }
            setTimeout(() => {
                document.querySelector(".table-card")?.scrollIntoView({ behavior: "smooth" });
            }, 300);
        }

        const tbody = document.querySelector("#requestTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (displayRequests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="12" class="empty-state-wrapper">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">No ${statusParam ? statusParam + " " : ""}requisitions found</div>
                <p>Add a new requisition using the form above.</p>
            </td></tr>`;
            return;
        }

        displayRequests.forEach(request => {
            let statusClass = "badge-neutral";
            const sLower = (request.status || "").toLowerCase();
            if (sLower === "pending") statusClass = "badge-pending";
            else if (sLower === "approved") statusClass = "badge-active";
            else if (sLower === "rejected") statusClass = "badge-poor";

            // Professional vendor name formatting
            let vendorDisplay = `<span style="color: var(--warning-color); font-style: italic; font-weight: 500;">Unassigned</span>`;
            if (request.vendor_id) {
                const cleanedName = (request.vendor_name || `Vendor-${request.vendor_id}`).replace(/^Derived Vendor Proxy\s+/i, "Vendor-");
                const relScore = request.vendor_reliability ? `<span style="font-size: 11px; color: var(--text-secondary); display: block;">Reliability: ${Number(request.vendor_reliability).toFixed(1)}%</span>` : '';
                vendorDisplay = `<div style="font-weight: 600;" title="Supplier Partner #${request.vendor_id}">${escapeHTML(cleanedName)}</div>${relScore}`;
            }

            // Workflow action buttons
            let actionHtml = "-";
            if (sLower === "pending") {
                actionHtml = `
                    <div style="display: flex; gap: 4px;">
                        <button class="btn btn-primary" data-action="approve" style="padding: 5px 9px; font-size: 11px;">✓ Approve</button>
                        <button class="btn btn-danger" data-action="reject" style="padding: 5px 9px; font-size: 11px;">✕ Reject</button>
                    </div>
                `;
            } else if (sLower === "approved") {
                if (request.purchase_order_id) {
                    actionHtml = `<span class="badge badge-active" style="font-size: 11px;">PO #${request.purchase_order_id} Issued</span>`;
                } else {
                    actionHtml = `<button class="btn btn-primary" data-action="create-po" style="padding: 5px 10px; font-size: 11px; background: #059669; border-color: #059669;">🛍️ Create PO</button>`;
                }
            } else if (sLower === "rejected") {
                actionHtml = `<span class="badge badge-poor" style="font-size: 11px;">Rejected</span>`;
            }

            // Manage Column (Edit / Resubmit)
            let manageHtml = "-";
            if (request.purchase_order_id) {
                manageHtml = `<span style="color: var(--text-secondary); font-size: 11px;">Locked</span>`;
            } else if (sLower === "rejected") {
                manageHtml = `<button class="btn btn-secondary" data-action="resubmit" style="padding: 5px 9px; font-size: 11px;">✏️ Resubmit</button>`;
            } else {
                manageHtml = `<button class="btn btn-secondary" data-action="edit" style="padding: 5px 9px; font-size: 11px;">Edit</button>`;
            }

            // Delete Column
            let deleteHtml = "-";
            if (!request.purchase_order_id) {
                deleteHtml = `<button class="btn btn-danger" data-action="delete" style="padding: 5px 9px; font-size: 11px;">Delete</button>`;
            }

            tbody.innerHTML += `
            <tr data-id="${request.id}">
                <td>#${request.id}</td>
                <td>${vendorDisplay}</td>
                <td style="font-weight: 500;">${escapeHTML(request.product_name)}</td>
                <td>${request.quantity}</td>
                <td>₹${Number(request.unit_price || 0).toFixed(2)}</td>
                <td style="font-weight: 600;">₹${Number(request.total_amount || 0).toFixed(2)}</td>
                <td>${request.request_date || 'N/A'}</td>
                <td style="font-weight: 500;">${escapeHTML(request.requested_by)}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(request.status)}</span></td>
                <td>${actionHtml}</td>
                <td>${manageHtml}</td>
                <td>${deleteHtml}</td>
            </tr>
            `;
        });
    } catch (error) {
        console.error("Load requests error:", error);
        const tbody = document.querySelector("#requestTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="12" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error loading requisitions: ${error.message}</td></tr>`;
        }
    }
}

function handleTableClick(event) {
    const btn = event.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const tr = btn.closest("tr");
    const id = parseInt(tr.dataset.id);
    const request = allRequests.find(r => r.id === id);

    if (!request) return;

    if (action === "approve") {
        approveRequest(id, request);
    } else if (action === "reject") {
        rejectRequest(id);
    } else if (action === "create-po") {
        createPurchaseOrder(id);
    } else if (action === "edit" || action === "resubmit") {
        editPurchaseRequest(request);
    } else if (action === "delete") {
        deletePurchaseRequest(id);
    }
}

async function approveRequest(id, request) {
    let vendorId = request.vendor_id;
    if (!vendorId) {
        const input = prompt("This requisition has no supplier partner assigned.\nEnter Supplier Partner ID to assign based on reliability (e.g. 24, 208, 715):", "24");
        if (input === null) return;
        vendorId = parseInt(input.trim());
        if (!vendorId || isNaN(vendorId)) {
            showToast("A valid Supplier Partner ID is required to approve.", "warning");
            return;
        }
    } else {
        const confirmApprove = confirm(`Approve requisition #${id} with Supplier Partner #${vendorId}?`);
        if (!confirmApprove) return;
    }

    try {
        const token = getToken();
        const formData = new FormData();
        if (vendorId) formData.append("vendor_id", vendorId);

        const response = await fetch(`${API_BASE_URL}/purchase-requests/approve/${id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Requisition approved! You may now issue the official Purchase Order.", "success");
            await loadPurchaseRequests();
        } else {
            showToast(result.detail || result.message || result.error || "Approval failed.", "error");
        }
    } catch (error) {
        console.error("Approve error:", error);
        showToast("Error executing approval.", "error");
    }
}

async function rejectRequest(id) {
    const confirmReject = confirm("Reject this purchase requisition? The requestor can edit and resubmit it.");
    if (!confirmReject) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-requests/reject/${id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.message || "Requisition has been Rejected.", "warning");
            await loadPurchaseRequests();
        } else {
            showToast(result.detail || result.error || "Failed to reject requisition.", "error");
        }
    } catch (e) {
        console.error("Reject error:", e);
        showToast("Error executing rejection.", "error");
    }
}

async function createPurchaseOrder(id) {
    const confirmCreate = confirm("Issue an official Purchase Order for this approved requisition?");
    if (!confirmCreate) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-requests/${id}/create-po`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();
        if (response.ok) {
            showToast(`Purchase Order ${result.po_number || '#' + result.purchase_order_id} created successfully!`, "success");
            await loadPurchaseRequests();
        } else {
            showToast(result.detail || result.error || "Failed to issue Purchase Order.", "error");
        }
    } catch (e) {
        console.error("Create PO error:", e);
        showToast("Error issuing Purchase Order.", "error");
    }
}

async function editPurchaseRequest(req) {
    const isResubmit = (req.status || "").toLowerCase() === "rejected";
    const promptPrefix = isResubmit ? "[Resubmission] " : "";

    const product_name = prompt(`${promptPrefix}Product Specification:`, req.product_name);
    if (product_name === null) return;

    const quantity_val = parseInt(quantity, 10);
    if (isNaN(quantity_val) || quantity_val <= 0) {
        showToast("Quantity must be a positive number.", "warning");
        return;
    }

    const unit_price_input = prompt(`${promptPrefix}Unit Price (₹):`, req.unit_price ? Number(req.unit_price).toFixed(2) : "");
    if (unit_price_input === null) return;
    const unit_price_val = parseFloat(unit_price_input);
    if (isNaN(unit_price_val) || unit_price_val <= 0) {
        showToast("Unit Price must be a valid positive number.", "warning");
        return;
    }

    const calculated_total = (quantity_val * unit_price_val).toFixed(2);

    const vendor_id = prompt(`${promptPrefix}Supplier Partner ID (Leave blank to keep unassigned):`, req.vendor_id || "");
    if (vendor_id === null) return;

    const request_date = prompt(`${promptPrefix}Request Date (YYYY-MM-DD):`, req.request_date || new Date().toISOString().split('T')[0]);
    if (request_date === null) return;

    const formData = new FormData();
    formData.append("product_name", product_name);
    formData.append("quantity", quantity_val);
    formData.append("unit_price", unit_price_val);
    formData.append("total_amount", calculated_total);
    formData.append("request_date", request_date);
    if (vendor_id && vendor_id.trim()) {
        formData.append("vendor_id", vendor_id.trim());
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-requests/${req.id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            const msg = isResubmit ? "Requisition resubmitted for procurement review." : "Requisition updated successfully.";
            showToast(msg, "success");
            await loadPurchaseRequests();
        } else {
            showToast(result.detail || result.error || "Failed to update requisition.", "error");
        }
    } catch (e) {
        showToast("Error updating requisition record.", "error");
    }
}

async function deletePurchaseRequest(id) {
    const confirmDelete = confirm("Are you sure you want to delete this purchase requisition?");
    if (!confirmDelete) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/purchase-requests/${id}`, {
            method: "DELETE",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Requisition deleted successfully.", "success");
            await loadPurchaseRequests();
        } else {
            showToast(result.detail || result.message || "Failed to delete request.", "error");
        }
    } catch (e) {
        showToast("Error executing requisition deletion.", "error");
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