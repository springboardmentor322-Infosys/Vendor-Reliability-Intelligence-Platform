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

        document.getElementById("vendorName").value = "";
        document.getElementById("delivery").value = "";
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
    const invoiceNumber = document.getElementById("invoiceNumber")?.value || "";
    const invoiceStatus = document.getElementById("invoiceStatus")?.value || "Pending";

    const orderId = "PO" + Date.now();

    try {

        const response = await fetch("http://127.0.0.1:8000/purchase-orders/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                order_id: orderId,
                vendor: vendor,
                product: product,
                amount: amount,
                status: status,
                invoice_number: invoiceNumber,
                invoice_status: invoiceStatus
            })
        });

        if (!response.ok) {
            throw new Error("Failed to save Purchase Order");
        }

        const savedOrder = await response.json();

        console.log("Saved Purchase Order:", savedOrder);

        alert("Purchase Order Saved Successfully");

        location.reload();

    } catch (error) {

        console.error("Error saving Purchase Order:", error);

        alert("Failed to save Purchase Order");
    }

});

function loadPurchaseOrders() {

    const orders = JSON.parse(localStorage.getItem("purchaseOrders")) || [];

    const tableBody = document.getElementById("purchaseOrderTableBody");

    if (!tableBody) return;

    orders.forEach(order => {

        tableBody.innerHTML += `
            <tr>
                <td>${order.orderId}</td>
                <td>${order.vendor}</td>
                <td>${order.product}</td>
                <td>₹${order.amount}</td>
                <td>${order.status}</td>
                <td>${order.invoiceNumber || "-"}</td>
                <td>${order.invoiceStatus || "Pending"}</td>
                <td>
                     <button type="button" onclick="updateOrderStatus('${order.orderId}')">
        Update Status
    </button>
                </td>
            </tr>
        `;

    });
}

loadPurchaseOrders();

window.updateOrderStatus = function(orderId) {

    console.log("Update Status clicked:", orderId);

    const newStatus = prompt(
        "Enter new status:\nIn Progress\nShipped\nPartial Delivery\nDelivered"
    );

    if (!newStatus) {
        return;
    }

    const orders = JSON.parse(localStorage.getItem("purchaseOrders")) || [];

    const order = orders.find(o => o.orderId === orderId);

    if (order) {
        order.status = newStatus;
    }

    localStorage.setItem("purchaseOrders", JSON.stringify(orders));

    alert("Status updated to: " + newStatus);

    location.reload();
};
console.log("Purchase Order JS loaded");

document.addEventListener("click", function(event) {

    if (event.target.classList.contains("update-status-btn")) {

        const orderId = event.target.getAttribute("data-id");

        console.log("BUTTON CLICKED:", orderId);

        const newStatus = prompt(
            "Enter new status:\nIn Progress\nShipped\nPartial Delivery\nDelivered"
        );

        if (!newStatus) return;

        const orders = JSON.parse(localStorage.getItem("purchaseOrders")) || [];

        const order = orders.find(o => o.orderId === orderId);

        if (order) {
            order.status = newStatus;
        }

        localStorage.setItem("purchaseOrders", JSON.stringify(orders));

        alert("Status updated to: " + newStatus);

        location.reload();
    }

});
