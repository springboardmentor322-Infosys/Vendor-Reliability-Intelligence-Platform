const API_BASE_URL = "http://127.0.0.1:8000";

let allCommunications = [];

document.addEventListener("DOMContentLoaded", initCommunicationPage);

async function initCommunicationPage() {
    try {
        const token = getToken();
        if (!token) {
            window.location.replace("login.html");
            return;
        }

        const role = getUserRole();
        const isVendor = (role === "Vendor");

        // Role-based UI customizations
        setupRoleUI(role, isVendor, token);

        // Wire event handlers
        setupEventHandlers(token, isVendor);

        // Initial Data Loads
        await Promise.all([
            loadCommunicationStats(token),
            loadCommunications(token)
        ]);

    } catch (err) {
        console.error("Communication initialization error:", err);
    }
}

function setupRoleUI(role, isVendor, token) {
    const titleEl = document.getElementById("commPageTitle");
    const subEl = document.getElementById("commPageSubtitle");
    const vendorGroup = document.getElementById("targetVendorGroup");

    if (isVendor) {
        if (titleEl) titleEl.innerText = "Vendor Communications Desk 💬";
        if (subEl) subEl.innerText = "Direct operational inquiries, order clarifications, and message threads with Procurement.";
        if (vendorGroup) vendorGroup.style.display = "none";
    } else {
        if (titleEl) titleEl.innerText = "Procurement Communications Desk 💬";
        if (subEl) subEl.innerText = "Manage inquiries, clarify requirements, and collaborate with supplier partners.";
        if (vendorGroup) {
            vendorGroup.style.display = "block";
            loadVendorsDropdown(token);
        }
    }
}

async function loadVendorsDropdown(token) {
    const select = document.getElementById("targetVendorSelect");
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/vendors`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;
        const vendors = await res.json();
        const vList = Array.isArray(vendors) ? vendors : (vendors.vendors || []);
        
        select.innerHTML = `<option value="">Select Vendor Partner...</option>`;
        vList.forEach(v => {
            const opt = document.createElement("option");
            opt.value = v.id;
            opt.textContent = `${v.vendor_name || 'Vendor'} (#${v.id})`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.warn("Could not populate vendor dropdown:", e);
    }
}

function setupEventHandlers(token, isVendor) {
    // Toggle Composer
    const btnToggle = document.getElementById("btnToggleComposer");
    const btnClose = document.getElementById("btnCloseComposer");
    const composerCard = document.getElementById("composerCard");

    if (btnToggle && composerCard) {
        btnToggle.addEventListener("click", () => {
            const isHidden = composerCard.style.display === "none";
            composerCard.style.display = isHidden ? "block" : "none";
            if (isHidden) {
                composerCard.scrollIntoView({ behavior: "smooth", block: "start" });
                const subjInput = document.getElementById("commSubjectInput");
                if (subjInput) subjInput.focus();
            }
        });
    }

    if (btnClose && composerCard) {
        btnClose.addEventListener("click", () => {
            composerCard.style.display = "none";
        });
    }

    // Filter & Search
    const searchInput = document.getElementById("commSearchInput");
    const statusFilter = document.getElementById("commStatusFilter");

    if (searchInput) searchInput.addEventListener("input", filterAndRenderThreads);
    if (statusFilter) statusFilter.addEventListener("change", filterAndRenderThreads);

    // Form submission
    const composerForm = document.getElementById("commComposerForm");
    if (composerForm) {
        composerForm.addEventListener("submit", (e) => handleComposerSubmit(e, token, isVendor));
    }

    // Modal controls
    const btnCloseModal = document.getElementById("btnCloseModal");
    const btnDismissModal = document.getElementById("btnDismissModal");
    const threadModal = document.getElementById("threadModal");

    const closeModal = () => { if (threadModal) threadModal.style.display = "none"; };
    if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);
    if (btnDismissModal) btnDismissModal.addEventListener("click", closeModal);
    if (threadModal) {
        threadModal.addEventListener("click", (e) => {
            if (e.target === threadModal) closeModal();
        });
    }

    // Modal Reply Form
    const replyForm = document.getElementById("modalReplyForm");
    if (replyForm) {
        replyForm.addEventListener("submit", (e) => handleReplySubmit(e, token, isVendor));
    }
}

async function loadCommunicationStats(token) {
    try {
        const res = await fetch(`${API_BASE_URL}/communications/stats`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;

        const stats = await res.json();
        const safeSet = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        safeSet("kpiTotalMessages", stats.total_count || 0);
        safeSet("kpiTotalMessagesSub", stats.total_count === 1 ? "1 message thread" : `${stats.total_count || 0} message threads`);
        safeSet("kpiActivityScore", stats.has_data ? `${stats.activity_score}%` : "N/A");
        safeSet("kpiActivitySub", stats.has_data ? "Response activity index" : "No messages logged yet");
        safeSet("kpiOpenThreads", stats.open_count || 0);
        safeSet("kpiOpenThreadsSub", stats.open_count === 1 ? "1 thread requiring action" : `${stats.open_count || 0} active inquiries`);

        if (stats.last_activity) {
            const d = new Date(stats.last_activity);
            safeSet("kpiLastDate", isNaN(d.getTime()) ? stats.last_activity.split(" ")[0] : d.toLocaleDateString());
            safeSet("kpiLastDateSub", "Most recent dispatch");
        } else {
            safeSet("kpiLastDate", "None");
            safeSet("kpiLastDateSub", "No messages logged yet");
        }

    } catch (e) {
        console.error("Error loading communication stats:", e);
    }
}

async function loadCommunications(token) {
    const tbody = document.getElementById("communicationBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE_URL}/communications`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error(`GET /communications failed: ${res.status}`);
        }

        allCommunications = await res.json();
        filterAndRenderThreads();

    } catch (err) {
        console.error("Load communications error:", err);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 24px; color: var(--danger-text);">
                    Failed to load communications: ${escapeHTML(err.message)}
                </td>
            </tr>
        `;
    }
}

function filterAndRenderThreads() {
    const tbody = document.getElementById("communicationBody");
    if (!tbody) return;

    const searchTerm = (document.getElementById("commSearchInput")?.value || "").toLowerCase().trim();
    const statusFilter = (document.getElementById("commStatusFilter")?.value || "all").toLowerCase();

    const filtered = allCommunications.filter(c => {
        if (statusFilter !== "all" && (c.issue_status || "").toLowerCase() !== statusFilter) {
            return false;
        }
        if (searchTerm) {
            const hay = `${c.subject || ''} ${c.message || ''} ${c.sender_name || ''} ${c.po_number || ''} ${c.contract_name || ''}`.toLowerCase();
            if (!hay.includes(searchTerm)) return false;
        }
        return true;
    });

    tbody.innerHTML = "";

    if (filtered.length === 0) {
        const msg = allCommunications.length === 0 
            ? "💬 No communication threads logged yet. Use the composer below to reach out directly to the Procurement team."
            : "No communication threads match the selected filters.";
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted); font-style: italic;">
                    ${escapeHTML(msg)}
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(c => {
        const tr = document.createElement("tr");

        const status = c.issue_status || "Resolved";
        let statusBadgeClass = "badge-active";
        if (status.toLowerCase() === "open") statusBadgeClass = "badge-warning";
        else if (status.toLowerCase() === "in progress") statusBadgeClass = "badge-pending";

        let contextTag = `<span style="color: var(--text-muted); font-size: 11px;">General Inquiry</span>`;
        if (c.po_number) {
            contextTag = `<strong style="color: var(--primary-color); font-size: 11.5px;">🛍️ ${escapeHTML(c.po_number)}</strong>`;
        } else if (c.contract_name) {
            contextTag = `<strong style="color: #0369a1; font-size: 11.5px;">📄 ${escapeHTML(c.contract_name)}</strong>`;
        }

        const msgPreview = (c.message || "").length > 55 
            ? `${(c.message || "").substring(0, 55)}...` 
            : (c.message || "");

        tr.innerHTML = `
            <td style="font-weight: 600; font-size: 12px;">#COMM-${c.id}</td>
            <td style="font-weight: 600;">${escapeHTML(c.subject || 'Procurement Inquiry')}</td>
            <td>
                <div style="font-size: 12px; font-weight: 600;">${escapeHTML(c.sender_name || 'Procurement Desk')}</div>
                <div style="font-size: 10.5px; color: var(--text-muted);">${escapeHTML(c.sender_role || 'User')}</div>
            </td>
            <td>${contextTag}</td>
            <td style="font-size: 12px; color: var(--text-secondary); max-width: 260px;">${escapeHTML(msgPreview)}</td>
            <td style="font-size: 11.5px; color: var(--text-muted);">${escapeHTML(c.created_at || 'N/A')}</td>
            <td><span class="badge ${statusBadgeClass}">${escapeHTML(status)}</span></td>
            <td>
                <button type="button" class="btn btn-secondary" onclick="openThreadModal(${c.id})" style="padding: 4px 10px; font-size: 11.5px;">
                    View & Reply
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openThreadModal = async function(commId) {
    const token = getToken();
    const modal = document.getElementById("threadModal");
    if (!modal) return;

    try {
        const res = await fetch(`${API_BASE_URL}/communications/${commId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.detail || "Could not retrieve thread details");
            return;
        }

        const comm = await res.json();

        const safeSet = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        };

        safeSet("modalThreadTitle", comm.subject || `Inquiry #COMM-${comm.id}`);
        safeSet("modalThreadMeta", `Thread Reference: #COMM-${comm.id} • Status: ${comm.issue_status || 'Resolved'}`);
        safeSet("modalSender", `👤 ${comm.sender_name || 'Procurement Desk'} (${comm.sender_role || 'User'})`);
        safeSet("modalDate", `🕒 ${comm.created_at || ''}`);
        safeSet("modalMessageBody", comm.message || "");

        // Set hidden reply inputs
        const targetVendorInput = document.getElementById("modalTargetVendorId");
        if (targetVendorInput) targetVendorInput.value = comm.vendor_id || "";

        const targetPoInput = document.getElementById("modalTargetPoId");
        if (targetPoInput) targetPoInput.value = comm.purchase_order_id || "";

        const targetCtInput = document.getElementById("modalTargetContractId");
        if (targetCtInput) targetCtInput.value = comm.contract_id || "";

        // Reset reply textarea
        const replyText = document.getElementById("modalReplyText");
        if (replyText) replyText.value = "";

        const feedback = document.getElementById("modalReplyFeedback");
        if (feedback) feedback.style.display = "none";

        modal.style.display = "flex";

    } catch (e) {
        console.error("Open thread modal error:", e);
    }
};

async function handleComposerSubmit(e, token, isVendor) {
    e.preventDefault();
    const btn = document.getElementById("btnSubmitMessage");
    const feedback = document.getElementById("composerFeedback");

    const subjInput = document.getElementById("commSubjectInput");
    const msgInput = document.getElementById("commMessageInput");
    const poInput = document.getElementById("commPoInput");
    const vendorSelect = document.getElementById("targetVendorSelect");

    if (!msgInput || !msgInput.value.trim()) return;

    try {
        if (btn) btn.disabled = true;
        const formData = new FormData();
        formData.append("message", msgInput.value.trim());
        if (subjInput && subjInput.value.trim()) {
            formData.append("subject", subjInput.value.trim());
        }
        if (poInput && poInput.value.trim()) {
            formData.append("purchase_order_id", poInput.value.trim());
        }

        if (!isVendor && vendorSelect && vendorSelect.value) {
            formData.append("vendor_id", vendorSelect.value);
        }

        const res = await fetch(`${API_BASE_URL}/communications`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Error dispatching message (${res.status})`);
        }

        // Reset inputs
        msgInput.value = "";
        if (subjInput) subjInput.value = "";
        if (poInput) poInput.value = "";

        if (feedback) {
            feedback.style.display = "inline";
            feedback.style.color = "var(--success-color)";
            feedback.innerText = "✓ Message successfully dispatched.";
            setTimeout(() => { feedback.style.display = "none"; }, 4000);
        }

        // Reload data
        await Promise.all([
            loadCommunicationStats(token),
            loadCommunications(token)
        ]);

    } catch (err) {
        console.error("Composer submit error:", err);
        if (feedback) {
            feedback.style.display = "inline";
            feedback.style.color = "var(--danger-color)";
            feedback.innerText = `Error: ${err.message}`;
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function handleReplySubmit(e, token, isVendor) {
    e.preventDefault();
    const btn = document.getElementById("btnModalReply");
    const feedback = document.getElementById("modalReplyFeedback");
    const replyText = document.getElementById("modalReplyText");
    const poVal = document.getElementById("modalTargetPoId")?.value;
    const ctVal = document.getElementById("modalTargetContractId")?.value;
    const vendorVal = document.getElementById("modalTargetVendorId")?.value;

    if (!replyText || !replyText.value.trim()) return;

    try {
        if (btn) btn.disabled = true;
        const formData = new FormData();
        formData.append("message", replyText.value.trim());
        formData.append("subject", "Re: Direct Thread Inquiry");
        if (poVal) formData.append("purchase_order_id", poVal);
        if (ctVal) formData.append("contract_id", ctVal);
        if (!isVendor && vendorVal) formData.append("vendor_id", vendorVal);

        const res = await fetch(`${API_BASE_URL}/communications`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Failed to post reply");
        }

        replyText.value = "";
        if (feedback) {
            feedback.style.display = "inline";
            feedback.style.color = "var(--success-color)";
            feedback.innerText = "✓ Reply sent.";
            setTimeout(() => {
                const modal = document.getElementById("threadModal");
                if (modal) modal.style.display = "none";
            }, 1200);
        }

        // Reload list and stats
        await Promise.all([
            loadCommunicationStats(token),
            loadCommunications(token)
        ]);

    } catch (err) {
        console.error("Reply submit error:", err);
        if (feedback) {
            feedback.style.display = "inline";
            feedback.style.color = "var(--danger-color)";
            feedback.innerText = `Error: ${err.message}`;
        }
    } finally {
        if (btn) btn.disabled = false;
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