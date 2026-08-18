const API_BASE_URL = "http://127.0.0.1:8000";
let allVendors = [];

async function loadVendors() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendors`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const vendors = await response.json();
        allVendors = Array.isArray(vendors) ? vendors : [];

        // Build dynamic category dropdown options
        populateCategoryFilter();

        // Render table
        filterAndRenderTable();

        // Setup filter change listeners
        document.getElementById("searchVendors").addEventListener("input", filterAndRenderTable);
        document.getElementById("filterCategory").addEventListener("change", filterAndRenderTable);
        document.getElementById("filterStatus").addEventListener("change", filterAndRenderTable);

        // Bind table body event delegation
        const tbody = document.querySelector("#vendorTable tbody");
        if (tbody) {
            tbody.addEventListener("click", handleTableClick);
        }

    } catch (error) {
        console.error("Load vendors error:", error);
        const tbody = document.querySelector("#vendorTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="13" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error loading vendors: ${error.message}</td></tr>`;
        }
    }
}

function populateCategoryFilter() {
    const categorySelect = document.getElementById("filterCategory");
    if (!categorySelect) return;

    const uniqueCategories = [...new Set(allVendors.map(v => v.category).filter(Boolean))];
    categorySelect.innerHTML = '<option value="">All Categories</option>';
    
    uniqueCategories.sort().forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

function filterAndRenderTable() {
    const searchVal = document.getElementById("searchVendors").value.toLowerCase();
    const catFilter = document.getElementById("filterCategory").value;
    const statusFilter = document.getElementById("filterStatus").value;

    const filtered = allVendors.filter(v => {
        const nameMatch = (v.vendor_name || "").toLowerCase().includes(searchVal) || 
                          (v.company || "").toLowerCase().includes(searchVal);
        const catMatch = catFilter === "" || v.category === catFilter;
        const statusMatch = statusFilter === "" || (v.status || "").toLowerCase() === statusFilter.toLowerCase();
        return nameMatch && catMatch && statusMatch;
    });

    const tbody = document.querySelector("#vendorTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="empty-state-wrapper">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No matching vendors found</div>
            <p>Refine your search parameters or reset filters.</p>
        </td></tr>`;
        return;
    }

    filtered.forEach(vendor => {
        let statusClass = "badge-neutral";
        if (vendor.status === "Approved") statusClass = "badge-active";
        else if (vendor.status === "Pending") statusClass = "badge-pending";
        else if (vendor.status === "Inactive") statusClass = "badge-poor";

        const qScore = vendor.quality_score !== null ? `${vendor.quality_score}%` : 'N/A';
        const dRate = vendor.delivery_rate !== null ? `${vendor.delivery_rate}%` : 'N/A';

        const companyVal = vendor.company && vendor.company !== "null" ? vendor.company : "—";
        const emailVal = vendor.email && vendor.email !== "null" ? vendor.email : "—";
        const phoneVal = vendor.phone && vendor.phone !== "null" ? vendor.phone : "—";
        const addressVal = vendor.address && vendor.address !== "null" ? vendor.address : "—";
        const categoryVal = vendor.category && vendor.category !== "null" ? vendor.category : "—";

        tbody.innerHTML += `
        <tr data-id="${vendor.id}">
            <td>${vendor.id}</td>
            <td style="font-weight: 600;">${vendor.vendor_name}</td>
            <td style="font-weight: 500;">${companyVal}</td>
            <td>${emailVal}</td>
            <td>${phoneVal}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${addressVal}">${addressVal}</td>
            <td>${categoryVal}</td>
            <td><span class="badge ${statusClass}">${vendor.status}</span></td>
            <td style="font-weight: 500;">${qScore}</td>
            <td style="font-weight: 500;">${dRate}</td>
            <td>${vendor.total_orders}</td>
            <td>${vendor.completed_orders}</td>
            <td>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary" data-action="edit" style="padding: 6px 10px; font-size: 11px;">Edit</button>
                    <button class="btn btn-danger" data-action="delete" style="padding: 6px 10px; font-size: 11px;">Delete</button>
                    <button class="btn btn-primary" data-action="score" style="padding: 6px 10px; font-size: 11px;">Score</button>
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
    const vendor = allVendors.find(v => v.id === id);

    if (!vendor) return;

    if (action === "edit") {
        editVendor(vendor);
    } else if (action === "delete") {
        deleteVendor(id);
    } else if (action === "score") {
        calculateScore(id);
    }
}

async function editVendor(vendor) {
    const name = prompt("Vendor Name", vendor.vendor_name);
    if (name === null) return;

    const company = prompt("Company", vendor.company === null || vendor.company === "null" ? "" : vendor.company);
    if (company === null) return;

    const email = prompt("Email", vendor.email === null || vendor.email === "null" ? "" : vendor.email);
    if (email === null) return;

    const phone = prompt("Phone", vendor.phone === null || vendor.phone === "null" ? "" : vendor.phone);
    if (phone === null) return;

    const address = prompt("Address", vendor.address === null || vendor.address === "null" ? "" : vendor.address);
    if (address === null) return;

    const category = prompt("Category", vendor.category === null || vendor.category === "null" ? "" : vendor.category);
    if (category === null) return;

    const status = prompt("Status (Approved/Pending/Inactive)", vendor.status);
    if (status === null) return;

    const formData = new FormData();
    formData.append("vendor_name", name);
    formData.append("company", company);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("address", address);
    formData.append("category", category);
    formData.append("status", status);

    try {
        const response = await fetch(`${API_BASE_URL}/vendors/${vendor.id}`, {
            method: "PUT",
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Vendor records updated successfully.", "success");
            loadVendors();
        } else {
            showToast(result.error || "Failed to update vendor", "error");
        }
    } catch (e) {
        showToast("Error updating vendor details.", "error");
    }
}

async function deleteVendor(id) {
    const ok = confirm("Are you sure you want to delete this vendor record?");
    if (!ok) return;

    try {
        const response = await fetch(`${API_BASE_URL}/vendors/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Vendor deleted successfully.", "success");
            loadVendors();
        } else {
            showToast(result.message || "Failed to delete vendor", "error");
        }
    } catch (e) {
        showToast("Error executing deletion.", "error");
    }
}

async function calculateScore(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/vendors/calculate-score/${id}`, {
            method: "PUT"
        });

        const result = await response.json();
        if (response.ok) {
            showToast(`Score updated! Reliability: ${result.score}%`, "success");
            loadVendors();
        } else {
            showToast(result.message || "Failed to calculate score", "error");
        }
    } catch (e) {
        showToast("Error calculating score details.", "error");
    }
}

// Load vendors on DOM ready
document.addEventListener("DOMContentLoaded", loadVendors);