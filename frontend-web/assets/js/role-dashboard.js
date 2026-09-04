/*
 * Role dashboard controller. The API sends a role-scoped data set and each
 * role below receives its own cards, charts, tables, navigation and actions.
 * Filters trigger a fresh PostgreSQL-backed request, never browser mock data.
 */
const ROLE_HOMES = {
  administrator: "admin-dashboard.html", procurement_manager: "procurement-dashboard.html",
  supply_chain_manager: "supply-chain-dashboard.html", vendor: "vendor-dashboard.html",
  finance_officer: "finance-dashboard.html", auditor: "auditor-dashboard.html",
};
const ROLE_LABELS = {
  administrator: "Administrator", procurement_manager: "Procurement Manager",
  supply_chain_manager: "Supply Chain Manager", vendor: "Vendor",
  finance_officer: "Finance Officer", auditor: "Auditor",
};
const ROLE_COPY = {
  administrator: ["Platform overview", "Monitor users, permissions, vendors, procurement, compliance, and system activity."],
  procurement_manager: ["Procurement overview", "Review requests, purchase orders, delivery commitments, supplier selection, and spend."],
  supply_chain_manager: ["Supply-chain overview", "Monitor order movement, delivery reliability, suppliers, and operational risks."],
  vendor: ["My supplier workspace", "View only your company’s performance, orders, contracts, documents, and payments."],
  finance_officer: ["Financial overview", "Review invoices, payment status, procurement spend, and supplier payment exposure."],
  auditor: ["Audit & compliance overview", "Review evidence, controls, contracts, reliability risk, and traceable system activity."],
};
const ROLE_ACTIONS = {
  administrator: ["Manage users", "user-management.html"], procurement_manager: ["New procurement request", "procurement-requests.html"],
  supply_chain_manager: ["Record delivery", "operations.html#deliveries"], vendor: ["Update delivery", "operations.html#deliveries"],
  finance_officer: ["Review invoices", "operations.html#invoices"], auditor: ["Review compliance", "contracts.html"],
};
const NAVIGATIONS = {
  administrator: [["⌂", "Dashboard", "admin-dashboard.html"], ["♙", "User Management", "user-management.html"], ["◉", "Vendors", "vendors.html"], ["▣", "Procurement", "procurement-requests.html"], ["▤", "Purchase Orders", "purchase-orders.html"], ["▥", "Invoices & Payments", "operations.html#invoices"], ["◌", "Contracts & Compliance", "contracts.html"], ["◫", "Performance & Reliability", "performance.html"], ["▤", "Reports & Exports", "reports.html"], ["◫", "Activity Logs", "activity.html"], ["◈", "Data Management", "data-management.html"]],
  procurement_manager: [["⌂", "Dashboard", "procurement-dashboard.html"], ["▣", "Procurement Requests", "procurement-requests.html"], ["▤", "Purchase Orders", "purchase-orders.html"], ["◉", "Vendor Selection", "vendors.html"], ["◫", "Vendor Performance", "performance.html"], ["▥", "Order Tracking", "operations.html#deliveries"], ["◌", "Contracts & Compliance", "contracts.html"], ["✉", "Communication", "communications.html"], ["▤", "Reports & Analytics", "reports.html"], ["♧", "Notifications", "notifications.html"]],
  supply_chain_manager: [["⌂", "Dashboard", "supply-chain-dashboard.html"], ["◉", "Suppliers", "vendors.html"], ["▤", "Purchase Orders", "purchase-orders.html"], ["▥", "Order Tracking", "operations.html#deliveries"], ["◫", "Supplier Performance", "performance.html"], ["◌", "Risk & Reliability", "performance.html"], ["◌", "Contracts & Compliance", "contracts.html"], ["▤", "Analytics & Reports", "reports.html"], ["✉", "Communication", "communications.html"], ["♧", "Alerts & Notifications", "notifications.html"]],
  vendor: [["⌂", "Dashboard", "vendor-dashboard.html"], ["◉", "Profile & Company", "vendors.html"], ["◫", "My Performance", "performance.html"], ["▤", "Purchase Orders", "purchase-orders.html"], ["▥", "Order & Delivery Tracking", "operations.html#deliveries"], ["▥", "Invoices", "operations.html#invoices"], ["◌", "Contracts & Compliance", "contracts.html"], ["✉", "Communications", "communications.html"], ["▧", "Documents", "documents.html"], ["♧", "Notifications", "notifications.html"], ["▤", "Reports", "reports.html"]],
  finance_officer: [["⌂", "Dashboard", "finance-dashboard.html"], ["▥", "Financial Overview", "operations.html#invoices"], ["▤", "Purchase Orders", "purchase-orders.html"], ["▥", "Invoices & Payments", "operations.html#invoices"], ["◉", "Vendors", "vendors.html"], ["▤", "Cost Analysis", "reports.html"], ["▤", "Spend Analysis", "reports.html"], ["◌", "Tax & Compliance", "contracts.html"], ["▤", "Financial Reports", "reports.html"], ["♧", "Notifications", "notifications.html"]],
  auditor: [["⌂", "Dashboard", "auditor-dashboard.html"], ["◉", "Vendors", "vendors.html"], ["▣", "Procurement", "procurement-requests.html"], ["▤", "Purchase Orders", "purchase-orders.html"], ["◌", "Contracts & Compliance", "contracts.html"], ["◫", "Risk Assessment", "performance.html"], ["◫", "Audit Trails", "activity.html"], ["▧", "Document Review", "documents.html"], ["✉", "Communication Log", "communications.html"], ["▤", "Reports & Analytics", "reports.html"], ["♧", "Alerts & Notifications", "notifications.html"]],
};

const state = { user: null, months: 6, vendorId: "", risk: "all" };
const escapeHtml = value => { const node = document.createElement("div"); node.textContent = value ?? ""; return node.innerHTML; };
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
const shortDate = value => value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
const initials = name => String(name || "U").split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();
const statusText = status => String(status || "pending").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const statusClass = status => ["delivered", "completed", "approved", "active", "paid", "compliant", "low"].includes(status) ? "" : ["cancelled", "rejected", "overdue", "expired", "high"].includes(status) ? "danger" : "warn";
const label = text => `<span class="role-panel-link">${text} →</span>`;

function navLink([glyph, text, href], active = false) {
  return `<a class="nav-link${active ? " active" : ""}" href="${href}"><span class="nav-glyph">${glyph}</span>${text}</a>`;
}

function shell(user, dashboard, content) {
  const [headline, description] = ROLE_COPY[user.role] || ROLE_COPY.vendor;
  const [actionLabel, actionHref] = ROLE_ACTIONS[user.role] || ROLE_ACTIONS.vendor;
  const notificationCount = (dashboard.notifications || []).filter(item => !item.is_read).length;
  const messageCount = (dashboard.messages || []).filter(item => !item.is_read).length;
  const roleNav = (NAVIGATIONS[user.role] || NAVIGATIONS.vendor).map((item, index) => navLink(item, index === 0)).join("");
  document.getElementById("role-app").innerHTML = `
    <div class="app-shell"><aside class="sidebar">
      <div class="brand"><span class="brand-mark"></span><span>VendorIQ<small class="brand-subtitle">Vendor Reliability & Procurement Platform</small></span></div>
      <div class="nav-section">MAIN MENU</div><nav>${roleNav}</nav>
      <div class="sidebar-footer"><div class="nav-section">ACCOUNT</div>${navLink(["⚙", "My profile", "profile.html"])}<a class="nav-link" id="signout" href="#"><span class="nav-glyph">⇥</span>Sign out</a><div class="account-card"><div class="avatar">${initials(user.full_name)}</div><div><b>${escapeHtml(user.full_name)}</b><small>${ROLE_LABELS[user.role]}</small><em>● Online</em></div></div></div>
    </aside><main class="main"><header class="workspace-header"><div class="workspace-heading"><h2>${ROLE_LABELS[user.role]} Dashboard</h2><div class="breadcrumb">Home &nbsp;›&nbsp; ${ROLE_LABELS[user.role]} Dashboard</div></div><div class="top-actions"><input id="dashboard-search" class="search-box" aria-label="Search this dashboard" placeholder="Search this dashboard..."/><button class="icon-button" aria-label="Notifications" onclick="location.href='notifications.html'">♧${notificationCount ? `<span class="notice-dot">${notificationCount}</span>` : ""}</button><button class="icon-button" aria-label="Messages" onclick="location.href='communications.html'">✉${messageCount ? `<span class="notice-dot">${messageCount}</span>` : ""}</button><div class="user-chip"><div class="avatar">${initials(user.full_name)}</div><span>${escapeHtml(user.full_name)}<br><small>${ROLE_LABELS[user.role]}</small></span></div></div></header><div class="topbar"><div><h3>${headline}</h3><p class="who">${description}</p></div><a class="btn btn-accent" href="${actionHref}">+ ${actionLabel}</a></div>${content}</main></div>`;
  document.getElementById("signout").onclick = event => { event.preventDefault(); Auth.logout(); };
  document.getElementById("dashboard-search").addEventListener("input", event => filterDashboard(event.target.value));
}

function filterDashboard(query) {
  const normalized = query.trim().toLowerCase();
  document.querySelectorAll("[data-dashboard-item]").forEach(element => {
    element.style.display = !normalized || element.textContent.toLowerCase().includes(normalized) ? "" : "none";
  });
}

function cardValue(card) {
  if (card.value === null || card.value === undefined) return "—";
  if (typeof card.value === "string") return escapeHtml(card.value);
  const lower = card.label.toLowerCase();
  if (/(spend|cost|invoiced|revenue|cash flow|payments made)/.test(lower)) return money(card.value);
  if (/(on-time|compliance|utilization|completion)/.test(lower)) return `${Number(card.value).toFixed(1).replace(/\.0$/, "")}%`;
  if (/(reliability|quality)/.test(lower)) return `${Number(card.value).toFixed(1).replace(/\.0$/, "")}/100`;
  if (/payment time/.test(lower)) return `${Number(card.value).toFixed(1).replace(/\.0$/, "")} days`;
  return new Intl.NumberFormat().format(Number(card.value));
}

function metricCards(cards) {
  const icons = ["♙", "▦", "▣", "₹", "▤", "✓"];
  return `<section class="grid-cards reference-kpis role-kpis">${cards.map((card, index) => `<div class="stat-card" data-dashboard-item><div class="kpi-icon ${escapeHtml(card.tone || "blue")}">${icons[index]}</div><div><div class="label">${escapeHtml(card.label)}</div><div class="value">${cardValue(card)}</div><div class="metric-trend">${escapeHtml(card.hint || "Live workspace data")}</div></div></div>`).join("")}</section>`;
}

function filters(data, user) {
  const vendorOptions = (data.vendor_selector || []).map(vendor => `<option value="${vendor.id}" ${state.vendorId === vendor.id ? "selected" : ""}>${escapeHtml(vendor.name)} (${statusText(vendor.risk)} risk)</option>`).join("");
  const showVendor = user.role !== "vendor" && vendorOptions;
  const showRisk = user.role !== "vendor";
  return `<section class="dashboard-filters panel"><div class="filter-caption"><b>Interactive dashboard filters</b><span>Changes are queried from PostgreSQL.</span></div><div class="filter-controls"><label>Period<select id="dashboard-months"><option value="3" ${state.months === 3 ? "selected" : ""}>Last 3 months</option><option value="6" ${state.months === 6 ? "selected" : ""}>Last 6 months</option><option value="12" ${state.months === 12 ? "selected" : ""}>Last 12 months</option></select></label>${showVendor ? `<label>Vendor<select id="dashboard-vendor"><option value="">All permitted vendors</option>${vendorOptions}</select></label>` : ""}${showRisk ? `<label>Reliability risk<select id="dashboard-risk"><option value="all">All risk levels</option><option value="high" ${state.risk === "high" ? "selected" : ""}>High risk</option><option value="medium" ${state.risk === "medium" ? "selected" : ""}>Medium risk</option><option value="low" ${state.risk === "low" ? "selected" : ""}>Low risk</option></select></label>` : ""}<button class="btn btn-ghost" id="dashboard-reset" type="button">Reset</button></div></section>`;
}

function panel(title, href, content, className = "") {
  return `<section class="panel dashboard-panel ${className}" data-dashboard-item><div class="panel-title"><h3>${title}</h3>${href ? `<a href="${href}">${label("View all")}</a>` : ""}</div>${content}</section>`;
}
function empty(message) { return `<div class="role-empty">${escapeHtml(message)}</div>`; }

function donut(groups, totalText) {
  const colors = ["#4f72ee", "#26b77f", "#8757e8", "#f5a524", "#ec4d5b", "#b8c0d0"];
  const entries = Object.entries(groups || {}).filter(([, value]) => Number(value) > 0);
  const total = entries.reduce((sum, [, value]) => sum + Number(value), 0);
  if (!total) return `<div class="role-donut-layout">${empty("No stored records match the selected filters.")}</div>`;
  let position = 0;
  const segments = entries.map(([name, value], index) => { const next = position + Number(value) / total * 100; const segment = `${colors[index % colors.length]} ${position}% ${next}%`; position = next; return segment; }).join(", ");
  return `<div class="role-donut-layout"><div class="role-donut" style="background:conic-gradient(${segments})"><div><b>${total}</b><span>${escapeHtml(totalText)}</span></div></div><div class="legend-list">${entries.map(([name, value], index) => `<div class="legend-item"><span class="legend-name" style="--legend:${colors[index % colors.length]}">${statusText(name)}</span><b>${value} (${Math.round(Number(value) / total * 100)}%)</b></div>`).join("")}</div></div>`;
}

function bars(points, firstKey, secondKey = null, firstName = "Value", secondName = "") {
  if (!points?.length || !points.some(point => Number(point[firstKey]) || (secondKey && Number(point[secondKey])))) return empty("No historical records are available for the selected period.");
  const ceiling = Math.max(1, ...points.flatMap(point => [Number(point[firstKey] || 0), Number(secondKey ? point[secondKey] || 0 : 0)]));
  return `<div class="role-bar-chart">${points.map(point => `<div class="role-bar-group" title="${escapeHtml(point.label)}: ${firstName} ${point[firstKey] ?? 0}${secondKey ? `, ${secondName} ${point[secondKey] ?? 0}` : ""}"><div class="role-bar-stack"><i class="role-bar first" style="height:${Math.max(4, Number(point[firstKey] || 0) / ceiling * 100)}%"></i>${secondKey ? `<i class="role-bar second" style="height:${Math.max(4, Number(point[secondKey] || 0) / ceiling * 100)}%"></i>` : ""}</div><small>${escapeHtml(point.label)}</small></div>`).join("")}</div><div class="chart-key"><span><i class="first"></i>${firstName}</span>${secondKey ? `<span><i class="second"></i>${secondName}</span>` : ""}</div>`;
}

function scoreRows(vendors) {
  if (!vendors?.length) return empty("No vendors match the selected filters.");
  return `<table class="score-table"><thead><tr><th>Vendor</th><th>Category</th><th>Score</th><th>Risk</th></tr></thead><tbody>${vendors.map(vendor => `<tr><td><a href="performance.html?vendor_id=${vendor.id}">${escapeHtml(vendor.name)}</a></td><td>${escapeHtml(vendor.category)}</td><td><span class="score-progress"><i style="width:${Math.max(0, Math.min(100, vendor.score))}%"></i></span> ${vendor.score}/100</td><td><span class="status-light ${statusClass(vendor.risk)}">${statusText(vendor.risk)}</span></td></tr>`).join("")}</tbody></table>`;
}

function orderRows(orders) {
  if (!orders?.length) return empty("No purchase orders match the selected filters.");
  return `<table class="score-table"><thead><tr><th>PO number</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Expected delivery</th></tr></thead><tbody>${orders.map(order => `<tr><td><a href="purchase-orders.html#${order.id}">${escapeHtml(order.number)}</a></td><td>${escapeHtml(order.vendor)}</td><td>${money(order.amount)}</td><td><span class="status-light ${statusClass(order.status)}">${statusText(order.status)}</span></td><td>${shortDate(order.expected_delivery)}</td></tr>`).join("")}</tbody></table>`;
}

function invoiceRows(invoices) {
  if (!invoices?.length) return empty("No invoices match the selected filters.");
  return `<table class="score-table"><thead><tr><th>Invoice</th><th>Vendor</th><th>Amount</th><th>Due date</th><th>Status</th></tr></thead><tbody>${invoices.map(invoice => `<tr><td><a href="operations.html#invoices">${escapeHtml(invoice.number)}</a></td><td>${escapeHtml(invoice.vendor)}</td><td>${money(invoice.amount)}</td><td>${shortDate(invoice.due_date)}</td><td><span class="status-light ${statusClass(invoice.status)}">${statusText(invoice.status)}</span></td></tr>`).join("")}</tbody></table>`;
}

function miniRows(items, type) {
  if (!items?.length) return empty("Nothing requires attention for the selected filters.");
  if (type === "delivery") return `<div class="mini-list">${items.map(item => `<div class="mini-list-row"><span><b>${escapeHtml(item.number)}</b><small>${escapeHtml(item.vendor)} · expected ${shortDate(item.expected_delivery)}</small></span><span class="status-light ${statusClass(item.status)}">${statusText(item.status)}${item.delay_days ? ` · ${item.delay_days}d` : ""}</span></div>`).join("")}</div>`;
  if (type === "contract") return `<div class="mini-list">${items.map(item => `<div class="mini-list-row"><span><b>${escapeHtml(item.title || item.number)}</b><small>${escapeHtml(item.vendor || "")}</small></span><span class="status-light ${statusClass(item.status)}">${statusText(item.status)} · ${shortDate(item.end_date)}</span></div>`).join("")}</div>`;
  if (type === "document") return `<div class="mini-list">${items.map(item => `<div class="mini-list-row"><span><b>${escapeHtml(item.title)}</b><small>${statusText(item.type)}${item.filename ? ` · ${escapeHtml(item.filename)}` : ""}</small></span><span class="status-light ${item.expires_at && new Date(item.expires_at) < new Date() ? "danger" : ""}">${item.expires_at ? shortDate(item.expires_at) : "No expiry"}</span></div>`).join("")}</div>`;
  if (type === "activity") return `<div class="mini-list">${items.map(item => `<div class="mini-list-row"><span><b>${escapeHtml(statusText(item.action))}</b><small>${escapeHtml(item.detail || item.entity_type)}</small></span><span>${shortDate(item.created_at)}</span></div>`).join("")}</div>`;
  return `<div class="mini-list">${items.map(item => `<div class="mini-list-row"><span>${escapeHtml(item.message || item.subject)}<small>${shortDate(item.created_at)}</small></span><span class="status-light ${statusClass(item.type)}">${statusText(item.type)}</span></div>`).join("")}</div>`;
}

function performanceList(summary, reliability, onTime) {
  const items = [["Reliability score", reliability, 100], ["On-time delivery", onTime, 100], ["Quality rating", summary.quality_rating, 100], ["Order completion", summary.completion_rate, 100], ["Response time", summary.response_time_hours, 72]];
  return `<div class="performance-list">${items.map(([name, value, maximum]) => `<div><span>${name}</span><b>${value === null || value === undefined ? "—" : `${value}${name.includes("time") ? " hrs" : "%"}`}</b><i><em style="width:${value === null || value === undefined ? 0 : Math.max(0, Math.min(100, Number(value) / maximum * 100))}%"></em></i></div>`).join("")}</div>`;
}

function forecastRows(forecasts) {
  if (!forecasts?.length) return empty("No delivery history is available for a forecast yet.");
  return `<div class="forecast-note">Forecast method: smoothed historical late-delivery probability. It becomes more reliable as more delivery records are stored.</div><table class="score-table"><thead><tr><th>Vendor</th><th>History</th><th>Predicted delay risk</th></tr></thead><tbody>${forecasts.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${item.late_deliveries}/${item.historical_deliveries} late</td><td>${item.predicted_delay_probability === null ? "—" : `<span class="status-light ${statusClass(item.risk_level)}">${item.predicted_delay_probability}% · ${statusText(item.risk_level)}</span>`}</td></tr>`).join("")}</tbody></table>`;
}

function administratorView(data) {
  return `<section class="dashboard-grid">${panel("Platform activity & procurement trend", "activity.html", bars(data.monthly, "orders", "spend", "Orders", "Spend"), "span-2")}${panel("Vendor status overview", "vendors.html", donut(data.status.vendors, "Vendors"))}${panel("Purchase order status", "purchase-orders.html", donut(data.status.orders, "Purchase orders"))}${panel("Top vendors by reliability", "performance.html", scoreRows(data.top_vendors))}${panel("Predictive delivery-risk watch", "performance.html", forecastRows(data.delivery_risk_forecast), "span-2")}${panel("Recent system activities", "activity.html", miniRows(data.activities, "activity"))}${panel("Compliance & contract alerts", "contracts.html", miniRows(data.contracts, "contract"))}</section>`;
}
function procurementView(data) {
  return `<section class="dashboard-grid">${panel("Procurement order status", "purchase-orders.html", donut(data.status.orders, "Purchase orders"))}${panel("Spend analysis", "reports.html", bars(data.monthly, "spend", "orders", "Spend", "Orders"), "span-2")}${panel("Top vendor performance", "performance.html", scoreRows(data.top_vendors))}${panel("Predicted delivery-risk watch", "performance.html", forecastRows(data.delivery_risk_forecast), "span-2")}${panel("Recent purchase orders", "purchase-orders.html", orderRows(data.recent_orders), "span-2")}${panel("Upcoming deliveries", "operations.html#deliveries", miniRows(data.upcoming_deliveries, "delivery"))}${panel("Contract expiry alerts", "contracts.html", miniRows(data.contracts, "contract"))}${panel("Recent notifications", "notifications.html", miniRows(data.notifications, "notification"))}</section>`;
}
function supplyView(data) {
  const riskGroups = { high_risk: data.summary.high_risk_count, monitored: Math.max(0, data.summary.vendor_count - data.summary.high_risk_count) };
  return `<section class="dashboard-grid">${panel("End-to-end order flow", "operations.html#deliveries", `<div class="flow-steps"><div><b>${data.summary.order_count}</b><span>Orders tracked</span></div><i>→</i><div><b>${data.summary.delayed_delivery_count}</b><span>Delayed</span></div><i>→</i><div><b>${data.summary.on_time_rate ?? "—"}</b><span>On-time rate</span></div></div>`)}${panel("Supply-chain performance trend", "performance.html", bars(data.monthly, "on_time_rate", "deliveries", "On-time %", "Deliveries"), "span-2")}${panel("Supplier performance summary", "performance.html", donut(riskGroups, "Suppliers"))}${panel("Top supply-chain risks", "performance.html", scoreRows(data.top_vendors.filter(vendor => vendor.risk !== "low")))}${panel("Predicted delivery disruptions", "performance.html", forecastRows(data.delivery_risk_forecast), "span-2")}${panel("Recent purchase orders", "purchase-orders.html", orderRows(data.recent_orders), "span-2")}${panel("Upcoming deliveries", "operations.html#deliveries", miniRows(data.upcoming_deliveries, "delivery"))}${panel("Recent alerts", "notifications.html", miniRows(data.notifications, "notification"))}</section>`;
}
function vendorView(data) {
  return `<section class="dashboard-grid">${panel("My performance overview", "performance.html", performanceList(data.summary.performance, data.summary.average_reliability, data.summary.on_time_rate))}${panel("My performance trend", "performance.html", bars(data.monthly, "on_time_rate", "orders", "On-time %", "Orders"))}${panel("Order status summary", "purchase-orders.html", donut(data.status.orders, "My orders"))}${panel("My delivery-risk forecast", "performance.html", forecastRows(data.delivery_risk_forecast))}${panel("Recent purchase orders", "purchase-orders.html", orderRows(data.recent_orders))}${panel("Recent payments", "operations.html#invoices", invoiceRows(data.recent_invoices))}${panel("Contract & compliance", "contracts.html", miniRows(data.contracts, "contract"))}${panel("Upcoming deliveries", "operations.html#deliveries", miniRows(data.upcoming_deliveries, "delivery"))}${panel("My documents", "documents.html", miniRows(data.documents, "document"))}${panel("My notifications", "notifications.html", miniRows(data.notifications, "notification"))}</section>`;
}
function financeView(data) {
  return `<section class="dashboard-grid">${panel("Spend by payment status", "operations.html#invoices", donut(data.status.invoices, "Invoices"))}${panel("Monthly spend trend", "reports.html", bars(data.monthly, "spend", "orders", "Spend", "Orders"), "span-2")}${panel("Top vendors by spend", "reports.html", data.top_spend?.length ? `<table class="score-table"><thead><tr><th>Vendor</th><th>Spend</th></tr></thead><tbody>${data.top_spend.map(item => `<tr><td>${escapeHtml(item.company_name)}</td><td>${money(item.spend)}</td></tr>`).join("")}</tbody></table>` : empty("No purchase-order spend is available."))}${panel("Recent invoices", "operations.html#invoices", invoiceRows(data.recent_invoices), "span-2")}${panel("Payment attention", "operations.html#invoices", invoiceRows(data.recent_invoices.filter(invoice => ["received", "approved", "overdue"].includes(invoice.status))))}${panel("Financial alerts", "notifications.html", miniRows(data.notifications, "notification"))}</section>`;
}
function auditorView(data) {
  const compliant = Math.round((data.summary.compliance_rate || 0) / 100 * data.summary.contract_count);
  const compliance = { compliant, non_compliant: Math.max(0, data.summary.contract_count - compliant) };
  return `<section class="dashboard-grid">${panel("Audit compliance overview", "contracts.html", donut(compliance, "Contracts"))}${panel("Risk assessment overview", "performance.html", donut({ high_risk: data.summary.high_risk_count, monitored: Math.max(0, data.summary.vendor_count - data.summary.high_risk_count) }, "Vendor records"))}${panel("Audit trail activity", "activity.html", miniRows(data.activities, "activity"))}${panel("Delivery-risk evidence", "performance.html", forecastRows(data.delivery_risk_forecast), "span-2")}${panel("Expiring contracts", "contracts.html", miniRows(data.contracts, "contract"))}${panel("Document evidence review", "documents.html", miniRows(data.documents, "document"))}${panel("Recent purchase-order evidence", "purchase-orders.html", orderRows(data.recent_orders))}${panel("Compliance notifications", "notifications.html", miniRows(data.notifications, "notification"))}</section>`;
}

function dashboardView(user, data) {
  const views = { administrator: administratorView, procurement_manager: procurementView, supply_chain_manager: supplyView, vendor: vendorView, finance_officer: financeView, auditor: auditorView };
  return `${filters(data, user)}${metricCards(data.cards || [])}${(views[user.role] || vendorView)(data)}`;
}
function bindFilters() {
  document.getElementById("dashboard-months")?.addEventListener("change", event => { state.months = Number(event.target.value); loadDashboard(); });
  document.getElementById("dashboard-vendor")?.addEventListener("change", event => { state.vendorId = event.target.value; loadDashboard(); });
  document.getElementById("dashboard-risk")?.addEventListener("change", event => { state.risk = event.target.value; loadDashboard(); });
  document.getElementById("dashboard-reset")?.addEventListener("click", () => { state.months = 6; state.vendorId = ""; state.risk = "all"; loadDashboard(); });
}
async function loadDashboard() {
  const root = document.getElementById("role-app"); root.classList.add("role-loading");
  try {
    const params = new URLSearchParams({ months: String(state.months), risk: state.risk }); if (state.vendorId) params.set("vendor_id", state.vendorId);
    const dashboard = await Api.get(`/analytics/role-dashboard?${params}`);
    shell(state.user, dashboard, dashboardView(state.user, dashboard)); bindFilters();
  } catch (error) {
    root.innerHTML = `<div class="auth-form-wrap"><div class="auth-card"><h1>Could not load dashboard</h1><p class="lead">${escapeHtml(error.message || "Please sign in again.")}</p><a class="btn btn-primary" href="index.html">Return to sign in</a></div></div>`;
  } finally { root.classList.remove("role-loading"); }
}
async function render() {
  try {
    const user = await Api.get("/auth/me"); if (user.role !== document.body.dataset.role) { location.replace(ROLE_HOMES[user.role] || "dashboard.html"); return; }
    state.user = user; Auth.setUser(user); await loadDashboard();
  } catch (error) {
    document.getElementById("role-app").innerHTML = `<div class="auth-form-wrap"><div class="auth-card"><h1>Could not load dashboard</h1><p class="lead">${escapeHtml(error.message || "Please sign in again.")}</p><a class="btn btn-primary" href="index.html">Return to sign in</a></div></div>`;
  }
}
render();
