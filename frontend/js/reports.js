
// ==================================================
// REPORTS & ANALYTICS
// ==================================================

const API_BASE_URL = "http://127.0.0.1:8000";


// ==================================================
// LOAD VENDOR RELIABILITY REPORT
// ==================================================

async function loadVendorReport() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/reports/vendor-reliability`
        );

        console.log(
            "Vendor Report Status:",
            response.status
        );

        const data = await response.json();

        console.log(
            "Vendor Report Data:",
            data
        );


        // ------------------------------------------
        // CHECK API RESPONSE
        // ------------------------------------------

        if (!response.ok) {

            throw new Error(
                data.error ||
                `API Error: ${response.status}`
            );

        }


        if (!Array.isArray(data)) {

            console.error(
                "Expected array but received:",
                data
            );

            throw new Error(
                "Vendor report API did not return an array."
            );

        }


        // ------------------------------------------
        // GET TABLE
        // ------------------------------------------

        const tableBody =
            document.getElementById(
                "vendorReportBody"
            );


        if (!tableBody) {

            console.error(
                "vendorReportBody not found in HTML"
            );

            return;

        }


        tableBody.innerHTML = "";

        // Hide loader message
        const msgEl = document.getElementById("vendorReportMessage");
        if (msgEl) msgEl.style.display = "none";

        // ------------------------------------------
        // NO DATA
        // ------------------------------------------

        if (data.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="empty-state-wrapper">
                        No vendor data available.
                    </td>
                </tr>
            `;

            updateVendorSummary([]);

            return;

        }


        // ------------------------------------------
        // DISPLAY VENDORS
        // ------------------------------------------

        data.forEach(
            (vendor, index) => {

                const row =
                    document.createElement("tr");

                const risk = vendor.risk || "Medium Risk";
                let riskClass = "badge-neutral";
                if (risk.toLowerCase().includes("high") || risk.toLowerCase().includes("critical")) riskClass = "badge-poor";
                else if (risk.toLowerCase().includes("low")) riskClass = "badge-active";
                else if (risk.toLowerCase().includes("medium")) riskClass = "badge-pending";

                const perf = vendor.performance || "Average";
                let perfClass = "badge-neutral";
                if (perf.toLowerCase().includes("good") || perf.toLowerCase().includes("excellent")) perfClass = "badge-active";
                else if (perf.toLowerCase().includes("poor") || perf.toLowerCase().includes("critical")) perfClass = "badge-poor";
                else if (perf.toLowerCase().includes("average")) perfClass = "badge-pending";

                const qScore = vendor.quality_score !== null ? `${Number(vendor.quality_score).toFixed(1)}%` : 'N/A';
                const dRate = vendor.delivery_rate !== null ? `${Number(vendor.delivery_rate).toFixed(1)}%` : 'N/A';
                const rScore = vendor.reliability_score !== null ? `${Number(vendor.reliability_score).toFixed(1)}%` : 'N/A';

                row.innerHTML = `
                    <td style="font-weight: 600;">#${index + 1}</td>
                    <td style="font-weight: 600;">${vendor.vendor_name ?? "N/A"}</td>
                    <td>${vendor.total_orders ?? 0}</td>
                    <td>${vendor.completed_orders ?? 0}</td>
                    <td>${vendor.pending_orders ?? 0}</td>
                    <td>${vendor.delivered_orders ?? 0}</td>
                    <td style="font-weight: 500;">${qScore}</td>
                    <td style="font-weight: 500;">${dRate}</td>
                    <td style="font-weight: 600;">${rScore}</td>
                    <td><span class="badge ${perfClass}">${perf}</span></td>
                    <td><span class="badge ${riskClass}">${risk}</span></td>
                    <td style="font-style: italic; color: var(--text-secondary);">${vendor.recommendation ?? "N/A"}</td>
                `;

                tableBody.appendChild(row);

            }
        );


        // ------------------------------------------
        // UPDATE SUMMARY
        // ------------------------------------------

        updateVendorSummary(data);


        console.log(
            "Vendor report loaded successfully."
        );

    }


    catch (error) {

        console.error(
            "Vendor Report Error:",
            error
        );


        const tableBody =
            document.getElementById(
                "vendorReportBody"
            );


        if (tableBody) {

            tableBody.innerHTML = `

                <tr>

                    <td colspan="12">

                        Failed to load vendor report.

                        <br>

                        ${error.message}

                    </td>

                </tr>

            `;

        }

    }

}


// ==================================================
// UPDATE VENDOR REPORT SUMMARY
// ==================================================

function updateVendorSummary(vendors) {

    const totalVendors =
        vendors.length;


    let totalOrders = 0;

    let completedOrders = 0;

    let pendingOrders = 0;

    let reliabilityTotal = 0;

    let highRiskVendors = 0;


    vendors.forEach(vendor => {

        totalOrders +=
            Number(
                vendor.total_orders ?? 0
            );


        completedOrders +=
            Number(
                vendor.completed_orders ?? 0
            );


        pendingOrders +=
            Number(
                vendor.pending_orders ?? 0
            );


        reliabilityTotal +=
            Number(
                vendor.reliability_score ?? 0
            );


        if (
            vendor.risk === "High Risk" ||
            vendor.risk === "Critical Risk"
        ) {

            highRiskVendors++;

        }

    });


    let averageReliability = 0;


    if (totalVendors > 0) {

        averageReliability =
            reliabilityTotal /
            totalVendors;

    }


    // ------------------------------------------
    // DISPLAY SUMMARY
    // ------------------------------------------

    const totalVendorsElement =
        document.getElementById(
            "reportTotalVendors"
        );


    const totalOrdersElement =
        document.getElementById(
            "reportTotalOrders"
        );


    const completedOrdersElement =
        document.getElementById(
            "reportCompletedOrders"
        );


    const pendingOrdersElement =
        document.getElementById(
            "reportPendingOrders"
        );


    const averageReliabilityElement =
        document.getElementById(
            "reportAverageReliability"
        );


    const highRiskElement =
        document.getElementById(
            "reportHighRiskVendors"
        );


    if (totalVendorsElement) {

        totalVendorsElement.textContent =
            totalVendors;

    }


    if (totalOrdersElement) {

        totalOrdersElement.textContent =
            totalOrders;

    }


    if (completedOrdersElement) {

        completedOrdersElement.textContent =
            completedOrders;

    }


    if (pendingOrdersElement) {

        pendingOrdersElement.textContent =
            pendingOrders;

    }


    if (averageReliabilityElement) {

        averageReliabilityElement.textContent =
            `${averageReliability.toFixed(2)}%`;

    }


    if (highRiskElement) {

        highRiskElement.textContent =
            highRiskVendors;

    }

}


// ==================================================
// LOAD PURCHASE ORDER REPORT
// ==================================================

async function loadPurchaseOrderReport() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/reports/purchase-orders`
        );


        console.log(
            "Purchase Report Status:",
            response.status
        );


        const data =
            await response.json();


        console.log(
            "Purchase Report Data:",
            data
        );


        // ------------------------------------------
        // CHECK API RESPONSE
        // ------------------------------------------

        if (!response.ok) {

            throw new Error(
                data.error ||
                `API Error: ${response.status}`
            );

        }


        if (!Array.isArray(data)) {

            console.error(
                "Expected purchase order array but received:",
                data
            );

            throw new Error(
                "Purchase order API did not return an array."
            );

        }


        // ------------------------------------------
        // GET TABLE
        // ------------------------------------------

        const tableBody =
            document.getElementById(
                "purchaseReportBody"
            );


        if (!tableBody) {

            console.error(
                "purchaseReportBody not found."
            );

            return;

        }


        tableBody.innerHTML = "";

        // Hide loader message
        const msgEl = document.getElementById("purchaseReportMessage");
        if (msgEl) msgEl.style.display = "none";

        // ------------------------------------------
        // NO DATA
        // ------------------------------------------

        if (data.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state-wrapper">
                        No purchase order data available.
                    </td>
                </tr>
            `;

            return;

        }


        // ------------------------------------------
        // DISPLAY PURCHASE ORDERS
        // ------------------------------------------

        data.forEach(order => {

            const row =
                document.createElement("tr");

            let statusClass = "badge-neutral";
            const statusLower = (order.status || "").toLowerCase();
            if (statusLower === "pending") statusClass = "badge-pending";
            else if (statusLower === "completed" || statusLower === "approved") statusClass = "badge-active";
            else if (statusLower === "delivered" || statusLower === "processing") statusClass = "badge-info";
            else if (statusLower === "fraud") statusClass = "badge-poor";

            row.innerHTML = `
                <td>#${order.id ?? "N/A"}</td>
                <td style="font-weight: 600;">${order.vendor_name ?? "N/A"}</td>
                <td>${order.product_name ?? "N/A"}</td>
                <td>${order.quantity ?? 0}</td>
                <td>₹${Number(order.unit_price ?? 0).toFixed(2)}</td>
                <td style="font-weight: 600;">₹${Number(order.total_amount ?? 0).toFixed(2)}</td>
                <td>${order.order_date ?? "N/A"}</td>
                <td>${order.expected_delivery ?? "N/A"}</td>
                <td><span class="badge ${statusClass}">${order.status ?? "N/A"}</span></td>
            `;

            tableBody.appendChild(row);

        });


        console.log(
            "Purchase order report loaded successfully."
        );

    }


    catch (error) {

        console.error(
            "Purchase Order Report Error:",
            error
        );


        const tableBody =
            document.getElementById(
                "purchaseReportBody"
            );


        if (tableBody) {

            tableBody.innerHTML = `

                <tr>

                    <td colspan="9">

                        Failed to load purchase order report.

                        <br>

                        ${error.message}

                    </td>

                </tr>

            `;

        }

    }

}


function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportVendorReportToCSV() {
    const table = document.querySelector("table"); // First table is Vendor Report
    if (!table) return;
    
    let csv = [];
    const rows = table.querySelectorAll("tr");
    
    for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].querySelectorAll("td, th");
        let row = [];
        for (let j = 0; j < cols.length; j++) {
            let text = cols[j].innerText.replace(/"/g, '""');
            row.push(`"${text}"`);
        }
        csv.push(row.join(","));
    }
    
    downloadCSV(csv.join("\n"), "vendor_reliability_report.csv");
}

function exportPOReportToCSV() {
    const tables = document.querySelectorAll("table");
    if (tables.length < 2) return;
    const table = tables[1]; // Second table is PO Report
    
    let csv = [];
    const rows = table.querySelectorAll("tr");
    
    for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].querySelectorAll("td, th");
        let row = [];
        for (let j = 0; j < cols.length; j++) {
            let text = cols[j].innerText.replace(/"/g, '""');
            row.push(`"${text}"`);
        }
        csv.push(row.join(","));
    }
    
    downloadCSV(csv.join("\n"), "purchase_order_report.csv");
}

async function exportExcelFile(endpoint, filename) {
    try {
        const token = getToken();
        const response = await fetch(endpoint, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!response.ok) {
            alert("Failed to export Excel report: " + response.statusText);
            return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Export Excel error:", err);
        alert("Failed to export Excel report");
    }
}

function exportVendorReportToExcel() {
    exportExcelFile(`${API_BASE_URL}/reports/vendor-reliability/excel`, "vendor_reliability_report.xlsx");
}

function exportPOReportToExcel() {
    exportExcelFile(`${API_BASE_URL}/reports/purchase-orders/excel`, "purchase_order_report.xlsx");
}



// ==================================================
// PAGE LOAD
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Reports page loaded."
        );


        loadVendorReport();

        loadPurchaseOrderReport();

    }
);
