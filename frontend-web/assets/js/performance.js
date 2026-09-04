const perfRoles = ["administrator", "procurement_manager", "supply_chain_manager"];

function performanceEscape(value) {
  const element = document.createElement("div");
  element.textContent = value ?? "";
  return element.innerHTML;
}

function metricValue(value, suffix = "") {
  return value === null || value === undefined ? "-" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

function metricCard(label, value, detail = "") {
  return `<div class="stat-card"><div><div class="label">${performanceEscape(label)}</div><div class="value">${value}</div><div class="metric-trend">${performanceEscape(detail)}</div></div></div>`;
}

function renderMetrics(metrics) {
  document.getElementById("performance-metrics").innerHTML = [
    metricCard("Vendor approval rate", metricValue(metrics.vendor_registration_success_rate, "%"), "Approved vendor records"),
    metricCard("Approval time", metricValue(metrics.average_vendor_approval_time_hours, " hrs"), "Approved vendors"),
    metricCard("Response time", metricValue(metrics.average_vendor_response_time_hours, " hrs"), "Performance records"),
    metricCard("PO processing time", metricValue(metrics.purchase_order_processing_time_hours, " hrs"), "Completed orders"),
    metricCard("Order completion", metricValue(metrics.order_completion_rate, "%"), "Operational performance"),
    metricCard("Contract compliance", metricValue(metrics.contract_compliance_rate, "%"), "Active contract records"),
    metricCard("Delivery accuracy", metricValue(metrics.delivery_accuracy, "%"), "Actual versus expected date"),
    metricCard("Issue resolution", metricValue(metrics.average_issue_resolution_time_hours, " hrs"), "Performance records"),
    metricCard("Average reliability", metricValue(metrics.average_reliability_score, "/100"), "Calculated supplier score"),
    metricCard("Metrics query", metricValue(metrics.database_query_time_ms, " ms"), "Current database query"),
  ].join("");
}

async function loadMetrics() {
  const target = document.getElementById("performance-metrics");
  try {
    renderMetrics(await Api.get("/analytics/performance-metrics"));
  } catch (error) {
    target.innerHTML = `<p class="empty-state">Could not load performance metrics: ${performanceEscape(error.message)}</p>`;
  }
}

async function loadPerformanceVendors() {
  const vendors = await Api.get("/vendors");
  const select = document.getElementById("performance-vendor");
  select.innerHTML = vendors.map(vendor => `<option value="${vendor.id}">${performanceEscape(vendor.company_name)}</option>`).join("");
  select.onchange = loadInsights;
  if (!vendors.length) {
    document.getElementById("performance-insight").textContent = "No vendor records are available for this account.";
    return;
  }
  // Dashboard ranking links open the selected vendor directly.  The backend
  // still validates that a vendor account may only read its own information.
  const requestedVendorId = new URLSearchParams(window.location.search).get("vendor_id");
  if (requestedVendorId && vendors.some(vendor => vendor.id === requestedVendorId)) {
    select.value = requestedVendorId;
  }
  await loadInsights();
}

async function loadInsights() {
  const id = document.getElementById("performance-vendor").value;
  if (!id) return;
  const insight = await Api.get(`/analytics/vendors/${id}/insights`);
  document.getElementById("performance-insight").innerHTML = `
    <div class="gauge" style="--score:${Math.round(insight.reliability_score)};--gauge-color:${gaugeColor(insight.reliability_score)}"><span>${Math.round(insight.reliability_score)}</span></div>
    <h3 style="margin-top:12px">${performanceEscape(insight.risk_level.toUpperCase())} risk</h3>
    <p>${performanceEscape(insight.recommendation)}</p>
    <p class="who">${insight.trend.length} performance records tracked</p>`;
}

document.getElementById("performance-form").onsubmit = async event => {
  event.preventDefault();
  if (!perfRoles.includes(Auth.getUser()?.role)) return alert("Your role cannot log performance.");
  const numberOrNull = id => {
    const value = document.getElementById(id).value;
    return value === "" ? null : Number(value);
  };
  try {
    await Api.post("/performance", {
      vendor_id: document.getElementById("performance-vendor").value,
      on_time_deliveries: numberOrNull("on-time"),
      delayed_deliveries: numberOrNull("delayed"),
      quality_rating: numberOrNull("quality"),
      response_time_hours: numberOrNull("response"),
      issue_resolution_hours: numberOrNull("resolution"),
      order_completion_rate: numberOrNull("completion"),
    });
    event.target.reset();
    await Promise.all([loadInsights(), loadMetrics()]);
    alert("Performance saved and reliability score recalculated.");
  } catch (error) {
    alert(error.message);
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Promise.all([loadPerformanceVendors(), loadMetrics()]);
    if (!perfRoles.includes(Auth.getUser()?.role)) {
      document.getElementById("performance-form").closest("section").style.display = "none";
    }
  } catch (error) {
    alert(error.message);
  }
});
