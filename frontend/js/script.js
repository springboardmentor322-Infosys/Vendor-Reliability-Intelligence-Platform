// Get Vendors
function loadVendors() {

    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

            updateVendorCharts(data);

            const tableBody = document.getElementById("vendorTableBody");

            if (!tableBody) return;

            tableBody.innerHTML = "";

            data.forEach(vendor => {

                tableBody.innerHTML += `
                    <tr>
                        <td>${vendor.name}</td>
                        <td>${vendor.delivery}</td>
                        <td>${vendor.category}</td>
                        <td>${vendor.quality ?? "-"}</td>
                        <td>${vendor.response_time ?? "-"}</td>
                        <td>${vendor.status}</td>
                        <td>${vendor.score}</td>
                        <td>
                            <button onclick="editVendor(${vendor.id})">Edit</button>
                            <button onclick="deleteVendor(${vendor.id})">Delete</button>
                        </td>
                    </tr>
                `;

            });

        })
        .catch(error => {
            console.log("Error loading vendors:", error);
        });

}

function updateVendorCharts(data) {

    const statusCtx = document.getElementById("vendorStatusChart");
    const scoreCtx = document.getElementById("vendorScoreChart");

    if (!statusCtx && !scoreCtx) return;

    if (statusCtx) {
        if (window.vendorStatusChartInstance) {
            window.vendorStatusChartInstance.destroy();
        }

        const statusCounts = {
            Approved: 0,
            "Under Review": 0,
            Rejected: 0
        };

        data.forEach(vendor => {
            if (statusCounts[vendor.status] !== undefined) {
                statusCounts[vendor.status]++;
            }
        });

        window.vendorStatusChartInstance = new Chart(statusCtx, {
            type: "pie",
            data: {
                labels: ["Approved", "Under Review", "Rejected"],
                datasets: [{
                    data: [
                        statusCounts.Approved,
                        statusCounts["Under Review"],
                        statusCounts.Rejected
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    if (scoreCtx) {
        if (window.vendorScoreChartInstance) {
            window.vendorScoreChartInstance.destroy();
        }

        window.vendorScoreChartInstance = new Chart(scoreCtx, {
            type: "bar",
            data: {
                labels: data.map(vendor => vendor.name),
                datasets: [{
                    label: "Vendor Score",
                    data: data.map(vendor => Number(vendor.score) || 0)
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

function loadLandingVendorOverview() {

    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

            if (!data || data.length === 0) {
                return;
            }

            const totalVendors = data.length;

            const totalScore = data.reduce((sum, vendor) => {
                return sum + (Number(vendor.score) || 0);
            }, 0);

            const averageScore = totalScore / totalVendors;

            const goodVendors = data.filter(vendor => {
                const score = Number(vendor.score) || 0;
                return score >= 70 && score < 90;
            }).length;

            const riskVendors = data.filter(vendor => {
                const score = Number(vendor.score) || 0;
                return score < 60;
            }).length;

            const onTimeVendors = data.filter(vendor => {
                return vendor.delivery === "On Time";
            }).length;

            const onTimePercentage =
                (onTimeVendors / totalVendors) * 100;

            const avgScoreEl = document.getElementById("landingAverageScore");
            if (avgScoreEl) avgScoreEl.textContent = averageScore.toFixed(1) + "%";

            const progressBarEl = document.getElementById("landingProgressBar");
            if (progressBarEl) progressBarEl.style.width = Math.min(100, Math.max(0, averageScore)) + "%";

            const tvEl = document.getElementById("landingTotalVendors");
            if (tvEl) tvEl.textContent = totalVendors;

            const gvEl = document.getElementById("landingGoodVendors");
            if (gvEl) gvEl.textContent = goodVendors;

            const rvEl = document.getElementById("landingRiskVendors");
            if (rvEl) rvEl.textContent = riskVendors;

            const otEl = document.getElementById("landingOnTimeDelivery");
            if (otEl) otEl.textContent = onTimePercentage.toFixed(0) + "%";

        })
        .catch(error => {
            console.log("Landing Page Error:", error);
        });
}

loadVendors();
loadLandingVendorOverview();

function editVendor(id) {

    //alert("Edit button clicked. ID = " + id);

    editVendorId = id;

    document.getElementById("vendorForm").style.display = "block";

    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

            const vendor = data.find(v => Number(v.id) === Number(id));
            console.log(vendor);
            alert(JSON.stringify(vendor));

            document.getElementById("vendorName").value = vendor.name;
            document.getElementById("delivery").value = vendor.delivery;
            document.getElementById("category").value = vendor.category;
            document.getElementById("status").value = vendor.status;
            document.getElementById("score").value = vendor.score;

        });

}
function deleteVendor(id) {

    if (!confirm("Are you sure you want to delete this vendor?")) {
        return;
    }

    fetch(`http://127.0.0.1:8000/vendors/${id}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {

        alert(data.message);

        loadVendors();

        addNotification("Vendor ID #" + id + " was deleted from the platform", "High", "Vendor Alert", "Vendor Deleted: #" + id);

    })
    .catch(error => {

        alert("Failed to delete vendor");
        console.log(error);

    });

}

// Login
document.getElementById("loginForm")?.addEventListener("submit", function (e) {

    e.preventDefault();

    fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        window.location.href = "dashboard.html";
    })
    .catch(error => {
        alert("Login Failed");
        console.log(error);
    });

});


// Register
document.getElementById("registerForm")?.addEventListener("submit", function (e) {

    e.preventDefault();

    alert("Register Successful");

});


// Show Vendor Form
document.getElementById("addVendorBtn")?.addEventListener("click", function () {

    document.getElementById("vendorForm").style.display = "block";

});


// Save Vendor
let editVendorId = null;

document.getElementById("saveVendorBtn")?.addEventListener("click", function () {

    const vendorData = {
        name: document.getElementById("vendorName").value,
        delivery: document.getElementById("delivery").value,
        quality: Number(document.getElementById("quality").value),
        response_time: Number(document.getElementById("responseTime").value),
        category: document.getElementById("category").value,
        status: document.getElementById("status").value,
        score: Number(document.getElementById("score").value)
    };

    let url = "http://127.0.0.1:8000/vendors";
    let method = "POST";

    if (editVendorId !== null) {
        url = `http://127.0.0.1:8000/vendors/${editVendorId}`;
        method = "PUT";
    }

    fetch(url, {
        method: method,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(vendorData)
    })
    .then(response => response.json())
    .then(data => {

        alert(data.message);

        loadVendors();

        addNotification("Vendor saved successfully: " + vendorData.name + " (" + (vendorData.category || "General") + ")", "Medium", "Vendor Alert", "Vendor Saved: " + vendorData.name);

        document.getElementById("vendorName").value = "";
        document.getElementById("delivery").value = "";
        document.getElementById("quality").value = "";
        document.getElementById("responseTime").value = "";
        document.getElementById("category").value = "";
        document.getElementById("status").value = "Pending";
        document.getElementById("score").value = "";

        editVendorId = null;

        document.getElementById("vendorForm").style.display = "none";

    })
    .catch(error => {
        alert("Failed to save vendor");
        console.log(error);
    });

});

// Update Profile
document.getElementById("updateProfileBtn")?.addEventListener("click", function () {

    const name = document.getElementById("profileName").value;
    const email = document.getElementById("profileEmail").value;
    const mobile = document.getElementById("profileMobile").value;

    if (name === "" || email === "" || mobile === "") {
        alert("Please fill all fields");
        return;
    }

    alert("Profile Updated Successfully!");
});
// Dashboard Data
function loadDashboard() {

    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

            const totalVendors = document.getElementById("totalVendors");

            if (totalVendors) {
                totalVendors.innerText = data.length;
            }

        })
        .catch(error => console.log(error));

}

loadDashboard();
document.getElementById("searchVendor")?.addEventListener("keyup", function () {

    let search = this.value.toLowerCase();

    let rows = document.querySelectorAll("#vendorTableBody tr");

    rows.forEach(row => {

        let vendorName = row.cells[0].textContent.toLowerCase();

        if (vendorName.includes(search)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

});
// Show Procurement Form
document.getElementById("addProcurementBtn")?.addEventListener("click", function () {

    document.getElementById("procurementForm").style.display = "block";

    document.getElementById("procurementId").value = "";
    document.getElementById("itemName").value = "";
    document.getElementById("quantity").value = "";
    document.getElementById("estimatedCost").value = "";
    document.getElementById("department").value = "";

});

// Save / Update Procurement
document.getElementById("saveProcurementBtn")?.addEventListener("click", function () {

    const procurementData = {
        item_name: document.getElementById("itemName").value,
        quantity: Number(document.getElementById("quantity").value),
        estimated_cost: Number(document.getElementById("estimatedCost").value),
        department: document.getElementById("department").value,
        status: "Pending"
    };

    const id = document.getElementById("procurementId").value;

    let url = "http://127.0.0.1:8000/procurements";
    let method = "POST";

    if (id) {
        url = `http://127.0.0.1:8000/procurements/${id}`;
        method = "PUT";
    }

    fetch(url, {
        method: method,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(procurementData)
    })
    .then(response => response.json())
    .then(data => {

        alert(data.message);

        loadProcurements();

        addNotification("Procurement Request saved: " + procurementData.item_name);

        document.getElementById("procurementForm").style.display = "none";

        document.getElementById("procurementId").value = "";
        document.getElementById("itemName").value = "";
        document.getElementById("quantity").value = "";
        document.getElementById("estimatedCost").value = "";
        document.getElementById("department").value = "";

    })
    .catch(error => {
        console.log(error);
        alert("Failed to save procurement");
    });

});
let procurementStatusChart = null;
let procurementDepartmentChart = null;

// Load Procurement List
function loadProcurements() {

    fetch("http://127.0.0.1:8000/procurements")
    .then(response => response.json())
    .then(data => {

        console.log("DATA LENGTH:", data.length);
        
        const tableBody = document.getElementById("procurementTableBody");

        if (tableBody) {
            tableBody.innerHTML = "";

            let totalCost = 0;
            let pendingCount = 0;
            let approvedCount = 0;

            data.forEach(procurement => {
                const cost = Number(procurement.estimated_cost) || 0;
                totalCost += cost;

                const rawStatus = procurement.status || "Pending";
                let statusClass = "pending";
                if (rawStatus === "Approved") {
                    statusClass = "approved";
                    approvedCount++;
                } else if (rawStatus === "Cancelled" || rawStatus === "Rejected") {
                    statusClass = "rejected";
                } else {
                    pendingCount++;
                }

                const formattedCost = "₹" + cost.toLocaleString();

                tableBody.innerHTML += `
                <tr>
                    <td><strong>${procurement.item_name}</strong></td>
                    <td>${procurement.quantity}</td>
                    <td>${formattedCost}</td>
                    <td>${procurement.department || "-"}</td>
                    <td><span class="badge-status ${statusClass}">${rawStatus}</span></td>
                    <td>
                        <button class="btn-edit" onclick="editProcurement(${procurement.id})">Edit</button>
                        <button class="btn-approve" onclick="approveProcurement(${procurement.id})">Approve</button>
                        <button class="btn-po" onclick="createPurchaseOrder(${procurement.id})">Create PO</button>
                        <button class="btn-reject" onclick="rejectProcurement(${procurement.id})">Reject</button>
                        <button class="btn-delete" onclick="deleteProcurement(${procurement.id})">Delete</button>
                    </td>
                </tr>
                `;
            });

            // Update KPI Card Numbers
            const totalEl = document.getElementById("totalProcurements");
            if (totalEl) totalEl.innerText = data.length;

            const costEl = document.getElementById("totalEstimatedCost");
            if (costEl) costEl.innerText = "₹" + totalCost.toLocaleString();

            const pendingEl = document.getElementById("pendingProcurements");
            if (pendingEl) pendingEl.innerText = pendingCount;

            const approvedEl = document.getElementById("approvedProcurements");
            if (approvedEl) approvedEl.innerText = approvedCount;
        }

        updateProcurementCharts(data);

    })
    .catch(error => console.log(error));

}
// ===============================
// Procurement Charts
// ===============================

function updateProcurementCharts(data) {

    console.log("CHART DATA:", data);

    let pending = 0;
    let approved = 0;
    let rejected = 0;

    let departmentCounts = {};

    data.forEach(procurement => {

        let status = procurement.status || "Pending";

        if (status === "Pending") {
            pending++;
        } else if (status === "Approved") {
            approved++;
        } else if (status === "Rejected" || status === "Cancelled") {
            rejected++;
        }

        let department = procurement.department || "General";

        departmentCounts[department] =
            (departmentCounts[department] || 0) + 1;
    });


    // ===============================
    // PIE CHART
    // ===============================

    const statusCtx =
        document.getElementById("procurementStatusChart");

    if (statusCtx) {

        if (window.procurementStatusChartInstance) {
            window.procurementStatusChartInstance.destroy();
        }

        window.procurementStatusChartInstance = new Chart(statusCtx, {
            type: "pie",

            data: {
                labels: ["Pending", "Approved", "Rejected"],

                datasets: [{
                    data: [
                        pending,
                        approved,
                        rejected
                    ],
                    backgroundColor: ["#f59e0b", "#10b981", "#ef4444"]
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }


    // ===============================
    // BAR CHART
    // ===============================

    const departmentCtx =
        document.getElementById("procurementDepartmentChart");

    if (departmentCtx) {

        if (window.procurementDepartmentChartInstance) {
            window.procurementDepartmentChartInstance.destroy();
        }

        window.procurementDepartmentChartInstance = new Chart(departmentCtx, {
            type: "bar",

            data: {
                labels: Object.keys(departmentCounts).length > 0 ? Object.keys(departmentCounts) : ["None"],

                datasets: [{
                    label: "Procurement Requests",
                    data: Object.values(departmentCounts).length > 0 ? Object.values(departmentCounts) : [0],
                    backgroundColor: "#3b82f6",
                    borderRadius: 6
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            }
        });
    }
}


// ===============================
// Procurement Count
// ===============================

function loadProcurementCount() {

    fetch("http://127.0.0.1:8000/procurements")
        .then(response => response.json())
        .then(data => {

            const totalProcurements =
                document.getElementById("totalProcurements");

            if (totalProcurements) {
                totalProcurements.innerText = data.length;
            }

        })
        .catch(error => {
            console.log("Procurement Count Error:", error);
        });
}


// ===============================
// Load Procurement Data
// ===============================

loadProcurements();
loadProcurementCount();
console.log("SCRIPT JS WORKING");

// Delete Procurement
function deleteProcurement(id) {

    fetch(`http://127.0.0.1:8000/procurements/${id}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {

        alert(data.message);
        loadProcurements();
        addNotification("Procurement Requisition #" + id + " was deleted.", "Low", "System Audit", "Procurement Deleted: #" + id);

    })
    .catch(error => console.log(error));

}
function approveProcurement(id) {

    fetch(`http://127.0.0.1:8000/procurements/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            status: "Approved"
        })
    })
    .then(response => response.json())
    .then(data => {
        alert("Procurement Approved");
        loadProcurements();
        addNotification("Procurement Requisition #" + id + " has been Approved.", "Medium", "System Audit", "Procurement Approved: #" + id);
    })
    .catch(error => {
        console.log(error);
        alert("Failed to approve procurement");
    });
}
function rejectProcurement(id) {

    fetch(`http://127.0.0.1:8000/procurements/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            status: "Cancelled"
        })
    })
    .then(response => response.json())
    .then(data => {
        alert("Procurement Rejected");
        loadProcurements();
        addNotification("Procurement Requisition #" + id + " has been Rejected/Cancelled.", "High", "System Audit", "Procurement Rejected: #" + id);
    })
    .catch(error => {
        console.log(error);
        alert("Failed to reject procurement");
    });
}
async function createPurchaseOrder(procurementId) {

    try {

        // Get all procurement requests
        const response = await fetch(
            "http://127.0.0.1:8000/procurements/"
        );

        if (!response.ok) {
            throw new Error("Failed to load procurement");
        }

        const procurements = await response.json();

        // Find selected procurement
        const procurement = procurements.find(
            p => p.id === procurementId
        );

        if (!procurement) {
            alert("Procurement Request not found");
            return;
        }

        // Only Approved request can create PO
        if (procurement.status !== "Approved") {
            alert("Please approve the Procurement Request first");
            return;
        }

        // Ask vendor
        const vendor = prompt("Enter Vendor Name:");

        if (!vendor) {
            return;
        }

        // Generate PO ID
        const orderId = "PO" + Date.now();

        // Create Purchase Order
        const poResponse = await fetch(
            "http://127.0.0.1:8000/purchase-orders/",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    order_id: orderId,
                    vendor: vendor,
                    product: procurement.item_name,
                    amount: Number(procurement.estimated_cost),
                    status: "In Progress",
                    invoice_number: "",
                    invoice_status: "Pending"
                })
            }
        );

        if (!poResponse.ok) {
            throw new Error("Failed to create Purchase Order");
        }

        const savedPO = await poResponse.json();

        console.log("Purchase Order Created:", savedPO);

        addNotification("Purchase Order " + orderId + " created for Vendor " + vendor + " (" + procurement.item_name + ")", "High", "Purchase Order", "PO Created: " + orderId);

        alert("Purchase Order Created Successfully");

        // Open Purchase Orders page
        window.location.href = "purchase-orders.html";

    } catch (error) {

        console.error("Error creating Purchase Order:", error);

        alert("Failed to create Purchase Order");
    }
}

// Edit Procurement
function editProcurement(id) {

    fetch("http://127.0.0.1:8000/procurements")
    .then(response => response.json())
    .then(data => {

        const procurement = data.find(item => Number(item.id) === Number(id));

        if (procurement) {

            document.getElementById("procurementForm").style.display = "block";

            document.getElementById("procurementId").value = procurement.id;
            document.getElementById("itemName").value = procurement.item_name;
            document.getElementById("quantity").value = procurement.quantity;
            document.getElementById("estimatedCost").value = procurement.estimated_cost;
            document.getElementById("department").value = procurement.department;

        }

    })
    .catch(error => console.log(error));

}
// Dynamic Dashboard Cards & Charts Loading
function loadDashboardData() {
    fetch("http://127.0.0.1:8000/dashboard/stats")
        .then(response => response.json())
        .then(stats => {
            // Update Dashboard Card Values
            const totalVendorsEl = document.getElementById("totalVendors");
            if (totalVendorsEl) totalVendorsEl.textContent = stats.total_vendors;

            const totalOrdersEl = document.getElementById("totalOrders");
            if (totalOrdersEl) totalOrdersEl.textContent = stats.total_orders;

            const averageVendorScoreEl = document.getElementById("averageVendorScore");
            if (averageVendorScoreEl) averageVendorScoreEl.textContent = stats.average_vendor_score + "%";

            const pendingOrdersEl = document.getElementById("pendingOrders");
            if (pendingOrdersEl) pendingOrdersEl.textContent = stats.pending_orders;

            const totalSpendEl = document.getElementById("totalSpend");
            if (totalSpendEl) totalSpendEl.textContent = stats.formatted_spend;

            const activeContractsEl = document.getElementById("activeContracts");
            if (activeContractsEl) activeContractsEl.textContent = stats.active_contracts;

            const totalProcurementsEl = document.getElementById("totalProcurements");
            if (totalProcurementsEl) totalProcurementsEl.textContent = stats.total_procurements;

            const onTimeDeliveryEl = document.getElementById("onTimeDelivery");
            if (onTimeDeliveryEl) onTimeDeliveryEl.textContent = stats.on_time_delivery_pct + "%";

            // Vendor Performance Pie Chart on dashboard.html
            const pieCtx = document.getElementById("vendorPieChart");
            if (pieCtx) {
                if (window.vendorPieChartInstance) {
                    window.vendorPieChartInstance.destroy();
                }
                const dist = stats.rating_distribution || {};
                window.vendorPieChartInstance = new Chart(pieCtx, {
                    type: "pie",
                    data: {
                        labels: ["Excellent", "Good", "Average", "Poor"],
                        datasets: [{
                            data: [
                                dist.Excellent || 0,
                                dist.Good || 0,
                                dist.Average || 0,
                                dist.Poor || 0
                            ],
                            backgroundColor: [
                                "#10b981",
                                "#3b82f6",
                                "#f59e0b",
                                "#ef4444"
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }

            // Purchase Orders Bar Chart on dashboard.html
            const barCtx = document.getElementById("purchaseBarChart");
            if (barCtx) {
                if (window.purchaseBarChartInstance) {
                    window.purchaseBarChartInstance.destroy();
                }
                const orderCounts = stats.order_status_counts || {};
                const labels = Object.keys(orderCounts).length > 0 ? Object.keys(orderCounts) : ["No Orders"];
                const data = Object.keys(orderCounts).length > 0 ? Object.values(orderCounts) : [0];
                window.purchaseBarChartInstance = new Chart(barCtx, {
                    type: "bar",
                    data: {
                        labels: labels,
                        datasets: [{
                            label: "Purchase Orders",
                            data: data,
                            backgroundColor: "#3b82f6",
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, precision: 0 } }
                    }
                });
            }
        })
        .catch(error => {
            console.log("Dashboard Stats Error:", error);
        });
}

// Automatically load dashboard data on load
loadDashboardData();
document.getElementById("searchProcurement")?.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll("#procurementTableBody tr");

    rows.forEach(row => {

        const rowText = row.innerText.toLowerCase();

        if (rowText.includes(searchValue)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

});
//purchaseorder
document.getElementById("addOrderBtn")?.addEventListener("click", function () {

    document.getElementById("orderForm").style.display = "block";

});
document.getElementById("saveOrderBtn")?.addEventListener("click", async function () {

    const vendor = document.getElementById("orderVendor").value;
    const product = document.getElementById("orderProduct").value;
    const amount = Number(document.getElementById("orderAmount").value);
    const status = document.getElementById("orderStatus").value;

    const invoiceNumber =
        document.getElementById("invoiceNumber")?.value || "";

    const invoiceStatus =
        document.getElementById("invoiceStatus")?.value || "Pending";

    const invoiceFile =
        document.getElementById("invoiceFile")?.files[0];

    const proofOfDelivery =
        document.getElementById("proofOfDelivery")?.files[0];

    const orderId = "PO" + Date.now();

    const formData = new FormData();

    formData.append("order_id", orderId);
    formData.append("vendor", vendor);
    formData.append("product", product);
    formData.append("amount", amount);
    formData.append("status", status);
    formData.append("invoice_number", invoiceNumber);
    formData.append("invoice_status", invoiceStatus);

    if (invoiceFile) {
        formData.append("invoice_file", invoiceFile);
    }

    if (proofOfDelivery) {
        formData.append("proof_of_delivery", proofOfDelivery);
    }

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/purchase-orders/",
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error("Failed to save Purchase Order");
        }

        const savedOrder = await response.json();

        console.log("Saved Purchase Order:", savedOrder);

        addNotification(
            "Purchase Order Issued: " + savedOrder.order_id + " to Vendor " + vendor + " (Product: " + product + ", Amount: ₹" + amount.toLocaleString() + ")",
            "Medium",
            "Purchase Order",
            "PO Issued: " + savedOrder.order_id
        );

        alert("Purchase Order Saved Successfully");

        location.reload();

    } catch (error) {

        console.error("Error saving Purchase Order:", error);

        alert("Failed to save Purchase Order");
    }

});

document.getElementById("searchOrders")?.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll("#purchaseOrderTableBody tr");

    rows.forEach(row => {

        const rowText = row.innerText.toLowerCase();

        if (rowText.includes(searchValue)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

});

function updatePurchaseOrderCharts(orders) {
    const statusCtx = document.getElementById("poStatusChart");
    const vendorCtx = document.getElementById("poVendorChart");

    if (!statusCtx && !vendorCtx) return;

    if (statusCtx) {
        if (window.poStatusChartInstance) {
            window.poStatusChartInstance.destroy();
        }

        const statusCounts = {};
        orders.forEach(order => {
            const st = order.status || "Pending";
            statusCounts[st] = (statusCounts[st] || 0) + 1;
        });

        const labels = Object.keys(statusCounts).length > 0 ? Object.keys(statusCounts) : ["No Orders"];
        const dataValues = Object.values(statusCounts).length > 0 ? Object.values(statusCounts) : [0];

        window.poStatusChartInstance = new Chart(statusCtx, {
            type: "pie",
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: [
                        "#3b82f6",
                        "#10b981",
                        "#f59e0b",
                        "#8b5cf6",
                        "#ef4444",
                        "#06b6d4",
                        "#64748b"
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    if (vendorCtx) {
        if (window.poVendorChartInstance) {
            window.poVendorChartInstance.destroy();
        }

        const vendorSpend = {};
        orders.forEach(order => {
            const v = order.vendor || "Unknown";
            const amt = Number(order.amount) || 0;
            vendorSpend[v] = (vendorSpend[v] || 0) + amt;
        });

        const vLabels = Object.keys(vendorSpend).length > 0 ? Object.keys(vendorSpend) : ["None"];
        const vData = Object.values(vendorSpend).length > 0 ? Object.values(vendorSpend) : [0];

        window.poVendorChartInstance = new Chart(vendorCtx, {
            type: "bar",
            data: {
                labels: vLabels,
                datasets: [{
                    label: "Total Spend (₹)",
                    data: vData,
                    backgroundColor: "#3b82f6",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

async function loadPurchaseOrders() {

    const tableBody = document.getElementById("purchaseOrderTableBody");

    if (!tableBody) return;

    try {

        const response = await fetch("http://127.0.0.1:8000/purchase-orders/");

        let orders = [];
        if (response.ok) {
            orders = await response.json();
        }

        // Merge locally cached purchase orders if any exist and aren't in backend response
        let storedOrders = JSON.parse(localStorage.getItem("purchase_orders") || "[]");
        if (storedOrders.length > 0) {
            storedOrders.forEach(so => {
                if (!orders.some(o => o.order_id === so.order_id)) {
                    orders.push(so);
                }
            });
        }

        let totalAmount = 0;
        let pendingCount = 0;
        let completedCount = 0;

        tableBody.innerHTML = "";

        if (orders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 24px;">No purchase orders found.</td></tr>`;
        } else {
            orders.forEach(order => {
                const amount = Number(order.amount) || 0;
                totalAmount += amount;

                const st = order.status || "Pending";
                let statusClass = "pending";

                if (st === "Delivered" || st === "Paid" || st === "Received") {
                    statusClass = "approved";
                    completedCount++;
                } else if (st === "In Progress" || st === "Shipped" || st === "Partial Delivery") {
                    statusClass = "under-review";
                    pendingCount++;
                } else {
                    statusClass = "pending";
                    pendingCount++;
                }

                const invStatus = order.invoice_status || "Pending";
                let invStatusClass = invStatus === "Paid" ? "approved" : (invStatus === "Received" ? "under-review" : "pending");

                tableBody.innerHTML += `
                    <tr>
                        <td><strong>${order.order_id}</strong></td>
                        <td>${order.vendor}</td>
                        <td>${order.product}</td>
                        <td>₹${amount.toLocaleString()}</td>
                        <td><span class="badge-status ${statusClass}">${st}</span></td>
                        <td>${order.invoice_number || "-"}</td>
                        <td><span class="badge-status ${invStatusClass}">${invStatus}</span></td>
                        <td>
                            <button type="button" class="btn-po" onclick="updateOrderStatus('${order.order_id}')">
                                Update Status
                            </button>
                            <button type="button" class="btn-delete" onclick="deletePurchaseOrder('${order.order_id}', ${order.id || 'null'})">
                                Delete
                            </button>
                        </td>
                    </tr>
                `;

            });
        }

        // Update KPI Card Numbers
        const totalCountEl = document.getElementById("totalOrdersCount");
        if (totalCountEl) totalCountEl.innerText = orders.length;

        const totalAmtEl = document.getElementById("totalOrdersAmount");
        if (totalAmtEl) totalAmtEl.innerText = "₹" + totalAmount.toLocaleString();

        const pendingEl = document.getElementById("pendingOrdersCount");
        if (pendingEl) pendingEl.innerText = pendingCount;

        const completedEl = document.getElementById("completedOrdersCount");
        if (completedEl) completedEl.innerText = completedCount;

        updatePurchaseOrderCharts(orders);

    } catch (error) {

        console.error("Error loading Purchase Orders:", error);

    }
}

loadPurchaseOrders();

window.deletePurchaseOrder = async function(orderId, dbId) {
    if (!confirm(`Are you sure you want to delete Purchase Order #${orderId}?`)) {
        return;
    }

    try {
        const idToDelete = (dbId && dbId !== 'null' && dbId !== null) ? dbId : orderId;
        let response = await fetch(`http://127.0.0.1:8000/purchase-orders/${idToDelete}`, {
            method: "DELETE"
        });

        if (!response.ok && idToDelete !== orderId) {
            await fetch(`http://127.0.0.1:8000/purchase-orders/${orderId}`, {
                method: "DELETE"
            });
        }
    } catch (error) {
        console.error("Error calling backend delete endpoint:", error);
    }

    // Clean up local storage cache if present
    try {
        let storedOrders = JSON.parse(localStorage.getItem("purchase_orders") || "[]");
        if (storedOrders.length > 0) {
            storedOrders = storedOrders.filter(o => o.order_id !== orderId && o.id != dbId);
            localStorage.setItem("purchase_orders", JSON.stringify(storedOrders));
        }
    } catch (e) {
        console.error("Error updating local storage purchase_orders:", e);
    }

    addNotification(
        `Purchase Order #${orderId} was deleted from the platform.`,
        "High",
        "Purchase Order",
        `PO Deleted: #${orderId}`
    );

    alert(`Purchase Order #${orderId} deleted successfully.`);
    loadPurchaseOrders();
};

window.updateOrderStatus = async function(orderId) {

    console.log("Update Status clicked:", orderId);

    const newStatus = prompt(
        "Enter new status:\nIn Progress\nShipped\nPartial Delivery\nDelivered"
    );

    if (!newStatus) {
        return;
    }

    try {

        const response = await fetch(
            `http://127.0.0.1:8000/purchase-orders/${orderId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status: newStatus
                })
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update status");
        }

        const updatedOrder = await response.json();

        console.log("Updated Order:", updatedOrder);

        alert("Status updated to: " + newStatus);

        addNotification(
            "Purchase Order #" + orderId + " status changed to " + newStatus,
            newStatus === "Delivered" ? "Low" : (newStatus === "Cancelled" ? "High" : "Medium"),
            "Purchase Order",
            "PO Status Changed: #" + orderId
        );

        location.reload();

    } catch (error) {

        console.error("Error updating status:", error);

        alert("Failed to update status");
    }
};
document.getElementById("addContractBtn")?.addEventListener("click", function () {

    const form = document.getElementById("contractForm");

    if (form) {
        form.style.display = "block";
    }

});
document.getElementById("saveContractBtn")?.addEventListener("click", function () {

    const vendor = document.getElementById("contractVendor").value;
    const contractName = document.getElementById("contractName").value;
    const startDate = document.getElementById("contractStartDate").value;
    const expiryDate = document.getElementById("contractExpiryDate").value;
    const renewalNoticePeriod = document.getElementById("renewalNoticePeriod").value;
    const contractTerms = document.getElementById("contractTerms").value;
    const complianceFlags = [];

if (document.getElementById("complianceQuality")?.checked) {
    complianceFlags.push("Quality Compliance");
}

if (document.getElementById("complianceDelivery")?.checked) {
    complianceFlags.push("Delivery Compliance");
}

if (document.getElementById("complianceContract")?.checked) {
    complianceFlags.push("Contract Compliance");
}
    const status = document.getElementById("contractStatus").value;

    if (!vendor || !contractName || !startDate || !expiryDate) {
        alert("Please fill all contract details");
        return;
    }

    const contracts = JSON.parse(localStorage.getItem("contracts")) || [];

    const contractId = "CON" + Date.now();

    contracts.push({
        contractId: contractId,
        vendor: vendor,
        contractName: contractName,
        startDate: startDate,
        expiryDate: expiryDate,
        renewalNoticePeriod: renewalNoticePeriod,
        terms: contractTerms,
        complianceFlags: complianceFlags,
        status: status
    });

    localStorage.setItem("contracts", JSON.stringify(contracts));

    addNotification(
        "New Contract \"" + contractName + "\" registered for Vendor " + vendor + " (Notice Period: " + renewalNoticePeriod + " Days)",
        "Medium",
        "Contract Warning",
        "Contract Created: " + contractName
    );

    alert("Contract Saved Successfully");

    location.reload();

});
document.getElementById("searchContracts")?.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll("#contractTableBody tr");

    rows.forEach(row => {

        const rowText = row.innerText.toLowerCase();

        if (rowText.includes(searchValue)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

});

function updateContractCharts(contracts) {
    const statusCtx = document.getElementById("contractStatusChart");
    const noticeCtx = document.getElementById("contractNoticeChart");

    if (!statusCtx && !noticeCtx) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    const noticeCounts = {
        "30 Days": 0,
        "60 Days": 0,
        "90 Days": 0
    };

    contracts.forEach(c => {
        const expDate = new Date(c.expiryDate);
        expDate.setHours(0, 0, 0, 0);
        const diffDays = (expDate - today) / (1000 * 60 * 60 * 24);

        if (c.status === "Expired" || diffDays < 0) {
            expiredCount++;
        } else if (diffDays <= 60) {
            expiringCount++;
        } else {
            activeCount++;
        }

        const np = c.renewalNoticePeriod ? `${c.renewalNoticePeriod} Days` : "30 Days";
        if (noticeCounts[np] !== undefined) {
            noticeCounts[np]++;
        } else {
            noticeCounts[np] = 1;
        }
    });

    if (statusCtx) {
        if (window.contractStatusChartInstance) {
            window.contractStatusChartInstance.destroy();
        }
        window.contractStatusChartInstance = new Chart(statusCtx, {
            type: "pie",
            data: {
                labels: ["Active", "Expiring Soon (< 60D)", "Expired"],
                datasets: [{
                    data: [activeCount, expiringCount, expiredCount],
                    backgroundColor: ["#10b981", "#f59e0b", "#ef4444"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    if (noticeCtx) {
        if (window.contractNoticeChartInstance) {
            window.contractNoticeChartInstance.destroy();
        }
        window.contractNoticeChartInstance = new Chart(noticeCtx, {
            type: "bar",
            data: {
                labels: Object.keys(noticeCounts),
                datasets: [{
                    label: "Contracts Count",
                    data: Object.values(noticeCounts),
                    backgroundColor: "#3b82f6",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            }
        });
    }
}

function loadContracts() {

    const contracts =
        JSON.parse(localStorage.getItem("contracts")) || [];

    const tableBody =
        document.getElementById("contractTableBody");

    if (tableBody) {
        tableBody.innerHTML = "";

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let activeCount = 0;
        let expiringCount = 0;
        let expiredCount = 0;

        contracts.forEach(contract => {
            const expDate = new Date(contract.expiryDate);
            expDate.setHours(0, 0, 0, 0);
            const diffDays = (expDate - today) / (1000 * 60 * 60 * 24);

            let statusClass = "approved";
            let displayStatus = contract.status || "Active";

            if (contract.status === "Expired" || diffDays < 0) {
                statusClass = "rejected";
                displayStatus = "Expired";
                expiredCount++;
            } else if (diffDays <= 60) {
                statusClass = "pending";
                displayStatus = "Expiring Soon";
                expiringCount++;
            } else {
                statusClass = "approved";
                activeCount++;
            }

            const flagsHTML = contract.complianceFlags && contract.complianceFlags.length > 0
                ? contract.complianceFlags.map(f => `<span class="badge-status under-review" style="margin-right: 4px;">${f}</span>`).join("")
                : `<span class="badge-status pending">None</span>`;

            tableBody.innerHTML += `
                <tr>
                    <td><strong>${contract.contractId}</strong></td>
                    <td>${contract.vendor}</td>
                    <td>${contract.contractName}</td>
                    <td>${contract.startDate}</td>
                    <td>${contract.expiryDate}</td>
                    <td>${contract.renewalNoticePeriod} Days</td>
                    <td>${contract.terms || "-"}</td>
                    <td>${flagsHTML}</td>
                    <td><span class="badge-status ${statusClass}">${displayStatus}</span></td>
                    <td>
                        <button type="button" class="btn-po" onclick="viewContract('${contract.contractId}')">
                         View Details
                        </button>
                    </td>
                </tr>
            `;

        });

        // Update KPI Card Numbers
        const totalCountEl = document.getElementById("totalContractsCount");
        if (totalCountEl) totalCountEl.innerText = contracts.length;

        const activeEl = document.getElementById("activeContractsCount");
        if (activeEl) activeEl.innerText = activeCount;

        const expiringEl = document.getElementById("expiringContractsCount");
        if (expiringEl) expiringEl.innerText = expiringCount;

        const expiredEl = document.getElementById("expiredContractsCount");
        if (expiredEl) expiredEl.innerText = expiredCount;
    }

    updateContractCharts(contracts);
}
function viewContract(contractId) {

    const contracts =
        JSON.parse(localStorage.getItem("contracts")) || [];

    const contract = contracts.find(
        item => item.contractId === contractId
    );

    if (!contract) {
        alert("Contract not found");
        return;
    }

    alert(
        "Contract Details\n\n" +
        "Contract ID: " + contract.contractId + "\n" +
        "Vendor: " + contract.vendor + "\n" +
        "Contract Name: " + contract.contractName + "\n" +
        "Start Date: " + contract.startDate + "\n" +
        "Expiry Date: " + contract.expiryDate + "\n" +
        "Status: " + contract.status
    );
}

if (document.getElementById("contractTableBody")) {
    loadContracts();
}
function checkContractExpiry() {

    const contracts =
        JSON.parse(localStorage.getItem("contracts")) || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    contracts.forEach(contract => {

        const expiryDate = new Date(contract.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);

        const difference =
            (expiryDate - today) / (1000 * 60 * 60 * 24);

        if (difference < 0) {

            alert(
                "Contract Expired: " +
                contract.contractName
            );

        } else if (difference <= 30) {

            alert(
                "Contract Expiry Alert: " +
                contract.contractName +
                " expires in " +
                Math.ceil(difference) +
                " days."
            );

        } else if (difference <= 60) {

            alert(
                "Contract Expiry Alert: " +
                contract.contractName +
                " expires in " +
                Math.ceil(difference) +
                " days."
            );

        } else if (difference <= 90) {

            alert(
                "Contract Expiry Alert: " +
                contract.contractName +
                " expires in " +
                Math.ceil(difference) +
                " days."
            );
        }

    });
}

if (document.getElementById("contractTableBody")) {
    checkContractExpiry();
}
document.getElementById("searchCommunication")?.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll("#communicationTableBody tr, #auditTableBody tr");

    rows.forEach(row => {

        const rowText = row.innerText.toLowerCase();

        if (rowText.includes(searchValue)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

});

function updateCommunicationCharts() {
    const typeCtx = document.getElementById("commTypeChart");
    const auditCtx = document.getElementById("commAuditChart");

    if (!typeCtx && !auditCtx) return;

    const communications = JSON.parse(localStorage.getItem("communications")) || [];
    const auditLogs = JSON.parse(localStorage.getItem("auditLogs")) || [];

    let poCount = 0;
    let contractCount = 0;

    communications.forEach(c => {
        if (c.type === "PO") poCount++;
        else if (c.type === "Contract") contractCount++;
    });

    if (typeCtx) {
        if (window.commTypeChartInstance) {
            window.commTypeChartInstance.destroy();
        }
        window.commTypeChartInstance = new Chart(typeCtx, {
            type: "pie",
            data: {
                labels: ["Purchase Orders (PO)", "Contracts"],
                datasets: [{
                    data: [poCount, contractCount],
                    backgroundColor: ["#10b981", "#8b5cf6"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    if (auditCtx) {
        if (window.commAuditChartInstance) {
            window.commAuditChartInstance.destroy();
        }

        const userCounts = {};
        auditLogs.forEach(log => {
            const u = log.userVendor || "System";
            userCounts[u] = (userCounts[u] || 0) + 1;
        });

        const labels = Object.keys(userCounts).length > 0 ? Object.keys(userCounts) : ["Admin", "Vendor"];
        const dataValues = Object.values(userCounts).length > 0 ? Object.values(userCounts) : [auditLogs.length || 1, 0];

        window.commAuditChartInstance = new Chart(auditCtx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Logged Operations",
                    data: dataValues,
                    backgroundColor: "#3b82f6",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            }
        });
    }
}

document.getElementById("sendMessageBtn")?.addEventListener("click", function () {

    const type = document.getElementById("communicationType").value;
    const communicationId = document.getElementById("communicationId").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!communicationId || !message) {
        alert("Please enter PO / Contract ID and Message");
        return;
    }

    const communications =
        JSON.parse(localStorage.getItem("communications")) || [];

    const communication = {
        type: type,
        communicationId: communicationId,
        message: message,
        dateTime: new Date().toLocaleString()
    };

    communications.push(communication);

    localStorage.setItem(
        "communications",
        JSON.stringify(communications)
    );

    alert("Message Sent Successfully");

    document.getElementById("communicationId").value = "";
    document.getElementById("message").value = "";

    const card = document.getElementById("sendMessageCard");
    if (card) card.style.display = "none";

    loadCommunications();

    addAuditLog(
        "Communication message sent for " + type + " " + communicationId,
        "Vendor"
    );

    addNotification(
        "Communication message sent for " + type + " #" + communicationId + ": \"" + message + "\"",
        "Medium",
        "System Audit",
        "Message Sent: " + type + " #" + communicationId
    );

});
function loadCommunications() {

    const communications =
        JSON.parse(localStorage.getItem("communications")) || [];

    const tableBody =
        document.getElementById("communicationTableBody");

    if (tableBody) {
        tableBody.innerHTML = "";

        let poCount = 0;
        let contractCount = 0;

        communications.forEach(communication => {
            let typeBadgeClass = "under-review";
            if (communication.type === "PO") {
                typeBadgeClass = "approved";
                poCount++;
            } else {
                typeBadgeClass = "under-review";
                contractCount++;
            }

            tableBody.innerHTML += `
                <tr>
                    <td><span class="badge-status ${typeBadgeClass}">${communication.type}</span></td>
                    <td><strong>${communication.communicationId}</strong></td>
                    <td>${communication.message}</td>
                    <td>${communication.dateTime}</td>
                </tr>
            `;

        });

        const totalEl = document.getElementById("totalMessagesCount");
        if (totalEl) totalEl.innerText = communications.length;

        const poEl = document.getElementById("poMessagesCount");
        if (poEl) poEl.innerText = poCount;

        const contractEl = document.getElementById("contractMessagesCount");
        if (contractEl) contractEl.innerText = contractCount;
    }

    updateCommunicationCharts();
}
if (document.getElementById("communicationTableBody")) {
    loadCommunications();
}
function addAuditLog(action, userVendor) {

    const auditLogs =
        JSON.parse(localStorage.getItem("auditLogs")) || [];

    auditLogs.push({
        action: action,
        userVendor: userVendor,
        dateTime: new Date().toLocaleString()
    });

    localStorage.setItem(
        "auditLogs",
        JSON.stringify(auditLogs)
    );

    loadAuditLogs();
}
function loadAuditLogs() {

    const auditLogs =
        JSON.parse(localStorage.getItem("auditLogs")) || [];

    const tableBody =
        document.getElementById("auditTableBody");

    if (tableBody) {
        tableBody.innerHTML = "";

        auditLogs.forEach(log => {

            tableBody.innerHTML += `
                <tr>
                    <td><strong>${log.action}</strong></td>
                    <td><span class="badge-status approved">${log.userVendor}</span></td>
                    <td>${log.dateTime}</td>
                </tr>
            `;

        });

        const auditEl = document.getElementById("auditLogsCount");
        if (auditEl) auditEl.innerText = auditLogs.length;
    }

    updateCommunicationCharts();
}
if (document.getElementById("auditTableBody")) {
    loadAuditLogs();
}
// Legacy Notifications Bridge (Delegates to Unified Notifications Manager below)
if (document.getElementById("notificationTable")) {
    if (typeof loadNotifications === "function") {
        loadNotifications();
    }
}
// ================= VENDOR PERFORMANCE SUMMARY =================

function calculatePerformanceSummary() {

    const tableBody = document.getElementById("performanceTableBody");

    if (!tableBody) return;

    const rows = tableBody.querySelectorAll("tr");

    let total = rows.length;
    let excellent = 0;
    let good = 0;
    let poor = 0;

    rows.forEach(row => {

        const scoreCell = row.cells[4];

        if (!scoreCell) return;

        const score = parseFloat(
            scoreCell.textContent.replace("%", "").trim()
        );

        if (score > 90) {

            excellent++;

        } else if (score >= 75) {

            good++;

        } else {

            poor++;
        }

    });

    const totalVendorsEl = document.getElementById("totalVendors");
    if (totalVendorsEl && document.getElementById("excellentVendors")) {
        totalVendorsEl.textContent = total;
    }
    const excellentEl = document.getElementById("excellentVendors");
    if (excellentEl) excellentEl.textContent = excellent;
    const goodEl = document.getElementById("goodVendors");
    if (goodEl) goodEl.textContent = good;
    const poorEl = document.getElementById("poorVendors");
    if (poorEl) poorEl.textContent = poor;
}

document.getElementById("searchPerformance")?.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll("#performanceTableBody tr");

    rows.forEach(row => {

        const rowText = row.innerText.toLowerCase();

        if (rowText.includes(searchValue)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

});

function updatePerformanceCharts(data) {
    const ratingCtx = document.getElementById("perfRatingChart");
    const scoreCtx = document.getElementById("perfScoreChart");

    if (!ratingCtx && !scoreCtx) return;

    let excellent = 0;
    let good = 0;
    let poor = 0;

    const vendorNames = [];
    const vendorScores = [];

    data.forEach(vendor => {
        let deliveryScore = vendor.delivery === "On Time" ? 100 : 60;
        let qualityScore = Number(vendor.quality) || 0;
        let responseScore = Number(vendor.response_time) || 0;
        let score = Number(((deliveryScore + qualityScore + responseScore) / 3).toFixed(2));

        vendorNames.push(vendor.name);
        vendorScores.push(score);

        if (score > 90) {
            excellent++;
        } else if (score >= 75) {
            good++;
        } else {
            poor++;
        }
    });

    if (ratingCtx) {
        if (window.perfRatingChartInstance) {
            window.perfRatingChartInstance.destroy();
        }
        window.perfRatingChartInstance = new Chart(ratingCtx, {
            type: "pie",
            data: {
                labels: ["Excellent (>90%)", "Good (75-90%)", "Needs Improvement (<75%)"],
                datasets: [{
                    data: [excellent, good, poor],
                    backgroundColor: ["#10b981", "#3b82f6", "#ef4444"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    if (scoreCtx) {
        if (window.perfScoreChartInstance) {
            window.perfScoreChartInstance.destroy();
        }
        window.perfScoreChartInstance = new Chart(scoreCtx, {
            type: "bar",
            data: {
                labels: vendorNames.length > 0 ? vendorNames : ["No Vendors"],
                datasets: [{
                    label: "Performance Score (%)",
                    data: vendorScores.length > 0 ? vendorScores : [0],
                    backgroundColor: "#3b82f6",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

function loadPerformanceVendors() {

    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

            const tableBody = document.getElementById("performanceTableBody");

            if (tableBody) {
                tableBody.innerHTML = "";

                let excellent = 0;
                let good = 0;
                let poor = 0;

                data.forEach(vendor => {

                    let deliveryScore = vendor.delivery === "On Time" ? 100 : 60;
                    let qualityScore = Number(vendor.quality) || 0;
                    let responseScore = Number(vendor.response_time) || 0;

                    let scoreNum = (deliveryScore + qualityScore + responseScore) / 3;
                    let score = scoreNum.toFixed(2);

                    let rating = "";
                    let ratingBadgeClass = "approved";

                    if (scoreNum > 90) {
                        rating = "Excellent";
                        ratingBadgeClass = "approved";
                        excellent++;
                    } else if (scoreNum >= 75) {
                        rating = "Good";
                        ratingBadgeClass = "under-review";
                        good++;
                    } else {
                        rating = "Needs Improvement";
                        ratingBadgeClass = "rejected";
                        poor++;
                    }

                    const deliveryBadgeClass = vendor.delivery === "On Time" ? "approved" : "rejected";

                    tableBody.innerHTML += `
                        <tr>
                            <td><strong>${vendor.name}</strong></td>
                            <td><span class="badge-status ${deliveryBadgeClass}">${vendor.delivery}</span></td>
                            <td>${vendor.quality ?? "-"}%</td>
                            <td>${vendor.response_time ?? "-"}%</td>
                            <td><strong>${score}%</strong></td>
                            <td><span class="badge-status ${ratingBadgeClass}">${rating}</span></td>
                        </tr>
                    `;

                });

                const totalVendorsEl = document.getElementById("totalVendors");
                if (totalVendorsEl) totalVendorsEl.textContent = data.length;

                const excellentEl = document.getElementById("excellentVendors");
                if (excellentEl) excellentEl.textContent = excellent;

                const goodEl = document.getElementById("goodVendors");
                if (goodEl) goodEl.textContent = good;

                const poorEl = document.getElementById("poorVendors");
                if (poorEl) poorEl.textContent = poor;
            }

            updatePerformanceCharts(data);

        })
        .catch(error => {
            console.log("Performance Error:", error);
        });
}
loadPerformanceVendors();

// Run performance summary
calculatePerformanceSummary();
function calculatePerformanceScores() {

    const tableBody = document.getElementById("performanceTableBody");

    if (!tableBody) return;

    const rows = tableBody.querySelectorAll("tr");

    rows.forEach(row => {

        const delivery = parseFloat(
            row.cells[1].textContent.replace("%", "")
        );

        const quality = parseFloat(
            row.cells[2].textContent.replace("%", "")
        );

        const responseTime = parseFloat(
            row.cells[3].textContent.replace("%", "")
        );

        const score =
            (delivery + quality + responseTime) / 3;

        row.cells[4].textContent =
            score.toFixed(2) + "%";
    });
}

calculatePerformanceScores();

document.getElementById("searchAnalytics")?.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll("#analyticsSummaryTableBody tr");

    rows.forEach(row => {

        const rowText = row.innerText.toLowerCase();

        if (rowText.includes(searchValue)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

});

// Analytics Chart
function loadAnalytics() {
    if (!document.getElementById("vendorPerformanceChart") && !document.getElementById("averageScore")) {
        return;
    }
    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

            const chartCanvas = document.getElementById("vendorPerformanceChart");

            // Total Vendors
            const tv = document.getElementById("totalVendors");
            if (tv) tv.textContent = data.length;
            const stv = document.getElementById("summaryTotalVendors");
            if (stv) stv.textContent = data.length;

            // Average Score
            const averageScore = data.length
                ? data.reduce((sum, vendor) => sum + Number(vendor.score || 0), 0) / data.length
                : 0;

            const avg = document.getElementById("averageScore");
            if (avg) avg.textContent = averageScore.toFixed(1) + "%";

            const savg = document.getElementById("summaryAverageScore");
            if (savg) savg.textContent = averageScore.toFixed(1) + "%";

            // Risk Vendors
            const riskVendors = data.filter(
                vendor => Number(vendor.score || 0) < 70
            ).length;

            const rv = document.getElementById("riskVendors");
            if (rv) rv.textContent = riskVendors;

            // Purchase Orders
            fetch("http://127.0.0.1:8000/purchase-orders/")
                .then(response => response.json())
                .then(orders => {

                    const to = document.getElementById("totalOrders");
                    if (to) to.textContent = orders.length;

                    // Delivered = Completed
                    const co = document.getElementById("completedOrders");
                    if (co) co.textContent = orders.filter(order => order.status === "Delivered" || order.status === "Paid" || order.status === "Received").length;

                    // Pending Orders
                    const po = document.getElementById("pendingOrders");
                    if (po) po.textContent = orders.filter(order => order.status === "Pending" || order.status === "In Progress" || order.status === "Shipped").length;
                })
                .catch(error => {
                    console.log("Orders Error:", error);
                });

            // Vendor Performance Bar Chart
            if (chartCanvas) {
                if (window.analyticsPerformanceChartInstance) {
                    window.analyticsPerformanceChartInstance.destroy();
                }

                const vendorNames = data.map(vendor => vendor.name);
                const vendorScores = data.map(vendor => {
                    const deliveryScore = vendor.delivery === "On Time" ? 100 : 60;
                    const qualityScore = Number(vendor.quality) || 0;
                    const responseScore = Number(vendor.response_time) || 0;
                    return ((deliveryScore + qualityScore + responseScore) / 3).toFixed(2);
                });

                window.analyticsPerformanceChartInstance = new Chart(chartCanvas, {
                    type: "bar",
                    data: {
                        labels: vendorNames,
                        datasets: [{
                            label: "Vendor Performance Score",
                            data: vendorScores,
                            backgroundColor: "#3b82f6",
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100
                            }
                        }
                    }
                });
            }

            // Vendor Rating Distribution Pie Chart
            const ratingChart = document.getElementById("vendorRatingChart");
            if (ratingChart) {
                if (window.analyticsRatingChartInstance) {
                    window.analyticsRatingChartInstance.destroy();
                }

                const excellent = data.filter(vendor => Number(vendor.score || 0) >= 90).length;
                const good = data.filter(vendor => Number(vendor.score || 0) >= 75 && Number(vendor.score || 0) < 90).length;
                const average = data.filter(vendor => Number(vendor.score || 0) >= 60 && Number(vendor.score || 0) < 75).length;
                const poor = data.filter(vendor => Number(vendor.score || 0) < 60).length;

                window.analyticsRatingChartInstance = new Chart(ratingChart, {
                    type: "pie",
                    data: {
                        labels: ["Excellent (>90%)", "Good (75-90%)", "Average (60-75%)", "Poor (<60%)"],
                        datasets: [{
                            data: [excellent, good, average, poor],
                            backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }

        })
        .catch(error => {
            console.log("Analytics Error:", error);
        });
}

loadAnalytics();

// Reports
const generateReportBtn = document.getElementById("generateReportBtn");

if (generateReportBtn) {
    generateReportBtn.addEventListener("click", function () {

        const table = document.getElementById("reportsTable");

        if (!table) return;

        // Get existing reports from localStorage
        let reports = JSON.parse(localStorage.getItem("reports")) || [];

        // Generate next Report ID
        const reportId = "R" + String(reports.length + 3).padStart(3, "0");

        // Create report object
        const report = {
            reportId: reportId,
            reportName: "Vendor Reliability Report",
            date: new Date().toLocaleDateString(),
            status: "Generated"
        };

        // Save report
        reports.push(report);
        localStorage.setItem("reports", JSON.stringify(reports));

        // Add report to table
        const newRow = table.insertRow();

        newRow.insertCell(0).textContent = report.reportId;
        newRow.insertCell(1).textContent = report.reportName;
        newRow.insertCell(2).textContent = report.date;
        newRow.insertCell(3).textContent = report.status;

        alert("Report Generated Successfully!");
    });
}
// Load saved reports when page opens
const reportsTable = document.getElementById("reportsTable");

if (reportsTable) {

    const savedReports = JSON.parse(localStorage.getItem("reports")) || [];

    savedReports.forEach(function (report) {

        const newRow = reportsTable.insertRow();

        newRow.insertCell(0).textContent = report.reportId;
        newRow.insertCell(1).textContent = report.reportName;
        newRow.insertCell(2).textContent = report.date;
        newRow.insertCell(3).textContent = report.status;

    });
}

// Download PDF
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", function () {

        const table = document.getElementById("reportsTable");

        if (!table) return;

        const reportWindow = window.open("", "_blank");

        reportWindow.document.write(`
            <html>
            <head>
                <title>Vendor IQ Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 30px;
                    }

                    h1 {
                        text-align: center;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }

                    th, td {
                        border: 1px solid black;
                        padding: 10px;
                        text-align: left;
                    }

                    th {
                        background: #f2f2f2;
                    }
                </style>
            </head>

            <body>
                <h1>Vendor IQ Report</h1>
                ${table.outerHTML}
            </body>
            </html>
        `);

        reportWindow.document.close();

        setTimeout(() => {
            reportWindow.print();
        }, 500);
    });
}
// Download Excel
const downloadExcelBtn = document.getElementById("downloadExcelBtn");

if (downloadExcelBtn) {
    downloadExcelBtn.addEventListener("click", function () {

        const table = document.getElementById("reportsTable");

        if (!table) return;

        let csv = [];

        const rows = table.querySelectorAll("tr");

        rows.forEach(row => {
            const cells = row.querySelectorAll("th, td");

            const rowData = [];

            cells.forEach(cell => {
                rowData.push('"' + cell.innerText.replace(/"/g, '""') + '"');
            });

            csv.push(rowData.join(","));
        });

        const csvContent = csv.join("\n");

        const blob = new Blob(
            [csvContent],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "Vendor_IQ_Report.csv";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    });
}
// ===============================
// Procurement Charts
// ===============================

function updateProcurementCharts(data) {
    const statusCtx = document.getElementById("procurementStatusChart");
    const departmentCtx = document.getElementById("procurementDepartmentChart");

    if (!statusCtx && !departmentCtx) return;

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let departmentCounts = {};

    data.forEach(procurement => {
        if (procurement.status === "Pending") pending++;
        else if (procurement.status === "Approved") approved++;
        else if (procurement.status === "Rejected") rejected++;

        let department = procurement.department;
        if (department) {
            departmentCounts[department] = (departmentCounts[department] || 0) + 1;
        }
    });

    if (statusCtx) {
        if (window.procurementStatusChartInstance) {
            window.procurementStatusChartInstance.destroy();
        }
        window.procurementStatusChartInstance = new Chart(statusCtx, {
            type: "pie",
            data: {
                labels: ["Pending", "Approved", "Rejected"],
                datasets: [{
                    data: [pending, approved, rejected]
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    if (departmentCtx) {
        if (window.procurementDepartmentChartInstance) {
            window.procurementDepartmentChartInstance.destroy();
        }
        window.procurementDepartmentChartInstance = new Chart(departmentCtx, {
            type: "bar",
            data: {
                labels: Object.keys(departmentCounts).length > 0 ? Object.keys(departmentCounts) : ["No Dept"],
                datasets: [{
                    label: "Procurement Requests",
                    data: Object.keys(departmentCounts).length > 0 ? Object.values(departmentCounts) : [0]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            }
        });
    }
}

// ===============================
// Executive Reports Dashboard Logic
// ===============================

let reportsData = [
    { id: "R001", name: "Vendor Performance Report", category: "Vendor Performance", date: "27-07-2026", format: "PDF Document", status: "Generated" },
    { id: "R002", name: "Purchase Order Expense Audit", category: "Purchase Orders", date: "27-07-2026", format: "Excel Spreadsheet", status: "Generated" },
    { id: "R003", name: "Contract Compliance & SLA Summary", category: "Contracts Audit", date: "15-08-2026", format: "PDF Document", status: "Scheduled" },
    { id: "R004", name: "Procurement Spend & Forecast", category: "Compliance Summary", date: "01-09-2026", format: "CSV Data", status: "Generated" }
];

function loadReports() {
    const tableBody = document.getElementById("reportsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    let generatedCount = 0;
    let pdfCount = 0;
    let scheduledCount = 0;

    reportsData.forEach(report => {
        if (report.status === "Generated") generatedCount++;
        if (report.status === "Scheduled") scheduledCount++;
        if (report.format === "PDF Document") pdfCount++;

        let statusClass = "approved";
        if (report.status === "Pending") statusClass = "pending";
        else if (report.status === "Scheduled") statusClass = "under-review";
        else if (report.status === "Cancelled") statusClass = "rejected";

        tableBody.innerHTML += `
            <tr>
                <td><strong>${report.id}</strong></td>
                <td>${report.name}</td>
                <td>${report.category}</td>
                <td>${report.date}</td>
                <td><span class="badge-status under-review">${report.format}</span></td>
                <td><span class="badge-status ${statusClass}">${report.status}</span></td>
                <td>
                    <button class="btn-edit" onclick="downloadReportPdf('${report.id}')">📄 PDF</button>
                    <button class="btn-approve" onclick="downloadReportExcel('${report.id}')">📊 Excel</button>
                    <button class="btn-delete" onclick="deleteReport('${report.id}')">Delete</button>
                </td>
            </tr>
        `;
    });

    // Update KPI Card Numbers
    const totalEl = document.getElementById("totalReportsCount");
    if (totalEl) totalEl.innerText = reportsData.length;

    const genEl = document.getElementById("generatedReportsCount");
    if (genEl) genEl.innerText = generatedCount;

    const pdfEl = document.getElementById("pdfReportsCount");
    if (pdfEl) pdfEl.innerText = pdfCount;

    const schEl = document.getElementById("scheduledReportsCount");
    if (schEl) schEl.innerText = scheduledCount;

    updateReportCharts();
}

function updateReportCharts() {
    const typeCtx = document.getElementById("reportTypeChart");
    const volumeCtx = document.getElementById("reportVolumeChart");

    if (!typeCtx && !volumeCtx) return;

    // Category Distribution Counts
    let categoryCounts = {
        "Vendor Performance": 0,
        "Purchase Orders": 0,
        "Contracts Audit": 0,
        "Compliance Summary": 0
    };

    reportsData.forEach(report => {
        if (categoryCounts[report.category] !== undefined) {
            categoryCounts[report.category]++;
        } else {
            categoryCounts[report.category] = 1;
        }
    });

    if (typeCtx) {
        if (window.reportTypeChartInstance) {
            window.reportTypeChartInstance.destroy();
        }

        window.reportTypeChartInstance = new Chart(typeCtx, {
            type: "pie",
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    data: Object.values(categoryCounts),
                    backgroundColor: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    if (volumeCtx) {
        if (window.reportVolumeChartInstance) {
            window.reportVolumeChartInstance.destroy();
        }

        window.reportVolumeChartInstance = new Chart(volumeCtx, {
            type: "bar",
            data: {
                labels: ["May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"],
                datasets: [{
                    label: "Reports Generated",
                    data: [2, 4, 6, 3, reportsData.length],
                    backgroundColor: "#3b82f6",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            }
        });
    }
}

// Form Modal Toggle & Event Handlers
document.getElementById("addReportBtn")?.addEventListener("click", function() {
    const card = document.getElementById("reportFormCard");
    if (card) card.style.display = "block";
});

document.getElementById("closeReportFormBtn")?.addEventListener("click", function() {
    const card = document.getElementById("reportFormCard");
    if (card) card.style.display = "none";
});

document.getElementById("cancelReportBtn")?.addEventListener("click", function() {
    const card = document.getElementById("reportFormCard");
    if (card) card.style.display = "none";
});

document.getElementById("saveReportBtn")?.addEventListener("click", function() {
    const nameInput = document.getElementById("reportName");
    const catInput = document.getElementById("reportCategory");
    const formatInput = document.getElementById("reportFormat");
    const freqInput = document.getElementById("reportFrequency");

    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
        alert("Please enter a report title.");
        return;
    }

    const today = new Date();
    const formattedDate = String(today.getDate()).padStart(2, '0') + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + today.getFullYear();
    const newId = "R" + String(reportsData.length + 1).padStart(3, '0');

    reportsData.push({
        id: newId,
        name: name,
        category: catInput ? catInput.value : "Vendor Performance",
        date: formattedDate,
        format: formatInput ? formatInput.value : "PDF Document",
        status: freqInput ? freqInput.value : "Generated"
    });

    alert("Report generated successfully!");

    if (nameInput) nameInput.value = "";
    const card = document.getElementById("reportFormCard");
    if (card) card.style.display = "none";

    loadReports();
});

// Quick Header Action Button listeners
document.getElementById("generateReportBtn")?.addEventListener("click", function() {
    const nameInput = document.getElementById("reportName");
    const card = document.getElementById("reportFormCard");
    if (card) {
        card.style.display = "block";
        if (nameInput) nameInput.focus();
    }
});

document.getElementById("downloadPdfBtn")?.addEventListener("click", function() {
    alert("Downloading batch PDF report package...");
});

document.getElementById("downloadExcelBtn")?.addEventListener("click", function() {
    alert("Exporting batch Excel summary report...");
});

// Live Search for Reports
document.getElementById("searchReports")?.addEventListener("input", function() {
    let search = this.value.toLowerCase();
    let rows = document.querySelectorAll("#reportsTableBody tr");

    rows.forEach(row => {
        let text = row.textContent.toLowerCase();
        if (text.includes(search)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
});

function downloadReportPdf(id) {
    alert(`Downloading PDF for report: ${id}`);
}

function downloadReportExcel(id) {
    alert(`Exporting Excel file for report: ${id}`);
}

function deleteReport(id) {
    if (confirm(`Are you sure you want to delete report ${id}?`)) {
        reportsData = reportsData.filter(r => r.id !== id);
        loadReports();
    }
}

// Initializer
loadReports();

// ===============================
// Unified Notifications & Alerts Dashboard Logic
// ===============================

const defaultSeedNotifications = [
    { id: "N001", date: "27/07/2026, 10:30:00 AM", category: "Vendor Alert", title: "New Vendor Onboarded", message: "Acme Logistics registered on the portal and is pending compliance document verification.", priority: "Medium", status: "Unread" },
    { id: "N002", date: "27/07/2026, 11:15:00 AM", category: "Purchase Order", title: "PO #PO1002 Fully Delivered", message: "Supplier Apex Industrial confirmed delivery of all server hardware equipment with 100% QA pass.", priority: "Low", status: "Read" },
    { id: "N003", date: "15/08/2026, 09:00:00 AM", category: "Contract Warning", title: "Contract Expiration Notice", message: "Global Supplies Master Services Agreement notice window closes in 15 days. Renewal review recommended.", priority: "High", status: "Unread" },
    { id: "N004", date: "01/09/2026, 02:45:00 PM", category: "System Audit", title: "Reliability Sync Completed", message: "Automated reliability scoring sync executed across all active vendors with zero schema anomalies.", priority: "Low", status: "Read" },
    { id: "N005", date: "05/09/2026, 04:20:00 PM", category: "Vendor Alert", title: "Performance Score Drop Alert", message: "TechCorp Inc overall reliability score dropped below critical 60% threshold due to consecutive delivery delays.", priority: "High", status: "Unread" },
    { id: "N006", date: "06/09/2026, 08:10:00 AM", category: "Purchase Order", title: "PO #PO1009 Approval Required", message: "Purchase order exceeding $50,000 threshold requires senior procurement manager signature.", priority: "Medium", status: "Unread" }
];

let activeNotificationFilter = "all";
let currentNotificationView = "feed";
let currentDetailId = null;

function getStoredNotifications() {
    let stored = localStorage.getItem("notifications");
    if (!stored) {
        localStorage.setItem("notifications", JSON.stringify(defaultSeedNotifications));
        return [...defaultSeedNotifications];
    }
    try {
        let parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            localStorage.setItem("notifications", JSON.stringify(defaultSeedNotifications));
            return [...defaultSeedNotifications];
        }
        return parsed;
    } catch (e) {
        localStorage.setItem("notifications", JSON.stringify(defaultSeedNotifications));
        return [...defaultSeedNotifications];
    }
}

function updateTopbarUnreadBadge() {
    const notifications = getStoredNotifications();
    const unreadCount = notifications.filter(n => n.status === "Unread").length;
    const topbarBadge = document.getElementById("topbarUnreadBadge");
    if (topbarBadge) topbarBadge.innerText = unreadCount;
}

function showNotificationToast(message, type = 'info') {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-notification ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
        <span style="font-size: 16px;">${icon}</span>
        <div style="flex: 1;">${message}</div>
        <span style="cursor: pointer; opacity: 0.7; font-weight: bold;" onclick="this.parentElement.remove()">✕</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "toastSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function addNotification(message, priority = "Medium", category = "System Audit", title = null) {
    let notifications = getStoredNotifications();
    const dateStr = new Date().toLocaleString();
    const newId = "N" + String(notifications.length + 1).padStart(3, '0');

    let titleStr = title ? title : (typeof message === 'string' ? (message.length > 35 ? message.substring(0, 35) + "..." : message) : "System Alert");
    let msgStr = typeof message === 'string' ? message : JSON.stringify(message);

    notifications.unshift({
        id: newId,
        date: dateStr,
        category: category || "System Audit",
        title: titleStr,
        message: msgStr,
        priority: priority || "Medium",
        status: "Unread"
    });

    localStorage.setItem("notifications", JSON.stringify(notifications));

    if (document.getElementById("notificationStreamFeed") || document.getElementById("notificationTableBody")) {
        loadNotifications();
    } else {
        updateTopbarUnreadBadge();
    }
    showNotificationToast(`New alert published: ${titleStr}`, 'info');
}

function updateFilterPillCounts(notifications) {
    let counts = {
        all: notifications.length,
        Unread: 0,
        High: 0,
        "Vendor Alert": 0,
        "Contract Warning": 0,
        "Purchase Order": 0,
        "System Audit": 0
    };

    notifications.forEach(item => {
        if (item.status === "Unread") counts.Unread++;
        if (item.priority === "High") counts.High++;
        if (counts[item.category] !== undefined) counts[item.category]++;
    });

    const setBadge = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.innerText = count;
    };

    setBadge("countPillAll", counts.all);
    setBadge("countPillUnread", counts.Unread);
    setBadge("countPillHigh", counts.High);
    setBadge("countPillVendor", counts["Vendor Alert"]);
    setBadge("countPillContract", counts["Contract Warning"]);
    setBadge("countPillPO", counts["Purchase Order"]);
    setBadge("countPillSystem", counts["System Audit"]);
}

function loadNotifications() {
    const feedContainer = document.getElementById("notificationStreamFeed");
    const tableBody = document.getElementById("notificationTableBody");
    const notifications = getStoredNotifications();

    updateTopbarUnreadBadge();

    if (!feedContainer && !tableBody) return;

    let unreadCount = 0;
    let highCount = 0;
    let systemCount = 0;

    let searchInput = document.getElementById("searchNotifications");
    let searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filteredItems = notifications.filter(item => {
        const itemStatus = item.status || "Unread";
        const itemPriority = item.priority || "Medium";
        const itemCategory = item.category || "System Audit";

        if (itemStatus === "Unread") unreadCount++;
        if (itemPriority === "High") highCount++;
        if (itemCategory === "System Audit" || itemCategory === "Purchase Order") systemCount++;

        // Filter tabs condition
        if (activeNotificationFilter === "Unread" && itemStatus !== "Unread") return false;
        if (activeNotificationFilter === "High" && itemPriority !== "High") return false;
        if (activeNotificationFilter !== "all" && activeNotificationFilter !== "Unread" && activeNotificationFilter !== "High") {
            if (itemCategory !== activeNotificationFilter) return false;
        }

        // Live Search filter
        if (searchTerm) {
            const text = `${item.id} ${item.title} ${item.message} ${itemCategory} ${itemPriority} ${itemStatus} ${item.date}`.toLowerCase();
            if (!text.includes(searchTerm)) return false;
        }

        return true;
    });

    updateFilterPillCounts(notifications);

    // Update KPI Card Numbers
    const totalEl = document.getElementById("totalNotificationsCount");
    if (totalEl) totalEl.innerText = notifications.length;

    const unreadEl = document.getElementById("unreadNotificationsCount");
    if (unreadEl) unreadEl.innerText = unreadCount;

    const highEl = document.getElementById("highPriorityCount");
    if (highEl) highEl.innerText = highCount;

    const systemEl = document.getElementById("systemAlertsCount");
    if (systemEl) systemEl.innerText = systemCount;

    // Render Stream Feed View
    if (feedContainer) {
        if (filteredItems.length === 0) {
            feedContainer.innerHTML = `
                <div class="notif-empty-state" style="text-align: center; padding: 40px 20px; background: white; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 36px; margin-bottom: 10px;">🔔</div>
                    <h4 style="font-size: 16px; font-weight: 700; color: #0f172a;">No notifications match your current filter</h4>
                    <p style="color: #64748b; font-size: 13px; margin-top: 5px;">Try switching filter tabs or clearing your search keywords.</p>
                </div>
            `;
        } else {
            feedContainer.innerHTML = filteredItems.map(item => {
                let priorityClass = item.priority === "High" ? "priority-high" : (item.priority === "Medium" ? "priority-medium" : "priority-low");
                let unreadClass = item.status === "Unread" ? "unread" : "";
                
                let iconClass = "system";
                let iconEmoji = "⚙️";
                if (item.category === "Vendor Alert") { iconClass = "vendor"; iconEmoji = "🏢"; }
                if (item.category === "Purchase Order") { iconClass = "po"; iconEmoji = "📦"; }
                if (item.category === "Contract Warning") { iconClass = "contract"; iconEmoji = "📄"; }

                let priorityTag = item.priority === "High" 
                    ? `<span class="badge-status rejected">🚨 High Priority</span>` 
                    : (item.priority === "Medium" ? `<span class="badge-status under-review">⚠️ Medium</span>` : `<span class="badge-status approved">ℹ️ Info</span>`);

                let statusBadge = item.status === "Unread"
                    ? `<span class="badge-status pending">Unread</span>`
                    : `<span class="badge-status approved">Read</span>`;

                return `
                    <div class="notif-card ${priorityClass} ${unreadClass}">
                        <div class="notif-icon-box ${iconClass}">${iconEmoji}</div>
                        <div class="notif-content-body">
                            <div class="notif-meta-bar">
                                <span style="font-weight: 800; font-size: 12px; color: #64748b;">${item.id}</span>
                                <span class="badge-status under-review">${item.category}</span>
                                ${priorityTag}
                                ${statusBadge}
                            </div>
                            <div class="notif-title">
                                ${item.title}
                            </div>
                            <div class="notif-message">${item.message}</div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                                <div class="notif-timestamp">
                                    <span>🕒 ${item.date}</span>
                                </div>
                                <div class="notif-actions">
                                    ${item.status === "Unread" ? `<button type="button" class="btn-approve" style="padding: 4px 10px; font-size: 12px;" onclick="markNotificationRead('${item.id}')">✓ Mark Read</button>` : ''}
                                    <button type="button" class="btn-edit" style="padding: 4px 10px; font-size: 12px;" onclick="viewNotificationDetail('${item.id}')">👁️ View Details</button>
                                    <button type="button" class="btn-delete" style="padding: 4px 10px; font-size: 12px;" onclick="deleteNotification('${item.id}')">Delete</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");
        }
    }

    // Render Data Table View
    if (tableBody) {
        tableBody.innerHTML = "";
        filteredItems.forEach(item => {
            let statusBadge = item.status === "Unread" 
                ? `<span class="badge-status pending">Unread</span>` 
                : `<span class="badge-status approved">Read</span>`;

            let priorityBadge = item.priority === "High" 
                ? `<span class="badge-status rejected">🚨 High</span>` 
                : (item.priority === "Medium" ? `<span class="badge-status under-review">⚠️ Medium</span>` : `<span class="badge-status approved">ℹ️ Info</span>`);

            tableBody.innerHTML += `
                <tr>
                    <td><strong>${item.id}</strong></td>
                    <td style="white-space: nowrap;">${item.date}</td>
                    <td><span class="badge-status under-review">${item.category}</span></td>
                    <td>
                        <strong>${item.title}</strong>
                        <div style="font-size: 12px; color: #64748b; margin-top: 3px;">${item.message}</div>
                    </td>
                    <td>${priorityBadge}</td>
                    <td>${statusBadge}</td>
                    <td>
                        ${item.status === "Unread" ? `<button class="btn-approve" onclick="markNotificationRead('${item.id}')">✓ Read</button>` : ''}
                        <button class="btn-edit" onclick="viewNotificationDetail('${item.id}')">👁️ Details</button>
                        <button class="btn-delete" onclick="deleteNotification('${item.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    }

    updateNotificationCharts(notifications);
}

function updateNotificationCharts(notifications) {
    const priorityCtx = document.getElementById("notificationPriorityChart");
    const categoryCtx = document.getElementById("notificationCategoryChart");

    if (!priorityCtx && !categoryCtx) return;

    let list = notifications || getStoredNotifications();

    let priorityCounts = { High: 0, Medium: 0, Low: 0 };
    let categoryCounts = {};

    list.forEach(item => {
        const p = item.priority || "Medium";
        const c = item.category || "System Audit";

        if (priorityCounts[p] !== undefined) {
            priorityCounts[p]++;
        } else {
            priorityCounts[p] = 1;
        }

        categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    });

    if (priorityCtx) {
        if (window.notificationPriorityChartInstance) {
            window.notificationPriorityChartInstance.destroy();
        }

        window.notificationPriorityChartInstance = new Chart(priorityCtx, {
            type: "pie",
            data: {
                labels: ["High Urgency", "Medium Urgency", "Low / Info"],
                datasets: [{
                    data: [priorityCounts.High || 0, priorityCounts.Medium || 0, priorityCounts.Low || 0],
                    backgroundColor: ["#ef4444", "#f59e0b", "#10b981"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    if (categoryCtx) {
        if (window.notificationCategoryChartInstance) {
            window.notificationCategoryChartInstance.destroy();
        }

        window.notificationCategoryChartInstance = new Chart(categoryCtx, {
            type: "bar",
            data: {
                labels: Object.keys(categoryCounts).length > 0 ? Object.keys(categoryCounts) : ["General"],
                datasets: [{
                    label: "Alert Count",
                    data: Object.values(categoryCounts).length > 0 ? Object.values(categoryCounts) : [0],
                    backgroundColor: "#3b82f6",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            }
        });
    }
}

// View Toggle Handlers (Stream Feed vs Data Table)
document.getElementById("feedViewToggleBtn")?.addEventListener("click", function() {
    this.classList.add("active");
    document.getElementById("tableViewToggleBtn")?.classList.remove("active");
    
    const stream = document.getElementById("notificationStreamFeed");
    const table = document.getElementById("notificationTableContainer");
    if (stream) stream.style.display = "flex";
    if (table) table.style.display = "none";
    
    const title = document.getElementById("activeViewTitle");
    if (title) title.innerText = "Live Notifications Stream";
    currentNotificationView = "feed";
});

document.getElementById("tableViewToggleBtn")?.addEventListener("click", function() {
    this.classList.add("active");
    document.getElementById("feedViewToggleBtn")?.classList.remove("active");
    
    const stream = document.getElementById("notificationStreamFeed");
    const table = document.getElementById("notificationTableContainer");
    if (stream) stream.style.display = "none";
    if (table) table.style.display = "block";
    
    const title = document.getElementById("activeViewTitle");
    if (title) title.innerText = "Notifications Data Table";
    currentNotificationView = "table";
});

// View Detail Modal Handler
function viewNotificationDetail(id) {
    const notifications = getStoredNotifications();
    const item = notifications.find(n => String(n.id) === String(id));
    if (!item) return;

    currentDetailId = id;

    const modal = document.getElementById("detailModalOverlay");
    const content = document.getElementById("detailModalContent");
    const headerTitle = document.getElementById("detailModalHeaderTitle");
    const markReadBtn = document.getElementById("markReadDetailActionBtn");

    if (headerTitle) headerTitle.innerHTML = `🔔 Alert #${item.id}`;

    if (markReadBtn) {
        markReadBtn.style.display = item.status === "Unread" ? "inline-block" : "none";
    }

    if (content) {
        let priorityTag = item.priority === "High" 
            ? `<span class="badge-status rejected">🚨 High Priority</span>` 
            : (item.priority === "Medium" ? `<span class="badge-status under-review">⚠️ Medium</span>` : `<span class="badge-status approved">ℹ️ Info</span>`);

        content.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <span class="badge-status under-review">${item.category}</span>
                ${priorityTag}
                <span class="badge-status ${item.status === 'Unread' ? 'pending' : 'approved'}">${item.status}</span>
            </div>
            
            <h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 10px;">${item.title}</h4>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 15px; font-size: 14px; color: #334155; line-height: 1.6;">
                ${item.message}
            </div>

            <div style="font-size: 12px; color: #64748b;">
                <strong>Logged Timestamp:</strong> ${item.date}
            </div>
        `;
    }

    if (modal) modal.classList.add("active");
}

const closeDetailModal = () => {
    const modal = document.getElementById("detailModalOverlay");
    if (modal) modal.classList.remove("active");
};

document.getElementById("closeDetailModalBtn")?.addEventListener("click", closeDetailModal);
document.getElementById("closeDetailModalActionBtn")?.addEventListener("click", closeDetailModal);

document.getElementById("markReadDetailActionBtn")?.addEventListener("click", function() {
    if (currentDetailId) {
        markNotificationRead(currentDetailId);
        closeDetailModal();
    }
});

// Modal Event Handlers (Post Alert Modal Overlay)
document.getElementById("addAlertBtn")?.addEventListener("click", function() {
    const modal = document.getElementById("postAlertModalOverlay");
    if (modal) modal.classList.add("active");
});

const closePostModal = () => {
    const modal = document.getElementById("postAlertModalOverlay");
    if (modal) modal.classList.remove("active");
};

document.getElementById("closePostAlertModalBtn")?.addEventListener("click", closePostModal);
document.getElementById("cancelPostAlertBtn")?.addEventListener("click", closePostModal);

document.getElementById("saveNotificationBtn")?.addEventListener("click", function() {
    const titleInput = document.getElementById("alertTitle");
    const catInput = document.getElementById("alertCategory");
    const priorityInput = document.getElementById("alertPriority");
    const msgInput = document.getElementById("alertMessage");

    const title = titleInput ? titleInput.value.trim() : "";
    const msg = msgInput ? msgInput.value.trim() : "";

    if (!title || !msg) {
        showNotificationToast("Please enter both alert title and message.", "error");
        return;
    }

    addNotification(msg, priorityInput ? priorityInput.value : "Medium", catInput ? catInput.value : "System Audit", title);

    if (titleInput) titleInput.value = "";
    if (msgInput) msgInput.value = "";
    closePostModal();
});

// Actions
document.getElementById("markAllReadBtn")?.addEventListener("click", function() {
    markAllNotificationsRead();
});

document.getElementById("clearReadBtn")?.addEventListener("click", function() {
    let notifications = getStoredNotifications();
    const readCount = notifications.filter(n => n.status === "Read").length;
    if (readCount === 0) {
        showNotificationToast("No read alerts to clear.", "info");
        return;
    }

    notifications = notifications.filter(n => n.status === "Unread");
    localStorage.setItem("notifications", JSON.stringify(notifications));
    loadNotifications();
    showNotificationToast(`Cleared ${readCount} read notification(s).`, "success");
});

function markAllNotificationsRead() {
    let notifications = getStoredNotifications();
    notifications.forEach(item => item.status = "Read");
    localStorage.setItem("notifications", JSON.stringify(notifications));
    loadNotifications();
    showNotificationToast("All notifications marked as read.", "success");
}

function markNotificationRead(idOrIndex) {
    let notifications = getStoredNotifications();
    let notif = notifications.find(n => String(n.id) === String(idOrIndex));
    if (!notif && typeof idOrIndex === 'number' && notifications[idOrIndex]) {
        notif = notifications[idOrIndex];
    }
    if (notif) {
        notif.status = "Read";
        localStorage.setItem("notifications", JSON.stringify(notifications));
        loadNotifications();
        showNotificationToast(`Alert ${notif.id || ''} marked as read.`, "success");
    }
}

function markNotificationAsRead(idOrIndex) {
    markNotificationRead(idOrIndex);
}

function deleteNotification(idOrIndex) {
    let notifications = getStoredNotifications();
    let index = notifications.findIndex(n => String(n.id) === String(idOrIndex));
    if (index === -1 && typeof idOrIndex === 'number') index = idOrIndex;
    
    if (index !== -1) {
        const item = notifications[index];
        if (confirm(`Are you sure you want to delete notification alert ${item.id || ''}?`)) {
            notifications.splice(index, 1);
            localStorage.setItem("notifications", JSON.stringify(notifications));
            loadNotifications();
            showNotificationToast("Notification alert removed.", "info");
        }
    }
}

// Filter Pills Click Handlers
document.querySelectorAll("#notificationFilterPills .filter-pill").forEach(pill => {
    pill.addEventListener("click", function() {
        document.querySelectorAll("#notificationFilterPills .filter-pill").forEach(p => p.classList.remove("active"));
        this.classList.add("active");
        activeNotificationFilter = this.getAttribute("data-filter");
        loadNotifications();
    });
});

// Live Search Input handler
document.getElementById("searchNotifications")?.addEventListener("input", function() {
    loadNotifications();
});

// Initializer
if (document.getElementById("notificationStreamFeed") || document.getElementById("notificationTableBody")) {
    loadNotifications();
} else {
    updateTopbarUnreadBadge();
}



