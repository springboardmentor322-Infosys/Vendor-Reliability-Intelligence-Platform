const API_BASE_URL = "http://127.0.0.1:8000";
let allContracts = [];

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getAuthHeaders(extraHeaders = {}) {
    const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
    const headers = { ...extraHeaders };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

document.addEventListener("DOMContentLoaded", () => {
    setupRoleUI();
    
    const form = document.getElementById("contractForm");
    if (form) {
        form.addEventListener("submit", addContract);
    }

    const searchInput = document.getElementById("searchContracts");
    if (searchInput) {
        searchInput.addEventListener("input", filterAndRenderTable);
    }

    const statusFilter = document.getElementById("filterContractStatus");
    if (statusFilter) {
        statusFilter.addEventListener("change", filterAndRenderTable);
    }
    
    const tbody = document.querySelector("#contractTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
    }
    
    // Set default dates for form if it exists
    const startDateInput = document.getElementById("start_date");
    if (startDateInput) {
        const today = new Date().toISOString().split('T')[0];
        startDateInput.value = today;
    }

    // Check URL parameters for status filter
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get("status");
    if (statusParam && statusFilter) {
        const rawStatus = statusParam.trim().toLowerCase();
        let targetVal = statusParam;
        if (rawStatus.includes("expiring")) targetVal = "Expiring Soon";
        else if (rawStatus === "expired") targetVal = "Expired";
        else if (rawStatus === "active") targetVal = "Active";
        else if (rawStatus === "pending") targetVal = "Pending";
        else if (rawStatus === "inactive") targetVal = "Inactive";

        for (let opt of statusFilter.options) {
            if (opt.value.toLowerCase() === targetVal.toLowerCase() || opt.text.toLowerCase().includes(rawStatus)) {
                statusFilter.value = opt.value;
                break;
            }
        }
    }

    wireContractsKpiClicks();
    loadContracts();
});

function wireContractsKpiClicks() {
    const cardTotal = document.getElementById("kpiTotalContracts")?.closest(".kpi-card");
    if (cardTotal) {
        cardTotal.classList.add("clickable-card");
        cardTotal.title = "Click to show all contracts";
        cardTotal.onclick = () => {
            const sel = document.getElementById("filterContractStatus");
            if (sel) sel.value = "";
            filterAndRenderTable();
        };
    }
    const cardActive = document.getElementById("kpiActiveContracts")?.closest(".kpi-card");
    if (cardActive) {
        cardActive.classList.add("clickable-card");
        cardActive.title = "Click to filter Active contracts";
        cardActive.onclick = () => {
            const sel = document.getElementById("filterContractStatus");
            if (sel) sel.value = "Active";
            filterAndRenderTable();
        };
    }
    const cardExpiring = document.getElementById("kpiExpiringContracts")?.closest(".kpi-card");
    if (cardExpiring) {
        cardExpiring.classList.add("clickable-card");
        cardExpiring.title = "Click to filter Expiring Soon contracts";
        cardExpiring.onclick = () => {
            const sel = document.getElementById("filterContractStatus");
            if (sel) sel.value = "Expiring Soon";
            filterAndRenderTable();
        };
    }
    const cardExpired = document.getElementById("kpiExpiredContracts")?.closest(".kpi-card");
    if (cardExpired) {
        cardExpired.classList.add("clickable-card");
        cardExpired.title = "Click to filter Expired contracts";
        cardExpired.onclick = () => {
            const sel = document.getElementById("filterContractStatus");
            if (sel) sel.value = "Expired";
            filterAndRenderTable();
        };
    }
}

function setupRoleUI() {
    const role = typeof getUserRole === "function" ? getUserRole() : localStorage.getItem("user_role");
    const isVendor = (role === "Vendor");
    const isAdminOrPM = (role === "Admin" || role === "Administrator" || role === "Procurement Manager");

    const container = document.getElementById("addContractContainer");
    if (container) {
        container.style.display = isAdminOrPM ? "block" : "none";
    }

    const pageTitle = document.getElementById("contractsPageTitle");
    const pageSubtitle = document.getElementById("contractsPageSubtitle");
    const tableTitle = document.getElementById("tableTitleHeader");
    const totalSub = document.getElementById("kpiTotalSub");

    if (isVendor) {
        if (pageTitle) pageTitle.textContent = "My Contracts & Compliance";
        if (pageSubtitle) pageSubtitle.textContent = "Official procurement agreements, validity dates, renewal obligations, and compliance standards.";
        if (tableTitle) tableTitle.textContent = "Company Contracts & Compliance Ledger";
        if (totalSub) totalSub.textContent = "Your active & past contracts";
    } else {
        if (pageTitle) pageTitle.textContent = "Contract Directory";
        if (pageSubtitle) pageSubtitle.textContent = "Manage procurement agreements, active SLAs, legal start/end dates, and status categories.";
        if (tableTitle) tableTitle.textContent = "SLA Contracts Ledger";
        if (totalSub) totalSub.textContent = "Total contract records";
    }

    renderTableHeaders(isVendor, isAdminOrPM);
}

function renderTableHeaders(isVendor, isAdminOrPM) {
    const thead = document.getElementById("contractTableHead");
    if (!thead) return;

    if (isVendor) {
        thead.innerHTML = `
            <tr>
                <th>Contract Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Agreement Status</th>
                <th>Renewal Status</th>
                <th>SLA Requirements</th>
                <th>Compliance & Certifications</th>
            </tr>
        `;
    } else if (isAdminOrPM) {
        thead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Vendor ID</th>
                <th>Vendor Name</th>
                <th>Contract Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Management Actions</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Vendor ID</th>
                <th>Vendor Name</th>
                <th>Contract Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Compliance Status</th>
            </tr>
        `;
    }
}

async function loadContracts() {
    try {
        const response = await fetch(`${API_BASE_URL}/contracts`, {
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            if (typeof logout === "function") logout();
            return;
        }

        const contracts = await response.json();

        if (contracts.error) {
            throw new Error(contracts.error);
        }

        allContracts = Array.isArray(contracts) ? contracts : [];

        // Calculate KPIs dynamically from real PostgreSQL records
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
        let remainingDays = c.remaining_days;
        if (remainingDays === undefined && c.end_date) {
            const end = new Date(c.end_date);
            remainingDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        }

        // Mutually exclusive contract status categories
        if (status === "expired" || (remainingDays !== undefined && remainingDays < 0)) {
            expired++;
        } else if (status === "expiring soon" || status === "renewal due soon" || (remainingDays !== undefined && remainingDays >= 0 && remainingDays <= 30)) {
            expiring++;
        } else if (status === "active" || (remainingDays !== undefined && remainingDays > 30)) {
            active++;
        }
    });

    const setKpi = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setKpi("kpiTotalContracts", total);
    setKpi("kpiActiveContracts", active);
    setKpi("kpiExpiringContracts", expiring);
    setKpi("kpiExpiredContracts", expired);
}

function filterAndRenderTable() {
    const searchInput = document.getElementById("searchContracts");
    const searchVal = searchInput ? searchInput.value.toLowerCase() : "";
    const filterSelect = document.getElementById("filterContractStatus");
    const statusFilter = filterSelect ? filterSelect.value.toLowerCase() : "";

    const role = typeof getUserRole === "function" ? getUserRole() : localStorage.getItem("user_role");
    const isVendor = (role === "Vendor");
    const isAdminOrPM = (role === "Admin" || role === "Administrator" || role === "Procurement Manager");

    const filtered = allContracts.filter(c => {
        const nameMatch = (c.contract_name || "").toLowerCase().includes(searchVal) || 
                          (c.vendor_name || "").toLowerCase().includes(searchVal);
        
        let effectiveStatus = (c.status || "Pending").toLowerCase();

        let statusMatch = false;
        if (statusFilter === "") {
            statusMatch = true;
        } else {
            statusMatch = effectiveStatus === statusFilter;
        }

        return nameMatch && statusMatch;
    });

    const tbody = document.querySelector("#contractTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const colCount = isVendor ? 7 : 8;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-state-wrapper" style="text-align: center; padding: 36px 16px;">
            <div class="empty-state-icon" style="font-size: 36px; margin-bottom: 8px;">📄</div>
            <div class="empty-state-title" style="font-size: 16px; font-weight: 600; color: var(--text-color); margin-bottom: 4px;">No contracts found</div>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">${isVendor ? "No contracts are currently assigned to your company." : "No contracts match your search criteria or filters."}</p>
        </td></tr>`;
        return;
    }

    filtered.forEach(c => {
        let displayStatus = c.status || "Active";
        let statusClass = "badge-neutral";
        const statusLower = displayStatus.toLowerCase();
        
        if (statusLower === "active") statusClass = "badge-active";
        else if (statusLower === "expiring soon") statusClass = "badge-warning";
        else if (statusLower === "renewal due soon") statusClass = "badge-pending";
        else if (statusLower === "expired" || statusLower === "inactive") statusClass = "badge-poor";
        else if (statusLower.includes("pending")) statusClass = "badge-pending";

        if (isVendor) {
            // Vendor View: Read-Only with genuine database values
            const renewal = c.renewal_status;
            let renewalHtml = "—";
            if (renewal) {
                let renewalClass = "badge-neutral";
                if (renewal.toLowerCase().includes("required") || renewal.toLowerCase().includes("due")) {
                    renewalClass = "badge-warning";
                } else if (renewal.toLowerCase() === "active") {
                    renewalClass = "badge-active";
                }
                renewalHtml = `<span class="badge ${renewalClass}">${escapeHtml(renewal)}</span>`;
            }

            const compliance = c.compliance_status;
            let compHtml = "—";
            if (compliance) {
                let compClass = "badge-active";
                if (compliance.toLowerCase().includes("non-compliant") || compliance.toLowerCase().includes("expired")) {
                    compClass = "badge-poor";
                } else if (compliance.toLowerCase().includes("review")) {
                    compClass = "badge-pending";
                }
                compHtml = `<span class="badge ${compClass}">${escapeHtml(compliance)}</span>`;
            }

            const cert = c.vendor_certifications ? `<small style="color: var(--text-muted); font-size: 11px;">${escapeHtml(c.vendor_certifications)}</small>` : "";
            const sla = c.sla_requirements ? escapeHtml(c.sla_requirements) : "—";

            tbody.innerHTML += `
            <tr data-id="${c.id}">
                <td style="font-weight: 600; color: var(--primary-color);">${escapeHtml(c.contract_name)}</td>
                <td>${escapeHtml(c.start_date || '—')}</td>
                <td>${escapeHtml(c.end_date || '—')}</td>
                <td><span class="badge ${statusClass}">${escapeHtml(displayStatus)}</span></td>
                <td>${renewalHtml}</td>
                <td style="font-size: 12px; color: var(--text-secondary);">${sla}</td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        ${compHtml}
                        ${cert}
                    </div>
                </td>
            </tr>
            `;
        } else if (isAdminOrPM) {
            // Admin / Procurement Manager View: Full Management
            tbody.innerHTML += `
            <tr data-id="${c.id}">
                <td>${c.id}</td>
                <td>#${c.vendor_id}</td>
                <td style="font-weight: 600;">${escapeHtml(c.vendor_name || 'N/A')}</td>
                <td style="font-weight: 500;">${escapeHtml(c.contract_name)}</td>
                <td>${escapeHtml(c.start_date || '')}</td>
                <td>${escapeHtml(c.end_date || '')}</td>
                <td><span class="badge ${statusClass}">${escapeHtml(displayStatus)}</span></td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-secondary" data-action="edit" style="padding: 6px 10px; font-size: 11px;">Edit</button>
                        <button class="btn btn-danger" data-action="delete" style="padding: 6px 10px; font-size: 11px;">Delete</button>
                    </div>
                </td>
            </tr>
            `;
        } else {
            // Auditor / Finance Officer: Read-Only Overview
            tbody.innerHTML += `
            <tr data-id="${c.id}">
                <td>${c.id}</td>
                <td>#${c.vendor_id}</td>
                <td style="font-weight: 600;">${escapeHtml(c.vendor_name || 'N/A')}</td>
                <td style="font-weight: 500;">${escapeHtml(c.contract_name)}</td>
                <td>${escapeHtml(c.start_date || '')}</td>
                <td>${escapeHtml(c.end_date || '')}</td>
                <td><span class="badge ${statusClass}">${escapeHtml(displayStatus)}</span></td>
                <td><span class="badge badge-active">${escapeHtml(c.compliance_status || 'Compliant')}</span></td>
            </tr>
            `;
        }
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

async function addContract(event) {
    event.preventDefault();

    const role = typeof getUserRole === "function" ? getUserRole() : localStorage.getItem("user_role");
    if (role === "Vendor") {
        if (typeof showToast === "function") showToast("Permission Denied: Vendors cannot create contracts.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("vendor_id", document.getElementById("vendor_id").value);
    formData.append("contract_name", document.getElementById("contract_name").value);
    formData.append("start_date", document.getElementById("start_date").value);
    formData.append("end_date", document.getElementById("end_date").value);
    formData.append("status", document.getElementById("status").value);

    try {
        const response = await fetch(`${API_BASE_URL}/contracts`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            if (typeof showToast === "function") showToast("Contract registered successfully.", "success");
            document.getElementById("contractForm").reset();
            const today = new Date().toISOString().split('T')[0];
            const startInput = document.getElementById("start_date");
            if (startInput) startInput.value = today;
            
            loadContracts();
        } else {
            if (typeof showToast === "function") showToast(result.detail || result.error || "Failed to add contract", "error");
        }
    } catch (e) {
        if (typeof showToast === "function") showToast("Error saving contract record.", "error");
    }
}

async function editContract(contract) {
    const role = typeof getUserRole === "function" ? getUserRole() : localStorage.getItem("user_role");
    if (role === "Vendor") {
        if (typeof showToast === "function") showToast("Permission Denied: Vendors cannot edit contracts.", "error");
        return;
    }

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
            headers: getAuthHeaders(),
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            if (typeof showToast === "function") showToast("Contract updated successfully.", "success");
            loadContracts();
        } else {
            if (typeof showToast === "function") showToast(result.detail || "Permission Denied: Unable to edit this contract.", "error");
        }
    } catch (e) {
        if (typeof showToast === "function") showToast("Error updating contract details.", "error");
    }
}

async function deleteContract(id) {
    const role = typeof getUserRole === "function" ? getUserRole() : localStorage.getItem("user_role");
    if (role === "Vendor") {
        if (typeof showToast === "function") showToast("Permission Denied: Vendors cannot delete contracts.", "error");
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete this contract record?");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        const result = await response.json();
        if (response.ok) {
            if (typeof showToast === "function") showToast("Contract deleted successfully.", "success");
            loadContracts();
        } else {
            if (typeof showToast === "function") showToast(result.detail || "Permission Denied: Only Admins can delete contracts.", "error");
        }
    } catch (e) {
        if (typeof showToast === "function") showToast("Error deleting contract.", "error");
    }
}
