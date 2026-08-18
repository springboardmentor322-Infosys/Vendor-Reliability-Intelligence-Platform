const API_BASE_URL = "http://127.0.0.1:8000";
let allNotifications = [];

async function initNotifications() {
    await loadNotifications();

    const tbody = document.querySelector("#notificationsTable tbody");
    if (tbody) {
        tbody.addEventListener("click", handleTableClick);
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
        <div id="paginationInfo" style="font-size: 13px; color: var(--text-secondary);">Showing 0-0 of 0 alerts</div>
        <div style="display: flex; gap: 8px;">
            <button id="prevPageBtn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px;">Previous</button>
            <button id="nextPageBtn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px;">Next</button>
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
    prevBtn.style.opacity = prevBtn.disabled ? "0.5" : "1";
    prevBtn.style.cursor = prevBtn.disabled ? "not-allowed" : "pointer";
    
    const hasNext = (currentPage * limit < totalCount);
    nextBtn.disabled = !hasNext;
    nextBtn.style.opacity = nextBtn.disabled ? "0.5" : "1";
    nextBtn.style.cursor = nextBtn.disabled ? "not-allowed" : "pointer";
}

async function loadNotifications() {
    try {
        const statusVal = document.getElementById("statusFilter").value;
        const typeVal = document.getElementById("typeFilter").value;
        
        let url = `${API_BASE_URL}/notifications?page=${currentPage}&limit=${limit}`;
        if (statusVal !== "all") {
            url += `&status=${encodeURIComponent(statusVal)}`;
        }
        if (typeVal !== "all") {
            url += `&type=${encodeURIComponent(typeVal)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Notifications API Error: ${response.status}`);
        }
        const data = await response.json();
        
        const notificationsList = data.notifications;
        const totalUnread = data.total_unread;
        const totalCount = data.total_count;
        
        // Update active alerts count in UI
        document.getElementById("unreadCount").textContent = totalUnread;
        
        // Render rows
        renderNotifications(notificationsList);
        
        // Render pagination controls
        updatePaginationControls(totalCount);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        const tbody = document.querySelector("#notificationsTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error loading system notifications. Please check connection.</td></tr>`;
        }
    }
}

function filterNotifications() {
    currentPage = 1;
    loadNotifications();
}

function renderNotifications(notificationsList) {
    const tbody = document.querySelector("#notificationsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (notificationsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state-wrapper">
            <div class="empty-state-icon">🔔</div>
            <div class="empty-state-title">No notifications found</div>
            <p>Modify status or filter selections.</p>
        </td></tr>`;
        return;
    }

    notificationsList.forEach(item => {
        const isUnread = item.status.toLowerCase() === "unread";
        const statusClass = isUnread ? "badge-pending" : "badge-active";
        
        let actionCell = "-";
        if (isUnread) {
            actionCell = `<button class="btn btn-primary" data-action="read" data-id="${item.id}" style="padding: 6px 12px; font-size: 11px;">Mark Read</button>`;
        } else {
            actionCell = `<span style="color: var(--text-secondary); font-style: italic;">Read</span>`;
        }

        tbody.innerHTML += `
        <tr data-id="${item.id}">
            <td>${item.id}</td>
            <td><strong>${escapeHTML(item.notification_type)}</strong></td>
            <td style="text-align: left; max-width: 400px; word-wrap: break-word; color: var(--text-secondary);">${escapeHTML(item.message)}</td>
            <td>${item.created_date || "N/A"}</td>
            <td><span class="badge ${statusClass}">${escapeHTML(item.status)}</span></td>
            <td>${actionCell}</td>
        </tr>
        `;
    });
}

function handleTableClick(event) {
    const btn = event.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);

    if (action === "read") {
        markAsRead(id);
    }
}

async function markAsRead(notificationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/read/${notificationId}`, {
            method: "POST"
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || `Read API Error: ${response.status}`);
        }
        
        showToast("Notification marked as read.", "success");
        await loadNotifications();
    } catch (error) {
        console.error("Error marking notification as read:", error);
        showToast("Error updating notification status.", "error");
    }
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

document.addEventListener("DOMContentLoaded", initNotifications);
