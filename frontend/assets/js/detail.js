(() => {
  "use strict";

  const api = window.VendorIQApi;
  const auth = window.VendorIQAuth;
  const page = document.body.dataset.detail;
  const $ = (selector) => document.querySelector(selector);

  const configs = {
    vendor: { title: "Vendor Intelligence Profile", path: "/vendors", allowed: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor", "Vendor"] },
    procurement: { title: "Procurement request", path: "/procurement-requests", allowed: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Auditor"] },
    purchaseOrder: { title: "Purchase order", path: "/purchase-orders", allowed: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Vendor", "Auditor"] },
    contract: { title: "Contract details", path: "/contracts", allowed: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Vendor", "Auditor"] },
    profile: { title: "My profile", path: "/auth/me", allowed: ["Administrator", "Procurement Manager", "Supply Chain Manager", "Finance Officer", "Vendor", "Auditor"] }
  };

  const config = configs[page];
  const esc = (value) => String(value ?? "—").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const date = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : "—";
  const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
  const badge = (value) => `<span class="status-badge status-${String(value || "pending").toLowerCase().replaceAll(" ", "-")}">${esc(value)}</span>`;
  const request = (path) => api.request(path, { token: auth.getAccessToken() });

  function showError(message) {
    $("#detailContent").innerHTML = `<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><h2>Unable to load this record</h2><p>${esc(message)}</p><a class="btn btn-primary" href="dashboard.html">Return to dashboard</a></div>`;
  }

  function renderVendorCompanyProfile(vendor) {
    const contacts = Array.isArray(vendor.contacts) ? vendor.contacts : [];
    return `<div class="detail-panel"><p class="eyebrow text-primary">MY VENDOR COMPANY</p><h1>${esc(vendor.company_name)}</h1><div class="row g-3 mb-4"><div class="col-md-4"><span class="detail-label">Vendor ID</span><strong>#${esc(vendor.id)}</strong></div><div class="col-md-4"><span class="detail-label">Approval status</span>${badge(vendor.approval_status)}</div><div class="col-md-4"><span class="detail-label">Reliability</span><strong>${vendor.reliability_score == null ? "Not Yet Rated" : `${esc(vendor.reliability_score)}%`}</strong></div></div><div class="row g-4"><div class="col-lg-7"><h2 class="h5">Company information</h2><dl class="detail-grid"><dt>Registration number</dt><dd>${esc(vendor.registration_number)}</dd><dt>GST number</dt><dd>${esc(vendor.gst_number)}</dd><dt>Email</dt><dd>${esc(vendor.email)}</dd><dt>Phone</dt><dd>${esc(vendor.phone)}</dd><dt>Address</dt><dd>${esc(vendor.address)}, ${esc(vendor.city)}, ${esc(vendor.state)}, ${esc(vendor.country)} ${esc(vendor.postal_code)}</dd><dt>Website</dt><dd>${vendor.website ? `<a href="${esc(vendor.website)}" target="_blank" rel="noopener noreferrer">${esc(vendor.website)}</a>` : "—"}</dd></dl></div><div class="col-lg-5"><h2 class="h5">Contacts</h2>${contacts.length ? `<div class="list-group">${contacts.map((contact) => `<div class="list-group-item"><strong>${esc(contact.name)}</strong>${contact.designation ? `<div class="small text-muted">${esc(contact.designation)}</div>` : ""}<div class="small">${esc(contact.email)}${contact.phone ? ` · ${esc(contact.phone)}` : ""}</div></div>`).join("")}</div>` : '<p class="text-muted">No contact records are available.</p>'}</div></div></div>`;
  }

  function render(item, reliability = null, risk = null, history = [], purchaseOrders = [], contracts = [], categories = [], categoryVendors = [], invoices = [], roleNames = [], invoiceLoadError = "") {
    const categoryName = (id) => (categories.find((c) => c.id === id) || {}).name || id;

    if (page === "purchaseOrder") {
      const invoiceList = Array.isArray(invoices) ? invoices : [];
      const totalInvoiced = invoiceList.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
      const totalPaid = invoiceList.reduce((sum, invoice) => sum + (Array.isArray(invoice.payments) ? invoice.payments.reduce((paid, payment) => paid + Number(payment.amount || 0), 0) : 0), 0);
      const canOpenInvoiceWorkspace = roleNames.some((role) => ["Administrator", "Procurement Manager", "Finance Officer", "Auditor", "Vendor"].includes(role));
      const invoiceSummary = invoiceLoadError
        ? `<section class="dashboard-card mt-4"><h2 class="h5">Invoices & payments</h2><div class="alert alert-warning mb-0">${esc(invoiceLoadError)}</div></section>`
        : invoiceList.length
          ? `<section class="dashboard-card mt-4"><div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3"><div><h2 class="h5 mb-1">Invoices & payments</h2><p class="text-muted mb-0">${invoiceList.length} invoice${invoiceList.length === 1 ? "" : "s"} recorded against this purchase order.</p></div><div class="text-end"><strong>${money(totalInvoiced)}</strong><small class="d-block text-muted">${money(totalPaid)} paid</small></div></div><div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Invoice</th><th>Invoice date</th><th>Total</th><th>Status</th><th>Payment</th></tr></thead><tbody>${invoiceList.map((invoice) => { const paid = Array.isArray(invoice.payments) ? invoice.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) : 0; return `<tr><td><strong>${esc(invoice.invoice_number)}</strong></td><td>${date(invoice.invoice_date)}</td><td>${money(invoice.total_amount)}</td><td>${badge(invoice.status)}</td><td>${paid ? `${money(paid)} paid` : "Not paid"}</td></tr>`; }).join("")}</tbody></table></div></section>`
          : `<section class="dashboard-card mt-4"><h2 class="h5">Invoices & payments</h2><p class="text-muted mb-0">No invoices have been created for this purchase order.</p></section>`;

      return `<div class="detail-panel"><p class="eyebrow text-primary">PURCHASE ORDER</p><h1>${esc(item.po_number)}</h1><div class="row g-3 mb-4"><div class="col-md-4"><span class="detail-label">Status</span>${badge(item.status)}</div><div class="col-md-4"><span class="detail-label">Issue date</span><strong>${date(item.issue_date)}</strong></div><div class="col-md-4"><span class="detail-label">Expected delivery</span><strong>${date(item.expected_delivery_date)}</strong></div><div class="col-md-4"><span class="detail-label">Vendor ID</span><strong>#${esc(item.vendor_id)}</strong></div><div class="col-md-4"><span class="detail-label">Procurement request</span><strong>#${esc(item.procurement_request_id)}</strong></div><div class="col-md-4"><span class="detail-label">Total amount</span><strong>${money(item.total_amount)}</strong></div></div><h2 class="h5 mt-4">Order items</h2><div class="table-responsive"><table class="table"><thead><tr><th>Item</th><th>Quantity</th><th>Unit price</th><th>Subtotal</th></tr></thead><tbody>${(item.items || []).map((line) => `<tr><td>${esc(line.item_name)}</td><td>${esc(line.quantity)}</td><td>${money(line.unit_price)}</td><td>${money(line.subtotal)}</td></tr>`).join("")}</tbody></table></div><p class="mt-3 text-muted">Order attachments: Invoice file ${item.invoice_path ? "uploaded" : "not uploaded"} · Delivery proof ${item.delivery_proof_path ? "uploaded" : "not uploaded"}</p>${invoiceSummary}<div class="d-flex flex-wrap gap-2 mt-3"><a class="btn btn-primary btn-sm" href="po-fulfillment.html?id=${encodeURIComponent(item.id)}">Open fulfillment & receiving workflow</a>${canOpenInvoiceWorkspace ? `<a class="btn btn-outline-primary btn-sm" href="invoices-payments.html">Open invoices & payments</a>` : ""}</div></div>`;
    }

    if (page === "vendor") {
      const vendorId = item.id;
      const vendorPOs = purchaseOrders.filter(po => po.vendor_id === vendorId);
      const vendorContracts = contracts.filter(c => c.vendor_id === vendorId);
      const totalPOValue = vendorPOs.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);
      const poCount = vendorPOs.length;
      
      const calcTime = item.last_calculated_at ? new Date(item.last_calculated_at).toLocaleString() : "Not yet calculated";

      // 1. Alert Warnings & Trends (Section 9)
      let earlyWarningHtml = "";
      if (risk && risk.risk_trend === "↑ Increasing Risk") {
        earlyWarningHtml = `
          <div class="alert alert-danger border-start border-danger border-4 d-flex align-items-center gap-3 my-3">
            <i class="bi bi-exclamation-octagon-fill fs-4 text-danger"></i>
            <div>
              <strong>Early Warning:</strong> ${esc(risk.early_warning)}
            </div>
          </div>
        `;
      } else if (risk) {
        earlyWarningHtml = `
          <div class="alert alert-info d-flex align-items-center gap-3 my-3">
            <i class="bi bi-info-circle-fill fs-4 text-info"></i>
            <div>
              <strong>Risk Status:</strong> ${esc(risk.early_warning)}
            </div>
          </div>
        `;
      }

      // 2. Risk Drivers (Section 8)
      let driversHtml = "";
      if (risk && risk.overall_risk_score >= 50) {
        driversHtml = `
          <div class="card border-danger mb-4 shadow-sm">
            <div class="card-header bg-danger text-white">
              <h3 class="h6 mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i>Primary Risk Drivers</h3>
            </div>
            <div class="card-body bg-light-danger">
              <ul class="mb-0 text-danger-emphasis">
                ${risk.risk_explanation.split("\n").map(d => `<li>${esc(d)}</li>`).join("")}
              </ul>
            </div>
          </div>
        `;
      }

      // 3. Recommended Actions (Section 16)
      let recommendationsHtml = "";
      if (risk && risk.recommendations) {
        recommendationsHtml = `
          <div class="dashboard-card mb-4 border border-primary">
            <h3 class="h5 text-primary mb-3"><i class="bi bi-lightbulb-fill me-2"></i>Actionable Recommendations</h3>
            <ul class="list-group list-group-flush mb-0">
              ${risk.recommendations.map(rec => `<li class="list-group-item d-flex align-items-center gap-2 text-primary-emphasis"><i class="bi bi-arrow-right-short"></i> <strong>${esc(rec)}</strong></li>`).join("")}
            </ul>
          </div>
        `;
      }

      // 4. Comparison Table (Section 18)
      const alternates = categoryVendors.filter(v => v.id !== vendorId && v.approval_status === "Approved").slice(0, 3);
      let comparisonHtml = "";
      if (alternates.length) {
        comparisonHtml = `
          <div class="dashboard-card mt-4">
            <h3 class="h5 mb-3"><i class="bi bi-arrow-left-right me-2"></i>Alternate Vendor Comparison</h3>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Reliability Score</th>
                    <th>Overall Risk</th>
                    <th>Risk Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="table-primary">
                    <td><strong>${esc(item.company_name)} (Current)</strong></td>
                    <td><strong>${item.reliability_score || "N/A"} / 100</strong></td>
                    <td><strong>${risk ? risk.overall_risk_score : "N/A"} / 100</strong></td>
                    <td>${badge(risk ? risk.risk_level : "LOW")}</td>
                    <td>${badge(item.approval_status)}</td>
                  </tr>
                  ${alternates.map(alt => `
                    <tr>
                      <td>${esc(alt.company_name)}</td>
                      <td>${alt.reliability_score || "N/A"} / 100</td>
                      <td>${alt.overall_risk_score || "N/A"} / 100</td>
                      <td>${badge(alt.risk_level || "LOW")}</td>
                      <td>${badge(alt.approval_status)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
            <div class="alert alert-secondary mt-3 mb-0 py-2">
              <strong>Comparison Insight:</strong> ${alternates.some(alt => (alt.reliability_score || 0) > (item.reliability_score || 0))
                ? `An approved alternate vendor in this category has a higher reliability score than the current supplier. Evaluation is recommended.`
                : `The current supplier is currently the most reliable approved partner in this category.`
              }
            </div>
          </div>
        `;
      }

      return `
        <div class="detail-panel">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <p class="eyebrow text-primary mb-1">VENDOR RISK PROFILE</p>
              <h1>${esc(item.company_name)}</h1>
              <p class="mb-0">${badge(item.approval_status)}</p>
            </div>
            <div class="text-end">
              <small class="text-muted d-block">ID: ${item.id}</small>
              <small class="text-muted d-block">Last assessed: ${date(item.last_calculated_at)}</small>
            </div>
          </div>

          ${earlyWarningHtml}

          <div class="row g-4 mt-1">
            <!-- Basic Details -->
            <div class="col-lg-6">
              <article class="dashboard-card h-100">
                <h3 class="h5 mb-3">Supplier Information</h3>
                <dl class="profile-list mb-0">
                  <div><dt>Category</dt><dd>${esc(categoryName(item.category_id))}</dd></div>
                  <div><dt>Reg / GST</dt><dd>${esc(item.registration_number)}<br>${esc(item.gst_number)}</dd></div>
                  <div><dt>Email / Phone</dt><dd>${esc(item.email)}<br>${esc(item.phone)}</dd></div>
                  <div><dt>Location</dt><dd>${esc(item.address)}, ${esc(item.city)}, ${esc(item.state)}, ${esc(item.country)} ${esc(item.postal_code)}</dd></div>
                  <div><dt>Website</dt><dd>${item.website ? `<a href="${esc(item.website)}" target="_blank">${esc(item.website)}</a>` : "—"}</dd></div>
                </dl>
              </article>
            </div>

            <!-- Risk Overview Dial -->
            <div class="col-lg-6">
              <article class="dashboard-card text-center h-100 py-4 d-flex flex-column justify-content-between">
                <div>
                  <p class="eyebrow text-primary mb-1">OVERALL ASSESSMENT</p>
                  <div class="d-flex justify-content-around mt-3">
                    <div>
                      <small class="text-muted uppercase font-weight-bold d-block">Reliability</small>
                      <span class="display-5 font-weight-bold text-primary">${item.reliability_score || "N/A"}</span>
                      <small class="text-muted d-block">out of 100</small>
                    </div>
                    <div style="border-right: 1px solid var(--vi-slate-200);"></div>
                    <div>
                      <small class="text-muted uppercase font-weight-bold d-block">Overall Risk</small>
                      <span class="display-5 font-weight-bold text-danger">${risk ? risk.overall_risk_score : "N/A"}</span>
                      <small class="text-muted d-block">out of 100</small>
                    </div>
                  </div>
                  <div class="mt-4">
                    <span class="status-badge status-${risk ? risk.risk_level.toLowerCase() : "low"} fs-5 px-3 py-2">${risk ? risk.risk_level : "LOW"} RISK</span>
                  </div>
                  <div class="mt-3">
                    <span class="badge bg-secondary">Trend: ${risk ? risk.risk_trend : "→ Stable"}</span>
                  </div>
                </div>
                <div class="mt-4">
                  <button id="recalculateRiskButton" class="btn btn-outline-primary btn-sm">Recalculate Real-time Risk</button>
                </div>
              </article>
            </div>
          </div>

          ${driversHtml}
          ${recommendationsHtml}

          <!-- Multi-Dimensional Analysis -->
          <div class="row g-4 mt-3">
            <div class="col-12">
              <article class="dashboard-card">
                <h3 class="h5 mb-4">Multi-Dimensional Risk Breakdown</h3>
                
                <div class="row g-4">
                  <!-- Operational Risk -->
                  <div class="col-md-6 col-lg-4">
                    <div class="p-3 border rounded h-100 bg-white">
                      <div class="d-flex justify-content-between mb-2">
                        <strong>Operational Risk</strong>
                        <span class="text-primary font-weight-bold">${risk ? risk.operational_risk_score : 0}%</span>
                      </div>
                      <div class="progress mb-3" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" style="width: ${risk ? risk.operational_risk_score : 0}%"></div>
                      </div>
                      <small class="text-muted d-block">Delivery Rate: ${(item.reliability_score || 0)}%</small>
                      <small class="text-muted d-block">Delayed Orders: ${risk ? risk.delayed_pos_count : 0}</small>
                      <small class="text-muted d-block">SLA Violations: ${risk ? risk.sla_violations_count : 0}</small>
                    </div>
                  </div>

                  <!-- Compliance Risk -->
                  <div class="col-md-6 col-lg-4">
                    <div class="p-3 border rounded h-100 bg-white">
                      <div class="d-flex justify-content-between mb-2">
                        <strong>Compliance Risk</strong>
                        <span class="text-primary font-weight-bold">${risk ? risk.compliance_risk_score : 0}%</span>
                      </div>
                      <div class="progress mb-3" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" style="width: ${risk ? risk.compliance_risk_score : 0}%"></div>
                      </div>
                      <small class="text-muted d-block">Certifications: ${esc(item.security_certification_status)}</small>
                      <small class="text-muted d-block">Compliance Status: ${esc(item.compliance_status || "Compliant")}</small>
                      <small class="text-muted d-block">Active Contracts: ${vendorContracts.length}</small>
                    </div>
                  </div>

                  <!-- Financial Risk -->
                  <div class="col-md-6 col-lg-4">
                    <div class="p-3 border rounded h-100 bg-white">
                      <div class="d-flex justify-content-between mb-2">
                        <strong>Financial Risk</strong>
                        <span class="text-primary font-weight-bold">${risk ? risk.financial_risk_score : 0}%</span>
                      </div>
                      <div class="progress mb-3" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" style="width: ${risk ? risk.financial_risk_score : 0}%"></div>
                      </div>
                      <small class="text-muted d-block">Financial Health: <span class="badge bg-light text-dark">${esc(item.financial_health_indicator)}</span></small>
                      <small class="text-muted d-block">Payment Issues: ${item.payment_issues_count || 0}</small>
                      <small class="text-muted d-block">Outstanding Exposure: ${money(item.outstanding_exposure || 0)}</small>
                      <small class="text-muted-xs text-info d-block mt-2"><i class="bi bi-info-circle me-1"></i>Demo Indicators</small>
                    </div>
                  </div>

                  <!-- Cyber/Security Risk -->
                  <div class="col-md-6 col-lg-4">
                    <div class="p-3 border rounded h-100 bg-white">
                      <div class="d-flex justify-content-between mb-2">
                        <strong>Cyber/Security Risk</strong>
                        <span class="text-primary font-weight-bold">${risk ? risk.cyber_risk_score : 0}%</span>
                      </div>
                      <div class="progress mb-3" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" style="width: ${risk ? risk.cyber_risk_score : 0}%"></div>
                      </div>
                      <small class="text-muted d-block">Assessment: <span class="badge bg-light text-dark">${esc(item.security_assessment_status)}</span></small>
                      <small class="text-muted d-block">Security Incidents: ${item.security_incidents_count || 0}</small>
                      <small class="text-muted d-block">Certifications: Valid PDF</small>
                      <small class="text-muted-xs text-info d-block mt-2"><i class="bi bi-info-circle me-1"></i>Demo Indicators</small>
                    </div>
                  </div>

                  <!-- Dependency Risk & Blast Radius -->
                  <div class="col-md-6 col-lg-4">
                    <div class="p-3 border rounded h-100 bg-white">
                      <div class="d-flex justify-content-between mb-2">
                        <strong>Dependency Risk</strong>
                        <span class="text-primary font-weight-bold">${risk ? risk.dependency_risk_score : 0}%</span>
                      </div>
                      <div class="progress mb-3" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" style="width: ${risk ? risk.dependency_risk_score : 0}%"></div>
                      </div>
                      <small class="text-muted d-block">Active POs: ${poCount}</small>
                      <small class="text-muted d-block">Exposure Value: ${money(totalPOValue)}</small>
                      <small class="text-muted d-block">Alternate Suppliers: ${item.alternative_vendors_count}</small>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <!-- Blast Radius View (Section 11) -->
          <div class="row g-4 mt-3">
            <div class="col-12">
              <article class="dashboard-card border-start border-danger border-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h3 class="h5 mb-0 text-danger"><i class="bi bi-diagram-3-fill me-2"></i>Blast Radius Impact</h3>
                  <span class="status-badge status-${risk ? risk.blast_radius_level.toLowerCase() : "low"} fs-6 px-3 py-1">Blast Radius: ${risk ? risk.blast_radius_level : "LOW"}</span>
                </div>
                <p class="mb-0 text-dark-emphasis">${risk ? esc(risk.blast_radius_explanation) : "N/A"}</p>
              </article>
            </div>
          </div>

          <!-- Historical score trend -->
          <div class="row g-4 mt-3">
            <div class="col-12">
              <article class="dashboard-card">
                <h3 class="h5 mb-3">Historical Score Trend</h3>
                <div style="height: 250px; position: relative;">
                  <canvas id="reliabilityTrendChart"></canvas>
                </div>
              </article>
            </div>
          </div>

          ${comparisonHtml}

          <!-- Contacts -->
          <div class="dashboard-card mt-4">
            <h3 class="h5 mb-3">Contacts</h3>
            ${item.contacts?.length ? item.contacts.map((contact) => `
              <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <strong>${esc(contact.name)}</strong> · <span class="text-muted">${esc(contact.designation)}</span>
                  <div class="small text-muted">${esc(contact.email)} · ${esc(contact.phone)}</div>
                </div>
                <div>${contact.is_primary ? badge("Primary Contact") : ""}</div>
              </div>
            `).join("") : "No contact records."}
          </div>
        </div>
      `;
    }

    if (page === "procurement") { const history = item.approved_at ? `<strong>Approved</strong> by user #${esc(item.approved_by)} on ${date(item.approved_at)}${item.approval_comment ? `<p class="mb-0 mt-2">${esc(item.approval_comment)}</p>` : ""}` : item.rejected_at ? `<strong>Rejected</strong> by user #${esc(item.rejected_by)} on ${date(item.rejected_at)}<p class="mb-0 mt-2">${esc(item.rejection_reason || "")}</p>` : "No approval decision has been recorded."; return `<div class="detail-panel"><p class="eyebrow text-primary">PROCUREMENT REQUEST</p><h1>${esc(item.title)}</h1><div class="row g-3 mb-4"><div class="col-md-3"><span class="detail-label">Department</span><strong>${esc(item.department)}</strong></div><div class="col-md-3"><span class="detail-label">Status</span>${badge(item.status)}</div><div class="col-md-3"><span class="detail-label">Estimated cost</span><strong>${money(item.estimated_cost)}</strong></div><div class="col-md-3"><span class="detail-label">Required date</span><strong>${date(item.required_date)}</strong></div></div><p>${esc(item.description)}</p><section class="p-3 border rounded bg-light"><h2 class="h5">Approval history</h2><p class="mb-0">Requester: user #${esc(item.created_by)}</p><div class="mt-2">${history}</div></section><h2 class="h5 mt-4">Line items</h2><div class="table-responsive"><table class="table"><thead><tr><th>Item</th><th>Quantity</th><th>Estimated price</th><th>Subtotal</th></tr></thead><tbody>${item.line_items.map((line) => `<tr><td>${esc(line.item_name)}</td><td>${esc(line.quantity)}</td><td>${money(line.estimated_price)}</td><td>${money(line.subtotal)}</td></tr>`).join("")}</tbody></table></div></div>`; }
    if (page === "purchaseOrder") return `<div class="detail-panel"><p class="eyebrow text-primary">PURCHASE ORDER</p><h1>${esc(item.po_number)}</h1><div class="row g-3 mb-4"><div class="col-md-4"><span class="detail-label">Status</span>${badge(item.status)}</div><div class="col-md-4"><span class="detail-label">Issue date</span><strong>${date(item.issue_date)}</strong></div><div class="col-md-4"><span class="detail-label">Expected delivery</span><strong>${date(item.expected_delivery_date)}</strong></div><div class="col-md-4"><span class="detail-label">Vendor ID</span><strong>#${esc(item.vendor_id)}</strong></div><div class="col-md-4"><span class="detail-label">Procurement request</span><strong>#${esc(item.procurement_request_id)}</strong></div><div class="col-md-4"><span class="detail-label">Total amount</span><strong>${money(item.total_amount)}</strong></div></div><h2 class="h5 mt-4">Order items</h2><div class="table-responsive"><table class="table"><thead><tr><th>Item</th><th>Quantity</th><th>Unit price</th><th>Subtotal</th></tr></thead><tbody>${item.items.map((line) => `<tr><td>${esc(line.item_name)}</td><td>${esc(line.quantity)}</td><td>${money(line.unit_price)}</td><td>${money(line.subtotal)}</td></tr>`).join("")}</tbody></table></div><p class="mt-3 text-muted">Invoice: ${item.invoice_path ? "Uploaded" : "Not uploaded"} · Delivery proof: ${item.delivery_proof_path ? "Uploaded" : "Not uploaded"}</p><a class="btn btn-primary btn-sm" href="po-fulfillment.html?id=${item.id}">Open fulfillment & receiving workflow</a></div>`;
    if (page === "contract") return `<div class="detail-panel"><p class="eyebrow text-primary">CONTRACT</p><h1>${esc(item.contract_number)}</h1><div class="row g-3 mb-4"><div class="col-md-4"><span class="detail-label">Vendor ID</span><strong>#${esc(item.vendor_id)}</strong></div><div class="col-md-4"><span class="detail-label">Start date</span><strong>${date(item.start_date)}</strong></div><div class="col-md-4"><span class="detail-label">Expiry date</span><strong>${date(item.end_date)}</strong></div><div class="col-md-4"><span class="detail-label">Renewal notice</span><strong>${esc(item.renewal_notice_days)} days</strong></div><div class="col-md-4"><span class="detail-label">Compliance</span>${badge(item.compliance_status)}</div></div><h2 class="h5">Terms</h2><p>${esc(item.terms)}</p><h2 class="h5 mt-4">Documents</h2>${item.documents?.length ? `<ul class="list-group">${item.documents.map((doc) => `<li class="list-group-item"><i class="bi bi-file-earmark-pdf"></i> ${esc(doc.file_name)}</li>`).join("")}</ul>` : '<p class="text-muted">No documents available.</p>'}</div>`;
    return `<div class="detail-panel"><p class="eyebrow text-primary">ACCOUNT PROFILE</p><h1>${esc(item.first_name)} ${esc(item.last_name)}</h1><dl class="detail-grid"><dt>Email</dt><dd>${esc(item.email)}</dd><dt>Phone</dt><dd>${esc(item.phone)}</dd><dt>Role</dt><dd>${item.roles?.map((role) => badge(role.name)).join(" ") || "—"}</dd><dt>Account status</dt><dd>${item.is_active ? badge("Active") : badge("Inactive")}</dd></dl></div>`;
  }

  function initTrendChart(history) {
    const ctx = document.getElementById("reliabilityTrendChart");
    if (!ctx) return;
    const chronological = [...history].reverse();
    new Chart(ctx, {
      type: "line",
      data: {
        labels: chronological.map(h => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(h.created_at))),
        datasets: [{
          label: "Reliability Score",
          data: chronological.map(h => h.score),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 0, max: 100 } }
      }
    });
  }

  async function init() {
    if (!api || !auth || !config || !auth.requireAuthentication()) return;
    try {
      // Refresh the authenticated profile so a newly linked Vendor account
      // immediately receives its company scope instead of stale localStorage.
      const user = auth.setUser(await request("/auth/me"));
      const roles = auth.getRoleNames(user);
      if (!roles.some((role) => config.allowed.includes(role))) {
        showError("Access denied. Your current role cannot open this workspace.");
        return;
      }

      $("#pageTitle").textContent = config.title;
      $("#logoutButton").addEventListener("click", () => {
        auth.clearSession();
        location.replace("login.html");
      });

      const id = new URLSearchParams(location.search).get("id");
      if (page !== "profile" && !id) return showError("No record identifier was provided.");
      const item = await request(page === "profile" ? config.path : `${config.path}/${encodeURIComponent(id)}`);
      if (page === "profile" && roles.includes("Vendor")) {
        if (!user.vendor_id) return showError("Your Vendor account is not linked to a supplier company.");
        const vendor = await request(`/vendors/${encodeURIComponent(user.vendor_id)}`);
        $("#pageTitle").textContent = "My vendor profile";
        $("#detailContent").innerHTML = renderVendorCompanyProfile(vendor);
        return;
      }
      
      let reliability = null, risk = null, history = [], purchaseOrders = [], contracts = [], categories = [], categoryVendors = [], invoices = [], invoiceLoadError = "";
      if (page === "purchaseOrder") {
        try {
          const invoiceResponse = await request(`/invoices?purchase_order_id=${encodeURIComponent(item.id)}`);
          invoices = Array.isArray(invoiceResponse) ? invoiceResponse : (invoiceResponse.items || []);
        } catch (error) {
          // PO details remain usable if the supporting invoice request fails.
          invoiceLoadError = error.message || "Unable to load invoice information.";
        }
      }
      if (page === "vendor") {
        try {
          reliability = await request(`/vendors/${encodeURIComponent(id)}/reliability`);
          risk = await request(`/vendors/${encodeURIComponent(id)}/risk`);
          history = await request(`/vendors/${encodeURIComponent(id)}/reliability/history`);
        } catch (e) { console.warn("Reliability/Risk API error", e); }
        try {
          purchaseOrders = await request("/purchase-orders");
          contracts = await request("/contracts");
          categories = await request("/vendors/categories");
          categoryVendors = (await request(`/vendors?category_id=${item.category_id}&page_size=100`)).items || [];
        } catch (e) { console.warn("Supporting APIs error", e); }
      }

      $("#detailContent").innerHTML = render(item, reliability, risk, history, purchaseOrders, contracts, categories, categoryVendors, invoices, roles, invoiceLoadError);
      
      if (page === "vendor" && history && history.length) {
        initTrendChart(history);
      }

      // Hook recalculate risk button
      const recalcBtn = document.getElementById("recalculateRiskButton");
      if (recalcBtn) {
        if (!roles.some((role) => ["Administrator", "Procurement Manager"].includes(role))) {
          recalcBtn.remove();
          return;
        }
        recalcBtn.addEventListener("click", async () => {
          recalcBtn.disabled = true;
          recalcBtn.textContent = "Recalculating...";
          try {
            await api.request(`/vendors/${encodeURIComponent(id)}/risk/recalculate`, { method: "POST", token: auth.getAccessToken() });
            alert("Risk metrics recalculated successfully!");
            location.reload();
          } catch (err) {
            alert("Failed to recalculate risk: " + err.message);
            recalcBtn.disabled = false;
            recalcBtn.textContent = "Recalculate Real-time Risk";
          }
        });
      }

    } catch (error) {
      if ((error instanceof api.ApiError && error.status === 401) || error?.message?.includes("expired")) {
        auth.clearSession();
        auth.redirectToLogin();
        return;
      }
      showError(error.message || "The server did not return this record.");
    }
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init, { once: true }) : init();
})();
