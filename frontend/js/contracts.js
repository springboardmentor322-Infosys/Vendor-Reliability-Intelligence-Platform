const API_BASE_URL = "http://127.0.0.1:8000";
let allContracts = [];

document.addEventListener("DOMContentLoaded", () => {
    setupFormVisibility();
    
    document.getElementById("contractForm").addEventListener("submit", addContract);
    document.getElementById("searchContracts").addEventListener("input", filterAndRenderTable);
    document.getElementById("filterContractStatus").addEventListener("change", filterAndRenderTable);
    
    const tbody = document.querySelector("#contractTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
    }
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("start_date").value = today;

    loadContracts();
});

function setupFormVisibility() {
    const role = getUserRole();
    const authorized = ["Admin", "Procurement Manager"];
    const container = document.getElementById("addContractContainer");
    if (container) {
        if (authorized.includes(role)) {
            container.style.display = "block";
        } else {
            container.style.display = "none";
        }
    }
}

async function addContract(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("vendor_id", document.getElementById("vendor_id").value);
    formData.append("contract_name", document.getElementById("contract_name").value);
    formData.append("start_date", document.getElementById("start_date").value);
    formData.append("end_date", document.getElementById("end_date").value);
    formData.append("status", document.getElementById("status").value);

    try {
        const response = await fetch(`${API_BASE_URL}/contracts`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Contract registered successfully.", "success");
            document.getElementById("contractForm").reset();
            // Reset date
            const today = new Date().toISOString().split('T')[0];
            document.getElementById("start_date").value = today;
            
            loadContracts();
        } else {
            showToast(result.error || "Failed to add contract", "error");
        }
    } catch (e) {
        showToast("Error saving contract record.", "error");
    }
}

async function loadContracts() {
    try {
        const response = await fetch(`${API_BASE_URL}/contracts`);
        const contracts = await response.json();

        if (contracts.error) {
            throw new Error(contracts.error);
        }

        allContracts = Array.isArray(contracts) ? contracts : [];

        // Calculate KPIs
        calculateKPIs();

        // Render Table
        filterAndRenderTable();
    } catch (error) {
        console.error("Load contracts error:", error);
        const tbody = document.querySelector("#contractTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error loading contracts: ${error.message}</td></tr>`;
        }
    }
}

function calculateKPIs() {
    const total = allContracts.length;
    let active = 0;
    let expiring = 0;
    let expired = 0;
    const today = new Date();

    allContracts.forEach(c => {
        const status = (c.status || "").toLowerCase();
        const end = new Date(c.end_date);
        const remainingDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

        if (status === "expired" || remainingDays < 0) {
            expired++;
        } else if (status === "active") {
            active++;
            if (remainingDays <= 30) {
                expiring++;
            }
        }
    });

    document.getElementById("kpiTotalContracts").textContent = total;
    document.getElementById("kpiActiveContracts").textContent = active;
    document.getElementById("kpiExpiringContracts").textContent = expiring;
    document.getElementById("kpiExpiredContracts").textContent = expired;
}

function filterAndRenderTable() {
    const searchVal = document.getElementById("searchContracts").value.toLowerCase();
    const statusFilter = document.getElementById("filterContractStatus").value;

    const filtered = allContracts.filter(c => {
        const nameMatch = (c.contract_name || "").toLowerCase().includes(searchVal) || 
                          (c.vendor_name || "").toLowerCase().includes(searchVal);
        const statusMatch = statusFilter === "" || (c.status || "").toLowerCase() === statusFilter.toLowerCase();
        return nameMatch && statusMatch;
    });

    const tbody = document.querySelector("#contractTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state-wrapper">
            <div class="empty-state-icon">📄</div>
            <div class="empty-state-title">No contracts found</div>
            <p>Adjust your search criteria or filters.</p>
        </td></tr>`;
        return;
    }

    filtered.forEach(c => {
        let statusClass = "badge-neutral";
        const status = (c.status || "").toLowerCase();
        if (status === "active") statusClass = "badge-active";
        else if (status === "pending") statusClass = "badge-pending";
        else if (status === "expired" || status === "inactive") statusClass = "badge-poor";

        tbody.innerHTML += `
        <tr data-id="${c.id}">
            <td>${c.id}</td>
            <td>#${c.vendor_id}</td>
            <td style="font-weight: 600;">${c.vendor_name || 'N/A'}</td>
            <td style="font-weight: 500;">${c.contract_name}</td>
            <td>${c.start_date}</td>
            <td>${c.end_date}</td>
            <td><span class="badge ${statusClass}">${c.status}</span></td>
            <td>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary" data-action="edit" style="padding: 6px 10px; font-size: 11px;">Edit</button>
                    <button class="btn btn-danger" data-action="delete" style="padding: 6px 10px; font-size: 11px;">Delete</button>
                </div>
            </td>
        </tr>
        `;
    });
}

function handleTableClick(event) {
    const btn = event.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const tr = btn.closest("tr");
    const id = parseInt(tr.dataset.id);
    const contract = allContracts.find(c => c.id === id);

    if (!contract) return;

    if (action === "edit") {
        editContract(contract);
    } else if (action === "delete") {
        deleteContract(id);
    }
}

async function editContract(contract) {
    // Only Admin, PM, or owning Vendor (backend checks this) can edit
    const newVendor = prompt("Enter Vendor ID", contract.vendor_id);
    if (newVendor === null) return;

    const newName = prompt("Enter Contract Name", contract.contract_name);
    if (newName === null) return;

    const newStart = prompt("Enter Start Date (YYYY-MM-DD)", contract.start_date);
    if (newStart === null) return;

    const newEnd = prompt("Enter End Date (YYYY-MM-DD)", contract.end_date);
    if (newEnd === null) return;

    const newStatus = prompt("Enter Status", contract.status);
    if (newStatus === null) return;

    const formData = new FormData();
    formData.append("vendor_id", newVendor);
    formData.append("contract_name", newName);
    formData.append("start_date", newStart);
    formData.append("end_date", newEnd);
    formData.append("status", newStatus);

    try {
        const response = await fetch(`${API_BASE_URL}/contracts/${contract.id}`, {
            method: "PUT",
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Contract updated successfully.", "success");
            loadContracts();
        } else {
            showToast(result.detail || "Permission Denied: Unable to edit this contract.", "error");
        }
    } catch (e) {
        showToast("Error updating contract details.", "error");
    }
}

async function deleteContract(id) {
    // Only Admin can delete (backend checks this)
    const confirmDelete = confirm("Are you sure you want to delete this contract record?");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Contract deleted successfully.", "success");
            loadContracts();
        } else {
            showToast(result.detail || "Permission Denied: Only Admins can delete contracts.", "error");
        }
    } catch (e) {
        showToast("Error deleting contract.", "error");
    }
}