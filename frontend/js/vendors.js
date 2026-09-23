// ==================================================
// VENDORS DIRECTORY & ONBOARDING REVIEW JAVASCRIPT
// ==================================================

const API_BASE_URL = "http://127.0.0.1:8000";
let allVendors = [];
let currentReviewVendor = null;

function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadVendors() {
    try {
        const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/vendors`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const vendors = await response.json();
        allVendors = Array.isArray(vendors) ? vendors : [];

        // Build dynamic category dropdown options
        populateCategoryFilter();

        // Check if URL has ?risk= or ?status= filter
        const urlParams = new URLSearchParams(window.location.search);
        const riskParam = urlParams.get("risk");
        if (riskParam) {
            const searchInput = document.getElementById("searchVendors");
            if (searchInput) {
                searchInput.placeholder = `Filtered by: ${riskParam} (Type to search...)`;
            }
        }
        const statusParam = urlParams.get("status");
        if (statusParam) {
            const statusSelect = document.getElementById("filterStatus");
            if (statusSelect) {
                for (let opt of statusSelect.options) {
                    if (opt.value.toLowerCase() === statusParam.toLowerCase()) {
                        statusSelect.value = opt.value;
                        break;
                    }
                }
            }
        }

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

        // Wire modal action buttons
        setupReviewModalActions();

    } catch (error) {
        console.error("Load vendors error:", error);
        const tbody = document.querySelector("#vendorTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="12" style="color: var(--danger-color); text-align: center; padding: 20px;">
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
    const searchVal = (document.getElementById("searchVendors").value || "").toLowerCase().trim();
    const catFilter = document.getElementById("filterCategory").value;
    const statusFilter = (document.getElementById("filterStatus").value || "").toLowerCase().trim();

    const urlParams = new URLSearchParams(window.location.search);
    const riskParam = urlParams.get("risk");

    const filtered = allVendors.filter(v => {
        const nameMatch = (v.vendor_name || "").toLowerCase().includes(searchVal) ||
                          (v.company || "").toLowerCase().includes(searchVal) ||
                          (v.vendor_code || "").toLowerCase().includes(searchVal) ||
                          (v.pan || "").toLowerCase().includes(searchVal) ||
                          (v.email || "").toLowerCase().includes(searchVal);

        const catMatch = catFilter === "" || v.category === catFilter;

        let statusMatch = true;
        if (statusFilter !== "") {
            const currentStatus = (v.status || "").toLowerCase();
            if (statusFilter === "active") {
                statusMatch = currentStatus === "active" || currentStatus === "approved";
            } else if (statusFilter === "pending verification") {
                statusMatch = currentStatus === "pending verification" || currentStatus === "pending";
            } else {
                statusMatch = currentStatus === statusFilter;
            }
        }

        let riskMatch = true;
        if (riskParam && !searchVal) {
            const rLower = riskParam.toLowerCase();
            if (rLower.includes("high")) {
                riskMatch = (v.risk_level && v.risk_level.toLowerCase().includes("high")) || (v.reliability_score !== null && Number(v.reliability_score) < 60);
            } else if (rLower.includes("med")) {
                riskMatch = (v.risk_level && v.risk_level.toLowerCase().includes("medium")) || (v.reliability_score !== null && Number(v.reliability_score) >= 60 && Number(v.reliability_score) < 80);
            } else if (rLower.includes("low")) {
                riskMatch = (v.risk_level && v.risk_level.toLowerCase().includes("low")) || (v.reliability_score !== null && Number(v.reliability_score) >= 80);
            }
        }

        return nameMatch && catMatch && statusMatch && riskMatch;
    });

    const tbody = document.querySelector("#vendorTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="empty-state-wrapper">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No matching vendors found</div>
            <p>Refine your search parameters or reset filters.</p>
        </td></tr>`;
        return;
    }

    const currentRole = typeof getUserRole === "function" ? getUserRole() : "";
    const isProcurementOrAdmin = currentRole === "Administrator" || currentRole === "Admin" || currentRole === "Procurement Manager";

    const rowsHtml = [];

    filtered.forEach(vendor => {
        let statusClass = "badge-neutral";
        const st = (vendor.status || "").toLowerCase();
        if (st === "active" || st === "approved") statusClass = "badge-active";
        else if (st === "pending verification" || st === "pending") statusClass = "badge-pending";
        else if (st === "correction requested") statusClass = "badge-warning";
        else if (st === "rejected") statusClass = "badge-poor";
        else if (st === "inactive") statusClass = "badge-neutral";

        const qScore = vendor.quality_score !== null ? `${vendor.quality_score}%` : "N/A";
        const dRate = vendor.delivery_rate !== null ? `${vendor.delivery_rate}%` : "N/A";

        const displayCode = vendor.vendor_code || `VEN-${String(vendor.id).padStart(5, "0")}`;
        const companyVal = vendor.company && vendor.company !== "null" ? vendor.company : "—";
        const emailVal = vendor.email && vendor.email !== "null" ? vendor.email : "—";
        const phoneVal = vendor.phone && vendor.phone !== "null" ? vendor.phone : "—";
        const categoryVal = vendor.category && vendor.category !== "null" ? vendor.category : "—";

        let actionButtons = `
            <button class="btn btn-primary" data-action="review" style="padding: 5px 10px; font-size: 11px; background: #4f46e5;">Review</button>
        `;

        if (isProcurementOrAdmin) {
            actionButtons += `
                <button class="btn btn-secondary" data-action="edit" style="padding: 5px 8px; font-size: 11px;">Edit</button>
                <button class="btn btn-danger" data-action="delete" style="padding: 5px 8px; font-size: 11px;">Delete</button>
            `;
        }

        actionButtons += `
            <button class="btn btn-secondary" data-action="score" style="padding: 5px 8px; font-size: 11px;">Score</button>
        `;

        rowsHtml.push(`
        <tr data-id="${vendor.id}">
            <td style="font-weight: 700; font-family: monospace; color: var(--primary-color);">${escapeHTML(displayCode)}</td>
            <td style="font-weight: 600;">${escapeHTML(vendor.vendor_name)}</td>
            <td style="font-weight: 500;">${escapeHTML(companyVal)}</td>
            <td>${escapeHTML(emailVal)}</td>
            <td>${escapeHTML(phoneVal)}</td>
            <td>${escapeHTML(categoryVal)}</td>
            <td><span class="badge ${statusClass}">${escapeHTML(vendor.status)}</span></td>
            <td style="font-weight: 500;">${qScore}</td>
            <td style="font-weight: 500;">${dRate}</td>
            <td>${vendor.total_orders || 0}</td>
            <td>${vendor.completed_orders || 0}</td>
            <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    ${actionButtons}
                </div>
            </td>
        </tr>
        `);
    });

    tbody.innerHTML = rowsHtml.join("");
}

function handleTableClick(event) {
    const btn = event.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const tr = btn.closest("tr");
    const id = parseInt(tr.dataset.id, 10);
    const vendor = allVendors.find(v => v.id === id);

    if (!vendor) return;

    if (action === "review") {
        openReviewModal(vendor);
    } else if (action === "edit") {
        editVendor(vendor);
    } else if (action === "delete") {
        deleteVendor(id);
    } else if (action === "score") {
        calculateScore(id);
    }
}

// ==================================================
// REVIEW MODAL IMPLEMENTATION
// ==================================================

function openReviewModal(vendor) {
    currentReviewVendor = vendor;
    const modal = document.getElementById("vendorReviewModal");
    if (!modal) return;

    const displayCode = vendor.vendor_code || `VEN-${String(vendor.id).padStart(5, "0")}`;
    document.getElementById("modalVendorTitle").textContent = `${vendor.vendor_name} (${displayCode})`;
    document.getElementById("modalVendorSubtitle").textContent = `Application Ref #${vendor.id} • ${vendor.category || "Procurement Supplier"}`;

    // Status Banner
    const statusBadge = document.getElementById("modalStatusBadge");
    statusBadge.textContent = vendor.status || "Pending Verification";
    const st = (vendor.status || "").toLowerCase();
    statusBadge.className = "badge " + (
        st === "active" || st === "approved" ? "badge-active" :
        st === "pending verification" || st === "pending" ? "badge-pending" :
        st === "correction requested" ? "badge-warning" :
        st === "rejected" ? "badge-poor" : "badge-neutral"
    );

    const codeBadge = document.getElementById("modalVendorCodeBadge");
    if (st === "active" || st === "approved") {
        codeBadge.textContent = `Vendor ID: ${displayCode}`;
        codeBadge.style.color = "var(--success-color)";
    } else {
        codeBadge.textContent = "Vendor ID: Assigned on Approval";
        codeBadge.style.color = "var(--text-secondary)";
    }

    const metaElem = document.getElementById("modalApprovalMeta");
    if (vendor.approved_by) {
        metaElem.textContent = `Reviewed by: ${vendor.approved_by}${vendor.approved_at ? " (" + vendor.approved_at.substring(0, 10) + ")" : ""}`;
    } else {
        metaElem.textContent = "Pending reviewer verification";
    }

    // Company Information
    document.getElementById("revVendorName").textContent = vendor.vendor_name || "—";
    document.getElementById("revCompanyType").textContent = vendor.company_type || "—";
    document.getElementById("revPan").textContent = vendor.pan || "—";
    document.getElementById("revGstin").textContent = vendor.gstin || "—";
    document.getElementById("revCin").textContent = vendor.cin || "—";
    document.getElementById("revMsme").textContent = vendor.msme_number || "—";

    // Contact Coordinates
    document.getElementById("revAddress").textContent = vendor.address || "—";
    const locParts = [vendor.city, vendor.state, vendor.pin_code].filter(Boolean);
    document.getElementById("revLocation").textContent = locParts.length ? locParts.join(", ") : "—";
    document.getElementById("revContactPerson").textContent = vendor.contact_person || vendor.contact_name || "—";
    document.getElementById("revEmail").textContent = vendor.email || "—";
    document.getElementById("revPhone").textContent = vendor.phone || "—";

    // Business Capabilities
    document.getElementById("revCategory").textContent = vendor.category || "—";
    document.getElementById("revProductsServices").textContent = vendor.products_services || "—";
    document.getElementById("revDescription").textContent = vendor.business_description || "No description provided.";

    // Bank Coordinates
    document.getElementById("revBankAccName").textContent = vendor.bank_account_name || "—";
    document.getElementById("revBankName").textContent = vendor.bank_name || "—";
    document.getElementById("revBankAccNum").textContent = vendor.bank_account_number || "—";
    document.getElementById("revBankIfsc").textContent = vendor.bank_ifsc || "—";
    document.getElementById("revBankBranch").textContent = vendor.bank_branch || "—";

    // Documents Links
    const docContainer = document.getElementById("revDocList");
    docContainer.innerHTML = "";
    const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");

    const docs = [
        { label: "PAN Document", key: "pan", file: vendor.doc_pan },
        { label: "Cancelled Cheque", key: "cancelled_cheque", file: vendor.doc_cancelled_cheque },
        { label: "GST Certificate", key: "gst", file: vendor.doc_gst },
        { label: "COI / Incorporation", key: "incorporation", file: vendor.doc_incorporation },
        { label: "MSME Certificate", key: "msme", file: vendor.doc_msme }
    ];

    docs.forEach(d => {
        if (d.file) {
            const link = document.createElement("a");
            link.className = "doc-badge-link";
            link.target = "_blank";
            link.href = `${API_BASE_URL}/vendors/${vendor.id}/documents/${d.key}?token=${encodeURIComponent(token || "")}`;
            link.innerHTML = `<span>📄</span> <span>${escapeHTML(d.label)}</span>`;
            docContainer.appendChild(link);
        }
    });

    if (docContainer.children.length === 0) {
        docContainer.innerHTML = `<span style="font-size: 12px; color: var(--text-secondary);">No verification document files attached.</span>`;
    }

    // Role Guard on Action Controls
    const currentRole = typeof getUserRole === "function" ? getUserRole() : "";
    const isProcurementOrAdmin = currentRole === "Administrator" || currentRole === "Admin" || currentRole === "Procurement Manager";
    const actionBox = document.getElementById("reviewActionBox");
    const notesInput = document.getElementById("reviewNotesInput");
    notesInput.value = "";

    const btnApprove = document.getElementById("btnApproveVendor");
    const btnReject = document.getElementById("btnRejectVendor");
    const btnCorrection = document.getElementById("btnRequestCorrection");
    const resubmitBanner = document.getElementById("correctionResubmitBanner");
    const resubmitLink = document.getElementById("btnCorrectionResubmitLink");

    if (actionBox) {
        if (isProcurementOrAdmin) {
            actionBox.style.display = "block";
            if (st === "active" || st === "approved") {
                btnApprove.style.display = "none";
                btnReject.style.display = "inline-block";
                btnCorrection.style.display = "none";
            } else {
                btnApprove.style.display = "inline-block";
                btnReject.style.display = "inline-block";
                btnCorrection.style.display = "inline-block";
            }
        } else {
            actionBox.style.display = "none";
        }
    }

    if (st === "correction requested") {
        resubmitBanner.style.display = "block";
        resubmitLink.href = `add-vendor.html?id=${vendor.id}`;
    } else {
        resubmitBanner.style.display = "none";
    }

    modal.classList.add("active");
}

function closeReviewModal() {
    const modal = document.getElementById("vendorReviewModal");
    if (modal) modal.classList.remove("active");
    currentReviewVendor = null;
}

function setupReviewModalActions() {
    const btnApprove = document.getElementById("btnApproveVendor");
    const btnReject = document.getElementById("btnRejectVendor");
    const btnCorrection = document.getElementById("btnRequestCorrection");

    if (btnApprove) {
        btnApprove.onclick = async () => {
            if (!currentReviewVendor) return;
            const notes = document.getElementById("reviewNotesInput").value;

            btnApprove.disabled = true;
            btnApprove.textContent = "Approving...";

            try {
                const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
                const formData = new FormData();
                if (notes) formData.append("notes", notes);

                const res = await fetch(`${API_BASE_URL}/vendors/${currentReviewVendor.id}/approve`, {
                    method: "POST",
                    headers: token ? { "Authorization": `Bearer ${token}` } : {},
                    body: formData
                });

                const data = await res.json();
                if (res.ok) {
                    showToast(`Vendor approved! Vendor ID: ${data.vendor_code}. Status: Active.`, "success");
                    closeReviewModal();
                    await loadVendors();
                } else {
                    showToast(data.detail || data.error || "Failed to approve vendor.", "error");
                }
            } catch (err) {
                console.error("Approval error:", err);
                showToast("Connection error while approving vendor.", "error");
            } finally {
                btnApprove.disabled = false;
                btnApprove.textContent = "Approve & Activate Vendor";
            }
        };
    }

    if (btnReject) {
        btnReject.onclick = async () => {
            if (!currentReviewVendor) return;
            const reason = (document.getElementById("reviewNotesInput").value || "").trim();
            if (!reason) {
                showToast("Rejection reason is required in the notes field.", "warning");
                document.getElementById("reviewNotesInput").focus();
                return;
            }

            if (!confirm(`Are you sure you want to reject vendor '${currentReviewVendor.vendor_name}'?`)) {
                return;
            }

            btnReject.disabled = true;
            btnReject.textContent = "Rejecting...";

            try {
                const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
                const formData = new FormData();
                formData.append("rejection_reason", reason);

                const res = await fetch(`${API_BASE_URL}/vendors/${currentReviewVendor.id}/reject`, {
                    method: "POST",
                    headers: token ? { "Authorization": `Bearer ${token}` } : {},
                    body: formData
                });

                const data = await res.json();
                if (res.ok) {
                    showToast("Vendor registration rejected.", "info");
                    closeReviewModal();
                    await loadVendors();
                } else {
                    showToast(data.detail || data.error || "Failed to reject vendor.", "error");
                }
            } catch (err) {
                console.error("Rejection error:", err);
                showToast("Connection error while rejecting vendor.", "error");
            } finally {
                btnReject.disabled = false;
                btnReject.textContent = "Reject Application";
            }
        };
    }

    if (btnCorrection) {
        btnCorrection.onclick = async () => {
            if (!currentReviewVendor) return;
            const reason = (document.getElementById("reviewNotesInput").value || "").trim();
            if (!reason) {
                showToast("Correction instructions are required in the notes field.", "warning");
                document.getElementById("reviewNotesInput").focus();
                return;
            }

            btnCorrection.disabled = true;
            btnCorrection.textContent = "Requesting...";

            try {
                const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
                const formData = new FormData();
                formData.append("correction_reason", reason);

                const res = await fetch(`${API_BASE_URL}/vendors/${currentReviewVendor.id}/request-correction`, {
                    method: "POST",
                    headers: token ? { "Authorization": `Bearer ${token}` } : {},
                    body: formData
                });

                const data = await res.json();
                if (res.ok) {
                    showToast("Correction requested from vendor.", "info");
                    closeReviewModal();
                    await loadVendors();
                } else {
                    showToast(data.detail || data.error || "Failed to request correction.", "error");
                }
            } catch (err) {
                console.error("Correction request error:", err);
                showToast("Connection error while requesting correction.", "error");
            } finally {
                btnCorrection.disabled = false;
                btnCorrection.textContent = "Request Correction";
            }
        };
    }
}

// ==================================================
// GENERAL ACTIONS (EDIT, DELETE, SCORE)
// ==================================================

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

    const status = prompt("Status (Active/Pending Verification/Correction Requested/Rejected/Inactive)", vendor.status);
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
        const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/vendors/${vendor.id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Vendor records updated successfully.", "success");
            await loadVendors();
        } else {
            showToast(result.error || result.detail || "Failed to update vendor", "error");
        }
    } catch (e) {
        showToast("Error updating vendor details.", "error");
    }
}

async function deleteVendor(id) {
    const ok = confirm("Are you sure you want to delete this vendor record?");
    if (!ok) return;

    try {
        const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/vendors/${id}`, {
            method: "DELETE",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Vendor deleted successfully.", "success");
            await loadVendors();
        } else {
            showToast(result.message || result.detail || "Failed to delete vendor", "error");
        }
    } catch (e) {
        showToast("Error executing deletion.", "error");
    }
}

async function calculateScore(id) {
    try {
        const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/vendors/calculate-score/${id}`, {
            method: "PUT",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const result = await response.json();
        if (response.ok) {
            showToast(`Score updated! Reliability: ${result.score}%`, "success");
            await loadVendors();
        } else {
            showToast(result.message || result.detail || "Failed to calculate score", "error");
        }
    } catch (e) {
        showToast("Error calculating score details.", "error");
    }
}

// Load vendors on DOM ready
document.addEventListener("DOMContentLoaded", loadVendors);
