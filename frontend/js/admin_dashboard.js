const API_BASE_URL = "http://127.0.0.1:8000";
let vendorsList = [];

document.addEventListener("DOMContentLoaded", () => {
    // Setup event delegation on tbody
    const tbody = document.querySelector("#pendingTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
        tbody.addEventListener("change", handleTableChange);
    }
    
    initAdminPortal();
});

async function initAdminPortal() {
    await loadVendors();
    await loadPendingUsers();
}

async function loadVendors() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendors`);
        if (!response.ok) {
            throw new Error(`Failed to load vendors (Status: ${response.status})`);
        }
        vendorsList = await response.json();
        console.log("Admin Dashboard: Loaded vendors list for dropdown:", vendorsList.length);
    } catch (error) {
        console.error("Error loading vendors:", error);
    }
}

async function loadPendingUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/pending-users`);
        if (!response.ok) {
            throw new Error(`Failed to load pending users (Status: ${response.status})`);
        }
        const users = await response.json();
        const tbody = document.querySelector("#pendingTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state-wrapper" style="text-align: center; padding: 30px; color: var(--text-secondary);">
                No pending registration requests.
            </td></tr>`;
            return;
        }

        // Build vendor select options
        let vendorOptions = '<option value="">-- Choose Vendor Company --</option>';
        vendorsList.forEach(v => {
            vendorOptions += `<option value="${v.id}">${v.vendor_name} (ID: ${v.id})</option>`;
        });

        users.forEach(user => {
            tbody.innerHTML += `
            <tr data-id="${user.id}">
                <td>${user.id}</td>
                <td style="font-weight: 600;">${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <select class="role-select filter-select" data-id="${user.id}" style="padding: 6px 10px; font-size: 12px; width: 100%; max-width: 200px;">
                        <option value="Vendor" selected>Vendor</option>
                        <option value="Procurement Manager">Procurement Manager</option>
                        <option value="Finance Officer">Finance Officer</option>
                        <option value="Auditor">Auditor</option>
                        <option value="Supply Chain Manager">Supply Chain Manager</option>
                        <option value="Admin">Admin</option>
                    </select>
                    
                    <!-- Vendor selector (visible only when 'Vendor' is selected) -->
                    <select class="vendor-select filter-select" id="vendorSelect${user.id}" style="display: block; margin-top: 6px; padding: 6px 10px; font-size: 12px; width: 100%; max-width: 200px;">
                        ${vendorOptions}
                    </select>
                </td>
                <td>
                    <button class="btn btn-primary" data-action="approve" data-id="${user.id}" style="padding: 6px 12px; font-size: 12px; margin-right: 8px;">
                        Approve
                    </button>
                    <button class="btn btn-danger" data-action="reject" data-id="${user.id}" style="padding: 6px 12px; font-size: 12px;">
                        Reject
                    </button>
                </td>
            </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading pending users:", error);
        showToast("Error loading pending account approval queue.", "error");
    }
}

function handleTableChange(event) {
    const select = event.target.closest(".role-select");
    if (!select) return;

    const userId = select.dataset.id;
    const vendorSelect = document.getElementById(`vendorSelect${userId}`);
    if (vendorSelect) {
        if (select.value === "Vendor") {
            vendorSelect.style.display = "block";
        } else {
            vendorSelect.style.display = "none";
        }
    }
}

function handleTableClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    const userId = button.dataset.id;

    if (action === "approve") {
        approveUser(userId);
    } else if (action === "reject") {
        rejectUser(userId);
    }
}

async function approveUser(id) {
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (!tr) return;

    const roleSelect = tr.querySelector(".role-select");
    const role = roleSelect.value;
    const vendorSelect = document.getElementById(`vendorSelect${id}`);
    const vendorId = vendorSelect ? vendorSelect.value : "";

    if (role === "Vendor" && !vendorId) {
        showToast("Please select a vendor company to link with this Vendor account.", "warning");
        return;
    }

    const formData = new FormData();
    formData.append("role", role);
    if (role === "Vendor") {
        formData.append("vendor_id", vendorId);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/approve-user/${id}`, {
            method: "PUT",
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || "User approved successfully.", "success");
            await loadPendingUsers();
        } else {
            showToast(result.error || result.detail || "Approval failed.", "error");
        }
    } catch (error) {
        console.error("Approve request exception:", error);
        showToast("Server connection error.", "error");
    }
}

async function rejectUser(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/reject-user/${id}`, {
            method: "PUT"
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || "User rejected successfully.", "success");
            await loadPendingUsers();
        } else {
            showToast(result.error || result.detail || "Rejection failed.", "error");
        }
    } catch (error) {
        console.error("Reject request exception:", error);
        showToast("Server connection error.", "error");
    }
}