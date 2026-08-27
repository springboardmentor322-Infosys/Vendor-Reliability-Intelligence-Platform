// ---------- Core API helper ----------
const API_BASE = "/api";
// NOTE: hardcoded for local dev because the frontend is being opened separately
// from the FastAPI server. Change back to "/api" once you deploy both together
// (e.g. behind the same Nginx/Docker setup), or it will break in production.

function getToken() {
  return localStorage.getItem("vq_token");
}

function getUser() {
  const raw = localStorage.getItem("vq_user");
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem("vq_token", token);
  localStorage.setItem("vq_user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("vq_token");
  localStorage.removeItem("vq_user");
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

// Redirect to login if not authenticated. Call at top of every protected page.
function requireAuth() {
  if (!getToken()) {
    window.location.href = "index.html";
  }
}

// Every role has its own "home" dashboard now: Vendors see their own vendor
// profile, Administrators see the system-wide admin view, everyone else
// shares the procurement dashboard.
function getDashboardHref(role) {
  if (role === "Vendor") return "vendor-dashboard.html";
  if (role === "Administrator") return "admin-dashboard.html";
  return "dashboard.html";
}

// Where to send someone right after login/register. Mostly the same as
// getDashboardHref, except Supply Chain Manager/Finance/Auditor land on the
// page most relevant to their day-to-day instead of the shared dashboard.
function landingPageForRole(role) {
  if (role === "Vendor") return "vendor-dashboard.html";
  if (role === "Administrator") return "admin-dashboard.html";
  if (role === "Supply Chain Manager") return "performance.html";
  if (role === "Finance Officer" || role === "Auditor") return "reports.html";
  return "dashboard.html"; // Procurement Manager
}

async function api(path, { method = "GET", body = null, isForm = false, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = "index.html";
    throw new Error("Unauthorized");
  }

  if (raw) return res;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = (data && (data.detail || JSON.stringify(data))) || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

// ---------- Shared UI chrome (sidebar + topbar) ----------
const DASHBOARD_VARIANTS = ["dashboard.html", "vendor-dashboard.html", "admin-dashboard.html"];

function getNavItems(role) {
  return [
    { href: getDashboardHref(role), label: "Dashboard", isActive: (activeHref) => DASHBOARD_VARIANTS.includes(activeHref) },
    { href: "vendors.html", label: "Vendor Management" },
    { href: "procurement.html", label: "Procurement & POs" },
    { href: "performance.html", label: "Performance & Reliability" },
    { href: "contracts.html", label: "Contracts & Compliance" },
    { href: "messages.html", label: "Communication" },
    { href: "reports.html", label: "Reports & Notifications" },
  ];
}

function renderShell(activeHref, pageTitle) {
  const user = getUser();
  const shell = document.getElementById("app-shell");
  const navItems = getNavItems(user ? user.role : null);
  const navLinks = navItems.map((item) => {
    const active = item.isActive ? item.isActive(activeHref) : item.href === activeHref;
    return `<a href="${item.href}" class="${active ? "active" : ""}">${item.label}</a>`;
  }).join("");

  shell.innerHTML = `
    <div class="sidebar">
      <div class="brand">VendorIQ<span>Vendor Reliability Intelligence</span></div>
      <nav>${navLinks}</nav>
    </div>
    <div class="main">
      <div class="topbar">
        <h2>${pageTitle}</h2>
        <div class="user-box">
          <div class="notif-wrapper" id="notif-wrapper">
            <span id="notif-indicator" onclick="toggleNotifPanel(event)" style="cursor:pointer;">🔔</span>
            <div class="notif-panel hidden" id="notif-panel"></div>
          </div>
          <a href="profile.html" style="font-weight:600;">${user ? user.full_name : ""}</a>
          <span class="role-badge">${user ? user.role : ""}</span>
          <button class="btn secondary small" onclick="logout()">Logout</button>
        </div>
      </div>
      <div class="content" id="page-content"></div>
    </div>
  `;
  refreshNotifIndicator();

  // Close the notification dropdown when clicking anywhere outside it.
  document.addEventListener("click", (e) => {
    const wrapper = document.getElementById("notif-wrapper");
    const panel = document.getElementById("notif-panel");
    if (wrapper && panel && !wrapper.contains(e.target)) {
      panel.classList.add("hidden");
    }
  });
}

async function refreshNotifIndicator() {
  try {
    const res = await api("/notifications/unread-count");
    const el = document.getElementById("notif-indicator");
    if (el) {
      el.innerHTML = res.unread > 0 ? `🔔<span class="notif-dot"></span>` : `🔔`;
    }
  } catch (e) { /* ignore on pages without auth yet */ }
}

async function toggleNotifPanel(event) {
  event.stopPropagation();
  const panel = document.getElementById("notif-panel");
  const isHidden = panel.classList.contains("hidden");

  if (!isHidden) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  panel.innerHTML = `<div class="notif-panel-empty">Loading...</div>`;

  try {
    const notifications = await api("/notifications");
    renderNotifPanel(notifications.slice(0, 8));
  } catch (err) {
    panel.innerHTML = `<div class="notif-panel-empty">Couldn't load notifications.</div>`;
  }
}

function renderNotifPanel(notifications) {
  const panel = document.getElementById("notif-panel");
  if (!notifications.length) {
    panel.innerHTML = `<div class="notif-panel-empty">No notifications yet.</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="notif-panel-header">Notifications</div>
    ${notifications.map(n => `
      <div class="notif-panel-item ${n.is_read ? "read" : ""}" onclick="handleNotifClick(event, ${n.id})">
        <div class="notif-panel-title">${n.title}</div>
        <div class="notif-panel-msg">${n.message}</div>
        <div class="notif-panel-time">${fmtDate(n.created_at)} ${!n.is_read ? "· <b>mark read</b>" : ""}</div>
      </div>
    `).join("")}
    <a href="reports.html" class="notif-panel-footer">View all in Reports →</a>
  `;
}

async function handleNotifClick(event, notifId) {
  event.stopPropagation();
  try {
    await api(`/notifications/${notifId}/read`, { method: "POST" });
    const notifications = await api("/notifications");
    renderNotifPanel(notifications.slice(0, 8));
    refreshNotifIndicator();
  } catch (err) { /* silent - non-critical UI action */ }
}

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function statusBadge(status) {
  const map = {
    "Approved": "green", "Completed": "green", "Delivered": "green", "Compliant": "green",
    "Pending": "orange", "Pending Approval": "orange", "Ordered": "blue", "At Risk": "orange",
    "Rejected": "red", "Suspended": "red", "Cancelled": "red", "Non-Compliant": "red",
    "Low": "green", "Medium": "orange", "High": "red",
  };
  const cls = map[status] || "gray";
  return `<span class="badge ${cls}">${status}</span>`;
}
