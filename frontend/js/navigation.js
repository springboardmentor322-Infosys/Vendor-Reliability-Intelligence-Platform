// Navigation Shell Controller for VendorIQ

// Execute immediate RBAC and authentication guard before DOM parsing/rendering completes
(function checkRouteGuard() {
    const path = window.location.pathname;
    const pageName = path.split("/").pop();

    // Skip layout wrapping for auth and public landing pages
    if (
        pageName === "login.html" || 
        pageName === "register.html" || 
        pageName === "forgot-password.html" || 
        pageName === "reset-password.html" || 
        pageName === "index.html" || 
        pageName === ""
    ) {
        return;
    }

    // Setup redirect if not authenticated
    if (typeof isAuthenticated === "function" && !isAuthenticated()) {
        window.location.replace("login.html");
        return;
    }

    const role = (typeof getUserRole === "function" ? getUserRole() : null) || "Guest";

    // Determine dashboard routing by role
    let dashboardUrl = "login.html";
    switch (role) {
        case "Admin":
        case "Administrator":
            dashboardUrl = "admin_dashboard.html";
            break;
        case "Vendor": dashboardUrl = "vendor_dashboard.html"; break;
        case "Procurement Manager": dashboardUrl = "procurement_dashboard.html"; break;
        case "Supply Chain Manager": dashboardUrl = "supplychain_dashboard.html"; break;
        case "Finance Officer": dashboardUrl = "finance_dashboard.html"; break;
        case "Auditor": dashboardUrl = "auditor_dashboard.html"; break;
    }

    // Guard: Prevent unauthorized roles from loading other dashboard pages directly
    const dashboardPages = [
        "admin_dashboard.html",
        "vendor_dashboard.html",
        "procurement_dashboard.html",
        "supplychain_dashboard.html",
        "finance_dashboard.html",
        "auditor_dashboard.html"
    ];
    if (dashboardPages.includes(pageName) && pageName !== dashboardUrl) {
        console.warn(`Redirecting role ${role} from ${pageName} to ${dashboardUrl}`);
        window.location.replace(dashboardUrl);
        return;
    }

    // Strict Page-Level RBAC Route Guard: Prevent direct URL navigation to unauthorized modules
    const canonicalRole = (role === "Admin" ? "Administrator" : role);
    const pageRoleRestrictions = {
        "admin_dashboard.html": ["Admin", "Administrator"],
        "vendor_dashboard.html": ["Vendor"],
        "procurement_dashboard.html": ["Procurement Manager"],
        "supplychain_dashboard.html": ["Supply Chain Manager"],
        "finance_dashboard.html": ["Finance Officer"],
        "auditor_dashboard.html": ["Auditor"],
        "dashboard.html": ["Admin", "Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"],
        "audit_logs.html": ["Admin", "Administrator", "Auditor"],
        "purchase-request.html": ["Admin", "Administrator", "Procurement Manager", "Supply Chain Manager"],
        "add-contract.html": ["Admin", "Administrator", "Procurement Manager"],
        "add-vendor.html": ["Admin", "Administrator", "Procurement Manager"]
    };

    const allowedRolesForPage = pageRoleRestrictions[pageName];
    if (allowedRolesForPage && !allowedRolesForPage.includes(role) && !allowedRolesForPage.includes(canonicalRole)) {
        console.warn(`Access denied for role ${role} to ${pageName}. Redirecting to ${dashboardUrl}`);
        window.location.replace(dashboardUrl);
        return;
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    const pageName = path.split("/").pop();

    if (
        pageName === "login.html" || 
        pageName === "register.html" || 
        pageName === "forgot-password.html" || 
        pageName === "reset-password.html" || 
        pageName === "index.html" || 
        pageName === ""
    ) {
        return;
    }

    if (typeof isAuthenticated === "function" && !isAuthenticated()) {
        return;
    }

    const role = (typeof getUserRole === "function" ? getUserRole() : null) || "Guest";
    const name = (typeof getUserName === "function" ? getUserName() : null) || "User";

    // Role-based navigation maps matching exact requirement specifications
    const roleNavConfig = {
        "Admin": [
            { isSection: true, label: "MAIN MODULES" },
            { href: "admin_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "admin_dashboard.html#user-management", label: "👥 User Management", id: "nav-users" },
            { href: "vendors.html", label: "🏢 Vendors", id: "nav-vendors" },
            { href: "purchase-request.html", label: "📝 Procurement", id: "nav-requisitions" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "contracts.html", label: "📄 Contracts & Compliance", id: "nav-contracts" },
            { href: "invoices.html", label: "💳 Invoices & Payments", id: "nav-invoices" },
            { href: "vendor-reliability.html", label: "📈 Performance & Reliability", id: "nav-reliability" },
            { href: "reports.html", label: "📊 Reports & Analytics", id: "nav-reports" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "audit_logs.html", label: "📝 System Logs", id: "nav-audit" },
            
            { isSection: true, label: "ADMIN CONTROLS" },
            { href: "admin_dashboard.html#roles-permissions", label: "🔐 Role & Permission", id: "nav-roles" },
            { href: "admin_dashboard.html#platform-governance", label: "🔄 Workflow Management", id: "nav-workflows" },
            { href: "profile.html", label: "⚙️ System Settings", id: "nav-settings" },
            { href: "audit_logs.html", label: "📋 Audit Logs", id: "nav-audit-control" },
            { href: "analytics.html", label: "💾 Data Management", id: "nav-data" },
            { href: "admin_dashboard.html#system-health", label: "🔌 Integrations", id: "nav-integrations" }
        ],
        "Auditor": [
            { isSection: true, label: "AUDIT & COMPLIANCE" },
            { href: "auditor_dashboard.html", label: "📊 Auditor Dashboard", id: "nav-dashboard" },
            { href: "auditor_dashboard.html#audit-trace", label: "🔍 Transaction Trace", id: "nav-trace" },
            { href: "auditor_dashboard.html#approval-verification", label: "✅ Approval Verification", id: "nav-approval" },
            { href: "auditor_dashboard.html#compliance-overview", label: "🛡️ Compliance Review", id: "nav-risk" },
            { href: "auditor_dashboard.html#audit-findings", label: "🚨 Audit Findings", id: "nav-findings" },
            { href: "auditor_dashboard.html#audit-evidence", label: "📁 Evidence & Certifications", id: "nav-evidence" },
            { href: "audit_logs.html", label: "📜 System Audit Logs", id: "nav-audit" },
            { href: "contract-monitoring.html", label: "📑 Contracts Review", id: "nav-monitoring" },
            { href: "reports.html", label: "📊 Compliance Reports", id: "nav-reports" },
            
            { isSection: true, label: "OPERATIONAL DIRECTORIES" },
            { href: "vendors.html", label: "🏢 Suppliers Directory", id: "nav-vendors" },
            { href: "purchase-orders.html", label: "📝 Procurement Ledger", id: "nav-purchase" },
            { href: "invoices.html", label: "💳 Invoices Ledger", id: "nav-invoices" },
            
            { isSection: true, label: "SETTINGS" },
            { href: "profile.html", label: "👤 User Profile", id: "nav-profile" },
            { href: "profile.html", label: "⚙️ System Settings", id: "nav-settings" }
        ],
        "Finance Officer": [
            { isSection: true, label: "FINANCIAL MODULES" },
            { href: "finance_dashboard.html", label: "💰 Financial Overview", id: "nav-dashboard" },
            { href: "finance_dashboard.html#budget-overview", label: "📈 Budget & Forecasting", id: "nav-budget" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "invoices.html", label: "💳 Invoices & Payments", id: "nav-invoices" },
            { href: "vendors.html", label: "🏢 Vendors", id: "nav-vendors" },
            { href: "finance_dashboard.html#spend-category", label: "📉 Cost Analysis", id: "nav-cost" },
            { href: "analytics.html", label: "📊 Spend Analysis", id: "nav-analytics" },
            { href: "contracts.html", label: "⚖️ Tax & Compliance", id: "nav-contracts" },
            { href: "reports.html", label: "📑 Financial Reports", id: "nav-reports" },
            { href: "finance_dashboard.html#recent-invoices", label: "✅ Approvals", id: "nav-approvals" },
            { href: "invoices.html", label: "🔍 Payment Tracking", id: "nav-payment-tracking" },
            { href: "vendor-reliability.html", label: "🛡️ Risk & Controls", id: "nav-reliability" },
            
            { isSection: true, label: "SETTINGS" },
            { href: "profile.html", label: "👤 User Profile", id: "nav-profile" },
            { href: "profile.html", label: "⚙️ System Settings", id: "nav-settings" }
        ],
        "Procurement Manager": [
            { isSection: true, label: "PROCUREMENT OPERATIONS" },
            { href: "procurement_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "purchase-request.html", label: "📝 Procurement Requests", id: "nav-requisitions" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "vendors.html", label: "🏢 Vendors", id: "nav-vendors" },
            { href: "vendor-performance.html", label: "📈 Vendor Performance", id: "nav-performance" },
            { href: "contracts.html", label: "📄 Contracts & Compliance", id: "nav-contracts" },
            { href: "invoices.html", label: "💳 Invoices & Payments", id: "nav-invoices" },
            { href: "purchase-orders.html", label: "🚚 Order Tracking", id: "nav-tracking" },
            { href: "reports.html", label: "📊 Reports & Analytics", id: "nav-reports" },
            { href: "procurement_dashboard.html#budget-spend", label: "💰 Budget & Spend Analysis", id: "nav-budget" },
            { href: "communication.html", label: "💬 Communications", id: "nav-comm" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            
            { isSection: true, label: "SETTINGS" },
            { href: "profile.html", label: "👤 User Profile", id: "nav-profile" },
            { href: "profile.html", label: "⚙️ System Settings", id: "nav-settings" }
        ],
        "Vendor": [
            { isSection: true, label: "VENDOR PORTAL" },
            { href: "vendor_dashboard.html", label: "📊 Overview", id: "nav-dashboard" },
            { href: "profile.html", label: "🏢 Profile & Company", id: "nav-profile" },
            { href: "vendor_dashboard.html#performance-overview", label: "📈 My Performance", id: "nav-performance" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "vendor_dashboard.html#recent-orders", label: "🚚 Order & Delivery Tracking", id: "nav-tracking" },
            { href: "invoices.html", label: "💳 Invoices", id: "nav-invoices" },
            { href: "contracts.html", label: "📄 Contracts & Compliance", id: "nav-contracts" },
            { href: "communication.html", label: "💬 Communications", id: "nav-comm" },
            { href: "notifications.html", label: "🔔 Notifications", id: "nav-notifications" },
            { href: "reports.html", label: "📑 Reports", id: "nav-reports" },
            
            { isSection: true, label: "ACCOUNT" },
            { href: "profile.html", label: "⚙️ Settings", id: "nav-settings" }
        ],
        "Supply Chain Manager": [
            { isSection: true, label: "SUPPLY CHAIN OPERATIONS" },
            { href: "supplychain_dashboard.html", label: "📊 Dashboard", id: "nav-dashboard" },
            { href: "vendors.html", label: "🏢 Vendors", id: "nav-vendors" },
            { href: "purchase-request.html", label: "📝 Procurement", id: "nav-requisitions" },
            { href: "purchase-orders.html", label: "🛍️ Purchase Orders", id: "nav-purchase" },
            { href: "supplychain_dashboard.html#recent-shipments", label: "🚚 Order Tracking", id: "nav-tracking" },
            { href: "supplychain_dashboard.html#visibility-section", label: "📦 Inventory Overview", id: "nav-inventory" },
            { href: "analytics.html", label: "📈 Demand Planning", id: "nav-demand" },
            { href: "vendor-performance.html", label: "📊 Supplier Performance", id: "nav-performance" },
            { href: "vendor-reliability.html", label: "🛡️ Risk & Reliability", id: "nav-reliability" },
            { href: "contract-monitoring.html", label: "📄 Contracts & Compliance", id: "nav-contracts" },
            { href: "reports.html", label: "📑 Analytics & Reports", id: "nav-reports" },
            { href: "communication.html", label: "💬 Communications", id: "nav-comm" },
            { href: "notifications.html", label: "🔔 Alerts & Notifications", id: "nav-notifications" },
            
            { isSection: true, label: "SUPPLY CHAIN TOOLS" },
            { href: "supplychain_dashboard.html#visibility-section", label: "🗺️ Supply Chain Map", id: "nav-map" },
            { href: "supplychain_dashboard.html#disruption-monitor", label: "⚠️ Disruption Monitor", id: "nav-disruption" },
            { href: "analytics.html", label: "🔬 Scenario Planning", id: "nav-scenario" }
        ]
    };
    roleNavConfig["Administrator"] = roleNavConfig["Admin"];

    const links = roleNavConfig[role] || (role === "Administrator" ? roleNavConfig["Admin"] : []);
    
    // Construct initials for avatar
    const initials = name ? name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

    // Construct Sidebar HTML
    let navLinksHtml = "";
    links.forEach(item => {
        if (item.isSection) {
            navLinksHtml += `<div class="sidebar-section-header">${item.label}</div>\n`;
        } else {
            // Parse emoji icon and text label into distinct elements for semantic separation and accessibility
            const labelParts = item.label.match(/^(\S+)\s+(.+)$/);
            if (labelParts) {
                navLinksHtml += `<a href="${item.href}" id="${item.id}" class="sidebar-nav-item"><span class="sidebar-nav-icon">${labelParts[1]}</span><span class="sidebar-nav-text">${labelParts[2]}</span></a>\n`;
            } else {
                navLinksHtml += `<a href="${item.href}" id="${item.id}" class="sidebar-nav-item">${item.label}</a>\n`;
            }
        }
    });

    // User badge rendering: If name and role are identical (case-insensitive), display only once
    const isSameNameAndRole = !name || !role || name.trim().toLowerCase() === role.trim().toLowerCase();
    const userBadgeContent = isSameNameAndRole
        ? `👤 ${role || name || "User"}`
        : `👤 ${name} <span class="user-badge-role">${role}</span>`;

    const sidebarUserInfo = isSameNameAndRole
        ? `<span class="sidebar-user-name" title="${role}">${role}</span>`
        : `<span class="sidebar-user-name" title="${name}">${name}</span>\n                    <span class="sidebar-user-role">${role}</span>`;

    const sidebarHtml = `
        <div class="sidebar-brand">
            <h1>Vendor<span>IQ</span></h1>
            <p>Reliability Intelligence</p>
        </div>
        <div class="sidebar-nav">
            ${navLinksHtml}
        </div>
        <div class="sidebar-footer">
            <div class="sidebar-user-card">
                <div class="sidebar-avatar">${initials}</div>
                <div class="sidebar-user-info">
                    ${sidebarUserInfo}
                </div>
            </div>
            <button class="logout-btn" id="logout-button">🚪 Logout</button>
        </div>
    `;

    // Construct Top Navbar HTML
    const topNavHtml = `
        <div class="top-nav-title">
            <button class="mobile-nav-toggle" id="mobile-toggle">☰</button>
            <h2 id="page-header-title">VendorIQ Platform</h2>
        </div>
        <div class="top-nav-user">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); margin-right: 6px;">
                <span class="status-dot"></span> <span>Live Telemetry</span>
            </div>
            <div class="user-badge" style="box-shadow: 0 1px 3px rgba(79, 70, 229, 0.1);">
                ${userBadgeContent}
            </div>
        </div>
    `;

    // Save existing elements
    const originalChildren = Array.from(document.body.children);
    
    // Create new layout wrapper
    const appLayout = document.createElement("div");
    appLayout.id = "app-layout";
    
    const sidebar = document.createElement("div");
    sidebar.id = "sidebar";
    sidebar.innerHTML = sidebarHtml;
    
    const mainPanel = document.createElement("div");
    mainPanel.id = "main-panel";
    
    const topNav = document.createElement("div");
    topNav.id = "top-nav";
    topNav.innerHTML = topNavHtml;
    
    const contentArea = document.createElement("div");
    contentArea.id = "content-area";
    
    // Move scripts and original elements
    originalChildren.forEach(child => {
        if (child.tagName !== "SCRIPT" && child.id !== "toast-container") {
            contentArea.appendChild(child);
        }
    });
    
    mainPanel.appendChild(topNav);
    mainPanel.appendChild(contentArea);
    appLayout.appendChild(sidebar);
    appLayout.appendChild(mainPanel);
    
    // Setup toast container if not exists
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        document.body.appendChild(toastContainer);
    }
    
    document.body.insertBefore(appLayout, document.body.firstChild);

    // Active link highlighting logic
    const activeNavMap = {
        "dashboard": "nav-dashboard",
        "admin_dashboard": "nav-dashboard",
        "vendor_dashboard": "nav-dashboard",
        "procurement_dashboard": "nav-dashboard",
        "supplychain_dashboard": "nav-dashboard",
        "finance_dashboard": "nav-dashboard",
        "auditor_dashboard": "nav-dashboard",
        "vendors": "nav-vendors",
        "vendor-reliability": "nav-reliability",
        "purchase-request": "nav-requisitions",
        "purchase-orders": "nav-purchase",
        "quality": "nav-quality",
        "contracts": "nav-contracts",
        "add-contract": "nav-contracts",
        "contract-monitoring": "nav-monitoring",
        "analytics": "nav-analytics",
        "invoices": "nav-invoices",
        "reports": "nav-reports",
        "audit_logs": "nav-audit",
        "notifications": "nav-notifications",
        "profile": "nav-profile"
    };

    let matched = false;
    for (const [pageKey, elementId] of Object.entries(activeNavMap)) {
        if (pageName.includes(pageKey)) {
            const el = document.getElementById(elementId);
            if (el) {
                el.classList.add("active");
                // Update header title based on navigation
                const textSpan = el.querySelector(".sidebar-nav-text");
                document.getElementById("page-header-title").textContent = textSpan ? textSpan.textContent.trim() : el.textContent.substring(3).trim();
                matched = true;
            }
            break;
        }
    }
    
    if (!matched) {
        document.getElementById("page-header-title").textContent = "VendorIQ Platform";
    }

    // Toggle sidebar on mobile
    const mobileToggle = document.getElementById("mobile-toggle");
    if (mobileToggle) {
        mobileToggle.addEventListener("click", () => {
            sidebar.classList.toggle("show");
        });
    }

    // Wire up Logout
    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            logout();
        });
    }

    // Initialize Universal Clickable Cards & Interactive Elements
    initClickableCards();
});

/**
 * Universal Clickable Cards & Elements Handler
 * Provides keyboard accessibility (Enter/Space), smooth scrolling for anchors,
 * query parameter routing, and prevents nested button/link conflicts.
 */
function initClickableCards() {
    const makeAccessible = () => {
        document.querySelectorAll("[data-href], .clickable-card").forEach(el => {
            if (!el.hasAttribute("tabindex") && el.tagName !== "A" && el.tagName !== "BUTTON") {
                el.setAttribute("tabindex", "0");
            }
            if (!el.hasAttribute("role") && el.tagName !== "A" && el.tagName !== "BUTTON") {
                el.setAttribute("role", "link");
            }
        });
    };

    makeAccessible();
    setTimeout(makeAccessible, 600);
    setTimeout(makeAccessible, 1800);

    // Global Delegated Click Listener
    document.addEventListener("click", (e) => {
        const clickable = e.target.closest("[data-href]");
        if (!clickable) return;

        // Nested interactive element protection: ignore if click was inside a child button, link, input, or modal close
        const interactiveChild = e.target.closest("button, a, input, select, textarea, .btn-close, .btn");
        if (interactiveChild && clickable.contains(interactiveChild) && interactiveChild !== clickable) {
            return;
        }

        const href = clickable.getAttribute("data-href");
        if (!href) return;

        if (href.startsWith("#")) {
            const targetEl = document.querySelector(href);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: "smooth" });
                try {
                    history.pushState(null, "", href);
                } catch (err) {}
            }
        } else {
            window.location.href = href;
        }
    });

    // Global Keyboard Listener (Enter & Space)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            const clickable = e.target.closest("[data-href]");
            if (clickable && document.activeElement === clickable) {
                // Do not interfere with native form controls
                if (["INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
                    return;
                }
                e.preventDefault();
                clickable.click();
            }
        }
    });
}

/**
 * Global Order Slip Download Action
 * Available to all authorized roles across all dashboard views.
 */
window.downloadOrderSlip = async function(poId) {
    if (!poId) {
        if (typeof showToast === "function") showToast("Invalid Purchase Order ID.", "error");
        return;
    }

    const token = (typeof getToken === "function" ? getToken() : null) || localStorage.getItem("token");
    const apiBase = (typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "http://127.0.0.1:8000");

    try {
        if (typeof showToast === "function") {
            showToast("Generating Purchase Order Slip...", "info");
        }

        const response = await fetch(`${apiBase}/purchase-orders/${poId}/slip`, {
            method: "GET",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            let errorMsg = `Unable to generate order slip (HTTP ${response.status}).`;
            try {
                const errData = await response.json();
                if (errData.detail) errorMsg = errData.detail;
            } catch (e) {}

            if (typeof showToast === "function") {
                showToast(errorMsg, "error");
            } else {
                alert(errorMsg);
            }
            return;
        }

        const blob = await response.blob();
        
        let filename = `Order_Slip_PO_${poId}.pdf`;
        const disposition = response.headers.get("Content-Disposition");
        if (disposition && disposition.includes("filename=")) {
            const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
            if (match && match[1]) {
                filename = match[1].trim();
            }
        }

        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);

        if (typeof showToast === "function") {
            showToast(`Order Slip downloaded: ${filename}`, "success");
        }
    } catch (err) {
        console.error("Order slip download error:", err);
        if (typeof showToast === "function") {
            showToast("Network failure while generating order slip. Please try again.", "error");
        } else {
            alert("Network failure while generating order slip.");
        }
    }
};

