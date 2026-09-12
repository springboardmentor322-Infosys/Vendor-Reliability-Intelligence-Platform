const API_BASE_URL = "http://127.0.0.1:8000";

let currentPage = 1;
const limit = 20;

document.addEventListener("DOMContentLoaded", initNotifications);

async function initNotifications() {
    try {
        const token = getToken();
        if (!token) {
            window.location.replace("login.html");
            return;
        }

        const role = getUserRole();
        setupRoleUI(role);

        // Setup filter and action event handlers
        setupEventListeners();

        // Load stats and notifications table concurrently
        await Promise.all([
            loadNotificationStats(token),
            loadNotifications(token)
        ]);

        const tbody = document.querySelector("#notificationsTable tbody");
        if (tbody) {
            tbody.addEventListener("click", handleTableClick);
        }
    } catch (err) {
        console.error("Failed to initialize notifications:", err);
    }
}

function setupRoleUI(role) {
    const titleEl = document.getElementById("notifPageTitle");
    const subEl = document.getElementById("notifPageSubtitle");

    if (role === "Vendor") {
        if (titleEl) titleEl.innerText = "Supplier Alerts & Notifications 🔔";
        if (subEl) subEl.innerText = "Direct operational alerts regarding delayed orders, overdue invoices, quality concerns, and contract timelines.";
    } else {
        if (titleEl) titleEl.innerText = "System Notifications & Alerts 🔔";
        if (subEl) subEl.innerText = "Manage system warnings, registration approvals, late deliveries, and compliance audit notices.";
    }
}

function setupEventListeners() {
    const statusFilter = document.getElementById("statusFilter");
    const typeFilter = document.getElementById("typeFilter");
    const btnMarkAll = document.getElementById("btnMarkAllRead");

    if (statusFilter) {
        statusFilter.addEventListener("change", filterNotifications);
    }
    if (typeFilter) {
        typeFilter.addEventListener("change", filterNotifications);
    }
    if (btnMarkAll) {
        btnMarkAll.addEventListener("click", markAllAsRead);
    }
}

function filterNotifications() {
    currentPage = 1;
    const token = getToken();
    loadNotifications(token);
}

async function loadNotificationStats(token) {
    try {
        const res = await fetch(`${API_BASE_URL}/notifications/stats`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return;

        const stats = await res.json();

        const safeSet = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        safeSet("unreadCount", stats.unread_count ?? 0);
        safeSet("totalNotifCount", stats.total_count ?? 0);
        safeSet("urgentAlertsCount", stats.urgent_count ?? 0);
        safeSet("readNotifCount", stats.read_count ?? 0);

        const unreadSub = document.getElementById("unreadCountSub");
        if (unreadSub) {
            unreadSub.innerText = (stats.unread_count === 1) 
                ? "1 active alert requiring attention" 
                : `${stats.unread_count ?? 0} active alerts requiring attention`;
        }

        const totalSub = document.getElementById("totalNotifSub");
        if (totalSub) {
            totalSub.innerText = (stats.total_count === 1)
                ? "1 lifetime notification"
                : `${stats.total_count ?? 0} lifetime notifications`;
        }
    } catch (e) {
        console.warn("Could not load notification stats:", e);
    }
}

async function loadNotifications(token) {
    if (!token) token = getToken();

    const tbody = document.querySelector("#notificationsTable tbody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-spinner-wrapper" style="text-align: center; padding: 24px;">
            <div class="spinner"></div>
            <p>Loading notifications ledger...</p>
        </td></tr>`;
    }

    try {
        const statusVal = document.getElementById("statusFilter")?.value || "all";
        const typeVal = document.getElementById("typeFilter")?.value || "all";

        let url = `${API_BASE_URL}/notifications?page=${currentPage}&limit=${limit}`;
        if (statusVal !== "all") {
            url += `&status=${encodeURIComponent(statusVal)}`;
        }
        if (typeVal !== "all") {
            url += `&type=${encodeURIComponent(typeVal)}`;
        }

        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Notifications API Error: ${response.status}`);
        }

        const data = await response.json();
        const notificationsList = Array.isArray(data) ? data : (data.notifications || []);
        const totalUnread = data.total_unread ?? 0;
        const totalCount = data.total_count ?? notificationsList.length;

        // Keep unreadCount synchronized
        const unreadEl = document.getElementById("unreadCount");
        if (unreadEl) unreadEl.innerText = totalUnread;

        renderNotifications(notificationsList);
        updatePaginationControls(totalCount);

    } catch (error) {
        console.error("Error fetching notifications:", error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="color: var(--danger-color); text-align: center; padding: 24px;">
                ❌ Error loading notifications. Please try again.</td></tr>`;
        }
    }
}

function renderNotifications(notificationsList) {
    const tbody = document.querySelector("#notificationsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!notificationsList || notificationsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 38px; margin-bottom: 12px;">🔔</div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-color); margin-bottom: 6px;">No Notifications Found</h3>
            <p style="font-size: 13px; color: var(--text-secondary); max-width: 480px; margin: 0 auto;">
                Your account currently has no active notifications. All operations, purchase orders, and settlements are in good standing.
            </p>
        </td></tr>`;
        return;
    }

    notificationsList.forEach(item => {
        const isUnread = (item.status || "").toLowerCase() === "unread";
        const statusClass = isUnread ? "badge-pending" : "badge-active";

        const typeInfo = getTypeBadgeInfo(item.notification_type);

        let actionCell = "-";
        if (isUnread) {
            actionCell = `<button class="btn btn-primary" data-action="read" data-id="${item.id}" style="padding: 5px 12px; font-size: 11px;">Mark Read</button>`;
        } else {
            actionCell = `<span style="color: var(--text-muted); font-size: 11.5px; font-style: italic;">✓ Acknowledged</span>`;
        }

        const dateDisplay = item.created_date ? formatDateTime(item.created_date) : "N/A";

        const tr = document.createElement("tr");
        tr.dataset.id = item.id;
        tr.innerHTML = `
            <td style="font-weight: 600; font-size: 12px; color: var(--text-secondary);">#ALR-${item.id}</td>
            <td><span class="badge ${typeInfo.badgeClass}">${typeInfo.icon} ${escapeHTML(item.notification_type || 'Alert')}</span></td>
            <td style="text-align: left; max-width: 420px; word-break: break-word; font-size: 12.5px; line-height: 1.45; color: var(--text-color);">
                ${escapeHTML(item.message || '')}
            </td>
            <td style="font-size: 11.5px; color: var(--text-muted);">${dateDisplay}</td>
            <td><span class="badge ${statusClass}">${escapeHTML(item.status || 'Active')}</span></td>
            <td style="text-align: center;">${actionCell}</td>
        `;
        tbody.appendChild(tr);
    });
}

function getTypeBadgeInfo(type) {
    const t = (type || "").toLowerCase();
    if (t.includes("delivery") || t.includes("delay")) {
        return { icon: "🚚", badgeClass: "badge-poor" };
    } else if (t.includes("payment") || t.includes("invoice")) {
        return { icon: "💳", badgeClass: "badge-warning" };
    } else if (t.includes("quality")) {
        return { icon: "⚠️", badgeClass: "badge-poor" };
    } else if (t.includes("contract")) {
        return { icon: "📄", badgeClass: "badge-pending" };
    } else if (t.includes("risk")) {
        return { icon: "⚡", badgeClass: "badge-poor" };
    } else if (t.includes("approval") || t.includes("user")) {
        return { icon: "👤", badgeClass: "badge-active" };
    } else if (t.includes("comm")) {
        return { icon: "💬", badgeClass: "badge-active" };
    }
    return { icon: "🔔", badgeClass: "badge-pending" };
}

function handleTableClick(event) {
    const btn = event.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);

    if (action === "read" && id) {
        markAsRead(id);
    }
}

async function markAsRead(notificationId) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/notifications/read/${notificationId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Read API Error: ${response.status}`);
        }

        displayFeedback("Notification acknowledged and marked as read.", "success");

        await Promise.all([
            loadNotificationStats(token),
            loadNotifications(token)
        ]);
    } catch (error) {
        console.error("Error marking notification as read:", error);
        displayFeedback(error.message || "Error updating notification status.", "error");
    }
}

async function markAllAsRead() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const count = data.updated ?? 0;
        displayFeedback(`All ${count} notifications marked as read.`, "success");

        await Promise.all([
            loadNotificationStats(token),
            loadNotifications(token)
        ]);
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        displayFeedback(error.message || "Error updating notifications.", "error");
    }
}

function setupPaginationDOM() {
    const tableCard = document.querySelector(".table-card");
    if (!tableCard) return;

    if (document.getElementById("paginationContainer")) return;

    const pagDiv = document.createElement("div");
    pagDiv.id = "paginationContainer";
    pagDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 12px 16px; border-top: 1px solid var(--border-color); background-color: var(--card-bg, #ffffff); border-radius: 0 0 10px 10px;";

    pagDiv.innerHTML = `
        <div id="paginationInfo" style="font-size: 13px; color: var(--text-secondary);">Showing 0-0 of 0 alerts</div>
        <div style="display: flex; gap: 8px;">
            <button id="prevPageBtn" class="btn btn-secondary" style="padding: 6px 14px; font-size: 11.5px;">Previous</button>
            <button id="nextPageBtn" class="btn btn-secondary" style="padding: 6px 14px; font-size: 11.5px;">Next</button>
        </div>
    `;

    tableCard.appendChild(pagDiv);

    document.getElementById("prevPageBtn").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadNotifications();
        }
    });

    document.getElementById("nextPageBtn").addEventListener("click", () => {
        currentPage++;
        loadNotifications();
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

    info.textContent = `Showing ${startIdx}-${endIdx} of ${totalCount} alerts`;

    prevBtn.disabled = (currentPage === 1);
    prevBtn.style.opacity = prevBtn.disabled ? "0.45" : "1";
    prevBtn.style.cursor = prevBtn.disabled ? "not-allowed" : "pointer";

    const hasNext = (currentPage * limit < totalCount);
    nextBtn.disabled = !hasNext;
    nextBtn.style.opacity = nextBtn.disabled ? "0.45" : "1";
    nextBtn.style.cursor = nextBtn.disabled ? "not-allowed" : "pointer";
}

function displayFeedback(msg, type = "success") {
    if (typeof showToast === "function") {
        showToast(msg, type);
        return;
    }
    let toast = document.getElementById("notifFeedbackToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "notifFeedbackToast";
        toast.style.cssText = "position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; color: #fff; z-index: 10000; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); transition: opacity 0.3s ease;";
        document.body.appendChild(toast);
    }
    toast.style.backgroundColor = (type === "success") ? "#059669" : "#dc2626";
    toast.innerText = msg;
    toast.style.opacity = "1";
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => { toast.style.display = "none"; }, 300);
    }, 3500);
}

function formatDateTime(dtStr) {
    if (!dtStr) return "N/A";
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) {
        return dtStr.split(".")[0];
    }
    return d.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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

