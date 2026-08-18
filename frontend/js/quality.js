const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", initQuality);

let allInspections = [];
let charts = {};

async function initQuality() {
    setupFormVisibility();
    await loadInspections();
}

function setupFormVisibility() {
    const role = getUserRole();
    const authorizedRoles = ["Admin", "Procurement Manager", "Supply Chain Manager"];
    const container = document.getElementById("addInspectionContainer");
    
    if (container) {
        if (authorizedRoles.includes(role)) {
            container.style.display = "block";
        } else {
            container.style.display = "none";
        }
    }
}

async function loadInspections() {
    try {
        const response = await fetch(`${API_BASE_URL}/quality-inspections`);
        if (!response.ok) {
            throw new Error(`Quality API Error: ${response.status}`);
        }
        allInspections = await response.json();
        
        // Calculate dynamic KPIs
        calculateKPIs();
        
        // Render charts
        renderCharts();

        // Render table
        renderInspections(allInspections);
    } catch (error) {
        console.error("Error fetching quality inspections:", error);
        const tbody = document.querySelector("#inspectionTable tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="12" style="color: var(--danger-color); text-align: center; padding: 20px;">
                ❌ Error: Unable to load quality inspection logs. Please check connection.</td></tr>`;
        }
    }
}

function calculateKPIs() {
    const total = allInspections.length;
    let passed = 0;
    let failed = 0;
    let sumQuality = 0;
    let sumDefect = 0;

    allInspections.forEach(ins => {
        const status = ins.inspection_status || "";
        if (status === "Passed" || status.includes("Accepted")) {
            passed++;
        } else if (status === "Failed" || status.includes("Review")) {
            failed++;
        }
        sumQuality += parseFloat(ins.quality_score ?? 0);
        sumDefect += parseFloat(ins.defect_rate ?? 0);
    });

    const avgQ = total > 0 ? sumQuality / total : 0;
    const avgD = total > 0 ? sumDefect / total : 0;

    document.getElementById("kpiTotalInspections").textContent = total;
    document.getElementById("kpiPassedInspections").textContent = passed;
    document.getElementById("kpiFailedInspections").textContent = failed;
    document.getElementById("kpiAvgQuality").textContent = `${avgQ.toFixed(2)}%`;
    document.getElementById("kpiAvgDefect").textContent = `${avgD.toFixed(2)}%`;
}

function renderCharts() {
    Object.keys(charts).forEach(key => {
        if (charts[key]) charts[key].destroy();
    });

    if (allInspections.length === 0) return;

    // 1. Passed vs Failed Doughnut
    let passed = 0, failed = 0;
    allInspections.forEach(ins => {
        if (ins.inspection_status === "Passed" || ins.inspection_status.includes("Accepted")) passed++;
        else failed++;
    });

    charts.results = new Chart(document.getElementById("passedVsFailedChart").getContext("2d"), {
        type: 'doughnut',
        data: {
            labels: ['Passed / Accepted', 'Failed / Review Needed'],
            datasets: [{
                data: [passed, failed],
                backgroundColor: ['#10b981', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Group stats by vendor
    const vendorStats = {};
    allInspections.forEach(ins => {
        const name = ins.vendor_name || "Unknown";
        if (!vendorStats[name]) {
            vendorStats[name] = { qualitySum: 0, defectSum: 0, count: 0 };
        }
        vendorStats[name].qualitySum += parseFloat(ins.quality_score ?? 0);
        vendorStats[name].defectSum += parseFloat(ins.defect_rate ?? 0);
        vendorStats[name].count++;
    });

    const vendorNames = Object.keys(vendorStats);
    const avgQualities = vendorNames.map(name => vendorStats[name].qualitySum / vendorStats[name].count);
    const avgDefects = vendorNames.map(name => vendorStats[name].defectSum / vendorStats[name].count);

    // 2. Quality Score by Vendor
    charts.quality = new Chart(document.getElementById("qualityByVendorChart").getContext("2d"), {
        type: 'bar',
        data: {
            labels: vendorNames,
            datasets: [{
                label: 'Avg Quality Score (%)',
                data: avgQualities,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 100 } }
        }
    });

    // 3. Defect Rate by Vendor
    charts.defects = new Chart(document.getElementById("defectRateChart").getContext("2d"), {
        type: 'bar',
        data: {
            labels: vendorNames,
            datasets: [{
                label: 'Avg Defect Rate (%)',
                data: avgDefects,
                backgroundColor: '#f59e0b',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderInspections(inspectionsList) {
    const tbody = document.querySelector("#inspectionTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (inspectionsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="empty-state-wrapper">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No inspection logs found</div>
            <p>Modify filters or search queries.</p>
        </td></tr>`;
        return;
    }

    inspectionsList.forEach(inspection => {
        let statusClass = "badge-poor";
        const status = inspection.inspection_status || "";
        if (status === "Passed") {
            statusClass = "badge-active";
        } else if (status.includes("Accepted")) {
            statusClass = "badge-pending";
        } else if (status.includes("Review")) {
            statusClass = "badge-neutral";
        }

        tbody.innerHTML += `
            <tr>
                <td>${inspection.id}</td>
                <td style="font-weight: 600;">${escapeHTML(inspection.vendor_name)}</td>
                <td>#${inspection.purchase_order_id}</td>
                <td>${escapeHTML(inspection.product_name)}</td>
                <td>${inspection.inspection_date || "N/A"}</td>
                <td>${inspection.quantity_inspected}</td>
                <td style="color: var(--success-color); font-weight: 500;">${inspection.quantity_passed}</td>
                <td style="color: var(--danger-color); font-weight: 500;">${inspection.quantity_failed}</td>
                <td style="font-weight: 500;">${inspection.defect_rate}%</td>
                <td style="font-weight: 600;">${inspection.quality_score}%</td>
                <td><span class="badge ${statusClass}">${escapeHTML(status)}</span></td>
                <td style="font-style: italic; color: var(--text-secondary);">${escapeHTML(inspection.remarks) || "-"}</td>
            </tr>
        `;
    });
}

async function submitInspection(event) {
    event.preventDefault();

    const poId = parseInt(document.getElementById("purchase_order_id").value);
    const qtyInspected = parseInt(document.getElementById("quantity_inspected").value);
    const qtyFailed = parseInt(document.getElementById("quantity_failed").value);
    const remarks = document.getElementById("remarks").value.trim();

    // Client-side validations
    if (isNaN(poId) || poId <= 0) {
        showToast("Please enter a valid Purchase Order ID.", "warning");
        return;
    }
    if (isNaN(qtyInspected) || qtyInspected <= 0) {
        showToast("Quantity Inspected must be greater than 0.", "warning");
        return;
    }
    if (isNaN(qtyFailed) || qtyFailed < 0) {
        showToast("Quantity Failed cannot be negative.", "warning");
        return;
    }
    if (qtyFailed > qtyInspected) {
        showToast("Quantity Failed cannot exceed Quantity Inspected.", "warning");
        return;
    }

    try {
        const payload = new URLSearchParams();
        payload.append("purchase_order_id", poId);
        payload.append("quantity_inspected", qtyInspected);
        payload.append("quantity_failed", qtyFailed);
        if (remarks) {
            payload.append("remarks", remarks);
        }

        const response = await fetch(`${API_BASE_URL}/quality-inspections`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: payload.toString()
        });

        const result = await response.json();
        if (response.ok) {
            showToast("Quality inspection recorded successfully.", "success");
            document.getElementById("inspectionForm").reset();
            await loadInspections();
        } else {
            showToast(result.detail || "Failed to record quality check.", "error");
        }
    } catch (error) {
        console.error("Error submitting inspection:", error);
        showToast(`Failed to add inspection: ${error.message}`, "error");
    }
}

function filterInspections() {
    const statusVal = document.getElementById("statusFilter").value;
    const searchVal = document.getElementById("searchFilter").value.toLowerCase().trim();

    let filtered = allInspections;

    if (statusVal !== "all") {
        filtered = filtered.filter(ins => ins.inspection_status === statusVal);
    }

    if (searchVal !== "") {
        filtered = filtered.filter(ins => 
            ins.vendor_name && ins.vendor_name.toLowerCase().includes(searchVal)
        );
    }

    renderInspections(filtered);
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
