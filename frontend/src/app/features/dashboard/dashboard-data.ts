// @ts-nocheck
// MOCK DATA REMOVED: In strictly keeping with project requirements,
// all mock datasets (vendors, purchaseOrders, contracts, invoices, users, auditLogs) have been deleted.
// The frontend will invoke PostgreSQL API routes to get all business metrics.


/* ============================================================ ROLE CONFIG ============================================================ */
export const roles = {
  admin: {
    label: "Administrator", initials: "AT", name: "Ava Thompson",
    groups: [
      {
        label: "Main", items: [
          { id: "dashboard", label: "Dashboard" },
          { id: "users", label: "User Management" },
          { id: "vendors", label: "Vendor Management" },
          { id: "procurement", label: "Procurement Overview" },
          { id: "contracts", label: "Contracts & Compliance" },
          { id: "invoices", label: "Invoices & Payments" },
          { id: "communication", label: "Communication" },
          { id: "performance", label: "Performance Analytics" },
          { id: "reports", label: "Reports & Exports" },
          { id: "notifications", label: "Notifications" }
        ]
      },
      {
        label: "Administration", items: [
          { id: "roles-perms", label: "Roles & Permissions" },
          { id: "settings", label: "System Settings" },
          { id: "audit", label: "Audit Logs" }
        ]
      }
    ]
  },
  pm: {
    label: "Procurement Manager", initials: "MW", name: "Marcus Webb",
    groups: [
      {
        label: "MAIN MENU", items: [
          { id: "dashboard", label: "Dashboard" },
          { id: "prs", label: "Procurement Requests" },
          { id: "pos", label: "Purchase Orders" },
          { id: "vendors", label: "Vendors" },
          { id: "vendor-performance", label: "Vendor Performance" },
          { id: "contracts", label: "Contracts & Compliance" },
          { id: "invoices", label: "Invoices & Payments" },
          { id: "order-tracking", label: "Order Tracking" },
          { id: "reports-analytics", label: "Reports & Analytics" },
          { id: "budget-spend", label: "Budget & Spend Analysis" },
          { id: "communications", label: "Communications" },
          { id: "notifications", label: "Notifications" }
        ]
      },
      {
        label: "SETTINGS", items: [
          { id: "user-management", label: "User Management" },
          { id: "system-settings", label: "System Settings" }
        ]
      }
    ]
  },
  scm: {
    label: "Supply Chain Manager", initials: "PN", name: "Priya Nair",
    groups: [
      {
        label: "MAIN MENU", items: [
          { id: "dashboard", label: "Dashboard" },
          { id: "scm_order_tracking", label: "Order Tracking" },
          { id: "scm_pos", label: "Purchase Orders" },
          { id: "scm_vendors", label: "Vendors" },
          { id: "scm_vendor_performance", label: "Vendor Performance" },
          { id: "scm_reliability_risk", label: "Reliability & Risk" },
          { id: "scm_contracts", label: "Contracts & Compliance" },
          { id: "scm_communications", label: "Communications" },
          { id: "scm_notifications", label: "Notifications" }
        ]
      },
      {
        label: "REPORTS", items: [
          { id: "scm_reports_perf", label: "Performance / Reliability Reports" },
          { id: "scm_reports_delivery", label: "Delivery / Order Reports" },
          { id: "scm_reports_analytics", label: "Supply Chain Analytics" },
          { id: "scm_reports_export", label: "Export Reports" }
        ]
      },
      {
        label: "ACCOUNT", items: [
          { id: "scm_settings", label: "Settings" },
          { id: "scm_support", label: "Help & Support" }
        ]
      }
    ]
  },
  finance: {
    label: "Finance Officer", initials: "FO", name: "Finance Officer",
    groups: [
      {
        label: "MAIN MENU", items: [
          { id: "dashboard", label: "Dashboard", route: "/dashboard" },
          { id: "finance-overview", label: "Financial Overview", route: "/finance-overview" },
          { id: "finance-budget", label: "Budget & Forecasting", route: "/finance-budget" },
          { id: "pos", label: "Purchase Orders", route: "/pos" },
          { id: "finance-invoices", label: "Invoices & Payments", route: "/finance-invoices" },
          { id: "finance-vendors", label: "Vendors", route: "/finance-vendors" },
          { id: "finance-cost-analysis", label: "Cost Analysis", route: "/finance-cost-analysis" },
          { id: "finance-spend-analysis", label: "Spend Analysis", route: "/finance-spend-analysis" },
          { id: "finance-tax", label: "Tax & Compliance", route: "/finance-tax" },
          { id: "finance-reports", label: "Financial Reports", route: "/finance-reports" },
          { id: "finance-approvals", label: "Approvals", route: "/finance-approvals" },
          { id: "finance-payments", label: "Payment Tracking", route: "/finance-payments" },
          { id: "finance-audit", label: "Audit & Controls", route: "/finance-audit" }
        ]
      },
      {
        label: "ACCOUNT / SETTINGS", items: [
          { id: "profile", label: "Profile", route: "/profile" },
          { id: "settings", label: "Settings", route: "/settings" },
          { id: "support", label: "Help & Support", route: "/support" }
        ]
      }
    ]
  },

  auditor: {
    label: "Auditor", initials: "LH", name: "Layla Haddad",
    groups: [
      {
        label: "MAIN MENU", items: [
          { id: "dashboard", route: "/dashboard/auditor", label: "Dashboard" },
          { id: "audit-overview", route: "/audit-overview", label: "Audit Overview" },
          { id: "audit-logs", route: "/audit-logs", label: "Audit Logs" },
          { id: "procurement-audit", route: "/procurement-audit", label: "Procurement Audit" },
          { id: "vendor-audit", route: "/vendor-audit", label: "Vendor Audit" },
          { id: "audit-contracts", route: "/audit-contracts", label: "Contract & Compliance" },
          { id: "audit-invoices", route: "/audit-invoices", label: "Invoice & Payment Audit" },
          { id: "risk-controls", route: "/risk-controls", label: "Risk & Controls" },
          { id: "order-delivery-audit", route: "/order-delivery-audit", label: "Order & Delivery Audit" },
          { id: "audit-communications", route: "/audit-communications", label: "Communications Review" },
          { id: "notifications", route: "/notifications", label: "Notifications" }
        ]
      },
      {
        label: "REPORTS", items: [
          { id: "audit-reports", route: "/audit-reports", label: "Audit Reports" },
          { id: "compliance-reports", route: "/compliance-reports", label: "Compliance Reports" },
          { id: "exception-reports", route: "/exception-reports", label: "Exception Reports" },
          { id: "audit-exports", route: "/audit-exports", label: "Export Reports" }
        ]
      },
      {
        label: "SETTINGS", items: [
          { id: "profile", route: "/profile", label: "Profile" },
          { id: "settings", route: "/settings", label: "System Settings" },
          { id: "help", route: "/help", label: "Help & Support" }
        ]
      }
    ]
  },
  vendor: {
    label: "Vendor", initials: "JD", name: "John Doe",
    groups: [
      {
        label: "MAIN MENU", items: [
          { id: "dashboard", label: "Dashboard" },
          { id: "vendor_profile", label: "Vendor Profile" },
          { id: "vendor_performance", label: "Performance Overview" },
          { id: "vendor_pos", label: "Purchase Orders" },
          { id: "vendor_contracts", label: "Contracts & Compliance" },
          { id: "vendor_invoices", label: "Invoices & Payments" },
          { id: "vendor_communication", label: "Communication" },
          { id: "vendor_documents", label: "Documents" },
          { id: "vendor_notifications", label: "Notifications" }
        ]
      },
      {
        label: "REPORTS", items: [
          { id: "vendor_reports_perf", label: "Performance Reports" },
          { id: "vendor_reports_order", label: "Order Reports" },
          { id: "vendor_reports_comp", label: "Compliance Reports" },
          { id: "vendor_reports_export", label: "Export Reports" }
        ]
      },
      {
        label: "ACCOUNT", items: [
          { id: "vendor_settings", label: "Settings" },
          { id: "vendor_support", label: "Help & Support" }
        ]
      }
    ]
  }
};

export let currentRole = "admin";
export let selectedRole = "admin";
export let currentPage = "dashboard";

/* ============================================================ VIEW SWITCH ============================================================ */
export function showView(v) {
  document.getElementById('view-landing').classList.toggle('hidden', v !== 'landing');
  document.getElementById('view-login').classList.toggle('hidden', v !== 'login');
  document.getElementById('view-forgot').classList.toggle('hidden', v !== 'forgot');
  document.getElementById('view-reset').classList.toggle('hidden', v !== 'reset');
  document.getElementById('view-app').classList.toggle('hidden', v !== 'app');
  window.scrollTo(0, 0);
  if (v === 'login') buildRoleSelect();
}
export function scrollToId(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }

export function buildRoleSelect() {
  const el = document.getElementById('role-select');
  el.innerHTML = Object.keys(roles).map(k => `
    <button class="role-pick ${k === selectedRole ? 'active' : ''}" onclick="pickRole('${k}')">
      <span class="ic"></span>${roles[k].label}
    </button>`).join('');
}
export function pickRole(k) { selectedRole = k; buildRoleSelect(); }

export function loginAs(k) {
  currentRole = k;
  currentPage = "dashboard";
  const r = roles[k];
  document.getElementById('sb-role-label').textContent = r.label + " Workspace";
  document.getElementById('sb-avatar').textContent = r.initials;
  document.getElementById('tb-avatar').textContent = r.initials;
  document.getElementById('sb-who').innerHTML = r.name + '<span>' + r.label + '</span>';
  buildSidebar();
  renderPage();
  showView('app');
}

export function buildSidebar() {
  const r = roles[currentRole];
  const el = document.getElementById('nav-scroll');
  el.innerHTML = r.groups.map(g => `
    <div class="nav-group-label">${g.label}</div>
    ${g.items.map(it => `<a class="nav-item ${it.id === currentPage ? 'active' : ''}" onclick="goTo('${it.id}')"><span class="ic"></span>${it.label}</a>`).join('')}
  `).join('');
}

export function goTo(pageId) {
  currentPage = pageId;
  buildSidebar();
  renderPage();
}

export function pageLabel(id) {
  for (const g of roles[currentRole].groups) { for (const it of g.items) { if (it.id === id) return it.label; } }
  return id;
}

/* ============================================================ COMPONENT HELPERS ============================================================ */
export function kpi(label, val, delta, up) {
  return `<div class="kpi"><div class="lbl"><span>${label}</span></div><div class="val">${val}</div><div class="delta ${up ? 'up' : 'down'}">${delta}</div></div>`;
}
export function badgeFor(status) {
  const map = {
    "Delivered": "green", "Paid": "green", "Active": "green", "Compliant": "green", "Low": "green", "Excellent": "green", "Good": "teal",
    "In Transit": "teal", "Pending": "amber", "Approved": "teal", "Expiring Soon": "amber", "Medium": "amber", "Average": "amber", "Invited": "amber",
    "Overdue": "red", "Non-Compliant": "red", "Expired": "red", "High": "red", "Poor": "red", "Critical": "red"
  };
  return `<span class="badge ${map[status] || 'slate'}">${status}</span>`;
}
export function gaugeSvg(score) {
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const totalLen = 220; const dash = totalLen * pct;
  let color = score >= 80 ? '#2F8F5B' : score >= 60 ? '#0E7C7B' : score >= 40 ? '#B9762C' : '#BD4438';
  return `<svg width="170" height="105" viewBox="0 0 170 105">
    <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="#EEF1F2" stroke-width="12"/>
    <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${dash} ${totalLen}"/>
    <text x="85" y="76" text-anchor="middle" font-family="IBM Plex Mono" font-size="26" font-weight="600" fill="#132436">${score}</text>
    <text x="85" y="94" text-anchor="middle" font-family="IBM Plex Sans" font-size="10" fill="#5B6B75">/ 100</text>
  </svg>`;
}
export function bar(name, val, max) {
  return `<div class="bar-row"><div class="name">${name}</div><div class="bar-track"><div class="bar-fill" style="width:${(val / max * 100)}%"></div></div><div class="num">${val}</div></div>`;
}
export function head(title, sub, actions) {
  return `<div class="page-head"><div><h1>${title}</h1><p>${sub || ''}</p></div><div class="page-actions">${actions || ''}</div></div>`;
}
export function card(title, body, link) {
  return `<div class="card"><div class="card-head"><h3>${title}</h3>${link ? `<a>${link} →</a>` : ''}</div><div class="card-body">${body}</div></div>`;
}

/* ============================================================ PAGE RENDERERS ============================================================ */
// MOCKED PAGES REMOVED.
// The frontend routing intercepts all URL configurations directly to real Angular Component files (e.g. PoDashboardComponent) 
// instead of dynamically interpreting strings.
export const pages: any = {};

pages.dashboard = function () { return ''; }


