(() => {
  "use strict";

  const api = window.VendorIQApi;
  const auth = window.VendorIQAuth;
  const $ = (s) => document.querySelector(s);
  const charts = [];

  // ─── Design Token Colours ────────────────────────────────────────────────────
  const RISK_COLORS = {
    "Low Risk": "#10b981", "MEDIUM": "#f59e0b", "Medium Risk": "#f59e0b",
    "HIGH": "#ef4444", "High Risk": "#ef4444", "LOW": "#10b981",
    "CRITICAL": "#7f1d1d", "Critical Risk": "#7f1d1d", "Not Yet Rated": "#94a3b8",
  };
  const PALETTE = ["#4f46e5","#0284c7","#059669","#d97706","#dc2626","#7c3aed","#0891b2","#db2777","#2563eb","#16a34a"];
  const STATUS_COLORS = {
    "Draft": "#64748b", "Submitted": "#2563eb", "Pending Approval": "#d97706",
    "Approved": "#059669", "Rejected": "#dc2626", "Completed": "#4f46e5",
    "Cancelled": "#475569", "Accepted": "#0284c7", "In Progress": "#7c3aed",
    "Delivered": "#0891b2", "Received": "#059669", "Paid": "#059669",
    "Payment Pending": "#d97706", "Under Review": "#2563eb",
  };

  // ─── Utilities ───────────────────────────────────────────────────────────────
  const esc = (v) => String(v ?? "—").replace(/[&<>'"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const money = (v) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1,
  }).format(Number(v || 0));
  const moneyFull = (v) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(v || 0));
  const req = (p) => api.request(p, { token: auth.getAccessToken() });
  const pct = (n) => typeof n === "number" && !isNaN(n) ? `${n.toFixed(1)}%` : "N/A";

  function riskBadge(v) {
    const cls = {
      "Low Risk": "risk-low", "Medium Risk": "risk-medium", "High Risk": "risk-high",
      "Critical Risk": "risk-critical", "LOW": "risk-low", "MEDIUM": "risk-medium",
      "HIGH": "risk-high", "CRITICAL": "risk-critical", "Not Yet Rated": "risk-medium",
    }[v] || "risk-medium";
    return `<span class="risk-badge ${cls}">${esc(v)}</span>`;
  }

  function statusBadge(v) {
    return `<span class="status-badge" style="background:${STATUS_COLORS[v] || "#64748b"}22;color:${STATUS_COLORS[v] || "#475569"};font-weight:700;">${esc(v)}</span>`;
  }

  // ─── KPI Card Builder ────────────────────────────────────────────────────────
  function kpiCard(label, value, sub, tone, icon, href = "#") {
    return `<div class="col-sm-6 col-xl-3">
      <a href="${esc(href)}" class="kpi-card kpi-${esc(tone)}">
        <span class="kpi-icon"><i class="bi bi-${esc(icon)}"></i></span>
        <span><small>${esc(label)}</small><strong>${esc(String(value))}</strong><em>${esc(sub)} <i class="bi bi-arrow-right"></i></em></span>
      </a></div>`;
  }

  // ─── Chart Renderer ──────────────────────────────────────────────────────────
  function destroyCharts() {
    charts.forEach((c) => { try { c.destroy(); } catch (_) {} });
    charts.length = 0;
  }

  function drawChart(id, type, title, labels, data, colorArg, axes = true) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (!Array.isArray(data) || !data.length || data.every((v) => Number(v || 0) === 0)) {
      canvas.parentElement.innerHTML = `<div class="h-100 d-flex flex-column align-items-center justify-content-center text-muted text-center p-3">
        <i class="bi bi-bar-chart-line fs-2 mb-2 opacity-50"></i><strong class="small">${esc(title)}</strong>
        <span class="small mt-1 opacity-75">No recorded data available yet.</span></div>`;
      return;
    }
    let bgColors, borderColors;
    if (type === "bar" && !Array.isArray(colorArg) && labels.length > 1) {
      bgColors = labels.map((_, i) => PALETTE[i % PALETTE.length]);
      borderColors = bgColors;
    } else if (Array.isArray(colorArg)) {
      bgColors = colorArg;
      borderColors = colorArg;
    } else {
      bgColors = colorArg;
      borderColors = colorArg;
    }
    charts.push(new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [{
          label: title, data,
          backgroundColor: type === "line" ? (Array.isArray(colorArg) ? colorArg[0] : colorArg) + "33" : bgColors,
          borderColor: borderColors,
          borderWidth: type === "line" ? 3 : 1,
          tension: 0.35, fill: type === "line",
          pointRadius: type === "line" ? 4 : 0,
          pointHoverRadius: type === "line" ? 6 : 0,
          pointBackgroundColor: type === "line" ? (Array.isArray(colorArg) ? colorArg[0] : colorArg) : undefined,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: type === "doughnut" || type === "pie", position: "right", labels: { font: { size: 11, weight: "600" }, color: "#1e293b" } },
          title: { display: true, text: title, font: { size: 14, weight: "700" }, color: "#0f172a", padding: { bottom: 14 } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label || ""}: ${ctx.formattedValue}` } },
        },
        scales: axes && type !== "doughnut" && type !== "pie" ? {
          y: { beginAtZero: true, grid: { color: "#e2e8f0" }, ticks: { color: "#475569", font: { size: 11, weight: "600" } }, title: { display: true, text: title.includes("Spend") || title.includes("Amount") ? "Amount (₹)" : title.includes("Score") || title.includes("Rate") || title.includes("Delivery") || title.includes("Utilization") ? "Score (%)" : "Count", color: "#64748b", font: { size: 11, weight: "600" } } },
          x: { grid: { display: false }, ticks: { maxRotation: 38, minRotation: 0, color: "#475569", font: { size: 11, weight: "600" } } },
        } : {},
      },
    }));
  }

  function chartGrid(ids) {
    return ids.map((id, i) => `<div class="col-lg-${ids.length <= 2 ? "6" : "6"}">
      <article class="intelligence-card chart-card"><canvas id="${id}"></canvas></article></div>`).join("");
  }

  // ─── Table & Insights Helpers ─────────────────────────────────────────────────
  function setTable(title, link, heads, rows) {
    const titleEl = $("#primaryTableTitle");
    const linkEl = $("#primaryTableLink");
    const headEl = $("#primaryTableHead");
    const bodyEl = $("#primaryTableRows");
    if (titleEl) titleEl.textContent = title;
    if (linkEl) linkEl.href = link;
    if (headEl) headEl.innerHTML = `<tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    if (bodyEl) bodyEl.innerHTML = rows || `<tr><td colspan="${heads.length}" class="text-center py-4 text-muted">No matching records.</td></tr>`;
  }

  function setInsights(items) {
    const el = $("#insightList");
    if (!el) return;
    el.innerHTML = items.map((x) => `<div class="insight"><i class="bi bi-lightbulb text-warning"></i><span>${esc(x)}</span></div>`).join("");
  }

  function setWelcomeBanner(iconClass, welcomeHeading, messageHtml) {
    const el = document.getElementById("welcomeBar");
    if (!el) return;
    el.classList.remove("d-none");
    el.className = "alert alert-primary bg-white border border-primary-subtle shadow-sm p-3 rounded-3 mb-4";
    el.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <div class="rounded-circle bg-primary-subtle text-primary p-2 d-flex align-items-center justify-content-center" style="width: 44px; height: 44px; font-size: 1.25rem; flex-shrink: 0;">
          <i class="bi bi-${iconClass}"></i>
        </div>
        <div>
          <h2 class="h6 mb-1 text-dark fw-bold">${welcomeHeading}</h2>
          <p class="mb-0 text-secondary small">${messageHtml}</p>
        </div>
      </div>
    `;
  }

  // ─── Frame / Shell ────────────────────────────────────────────────────────────
  function renderFrame(role, user, vendorCount, poCount, contractCount, highCriticalCount) {
    const el = (id) => document.getElementById(id);
    const titles = {
      "Administrator": "Enterprise Command Center",
      "Procurement Manager": "Procurement Intelligence Center",
      "Supply Chain Manager": "Supply Chain Operations Center",
      "Finance Officer": "Finance & AP Control Center",
      "Vendor": "Vendor Performance Portal",
      "Auditor": "Compliance & Audit Console",
    };
    const subtitles = {
      "Administrator": "Full system governance, security oversight, and enterprise risk intelligence.",
      "Procurement Manager": "Live procurement value, active order pipeline, and supplier risk exposure.",
      "Supply Chain Manager": "On-time delivery rates, quality inspections, and supplier continuity.",
      "Finance Officer": "AP aging, invoice management, budget utilization, and payment workflows.",
      "Vendor": "Your operational scorecard, PO commitments, and payment status.",
      "Auditor": "Governance traceability, audit event timeline, and compliance tracking.",
    };
    if (el("roleEyebrow")) el("roleEyebrow").textContent = role.toUpperCase() + " WORKSPACE";
    if (el("dashboardTitle")) el("dashboardTitle").textContent = titles[role] || `${role} Dashboard`;
    if (el("navUserName")) el("navUserName").textContent = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    if (el("navInitials")) el("navInitials").textContent = `${(user.first_name || "U")[0]}${(user.last_name || "")[0] || ""}`;
    if (el("heroPanel")) el("heroPanel").innerHTML = `
      <div>
        <p class="eyebrow">${esc(role)} WORKSPACE</p>
        <h2>${esc(titles[role] || role)}</h2>
        <p>${esc(subtitles[role] || "")} Live intelligence from ${vendorCount} vendors, ${poCount} purchase orders and ${contractCount} contracts.</p>
      </div>
      <div class="hero-risk"><span>${highCriticalCount}</span><small>High / critical vendors</small></div>`;

    if (window.VendorIQNavigation) {
      window.VendorIQNavigation.render("#roleSidebar", user, [role], "dashboard.html");
    }
  }

  // ─── ROLE: ADMINISTRATOR ──────────────────────────────────────────────────────
  async function renderAdmin(d, user) {
    // Fetch new analytics endpoints
    const [analytics, financial] = await Promise.allSettled([
      req("/audit-logs/analytics?days=30"),
      req("/invoices/analytics/financial-summary"),
    ]);
    const auditData = analytics.status === "fulfilled" ? analytics.value : { total_events: 0, unique_users: 0, timeline: [], actions: [], entities: [] };
    const finData = financial.status === "fulfilled" ? financial.value : { total_po_spend: 0, spend_by_category: [] };

    const riskDist = d.riskSummary.risk_distribution || {};
    const highCrit = (riskDist["High Risk"] || 0) + (riskDist["Critical Risk"] || 0);

    setWelcomeBanner(
      "shield-lock-fill",
      `Welcome back, ${esc(user.first_name || "Administrator")}! 👋`,
      `System governance and security oversight active across <strong>${d.users.length} active users</strong>, <strong>${highCrit} high/critical risk suppliers</strong> needing governance, and <strong>${auditData.total_events.toLocaleString()} audit events</strong> logged in the past 30 days.`
    );

    $("#kpiGrid").innerHTML = [
      kpiCard("Total System Users", d.users.length, "Active accounts", "blue", "people", "users.html"),
      kpiCard("Total Vendors", d.vendors.total, "Onboarded suppliers", "purple", "buildings", "vendors.html"),
      kpiCard("High/Critical Risk", highCrit, "Needs governance", "red", "exclamation-octagon", "vendors.html"),
      kpiCard("Audit Events (30d)", auditData.total_events, "System-wide events", "amber", "journal-text", "audit-logs.html"),
      kpiCard("Purchase Orders", d.pos.length, "Committed spend", "blue", "receipt", "purchase-orders.html"),
      kpiCard("Total PO Spend", money(finData.total_po_spend), "Committed value", "green", "cash-stack", "procurement-risk.html"),
      kpiCard("Unique Active Users", auditData.unique_users, "Users with audit events", "purple", "person-check", "users.html"),
      kpiCard("Contracts", d.contracts.length, "Portfolio", "amber", "file-earmark-text", "contracts.html"),
    ].join("");

    $("#quickActions").innerHTML = `<a href="users.html">Manage users</a><a href="audit-logs.html">Audit logs</a><a href="vendors.html">Vendor registry</a><a href="risk-alerts.html">Risk alerts</a>`;
    $("#chartGrid").innerHTML = chartGrid(["c1", "c2", "c3", "c4"]);

    // Risk distribution doughnut
    const riskLabels = Object.keys(riskDist);
    const riskVals = Object.values(riskDist);
    drawChart("c1", "doughnut", "Vendor Risk Distribution", riskLabels, riskVals,
      riskLabels.map((k) => RISK_COLORS[k] || "#94a3b8"), false);

    // Audit event timeline (real chronological from analytics endpoint)
    const tl = auditData.timeline || [];
    drawChart("c2", "bar", "Audit Event Timeline (30d)",
      tl.map((x) => x.date), tl.map((x) => x.count), "#6366f1");

    // Top actions distribution
    const acts = auditData.actions || [];
    drawChart("c3", "bar", "Top Audit Action Categories",
      acts.slice(0, 10).map((a) => a.action), acts.slice(0, 10).map((a) => a.count),
      PALETTE.slice(0, acts.length));

    // Spend by category
    const cats = finData.spend_by_category || [];
    drawChart("c4", "doughnut", "PO Spend by Category",
      cats.slice(0, 8).map((c) => c.category), cats.slice(0, 8).map((c) => c.amount),
      PALETTE.slice(0, cats.length), false);

    setTable("Recent Audit Events", "audit-logs.html",
      ["Action", "Entity", "Entity ID", "Timestamp"],
      (auditData.recent_entries || d.audits).slice(0, 12).map((a) =>
        `<tr><td>${esc(a.action)}</td><td>${esc(a.entity)}</td><td class="text-muted">#${a.entity_id || "—"}</td><td>${new Date(a.created_at).toLocaleString()}</td></tr>`
      ).join(""));

    setInsights([
      `${highCrit} vendors in High/Critical risk tier — review and assign corrective action plans.`,
      `${auditData.total_events.toLocaleString()} audit events across ${auditData.unique_users} unique users in the last 30 days.`,
      "Validate all Administrator accounts are provisioned internally — self-registration is blocked.",
    ]);
  }

  // ─── ROLE: PROCUREMENT MANAGER ────────────────────────────────────────────────
  async function renderProcurement(d, user) {
    const [financial] = await Promise.allSettled([
      req("/invoices/analytics/financial-summary"),
    ]);
    const finData = financial.status === "fulfilled" ? financial.value : { total_po_spend: 0, spend_by_vendor: [], spend_by_category: [], monthly_trend: [] };

    const activePOs = d.pos.filter((p) =>
      ["Created","Sent","Accepted","In Progress","Processing","Ready for Shipment","Shipped","Delivered"].includes(p.status));
    const delayedPOs = activePOs.filter((p) => p.expected_delivery_date && new Date(p.expected_delivery_date) < new Date());
    const vendorMap = {};
    d.vendorItems.forEach((v) => { vendorMap[v.id] = v; });
    const atRisk = activePOs.filter((p) => ["High Risk","Critical Risk"].includes(vendorMap[p.vendor_id]?.risk_category));
    const pendingApprovals = d.requests.filter((r) => r.status === "Pending Approval");

    setWelcomeBanner(
      "cart-check-fill",
      `Welcome back, ${esc(user.first_name || "Procurement Manager")}! 👋`,
      `You have <strong>${pendingApprovals.length} procurement requests</strong> awaiting approval, <strong>${activePOs.length} active purchase orders</strong> (${delayedPOs.length} delayed past expected date), and <strong>${atRisk.length} POs</strong> assigned to high-risk suppliers.`
    );

    $("#kpiGrid").innerHTML = [
      kpiCard("Total PO Spend", money(finData.total_po_spend), "Committed value", "blue", "cash-stack", "purchase-orders.html"),
      kpiCard("Active POs", activePOs.length, "Open commitments", "purple", "receipt", "purchase-orders.html"),
      kpiCard("Delayed POs", delayedPOs.length, "Past expected delivery", "red", "truck", "procurement-risk.html"),
      kpiCard("At-Risk POs", atRisk.length, "High/critical suppliers", "red", "exclamation-octagon", "procurement-risk.html"),
      kpiCard("Pending Approvals", pendingApprovals.length, "Awaiting Finance", "amber", "clipboard-check", "procurement-requests.html"),
      kpiCard("Total Vendors", d.vendors.total, "Supplier network", "blue", "buildings", "vendors.html"),
    ].join("");

    $("#quickActions").innerHTML = `<a href="procurement-requests.html">New procurement request</a><a href="purchase-orders.html">Active purchase orders</a><a href="vendors.html">Vendor risk overview</a><a href="vendor-comparison.html">Compare vendors</a>`;
    $("#chartGrid").innerHTML = chartGrid(["c1", "c2", "c3", "c4"]);

    // Spend by vendor (top 10)
    const byVendor = finData.spend_by_vendor || [];
    drawChart("c1", "bar", "PO Spend by Top Vendors",
      byVendor.slice(0, 10).map((v) => v.vendor_name), byVendor.slice(0, 10).map((v) => v.amount), "#6366f1");

    // PO Status distribution
    const stCounts = {};
    d.pos.forEach((p) => { stCounts[p.status] = (stCounts[p.status] || 0) + 1; });
    drawChart("c2", "doughnut", "PO Status Distribution",
      Object.keys(stCounts), Object.values(stCounts),
      Object.keys(stCounts).map((s) => STATUS_COLORS[s] || "#94a3b8"), false);

    // Monthly PO spend trend
    const monthly = finData.monthly_trend || [];
    drawChart("c3", "line", "Monthly PO Spend Trend",
      monthly.map((m) => m.month), monthly.map((m) => m.amount), "#6366f1");

    // Spend by Category
    const byCat = finData.spend_by_category || [];
    drawChart("c4", "doughnut", "Spend by Vendor Category",
      byCat.slice(0, 8).map((c) => c.category), byCat.slice(0, 8).map((c) => c.amount),
      PALETTE.slice(0, byCat.length), false);

    setTable("At-Risk Purchase Orders", "purchase-orders.html",
      ["Vendor", "PO Number", "Value", "Expected Delivery", "Vendor Risk", ""],
      atRisk.slice(0, 12).map((p) => {
        const v = vendorMap[p.vendor_id];
        return `<tr>
          <td><strong>${esc(v?.company_name || "Unknown")}</strong></td>
          <td class="font-monospace">${esc(p.po_number)}</td>
          <td>${moneyFull(p.total_amount)}</td>
          <td>${esc(p.expected_delivery_date)}</td>
          <td>${riskBadge(v?.risk_category || "")}</td>
          <td><a href="purchase-order-details.html?id=${p.id}" class="btn btn-sm btn-outline-primary">Review</a></td></tr>`;
      }).join(""));

    setInsights([
      `${delayedPOs.length} purchase orders are past their expected delivery date — escalate suppliers immediately.`,
      `${atRisk.length} active POs are with High/Critical risk suppliers — assess contingency sourcing.`,
      `${pendingApprovals.length} procurement requests pending Finance approval — follow up to unblock workflows.`,
    ]);
  }

  // ─── ROLE: SUPPLY CHAIN MANAGER ──────────────────────────────────────────────
  async function renderSupplyChain(d, user) {
    const [riskTrend] = await Promise.allSettled([req("/vendors/risk/history-trend")]);
    const trendData = riskTrend.status === "fulfilled" ? riskTrend.value : { daily_trend: [], history_by_category: {} };

    const ops = d.operations;
    const vendorItems = d.vendorItems;

    setWelcomeBanner(
      "truck-front-fill",
      `Welcome back, ${esc(user.first_name || "Supply Chain Manager")}! 👋`,
      `Operational tracking shows an on-time delivery rate of <strong>${pct(ops.on_time_delivery_rate)}</strong>, with <strong>${ops.late_deliveries || 0} late deliveries</strong>, <strong>${ops.sla_violations || 0} SLA violations</strong>, and <strong>${ops.quality_distribution?.Failed || 0} quality inspection rejections</strong> requiring receiving action.`
    );

    $("#kpiGrid").innerHTML = [
      kpiCard("On-Time Delivery", ops.on_time_delivery_rate !== null ? pct(ops.on_time_delivery_rate) : "N/A", "From completed receipts", "green", "check2-circle", "purchase-orders.html"),
      kpiCard("Late Deliveries", ops.late_deliveries || 0, "Past expected date", "red", "truck", "procurement-risk.html"),
      kpiCard("SLA Violations", ops.sla_violations || 0, "Recorded breaches", "amber", "exclamation-triangle", "risk-alerts.html"),
      kpiCard("Quality: Passed", ops.quality_distribution?.Passed || 0, "QA inspections passed", "green", "patch-check", "purchase-orders.html"),
      kpiCard("Quality: Conditional", ops.quality_distribution?.Conditional || 0, "Conditional acceptance", "amber", "patch-exclamation", "purchase-orders.html"),
      kpiCard("Quality: Failed", ops.quality_distribution?.Failed || 0, "QA rejections", "red", "x-octagon", "purchase-orders.html"),
    ].join("");

    $("#quickActions").innerHTML = `<a href="purchase-orders.html">Record delivery receipt</a><a href="vendors.html">Vendor reliability</a><a href="risk-alerts.html">SLA alerts</a><a href="vendor-dependency.html">Critical vendor map</a>`;
    $("#chartGrid").innerHTML = chartGrid(["c1", "c2", "c3", "c4"]);

    // Reliability trend by day from history
    const dailyTrend = trendData.daily_trend || [];
    drawChart("c1", "line", "Average Reliability Score Trend",
      dailyTrend.map((d) => d.date), dailyTrend.map((d) => d.avg_score || 0), "#10b981");

    // Quality distribution (no duplicate chart)
    const qd = ops.quality_distribution || { Passed: 0, Conditional: 0, Failed: 0 };
    drawChart("c2", "doughnut", "Quality Inspection Outcomes",
      Object.keys(qd), Object.values(qd), ["#10b981", "#f59e0b", "#ef4444"], false);

    // Risk category distribution from history
    const histByCat = trendData.history_by_category || {};
    drawChart("c3", "bar", "Historical Risk Tier Distribution",
      Object.keys(histByCat), Object.values(histByCat),
      Object.keys(histByCat).map((k) => RISK_COLORS[k] || "#94a3b8"));

    // Vendor reliability scores (top 10 by score)
    const rated = vendorItems.filter((v) => v.reliability_score !== null).sort((a, b) => Number(b.reliability_score) - Number(a.reliability_score));
    drawChart("c4", "bar", "Top Vendor Reliability Scores",
      rated.slice(0, 10).map((v) => v.company_name.split(" ").slice(0, 2).join(" ")),
      rated.slice(0, 10).map((v) => Number(v.reliability_score)), "#6366f1");

    // Deteriorating vendors table
    const deteriorating = vendorItems.filter((v) =>
      v.risk_category === "High Risk" || v.risk_category === "Critical Risk");
    setTable("Vendors Requiring Delivery Attention", "vendors.html",
      ["Vendor", "Reliability Score", "Risk Tier", "Category", ""],
      deteriorating.slice(0, 12).map((v) =>
        `<tr>
          <td><strong>${esc(v.company_name)}</strong></td>
          <td>${v.reliability_score !== null ? Number(v.reliability_score).toFixed(1) + "%" : "Unrated"}</td>
          <td>${riskBadge(v.risk_category || "Not Yet Rated")}</td>
          <td>${esc(v.category?.name || "")}</td>
          <td><a href="vendor-details.html?id=${v.id}" class="btn btn-sm btn-outline-primary">Investigate</a></td></tr>`
      ).join(""));

    setInsights([
      `On-time delivery rate is ${pct(ops.on_time_delivery_rate)} — benchmark target is 90%+.`,
      `${ops.sla_violations || 0} SLA violations recorded — review with each supplier and update performance contracts.`,
      `${ops.quality_distribution?.Failed || 0} quality inspection failures — escalate to root-cause analysis.`,
    ]);
  }

  // ─── ROLE: FINANCE OFFICER ────────────────────────────────────────────────────
  async function renderFinance(d, user) {
    const [financial] = await Promise.allSettled([req("/invoices/analytics/financial-summary")]);
    const fin = financial.status === "fulfilled" ? financial.value : {
      total_po_spend: 0, total_invoiced: 0, total_paid: 0,
      pending_invoices_count: 0, pending_invoices_amount: 0,
      spend_by_category: [], ap_aging: {}, payment_methods: [], monthly_trend: [],
    };

    const pendingRequests = d.requests.filter((r) => r.status === "Pending Approval");
    const budgetUtilizationPct = fin.total_po_spend > 0 ? ((fin.total_invoiced / fin.total_po_spend) * 100).toFixed(1) : 0;

    setWelcomeBanner(
      "cash-coin",
      `Welcome back, ${esc(user.first_name || "Finance Officer")}! 👋`,
      `You have <strong>${fin.pending_invoices_count || 0} invoices awaiting approval</strong> (${money(fin.pending_invoices_amount || 0)}), <strong>${pendingRequests.length} procurement requests</strong> pending financial decision, and <strong>${money(fin.total_paid || 0)}</strong> in settled vendor payments.`
    );

    $("#kpiGrid").innerHTML = [
      kpiCard("Total PO Spend", money(fin.total_po_spend), "Committed procurement value", "blue", "cash-stack", "purchase-orders.html"),
      kpiCard("Total Invoiced", money(fin.total_invoiced), "Supplier billings", "purple", "receipt", "invoices-payments.html"),
      kpiCard("Total Paid", money(fin.total_paid), "Settled payments", "green", "check-circle", "invoices-payments.html"),
      kpiCard("Pending Invoices", fin.pending_invoices_count, "Awaiting review/payment", "amber", "hourglass-split", "invoices-payments.html"),
      kpiCard("PR Approvals Queue", pendingRequests.length, "Awaiting Finance decision", "red", "clipboard-check", "procurement-requests.html"),
      kpiCard("Budget Utilization", `${budgetUtilizationPct}%`, "Invoiced vs PO spend", "blue", "pie-chart", "procurement-risk.html"),
    ].join("");

    $("#quickActions").innerHTML = `<a href="invoices-payments.html">Invoice review queue</a><a href="procurement-requests.html">PR approvals</a><a href="purchase-orders.html">PO overview</a><a href="vendors.html">Vendor financial risk</a>`;
    $("#chartGrid").innerHTML = chartGrid(["c1", "c2", "c3", "c4"]);

    // Spend by category donut
    const cats = fin.spend_by_category || [];
    drawChart("c1", "doughnut", "PO Spend by Category",
      cats.slice(0, 8).map((c) => c.category), cats.slice(0, 8).map((c) => c.amount),
      PALETTE.slice(0, cats.length), false);

    // AP Aging horizontal
    const aging = fin.ap_aging || {};
    drawChart("c2", "bar", "Accounts Payable Aging",
      Object.keys(aging), Object.values(aging),
      ["#10b981", "#f59e0b", "#ef4444", "#7f1d1d"]);

    // Monthly PO spend trend
    const monthly = fin.monthly_trend || [];
    drawChart("c3", "line", "Monthly Committed Spend Trend",
      monthly.map((m) => m.month), monthly.map((m) => m.amount), "#6366f1");

    // Payment methods breakdown
    const methods = fin.payment_methods || [];
    drawChart("c4", "doughnut", "Payment Methods Distribution",
      methods.map((m) => m.method || "Unknown"), methods.map((m) => m.amount),
      PALETTE.slice(0, methods.length), false);

    // Invoice queue table
    const invoicesByStatus = fin.invoices_by_status || {};
    const pendingStatuses = ["Submitted", "Under Review", "Approved", "Payment Pending"];
    setTable("Invoice Review Queue", "invoices-payments.html",
      ["Status", "Invoice Count", "Total Amount", ""],
      pendingStatuses.map((s) => {
        const entry = invoicesByStatus[s] || { count: 0, amount: 0 };
        return `<tr>
          <td>${statusBadge(s)}</td>
          <td><strong>${entry.count}</strong></td>
          <td>${moneyFull(entry.amount)}</td>
          <td>${entry.count > 0 ? `<a href="invoices-payments.html" class="btn btn-sm btn-outline-primary">Review</a>` : "<span class='text-muted small'>Clear</span>"}</td></tr>`;
      }).join(""));

    setInsights([
      `${fin.pending_invoices_count} invoices awaiting Finance review — process before payment terms expire.`,
      `${pendingRequests.length} procurement requests pending approval — clear queue to unblock purchase orders.`,
      `AP aging analysis: ₹${((aging["90+"] || 0) / 1000000).toFixed(2)}M overdue beyond 90 days — escalate payment.`,
    ]);
  }

  // ─── ROLE: VENDOR ─────────────────────────────────────────────────────────────
  async function renderVendor(d, user) {
    const vendorId = user.vendor_id;
    if (!vendorId) {
      $("#heroPanel").innerHTML = `<div class="alert alert-warning mb-0">
        <h2 class="h5">Vendor account not linked</h2>
        <p class="mb-0">This account is not linked to a vendor company. Please contact your Procurement Manager or Administrator to link your supplier profile.</p></div>`;
      return;
    }

    // Fetch vendor-specific data — NEVER includes internal buyer risk/dependency scores
    const [reliability] = await Promise.allSettled([
      req(`/vendors/${vendorId}/reliability/history?limit=12`),
    ]);
    const history = reliability.status === "fulfilled" ? reliability.value : [];

    const myVendor = d.vendorItems.find((v) => Number(v.id) === Number(vendorId));
    const myPOs = d.pos.filter((p) => Number(p.vendor_id) === Number(vendorId));
    const myContracts = d.contracts.filter((c) => Number(c.vendor_id) === Number(vendorId));
    const myInvoices = d.invoices.filter((i) => Number(i.vendor_id) === Number(vendorId));

    const activePOs = myPOs.filter((p) => !["Completed", "Cancelled", "Rejected"].includes(p.status));
    const pendingInvoices = myInvoices.filter((i) => !["Paid", "Cancelled", "Rejected"].includes(i.status));
    const paidInvoices = myInvoices.filter((i) => i.status === "Paid");
    const paidAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    // Supplier-facing scorecard only — internal buyer metrics are MASKED
    const reliabilityScore = myVendor?.reliability_score !== null && myVendor?.reliability_score !== undefined
      ? Number(myVendor.reliability_score).toFixed(1) + "%" : "Not Yet Rated";
    const riskTier = myVendor?.risk_category || "Not Yet Rated";

    setWelcomeBanner(
      "building-fill-check",
      `Welcome back, ${esc(user.first_name || "Supplier Partner")}! 👋`,
      `Your supplier portal shows <strong>${activePOs.length} active purchase orders</strong> in fulfillment and <strong>${pendingInvoices.length} pending invoices</strong> awaiting payment.`
    );

    $("#kpiGrid").innerHTML = [
      kpiCard("My Reliability Score", reliabilityScore, "Calculated from my operations", "blue", "speedometer2", "#"),
      kpiCard("My Risk Tier", riskTier, "Supplier assessment", riskTier.includes("Low") ? "green" : riskTier.includes("Critical") ? "red" : "amber", "shield", "#"),
      kpiCard("My Active POs", activePOs.length, "Current delivery commitments", "purple", "receipt", "purchase-orders.html"),
      kpiCard("Pending Invoices", pendingInvoices.length, "Awaiting review/payment", "amber", "receipt", "invoices-payments.html"),
      kpiCard("Total Paid", money(paidAmount), "Settled by buyer", "green", "cash-coin", "invoices-payments.html"),
      kpiCard("My Contracts", myContracts.length, "Active agreements", "blue", "file-earmark-text", "contracts.html"),
    ].join("");

    $("#quickActions").innerHTML = `<a href="purchase-orders.html">My delivery commitments</a><a href="invoices-payments.html">Submit invoice</a><a href="contracts.html">My contracts</a><a href="profile.html">My profile</a>`;
    $("#chartGrid").innerHTML = chartGrid(["c1", "c2", "c3"]);

    // Reliability score trend
    const histReversed = history.slice().reverse();
    drawChart("c1", "line", "My Reliability Score History",
      histReversed.map((h) => new Date(h.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })),
      histReversed.map((h) => Number(h.score || 0)), "#6366f1");

    // My PO status breakdown
    const stCounts = {};
    myPOs.forEach((p) => { stCounts[p.status] = (stCounts[p.status] || 0) + 1; });
    drawChart("c2", "doughnut", "My PO Status Breakdown",
      Object.keys(stCounts), Object.values(stCounts),
      Object.keys(stCounts).map((s) => STATUS_COLORS[s] || "#94a3b8"), false);

    // Supplier-visible performance metrics only (OTD, QAR, OFR) — NO internal buyer risk scores
    const latestHistory = history[0] || {};
    drawChart("c3", "bar", "My Performance Metrics (Supplier View)",
      ["On-Time Delivery", "Quality Acceptance", "Order Fulfillment", "Contract Compliance", "Communication"],
      [
        Number(latestHistory.on_time_delivery_rate || 0),
        Number(latestHistory.quality_acceptance_rate || 0),
        Number(latestHistory.purchase_order_performance_rate || 0),
        Number(latestHistory.contract_compliance_rate || 0),
        Number(latestHistory.communication_response_rate || 0),
      ], PALETTE.slice(0, 5));

    // My delivery commitments
    setTable("My Current Delivery Commitments", "purchase-orders.html",
      ["PO Number", "Expected Delivery", "Status", "Value", ""],
      myPOs.slice(0, 12).map((p) =>
        `<tr>
          <td class="font-monospace"><strong>${esc(p.po_number)}</strong></td>
          <td>${esc(p.expected_delivery_date)}</td>
          <td>${statusBadge(p.status)}</td>
          <td>${moneyFull(p.total_amount)}</td>
          <td><a href="purchase-order-details.html?id=${p.id}" class="btn btn-sm btn-outline-primary">View</a></td></tr>`
      ).join(""));

    setInsights([
      "Update delivery milestones as they occur to keep your reliability score accurate.",
      "Submit invoices only after physical receipt and quality inspection are completed by the buyer.",
      "Stay responsive to procurement communications to maintain your communication score.",
    ]);
  }

  // ─── ROLE: AUDITOR ────────────────────────────────────────────────────────────
  async function renderAuditor(d, user) {
    const [auditAnalytics, riskTrend] = await Promise.allSettled([
      req("/audit-logs/analytics?days=30"),
      req("/vendors/risk/history-trend?limit=50"),
    ]);
    const audit = auditAnalytics.status === "fulfilled" ? auditAnalytics.value : { total_events: 0, unique_users: 0, timeline: [], actions: [], entities: [] };
    const trend = riskTrend.status === "fulfilled" ? riskTrend.value : { daily_trend: [], history_by_category: {}, total_evaluations: 0, transitions: [] };

    const riskDist = d.riskSummary.risk_distribution || {};
    const nonCompliantContracts = d.contracts.filter((c) => c.compliance_status === "Non-Compliant");

    setWelcomeBanner(
      "journal-check",
      `Welcome back, ${esc(user.first_name || "Auditor")}! 👋`,
      `Compliance monitoring reports <strong>${nonCompliantContracts.length} non-compliant contracts</strong>, <strong>${trend.total_evaluations || 0} vendor risk evaluations</strong>, and <strong>${audit.total_events.toLocaleString()} system audit events</strong> ready for verification.`
    );

    $("#kpiGrid").innerHTML = [
      kpiCard("Audit Events (30d)", audit.total_events, "System-wide events", "blue", "journal-text", "audit-logs.html"),
      kpiCard("Unique Users Tracked", audit.unique_users, "Users with audit events", "purple", "people", "users.html"),
      kpiCard("Total Evaluations", trend.total_evaluations, "Reliability recalculations", "blue", "arrow-repeat", "#"),
      kpiCard("Non-Compliant Contracts", nonCompliantContracts.length, "Compliance exceptions", "red", "file-earmark-x", "contracts.html"),
      kpiCard("High/Critical Vendors", (riskDist["High Risk"] || 0) + (riskDist["Critical Risk"] || 0), "Risk oversight", "red", "shield-exclamation", "vendors.html"),
      kpiCard("Total Vendors Tracked", d.vendors.total, "Full vendor registry", "blue", "buildings", "vendors.html"),
    ].join("");

    $("#quickActions").innerHTML = `<a href="audit-logs.html">Search audit logs</a><a href="vendors.html">Vendor risk registry</a><a href="contracts.html">Compliance review</a><a href="vendor-dependency.html">Risk history</a>`;
    $("#chartGrid").innerHTML = chartGrid(["c1", "c2", "c3", "c4"]);

    // Chronological audit event timeline
    const tl = audit.timeline || [];
    drawChart("c1", "line", "Audit Event Activity Timeline (30 Days)",
      tl.map((x) => x.date), tl.map((x) => x.count), "#6366f1");

    // Action distribution
    const acts = audit.actions || [];
    drawChart("c2", "bar", "Audit Actions Distribution",
      acts.slice(0, 10).map((a) => a.action), acts.slice(0, 10).map((a) => a.count),
      PALETTE.slice(0, acts.length));

    // Risk tier distribution (current state)
    const riskLabels = Object.keys(riskDist);
    drawChart("c3", "doughnut", "Current Vendor Risk Distribution",
      riskLabels, riskLabels.map((k) => riskDist[k]),
      riskLabels.map((k) => RISK_COLORS[k] || "#94a3b8"), false);

    // Historical risk evaluations daily trend
    const dailyTrend = trend.daily_trend || [];
    drawChart("c4", "line", "Reliability Evaluation Frequency",
      dailyTrend.map((x) => x.date), dailyTrend.map((x) => x.evaluations_count), "#10b981");

    // Recent risk transitions table
    const transitions = trend.transitions || [];
    setTable("Recent Vendor Risk Transitions", "vendor-dependency.html",
      ["Vendor", "Score", "Risk Tier", "OTD Rate", "Quality Rate", "Evaluated"],
      transitions.slice(0, 12).map((t) =>
        `<tr>
          <td><strong>${esc(t.vendor_name)}</strong></td>
          <td>${t.score !== null ? Number(t.score).toFixed(1) + "%" : "—"}</td>
          <td>${riskBadge(t.risk_category || "Not Yet Rated")}</td>
          <td>${t.on_time_delivery_rate !== null ? Number(t.on_time_delivery_rate).toFixed(1) + "%" : "—"}</td>
          <td>${t.quality_acceptance_rate !== null ? Number(t.quality_acceptance_rate).toFixed(1) + "%" : "—"}</td>
          <td class="text-muted">${new Date(t.created_at).toLocaleString()}</td></tr>`
      ).join(""));

    setInsights([
      `${audit.total_events.toLocaleString()} total audit events in the last 30 days across ${audit.unique_users} users — normal activity range.`,
      `${nonCompliantContracts.length} contracts flagged as non-compliant — verify renewal or remediation status.`,
      `${trend.total_evaluations} supplier reliability evaluations recorded — check for anomalous score shifts.`,
    ]);
  }

  // ─── Main Data Loader ─────────────────────────────────────────────────────────
  async function loadAllData(role) {
    const toList = (val) => Array.isArray(val) ? val : (val && Array.isArray(val.items) ? val.items : []);

    if (role === "Vendor") {
      const results = await Promise.allSettled([
        req("/vendors?page=1&page_size=100"),
        req("/purchase-orders"),
        req("/contracts"),
        req("/invoices"),
      ]);
      const get = (i, def) => results[i]?.status === "fulfilled" ? results[i].value : def;
      const vendorPage = get(0, { items: [], total: 0 });
      return {
        vendors: vendorPage,
        vendorItems: vendorPage.items || [],
        pos: toList(get(1, [])),
        contracts: toList(get(2, [])),
        requests: [],
        operations: { on_time_delivery_rate: null, late_deliveries: 0, sla_violations: 0, quality_distribution: {} },
        riskSummary: { total_vendors: 0, rated_vendors: 0, risk_distribution: {} },
        invoices: toList(get(3, [])),
        users: [],
        audits: [],
      };
    }

    const calls = [
      req("/vendors?page=1&page_size=100"),        // 0: vendor page
      req("/purchase-orders"),                     // 1: all POs
      req("/contracts"),                           // 2: all contracts
      req("/procurement-requests"),                // 3: all requests
      req("/purchase-orders/operations/summary"),  // 4: operational summary
      req("/vendors/performance/summary"),         // 5: risk distribution
      req("/invoices"),                            // 6: invoices
    ];

    if (role === "Administrator") calls.push(req("/users?page_size=100")); // 7
    if (role === "Administrator" || role === "Auditor") {
      calls.push(req("/audit-logs?page_size=50")); // 7 or 8
    }

    const results = await Promise.allSettled(calls);
    const get = (i, def) => results[i]?.status === "fulfilled" ? results[i].value : def;

    const vendorPage = get(0, { items: [], total: 0 });
    const auditsIdx = role === "Administrator" ? 8 : 7;

    return {
      vendors: vendorPage,
      vendorItems: vendorPage.items || [],
      pos: toList(get(1, [])),
      contracts: toList(get(2, [])),
      requests: toList(get(3, [])),
      operations: get(4, { on_time_delivery_rate: null, late_deliveries: 0, sla_violations: 0, quality_distribution: {} }),
      riskSummary: get(5, { total_vendors: 0, rated_vendors: 0, risk_distribution: {} }),
      invoices: toList(get(6, [])),
      users: role === "Administrator" ? toList(get(7, { items: [] })) : [],
      audits: (role === "Administrator" || role === "Auditor") ? toList(get(auditsIdx, { items: [] })) : [],
    };
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────
  async function init() {
    if (!api || !auth || !auth.requireAuthentication()) return;
    try {
      await window.VendorIQNavigationReady;
      const user = auth.setUser(await req("/auth/me"));
      const role = auth.getRoleNames(user)[0] || "Vendor";

      const d = await loadAllData(role);
      const highCrit = (d.riskSummary.risk_distribution?.["High Risk"] || 0) + (d.riskSummary.risk_distribution?.["Critical Risk"] || 0);

      renderFrame(role, user, d.vendors.total || d.vendorItems.length, d.pos.length, d.contracts.length, highCrit);

      destroyCharts();

      if (role === "Administrator") await renderAdmin(d, user);
      else if (role === "Procurement Manager") await renderProcurement(d, user);
      else if (role === "Supply Chain Manager") await renderSupplyChain(d, user);
      else if (role === "Finance Officer") await renderFinance(d, user);
      else if (role === "Vendor") await renderVendor(d, user);
      else if (role === "Auditor") await renderAuditor(d, user);

      const updatedAt = document.getElementById("updatedAt");
      if (updatedAt) updatedAt.textContent = `Live data · ${new Date().toLocaleTimeString()}`;

      const logout = document.getElementById("logoutButton");
      if (logout) logout.onclick = () => { auth.clearSession(); location.replace("login.html"); };

      const toggleBtn = document.getElementById("sidebarToggle");
      const sidebar = document.getElementById("roleSidebar");
      if (toggleBtn && sidebar) {
        toggleBtn.onclick = () => sidebar.classList.toggle("is-open");
        sidebar.addEventListener("click", (e) => {
          if (e.target.closest('[data-action="close-menu"]')) sidebar.classList.remove("is-open");
        });
      }

      const errEl = document.getElementById("dashboardError");
      if (errEl) errEl.classList.add("d-none");

    } catch (e) {
      console.error("[VendorIQ Dashboard]", e);
      if (e instanceof api.ApiError && e.status === 401) {
        auth.clearSession();
        auth.redirectToLogin();
        return;
      }
      const errEl = document.getElementById("dashboardError");
      if (errEl) {
        errEl.textContent = e.message || "Unable to load dashboard intelligence. Please refresh or log in again.";
        errEl.classList.remove("d-none");
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
