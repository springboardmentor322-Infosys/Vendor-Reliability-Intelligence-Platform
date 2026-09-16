(() => {
  "use strict";

  const roles = {
    "Administrator": [
      ["Dashboard", "dashboard.html", "grid"], ["My Profile", "profile.html", "person-vcard"], ["User Management", "users.html", "people"],
      ["Vendor Management", "vendors.html", "buildings"], ["Procurement Requests", "procurement-requests.html", "clipboard-check"],
      ["Purchase Orders", "purchase-orders.html", "receipt"], ["Invoices & Payments", "invoices-payments.html", "cash-coin"], ["Contracts", "contracts.html", "file-earmark-text"], ["Risk Overview", "procurement-risk.html", "shield-exclamation"],
      ["Risk Alerts", "risk-alerts.html", "bell"], ["Audit Logs", "audit-logs.html", "journal-text"]
    ],
    "Procurement Manager": [
      ["Dashboard", "dashboard.html", "grid"], ["My Profile", "profile.html", "person-vcard"], ["Procurement Requests", "procurement-requests.html", "clipboard-check"],
      ["Vendors", "vendors.html", "buildings"], ["Vendor Comparison", "vendor-comparison.html", "arrow-left-right"],
      ["Purchase Orders", "purchase-orders.html", "receipt"], ["Invoices", "invoices-payments.html", "cash-coin"], ["Contracts", "contracts.html", "file-earmark-text"],
      ["Procurement Risk", "procurement-risk.html", "graph-up-arrow"], ["Risk Alerts", "risk-alerts.html", "bell"]
    ],
    "Supply Chain Manager": [
      ["Dashboard", "dashboard.html", "grid"], ["My Profile", "profile.html", "person-vcard"], ["Procurement Requests", "procurement-requests.html", "clipboard-check"],
      ["Purchase Orders & Deliveries", "purchase-orders.html", "truck"], ["Vendor Performance & Reliability", "vendors.html", "speedometer2"],
      ["Vendor Comparison", "vendor-comparison.html", "arrow-left-right"], ["Contracts", "contracts.html", "file-earmark-text"], ["Critical Vendors", "vendor-dependency.html", "diagram-3"],
      ["Risk Alerts", "risk-alerts.html", "bell"]
    ],
    "Finance Officer": [
      ["Dashboard", "dashboard.html", "grid"], ["My Profile", "profile.html", "person-vcard"], ["Procurement Approvals", "procurement-requests.html", "clipboard-check"], ["Financial Overview", "procurement-risk.html", "cash-stack"],
      ["Purchase Orders", "purchase-orders.html", "receipt"], ["Invoices & Payments", "invoices-payments.html", "cash-coin"], ["Vendor Financial Risk", "vendors.html", "buildings"],
      ["Contracts", "contracts.html", "file-earmark-text"], ["Dependency Exposure", "vendor-dependency.html", "pie-chart"],
      ["Risk Alerts", "risk-alerts.html", "bell"]
    ],
    "Auditor": [
      ["Dashboard", "dashboard.html", "grid"], ["My Profile", "profile.html", "person-vcard"], ["Vendors", "vendors.html", "buildings"], ["Procurement Requests", "procurement-requests.html", "clipboard-check"],
      ["Purchase Orders", "purchase-orders.html", "receipt"], ["Invoices", "invoices-payments.html", "cash-coin"], ["Contracts", "contracts.html", "file-earmark-text"],
      ["Vendor Comparison", "vendor-comparison.html", "arrow-left-right"], ["Vendor Risk History", "vendor-dependency.html", "clock-history"], ["Risk Alerts", "risk-alerts.html", "bell"],
      ["Audit Logs", "audit-logs.html", "journal-text"]
    ],
    "Vendor": [
      ["Dashboard", "dashboard.html", "grid"], ["My Profile", "profile.html", "person-vcard"],
      ["My Purchase Orders", "purchase-orders.html", "receipt"], ["My Invoices & Payments", "invoices-payments.html", "cash-coin"], ["My Contracts", "contracts.html", "file-earmark-text"],
      ["My Alerts", "risk-alerts.html", "bell"]
    ]
  };

  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const filename = () => (location.pathname.split("/").pop() || "dashboard.html").toLowerCase();
  // Messaging is not an exposed VendorIQ workspace. Keep this guard even if a
  // legacy link is accidentally reintroduced into a role's menu definition.
  const hiddenNavigationTargets = new Set(["messages.html"]);

  const sidebarRoles = Object.fromEntries(
    Object.entries(roles).map(([role, links]) => [role, links.filter(([, href]) => href !== "dashboard.html" && !hiddenNavigationTargets.has(href.toLowerCase()))])
  );

  function primaryRole(names) {
    return Object.keys(sidebarRoles).find((name) => names.includes(name)) || "Vendor";
  }

  function linksFor(names) {
    return sidebarRoles[primaryRole(names)] || [];
  }

  function render(target, user, names, activePage = filename()) {
    const mount = typeof target === "string" ? document.querySelector(target) : target;
    if (!mount) return;
    const role = primaryRole(names || []);
    const active = String(activePage).toLowerCase();
    const links = [["Dashboard", "dashboard.html", "grid"], ...linksFor(names || [])];
    mount.innerHTML = `<a class="brand brand-light" href="dashboard.html"><img src="assets/images/vendoriq-mark.svg" width="32" height="32" alt="VendorIQ"><span>VendorIQ</span></a><button class="btn btn-sm sidebar-close d-lg-none" data-action="close-menu">Close menu</button><p class="sidebar-caption">${esc(role)} workspace</p><nav class="app-nav">${links.map(([label, href, icon]) => `<a class="${href.toLowerCase() === active ? "active" : ""}" href="${href}"><i class="bi bi-${icon}" aria-hidden="true"></i><span>${label}</span></a>`).join("")}</nav><div class="sidebar-footer"><strong>${esc(user?.first_name || "VendorIQ")} ${esc(user?.last_name || "")}</strong><small>${esc(user?.email || role)}</small></div>`;
  }

  function accessDenied(target, message = "You do not have permission to access this workspace.") {
    const mount = typeof target === "string" ? document.querySelector(target) : target;
    if (mount) mount.innerHTML = `<div class="alert alert-warning" role="alert"><h2 class="h5">Access denied</h2><p class="mb-0">${esc(message)}</p></div>`;
  }

  const detailParents = Object.freeze({
    "vendor-details.html": "vendors.html",
    "procurement-request-details.html": "procurement-requests.html",
    "purchase-order-details.html": "purchase-orders.html",
    "contract-details.html": "contracts.html",
    "po-fulfillment.html": "purchase-orders.html",
    "profile.html": "profile.html",
    "vendor-comparison.html": "vendor-comparison.html"
  });

  async function mountStandaloneShell() {
    const page = filename();
    if (!detailParents[page] || document.querySelector("#appSidebar")) return;
    const auth = window.VendorIQAuth;
    const api = window.VendorIQApi;
    if (!auth?.isAuthenticated()) return;
    let user = auth.getUser();
    try {
      if (!user && api) user = auth.setUser(await api.me(auth.getAccessToken()));
    } catch (_) {
      // Existing page-level code presents its own authenticated API error.
      return;
    }
    if (!user) return;
    const main = document.querySelector("body > main");
    if (!main) return;
    const shell = document.createElement("div");
    shell.className = "app-shell d-lg-flex";
    const sidebar = document.createElement("aside");
    sidebar.id = "appSidebar";
    sidebar.className = "app-sidebar";
    main.parentNode.insertBefore(shell, main);
    shell.append(sidebar, main);
    main.classList.add("app-content");
    render(sidebar, user, auth.getRoleNames(user), detailParents[page]);
  }

  window.VendorIQNavigation = Object.freeze({ roles: sidebarRoles, primaryRole, linksFor, render, accessDenied, mountStandaloneShell });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountStandaloneShell, { once: true });
  } else {
    mountStandaloneShell();
  }
})();
