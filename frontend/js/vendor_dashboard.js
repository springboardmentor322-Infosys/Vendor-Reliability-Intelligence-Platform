const API_BASE_URL = "http://127.0.0.1:8000";
let vendorMetricsChartInstance = null;

document.addEventListener("DOMContentLoaded", loadVendorDashboard);

async function loadVendorDashboard() {
    try {
        const token = getToken();
        if (!token) {
            window.location.replace("login.html");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/dashboard/vendor-stats`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`GET /dashboard/vendor-stats failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.unlinked) {
            showUnlinkedVendorMessage(data.message);
            return;
        }

        const profile = data.profile || {};
        const scores = data.scores || {};
        const invoices = data.invoices_summary || {};
        const orders = data.orders_summary || {};
        const hasData = data.has_data !== false;

        // 1. Header & Profile
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
        const elWelcome = document.getElementById("welcomeHeader");
        if (elWelcome) {
            elWelcome.innerText = `${greeting}, ${profile.contact_person || profile.vendor_name || getUserName()} 👋`;
        }

        const safeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        };

        safeSetText("vName", profile.vendor_name || 'N/A');
        safeSetText("vCategory", profile.category || 'Standard Supplies');
        safeSetText("vEmail", profile.email || 'N/A');
        safeSetText("vContact", profile.contact_person || 'Account Representative');
        safeSetText("vPhone", profile.phone || 'N/A');
        safeSetText("vCity", profile.city ? `${profile.city}, ${profile.state || ''}` : 'Regional Operations');
        safeSetText("vOrderHistory", hasData ? `${orders.total_orders || 0} orders (₹${Number(orders.total_revenue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})})` : "No orders on record");
        safeSetText("vStatusBadge", profile.status || 'Active');
        safeSetText("vRiskBadge", `${profile.risk_level || 'Tier 1 Supplier'}`);

        // 2. TOP 4 Primary KPIs
        if (hasData) {
            const overallRel = Number(scores.overall_reliability || 0).toFixed(1);
            const onTimeVal = Number(scores.on_time_delivery || 0).toFixed(1);
            const qualityVal = Number(scores.quality_score || 0).toFixed(1);

            safeSetText("reliabilityScore", `${overallRel}%`);
            safeSetText("riskLevelSub", `${profile.risk_level || 'Standard'} Rating`);
            safeSetText("deliveryRateVal", `${onTimeVal}%`);
            safeSetText("qualityScoreVal", `${qualityVal}%`);
        } else {
            safeSetText("reliabilityScore", "No Data");
            safeSetText("riskLevelSub", "No performance records available");
            safeSetText("deliveryRateVal", "No Data");
            safeSetText("qualityScoreVal", "No Data");
        }

        // Communication Performance KPI
        const elCommVal = document.getElementById("communicationScoreVal");
        const elCommSub = document.getElementById("communicationSub");
        if (scores.has_communication_data && scores.communication_score !== null) {
            if (elCommVal) elCommVal.innerText = `${Number(scores.communication_score).toFixed(1)}%`;
            if (elCommSub) elCommSub.innerText = "Direct response index";
        } else {
            if (elCommVal) {
                elCommVal.innerText = "N/A";
                elCommVal.style.fontSize = "20px";
                elCommVal.style.color = "var(--text-muted)";
            }
            if (elCommSub) elCommSub.innerText = "No messages logged yet";
        }

        // 3. MIDDLE 4 Operational Orders KPIs
        safeSetText("completedOrdersVal", `${orders.completed_orders || 0}`);
        safeSetText("completedOrdersSub", `Fulfilled of ${orders.total_orders || 0} historical orders`);
        safeSetText("activeOrdersVal", `${orders.active_orders || 0}`);
        safeSetText("activeOrdersSub", "In transit or active processing");
        safeSetText("delayedOrdersVal", `${orders.delayed_orders || 0}`);
        safeSetText("delayedOrdersSub", orders.delayed_orders > 0 ? "Past expected delivery window" : "Zero delayed orders");
        safeSetText("pendingActionsVal", `${orders.pending_actions || 0}`);
        safeSetText("pendingActionsSub", `${orders.pending_orders || 0} POs, ${invoices.pending_count || 0} pending invoices`);

        // 4. Revenue, Invoices & Settlements Summary (Clearly Labeled)
        const poRevenue = orders.total_revenue || 0;
        const billedAmount = invoices.total_amount || 0;
        const paidAmount = invoices.paid_amount || 0;
        const pendingAmount = invoices.pending_amount || 0;
        const billedCount = invoices.total_count || 0;
        const paidCount = invoices.paid_count || 0;
        const pendingCount = invoices.pending_count || 0;

        safeSetText("vTotalRevenue", `₹${poRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        safeSetText("vTotalRevenueSub", `${orders.total_orders || 0} allocated purchase orders`);
        safeSetText("vTotalBilled", `₹${billedAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        safeSetText("vTotalBilledCount", `${billedCount} total issued invoices`);
        safeSetText("vPaidAmount", `₹${paidAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        safeSetText("vPaidCount", `${paidCount} cleared / settled invoices`);
        safeSetText("vPendingAmount", `₹${pendingAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        safeSetText("vPendingCount", `${pendingCount} awaiting payment clearance`);

        // 5. Render Multi-Metric Chart
        renderMetricsChart(scores, hasData);

        // 6. Render Scoped Recent Orders
        renderVendorOrders(data.recent_orders || []);

        // 7. Render Contracts & Compliance Section
        const contractsList = (data.contracts_summary && data.contracts_summary.contracts) || [];
        renderVendorContracts(contractsList);

        // 8. Render Communication History
        const commSummary = data.communications_summary || {};
        renderVendorCommunications(commSummary.recent || []);

        // Wire up communication message form
        setupCommunicationForm(profile.id, token);

        // 9. Render AI Recommendations
        renderRecommendations(data.recommendations || []);

        // 10. Load Real Machine Learning Predictive Delivery Risk
        const vendorId = profile.id || user_vendor_id();
        if (vendorId) {
            await loadVendorPredictiveRisk(vendorId, token, hasData);
        }

    } catch (err) {
        console.error("Error loading Vendor dashboard:", err);
    }
}

function user_vendor_id() {
    try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u.vendor_id || null;
    } catch {
        return null;
    }
}

function showUnlinkedVendorMessage(msg) {
    const banner = document.querySelector(".role-welcome-banner");
    if (banner) {
        banner.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 10px; padding: 20px; color: #991b1b;">
                <h2 style="margin-bottom: 8px;">⚠️ Account Unlinked</h2>
                <p style="font-size: 14px;">${escapeHTML(msg)}</p>
            </div>
        `;
    }
}

function renderMetricsChart(scores, hasData) {
    const ctx = document.getElementById("vendorMetricsChart");
    if (!ctx) return;

    if (vendorMetricsChartInstance) {
        vendorMetricsChartInstance.destroy();
    }

    if (!hasData) {
        const parent = ctx.parentElement;
        if (parent) {
            parent.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px;">No historical performance data to render breakdown chart.</div>`;
        }
        return;
    }

    const labels = ["Delivery SLA", "Quality Score", "Compliance", "Service SLA"];
    const values = [
        scores.on_time_delivery || 0,
        scores.quality_score || 0,
        scores.compliance_score || 0,
        scores.service_score || 0
    ];

    if (scores.has_communication_data && scores.communication_score) {
        labels.push("Communication");
        values.push(scores.communication_score);
    }

    const colors = [
        "#4f46e5", // Indigo
        "#10b981", // Emerald
        "#06b6d4", // Cyan
        "#8b5cf6", // Violet
        "#f59e0b"  // Amber
    ];

    vendorMetricsChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
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
                            return ` ${context.label}: ${Number(context.raw || 0).toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
}

function renderVendorOrders(orders) {
    const tbody = document.getElementById("vendorOrdersBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 24px; color: var(--text-muted); font-style: italic;">No purchase orders allocated to your company yet.</td></tr>`;
        return;
    }

    orders.forEach(order => {
        const status = order.status || "Pending";
        let statusClass = "badge-warning";
        const stLower = status.toLowerCase();
        if (stLower === "completed" || stLower === "delivered" || stLower === "complete") statusClass = "badge-active";
        else if (stLower === "cancelled" || stLower === "canceled" || stLower === "rejected" || stLower === "fraud") statusClass = "badge-poor";
        else if (stLower === "processing" || stLower === "in-transit" || stLower === "in transit" || stLower === "approved") statusClass = "badge-active";

        const delayBadge = order.is_delayed 
            ? `<span class="badge badge-poor" style="font-size: 10px; margin-left: 6px;">Delayed</span>` 
            : "";

        const tot = Number(order.total_amount || 0);
        const adv = Number(order.advance_amount || 0);
        const paid = Number(order.paid_amount || 0);
        const rem = (order.remaining_amount !== undefined && order.remaining_amount !== null)
            ? Number(order.remaining_amount)
            : Math.max(0, tot - paid);

        const payStatus = order.payment_status || (paid >= tot && tot > 0 ? "Fully Paid" : (paid > 0 ? "Partially Paid" : "Unpaid"));
        let payBadgeClass = "badge-neutral";
        if (payStatus.toLowerCase() === "fully paid" || payStatus.toLowerCase() === "paid") payBadgeClass = "badge-active";
        else if (payStatus.toLowerCase() === "partially paid") payBadgeClass = "badge-warning";
        else if (payStatus.toLowerCase() === "unpaid") payBadgeClass = "badge-pending";

        const advDisplay = adv > 0
            ? `<span style="color: #059669; font-weight: 600;">₹${adv.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
            : `<span style="color: var(--text-secondary);">-</span>`;
        const remDisplay = rem > 0
            ? `<span style="color: #d97706; font-weight: 700;">₹${rem.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>`
            : `<span style="color: #059669; font-weight: 600;">₹0.00</span>`;

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">${escapeHTML(order.po_number || `#PO-${order.id}`)}</td>
                <td>${escapeHTML(order.product_name || 'Standard Requisition')}</td>
                <td>${order.quantity} units</td>
                <td style="font-weight: 600;">₹${tot.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${advDisplay}</td>
                <td>${remDisplay}</td>
                <td><span class="badge ${payBadgeClass}">${escapeHTML(payStatus)}</span></td>
                <td>${order.order_date || 'N/A'}</td>
                <td>${order.expected_delivery || 'N/A'}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(status)}</span>${delayBadge}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="downloadOrderSlip(${order.id})" style="padding: 4px 10px; font-size: 11px; white-space: nowrap;" title="Download Order Slip">
                        📄 Download Slip
                    </button>
                </td>
            </tr>
        `;
    });
}

function renderVendorContracts(contracts) {
    const tbody = document.getElementById("vendorContractsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!contracts || contracts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted); font-style: italic;">No active contracts or compliance documents currently registered for your company.</td></tr>`;
        return;
    }

    contracts.forEach(c => {
        const st = c.status || "Active";
        let statusClass = "badge-active";
        let actionBadge = `<span style="color: var(--text-muted); font-size: 11.5px;">Compliant</span>`;

        if (st === "Expired") {
            statusClass = "badge-poor";
            actionBadge = `<span class="action-required-badge">⚠️ Contract Expired</span>`;
        } else if (st === "Expiring Soon") {
            statusClass = "badge-warning";
            actionBadge = `<span class="action-required-badge" style="background: #fef3c7; color: #92400e;">⏳ Renewal Due (${c.remaining_days} days)</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">${escapeHTML(c.contract_name || `#${c.id}`)}</td>
                <td>${c.start_date || 'N/A'}</td>
                <td>${c.end_date || 'N/A'}</td>
                <td style="font-weight: 600;">₹${Number(c.contract_value || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(st)}</span></td>
                <td>${actionBadge}</td>
            </tr>
        `;
    });
}

function renderVendorCommunications(messages) {
    const container = document.getElementById("vendorMessagesContainer");
    if (!container) return;

    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 18px; color: var(--text-muted); background: #f8fafc; border-radius: 8px; border: 1px dashed var(--border-color); font-size: 13px;">
                💬 No communication threads logged yet. Use the composer below to reach out directly to the Procurement team.
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    messages.forEach(m => {
        const div = document.createElement("div");
        div.className = "comm-thread-item";
        div.innerHTML = `
            <div class="comm-thread-header">
                <span style="font-weight: 600; color: var(--primary-color);">👤 ${escapeHTML(m.sender_name || 'Procurement Desk')}</span>
                <span style="color: var(--text-muted); font-size: 11px;">🕒 ${escapeHTML(m.created_at || '')}</span>
            </div>
            <div class="comm-thread-body">
                ${escapeHTML(m.message || '')}
            </div>
            ${m.purchase_order_id ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">Linked PO: #PO-${m.purchase_order_id}</div>` : ''}
        `;
        container.appendChild(div);
    });
}

function setupCommunicationForm(vendorId, token) {
    const form = document.getElementById("vendorMessageForm");
    if (!form || form.dataset.wired) return;
    form.dataset.wired = "true";

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("commMessageInput");
        const feedback = document.getElementById("commFeedbackMsg");
        const btn = document.getElementById("btnSendComm");

        if (!input || !input.value.trim()) return;

        const msgText = input.value.trim();
        try {
            if (btn) btn.disabled = true;
            const formData = new FormData();
            formData.append("message", msgText);

            const res = await fetch(`${API_BASE_URL}/communications`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Failed to submit message");
            }

            input.value = "";
            if (feedback) {
                feedback.style.display = "block";
                feedback.style.color = "var(--success-text)";
                feedback.innerText = "✓ Message successfully sent to Procurement Desk.";
                setTimeout(() => { feedback.style.display = "none"; }, 4000);
            }

            // Refresh communications
            const statsRes = await fetch(`${API_BASE_URL}/dashboard/vendor-stats`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (statsRes.ok) {
                const updated = await statsRes.json();
                const commSummary = updated.communications_summary || {};
                renderVendorCommunications(commSummary.recent || []);
            }

        } catch (err) {
            console.error("Communication post error:", err);
            if (feedback) {
                feedback.style.display = "block";
                feedback.style.color = "var(--danger-text)";
                feedback.innerText = `Error: ${err.message}`;
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    });
}

function renderRecommendations(recommendations) {
    const container = document.getElementById("recommendationsContainer");
    if (!container) return;
    container.innerHTML = "";

    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = `<div class="insight-card success">
            <div class="insight-icon">✅</div>
            <div class="insight-content">
                <h4>Exceptional Fulfillment Standards</h4>
                <p>All delivery SLAs, quality standards, and compliance criteria are fully satisfied.</p>
            </div>
        </div>`;
        return;
    }

    recommendations.forEach(rec => {
        let cardClass = "info";
        let icon = "💡";
        const titleLower = (rec.title || "").toLowerCase();
        if (rec.type === "danger" || titleLower.includes("risk") || titleLower.includes("overdue")) {
            cardClass = "danger";
            icon = "⚠️";
        } else if (rec.type === "warning" || titleLower.includes("renewal") || titleLower.includes("optimization")) {
            cardClass = "warning";
            icon = "⚡";
        } else if (rec.type === "success") {
            cardClass = "success";
            icon = "🌟";
        }

        const div = document.createElement("div");
        div.className = `insight-card ${cardClass}`;
        div.innerHTML = `
            <div class="insight-icon">${icon}</div>
            <div class="insight-content">
                <h4>${escapeHTML(rec.title || '')}</h4>
                <p>${escapeHTML(rec.text || rec.detail || '')}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

async function loadVendorPredictiveRisk(vendorId, token, hasData) {
    const wrapper = document.getElementById("vMlContentWrapper");
    if (!hasData) {
        if (wrapper) {
            wrapper.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-style: italic;">Insufficient historical data is available to generate a reliable vendor-specific prediction.</div>`;
        }
        const elPredHeader = document.getElementById("vPredictionLevelBadge");
        if (elPredHeader) {
            elPredHeader.textContent = "Awaiting Data";
            elPredHeader.className = "badge";
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/predictions/vendor-risk/${vendorId}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            console.warn(`Vendor risk prediction returned status: ${res.status}`);
            if (wrapper) {
                wrapper.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-style: italic;">Insufficient historical data is available to generate a reliable vendor-specific prediction.</div>`;
            }
            return;
        }

        const data = await res.json();
        const hist = data.historical_metrics || {};
        const pred = data.predictive_metrics || {};
        const meta = data.model_metadata || {};

        // 1. Model Metadata
        const elMlBadge = document.getElementById("vMlBadge");
        if (elMlBadge && meta.model_type) {
            elMlBadge.textContent = `${meta.model_type} v${meta.model_version || '1.0.0'}`;
        }
        const elAcc = document.getElementById("vMlAccuracyBadge");
        if (elAcc && meta.evaluated_accuracy) {
            elAcc.textContent = `${(meta.evaluated_accuracy * 100).toFixed(1)}% Model Accuracy`;
        }

        // 2. Historical Metrics
        const elHistScore = document.getElementById("vHistScoreVal");
        if (elHistScore) elHistScore.textContent = `${Number(hist.reliability_score || 0).toFixed(1)}%`;
        const elHistOnTime = document.getElementById("vHistOnTimeVal");
        if (elHistOnTime) elHistOnTime.textContent = `${Number(hist.on_time_delivery_rate || 0).toFixed(1)}%`;

        // 3. Predictive Metrics
        const delayProbPct = ((pred.predicted_delay_probability || 0) * 100).toFixed(1);
        const elPredVal = document.getElementById("vPredDelayVal");
        if (elPredVal) {
            elPredVal.textContent = `${delayProbPct}%`;
            elPredVal.style.color = pred.predicted_risk_level === "High" ? "var(--danger-color)" :
                                   pred.predicted_risk_level === "Medium" ? "var(--warning-color)" : "var(--success-color)";
        }

        const elPredHeaderBadge = document.getElementById("vPredictionLevelBadge");
        if (elPredHeaderBadge) {
            elPredHeaderBadge.textContent = `${pred.predicted_risk_level || 'Evaluated'} Risk (${delayProbPct}%)`;
            elPredHeaderBadge.className = pred.predicted_risk_level === "High" ? "badge badge-poor" :
                                          pred.predicted_risk_level === "Medium" ? "badge badge-warning" : "badge badge-active";
        }

        // 4. Top Explainability Factors
        const elTopFactors = document.getElementById("vTopFactorsList");
        if (elTopFactors) {
            elTopFactors.innerHTML = "";
            const factors = Array.isArray(pred.top_factors) && pred.top_factors.length > 0 
                ? pred.top_factors 
                : (Array.isArray(pred.key_risk_drivers) ? pred.key_risk_drivers.map(d => ({ feature_label: d, value: "", direction: "Increases Delay Risk", impact: "Medium" })) : []);

            if (factors.length === 0) {
                elTopFactors.innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">Standard transit parameters observed. No outlier latency detected.</div>`;
            } else {
                factors.slice(0, 3).forEach(f => {
                    const row = document.createElement("div");
                    row.style.display = "flex";
                    row.style.alignItems = "center";
                    row.style.justifyContent = "space-between";
                    row.style.padding = "5px 8px";
                    row.style.background = "#f8fafc";
                    row.style.borderRadius = "6px";
                    row.style.border = "1px solid var(--border-subtle)";
                    row.style.fontSize = "11.5px";

                    const isRisk = f.direction === "Increases Delay Risk";
                    const isMitig = f.direction === "Decreases Delay Risk";
                    const badgeClass = isRisk ? "badge-poor" : isMitig ? "badge-active" : "badge-neutral";
                    const dirIcon = isRisk ? "▲" : isMitig ? "▼" : "•";

                    row.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <span class="badge ${badgeClass}" style="font-size: 10px; padding: 2px 6px;">${dirIcon} ${f.direction || 'Impact'}</span>
                            <strong style="color: var(--text-color);">${escapeHTML(f.feature_label || f.feature || '')}</strong>
                        </div>
                        <span style="font-weight: 600; font-size: 10.5px; color: ${isRisk ? 'var(--danger-color)' : isMitig ? 'var(--success-color)' : 'var(--text-muted)'};">
                            ${f.impact || 'Standard'}
                        </span>
                    `;
                    elTopFactors.appendChild(row);
                });
            }
        }

        // 5. Technical Model Explanation & Guidance
        const elBizGuide = document.getElementById("vBusinessInterpretationText");
        if (elBizGuide) {
            elBizGuide.textContent = pred.business_interpretation || pred.recommendation || "Maintain proactive dispatch communication with your logistics carrier.";
        }

        const elRec = document.getElementById("vRecommendationText");
        if (elRec) {
            elRec.textContent = pred.recommendation || "Adhere strictly to scheduled carrier handoff timeframes.";
        }

    } catch (e) {
        console.error("Error fetching vendor predictive risk:", e);
    }
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