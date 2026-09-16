(() => {
  "use strict";

  const api = window.VendorIQApi;
  const auth = window.VendorIQAuth;

  if (!api || !auth || !auth.isAuthenticated()) return;

  function removeMessageControls() {
    document.querySelectorAll(
      'a[href*="messages.html"], [data-message], #messageButton, #messageIcon, #messagesButton, #messageDropdownContainer, .message-dropdown, .message-icon, .messages-nav-item'
    ).forEach((element) => element.remove());
  }

  function removeAnyExistingToasts() {
    document.querySelectorAll(
      '#vendorIQNotificationToastContainer, #vendorIQNotificationToastCard, .toast-container, .toast'
    ).forEach((el) => {
      // Remove any toast popups from DOM
      if (el.id === "vendorIQNotificationToastContainer" || el.id === "vendorIQNotificationToastCard") {
        el.remove();
      } else if (el.classList.contains("toast") && el.classList.contains("show")) {
        el.classList.remove("show");
        el.style.display = "none";
      }
    });
  }

  function init() {
    removeMessageControls();
    removeAnyExistingToasts();

    const topbar = document.querySelector(".intelligence-topbar") ||
                   document.querySelector(".app-topbar") ||
                   document.querySelector(".navbar .d-flex.align-items-center.ms-auto") ||
                   document.querySelector(".detail-shell header") ||
                   document.querySelector(".detail-topbar");
    if (!topbar) return;

    // ─── MOUNT NOTIFICATIONS BELL WIDGET 🔔 ────────────────────────────────
    if (!document.getElementById("notificationDropdownContainer")) {
      const bellContainer = document.createElement("div");
      bellContainer.className = "dropdown me-2";
      bellContainer.id = "notificationDropdownContainer";
      bellContainer.style.position = "relative";
      bellContainer.innerHTML = `
        <button class="btn btn-outline-secondary btn-sm position-relative" id="notificationBellBtn" title="System Notifications & Alerts" type="button" style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 6px;">
          <i class="bi bi-bell" style="font-size: 1.1rem;"></i>
          <span id="unreadNotificationsCount" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.65rem;">0</span>
        </button>
        <div class="dropdown-menu dropdown-menu-end p-0 shadow-lg" style="width: 350px; position: absolute; right: 0; top: 40px; z-index: 100000; display: none; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;" aria-labelledby="notificationBellBtn" id="notificationDropdownMenu">
          <div class="dropdown-header border-bottom d-flex justify-content-between align-items-center py-2 px-3 bg-light">
            <strong class="text-dark"><i class="bi bi-bell-fill me-1 text-warning"></i> Notifications</strong>
            <button class="btn btn-link btn-sm text-decoration-none p-0 d-none" id="markAllNotificationsReadBtn" style="font-size: 0.78rem;">Mark all as read</button>
          </div>
          <div id="notificationsList" class="overflow-y-auto" style="max-height: 320px; min-height: 80px;">
            <div class="py-4 text-center text-muted small">Loading notifications…</div>
          </div>
        </div>
      `;

      const logoutBtn = topbar.querySelector("#logoutButton") || topbar.querySelector("#logout");
      if (logoutBtn && logoutBtn.parentNode === topbar) {
        topbar.insertBefore(bellContainer, logoutBtn);
      } else if (logoutBtn && logoutBtn.parentNode) {
        logoutBtn.parentNode.insertBefore(bellContainer, logoutBtn);
      } else {
        topbar.appendChild(bellContainer);
      }

      // Explicit toggle handler to guarantee bell functions on every page
      const bellBtn = document.getElementById("notificationBellBtn");
      const dropdownMenu = document.getElementById("notificationDropdownMenu");
      if (bellBtn && dropdownMenu) {
        bellBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isVisible = dropdownMenu.style.display === "block";
          dropdownMenu.style.display = isVisible ? "none" : "block";
        });
        dropdownMenu.addEventListener("click", (e) => {
          e.stopPropagation();
        });
        document.addEventListener("click", (e) => {
          if (!bellContainer.contains(e.target)) {
            dropdownMenu.style.display = "none";
          }
        });
      }

      fetchNotifications();
      document.getElementById("markAllNotificationsReadBtn")?.addEventListener("click", markAllRead);
      document.getElementById("notificationsList")?.addEventListener("click", handleNotificationClick);
    }
  }

  // ─── FETCH NOTIFICATIONS 🔔 ───────────────────────────────────────────────────
  async function fetchNotifications() {
    try {
      const data = await api.request("/notifications", { token: auth.getAccessToken() });
      const items = (data.items || []).filter((n) => n.type !== "message" && n.related_entity !== "Message");
      const unreadCount = items.filter((n) => !n.is_read).length;

      const badge = document.getElementById("unreadNotificationsCount");
      const markBtn = document.getElementById("markAllNotificationsReadBtn");
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount;
          badge.classList.remove("d-none");
          if (markBtn) markBtn.classList.remove("d-none");
        } else {
          badge.classList.add("d-none");
          if (markBtn) markBtn.classList.add("d-none");
        }
      }

      const list = document.getElementById("notificationsList");
      if (!list) return;

      if (items.length === 0) {
        list.innerHTML = `<div class="py-4 text-center text-muted small">No notifications.</div>`;
        return;
      }

      list.innerHTML = items.map((n) => {
        const severityClass = {
          critical: "text-danger border-start border-danger border-3",
          warning: "text-warning border-start border-warning border-3",
          info: "text-info border-start border-info border-3",
          high: "text-primary border-start border-primary border-3"
        }[String(n.severity).toLowerCase()] || "";

        const time = new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateStr = new Date(n.created_at).toLocaleDateString([], { day: "2-digit", month: "short" });
        const unreadIndicator = n.is_read ? "" : "bg-light fw-bold";

        let navUrl = "#";
        if (n.related_entity && n.related_entity_id) {
          const pageMap = {
            Vendor: "vendor-details.html",
            Contract: "contract-details.html",
            PurchaseOrder: "purchase-order-details.html",
            ProcurementRequest: "procurement-request-details.html"
          };
          const page = pageMap[n.related_entity];
          if (page) navUrl = `${page}?id=${n.related_entity_id}`;
        }

        return `
          <div class="dropdown-item p-3 border-bottom d-flex align-items-start gap-2 ${unreadIndicator} ${severityClass}" style="white-space: normal; cursor: pointer;" data-id="${n.id}" data-url="${navUrl}">
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold" style="font-size: 0.83rem;">${escapeHtml(n.title)}</span>
                <small class="text-muted" style="font-size: 0.68rem;">${dateStr} ${time}</small>
              </div>
              <p class="mb-0 text-muted" style="font-size: 0.78rem; line-height: 1.25;">${escapeHtml(n.message)}</p>
            </div>
            ${!n.is_read ? `<button class="btn btn-sm btn-link text-decoration-none p-0 align-self-center ms-2 text-success fw-bold" data-action="read" style="font-size: 0.85rem;" title="Mark read">✓</button>` : ""}
          </div>
        `;
      }).join("");

    } catch (e) {
      console.warn("Failed to fetch notifications", e);
      const list = document.getElementById("notificationsList");
      if (list) list.innerHTML = `<div class="py-4 text-center text-danger small">Error loading notifications.</div>`;
    }
  }

  // Automatic toast popups disabled completely per user request.
  function showNotificationToast(notif) {
    return;
  }

  async function markAllRead(e) {
    e.stopPropagation();
    try {
      await api.request("/notifications/read-all", { method: "PATCH", token: auth.getAccessToken() });
      await fetchNotifications();
    } catch (err) {
      console.warn("Mark read all error", err);
    }
  }

  async function handleNotificationClick(e) {
    const item = e.target.closest(".dropdown-item");
    if (!item) return;

    const id = item.dataset.id;
    const url = item.dataset.url;
    const isReadBtn = e.target.closest('[data-action="read"]');

    if (isReadBtn) {
      e.stopPropagation();
      try {
        await api.request(`/notifications/${id}/read`, { method: "PATCH", token: auth.getAccessToken() });
        await fetchNotifications();
      } catch (err) {
        console.warn("Mark read error", err);
      }
      return;
    }

    try {
      await api.request(`/notifications/${id}/read`, { method: "PATCH", token: auth.getAccessToken() });
    } catch (err) {
      console.warn("Mark read before navigate error", err);
    }

    if (url && url !== "#") {
      window.location.href = url;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  // Expose global refresh function for real-time badge updates
  window.VendorIQRefreshNotifications = () => {
    fetchNotifications();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
