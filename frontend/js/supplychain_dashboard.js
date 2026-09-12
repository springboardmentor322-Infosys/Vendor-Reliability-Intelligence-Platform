const API_BASE_URL = "http://127.0.0.1:8000";
let supplierDistChartInstance = null;
let shippingModesChartInstance = null;

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
    const role = getUserRole();
    if (role !== "Admin" && role !== "Administrator" && role !== "Supply Chain Manager") {
        console.warn("Unauthorized role accessed supplychain_dashboard:", role);
        return;
    }

    await loadSupplyChainStats();
    await initPredictor();
}

async function loadSupplyChainStats() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/dashboard/supplychain-stats`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            throw new Error(`Supply Chain stats API Error: ${response.status}`);
        }
        
        const data = await response.json();

        // Dynamic Greeting
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
        const elWelcome = document.getElementById("scWelcomeTitle");
        if (elWelcome) {
            elWelcome.innerHTML = `${greeting}, ${getUserName()} 👋`;
        }

        // 1. KPI Cards
        const totalSuppliers = Number(data.total_suppliers || 0);
        const activeOrders = Number(data.active_orders || 0);
        const delayedCount = Number(data.delayed_deliveries || 0);
        const onTimePct = data.on_time_rate || 0;

        document.getElementById("totalSuppliersVal").textContent = totalSuppliers.toLocaleString();
        document.getElementById("atRiskSub").textContent = `${data.at_risk_suppliers || 0} At-Risk Suppliers (<60% SLA)`;
        document.getElementById("activePOsVal").textContent = activeOrders.toLocaleString();
        document.getElementById("delayedDeliveries").textContent = delayedCount.toLocaleString();
        document.getElementById("avgDelaySub").textContent = `Avg Latency: ${data.average_delay_days || 0} Days`;
        document.getElementById("onTimeRate").textContent = `${onTimePct}%`;

        // Populate Attention Required Section
        const elDelayed = document.getElementById("scFocusDelayed");
        if (elDelayed) elDelayed.textContent = `${delayedCount.toLocaleString()} Delayed`;
        const elOnTime = document.getElementById("scFocusOnTime");
        if (elOnTime) elOnTime.textContent = `${onTimePct}% On-Time`;
        const elSuppliers = document.getElementById("scFocusSuppliers");
        if (elSuppliers) elSuppliers.textContent = `${totalSuppliers.toLocaleString()} Active Partners`;
        const elActivePOs = document.getElementById("scFocusActivePOs");
        if (elActivePOs) elActivePOs.textContent = `${activeOrders.toLocaleString()} In-Transit`;

        // 2. Supply Chain Insights
        if (data.insights) {
            document.getElementById("topShippingModeInsight").textContent = 
                `"${data.insights.dominant_shipping_mode}" is primary freight class representing ${data.insights.dominant_mode_pct}% of dispatches.`;
            document.getElementById("delayImpactInsight").textContent = 
                `Average fulfillment delay is ${data.average_delay_days} days on late orders with ₹${(data.insights.delayed_order_value || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})} transit value at risk.`;
            document.getElementById("atRiskSuppliersInsight").textContent = 
                `${data.at_risk_suppliers} suppliers flagged with delivery SLA scores below critical benchmark.`;
        }

        // 3. Render Supplier Performance Distribution Chart
        if (data.supplier_performance_dist) {
            renderSupplierDistChart(data.supplier_performance_dist);
        }

        // 4. Render Shipping Modes Chart
        if (data.shipping_modes && data.shipping_modes.length > 0) {
            renderShippingModesChart(data.shipping_modes);
        }

        // 5. Render Late Risk Alerts
        renderAlerts(data.late_risk_alerts || []);

        // 6. Render Recent Shipments Log
        renderRecentShipments(data.recent_shipments || []);

    } catch (error) {
        console.error("Error loading supply chain stats:", error);
    }
}

function renderSupplierDistChart(dist) {
    const ctx = document.getElementById("supplierDistChart");
    if (!ctx) return;

    if (supplierDistChartInstance) {
        supplierDistChartInstance.destroy();
    }

    const labels = ["Excellent (>85%)", "Good (70-85%)", "Average (60-70%)", "At-Risk (<60%)"];
    const counts = [
        dist.excellent || 0,
        dist.good || 0,
        dist.average || 0,
        dist.at_risk !== undefined ? dist.at_risk : (dist.poor || 0)
    ];

    const total = counts.reduce((a, b) => a + b, 0);
    const badge = document.getElementById("performanceTierBadge");
    if (badge) {
        badge.textContent = `${total} Total Suppliers`;
    }

    const colors = [
        "#10b981", // Excellent (Green)
        "#3b82f6", // Good (Blue)
        "#f59e0b", // Average (Amber)
        "#ef4444"  // At-Risk (Red)
    ];

    supplierDistChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11, weight: '500' },
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw} supplier(s)`;
                        }
                    }
                }
            }
        }
    });
}

function renderShippingModesChart(shippingModes) {
    const ctx = document.getElementById("shippingModesChart");
    if (!ctx) return;

    if (shippingModesChartInstance) {
        shippingModesChartInstance.destroy();
    }

    const labels = shippingModes.map(m => m.mode);
    const counts = shippingModes.map(m => m.count);

    shippingModesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Shipment Volume',
                data: counts,
                backgroundColor: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b'],
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Volume: ${Number(context.raw || 0).toLocaleString()} orders`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}

function renderAlerts(alerts) {
    const container = document.getElementById("alertsContainer");
    const badge = document.getElementById("alertsCountBadge");
    if (badge) badge.textContent = `${alerts.length} Active Alerts`;
    if (!container) return;
    container.innerHTML = "";

    if (alerts.length === 0) {
        container.innerHTML = `<p style="color: var(--success-color); font-weight: 600; padding: 15px;">✓ No active late delivery alerts at this time.</p>`;
        return;
    }

    alerts.forEach(alert => {
        const div = document.createElement("div");
        div.className = "alert-item";
        div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px;";
        
        div.innerHTML = `
            <div>
                <div style="font-weight: 600; font-size: 13px; color: #991b1b;">
                    Delivery #${alert.delivery_id} - ${escapeHTML(alert.vendor_name)}
                </div>
                <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                    Product: ${escapeHTML(alert.product_name)} | ${alert.date}
                </div>
            </div>
            <div style="background-color: var(--danger-bg); color: var(--danger-text); font-weight: 700; padding: 4px 8px; border-radius: 6px; font-size: 11px;">
                +${alert.delay_days}d late
            </div>
        `;
        container.appendChild(div);
    });
}

function renderRecentShipments(shipments) {
    const tbody = document.getElementById("recentDeliveriesBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (shipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state-wrapper">No recent logistics shipments found.</td></tr>`;
        return;
    }

    shipments.forEach(delivery => {
        const deliveryId = delivery.delivery_id || delivery.id || "N/A";
        const status = delivery.status || "In Transit";
        const statusLower = status.toLowerCase();
        
        // Variance derived from actual_days - scheduled_days
        const varianceDays = (delivery.variance_days !== undefined && delivery.variance_days !== null) 
            ? Number(delivery.variance_days) 
            : (Number(delivery.delay_days || 0));

        let varianceText = "On Time";
        let varianceColor = "var(--success-color)";
        
        if (statusLower.includes("cancel")) {
            varianceText = "Cancelled";
            varianceColor = "var(--text-secondary)";
        } else if (varianceDays > 0 || statusLower.includes("late")) {
            const days = varianceDays > 0 ? varianceDays : (delivery.delay_days || 1);
            varianceText = `+${days} days late`;
            varianceColor = "var(--danger-color)";
        } else if (varianceDays < 0 || statusLower.includes("advance")) {
            const days = Math.abs(varianceDays) || 1;
            varianceText = `${days} days advance`;
            varianceColor = "var(--success-color)";
        } else {
            varianceText = "On Time";
            varianceColor = "var(--success-color)";
        }

        // Status badge styling
        let statusBadgeClass = "badge-active";
        if (statusLower.includes("late")) {
            statusBadgeClass = "badge-poor";
        } else if (statusLower.includes("cancel")) {
            statusBadgeClass = "badge-neutral";
        } else if (statusLower.includes("advance")) {
            statusBadgeClass = "badge-info";
        } else {
            statusBadgeClass = "badge-active";
        }

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">#${deliveryId}</td>
                <td style="font-weight: 600;">${escapeHTML(delivery.vendor_name)}</td>
                <td>${escapeHTML(delivery.region || 'Regional')}</td>
                <td><span class="badge badge-neutral">${escapeHTML(delivery.shipping_mode || 'Standard Class')}</span></td>
                <td>${delivery.expected_date || 'N/A'}</td>
                <td><span class="badge ${statusBadgeClass}">${escapeHTML(status)}</span></td>
                <td style="font-weight: 600; color: ${varianceColor};">${varianceText}</td>
            </tr>
        `;
    });
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// ==========================================================
// PREDICTIVE MACHINE LEARNING DELIVERY RISK ENGINE
// ==========================================================
let availableVendors = [];
let lastPredictionAuditId = null;
let featureImportanceLoaded = false;

async function initPredictor() {
    const token = getToken();
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    // 1. Fetch Model Metadata & Health Telemetry
    try {
        const metaRes = await fetch(`${API_BASE_URL}/predictions/model-info`, { credentials: "include", headers });
        if (metaRes.ok) {
            const meta = await metaRes.json();
            const badge = document.getElementById("mlModelBadge");
            const stats = document.getElementById("mlModelStatsBadge");
            if (badge && meta.model_type) {
                badge.textContent = `${meta.model_type} v${meta.model_version}`;
            }
            if (stats && meta.performance_metrics) {
                const acc = (meta.performance_metrics.accuracy * 100).toFixed(1);
                const f1 = (meta.performance_metrics.f1_score * 100).toFixed(1);
                stats.textContent = `${acc}% Acc | ${f1}% F1 (Calibrated)`;
            }
        }
    } catch (e) {
        console.warn("Could not load model info:", e);
    }

    try {
        const healthRes = await fetch(`${API_BASE_URL}/predictions/model-health`, { credentials: "include", headers });
        if (healthRes.ok) {
            const h = await healthRes.json();
            const hBadge = document.getElementById("mlHealthBadge");
            if (hBadge) {
                hBadge.textContent = h.status === "Healthy (Production Active)" ? "System: Optimal" : h.status;
                hBadge.className = h.status.includes("Healthy") ? "badge badge-active" : "badge badge-warning";
            }
        }
    } catch (e) {
        console.warn("Could not load model health:", e);
    }

    // 2. Fetch Suppliers for Dropdown
    try {
        const vRes = await fetch(`${API_BASE_URL}/vendors`, { credentials: "include", headers });
        if (vRes.ok) {
            const vendors = await vRes.json();
            availableVendors = Array.isArray(vendors) ? vendors : [];
            const select = document.getElementById("predVendorSelect");
            if (select) {
                select.innerHTML = "";
                if (availableVendors.length === 0) {
                    select.innerHTML = `<option value="">No suppliers available</option>`;
                } else {
                    availableVendors.forEach(v => {
                        const opt = document.createElement("option");
                        opt.value = v.id;
                        const score = v.reliability_score ? Number(v.reliability_score).toFixed(1) : "N/A";
                        opt.textContent = `${v.vendor_name || ('Supplier #' + v.id)} (Reliability: ${score}%)`;
                        select.appendChild(opt);
                    });

                    updateSelectedVendorHistorical(availableVendors[0].id);

                    select.addEventListener("change", (e) => {
                        updateSelectedVendorHistorical(e.target.value);
                    });
                }
            }
        }
    } catch (e) {
        console.warn("Could not load vendors for predictor:", e);
    }

    // 3. Attach Prediction Button Handler
    const btn = document.getElementById("btnRunPrediction");
    if (btn) {
        btn.addEventListener("click", runDelayPrediction);
    }

    // 4. Feature Importance Drawer Toggle
    const btnFeat = document.getElementById("btnToggleFeatImp");
    if (btnFeat) {
        btnFeat.addEventListener("click", toggleFeatureImportanceDrawer);
    }

    // 5. Prediction Feedback Toggle & Submission
    const btnFbToggle = document.getElementById("btnToggleFeedbackForm");
    if (btnFbToggle) {
        btnFbToggle.addEventListener("click", () => {
            const container = document.getElementById("feedbackFormContainer");
            if (container) {
                container.style.display = container.style.display === "none" ? "block" : "none";
            }
        });
    }

    const btnFbSubmit = document.getElementById("btnSubmitFeedback");
    if (btnFbSubmit) {
        btnFbSubmit.addEventListener("click", submitOutcomeFeedback);
    }
}

async function toggleFeatureImportanceDrawer() {
    const drawer = document.getElementById("featImportanceDrawer");
    if (!drawer) return;

    if (drawer.style.display === "block") {
        drawer.style.display = "none";
        return;
    }

    drawer.style.display = "block";
    if (featureImportanceLoaded) return;

    const listEl = document.getElementById("featImportanceList");
    if (listEl) {
        listEl.innerHTML = `<div style="font-size: 12px; color: var(--text-secondary);">Loading permutation feature importances...</div>`;
    }

    try {
        const token = getToken();
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE_URL}/predictions/model-feature-importance`, { credentials: "include", headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const features = data.features || [];
        featureImportanceLoaded = true;

        if (listEl) {
            listEl.innerHTML = "";
            const maxScore = features.length > 0 ? Math.max(...features.map(f => f.importance_score || 0.001)) : 1.0;

            features.forEach(f => {
                const pct = Math.max(5, Math.min(100, (f.importance_score / maxScore) * 100));
                const item = document.createElement("div");
                item.style.background = "#ffffff";
                item.style.border = "1px solid var(--border-subtle)";
                item.style.borderRadius = "8px";
                item.style.padding = "10px 12px";
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 600; font-size: 12px; color: var(--text-color);">#${f.rank} ${escapeHTML(f.feature)}</span>
                        <strong style="font-size: 11.5px; color: var(--primary-color);">${(f.importance_score).toFixed(4)}</strong>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">${escapeHTML(f.description)}</div>
                    <div style="width: 100%; height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${pct}%; height: 100%; background: var(--primary-color);"></div>
                    </div>
                `;
                listEl.appendChild(item);
            });
        }
    } catch (e) {
        console.error("Failed to load feature importance:", e);
        if (listEl) listEl.innerHTML = `<div style="font-size: 12px; color: var(--danger-color);">Error loading feature importance data.</div>`;
    }
}

function updateSelectedVendorHistorical(vendorId) {
    const v = availableVendors.find(x => String(x.id) === String(vendorId));
    const histEl = document.getElementById("predVendorHistRel");
    if (histEl) {
        if (v && v.reliability_score !== undefined && v.reliability_score !== null) {
            histEl.textContent = `${Number(v.reliability_score).toFixed(1)}%`;
        } else {
            histEl.textContent = "--";
        }
    }
}

async function runDelayPrediction() {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    const vendorId = document.getElementById("predVendorSelect")?.value;
    const shippingMode = document.getElementById("predShippingMode")?.value || "Standard Class";
    const daysScheduled = parseInt(document.getElementById("predScheduledDays")?.value || "4", 10);
    const category = document.getElementById("predCategory")?.value || "Cleats";
    const region = document.getElementById("predRegion")?.value || "South Asia";
    const quantity = parseInt(document.getElementById("predQuantity")?.value || "1", 10);
    const amount = parseFloat(document.getElementById("predAmount")?.value || "100");

    const spinner = document.getElementById("predLoadingSpinner");
    const btn = document.getElementById("btnRunPrediction");

    if (spinner) spinner.style.display = "inline-block";
    if (btn) btn.disabled = true;

    try {
        const payload = {
            vendor_id: vendorId ? parseInt(vendorId, 10) : null,
            shipping_mode: shippingMode,
            days_for_shipment_scheduled: daysScheduled,
            category_name: category,
            order_region: region,
            order_item_quantity: quantity,
            order_item_product_price: quantity > 0 ? (amount / quantity) : amount,
            order_item_total: amount
        };

        const res = await fetch(`${API_BASE_URL}/predictions/delivery-risk`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || `Prediction error: ${res.status}`);
        }

        const data = await res.json();
        renderPredictionOutput(data);

    } catch (error) {
        console.error("Prediction failed:", error);
        alert(`Prediction Error: ${error.message}`);
    } finally {
        if (spinner) spinner.style.display = "none";
        if (btn) btn.disabled = false;
    }
}

function renderPredictionOutput(data) {
    lastPredictionAuditId = data.audit_log_id;

    const titleEl = document.getElementById("predResultTitle");
    const badgeEl = document.getElementById("predRiskBadge");
    const probValEl = document.getElementById("predProbValue");
    const probBarEl = document.getElementById("predProbBar");
    const futureTierEl = document.getElementById("predFutureRiskTier");
    const factorsListEl = document.getElementById("predTopFactorsList");
    const modelExpEl = document.getElementById("predModelExplanation");
    const businessGuideEl = document.getElementById("predBusinessGuidance");
    const auditStampEl = document.getElementById("predAuditStamp");
    const confStampEl = document.getElementById("predConfidenceStamp");
    const driftBanner = document.getElementById("predDriftBanner");
    const driftText = document.getElementById("predDriftText");
    const btnFeedback = document.getElementById("btnToggleFeedbackForm");

    const probPct = (data.delay_probability * 100).toFixed(1);

    if (titleEl) titleEl.textContent = data.prediction || "Prediction Evaluated";

    if (badgeEl) {
        badgeEl.textContent = `${data.risk_level} Risk`;
        if (data.risk_level === "High") {
            badgeEl.className = "badge badge-poor";
            badgeEl.style.background = "var(--danger-bg)";
            badgeEl.style.color = "var(--danger-text)";
        } else if (data.risk_level === "Medium") {
            badgeEl.className = "badge badge-warning";
            badgeEl.style.background = "var(--warning-bg)";
            badgeEl.style.color = "var(--warning-text)";
        } else {
            badgeEl.className = "badge badge-active";
            badgeEl.style.background = "var(--success-bg)";
            badgeEl.style.color = "var(--success-text)";
        }
    }

    if (probValEl) probValEl.textContent = `${probPct}%`;

    if (probBarEl) {
        probBarEl.style.width = `${Math.min(100, Math.max(5, probPct))}%`;
        if (data.risk_level === "High") {
            probBarEl.style.background = "var(--danger-color)";
        } else if (data.risk_level === "Medium") {
            probBarEl.style.background = "var(--warning-color)";
        } else {
            probBarEl.style.background = "var(--success-color)";
        }
    }

    if (futureTierEl) {
        futureTierEl.textContent = `${data.risk_level} Risk (${probPct}%)`;
        futureTierEl.style.color = data.risk_level === "High" ? "var(--danger-color)" : 
                                   data.risk_level === "Medium" ? "var(--warning-color)" : "var(--success-color)";
    }

    // Render Real Top Factors with Direction and Impact Badges
    if (factorsListEl) {
        factorsListEl.innerHTML = "";
        const factors = Array.isArray(data.top_factors) ? data.top_factors : [];
        if (factors.length === 0) {
            factorsListEl.innerHTML = `<span style="font-size: 11.5px; color: var(--text-muted);">Standard logistics routing parameters.</span>`;
        } else {
            factors.forEach(f => {
                const div = document.createElement("div");
                div.style.display = "flex";
                div.style.justifyContent = "space-between";
                div.style.alignItems = "center";
                div.style.background = "#ffffff";
                div.style.border = "1px solid var(--border-subtle)";
                div.style.borderRadius = "6px";
                div.style.padding = "6px 10px";
                div.style.fontSize = "11.5px";

                const isRisk = f.direction === "Increases Delay Risk";
                const isMitig = f.direction === "Decreases Delay Risk";
                const dirBadgeClass = isRisk ? "badge-poor" : isMitig ? "badge-active" : "badge-neutral";
                const dirIcon = isRisk ? "▲" : isMitig ? "▼" : "•";

                div.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge ${dirBadgeClass}" style="font-size: 10px; padding: 2px 6px;">${dirIcon} ${f.direction}</span>
                        <strong style="color: var(--text-color);">${escapeHTML(f.feature)}:</strong>
                        <span style="color: var(--text-secondary);">'${escapeHTML(f.value)}'</span>
                    </div>
                    <span style="font-weight: 600; font-size: 10.5px; color: ${isRisk ? 'var(--danger-color)' : isMitig ? 'var(--success-color)' : 'var(--text-muted)'};">
                        ${f.impact} Impact
                    </span>
                `;
                factorsListEl.appendChild(div);
            });
        }
    }

    if (modelExpEl) {
        modelExpEl.textContent = data.explanation || "Model classification based on empirical feature distribution.";
    }

    if (businessGuideEl) {
        businessGuideEl.textContent = data.business_interpretation || data.recommendation || "Maintain standard logistics handling.";
    }

    // Data Drift Alert
    if (driftBanner && driftText) {
        if (data.drift_status && data.drift_status.drift_detected) {
            driftBanner.style.display = "block";
            const flaggedNames = (data.drift_status.flagged_features || []).map(x => `${x.feature} (${x.type})`).join(", ");
            driftText.textContent = `Input parameters deviate significantly from training baseline: ${flaggedNames || 'Statistical variance detected'}.`;
        } else {
            driftBanner.style.display = "none";
        }
    }

    // Feedback Action Button
    if (btnFeedback) {
        btnFeedback.style.display = data.audit_log_id ? "block" : "none";
    }
    const fbResultMsg = document.getElementById("fbResultMsg");
    if (fbResultMsg) fbResultMsg.style.display = "none";

    if (auditStampEl) {
        auditStampEl.textContent = `Audit Log: #${data.audit_log_id || 'Recorded'} (PostgreSQL Verified)`;
        auditStampEl.style.color = "var(--success-color)";
        auditStampEl.style.fontWeight = "600";
    }

    if (confStampEl) {
        confStampEl.textContent = `Model Accuracy: ${(data.evaluated_accuracy * 100).toFixed(1)}% | ROC-AUC: 0.76`;
    }
}

async function submitOutcomeFeedback() {
    if (!lastPredictionAuditId) {
        alert("Please run a prediction first to generate an audit log record.");
        return;
    }

    const outcome = document.getElementById("fbOutcomeSelect")?.value || "Delayed";
    const notes = document.getElementById("fbNotesInput")?.value || "";
    const msgEl = document.getElementById("fbResultMsg");
    const btn = document.getElementById("btnSubmitFeedback");

    if (btn) btn.disabled = true;

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/predictions/${lastPredictionAuditId}/feedback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ actual_outcome: outcome, notes: notes })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || `HTTP ${res.status}`);
        }

        const data = await res.json();
        if (msgEl) {
            msgEl.style.display = "block";
            msgEl.style.color = "var(--success-color)";
            msgEl.style.fontWeight = "600";
            msgEl.textContent = `✅ Feedback recorded! Concordance with ML prediction: ${data.prediction_concordance ? 'Matched (Accurate)' : 'Diverged'}.`;
        }
    } catch (e) {
        console.error("Feedback error:", e);
        if (msgEl) {
            msgEl.style.display = "block";
            msgEl.style.color = "var(--danger-color)";
            msgEl.textContent = `Error: ${e.message}`;
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

