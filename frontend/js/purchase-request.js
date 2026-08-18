const API_BASE_URL = "http://127.0.0.1:8000";
let allRequests = [];

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("requestForm").addEventListener("submit", addPurchaseRequest);
    
    // Bind table clicks using event delegation
    const tbody = document.querySelector("#requestTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
    }
    
    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("request_date").value = today;
    
    loadVendors();
    loadPurchaseRequests();
});

async function loadVendors() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendors`);
        const vendors = await response.json();

        if (Array.isArray(vendors)) {
            const vendorSelect = document.getElementById("vendor_id");
            if (vendorSelect) {
                vendorSelect.innerHTML = `<option value="">Select Vendor</option>`;
                vendors.forEach(vendor => {
                    vendorSelect.innerHTML += `<option value="${vendor.id}">${vendor.vendor_name}</option>`;
                });
            }
        }
    } catch (error) {
        console.error("Load vendors error:", error);
    }
}

async function addPurchaseRequest(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("vendor_id", document.getElementById("vendor_id").value);
    formData.append("product_name", document.getElementById("product_name").value);
    formData.append("quantity", document.getElementById("quantity").value);
    formData.append("request_date", document.getElementById("request_date").value);
    formData.append("requested_by", document.getElementById("requested_by").value);
    formData.append("status", document.getElementById("status").value);

    try {
        const response = await fetch(`${API_BASE_URL}/purchase-requests`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Purchase request added successfully.", "success");
            document.getElementById("requestForm").reset();
            // Reset date
            const today = new Date().toISOString().split('T')[0];
            document.getElementById("request_date").value = today;
            
            await loadPurchaseRequests();
        } else {
            showToast(result.detail || "Error saving purchase request.", "error");
        }
    } catch (error) {
        console.error("Add request error:", error);
        showToast("Server connection error.", "error");
    }
}

async function loadPurchaseRequests() {
    try {
        const response = await fetch(`${API_BASE_URL}/purchase-requests`);
        const requests = await response.json();

        allRequests = Array.isArray(requests) ? requests : [];

        const tbody = document.querySelector("#requestTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (allRequests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="empty-state-wrapper">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">No requisitions logged</div>
                <p>Add a new requisition using the form above.</p>
            </td></tr>`;
            return;
        }

        allRequests.forEach(request => {
            let statusClass = "badge-neutral";
            const sLower = (request.status || "").toLowerCase();
            if (sLower === "pending") statusClass = "badge-pending";
            else if (sLower === "approved") statusClass = "badge-active";
            else if (sLower === "rejected") statusClass = "badge-poor";

            tbody.innerHTML += `
            <tr data-id="${request.id}">
                <td>${request.id}</td>
                <td style="font-weight: 600;">${request.vendor_name}</td>
                <td>${request.product_name}</td>
                <td>${request.quantity}</td>
                <td>${request.request_date}</td>
                <td style="font-weight: 500;">${request.requested_by}</td>
                <td><span class="badge ${statusClass}">${request.status}</span></td>
                <td>
                    ${request.status === 'Pending' ? 
                      `<button class="btn btn-primary" data-action="approve" style="padding: 6px 12px; font-size: 11px;">Approve</button>` : 
                      `-`}
                </td>
                <td>
                    <button class="btn btn-secondary" data-action="edit" style="padding: 6px 12px; font-size: 11px;">Edit</button>
                </td>
                <td>
                    <button class="btn btn-danger" data-action="delete" style="padding: 6px 12px; font-size: 11px;">Delete</button>
                </td>
            </tr>
            `;
        });
    } catch (error) {
        console.error("Load requests error:", error);
        const tbody = document.querySelector("#requestTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="color: var(--danger-color); text-align: center; padding: 20px;">
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
        approveRequest(id);
    } else if (action === "edit") {
        editPurchaseRequest(request);
    } else if (action === "delete") {
        deletePurchaseRequest(id);
    }
}

async function approveRequest(id) {
    const confirmApprove = confirm("Approve this purchase request?");
    if (!confirmApprove) return;

    try {
        const response = await fetch(`${API_BASE_URL}/purchase-requests/approve/${id}`, {
            method: "PUT"
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Request approved successfully.", "success");
            await loadPurchaseRequests();
        } else {
            showToast(result.message || result.error || "Approval failed.", "error");
        }
    } catch (error) {
        console.error("Approve error:", error);
        showToast("Error executing approval.", "error");
    }
}

async function editPurchaseRequest(req) {
    const vendor_id = prompt("Vendor ID", req.vendor_id);
    if (vendor_id === null) return;

    const product_name = prompt("Product Name", req.product_name);
    if (product_name === null) return;

    const quantity = prompt("Quantity", req.quantity);
    if (quantity === null) return;

    const request_date = prompt("Request Date (YYYY-MM-DD)", req.request_date);
    if (request_date === null) return;

    const requested_by = prompt("Requested By", req.requested_by);
    if (requested_by === null) return;

    const status = prompt("Status", req.status);
    if (status === null) return;

    const formData = new FormData();
    formData.append("vendor_id", vendor_id);
    formData.append("product_name", product_name);
    formData.append("quantity", quantity);
    formData.append("request_date", request_date);
    formData.append("requested_by", requested_by);
    formData.append("status", status);

    try {
        const response = await fetch(`${API_BASE_URL}/purchase-requests/${req.id}`, {
            method: "PUT",
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Requisition updated successfully.", "success");
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
        const response = await fetch(`${API_BASE_URL}/purchase-requests/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Requisition deleted successfully.", "success");
            await loadPurchaseRequests();
        } else {
            showToast(result.message || "Failed to delete request.", "error");
        }
    } catch (e) {
        showToast("Error executing requisition deletion.", "error");
    }
}