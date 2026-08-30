/**
 * Shared logic for every page behind login (dashboard.html, vendors.html).
 */
Auth.requireLogin();

const ROLE_LABELS = {
  administrator: "Administrator",
  procurement_manager: "Procurement Manager",
  supply_chain_manager: "Supply Chain Manager",
  vendor: "Vendor",
  finance_officer: "Finance Officer",
  auditor: "Auditor",
};

const CATEGORY_LABELS = {
  raw_material_suppliers: "Raw Material Supplier",
  equipment_vendors: "Equipment Vendor",
  it_vendors: "IT Vendor",
  service_providers: "Service Provider",
  logistics_partners: "Logistics Partner",
  maintenance_vendors: "Maintenance Vendor",
};

const STATUS_LABELS = {
  pending_approval: "Pending approval",
  approved: "Approved",
  suspended: "Suspended",
  rejected: "Rejected",
  // Purchase order statuses
  pending: "Pending",
  ordered: "Ordered",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  // Contract statuses
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  terminated: "Terminated",
};

const PO_STATUS_FLOW = ["pending", "approved", "ordered", "delivered", "completed", "cancelled"];

// Roles allowed to create/approve vendors - mirrors the backend's RBAC rules
const VENDOR_MANAGE_ROLES = ["administrator", "procurement_manager", "supply_chain_manager"];
const VENDOR_APPROVE_ROLES = ["administrator", "procurement_manager"];

function paintUserChrome(user) {
  const nameEl = document.getElementById("user-name");
  const roleEl = document.getElementById("user-role");
  if (nameEl) nameEl.textContent = user.full_name;
  if (roleEl) roleEl.textContent = ROLE_LABELS[user.role] || user.role;
}

function badgeHtml(status) {
  const label = STATUS_LABELS[status] || status;
  return `<span class="badge badge-${status}"><span class="badge-dot"></span>${label}</span>`;
}

function gaugeColor(score) {
  if (score >= 75) return "var(--teal)";
  if (score >= 50) return "var(--amber)";
  return "var(--red)";
}

/** Renders the signature reliability gauge as a small conic-gradient ring. */
function gaugeHtml(score) {
  const rounded = Math.round(score ?? 0);
  const color = gaugeColor(rounded);
  return `
    <div class="gauge" style="--score:${rounded}; --gauge-color:${color}">
      <span>${rounded}</span>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const user = Auth.getUser();
  if (user) paintUserChrome(user);

  // Refresh from server in case the cached profile is stale
  Api.get("/auth/me")
    .then((freshUser) => {
      Auth.setUser(freshUser);
      paintUserChrome(freshUser);
    })
    .catch(() => {});

  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }
});
