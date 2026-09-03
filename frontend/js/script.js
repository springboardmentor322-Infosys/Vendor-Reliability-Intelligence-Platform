// Get Vendors
function loadVendors() {

    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

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
            console.log("Error:", error);
        });

}

loadVendors();
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

        addNotification("Vendor saved successfully: " + vendorData.name);

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

// Load Procurement List
function loadProcurements() {

    fetch("http://127.0.0.1:8000/procurements")
    .then(response => response.json())
    .then(data => {

        console.log("DATA LENGTH:", data.length);

        const tableBody = document.getElementById("procurementTableBody");

        if (!tableBody) return;

        tableBody.innerHTML = "";

        data.forEach(procurement => {
            console.log("ONE PROCUREMENT:", procurement);

            tableBody.innerHTML += `
            <tr>
                <td>${procurement.item_name}</td>
                <td>${procurement.quantity}</td>
                <td>${procurement.estimated_cost}</td>
                <td>${procurement.department}</td>
                <td>${procurement.status || "Pending"}</td>
                <td>
                    <button onclick="editProcurement(${procurement.id})">Edit</button>
                    <button onclick="deleteProcurement(${procurement.id})">Delete</button>
                    <button onclick="approveProcurement(${procurement.id})">Approve</button>
                    <button onclick="createPurchaseOrder(${procurement.id})">Create PO</button>
                    <button onclick="rejectProcurement(${procurement.id})">Reject</button>
                </td>
            </tr>
            `;

        });

    })
    .catch(error => console.log(error));

}

function loadProcurementCount() {

    console.log("loadProcurements called");

    fetch("http://127.0.0.1:8000/procurements")
        .then(response => response.json())
        .then(data => {

            console.log("Procurement Data:", data);
            console.log("DATA LENGTH:", data.length);

            const totalProcurements = document.getElementById("totalProcurements");

            if (totalProcurements) {
                totalProcurements.innerText = data.length;
            }

        })
        .catch(error => {
            console.log("Procurement Count Error:", error);
        });
}
loadProcurements();
loadProcurementCount();

loadProcurementCount();

// Delete Procurement
function deleteProcurement(id) {

    fetch(`http://127.0.0.1:8000/procurements/${id}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {

        alert(data.message);
        loadProcurements();

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
// Vendor Performance Pie Chart
const pieCtx = document.getElementById("vendorPieChart");

if (pieCtx) {
    new Chart(pieCtx, {
        type: "pie",
        data: {
            labels: ["Excellent", "Good", "Average", "Poor"],
            datasets: [{
                data: [45, 60, 12, 3]
            }]
        }
    });
}

// Purchase Orders Bar Chart
const barCtx = document.getElementById("purchaseBarChart");

if (barCtx) {
    new Chart(barCtx, {
        type: "bar",
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [{
                label: "Purchase Orders",
                data: [12, 19, 15, 22, 18, 25]
            }]
        }
    });
}
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
    "Purchase Order Issued: " + savedOrder.order_id
);

        alert("Purchase Order Saved Successfully");

        location.reload();

    } catch (error) {

        console.error("Error saving Purchase Order:", error);

        alert("Failed to save Purchase Order");
    }

});

async function loadPurchaseOrders() {

    const tableBody = document.getElementById("purchaseOrderTableBody");

    if (!tableBody) return;

    try {

        const response = await fetch("http://127.0.0.1:8000/purchase-orders/");

        if (!response.ok) {
            throw new Error("Failed to load Purchase Orders");
        }

        const orders = await response.json();

        tableBody.innerHTML = "";

        orders.forEach(order => {

            tableBody.innerHTML += `
                <tr>
                    <td>${order.order_id}</td>
                    <td>${order.vendor}</td>
                    <td>${order.product}</td>
                    <td>₹${order.amount}</td>
                    <td>${order.status}</td>
                    <td>${order.invoice_number || "-"}</td>
                    <td>${order.invoice_status || "Pending"}</td>
                    <td>
                        <button
    type="button"
    onclick="updateOrderStatus('${order.order_id}')">
    Update Status
</button>
                    </td>
                </tr>
            `;

        });

    } catch (error) {

        console.error("Error loading Purchase Orders:", error);

    }
}

loadPurchaseOrders();

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
    "Purchase Order " + orderId + " status changed to " + newStatus
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

    alert("Contract Saved Successfully");

    location.reload();

});
function loadContracts() {

    const contracts =
        JSON.parse(localStorage.getItem("contracts")) || [];

    const tableBody =
        document.getElementById("contractTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    contracts.forEach(contract => {

        tableBody.innerHTML += `
            <tr>
                <td>${contract.contractId}</td>
                <td>${contract.vendor}</td>
                <td>${contract.contractName}</td>
                <td>${contract.startDate}</td>
                <td>${contract.expiryDate}</td>
                <td>${contract.renewalNoticePeriod} Days</td>
                <td>${contract.terms || ""}</td>
                <td>${contract.complianceFlags?.join(", ") || "None"}</td>
                <td>${contract.status}</td>
                <td>
                    <button type="button" onclick="viewContract('${contract.contractId}')">
                     View
                    </button>
                </td>
            </tr>
        `;

    });
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

    loadCommunications();

    addAuditLog(
    "Communication message sent for " + type + " " + communicationId,
    "Vendor"
);

});
function loadCommunications() {

    const communications =
        JSON.parse(localStorage.getItem("communications")) || [];

    const tableBody =
        document.getElementById("communicationTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    communications.forEach(communication => {

        tableBody.innerHTML += `
            <tr>
                <td>${communication.type}</td>
                <td>${communication.communicationId}</td>
                <td>${communication.message}</td>
                <td>${communication.dateTime}</td>
            </tr>
        `;

    });
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
}
function loadAuditLogs() {

    const auditLogs =
        JSON.parse(localStorage.getItem("auditLogs")) || [];

    const tableBody =
        document.getElementById("auditTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    auditLogs.forEach(log => {

        tableBody.innerHTML += `
            <tr>
                <td>${log.action}</td>
                <td>${log.userVendor}</td>
                <td>${log.dateTime}</td>
            </tr>
        `;

    });
}
if (document.getElementById("auditTableBody")) {
    loadAuditLogs();
}
function loadNotifications() {

    const notifications =
        JSON.parse(localStorage.getItem("notifications")) || [];

    const tableBody =
        document.getElementById("notificationTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    notifications.forEach((notification, index) => {

        tableBody.innerHTML += `
            <tr>
                <td>${notification.date}</td>
                <td>${notification.message}</td>
                <td>
                    <button onclick="markNotificationAsRead(${index})">
                        ${notification.status}
                    </button>
                </td>
            </tr>
        `;

    });
}


if (document.getElementById("notificationTable")) {
    loadNotifications();
}
function addNotification(message) {

    const notifications =
        JSON.parse(localStorage.getItem("notifications")) || [];

    notifications.push({
        date: new Date().toLocaleString(),
        message: message,
        status: "Unread"
    });

    localStorage.setItem(
        "notifications",
        JSON.stringify(notifications)
    );
}
function markNotificationAsRead(index) {

    const notifications =
        JSON.parse(localStorage.getItem("notifications")) || [];

    if (!notifications[index]) return;

    notifications[index].status = "Read";

    localStorage.setItem(
        "notifications",
        JSON.stringify(notifications)
    );

    loadNotifications();
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

    document.getElementById("totalVendors").textContent = total;
    document.getElementById("excellentVendors").textContent = excellent;
    document.getElementById("goodVendors").textContent = good;
    document.getElementById("poorVendors").textContent = poor;
}

function loadPerformanceVendors() {

    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

            const tableBody = document.getElementById("performanceTableBody");

            if (!tableBody) return;

            tableBody.innerHTML = "";

            data.forEach(vendor => {

                let deliveryScore = vendor.delivery === "On Time" ? 100 : 60;
let qualityScore = Number(vendor.quality) || 0;
let responseScore = Number(vendor.response_time) || 0;

let score = ((deliveryScore + qualityScore + responseScore) / 3).toFixed(2);

                let rating = "";

                if (score > 90) {
                    rating = "Excellent";
                } else if (score >= 75) {
                    rating = "Good";
                } else {
                    rating = "Needs Improvement";
                }

                tableBody.innerHTML += `
                    <tr>
                        <td>${vendor.name}</td>
                        <td>${vendor.delivery}</td>
                        <td>${vendor.quality ?? "-"}</td>
                        <td>${vendor.response_time ?? "-"}</td>
                        <td>${score}%</td>
                        <td>${rating}</td>
                    </tr>
                `;

            });

            calculatePerformanceSummary();

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

// Analytics Chart
function loadAnalytics() {
    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

            const chartCanvas = document.getElementById("vendorPerformanceChart");

            // Total Vendors
            document.getElementById("totalVendors").textContent = data.length;
            document.getElementById("summaryTotalVendors").textContent = data.length;

            // Average Score
            const averageScore = data.length
                ? data.reduce((sum, vendor) => sum + Number(vendor.score || 0), 0) / data.length
                : 0;

            document.getElementById("averageScore").textContent =
                averageScore.toFixed(2) + "%";

            document.getElementById("summaryAverageScore").textContent =
                averageScore.toFixed(2) + "%";

            // Risk Vendors
            const riskVendors = data.filter(
                vendor => Number(vendor.score || 0) < 70
            ).length;

            document.getElementById("riskVendors").textContent = riskVendors;

            // Purchase Orders
            fetch("http://127.0.0.1:8000/purchase-orders/")
                .then(response => response.json())
                .then(orders => {

                    document.getElementById("totalOrders").textContent =
                        orders.length;

                    // Delivered = Completed
                    document.getElementById("completedOrders").textContent =
                        orders.filter(
                            order => order.status === "Delivered"
                        ).length;

                    // Pending Orders
                    document.getElementById("pendingOrders").textContent =
                        orders.filter(
                            order => order.status === "Pending"
                        ).length;
                })
                .catch(error => {
                    console.log("Orders Error:", error);
                });

            // Vendor Performance Bar Chart
            if (chartCanvas) {

                const vendorNames = data.map(vendor => vendor.name);

                const vendorScores = data.map(vendor => {

                    const deliveryScore =
                        vendor.delivery === "On Time" ? 100 : 60;

                    const qualityScore =
                        Number(vendor.quality) || 0;

                    const responseScore =
                        Number(vendor.response_time) || 0;

                    return (
                        (deliveryScore +
                            qualityScore +
                            responseScore) / 3
                    ).toFixed(2);
                });

                new Chart(chartCanvas, {
                    type: "bar",

                    data: {
                        labels: vendorNames,

                        datasets: [{
                            label: "Vendor Performance Score",
                            data: vendorScores
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

            // Vendor Rating Distribution Pie Chart
            const ratingChart =
                document.getElementById("vendorRatingChart");

            if (ratingChart) {

                const excellent = data.filter(
                    vendor => Number(vendor.score || 0) >= 90
                ).length;

                const good = data.filter(
                    vendor =>
                        Number(vendor.score || 0) >= 75 &&
                        Number(vendor.score || 0) < 90
                ).length;

                const average = data.filter(
                    vendor =>
                        Number(vendor.score || 0) >= 60 &&
                        Number(vendor.score || 0) < 75
                ).length;

                const poor = data.filter(
                    vendor => Number(vendor.score || 0) < 60
                ).length;

                new Chart(ratingChart, {
                    type: "pie",

                    data: {
                        labels: [
                            "Excellent",
                            "Good",
                            "Average",
                            "Poor"
                        ],

                        datasets: [{
                            data: [
                                excellent,
                                good,
                                average,
                                poor
                            ]
                        }]
                    },

                    options: {
                        responsive: true
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
